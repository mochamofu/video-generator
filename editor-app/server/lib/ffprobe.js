const {spawn} = require('child_process');

/** ffprobeでファイルのメタ情報(種別/長さ/解像度)を取得する */
function probeFile(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];
    const proc = spawn('ffprobe', args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ffprobe failed (${code}): ${stderr.slice(0, 500)}`));
      }
      try {
        const data = JSON.parse(stdout);
        resolve(parseProbe(data));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function parseProbe(data) {
  const streams = data.streams || [];
  const videoStream = streams.find((s) => s.codec_type === 'video');
  const audioStream = streams.find((s) => s.codec_type === 'audio');
  const format = data.format || {};
  const durationSeconds = format.duration ? parseFloat(format.duration) : null;

  let mediaType = 'video';
  if (videoStream && videoStream.disposition && videoStream.disposition.attached_pic) {
    // 埋め込みジャケット画像等を持つ音声ファイル(mp3等)は video ストリームがあっても音声扱い
    mediaType = audioStream ? 'audio' : 'image';
  } else if (videoStream) {
    // 静止画(png/jpg)もffprobeはvideo streamとして返すが、durationが無い/nb_frames=1が目印
    const isStillImage =
      !durationSeconds &&
      (videoStream.codec_name === 'png' ||
        videoStream.codec_name === 'mjpeg' ||
        videoStream.codec_name === 'webp' ||
        videoStream.nb_frames === '1');
    mediaType = isStillImage ? 'image' : 'video';
  } else if (audioStream) {
    mediaType = 'audio';
  }

  return {
    mediaType,
    durationSeconds: mediaType === 'image' ? null : durationSeconds,
    width: videoStream ? videoStream.width : null,
    height: videoStream ? videoStream.height : null,
  };
}

module.exports = {probeFile};
