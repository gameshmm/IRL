import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Radio, Power, MonitorPlay, Camera, AlertCircle, Check,
  RefreshCw, Wifi, WifiOff, Square, Circle, ChevronRight,
  Layers, Settings2, ExternalLink, Copy
} from 'lucide-react';

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ active, label, color }) {
  return (
    <div className="obs-status-dot">
      <span className={`dot dot--${active ? color : 'off'}`} />
      <span className={active ? `dot-label dot-label--${color}` : 'dot-label dot-label--off'}>
        {label}
      </span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, variant = 'ghost', disabled, loading, danger }) {
  return (
    <button
      className={`btn btn-${danger ? 'danger' : variant} ${loading ? 'btn-loading' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
      title={label}
    >
      {loading ? <span className="loader" style={{ width: 15, height: 15 }} /> : <Icon size={16} />}
      {label}
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OBSPage() {
  const [obs, setObs] = useState({ connected: false, streaming: false, recording: false, currentScene: null, scenes: [] });
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('4455');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [signal, setSignal] = useState({ status: 'offline', bitrate: 0 });
  const overlayUrl = `http://${window.location.hostname}:3001/overlay/`;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  // Poll OBS status every 3s
  const fetchOBS = useCallback(async () => {
    try {
      const res = await axios.get('/api/obs/status');
      setObs(res.data);
      setError(null);
    } catch (err) {
      if (err.response?.status !== 401) setError('Erro ao buscar status do OBS');
    }
  }, []);

  // Poll signal state every 3s
  const fetchSignal = useCallback(async () => {
    try {
      const res = await axios.get('/signal/status');
      setSignal(res.data);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchOBS();
    fetchSignal();
    const interval = setInterval(() => { fetchOBS(); fetchSignal(); }, 3000);
    return () => clearInterval(interval);
  }, [fetchOBS, fetchSignal]);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await axios.post('/api/obs/connect', { host, port: parseInt(port), password });
      setObs(res.data);
      showToast('Conectado ao OBS com sucesso!');
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao conectar ao OBS. Verifique se o WebSocket está ativo.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.post('/api/obs/disconnect');
      setObs({ connected: false, streaming: false, recording: false, currentScene: null, scenes: [] });
      showToast('Desconectado do OBS');
    } catch (err) {
      showToast('Erro ao desconectar', 'error');
    }
  };

  const streamAction = async (action) => {
    setLoad('stream', true);
    try {
      const res = await axios.post(`/api/obs/stream/${action}`);
      showToast(res.data.message);
      setTimeout(fetchOBS, 1500);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao controlar stream', 'error');
    } finally {
      setLoad('stream', false);
    }
  };

  const recordAction = async (action) => {
    setLoad('record', true);
    try {
      const res = await axios.post(`/api/obs/record/${action}`);
      showToast(res.data.message);
      setTimeout(fetchOBS, 1500);
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao controlar gravação', 'error');
    } finally {
      setLoad('record', false);
    }
  };

  const switchScene = async (sceneName) => {
    setLoad(`scene_${sceneName}`, true);
    try {
      const res = await axios.post('/api/obs/scene', { sceneName });
      showToast(res.data.message);
      setObs(prev => ({ ...prev, currentScene: sceneName }));
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao trocar cena', 'error');
    } finally {
      setLoad(`scene_${sceneName}`, false);
    }
  };

  const copyOverlayUrl = async () => {
    await navigator.clipboard.writeText(overlayUrl);
    showToast('URL do overlay copiada!');
  };

  const signalColorMap = {
    live: 'green', weak: 'orange', lost: 'red',
    connecting: 'purple', offline: 'off'
  };
  const signalLabelMap = {
    live: '🔴 AO VIVO', weak: '⚠ Sinal Fraco', lost: '✗ Sinal Perdido',
    connecting: '◌ Conectando', offline: '— Offline'
  };

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <h1>Controle do OBS</h1>
        <p>Gerencie o OBS Studio remotamente via WebSocket — inicie streams, troque cenas e monitore o sinal</p>
      </div>

      {error && (
        <div className="obs-error-bar">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="obs-grid">

        {/* ── Connection Panel ── */}
        <div className="card obs-connect-card">
          <div className="obs-card-title">
            <Wifi size={16} color="var(--accent-primary)" />
            <h3>Conexão OBS WebSocket</h3>
          </div>
          <div className="divider" />

          {!obs.connected ? (
            <div className="obs-connect-form">
              <div className="obs-connect-info">
                <AlertCircle size={14} />
                <p>Ative o WebSocket no OBS: <strong>Ferramentas → WebSocket Server Settings → Enable</strong></p>
              </div>
              <div className="obs-fields-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Host</label>
                  <input id="obs-host" type="text" className="form-input" value={host}
                    onChange={e => setHost(e.target.value)} placeholder="localhost" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Porta</label>
                  <input id="obs-port" type="number" className="form-input" value={port}
                    onChange={e => setPort(e.target.value)} placeholder="4455" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Senha (opcional)</label>
                <input id="obs-password" type="password" className="form-input" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Senha do WebSocket" />
              </div>
              <button id="obs-connect-btn" className="btn btn-primary w-full" onClick={handleConnect} disabled={connecting}>
                {connecting
                  ? <><span className="loader" style={{ width: 15, height: 15 }} /> Conectando...</>
                  : <><Wifi size={15} /> Conectar ao OBS</>
                }
              </button>
            </div>
          ) : (
            <div className="obs-connected-info">
              <div className="obs-connected-badge">
                <span className="dot dot--green" />
                <span>Conectado em <code>{host}:{port}</code></span>
              </div>
              <div className="obs-status-row">
                <StatusDot active={obs.streaming} label="Stream" color="red" />
                <StatusDot active={obs.recording} label="Gravação" color="orange" />
              </div>
              <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>
                <WifiOff size={14} /> Desconectar
              </button>
            </div>
          )}
        </div>

        {/* ── Signal Monitor ── */}
        <div className={`card obs-signal-card obs-signal-card--${signal.status}`}>
          <div className="obs-card-title">
            <Radio size={16} />
            <h3>Monitor de Sinal RTMP</h3>
          </div>
          <div className="divider" />
          <div className="signal-status-display">
            <div className={`signal-badge signal-badge--${signalColorMap[signal.status] || 'off'}`}>
              {signalLabelMap[signal.status] || '— Offline'}
            </div>
            {signal.bitrate > 0 && (
              <div className="signal-bitrate">{signal.bitrate} kbps</div>
            )}
            {signal.streamPath && (
              <code className="signal-path">{signal.streamPath}</code>
            )}
            {signal.lostAt && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Perdido em: {new Date(signal.lostAt).toLocaleTimeString('pt-BR')}
              </p>
            )}
          </div>
        </div>

        {/* ── Stream Controls ── */}
        <div className="card">
          <div className="obs-card-title">
            <MonitorPlay size={16} color="var(--accent-red)" />
            <h3>Controle de Stream</h3>
          </div>
          <div className="divider" />

          {!obs.connected ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <WifiOff size={32} />
              <p>Conecte ao OBS primeiro</p>
            </div>
          ) : (
            <div className="obs-controls">
              <div className="stream-status-big">
                <div className={`stream-indicator ${obs.streaming ? 'stream-indicator--live' : ''}`}>
                  {obs.streaming ? '🔴 STREAM AO VIVO' : '⬛ STREAM PARADO'}
                </div>
              </div>

              <div className="obs-btn-group">
                {!obs.streaming ? (
                  <button id="obs-start-stream" className="btn obs-start-btn"
                    onClick={() => streamAction('start')} disabled={loading.stream}>
                    {loading.stream
                      ? <><span className="loader" style={{ width: 16, height: 16 }} /> Iniciando...</>
                      : <><Radio size={18} /> Iniciar Stream</>
                    }
                  </button>
                ) : (
                  <button id="obs-stop-stream" className="btn obs-stop-btn"
                    onClick={() => streamAction('stop')} disabled={loading.stream}>
                    {loading.stream
                      ? <><span className="loader" style={{ width: 16, height: 16 }} /> Parando...</>
                      : <><Square size={18} /> Parar Stream</>
                    }
                  </button>
                )}
              </div>

              <div className="divider" />

              {/* Recording */}
              <div className="obs-card-title" style={{ marginBottom: 12 }}>
                <Circle size={14} color={obs.recording ? 'var(--accent-red)' : 'var(--text-muted)'} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                  {obs.recording ? 'Gravando...' : 'Gravação'}
                </span>
              </div>
              <div className="obs-btn-group">
                <button className="btn btn-ghost btn-sm"
                  onClick={() => recordAction(obs.recording ? 'stop' : 'start')}
                  disabled={loading.record}>
                  {loading.record
                    ? <span className="loader" style={{ width: 14, height: 14 }} />
                    : obs.recording ? <><Square size={14} /> Parar Gravação</> : <><Circle size={14} /> Iniciar Gravação</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Scene Switcher ── */}
        <div className="card">
          <div className="obs-card-title">
            <Layers size={16} color="var(--accent-secondary)" />
            <h3>Cenas</h3>
            {obs.connected && (
              <button className="btn btn-ghost btn-sm btn-icon" onClick={fetchOBS} title="Atualizar">
                <RefreshCw size={13} />
              </button>
            )}
          </div>
          <div className="divider" />

          {!obs.connected ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <Layers size={32} />
              <p>Conecte ao OBS para ver as cenas</p>
            </div>
          ) : obs.scenes.length === 0 ? (
            <div className="empty-state" style={{ padding: 24 }}>
              <p>Nenhuma cena encontrada</p>
            </div>
          ) : (
            <div className="scenes-list">
              {obs.scenes.map(scene => (
                <button
                  key={scene}
                  className={`scene-item ${obs.currentScene === scene ? 'scene-item--active' : ''}`}
                  onClick={() => switchScene(scene)}
                  disabled={loading[`scene_${scene}`] || obs.currentScene === scene}
                >
                  <div className="scene-item-left">
                    {loading[`scene_${scene}`]
                      ? <span className="loader" style={{ width: 14, height: 14 }} />
                      : <Camera size={14} />
                    }
                    <span>{scene}</span>
                  </div>
                  {obs.currentScene === scene
                    ? <span className="badge badge-live" style={{ fontSize: '0.65rem' }}>ATUAL</span>
                    : <ChevronRight size={14} style={{ opacity: 0.4 }} />
                  }
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Overlay Setup ── */}
        <div className="card obs-overlay-card">
          <div className="obs-card-title">
            <Settings2 size={16} color="var(--accent-pink)" />
            <h3>Overlay de Sinal perdido</h3>
          </div>
          <div className="divider" />

          <div className="overlay-instructions">
            <div className="overlay-step">
              <span className="step-num">1</span>
              <p>Copie a URL abaixo e adicione como <strong>Browser Source</strong> no OBS</p>
            </div>
            <div className="overlay-url-row">
              <code className="code-block" style={{ flex: 1, fontSize: '0.78rem' }}>{overlayUrl}</code>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={copyOverlayUrl} title="Copiar URL">
                <Copy size={14} />
              </button>
              <a href={overlayUrl} target="_blank" rel="noreferrer"
                className="btn btn-ghost btn-sm btn-icon" title="Abrir overlay">
                <ExternalLink size={14} />
              </a>
            </div>

            <div className="overlay-step">
              <span className="step-num">2</span>
              <p>Configure o Browser Source com <strong>1920×1080</strong> e marque <strong>"Shut down source when not visible"</strong></p>
            </div>

            <div className="overlay-step">
              <span className="step-num">3</span>
              <p>Deixe o overlay na <strong>camada mais alta</strong> da cena no OBS</p>
            </div>

            <div className="overlay-preview">
              <div className="overlay-preview-label">Comportamento do overlay:</div>
              <div className="overlay-behavior-list">
                <div className="behavior-item behavior-item--red">
                  <span>🔴 Sinal Perdido</span>
                  <span>Tela escura animada com "Sinal Perdido"</span>
                </div>
                <div className="behavior-item behavior-item--orange">
                  <span>⚠ Sinal Fraco</span>
                  <span>Badge no canto com bitrate atual</span>
                </div>
                <div className="behavior-item behavior-item--purple">
                  <span>◌ Reconectando</span>
                  <span>Banner no topo "Reconectando..."</span>
                </div>
                <div className="behavior-item behavior-item--green">
                  <span>✓ Ao Vivo</span>
                  <span>Overlay invisível (transparente)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.type === 'success'
              ? <Check size={16} color="var(--accent-green)" />
              : <AlertCircle size={16} color="var(--accent-red)" />
            }
            {toast.msg}
          </div>
        </div>
      )}

      <style>{`
        .obs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 1024px) { .obs-grid { grid-template-columns: 1fr; } }

        .obs-error-bar {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,71,87,0.1); border: 1px solid rgba(255,71,87,0.25);
          border-radius: var(--radius-md); padding: 12px 16px;
          color: var(--accent-red); font-size: 0.875rem; margin-bottom: 20px;
        }

        .obs-card-title {
          display: flex; align-items: center; gap: 10px; margin-bottom: 0;
          flex-wrap: wrap;
        }
        .obs-card-title h3 { font-size: 0.95rem; flex: 1; }

        /* Connect */
        .obs-connect-form { display: flex; flex-direction: column; gap: 14px; }
        .obs-connect-info {
          display: flex; align-items: flex-start; gap: 8px;
          background: rgba(108,99,255,0.08); border: 1px solid rgba(108,99,255,0.15);
          border-radius: var(--radius-sm); padding: 10px 14px;
          font-size: 0.8rem; color: var(--text-secondary);
        }
        .obs-connect-info p { margin: 0; }
        .obs-connect-info strong { color: var(--accent-primary); }
        .obs-fields-row { display: flex; gap: 10px; }
        .obs-connected-info { display: flex; flex-direction: column; gap: 14px; }
        .obs-connected-badge {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.875rem; color: var(--text-secondary);
        }
        .obs-connected-badge code {
          color: var(--accent-secondary); background: rgba(0,212,255,0.08);
          padding: 2px 8px; border-radius: 4px;
        }
        .obs-status-row { display: flex; gap: 20px; }
        .obs-status-dot { display: flex; align-items: center; gap: 8px; }
        .dot {
          width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
        }
        .dot--green { background: var(--accent-green); box-shadow: 0 0 8px var(--accent-green); animation: glow-pulse 1.5s infinite; }
        .dot--red { background: var(--accent-red); box-shadow: 0 0 8px var(--accent-red); animation: glow-pulse 1.5s infinite; }
        .dot--orange { background: var(--accent-orange); box-shadow: 0 0 8px var(--accent-orange); animation: glow-pulse 1.5s infinite; }
        .dot--purple { background: var(--accent-primary); }
        .dot--off { background: var(--text-muted); }
        .dot-label { font-size: 0.8rem; font-weight: 600; }
        .dot-label--green { color: var(--accent-green); }
        .dot-label--red { color: var(--accent-red); }
        .dot-label--orange { color: var(--accent-orange); }
        .dot-label--off { color: var(--text-muted); }

        /* Signal */
        .obs-signal-card { transition: border-color 0.4s; }
        .obs-signal-card--live { border-color: rgba(0,230,118,0.3); }
        .obs-signal-card--weak { border-color: rgba(255,165,2,0.3); }
        .obs-signal-card--lost { border-color: rgba(255,71,87,0.3); }
        .obs-signal-card--connecting { border-color: rgba(108,99,255,0.3); }

        .signal-status-display { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }
        .signal-badge {
          display: inline-flex; align-items: center;
          padding: 8px 16px; border-radius: 99px;
          font-size: 0.95rem; font-weight: 800; letter-spacing: 1px;
          width: fit-content;
        }
        .signal-badge--green { background: rgba(0,230,118,0.15); color: var(--accent-green); border: 1px solid rgba(0,230,118,0.3); }
        .signal-badge--orange { background: rgba(255,165,2,0.15); color: var(--accent-orange); border: 1px solid rgba(255,165,2,0.3); }
        .signal-badge--red { background: rgba(255,71,87,0.15); color: var(--accent-red); border: 1px solid rgba(255,71,87,0.3); }
        .signal-badge--purple { background: rgba(108,99,255,0.15); color: var(--accent-primary); border: 1px solid rgba(108,99,255,0.3); }
        .signal-badge--off { background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--border-subtle); }
        .signal-bitrate { font-size: 2rem; font-weight: 800; color: var(--text-primary); }
        .signal-path { font-size: 0.75rem; color: var(--text-muted); word-break: break-all; }

        /* Stream Controls */
        .obs-controls { display: flex; flex-direction: column; gap: 14px; }
        .stream-status-big { text-align: center; padding: 8px 0; }
        .stream-indicator {
          display: inline-block;
          font-size: 1rem; font-weight: 800; letter-spacing: 2px;
          color: var(--text-muted);
          padding: 10px 24px; border-radius: 99px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-subtle);
        }
        .stream-indicator--live {
          color: #ff4757;
          background: rgba(255,71,87,0.12);
          border-color: rgba(255,71,87,0.3);
          animation: glow-pulse 2s infinite;
        }
        .obs-btn-group { display: flex; gap: 10px; }
        .obs-start-btn {
          background: linear-gradient(135deg, #ff4757, #ff6b9d);
          color: #fff; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: var(--radius-md);
          font-size: 1rem; font-weight: 700; width: 100%;
          justify-content: center;
          box-shadow: 0 6px 20px rgba(255,71,87,0.35);
          transition: all 0.2s ease;
        }
        .obs-start-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(255,71,87,0.5);
        }
        .obs-stop-btn {
          background: rgba(255,255,255,0.06);
          color: var(--text-secondary);
          border: 2px solid var(--border-subtle);
          cursor: pointer;
          display: flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: var(--radius-md);
          font-size: 1rem; font-weight: 700; width: 100%;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .obs-stop-btn:hover:not(:disabled) { border-color: var(--accent-red); color: var(--accent-red); }

        /* Scenes */
        .scenes-list { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
        .scene-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; border-radius: var(--radius-sm);
          border: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
          cursor: pointer; color: var(--text-secondary);
          font-size: 0.875rem; font-weight: 500;
          transition: all 0.2s; text-align: left; width: 100%;
        }
        .scene-item:hover:not(:disabled):not(.scene-item--active) {
          border-color: var(--border-glow); color: var(--text-primary);
          background: var(--bg-glass-hover);
        }
        .scene-item--active {
          border-color: rgba(108,99,255,0.4);
          background: rgba(108,99,255,0.1);
          color: var(--accent-primary);
          cursor: default;
        }
        .scene-item-left { display: flex; align-items: center; gap: 10px; }

        /* Overlay */
        .obs-overlay-card { grid-column: span 2; }
        @media (max-width: 1024px) { .obs-overlay-card { grid-column: span 1; } }
        .overlay-instructions { display: flex; flex-direction: column; gap: 16px; }
        .overlay-step { display: flex; align-items: flex-start; gap: 12px; }
        .step-num {
          width: 26px; height: 26px; flex-shrink: 0;
          border-radius: 50%;
          background: var(--grad-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 800; color: #fff;
        }
        .overlay-step p { font-size: 0.875rem; padding-top: 2px; }
        .overlay-step strong { color: var(--text-primary); }
        .overlay-url-row { display: flex; align-items: center; gap: 8px; margin-left: 38px; }

        .overlay-preview { margin-left: 38px; }
        .overlay-preview-label { font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-bottom: 10px; }
        .overlay-behavior-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        @media (max-width: 700px) { .overlay-behavior-list { grid-template-columns: 1fr; } }
        .behavior-item {
          display: flex; flex-direction: column; gap: 4px;
          padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid;
          font-size: 0.8rem;
        }
        .behavior-item span:first-child { font-weight: 700; }
        .behavior-item span:last-child { color: var(--text-muted); }
        .behavior-item--red { background: rgba(255,71,87,0.06); border-color: rgba(255,71,87,0.2); color: var(--accent-red); }
        .behavior-item--orange { background: rgba(255,165,2,0.06); border-color: rgba(255,165,2,0.2); color: var(--accent-orange); }
        .behavior-item--purple { background: rgba(108,99,255,0.06); border-color: rgba(108,99,255,0.2); color: var(--accent-primary); }
        .behavior-item--green { background: rgba(0,230,118,0.06); border-color: rgba(0,230,118,0.2); color: var(--accent-green); }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 8px currentColor; opacity: 1; }
          50% { box-shadow: 0 0 20px currentColor; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
