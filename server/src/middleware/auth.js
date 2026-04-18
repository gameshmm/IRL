const jwt = require('jsonwebtoken');
const { getSetting } = require('../db');

/**
 * Middleware: verifica token JWT Bearer
 * Aceita token via header Authorization: Bearer <token>
 * OU via query param ?token=<token> (para EventSource/SSE)
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  // Busca o secret do banco de dados (com fallback para env var)
  const secret = process.env.JWT_SECRET || getSetting('admin_jwt_secret', 'changeme');

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = { verifyToken };
