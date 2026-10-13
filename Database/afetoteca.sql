


CREATE TABLE usuarios (
    id INT NOT NULL AUTO_INCREMENT,
    nome_completo VARCHAR(150) NOT NULL,
    usuario VARCHAR(30) DEFAULT NULL,
    email VARCHAR(150) DEFAULT NULL,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) DEFAULT NULL,
    permissao ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY usuario (usuario),
    UNIQUE KEY email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE livros (
    id INT NOT NULL AUTO_INCREMENT,
    titulo VARCHAR(255) NOT NULL,
    autor VARCHAR(150) NOT NULL,
    categoria VARCHAR(100) DEFAULT NULL,
    descricao TEXT DEFAULT NULL,
    status ENUM('DISPONIVEL', 'EMPRESTADO', 'INDISPONIVEL') NOT NULL DEFAULT 'DISPONIVEL',
    criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_livros_titulo (titulo),
    KEY idx_livros_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE enderecos (
    id INT NOT NULL AUTO_INCREMENT,
    usuarios_id INT NOT NULL,
    rua VARCHAR(150) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100) DEFAULT NULL,
    bairro VARCHAR(100) DEFAULT NULL,
    cidade VARCHAR(100) NOT NULL,

    PRIMARY KEY (id),
    UNIQUE KEY usuarios_id (usuarios_id),

    CONSTRAINT fk_enderecos_usuarios
        FOREIGN KEY (usuarios_id)
        REFERENCES usuarios (id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE emprestimos (
    id INT NOT NULL AUTO_INCREMENT,
    livros_id INT NOT NULL,
    usuarios_id INT NOT NULL,
    registro_usuario_id INT NOT NULL,
    data_emprestimo DATE NOT NULL,
    previsao_devolucao DATE NOT NULL,
    data_devolucao DATE DEFAULT NULL,
    status ENUM('ATIVO', 'DEVOLVIDO', 'ATRASADO') NOT NULL DEFAULT 'ATIVO',
    notas TEXT DEFAULT NULL,
    criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    KEY fk_livros_emprestimos (livros_id),
    KEY fk_usuarios_emprestimos (usuarios_id),
    KEY fk_emprestimos_registros (registro_usuario_id),
    KEY idx_emprestimos_status (status),

    CONSTRAINT fk_livros_emprestimos
        FOREIGN KEY (livros_id)
        REFERENCES livros (id),

    CONSTRAINT fk_usuarios_emprestimos
        FOREIGN KEY (usuarios_id)
        REFERENCES usuarios (id),

    CONSTRAINT fk_emprestimos_registros
        FOREIGN KEY (registro_usuario_id)
        REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Livro de teste para cadastrar emprestimos pela API.
INSERT INTO livros (titulo, autor, categoria, descricao)
SELECT 'Livro de teste para API', 'Autor de teste', 'Teste', 'Livro para testar emprestimos pela API'
WHERE NOT EXISTS (
    SELECT 1
    FROM livros
    WHERE titulo = 'Livro de teste para API'
      AND autor = 'Autor de teste'
);
