/**
 * @param {Object} err
 * @param {Object} res
 * @param {String} entidade
 */
const handleDatabaseError = (err, res, entidade = 'recurso') => {
  console.error(`[Erro MySQL - ${entidade}]:`, err);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: `Já existe um(a) ${entidade.toLowerCase()} cadastrado(a) com este valor único (duplicidade).`
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(404).json({
      error: `O recurso associado (chave estrangeira) não foi encontrado no banco de dados.`
    });
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    return res.status(400).json({
      error: `Não é possível remover este(a) ${entidade.toLowerCase()} pois possui vínculos ativos em outros registros.`
    });
  }

  if (err.code === 'ER_BAD_FIELD_ERROR' || err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
    return res.status(400).json({
      error: `Dados inválidos ou incompatíveis enviados para os campos do banco de dados.`
    });
  }

  return res.status(500).json({
    error: `Erro interno no servidor de banco de dados ao processar a solicitação.`
  });
};

module.exports = { handleDatabaseError };