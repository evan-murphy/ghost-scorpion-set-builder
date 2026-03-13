/**
 * BTDOAGS Set List — Apps Script Web App
 * Handles: saveSetlist, saveCatalogDisplayTitle
 * Auth: Google ID token verification + allowlist
 */

const CONFIG = {
  SONGS_SHEET_ID: '1qEl-eCzp5cy_5tWqsS4FgCYEM0BGR8JRC8lv3MzeyZU',
  SETLISTS_SHEET_ID: '1lrE0Esgo0Lu7-7Bn5j91xhzlcjYEwkSRq_LCzMbwZqE',
  SONGS_SHEET_NAME: 'Sheet1',
  SETLISTS_SHEET_NAME: 'Sheet1',
  ALLOWLIST: [
    'murphy.evan@gmail.com',
    'btdoags@gmail.com',
    'mccullaghxi@gmail.com',
    'captainisdead@gmail.com',
    'sjones985@gmail.com'
  ]
};

function doPost(e) {
  let result = { ok: false, error: 'Invalid request' };
  try {
    const raw = e.postData && e.postData.contents ? e.postData.contents : (e.parameter && e.parameter.data ? e.parameter.data : null);
    if (!raw) {
      result = { ok: false, error: 'Missing request body' };
      return response(result);
    }
    const body = JSON.parse(raw);
    const { action, token } = body;
    if (!token) {
      result = { ok: false, error: 'Missing token' };
      return response(result);
    }
    const user = verifyToken(token);
    if (!user) {
      result = { ok: false, error: 'Invalid or expired token' };
      return response(result);
    }
    if (!isAllowed(user.email)) {
      result = { ok: false, error: 'Not authorized' };
      return response(result);
    }
    if (action === 'saveSetlist') {
      result = saveSetlist(body.setlist);
    } else if (action === 'saveCatalogDisplayTitle') {
      result = saveCatalogDisplayTitle(body.songId, body.displayTitle);
    } else if (action === 'saveCatalogMetadata') {
      result = saveCatalogMetadata(body.songId, body.metadata);
    } else if (action === 'importBandcampMetadata') {
      result = importBandcampMetadata(body.rows);
    } else if (action === 'saveNewSong') {
      result = saveNewSong(body.song);
    } else {
      result = { ok: false, error: 'Unknown action' };
    }
  } catch (err) {
    result = { ok: false, error: err.message || 'Server error' };
  }
  return response(result);
}

function response(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function verifyToken(token) {
  try {
    const res = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) return null;
    const data = JSON.parse(res.getContentText());
    return { email: (data.email || '').toLowerCase() };
  } catch (e) {
    return null;
  }
}

function isAllowed(email) {
  const list = CONFIG.ALLOWLIST.map(function(e) { return e.toLowerCase(); });
  return list.indexOf((email || '').toLowerCase()) !== -1;
}

function saveSetlist(setlist) {
  const ss = SpreadsheetApp.openById(CONFIG.SETLISTS_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SETLISTS_SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const headers = data[0] || [];
  const idCol = 0, dateCol = 1, venueCol = 2, modeCol = 3, songIdsCol = 4;
  const divCol = 5, showDateCol = 6, showVenueCol = 7, logoCol = 8, notesCol = 9, createdCol = 10;
  const now = new Date().toISOString();
  const songIdsStr = (setlist.song_ids || []).join('|');
  const divStr = (setlist.divider_positions || []).join(',');
  const row = [
    setlist.id || ('sl' + Date.now()),
    setlist.date || '',
    setlist.venue || '',
    setlist.mode || 'medium',
    songIdsStr,
    divStr,
    setlist.show_date !== false ? 'TRUE' : 'FALSE',
    setlist.show_venue === true ? 'TRUE' : 'FALSE',
    setlist.logo_variant || 'black',
    setlist.notes || '',
    now
  ];
  const existingId = setlist.id;
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(existingId)) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex >= 0) {
    sheet.getRange(rowIndex + 1, 1, rowIndex + 1, row.length).setValues([row]);
    return { ok: true, id: row[0] };
  } else {
    sheet.appendRow(row);
    return { ok: true, id: row[0] };
  }
}

