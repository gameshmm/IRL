const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Retorna: { token }
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  const cfg = loadConfig();

  if (username !== cfg.admin.username) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const isValid = await bcrypt.compare(password, cfg.admin.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const secret = process.env.JWT_SECRET || cfg.admin.jwtSecret;
  const token = jwt.sign(
    { username: cfg.admin.username, role: 'admin' },
    secret,
    { expiresIn: '24h' }
  );

  res.json({ token, username: cfg.admin.username });
});

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Senhas obrigatórias' });
  }

  const cfg = loadConfig();
  const isValid = await bcrypt.compare(currentPassword, cfg.admin.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  cfg.admin.passwordHash = newHash;

  const fs2 = require('fs');
  fs2.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));

  res.json({ message: 'Senha alterada com sucesso' });
});

module.exports = { router };
