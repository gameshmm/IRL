import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Save, RefreshCw, RotateCcw, Lock, AlertTriangle, Check, AlertCircle } from 'lucide-react';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card settings-section">
      <div className="settings-section-header">
        <div className="settings-section-icon">
          <Icon size={16} />
        </div>
        <h3>{title}</h3>
      </div>
      <div className="divider" />
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
    } catch (err) {
      setError('Erro ao carregar configurações');
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
      showToast('Configurações salvas! Reinicie o servidor para aplicar.');
    } catch (err) {
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

  const handleChangePassword = async () => {
    setPwdError('');
    if (!currentPwd || !newPwd || !confirmPwd) { setPwdError('Preencha todos os campos'); return; }
    if (newPwd !== confirmPwd) { setPwdError('As senhas novas não coincidem'); return; }
    if (newPwd.length < 6) { setPwdError('A nova senha deve ter pelo menos 6 caracteres'); return; }
    setChangingPwd(true);
    try {
      await axios.post('/api/auth/change-password', {
        currentPassword: currentPwd,
        newPassword: newPwd
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('irl_token')}` } });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      showToast('Senha alterada com sucesso!');
    } catch (err) {
      setPwdError(err.response?.data?.error || 'Erro ao alterar senha');
    } finally {
      setChangingPwd(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
      <div className="loader" style={{ width: 40, height: 40, borderWidth: 3 }} />
    </div>
  );

  return (
    <div className="animate-fadeInUp">
      <div className="page-header flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Configurações</h1>
          <p>Ajuste as configurações do servidor de mídia</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={fetchConfig}>
            <RefreshCw size={14} /> Recarregar
          </button>
          <button id="save-settings-btn" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || !config}>
            {saving
              ? <><span className="loader" style={{ width: 14, height: 14 }} /> Salvando...</>
              : <><Save size={14} /> Salvar Alterações</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="error-bar">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="settings-warning">
        <AlertTriangle size={16} />
        <span>As alterações só serão aplicadas após <strong>reiniciar o servidor</strong>.</span>
      </div>

      {config && (
        <div className="settings-grid">
          {/* RTMP */}
          <Section title="Configurações RTMP" icon={Settings}>
            <div className="settings-fields">
              <div className="form-group">
                <label className="form-label">Porta RTMP</label>
                <input type="number" className="form-input" value={config.rtmp.port}
                  onChange={e => updateConfig('rtmp', 'port', parseInt(e.target.value))} />
                <span className="field-hint">Padrão: 1935</span>
              </div>
              <div className="form-group">
                <label className="form-label">Chunk Size</label>
                <input type="number" className="form-input" value={config.rtmp.chunk_size}
                  onChange={e => updateConfig('rtmp', 'chunk_size', parseInt(e.target.value))} />
                <span className="field-hint">Tamanho de chunk em bytes</span>
              </div>
              <div className="form-group">
                <label className="form-label">Ping Interval (s)</label>
                <input type="number" className="form-input" value={config.rtmp.ping}
                  onChange={e => updateConfig('rtmp', 'ping', parseInt(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Ping Timeout (s)</label>
                <input type="number" className="form-input" value={config.rtmp.ping_timeout}
                  onChange={e => updateConfig('rtmp', 'ping_timeout', parseInt(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">GOP Cache</label>
                <select className="form-input" value={String(config.rtmp.gop_cache)}
                  onChange={e => updateConfig('rtmp', 'gop_cache', e.target.value === 'true')}>
                  <option value="true">Ativado</option>
                  <option value="false">Desativado</option>
                </select>
                <span className="field-hint">Melhora latência inicial do player</span>
              </div>
            </div>
          </Section>

          {/* HTTP */}
          <Section title="Configurações HTTP / HLS" icon={Settings}>
            <div className="settings-fields">
              <div className="form-group">
                <label className="form-label">Porta HTTP</label>
                <input type="number" className="form-input" value={config.http.port}
                  onChange={e => updateConfig('http', 'port', parseInt(e.target.value))} />
                <span className="field-hint">HLS e HTTP-FLV (padrão: 8000)</span>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Allow Origin (CORS)</label>
                <input type="text" className="form-input" value={config.http.allow_origin}
                  onChange={e => updateConfig('http', 'allow_origin', e.target.value)} />
                <span className="field-hint">Use * para permitir qualquer origem</span>
              </div>
            </div>
          </Section>

          {/* Transcode */}
          <Section title="Transcodificação (FFmpeg)" icon={Settings}>
            <div className="settings-fields">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Caminho do FFmpeg</label>
                <input type="text" className="form-input" value={config.trans?.ffmpeg || ''}
                  onChange={e => updateConfig('trans', 'ffmpeg', e.target.value)} />
                <span className="field-hint">Windows: C:\ffmpeg\bin\ffmpeg.exe | Linux: /usr/bin/ffmpeg</span>
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">HLS Flags</label>
                <input type="text" className="form-input"
                  value={config.trans?.tasks?.[0]?.hlsFlags || '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]'}
                  readOnly style={{ opacity: 0.7 }} />
                <span className="field-hint">Configuração avançada — edite diretamente no config.json</span>
              </div>
            </div>
          </Section>

          {/* Password */}
          <Section title="Segurança — Alterar Senha" icon={Lock}>
            <div className="settings-fields">
              <div className="form-group">
                <label className="form-label">Senha Atual</label>
                <input id="current-password" type="password" className="form-input" value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)} placeholder="••••••••" />
              </div>
              <div className="form-group">
                <label className="form-label">Nova Senha</label>
                <input id="new-password" type="password" className="form-input" value={newPwd}
                  onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar Nova Senha</label>
                <input id="confirm-password" type="password" className="form-input" value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••" />
              </div>
              {pwdError && (
                <div className="pwd-error" style={{ gridColumn: 'span 2' }}>
                  <AlertCircle size={14} /> {pwdError}
                </div>
              )}
              <div style={{ gridColumn: 'span 2' }}>
                <button id="change-password-btn" className="btn btn-primary" onClick={handleChangePassword} disabled={changingPwd}>
                  {changingPwd
                    ? <><span className="loader" style={{ width: 15, height: 15 }} /> Alterando...</>
                    : <><Lock size={14} /> Alterar Senha</>
                  }
                </button>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.type === 'success'
              ? <Check size={16} color="var(--accent-green)" />
              : <AlertCircle size={16} color="var(--accent-red)" />
            }
            {toast.msg}
          </div>
        </div>
      )}

      <style>{`
        .settings-warning {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,165,2,0.1);
          border: 1px solid rgba(255,165,2,0.25);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          color: var(--accent-orange);
          font-size: 0.85rem;
          margin-bottom: 24px;
        }
        .error-bar {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,71,87,0.1);
          border: 1px solid rgba(255,71,87,0.25);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          color: var(--accent-red);
          font-size: 0.875rem;
          margin-bottom: 20px;
        }
        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr; } }

        .settings-section {}
        .settings-section-header {
          display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
        }
        .settings-section-icon {
          width: 30px; height: 30px;
          border-radius: var(--radius-sm);
          background: rgba(108,99,255,0.12);
          color: var(--accent-primary);
          display: flex; align-items: center; justify-content: center;
        }
        .settings-section h3 { font-size: 0.95rem; }

        .settings-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media (max-width: 600px) { .settings-fields { grid-template-columns: 1fr; } }

        .field-hint { font-size: 0.72rem; color: var(--text-muted); }
        .pwd-error {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,71,87,0.1);
          border: 1px solid rgba(255,71,87,0.2);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          color: var(--accent-red);
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}
