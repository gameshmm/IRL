/**
 * db.js — Módulo central de dados (lowdb v1, JSON puro, sem dependências nativas)
 *
 * Substitui better-sqlite3 por lowdb para eliminar a necessidade de Python
 * e Visual C++ Build Tools no Windows.
 *
 * API pública mantida compatível:
 *   getSetting(key, default)
 *   upsertSetting(key, value)
 *   findStreamKey(key)        → usado pelo index.js para autenticar streams
 *   db                        → instância lowdb exposta para as rotas
 */

const low      = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bcrypt   = require('bcryptjs');
const path     = require('path');

const DB_PATH = path.join(__dirname, '..', 'irl-db.json');

// ─── Abre / cria o banco JSON ─────────────────────────────────────────────────
const adapter = new FileSync(DB_PATH);
const db      = low(adapter);

// Estrutura padrão (criada na primeira execução)
db.defaults({
  settings:    [],
  stream_keys: [],
  sessions:    []
}).write();

// ─── Helpers de configuração ──────────────────────────────────────────────────
function getSetting(key, defaultValue = null) {
  const row = db.get('settings').find({ key }).value();
  return row ? row.value : defaultValue;
}

function upsertSetting(key, value) {
  const existing = db.get('settings').find({ key }).value();
  if (existing) {
    db.get('settings').find({ key }).assign({ value: String(value) }).write();
  } else {
    db.get('settings').push({ key, value: String(value) }).write();
  }
}

// ─── Helper de chave de stream (usado pelo index.js na autenticação RTMP) ─────
function findStreamKey(key) {
  return db.get('stream_keys').find({ key }).value() || null;
}

// ─── Seed de credenciais padrão ───────────────────────────────────────────────
// INSERT OR IGNORE equivalente: só cria se a chave não existir.
(function seedDefaults() {
  if (!getSetting('admin_username')) {
    upsertSetting('admin_username', 'admin');
  }

  if (!getSetting('admin_password_hash')) {
    const hash = bcrypt.hashSync('admin123', 10);
    upsertSetting('admin_password_hash', hash);
    console.log('[DB] Senha padrão "admin123" criada. Altere nas Configurações!');
  }

  if (!getSetting('admin_jwt_secret')) {
    upsertSetting('admin_jwt_secret', process.env.JWT_SECRET || 'changeme-please-set-JWT_SECRET-in-env');
  }
})();

module.exports = { db, getSetting, upsertSetting, findStreamKey };
