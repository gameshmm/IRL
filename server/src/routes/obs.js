const express = require('express');
const OBSWebSocket = require('obs-websocket-js').default;

const router = express.Router();
const obs = new OBSWebSocket();

// State
let obsState = {
  connected: false,
  streaming: false,
  recording: false,
  currentScene: null,
  scenes: [],
  host: 'localhost',
  port: 4455,
  password: ''
};

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

// ─── POST /api/obs/connect  ────────────────────────────────────────────────────
router.post('/connect', async (req, res) => {
  const { host = 'localhost', port = 4455, password = '' } = req.body;

  try {
    if (obsState.connected) {
      await obs.disconnect();
      obsState.connected = false;
    }

    await obs.connect(`ws://${host}:${port}`, password);
    obsState.connected = true;
    obsState.host = host;
    obsState.port = port;
    obsState.password = password;

    obs.on('ConnectionClosed', () => {
      obsState.connected = false;
      obsState.streaming = false;
      console.log('[OBS] Disconnected from OBS WebSocket');
    });

    obs.on('StreamStateChanged', (data) => {
      obsState.streaming = data.outputActive;
      console.log(`[OBS] Stream state: ${data.outputActive ? 'started' : 'stopped'}`);
    });

    obs.on('CurrentProgramSceneChanged', (data) => {
      obsState.currentScene = data.sceneName;
      console.log(`[OBS] Scene changed to: ${data.sceneName}`);
    });

    obs.on('RecordStateChanged', (data) => {
      obsState.recording = data.outputActive;
    });

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

// ─── POST /api/obs/disconnect  ─────────────────────────────────────────────────
router.post('/disconnect', async (req, res) => {
  try {
    if (obsState.connected) {
      await obs.disconnect();
    }
    obsState.connected = false;
    res.json({ message: 'Desconectado do OBS' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/obs/status  ──────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  if (!obsState.connected) {
    return res.json({ connected: false, streaming: false, recording: false, currentScene: null, scenes: [] });
  }

  await getOBSStatus();
  res.json(obsState);
});

// ─── POST /api/obs/stream/start  ──────────────────────────────────────────────
router.post('/stream/start', async (req, res) => {
  if (!obsState.connected) return res.status(400).json({ error: 'OBS não conectado' });
  try {
    await obs.call('StartStream');
    res.json({ message: 'Stream iniciado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/obs/stream/stop  ───────────────────────────────────────────────
router.post('/stream/stop', async (req, res) => {
  if (!obsState.connected) return res.status(400).json({ error: 'OBS não conectado' });
  try {
    await obs.call('StopStream');
    res.json({ message: 'Stream encerrado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/obs/stream/toggle  ─────────────────────────────────────────────
router.post('/stream/toggle', async (req, res) => {
  if (!obsState.connected) return res.status(400).json({ error: 'OBS não conectado' });
  try {
    await obs.call('ToggleStream');
    res.json({ message: 'Stream alternado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/obs/scene  ─────────────────────────────────────────────────────
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

// ─── GET /api/obs/scenes  ─────────────────────────────────────────────────────
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

// ─── POST /api/obs/record/start  ──────────────────────────────────────────────
router.post('/record/start', async (req, res) => {
  if (!obsState.connected) return res.status(400).json({ error: 'OBS não conectado' });
  try {
    await obs.call('StartRecord');
    res.json({ message: 'Gravação iniciada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/obs/record/stop  ───────────────────────────────────────────────
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
