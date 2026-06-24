/**
 * Trainer Auto-Save Service
 * Ensures all trainer documents are automatically saved to Google Drive
 * without missing any data during registration or uploads
 */

import fs from "fs/promises";
import path from "path";
import { uploadToDrive } from "./googleDriveService.mjs";
import { ensureTrainerDocumentHierarchy } from "../utils/trainerDocumentWorkflow.js";
import TrainerDocument from "../models/TrainerDocument.js";

/**
 * Auto-save trainer document to Google Drive
 * @param {Object} params - Save parameters
 * @param {String} params.trainerId - Trainer ID
 * @param {String} params.trainerName - Trainer full name (for folder structure)
 * @param {String} params.filePath - Local file path to upload
 * @param {String} params.fileName - Display name for the file
 * @param {String} params.documentType - Type: resume, certificate, ndaAgreement, etc.
 * @param {String} params.mimeType - MIME type of file
 * @returns {Promise<Object>} Google Drive file metadata
 */
export const autoSaveTrainerDocument = async ({
  trainerId,
  trainerName,
  filePath,
  fileName,
  documentType = "document",
  mimeType = "application/octet-stream",
}) => {
  try {
    // Step 1: Ensure trainer document hierarchy exists in Google Drive
    const hierarchy = await ensureTrainerDocumentHierarchy({
      trainerId,
      trainerName,
    });

    if (!hierarchy?.trainerDocsFolder?.id) {
      throw new Error("Failed to create trainer documents folder in Google Drive");
    }

    // Step 2: Read the file from disk
    const fileBuffer = await fs.readFile(filePath);

    // Step 3: Upload to Google Drive under trainer's documents folder
    const uploadResult = await uploadToDrive({
      fileName: fileName || path.basename(filePath),
      fileBuffer,
      mimeType,
      parentFolderId: hierarchy.trainerDocsFolder.id,
    });

    if (!uploadResult?.id) {
      throw new Error("Failed to upload file to Google Drive");
    }

    // Step 4: Record in database with Google Drive reference
    const trainerDoc = await TrainerDocument.create({
      trainerId,
      documentType,
      fileName: fileName || path.basename(filePath),
      mimeType,
      googleDriveFileId: uploadResult.id,
      googleDriveFolderId: hierarchy.trainerDocsFolder.id,
      driveLink: uploadResult.webViewLink || null,
      uploadedAt: new Date(),
      syncedToGoogleDrive: true,
    });

    console.log(
      `[AUTO-SAVE] ${documentType} auto-saved for trainer ${trainerId}: ${uploadResult.id}`
    );

    return {
      success: true,
      document: trainerDoc,
      googleDriveId: uploadResult.id,
      driveLink: uploadResult.webViewLink,
    };
  } catch (error) {
    console.error(
      `[AUTO-SAVE ERROR] Failed to auto-save ${documentType} for trainer ${trainerId}:`,
      error.message
    );

    // Log error but don't fail registration
    // User can manually upload later or admin can retry
    return {
      success: false,
      error: error.message,
      documentType,
      trainerId,
      timestamp: new Date(),
    };
  }
};

/**
 * Auto-save multiple trainer documents (batch)
 * @param {Array} documents - Array of document objects
 * @returns {Promise<Array>} Results array with success/failure status
 */
export const autoSaveTrainerDocuments = async (documents = []) => {
  const results = await Promise.all(
    documents.map((doc) => autoSaveTrainerDocument(doc))
  );
  return results;
};

/**
 * Verify and sync trainer documents to Google Drive
 * Checks for any missing documents and re-syncs if needed
 * @param {String} trainerId - Trainer ID
 * @returns {Promise<Object>} Sync status report
 */
export const verifySyncTrainerDocuments = async (trainerId) => {
  try {
    const docs = await TrainerDocument.find({ trainerId });

    const syncReport = {
      trainerId,
      totalDocuments: docs.length,
      syncedToGoogleDrive: 0,
      notSynced: [],
      syncErrors: [],
    };

    for (const doc of docs) {
      if (doc.syncedToGoogleDrive && doc.googleDriveFileId) {
        syncReport.syncedToGoogleDrive += 1;
      } else {
        syncReport.notSynced.push({
          documentId: doc._id,
          documentType: doc.documentType,
          fileName: doc.fileName,
        });
      }
    }

    console.log(`[VERIFY-SYNC] Trainer ${trainerId}: ${syncReport.syncedToGoogleDrive}/${syncReport.totalDocuments} synced`);

    return syncReport;
  } catch (error) {
    console.error(`[VERIFY-SYNC ERROR] Failed to verify trainer ${trainerId}:`, error.message);
    return {
      error: error.message,
      trainerId,
    };
  }
};

/**
 * Retry sync for failed documents
 * @param {String} trainerId - Trainer ID
 * @returns {Promise<Object>} Retry status
 */
export const retrySyncFailedDocuments = async (trainerId) => {
  try {
    const unsynced = await TrainerDocument.find({
      trainerId,
      syncedToGoogleDrive: false,
    });

    const retryResults = {
      totalRetried: unsynced.length,
      successful: 0,
      failed: [],
    };

    for (const doc of unsynced) {
      try {
        // Attempt to re-upload
        const result = await autoSaveTrainerDocument({
          trainerId,
          fileName: doc.fileName,
          documentType: doc.documentType,
          mimeType: doc.mimeType,
        });

        if (result.success) {
          retryResults.successful += 1;
          doc.syncedToGoogleDrive = true;
          doc.googleDriveFileId = result.googleDriveId;
          await doc.save();
        } else {
          retryResults.failed.push({
            documentId: doc._id,
            error: result.error,
          });
        }
      } catch (error) {
        retryResults.failed.push({
          documentId: doc._id,
          error: error.message,
        });
      }
    }

    console.log(
      `[RETRY-SYNC] Trainer ${trainerId}: ${retryResults.successful}/${retryResults.totalRetried} documents recovered`
    );

    return retryResults;
  } catch (error) {
    console.error(`[RETRY-SYNC ERROR] Failed to retry sync for trainer ${trainerId}:`, error.message);
    return {
      error: error.message,
      trainerId,
    };
  }
};

export default {
  autoSaveTrainerDocument,
  autoSaveTrainerDocuments,
  verifySyncTrainerDocuments,
  retrySyncFailedDocuments,
};
