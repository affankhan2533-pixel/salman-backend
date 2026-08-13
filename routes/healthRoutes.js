const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { sendSuccess } = require('../utils/responseHandler');

router.get('/health', (req, res) => {
  const dbStateMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  const healthData = {
    status: 'UP',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStateMap[mongoose.connection.readyState] || 'Unknown',
      host: mongoose.connection.host || 'localhost',
      name: mongoose.connection.name || 'salman_hair_studio',
    },
    memory: {
      rssMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      heapTotalMB: Math.round(process.memoryUsage().heapTotal / (1024 * 1024)),
      heapUsedMB: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
    },
  };

  return sendSuccess(res, 'Salman Hair Studio Server Health Operational', healthData);
});

module.exports = router;
