const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true }, // e.g., 'page_view', 'click', 'form_submit'
  path: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sessionId: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  userAgent: { type: String },
  ip: { type: String },
}, {
  timestamps: true
});

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

module.exports = AnalyticsEvent;
