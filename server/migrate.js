// Script de migração: SQLite (irl.db) -> JSON (irl-db.json)
const path = require('path');

try {
  const Database = require('better-sqlite3');
  const low      = require('lowdb');
  const FileSync = require('lowdb/adapters/FileSync');

  const sqliteDb = new Database(path.join(__dirname, 'irl.db'));
  const adapter  = new FileSync(path.join(__dirname, 'irl-db.json'));
  const jsonDb   = low(adapter);

  // Migra chaves de stream
  const keys = sqliteDb.prepare('SELECT * FROM stream_keys').all();
  if (keys.length > 0) {
    const existing = jsonDb.get('stream_keys').value();
    const existingKeys = existing.map(k => k.key);
    const newKeys = keys.filter(k => !existingKeys.includes(k.key));
    if (newKeys.length > 0) {
      jsonDb.get('stream_keys').push(...newKeys).write();
    }
    console.log('[MIGRA] stream_keys migradas:', keys.length);
  }

  // Migra sessões
  const sessions = sqliteDb.prepare('SELECT * FROM sessions').all();
  if (sessions.length > 0) {
    jsonDb.get('sessions').push(...sessions).write();
    console.log('[MIGRA] sessões migradas:', sessions.length);
  }

  // Migra hash de senha real do SQLite (sobrescreve a padrão gerada)
  const pwRow = sqliteDb.prepare("SELECT value FROM settings WHERE key='admin_password_hash'").get();
  if (pwRow && pwRow.value) {
    jsonDb.get('settings').find({ key: 'admin_password_hash' }).assign({ value: pwRow.value }).write();
    console.log('[MIGRA] hash de senha migrado do SQLite');
  }

  sqliteDb.close();
  console.log('[MIGRA] Concluída com sucesso!');

} catch (e) {
  console.log('[MIGRA] SQLite não disponível (normal em instalação nova):', e.message);
}
