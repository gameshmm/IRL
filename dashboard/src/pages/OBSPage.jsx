import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Radio, Power, MonitorPlay, Camera, AlertCircle, Check,
  RefreshCw, Wifi, WifiOff, Square, Circle, ChevronRight,
  Layers, Settings2, ExternalLink, Copy, Sliders, Play, Film
} from 'lucide-react';

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

export default function OBSPage() {
  const [obs, setObs] = useState({
    connected: false, streaming: false, recording: false,
    currentScene: null, scenes: [], reconnecting: false, reconnectAttempts: 0
  });
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('4455');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [signal, setSignal] = useState({ status: 'offline', bitrate: 0 });

  // URL dinâmica sem porta fixa 3001 para funcionar sob qualquer proxy ou domínio
  const overlayUrl = `${window.location.protocol}//${window.location.host}/overlay/`;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  const fetchOBS = useCallback(async () => {
    try {
      const res = await axios.get('/api/obs/status');
      setObs(res.data);
      if (res.data.host) setHost(res.data.host);
      if (res.data.port) setPort(String(res.data.port));
      setError(null);
    } catch (err) {
      if (err.response?.status !== 401) setError('Não foi possível verificar status do OBS');
    }
  }, []);

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
      const res = await axios.post('/api/obs/connect', { host, port: parseInt(port, 10), password });
      setObs(res.data);
      showToast('Conectado ao OBS com sucesso!');
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao conectar ao OBS. Verifique se o WebSocket Server está ativado nas ferramentas do OBS.');
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
      setTimeout(fetchOBS, 1000);
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
      setTimeout(fetchOBS, 1000);
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

  return (
    <div className="obs-view animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Mesa de Controle OBS Studio</h1>
          <p>Automação e controle remoto de estúdio via WebSocket — troca de cenas e acionamento de live</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-sm" onClick={fetchOBS}>
            <RefreshCw size={14} /> Atualizar Cenas
          </button>
        </div>
      </div>

      {error && (
        <div className="studio-alert studio-alert--lost" style={{ marginBottom: 20 }}>
          <div className="flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        </div>
      )}

      {/* Grid Principal */}
      <div className="grid grid-2" style={{ marginBottom: 24 }}>

        {/* ── Painel de Conexão WebSocket ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Wifi size={18} color="var(--cyan-neon)" /> Conexão OBS WebSocket v5
            </div>
            {obs.connected ? (
              <span className="badge badge-live">ONLINE</span>
            ) : (
              <span className="badge badge-offline">DESCONECTADO</span>
            )}
          </div>

          {!obs.connected ? (
            <div className="obs-form-body">
              {obs.reconnecting && (
                <div className="reconnecting-box">
                  <span className="loader" style={{ width: 14, height: 14 }} />
                  Reconectando automaticamente... (tentativa {obs.reconnectAttempts})
                </div>
              )}
              <p style={{ fontSize: '0.82rem', marginBottom: 14 }}>
                No OBS Studio, acesse <strong>Ferramentas → Configurações do servidor WebSocket</strong> e habilite o servidor na porta 4455.
              </p>

              <div className="grid grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div className="form-group">
                  <label className="form-label">Host / IP</label>
                  <input
                    type="text"
                    className="form-input"
                    value={host}
                    onChange={e => setHost(e.target.value)}
                    placeholder="localhost ou IP do PC"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Porta</label>
                  <input
                    type="number"
                    className="form-input"
                    value={port}
                    onChange={e => setPort(e.target.value)}
                    placeholder="4455"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label">Senha (se configurada no OBS)</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Deixe em branco se sem senha"
                />
              </div>

              <button
                className="btn btn-primary w-full"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? 'Estabelecendo conexão...' : 'Conectar ao OBS Studio'}
              </button>
            </div>
          ) : (
            <div className="obs-connected-box">
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Sessão Ativa</div>
                  <div className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--cyan-neon)' }}>
                    ws://{host}:{port}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={handleDisconnect}>
                  <WifiOff size={14} /> Desconectar
                </button>
              </div>

              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="status-deck-tile">
                  <span className="deck-label">TRANSMISSÃO</span>
                  <span className="deck-val font-mono" style={{ color: obs.streaming ? 'var(--crimson-alert)' : 'var(--text-muted)' }}>
                    {obs.streaming ? '● AO VIVO' : 'STANDBY'}
                  </span>
                </div>
                <div className="status-deck-tile">
                  <span className="deck-label">GRAVAÇÃO</span>
                  <span className="deck-val font-mono" style={{ color: obs.recording ? 'var(--amber-warn)' : 'var(--text-muted)' }}>
                    {obs.recording ? '● GRAVANDO' : 'PARADA'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Mestre de Ações: Stream & Gravação ── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <MonitorPlay size={18} color="var(--crimson-alert)" /> Transmissão & Gravação
            </div>
            <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              SAÍDAS DE PRODUÇÃO
            </span>
          </div>

          {!obs.connected ? (
            <div className="empty-state">
              <MonitorPlay size={36} color="var(--text-muted)" style={{ opacity: 0.4 }} />
              <p>Conecte o WebSocket do OBS para liberar os controles de transmissão.</p>
            </div>
          ) : (
            <div className="stream-action-grid">
              <div className="action-control-card">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                    Transmissão Principal (Twitch / YouTube)
                  </div>
                  <p style={{ fontSize: '0.8rem' }}>
                    Inicia ou interrompe a transmissão configurada no OBS Studio.
                  </p>
                </div>
                {!obs.streaming ? (
                  <button
                    className="btn btn-danger w-full"
                    onClick={() => streamAction('start')}
                    disabled={loading.stream}
                  >
                    <Radio size={16} /> Iniciar Transmissão no OBS
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost w-full"
                    style={{ borderColor: 'var(--crimson-alert)', color: 'var(--crimson-alert)' }}
                    onClick={() => streamAction('stop')}
                    disabled={loading.stream}
                  >
                    <Square size={16} /> Encerrar Transmissão no OBS
                  </button>
                )}
              </div>

              <div className="action-control-card" style={{ marginTop: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                    Gravação Local em Disco
                  </div>
                  <p style={{ fontSize: '0.8rem' }}>
                    Grava o arquivo de vídeo original com qualidade total.
                  </p>
                </div>
                <button
                  className="btn btn-ghost w-full"
                  onClick={() => recordAction(obs.recording ? 'stop' : 'start')}
                  disabled={loading.record}
                >
                  <Film size={16} /> {obs.recording ? 'Parar Gravação' : 'Iniciar Gravação Local'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Switcher de Cenas (StreamDeck Pro) ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="card-title">
            <Layers size={18} color="var(--violet-neon)" /> Deck de Cenas (Production Switcher)
          </div>
          <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--cyan-neon)' }}>
            CENA PROGRAM: {obs.currentScene || 'NENHUMA'}
          </span>
        </div>

        {!obs.connected ? (
          <div className="empty-state">
            <Layers size={36} color="var(--text-muted)" style={{ opacity: 0.4 }} />
            <p>Conecte ao OBS para carregar a lista de cenas.</p>
          </div>
        ) : obs.scenes.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma cena localizada no OBS Studio.</p>
          </div>
        ) : (
          <div className="streamdeck-grid">
            {obs.scenes.map(scene => {
              const isCurrent = obs.currentScene === scene;
              return (
                <button
                  key={scene}
                  className={`deck-scene-btn ${isCurrent ? 'deck-scene-btn--program' : ''}`}
                  onClick={() => switchScene(scene)}
                  disabled={loading[`scene_${scene}`] || isCurrent}
                >
                  <div className="deck-scene-top">
                    <span className="deck-scene-tally" />
                    <span className="deck-scene-tag font-mono">
                      {isCurrent ? 'PROGRAM (LIVE)' : 'PREVIEW'}
                    </span>
                  </div>
                  <div className="deck-scene-name">{scene}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Configuração do Overlay de Queda de Sinal no OBS ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Settings2 size={18} color="var(--cyan-neon)" /> Overlay de Sinal Perdido (OBS Browser Source)
          </div>
          <button className="btn btn-primary btn-sm" onClick={copyOverlayUrl}>
            <Copy size={13} /> Copiar URL do Overlay
          </button>
        </div>

        <p style={{ maxWidth: 700, marginBottom: 14 }}>
          Adicione uma fonte de <strong>Navegador (Browser Source)</strong> no OBS com resolução <strong>1920x1080</strong> para exibir a tela de "Sinal Perdido" automaticamente quando o seu celular 4G perder a conexão.
        </p>

        <div className="code-block flex items-center justify-between">
          <span className="font-mono">{overlayUrl}</span>
          <button className="btn btn-ghost btn-sm" onClick={copyOverlayUrl}>
            Copiar
          </button>
        </div>
      </div>

      <style>{`
        .obs-form-body {
          padding-top: 4px;
        }
        .reconnecting-box {
          background: rgba(255, 184, 0, 0.12);
          border: 1px solid rgba(255, 184, 0, 0.3);
          color: var(--amber-warn);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          font-size: 0.8rem;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-deck-tile {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .deck-label {
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 0.06em;
        }
        .deck-val {
          font-size: 1.1rem;
          font-weight: 800;
        }
        .action-control-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .streamdeck-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 14px;
        }
        .deck-scene-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1.5px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 18px 16px;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s var(--ease-spring);
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          color: var(--text-primary);
        }
        .deck-scene-btn:hover:not(:disabled) {
          border-color: var(--cyan-neon);
          background: rgba(0, 242, 254, 0.06);
          transform: translateY(-2px);
        }
        .deck-scene-btn--program {
          background: linear-gradient(135deg, rgba(255, 42, 95, 0.18) 0%, rgba(112, 0, 255, 0.12) 100%);
          border-color: var(--crimson-alert);
          box-shadow: 0 0 20px rgba(255, 42, 95, 0.35);
          cursor: default;
        }
        .deck-scene-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .deck-scene-tally {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--text-muted);
        }
        .deck-scene-btn--program .deck-scene-tally {
          background: var(--crimson-alert);
          box-shadow: 0 0 8px var(--crimson-alert);
        }
        .deck-scene-tag {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-muted);
        }
        .deck-scene-btn--program .deck-scene-tag {
          color: var(--crimson-alert);
        }
        .deck-scene-name {
          font-size: 1rem;
          font-weight: 700;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}
