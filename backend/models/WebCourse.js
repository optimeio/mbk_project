const mongoose = require('mongoose');

const webCourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, default: null },
  price: { type: String, default: null },
  duration: { type: String, default: null },
  description: { type: String, default: null },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, {
  timestamps: true
});

const WebCourse = mongoose.model('WebCourse', webCourseSchema);

module.exports = WebCourse;
