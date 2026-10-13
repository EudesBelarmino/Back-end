const jwt = require('jsonwebtoken');

exports.autenticar = (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Informe um token Bearer válido.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = {
      id: Number(payload.sub),
      email: payload.email,
      permissao: payload.permissao
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

exports.apenasAdmin = (req, res, next) => {
  if (req.usuario?.permissao !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso permitido somente para administradores.' });
  }
  next();
};