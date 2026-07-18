const path = require('path');

const SERVER_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(SERVER_DIR, '../..');
const REMOTION_DIR = path.join(REPO_ROOT, 'remotion');

const MEDIA_DIR = path.join(SERVER_DIR, 'media');
const THUMBS_DIR = path.join(SERVER_DIR, 'thumbs');
const PROJECTS_DIR = path.join(SERVER_DIR, 'projects');
const RENDERS_DIR = path.join(SERVER_DIR, 'renders');
const MEDIA_INDEX_PATH = path.join(SERVER_DIR, 'media-index.json');

module.exports = {
  SERVER_DIR,
  REPO_ROOT,
  REMOTION_DIR,
  MEDIA_DIR,
  THUMBS_DIR,
  PROJECTS_DIR,
  RENDERS_DIR,
  MEDIA_INDEX_PATH,
};
