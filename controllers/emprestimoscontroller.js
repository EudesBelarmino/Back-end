const db = require('../Database/database');
const { handleDatabaseError } = require('../errorhandler');

const executar = (executor, sql, valores = []) => new Promise((resolve, reject) => {
  executor.query(sql, valores, (err, results) => {
    if (err) return reject(err);
    resolve(results);
  });
});

const obterConexao = () => new Promise((resolve, reject) => {
  db.getConnection((err, connection) => {
    if (err) return reject(err);
    resolve(connection);
  });
});

const iniciarTransacao = (connection) => new Promise((resolve, reject) => {
  connection.beginTransaction((err) => err ? reject(err) : resolve());
});

const finalizarTransacao = (connection) => new Promise((resolve, reject) => {
  connection.commit((err) => err ? reject(err) : resolve());
});

const cancelarTransacao = (connection) => new Promise((resolve) => {
  connection.rollback(() => resolve());
});

const dataValida = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(`${valor}T00:00:00.000Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor;
};

const selecionarEmprestimos = `
  SELECT e.id, e.usuarios_id, u.nome_completo AS usuario_nome,
         u.telefone AS usuario_telefone,
         e.livros_id, l.titulo AS livro_titulo, e.registro_usuario_id,
         l.autor AS livro_autor,
         e.data_emprestimo, e.previsao_devolucao, e.data_devolucao,
         e.status, e.notas
  FROM emprestimos e
  INNER JOIN usuarios u ON e.usuarios_id = u.id
  INNER JOIN livros l ON e.livros_id = l.id
`;

exports.listarTodos = async (req, res) => {
  const ownLoansOnly = req.usuario.permissao !== 'ADMIN';
  const sql = `${selecionarEmprestimos}${ownLoansOnly ? ' WHERE e.usuarios_id = ?' : ''} ORDER BY e.data_emprestimo DESC`;
  try {
    const results = await executar(db, sql, ownLoansOnly ? [req.usuario.id] : []);
    res.status(200).json(results);
  } catch (err) {
    handleDatabaseError(err, res, 'empréstimo');
  }
};

exports.buscarPorId = async (req, res) => {
  const ownLoansOnly = req.usuario.permissao !== 'ADMIN';
  const sql = `${selecionarEmprestimos} WHERE e.id = ?${ownLoansOnly ? ' AND e.usuarios_id = ?' : ''}`;
  const valores = ownLoansOnly ? [req.params.id, req.usuario.id] : [req.params.id];
  try {
    const results = await executar(db, sql, valores);
    if (results.length === 0) return res.status(404).json({ message: 'Empréstimo não encontrado.' });
    res.status(200).json(results[0]);
  } catch (err) {
    handleDatabaseError(err, res, 'empréstimo');
  }
};

exports.criar = async (req, res) => {
  const { usuarios_id, livros_id, data_emprestimo, previsao_devolucao, notas } = req.body;
  if (!usuarios_id || !livros_id || !dataValida(previsao_devolucao) ||
      (data_emprestimo !== undefined && !dataValida(data_emprestimo))) {
    return res.status(400).json({ error: 'Informe usuários, livro e datas válidas no formato AAAA-MM-DD.' });
  }
  if (data_emprestimo && previsao_devolucao < data_emprestimo) {
    return res.status(400).json({ error: 'A previsão de devolução não pode anteceder a data do empréstimo.' });
  }

  let connection;
  try {
    connection = await obterConexao();
    await iniciarTransacao(connection);
    const livros = await executar(connection, 'SELECT id, status FROM livros WHERE id = ? FOR UPDATE', [livros_id]);
    if (livros.length === 0) {
      await cancelarTransacao(connection);
      return res.status(404).json({ error: 'Livro não encontrado.' });
    }
    if (livros[0].status !== 'DISPONIVEL') {
      await cancelarTransacao(connection);
      return res.status(409).json({ error: 'O livro não está disponível para empréstimo.' });
    }

    const resultado = await executar(
      connection,
      'INSERT INTO emprestimos (livros_id, usuarios_id, registro_usuario_id, data_emprestimo, previsao_devolucao, status, notas) VALUES (?, ?, ?, COALESCE(?, CURDATE()), ?, ?, ?)',
      [livros_id, usuarios_id, req.usuario.id, data_emprestimo || null, previsao_devolucao, 'ATIVO', notas || null]
    );
    await executar(connection, 'UPDATE livros SET status = ? WHERE id = ?', ['EMPRESTADO', livros_id]);
    await finalizarTransacao(connection);
    res.status(201).json({
      id: resultado.insertId,
      usuarios_id,
      livros_id,
      registro_usuario_id: req.usuario.id,
      data_emprestimo: data_emprestimo || new Date().toISOString().slice(0, 10),
      previsao_devolucao,
      status: 'ATIVO',
      notas: notas || null
    });
  } catch (err) {
    if (connection) await cancelarTransacao(connection);
    handleDatabaseError(err, res, 'empréstimo');
  } finally {
    if (connection) connection.release();
  }
};

exports.atualizar = async (req, res) => {
  const campos = req.body;
  const nomes = Object.keys(campos);
  const permitidos = ['data_emprestimo', 'previsao_devolucao', 'notas'];
  if (nomes.length === 0 || nomes.some((campo) => !permitidos.includes(campo))) {
    return res.status(400).json({ error: 'Só é possível atualizar as datas e as notas do empréstimo.' });
  }
  if (('data_emprestimo' in campos && !dataValida(campos.data_emprestimo)) ||
      ('previsao_devolucao' in campos && !dataValida(campos.previsao_devolucao))) {
    return res.status(400).json({ error: 'As datas devem estar no formato AAAA-MM-DD.' });
  }
  try {
    const atuais = await executar(
      db,
      'SELECT data_emprestimo, previsao_devolucao FROM emprestimos WHERE id = ?',
      [req.params.id]
    );
    if (atuais.length === 0) return res.status(404).json({ message: 'Empréstimo não encontrado.' });

    const dataEmprestimo = campos.data_emprestimo || atuais[0].data_emprestimo;
    const previsaoDevolucao = campos.previsao_devolucao || atuais[0].previsao_devolucao;
    if (previsaoDevolucao < dataEmprestimo) {
      return res.status(400).json({ error: 'A previsão de devolução não pode anteceder a data do empréstimo.' });
    }

    const assignments = nomes.map((campo) => `\`${campo}\` = ?`).join(', ');
    const valores = nomes.map((campo) => campos[campo]);
    const result = await executar(db, `UPDATE emprestimos SET ${assignments} WHERE id = ?`, [...valores, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Empréstimo não encontrado ou sem alterações.' });
    res.status(200).json({ message: 'Empréstimo atualizado com sucesso.' });
  } catch (err) {
    handleDatabaseError(err, res, 'empréstimo');
  }
};

