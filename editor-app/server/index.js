const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  MEDIA_DIR, THUMBS_DIR, PROJECTS_DIR, MEDIA_INDEX_PATH,
} = require('./lib/paths');
const {JsonStore} = require('./lib/jsonStore');
const {probeFile} = require('./lib/ffprobe');
const {generateThumbnail} = require('./lib/thumbnail');
const {startRender, getJob} = require('./lib/render');

for (const dir of [MEDIA_DIR, THUMBS_DIR, PROJECTS_DIR]) {
  fs.mkdirSync(dir, {recursive: true});
}

const mediaIndex = new JsonStore(MEDIA_INDEX_PATH, {items: []});
const PORT = process.env.PORT || 8787;

const app = express();
app.use(cors());
app.use(express.json({limit: '15mb'}));
app.use('/media', express.static(MEDIA_DIR));
app.use('/thumbs', express.static(THUMBS_DIR));

app.get('/api/health', (req, res) => res.json({ok: true}));

// ── メディアビン ─────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: MEDIA_DIR,
    filename: (req, file, cb) => {
      const id = crypto.randomUUID();
      const ext = path.extname(file.originalname) || '';
      cb(null, `${id}${ext}`);
    },
  }),
  limits: {fileSize: 500 * 1024 * 1024},
});

app.post('/api/media/upload', upload.array('files', 20), async (req, res) => {
  const files = req.files || [];
  const created = [];
  const errors = [];
  for (const file of files) {
    try {
      const id = path.parse(file.filename).name;
      const srcPath = path.join(MEDIA_DIR, file.filename);
      const meta = await probeFile(srcPath);
      const thumbFilename = `${id}.jpg`;
      const thumbPath = path.join(THUMBS_DIR, thumbFilename);
      try {
        await generateThumbnail(meta.mediaType, srcPath, thumbPath, meta.durationSeconds);
      } catch (thumbErr) {
        // サムネ生成失敗は致命的ではない(クライアント側でプレースホルダー表示)
        console.error('thumbnail生成失敗:', thumbErr.message);
      }
      const item = {
        id,
        filename: file.originalname,
        mediaType: meta.mediaType,
        url: `/media/${file.filename}`,
        thumbnailUrl: fs.existsSync(thumbPath) ? `/thumbs/${thumbFilename}` : null,
        durationSeconds: meta.durationSeconds,
        width: meta.width,
        height: meta.height,
        sizeBytes: file.size,
        createdAt: Date.now(),
      };
      const data = mediaIndex.read();
      data.items.push(item);
      mediaIndex.write(data);
      created.push(item);
    } catch (err) {
      errors.push({filename: file.originalname, error: String(err.message || err)});
      try { fs.unlinkSync(path.join(MEDIA_DIR, file.filename)); } catch {}
    }
  }
  res.json({items: created, errors});
});

app.get('/api/media', (req, res) => {
  res.json(mediaIndex.read().items);
});

app.delete('/api/media/:id', (req, res) => {
  const data = mediaIndex.read();
  const item = data.items.find((m) => m.id === req.params.id);
  if (!item) return res.status(404).json({error: 'not found'});
  data.items = data.items.filter((m) => m.id !== req.params.id);
  mediaIndex.write(data);
  try { fs.unlinkSync(path.join(MEDIA_DIR, path.basename(item.url))); } catch {}
  if (item.thumbnailUrl) {
    try { fs.unlinkSync(path.join(THUMBS_DIR, path.basename(item.thumbnailUrl))); } catch {}
  }
  res.json({ok: true});
});

// ── プロジェクト ─────────────────────────────────────────
function projectPath(id) {
  return path.join(PROJECTS_DIR, `${id}.json`);
}

app.get('/api/projects', (req, res) => {
  const files = fs.readdirSync(PROJECTS_DIR).filter((f) => f.endsWith('.json'));
  const list = files.map((f) => {
    const p = path.join(PROJECTS_DIR, f);
    const stat = fs.statSync(p);
    try {
      const proj = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return {id: proj.id, name: proj.name, width: proj.width, height: proj.height, updatedAt: stat.mtimeMs};
    } catch {
      return null;
    }
  }).filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt);
  res.json(list);
});

app.get('/api/projects/:id', (req, res) => {
  const p = projectPath(req.params.id);
  if (!fs.existsSync(p)) return res.status(404).json({error: 'not found'});
  res.json(JSON.parse(fs.readFileSync(p, 'utf-8')));
});

app.post('/api/projects', (req, res) => {
  const project = req.body;
  if (!project || !project.tracks) return res.status(400).json({error: 'invalid project'});
  if (!project.id) project.id = `proj_${crypto.randomUUID().slice(0, 8)}`;
  fs.writeFileSync(projectPath(project.id), JSON.stringify(project, null, 2));
  res.json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const project = req.body;
  if (!project || !project.tracks) return res.status(400).json({error: 'invalid project'});
  project.id = req.params.id;
  fs.writeFileSync(projectPath(project.id), JSON.stringify(project, null, 2));
  res.json(project);
});

app.delete('/api/projects/:id', (req, res) => {
  const p = projectPath(req.params.id);
  try { fs.unlinkSync(p); } catch {}
  res.json({ok: true});
});

// ── レンダリング ─────────────────────────────────────────
app.post('/api/render', (req, res) => {
  const project = req.body && req.body.project;
  if (!project || !project.tracks) return res.status(400).json({error: 'invalid project'});
  const jobId = crypto.randomUUID();
  startRender(jobId, project);
  res.json({jobId});
});

app.get('/api/render/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({error: 'not found'});
  res.json({
    state: job.state,
    progress: job.progress,
    message: job.state === 'error' ? job.message : undefined,
  });
});

app.get('/api/render/:jobId/download', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job || job.state !== 'done' || !job.outputFile) {
    return res.status(404).json({error: 'not ready'});
  }
  res.download(job.outputFile, 'export.mp4');
});

app.listen(PORT, () => {
  console.log(`✅ editor server listening on http://127.0.0.1:${PORT}`);
});
