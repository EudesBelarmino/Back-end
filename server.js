require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Configure JWT_SECRET com pelo menos 32 caracteres no arquivo .env.');
}

const origensFrontend = new Set([
  ...(process.env.FRONTEND_URL || '').split(',').map((origem) => origem.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
]);

app.use(cors({
  origin: [...origensFrontend],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/authroutes');
app.use('/api/auth', authRoutes);

const usuariosRoutes = require('./routes/usuariosroutes');
app.use('/api/usuarios', usuariosRoutes);

const enderecosRoutes = require('./routes/enderecosroutes');
app.use('/api/enderecos', enderecosRoutes);

const livrosRoutes = require('./routes/livrosroutes');
app.use('/api/livros', livrosRoutes);

const emprestimosRoutes = require('./routes/emprestimosroutes');
app.use('/api/emprestimos', emprestimosRoutes);

const PORT = Number(process.env.PORT) || 3000;

app.use((req, res, next) => {
  res.status(404).json({ error: 'Rota não encontrada na API.' });
});

app.use((err, req, res, next) => {
  console.error('Erro não tratado na aplicação:', err.stack);
  res.status(500).json({ error: 'Ocorreu um erro interno inesperado na aplicação.' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});