function saveCatalogDisplayTitle(songId, displayTitle) {
  const ss = SpreadsheetApp.openById(CONFIG.SONGS_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SONGS_SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const displayTitleCol = 2;
  for (let i = 1; i < data.length; i++) {
    if (parseInt(data[i][0], 10) === parseInt(songId, 10)) {
      const val = displayTitle && String(displayTitle).trim() ? String(displayTitle).trim() : data[i][1] || '';
      sheet.getRange(i + 1, displayTitleCol + 1).setValue(val);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Song not found' };
}

function saveCatalogMetadata(songId, metadata) {
  const ss = SpreadsheetApp.openById(CONFIG.SONGS_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SONGS_SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  // Columns: A=0 id, B=1 title, C=2 display_title, D=3 album, E=4 year, F=5 notes, G=6 active, H=7 duration_sec, I=8 artwork, J=9 song_type
  const durationCol = 8;
  const artworkCol = 9;
  const songTypeCol = 10;
  for (let i = 1; i < data.length; i++) {
    if (parseInt(data[i][0], 10) === parseInt(songId, 10)) {
      const row = i + 1;
      if (metadata.duration_sec != null && metadata.duration_sec !== '') {
        sheet.getRange(row, durationCol).setValue(parseInt(metadata.duration_sec, 10));
      }
      if (metadata.artwork !== undefined) {
        sheet.getRange(row, artworkCol).setValue(metadata.artwork ? String(metadata.artwork).trim() : '');
      }
      if (metadata.song_type !== undefined) {
        sheet.getRange(row, songTypeCol).setValue(metadata.song_type ? String(metadata.song_type).trim() : '');
      }
      return { ok: true };
    }
  }
  return { ok: false, error: 'Song not found' };
}

function importBandcampMetadata(rows) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: 'No rows to import' };
  }
  const ss = SpreadsheetApp.openById(CONFIG.SONGS_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SONGS_SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  const durationCol = 8;
  const artworkCol = 9;
  let updated = 0;
  for (const row of rows) {
    const id = parseInt(row.id != null ? row.id : row[0], 10);
    const duration_sec = row.duration_sec != null && row.duration_sec !== '' ? parseInt(row.duration_sec, 10) : (row[2] != null && row[2] !== '' ? parseInt(row[2], 10) : null);
    const artwork = (row.artwork != null ? row.artwork : (row[3] != null ? row[3] : '')) || '';
    if (isNaN(id)) continue;
    for (var i = 1; i < data.length; i++) {
      if (parseInt(data[i][0], 10) === id) {
        var r = i + 1;
        if (duration_sec != null && !isNaN(duration_sec)) sheet.getRange(r, durationCol).setValue(duration_sec);
        if (artwork) sheet.getRange(r, artworkCol).setValue(String(artwork).trim());
        updated++;
        break;
      }
    }
  }
  return { ok: true, updated: updated };
}

function saveNewSong(song) {
  const ss = SpreadsheetApp.openById(CONFIG.SONGS_SHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SONGS_SHEET_NAME) || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  var nextId = 1;
  for (var i = 1; i < data.length; i++) {
    var id = parseInt(data[i][0], 10);
    if (!isNaN(id) && id >= nextId) nextId = id + 1;
  }
  const title = song.title || '';
  const displayTitle = (song.display_title || song.title || '').trim() || title;
  const album = song.album || '';
  const year = song.year != null && song.year !== '' ? song.year : '';
  const notes = song.notes || '';
  const active = song.active !== false ? 'TRUE' : 'FALSE';
  sheet.appendRow([nextId, title, displayTitle, album, year, notes, active]);
  return { ok: true, id: nextId };
}
