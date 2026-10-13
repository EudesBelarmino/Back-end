const express = require('express');
const router = express.Router();
const livrosController = require('../controllers/livroscontroller');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.use(autenticar);

router.get('/', livrosController.listarTodos);
router.get('/:id', livrosController.buscarPorId);
router.use(apenasAdmin);
router.post('/', livrosController.criar);
router.put('/:id', livrosController.atualizar);
router.patch('/:id', livrosController.atualizarParcial);
router.delete('/:id', livrosController.deletar);

module.exports = router;