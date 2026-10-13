const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarioscontroller');
const { autenticar, apenasAdmin } = require('../middleware/auth');

router.use(autenticar, apenasAdmin);

router.get('/', usuariosController.listarTodos);
router.get('/:id', usuariosController.buscarPorId);
router.post('/', usuariosController.criar);
router.put('/:id', usuariosController.atualizar);
router.patch('/:id', usuariosController.atualizarParcial);
router.delete('/:id', usuariosController.deletar);

module.exports = router;