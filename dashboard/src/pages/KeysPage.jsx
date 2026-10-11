import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Key, Plus, Trash2, Copy, Check, RefreshCw, AlertCircle, Edit2, X, Link,
  Eye, EyeOff, ShieldCheck, Radio, Sparkles
} from 'lucide-react';

function KeyCard({ item, rtmpBase, onDelete, onRename }) {
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(item.label);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

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
    if (!window.confirm(`Tem certeza que deseja remover a chave "${item.label}"? Transmissões ativas usando esta chave serão derrubadas.`)) return;
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
    <div className="key-credential-card">
      <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
        <div className="flex items-center gap-3">
          <div className="key-badge-icon">
            <Key size={18} color="var(--cyan-neon)" />
          </div>
          <div>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  className="form-input"
                  style={{ padding: '4px 10px', fontSize: '0.85rem' }}
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
                  autoFocus
                />
                <button className="btn btn-primary btn-sm btn-icon" onClick={handleRename} disabled={saving}>
                  <Check size={14} />
                </button>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(false)}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{item.label}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  Criada em: {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '—'}
                </div>
              </>
            )}
          </div>
        </div>

        {!editing && (
          <div className="flex items-center gap-2">
            <button className="btn-icon btn-ghost" onClick={() => { setEditLabel(item.label); setEditing(true); }} title="Renomear">
              <Edit2 size={14} />
            </button>
            <button className="btn-icon btn-ghost" onClick={handleDelete} disabled={deleting} title="Excluir">
              <Trash2 size={14} color="var(--crimson-alert)" />
            </button>
          </div>
        )}
      </div>

      {/* Secret Key Display */}
      <div className="key-secret-box">
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Chave de Transmissão (Stream Key)
          </span>
          <button
            className="btn-link-action"
            onClick={() => setShowSecret(!showSecret)}
          >
            {showSecret ? <><EyeOff size={13} /> Ocultar</> : <><Eye size={13} /> Visualizar</>}
          </button>
        </div>

        <div className="flex items-center justify-between key-value-row">
          <span className="font-mono" style={{ fontSize: '0.92rem', letterSpacing: showSecret ? 'normal' : '0.2em' }}>
            {showSecret ? item.key : '••••••••••••••••'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={copyKey}>
            {copied ? <Check size={13} color="var(--emerald-live)" /> : <Copy size={13} />}
            {copied ? 'Copiada' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Full RTMP URL */}
      <div style={{ marginTop: 14 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            URL RTMP Completa para o PrismLive:
          </span>
          <button className="btn-link-action" onClick={copyRtmpUrl}>
            {copiedUrl ? <Check size={13} color="var(--emerald-live)" /> : <Link size={13} />}
            {copiedUrl ? 'Copiado!' : 'Copiar URL'}
          </button>
        </div>
        <div className="code-block" style={{ fontSize: '0.76rem', padding: '8px 12px' }}>
          {rtmpUrl}
        </div>
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
  const [rtmpBase, setRtmpBase] = useState('rtmp://<servidor>:1935/live');

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/keys');
      setKeys(res.data.keys);
      setError(null);

      try {
        const cfgRes = await axios.get('/api/config');
        const port = cfgRes.data?.rtmp?.port || 1935;
        const host = window.location.hostname;
        setRtmpBase(`rtmp://${host}:${port}/live`);
      } catch (_) {}
    } catch {
      setError('Erro ao carregar chaves');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await axios.post('/api/keys', { label: newLabel.trim() || undefined });
      setNewLabel('');
      setShowCreate(false);
      await fetchKeys();
    } catch {
      setError('Erro ao gerar nova chave');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (key) => {
    try {
      await axios.delete(`/api/keys/${key}`);
      setKeys(prev => prev.filter(k => k.key !== key));
    } catch {
      setError('Erro ao remover chave');
    }
  };

  const handleRename = async (key, label) => {
    try {
      await axios.put(`/api/keys/${key}`, { label });
      setKeys(prev => prev.map(k => (k.key === key ? { ...k, label } : k)));
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="keys-view animate-fadeIn">
      <div className="page-header">
        <div>
          <h1>Chaves de Stream & Ingest</h1>
          <p>Credenciais criptográficas seguras para transmissão do celular para o servidor</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Gerar Nova Chave
        </button>
      </div>

      {error && (
        <div className="studio-alert studio-alert--lost" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Modal / Card de Criação */}
      {showCreate && (
        <div className="card" style={{ marginBottom: 24, border: '1px solid var(--cyan-neon)' }}>
          <div className="card-header">
            <div className="card-title">
              <Key size={18} color="var(--cyan-neon)" /> Criar Nova Chave de Transmissão
            </div>
            <button className="btn-icon btn-ghost" onClick={() => setShowCreate(false)}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreate}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label">Identificação / Nome do Canal</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Celular Principal 5G, Câmera Secundária..."
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Gerando...' : 'Confirmar e Gerar Chave'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid de Chaves */}
      {loading ? (
        <div className="empty-state">
          <div className="loader" style={{ width: 40, height: 40 }} />
          <p>Carregando credenciais...</p>
        </div>
      ) : keys.length === 0 ? (
        <div className="card empty-state" style={{ padding: 48 }}>
          <Key size={48} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: 10 }} />
          <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>Nenhuma Chave Cadastrada</div>
          <p style={{ maxWidth: 460 }}>
            Você precisa de pelo menos uma chave de stream para que o servidor autentique a transmissão vinda do celular.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Gerar Primeira Chave
          </button>
        </div>
      ) : (
        <div className="grid grid-2">
          {keys.map(k => (
            <KeyCard
              key={k.key}
              item={k}
              rtmpBase={rtmpBase}
              onDelete={handleDelete}
              onRename={handleRename}
            />
          ))}
        </div>
      )}

      <style>{`
        .key-credential-card {
          background: var(--bg-glass-card);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          padding: 22px;
          box-shadow: var(--shadow-card);
          transition: all 0.22s var(--ease-spring);
        }
        .key-credential-card:hover {
          border-color: var(--border-hover);
          transform: translateY(-2px);
          box-shadow: var(--shadow-card), var(--shadow-glow-cyan);
        }
        .key-badge-icon {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          background: rgba(0, 242, 254, 0.1);
          border: 1px solid rgba(0, 242, 254, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .key-secret-box {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 12px 14px;
        }
        .key-value-row {
          margin-top: 4px;
        }
        .btn-link-action {
          background: none;
          border: none;
          color: var(--cyan-neon);
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: opacity 0.2s;
        }
        .btn-link-action:hover { opacity: 0.8; }
      `}</style>
    </div>
  );
}
