import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const HISTORY_LIMIT = 10;

export function getDataFile() {
  const dir = process.env.IKIRERE_DATA_DIR || path.join(os.homedir(), '.ikirere');
  return path.join(dir, 'data.json');
}

function defaultData() {
  return { favourites: [], history: [], settings: {} };
}

export async function loadData() {
  const file = getDataFile();
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return defaultData();
    throw err;
  }

  try {
    const data = JSON.parse(text);
    return {
      favourites: Array.isArray(data.favourites) ? data.favourites : [],
      history: Array.isArray(data.history) ? data.history : [],
      settings: data.settings && typeof data.settings === 'object' ? data.settings : {},
    };
  } catch {
    console.error(`Warning: ${file} is not valid JSON, starting with empty data.`);
    return defaultData();
  }
}

export async function saveData(data) {
  const file = getDataFile();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export function addToHistory(data, place) {
  data.history.unshift({
    city: place.name,
    country: place.country,
    searchedAt: new Date().toISOString(),
  });
  data.history = data.history.slice(0, HISTORY_LIMIT);
}