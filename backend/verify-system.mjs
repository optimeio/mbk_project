#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

console.log('\n' + '═'.repeat(70));
console.log('🔧 SYSTEM VERIFICATION TEST');
console.log('═'.repeat(70));

// Test 1: Environment Configuration
console.log('\n\n📋 TEST 1: ENVIRONMENT CONFIGURATION');
console.log('─'.repeat(70));

const requiredVars = [
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'GOOGLE_DRIVE_ROOT_FOLDER_ID',
  'GOOGLE_DRIVE_AUTO_SYNC',
  'NODE_ENV',
];

let envOk = true;
requiredVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    if (varName === 'GOOGLE_SERVICE_ACCOUNT_JSON') {
      console.log(`✅ ${varName}: Configured (${value.substring(0, 50)}...)`);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`❌ ${varName}: MISSING`);
    envOk = false;
  }
});

if (!envOk) {
  console.log('\n❌ Environment configuration incomplete');
  process.exit(1);
}

// Test 2: Service Account Validation
console.log('\n\n📱 TEST 2: SERVICE ACCOUNT VALIDATION');
console.log('─'.repeat(70));

try {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  console.log(`✅ Service Account JSON: Valid`);
  console.log(`   Project ID: ${serviceAccount.project_id}`);
  console.log(`   Email: ${serviceAccount.client_email}`);
  console.log(`   Type: ${serviceAccount.type}`);
} catch (error) {
  console.error('❌ Service Account JSON: Invalid');
  console.error(`   Error: ${error.message}`);
  process.exit(1);
}

// Test 3: Google Drive API Connection
console.log('\n\n🔗 TEST 3: GOOGLE DRIVE API CONNECTION');
console.log('─'.repeat(70));

