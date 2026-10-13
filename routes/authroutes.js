const express = require('express');
const authController = require('../controllers/authcontroller');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

router.post('/login', authController.login);
router.post('/cadastro', authController.cadastrar);
router.get('/me', autenticar, authController.sessao);

module.exports = router;