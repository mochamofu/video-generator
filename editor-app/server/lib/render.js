const {spawn} = require('child_process');
const fs = require('fs');
const path = require('path');
const {REMOTION_DIR, RENDERS_DIR} = require('./paths');

const HEADLESS_SHELL_CANDIDATES = [
  '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
];

function findBrowser() {
  if (process.env.REMOTION_BROWSER) return process.env.REMOTION_BROWSER;
  for (const p of HEADLESS_SHELL_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** @type {Map<string, {state: string, progress: number, message: string, outputFile: string|null, startedAt: number}>} */
const jobs = new Map();

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function startRender(jobId, project) {
  fs.mkdirSync(RENDERS_DIR, {recursive: true});
  const propsPath = path.join(RENDERS_DIR, `${jobId}.props.json`);
  const outputFile = path.join(RENDERS_DIR, `${jobId}.mp4`);
  fs.writeFileSync(propsPath, JSON.stringify({project}));

  const job = {state: 'running', progress: 0, message: '', outputFile: null, startedAt: Date.now()};
  jobs.set(jobId, job);

  const env = {...process.env};
  const browser = findBrowser();
  if (browser) env.REMOTION_BROWSER = browser;

  const proc = spawn(
    'npx',
    ['remotion', 'render', 'src/index.ts', 'Timeline', outputFile, `--props=${propsPath}`],
    {cwd: REMOTION_DIR, env}
  );

  let tail = '';
  const onData = (chunk) => {
    const text = chunk.toString();
    tail = (tail + text).slice(-4000);
    const matches = [...text.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
    if (matches.length) {
      const [, cur, total] = matches[matches.length - 1];
      const c = parseInt(cur, 10);
      const t = parseInt(total, 10);
      // Remotionはレンダリング後にエンコード/スティッチの別フェーズがあり、
      // フレームカウンタが巻き戻って見えることがある。UIでは後退させない。
      if (t > 0) job.progress = Math.max(job.progress, Math.min(0.99, c / t));
    }
  };
  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);

  proc.on('error', (err) => {
    job.state = 'error';
    job.message = String(err);
  });

  proc.on('close', (code) => {
    if (code === 0 && fs.existsSync(outputFile)) {
      job.state = 'done';
      job.progress = 1;
      job.outputFile = outputFile;
    } else {
      job.state = 'error';
      job.message = tail.slice(-1500) || `プロセスが終了コード ${code} で失敗しました`;
    }
  });

  return jobId;
}

module.exports = {startRender, getJob};
