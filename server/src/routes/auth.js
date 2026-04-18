const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSetting, upsertSetting } = require('../db');

const router = express.Router();

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

  const storedUsername = getSetting('admin_username', 'admin');
  const passwordHash   = getSetting('admin_password_hash', '');
  const jwtSecret      = getSetting('admin_jwt_secret', process.env.JWT_SECRET || 'changeme');

  if (username !== storedUsername) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const isValid = await bcrypt.compare(password, passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const secret = process.env.JWT_SECRET || jwtSecret;
  const token = jwt.sign(
    { username: storedUsername, role: 'admin' },
    secret,
    { expiresIn: '24h' }
  );

  res.json({ token, username: storedUsername });
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

  const passwordHash = getSetting('admin_password_hash', '');
  const isValid = await bcrypt.compare(currentPassword, passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  upsertSetting('admin_password_hash', newHash);

  res.json({ message: 'Senha alterada com sucesso' });
});

module.exports = { router };
