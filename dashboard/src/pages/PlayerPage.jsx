import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, RefreshCw, Tv2, AlertCircle, Signal } from 'lucide-react';

export default function PlayerPage() {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [streamKey, setStreamKey] = useState('');
  const [inputKey, setInputKey] = useState('');
  const [serverUrl, setServerUrl] = useState(window.location.hostname);
  const [hlsPort, setHlsPort] = useState('8000');
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [hlsStats, setHlsStats] = useState(null);

  const getHlsUrl = (key) =>
    `http://${serverUrl}:${hlsPort}/live/${key}/index.m3u8`;

  const connect = () => {
    if (!inputKey.trim()) return;
    setStreamKey(inputKey.trim());
    setError(null);
  };

  useEffect(() => {
    if (!streamKey || !videoRef.current) return;
    const url = getHlsUrl(streamKey);
    setConnecting(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        enableWorker: true,
        lowLatencyMode: true
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setConnecting(false);
        videoRef.current.play().catch(() => {});
        setPlaying(true);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setConnecting(false);
          setError(`Erro HLS: ${data.type} — Verifique a chave e se há stream ativo.`);
          setPlaying(false);
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
        setHlsStats({
          level: hls.currentLevel,
          bitrate: data.frag.stats?.total ? Math.round(data.frag.stats.total * 8 / 1000) : null,
          latency: data.frag.stats?.loading?.end ? Math.round(data.frag.stats.loading.end - data.frag.stats.loading.start) : null
        });
      });
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = url;
      videoRef.current.addEventListener('loadedmetadata', () => {
        videoRef.current.play();
        setPlaying(true);
        setConnecting(false);
      });
    } else {
      setError('HLS não é suportado neste navegador.');
      setConnecting(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamKey, serverUrl, hlsPort]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const fullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) videoRef.current.requestFullscreen();
  };

  const reconnect = () => {
    setStreamKey('');
    setTimeout(() => setStreamKey(inputKey.trim()), 100);
    setError(null);
  };

  return (
    <div className="animate-fadeInUp">
      <div className="page-header">
        <h1>Monitor ao Vivo</h1>
        <p>Visualize o stream recebido pelo servidor em tempo real via HLS</p>
      </div>

      {/* Connection Panel */}
      <div className="card player-connect-panel">
        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Signal size={16} color="var(--accent-primary)" />
          Configuração do Player
        </h3>
        <div className="player-connect-form">
          <div className="form-group">
            <label className="form-label">Endereço do Servidor</label>
            <input
              id="player-server-url"
              type="text"
              className="form-input"
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              placeholder="192.168.1.100 ou meuservidor.com"
            />
          </div>
          <div className="form-group" style={{ maxWidth: 120 }}>
            <label className="form-label">Porta HLS</label>
            <input
              id="player-hls-port"
              type="number"
              className="form-input"
              value={hlsPort}
              onChange={e => setHlsPort(e.target.value)}
              placeholder="8000"
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Chave de Stream</label>
            <input
              id="player-stream-key"
              type="text"
              className="form-input"
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
              placeholder="sua-chave-de-transmissao"
              onKeyDown={e => e.key === 'Enter' && connect()}
            />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <label className="form-label">&nbsp;</label>
            <button id="player-connect-btn" className="btn btn-primary" onClick={connect} disabled={!inputKey.trim() || connecting}>
              {connecting ? <><span className="loader" style={{ width: 15, height: 15 }} /> Conectando...</> : <><Play size={15} /> Conectar</>}
            </button>
          </div>
        </div>

        {streamKey && (
          <div className="player-url-preview">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>URL HLS:</span>
            <code className="code-block" style={{ flex: 1 }}>{getHlsUrl(streamKey)}</code>
          </div>
        )}
      </div>

      {/* Video Player */}
      <div className="card player-wrapper">
        <div className={`player-video-container ${streamKey ? 'player-video-container--active' : ''}`}>
          {!streamKey && (
            <div className="player-placeholder">
              <Tv2 size={64} color="var(--text-muted)" />
              <p>Insira uma chave de stream para começar a monitorar</p>
            </div>
          )}

          {connecting && (
            <div className="player-overlay">
              <div className="loader" style={{ width: 40, height: 40, borderWidth: 4 }} />
              <p>Conectando ao stream...</p>
            </div>
          )}

          {error && (
            <div className="player-overlay player-overlay--error">
              <AlertCircle size={40} color="var(--accent-red)" />
              <p>{error}</p>
              <button className="btn btn-ghost btn-sm" onClick={reconnect}>
                <RefreshCw size={14} /> Reconectar
              </button>
            </div>
          )}

          <video
            ref={videoRef}
            muted={muted}
            playsInline
            className={`player-video ${streamKey && !error ? 'player-video--visible' : ''}`}
          />

          {/* Controls overlay */}
          {streamKey && !error && !connecting && (
            <div className="player-controls">
              <div className="player-controls-inner">
                <div className="player-controls-left">
                  <button className="player-btn" onClick={togglePlay} title={playing ? 'Pausar' : 'Play'}>
                    {playing ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button className="player-btn" onClick={toggleMute} title={muted ? 'Ativar som' : 'Mutar'}>
                    {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <span className="badge badge-live">● AO VIVO</span>
                </div>
                <div className="player-controls-right">
                  {hlsStats?.bitrate && (
                    <span className="player-stat">{hlsStats.bitrate} kbps</span>
                  )}
                  <button className="player-btn" onClick={reconnect} title="Reconectar">
                    <RefreshCw size={16} />
                  </button>
                  <button className="player-btn" onClick={fullscreen} title="Tela cheia">
                    <Maximize size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .player-connect-panel { margin-bottom: 20px; }
        .player-connect-form {
          display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap;
        }
        .player-connect-form .form-group:first-child { width: 220px; }
        .player-connect-form .form-group:last-child { flex-shrink: 0; }
        .player-url-preview {
          display: flex; align-items: center; gap: 10px;
          margin-top: 14px;
        }

        .player-wrapper { padding: 0; overflow: hidden; }
        .player-video-container {
          position: relative;
          background: #000;
          aspect-ratio: 16/9;
          display: flex; align-items: center; justify-content: center;
          border-radius: var(--radius-lg);
          overflow: hidden;
        }

        .player-placeholder {
          display: flex; flex-direction: column; align-items: center; gap: 16px;
          color: var(--text-muted);
        }
        .player-placeholder p { font-size: 0.9rem; }

        .player-overlay {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 14px; background: rgba(0,0,0,0.8); z-index: 5;
        }
        .player-overlay p { font-size: 0.9rem; color: var(--text-secondary); }
        .player-overlay--error p { color: var(--accent-red); }

        .player-video {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: contain;
          opacity: 0; transition: opacity 0.5s;
        }
        .player-video--visible { opacity: 1; }

        .player-controls {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
          padding: 24px 16px 16px;
          z-index: 10;
          opacity: 0; transition: opacity 0.25s;
        }
        .player-video-container:hover .player-controls { opacity: 1; }

        .player-controls-inner {
          display: flex; align-items: center; justify-content: space-between;
        }
        .player-controls-left, .player-controls-right {
          display: flex; align-items: center; gap: 8px;
        }
        .player-btn {
          background: rgba(255,255,255,0.1);
          border: none; color: #fff; cursor: pointer;
          width: 36px; height: 36px;
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .player-btn:hover { background: rgba(255,255,255,0.25); }
        .player-stat {
          font-size: 0.75rem; color: rgba(255,255,255,0.7);
          background: rgba(0,0,0,0.4);
          padding: 3px 8px; border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
