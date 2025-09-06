const express = require('express');
const jwt = require('jsonwebtoken');

const router = express.Router();
let commands = {}; // Simples em memória (em produção: usar DB)

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

router.post('/send', auth, (req, res) => {
  const { command } = req.body;
  commands[req.userId] = command;
  res.json({ success: true });
});

router.get('/receive', auth, (req, res) => {
  const cmd = commands[req.userId] || null;
  commands[req.userId] = null; // limpa depois de entregar
  res.json({ command: cmd });
});

module.exports = router;
