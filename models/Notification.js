const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  app: String,
  title: String,
  text: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
