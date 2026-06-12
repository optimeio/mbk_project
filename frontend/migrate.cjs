const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getFiles(dir, filesList = []) {
  if (!fs.existsSync(dir)) return filesList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, filesList);
    } else {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

function getNewPath(relativeToSrc) {
  const p = relativeToSrc.replace(/\\/g, '/');
  
  if (p.startsWith('pages/superadmin/')) return p.replace('pages/superadmin/', 'portals/admin/');
  if (p.startsWith('pages/trainer/')) return p.replace('pages/trainer/', 'portals/trainer/');
  if (p.startsWith('pages/SPOC/')) return p.replace('pages/SPOC/', 'portals/spoc/');
  if (p.startsWith('pages/accountnt/')) return p.replace('pages/accountnt/', 'portals/accountnt/');
  if (p.startsWith('pages/company/')) return p.replace('pages/company/', 'portals/company/');
  if (p.startsWith('pages/auth/')) return p.replace('pages/auth/', 'features/auth/pages/');
  // Account for non-JS files under pages/ too
  if (p.startsWith('pages/VerificationPage')) return p.replace('pages/', 'features/auth/pages/');
  if (p.startsWith('components/auth/')) return p.replace('components/auth/', 'features/auth/components/');
  if (p.startsWith('layouts/')) return p.replace('layouts/', 'app/layouts/');
  
  return p;
}

const allFiles = getFiles(srcDir);

// Move files physically (including CSS/SVG)
allFiles.forEach(file => {
  const relativeToSrc = file.substring(srcDir.length + 1).replace(/\\/g, '/');
  
  // Don't move if it's already in the new folders
  if (relativeToSrc.startsWith('app/') || relativeToSrc.startsWith('features/') || relativeToSrc.startsWith('portals/')) {
    return;
  }
  
  const newRelativePath = getNewPath(relativeToSrc);
  
  if (relativeToSrc !== newRelativePath) {
    const newFullPath = path.join(srcDir, newRelativePath);
    const newDir = path.dirname(newFullPath);
    
    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
    }
    
    fs.renameSync(file, newFullPath);
    console.log(`Moved: ${relativeToSrc} -> ${newRelativePath}`);
  }
});

console.log('Migration Script Complete!');
