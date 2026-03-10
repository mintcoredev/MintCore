export class AccountingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountingError";
  }
}

export class ValidationError extends AccountingError {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
