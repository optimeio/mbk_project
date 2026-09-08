const mongoose = require('mongoose');

const webMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  interest: { type: String, default: null },
  message: { type: String, required: true },
}, {
  timestamps: true
});

const WebMessage = mongoose.model('WebMessage', webMessageSchema);

module.exports = WebMessage;
