// One icon family: 24px grid, 1.5px stroke, round caps, currentColor.
const P = {
  ingredients: '<path d="M12 21V8"/><path d="M12 8c-2.2-.6-3.4-2.4-3.4-4.6 2.1.2 3.4 1.8 3.4 3.8"/><path d="M12 8c2.2-.6 3.4-2.4 3.4-4.6-2.1.2-3.4 1.8-3.4 3.8"/><path d="M12 13c-2.6-.4-4.2-2.3-4.4-4.6 2.3.1 3.9 1.7 4.4 3.8"/><path d="M12 13c2.6-.4 4.2-2.3 4.4-4.6-2.3.1-3.9 1.7-4.4 3.8"/><path d="M12 17.6c-2.6-.4-4.2-2.3-4.4-4.6 2.3.1 3.9 1.7 4.4 3.8"/><path d="M12 17.6c2.6-.4 4.2-2.3 4.4-4.6-2.3.1-3.9 1.7-4.4 3.8"/>',
  ratios: '<path d="M12 4v16"/><path d="M8 20h8"/><path d="M5 7.5h14"/><path d="M5 7.5 2.5 13h5L5 7.5z"/><path d="M19 7.5 16.5 13h5L19 7.5z"/><circle cx="12" cy="4" r="1"/>',
  fermentation: '<path d="M3 12h18c0 4.4-4 7.5-9 7.5S3 16.4 3 12z"/><path d="M6 19.5h12"/><circle cx="9" cy="7.5" r="1.4"/><circle cx="13.5" cy="4.8" r="1"/><circle cx="15" cy="8.6" r="1.6"/>',
  drying: '<circle cx="12" cy="10" r="3.6"/><path d="M12 2.5v1.8M12 15.7v1.8M4.5 10h1.8M17.7 10h1.8M6.7 4.7l1.3 1.3M16 14l1.3 1.3M6.7 15.3 8 14M16 6l1.3-1.3"/><path d="M2.5 21h19"/><path d="M5 21l2-2.5h10l2 2.5"/>',
  milling: '<circle cx="12" cy="13" r="7.5"/><circle cx="12" cy="13" r="2.2"/><path d="M12 5.5v-2"/><path d="M16.5 7.2l2.6-3"/><path d="M8.3 10.2l1.7 1.3M15.7 15.8l-1.7-1.3"/>',
  packaging: '<path d="M5.5 8.5h13l-1.2 12h-10.6z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/><path d="M9.5 13.5h5"/>',
  storage: '<path d="M8 3.5h8"/><path d="M8.5 3.5v2.3L7 7.6V19a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 17 19V7.6l-1.5-1.8V3.5"/><path d="M7 11.5h10"/><path d="M7 15.5h10"/>',
  community: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c0-3.2 2.5-5.6 5.5-5.6s5.5 2.4 5.5 5.6"/><circle cx="17" cy="9" r="2.4"/><path d="M16.2 14.3c2.6.2 4.3 2.4 4.3 5.2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  back: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5z"/>',
  photo: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M8.5 6 10 4h4l1.5 2"/><circle cx="12" cy="12.5" r="3.4"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10.5 5-3v9l-5-3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  consent: '<path d="M12 21s-7-4.3-7-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7 2.8C19 16.7 12 21 12 21z"/>',
  mask: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20.5c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"/><path d="M4 4l16 16"/>',
  backup: '<path d="M4 12a8 8 0 0 1 14-5.3"/><path d="M18.5 3v4h-4"/><path d="M20 12a8 8 0 0 1-14 5.3"/><path d="M5.5 21v-4h4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  flask: '<path d="M9.5 3.5h5"/><path d="M10.5 3.5v6L5 19a1.3 1.3 0 0 0 1.1 2h11.8A1.3 1.3 0 0 0 19 19l-5.5-9.5v-6"/><path d="M7.5 15h9"/>',
};

export function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
}

// Brand mark: a clay bowl seen from the side, with bulgur grains.
export const brandMark = `<svg class="brand__mark" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
  <circle cx="20" cy="20" r="19" fill="var(--accent)"/>
  <path d="M8.5 19h23c0 6.2-5.1 10.5-11.5 10.5S8.5 25.2 8.5 19z" fill="none" stroke="var(--surface)" stroke-width="2" stroke-linejoin="round"/>
  <path d="M13 29.5h14" stroke="var(--surface)" stroke-width="2" stroke-linecap="round"/>
  <ellipse cx="15.5" cy="14.5" rx="1.6" ry="2.4" transform="rotate(-25 15.5 14.5)" fill="var(--surface)"/>
  <ellipse cx="21" cy="11.5" rx="1.6" ry="2.4" transform="rotate(15 21 11.5)" fill="var(--surface)"/>
  <ellipse cx="25.5" cy="15.5" rx="1.6" ry="2.4" transform="rotate(40 25.5 15.5)" fill="var(--surface)"/>
</svg>`;

// Line art for the two focus regions (decorative).
export const regionArt = {
  chouf: `<svg class="region-card__art" viewBox="0 0 180 90" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
    <path d="M0 80 L40 46 L62 58 L98 22 L132 50 L150 40 L180 62"/>
    <path d="M30 80 h40 M42 70 h34 M54 60 h30 M70 50 h26 M86 40 h18 M110 52 h22 M118 62 h30"/>
  </svg>`,
  west_bekaa: `<svg class="region-card__art" viewBox="0 0 180 90" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
    <path d="M0 40 C30 30 50 34 70 38 S120 30 180 36"/>
    <path d="M0 56 C60 52 120 52 180 56 M0 66 C60 62 120 62 180 66 M0 76 C60 72 120 72 180 76 M0 86 C60 82 120 82 180 86"/>
  </svg>`,
};
