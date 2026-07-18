const fs = require('fs');
const path = require('path');

/** シンプルなJSONファイルストア。読み書きの度にファイルI/O(規模的に十分)。 */
class JsonStore {
  constructor(filePath, defaultValue) {
    this.filePath = filePath;
    this.defaultValue = defaultValue;
  }

  read() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      if (e.code === 'ENOENT') return structuredCloneSafe(this.defaultValue);
      throw e;
    }
  }

  write(value) {
    fs.mkdirSync(path.dirname(this.filePath), {recursive: true});
    const tmp = this.filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, this.filePath);
  }
}

function structuredCloneSafe(v) {
  return v === undefined ? v : JSON.parse(JSON.stringify(v));
}

module.exports = {JsonStore};
