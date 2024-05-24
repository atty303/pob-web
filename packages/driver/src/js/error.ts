export class UserError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "UserError";
  }
}
