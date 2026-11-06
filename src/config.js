import { CliError, EXIT } from './errors.js';

export const SETTINGS = {
  units: {
    default: 'metric',
    env: 'IKIRERE_UNITS',
    describe: 'metric (°C, km/h) or imperial (°F, mph)',
    parse(value) {
      const v = String(value).toLowerCase();
      if (v !== 'metric' && v !== 'imperial') {
        throw new CliError(`Units must be "metric" or "imperial", not "${value}".`, EXIT.USAGE);
      }
      return v;
    },
  },
  days: {
    default: 3,
    env: 'IKIRERE_DAYS',
    describe: 'how many days of forecast to show (1-7)',
    parse(value) {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 7) {
        throw new CliError(`Days must be a whole number from 1 to 7, not "${value}".`, EXIT.USAGE);
      }
      return n;
    },
  },
  timeout: {
    default: 8000,
    env: 'IKIRERE_TIMEOUT_MS',
    describe: 'milliseconds to wait for the weather service',
    parse(value) {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 500 || n > 60000) {
        throw new CliError(`Timeout must be between 500 and 60000 ms, not "${value}".`, EXIT.USAGE);
      }
      return n;
    },
  },
};

// Priority: flag > environment variable > saved setting > default
export function resolveSetting(key, flagValue, savedSettings) {
  const setting = SETTINGS[key];
  if (flagValue !== undefined) return setting.parse(flagValue);
  const envValue = process.env[setting.env];
  if (envValue !== undefined && envValue !== '') return setting.parse(envValue);
  if (savedSettings[key] !== undefined) return setting.parse(savedSettings[key]);
  return setting.default;
}