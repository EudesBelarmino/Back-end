const db = require('../Database/database');
const { handleDatabaseError } = require('../errorhandler');

const statusValidos = ['DISPONIVEL', 'EMPRESTADO', 'INDISPONIVEL'];
const camposEditaveis = ['titulo', 'autor', 'categoria', 'descricao', 'status'];

exports.listarTodos = (req, res) => {
  const sql = 'SELECT id, titulo, autor, categoria, descricao, status, criacao, atualizacao FROM livros';
  db.query(sql, (err, results) => {
    if (err) return handleDatabaseError(err, res, 'livro');
    res.status(200).json(results);
  });
};

exports.buscarPorId = (req, res) => {
  const sql = 'SELECT id, titulo, autor, categoria, descricao, status, criacao, atualizacao FROM livros WHERE id = ?';
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return handleDatabaseError(err, res, 'livro');
    if (results.length === 0) return res.status(404).json({ message: 'Livro não encontrado.' });
    res.status(200).json(results[0]);
  });
};

exports.criar = (req, res) => {
  const { titulo, autor, categoria, descricao, status = 'DISPONIVEL' } = req.body;
  if (!titulo || !autor) {
    return res.status(400).json({ error: 'Os campos titulo e autor são obrigatórios.' });
  }
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ error: 'Status de livro inválido.' });
  }

  const sql = 'INSERT INTO livros (titulo, autor, categoria, descricao, status) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [titulo, autor, categoria || null, descricao || null, status], (err, result) => {
    if (err) return handleDatabaseError(err, res, 'livro');
    res.status(201).json({
      id: result.insertId,
      titulo,
      autor,
      categoria: categoria || null,
      descricao: descricao || null,
      status
    });
  });
};

const atualizarCampos = (req, res) => {
  const campos = req.body;
  const nomes = Object.keys(campos);
  if (nomes.length === 0 || nomes.some((nome) => !camposEditaveis.includes(nome))) {
    return res.status(400).json({ error: 'Informe campos válidos para atualizar o livro.' });
  }
  if (('titulo' in campos && !campos.titulo) || ('autor' in campos && !campos.autor)) {
    return res.status(400).json({ error: 'Titulo e autor não podem ficar vazios.' });
  }
  if ('status' in campos && !statusValidos.includes(campos.status)) {
    return res.status(400).json({ error: 'Status de livro inválido.' });
  }

  const assignments = nomes.map((campo) => `\`${campo}\` = ?`).join(', ');
  const values = nomes.map((campo) => campos[campo] === '' && ['categoria', 'descricao'].includes(campo) ? null : campos[campo]);
  db.query(`UPDATE livros SET ${assignments} WHERE id = ?`, [...values, req.params.id], (err, result) => {
    if (err) return handleDatabaseError(err, res, 'livro');
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Livro não encontrado.' });
    res.status(200).json({ message: 'Livro atualizado com sucesso.' });
  });
};

exports.atualizar = atualizarCampos;
exports.atualizarParcial = atualizarCampos;

exports.deletar = (req, res) => {
  db.query('DELETE FROM livros WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return handleDatabaseError(err, res, 'livro');
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Livro não encontrado.' });
    res.status(200).json({ message: 'Livro removido com sucesso.' });
  });
};