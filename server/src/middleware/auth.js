const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

/**
 * Middleware: verifies JWT Bearer token
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  const cfg = loadConfig();
  const secret = process.env.JWT_SECRET || cfg.admin.jwtSecret;

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = { verifyToken };
