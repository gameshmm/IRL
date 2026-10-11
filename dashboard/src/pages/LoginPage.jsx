import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wifi, Lock, Eye, EyeOff, Zap, Shield, Sparkles, Radio } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciais inválidas ou servidor indisponível');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen-wrapper">
      {/* Luz ambiente de fundo (mesh blur) */}
      <div className="ambient-sphere ambient-sphere--1" />
      <div className="ambient-sphere ambient-sphere--2" />

      {/* Cartão Holográfico Central */}
      <div className="login-glass-card animate-fadeIn">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="login-brand-icon">
            <Zap size={28} color="#050811" />
          </div>
          <div>
            <h1 className="login-title">IRL Stream Pro</h1>
            <span className="login-badge-tag font-mono">BROADCAST STUDIO CORE</span>
          </div>
        </div>

        <p className="login-description">
          Acesse o console de telemetria, monitoramento de baixa latência e controle do OBS Studio.
        </p>

        {error && (
          <div className="studio-alert studio-alert--lost" style={{ marginBottom: 18, fontSize: '0.82rem' }}>
            <div className="flex items-center gap-2">
              <Lock size={15} /> {error}
            </div>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="form-label">Usuário Administrador</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 22 }}>
            <label className="form-label">Chave Secreta de Acesso</label>
            <div className="password-input-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '13px', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="loader" style={{ width: 16, height: 16 }} />
                Autenticando Sessão...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Radio size={16} /> Entrar no Centro de Comando
              </span>
            )}
          </button>
        </form>

        <div className="login-footer-hint font-mono">
          PADRÃO INICIAL: <code>admin</code> / <code>admin123</code>
        </div>
      </div>

      <style>{`
        .login-screen-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #06070c;
          position: relative;
          padding: 24px;
          overflow: hidden;
        }
        .ambient-sphere {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          pointer-events: none;
          opacity: 0.22;
        }
        .ambient-sphere--1 {
          width: 550px;
          height: 550px;
          top: -120px;
          left: -100px;
          background: radial-gradient(circle, var(--cyan-neon) 0%, transparent 70%);
        }
        .ambient-sphere--2 {
          width: 650px;
          height: 650px;
          bottom: -150px;
          right: -100px;
          background: radial-gradient(circle, var(--violet-neon) 0%, transparent 70%);
        }
        .login-glass-card {
          width: 100%;
          max-width: 440px;
          background: rgba(14, 18, 30, 0.75);
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border: 1px solid var(--border-glass);
          box-shadow: 0 24px 60px -15px rgba(0, 0, 0, 0.9), inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
          border-radius: var(--radius-xl);
          padding: 40px 36px;
          position: relative;
          z-index: 10;
        }
        .login-brand-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }
        .login-brand-icon {
          width: 50px;
          height: 50px;
          border-radius: var(--radius-sm);
          background: var(--grad-brand);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0, 242, 254, 0.35);
          flex-shrink: 0;
        }
        .login-title {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #ffffff 40%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .login-badge-tag {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--cyan-neon);
          letter-spacing: 0.1em;
        }
        .login-description {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 24px;
          line-height: 1.5;
        }
        .password-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .password-toggle-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }
        .password-toggle-btn:hover {
          color: var(--text-primary);
        }
        .login-footer-hint {
          margin-top: 24px;
          text-align: center;
          font-size: 0.72rem;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }
        .login-footer-hint code {
          color: var(--cyan-neon);
          background: rgba(0, 242, 254, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
