import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Trash2, Pause, Play, Download, Filter } from 'lucide-react';

const LEVEL_COLORS = {
  INFO:  { color: 'var(--text-secondary)',   bg: 'transparent' },
  WARN:  { color: 'var(--accent-orange)',    bg: 'rgba(255,165,2,0.06)' },
  ERROR: { color: 'var(--accent-red)',       bg: 'rgba(255,71,87,0.06)' },
  OK:    { color: 'var(--accent-green)',     bg: 'rgba(0,230,118,0.06)' },
};

const SOURCE_COLORS = {
  NMS:    '#6c63ff',
  AUTH:   '#00d4ff',
  OBS:    '#ff9f43',
  API:    '#00e676',
  SINAL:  '#ff6b9d',
  CONFIG: '#a29bfe',
  SERVER: '#74b9ff',
};

function LogLine({ entry }) {
  const cfg = LEVEL_COLORS[entry.level] || LEVEL_COLORS.INFO;
  const sourceColor = SOURCE_COLORS[entry.source] || 'var(--text-muted)';
  const time = new Date(entry.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="log-line" style={{ background: cfg.bg }}>
      <span className="log-time">{time}</span>
      <span className="log-source" style={{ color: sourceColor }}>[{entry.source}]</span>
      <span className="log-level" style={{ color: cfg.color }}>{entry.level}</span>
      <span className="log-msg">{entry.message}</span>
    </div>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const bottomRef = useRef(null);
  const pausedRef = useRef(false);

  pausedRef.current = paused;

  // SSE connection
  useEffect(() => {
    const token = localStorage.getItem('irl_token');
    // Nota: EventSource não suporta headers nativamente; usamos query param para o token
    const es = new EventSource(`/api/logs/events?token=${token}`);
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

  // Auto-scroll
  useEffect(() => {
    if (!paused) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, paused]);

  const clearLogs = () => setLogs([]);

  const downloadLogs = useCallback(() => {
    const content = logs.map(l =>
      `${l.ts} [${l.source}] ${l.level}: ${l.message}`
    ).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `irl-logs-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  const filtered = logs.filter(l => {
    const matchLevel = levelFilter === 'ALL' || l.level === levelFilter;
    const matchText  = !filter || l.message.toLowerCase().includes(filter.toLowerCase()) || l.source.toLowerCase().includes(filter.toLowerCase());
    return matchLevel && matchText;
  });

  return (
    <div className="animate-fadeInUp">
      <div className="page-header flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Logs do Servidor</h1>
          <p>Stream em tempo real via SSE — {logs.length} entradas no buffer</p>
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setPaused(p => !p)}>
            {paused ? <><Play size={14} /> Retomar</> : <><Pause size={14} /> Pausar</>}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={downloadLogs}>
            <Download size={14} /> Exportar
          </button>
          <button className="btn btn-danger btn-sm" onClick={clearLogs}>
            <Trash2 size={14} /> Limpar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Filter size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          className="form-input"
          style={{ flex: 1, minWidth: 200, padding: '6px 12px', fontSize: '0.85rem' }}
          placeholder="Filtrar mensagens ou fonte..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        {['ALL','INFO','WARN','ERROR','OK'].map(lvl => (
          <button
            key={lvl}
            onClick={() => setLevelFilter(lvl)}
            className={`log-filter-btn${levelFilter === lvl ? ' log-filter-btn--active' : ''}`}
          >
            {lvl}
          </button>
        ))}
        {paused && (
          <span className="badge" style={{ background: 'rgba(255,165,2,0.15)', color: 'var(--accent-orange)', border: '1px solid rgba(255,165,2,0.3)' }}>
            ⏸ Pausado
          </span>
        )}
      </div>

      {/* Log terminal */}
      <div className="card log-terminal">
        <div className="log-terminal-header">
          <Terminal size={14} />
          <span>Terminal — {filtered.length} linhas</span>
          <span className="log-live-dot" />
        </div>
        <div className="log-body">
          {filtered.length === 0 ? (
            <div className="log-empty">
              <Terminal size={40} style={{ opacity: 0.2 }} />
              <p>Aguardando logs...</p>
            </div>
          ) : (
            filtered.map((entry, i) => <LogLine key={`${entry.id ?? i}`} entry={entry} />)
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <style>{`
        .log-terminal {
          padding: 0;
          overflow: hidden;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
        .log-terminal-header {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 0.78rem; color: var(--text-muted);
        }
        .log-live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--accent-green);
          margin-left: auto;
          animation: pulse-badge 1.5s infinite;
        }
        .log-body {
          height: 520px;
          overflow-y: auto;
          padding: 8px 0;
        }
        .log-line {
          display: flex; align-items: baseline; gap: 8px;
          padding: 3px 16px;
          font-size: 0.78rem;
          border-bottom: 1px solid rgba(255,255,255,0.02);
          transition: background 0.15s;
        }
        .log-line:hover { background: rgba(255,255,255,0.03) !important; }
        .log-time { color: var(--text-muted); flex-shrink: 0; width: 72px; }
        .log-source { flex-shrink: 0; min-width: 70px; font-weight: 700; font-size: 0.72rem; }
        .log-level { flex-shrink: 0; width: 36px; font-size: 0.7rem; font-weight: 600; opacity: 0.85; }
        .log-msg { color: var(--text-primary); word-break: break-word; line-height: 1.5; }
        .log-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 12px; height: 100%;
          color: var(--text-muted); font-family: inherit;
        }
        .log-filter-btn {
          padding: 4px 10px; border-radius: 6px; cursor: pointer;
          border: 1px solid var(--border-subtle); background: var(--bg-elevated);
          color: var(--text-muted); font-size: 0.75rem; font-weight: 600;
          transition: all 0.15s;
        }
        .log-filter-btn:hover { border-color: var(--border-glow); color: var(--text-primary); }
        .log-filter-btn--active {
          background: rgba(108,99,255,0.15);
          border-color: rgba(108,99,255,0.4);
          color: var(--accent-primary);
        }
      `}</style>
    </div>
  );
}
