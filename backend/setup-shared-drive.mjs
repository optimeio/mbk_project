import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function setupSharedDrive() {
  console.log('\n🔄 Shared Drive Setup for File Uploads\n');
  console.log('━'.repeat(60));

  console.log('\n📋 STEP 1: Create a Shared Drive in Google Drive\n');
  console.log('1. Go to: https://drive.google.com');
  console.log('2. Click the "New" button (top left)');
  console.log('3. Select "Shared Drive"');
  console.log('4. Name it: "MBK Trainer Management"');
  console.log('5. Click "Create"\n');

  console.log('━'.repeat(60));
  console.log('\n📋 STEP 2: Share with Service Account\n');
  console.log('1. Open the Shared Drive you just created');
  console.log('2. Click "Settings" (right side)');
  console.log(
    '3. Under "Members", share with this email:\n   mbk-google-drive26@mbk-project-2026.iam.gserviceaccount.com'
  );
  console.log('4. Give "Editor" permissions');
  console.log('5. Click "Share"\n');

  console.log('━'.repeat(60));
  console.log('\n📋 STEP 3: Get Shared Drive ID\n');
  console.log('1. Open the Shared Drive');
  console.log('2. Copy the ID from the URL:');
  console.log('   https://drive.google.com/drive/folders/YOUR_SHARED_DRIVE_ID');
  console.log('   (Copy only the ID part after "folders/")\n');

  console.log('━'.repeat(60));
  console.log('\n📋 STEP 4: Enter Shared Drive ID\n');

  let sharedDriveId = '';
  let isValid = false;

  while (!isValid) {
    sharedDriveId = await question('Enter your Shared Drive ID: ');

    if (!sharedDriveId || sharedDriveId.trim().length === 0) {
      console.log('❌ ID cannot be empty. Please try again.\n');
      continue;
    }

    isValid = true;
  }

  console.log('\n✅ Updating backend/.env...\n');

  // Update .env file
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');

  // Replace or add Shared Drive configuration
  if (envContent.includes('GOOGLE_DRIVE_USE_SHARED_DRIVE=')) {
    envContent = envContent.replace(
      /GOOGLE_DRIVE_USE_SHARED_DRIVE=.*/,
      'GOOGLE_DRIVE_USE_SHARED_DRIVE=true'
    );
  } else {
    envContent += '\nGOOGLE_DRIVE_USE_SHARED_DRIVE=true';
  }

  if (envContent.includes('GOOGLE_DRIVE_SHARED_DRIVE_ID=')) {
    envContent = envContent.replace(
      /GOOGLE_DRIVE_SHARED_DRIVE_ID=.*/,
      `GOOGLE_DRIVE_SHARED_DRIVE_ID=${sharedDriveId}`
    );
  } else {
    envContent += `\nGOOGLE_DRIVE_SHARED_DRIVE_ID=${sharedDriveId}`;
  }

  fs.writeFileSync(envPath, envContent);

  console.log('✅ Configuration saved!\n');
  console.log('━'.repeat(60));
  console.log('\n🎉 Shared Drive Setup Complete!\n');
  console.log('✨ Next Steps:\n');
  console.log('   1. Run the test suite:');
  console.log('      node tests/test-google-drive-integration.mjs\n');
  console.log('   2. You should now see 15/15 tests passing ✅\n');
  console.log('━'.repeat(60));
  console.log('');

  rl.close();
}

setupSharedDrive().catch(console.error);
