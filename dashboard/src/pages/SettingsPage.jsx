import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Settings, Save, RefreshCw, Lock, AlertTriangle, Check, AlertCircle,
  Network, Cpu, Shield, KeyRound, Server
} from 'lucide-react';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card settings-section" style={{ marginBottom: 24 }}>
      <div className="card-header" style={{ marginBottom: 16 }}>
        <div className="card-title">
          <Icon size={18} color="var(--cyan-neon)" /> {title}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Password change
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/config');
      setConfig(res.data);
      setError(null);
    } catch {
      setError('Erro ao carregar configurações do servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConfig(); }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await axios.put('/api/config', {
        rtmp: config.rtmp,
        http: config.http,
        trans: config.trans
      });
      showToast('Configurações salvas! Reinicie o servidor para aplicar mudanças de portas.');
    } catch {
      showToast('Erro ao salvar configurações', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value }
    }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdError('Preencha todos os campos'); return; }
    if (newPwd !== confirmPwd) { setPwdError('As senhas novas não coincidem'); return; }
    if (newPwd.length < 6) { setPwdError('A nova senha deve ter pelo menos 6 caracteres'); return; }

    setChangingPwd(true);
    try {
      await axios.post('/api/auth/change-password', {
        currentPassword: currentPwd,
        newPassword: newPwd
      });
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      showToast('Senha administrativa alterada com sucesso!');
    } catch (err) {
      setPwdError(err.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setChangingPwd(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="loader" style={{ width: 40, height: 40 }} />
        <p>Carregando preferências do servidor...</p>
      </div>
    );
  }

  return (
    <div className="settings-view animate-fadeIn">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Configurações do Servidor</h1>
          <p>Parâmetros de rede RTMP/HTTP, latência e segurança de credenciais</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={fetchConfig}>
            <RefreshCw size={14} /> Recarregar
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !config}>
            <Save size={14} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {toast && (
        <div className={`studio-alert ${toast.type === 'error' ? 'studio-alert--lost' : 'studio-alert--weak'}`} style={{ marginBottom: 20 }}>
          {toast.msg}
        </div>
      )}

      {error && (
        <div className="studio-alert studio-alert--lost" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="grid grid-2">
        {/* Rede RTMP */}
        <Section title="Servidor de Ingest (RTMP)" icon={Network}>
          <div className="form-group">
            <label className="form-label">Porta RTMP de Entrada</label>
            <input
              type="number"
              className="form-input"
              value={config?.rtmp?.port || 1935}
              onChange={e => updateConfig('rtmp', 'port', parseInt(e.target.value, 10))}
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Padrão: 1935. Porta que o celular usa para transmitir.</span>
          </div>

          <div className="form-group">
            <label className="form-label">GOP Cache</label>
            <select
              className="form-input"
              value={config?.rtmp?.gop_cache ? 'true' : 'false'}
              onChange={e => updateConfig('rtmp', 'gop_cache', e.target.value === 'true')}
            >
              <option value="true">Ativado (Transição de frames rápida)</option>
              <option value="false">Desativado (Menor latência)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Ping Timeout (segundos)</label>
            <input
              type="number"
              className="form-input"
              value={config?.rtmp?.ping_timeout || 30}
              onChange={e => updateConfig('rtmp', 'ping_timeout', parseInt(e.target.value, 10))}
            />
          </div>
        </Section>

        {/* Rede HTTP / FLV */}
        <Section title="Servidor de Distribuição (HTTP / FLV)" icon={Server}>
          <div className="form-group">
            <label className="form-label">Porta HTTP de Mídia</label>
            <input
              type="number"
              className="form-input"
              value={config?.http?.port || 8000}
              onChange={e => updateConfig('http', 'port', parseInt(e.target.value, 10))}
            />
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Padrão: 8000. Servidor que alimenta o monitor e o OBS Studio.</span>
          </div>

          <div className="form-group">
            <label className="form-label">CORS (Allow Origin)</label>
            <input
              type="text"
              className="form-input"
              value={config?.http?.allow_origin || '*'}
              onChange={e => updateConfig('http', 'allow_origin', e.target.value)}
            />
          </div>
        </Section>
      </div>

      {/* Alteração de Senha */}
      <Section title="Segurança & Credenciais de Administrador" icon={KeyRound}>
        <form onSubmit={handleChangePassword} style={{ maxWidth: 520 }}>
          {pwdError && (
            <div className="studio-alert studio-alert--lost" style={{ marginBottom: 14 }}>
              {pwdError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Senha Atual</label>
            <input
              type="password"
              className="form-input"
              value={currentPwd}
              onChange={e => setCurrentPwd(e.target.value)}
              placeholder="Digite a senha atual"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nova Senha</label>
            <input
              type="password"
              className="form-input"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="Mínimo de 6 caracteres"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Confirmar Nova Senha</label>
            <input
              type="password"
              className="form-input"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              placeholder="Repita a nova senha"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={changingPwd}>
            <Shield size={15} /> {changingPwd ? 'Atualizando...' : 'Atualizar Senha de Acesso'}
          </button>
        </form>
      </Section>
    </div>
  );
}
