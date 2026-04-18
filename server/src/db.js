/**
 * db.js — Módulo central do banco de dados SQLite
 *
 * Usa better-sqlite3 (síncrono, sem callbacks).
 * Credenciais de admin, chaves de stream e histórico de sessões
 * vivem exclusivamente no arquivo irl.db.
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'irl.db');

// ─── Abre o banco (cria se não existir) ───────────────────────────────────────
const db = new Database(DB_PATH);

// WAL mode: muito mais rápido para leituras concorrentes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  -- Configurações gerais (chave/valor): admin, jwt_secret, etc.
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Chaves de stream autorizadas
  CREATE TABLE IF NOT EXISTS stream_keys (
    key        TEXT PRIMARY KEY,
    label      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  -- Histórico de sessões de stream
  CREATE TABLE IF NOT EXISTS sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    stream_path      TEXT NOT NULL,
    started_at       TEXT,
    ended_at         TEXT NOT NULL,
    duration_seconds INTEGER
  );
`);

// ─── Helpers de configuração ──────────────────────────────────────────────────
function getSetting(key, defaultValue = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : defaultValue;
}

function upsertSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

module.exports = { db, getSetting, upsertSetting };
