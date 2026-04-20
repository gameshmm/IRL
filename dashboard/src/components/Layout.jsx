import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  LayoutDashboard, Key, Settings, Tv2, LogOut, Zap,
  Menu, X, ChevronRight, Activity, MonitorPlay,
  WifiOff, Wifi, AlertTriangle, Terminal, Sun, Moon, BookOpen, Youtube
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/player',    icon: Tv2,             label: 'Monitor'   },
  { to: '/keys',      icon: Key,             label: 'Chaves'    },
  { to: '/obs',       icon: MonitorPlay,     label: 'OBS'       },
  { to: '/youtube',   icon: Youtube,         label: 'Chat YT'   },
  { to: '/history',   icon: BookOpen,        label: 'Histórico' },
  { to: '/logs',      icon: Terminal,        label: 'Logs'      },
  { to: '/settings',  icon: Settings,        label: 'Config'    },
];

// Labels completos para a sidebar desktop
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

const SIGNAL_TOAST_CONFIG = {
  weak:    { icon: AlertTriangle, color: '#ff9f43', bg: 'rgba(255,159,67,0.12)',  border: 'rgba(255,159,67,0.35)', label: '⚠ Sinal Fraco'   },
  lost:    { icon: WifiOff,       color: '#ff4757', bg: 'rgba(255,71,87,0.12)',   border: 'rgba(255,71,87,0.35)',  label: '✕ Sinal Perdido' },
  offline: { icon: WifiOff,       color: '#636e72', bg: 'rgba(99,110,114,0.12)', border: 'rgba(99,110,114,0.3)', label: '— Offline'        },
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

  // Fecha o menu mobile ao navegar
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  // Polling do servidor
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { default: axios } = await import('axios');
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

  // SSE global de sinal
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

  // Página atual para o header mobile
  const currentPage = navItemsFull.find(n => location.pathname.startsWith(n.to));

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
          <div className="sidebar-brand-icon" style={{ width: 28, height: 28 }}>
            <Zap size={14} color="#fff" />
          </div>
          <span>{currentPage?.label || 'IRL Stream'}</span>
        </div>
        <div className="mobile-header-actions">
          <button
            className="sidebar-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <div className={`mobile-status-dot mobile-status-dot--${serverStatus}`} title={`Servidor: ${serverStatus}`} />
        </div>
      </header>

      {/* ─── MOBILE DRAWER OVERLAY ─── */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* ─── SIDEBAR (desktop) / DRAWER (mobile) ─── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'} ${mobileMenuOpen ? 'sidebar--mobile-open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Zap size={20} color="#fff" />
          </div>
          {sidebarOpen && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">IRL Stream</span>
              <span className="sidebar-brand-version">v1.0.0</span>
            </div>
          )}
          <button
            className="sidebar-toggle sidebar-toggle--desktop"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
          {/* Botão fechar drawer (mobile) */}
          <button
            className="sidebar-toggle sidebar-toggle--mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            title="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Server Status */}
        {sidebarOpen && (
          <div className={`sidebar-status-bar sidebar-status-bar--${serverStatus}`}>
            <Activity size={13} />
            <span>
              Servidor: {serverStatus === 'online' ? 'Online' : serverStatus === 'offline' ? 'Offline' : 'Verificando...'}
            </span>
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
              <Icon size={18} />
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
                <span className="sidebar-user-role">Administrador</span>
              </div>
            )}
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
            style={{ marginRight: 4 }}
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

      {/* ─── BOTTOM NAV (mobile) ─── */}
      <nav className="bottom-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'bottom-nav-item--active' : ''}`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ─── Signal Toast ─── */}
      {(() => {
        const cfg = SIGNAL_TOAST_CONFIG[signal.status];
        if (!cfg) return null;
        const Icon = cfg.icon;
        return (
          <div
            className={`signal-toast ${toastVisible ? 'signal-toast--visible' : ''}`}
            style={{ '--toast-color': cfg.color, '--toast-bg': cfg.bg, '--toast-border': cfg.border }}
          >
            <Icon size={15} style={{ flexShrink: 0 }} />
            <div className="signal-toast-text">
              <span className="signal-toast-label">{cfg.label}</span>
              {signal.bitrate > 0 && signal.status === 'weak' && (
                <span className="signal-toast-bitrate">
                  {signal.bitrate >= 1000
                    ? `${(signal.bitrate / 1000).toFixed(1)} Mbps`
                    : `${signal.bitrate} kbps`}
                </span>
              )}
            </div>
            <button
              className="signal-toast-close"
              style={{ display: signal.status === 'lost' ? 'none' : undefined }}
              onClick={() => setToastVisible(false)}
            >✕</button>
          </div>
        );
      })()}

      <style>{`
        /* ─── Layout Base ─── */
        .layout {
          display: flex;
          min-height: 100vh;
        }

        /* ─── Mobile Header (hidden on desktop) ─── */
        .mobile-header {
          display: none;
        }

        /* ─── Sidebar ─── */
        .sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          background: var(--bg-surface);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: width 0.25s ease;
          overflow: hidden;
          z-index: 200;
        }
        .sidebar--open { width: 260px; }
        .sidebar--collapsed { width: 64px; }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 16px;
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }
        .sidebar-brand-icon {
          width: 38px; height: 38px; flex-shrink: 0;
          border-radius: var(--radius-sm);
          background: var(--grad-primary);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(108,99,255,0.35);
        }
        .sidebar-brand-text { flex: 1; min-width: 0; }
        .sidebar-brand-name {
          display: block;
          font-size: 0.95rem; font-weight: 700; color: var(--text-primary);
          white-space: nowrap;
        }
        .sidebar-brand-version {
          display: block;
          font-size: 0.7rem; color: var(--text-muted);
        }
        .sidebar-toggle {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer; padding: 5px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .sidebar-toggle:hover { color: var(--text-primary); border-color: var(--border-glow); }
        .sidebar-toggle--mobile-close { display: none; }

        .sidebar-status-bar {
          margin: 12px 12px 4px;
          padding: 7px 12px;
          border-radius: var(--radius-sm);
          display: flex; align-items: center; gap: 7px;
          font-size: 0.75rem; font-weight: 600;
        }
        .sidebar-status-bar--online  { background: rgba(0,230,118,0.1);  color: var(--accent-green);  border: 1px solid rgba(0,230,118,0.2);  }
        .sidebar-status-bar--offline { background: rgba(255,71,87,0.1);  color: var(--accent-red);    border: 1px solid rgba(255,71,87,0.2);  }
        .sidebar-status-bar--checking{ background: rgba(255,165,2,0.1);  color: var(--accent-orange); border: 1px solid rgba(255,165,2,0.2);  }

        .sidebar-nav {
          flex: 1;
          padding: 12px 8px;
          display: flex; flex-direction: column; gap: 4px;
          overflow-y: auto;
        }
        .sidebar-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 10px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          text-decoration: none;
          font-size: 0.875rem; font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
          position: relative;
        }
        .sidebar-nav-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
        .sidebar-nav-item--active {
          background: rgba(108,99,255,0.12);
          color: var(--accent-primary);
          border: 1px solid rgba(108,99,255,0.2);
        }
        .sidebar-nav-arrow { margin-left: auto; opacity: 0; transition: opacity 0.2s; }
        .sidebar-nav-item:hover .sidebar-nav-arrow,
        .sidebar-nav-item--active .sidebar-nav-arrow { opacity: 1; }

        .sidebar-footer {
          padding: 14px 12px;
          border-top: 1px solid var(--border-subtle);
          display: flex; align-items: center; gap: 10px;
        }
        .sidebar-user { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .sidebar-user-avatar {
          width: 34px; height: 34px; flex-shrink: 0;
          border-radius: 50%;
          background: var(--grad-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; font-weight: 700; color: #fff;
        }
        .sidebar-user-info { min-width: 0; }
        .sidebar-user-name {
          display: block;
          font-size: 0.85rem; font-weight: 600; color: var(--text-primary);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sidebar-user-role { display: block; font-size: 0.7rem; color: var(--text-muted); }
        .sidebar-logout-btn {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer; padding: 7px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.2s;
        }
        .sidebar-logout-btn:hover {
          background: rgba(255,71,87,0.1);
          color: var(--accent-red);
          border-color: rgba(255,71,87,0.3);
        }

        /* ─── Main Content ─── */
        .main-content {
          flex: 1;
          padding: 32px;
          overflow-y: auto;
          min-width: 0;
        }

        /* ─── Bottom Nav (hidden on desktop) ─── */
        .bottom-nav {
          display: none;
        }

        /* ─── Signal Toast ─── */
        .signal-toast {
          position: fixed;
          top: 20px; right: 24px;
          z-index: 9999;
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px 10px 12px;
          border-radius: 10px;
          background: var(--toast-bg);
          border: 1.5px solid var(--toast-border);
          color: var(--toast-color);
          font-size: 0.82rem; font-weight: 600;
          backdrop-filter: blur(16px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          opacity: 0;
          transform: translateX(calc(100% + 32px));
          transition: opacity 0.3s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
          pointer-events: none;
        }
        .signal-toast--visible {
          opacity: 1;
          transform: translateX(0);
          pointer-events: auto;
        }
        .signal-toast-text { display: flex; flex-direction: column; gap: 1px; line-height: 1.2; }
        .signal-toast-label { font-weight: 700; }
        .signal-toast-bitrate { font-size: 0.7rem; opacity: 0.75; font-weight: 400; }
        .signal-toast-close {
          background: none; border: none;
          color: var(--toast-color); cursor: pointer;
          opacity: 0.6; font-size: 0.75rem;
          padding: 0 0 0 4px; line-height: 1; transition: opacity 0.15s;
        }
        .signal-toast-close:hover { opacity: 1; }

        /* ════════════════════════════════════════
           MOBILE BREAKPOINT (≤ 768px)
           ════════════════════════════════════════ */
        @media (max-width: 768px) {

          /* Esconde a sidebar no mobile */
          .sidebar {
            position: fixed;
            top: 0; left: 0;
            height: 100%;
            width: 280px !important;
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 300;
            box-shadow: 4px 0 24px rgba(0,0,0,0.5);
          }
          .sidebar--mobile-open {
            transform: translateX(0);
          }
          /* Esconde toggle de collapse e mostra botão fechar */
          .sidebar-toggle--desktop { display: none; }
          .sidebar-toggle--mobile-close { display: flex; }

          /* Overlay escuro por trás do drawer */
          .mobile-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(2px);
            z-index: 250;
            animation: fadeIn 0.2s ease;
          }

          /* Header mobile */
          .mobile-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: sticky;
            top: 0;
            z-index: 100;
            height: 56px;
            padding: 0 16px;
            background: var(--bg-surface);
            border-bottom: 1px solid var(--border-subtle);
            flex-shrink: 0;
          }
          .mobile-header-menu {
            background: none; border: none;
            color: var(--text-secondary);
            cursor: pointer; padding: 4px;
            display: flex; align-items: center;
          }
          .mobile-header-brand {
            display: flex; align-items: center; gap: 8px;
            font-size: 0.95rem; font-weight: 700;
            color: var(--text-primary);
          }
          .mobile-header-actions {
            display: flex; align-items: center; gap: 10px;
          }
          .mobile-status-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
          }
          .mobile-status-dot--online  { background: var(--accent-green); box-shadow: 0 0 6px var(--accent-green); }
          .mobile-status-dot--offline { background: var(--accent-red); }
          .mobile-status-dot--checking{ background: var(--accent-orange); }

          /* Layout vira coluna */
          .layout {
            flex-direction: column;
          }

          /* Main content sem sidebar */
          .main-content {
            padding: 16px 14px;
            /* Espaço para o bottom nav */
            padding-bottom: calc(16px + 64px + env(safe-area-inset-bottom));
          }

          /* Toast no topo, abaixo do header */
          .signal-toast {
            top: 64px;
            right: 12px;
            left: 12px;
            font-size: 0.8rem;
            transform: translateY(-80px);
          }
          .signal-toast--visible {
            transform: translateY(0);
          }

          /* Bottom Navigation */
          .bottom-nav {
            display: flex;
            position: fixed;
            bottom: 0; left: 0; right: 0;
            height: calc(60px + env(safe-area-inset-bottom));
            padding-bottom: env(safe-area-inset-bottom);
            background: var(--bg-surface);
            border-top: 1px solid var(--border-subtle);
            z-index: 100;
            backdrop-filter: blur(16px);
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
            font-size: 0.6rem;
            font-weight: 600;
            letter-spacing: 0.02em;
            padding: 8px 4px;
            transition: all 0.2s;
            text-transform: uppercase;
            -webkit-tap-highlight-color: transparent;
          }
          .bottom-nav-item--active {
            color: var(--accent-primary);
          }
          .bottom-nav-item--active svg {
            filter: drop-shadow(0 0 6px rgba(108,99,255,0.6));
          }
        }
      `}</style>
    </div>
  );
}
