/**
 * db.js — Banco de dados SQLite via sql.js (WebAssembly)
 *
 * sql.js é o SQLite compilado para WASM — banco .db real em disco,
 * sem Python, sem Visual C++, sem compilação nativa.
 *
 * API pública:
 *   initDb()                     → async, chame uma vez na inicialização
 *   getSetting(key, default)
 *   upsertSetting(key, value)
 *   findStreamKey(key)
 *   dbRun(sql, params)           → INSERT / UPDATE / DELETE
 *   dbGet(sql, params)           → retorna uma linha como objeto
 *   dbAll(sql, params)           → retorna array de objetos
 */

const path    = require('path');
const fs      = require('fs');
const bcrypt  = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'irl.db');

let sqlDb = null; // instância sql.js Database

// ─── Persiste o banco em disco após cada escrita ──────────────────────────────
function saveDb() {
  if (!sqlDb) return;
  const data = sqlDb.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ─── Helpers de query (API similar ao better-sqlite3) ─────────────────────────
function dbRun(sql, params = []) {
  sqlDb.run(sql, params);
  saveDb();
}

function dbGet(sql, params = []) {
  const stmt = sqlDb.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : undefined;
  stmt.free();
  return row;
}

function dbAll(sql, params = []) {
  const stmt = sqlDb.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ─── Helpers de configuração ──────────────────────────────────────────────────
function getSetting(key, defaultValue = null) {
  const row = dbGet('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : defaultValue;
}

function upsertSetting(key, value) {
  dbRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
}

// ─── Autenticação de chave de stream (chamado pelo NMS) ───────────────────────
function findStreamKey(key) {
  return dbGet('SELECT key FROM stream_keys WHERE key = ?', [key]) || null;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
function createSchema() {
  sqlDb.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stream_keys (
      key        TEXT PRIMARY KEY,
      label      TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      stream_path      TEXT NOT NULL,
      started_at       TEXT,
      ended_at         TEXT NOT NULL,
      duration_seconds INTEGER
    );
  `);
  saveDb();
}

// ─── Seed de credenciais padrão ───────────────────────────────────────────────
function seedDefaults() {
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
}

// ─── Inicialização (async — chame uma vez antes de tudo) ──────────────────────
async function initDb() {
  const initSqlJs = require('sql.js');

  // Localiza o arquivo WASM dentro do pacote sql.js
  const wasmPath = path.join(require.resolve('sql.js'), '..', 'sql-wasm.wasm');
  const SQL = await initSqlJs({
    locateFile: () => wasmPath
  });

  if (fs.existsSync(DB_PATH)) {
    // Carrega banco existente
    const buf = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buf);
    console.log('[DB] Banco de dados carregado:', DB_PATH);
  } else {
    // Cria novo banco
    sqlDb = new SQL.Database();
    console.log('[DB] Novo banco de dados criado:', DB_PATH);
  }

  sqlDb.run('PRAGMA foreign_keys = ON');
  createSchema();
  seedDefaults();
}

module.exports = { initDb, getSetting, upsertSetting, findStreamKey, dbRun, dbGet, dbAll };
