-- =============================================================
--  lab-escolar · Esquema base de datos
--  Motor: MariaDB 10.4+ / InnoDB
--
--  Ejecutar:
--    cd "/run/media/jinsoon005/juegos/nodejs,react"
--    sudo mariadb < backend/database/schema.sql
--
--  ATENCION: la sentencia DROP DATABASE borra los datos del
--  proyecto. Comentala si ya tienes informacion cargada.
-- =============================================================

-- -------------------------------------------------------------
-- 0. Base de datos
-- -------------------------------------------------------------
DROP DATABASE IF EXISTS lab_escolar;
CREATE DATABASE lab_escolar
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lab_escolar;

-- -------------------------------------------------------------
-- 1. Tablas
-- -------------------------------------------------------------

-- Tabla maestra de acceso. El campo `rol` es el que gobierna la
-- regla de negocio de "exactamente dos administradores".
CREATE TABLE usuarios (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(80)      NOT NULL,
  email         VARCHAR(120)     NOT NULL,
  password_hash VARCHAR(255)     NOT NULL,
  rol           ENUM('admin', 'maestro', 'alumno') NOT NULL DEFAULT 'alumno',
  activo        TINYINT(1)       NOT NULL DEFAULT 1,
  foto          VARCHAR(255)         NULL DEFAULT NULL,
  creado_en     TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE = InnoDB;

-- Solo los usuarios con rol = 'maestro' deben tener fila aqui.
CREATE TABLE maestros (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  usuario_id      INT UNSIGNED  NOT NULL,
  numero_empleado VARCHAR(20)   NOT NULL,
  especialidad    VARCHAR(100)      NULL,
  creado_en       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_maestros_usuario (usuario_id),
  UNIQUE KEY uq_maestros_numero (numero_empleado),
  CONSTRAINT fk_maestros_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE materias (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(100) NOT NULL,
  codigo     VARCHAR(20)  NOT NULL,
  creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_materias_codigo (codigo)
) ENGINE = InnoDB;

-- Un grupo = una materia en un grado/seccion/turno concreto.
CREATE TABLE grupos (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  materia_id INT UNSIGNED NOT NULL,
  maestro_id INT UNSIGNED     NULL,
  grado      TINYINT UNSIGNED NOT NULL,
  seccion    CHAR(1)         NOT NULL,
  turno      ENUM('matutino', 'vespertino') NOT NULL DEFAULT 'matutino',
  cupo       TINYINT UNSIGNED NOT NULL DEFAULT 30,
  creado_en  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_grupos (materia_id, grado, seccion, turno),
  CONSTRAINT ck_grupos_grado CHECK (grado BETWEEN 1 AND 6),
  CONSTRAINT ck_grupos_cupo  CHECK (cupo BETWEEN 1 AND 60),
  CONSTRAINT fk_grupos_materia
    FOREIGN KEY (materia_id) REFERENCES materias (id)
    ON DELETE RESTRICT,
  -- Si se elimina o degrada al maestro, el grupo queda sin titular
  -- en lugar de desaparecer.
  CONSTRAINT fk_grupos_maestro
    FOREIGN KEY (maestro_id) REFERENCES maestros (id)
    ON DELETE SET NULL
) ENGINE = InnoDB;

CREATE TABLE alumnos (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  grupo_id   INT UNSIGNED     NULL,
  matricula  VARCHAR(20)  NOT NULL,
  creado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_alumnos_usuario (usuario_id),
  UNIQUE KEY uq_alumnos_matricula (matricula),
  CONSTRAINT fk_alumnos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_alumnos_grupo
    FOREIGN KEY (grupo_id) REFERENCES grupos (id)
    ON DELETE SET NULL
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- 2. Triggers · regla de negocio "exactamente dos administradores"
--
-- Los tres triggers se ejecutan con privilegios de DEFINER (root),
-- por eso lab_app no necesita SELECT extra para contar admins.
--
-- ESCAPE HATCH: antes de una operacion se puede hacer
--     SET @lab_admin_override = 1;
-- en la misma sesion para saltarse la regla. Reservarlo para
-- mantenimiento (rotar admins). La app nunca debe enviarlo.
-- -------------------------------------------------------------

DELIMITER $$

-- (1) BEFORE INSERT · no dejar entrar a un tercer administrador.
CREATE TRIGGER trg_usuarios_bi_admin
BEFORE INSERT ON usuarios
FOR EACH ROW
BEGIN
  IF NEW.rol = 'admin'
     AND COALESCE(@lab_admin_override, 0) = 0
     AND (SELECT COUNT(*) FROM usuarios WHERE rol = 'admin') >= 2
  THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Regla de negocio: solo existen 2 administradores. No se permite crear un tercero.';
  END IF;
END$$

-- (2) BEFORE UPDATE · protege las promoções y degradaciones de rol
--     que dejarian el sistema fuera de los 2 administradores.
CREATE TRIGGER trg_usuarios_bu_admin
BEFORE UPDATE ON usuarios
FOR EACH ROW
BEGIN
  -- Ascenso a admin cuando ya hay 2: tercer admin, prohibido.
  IF NEW.rol = 'admin' AND OLD.rol <> 'admin'
     AND COALESCE(@lab_admin_override, 0) = 0
     AND (SELECT COUNT(*) FROM usuarios WHERE rol = 'admin') >= 2
  THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Regla de negocio: solo existen 2 administradores. No se puede promover un tercero.';
  END IF;

  -- Degradacion o baja logica de uno de los 2 admins existentes.
  IF OLD.rol = 'admin' AND NEW.rol <> 'admin'
     AND COALESCE(@lab_admin_override, 0) = 0
     AND (SELECT COUNT(*) FROM usuarios WHERE rol = 'admin') <= 2
  THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Regla de negocio: no se puede quitar el rol admin; deben quedar exactamente 2.';
  END IF;

  IF OLD.rol = 'admin' AND OLD.activo = 1 AND NEW.activo = 0
     AND COALESCE(@lab_admin_override, 0) = 0
     AND (SELECT COUNT(*) FROM usuarios WHERE rol = 'admin') <= 2
  THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Regla de negocio: no se puede desactivar a uno de los 2 administradores.';
  END IF;
END$$

-- (3) BEFORE DELETE · no borrar a ninguno de los 2 administradores.
CREATE TRIGGER trg_usuarios_bd_admin
BEFORE DELETE ON usuarios
FOR EACH ROW
BEGIN
  IF OLD.rol = 'admin'
     AND COALESCE(@lab_admin_override, 0) = 0
     AND (SELECT COUNT(*) FROM usuarios WHERE rol = 'admin') <= 2
  THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Regla de negocio: no se puede eliminar a uno de los 2 administradores.';
  END IF;
END$$

DELIMITER ;

-- -------------------------------------------------------------
-- 3. Usuario de aplicacion
--
-- Solo DML: la app no puede crear ni alterar objetos. El esquema
-- se modifica unicamente ejecutando este script como root.
-- mysql_native_password es explicito para que el driver mysql2
-- de Node.js pueda autenticar por TCP.
-- -------------------------------------------------------------
CREATE USER IF NOT EXISTS 'lab_app'@'localhost' IDENTIFIED BY 'lister2005';
CREATE USER IF NOT EXISTS 'lab_app'@'127.0.0.1' IDENTIFIED BY 'lister2005';

ALTER USER 'lab_app'@'localhost' IDENTIFIED VIA mysql_native_password USING PASSWORD('lister2005');
ALTER USER 'lab_app'@'127.0.0.1' IDENTIFIED VIA mysql_native_password USING PASSWORD('lister2005');

GRANT SELECT, INSERT, UPDATE, DELETE ON lab_escolar.* TO 'lab_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON lab_escolar.* TO 'lab_app'@'127.0.0.1';

FLUSH PRIVILEGES;