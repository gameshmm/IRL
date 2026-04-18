const express = require('express');
const os = require('os');
const osUtils = require('node-os-utils');

const router = express.Router();

/**
 * GET /api/status
 * Retorna status do servidor, CPU, RAM e streams ativos
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

    // Obtém sessões ativas do Map mantido pelo index.js (fonte autoritativa)
    let activeSessionsList = [];
    try {
      const { activeSessions } = require('../index');
      activeSessions.forEach((session, id) => {
        activeSessionsList.push({
          id,
          path: session.StreamPath,
          startTime: session.startedAtISO || null
        });
      });
    } catch (e) {
      // index.js ainda não disponível na inicialização
    }

    res.json({
      status: 'online',
      uptime: { hours, minutes, seconds, raw: uptime },
      cpu: {
        usage: cpuUsage.toFixed(1),
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Desconhecido'
      },
      memory: {
        usedPercentage: (100 - memInfo.freeMemPercentage).toFixed(1),
        totalGb: (memInfo.totalMemMb / 1024).toFixed(2),
        usedGb: ((memInfo.totalMemMb - memInfo.freeMemMb) / 1024).toFixed(2),
        freeGb: (memInfo.freeMemMb / 1024).toFixed(2)
      },
      streams: {
        active: activeSessionsList.length,
        sessions: activeSessionsList
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
