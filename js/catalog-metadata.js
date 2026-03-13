/**
 * Catalog metadata model — DDEX/DSP-aligned field definitions
 * Maps to ERN, MEAD, PIE concepts for distribution-ready metadata
 */

const CATALOG_METADATA = (function() {
  const SIMPLE_FIELDS = [
    { key: 'title', label: 'Title', ddex: 'Title', section: 'basic', required: true, helper: 'Main track title as shown on DSPs' },
    { key: 'title_version', label: 'Version', ddex: 'TitleVersion', section: 'basic', helper: 'e.g. Radio Edit, Acoustic' },
    { key: 'primary_artist', label: 'Primary Artist', ddex: 'DisplayArtist', section: 'basic', required: true, helper: 'Main performing artist' },
    { key: 'album', label: 'Album', ddex: 'ReleaseTitle', section: 'basic', helper: 'Album or release name' },
    { key: 'track_number', label: 'Track #', ddex: 'SequenceNumber', section: 'basic', type: 'number' },
    { key: 'disc_number', label: 'Disc #', ddex: 'VolumeNumber', section: 'basic', type: 'number' },
    { key: 'genre', label: 'Genre', ddex: 'Genre', section: 'basic' },
    { key: 'release_date', label: 'Release Date', ddex: 'ReleaseDate', section: 'basic', type: 'date' },
    { key: 'year', label: 'Year', ddex: null, section: 'basic', type: 'number' },
    { key: 'language', label: 'Language', ddex: 'LanguageOfPerformance', section: 'basic' },
    { key: 'explicit', label: 'Explicit', ddex: 'ParentalWarningType', section: 'basic', type: 'boolean' },
    { key: 'duration_sec', label: 'Duration (sec)', ddex: null, section: 'basic', type: 'number', helper: 'Track length in seconds (from Bandcamp)' },
    { key: 'artwork', label: 'Artwork', ddex: 'CoverArt', section: 'artwork', helper: 'Album art URL (from Bandcamp)' },
    { key: 'display_title', label: 'Display Title', ddex: null, section: 'basic', helper: 'Set list display (e.g. shortened)' }
  ];

  const ADVANCED_FIELDS = [
    { key: 'song_type', label: 'Song Type', ddex: null, section: 'basic', advanced: true, type: 'select', options: ['rocker', 'ripper', 'new', 'bring_it_down', 'neutral'], helper: 'Energy/vibe for set pacing' },
    { key: 'isrc', label: 'ISRC', ddex: 'ISRC', section: 'ids', advanced: true, helper: 'Recording ID (12 chars)' },
    { key: 'iswc', label: 'ISWC', ddex: 'ISWC', section: 'ids', advanced: true, helper: 'Work ID (composition)' },
    { key: 'upc', label: 'UPC/GTIN', ddex: 'ProprietaryId', section: 'ids', advanced: true, helper: 'Release barcode' },
    { key: 'catalog_id', label: 'Catalog ID', ddex: null, section: 'ids', advanced: true, helper: 'Internal reference' },
    { key: 'writers', label: 'Writers', ddex: 'PIE', section: 'credits', advanced: true, type: 'party-list' },
    { key: 'composers', label: 'Composers', ddex: 'PIE', section: 'credits', advanced: true, type: 'party-list' },
    { key: 'producers', label: 'Producers', ddex: 'PIE', section: 'credits', advanced: true, type: 'party-list' },
    { key: 'publishers', label: 'Publishers', ddex: 'PIE', section: 'credits', advanced: true, type: 'party-list' },
    { key: 'p_line', label: 'P-Line', ddex: 'PLine', section: 'rights', advanced: true, helper: 'Phonogram copyright' },
    { key: 'c_line', label: 'C-Line', ddex: 'CLine', section: 'rights', advanced: true, helper: 'Composition copyright' },
    { key: 'territories', label: 'Territories', ddex: 'TerritoryCode', section: 'rights', advanced: true },
    { key: 'release_status', label: 'Release Status', ddex: 'ReleaseStatus', section: 'rights', advanced: true, type: 'select', options: ['draft', 'delivered', 'live'] }
  ];

  const ALL_FIELDS = [...SIMPLE_FIELDS, ...ADVANCED_FIELDS];

  const COLUMN_PRESETS = {
    simple: {
      id: 'simple',
      label: 'Simple',
      columns: ['display_title', 'title', 'primary_artist', 'album', 'duration_sec', 'release_date']
    },
    basic: {
      id: 'basic',
      label: 'Basic',
      columns: ['display_title', 'title', 'primary_artist', 'album', 'disc_number', 'duration_sec', 'genre', 'release_date', 'song_type']
    },
    dsp: {
      id: 'dsp',
      label: 'DSP Ready',
      columns: ['display_title', 'title', 'primary_artist', 'album', 'isrc', 'release_date', 'release_status']
    },
    full: {
      id: 'full',
      label: 'Full',
      columns: ['display_title', 'title', 'primary_artist', 'album', 'disc_number', 'duration_sec', 'isrc', 'iswc', 'genre', 'release_date', 'release_status', 'song_type']
    }
  };

  const FILTER_PRESETS = [
    { id: 'missing-required', label: 'Missing required metadata', fn: s => !s.title || !s.primary_artist },
    { id: 'missing-isrc', label: 'Missing ISRC', fn: s => !s.isrc },
    { id: 'no-artwork', label: 'No artwork', fn: s => !s.artwork },
    { id: 'explicit-not-set', label: 'Explicit not set', fn: s => s.explicit == null },
    { id: 'draft', label: 'Draft', fn: s => s.release_status === 'draft' },
    { id: 'inactive', label: 'Inactive', fn: s => !s.active }
  ];

  const DRAWER_TABS = [
    { id: 'summary', label: 'Summary', icon: '◎' },
    { id: 'basic', label: 'Info', icon: 'ℹ' },
    { id: 'credits', label: 'Credits', icon: '©' },
    { id: 'ids', label: 'IDs', icon: '#' },
    { id: 'rights', label: 'Rights', icon: '®' },
    { id: 'advanced', label: 'Advanced', icon: '⋯' }
  ];

  function getField(key) {
    return ALL_FIELDS.find(f => f.key === key);
  }

  function getFieldsForSection(section, advanced) {
    return ALL_FIELDS.filter(f => f.section === section && (!f.advanced || advanced));
  }

  function getColumnsForPreset(presetId) {
    return COLUMN_PRESETS[presetId]?.columns || COLUMN_PRESETS.simple.columns;
  }

  function getTriState(values) {
    const uniq = [...new Set(values.map(v => v == null ? 'blank' : String(v)))];
    if (uniq.length === 0) return 'blank';
    if (uniq.length === 1 && uniq[0] === 'blank') return 'blank';
    if (uniq.length === 1) return 'single';
    return 'mixed';
  }

  return {
    SIMPLE_FIELDS,
    ADVANCED_FIELDS,
    ALL_FIELDS,
    COLUMN_PRESETS,
    FILTER_PRESETS,
    DRAWER_TABS,
    getField,
    getFieldsForSection,
    getColumnsForPreset,
    getTriState
  };
})();
