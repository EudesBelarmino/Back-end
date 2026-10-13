const express = require('express');
const router = express.Router();
const emprestimosController = require('../controllers/emprestimoscontroller');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.use(autenticar);

router.get('/', emprestimosController.listarTodos);
router.get('/:id', emprestimosController.buscarPorId);
router.use(apenasAdmin);
router.post('/', emprestimosController.criar);
router.patch('/:id', emprestimosController.atualizar);
router.put('/:id', emprestimosController.atualizar);
router.put('/:id/devolver', emprestimosController.devolver);
router.put('/:id/reativar', emprestimosController.reativar);
router.delete('/:id', emprestimosController.deletar);

module.exports = router;