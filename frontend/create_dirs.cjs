const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, 'src');

const directories = [
  'app/layouts',
  'components/forms',
  'components/tables',
  'components/charts',
  'features/auth',
  'features/schedule',
  'features/attendance',
  'features/finance',
  'features/notifications',
  'portals/admin',
  'portals/trainer',
  'portals/spoc',
  'portals/accountnt',
  'portals/company'
];

directories.forEach(dir => {
  const fullPath = path.join(projectRoot, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created: ${dir}`);
  }
});

console.log('Finished creating directory structure.');
