/**
 * BTDOAGS Set List — PDF generation (jsPDF + html2canvas)
 */

const PDF = (function() {
  function computePrintLayout(songCount) {
    const pageHeightPt = 792;
    const topMargin = 54;
    const bottomMargin = 54;
    const headerBlock = 90;
    const footerBlock = 30;
    const available = pageHeightPt - topMargin - bottomMargin - headerBlock - footerBlock;
    const lineHeightRatio = 1.3;
    const maxFontPt = 28;
    const minFontPt = 11;

    function fontForColumns(cols) {
      const rowsPerCol = Math.ceil(songCount / cols);
      return (available / rowsPerCol) / lineHeightRatio;
    }

    const columns = songCount <= 20 ? 2 : 1;
    let fontSize = fontForColumns(columns);
    fontSize = Math.max(minFontPt, Math.min(fontSize, maxFontPt));
    return { columns, fontSize };
  }

  async function download(setlist) {
    const basePath = CONFIG.BASE_PATH || '';
    const logoPath = basePath + '/assets/scorpion-' + (setlist.logo_variant || 'black') + '.png';

    const songMap = Object.fromEntries((setlist.songs || []).map(s => [s.id, s]));
    const displayItems = [];
    (setlist.song_ids || []).forEach((id, idx) => {
      const song = songMap[id];
      displayItems.push({ display_title: song?.display_title || '?', divider: false });
      if ((setlist.divider_positions || []).includes(idx)) {
        displayItems.push({ divider: true });
      }
    });
    const { columns, fontSize } = computePrintLayout(displayItems.filter(i => !i.divider).length);

    const dateStr = setlist.show_date && setlist.date
      ? new Date(setlist.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
      : '';
    const venueStr = setlist.show_venue && setlist.venue ? setlist.venue : '';

    const target = document.getElementById('print-target');
    if (!target) return;

    const leftCol = [];
    const rightCol = [];
    const mid = Math.ceil(displayItems.length / 2);
    if (columns === 2) {
      leftCol.push(...displayItems.slice(0, mid));
      rightCol.push(...displayItems.slice(mid));
    }

    const colHtml = columns === 2
      ? `
        <div style="display:flex;flex-direction:column;gap:0;">
          ${leftCol.map(i => i.divider ? `<div style="font-size:${fontSize}pt;line-height:1.3;">—</div>` : `<div style="font-size:${fontSize}pt;line-height:1.3;">${i.display_title}</div>`).join('')}
        </div>
        <div style="display:flex;flex-direction:column;gap:0;">
          ${rightCol.map(i => i.divider ? `<div style="font-size:${fontSize}pt;line-height:1.3;">—</div>` : `<div style="font-size:${fontSize}pt;line-height:1.3;">${i.display_title}</div>`).join('')}
        </div>
      `
      : displayItems.map(i => i.divider
        ? `<div style="font-size:${fontSize}pt;line-height:1.3;text-align:center;">—</div>`
        : `<div style="font-size:${fontSize}pt;line-height:1.3;text-align:center;">${i.display_title}</div>`
      ).join('');

    target.innerHTML = `
      <div style="text-align:center;margin-bottom:1rem;">
        <img src="${logoPath}" alt="" style="height:72px;max-width:100%;" onerror="this.style.display='none'">
      </div>
      ${dateStr ? `<div style="text-align:center;font-size:18pt;margin-bottom:1rem;">${dateStr}</div>` : ''}
      ${venueStr ? `<div style="text-align:center;font-size:14pt;margin-bottom:1rem;">${venueStr}</div>` : ''}
      <div style="display:grid;grid-template-columns:${columns === 2 ? '1fr 1fr' : '1fr'};gap:2rem;margin:1rem 0;">
        ${colHtml}
      </div>
      <div style="text-align:center;font-size:10pt;margin-top:2rem;color:#333;">
        BEWARE THE DANGERS OF A GHOST SCORPION!<br>HTTP://HORROR.SURF
      </div>
    `;

    try {
      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'pt', format: 'letter', orientation: 'portrait' });
      const pdfW = 612;
      const pdfH = 792;
      const imgW = canvas.width;
      const imgH = canvas.height;
      const ratio = Math.min(pdfW / imgW, pdfH / imgH);
      pdf.addImage(imgData, 'PNG', 0, 0, imgW * ratio, imgH * ratio);

      const venueSlug = (setlist.venue || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'setlist';
      const datePart = setlist.date ? setlist.date.replace(/-/g, '') : '00000000';
      pdf.save(`BTDOAGS_${datePart}_${venueSlug}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('PDF generation failed. Check console for details.');
    }
  }

  return { download, computePrintLayout };
})();
