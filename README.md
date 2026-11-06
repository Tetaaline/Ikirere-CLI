# ikirere

**ikirere** (Kinyarwanda for "sky" and "weather") is a weather tool you run from the terminal. Type a city, and it shows the current weather and a short forecast. It also remembers your favourite places, your recent searches and your settings.

```
$ ikirere Kigali

  Kigali, Kigali, Rwanda
  ----------------------
  Now:        Mainly clear
  Temp:       25.6°C (feels like 26.3°C)
  Humidity:   54%
  Wind:       7.8 km/h

  Next 3 days:
  Fri 6 Nov     15.4°C / 26.8°C  Light showers     rain 78%
  Sat 7 Nov     15.3°C / 26°C    Showers           rain 100%
  Sun 8 Nov     13.9°C / 25.9°C  Light showers     rain 91%
```

Weather data comes from [Open-Meteo](https://open-meteo.com/), which is free and needs no API key.

---

## Requirements

- [Node.js](https://nodejs.org/) **version 20 or newer**. Check with `node -v`.
- An internet connection.

No other packages are needed: ikirere only uses Node's built-in tools (including the built-in `fetch`).

---

## Installation

### Option 1: install straight from GitHub

```
npm install -g github:Tetaaline/ikirere
```

Then run it from any folder:

```
ikirere Kigali
```

### Option 2: clone and link (best if you want to read or change the code)

```
git clone https://github.com/Tetaaline/ikirere.git
cd ikirere
npm install
npm link
```

`npm link` creates the `ikirere` command on your computer and points it at this folder, so any change you make to the code shows up the next time you run `ikirere`.

You can also run it without installing:

```
node bin/ikirere.js Kigali
```

### Uninstall

```
npm uninstall -g ikirere
```

(If you used `npm link`, run `npm unlink -g ikirere` instead.)

---

## Usage

```
ikirere <city> [options]          Show current weather and forecast
ikirere fav add <city>            Save a favourite place
ikirere fav remove <city>         Remove a favourite
ikirere fav list                  List favourites
ikirere history                   Show recent searches
ikirere history clear             Forget recent searches
ikirere config                    Show settings and where each comes from
ikirere config set <key> <value>  Save a setting (units, days, timeout)
ikirere config unset <key>        Go back to the default
```

### Options

| Option | Short | What it does | Example |
|---|---|---|---|
| `--units` | `-u` | `metric` (°C, km/h) or `imperial` (°F, mph) | `ikirere Kigali -u imperial` |
| `--days` | `-d` | Days of forecast, 1 to 7 | `ikirere Kigali --days 5` |
| `--timeout` | `-t` | Milliseconds to wait for the server | `ikirere Kigali -t 15000` |
| `--help` | `-h` | Show help | `ikirere --help` |
| `--version` | `-v` | Show the version | `ikirere -v` |

### Examples

```
ikirere Kigali
ikirere "New York" --units imperial --days 5
ikirere Nairobi -d 1

ikirere fav add Kigali
ikirere fav add "Dar es Salaam"
ikirere fav list
ikirere fav remove Kigali

ikirere history
ikirere history clear

ikirere config set units imperial
ikirere config set days 5
ikirere config
ikirere config unset units
```

City names with spaces work with or without quotes.

---

## Configuration

### Environment variables

| Variable | What it controls | Default |
|---|---|---|
| `IKIRERE_UNITS` | `metric` or `imperial` | `metric` |
| `IKIRERE_DAYS` | Days of forecast (1-7) | `3` |
| `IKIRERE_TIMEOUT_MS` | How long to wait for the server, in milliseconds | `8000` |
| `IKIRERE_DATA_DIR` | Folder where ikirere saves its data file | `~/.ikirere` |
| `DEBUG` | Set to `1` to show full error details | off |

How to set one:

```
# PowerShell (Windows)
$env:IKIRERE_UNITS="imperial"
ikirere Kigali

# Git Bash, macOS, Linux (just for one command)
IKIRERE_UNITS=imperial ikirere Kigali
```

### Which setting wins?

The same setting can come from four places. ikirere uses the first one it finds:

1. **A flag you type now**: `--units imperial`
2. **An environment variable**: `IKIRERE_UNITS=imperial`
3. **A saved setting**: `ikirere config set units imperial`
4. **The built-in default**: `metric`

`ikirere config` shows each setting's current value and where it came from.

### Where your data is saved

Favourites, history (the last 10 searches) and settings are saved in one JSON file:

- Windows: `C:\Users\<you>\.ikirere\data.json`
- macOS / Linux: `~/.ikirere/data.json`

```json
{
  "favourites": [
    { "name": "Kigali", "region": "Kigali", "country": "Rwanda", "latitude": -1.94995, "longitude": 30.05885 }
  ],
  "history": [
    { "city": "Kigali", "country": "Rwanda", "searchedAt": "2026-11-06T13:45:00.000Z" }
  ],
  "settings": { "units": "metric" }
}
```

If the file is missing, ikirere starts fresh. If it gets corrupted, ikirere warns you and starts with empty data instead of crashing.

---

## Errors and exit codes

Every error prints a short, friendly message and a hint, and ikirere returns an **exit code**. That's a number that tells the terminal (and any script using ikirere) how things went:

| Code | Meaning | Example |
|---|---|---|
| `0` | Success | `ikirere Kigali` |
| `1` | Unexpected error, or the weather service returned an error | Server returns HTTP 500 |
| `2` | Bad input | `ikirere` (no city), `--days 9`, `--colour` |
| `3` | Not found | `ikirere Zzqxwv`, `fav remove` a city that isn't saved |
| `4` | Network problem | No internet connection |
| `5` | Timeout | Server slower than the timeout (try `-t 500`) |

Check the last exit code:

```
# Git Bash, macOS, Linux
echo $?

# PowerShell
$LASTEXITCODE
```

---

## Walkthrough: how ikirere works

### Project structure

```
ikirere/
├── bin/
│   └── ikirere.js     Front door: reads the command, routes it, handles errors
├── src/
│   ├── api.js         The two HTTP requests (geocoding, then forecast)
│   ├── commands.js    What each command does (weather, fav, history, config)
│   ├── config.js      Settings, validation and the priority order
│   ├── errors.js      The friendly error class and exit codes
│   ├── format.js      Turning the forecast into readable text
│   └── store.js       Reading and writing the JSON data file
├── package.json
└── README.md
```

### What happens when you type `ikirere Kigali`

1. **The command is found.** `package.json` has a `bin` field: `"ikirere": "./bin/ikirere.js"`. On install, npm creates an `ikirere` command that runs that file. The first line, `#!/usr/bin/env node` (the "shebang"), says to run it with Node.

2. **The input is read.** `bin/ikirere.js` gives `process.argv` to Node's built-in `util.parseArgs`, which splits it into *positionals* (`["Kigali"]`) and *flags* (like `{ units: "imperial" }`). With `strict: true`, unknown flags become a "bad input" error.

3. **It's routed.** If the first word is `fav`, `history` or `config`, that command runs. Otherwise the words are treated as a city name.

4. **Settings are decided.** `src/config.js` picks each setting by the priority order above and checks that the value is valid.

5. **Request 1, geocoding.** `src/api.js` asks Open-Meteo's geocoding API to turn "Kigali" into coordinates. If there are no results, that's a "not found" error. The API still answers successfully in that case, so we check the empty result list ourselves.

6. **Request 2, forecast.** Using those coordinates, `src/api.js` asks the forecast API for the weather. This request needs the first one's answer, so the two are *chained*: the second waits (`await`) for the first.

7. **Network errors are handled in one place.** Both requests go through `fetchJson()`:
   - `AbortSignal.timeout()` cancels slow requests, which gives a timeout error (exit 5).
   - If `fetch` throws, the network failed (exit 4).
   - `fetch` does **not** throw on HTTP errors like 404 or 500, so we check `res.ok` ourselves (exit 1).

8. **The result is printed.** `src/format.js` turns weather codes (like `61`) into words ("Light rain") and lines everything up.

9. **History is saved.** `src/store.js` uses `os.homedir()` and `path.join()` to find the data file on any operating system, reads it with `fs/promises`, adds the search, keeps the last 10 and writes it back.

10. **Errors become friendly messages.** Expected failures are a `CliError` carrying a message, a hint and an exit code. The `catch` at the bottom of `bin/ikirere.js` prints them to *stderr* and sets `process.exitCode`. Anything else is a bug, so it shows a short message (full details with `DEBUG=1`).

### Node core modules used

| Module | Used for |
|---|---|
| `process` | `argv` (the typed command), `env` (environment variables), `exitCode` |
| `util.parseArgs` | Turning the typed command into positionals and flags |
| `fs/promises` | Reading and writing `data.json` and `package.json` |
| `path` | Building file paths that work on every operating system |
| `os` | Finding the user's home folder |

---

## License

MIT