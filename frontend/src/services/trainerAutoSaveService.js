/**
 * Frontend Auto-Save Service
 * Handles real-time auto-save status and Google Drive sync feedback
 */

import { api } from '@/services/api';

/**
 * Auto-save trainer document
 * @param {FormData} formData - Form data with file and metadata
 * @returns {Promise<Object>} Save status with Google Drive link
 */
export const autoSaveTrainerDocumentToGoogleDrive = async (formData) => {
  try {
    const response = await api.post(
      '/trainers/auto-save-document',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return {
      success: true,
      data: response.data,
      googleDriveLink: response.data?.driveLink,
      fileId: response.data?.googleDriveId,
    };
  } catch (error) {
    console.error('Auto-save error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Verify trainer documents are synced to Google Drive
 * @param {String} trainerId - Trainer ID
 * @returns {Promise<Object>} Sync status report
 */
export const verifyTrainerDocumentSync = async (trainerId) => {
  try {
    const response = await api.get(
      `/trainers/${trainerId}/verify-sync`
    );

    return {
      success: true,
      data: response.data,
      syncedCount: response.data?.syncedToGoogleDrive,
      totalCount: response.data?.totalDocuments,
    };
  } catch (error) {
    console.error('Verify sync error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Retry failed document syncs
 * @param {String} trainerId - Trainer ID
 * @returns {Promise<Object>} Retry status
 */
export const retryFailedDocumentSync = async (trainerId) => {
  try {
    const response = await api.post(
      `/trainers/${trainerId}/retry-sync`
    );

    return {
      success: true,
      data: response.data,
      successCount: response.data?.successful,
      failedCount: response.data?.failed?.length || 0,
    };
  } catch (error) {
    console.error('Retry sync error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

/**
 * Get auto-save status for a trainer
 * @param {String} trainerId - Trainer ID
 * @returns {Promise<Object>} Auto-save status
 */
export const getTrainerAutoSaveStatus = async (trainerId) => {
  try {
    const response = await api.get(
      `/trainers/${trainerId}/auto-save-status`
    );

    return {
      success: true,
      data: response.data,
      isAutoSaveEnabled: response.data?.autoSaveEnabled || false,
      lastSyncTime: response.data?.lastSyncTime,
      documentsFolderLink: response.data?.documentsFolderLink,
    };
  } catch (error) {
    console.error('Get auto-save status error:', error);
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    };
  }
};

export default {
  autoSaveTrainerDocumentToGoogleDrive,
  verifyTrainerDocumentSync,
  retryFailedDocumentSync,
  getTrainerAutoSaveStatus,
};
