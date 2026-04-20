import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  Settings2, X, Save, Trash2, ExternalLink,
  Youtube, Link2, Check, AlertCircle, RefreshCw,
  Wifi, WifiOff, Shield, Star, Users
} from 'lucide-react';

/* ── extrai video ID de qualquer link do YouTube ── */
function getVideoId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, '');
    if (h === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null;
    if (h === 'youtube.com') {
      return (
        u.searchParams.get('v') ||
        (u.pathname.match(/^\/live\/([^/?]+)/)  || [])[1] ||
        (u.pathname.match(/^\/embed\/([^/?]+)/) || [])[1] ||
        null
      );
    }
  } catch { /**/ }
  return null;
}

/* ── formata timestamp para HH:MM ── */
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ── inicial do autor para avatar ── */
function initial(name) {
  return (name || '?')[0].toUpperCase();
}

/* ── renderiza segmentos de uma mensagem (texto + emojis) ── */
function renderSegments(msg) {
  const segs = msg.segments;
  if (!segs || segs.length === 0) return <span>{msg.text}</span>;

  return segs.map((seg, i) => {
    if (seg.type === 'text') {
      return <span key={i}>{seg.text}</span>;
    }
    if (seg.type === 'emoji') {
      if (seg.custom && seg.url) {
        return (
          <img
            key={i}
            src={seg.url}
            alt={seg.label || ''}
            title={seg.label || ''}
            className="ytc-emoji-img"
          />
        );
      }
      // Emoji Unicode padrão — renderiza direto
      return <span key={i} className="ytc-emoji-char">{seg.char || seg.label}</span>;
    }
    return null;
  });
}

