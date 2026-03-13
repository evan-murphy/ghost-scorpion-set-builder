#!/usr/bin/env node
/**
 * BTDOAGS Bandcamp Metadata Extraction
 * Crawls ghostscorpion.bandcamp.com, extracts TralbumData (duration, artwork, etc.),
 * matches to catalog, outputs CSV for import into Songs sheet.
 *
 * Usage: node extract.js [--output bandcamp-metadata.csv]
 * Requires: Node 18+ (built-in fetch)
 */

const BASE = 'https://ghostscorpion.bandcamp.com';
const MUSIC_URL = `${BASE}/music`;

// Catalog from sheets-import/songs.csv — used to match Bandcamp titles to our IDs
const CATALOG = [
  { id: 1, title: "Vile Chat", album: "Vile Chat EP" },
  { id: 2, title: "The King's Sip", album: "Vile Chat EP" },
  { id: 3, title: "The Headless Dead pts I & II", album: "Vile Chat EP" },
  { id: 4, title: "Rock Hudson", album: "Acid Chalet" },
  { id: 5, title: "Desmodontinae", album: "Acid Chalet" },
  { id: 6, title: "Nix Street", album: "Acid Chalet" },
  { id: 7, title: "The Hydromancer", album: "Acid Chalet" },
  { id: 8, title: "A Year With The Professor", album: "Acid Chalet" },
  { id: 9, title: "Theme From Acid Chalet Pt I", album: "Acid Chalet" },
  { id: 10, title: "Theme From Acid Chalet Pt II", album: "Acid Chalet" },
  { id: 11, title: "Theme From Acid Chalet Pt III", album: "Acid Chalet" },
  { id: 12, title: "Where'd That White Ghost Go?", album: "Acid Chalet" },
  { id: 13, title: "Sincerely Satan (Of Sin City!)", album: "Acid Chalet" },
  { id: 14, title: "Screams Of The Rat Men", album: "Acid Chalet" },
  { id: 15, title: "Dreams Of The Fat Men", album: "Acid Chalet" },
  { id: 16, title: "Come See The Creature", album: "Acid Chalet" },
  { id: 17, title: "Black Wine", album: "Acid Chalet" },
  { id: 18, title: "Psychotropica", album: "Acid Chalet" },
  { id: 19, title: "Dreadful Dreck", album: "Acid Chalet" },
  { id: 20, title: "I Am Considering Joining Up With The Demon", album: "Acid Chalet" },
  { id: 21, title: "Westway Ford Cemetery", album: "Beware The Dangers Of A Ghost Scorpion!" },
  { id: 22, title: "Parasite Mansion", album: "Beware The Dangers Of A Ghost Scorpion!" },
  { id: 23, title: "R.I.P. The Clown", album: "Beware The Dangers Of A Ghost Scorpion!" },
  { id: 24, title: "I See Them Heads But Not Them Bodies", album: "Beware The Dangers Of A Ghost Scorpion!" },
  { id: 25, title: "She's Howlin'", album: "Beware The Dangers Of A Ghost Scorpion!" },
  { id: 26, title: "Boris Frankenstein's Nightmare", album: "Beware The Dangers Of A Ghost Scorpion!" },
  { id: 27, title: "I'm Shy", album: "Beware The Dangers Of A Ghost Scorpion!" },
  { id: 28, title: "A Grim Wager", album: "Beware The Dangers Of A Ghost Scorpion!" },
  { id: 29, title: "Least Of All Monsters", album: "Beware The Dangers Of A Ghost Scorpion!" },
  { id: 30, title: "Me And Him Are Gonna Beat You Up", album: "Beware The Dangers Of A Ghost Scorpion!" },
  { id: 31, title: "Caught Dead", album: "Caught Dead EP" },
  { id: 32, title: "Safari Zone", album: "Caught Dead EP" },
  { id: 33, title: "Texas Blood Money", album: "Caught Dead EP" },
  { id: 34, title: "Planet Slime", album: "Caught Dead EP" },
  { id: 35, title: "Terrifying Master", album: "Boss Metal Zone EP" },
  { id: 36, title: "Straight To Darkness", album: "Boss Metal Zone EP" },
  { id: 37, title: "As Hot As Hell", album: "Boss Metal Zone EP" },
  { id: 38, title: "Full Of Blood", album: "Boss Metal Zone EP" },
  { id: 39, title: "Cateye Glasses", album: "Blood Drinkers Only" },
  { id: 40, title: "The Lover's Curse", album: "Blood Drinkers Only" },
  { id: 41, title: "The Nameless One", album: "Blood Drinkers Only" },
  { id: 42, title: "Satan's Invisible World...Revealed!", album: "Blood Drinkers Only" },
  { id: 43, title: "Haintmaker", album: "Blood Drinkers Only" },
  { id: 44, title: "Room 505", album: "Blood Drinkers Only" },
  { id: 45, title: "Blood Drinkers Only", album: "Blood Drinkers Only" },
  { id: 46, title: "Christopher's Galaxy", album: "Blood Drinkers Only" },
  { id: 47, title: "Haunted Highway", album: "Blood Drinkers Only" },
  { id: 48, title: "Black Crescent", album: "Blood Drinkers Only" },
  { id: 49, title: "13 Stabs", album: "Blood Drinkers Only" },
  { id: 50, title: "Red River Tombstone Hustle", album: "5 After Midnight" },
  { id: 51, title: "The Lurker", album: "5 After Midnight" },
  { id: 52, title: "North Texas Cobra Squadron Theme", album: "5 After Midnight" },
  { id: 53, title: "Unforgettable Skull Deformation", album: "5 After Midnight" },
  { id: 54, title: "Denton County Casket Company", album: "5 After Midnight" },
  { id: 55, title: "We Welcome the Living (But Only If They Come Here to Die)", album: "The Legend Of Goatman's Bridge" },
  { id: 56, title: "They Won't Stay Dead!", album: "The Legend Of Goatman's Bridge" },
  { id: 57, title: "Heads Will Roll!", album: "The Legend Of Goatman's Bridge" },
  { id: 58, title: "Goatman's Bridge", album: "The Legend Of Goatman's Bridge" },
  { id: 59, title: "Zombie Dance Party", album: "unreleased" }
];

