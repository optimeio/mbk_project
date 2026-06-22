import mongoose from 'mongoose';

// Trainer Model - stores trainer info and registration details
const trainerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{10}$/,
  },
  qualifications: [{
    type: String,
    required: true,
  }],
  profileImage: {
    url: String,
    driveId: String,
  },
  documents: [{
    fileName: String,
    fileType: String,
    driveId: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  registrationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  googleDriveFolderId: {
    type: String,
    required: false,
  }, // NM Trainers/[TRAINER_NAME]/documents/
  colleges: [{
    collegeId: mongoose.Schema.Types.ObjectId,
    collegeName: String,
    googleDriveFolderId: String, // NM Trainers/[TRAINER_NAME]/[COLLEGE_NAME]/
    assignedDate: Date,
    status: {
      type: String,
      enum: ['active', 'completed'],
      default: 'active',
    },
  }],
  verificationStatus: {
    type: String,
    enum: ['unverified', 'verified'],
    default: 'unverified',
  },
  lastLoginDate: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.model('Trainer', trainerSchema);
