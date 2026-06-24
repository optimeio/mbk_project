import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Root drive folder ID - where all trainer folders are created
const ROOT_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '1Sy_OM3laf4VJBmsfamvIAHQMV7hYjPDl';
const AUTO_SYNC_ENABLED = process.env.GOOGLE_DRIVE_AUTO_SYNC === 'true';
const SYNC_INTERVAL = parseInt(process.env.GOOGLE_DRIVE_SYNC_INTERVAL || '5000', 10);
const USE_SHARED_DRIVE = process.env.GOOGLE_DRIVE_USE_SHARED_DRIVE === 'true';
const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID;

// Google Drive authentication setup
let driveClient = null;
let isInitialized = false;

const initializeGoogleDrive = async () => {
  try {
    if (isInitialized && driveClient) return driveClient;

    // Load service account credentials from environment variable or file
    const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || 
      path.join(__dirname, '..', 'config', 'google-service-account.json');
    
    const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON 
      ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
      : JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });

    const authClient = await auth.getClient();
    driveClient = google.drive({
      version: 'v3',
      auth: authClient,
    });

    isInitialized = true;
    // Silent initialization for production
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Google Drive initialized successfully');
    }
    return driveClient;
  } catch (error) {
    console.error('Google Drive initialization failed:', error.message);
    throw new Error(`Google Drive Auth Error: ${error.message}`);
  }
};

// Create folder structure for new trainer
export const createTrainerFolderStructure = async (trainerName) => {
  try {
    if (!driveClient) await initializeGoogleDrive();

    // Create main trainer folder under root
    const trainerFolder = await createFolder(trainerName, ROOT_DRIVE_FOLDER_ID);
    
    // Create documents subfolder
    const docsFolder = await createFolder('documents', trainerFolder.id);

    return {
      trainerId: trainerFolder.id,
      docsId: docsFolder.id,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Error creating trainer folder structure for ${trainerName}:`, error.message);
    }
    throw {
      type: 'FOLDER_CREATION_FAILED',
      message: error.message,
    };
  }
};

// Create college-specific folder structure
export const createCollegeFolderStructure = async (trainerFolderId, collegeName) => {
  try {
    if (!driveClient) await initializeGoogleDrive();

    // Create college folder under trainer folder
    const collegeFolder = await createFolder(collegeName, trainerFolderId);
    
    // Create 12 day folders with sub-folders
    const dayFolders = {};
    for (let day = 1; day <= 12; day++) {
      const dayFolderName = `day_${day}`;
      const dayFolder = await createFolder(dayFolderName, collegeFolder.id);
      
      // Create sub-folders for each day: attendance, geo_tag, ppt, videos
      const attendanceFolder = await createFolder('attendance', dayFolder.id);
      const geoTagFolder = await createFolder('geo_tag', dayFolder.id);
      const pptFolder = await createFolder('ppt', dayFolder.id);
      const videosFolder = await createFolder('videos', dayFolder.id);
      
      dayFolders[day] = {
        dayFolderId: dayFolder.id,
        attendance: attendanceFolder.id,
        geo_tag: geoTagFolder.id,
        ppt: pptFolder.id,
        videos: videosFolder.id,
      };
    }

    return {
      collegeFolderId: collegeFolder.id,
      dayFolders,
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Error creating college folder structure for ${collegeName}:`, error.message);
    }
    throw {
      type: 'FOLDER_CREATION_FAILED',
      message: error.message,
    };
  }
};

// Generic folder creation helper
const createFolder = async (folderName, parentFolderId) => {
  try {
    const response = await driveClient.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      },
      fields: 'id, name, webViewLink',
    });

    return response.data;
  } catch (error) {
    if (error.message.includes('PERMISSION_DENIED')) {
      throw {
        type: 'PERMISSION_DENIED',
        message: 'Insufficient permissions to create folder in Google Drive',
      };
    }
    throw error;
  }
};

// Upload file to specific folder with retry logic
export const uploadFileToGoogleDrive = async (
  filePath,
  fileName,
  targetFolderId,
  maxRetries = 3
) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!driveClient) await initializeGoogleDrive();

      const fileStats = fs.statSync(filePath);
      const mimeType = getMimeType(fileName);

      const requestBody = {
        name: fileName,
        mimeType: mimeType,
        parents: [targetFolderId],
        description: `Uploaded by MBK Trainer Management System - ${new Date().toISOString()}`,
      };

      const response = await driveClient.files.create(
        USE_SHARED_DRIVE && SHARED_DRIVE_ID
          ? {
              requestBody,
              media: {
                mimeType: mimeType,
                body: fs.createReadStream(filePath),
              },
              fields: 'id, name, size, webViewLink, createdTime',
              supportsAllDrives: true,
              supportsTeamDrives: true,
            }
          : {
              requestBody,
              media: {
                mimeType: mimeType,
                body: fs.createReadStream(filePath),
              },
              fields: 'id, name, size, webViewLink, createdTime',
            }
      );

      return {
        driveFileId: response.data.id,
        fileName: response.data.name,
        fileSize: fileStats.size,
        webViewLink: response.data.webViewLink,
        uploadedAt: response.data.createdTime,
      };
    } catch (error) {
      lastError = error;
      
      // Handle service account quota error with helpful guidance
      if (error.message && error.message.includes('Service Accounts do not have storage quota')) {
        throw {
          type: 'SERVICE_ACCOUNT_QUOTA_ERROR',
          message: 'Service accounts require shared drive configuration. See documentation for setup.',
          solution: 'Set GOOGLE_DRIVE_USE_SHARED_DRIVE=true and provide GOOGLE_DRIVE_SHARED_DRIVE_ID',
        };
      }

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // All retries failed
  throw {
    type: 'FILE_UPLOAD_FAILED',
    message: lastError?.message || 'Unknown upload error',
    attempts: maxRetries,
  };
};

// Helper to determine MIME type
const getMimeType = (fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.csv': 'text/csv',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Get folder information
export const getFolderInfo = async (folderId) => {
  try {
    if (!driveClient) await initializeGoogleDrive();

    const response = await driveClient.files.get({
      fileId: folderId,
      fields: 'id, name, webViewLink, parents',
    });

    return response.data;
  } catch (error) {
    throw {
      type: 'FOLDER_INFO_ERROR',
      message: error.message,
    };
  }
};

// Verify folder structure
export const verifyFolderStructure = async (collegeFolderId) => {
  try {
    if (!driveClient) await initializeGoogleDrive();

    const response = await driveClient.files.list({
      q: `'${collegeFolderId}' in parents and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name, mimeType)',
    });

    return response.data.files || [];
  } catch (error) {
    throw {
      type: 'VERIFY_ERROR',
      message: error.message,
    };
  }
};

// Initialize Google Drive on module import
export const initGoogleDrive = initializeGoogleDrive;

export default {
  initializeGoogleDrive,
  createTrainerFolderStructure,
  createCollegeFolderStructure,
  uploadFileToGoogleDrive,
  getFolderInfo,
  verifyFolderStructure,
};
