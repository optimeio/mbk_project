import mongoose from 'mongoose';

// College Model - stores college information
const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  city: String,
  state: String,
  country: String,
  totalTrainers: {
    type: Number,
    default: 0,
  },
  trainingDays: {
    type: Number,
    default: 12,
  },
  adminNotes: String,
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.model('College', collegeSchema);
