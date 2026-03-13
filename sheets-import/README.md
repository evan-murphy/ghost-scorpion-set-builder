# Google Sheet Import

Create a new Google Sheet and import these CSVs as two separate sheets.

## Steps

1. Go to [sheets.google.com](https://sheets.google.com) → New spreadsheet
2. **Sheet 1:** Rename to `songs`
   - File → Import → Upload `songs.csv`
   - Import location: Replace current sheet
   - Separator: Comma
3. **Sheet 2:** Click + to add a sheet, rename to `setlists`
   - File → Import → Upload `setlists.csv`
   - Import location: Insert new sheet(s)
   - Separator: Comma

## Column Reference

**songs:** `id` | `title` | `display_title` | `album` | `year` | `notes` | `active` | `duration_sec` | `artwork` | `song_type`

**setlists:** `id` | `date` | `venue` | `mode` | `song_ids` | `divider_positions` | `show_date` | `show_venue` | `logo_variant` | `notes` | `created_at`

- `song_ids`: pipe-delimited (e.g. `1|2|34|4|5`)
- `divider_positions`: comma-delimited indices (e.g. `4` or `3,6`)
