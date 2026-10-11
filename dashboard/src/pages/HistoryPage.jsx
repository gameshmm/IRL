import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Clock, Trash2, RefreshCw, BarChart3, TrendingUp,
  Calendar, Timer, Award, Radio, AlertCircle
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
      setError('Erro ao carregar histórico de transmissões.');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const clearHistory = async () => {
    if (!window.confirm('Tem certeza que deseja limpar todo o histórico de transmissões?')) return;
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
    <div className="history-view animate-fadeIn">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Histórico de Transmissões</h1>
          <p>{total} sessão(ões) gravada(s) com estatísticas de duração e estabilidade</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={fetchHistory} disabled={loading}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button className="btn btn-danger btn-sm" onClick={clearHistory} disabled={clearing || sessions.length === 0}>
            <Trash2 size={14} /> Limpar Histórico
          </button>
        </div>
      </div>

      {error && (
        <div className="studio-alert studio-alert--lost" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Métricas Agregadas */}
      {stats && (
        <div className="grid grid-4" style={{ marginBottom: 26 }}>
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="form-label">Total de Lives</span>
              <div className="stat-card-icon stat-card-icon--violet">
                <BarChart3 size={18} />
              </div>
            </div>
            <div className="stat-card-value font-mono">{stats.totalSessions}</div>
            <span className="stat-card-subtitle">Sessões registradas</span>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="form-label">Tempo em Live</span>
              <div className="stat-card-icon stat-card-icon--cyan">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="stat-card-value font-mono" style={{ fontSize: '1.6rem' }}>
              {formatDuration(stats.totalSeconds)}
            </div>
            <span className="stat-card-subtitle">Tempo total transmitido</span>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="form-label">Duração Média</span>
              <div className="stat-card-icon stat-card-icon--green">
                <Clock size={18} />
              </div>
            </div>
            <div className="stat-card-value font-mono" style={{ fontSize: '1.6rem' }}>
              {formatDuration(stats.avgSeconds)}
            </div>
            <span className="stat-card-subtitle">Por transmissão</span>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="form-label">Maior Live</span>
              <div className="stat-card-icon stat-card-icon--green">
                <Award size={18} />
              </div>
            </div>
            <div className="stat-card-value font-mono" style={{ fontSize: '1.6rem' }}>
              {formatDuration(stats.maxSeconds)}
            </div>
            <span className="stat-card-subtitle">Recorde de transmissão</span>
          </div>
        </div>
      )}

      {/* Lista de Sessões */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Registro de Sessões</div>
          <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Exibindo últimas {sessions.length}
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <Clock size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
            <div style={{ fontWeight: 700 }}>Nenhuma transmissão gravada no histórico</div>
            <p>Assim que você encerrar uma transmissão RTMP, ela será registrada aqui com estatísticas de duração.</p>
          </div>
        ) : (
          <div className="sessions-table">
            {sessions.map((s, idx) => (
              <div key={s.id || idx} className="session-item-row">
                <div className="flex items-center gap-3">
                  <div className="session-item-icon">
                    <Radio size={14} color="var(--emerald-live)" />
                  </div>
                  <div>
                    <div className="font-mono" style={{ fontWeight: 700, fontSize: '0.92rem' }}>
                      {s.streamPath}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Início: {formatDate(s.startedAt)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Duração</div>
                    <div className="font-mono" style={{ fontWeight: 800, color: 'var(--cyan-neon)', fontSize: '0.95rem' }}>
                      {formatDuration(s.durationSeconds)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 120 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Encerrado em</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {formatDate(s.endedAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .session-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid var(--border-subtle);
          transition: background 0.15s;
        }
        .session-item-row:last-child {
          border-bottom: none;
        }
        .session-item-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .session-item-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: rgba(0, 245, 155, 0.1);
          border: 1px solid rgba(0, 245, 155, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
