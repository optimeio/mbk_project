const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('<img')) {
        // Find <img tags that do not have loading= property
        const modified = content.replace(/<img(?![^>]*loading=)([^>]+)>/g, '<img loading="lazy"$1>');
        if (content !== modified) {
          fs.writeFileSync(fullPath, modified);
          console.log('Updated: ' + fullPath);
        }
      }
    }
  }
}

processDir('c:\\\\mbk_project\\\\frontend\\\\src');
processDir('c:\\\\mbk_project\\\\frontend\\\\app');
