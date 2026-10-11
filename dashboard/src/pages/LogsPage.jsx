import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Trash2, Pause, Play, Download, Filter, Search, Copy, Check } from 'lucide-react';

const LEVEL_COLORS = {
  INFO:  { color: 'var(--cyan-neon)',    bg: 'transparent' },
  WARN:  { color: 'var(--amber-warn)',   bg: 'rgba(255, 184, 0, 0.08)' },
  ERROR: { color: 'var(--crimson-alert)',bg: 'rgba(255, 42, 95, 0.12)' },
  OK:    { color: 'var(--emerald-live)', bg: 'rgba(0, 245, 155, 0.08)' },
};

const SOURCE_COLORS = {
  NMS:    '#9d4edd',
  AUTH:   '#00f2fe',
  OBS:    '#ffb800',
  API:    '#00f59b',
  SINAL:  '#ff2a5f',
  CONFIG: '#7000ff',
  SERVER: '#38bdf8',
};

function LogLine({ entry }) {
  const cfg = LEVEL_COLORS[entry.level] || LEVEL_COLORS.INFO;
  const sourceColor = SOURCE_COLORS[entry.source] || 'var(--text-muted)';
  const time = new Date(entry.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="terminal-log-line" style={{ background: cfg.bg }}>
      <span className="terminal-time font-mono">{time}</span>
      <span className="terminal-source font-mono" style={{ color: sourceColor }}>[{entry.source}]</span>
      <span className="terminal-level font-mono" style={{ color: cfg.color }}>{entry.level}</span>
      <span className="terminal-msg font-mono">{entry.message}</span>
    </div>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef(null);
  const pausedRef = useRef(false);

  pausedRef.current = paused;

  useEffect(() => {
    const token = localStorage.getItem('irl_token') || '';
    const es = new EventSource(`/api/logs/events?token=${encodeURIComponent(token)}`);
    es.onmessage = (e) => {
      if (pausedRef.current) return;
      try {
        const entry = JSON.parse(e.data);
        setLogs(prev => {
          const next = [...prev, entry];
          return next.length > 500 ? next.slice(-500) : next;
        });
      } catch (_) {}
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (!paused) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, paused]);

  const clearLogs = () => setLogs([]);

  const copyAll = async () => {
    const content = logs.map(l => `${l.ts} [${l.source}] ${l.level}: ${l.message}`).join('\n');
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadLogs = useCallback(() => {
    const content = logs.map(l => `${l.ts} [${l.source}] ${l.level}: ${l.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irl-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  const filtered = logs.filter(l => {
    const matchLevel = levelFilter === 'ALL' || l.level === levelFilter;
    const matchText  = !filter || l.message.toLowerCase().includes(filter.toLowerCase()) || l.source.toLowerCase().includes(filter.toLowerCase());
    return matchLevel && matchText;
  });

  return (
    <div className="logs-view animate-fadeIn">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Terminal de Logs do Servidor</h1>
          <p>Stream ao vivo de eventos do sistema via SSE — buffer de 500 linhas</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => setPaused(p => !p)}>
            {paused ? <><Play size={14} /> Retomar</> : <><Pause size={14} /> Pausar</>}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={copyAll}>
            {copied ? <Check size={14} color="var(--emerald-live)" /> : <Copy size={14} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={downloadLogs}>
            <Download size={14} /> Exportar
          </button>
          <button className="btn btn-danger btn-sm" onClick={clearLogs}>
            <Trash2 size={14} /> Limpar
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Search size={15} style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          className="form-input"
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', fontSize: '0.85rem' }}
          placeholder="Pesquisar mensagens, tags [SINAL], [AUTH], [NMS]..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <div className="flex items-center gap-1">
          {['ALL', 'INFO', 'WARN', 'ERROR', 'OK'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`log-filter-tag font-mono ${levelFilter === lvl ? 'log-filter-tag--active' : ''}`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Frame */}
      <div className="terminal-window-card">
        {/* Top Control Bar */}
        <div className="terminal-header-bar">
          <div className="terminal-dots">
            <span className="t-dot t-dot-red" />
            <span className="t-dot t-dot-yellow" />
            <span className="t-dot t-dot-green" />
          </div>
          <span className="font-mono terminal-title">irl-media-server // stdout stream</span>
          <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {filtered.length} linhas
          </span>
        </div>

        {/* Console Body */}
        <div className="terminal-body">
          {filtered.length === 0 ? (
            <div className="terminal-empty">
              <Terminal size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>Aguardando mensagens do processo...</p>
            </div>
          ) : (
            filtered.map((entry, idx) => (
              <LogLine key={entry.id || idx} entry={entry} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <style>{`
        .terminal-window-card {
          background: #04050a;
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }
        .terminal-header-bar {
          background: #090c15;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .terminal-dots {
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .t-dot {
          width: 11px;
          height: 11px;
          border-radius: 50%;
        }
        .t-dot-red { background: #ff5f56; }
        .t-dot-yellow { background: #ffbd2e; }
        .t-dot-green { background: #27c93f; }
        .terminal-title {
          font-size: 0.76rem;
          color: var(--text-muted);
        }
        .terminal-body {
          height: 520px;
          overflow-y: auto;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .terminal-log-line {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
          line-height: 1.4;
        }
        .terminal-time {
          color: var(--text-muted);
          font-size: 0.74rem;
          flex-shrink: 0;
        }
        .terminal-source {
          font-weight: 700;
          font-size: 0.74rem;
          flex-shrink: 0;
        }
        .terminal-level {
          font-weight: 800;
          font-size: 0.72rem;
          width: 48px;
          flex-shrink: 0;
        }
        .terminal-msg {
          color: var(--text-primary);
          word-break: break-all;
        }
        .terminal-empty {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }
        .log-filter-tag {
          padding: 4px 10px;
          border-radius: var(--radius-xs);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .log-filter-tag:hover {
          color: var(--text-primary);
          border-color: var(--border-hover);
        }
        .log-filter-tag--active {
          background: rgba(0, 242, 254, 0.15);
          color: var(--cyan-neon);
          border-color: rgba(0, 242, 254, 0.4);
        }
      `}</style>
    </div>
  );
}
