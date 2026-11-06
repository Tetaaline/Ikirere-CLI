import { geocode, getForecast } from './api.js';
import { formatForecast, placeLabel } from './format.js';
import { loadData, saveData, addToHistory, getDataFile } from './store.js';
import { SETTINGS, resolveSetting } from './config.js';
import { CliError, EXIT } from './errors.js';

export async function weatherCommand(cityWords, flags) {
  const city = cityWords.join(' ').trim();
  if (!city) {
    throw new CliError('Please tell me which city.', EXIT.USAGE, 'Example: ikirere Kigali');
  }

  const data = await loadData();
  const units = resolveSetting('units', flags.units, data.settings);
  const days = resolveSetting('days', flags.days, data.settings);
  const timeoutMs = resolveSetting('timeout', flags.timeout, data.settings);

  const place = await geocode(city, timeoutMs);
  const forecast = await getForecast(place, { units, days, timeoutMs });

  console.log(formatForecast(place, forecast));

  addToHistory(data, place);
  try {
    await saveData(data);
  } catch (err) {
    console.error(`Warning: couldn't save history (${err.message}).`);
  }
}

export async function favCommand([action = 'list', ...rest], flags) {
  const data = await loadData();
  const city = rest.join(' ').trim();

  if (action === 'list') {
    if (data.favourites.length === 0) {
      console.log('No favourites yet. Add one with: ikirere fav add <city>');
      return;
    }
    console.log('Your favourite places:');
    data.favourites.forEach((f, i) => console.log(`  ${i + 1}. ${placeLabel(f)}`));
    return;
  }

  if (action === 'add') {
    if (!city) throw new CliError('Which city should I add?', EXIT.USAGE, 'Example: ikirere fav add Kigali');
    const timeoutMs = resolveSetting('timeout', flags.timeout, data.settings);
    const place = await geocode(city, timeoutMs);
    const already = data.favourites.some(
      (f) => f.latitude === place.latitude && f.longitude === place.longitude
    );
    if (already) {
      console.log(`${placeLabel(place)} is already a favourite.`);
      return;
    }
    data.favourites.push(place);
    await saveData(data);
    console.log(`Added ${placeLabel(place)} to favourites.`);
    return;
  }

  if (action === 'remove') {
    if (!city) throw new CliError('Which city should I remove?', EXIT.USAGE, 'Example: ikirere fav remove Kigali');
    const before = data.favourites.length;
    data.favourites = data.favourites.filter((f) => f.name.toLowerCase() !== city.toLowerCase());
    if (data.favourites.length === before) {
      throw new CliError(`"${city}" isn't in your favourites.`, EXIT.NOT_FOUND, 'See them with: ikirere fav list');
    }
    await saveData(data);
    console.log(`Removed ${city} from favourites.`);
    return;
  }

  throw new CliError(`Unknown fav action "${action}".`, EXIT.USAGE, 'Use: fav add | fav remove | fav list');
}

export async function historyCommand([action = 'list']) {
  const data = await loadData();

  if (action === 'clear') {
    data.history = [];
    await saveData(data);
    console.log('History cleared.');
    return;
  }

  if (action !== 'list') {
    throw new CliError(`Unknown history action "${action}".`, EXIT.USAGE, 'Use: history | history clear');
  }

  if (data.history.length === 0) {
    console.log('No searches yet. Try: ikirere Kigali');
    return;
  }
  console.log('Recent searches (newest first):');
  for (const h of data.history) {
    const when = new Date(h.searchedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    console.log(`  ${when.padEnd(22)} ${[h.city, h.country].filter(Boolean).join(', ')}`);
  }
}

export async function configCommand([action = 'list', key, value]) {
  const data = await loadData();

  if (action === 'list') {
    console.log(`Settings (saved in ${getDataFile()}):`);
    for (const [name, setting] of Object.entries(SETTINGS)) {
      let source = 'default';
      if (process.env[setting.env]) source = `env ${setting.env}`;
      else if (data.settings[name] !== undefined) source = 'saved';
      const current = resolveSetting(name, undefined, data.settings);
      console.log(`  ${name.padEnd(8)} ${String(current).padEnd(9)} (${source})  ${setting.describe}`);
    }
    return;
  }

  if (!key || !SETTINGS[key]) {
    throw new CliError(
      `Unknown setting "${key ?? ''}".`,
      EXIT.USAGE,
      `Available settings: ${Object.keys(SETTINGS).join(', ')}`
    );
  }

  if (action === 'set') {
    if (value === undefined) {
      throw new CliError(`Please give a value for ${key}.`, EXIT.USAGE, `Example: ikirere config set ${key} ${SETTINGS[key].default}`);
    }
    data.settings[key] = SETTINGS[key].parse(value);
    await saveData(data);
    console.log(`Saved: ${key} = ${data.settings[key]}`);
    return;
  }

  if (action === 'unset') {
    delete data.settings[key];
    await saveData(data);
    console.log(`Removed saved ${key}; it's back to the default (${SETTINGS[key].default}).`);
    return;
  }

  throw new CliError(`Unknown config action "${action}".`, EXIT.USAGE, 'Use: config | config set <key> <value> | config unset <key>');
}