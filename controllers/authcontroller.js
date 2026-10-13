const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../Database/database');

const executarQuery = (sql, valores) => new Promise((resolve, reject) => {
  db.query(sql, valores, (err, results) => {
    if (err) return reject(err);
    resolve(results);
  });
});

const criarToken = (usuario) => jwt.sign(
  {
    email: usuario.email,
    usuario: usuario.usuario,
    permissao: usuario.permissao
  },
  process.env.JWT_SECRET,
  { subject: String(usuario.id), expiresIn: '8h' }
);

const formatarResposta = (usuario) => ({
  token: criarToken(usuario),
  usuario: {
    id: usuario.id,
    nome_completo: usuario.nome_completo,
    usuario: usuario.usuario,
    email: usuario.email,
    telefone: usuario.telefone,
    permissao: usuario.permissao
  }
});

const validarIdentificador = (identificador) => {
  const valor = identificador.trim().toLowerCase();
  const telefone = valor.replace(/\D/g, '');
  return {
    usuario: valor,
    telefone: telefone.length >= 10 ? telefone : ''
  };
};

exports.login = async (req, res) => {
  const body = req.body || {};
  const identificador = typeof body.usuario === 'string'
    ? body.usuario
    : typeof body.email === 'string' ? body.email : '';
  const senha = typeof body.senha === 'string' ? body.senha : '';

  if (!identificador.trim() || !senha) {
    return res.status(400).json({ error: 'Informe usuário ou e-mail e senha.' });
  }

  try {
    const login = validarIdentificador(identificador);
    const usuarios = await executarQuery(
      `SELECT id, nome_completo, usuario, email, telefone, senha, permissao
       FROM usuarios
       WHERE usuario = ? OR email = ?
          OR (? <> '' AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone, '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') = ?)
       ORDER BY CASE WHEN usuario = ? THEN 0 WHEN email = ? THEN 1 ELSE 2 END
       LIMIT 1`,
      [login.usuario, login.usuario, login.telefone, login.telefone, login.usuario, login.usuario]
    );
    const usuario = usuarios[0];

    if (!usuario) {
      return res.status(401).json({ error: 'Usuário, e-mail ou senha inválidos.' });
    }

    let senhaValida = await bcrypt.compare(senha, usuario.senha).catch(() => false);
    const senhaLegada = !/^\$2[aby]\$/.test(usuario.senha);

    if (!senhaValida && senhaLegada && senha === usuario.senha) {
      senhaValida = true;
      const senhaProtegida = await bcrypt.hash(senha, 12);
      await executarQuery('UPDATE usuarios SET senha = ? WHERE id = ?', [senhaProtegida, usuario.id]);
    }

    if (!senhaValida) {
      return res.status(401).json({ error: 'Usuário, e-mail ou senha inválidos.' });
    }

    return res.status(200).json(formatarResposta(usuario));
  } catch (err) {
    console.error('Erro ao autenticar usuário:', err);
    return res.status(500).json({ error: 'Erro ao realizar login.' });
  }
};

exports.cadastrar = async (req, res) => {
  const body = req.body || {};
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const usuario = typeof body.usuario === 'string' ? body.usuario.trim().toLowerCase() : '';
  const telefone = typeof body.telefone === 'string' ? body.telefone.replace(/\D/g, '') : '';
  const senha = typeof body.senha === 'string' ? body.senha : '';

  if (!nome || !usuario || !telefone || !senha) {
    return res.status(400).json({ error: 'Informe nome, usuário, telefone e senha.' });
  }
  if (nome.length > 150) {
    return res.status(400).json({ error: 'O nome deve ter no máximo 150 caracteres.' });
  }
  if (!/^[a-z0-9._]{4,30}$/.test(usuario) || !/[a-z]/.test(usuario)) {
    return res.status(400).json({ error: 'Use um usuário de 4 a 30 caracteres, com letras, números, ponto ou underline.' });
  }
  if (telefone.length < 10 || telefone.length > 11) {
    return res.status(400).json({ error: 'Informe um telefone válido com DDD.' });
  }
  if (senha.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  try {
    const existentes = await executarQuery(
      `SELECT id FROM usuarios
       WHERE usuario = ?
          OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone, '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') = ?
       LIMIT 1`,
      [usuario, telefone]
    );
    if (existentes.length > 0) {
      return res.status(409).json({ error: 'Este usuário ou telefone já está cadastrado.' });
    }

    const senhaProtegida = await bcrypt.hash(senha, 12);
    const resultado = await executarQuery(
      'INSERT INTO usuarios (nome_completo, usuario, email, senha, telefone, permissao) VALUES (?, ?, NULL, ?, ?, ?)',
      [nome, usuario, senhaProtegida, telefone, 'USER']
    );
    const novosUsuarios = await executarQuery(
      'SELECT id, nome_completo, usuario, email, telefone, permissao FROM usuarios WHERE id = ?',
      [resultado.insertId]
    );

    return res.status(201).json(formatarResposta(novosUsuarios[0]));
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Este usuário já está cadastrado.' });
    }
    console.error('Erro ao cadastrar usuário:', err);
    return res.status(500).json({ error: 'Erro ao criar a conta.' });
  }
};

exports.sessao = async (req, res) => {
  try {
    const usuarios = await executarQuery(
      'SELECT id, nome_completo, usuario, email, telefone, permissao FROM usuarios WHERE id = ?',
      [req.usuario.id]
    );
    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'A sessão não corresponde a um usuário ativo.' });
    }
    return res.status(200).json({ usuario: usuarios[0] });
  } catch (err) {
    console.error('Erro ao consultar sessão:', err);
    return res.status(500).json({ error: 'Erro ao consultar a sessão.' });
  }
};