const db = require('../Database/database');
const { handleDatabaseError } = require('../errorhandler');

const camposEditaveis = ['rua', 'numero', 'complemento', 'bairro', 'cidade'];

exports.listarTodos = (req, res) => {
  db.query('SELECT id, usuarios_id, rua, numero, complemento, bairro, cidade FROM enderecos', (err, results) => {
    if (err) return handleDatabaseError(err, res, 'endereço');
    res.status(200).json(results);
  });
};

exports.buscarPorId = (req, res) => {
  db.query('SELECT id, usuarios_id, rua, numero, complemento, bairro, cidade FROM enderecos WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return handleDatabaseError(err, res, 'endereço');
    if (results.length === 0) return res.status(404).json({ message: 'Endereço não encontrado.' });
    res.status(200).json(results[0]);
  });
};

exports.criar = (req, res) => {
  const { usuarios_id, rua, numero, complemento, bairro, cidade } = req.body;
  if (!usuarios_id || !rua || !numero || !bairro || !cidade) {
    return res.status(400).json({ error: 'Informe usuarios_id, rua, numero, bairro e cidade.' });
  }

  const sql = 'INSERT INTO enderecos (usuarios_id, rua, numero, complemento, bairro, cidade) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [usuarios_id, rua, numero, complemento || null, bairro, cidade], (err, result) => {
    if (err) return handleDatabaseError(err, res, 'endereço');
    res.status(201).json({ id: result.insertId, usuarios_id, rua, numero, complemento: complemento || null, bairro, cidade });
  });
};

const atualizarCampos = (req, res) => {
  const campos = req.body;
  const nomes = Object.keys(campos);
  if (nomes.length === 0 || nomes.some((campo) => !camposEditaveis.includes(campo))) {
    return res.status(400).json({ error: 'Informe campos válidos para atualizar o endereço.' });
  }

  const assignments = nomes.map((campo) => `\`${campo}\` = ?`).join(', ');
  const values = nomes.map((campo) => campos[campo] === '' && campo === 'complemento' ? null : campos[campo]);
  db.query(`UPDATE enderecos SET ${assignments} WHERE id = ?`, [...values, req.params.id], (err, result) => {
    if (err) return handleDatabaseError(err, res, 'endereço');
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Endereço não encontrado.' });
    res.status(200).json({ message: 'Endereço atualizado com sucesso.' });
  });
};

exports.atualizar = atualizarCampos;
exports.atualizarParcial = atualizarCampos;

exports.deletar = (req, res) => {
  db.query('DELETE FROM enderecos WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return handleDatabaseError(err, res, 'endereço');
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Endereço não encontrado.' });
    res.status(200).json({ message: 'Endereço removido com sucesso.' });
  });
};