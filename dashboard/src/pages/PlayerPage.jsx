import React, { useEffect, useRef, useState, useCallback } from 'react';
import mpegts from 'mpegts.js';
import axios from 'axios';
import {
  Play, Pause, Volume2, VolumeX, Maximize, RefreshCw,
  Tv2, AlertCircle, Radio, Wifi, WifiOff
} from 'lucide-react';

const RETRY_MS = 5000;


export default function PlayerPage() {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const retryRef  = useRef(null);

  const [playing,    setPlaying]    = useState(false);
  const [muted,      setMuted]      = useState(true);
  const [error,      setError]      = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [keys,       setKeys]       = useState([]);
  const [selectedKey,setSelectedKey]= useState('');
  const [signal,     setSignal]     = useState({ status: 'offline', streamPath: null });
  const [loading,    setLoading]    = useState(true);

  // ─── Bootstrap ────────────────────────────────────────────────────────────────
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
      console.error('[Player] bootstrap:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  // ─── HTTP-FLV player via mpegts.js (nativo no NMS, sem FFmpeg) ──────────────
  const destroyPlayer = useCallback(() => {
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null; }
    if (playerRef.current) {
      try { playerRef.current.unload(); playerRef.current.detachMediaElement(); playerRef.current.destroy(); } catch (_) {}
      playerRef.current = null;
    }
  }, []);

  const startPlayer = useCallback((key) => {
    if (!key || !videoRef.current) return;
    destroyPlayer();
    setError(null);
    setConnecting(true);
    setPlaying(false);

    if (!mpegts.isSupported()) {
      setError('mpegts.js não é suportado neste navegador.');
      setConnecting(false);
      return;
    }

    // HTTP-FLV via proxy Vite → NMS porta 8000
    // NMS serve FLV nativamente sem FFmpeg
    // IMPORTANTE: URL deve ser absoluta — o mpegts.js executa o fetch
    // dentro de um Web Worker (blob URL) que não resolve caminhos relativos.
    const url = `${window.location.origin}/live/${key}.flv`;

    const player = mpegts.createPlayer({
      type: 'flv',
      isLive: true,
      url,
    }, {
      enableWorker: true,
      lazyLoadMaxDuration: 3,
      seekType: 'range',
      liveBufferLatencyChasing: true,
      liveBufferLatencyMaxLatency: 1.5,
      liveBufferLatencyMinRemain: 0.5,
    });

    playerRef.current = player;
    player.attachMediaElement(videoRef.current);

    player.on(mpegts.Events.ERROR, (type, detail) => {
      console.error('[FLV] error', type, detail);
      setConnecting(false);
      setError('Stream não encontrado ou ainda não iniciado. Tentando novamente...');
      setPlaying(false);
      destroyPlayer();
      retryRef.current = setTimeout(() => startPlayer(key), RETRY_MS);
    });

    player.on(mpegts.Events.MEDIA_INFO, () => {
      setConnecting(false);
      setError(null);
      videoRef.current?.play().catch(() => {});
      setPlaying(true);
    });

    player.load();
    videoRef.current.muted = muted;
  }, [muted, destroyPlayer]); // eslint-disable-line

  // Auto-play quando chave muda
  useEffect(() => {
    if (!selectedKey) return;
    startPlayer(selectedKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  // SSE de sinal — reage em tempo real sem polling
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


  // Cleanup
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
  const fullscreen = () => videoRef.current?.requestFullscreen?.();
  const reload = () => { if (selectedKey) startPlayer(selectedKey); };

  const selectedMeta = keys.find(k => k.key === selectedKey);
  const sigColors = { live: 'var(--accent-green)', weak: 'var(--accent-orange)', lost: 'var(--accent-red)', connecting: 'var(--accent-primary)', offline: 'var(--text-muted)' };
  const sigLabels = { live: '🔴 Ao Vivo', weak: '⚠ Sinal Fraco', lost: '✗ Sinal Perdido', connecting: '◌ Conectando', offline: '— Offline' };

  return (
    <div className="animate-fadeInUp">

      <div className="page-header">
        <h1>Monitor ao Vivo</h1>
        <p>Streaming via HTTP-FLV — baixa latência, sem necessidade de FFmpeg</p>
      </div>

      {/* Status Bar */}
      <div className="pl-bar">
        <div className="pl-bar-item">
          {(signal.status === 'live' || signal.status === 'weak')
            ? <Radio size={14} color={sigColors[signal.status]} />
            : <WifiOff size={14} color={sigColors[signal.status]} />
          }
          <span style={{ color: sigColors[signal.status], fontWeight: 700 }}>
            {sigLabels[signal.status] || '— Offline'}
          </span>
        </div>

        <div className="pl-bar-item">
          <Wifi size={13} color="var(--text-muted)" />
          <code style={{ fontSize: '0.75rem' }}>
            /live/{selectedKey || '...'}.flv
          </code>
          <span className="pl-badge-green">HTTP-FLV</span>
          {signal.bitrate > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {signal.bitrate >= 1000
                ? `${(signal.bitrate / 1000).toFixed(1)} Mbps`
                : `${signal.bitrate} kbps`}
            </span>
          )}
        </div>

        {selectedMeta && (
          <div className="pl-bar-item">
            <span style={{ color: 'var(--text-muted)' }}>Canal:</span>
            <strong style={{ color: 'var(--accent-primary)' }}>{selectedMeta.label}</strong>
          </div>
        )}

        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={bootstrap}>
          <RefreshCw size={13} /> Recarregar
        </button>
      </div>

      {/* Canal tabs (múltiplas chaves) */}
      {!loading && keys.length > 1 && (
        <div className="card" style={{ padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Canal:</span>
          {keys.map(k => (
            <button
              key={k.key}
              onClick={() => setSelectedKey(k.key)}
              className={`pl-tab${selectedKey === k.key ? ' pl-tab-active' : ''}`}
            >
              <Radio size={11} /> {k.label}
            </button>
          ))}
        </div>
      )}

      {/* Player */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="pl-wrap">

          {loading && (
            <div className="pl-overlay">
              <div className="loader" style={{ width: 44, height: 44, borderWidth: 4 }} />
              <p>Detectando stream automaticamente...</p>
            </div>
          )}

          {!loading && connecting && (
            <div className="pl-overlay">
              <div className="loader" style={{ width: 44, height: 44, borderWidth: 4 }} />
              <p>Conectando ao stream{selectedMeta ? ` "${selectedMeta.label}"` : ''}...</p>
            </div>
          )}

          {!loading && !connecting && error && (
            <div className="pl-overlay pl-overlay-err">
              <AlertCircle size={48} style={{ opacity: 0.7, color: 'var(--accent-red)' }} />
              <p style={{ maxWidth: 360, textAlign: 'center' }}>{error}</p>
              <button className="btn btn-ghost btn-sm" onClick={reload}>
                <RefreshCw size={13} /> Tentar agora
              </button>
              {signal.status === 'offline' && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Nenhum stream ativo. Inicie o APK para transmitir.
                </p>
              )}
            </div>
          )}

          {!loading && !connecting && !error && !selectedKey && (
            <div className="pl-overlay">
              <Tv2 size={64} color="var(--text-muted)" />
              <p>Nenhuma chave cadastrada.</p>
              <a href="/keys" className="btn btn-primary btn-sm">Criar chave de stream</a>
            </div>
          )}

          <video
            ref={videoRef}
            playsInline
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'contain',
              opacity: (selectedKey && !error && !connecting) ? 1 : 0,
              transition: 'opacity 0.5s'
            }}
          />

          {selectedKey && !error && !loading && (
            <div className="pl-controls">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="pl-btn" onClick={togglePlay}>
                    {playing ? <Pause size={18}/> : <Play size={18}/>}
                  </button>
                  <button className="pl-btn" onClick={toggleMute}>
                    {muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
                  </button>
                  {playing && <span className="badge badge-live">● AO VIVO</span>}
                  {selectedMeta && <span className="pl-stat">{selectedMeta.label}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="pl-btn" onClick={reload} title="Reconectar">
                    <RefreshCw size={15}/>
                  </button>
                  <button className="pl-btn" onClick={fullscreen} title="Tela cheia">
                    <Maximize size={16}/>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .pl-bar {
          display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
          background: var(--bg-glass); border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md); padding: 10px 16px; margin-bottom: 16px;
          backdrop-filter: blur(12px); font-size: 0.8rem;
        }
        .pl-bar-item { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); }
        .pl-badge-green {
          font-size: 0.65rem; padding: 1px 7px; border-radius: 4px; font-weight: 700;
          color: var(--accent-green); background: rgba(0,230,118,0.12);
          border: 1px solid rgba(0,230,118,0.2);
        }
        .pl-tab {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 14px; border-radius: 99px; cursor: pointer;
          border: 1.5px solid var(--border-subtle); background: var(--bg-elevated);
          color: var(--text-muted); font-size: 0.8rem; font-weight: 500; transition: all 0.2s;
        }
        .pl-tab:hover { border-color: var(--border-glow); color: var(--text-primary); }
        .pl-tab-active {
          border-color: rgba(108,99,255,0.5); background: rgba(108,99,255,0.12);
          color: var(--accent-primary); font-weight: 700;
        }
        .pl-wrap {
          position: relative; background: #050508; aspect-ratio: 16/9;
          display: flex; align-items: center; justify-content: center;
          border-radius: var(--radius-lg); overflow: hidden;
        }
        .pl-overlay {
          position: absolute; inset: 0; z-index: 5; background: rgba(0,0,0,0.78);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
        }
        .pl-overlay p { font-size: 0.9rem; color: var(--text-secondary); }
        .pl-overlay-err p { color: rgba(255,71,87,0.9); }
        .pl-controls {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;
          background: linear-gradient(transparent, rgba(0,0,0,0.9));
          padding: 32px 16px 14px; opacity: 0; transition: opacity 0.2s;
        }
        .pl-wrap:hover .pl-controls { opacity: 1; }
        .pl-btn {
          width: 36px; height: 36px; border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.12); border: none; color: #fff;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .pl-btn:hover { background: rgba(255,255,255,0.25); }
        .pl-stat {
          font-size: 0.74rem; color: rgba(255,255,255,0.75);
          background: rgba(0,0,0,0.4); padding: 3px 8px; border-radius: 4px;
          white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
}
