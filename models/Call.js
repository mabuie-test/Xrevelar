const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  number: String,
  type: String,
  date: { type: Date, default: Date.now },
  duration: Number
});

module.exports = mongoose.model('Call', CallSchema);