/* ── mensagem individual ── */
function ChatMessage({ msg }) {
  const isSuper = Boolean(msg.superchat);
  return (
    <div className={`yt-msg ${isSuper ? 'yt-msg--super' : ''} ${msg.isOwner ? 'yt-msg--owner' : ''}`}
      style={isSuper ? { '--sc': msg.superchat.color } : {}}>
      {/* Avatar */}
      <div className="yt-msg-avatar" title={msg.author}>
        {msg.thumbnail
          ? <img src={msg.thumbnail} alt={msg.author} className="yt-msg-avatar-img" />
          : <span>{initial(msg.author)}</span>
        }
      </div>
      {/* Conteúdo */}
      <div className="yt-msg-body">
        <div className="yt-msg-meta">
          <span className="yt-msg-name">{msg.author}</span>
          {msg.isOwner     && <span className="yt-badge yt-badge--owner"><Star size={9} /> Dono</span>}
          {msg.isModerator && <span className="yt-badge yt-badge--mod"><Shield size={9} /> Mod</span>}
          {msg.isMember    && <span className="yt-badge yt-badge--member"><Users size={9} /> Membro</span>}
          <span className="yt-msg-time">{fmtTime(msg.ts)}</span>
        </div>
        {isSuper && (
          <div className="yt-msg-superchat">{msg.superchat.amount}</div>
        )}
        <p className="yt-msg-text">{renderSegments(msg)}</p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════ */

export default function YouTubePage() {
  const [savedUrl,   setSavedUrl]   = useState('');
  const [inputUrl,   setInputUrl]   = useState('');
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [toast,      setToast]      = useState(null);
  const [messages,   setMessages]   = useState([]);
  const [chatStatus, setChatStatus] = useState('disconnected'); // disconnected|connected|error|ended
  const [statusMsg,  setStatusMsg]  = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  const listRef = useRef(null);
  const esRef   = useRef(null);
  const videoId = getVideoId(savedUrl);
  const isDirty = inputUrl !== savedUrl;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── carregar URL salva + conectar SSE ── */
  const connectSSE = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }

    const token = localStorage.getItem('irl_token') || '';
    const es = new EventSource(`/api/youtube/events?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'init') {
          setChatStatus(data.status);
          if (data.buffer?.length) setMessages(data.buffer);
        } else if (data.type === 'msg') {
          setMessages(prev => [...prev.slice(-199), data.msg]);
        } else if (data.type === 'status') {
          setChatStatus(data.status);
          if (data.error) setStatusMsg(data.error);
        }
      } catch (_) {}
    };
    es.onerror = () => { setChatStatus('error'); };
    return es;
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/youtube');
      const url = res.data.url || '';
      setSavedUrl(url);
      setInputUrl(url);
      if (!url) setPanelOpen(true);
    } catch {
      showToast('Erro ao carregar configuração', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const es = connectSSE();
    return () => es.close();
  }, [load, connectSSE]);

  /* ── auto-scroll ── */
  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 80);
  };

  /* ── salvar URL ── */
  const save = async () => {
    setSaving(true);
    try {
      await axios.put('/api/youtube', { url: inputUrl.trim() });
      setSavedUrl(inputUrl.trim());
      setMessages([]);
      setChatStatus('disconnected');
      setPanelOpen(false);
      showToast(inputUrl.trim() ? 'Conectando ao chat...' : 'Vínculo removido.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ── reconectar ── */
  const reconnect = async () => {
    try {
      await axios.post('/api/youtube/reconnect');
      setMessages([]);
      setChatStatus('disconnected');
      showToast('Reconectando...');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao reconectar', 'error');
    }
  };

  /* ════════════════════════════════════════════════════════ */
  const statusColor = {
    connected:    'var(--accent-green)',
    disconnected: 'var(--text-muted)',
    error:        'var(--accent-red)',
    ended:        'var(--accent-orange)',
  }[chatStatus] || 'var(--text-muted)';

  const statusLabel = {
    connected:    'Conectado',
    disconnected: 'Desconectado',
    error:        'Erro',
    ended:        'Transmissão encerrada',
  }[chatStatus] || chatStatus;

  return (
    <div className="ytc-root">

      {/* ── BARRA SUPERIOR ── */}
      <div className="ytc-bar">
        <div className="ytc-bar-left">
          <Youtube size={16} color="#ff0000" />
          <span className="ytc-bar-title">Chat ao Vivo</span>
          {videoId && (
            <span className="ytc-bar-id">#{videoId}</span>
          )}
        </div>
        <div className="ytc-bar-right">
          {/* Status */}
          <div className="ytc-conn-status" style={{ '--sc': statusColor }} title={statusMsg || statusLabel}>
            {chatStatus === 'connected'
              ? <Wifi size={13} style={{ color: statusColor }} />
              : <WifiOff size={13} style={{ color: statusColor }} />
            }
            <span style={{ color: statusColor }}>{statusLabel}</span>
          </div>
          {/* Reconectar */}
          {videoId && chatStatus !== 'connected' && (
            <button className="ytc-icon-btn" onClick={reconnect} title="Reconectar">
              <RefreshCw size={14} />
            </button>
          )}
          {/* Abrir no YouTube */}
          {videoId && (
            <a
              href={`https://www.youtube.com/live_chat?v=${videoId}&is_popout=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="ytc-icon-btn"
              title="Abrir chat no YouTube"
            >
              <ExternalLink size={14} />
            </a>
          )}
          {/* Config */}
          <button className="ytc-icon-btn" onClick={() => setPanelOpen(true)} title="Configurar">
            <Settings2 size={15} />
          </button>
        </div>
      </div>

      {/* ── ÁREA DO CHAT ── */}
      {loading ? (
        <div className="ytc-center">
          <div className="loader" style={{ width: 34, height: 34, borderWidth: 3 }} />
        </div>
      ) : !videoId ? (
        <div className="ytc-center">
          <div className="ytc-empty-icon"><Youtube size={44} color="rgba(255,0,0,0.4)" /></div>
          <p className="ytc-empty-title">Nenhum chat vinculado</p>
          <p className="ytc-empty-sub">Configure uma transmissão ao vivo do YouTube</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setPanelOpen(true)}>
            <Settings2 size={15} /> Configurar Chat
          </button>
        </div>
      ) : chatStatus === 'error' || (chatStatus !== 'connected' && messages.length === 0) ? (
        <div className="ytc-center">
          <div className="ytc-empty-icon" style={{ background: 'rgba(255,71,87,0.07)', borderColor: 'rgba(255,71,87,0.15)' }}>
            <WifiOff size={36} color="rgba(255,71,87,0.5)" />
          </div>
          <p className="ytc-empty-title">
            {chatStatus === 'error' ? 'Erro ao conectar' : 'Aguardando chat...'}
          </p>
          <p className="ytc-empty-sub" style={{ maxWidth: 300 }}>
            {statusMsg || 'Certifique-se de que a transmissão está ao vivo no YouTube.'}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button className="btn btn-primary" onClick={reconnect}>
              <RefreshCw size={14} /> Tentar novamente
            </button>
            <a
              href={`https://www.youtube.com/live_chat?v=${videoId}&is_popout=1`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              <ExternalLink size={14} /> Abrir no YouTube
            </a>
          </div>
        </div>
      ) : (
        /* ── LISTA DE MENSAGENS ── */
        <div className="ytc-list" ref={listRef} onScroll={handleScroll}>
          {messages.length === 0 ? (
            <div className="ytc-waiting">Aguardando mensagens...</div>
          ) : (
            messages.map(msg => <ChatMessage key={msg.id} msg={msg} />)
          )}
          {/* Botão "ir para baixo" */}
          {!autoScroll && (
            <button
              className="ytc-scroll-btn"
              onClick={() => { setAutoScroll(true); listRef.current?.scrollTo({ top: 9999999, behavior: 'smooth' }); }}
            >
              ↓ Novos mensagens
            </button>
          )}
        </div>
      )}

      {/* ── PAINEL DE CONFIGURAÇÃO ── */}
      {panelOpen && (
        <>
          <div className="ytc-overlay" onClick={() => !saving && setPanelOpen(false)} />
          <aside className="ytc-panel">
            <div className="ytc-panel-header">
              <div className="ytc-panel-title">
                <Youtube size={17} color="#ff0000" />
                <span>Configurar Chat</span>
              </div>
              <button className="ytc-panel-close" onClick={() => setPanelOpen(false)}>
                <X size={17} />
              </button>
            </div>
            <div className="ytc-panel-body">
              {/* Status */}
              <div className={`ytc-status ${videoId ? 'ytc-status--ok' : 'ytc-status--off'}`}>
                <span className={`ytc-dot ${videoId && chatStatus === 'connected' ? 'ytc-dot--ok' : ''}`} />
                {videoId
                  ? chatStatus === 'connected' ? 'Chat conectado' : 'Aguardando conexão...'
                  : 'Nenhum chat vinculado'
                }
              </div>

              <label className="form-label" style={{ marginTop: 18, display: 'block' }}>
                URL da Transmissão ao Vivo
              </label>
              <div className="ytc-field">
                <Link2 size={13} className="ytc-field-icon" />
                <input
                  id="ytc-url-input"
                  type="url"
                  className="form-input ytc-field-input"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={inputUrl}
                  onChange={e => setInputUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && save()}
                  autoFocus
                />
                {inputUrl && (
                  <button className="ytc-field-clear" onClick={() => setInputUrl('')}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="ytc-hint">
                Aceita <code>watch?v=</code>, <code>youtu.be/</code> e <code>/live/</code>
              </p>

              <button
                id="ytc-save-btn"
                className="btn btn-primary ytc-save"
                onClick={save}
                disabled={saving || !isDirty}
              >
                {saving
                  ? <><span className="loader" style={{ width: 13, height: 13 }} /> Salvando...</>
                  : <><Save size={13} /> Salvar e Conectar</>
                }
              </button>

              {savedUrl && (
                <a href={savedUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost ytc-ext">
                  <ExternalLink size={13} /> Ver Transmissão
                </a>
              )}

              <div className="ytc-note">
                O chat é lido diretamente pelo servidor — não depende de domínio nem de iframe.
                A transmissão precisa estar <strong>ao vivo</strong> no YouTube.
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div className={`ytc-toast ytc-toast--${toast.type}`}>
          {toast.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      <style>{`
        /* ── ROOT ── */
        .ytc-root {
          position: fixed;
          top: 0; right: 0; bottom: 0;
          left: 260px;
          z-index: 50;
          background: var(--bg-base);
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .sidebar--collapsed + .main-content .ytc-root { left: 64px; }
        @media (max-width: 768px) {
          .ytc-root { top: 56px; left: 0; bottom: calc(60px + env(safe-area-inset-bottom)); }
        }

        /* ── BARRA SUPERIOR ── */
        .ytc-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 14px;
          height: 46px; flex-shrink: 0;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-subtle);
          gap: 8px;
        }
        .ytc-bar-left {
          display: flex; align-items: center; gap: 8px;
          min-width: 0; overflow: hidden;
        }
        .ytc-bar-title {
          font-size: 0.88rem; font-weight: 700; color: var(--text-primary);
          white-space: nowrap;
        }
        .ytc-bar-id {
          font-size: 0.72rem; color: var(--text-muted);
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 4px; padding: 2px 6px;
          font-family: monospace;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 120px;
        }
        .ytc-bar-right {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0;
        }
        .ytc-conn-status {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.72rem; font-weight: 600;
          white-space: nowrap;
        }
        .ytc-icon-btn {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted); cursor: pointer;
          padding: 6px; display: flex; align-items: center;
          text-decoration: none;
          transition: all 0.18s;
        }
        .ytc-icon-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-glow);
        }

        /* ── LISTA ── */
        .ytc-list {
          flex: 1; overflow-y: auto;
          padding: 10px 0;
          display: flex; flex-direction: column; gap: 2px;
          position: relative;
          scrollbar-width: thin;
          scrollbar-color: var(--border-subtle) transparent;
        }
        .ytc-list::-webkit-scrollbar { width: 4px; }
        .ytc-list::-webkit-scrollbar-track { background: transparent; }
        .ytc-list::-webkit-scrollbar-thumb { background: var(--border-subtle); border-radius: 4px; }

        .ytc-waiting {
          text-align: center; padding: 40px 20px;
          font-size: 0.82rem; color: var(--text-muted);
        }

        /* ── MENSAGEM ── */
        .yt-msg {
          display: flex; gap: 8px;
          padding: 6px 14px;
          transition: background 0.15s;
        }
        .yt-msg:hover { background: var(--bg-elevated); }
        .yt-msg--super {
          margin: 4px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--sc, #1e88e5);
          background: color-mix(in srgb, var(--sc, #1e88e5) 12%, transparent);
          padding: 8px 12px;
        }
        .yt-msg--owner .yt-msg-name { color: #ffd700; }

        .yt-msg-avatar {
          width: 30px; height: 30px; flex-shrink: 0;
          border-radius: 50%;
          background: var(--grad-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.72rem; font-weight: 700; color: #fff;
          overflow: hidden;
        }
        .yt-msg-avatar-img { width: 100%; height: 100%; object-fit: cover; }

        .yt-msg-body { flex: 1; min-width: 0; }
        .yt-msg-meta {
          display: flex; align-items: center; gap: 5px;
          flex-wrap: wrap; margin-bottom: 2px;
        }
        .yt-msg-name {
          font-size: 0.78rem; font-weight: 700; color: var(--text-primary);
        }
        .yt-badge {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 1px 5px; border-radius: 3px;
          font-size: 0.62rem; font-weight: 700;
        }
        .yt-badge--owner  { background: rgba(255,215,0,0.15);  color: #ffd700; }
        .yt-badge--mod    { background: rgba(108,99,255,0.15); color: var(--accent-primary); }
        .yt-badge--member { background: rgba(0,230,118,0.12);  color: var(--accent-green); }
        .yt-msg-time {
          font-size: 0.65rem; color: var(--text-muted); margin-left: auto;
        }
        .yt-msg-superchat {
          font-size: 0.82rem; font-weight: 800;
          color: var(--sc, #1e88e5);
          margin-bottom: 3px;
        }
        .yt-msg-text {
          font-size: 0.82rem; color: var(--text-secondary);
          line-height: 1.45; word-break: break-word;
          margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 1px;
        }
        .ytc-emoji-img {
          display: inline-block;
          width: 20px; height: 20px;
          vertical-align: middle;
          object-fit: contain;
          margin: 0 1px;
        }
        .ytc-emoji-char {
          font-size: 1rem;
          line-height: 1;
          vertical-align: middle;
        }

        /* Botão novos msgs */
        .ytc-scroll-btn {
          position: sticky; bottom: 10px;
          align-self: center;
          background: var(--accent-primary);
          border: none; border-radius: 20px;
          color: #fff; font-size: 0.78rem; font-weight: 600;
          padding: 7px 16px; cursor: pointer;
          box-shadow: 0 4px 16px rgba(108,99,255,0.4);
          transition: all 0.2s;
          margin: 6px auto 0;
        }
        .ytc-scroll-btn:hover { background: var(--accent-primary-hover, #5a51f0); }

        /* ── Estado vazio ── */
        .ytc-center {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 32px;
        }
        .ytc-empty-icon {
          width: 84px; height: 84px; border-radius: 50%;
          background: rgba(255,0,0,0.06);
          border: 1px solid rgba(255,0,0,0.13);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
        }
        .ytc-empty-title { font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; }
        .ytc-empty-sub   { font-size: 0.83rem; color: var(--text-muted); }

        /* ── FAB ← sobreposto ── */
        /* (botão agora está na barra superior) */

        /* ── Overlay ── */
        .ytc-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(3px); z-index: 70;
        }

        /* ── Painel ── */
        .ytc-panel {
          position: absolute; top: 0; right: 0; bottom: 0; width: 320px;
          background: var(--bg-surface);
          border-left: 1px solid var(--border-subtle);
          z-index: 80; display: flex; flex-direction: column;
          animation: ytcSlideR .28s cubic-bezier(.34,1.56,.64,1);
          overflow: hidden;
        }
        @keyframes ytcSlideR { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
        @media (max-width: 768px) {
          .ytc-panel {
            top:auto; left:0; right:0; width:100%; max-height:80%;
            border-left:none; border-top:1px solid var(--border-subtle);
            border-radius:18px 18px 0 0;
            animation: ytcSlideU .3s cubic-bezier(.34,1.56,.64,1);
          }
          @keyframes ytcSlideU { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        }

        .ytc-panel-header {
          display:flex; align-items:center; justify-content:space-between;
          padding:16px 16px 12px;
          border-bottom:1px solid var(--border-subtle); flex-shrink:0;
        }
        .ytc-panel-title { display:flex; align-items:center; gap:8px; font-size:.92rem; font-weight:700; color:var(--text-primary); }
        .ytc-panel-close {
          background:var(--bg-elevated); border:1px solid var(--border-subtle);
          border-radius:var(--radius-sm); color:var(--text-muted); cursor:pointer;
          padding:5px; display:flex; align-items:center; transition:all .18s;
        }
        .ytc-panel-close:hover { color:var(--accent-red); border-color:rgba(255,71,87,.3); }

        .ytc-panel-body { flex:1; padding:16px; overflow-y:auto; display:flex; flex-direction:column; }

        .ytc-status {
          display:flex; align-items:center; gap:8px;
          padding:8px 12px; border-radius:var(--radius-sm);
          font-size:.77rem; font-weight:500;
        }
        .ytc-status--ok  { background:rgba(0,230,118,.08); border:1px solid rgba(0,230,118,.2); color:var(--accent-green); }
        .ytc-status--off { background:var(--bg-elevated); border:1px solid var(--border-subtle); color:var(--text-muted); }
        .ytc-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; background:var(--text-muted); }
        .ytc-dot--ok { background:var(--accent-green); box-shadow:0 0 6px var(--accent-green); animation:ytcPulse 2s infinite; }
        @keyframes ytcPulse { 0%,100%{opacity:1} 50%{opacity:.4} }

        .ytc-field { position:relative; display:flex; align-items:center; margin-top:6px; }
        .ytc-field-icon { position:absolute; left:10px; color:var(--text-muted); pointer-events:none; }
        .ytc-field-input { padding-left:32px !important; padding-right:34px !important; }
        .ytc-field-clear {
          position:absolute; right:8px;
          background:none; border:none; color:var(--text-muted); cursor:pointer;
          padding:3px; border-radius:4px; display:flex; align-items:center; transition:color .15s;
        }
        .ytc-field-clear:hover { color:var(--accent-red); }
        .ytc-hint { font-size:.7rem; color:var(--text-muted); margin-top:5px; line-height:1.5; }
        .ytc-hint code { background:var(--bg-elevated); padding:1px 4px; border-radius:3px; font-size:.66rem; }
        .ytc-save { width:100%; justify-content:center; margin-top:14px; }
        .ytc-save:disabled { opacity:.45; }
        .ytc-ext { width:100%; justify-content:center; margin-top:8px; }
        .ytc-note {
          margin-top:16px; font-size:.7rem; color:var(--text-muted); line-height:1.6;
          padding:9px 11px; border-radius:var(--radius-sm);
          background:var(--bg-elevated); border:1px solid var(--border-subtle);
        }

        /* ── Toast ── */
        .ytc-toast {
          position:absolute; bottom:16px; left:50%; transform:translateX(-50%);
          display:flex; align-items:center; gap:7px;
          padding:9px 16px; border-radius:50px;
          font-size:.8rem; font-weight:600; white-space:nowrap;
          z-index:200; backdrop-filter:blur(16px);
          box-shadow:0 6px 20px rgba(0,0,0,.4);
          animation:ytcToast 3s ease forwards;
        }
        .ytc-toast--success { background:rgba(0,230,118,.15); border:1px solid rgba(0,230,118,.3); color:var(--accent-green); }
        .ytc-toast--error   { background:rgba(255,71,87,.15);  border:1px solid rgba(255,71,87,.3);  color:var(--accent-red); }
        @keyframes ytcToast {
          0%  {opacity:0;transform:translateX(-50%) translateY(10px)}
          15% {opacity:1;transform:translateX(-50%) translateY(0)}
          80% {opacity:1}
          100%{opacity:0}
        }
      `}</style>
    </div>
  );
}
