import mongoose from 'mongoose';

// Error Log Model - comprehensive error tracking for audit and debugging
const errorLogSchema = new mongoose.Schema({
  trainerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trainer',
  },
  uploadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainerUpload',
  },
  errorType: {
    type: String,
    enum: [
      'GOOGLE_DRIVE_AUTH_ERROR',
      'FOLDER_CREATION_FAILED',
      'FILE_UPLOAD_FAILED',
      'PERMISSION_DENIED',
      'QUOTA_EXCEEDED',
      'NETWORK_ERROR',
      'INVALID_FILE_FORMAT',
      'DATABASE_ERROR',
      'VALIDATION_ERROR',
      'TIMEOUT_ERROR',
      'UNKNOWN_ERROR'
    ],
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  message: String,
  stack: String,
  metadata: {
    trainerId: String,
    trainerName: String,
    collegeId: String,
    collegeName: String,
    day: Number,
    uploadType: String,
    fileName: String,
    attemptNumber: Number,
  },
  resolvedAt: Date,
  resolution: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Index for efficient error querying
errorLogSchema.index({ errorType: 1, createdAt: -1 });
errorLogSchema.index({ severity: 1, resolvedAt: 1 });
errorLogSchema.index({ trainerId: 1, createdAt: -1 });

export default mongoose.model('ErrorLog', errorLogSchema);
