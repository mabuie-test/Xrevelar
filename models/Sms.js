const mongoose = require('mongoose');

const SmsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  address: String,
  body: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sms', SmsSchema);
