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
    const body = JSON.parse(e.postData.contents);
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
