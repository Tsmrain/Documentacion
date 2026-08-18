export class VectorDBUnavailableException extends Error {
  constructor(message: string = "La base de datos vectorial ChromaDB no está disponible o la conexión ha fallado.") {
    super(message);
    this.name = "VectorDBUnavailableException";
    Object.setPrototypeOf(this, VectorDBUnavailableException.prototype);
  }
}
