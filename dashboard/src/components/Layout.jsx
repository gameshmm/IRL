import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, Key, Settings, Tv2, LogOut, Zap,
  Menu, X, ChevronRight, Activity, MonitorPlay,
  WifiOff, Wifi, AlertTriangle, Terminal, Sun, Moon, BookOpen, Youtube, Radio
} from 'lucide-react';

const navItemsFull = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/player',    icon: Tv2,             label: 'Monitor ao Vivo'  },
  { to: '/keys',      icon: Key,             label: 'Chaves de Stream' },
  { to: '/obs',       icon: MonitorPlay,     label: 'Controle OBS'     },
  { to: '/youtube',   icon: Youtube,         label: 'Chat YouTube'     },
  { to: '/history',   icon: BookOpen,        label: 'Histórico'        },
  { to: '/logs',      icon: Terminal,        label: 'Logs'             },
  { to: '/settings',  icon: Settings,        label: 'Configurações'    },
];

const SIGNAL_CONFIG = {
  live:    { label: 'LIVE AO VIVO', badgeClass: 'badge-live', icon: Radio, color: '#00f59b' },
  weak:    { label: 'SINAL FRACO',  badgeClass: 'badge-weak', icon: AlertTriangle, color: '#ffb800' },
  lost:    { label: 'SEM SINAL',    badgeClass: 'badge-offline', icon: WifiOff, color: '#ff2a5f' },
  offline: { label: 'OFFLINE',      badgeClass: 'badge-offline', icon: WifiOff, color: '#64748b' },
  connecting: { label: 'CONECTANDO', badgeClass: 'badge-weak', icon: Activity, color: '#00f2fe' }
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [signal, setSignal] = useState({ status: 'offline', bitrate: 0 });
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  // Polling de saúde do servidor
  useEffect(() => {
    const checkStatus = async () => {
      try {
        await axios.get('/api/status');
        setServerStatus('online');
      } catch {
        setServerStatus('offline');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // SSE de sinal em tempo real
  useEffect(() => {
    const es = new EventSource('/signal/events');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.status) return;
        setSignal(data);
        if (data.status === 'weak' || data.status === 'lost') {
          setToastVisible(true);
        } else if (data.status === 'live') {
          setToastVisible(false);
        }
      } catch (_) {}
    };
    return () => es.close();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentNav = navItemsFull.find(n => location.pathname.startsWith(n.to));
  const signalInfo = SIGNAL_CONFIG[signal.status] || SIGNAL_CONFIG.offline;

  return (
    <div className="layout">

      {/* ─── MOBILE HEADER ─── */}
      <header className="mobile-header">
        <button
          className="mobile-header-menu"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu size={22} />
        </button>
        <div className="mobile-header-brand">
          <div className="sidebar-brand-icon" style={{ width: 30, height: 30 }}>
            <Zap size={16} color="#050811" />
          </div>
          <span>{currentNav?.label || 'IRL Stream'}</span>
        </div>
        <div className="mobile-header-actions">
          <button
            className="sidebar-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div className={`mobile-status-dot mobile-status-dot--${serverStatus}`} />
        </div>
      </header>

      {/* ─── MOBILE OVERLAY ─── */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ─── SIDEBAR ─── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'} ${mobileMenuOpen ? 'sidebar--mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Zap size={22} color="#050811" />
          </div>
          {sidebarOpen && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">IRL Stream Pro</span>
              <span className="sidebar-brand-version">Broadcast Studio</span>
            </div>
          )}
          <button
            className="sidebar-toggle sidebar-toggle--desktop"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          <button
            className="sidebar-toggle sidebar-toggle--mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            title="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Broadcast Badge */}
        {sidebarOpen && (
          <div className="sidebar-broadcast-card">
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span className={`badge ${signalInfo.badgeClass}`}>
                {signalInfo.label}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                {serverStatus === 'online' ? 'SVR OK' : 'SVR OFF'}
              </span>
            </div>
            {signal.status === 'live' || signal.status === 'weak' ? (
              <div className="flex items-center justify-between" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Bitrate:</span>
                <span className="font-mono" style={{ color: signalInfo.color, fontWeight: 700 }}>
                  {signal.bitrate >= 1000
                    ? `${(signal.bitrate / 1000).toFixed(1)} Mbps`
                    : `${signal.bitrate} kbps`}
                </span>
              </div>
            ) : null}
          </div>
        )}

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItemsFull.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={19} />
              {sidebarOpen && <span>{label}</span>}
              {sidebarOpen && <ChevronRight size={14} className="sidebar-nav-arrow" />}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            {sidebarOpen && (
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.username || 'admin'}</span>
                <span className="sidebar-user-role">Streamer Master</span>
              </div>
            )}
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ─── */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* ─── BOTTOM NAV MOBILE ─── */}
      <nav className="bottom-nav">
        {navItemsFull.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''}`
            }
          >
            <Icon size={19} />
            <span>{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>

      {/* ─── Signal Toast ─── */}
      <div
        className={`signal-toast ${toastVisible ? 'signal-toast--visible' : ''}`}
        style={{
          background: signal.status === 'lost' ? 'rgba(255, 42, 95, 0.9)' : 'rgba(255, 184, 0, 0.9)',
          color: '#ffffff'
        }}
      >
        <signalInfo.icon size={16} />
        <div>
          <div style={{ fontWeight: 800 }}>{signalInfo.label}</div>
          {signal.bitrate > 0 && (
            <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>
              Bitrate atual: {signal.bitrate} kbps
            </div>
          )}
        </div>
        <button
          onClick={() => setToastVisible(false)}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 8 }}
        >
          <X size={15} />
        </button>
      </div>

      <style>{`
        .sidebar-broadcast-card {
          margin: 14px 14px 4px;
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
        }
        .sidebar-toggle {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .sidebar-toggle:hover {
          color: var(--text-primary);
          border-color: var(--border-hover);
        }
        .sidebar-toggle--mobile-close { display: none; }
        .sidebar-nav-arrow {
          margin-left: auto;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .sidebar-nav-item:hover .sidebar-nav-arrow,
        .sidebar-nav-item--active .sidebar-nav-arrow {
          opacity: 1;
        }
        .sidebar-footer {
          padding: 16px 14px;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        .sidebar-user-avatar {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: var(--grad-brand);
          color: #050811;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 242, 254, 0.25);
          flex-shrink: 0;
        }
        .sidebar-user-name {
          font-size: 0.88rem;
          font-weight: 700;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .sidebar-user-role {
          font-size: 0.72rem;
          color: var(--text-muted);
          display: block;
        }
        .sidebar-logout-btn {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xs);
          color: var(--text-muted);
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .sidebar-logout-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-hover);
        }
        .mobile-header { display: none; }
        .bottom-nav { display: none; }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            top: 0; left: 0;
            height: 100%;
            width: 280px !important;
            transform: translateX(-100%);
            transition: transform 0.3s var(--ease-spring);
            z-index: 300;
            box-shadow: 10px 0 30px rgba(0,0,0,0.7);
          }
          .sidebar--mobile-open { transform: translateX(0); }
          .sidebar-toggle--desktop { display: none; }
          .sidebar-toggle--mobile-close { display: flex; }
          .mobile-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(6px);
            z-index: 250;
          }
          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 100;
            height: 60px;
            padding: 0 16px;
            background: var(--bg-glass);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border-subtle);
          }
          .mobile-header-menu {
            background: none; border: none; color: var(--text-primary); cursor: pointer;
          }
          .mobile-header-brand {
            display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 1rem;
          }
          .mobile-header-actions { display: flex; align-items: center; gap: 10px; }
          .mobile-status-dot {
            width: 9px; height: 9px; border-radius: 50%;
          }
          .mobile-status-dot--online { background: var(--emerald-live); box-shadow: 0 0 8px var(--emerald-live); }
          .mobile-status-dot--offline { background: var(--crimson-alert); }
          .mobile-status-dot--checking { background: var(--amber-warn); }
          .layout { flex-direction: column; }
          .bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            height: calc(62px + env(safe-area-inset-bottom));
            padding-bottom: env(safe-area-inset-bottom);
            background: var(--bg-glass);
            backdrop-filter: blur(24px);
            border-top: 1px solid var(--border-glass);
            z-index: 150;
          }
          .bottom-nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 0.65rem;
            font-weight: 700;
            transition: all 0.2s;
          }
          .bottom-nav-item--active {
            color: var(--cyan-neon);
          }
        }
      `}</style>
    </div>
  );
}
