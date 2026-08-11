# Oslo Barnehage 2026

Interactive local app to explore available kindergarten spots in Oslo for 2026.

## What is in this repo

- `barnehage_filter_app.html`: main filter app (map + searchable result cards).
- `barnehage_app.js`: application JavaScript code.
- `barnehage_data.js`: JS dataset loaded by the app.
- `barnehage_live_data.js`: snapshot of live availability (fallback for local dev).
- `barnehage_spots_2026.csv`: extracted dataset in CSV format.
- `barnehage_spots_2026_map.html`: map-focused HTML export.
- `ledige_parser.mjs`: parser for the live "ledige barnehageplasser" page.
- `scrape_ledige_plasser.mjs`: regenerates `barnehage_live_data.js`.
- `netlify/functions/ledige-plasser.mjs`: Netlify function serving live availability.
- `data/`: source PDFs and extraction script.
  - `data/extract_barnehage_data.py`

## Features

- Filter by **district** (bydel)
- Filter by **zip code** (postnummer)
- Filter by **age group** (small/both/large sections)
- Filter by **minimum available spots**
- **"Ledige plasser nå"** toggle: switches the liten/stor numbers to the currently
  announced availability from [oslo.kommune.no/barnehage/ledige-barnehageplasser](https://www.oslo.kommune.no/barnehage/ledige-barnehageplasser/),
  with the per-bydel "Sist oppdatert" date on each card
- Addresses link to Google Maps
- Interactive map with kindergarten markers
- Search by name

## Live availability data

On the deployed Netlify site, the toggle fetches fresh data through the
`ledige-plasser` Netlify function on demand. When the function is unavailable
(e.g. a plain local file server), the app falls back to the committed snapshot
`barnehage_live_data.js`. Refresh the snapshot with:

```bash
node scrape_ledige_plasser.mjs
```

## Run locally

Open the app directly:

- `barnehage_filter_app.html`

Or serve the folder with a simple local server (recommended):

```bash
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/barnehage_filter_app.html`

## Update data

### Setup (first time only)

The data extraction script requires API credentials. Copy the example environment file and fill in your API keys:

```bash
cp .env.example .env
```

Edit `.env` and add your Algolia API credentials:
```
ALGOLIA_APP_ID=your_app_id_here
ALGOLIA_API_KEY=your_api_key_here
ALGOLIA_INDEX=prod_oslo_kommune_no
```

**Note:** These are read-only public API keys for Oslo Kommune's public data. Contact Oslo Kommune if you need access.

### Running the extraction

From the repository root:

```bash
python3 data/extract_barnehage_data.py
```

This regenerates data outputs used by the app.