// Bandcamp title variants (e.g. "Sincerely, Satan" vs "Sincerely Satan")
const TITLE_ALIASES = {
  "Sincerely, Satan (Of Sin City!)": "Sincerely Satan (Of Sin City!)",
  "Sincerely Satan (Of Sin City!)": "Sincerely Satan (Of Sin City!)"
};

function normalizeTitle(s) {
  if (!s || typeof s !== 'string') return '';
  return s.trim().replace(/\s+/g, ' ');
}

function findCatalogMatch(title, album) {
  const t = normalizeTitle(title);
  for (const c of CATALOG) {
    if (normalizeTitle(c.title) === t) return c;
    if (TITLE_ALIASES[c.title] && normalizeTitle(TITLE_ALIASES[c.title]) === t) return c;
    if (c.album && album && normalizeTitle(c.album) === normalizeTitle(album) && t.includes(normalizeTitle(c.title))) return c;
  }
  // Fuzzy: same album, title contains or is contained
  if (album) {
    for (const c of CATALOG) {
      if (c.album && normalizeTitle(c.album) === normalizeTitle(album)) {
        const ct = normalizeTitle(c.title);
        if (ct === t || t.includes(ct) || ct.includes(t)) return c;
      }
    }
  }
  return null;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BTDOAGS-SetBuilder/1.0 (metadata extraction)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

function extractTralbumData(html) {
  // Bandcamp embeds: var TralbumData = {...}; or data-tralbum
  // Handle HTML entities (Bandcamp sometimes uses &quot; etc.)
  const match = html.match(/var\s+TralbumData\s*=\s*(\{[\s\S]*?\});\s*(?:\n|$)/m);
  if (!match) return null;
  let raw = match[1];
  raw = raw.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function parseTralbum(data, pageUrl) {
  const tracks = [];
  const albumTitle = data.current?.title || data.album_title || '';
  const artUrl = data.artFullsizeUrl || data.art_id ? `https://f4.bcbits.com/img/${data.art_id}_0.jpg` : null;
  const releaseDate = data.current?.new_date || data.release_date || '';

  if (data.trackinfo && Array.isArray(data.trackinfo)) {
    for (const t of data.trackinfo) {
      tracks.push({
        title: t.title || '',
        duration: t.duration != null ? parseInt(t.duration, 10) : null,
        track_num: t.track_num,
        album: albumTitle,
        artwork: artUrl,
        release_date: releaseDate,
        bandcamp_url: pageUrl
      });
    }
  } else if (data.trackinfo && typeof data.trackinfo === 'object' && !Array.isArray(data.trackinfo)) {
    // Single track page
    const t = data.trackinfo;
    tracks.push({
      title: t.title || data.current?.title || '',
      duration: t.duration != null ? parseInt(t.duration, 10) : null,
      track_num: 1,
      album: albumTitle || data.current?.title,
      artwork: artUrl || (data.art_id ? `https://f4.bcbits.com/img/${data.art_id}_0.jpg` : null),
      release_date: releaseDate,
      bandcamp_url: pageUrl
    });
  }
  return tracks;
}

async function getMusicPageUrls() {
  const html = await fetchHtml(MUSIC_URL);
  const urls = [];
  const linkRe = /href="(https:\/\/ghostscorpion\.bandcamp\.com\/(?:album|track)\/[^"]+)"/g;
  let m;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1].replace(/&amp;/g, '&');
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

