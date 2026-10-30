// Status icons: one picture per buff or debuff, the same above the hotbar and in the party list. Each wears its painting
// (icons/status/<id>.png, briefs in docs/art/status-icons.md) once that file exists, and its drawn line glyph until then.
// The glyphs are 12x12 SVGs drawn in the icon's text colour.

const stSvg = d => `<svg viewBox="0 0 12 12" aria-hidden="true">${d}</svg>`;
const STATUS_GLYPH = {
  shield: stSvg('<path d="M6 1 10.5 2.6V6c0 2.6-2 4.2-4.5 5C3.5 10.2 1.5 8.6 1.5 6V2.6Z" fill="none" stroke="currentColor" stroke-width="1.4"/>'),
  down: stSvg('<path d="M6 1.5v8M2.5 6 6 9.5 9.5 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  vuln: stSvg('<path d="M6 1 10.5 2.6V6c0 2.6-2 4.2-4.5 5C3.5 10.2 1.5 8.6 1.5 6V2.6Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6.6 2.5 5 5.6l2 .8-1.4 3" fill="none" stroke="currentColor" stroke-width="1.3"/>'),
  weak: stSvg('<circle cx="6" cy="6" r="4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 1.6"/>'),
  tenderized: stSvg('<path d="M1.5 3.5h6.5v4.5H1.5Z M8 4.5h2.5v2.5H8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><circle cx="3.6" cy="5.7" r=".9" fill="currentColor"/>'),
  stuffed: stSvg('<ellipse cx="6" cy="7.5" rx="4.6" ry="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M3.5 6.6a2.5 2.5 0 0 1 5 0" fill="none" stroke="currentColor" stroke-width="1.3"/>'),
  slowed: stSvg('<path d="M6 1v10M1 6h10M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width=".9"/><circle cx="6" cy="6" r="2.4" fill="none" stroke="currentColor" stroke-width=".9"/><circle cx="6" cy="6" r="4.3" fill="none" stroke="currentColor" stroke-width=".9"/>'),
  rooted: stSvg('<path d="M2 3c2.5 1.2 5.5-1.2 8 0M2 6c2.5 1.2 5.5-1.2 8 0M2 9c2.5 1.2 5.5-1.2 8 0" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'),
  conductive: stSvg('<path d="M7 1 3 6.5h3L5 11l4-5.5H6Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'),
  doom: stSvg('<path d="M6 1.5c-2.3 0-4 1.6-4 3.8 0 1.3.6 2.2 1.5 2.8V10h5V8.1c.9-.6 1.5-1.5 1.5-2.8 0-2.2-1.7-3.8-4-3.8Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="4.4" cy="5.5" r="1" fill="currentColor"/><circle cx="7.6" cy="5.5" r="1" fill="currentColor"/>'),
  dread: stSvg('<path d="M1 6c1.6-2.6 3.2-3.6 5-3.6S9.4 3.4 11 6c-1.6 2.6-3.2 3.6-5 3.6S2.6 8.6 1 6Z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M3 9 9 3" stroke="currentColor" stroke-width="1.2"/>'),
  bleed: stSvg('<path d="M6 1.5C4.5 4 3 5.6 3 7.4a3 3 0 0 0 6 0C9 5.6 7.5 4 6 1.5Z" fill="none" stroke="currentColor" stroke-width="1.3"/>'),
  frostbite: stSvg('<path d="M6 1v10M1.6 3.5l8.8 5M10.4 3.5l-8.8 5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="6" cy="6" r="1.4" fill="currentColor"/>'),
  gripped: stSvg('<path d="M2 5.5V3m2.5 2.5V2m2.5 3.5V2m2.5 3.5V3M2 5.5c0 3 1.6 5 4 5s3.5-2 3.5-5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'),
  static: stSvg('<path d="M7 1 3 6.5h3L5 11l4-5.5H6Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M1.5 3.5h1.5M9 8.5h1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'),
  laden: stSvg('<path d="M6 1.3C3.9 1.3 2.4 4.3 2.4 6.9a3.6 3.6 0 0 0 7.2 0C9.6 4.3 8.1 1.3 6 1.3Z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="5" cy="7.3" r=".9" fill="currentColor"/><circle cx="7.2" cy="5.6" r=".7" fill="currentColor"/>'),
  pardoned: stSvg('<path d="M2.5 1.5h6v4l-1.2.8 1.2.8v3.4h-6v-3.4l1.2-.8-1.2-.8Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M4 3.6h3" stroke="currentColor" stroke-width="1.1"/>'),
  brittle: stSvg('<path d="M6 1 10.4 6 6 11 1.6 6Z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 1.4 5 4.6l1.8 1.2-1.4 4.4" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>'),   // (Hard+)
  cracked: stSvg('<path d="M6 1 10.5 2.6V6c0 2.6-2 4.2-4.5 5C3.5 10.2 1.5 8.6 1.5 6V2.6Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6 1.4 5 4.2l2 1.6-1.6 2.4.6 2.6" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/>'),
  svbrand: stSvg('<path d="M3 10 9 2.5M7 2h2.5V4.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 7.8c.3 1.4 1.4 2.4 2.8 2.2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'),
  aggro: stSvg('<path d="M1 6c1.6-2.6 3.2-3.6 5-3.6S9.4 3.4 11 6c-1.6 2.6-3.2 3.6-5 3.6S2.6 8.6 1 6Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="6" cy="6" r="1.7" fill="currentColor"/>'),
  // party buffs, gear bonds and item effects
  'p-dmg': stSvg('<path d="M10.5 1.5 9.8 4 4.6 9.2 2.8 7.4 8 2.2ZM2.8 7.4 1.5 10.5l3.1-1.3" fill="currentColor"/>'),
  'p-crit': stSvg('<path d="M6 1.2 7.4 4.6 11 6 7.4 7.4 6 10.8 4.6 7.4 1 6 4.6 4.6Z" fill="currentColor"/>'),
  'p-haste': stSvg('<path d="M2 2.5 5.5 6 2 9.5M6 2.5 9.5 6 6 9.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'),
  bond: stSvg('<circle cx="4.3" cy="6" r="2.8" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="7.7" cy="6" r="2.8" fill="none" stroke="currentColor" stroke-width="1.3"/>'),
  fx: stSvg('<path d="M6 1.2 10 4.6 6 10.8 2 4.6Z M2 4.6h8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'),
  // on the boss: a Time Stop (an hourglass), hitting harder, and the enrage
  hourglass: stSvg('<path d="M2.5 1.2h7M2.5 10.8h7M3.3 1.2c0 2.6 2.7 3.4 2.7 4.8S3.3 8.2 3.3 10.8M8.7 1.2c0 2.6-2.7 3.4-2.7 4.8s2.7 2.2 2.7 4.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'),
  fury: stSvg('<path d="M6 1.2 7.4 4.6 11 6 7.4 7.4 6 10.8 4.6 7.4 1 6 4.6 4.6Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M6 4.4v3.2" stroke="currentColor" stroke-width="1.2"/>'),
  enrage: stSvg('<path d="M6 1c.4 2-1.8 3-1.8 5a1.8 1.8 0 0 0 3.6 0c0-.8-.4-1.4-.4-1.4S9.5 5.5 9.5 7.8A3.5 3.5 0 0 1 2.5 7.8C2.5 4.4 6 3.6 6 1Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>'),
};
// a few statuses go by another id than their glyph's
STATUS_GLYPH.dd = STATUS_GLYPH.down;
STATUS_GLYPH.mit = STATUS_GLYPH.shield;
STATUS_GLYPH['p-rhaste'] = STATUS_GLYPH['p-haste'];

// the debuffs a fight puts on a hero (fight.js debuff()): name and what it does, for both tooltips
const STATUS_INFO = {
  laden: ['Egg-Laden', 'When it runs out, a venom pool drops where you stand.'],
  pardoned: ['Pardoned', 'Your writ is torn up; your line does nothing.'],
  tenderized: ['Tenderized', 'The next cleaver blow hits much harder.'],
  stuffed: ['Stuffed', 'You can\'t eat another plate.'],
  slowed: ['Slowed', 'Stuck in silk or venom.'],
  rooted: ['Rooted', 'You can\'t move.'],
  conductive: ['Conductive', 'The next strike you catch hurts far more.'],
  doom: ['Royal Doom', 'When this runs out, so do you.'],
  dread: ['Dread', 'You met his eyes. Meeting them again hurts far more.'],
  bleed: ['Bleeding', 'Losing health over time.'],
  static: ['Static', 'The storm is building on you, a jolt every 1.5s.'],
  frostbite: ['Frostbitten', 'Slowed by the cold, and when it runs out you are frozen solid.'],
  gripped: ['Gripped', 'Held fast in a fist of ice.'],
  svbrand: ['Branded', 'A blade burns in you. A Brand that lands inside the burn hits much harder.'],
  brittle: ['Brittle', 'A hit you could have avoided left you brittle: you take 10% more damage per stack, up to three, and every new hit refreshes it.'],
  cracked: ['Cracked Guard', 'Your guard is broken open: the next heavy blow lands harder.'],
};

// heals over time wear their ability's icon: [class, ability, name]
const HOT_ICON = { petal: ['cleric', 'petal', 'Dawn Petal'], prayer: ['cleric', 'prayer', 'Prayer Circle'], rejuv: ['grovekeeper', 'rejuv', 'Rejuvenate'], growth: ['grovekeeper', 'growth', 'Wild Growth'] };

// The icon's inside: the glyph, with the painting laid over it while it may exist (asked once per file: ArtProbe).
function statusIcon(id) {
  const g = STATUS_GLYPH[id] || '';
  const path = `icons/status/${id}.png`;
  const ok = typeof ArtProbe === 'undefined' ? null : ArtProbe.ok(path);
  return ok === false ? g : `${g}<img class="st-art" src="${path}" alt="" onerror="this.remove()">`;
}
