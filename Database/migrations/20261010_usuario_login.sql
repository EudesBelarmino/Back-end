-- Execute uma vez em bancos existentes; instalacoes novas usam afetoteca.sql.
ALTER TABLE usuarios
    ADD COLUMN usuario VARCHAR(30) DEFAULT NULL AFTER nome_completo,
    MODIFY COLUMN email VARCHAR(150) DEFAULT NULL,
    ADD UNIQUE KEY usuario (usuario);
