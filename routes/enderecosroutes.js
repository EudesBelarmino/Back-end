const express = require('express');
const router = express.Router();
const enderecosController = require('../controllers/enderecoscontroller');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.use(autenticar, apenasAdmin);

router.get('/', enderecosController.listarTodos);
router.get('/:id', enderecosController.buscarPorId);
router.post('/', enderecosController.criar);
router.put('/:id', enderecosController.atualizar);
router.patch('/:id', enderecosController.atualizarParcial);
router.delete('/:id', enderecosController.deletar);

module.exports = router;