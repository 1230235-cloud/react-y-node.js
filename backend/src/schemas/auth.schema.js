import { z } from 'zod';

// bcrypt solo procesa los primeros 72 bytes de la contrasena.
const passwordField = z
  .string()
  .min(8, 'La contrasena debe tener al menos 8 caracteres')
  .max(72, 'La contrasena no puede superar los 72 caracteres')
  .regex(/[A-Za-z]/, 'Debe incluir al menos una letra')
  .regex(/\d/, 'Debe incluir al menos un numero');

export const loginSchema = z.object({
  email: z.email('Email invalido').max(120),
  password: z.string().min(1, 'La contrasena es obligatoria').max(72),
});

export const changePasswordSchema = z.object({
  passwordActual: z.string().min(1).max(72),
  passwordNuevo: passwordField,
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('El id debe ser un entero positivo'),
});

export { passwordField };