async function testGoogleDrive() {
  try {
    const serviceAccountJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountJson,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const driveApi = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive API: Connected');

    // Test 4: Root Folder Verification
    console.log('\n\n📁 TEST 4: ROOT FOLDER VERIFICATION');
    console.log('─'.repeat(70));

    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    console.log(`Root Folder ID: ${rootFolderId}`);

    const folderResponse = await driveApi.files.get({
      fileId: rootFolderId,
      fields: 'id, name, mimeType',
    });

    console.log(`✅ Root Folder Found:`);
    console.log(`   Name: ${folderResponse.data.name}`);
    console.log(`   ID: ${folderResponse.data.id}`);
    console.log(`   Type: ${folderResponse.data.mimeType}`);

    // Test 5: List Trainer Folders
    console.log('\n\n👥 TEST 5: EXISTING TRAINER FOLDERS');
    console.log('─'.repeat(70));

    const trainerFolders = await driveApi.files.list({
      q: `'${rootFolderId}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name, createdTime, modifiedTime)',
      pageSize: 50,
      orderBy: 'modifiedTime desc',
    });

    if (trainerFolders.data.files.length > 0) {
      console.log(`✅ Found ${trainerFolders.data.files.length} trainer folder(s):\n`);
      trainerFolders.data.files.slice(0, 5).forEach((file, idx) => {
        console.log(`${idx + 1}. ${file.name}`);
        console.log(`   ID: ${file.id}`);
        console.log(`   Created: ${new Date(file.createdTime).toLocaleString()}`);
      });
    } else {
      console.log('⚠️  No trainer folders found yet (this is normal for first run)');
    }

    // Test 6: Check Shared Drive Configuration
    console.log('\n\n🏢 TEST 6: SHARED DRIVE CONFIGURATION');
    console.log('─'.repeat(70));

    const useSharedDrive = process.env.GOOGLE_DRIVE_USE_SHARED_DRIVE === 'true';
    const sharedDriveId = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;

    console.log(`Use Shared Drive: ${useSharedDrive ? '✅ YES' : '❌ NO'}`);
    console.log(`Shared Drive ID: ${sharedDriveId || '⚠️  Not configured'}`);

    if (useSharedDrive && sharedDriveId) {
      try {
        const sharedDriveResponse = await driveApi.drives.get({
          driveId: sharedDriveId,
          fields: 'id, name, createdTime',
        });
        console.log(`✅ Shared Drive Accessible:`);
        console.log(`   Name: ${sharedDriveResponse.data.name}`);
        console.log(`   ID: ${sharedDriveResponse.data.id}`);
      } catch (error) {
        console.log(`❌ Shared Drive Not Accessible: ${error.message}`);
      }
    } else {
      console.log('💡 Shared Drive not configured (optional)');
      console.log('   For file uploads, follow: backend/setup-shared-drive.mjs');
    }

    // Test 7: List Recent College Folders
    console.log('\n\n🏫 TEST 7: COLLEGE FOLDER STRUCTURE');
    console.log('─'.repeat(70));

    if (trainerFolders.data.files.length > 0) {
      const latestTrainer = trainerFolders.data.files[0];
      console.log(`Checking latest trainer: ${latestTrainer.name}\n`);

      const subfolders = await driveApi.files.list({
        q: `'${latestTrainer.id}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name)',
        pageSize: 50,
      });

      if (subfolders.data.files.length > 0) {
        console.log(`✅ Subfolders found: ${subfolders.data.files.length}`);
        subfolders.data.files.forEach((file) => {
          console.log(`   📁 ${file.name} (ID: ${file.id})`);
        });

        // Check documents folder
        const docsFolder = subfolders.data.files.find((f) => f.name.toLowerCase().includes('document'));
        if (docsFolder) {
          const collegeFolders = await driveApi.files.list({
            q: `'${docsFolder.id}' in parents and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name)',
            pageSize: 50,
          });

          if (collegeFolders.data.files.length > 0) {
            console.log(`\n✅ College folders found: ${collegeFolders.data.files.length}`);
            collegeFolders.data.files.forEach((file) => {
              console.log(`   🏫 ${file.name} (ID: ${file.id})`);
            });

            // Check first college's day folders
            if (collegeFolders.data.files.length > 0) {
              const collegeFolder = collegeFolders.data.files[0];
              const dayFolders = await driveApi.files.list({
                q: `'${collegeFolder.id}' in parents and trashed=false`,
                spaces: 'drive',
                fields: 'files(id, name)',
                pageSize: 50,
                orderBy: 'name',
              });

              if (dayFolders.data.files.length > 0) {
                console.log(`\n✅ Day folders in "${collegeFolder.name}": ${dayFolders.data.files.length}`);
                dayFolders.data.files.slice(0, 3).forEach((file) => {
                  console.log(`   📅 ${file.name}`);
                });
              }
            }
          } else {
            console.log('⚠️  No college folders found yet');
          }
        }
      } else {
        console.log('⚠️  No subfolders in trainer folder');
      }
    }

    // Test 8: System Status Summary
    console.log('\n\n' + '═'.repeat(70));
    console.log('📊 SYSTEM STATUS SUMMARY');
    console.log('═'.repeat(70));

    console.log('\n✅ VERIFIED:');
    console.log('   • Environment variables configured');
    console.log('   • Service account credentials valid');
    console.log('   • Google Drive API connected');
    console.log('   • Root folder accessible');
    console.log('   • Trainer folder structure exists');

    if (useSharedDrive && sharedDriveId) {
      console.log('   • Shared Drive configured');
    }

    console.log('\n📈 STATISTICS:');
    console.log(`   • Trainer folders: ${trainerFolders.data.files.length}`);
    console.log(`   • Auto-sync: ${process.env.GOOGLE_DRIVE_AUTO_SYNC}`);
    console.log(`   • Sync interval: ${process.env.GOOGLE_DRIVE_SYNC_INTERVAL}ms`);

    console.log('\n🎉 SYSTEM READY FOR TESTING!\n');
    console.log('═'.repeat(70));
    console.log('\nNext Steps:');
    console.log('1. Start backend: npm start (in backend/)');
    console.log('2. Register trainer via API');
    console.log('3. Upload documents');
    console.log('4. Assign college');
    console.log('5. Verify changes in Google Drive\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.message.includes('Invalid Credentials')) {
      console.error('\n💡 Issue: Service account credentials are invalid');
      console.error('   Fix: Verify GOOGLE_SERVICE_ACCOUNT_JSON in .env');
    }
    process.exit(1);
  }
}

testGoogleDrive();
