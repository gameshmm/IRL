import React, { useEffect, useRef, useState, useCallback } from 'react';
import mpegts from 'mpegts.js';
import Hls from 'hls.js';
import axios from 'axios';
import {
  Play, Pause, Volume2, VolumeX, Maximize, RefreshCw,
  Tv2, AlertCircle, Radio, Wifi, WifiOff, Activity,
  Sliders, Copy, Check, ShieldAlert, Sparkles
} from 'lucide-react';

const RETRY_MS = 4000;

export default function PlayerPage() {
  const videoRef  = useRef(null);
  const playerRef = useRef(null);
  const hlsRef    = useRef(null);
  const retryRef  = useRef(null);

  const [playing,    setPlaying]    = useState(false);
  const [muted,      setMuted]      = useState(true);
  const [volume,     setVolume]     = useState(1);
  const [error,      setError]      = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [keys,       setKeys]       = useState([]);
  const [selectedKey,setSelectedKey]= useState('');
  const [signal,     setSignal]     = useState({ status: 'offline', bitrate: 0, streamPath: null });
  const [loading,    setLoading]    = useState(true);
  const [playerMode, setPlayerMode] = useState('FLV'); // 'FLV' | 'HLS'
  const [showHud,    setShowHud]    = useState(true);
  const [copiedUrl,  setCopiedUrl]  = useState(false);

  // ─── Bootstrap ─────────────────────────────────────────────────────────────
  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const [keysRes, sigRes] = await Promise.all([
        axios.get('/api/keys'),
        axios.get('/signal/status')
      ]);
      const loadedKeys = keysRes.data.keys || [];
      setKeys(loadedKeys);
      const sig = sigRes.data;
      setSignal(sig);

      let autoKey = '';
      if ((sig.status === 'live' || sig.status === 'weak') && sig.streamPath) {
        autoKey = sig.streamPath.split('/').pop();
      }
      if (!autoKey && loadedKeys.length > 0) autoKey = loadedKeys[0].key;
      if (autoKey) setSelectedKey(autoKey);
    } catch (err) {
      console.error('[Player] bootstrap error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  // ─── Destroy Players ───────────────────────────────────────────────────────
  const destroyPlayer = useCallback(() => {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    if (playerRef.current) {
      try {
        playerRef.current.unload();
        playerRef.current.detachMediaElement();
        playerRef.current.destroy();
      } catch (_) {}
      playerRef.current = null;
    }
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (_) {}
      hlsRef.current = null;
    }
  }, []);

  // ─── Start Player (HTTP-FLV com Fallback HLS para iOS Safari) ──────────────
  const startPlayer = useCallback((key) => {
    if (!key || !videoRef.current) return;
    destroyPlayer();
    setError(null);
    setConnecting(true);
    setPlaying(false);

    const video = videoRef.current;
    const flvUrl = `${window.location.origin}/live/${key}.flv`;
    const hlsUrl = `${window.location.origin}/live/${key}/index.m3u8`;

    // 1. Tenta HTTP-FLV nativo via mpegts.js (Desktop / Android / Chrome)
    if (mpegts.isSupported()) {
      setPlayerMode('FLV (Ultra Baixa Latência)');
      const player = mpegts.createPlayer({
        type: 'flv',
        isLive: true,
        url: flvUrl,
      }, {
        enableWorker: true,
        lazyLoadMaxDuration: 3,
        seekType: 'range',
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 1.2,
        liveBufferLatencyMinRemain: 0.4,
      });

      playerRef.current = player;
      player.attachMediaElement(video);

      player.on(mpegts.Events.ERROR, () => {
        setConnecting(false);
        setError('Aguardando transmissão ser iniciada...');
        setPlaying(false);
        destroyPlayer();
        retryRef.current = setTimeout(() => startPlayer(key), RETRY_MS);
      });

      player.on(mpegts.Events.MEDIA_INFO, () => {
        setConnecting(false);
        setError(null);
        video.play().catch(() => {});
        setPlaying(true);
      });

      player.load();
      video.muted = muted;
      return;
    }

    // 2. Fallback HLS (específico para Safari no iOS / iPhone / iPad)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setPlayerMode('HLS Nativo (Apple iOS)');
      video.src = hlsUrl;
      video.load();
      video.play().then(() => {
        setConnecting(false);
        setError(null);
        setPlaying(true);
      }).catch(() => {
        setConnecting(false);
      });
      return;
    }

    if (Hls.isSupported()) {
      setPlayerMode('HLS MediaSource');
      const hls = new Hls({ enableWorker: true, liveSyncDurationCount: 3 });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setConnecting(false);
        setError(null);
        video.play().catch(() => {});
        setPlaying(true);
      });
      hls.on(Hls.Events.ERROR, () => {
        setError('Aguardando stream HLS...');
      });
      return;
    }

    setError('Seu navegador não possui suporte para mpegts.js ou HLS.');
    setConnecting(false);
  }, [muted, destroyPlayer]);

  useEffect(() => {
    if (selectedKey) startPlayer(selectedKey);
  }, [selectedKey]); // eslint-disable-line

  // SSE de sinal
  useEffect(() => {
    const es = new EventSource('/signal/events');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setSignal(data);
        if ((data.status === 'live' || data.status === 'weak') && data.streamPath) {
          const k = data.streamPath.split('/').pop();
          setSelectedKey(prev => (k !== prev ? k : prev));
        }
      } catch (_) {}
    };
    return () => es.close();
  }, []);

  useEffect(() => () => { destroyPlayer(); }, [destroyPlayer]);

  // Controles
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play(); setPlaying(true); }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !muted;
    videoRef.current.muted = next;
    setMuted(next);
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      if (v === 0) setMuted(true);
      else if (muted) setMuted(false);
    }
  };

  const fullscreen = () => {
    const wrap = document.getElementById('studio-monitor-wrap');
    if (wrap?.requestFullscreen) wrap.requestFullscreen();
    else videoRef.current?.requestFullscreen?.();
  };

  const reload = () => { if (selectedKey) startPlayer(selectedKey); };

  const copyFlvUrl = async () => {
    const url = `${window.location.origin}/live/${selectedKey}.flv`;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const selectedMeta = keys.find(k => k.key === selectedKey);
  const isLive = signal.status === 'live' || signal.status === 'weak';

  return (
    <div className="player-view animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Monitor de Transmissão MCR</h1>
          <p>Visualização ao vivo com latência submétrica e telemetria de sinal em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-sm" onClick={copyFlvUrl}>
            {copiedUrl ? <Check size={14} color="var(--emerald-live)" /> : <Copy size={14} />}
            {copiedUrl ? 'URL Copiada!' : 'Copiar URL HTTP-FLV'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={reload}>
            <RefreshCw size={14} /> Reconectar
          </button>
        </div>
      </div>

      {/* Seletor de Canais (Canal Pills) */}
      {!loading && keys.length > 0 && (
        <div className="channel-selector-bar">
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Canais:
          </span>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            {keys.map(k => (
              <button
                key={k.key}
                onClick={() => setSelectedKey(k.key)}
                className={`channel-pill ${selectedKey === k.key ? 'channel-pill--active' : ''}`}
              >
                <Radio size={12} />
                <span>{k.label}</span>
                {selectedKey === k.key && <span className="pill-dot" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Moldura MCR Pro Monitor */}
      <div className="studio-monitor-container" id="studio-monitor-wrap">
        {/* Tally Bar no Topo do Monitor */}
        <div className="monitor-tally-bar">
          <div className="flex items-center gap-3">
            <span className={`tally-led ${isLive ? 'tally-led--live' : 'tally-led--off'}`} />
            <span className="tally-label font-mono">
              {isLive ? 'PROGRAM (AO VIVO)' : 'PREVIEW (STANDBY)'}
            </span>
            <span className="tally-pipe font-mono">|</span>
            <span className="tally-channel font-mono">
              {selectedMeta?.label || selectedKey || 'CH-01'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="tally-engine font-mono">{playerMode}</span>
            <button
              className="hud-toggle-btn"
              onClick={() => setShowHud(!showHud)}
              title="Alternar Overlay HUD de Telemetria"
            >
              <Sliders size={13} /> {showHud ? 'HUD ON' : 'HUD OFF'}
            </button>
          </div>
        </div>

        {/* Viewport de Vídeo */}
        <div className="monitor-viewport">
          {/* Overlays de Status */}
          {loading && (
            <div className="monitor-msg-overlay">
              <div className="loader" style={{ width: 48, height: 48 }} />
              <p>Sincronizando feed de broadcast...</p>
            </div>
          )}

          {!loading && connecting && (
            <div className="monitor-msg-overlay">
              <div className="loader" style={{ width: 48, height: 48 }} />
              <p>Conectando ao canal "{selectedMeta?.label || selectedKey}"...</p>
            </div>
          )}

          {!loading && !connecting && error && (
            <div className="monitor-msg-overlay monitor-msg-overlay--err">
              <AlertCircle size={48} color="var(--crimson-alert)" />
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{error}</div>
              <p style={{ maxWidth: 400, textAlign: 'center', opacity: 0.8 }}>
                Inicie a transmissão no seu celular apontando para <code>rtmp://IP:1935/live/{selectedKey}</code>.
              </p>
              <button className="btn btn-ghost btn-sm" onClick={reload}>
                <RefreshCw size={13} /> Tentar Reconectar
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            playsInline
            className="monitor-video-element"
            style={{ opacity: selectedKey && !error && !connecting ? 1 : 0 }}
          />

          {/* Telemetria HUD Flutuante */}
          {showHud && isLive && (
            <div className="monitor-hud">
              <div className="hud-metric">
                <span className="hud-metric-label">STATUS</span>
                <span className="hud-metric-value" style={{ color: signal.status === 'live' ? 'var(--emerald-live)' : 'var(--amber-warn)' }}>
                  {signal.status.toUpperCase()}
                </span>
              </div>
              <div className="hud-metric">
                <span className="hud-metric-label">BITRATE</span>
                <span className="hud-metric-value font-mono">
                  {signal.bitrate > 0 ? `${signal.bitrate} kbps` : 'ESTÁVEL'}
                </span>
              </div>
              <div className="hud-metric">
                <span className="hud-metric-label">LATÊNCIA</span>
                <span className="hud-metric-value font-mono" style={{ color: 'var(--cyan-neon)' }}>
                  ~0.8s ULTRA-LOW
                </span>
              </div>
            </div>
          )}

          {/* Barra de Controles Inferior */}
          <div className="monitor-controls-bar">
            <div className="flex items-center gap-3">
              <button className="control-btn" onClick={togglePlay} title={playing ? 'Pausar' : 'Reproduzir'}>
                {playing ? <Pause size={18} /> : <Play size={18} />}
              </button>

              <div className="flex items-center gap-2 volume-group">
                <button className="control-btn" onClick={toggleMute} title={muted ? 'Desmutar' : 'Mutar'}>
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                  title="Ajustar Volume"
                />
              </div>

              {playing && (
                <span className="badge badge-live font-mono">
                  ● ON-AIR
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button className="control-btn" onClick={reload} title="Reiniciar player">
                <RefreshCw size={15} />
              </button>
              <button className="control-btn" onClick={fullscreen} title="Tela Cheia">
                <Maximize size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .channel-selector-bar {
          background: var(--bg-glass-card);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-md);
          padding: 12px 18px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .channel-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.2s var(--ease-spring);
        }
        .channel-pill:hover {
          color: var(--text-primary);
          border-color: var(--border-hover);
        }
        .channel-pill--active {
          background: linear-gradient(90deg, rgba(0, 242, 254, 0.16) 0%, rgba(112, 0, 255, 0.12) 100%);
          color: var(--cyan-neon);
          border-color: rgba(0, 242, 254, 0.4);
          box-shadow: 0 0 16px rgba(0, 242, 254, 0.2);
        }
        .pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--cyan-neon);
          box-shadow: 0 0 8px var(--cyan-neon);
        }
        .studio-monitor-container {
          background: #040508;
          border: 1px solid var(--border-glass);
          box-shadow: var(--shadow-card), 0 0 50px -10px rgba(0, 0, 0, 0.9);
          border-radius: var(--radius-xl);
          overflow: hidden;
          position: relative;
        }
        .monitor-tally-bar {
          background: #090b12;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.78rem;
        }
        .tally-led {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
        }
        .tally-led--live {
          background: var(--crimson-alert);
          box-shadow: 0 0 10px var(--crimson-alert);
          animation: radar-pulse 1.5s infinite;
        }
        .tally-led--off {
          background: #475569;
        }
        .tally-label {
          font-weight: 800;
          letter-spacing: 0.06em;
        }
        .tally-pipe { opacity: 0.3; }
        .tally-channel { color: var(--cyan-neon); font-weight: 700; }
        .tally-engine { color: var(--text-muted); font-size: 0.72rem; }
        .hud-toggle-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          border-radius: var(--radius-xs);
          padding: 4px 10px;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.2s;
        }
        .hud-toggle-btn:hover { color: var(--text-primary); border-color: var(--border-hover); }
        .monitor-viewport {
          position: relative;
          aspect-ratio: 16 / 9;
          background: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .monitor-video-element {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: opacity 0.4s ease;
        }
        .monitor-msg-overlay {
          position: absolute;
          inset: 0;
          background: rgba(4, 6, 12, 0.88);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 14px;
          z-index: 10;
        }
        .monitor-msg-overlay--err {
          background: rgba(10, 4, 8, 0.92);
        }
        .monitor-hud {
          position: absolute;
          top: 18px;
          left: 18px;
          z-index: 15;
          display: flex;
          gap: 10px;
          pointer-events: none;
        }
        .hud-metric {
          background: rgba(6, 8, 14, 0.75);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: var(--radius-xs);
          padding: 6px 12px;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .hud-metric-label {
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }
        .hud-metric-value {
          font-size: 0.82rem;
          font-weight: 800;
        }
        .monitor-controls-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 30px 20px 16px;
          background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.95) 100%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 20;
          opacity: 0;
          transition: opacity 0.25s var(--ease-spring);
        }
        .monitor-viewport:hover .monitor-controls-bar {
          opacity: 1;
        }
        .control-btn {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          backdrop-filter: blur(10px);
        }
        .control-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          transform: scale(1.05);
        }
        .volume-group {
          position: relative;
        }
        .volume-slider {
          width: 80px;
          accent-color: var(--cyan-neon);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
