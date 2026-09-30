export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
    this.expose = true;
  }

  static badRequest(message = 'Peticion invalida', details) {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'No autenticado', details) {
    return new HttpError(401, message, details);
  }

  static forbidden(message = 'Acceso denegado') {
    return new HttpError(403, message);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new HttpError(404, message);
  }

  static conflict(message = 'Conflicto con el estado actual') {
    return new HttpError(409, message);
  }

  static payloadTooLarge(message = 'Archivo demasiado grande') {
    return new HttpError(413, message);
  }

  static unprocessable(message = 'Datos no procesables', details) {
    return new HttpError(422, message, details);
  }

  static tooManyRequests(message = 'Demasiadas peticiones') {
    return new HttpError(429, message);
  }
}