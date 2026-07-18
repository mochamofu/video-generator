const {spawn} = require('child_process');

function run(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(0, 500)}`));
      resolve();
    });
  });
}

async function generateThumbnail(mediaType, srcPath, outPath, durationSeconds) {
  if (mediaType === 'video') {
    const seekTo = Math.min(0.5, (durationSeconds || 1) / 2);
    await run(['-y', '-ss', String(seekTo), '-i', srcPath,
      '-frames:v', '1', '-vf', 'scale=320:-2', outPath]);
  } else if (mediaType === 'image') {
    await run(['-y', '-i', srcPath, '-vf', 'scale=320:-2', '-frames:v', '1', outPath]);
  } else {
    // audio: 波形サムネイル
    await run(['-y', '-i', srcPath, '-filter_complex',
      'showwavespic=s=320x120:colors=0x4dd0e1', '-frames:v', '1', outPath]);
  }
}

module.exports = {generateThumbnail};
