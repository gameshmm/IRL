import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Key, Settings, Tv2, LogOut, Zap,
  Menu, X, ChevronRight, Activity, MonitorPlay
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/player', icon: Tv2, label: 'Monitor ao Vivo' },
  { to: '/keys', icon: Key, label: 'Chaves de Stream' },
  { to: '/obs', icon: MonitorPlay, label: 'Controle OBS' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking');

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : 'sidebar--collapsed'}`}>
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
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}
          >
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        {/* Server Status Indicator */}
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
          {navItems.map(({ to, icon: Icon, label }) => (
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

        {/* User info + Logout */}
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
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Outlet />
      </main>

      <style>{`
        .layout {
          display: flex;
          min-height: 100vh;
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
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
          white-space: nowrap;
        }
        .sidebar-brand-version {
          display: block;
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .sidebar-toggle {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          padding: 5px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .sidebar-toggle:hover { color: var(--text-primary); border-color: var(--border-glow); }

        .sidebar-status-bar {
          margin: 12px 12px 4px;
          padding: 7px 12px;
          border-radius: var(--radius-sm);
          display: flex; align-items: center; gap: 7px;
          font-size: 0.75rem; font-weight: 600;
        }
        .sidebar-status-bar--online {
          background: rgba(0,230,118,0.1);
          color: var(--accent-green);
          border: 1px solid rgba(0,230,118,0.2);
        }
        .sidebar-status-bar--offline {
          background: rgba(255,71,87,0.1);
          color: var(--accent-red);
          border: 1px solid rgba(255,71,87,0.2);
        }
        .sidebar-status-bar--checking {
          background: rgba(255,165,2,0.1);
          color: var(--accent-orange);
          border: 1px solid rgba(255,165,2,0.2);
        }

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
        .sidebar-nav-item:hover {
          background: var(--bg-elevated);
          color: var(--text-primary);
        }
        .sidebar-nav-item--active {
          background: rgba(108,99,255,0.12);
          color: var(--accent-primary);
          border: 1px solid rgba(108,99,255,0.2);
        }
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
          padding: 14px 12px;
          border-top: 1px solid var(--border-subtle);
          display: flex; align-items: center; gap: 10px;
        }
        .sidebar-user {
          display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
        }
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
        .sidebar-user-role {
          display: block;
          font-size: 0.7rem; color: var(--text-muted);
        }
        .sidebar-logout-btn {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer; padding: 7px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
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

        @media (max-width: 768px) {
          .sidebar--open { width: 240px; }
          .main-content { padding: 16px; }
        }
      `}</style>
    </div>
  );
}
