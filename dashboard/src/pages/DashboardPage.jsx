import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Activity, Cpu, MemoryStick, Wifi, Radio,
  Clock, Server, TrendingUp, AlertCircle, Zap, WifiOff
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ icon: Icon, label, value, unit, color, subtitle }) {
  return (
    <div className="stat-card card">
      <div className="stat-card-header">
        <div className={`stat-card-icon stat-card-icon--${color}`}>
          <Icon size={18} />
        </div>
        <span className="stat-card-label">{label}</span>
      </div>
      <div className="stat-card-value">
        {value}
        {unit && <span className="stat-card-unit">{unit}</span>}
      </div>
      {subtitle && <p className="stat-card-subtitle">{subtitle}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memHistory, setMemHistory] = useState([]);
  const [liveSignal, setLiveSignal] = useState({ status: 'offline', bitrate: 0, streamPath: null });
  const [streamAlert, setStreamAlert] = useState(null); // 'weak' | 'lost' | null
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
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // SSE para dados de sinal em tempo real (substitui polling do status do stream)
  useEffect(() => {
    const es = new EventSource('/api/status/events');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.signal) {
          setLiveSignal(data.signal);
          const prev = prevSignalRef.current;
          const cur = data.signal.status;
          // Alerta quando o sinal cai (de live/weak para lost)
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
    <div className="animate-fadeInUp">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Monitoramento em tempo real do servidor IRL Stream</p>
      </div>

      {/* Alerta de stream caído */}
      {streamAlert === 'lost' && (
        <div className="stream-alert stream-alert--lost">
          <WifiOff size={18} />
          <div>
            <strong>Stream Caído!</strong> O sinal foi perdido{liveSignal.streamPath ? ` em ${liveSignal.streamPath}` : ''}.
            Verifique a conexão do dispositivo de transmissão.
          </div>
          <button className="stream-alert-close" onClick={() => setStreamAlert(null)}>✕</button>
        </div>
      )}
      {streamAlert === 'weak' && (
        <div className="stream-alert stream-alert--weak">
          <Wifi size={18} />
          <div>
            <strong>Sinal Fraco!</strong>
            {liveSignal.bitrate > 0 ? ` Bitrate atual: ${liveSignal.bitrate >= 1000 ? `${(liveSignal.bitrate/1000).toFixed(1)} Mbps` : `${liveSignal.bitrate} kbps`}.` : ''}
            Verifique a conexão de internet do transmissor.
          </div>
          <button className="stream-alert-close" onClick={() => setStreamAlert(null)}>✕</button>
        </div>
      )}

      {error && (
        <div className="dashboard-error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          icon={Activity}
          label="Status"
          value={status?.status === 'online' ? 'Online' : '—'}
          color={status?.status === 'online' ? 'green' : 'red'}
          subtitle={status ? `Host: ${status.hostname}` : 'Aguardando...'}
        />
        <StatCard
          icon={Cpu}
          label="CPU"
          value={status?.cpu?.usage ?? '—'}
          unit="%"
          color="purple"
          subtitle={status ? `${status.cpu.cores} núcleos` : ''}
        />
        <StatCard
          icon={MemoryStick}
          label="RAM"
          value={status?.memory?.usedPercentage ?? '—'}
          unit="%"
          color="blue"
          subtitle={status ? `${status.memory.usedGb} GB / ${status.memory.totalGb} GB` : ''}
        />
        <StatCard
          icon={Radio}
          label="Streams Ativos"
          value={status?.streams?.active ?? '—'}
          color={status?.streams?.active > 0 ? 'red' : 'muted'}
          subtitle={status?.streams?.active > 0 ? '🔴 AO VIVO' : 'Nenhum stream'}
        />
        <StatCard
          icon={Clock}
          label="Uptime"
          value={formatUptime(status?.uptime)}
          color="orange"
          subtitle={status ? `Plataforma: ${status.platform}` : ''}
        />
        <StatCard
          icon={Server}
          label="RAM Livre"
          value={status?.memory?.freeGb ?? '—'}
          unit=" GB"
          color="green"
          subtitle="Memória disponível"
        />
        <StatCard
          icon={Zap}
          label="Bitrate"
          value={liveSignal.bitrate >= 1000
            ? `${(liveSignal.bitrate / 1000).toFixed(1)}`
            : (liveSignal.bitrate || '—')}
          unit={liveSignal.bitrate >= 1000 ? ' Mbps' : (liveSignal.bitrate > 0 ? ' kbps' : '')}
          color={liveSignal.status === 'live' ? 'green' : liveSignal.status === 'weak' ? 'orange' : 'muted'}
          subtitle={liveSignal.status === 'live' ? '🟢 Transmitindo' : liveSignal.status === 'weak' ? '⚠ Sinal fraco' : 'Nenhum stream'}
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card chart-card">
          <div className="chart-header">
            <div className="flex items-center gap-2">
              <Cpu size={16} color="var(--accent-primary)" />
              <h3>Uso de CPU</h3>
            </div>
            <span className="chart-value">{status?.cpu?.usage ?? '—'}%</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={cpuHistory}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#4a5568' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#4a5568' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#8892a4' }}
                itemStyle={{ color: '#6c63ff' }}
              />
              <Area type="monotone" dataKey="value" stroke="#6c63ff" strokeWidth={2} fill="url(#cpuGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <div className="chart-header">
            <div className="flex items-center gap-2">
              <MemoryStick size={16} color="var(--accent-secondary)" />
              <h3>Uso de RAM</h3>
            </div>
            <span className="chart-value" style={{ color: 'var(--accent-secondary)' }}>
              {status?.memory?.usedPercentage ?? '—'}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={memHistory}>
              <defs>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#4a5568' }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#4a5568' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a1d26', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#8892a4' }}
                itemStyle={{ color: '#00d4ff' }}
              />
              <Area type="monotone" dataKey="value" stroke="#00d4ff" strokeWidth={2} fill="url(#memGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active sessions */}
      {status?.streams?.active > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Radio size={16} color="var(--accent-red)" />
            Streams ao Vivo
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {status.streams.sessions.map(s => (
              <div key={s.id} className="session-item">
                <span className="badge badge-live">● AO VIVO</span>
                <code className="code-block" style={{ flex: 1 }}>{s.path}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .dashboard-error {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,71,87,0.1);
          border: 1px solid rgba(255,71,87,0.25);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          color: var(--accent-red);
          font-size: 0.875rem;
          margin-bottom: 24px;
        }
        .stream-alert {
          display: flex; align-items: center; gap: 12px;
          border-radius: var(--radius-md);
          padding: 14px 18px;
          font-size: 0.875rem;
          margin-bottom: 20px;
          animation: fadeInUp 0.3s ease;
        }
        .stream-alert--lost {
          background: rgba(255,71,87,0.12);
          border: 1px solid rgba(255,71,87,0.35);
          color: var(--accent-red);
        }
        .stream-alert--weak {
          background: rgba(255,165,2,0.1);
          border: 1px solid rgba(255,165,2,0.35);
          color: var(--accent-orange);
        }
        .stream-alert-close {
          margin-left: auto; background: none; border: none;
          cursor: pointer; opacity: 0.6; font-size: 0.9rem;
          color: inherit; transition: opacity 0.15s;
        }
        .stream-alert-close:hover { opacity: 1; }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .stat-card { position: relative; overflow: hidden; }
        .stat-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
        .stat-card-icon {
          width: 36px; height: 36px;
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
        }
        .stat-card-icon--green { background: rgba(0,230,118,0.12); color: var(--accent-green); }
        .stat-card-icon--red { background: rgba(255,71,87,0.12); color: var(--accent-red); }
        .stat-card-icon--purple { background: rgba(108,99,255,0.12); color: var(--accent-primary); }
        .stat-card-icon--blue { background: rgba(0,212,255,0.12); color: var(--accent-secondary); }
        .stat-card-icon--orange { background: rgba(255,165,2,0.12); color: var(--accent-orange); }
        .stat-card-icon--muted { background: rgba(255,255,255,0.05); color: var(--text-muted); }
        .stat-card-label { font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
        .stat-card-value { font-size: 2rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
        .stat-card-unit { font-size: 1rem; font-weight: 500; color: var(--text-secondary); margin-left: 3px; }
        .stat-card-subtitle { font-size: 0.75rem; color: var(--text-muted); margin-top: 6px; }

        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 900px) { .charts-grid { grid-template-columns: 1fr; } }

        .chart-card { padding: 20px; }
        .chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .chart-header h3 { font-size: 0.95rem; font-weight: 600; }
        .chart-value { font-size: 1.5rem; font-weight: 800; color: var(--accent-primary); }

        .session-item { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          .stat-card-value { font-size: 1.5rem; }
          .chart-card { padding: 14px; }
          .chart-header { flex-direction: column; align-items: flex-start; gap: 4px; }
          .chart-value { font-size: 1.1rem; }
          .stream-alert { flex-wrap: wrap; }
        }
      `}</style>
    </div>
  );
}
