import { CliError, EXIT } from './errors.js';

const GEOCODING_URL =
  process.env.IKIRERE_GEOCODING_URL || 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = process.env.IKIRERE_FORECAST_URL || 'https://api.open-meteo.com/v1/forecast';

async function fetchJson(url, timeoutMs) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new CliError(
        `The weather service didn't answer within ${timeoutMs / 1000}s.`,
        EXIT.TIMEOUT,
        'Try again, or allow more time with --timeout 15000.'
      );
    }
    throw new CliError(
      'Could not reach the weather service.',
      EXIT.NETWORK,
      'Check your internet connection and try again.'
    );
  }

  
  if (!res.ok) {
    let reason = '';
    try {
      reason = (await res.json()).reason || '';
    } catch {}
    throw new CliError(
      `The weather service returned an error (HTTP ${res.status})${reason ? `: ${reason}` : '.'}`,
      EXIT.GENERAL
    );
  }

  return res.json();
}

export async function geocode(city, timeoutMs) {
  const params = new URLSearchParams({ name: city, count: '1', language: 'en', format: 'json' });
  const data = await fetchJson(`${GEOCODING_URL}?${params}`, timeoutMs);

  if (!data.results || data.results.length === 0) {
    throw new CliError(
      `Couldn't find a place called "${city}".`,
      EXIT.NOT_FOUND,
      'Check the spelling, or try a bigger nearby city.'
    );
  }

  const place = data.results[0];
  return {
    name: place.name,
    region: place.admin1 || '',
    country: place.country || '',
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

export async function getForecast(place, { units, days, timeoutMs }) {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    timezone: 'auto',
    forecast_days: String(days),
  });
  if (units === 'imperial') {
    params.set('temperature_unit', 'fahrenheit');
    params.set('wind_speed_unit', 'mph');
  }
  return fetchJson(`${FORECAST_URL}?${params}`, timeoutMs);
}