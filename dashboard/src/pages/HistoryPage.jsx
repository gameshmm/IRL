import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Clock, Trash2, RefreshCw, BarChart3, TrendingUp,
  Calendar, Timer, Award, Radio
} from 'lucide-react';

function formatDuration(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

function StatBadge({ icon: Icon, label, value, color = 'purple' }) {
  const colors = {
    purple: { bg: 'rgba(108,99,255,0.1)', border: 'rgba(108,99,255,0.25)', text: 'var(--accent-primary)' },
    green:  { bg: 'rgba(0,230,118,0.1)',  border: 'rgba(0,230,118,0.25)',  text: 'var(--accent-green)' },
    orange: { bg: 'rgba(255,165,2,0.1)',  border: 'rgba(255,165,2,0.25)',  text: 'var(--accent-orange)' },
    cyan:   { bg: 'rgba(0,212,255,0.1)',  border: 'rgba(0,212,255,0.25)',  text: 'var(--accent-secondary)' },
  };
  const c = colors[color];
  return (
    <div className="stat-badge-card" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <Icon size={18} style={{ color: c.text, flexShrink: 0 }} />
      <div>
        <p className="stat-badge-value" style={{ color: c.text }}>{value}</p>
        <p className="stat-badge-label">{label}</p>
      </div>
    </div>
  );
}

function SessionRow({ session, index }) {
  const dur = session.durationSeconds;
  const isLong = dur && dur > 3600;

  return (
    <div className={`history-row ${index % 2 === 0 ? 'history-row--even' : ''}`}>
      <div className="history-row-path">
        <Radio size={13} style={{ color: 'var(--accent-red)', flexShrink: 0 }} />
        <code>{session.streamPath}</code>
      </div>
      <div className="history-row-meta">
        <span className="history-cell">
          <Calendar size={12} />
          {formatDate(session.startedAt)}
        </span>
        <span className="history-cell">
          <Timer size={12} />
          <span style={isLong ? { color: 'var(--accent-green)', fontWeight: 700 } : {}}>
            {formatDuration(session.durationSeconds)}
          </span>
        </span>
        <span className="history-cell history-ended">
          Fim: {formatDate(session.endedAt)}
        </span>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [data, setData] = useState({ sessions: [], total: 0, stats: null });
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [limit, setLimit] = useState(50);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/history?limit=${limit}`);
      setData(res.data);
      setError(null);
    } catch {
      setError('Erro ao carregar histórico.');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const clearHistory = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todo o histórico?')) return;
    setClearing(true);
    try {
      await axios.delete('/api/history');
      setData({ sessions: [], total: 0, stats: { totalSessions: 0, totalSeconds: 0, avgSeconds: 0, maxSeconds: 0 } });
    } catch {
      setError('Erro ao limpar histórico.');
    } finally {
      setClearing(false);
    }
  };

  const { sessions, total, stats } = data;

  return (
    <div className="animate-fadeInUp">
      <div className="page-header flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Histórico de Sessões</h1>
          <p>{total} sessão(ões) registrada(s) no banco de dados</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={fetchHistory} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button className="btn btn-danger btn-sm" onClick={clearHistory} disabled={clearing || sessions.length === 0}>
            <Trash2 size={14} /> Limpar Tudo
          </button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="history-stats-grid">
          <StatBadge icon={BarChart3}  label="Total de lives"   value={stats.totalSessions}                    color="purple" />
          <StatBadge icon={TrendingUp} label="Tempo total"      value={formatDuration(stats.totalSeconds)}     color="cyan" />
          <StatBadge icon={Clock}      label="Duração média"    value={formatDuration(stats.avgSeconds)}       color="orange" />
          <StatBadge icon={Award}      label="Longest live"     value={formatDuration(stats.maxSeconds)}       color="green" />
        </div>
      )}

      {error && (
        <div style={{ color: 'var(--accent-red)', padding: '12px 0', fontSize: '0.875rem' }}>{error}</div>
      )}

      {/* Lista */}
      <div className="card history-list-card">
        <div className="history-list-header">
          <span>Sessão</span>
          <span>Início</span>
          <span>Duração</span>
          <span>Fim</span>
        </div>

        {loading ? (
          <div className="history-loading">
            <span className="loader" style={{ width: 24, height: 24 }} />
            <p>Carregando histórico...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 0' }}>
            <Clock size={40} />
            <p>Nenhuma sessão registrada ainda.</p>
            <small>As lives aparecem aqui automaticamente depois de finalizadas.</small>
          </div>
        ) : (
          <>
            {sessions.map((s, i) => <SessionRow key={s.id} session={s} index={i} />)}
            {total > sessions.length && (
              <div className="history-load-more">
                <button className="btn btn-ghost btn-sm" onClick={() => setLimit(l => l + 50)}>
                  Carregar mais ({total - sessions.length} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .history-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }
        .stat-badge-card {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px; border-radius: var(--radius-md);
        }
        .stat-badge-value { font-size: 1.2rem; font-weight: 800; line-height: 1; }
        .stat-badge-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }

        .history-list-card { padding: 0; overflow: hidden; }
        .history-list-header {
          display: grid;
          grid-template-columns: 2fr 1.3fr 0.8fr 1.3fr;
          padding: 10px 18px;
          border-bottom: 1px solid var(--border-subtle);
          font-size: 0.72rem; text-transform: uppercase;
          letter-spacing: 0.06em; color: var(--text-muted); font-weight: 600;
        }
        .history-row {
          display: flex; flex-direction: column; gap: 6px;
          padding: 12px 18px;
          border-bottom: 1px solid var(--border-subtle);
          transition: background 0.15s;
        }
        .history-row--even { background: rgba(255,255,255,0.015); }
        .history-row:hover { background: var(--bg-elevated); }
        .history-row:last-child { border-bottom: none; }
        .history-row-path {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.8rem;
        }
        .history-row-path code {
          color: var(--text-primary); word-break: break-all;
          background: rgba(255,255,255,0.05); padding: 2px 8px; border-radius: 4px;
          font-size: 0.78rem;
        }
        .history-row-meta {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }
        .history-cell {
          display: flex; align-items: center; gap: 5px;
          font-size: 0.78rem; color: var(--text-secondary);
        }
        .history-ended { color: var(--text-muted); font-size: 0.72rem; }
        .history-loading {
          display: flex; flex-direction: column;
          align-items: center; gap: 12px;
          padding: 48px 0; color: var(--text-muted);
        }
        .history-load-more {
          display: flex; justify-content: center;
          padding: 16px 0; border-top: 1px solid var(--border-subtle);
        }
        @media (max-width: 600px) {
          .history-list-header { display: none; }
          .history-row-meta { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}
