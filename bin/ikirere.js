#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { weatherCommand, favCommand, historyCommand, configCommand } from '../src/commands.js';
import { CliError, EXIT } from '../src/errors.js';

const HELP = `
ikirere - the weather, from your terminal

Usage:
  ikirere <city> [options]          Show current weather and forecast
  ikirere fav add <city>            Save a favourite place
  ikirere fav remove <city>         Remove a favourite
  ikirere fav list                  List favourites
  ikirere history                   Show recent searches
  ikirere history clear             Forget recent searches
  ikirere config                    Show settings and where each comes from
  ikirere config set <key> <value>  Save a setting (units, days, timeout)
  ikirere config unset <key>        Go back to the default

Options:
  -u, --units <metric|imperial>     Units for this search
  -d, --days <1-7>                  Days of forecast
  -t, --timeout <ms>                How long to wait for the server
  -h, --help                        Show this help
  -v, --version                     Show the version

Examples:
  ikirere Kigali
  ikirere "New York" --units imperial --days 5
  ikirere fav add Nairobi

Environment variables:
  IKIRERE_UNITS, IKIRERE_DAYS, IKIRERE_TIMEOUT_MS, IKIRERE_DATA_DIR
`;

async function getVersion() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(await readFile(path.join(here, '..', 'package.json'), 'utf8'));
  return pkg.version;
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      strict: true,
      options: {
        units: { type: 'string', short: 'u' },
        days: { type: 'string', short: 'd' },
        timeout: { type: 'string', short: 't' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
  } catch (err) {
    throw new CliError(err.message, EXIT.USAGE, 'Run "ikirere --help" to see what is allowed.');
  }

  const { values: flags, positionals } = parsed;

  if (flags.help) {
    console.log(HELP);
    return;
  }
  if (flags.version) {
    console.log(await getVersion());
    return;
  }
  if (positionals.length === 0) {
    console.log(HELP);
    throw new CliError('Please tell me which city.', EXIT.USAGE, 'Example: ikirere Kigali');
  }

  const [first, ...rest] = positionals;
  switch (first) {
    case 'fav':
      return favCommand(rest, flags);
    case 'history':
      return historyCommand(rest);
    case 'config':
      return configCommand(rest);
    default:
      return weatherCommand(positionals, flags);
  }
}

main().catch((err) => {
  if (err instanceof CliError) {
    console.error(`Error: ${err.message}`);
    if (err.hint) console.error(err.hint);
    process.exitCode = err.exitCode;
  } else {
    console.error('Something unexpected went wrong.');
    if (process.env.DEBUG) console.error(err);
    else console.error('Run again with DEBUG=1 to see details.');
    process.exitCode = EXIT.GENERAL;
  }
});