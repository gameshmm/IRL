import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Activity, Cpu, MemoryStick, Wifi, Radio,
  Clock, Server, TrendingUp, AlertCircle, Zap, WifiOff,
  Tv2, Key, MonitorPlay, ChevronRight, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function CustomTooltip({ active, payload, label, unit }) {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-time">{label}</p>
        <p className="tooltip-value font-mono">
          {payload[0].value.toFixed(1)} {unit}
        </p>
      </div>
    );
  }
  return null;
}

export default function DashboardPage() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memHistory, setMemHistory] = useState([]);
  const [liveSignal, setLiveSignal] = useState({ status: 'offline', bitrate: 0, streamPath: null });
  const [streamAlert, setStreamAlert] = useState(null);
  const prevSignalRef = useRef('offline');

  const fetchStatus = async () => {
    try {
      const res = await axios.get('/api/status');
      setStatus(res.data);
      setError(null);

      const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setCpuHistory(prev => {
        const next = [...prev, { time, value: parseFloat(res.data.cpu.usage) }];
        return next.slice(-20);
      });
      setMemHistory(prev => {
        const next = [...prev, { time, value: parseFloat(res.data.memory.usedPercentage) }];
        return next.slice(-20);
      });
    } catch (err) {
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // SSE de sinal em tempo real
  useEffect(() => {
    const es = new EventSource('/api/status/events');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.signal) {
          setLiveSignal(data.signal);
          const prev = prevSignalRef.current;
          const cur = data.signal.status;
          if ((prev === 'live' || prev === 'weak') && cur === 'lost') {
            setStreamAlert('lost');
          } else if (cur === 'weak' && prev === 'live') {
            setStreamAlert('weak');
          } else if (cur === 'live') {
            setStreamAlert(null);
          }
          prevSignalRef.current = cur;
        }
      } catch (_) {}
    };
    return () => es.close();
  }, []);

  const formatUptime = (u) => {
    if (!u) return '—';
    const { hours, minutes, seconds } = u;
    return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  };

  return (
    <div className="dashboard-view animate-fadeIn">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1>Centro de Comando Broadcast</h1>
          <p>Telemetria e controle em tempo real do seu servidor pessoal de livestream</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/player" className="btn btn-primary">
            <Tv2 size={16} /> Abrir Monitor ao Vivo
          </Link>
          <Link to="/obs" className="btn btn-ghost">
            <MonitorPlay size={16} /> OBS Studio
          </Link>
        </div>
      </div>

      {/* Alertas Dinâmicos de Sinal */}
      {streamAlert === 'lost' && (
        <div className="studio-alert studio-alert--lost">
          <div className="flex items-center gap-3">
            <WifiOff size={20} />
            <div>
              <strong>ALERTA DE QUEDA DE SINAL!</strong> A transmissão foi interrompida {liveSignal.streamPath ? `(${liveSignal.streamPath})` : ''}.
              Verifique o 4G/5G do celular.
            </div>
          </div>
          <button className="btn-icon btn-ghost" onClick={() => setStreamAlert(null)}>✕</button>
        </div>
      )}

      {streamAlert === 'weak' && (
        <div className="studio-alert studio-alert--weak">
          <div className="flex items-center gap-3">
            <Wifi size={20} />
            <div>
              <strong>ATENÇÃO: SINAL INSTÁVEL!</strong> Bitrate atual: {liveSignal.bitrate} kbps. A transmissão pode sofrer quedas de quadros.
            </div>
          </div>
          <button className="btn-icon btn-ghost" onClick={() => setStreamAlert(null)}>✕</button>
        </div>
      )}

      {/* Broadcast Hero Live Banner */}
      <div className="broadcast-hero-card">
        <div className="broadcast-hero-left">
          <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
            <span className={`badge ${liveSignal.status === 'live' ? 'badge-live' : liveSignal.status === 'weak' ? 'badge-weak' : 'badge-offline'}`}>
              {liveSignal.status === 'live' ? 'BROADCAST AO VIVO' : liveSignal.status === 'weak' ? 'SINAL OSCILANDO' : 'INGEST OFFLINE'}
            </span>
            <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              RTMP PORT: 1935
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: 8, fontWeight: 800 }}>
            {liveSignal.status === 'live'
              ? 'Transmissão em Andamento com Qualidade Estável'
              : liveSignal.status === 'weak'
              ? 'Taxa de Transferência Baixa Detectada'
              : 'Pronto para Receber Transmissão do Celular'}
          </h2>
          <p style={{ maxWidth: 600 }}>
            {liveSignal.status === 'live'
              ? `Canal ativo: ${liveSignal.streamPath || '/live'}. O vídeo está sendo repassado para o OBS com monitoramento HTTP-FLV.`
              : 'Abra o PrismLive no celular e aponte para a URL RTMP fornecida na aba Chaves.'}
          </p>
        </div>

        <div className="broadcast-hero-metrics">
          <div className="hero-metric-tile">
            <span className="metric-label">Taxa de Dados (Bitrate)</span>
            <span className="metric-val font-mono" style={{ color: liveSignal.bitrate > 1500 ? 'var(--emerald-live)' : liveSignal.bitrate > 0 ? 'var(--amber-warn)' : 'var(--text-muted)' }}>
              {liveSignal.bitrate >= 1000
                ? `${(liveSignal.bitrate / 1000).toFixed(1)} Mbps`
                : `${liveSignal.bitrate} kbps`}
            </span>
          </div>
          <div className="hero-metric-tile">
            <span className="metric-label">Sessões Ativas</span>
            <span className="metric-val font-mono" style={{ color: 'var(--cyan-neon)' }}>
              {status?.streams?.active || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="form-label">Servidor</span>
            <div className="stat-card-icon stat-card-icon--green">
              <Activity size={20} />
            </div>
          </div>
          <div className="stat-card-value">
            {status?.status === 'online' ? 'Online' : 'Offline'}
          </div>
          <span className="stat-card-subtitle">{status ? `${status.hostname} (${status.platform})` : 'Conectando...'}</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="form-label">Carga de CPU</span>
            <div className="stat-card-icon stat-card-icon--cyan">
              <Cpu size={20} />
            </div>
          </div>
          <div className="stat-card-value">
            {status ? `${status.cpu.usage}` : '—'} <span className="stat-card-unit">%</span>
          </div>
          <span className="stat-card-subtitle">{status ? `${status.cpu.cores} Cores • ${status.cpu.model.slice(0, 24)}...` : 'Aguardando'}</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="form-label">Memória RAM</span>
            <div className="stat-card-icon stat-card-icon--violet">
              <MemoryStick size={20} />
            </div>
          </div>
          <div className="stat-card-value">
            {status ? `${status.memory.usedPercentage}` : '—'} <span className="stat-card-unit">%</span>
          </div>
          <span className="stat-card-subtitle">{status ? `${status.memory.usedGb} GB de ${status.memory.totalGb} GB em uso` : 'Aguardando'}</span>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="form-label">Tempo Ativo</span>
            <div className="stat-card-icon stat-card-icon--cyan">
              <Clock size={20} />
            </div>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.4rem' }}>
            {formatUptime(status?.uptime)}
          </div>
          <span className="stat-card-subtitle">Sem interrupções</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-2" style={{ marginBottom: 28 }}>
        {/* CPU Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Cpu size={18} color="var(--cyan-neon)" /> Histórico de CPU (%)
            </div>
            <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--cyan-neon)', fontWeight: 700 }}>
              {status ? `${status.cpu.usage}%` : '—'}
            </span>
          </div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer>
              <AreaChart data={cpuHistory}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f2fe" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00f2fe" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <Area type="monotone" dataKey="value" stroke="#00f2fe" strokeWidth={2.5} fillOpacity={1} fill="url(#cpuGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RAM Chart */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <MemoryStick size={18} color="var(--violet-neon)" /> Uso de Memória (%)
            </div>
            <span className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--violet-light)', fontWeight: 700 }}>
              {status ? `${status.memory.usedPercentage}%` : '—'}
            </span>
          </div>
          <div style={{ height: 200, width: '100%' }}>
            <ResponsiveContainer>
              <AreaChart data={memHistory}>
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7000ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#7000ff" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <Area type="monotone" dataKey="value" stroke="#9d4edd" strokeWidth={2.5} fillOpacity={1} fill="url(#memGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sessões de Streaming Ativas */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <Radio size={18} color="var(--emerald-live)" /> Sessões de Stream em Execução
          </div>
          <span className="badge badge-live">
            {status?.streams?.active || 0} ATIVAS
          </span>
        </div>

        {status?.streams?.sessions?.length > 0 ? (
          <div className="stream-sessions-list">
            {status.streams.sessions.map((s, idx) => (
              <div key={idx} className="stream-session-row">
                <div className="flex items-center gap-3">
                  <div className="session-dot" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{s.path}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ID: {s.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Iniciado em</div>
                    <div className="font-mono" style={{ fontSize: '0.82rem' }}>
                      {s.startTime ? new Date(s.startTime).toLocaleTimeString('pt-BR') : 'Agora'}
                    </div>
                  </div>
                  <Link to="/player" className="btn btn-ghost btn-sm">
                    Assistir <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-stream-state">
            <Radio size={36} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: 10 }} />
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Nenhum stream ativo no momento</div>
            <p style={{ maxWidth: 460 }}>
              Inicie a transmissão no seu aplicativo móvel (PrismLive / Larix Broadcaster) usando sua chave de stream.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .broadcast-hero-card {
          background: linear-gradient(135deg, rgba(16, 20, 32, 0.95) 0%, rgba(22, 28, 48, 0.7) 100%);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-xl);
          padding: 32px;
          margin-bottom: 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 24px;
          position: relative;
          box-shadow: var(--shadow-card), inset 0 1px 0 0 rgba(255, 255, 255, 0.12);
        }
        .broadcast-hero-metrics {
          display: flex;
          gap: 20px;
        }
        .hero-metric-tile {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 170px;
        }
        .hero-metric-tile .metric-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }
        .hero-metric-tile .metric-val {
          font-size: 1.8rem;
          font-weight: 800;
        }
        .studio-alert {
          border-radius: var(--radius-md);
          padding: 14px 20px;
          margin-bottom: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.9rem;
          backdrop-filter: blur(16px);
        }
        .studio-alert--lost {
          background: rgba(255, 42, 95, 0.15);
          border: 1px solid rgba(255, 42, 95, 0.4);
          color: #ff6b8b;
        }
        .studio-alert--weak {
          background: rgba(255, 184, 0, 0.15);
          border: 1px solid rgba(255, 184, 0, 0.4);
          color: #ffc837;
        }
        .custom-chart-tooltip {
          background: rgba(10, 13, 22, 0.9);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-sm);
          padding: 8px 14px;
          backdrop-filter: blur(16px);
          box-shadow: var(--shadow-sm);
        }
        .tooltip-time {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        .tooltip-value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .stream-session-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          margin-top: 10px;
        }
        .session-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--emerald-live);
          box-shadow: 0 0 10px var(--emerald-live);
        }
        .empty-stream-state {
          padding: 40px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        @media (max-width: 900px) {
          .broadcast-hero-card { flex-direction: column; align-items: flex-start; }
          .broadcast-hero-metrics { width: 100%; }
          .hero-metric-tile { flex: 1; }
        }
      `}</style>
    </div>
  );
}