exports.devolver = async (req, res) => {
  let connection;
  try {
    connection = await obterConexao();
    await iniciarTransacao(connection);
    const rows = await executar(connection, 'SELECT id, livros_id, status FROM emprestimos WHERE id = ? FOR UPDATE', [req.params.id]);
    if (rows.length === 0) {
      await cancelarTransacao(connection);
      return res.status(404).json({ message: 'Empréstimo não encontrado.' });
    }
    if (rows[0].status === 'DEVOLVIDO') {
      await cancelarTransacao(connection);
      return res.status(409).json({ message: 'Este empréstimo já foi devolvido.' });
    }

    await executar(connection, 'UPDATE emprestimos SET status = ?, data_devolucao = CURDATE() WHERE id = ?', ['DEVOLVIDO', req.params.id]);
    await executar(connection, 'UPDATE livros SET status = ? WHERE id = ?', ['DISPONIVEL', rows[0].livros_id]);
    await finalizarTransacao(connection);
    res.status(200).json({ message: 'Devolução registrada; o livro está disponível.' });
  } catch (err) {
    if (connection) await cancelarTransacao(connection);
    handleDatabaseError(err, res, 'empréstimo');
  } finally {
    if (connection) connection.release();
  }
};

exports.reativar = async (req, res) => {
  let connection;
  try {
    connection = await obterConexao();
    await iniciarTransacao(connection);
    const rows = await executar(
      connection,
      'SELECT e.id, e.livros_id, e.status, l.status AS livro_status FROM emprestimos e INNER JOIN livros l ON l.id = e.livros_id WHERE e.id = ? FOR UPDATE',
      [req.params.id]
    );
    if (rows.length === 0) {
      await cancelarTransacao(connection);
      return res.status(404).json({ message: 'Empréstimo não encontrado.' });
    }
    if (rows[0].status !== 'DEVOLVIDO' || rows[0].livro_status !== 'DISPONIVEL') {
      await cancelarTransacao(connection);
      return res.status(409).json({ error: 'Não é possível desfazer a devolução: o empréstimo ou o livro já foi alterado.' });
    }

    await executar(
      connection,
      'UPDATE emprestimos SET status = ?, data_devolucao = NULL WHERE id = ?',
      ['ATIVO', req.params.id]
    );
    await executar(connection, 'UPDATE livros SET status = ? WHERE id = ?', ['EMPRESTADO', rows[0].livros_id]);
    await finalizarTransacao(connection);
    res.status(200).json({ message: 'Devolução desfeita; o empréstimo está ativo novamente.' });
  } catch (err) {
    if (connection) await cancelarTransacao(connection);
    handleDatabaseError(err, res, 'empréstimo');
  } finally {
    if (connection) connection.release();
  }
};

exports.deletar = async (req, res) => {
  let connection;
  try {
    connection = await obterConexao();
    await iniciarTransacao(connection);
    const rows = await executar(connection, 'SELECT livros_id, status FROM emprestimos WHERE id = ? FOR UPDATE', [req.params.id]);
    if (rows.length === 0) {
      await cancelarTransacao(connection);
      return res.status(404).json({ message: 'Empréstimo não encontrado.' });
    }
    if (rows[0].status !== 'DEVOLVIDO') {
      await executar(connection, 'UPDATE livros SET status = ? WHERE id = ?', ['DISPONIVEL', rows[0].livros_id]);
    }
    await executar(connection, 'DELETE FROM emprestimos WHERE id = ?', [req.params.id]);
    await finalizarTransacao(connection);
    res.status(200).json({ message: 'Empréstimo removido com sucesso.' });
  } catch (err) {
    if (connection) await cancelarTransacao(connection);
    handleDatabaseError(err, res, 'empréstimo');
  } finally {
    if (connection) connection.release();
  }
};