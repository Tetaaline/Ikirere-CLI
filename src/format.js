const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Freezing fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  56: 'Freezing drizzle',
  57: 'Heavy freezing drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers',
  81: 'Showers',
  82: 'Violent showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm with hail',
};

export function describeWeather(code) {
  return WEATHER_CODES[code] ?? `Unknown (code ${code})`;
}

export function placeLabel(place) {
  return [place.name, place.region, place.country].filter(Boolean).join(', ');
}

export function formatForecast(place, forecast) {
  const c = forecast.current;
  const cu = forecast.current_units;
  const d = forecast.daily;
  const du = forecast.daily_units;

  const lines = [];
  lines.push('');
  lines.push(`  ${placeLabel(place)}`);
  lines.push(`  ${'-'.repeat(placeLabel(place).length)}`);
  lines.push(`  Now:        ${describeWeather(c.weather_code)}`);
  lines.push(
    `  Temp:       ${c.temperature_2m}${cu.temperature_2m} (feels like ${c.apparent_temperature}${cu.apparent_temperature})`
  );
  lines.push(`  Humidity:   ${c.relative_humidity_2m}${cu.relative_humidity_2m}`);
  lines.push(`  Wind:       ${c.wind_speed_10m} ${cu.wind_speed_10m}`);
  lines.push('');
  lines.push(`  Next ${d.time.length} day${d.time.length === 1 ? '' : 's'}:`);

  for (let i = 0; i < d.time.length; i++) {
    const day = new Date(`${d.time[i]}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const low = `${d.temperature_2m_min[i]}${du.temperature_2m_min}`;
    const high = `${d.temperature_2m_max[i]}${du.temperature_2m_max}`;
    const rain = d.precipitation_probability_max?.[i];
    const rainText = rain === null || rain === undefined ? '' : `  rain ${rain}%`;
    lines.push(
      `  ${day.padEnd(12)} ${low.padStart(7)} / ${high.padEnd(7)} ${describeWeather(d.weather_code[i]).padEnd(16)}${rainText}`
    );
  }
  lines.push('');
  return lines.join('\n');
}