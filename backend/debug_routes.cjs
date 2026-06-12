const fs = require('fs');
const path = require('path');
const lines = fs.readFileSync('routes/index.mjs', 'utf8').split('\n');
for (const l of lines) {
  if (l.includes('require(')) {
    const match = l.match(/require\(['"](.*?)['"]\)/);
    if (match) {
      const file = match[1];
      console.log('Loading', file);
      try {
        require(path.resolve('routes', file));
        console.log('Loaded', file);
      } catch (e) {
        console.error('Error loading', file, e);
      }
    }
  }
}
