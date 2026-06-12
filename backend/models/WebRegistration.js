const mongoose = require('mongoose');

const webRegistrationSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  qualification: { type: String, default: null },
  timing: { type: String, default: null },
  mode: { type: String, enum: ['Online', 'Offline'], default: 'Offline' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebCourse' },
}, {
  timestamps: true
});

const WebRegistration = mongoose.model('WebRegistration', webRegistrationSchema);

module.exports = WebRegistration;
