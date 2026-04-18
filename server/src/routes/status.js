const express = require('express');
const os = require('os');
const osUtils = require('node-os-utils');

const router = express.Router();

/**
 * GET /api/status
 * Returns server status, CPU, RAM and active streams
 */
router.get('/', async (req, res) => {
  try {
    const cpu = osUtils.cpu;
    const mem = osUtils.mem;

    const cpuUsage = await cpu.usage();
    const memInfo = await mem.info();

    const uptime = os.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    // Try to get active sessions from NMS
    let activeSessions = [];
    try {
      const { nms } = require('../index');
      const sessions = nms.getAllSessions();
      if (sessions) {
        sessions.forEach((session, id) => {
          if (session.publishStreamPath) {
            activeSessions.push({
              id,
              path: session.publishStreamPath,
              startTime: session.startTimestamp || null
            });
          }
        });
      }
    } catch (e) {
      // NMS not yet available
    }

    res.json({
      status: 'online',
      uptime: { hours, minutes, seconds, raw: uptime },
      cpu: {
        usage: cpuUsage.toFixed(1),
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown'
      },
      memory: {
        usedPercentage: (100 - memInfo.freeMemPercentage).toFixed(1),
        totalGb: (memInfo.totalMemMb / 1024).toFixed(2),
        usedGb: ((memInfo.totalMemMb - memInfo.freeMemMb) / 1024).toFixed(2),
        freeGb: (memInfo.freeMemMb / 1024).toFixed(2)
      },
      streams: {
        active: activeSessions.length,
        sessions: activeSessions
      },
      platform: os.platform(),
      hostname: os.hostname()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err.message
    });
  }
});

module.exports = router;