function escapeCsv(val) {
  if (val == null || val === '') return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function main() {
  const args = process.argv.slice(2);
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx >= 0 ? args[outputIdx + 1] : null;
  const outFile = outputPath || 'bandcamp-metadata.csv';

  console.error('Fetching music page...');
  const urls = await getMusicPageUrls();
  console.error(`Found ${urls.length} album/track URLs`);

  const byId = new Map();
  const unmatched = [];

  for (const url of urls) {
    await new Promise(r => setTimeout(r, 800));
    try {
      const html = await fetchHtml(url);
      const data = extractTralbumData(html);
      if (!data) {
        console.error(`  No TralbumData: ${url}`);
        continue;
      }
      const tracks = parseTralbum(data, url);
      for (const t of tracks) {
        const match = findCatalogMatch(t.title, t.album);
        if (match) {
          const existing = byId.get(match.id);
          if (!existing || (t.duration != null && (existing.duration == null || existing.duration < t.duration))) {
            byId.set(match.id, {
              id: match.id,
              title: match.title,
              duration_sec: t.duration,
              artwork: t.artwork,
              bandcamp_url: t.bandcamp_url,
              release_date: t.release_date
            });
          }
        } else {
          unmatched.push({ ...t, url });
        }
      }
    } catch (e) {
      console.error(`  Error ${url}:`, e.message);
    }
  }

  const rows = [['id', 'title', 'duration_sec', 'artwork', 'bandcamp_url', 'release_date']];
  for (const c of CATALOG) {
    const m = byId.get(c.id);
    rows.push([
      c.id,
      c.title,
      m?.duration_sec ?? '',
      m?.artwork ?? '',
      m?.bandcamp_url ?? '',
      m?.release_date ?? ''
    ]);
  }

  const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\n');
  const path = require('path');
  const fs = require('fs');
  const outPath = path.isAbsolute(outFile) ? outFile : path.join(process.cwd(), outFile);
  fs.writeFileSync(outPath, csv, 'utf8');
  console.error(`Wrote ${outPath}`);

  if (unmatched.length > 0) {
    console.error('\nUnmatched Bandcamp tracks:');
    unmatched.forEach(u => console.error(`  - ${u.title} (${u.album})`));
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
