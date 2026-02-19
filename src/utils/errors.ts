export class MintCoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MintCoreError";
  }
}
