require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../Database/database');

const nome = process.env.ADMIN_NAME;
const email = process.env.ADMIN_EMAIL;
const senha = process.env.ADMIN_PASSWORD;

if (!nome || !email || !senha || senha.length < 8) {
  console.error('Configure ADMIN_NAME, ADMIN_EMAIL e ADMIN_PASSWORD (mínimo de 8 caracteres) no .env.');
  db.end();
  process.exitCode = 1;
} else {
  db.query('SELECT COUNT(*) AS quantidade FROM usuarios WHERE permissao = ?', ['ADMIN'], async (err, rows) => {
    if (err) {
      console.error('Não foi possível verificar administradores:', err.message);
      db.end();
      process.exitCode = 1;
      return;
    }

    if (rows[0].quantidade > 0) {
      console.error('Já existe um administrador. O script não criou outra conta.');
      db.end();
      process.exitCode = 1;
      return;
    }

    try {
      const senhaProtegida = await bcrypt.hash(senha, 12);
      db.query(
        'INSERT INTO usuarios (nome_completo, email, senha, permissao) VALUES (?, ?, ?, ?)',
        [nome, email.trim().toLowerCase(), senhaProtegida, 'ADMIN'],
        (insertError) => {
          if (insertError) {
            console.error('Não foi possível criar o administrador:', insertError.message);
            process.exitCode = 1;
          } else {
            console.log(`Administrador criado: ${email.trim().toLowerCase()}`);
          }
          db.end();
        }
      );
    } catch (hashError) {
      console.error('Não foi possível proteger a senha:', hashError.message);
      db.end();
      process.exitCode = 1;
    }
  });
}