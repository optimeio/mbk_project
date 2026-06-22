#!/usr/bin/env node

/**
 * Trainer Management System - Google Drive Integration Test
 * Tests: Service account auth, folder creation, file upload, auto-sync
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import Google Drive service
import * as googleDriveService from '../services/googleDriveService.mjs';

const TEST_RESULTS = {
  passed: 0,
  failed: 0,
  tests: []
};

const log = (type, message, details = '') => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const icon = type === 'PASS' ? '✅' : type === 'FAIL' ? '❌' : type === 'INFO' ? 'ℹ️' : '🔍';
  console.log(`${icon} [${timestamp}] ${message}`, details);
};

const recordTest = (name, passed, error = null) => {
  TEST_RESULTS.tests.push({ name, passed, error });
  if (passed) {
    TEST_RESULTS.passed++;
    log('PASS', `Test passed: ${name}`);
  } else {
    TEST_RESULTS.failed++;
    log('FAIL', `Test failed: ${name}`, error || '');
  }
};

async function testGoogleDriveIntegration() {
  console.log('\n🧪 Starting Trainer Management System Tests...\n');
  console.log('═'.repeat(60));

  // Test 1: Environment Configuration
  console.log('\n📋 Test 1: Environment Configuration');
  console.log('─'.repeat(60));
  try {
    const hasServiceAccount = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const hasFolderId = !!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    const autoSyncEnabled = process.env.GOOGLE_DRIVE_AUTO_SYNC === 'true';

    recordTest('Service Account JSON configured', hasServiceAccount, 
      !hasServiceAccount ? 'GOOGLE_SERVICE_ACCOUNT_JSON not found' : null);
    recordTest('Google Drive Root Folder ID configured', hasFolderId,
      !hasFolderId ? 'GOOGLE_DRIVE_ROOT_FOLDER_ID not found' : null);
    recordTest('Auto-sync enabled', autoSyncEnabled);

    if (hasServiceAccount) {
      try {
        const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        recordTest('Service Account JSON is valid JSON', true);
        log('INFO', 'Service Account Project', `: ${creds.project_id}`);
        log('INFO', 'Service Account Email', `: ${creds.client_email}`);
      } catch (e) {
        recordTest('Service Account JSON is valid JSON', false, e.message);
      }
    }
  } catch (error) {
    recordTest('Environment Configuration', false, error.message);
  }

  // Test 2: Google Drive Initialization
  console.log('\n🔐 Test 2: Google Drive Initialization');
  console.log('─'.repeat(60));
  try {
    const driveClient = await googleDriveService.initGoogleDrive();
    recordTest('Google Drive client initialized', !!driveClient);
    log('INFO', 'Google Drive API connected successfully');
  } catch (error) {
    recordTest('Google Drive client initialized', false, error.message);
    log('FAIL', 'Could not initialize Google Drive:', error.message);
  }

  // Test 3: Trainer Folder Creation
  console.log('\n📁 Test 3: Trainer Folder Structure Creation');
  console.log('─'.repeat(60));
  let trainerFolderId = null;
  try {
    const testTrainerName = `TestTrainer_${Date.now()}`;
    const folderStructure = await googleDriveService.createTrainerFolderStructure(testTrainerName);
    
    recordTest('Trainer folder created', !!folderStructure.trainerId);
    recordTest('Documents subfolder created', !!folderStructure.docsId);
    
    if (folderStructure.trainerId) {
      trainerFolderId = folderStructure.trainerId;
      log('INFO', 'Trainer Folder ID', `: ${folderStructure.trainerId}`);
      log('INFO', 'Documents Folder ID', `: ${folderStructure.docsId}`);
    }
  } catch (error) {
    recordTest('Trainer folder structure creation', false, error.message || JSON.stringify(error));
    log('FAIL', 'Folder creation error:', error.message);
  }

  // Test 4: College Folder Structure
  console.log('\n🏫 Test 4: College Folder Structure Creation');
  console.log('─'.repeat(60));
  let collegeFolderId = null;
  try {
    if (trainerFolderId) {
      const testCollegeName = `TestCollege_${Date.now()}`;
      const collegeStructure = await googleDriveService.createCollegeFolderStructure(
        trainerFolderId,
        testCollegeName
      );

      recordTest('College folder created', !!collegeStructure.collegeFolderId);
      recordTest('12 day folders created', !!collegeStructure.dayFolders && Object.keys(collegeStructure.dayFolders).length === 12);

      if (collegeStructure.collegeFolderId) {
        collegeFolderId = collegeStructure.collegeFolderId;
        log('INFO', 'College Folder ID', `: ${collegeStructure.collegeFolderId}`);
        log('INFO', 'Day Folders', `: ${Object.keys(collegeStructure.dayFolders).length} created`);

        // Verify all 3 sub-types exist for day 1
        const day1 = collegeStructure.dayFolders[1];
        if (day1) {
          const hasAttendance = !!day1.attendance;
          const hasGeoTag = !!day1.geo_tag;
          const hasExcelSheet = !!day1.excel_sheet;
          recordTest('Day 1 attendance folder', hasAttendance);
          recordTest('Day 1 geo_tag folder', hasGeoTag);
          recordTest('Day 1 excel_sheet folder', hasExcelSheet);
        }
      }
    } else {
      log('INFO', 'Skipping college folder test', '(trainer folder not created)');
    }
  } catch (error) {
    recordTest('College folder structure creation', false, error.message || JSON.stringify(error));
    log('FAIL', 'College structure error:', error.message);
  }

  // Test 5: File Upload
  console.log('\n📤 Test 5: File Upload to Google Drive');
  console.log('─'.repeat(60));
  try {
    if (collegeFolderId) {
      // Create a test file
      const testFilePath = path.join(__dirname, '..', 'tmp', 'uploads', `test_${Date.now()}.txt`);
      const testFileDir = path.dirname(testFilePath);
      
      // Ensure directory exists
      if (!fs.existsSync(testFileDir)) {
        fs.mkdirSync(testFileDir, { recursive: true });
      }

      // Write test file
      fs.writeFileSync(testFilePath, 'Test content for Google Drive upload - ' + new Date().toISOString());
      log('INFO', 'Test file created', `: ${testFilePath}`);

      // Upload file
      const uploadResult = await googleDriveService.uploadFileToGoogleDrive(
        testFilePath,
        `test_file_${Date.now()}.txt`,
        collegeFolderId,
        3 // max retries
      );

      recordTest('File uploaded successfully', !!uploadResult.driveFileId);
      recordTest('File ID returned', !!uploadResult.driveFileId);
      recordTest('Web link provided', !!uploadResult.webViewLink);

      if (uploadResult.driveFileId) {
        log('INFO', 'Google Drive File ID', `: ${uploadResult.driveFileId}`);
        log('INFO', 'File Size', `: ${uploadResult.fileSize} bytes`);
        log('INFO', 'Web Link', `: ${uploadResult.webViewLink}`);
      }

      // Clean up test file
      try {
        fs.unlinkSync(testFilePath);
        log('INFO', 'Test file cleaned up');
      } catch (e) {
        log('INFO', 'Could not delete test file (non-critical)');
      }
    } else {
      log('INFO', 'Skipping file upload test', '(college folder not created)');
    }
  } catch (error) {
    recordTest('File upload', false, error.message || JSON.stringify(error));
    log('FAIL', 'Upload error:', error.message);
  }

  // Test 6: Folder Verification
  console.log('\n🔍 Test 6: Folder Structure Verification');
  console.log('─'.repeat(60));
  try {
    if (collegeFolderId) {
      const folderContents = await googleDriveService.verifyFolderStructure(collegeFolderId);
      recordTest('Folder contents retrieved', Array.isArray(folderContents));
      recordTest('Has subdirectories', folderContents && folderContents.length > 0);
      
      if (folderContents && folderContents.length > 0) {
        log('INFO', 'Subdirectories found', `: ${folderContents.length}`);
        folderContents.slice(0, 3).forEach(item => {
          log('INFO', `  - ${item.name}`, `(${item.mimeType})`);
        });
      }
    } else {
      log('INFO', 'Skipping folder verification', '(college folder not created)');
    }
  } catch (error) {
    recordTest('Folder structure verification', false, error.message || JSON.stringify(error));
  }

  // Summary
  console.log('\n═'.repeat(60));
  console.log('\n📊 Test Summary');
  console.log('─'.repeat(60));
  console.log(`✅ Passed: ${TEST_RESULTS.passed}`);
  console.log(`❌ Failed: ${TEST_RESULTS.failed}`);
  console.log(`📈 Total: ${TEST_RESULTS.tests.length}`);
  console.log(`🎯 Success Rate: ${((TEST_RESULTS.passed / TEST_RESULTS.tests.length) * 100).toFixed(1)}%`);

  // Detailed results
  if (TEST_RESULTS.failed > 0) {
    console.log('\n⚠️  Failed Tests:');
    TEST_RESULTS.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  ❌ ${t.name}`);
        if (t.error) console.log(`     Error: ${t.error}`);
      });
  }

  console.log('\n═'.repeat(60));
  
  if (TEST_RESULTS.failed === 0) {
    console.log('✅ All tests passed! Google Drive integration is working correctly.');
    console.log('💾 Auto-save to Google Drive is enabled and ready.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run tests
testGoogleDriveIntegration().catch(error => {
  console.error('Fatal test error:', error);
  process.exit(1);
});
