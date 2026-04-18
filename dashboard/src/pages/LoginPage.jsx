import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Wifi, Lock, Eye, EyeOff, Zap } from 'lucide-react';

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
      setError(err.response?.data?.error || 'Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background decoration */}
      <div className="login-bg-orb login-bg-orb--1" />
      <div className="login-bg-orb login-bg-orb--2" />

      <div className="login-container animate-fadeInUp">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Zap size={28} color="#fff" />
          </div>
          <div>
            <h1 className="login-title">IRL Stream</h1>
            <p className="login-subtitle">Dashboard de Gerenciamento</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Usuário</label>
            <input
              id="login-username"
              type="text"
              className="form-input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-with-action">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              <Lock size={14} />
              {error}
            </div>
          )}

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loader" style={{ width: 16, height: 16 }} />
                Autenticando...
              </>
            ) : (
              <>
                <Wifi size={16} />
                Entrar no Dashboard
              </>
            )}
          </button>
        </form>

        <p className="login-hint">
          Senha padrão: <code>admin123</code> — Altere nas configurações após o primeiro acesso.
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: var(--bg-base);
        }
        .login-bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .login-bg-orb--1 {
          width: 500px; height: 500px;
          top: -150px; left: -150px;
          background: radial-gradient(circle, rgba(108,99,255,0.15), transparent 70%);
        }
        .login-bg-orb--2 {
          width: 400px; height: 400px;
          bottom: -100px; right: -100px;
          background: radial-gradient(circle, rgba(0,212,255,0.1), transparent 70%);
        }
        .login-container {
          background: var(--bg-glass);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: 48px;
          width: 100%;
          max-width: 420px;
          backdrop-filter: blur(24px);
          box-shadow: var(--shadow-card), var(--shadow-glow);
          position: relative;
          z-index: 1;
        }
        .login-logo {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 36px;
        }
        .login-logo-icon {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-md);
          background: var(--grad-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(108,99,255,0.4);
        }
        .login-title {
          font-size: 1.5rem;
          background: var(--grad-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
        }
        .login-subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .input-with-action {
          position: relative;
        }
        .input-with-action .form-input {
          width: 100%;
          padding-right: 44px;
        }
        .input-action-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }
        .input-action-btn:hover { color: var(--text-primary); }
        .login-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 71, 87, 0.1);
          border: 1px solid rgba(255, 71, 87, 0.25);
          border-radius: var(--radius-sm);
          padding: 10px 14px;
          color: var(--accent-red);
          font-size: 0.85rem;
        }
        .login-hint {
          margin-top: 20px;
          font-size: 0.78rem;
          color: var(--text-muted);
          text-align: center;
        }
        .login-hint code {
          color: var(--accent-secondary);
          background: rgba(0,212,255,0.08);
          padding: 2px 6px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
