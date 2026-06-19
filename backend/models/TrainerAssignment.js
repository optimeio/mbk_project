const mongoose = require('mongoose');

const trainerAssignmentSchema = new mongoose.Schema({
  trainerName: { type: String, required: false },
  collegeName: { type: String, required: false },
  batchName: { type: String, required: false },
  active: { type: Boolean, default: true },
  assignedAt: { type: Date, default: Date.now },
  
  collegename: { type: String, required: false },
  trainername: { type: String, required: false },
  trainerid: { type: String, required: false },
  scheduleDate: { type: String, required: false },
  status: { type: String, required: false, default: 'assigned' }
}, { timestamps: true });

trainerAssignmentSchema.index({ trainerName: 1, collegeName: 1, active: 1 }, { unique: false });

module.exports = mongoose.model('TrainerAssignment', trainerAssignmentSchema);
