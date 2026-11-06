export const EXIT = {
  GENERAL: 1,
  USAGE: 2,
  NOT_FOUND: 3,
  NETWORK: 4,
  TIMEOUT: 5,
};

export class CliError extends Error {
  constructor(message, exitCode = EXIT.GENERAL, hint = '') {
    super(message);
    this.name = 'CliError';
    this.exitCode = exitCode;
    this.hint = hint;
  }
}