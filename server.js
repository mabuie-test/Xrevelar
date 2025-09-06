const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const commandRoutes = require('./routes/commands');
const { connectDB } = require('./config/db');

const app = express();
connectDB();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/commands', commandRoutes);

// Servir frontend
app.use(express.static(path.join(__dirname, 'frontend/public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/public/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
