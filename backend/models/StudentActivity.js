const mongoose = require('mongoose');

const StudentActivitySchema = new mongoose.Schema({
  photoUrl: { type: String, required: true }, // relative path or URL
  classId: { type: String, required: true },
  className: { type: String },
  batchName: { type: String },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
  trainerName: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: { type: Number },
  address: { type: String }
});

module.exports = mongoose.model('StudentActivity', StudentActivitySchema);
