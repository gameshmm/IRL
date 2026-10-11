/**
 * db.js — Banco de dados SQLite via sql.js (WebAssembly)
 * com persistência atômica segura contra corrupção em falhas de energia/crash.
 */

const path   = require('path');
const fs     = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'irl.db');

let sqlDb = null; // instância sql.js Database

// ─── Persistência Atômica do Banco em Disco ──────────────────────────────────
function saveDb() {
  if (!sqlDb) return;
  try {
    const data = sqlDb.export();
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${DB_PATH}.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
    fs.writeFileSync(tmpPath, Buffer.from(data));
    fs.renameSync(tmpPath, DB_PATH);
  } catch (err) {
    console.error('[DB] Erro crítico ao persistir banco:', err);
  }
}

// ─── Helpers de query (API síncrona / type-safe) ──────────────────────────────
function dbRun(sql, params = []) {
  if (!sqlDb) throw new Error('[DB] Banco de dados não inicializado');
  sqlDb.run(sql, params);
  saveDb();
}

function dbGet(sql, params = []) {
  if (!sqlDb) throw new Error('[DB] Banco de dados não inicializado');
  const stmt = sqlDb.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : undefined;
  stmt.free();
  return row;
}

function dbAll(sql, params = []) {
  if (!sqlDb) throw new Error('[DB] Banco de dados não inicializado');
  const stmt = sqlDb.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ─── Helpers de configuração ──────────────────────────────────────────────────
function getSetting(key, defaultValue = null) {
  if (!sqlDb) return defaultValue;
  try {
    const row = dbGet('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : defaultValue;
  } catch (_) {
    return defaultValue;
  }
}

function upsertSetting(key, value) {
  if (!sqlDb) return;
  dbRun('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value)]);
}

// ─── Autenticação de chave de stream (chamado pelo NMS) ───────────────────────
function findStreamKey(key) {
  if (!sqlDb) return null;
  try {
    return dbGet('SELECT key FROM stream_keys WHERE key = ?', [key]) || null;
  } catch (_) {
    return null;
  }
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
    console.log('[DB] Senha inicial "admin123" configurada. Altere nas Configurações!');
  }
  if (!getSetting('admin_jwt_secret')) {
    upsertSetting('admin_jwt_secret', process.env.JWT_SECRET || 'changeme-please-set-JWT_SECRET-in-env');
  }
}

// ─── Inicialização ────────────────────────────────────────────────────────────
async function initDb() {
  const initSqlJs = require('sql.js');
  const wasmPath = path.join(require.resolve('sql.js'), '..', 'sql-wasm.wasm');
  const SQL = await initSqlJs({
    locateFile: () => wasmPath
  });

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buf);
    console.log('[DB] Banco de dados carregado:', DB_PATH);
  } else {
    sqlDb = new SQL.Database();
    console.log('[DB] Novo banco de dados criado:', DB_PATH);
  }

  sqlDb.run('PRAGMA foreign_keys = ON');
  createSchema();
  seedDefaults();

  // Limpeza segura ao encerrar
  process.on('SIGINT', () => { saveDb(); process.exit(0); });
  process.on('SIGTERM', () => { saveDb(); process.exit(0); });
}

module.exports = { initDb, getSetting, upsertSetting, findStreamKey, dbRun, dbGet, dbAll, saveDb };
