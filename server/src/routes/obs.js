const express = require('express');
const OBSWebSocket = require('obs-websocket-js').default;
const { getSetting, upsertSetting } = require('../db');

const router = express.Router();
const obs = new OBSWebSocket();

// Estado
const obsState = {
  connected: false,
  streaming: false,
  recording: false,
  currentScene: null,
  scenes: [],
  host: 'localhost',
  port: 4455,
  password: '',
  reconnecting: false,
  reconnectAttempts: 0
};

let reconnectTimer = null;
const MAX_RECONNECT_DELAY_MS = 30000;
let listenersBound = false;

function setupEventListeners() {
  if (listenersBound) return;
  listenersBound = true;

  obs.on('ConnectionClosed', () => {
    const wasConnected = obsState.connected;
    obsState.connected = false;
    obsState.streaming = false;
    obsState.recording = false;
    console.log('[OBS] Desconectado do OBS WebSocket');
    if (wasConnected && obsState.host) {
      scheduleReconnect();
    }
  });

  obs.on('StreamStateChanged', (data) => {
    obsState.streaming = data.outputActive;
    console.log(`[OBS] Estado do stream: ${data.outputActive ? 'iniciado' : 'encerrado'}`);
  });

  obs.on('CurrentProgramSceneChanged', (data) => {
    obsState.currentScene = data.sceneName;
    console.log(`[OBS] Cena alterada para: ${data.sceneName}`);
  });

  obs.on('RecordStateChanged', (data) => {
    obsState.recording = data.outputActive;
    console.log(`[OBS] Gravação: ${data.outputActive ? 'iniciada' : 'encerrada'}`);
  });
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(2000 * Math.pow(1.5, obsState.reconnectAttempts), MAX_RECONNECT_DELAY_MS);
  obsState.reconnectAttempts++;
  obsState.reconnecting = true;
  console.log(`[OBS] Tentando reconectar em ${(delay / 1000).toFixed(1)}s (tentativa ${obsState.reconnectAttempts})...`);

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (obsState.connected) return;
    try {
      await obs.connect(`ws://${obsState.host}:${obsState.port}`, obsState.password);
      obsState.connected = true;
      obsState.reconnecting = false;
      obsState.reconnectAttempts = 0;
      await getOBSStatus();
      console.log('[OBS] Reconectado com sucesso!');
    } catch (err) {
      console.warn(`[OBS] Falha ao reconectar: ${err.message}`);
      scheduleReconnect();
    }
  }, delay);
}

async function getOBSStatus() {
  try {
    const [streamStatus, recordStatus, sceneList, currentScene] = await Promise.all([
      obs.call('GetStreamStatus'),
      obs.call('GetRecordStatus'),
      obs.call('GetSceneList'),
      obs.call('GetCurrentProgramScene')
    ]);

    obsState.streaming = streamStatus.outputActive;
    obsState.recording = recordStatus.outputActive;
    obsState.scenes = sceneList.scenes.map(s => s.sceneName).reverse();
    obsState.currentScene = currentScene.currentProgramSceneName;

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// ─── POST /api/obs/connect ───────────────────────────────────────────────────
router.post('/connect', async (req, res) => {
  const { host = 'localhost', port = 4455, password = '' } = req.body;

  try {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (obsState.connected) {
      try { await obs.disconnect(); } catch (_) {}
      obsState.connected = false;
    }

    setupEventListeners();

    await obs.connect(`ws://${host}:${port}`, password);

    obsState.connected = true;
    obsState.reconnecting = false;
    obsState.reconnectAttempts = 0;
    obsState.host = host;
    obsState.port = port;
    obsState.password = password;

    // Persiste preferências no banco
    upsertSetting('obs_host', host);
    upsertSetting('obs_port', port);
    upsertSetting('obs_password', password);

    await getOBSStatus();

    res.json({
      message: 'Conectado ao OBS com sucesso',
      ...obsState
    });
  } catch (err) {
    obsState.connected = false;
    res.status(500).json({ error: `Falha ao conectar: ${err.message}` });
  }
});

// ─── POST /api/obs/disconnect ────────────────────────────────────────────────
router.post('/disconnect', async (req, res) => {
  try {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    obsState.reconnecting = false;
    obsState.reconnectAttempts = 0;

    if (obsState.connected) {
      await obs.disconnect();
    }
    obsState.connected = false;
    res.json({ message: 'Desconectado do OBS' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/obs/status ─────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  const savedHost = getSetting('obs_host', obsState.host) || 'localhost';
  const savedPort = parseInt(getSetting('obs_port', obsState.port), 10) || 4455;

  if (!obsState.connected) {
    return res.json({
      connected: false,
      streaming: false,
      recording: false,
      currentScene: null,
      scenes: [],
      host: savedHost,
      port: savedPort,
      reconnecting: obsState.reconnecting,
      reconnectAttempts: obsState.reconnectAttempts
    });
  }

  await getOBSStatus();
  res.json(obsState);
});

// ─── POST /api/obs/stream/start ─────────────────────────────────────────────
router.post('/stream/start', async (req, res) => {
  if (!obsState.connected) return res.status(400).json({ error: 'OBS não conectado' });
  try {
    await obs.call('StartStream');
    res.json({ message: 'Stream iniciado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/obs/stream/stop ──────────────────────────────────────────────
router.post('/stream/stop', async (req, res) => {
  if (!obsState.connected) return res.status(400).json({ error: 'OBS não conectado' });
  try {
    await obs.call('StopStream');
    res.json({ message: 'Stream encerrado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/obs/stream/toggle ────────────────────────────────────────────
router.post('/stream/toggle', async (req, res) => {
  if (!obsState.connected) return res.status(400).json({ error: 'OBS não conectado' });
  try {
    await obs.call('ToggleStream');
    res.json({ message: 'Stream alternado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/obs/scene ────────────────────────────────────────────────────
router.post('/scene', async (req, res) => {
  if (!obsState.connected) return res.status(400).json({ error: 'OBS não conectado' });
  const { sceneName } = req.body;
  if (!sceneName) return res.status(400).json({ error: 'sceneName é obrigatório' });

  try {
    await obs.call('SetCurrentProgramScene', { sceneName });
    obsState.currentScene = sceneName;
    res.json({ message: `Cena alterada para "${sceneName}"` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/obs/scenes ────────────────────────────────────────────────────
router.get('/scenes', async (req, res) => {
  if (!obsState.connected) return res.json({ scenes: [], currentScene: null });
  try {
    const data = await obs.call('GetSceneList');
    const currentData = await obs.call('GetCurrentProgramScene');
    const scenes = data.scenes.map(s => s.sceneName).reverse();
    obsState.scenes = scenes;
    obsState.currentScene = currentData.currentProgramSceneName;
    res.json({ scenes, currentScene: obsState.currentScene });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/obs/record/start ─────────────────────────────────────────────
router.post('/record/start', async (req, res) => {
  if (!obsState.connected) return res.status(400).json({ error: 'OBS não conectado' });
  try {
    await obs.call('StartRecord');
    res.json({ message: 'Gravação iniciada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/obs/record/stop ──────────────────────────────────────────────
router.post('/record/stop', async (req, res) => {
  if (!obsState.connected) return res.status(400).json({ error: 'OBS não conectado' });
  try {
    await obs.call('StopRecord');
    res.json({ message: 'Gravação encerrada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
