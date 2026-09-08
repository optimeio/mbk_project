import mongoose from 'mongoose';

// Trainer Upload Model - tracks daily uploads to Google Drive
const trainerUploadSchema = new mongoose.Schema({
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainer',
    required: true,
  },
  trainerName: String,
  collegeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true,
  },
  collegeName: String,
  day: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  uploadType: {
    type: String,
    enum: ['attendance', 'geo_tag', 'excel_sheet'],
    required: true,
  },
  fileName: String,
  fileSize: Number,
  mimeType: String,
  driveFileId: String,
  driveFolderPath: String, // NM Trainers/[TRAINER_NAME]/[COLLEGE_NAME]/day_X/[uploadType]/
  uploadStatus: {
    type: String,
    enum: ['pending', 'uploading', 'success', 'failed'],
    default: 'pending',
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  errorLog: {
    message: String,
    code: String,
    timestamp: Date,
  },
  uploadedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Index for efficient querying
trainerUploadSchema.index({ trainerId: 1, collegeId: 1, day: 1, uploadType: 1 });
trainerUploadSchema.index({ uploadStatus: 1, createdAt: -1 });

export default mongoose.model('TrainerUpload', trainerUploadSchema);
