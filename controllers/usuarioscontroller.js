const db = require('../Database/database');
const { handleDatabaseError } = require('../errorhandler');
const bcrypt = require('bcryptjs');

const validarEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

exports.listarTodos = (req, res) => {
  const sql = 'SELECT id, nome_completo, email, telefone, permissao, criacao, atualizacao FROM usuarios';

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erro ao buscar utilizadores:', err);
      return res.status(500).json({ error: 'Erro ao buscar utilizadores no banco de dados.' });
    }
    res.status(200).json(results);
  });
};

exports.buscarPorId = (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT id, nome_completo, email, telefone, permissao, criacao, atualizacao FROM usuarios WHERE id = ?';

  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Erro ao buscar utilizador:', err);
      return res.status(500).json({ error: 'Erro ao buscar utilizador no banco de dados.' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }
    res.status(200).json(results[0]);
  });
};

exports.criar = (req, res) => {
  const { nome_completo, email, senha, telefone, permissao } = req.body;

  if (!nome_completo || !email || !senha) {
    return res.status(400).json({ error: 'Os campos nome_completo, email e senha são obrigatórios.' });
  }

  if (typeof senha !== 'string' || senha.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  if (!validarEmail(email)) {
    return res.status(400).json({ error: 'O e-mail informado é inválido.' });
  }

  if (permissao && !['ADMIN', 'USER'].includes(permissao)) {
    return res.status(400).json({ error: 'A permissão deve ser ADMIN ou USER.' });
  }

  const sql = 'INSERT INTO usuarios (nome_completo, email, senha, telefone, permissao) VALUES (?, ?, ?, ?, ?)';
  bcrypt.hash(senha, 12).then((senhaProtegida) => {
    const valores = [nome_completo, email.trim().toLowerCase(), senhaProtegida, telefone || null, permissao || 'USER'];
    db.query(sql, valores, (err, result) => {
    if (err) {
      console.error('Erro ao cadastrar utilizador:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'O e-mail informado já está em uso por outro utilizador.' });
      }
      return res.status(500).json({ error: 'Erro ao cadastrar utilizador no banco de dados.' });
    }
    res.status(201).json({
      message: 'Utilizador cadastrado com sucesso!',
      id: result.insertId,
      nome_completo,
      email: email.trim().toLowerCase(),
      telefone: telefone || null,
      permissao: permissao || 'USER'
    });
    });
  }).catch((err) => {
    console.error('Erro ao proteger senha do utilizador:', err);
    res.status(500).json({ error: 'Erro ao cadastrar utilizador.' });
  });
};

exports.atualizar = (req, res) => {
  const { id } = req.params;
  const { nome_completo, email, telefone, permissao } = req.body;

  if (!nome_completo || !email || !permissao) {
    return res.status(400).json({ error: 'Para atualização completa (PUT), nome_completo, email e permissao são obrigatórios.' });
  }

  if (!validarEmail(email)) {
    return res.status(400).json({ error: 'O e-mail informado é inválido.' });
  }

  const sql = 'UPDATE usuarios SET nome_completo = ?, email = ?, telefone = ?, permissao = ? WHERE id = ?';
  
  db.query(sql, [nome_completo, email, telefone || null, permissao, id], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar utilizador:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'O e-mail informado já está em uso.' });
      }
      return res.status(500).json({ error: 'Erro ao atualizar dados do utilizador.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Utilizador não encontrado para atualização.' });
    }
    res.status(200).json({ message: 'Utilizador atualizado com sucesso!' });
  });
};

exports.atualizarParcial = (req, res) => {
  const { id } = req.params;
  const campos = req.body;

  if (Object.keys(campos).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo enviado para atualização.' });
  }

  const camposPermitidos = ['nome_completo', 'email', 'telefone', 'permissao', 'senha'];
  if (Object.keys(campos).some((campo) => !camposPermitidos.includes(campo))) {
    return res.status(400).json({ error: 'A atualização contém campos não permitidos.' });
  }

  if (campos.email && !validarEmail(campos.email)) {
    return res.status(400).json({ error: 'O e-mail informado é inválido.' });
  }

  if (campos.permissao && !['ADMIN', 'USER'].includes(campos.permissao)) {
    return res.status(400).json({ error: 'A permissão deve ser ADMIN ou USER.' });
  }

  if (campos.senha !== undefined && (typeof campos.senha !== 'string' || campos.senha.length < 8)) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  db.query('SELECT * FROM usuarios WHERE id = ?', [id], (err, results) => {
    if (err) {
      console.error('Erro ao buscar utilizador:', err);
      return res.status(500).json({ error: 'Erro no banco de dados.' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Utilizador não encontrado.' });
    }

    const usuarioAtual = results[0];
    const nome_completo = campos.nome_completo !== undefined ? campos.nome_completo : usuarioAtual.nome_completo;
    const email = campos.email !== undefined ? campos.email : usuarioAtual.email;
    const telefone = campos.telefone !== undefined ? campos.telefone : usuarioAtual.telefone;
    const permissao = campos.permissao !== undefined ? campos.permissao : usuarioAtual.permissao;

    const atualizarUsuario = (senhaProtegida = usuarioAtual.senha) => {
      const sql = 'UPDATE usuarios SET nome_completo = ?, email = ?, telefone = ?, permissao = ?, senha = ? WHERE id = ?';
      db.query(sql, [nome_completo, email, telefone, permissao, senhaProtegida, id], (err) => {
      if (err) {
        console.error('Erro ao atualizar utilizador:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'O e-mail informado já está em uso.' });
        }
        return res.status(500).json({ error: 'Erro ao atualizar utilizador.' });
      }
      res.status(200).json({ message: 'Utilizador atualizado com sucesso!' });
      });
    };

    if (campos.senha !== undefined) {
      bcrypt.hash(campos.senha, 12).then(atualizarUsuario).catch((hashError) => {
        console.error('Erro ao proteger senha do utilizador:', hashError);
        res.status(500).json({ error: 'Erro ao atualizar utilizador.' });
      });
      return;
    }

    atualizarUsuario();
  });
};

exports.deletar = (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM usuarios WHERE id = ?';

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Erro ao deletar utilizador:', err);
      if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(400).json({ error: 'Não é possível excluir o utilizador pois ele possui empréstimos ou endereços vinculados.' });
      }
      return res.status(500).json({ error: 'Erro ao deletar utilizador.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Utilizador não encontrado para remoção.' });
    }
    res.status(200).json({ message: 'Utilizador removido com sucesso!' });
  });
};