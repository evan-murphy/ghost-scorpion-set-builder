/**
 * BTDOAGS Set List — Data layer
 * Fetches from Google Sheets or returns mock data
 */

const DATA = (function() {
  const MOCK_SONGS = [
    { id: 1, title: "Vile Chat", display_title: "VILE CHAT", album: "Vile Chat EP", year: 2025, notes: "", active: true },
    { id: 2, title: "The King's Sip", display_title: "KINGS SIP", album: "Vile Chat EP", year: 2025, notes: "", active: true },
    { id: 3, title: "The Headless Dead pts I & II", display_title: "HEADLESS / SEVERED", album: "Vile Chat EP", year: 2025, notes: "", active: true },
    { id: 4, title: "Rock Hudson", display_title: "ROCK HUDSON", album: "Acid Chalet", year: 2023, notes: "", active: true },
    { id: 5, title: "Desmodontinae", display_title: "DESMO", album: "Acid Chalet", year: 2023, notes: "", active: true },
    { id: 6, title: "Nix Street", display_title: "NIX ST", album: "Acid Chalet", year: 2023, notes: "", active: true },
    { id: 7, title: "The Hydromancer", display_title: "HYDROMANCER", album: "Acid Chalet", year: 2023, notes: "", active: true },
    { id: 8, title: "A Year With The Professor", display_title: "YEAR WITH THE PROFESOR", album: "Acid Chalet", year: 2023, notes: "", active: true },
    { id: 9, title: "Theme From Acid Chalet Pt I", display_title: "ACID CHALET I", album: "Acid Chalet", year: 2023, notes: "", active: true },
    { id: 10, title: "Theme From Acid Chalet Pt II", display_title: "ACID CHALET II", album: "Acid Chalet", year: 2023, notes: "", active: true },
    { id: 11, title: "Theme From Acid Chalet Pt III", display_title: "ACID CHALET III", album: "Acid Chalet", year: 2023, notes: "", active: true },
    { id: 12, title: "Where'd That White Ghost Go?", display_title: "WHERE'D THAT WHITE GHOST GO", album: "Acid Chalet", year: 2023, notes: "", active: true },
    { id: 13, title: "Sincerely Satan (Of Sin City!)", display_title: "SINCERELY SATAN", album: "Acid Chalet", year: 2023, notes: "", active: true },
    { id: 14, title: "Screams Of The Rat Men", display_title: "SCREAMS OF THE RAT MEN", album: "Acid Chalet", year: 2023, notes: "", active: true },
    { id: 15, title: "Dreams Of The Fat Men", display_title: "DREAMS OF THE FAT MEN", album: "Acid Chalet", year: 2023, notes: "", active: false },
    { id: 16, title: "Come See The Creature", display_title: "COME SEE THE CREATURE", album: "Acid Chalet", year: 2023, notes: "", active: false },
    { id: 17, title: "Black Wine", display_title: "BLACK WINE", album: "Acid Chalet", year: 2023, notes: "", active: false },
    { id: 18, title: "Psychotropica", display_title: "PSYCHOTROPICA", album: "Acid Chalet", year: 2023, notes: "", active: false },
    { id: 19, title: "Dreadful Dreck", display_title: "DREADFUL DRECK", album: "Acid Chalet", year: 2023, notes: "", active: false },
    { id: 20, title: "I Am Considering Joining Up With The Demon", display_title: "CONSIDERING JOINING THE DEMON", album: "Acid Chalet", year: 2023, notes: "", active: false },
    { id: 21, title: "Westway Ford Cemetery", display_title: "WESTWAY FORD", album: "Beware The Dangers Of A Ghost Scorpion!", year: 2020, notes: "", active: true },
    { id: 22, title: "Parasite Mansion", display_title: "PARASITE MANSION", album: "Beware The Dangers Of A Ghost Scorpion!", year: 2020, notes: "", active: true },
    { id: 23, title: "R.I.P. The Clown", display_title: "RIP THE CLOWN", album: "Beware The Dangers Of A Ghost Scorpion!", year: 2020, notes: "", active: true },
    { id: 24, title: "I See Them Heads But Not Them Bodies", display_title: "I SEE THEM HEADS", album: "Beware The Dangers Of A Ghost Scorpion!", year: 2020, notes: "", active: true },
    { id: 25, title: "She's Howlin'", display_title: "SHE'S HOWLIN", album: "Beware The Dangers Of A Ghost Scorpion!", year: 2020, notes: "", active: true },
    { id: 26, title: "Boris Frankenstein's Nightmare", display_title: "BORIS FRANKENSTEIN", album: "Beware The Dangers Of A Ghost Scorpion!", year: 2020, notes: "", active: false },
    { id: 27, title: "I'm Shy", display_title: "I'M SHY", album: "Beware The Dangers Of A Ghost Scorpion!", year: 2020, notes: "", active: false },
    { id: 28, title: "A Grim Wager", display_title: "GRIM WAGER", album: "Beware The Dangers Of A Ghost Scorpion!", year: 2020, notes: "", active: false },
    { id: 29, title: "Least Of All Monsters", display_title: "LEAST OF ALL MONSTERS", album: "Beware The Dangers Of A Ghost Scorpion!", year: 2020, notes: "", active: false },
    { id: 30, title: "Me And Him Are Gonna Beat You Up", display_title: "BEAT U UP", album: "Beware The Dangers Of A Ghost Scorpion!", year: 2020, notes: "", active: true },
    { id: 31, title: "Caught Dead", display_title: "CAUGHT DED", album: "Caught Dead EP", year: 2014, notes: "", active: true },
    { id: 32, title: "Safari Zone", display_title: "SAFARI ZONE", album: "Caught Dead EP", year: 2014, notes: "", active: true },
    { id: 33, title: "Texas Blood Money", display_title: "TEXAS BLOOD MONEY", album: "Caught Dead EP", year: 2014, notes: "", active: true },
    { id: 34, title: "Planet Slime", display_title: "PLANET SLIME", album: "Caught Dead EP", year: 2014, notes: "", active: true },
    { id: 35, title: "Terrifying Master", display_title: "TERRIFYING MASTER", album: "Boss Metal Zone EP", year: 2015, notes: "", active: false },
    { id: 36, title: "Straight To Darkness", display_title: "2 DARKNESS", album: "Boss Metal Zone EP", year: 2015, notes: "", active: true },
    { id: 37, title: "As Hot As Hell", display_title: "AS HOT AS HELL", album: "Boss Metal Zone EP", year: 2015, notes: "", active: false },
    { id: 38, title: "Full Of Blood", display_title: "FULL O BLOOD", album: "Boss Metal Zone EP", year: 2015, notes: "", active: true },
    { id: 39, title: "Cateye Glasses", display_title: "CATEYE GLASSES", album: "Blood Drinkers Only", year: 2013, notes: "", active: false },
    { id: 40, title: "The Lover's Curse", display_title: "LOVER'S CURSE", album: "Blood Drinkers Only", year: 2013, notes: "", active: false },
    { id: 41, title: "The Nameless One", display_title: "NAMELESS 1", album: "Blood Drinkers Only", year: 2013, notes: "", active: true },
    { id: 42, title: "Satan's Invisible World...Revealed!", display_title: "SATAN'S INVISIBLE WORLD", album: "Blood Drinkers Only", year: 2013, notes: "", active: true },
    { id: 43, title: "Haintmaker", display_title: "HAINTMAKER", album: "Blood Drinkers Only", year: 2013, notes: "", active: true },
    { id: 44, title: "Room 505", display_title: "ROOM 505", album: "Blood Drinkers Only", year: 2013, notes: "", active: true },
    { id: 45, title: "Blood Drinkers Only", display_title: "BLOOD DRINKERS ONLY", album: "Blood Drinkers Only", year: 2013, notes: "", active: false },
    { id: 46, title: "Christopher's Galaxy", display_title: "CHRIS'S GALAXY", album: "Blood Drinkers Only", year: 2013, notes: "", active: true },
    { id: 47, title: "Haunted Highway", display_title: "HAUNTED HIGHWAY", album: "Blood Drinkers Only", year: 2013, notes: "", active: true },
    { id: 48, title: "Black Crescent", display_title: "BLACK CRESCENT", album: "Blood Drinkers Only", year: 2013, notes: "", active: false },
    { id: 49, title: "13 Stabs", display_title: "13 STABS", album: "Blood Drinkers Only", year: 2013, notes: "", active: false },
    { id: 50, title: "Red River Tombstone Hustle", display_title: "RED RIVER", album: "5 After Midnight", year: 2011, notes: "", active: true },
    { id: 51, title: "The Lurker", display_title: "LURKER", album: "5 After Midnight", year: 2011, notes: "", active: false },
    { id: 52, title: "North Texas Cobra Squadron Theme", display_title: "N TX", album: "5 After Midnight", year: 2011, notes: "", active: true },
    { id: 53, title: "Unforgettable Skull Deformation", display_title: "UNFORGETTABLE SKULL DEFORMATION", album: "5 After Midnight", year: 2011, notes: "", active: false },
    { id: 54, title: "Denton County Casket Company", display_title: "DENTON COUNTY CASKET CO", album: "5 After Midnight", year: 2011, notes: "", active: false },
    { id: 55, title: "We Welcome the Living (But Only If They Come Here to Die)", display_title: "WE WELCOME", album: "The Legend Of Goatman's Bridge", year: 2011, notes: "", active: true },
    { id: 56, title: "They Won't Stay Dead!", display_title: "THEY WONT STAY DEAD", album: "The Legend Of Goatman's Bridge", year: 2011, notes: "", active: false },
    { id: 57, title: "Heads Will Roll!", display_title: "HEADS WILL ROLL", album: "The Legend Of Goatman's Bridge", year: 2011, notes: "", active: true },
    { id: 58, title: "Goatman's Bridge", display_title: "GOATMAN'S BRIDGE", album: "The Legend Of Goatman's Bridge", year: 2011, notes: "", active: false },
    { id: 59, title: "Zombie Dance Party", display_title: "ZOMBIE DANCE PARTY", album: "unreleased", year: null, notes: "", active: true }
  ];

  const MOCK_SETLISTS = [
    { id: "sl1", date: "2025-05-17", venue: "Cantab Lounge Cambridge, MA", mode: "short", song_ids: [1, 2, 34, 4, 5, 36, 38, 52, 41, 43], divider_positions: [4], show_date: true, show_venue: false, logo_variant: "black", notes: "", created_at: "2025-05-17T20:00:00Z" },
    { id: "sl2", date: "2025-08-15", venue: "VC Tour", mode: "medium", song_ids: [21, 22, 44, 47, 55, 31, 32, 59], divider_positions: [3, 6], show_date: true, show_venue: true, logo_variant: "black", notes: "", created_at: "2025-08-01T12:00:00Z" },
    { id: "sl3", date: "2024-09-12", venue: "Asheville", mode: "long", song_ids: [8, 7, 44, 47, 55, 31, 32, 59, 50, 57], divider_positions: [2, 5, 8], show_date: true, show_venue: true, logo_variant: "white", notes: "Mini tour", created_at: "2024-09-01T10:00:00Z" }
  ];

  function getBasePath() {
    return CONFIG.BASE_PATH || '';
  }

  async function fetchSongs() {
    let songs;
    if (CONFIG.USE_MOCK) {
      songs = [...MOCK_SONGS];
    } else {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SONGS_SHEET_ID}/values/${CONFIG.SONGS_RANGE}?key=${CONFIG.API_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch songs');
      const json = await res.json();
      const rows = json.values || [];
      songs = rows.map((row) => ({
        id: parseInt(row[0], 10),
        title: row[1] || '',
        display_title: row[2] || row[1] || '',
        album: row[3] || '',
        year: row[4] ? parseInt(row[4], 10) : null,
        notes: row[5] || '',
        active: String(row[6]).toUpperCase() === 'TRUE'
      }));
    }
    const overrides = typeof DISPLAY_TITLE_OVERRIDES !== 'undefined' ? DISPLAY_TITLE_OVERRIDES.load() : {};
    return songs.map(s => ({
      ...s,
      display_title: overrides[s.id] ?? s.display_title
    }));
  }

  async function fetchSetlists() {
    if (CONFIG.USE_MOCK) {
      return Promise.resolve(MOCK_SETLISTS);
    }
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SETLISTS_SHEET_ID}/values/${CONFIG.SETLISTS_RANGE}?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch setlists');
    const json = await res.json();
    const rows = json.values || [];
    return rows.map(row => ({
      id: row[0],
      date: row[1],
      venue: row[2] || '',
      mode: row[3] || 'medium',
      song_ids: (row[4] || '').split('|').map(s => parseInt(s.trim(), 10)).filter(Boolean),
      divider_positions: (row[5] || '').split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)),
      show_date: String(row[6]).toUpperCase() !== 'FALSE',
      show_venue: String(row[7]).toUpperCase() === 'TRUE',
      logo_variant: row[8] || 'black',
      notes: row[9] || '',
      created_at: row[10] || ''
    }));
  }

  function getSongById(songs, id) {
    return songs.find(s => s.id === id);
  }

  function getSetlistById(setlists, id) {
    return setlists.find(s => s.id === id);
  }

  async function saveSetlist(setlist, token) {
    if (!CONFIG.APPS_SCRIPT_URL || !token) throw new Error('Save requires auth');
    const payload = {
      action: 'saveSetlist',
      token,
      setlist: {
        id: setlist.id,
        date: setlist.date,
        venue: setlist.venue || '',
        mode: setlist.mode || 'medium',
        song_ids: setlist.song_ids,
        divider_positions: setlist.divider_positions || [],
        show_date: setlist.show_date !== false,
        show_venue: setlist.show_venue === true,
        logo_variant: setlist.logo_variant || 'black',
        notes: setlist.notes || ''
      }
    };
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Save failed');
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (e) {
      return { id: setlist.id };
    }
  }

  async function saveCatalogDisplayTitle(songId, displayTitle, token) {
    if (!CONFIG.APPS_SCRIPT_URL || !token) throw new Error('Save requires auth');
    const payload = {
      action: 'saveCatalogDisplayTitle',
      token,
      songId,
      displayTitle: displayTitle || null
    };
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Save failed');
    return {};
  }

  async function saveNewSong(song, token) {
    if (!CONFIG.APPS_SCRIPT_URL || !token) throw new Error('Save requires auth');
    const payload = {
      action: 'saveNewSong',
      token,
      song: {
        title: song.title || '',
        display_title: song.display_title || song.title || '',
        album: song.album || '',
        year: song.year != null ? song.year : null,
        notes: song.notes || '',
        active: song.active !== false
      }
    };
    const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Save failed');
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (e) {
      return {};
    }
  }

  return {
    fetchSongs,
    fetchSetlists,
    getSongById,
    getSetlistById,
    saveSetlist,
    saveCatalogDisplayTitle,
    saveNewSong,
    MOCK_SONGS,
    MOCK_SETLISTS
  };
})();
