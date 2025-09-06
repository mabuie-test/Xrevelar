const express = require('express');
const jwt = require('jsonwebtoken');
const Location = require('../models/Location');
const Sms = require('../models/Sms');
const Call = require('../models/Call');
const Contact = require('../models/Contact');
const Notification = require('../models/Notification');

const router = express.Router();

// Middleware para autenticação
function auth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

router.post('/location', auth, async (req, res) => {
  const loc = new Location({ user: req.userId, ...req.body });
  await loc.save();
  res.json({ success: true });
});

router.post('/sms', auth, async (req, res) => {
  const sms = new Sms({ user: req.userId, ...req.body });
  await sms.save();
  res.json({ success: true });
});

router.post('/call', auth, async (req, res) => {
  const call = new Call({ user: req.userId, ...req.body });
  await call.save();
  res.json({ success: true });
});

router.post('/contact', auth, async (req, res) => {
  const contact = new Contact({ user: req.userId, ...req.body });
  await contact.save();
  res.json({ success: true });
});

router.post('/notification', auth, async (req, res) => {
  const notif = new Notification({ user: req.userId, ...req.body });
  await notif.save();
  res.json({ success: true });
});

module.exports = router;
