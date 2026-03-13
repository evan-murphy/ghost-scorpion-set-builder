# Bandcamp Metadata Extraction

Extracts track duration, album artwork, and release date from ghostscorpion.bandcamp.com and outputs a CSV for import into the Songs sheet.

## Usage

```bash
cd scripts/bandcamp-extract
node extract.js
# Output: bandcamp-metadata.csv in current directory

node extract.js --output bandcamp-metadata.csv
# Custom output path
```

Requires Node 18+ (built-in fetch).

## Output

CSV columns: `id`, `title`, `duration_sec`, `artwork`, `bandcamp_url`, `release_date`

## Import into Google Sheets

**Option A: Catalog UI**

1. Add columns H, I, J to your Songs sheet: `duration_sec`, `artwork`, `song_type`.
2. Run the extraction script to generate the CSV.
3. In the Catalog, click **Import Bandcamp**, sign in if needed, and paste the CSV contents.

**Option B: Manual**

1. Add columns H, I, J to your Songs sheet.
2. Open the output CSV and copy the `duration_sec` and `artwork` columns.
3. Paste into the corresponding rows (match by `id`).
