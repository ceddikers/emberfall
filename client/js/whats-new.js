// What's new: the changelog, opened from the join card. Newest update first; a gold dot on the link until it's read.
const WhatsNew = (() => {
  const LOG = [
    {
      id: '2026-10-25b', title: 'Every raid reworked, and status icons', date: 'October 25',
      groups: [
        ['Raids', [
          'All twelve bosses are reworked for fun on Normal and Hard: moves that combine into new problems, something to do for every role, stronger final acts, and new moves on several fights.',
          'Hard stays hard: fewer deaths you couldn\'t answer, more you could have. Tells that came too late show sooner, moves no longer pile up with no way out, and a few Hard fights hit harder to make up for it.',
          'Every fight is retuned, and Hard fights leave time before the enrage, so a wipe is a mistake rather than the clock.',
          'Grubnak\'s kitchen: danger is crimson with a dark rim, so it stands out on the orange tiles, and Flambé\'s stripes are much easier to see.',
        ]],
        ['Buffs and debuffs', [
          'Painted icons for every buff and debuff, the same above your hotbar and in the party list. Hover any of them for what it does.',
          'Everything on you now shows above your hotbar: boss debuffs, heals over time, Raise Sickness and damage reduction included.',
        ]],
        ['Class changes', [
          'Ranger: Piercing Arrow and Caustic Arrow are off the global cooldown (a little less damage per arrow). Explosive Shot grows 25% per hit and not from Caustic Arrow. Venomstrike\'s Long Hunt adds 2s.',
          'Marionettist: Red Curtain\'s cooldown is 35s (was 45s).',
        ]],
        ['Interface', [
          'Hero select shows how each spec changes the class: every changed move beside its base version, with the changed words marked.',
          'The hotbar only takes clicks where you can see it, so the ground just above and beside it is clickable again; its outline in the layout editor fits the bar.',
        ]],
        ['Bots', [
          'Bots no longer get stuck on the corner of a prop they\'re walking behind, so they reach cover in time.',
        ]],
      ],
    },
    {
      id: '2026-10-25', title: 'The Houndmaster, the Reaper reborn, and fairer deaths', date: 'October 25',
      groups: [
        ['New hero: the Houndmaster', [
          'A melee hunter with two hounds, the first player pets. Where they stand when you strike decides your finisher: one on each flank, one in front and one behind, or both at the boss\'s back.',
          'Pack Leader and Lone Wolf specs, talents, spec trials, a bot that plays him, his own look, sounds, loot, guide, journals and voice.',
          'Painted portraits for the hero and both specs, 12 painted ability icons and 9 painted items. His drawn model now matches the portraits, and Rust, Greyfang and Ash each have their own coat.',
          'First tuning from your feedback: a shorter Call Off cooldown, a faster Whistle, finishers from any range, and a bot that calls the hounds off the red sooner.',
        ]],
        ['The Reaper, rebuilt', [
          'A new kit: a Q string with W finishers that leave Drain, Bind, Death Mark and Thread marks, then Snap, Void Star, Dusk Veil, Blink and a five-swing Arcane Gate.',
          'Insane Reaper, the Ultimate, hastes the whole party and stacks.',
          'Dancer and Phantom specs, a new look, new effects, sounds, icons, portraits, journals and guide.',
        ]],
        ['Class changes', [
          'Lanternkeeper: the Beacon\'s Steady Glow works at once, Carry becomes Call the Beacon, Wayfarer step-lights land on the most hurt ally, Flare heals more and shields on a shorter cooldown, a stronger Flare Shield talent, and the bot spends spare Embers.',
          'Thermist, Zenith: Corona stacks, Sunset and Red Giant are new, and Flare and Lance crit at the edge again.',
          'Marionettist: Strung adds damage and attack speed for each string, the Doll jabs on its own, and the talents are reworked with new moves. Cutting Line gains Draw Tight: hold the line across with every String tied and Cross-Cut and Grand Finale cut harder.',
          'Driftblade, Orbit: every loop round your target ends in a Full Circle dive.',
          'Threadweaver: raidwides ring the web and heal both ends of every thread instead of piling onto the weaver.',
          'Ironpalm: Perfect Form replaces Clean Hands, and Rising Gate now guards you while the boss is airborne.',
          'Shadowblade, Nightstalker: no penalty from the front, Shadowstep dodges for a moment, and the bot stands behind the boss and steps out of blows.',
          'Kenseier: tighter deflect windows and a lighter Deathblow; the bot now deflects with human timing.',
          'Bloodreaver, Berserker: Rampage guards you, more so below half health, and Scar Tissue also guards the most hurt ally.',
        ]],
        ['Deaths and raises', [
          'Ask for a raise from the Down screen with H; healer bots answer.',
          'Raises take a moment to cast, and bot raises stay on their target.',
          'Raise Sickness: a raised hero deals and heals less for a while. A cast raise is light, an instant raise heavy, and each death this pull makes it worse; the Limit Break raise is free of it.',
          'A party death counter sits by the Limit gauge; its tooltip gives the next raise\'s cost.',
        ]],
        ['Bosses', [
          'The boss stays on a living tank and follows taunts alone: no boss threat and no threat meter. Adds still keep threat.',
          'Boss health no longer scales with party size.',
          'Damage Down now comes only from three themed avoidable moves per boss. Vulnerability still lands on every avoidable hit.',
          'Hollow King: Writ of Execution lanes lock before the hit and only turn red once locked, so stepping out dodges it.',
          'Balance: Volkar, Skitterra and Vhalgrath Hard are harder, Azerath Normal a little harder.',
          'The second set\'s bosses are restyled to the painted reference sheets on Normal and Hard: new effects, the same fights. Painted icons for every one of their moves and the 32 items they drop.',
        ]],
        ['Multiplayer', [
          'Mid-raid reconnect: a dropped player\'s slot is held for a minute with a stand-in bot, the tab rejoins on its own and picks up the fight where it is. Resync with the host from Options. Loot is re-sent once on rejoin and never paid twice.',
          'Drop in as your last hero: the game remembers your last class and spec on solo, host and join. Hero select only comes up the first time.',
          'Each party slot has its own colour on its ring, nameplate, ping, frame and minimap dot.',
        ]],
        ['Interface', [
          'Options is four tabs (Keys, Interface, Audio, Data) at one fixed size. Class keys show only for that class, and long notes moved into tooltips.',
          'Your own health bar is on by default.',
          'Spec tabs no longer resize the hero page.',
          'Painted icons for Cue, Strum, Shuttle and Sever.',
          'Every update now loads fresh files, so a deploy never mixes new code with cached old code.',
        ]],
      ],
    },
  ];
  const KEY = 'emberfall.whatsNewSeen';
  const latest = LOG[0].id;
  const seen = () => { try { return localStorage.getItem(KEY) === latest; } catch (e) { return true; } };
  const markSeen = () => { try { localStorage.setItem(KEY, latest); } catch (e) {} };
  const esc = s => s.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  let root = null, link = null;

  function build() {
    root = document.createElement('div');
    root.id = 'whats-new';
    root.className = 'hidden';
    root.innerHTML = `<div class="wn-card" role="dialog" aria-modal="true" aria-label="What's new">
      <button class="close" type="button" aria-label="Close" data-tip="Close (Esc)">×</button>
      <header><h2>What's new</h2></header>
      <div class="wn-body">${LOG.map(u => `<article>
        <div class="wn-date">${esc(u.date)}</div><h3>${esc(u.title)}</h3>
        ${u.groups.map(([h, items]) => `<h4>${esc(h)}</h4><ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`).join('')}
      </article>`).join('')}</div>
    </div>`;
    document.body.appendChild(root);
    root.querySelector('.close').addEventListener('click', close);
    root.addEventListener('mousedown', e => { if (e.target === root) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { e.preventDefault(); e.stopImmediatePropagation(); close(); } }, true);
  }
  function open() {
    if (!root) build();
    root.classList.remove('hidden');
    root.querySelector('.wn-body').scrollTop = 0;
    root.querySelector('.close').focus();   // (keyboard users land in the dialog, not behind it)
    markSeen();
    if (link) link.classList.remove('unread');
  }
  function close() { if (root) root.classList.add('hidden'); }
  function isOpen() { return !!root && !root.classList.contains('hidden'); }

  function init() {
    const solo = document.getElementById('solo-btn');
    if (!solo || link) return;
    link = document.createElement('button');
    link.type = 'button';
    link.id = 'whats-new-btn';
    link.className = 'linkish' + (seen() ? '' : ' unread');
    link.textContent = "What's new";
    link.addEventListener('click', open);
    solo.insertAdjacentElement('afterend', link);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }
  return { open, close, isOpen, LOG };
})();
