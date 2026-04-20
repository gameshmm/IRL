import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Key, Plus, Trash2, Copy, Check, RefreshCw, AlertCircle, Edit2, X, Link } from 'lucide-react';

function KeyCard({ item, rtmpBase, onDelete, onRename }) {
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(item.label);
  const [saving, setSaving] = useState(false);

  const copyKey = async () => {
    await navigator.clipboard.writeText(item.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyRtmpUrl = async () => {
    const url = `${rtmpBase}/${item.key}`;
    await navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Remover a chave "${item.label}"?`)) return;
    setDeleting(true);
    await onDelete(item.key);
    setDeleting(false);
  };

  const handleRename = async () => {
    if (!editLabel.trim() || editLabel === item.label) { setEditing(false); return; }
    setSaving(true);
    const ok = await onRename(item.key, editLabel.trim());
    setSaving(false);
    if (ok) setEditing(false);
  };

  const rtmpUrl = `${rtmpBase}/${item.key}`;

  return (
    <div className="key-card card">
      <div className="key-card-top">
        <div className="key-card-info">
          <div className="key-card-icon">
            <Key size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <div className="flex gap-2 items-center">
                <input
                  className="form-input"
                  style={{ padding: '4px 10px', fontSize: '0.88rem', flex: 1 }}
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm btn-icon" onClick={handleRename} disabled={saving}>
                  {saving ? <span className="loader" style={{ width: 13, height: 13 }} /> : <Check size={14} />}
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(false)}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <p className="key-card-label">{item.label}</p>
                <p className="key-card-date">
                  Criada em: {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '—'}
                </p>
              </>
            )}
          </div>
        </div>
        {!editing && (
          <div className="key-card-actions">
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={() => { setEditLabel(item.label); setEditing(true); }}
              title="Renomear chave"
            >
              <Edit2 size={15} />
            </button>
            <button
              className="btn btn-ghost btn-sm btn-icon"
              onClick={copyKey}
              title="Copiar chave"
            >
              {copied ? <Check size={15} color="var(--accent-green)" /> : <Copy size={15} />}
            </button>
            <button
              className="btn btn-danger btn-sm btn-icon"
              onClick={handleDelete}
              disabled={deleting}
              title="Remover chave"
            >
              {deleting ? <span className="loader" style={{ width: 14, height: 14 }} /> : <Trash2 size={15} />}
            </button>
          </div>
        )}
      </div>

      <div className="key-card-value">
        <code className="code-block">{item.key}</code>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="flex items-center" style={{ marginBottom: 4, gap: 8 }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>URL de Stream RTMP:</p>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '2px 8px', fontSize: '0.7rem' }}
            onClick={copyRtmpUrl}
            title="Copiar URL RTMP completa"
          >
            {copiedUrl
              ? <><Check size={11} color="var(--accent-green)" /> Copiado!</>
              : <><Link size={11} /> Copiar URL</>
            }
          </button>
        </div>
        <code className="code-block" style={{ fontSize: '0.72rem' }}>
          {rtmpUrl}
        </code>
      </div>
    </div>
  );
}

export default function KeysPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState(null);
  const [rtmpBase, setRtmpBase] = useState('rtmp://<servidor>:1935/live');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/keys');
      setKeys(res.data.keys);
      setError(null);
      // Detecta IP do servidor para montar URL RTMP real
      try {
        const cfgRes = await axios.get('/api/config');
        const port = cfgRes.data?.rtmp?.port || 1935;
        const host = window.location.hostname;
        setRtmpBase(`rtmp://${host}:${port}/live`);
      } catch (_) {}
    } catch (err) {
      setError('Erro ao carregar as chaves. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const createKey = async () => {
    setCreating(true);
    try {
      const res = await axios.post('/api/keys', { label: newLabel || undefined });
      setKeys(prev => [...prev, res.data]);
      setNewLabel('');
      setShowCreate(false);
      showToast(`Chave "${res.data.label}" criada com sucesso!`);
    } catch (err) {
      showToast('Erro ao criar chave', 'error');
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (key) => {
    try {
      await axios.delete(`/api/keys/${key}`);
      setKeys(prev => prev.filter(k => k.key !== key));
      showToast('Chave removida com sucesso');
    } catch (err) {
      showToast('Erro ao remover chave', 'error');
    }
  };

  const renameKey = async (key, label) => {
    try {
      await axios.put(`/api/keys/${key}`, { label });
      setKeys(prev => prev.map(k => k.key === key ? { ...k, label } : k));
      showToast(`Chave renomeada para "${label}"`);
      return true;
    } catch (err) {
      showToast('Erro ao renomear chave', 'error');
      return false;
    }
  };

  return (
    <div className="animate-fadeInUp">
      <div className="page-header flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Chaves de Stream</h1>
          <p>Gerencie as chaves autorizadas para transmissão RTMP</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={fetchKeys}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button
            id="create-key-btn"
            className="btn btn-primary btn-sm"
            onClick={() => setShowCreate(!showCreate)}
          >
            <Plus size={14} /> Nova Chave
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card create-key-form animate-fadeIn" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 14 }}>Nova Chave de Transmissão</h3>
          <div className="flex gap-3 items-center create-key-form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Nome / Identificador (opcional)</label>
              <input
                id="new-key-label"
                type="text"
                className="form-input"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Ex: Stream Principal, Câmera 1..."
                onKeyDown={e => e.key === 'Enter' && createKey()}
                autoFocus
              />
            </div>
            <div className="form-group" style={{ justifyContent: 'flex-end' }}>
              <label className="form-label">&nbsp;</label>
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button
                  id="confirm-create-key-btn"
                  className="btn btn-primary"
                  onClick={createKey}
                  disabled={creating}
                >
                  {creating
                    ? <><span className="loader" style={{ width: 15, height: 15 }} /> Gerando...</>
                    : <><Key size={14} /> Gerar Chave</>
                  }
                </button>
              </div>
            </div>
          </div>
          <p style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            A chave será gerada automaticamente como um token aleatório seguro.
          </p>
        </div>
      )}

      {error && (
        <div className="keys-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div className="loader" style={{ width: 36, height: 36, borderWidth: 3 }} />
        </div>
      ) : keys.length === 0 ? (
        <div className="empty-state card">
          <Key size={48} />
          <h3>Nenhuma chave cadastrada</h3>
          <p>Crie sua primeira chave de transmissão para começar.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Criar primeira chave
          </button>
        </div>
      ) : (
        <div className="keys-grid">
          {keys.map(item => (
            <KeyCard key={item.key} item={item} rtmpBase={rtmpBase} onDelete={deleteKey} onRename={renameKey} />
          ))}
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
        .keys-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 16px;
        }
        .keys-error {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,71,87,0.1);
          border: 1px solid rgba(255,71,87,0.25);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          color: var(--accent-red);
          font-size: 0.875rem;
          margin-bottom: 20px;
        }
        .key-card { transition: all 0.3s ease; }
        .key-card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; gap: 8px; }
        .key-card-info { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
        .key-card-icon {
          width: 36px; height: 36px;
          background: rgba(108,99,255,0.12);
          color: var(--accent-primary);
          border-radius: var(--radius-sm);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .key-card-label { font-size: 0.9rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .key-card-date { font-size: 0.72rem; color: var(--text-muted); margin-top: 2px; }
        .key-card-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .key-card-value { margin-top: 8px; }
        .create-key-form { border-color: var(--border-glow); }

        @media (max-width: 768px) {
          .keys-grid { grid-template-columns: 1fr; }
          .create-key-form-row { flex-direction: column; align-items: stretch; }
          .create-key-form-row .form-group { width: 100%; }
          .create-key-form-row .flex { justify-content: flex-end; }
        }
      `}</style>
    </div>
  );
}
