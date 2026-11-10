// Boss VII: Azerath, the Sunken Archmage, Master of the Seven Circles — "The Drowned Tower". The rotating lab.
// Second set (docs/plans/2026-10-set-2-bosses.md). The tower's floor is seven circles of old spellwork under the water: a middle
// one, a ring around it, a ring beyond that, and four sigils (Fire north, Frost east, Lightning south, the Void west). The
// question is always: which element is it, and who holds the rune? He floats in the middle of the floor and never walks.
//   THE RUNE PAIR: Rune Mark puts a rune on two heroes (two different elements; both shown on them, and a link joins them).
//     The spell that follows (named in the upcoming feed: Cinder / Rime / Storm / Rift Rune) is of one of the two elements, and the
//     element says whether the pair must stand together or apart. The Mark also lights the sigil of that element on the floor until
//     the spell lands, and the clients draw each rune by its rule (a closed ring for frost and lightning, a broken one for fire and void):
//       Cinder Rune (fire):      a ring of fire on each bearer. APART: if they stand close when it is about to land, the runes
//                                react, and a second circle of flame blooms between them (shown a moment ahead).
//       Rime Rune (frost):       one shared blow, a blue circle halfway between the two bearers, for everyone to stand in. TOGETHER.
//       Storm Rune (lightning):  a bolt runs from one bearer to the other and burns whoever stands in its line. TOGETHER makes it
//                                short enough to be harmless.
//       Rift Rune (void):        a ring of void round each bearer, a quiet middle in it. APART (the same reaction as fire).
//   Act I, Fire (100% → 78%): Arcane Burst, Arcane Lance (tankbuster), Pyre Rings (two of the three floor rings burn, one after
//     the other; the third is never painted), Cinder Rune.
//   Act II, Frost (78% → 55%): Ice Lances (lines out of him through some heroes; the moment they lock, a second volley is laid either side
//     of each and lands a beat after: the strip between is safe through both), Rime Rune (a lance through each bearer lands a beat before
//     the blue circle: dodge the line, then close in), Cinder Rune again.
//   The Binding (the seam, opens Act III): the sigils wake and he calls elementals from the middle of the floor. Each follows
//     the shield, slowly, and must be led into the sigil of its own element and held there a moment (a random element order,
//     one at a time; one left unbound blasts the room). He can be hit all the while, and the shield is walking the whole time.
//   Act III, Lightning (55% → 32%): Leaping Bolt (a bolt that jumps from hero to the hero nearest them), Storm Rune, Sigil Flare.
//   Act IV, Void (32% → 14%): Void Rifts (rifts open where heroes stand, and again where they went), Rift Rune, Sigil Flare, the
//     older moves returning mixed.
//   Sigil Flare: two neighbouring sigils light and blast together with the lens between them (Convergence on a small scale, so
//     the finale is a shape the party has met). Hard: the opposite pair follows a moment later, so the party crosses the middle.
//   Act V, Convergence (14% → dead): all four sigils light together; each circle's telegraph is its own element, and where two
//     circles overlap a reaction fills the lens between them. The floor between the sigils, out near the wall, is clear. Then the
//     sets, and the last Convergence when he falls under 6% (a course of its own, so a party that clears meets it), and the closing
//     passes until he falls or the tide comes in.
// The revamp (2026-11-10, docs/plans/2026-11-boss-revamp.md):
//   Each act opens under a named cast of its own (Circle of Fire, Frost, Lightning, the Void, The Seven Circles): the floor turns to the
//   element, and from then on the act's Arcane Burst and Arcane Lance carry a small rider of that element: fire a burn to heal through,
//   frost a short slow, lightning an arc to whoever stands within reach of the struck hero (a ring on each hero for a Burst, on the
//   shield for a Lance), the void a tug a step toward the middle (the finale takes the four in turn).
//   The Leaping Bolt prefers a rune bearer as its next jump (two heroes bear a bolt rune; the chain is set a moment before the first circle).
//   Void Rifts: once a pull, opening the void act. Hard draws each act's order of middle sets from the dance (f.danceRng): three fixed
//   timelines, told apart by the act's first middle set; Extreme and Normal are always dance 0.
//   Extreme (f.extreme) adds three of its own:
//     Spellweave:  three glyphs held before any spell: three heroes numbered 1 to 3 in the colour of their element, each spell falling on its hero
//                  in turn; a reversal glyph on the fourth hero, when there is one, turns the order round.
//     Runic Clock: two pairs of runes at once, a together pair and an apart pair, each pair's heroes wearing a sign whose ring burns down to
//                  their pair's spell: the two spells land at different moments, together first or apart first.
//     Cascading Convergence: the four sigils go off one after another, in the order they light; the last blow falls on the clear floor.
// Acts use PUSH: a party that reaches a gate early cuts the rest of the act and moves on (no wall in this fight).
// Every telegraph shows on the floor on every difficulty. Hard: casts 15% faster, 25% more damage, and:
//   Counterspell: the last spell's areas (at most three) come again, thrown to the far side of the room, a few seconds later.
//   Rune Swap:    after the Rune Mark, the runes jump to two other heroes (the spell has not changed; the new bearers get about six
//                 seconds from the jump to the lock). The Mark, the Swap, the spell and the Counterspell still run as one sequence; the
//                 Counterspell now waits a breath longer after the spell, and echoes at most three shapes.
//   Arcane Mark:  one hero's own elemental rises where they stood: a shared blow on that spot, for everyone.
// Hard also shuffles the order of each act's middle sets each pull, the last act's too (the opening and last sets stay; an order that
// puts two Lances or two Pyre Rings in neighbouring sets, or two Bursts too close, is thrown back), and adds a fifth jump to the Leaping Bolt. The Binding
// is the same on both: three Calls, five pulses.
// The Lance is not the tank's only job: the tank bears the runes that want the pair together (every other one at least), starts every
// other Leaping Bolt, and can be the hero an Arcane Mark rises beside.
//   Circle Brand (the tank's own, both difficulties): the Rune Pair's rule for the shield alone, in the act's own element (Fire, Frost,
//   Lightning, the Void; the finale any). The orb takes the colour, the sigil lights, and the spell is drawn at his feet from the first
//   moment, following him until a moment before it lands. Fire and the void part: a ring (the void's has a quiet middle) the party keeps
//   out of, so he takes it where nobody stands. Frost and lightning join: a blue circle on him that at least one other must share, so he
//   stands where the party can reach him. A light hit on him, laid into the calm before another set (brandIn), so the tank has a read
//   of his own about every 20 to 30 s between the Lances. Hard: a shorter hold, a tighter circle, and in the frost act a lance of frost
//   out of the boss through him a beat before the circle (leave the line, then be where the party can close in).

// Pure helpers shared with the clients (arena-view / main.js move the live shape of a shape that joins two heroes)
const AZ = {
  ELS: ['fire', 'frost', 'bolt', 'void'],
  NAME: { fire: 'Fire', frost: 'Frost', bolt: 'Lightning', void: 'the Void' },
  COL: { fire: '#ff6a2a', frost: '#7fd8ff', bolt: '#ffe45a', void: '#a05aff' },
  RULE: { fire: 'split', frost: 'pair', bolt: 'pair', void: 'split' },
  SPELL: { fire: 'Cinder Rune', frost: 'Rime Rune', bolt: 'Storm Rune', void: 'Rift Rune' },
  TAG: { fire: 'azFire', frost: 'azFrost', bolt: 'azBolt', void: 'azVoid' },
  // the sigil circles on the floor: where the elementals are led, and the centres of the Convergence
  SIG: { fire: [0, -270], frost: [270, 0], bolt: [0, 270], void: [-270, 0] },
  // live shape of a link between two heroes: 'mid' (a stack halfway between them) or 'beam' (a line from one to the other,
  // shortened at both ends so the two of them stand outside it)
  linkShape(k, a, b, s) {
    if (k === 'mid') { s.x = (a.x + b.x) / 2; s.y = (a.y + b.y) / 2; return s; }
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx);
    s.x = a.x + Math.cos(ang) * 45; s.y = a.y + Math.sin(ang) * 45; s.angle = ang; s.len = Math.max(0, d - 90);
    return s;
  },
};

const AZERATH = {
  id: 'archmage', name: 'Azerath', title: 'Master of the Seven Circles',
  hp: { normal: 7185000, hard: 7830000, extreme: 9130000 },   // (Extreme: Hard's and about 6%, a first number, tuning comes later) (2026-10-31: retuned for bots and parties holding talents (set 1 two/three rows, set 2 four/five, set 3 six/seven), was 5880000 / 6100000; Normal 6.1M and Hard 6.4M before 2026-10-27)
  normalDmg: 0.87,   // (2026-10-31: retuned for bots and parties holding talents (set 1 two/three rows, set 2 four/five, set 3 six/seven), was 0.76; Normal's damage multiplier, fight.js default 1: 2026-10-27, tuned for a human party rather than perfect bots, CLAUDE.md)
  hardDmg: 1.19,   // (2026-10-31: retuned for bots and parties holding talents (set 1 two/three rows, set 2 four/five, set 3 six/seven), was 1.1; Hard's damage multiplier; fight.js default 1.25. 2026-10-27: tuned for a human party rather than perfect bots, CLAUDE.md)
  extremeDmg: 1.33,   // (Extreme: Hard's, to start with)
  autoDmg: { normal: 2000, hard: 1850 },
  enrage: { normal: 600, hard: 605, extreme: 605 },   // the cast starts here and lands 8 s later
  enrageName: 'The Tide Rises',
  vuln: 0.5,
  spawn: { x: 0, y: 0 }, anchor: true,
  arena: { theme: 'tower' },
  gates: [0.78, 0.55, 0.32, 0.14, 0.06],   // where the acts change (ticks on the boss bar; fight.js course)
  push: true,                         // reach a gate early and he moves on (fight.js course: push)

  script(f) {
    const H = f.hard;
    const X = f.extreme;   // (Extreme: Hard's moves and three of its own: Spellweave, Runic Clock, Cascading Convergence)
    const B = f.boss;
    const TAU = Math.PI * 2;
    const { ELS, RULE, SPELL, TAG, SIG, NAME } = AZ;
    const dmg = {
      burst: H ? 19200 : 21500, lance: H ? 18600 : 18600, pyre: H ? 17000 : 15400, fire: H ? 18000 : 20400, react: H ? 19500 : 21500, frost: H ? 47500 : 53900,
      beam: H ? 24300 : 21500, void: H ? 16900 : 19100, voidSelf: H ? 8800 : 10000, ice: H ? 25200 : 22300, bolt: H ? 19800 : 17500, rift: H ? 21600 : 19100,
      conv: H ? 27900 : 24600, lens: H ? 18000 : 15900, counter: H ? 21500 : 19100, mark: H ? 47500 : 49600, pulse: H ? 16200 : 14300, surge: H ? 21600 : 23900,
      elBite: H ? 1500 : 1300, flare: H ? 16000 : 15500, flens: H ? 13500 : 13000,
      brand: H ? 9000 : 8000, brandVoid: H ? 12100 : 11000, brandSelf: H ? 5500 : 5000, brandStack: H ? 4000 : 3600, brandStackSelf: H ? 6600 : 6000,
      arc: H ? 3600 : 3200, burn: H ? 2200 : 2000,   // (the elemental riders on a Burst and a Lance: the lightning's arc, a tick of the fire's burn)
      settle: H ? 17000 : 15400,   // (Extreme: the last blow of a Cascading Convergence)
    };
    const S = (...steps) => steps.filter(Boolean);
    const live = id => f.alive().find(p => p.id === id);
    const nonTank = () => { const pool = f.nonTanks().length ? f.nonTanks() : f.alive(); return pool.length ? f.pick(pool) : null; };
    // Hard draws the order of an act's middle sets fresh each pull (the opening and the last sets stay put). An order is thrown back
    // when two Arcane Lances or two Pyre Rings would sit in neighbouring sets (a tankbuster inside the tank's own cooldown, a floor
    // that is read once and not twice), when two Bursts, or a Burst and a stack, would come too close (the healer's recovery), when a
    // Circle Brand would sit too near a Lance, a stack, a Counterspell's echo or another Brand (see below), when more than 40 s pass
    // between the tank's own beats (a Lance, a Circle Brand, the Binding), or when a run of more than three sets has no raidwide or
    // stack. prev: the last big hits of the act before, [seconds before this act began, 0 Burst | 1 stack];
    // closing: the act's closing passes, whose first step comes right after the last set
    // (The dance: the order is drawn from f.danceRng(salt), so Hard has three fixed timelines and Extreme one. Each act names, by hand, which of
    // its middle sets opens the middle in each of the three dances (lead: indexes into mid, one per dance), so the first set that is not
    // common to the three tells the party which dance this pull is. xlead: the set Extreme puts in the place of one of the Hard sets, which opens its middle.)
    const mix = (head, mid, tail, prev = [], closing = null, salt = '', lead = null, xlead = -1) => {
      if (!H) return [...head, ...mid, ...tail];
      const has = (set, n) => set.some(st => st[2] === n);
      const bad = o => {
        const all = [...head, ...o, ...tail], seq = closing ? [...all, [closing[0]]] : all;
        for (let i = 1; i < seq.length; i++) for (const n of ['Arcane Lance', 'Pyre Rings', 'Sigil Flare']) if (has(seq[i], n) && has(seq[i - 1], n)) return true;
        // Bursts at least 33 s apart, a stack (Arcane Mark, Rime Rune) 14 s from a Burst and 20 s from another stack
        const hits = [...prev];
        let t = 0;
        for (const st of seq) for (const [dt, , nm] of st) { t += dt; if (nm === 'Arcane Burst') hits.push([t, 0]); else if (nm === 'Arcane Mark' || nm === 'Rime Rune') hits.push([t, 1]); }
        for (let i = 1; i < hits.length; i++) { const d = hits[i][0] - hits[i - 1][0], k = hits[i][1] + hits[i - 1][1]; if (d < (k === 0 ? 33 : k === 1 ? 14 : 20)) return true; }
        // a Circle Brand (light, but a hit on the tank): at least 4 s after a Lance (its ring is light), 3 s after a Burst, 4 s from a stack, its cast after a Counterspell's
        // last echo, 8 s from another Brand, and no Lance within 6 s after it
        const ev = prev.map(([s, k]) => ({ t: -s, k: k ? 'stack' : 'burst' })), c = 0.85;
        t = 0;
        for (const st of seq) for (const [dt, , nm, el] of st) {
          t += dt;
          if (nm === 'Arcane Burst') ev.push({ t: t + 4.4 * c, k: 'burst' });
          else if (nm === 'Arcane Lance') ev.push({ t: t + 4.4 * c, k: 'lance' });
          else if (nm === 'Arcane Mark') ev.push({ t: t + 5.6 * c, k: 'stack' });
          else if (nm === 'Rime Rune') ev.push({ t: t + 4.6 * c, k: 'stack' });
          else if (nm === 'Counterspell') ev.push({ t: t + 5, k: 'counter' });   // (its echo of the echo lands about 5 s after the cast begins)
          else if (nm === 'Circle Brand') ev.push({ t: t + 2.8 * c, k: 'brand' });
        }
        for (const b of ev) {
          if (b.k !== 'brand') continue;
          for (const e of ev) {
            if (e === b) continue;
            const d = b.t - e.t, ad = Math.abs(d);
            if (e.k === 'lance' && ((d > 0 && d < 4) || (d <= 0 && d > -6))) return true;
            if (e.k === 'burst' && d > 0 && d < 3) return true;
            if (e.k === 'counter' && d > 0 && d < 2.5) return true;
            if (e.k === 'stack' && ad < 4) return true;
            if (e.k === 'brand' && ad < 8) return true;
          }
        }
        // the tank's own beats (a Lance, a Brand, the Binding): never more than 40 s from one to the next (a rune the tank bears, or a
        // Bolt that starts on him, only ever shortens it)
        const tb = [];
        t = 0;
        for (const st of all) for (const [dt, , nm] of st) {
          t += dt;
          if (nm === 'Arcane Lance') tb.push(t + 4.4 * c); else if (nm === 'Circle Brand') tb.push(t + 2.8 * c);
          else if (nm === 'The Binding') for (let i = 0; i < 5; i++) tb.push(t + i * 9);
        }
        for (let i = 1; i < tb.length; i++) if (tb[i] - tb[i - 1] > 40) return true;
        let hr = 0;
        for (const st of all) { if (['Arcane Burst', 'Sigil Flare', 'Convergence', 'Cascading Convergence', 'Counterspell', 'Arcane Mark', 'Rime Rune', 'The Binding', 'Spellweave', 'Runic Clock'].some(n => has(st, n))) hr = 0; else if (++hr > 3) return true; }
        return false;
      };
      const first = X && mid[xlead] ? mid[xlead] : lead && mid[lead[f.dance]] ? mid[lead[f.dance]] : null;   // (Extreme: the set it adds opens the middle, so it comes early in the act)
      let o = null;
      for (let k = 0; k < 200 && !o; k++) {
        const rg = f.danceRng(salt + ':' + k), c = [...mid];
        for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(rg() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; }
        if (first) c.splice(0, 0, ...c.splice(c.indexOf(first), 1));
        if (!bad(c)) o = c;
      }
      if (!o) o = first ? [first, ...mid.filter(s => s !== first)] : mid;   // (no order passed: the written order)
      return [...head, ...o, ...tail];
    };
    // which of two runes is live in a rune set laid into the act's script: on Hard and Extreme it is drawn from the dance, so each dance names the same
    // spell in the same place on every pull (it is named in the upcoming feed long before it matters); on Normal it is a plain draw
    const epick = (salt, arr) => (H ? arr[Math.floor(f.danceRng('el:' + salt)() * arr.length)] : f.pick(arr));
    // the calm before a set: Hard's is a little shorter (its casts are faster too)
    const g = n => (H ? Math.round((n - 0.2) * 100) / 100 : n);
    // a Circle Brand laid into the calm before a set: its cast begins once the cast before has ended (every cast is 4.8 s at most; a Pyre
    // Ring, Ice Lance, Leaping Bolt or Flare may still be landing in the first moments of it), lands before the set's own first cast, and
    // the set's first step keeps its place. (el: 'fire' | 'frost' | 'bolt' | 'void', or null for any)
    // (whole: the Brand rides on the tail of the cast before, beginning this many seconds after it (a Burst, Lance or rune spell has ended by then), and the
    // set's first cast waits until six quiet seconds follow the Brand, so the calm is not split: it is one window, with a tank beat before it)
    const brandIn = (el, set, whole) => {
      const a = whole || (H ? 5.7 : 6.4), [dt, fn, nm, ...ex] = set[0], d1 = whole ? Math.max(dt, a + (H ? 2.4 : 2.8) + 6.1) : dt;
      return [[a, brandOf(el), 'Circle Brand', el || 'any'], [Math.round((d1 - a) * 100) / 100, fn, nm, ...ex], ...set.slice(1)];
    };

    // shared with the bots and the host's view (raid-host.js)
    f.runePair = null;     // { a, b, ea, eb, el, rule: 'pair' | 'split', on: 1 }: who carries the runes, and what the coming spell wants of them
    f.binding = null;      // { circles: [{ el, x, y, r }], items: [{ add, el, t0, inT, done }] }: the elementals to be led to their sigils
    // no Time Stop (fight.js pauseBoss) while a Rune Pair is held or an elemental is still to be bound: both run on their own clock
    f.noPause = () => !!f.runePair || !!(f.binding && f.binding.items.some(i => !i.done));

    // --- shapes that follow two heroes (the shape moves on the host here and on every client: AZ.linkShape) ------------
    const links = [];
    f.ticker(() => {
      for (let i = links.length - 1; i >= 0; i--) {
        const L = links[i];
        if (!f.mechs.has(L.m.id)) { links.splice(i, 1); continue; }
        if (f.t >= L.m.resolveAt - L.lock) continue;
        const a = live(L.a), b = live(L.b);
        if (a && b) AZ.linkShape(L.k, a, b, L.m.shape);
      }
    });
    const link = (m, a, b, k, lock) => { links.push({ m, a, b, k, lock }); f.emit({ t: 'azlink', id: m.id, a, b, k, lock }); };

    // --- what the last spell covered, for Counterspell (Hard) ----------------------------------------------------------
    let mem = null;
    const memo = m => {
      if (!H) return;
      if (!mem || f.t - mem.at > 1.6) mem = { at: f.t, list: [] };
      if (m.shape.kind === 'rect' && m.shape.len < 40) return;   // (a bolt between two heroes standing together is nothing to copy)
      mem.at = f.t; mem.list.push({ shape: Object.assign({}, m.shape), dmg: m.dmg, tag: m.tag, type: m.type });
    };
    const rec = (shape, delay, dm, extra = {}) => { const m = f.aoe(shape, delay, dm, Object.assign({}, extra, { onResolve: () => memo(m) })); return m; };

    // --- the core moves --------------------------------------------------------------------------------------------
    // The element of the act a Burst or a Lance is cast in, and its small rider: fire leaves a burn to heal through, frost a short slow,
    // lightning arcs to whoever stands within a short reach of the struck hero (a ring on each hero for a Burst, which strikes all four; a
    // ring on the shield for a Lance), the void tugs a step toward the middle. (The finale and the last Convergence take the four in turn.)
    let actEl = 'fire', riderN = 0;
    const riderEl = () => (actEl === 'any' ? ELS[riderN++ % ELS.length] : actEl);
    const burn = id => {
      f.debuff(id, 'burning', 6.2);
      for (let i = 1; i <= 4; i++) f.afterKeep(i * 1.5, () => { const p = live(id); if (p && f.hasDebuff(id, 'burning')) f.damagePlayer(p, dmg.burn, { kind: 'burn', n: 'Burning', noVuln: true }); });
    };
    const tug = (p, dist) => {   // a step toward the middle (a throw away from a point just behind the hero, as the Sovereign's pull is laid)
      const d0 = Math.hypot(p.x, p.y), step = Math.min(dist, d0 - 70);
      if (step < 20) return;
      f.knock(p, p.x + p.x / d0 * 20, p.y + p.y / d0 * 20, step);
    };
    const rider = (el, who, d) => {
      f.afterKeep(d + 0.05, () => {
        for (const id of who) {
          const p = live(id); if (!p) continue;
          if (el === 'fire') burn(id); else if (el === 'frost') f.debuff(id, 'slowed', 3); else if (el === 'void') tug(p, who.length > 1 ? 130 : 110);
        }
      });
    };
    const burst = () => {
      const d = f.ct(4.4), el = riderEl();
      f.cast('Arcane Burst', d, 'burst');
      f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: d, dmg: dmg.burst, hidden: true, tag: 'azBurst' });
      if (el === 'bolt') for (const p of f.alive()) f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 100 }, delay: d, dmg: dmg.arc, follow: p.id, lockAt: 1.2, tag: 'azBolt' });
      else rider(el, f.alive().map(p => p.id), d);
    };
    const lance = () => {
      const tank = f.tank(); if (!tank) return;
      const d = f.ct(4.4), el = riderEl();
      f.cast('Arcane Lance', d, 'lance');
      f.mech({ type: 'buster', shape: { kind: 'cone', x: B.x, y: B.y, r: 380, arc: 1.3, angle: B.facing }, delay: d, dmg: dmg.lance, target: tank.id, aimFromBoss: tank.id, tag: 'buster' });
      if (el === 'bolt') f.mech({ type: 'spread', shape: { kind: 'circle', x: tank.x, y: tank.y, r: 130 }, delay: d, dmg: dmg.arc, follow: tank.id, lockAt: 1.2, tag: 'azBolt' });
      else rider(el, [tank.id], d);
    };
    // Circle Brand: the Rune Pair's rule for the shield alone. A rune of the act's element is laid on the tank (the orb takes the colour,
    // the sigil lights) and the spell it brings is drawn at the tank's feet from the first moment, following him until a moment before
    // it lands. Fire and the void part: a ring of flame (a quiet middle in the void's) that the party must keep out of, so the shield
    // takes it where nobody stands. Frost and lightning join: a blue circle on the shield that at least one other must share (and the
    // more of them, the lighter each takes it), so the shield stands where the party can reach him. Hard: a shorter hold, and in the
    // frost act a lance of frost out of him through the shield lands a beat before the circle (as in the Rime Rune: leave the line,
    // then be where the party can close in). Light enough to come often: the tank's own read between the Lances (see brandIn and `mix`)
    const brandOf = want => () => {
      const tk = f.tank(); if (!tk) return;
      const el = want || f.pick(ELS);
      const d = f.ct(2.8), lock = H ? 1.2 : 1.4, n = f.alive().length;
      f.cast('Circle Brand', d, el);
      f.emit({ t: 'roomev', k: 'live', el, dur: d + 0.4 });
      const x = Math.round(tk.x), y = Math.round(tk.y), o = { follow: tk.id, lockAt: lock };
      if (el === 'fire') f.mech(Object.assign({ type: 'spread', shape: { kind: 'circle', x, y, r: H ? 135 : 125 }, delay: d, dmg: dmg.brand, tag: 'azFire' }, o));
      else if (el === 'void') {
        f.mech(Object.assign({ type: 'aoe', shape: { kind: 'donut', x, y, r: H ? 255 : 235, r2: 90 }, delay: d, dmg: dmg.brandVoid, tag: 'azVoid' }, o));
        f.afterKeep(d + 0.03, () => { const q = live(tk.id); if (q) f.damagePlayer(q, dmg.brandSelf, { kind: 'azVoid', n: 'Circle Brand' }); });
      } else {
        f.mech(Object.assign({ type: 'stack', shape: { kind: 'circle', x, y, r: H ? 138 : 150 }, delay: d, dmg: dmg.brandStack, need: Math.min(n, 2), tag: 'azMark:' + el }, o));
        f.afterKeep(d + 0.03, () => { const q = live(tk.id); if (q) f.damagePlayer(q, dmg.brandStackSelf, { kind: 'azMark', n: 'Circle Brand' }); });   // (the blow is the shield's; what the others share is a small part)
        if (H && el === 'frost') f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(tk.y - B.y, tk.x - B.x), len: 620, w: 110 }, delay: d - 1.0, dmg: dmg.ice * 0.9, tag: 'azFrost', ddown: true, aimFromBoss: tk.id, lockAt: 0.9 });
      }
    };
    // Pyre Rings: the floor's three rings (the middle disc, the ring round it, the outer ring); two burn one after the other
    const RINGS = [{ kind: 'circle', x: 0, y: 0, r: 170 }, { kind: 'donut', x: 0, y: 0, r: 350, r2: 170 }, { kind: 'donut', x: 0, y: 0, r: 590, r2: 350 }];
    const pyre = () => {
      const d = f.ct(4.6), gap = f.ct(H ? 2.3 : 2.8);   // (Hard: the rings follow one another closer, so the hop between them is tight)
      const safe = f.pick([0, 1, 1, 2, 2]);
      const order = [0, 1, 2].filter(i => i !== safe);
      if (f.rng() < 0.5) order.reverse();
      f.cast('Pyre Rings', d, 'pyre');
      order.forEach((ri, j) => f.aoe(RINGS[ri], d + j * gap, dmg.pyre, { tag: 'azFire', ddown: true }));
    };
    // Ice Lances: a line out of him through each of two heroes (three on Hard), following them until a moment before it goes
    const iceLances = () => {
      const pool = f.shuffle(f.nonTanks().length ? f.nonTanks() : f.alive()).slice(0, H ? 3 : 2);
      if (!pool.length) return;
      const d = f.ct(4.8), lead = [];
      f.cast('Ice Lances', d, 'lances');
      for (const p of pool) {
        const m = f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(p.y - B.y, p.x - B.x), len: 620, w: 110 }, delay: d, dmg: dmg.ice, tag: 'azFrost', ddown: true, aimFromBoss: p.id, lockAt: 1.2,
          onResolve: () => memo(m) });
        lead.push(m);
      }
      // the weave: the moment the first lines lock, a second volley is laid either side of each, and lands a beat after the first.
      // The ground between a line and its flanks is safe through both; the line itself is safe once it has fired
      f.afterKeep(d - 1.2 + 0.03, () => {
        const wv = f.ct(H ? 0.95 : 1.05);
        for (const m of lead) {
          const a = m.shape.angle;
          for (const sg of [-1, 1]) f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: a + sg * (H ? 0.8 : 0.84), len: 620, w: 110 }, delay: 1.2 - 0.03 + wv, dmg: dmg.ice * 0.8, tag: 'azFrost', ddown: true });
        }
      });
    };
    // Leaping Bolt: a circle on one hero, then on the hero nearest them, and on, a heartbeat apart
    // The bolt prefers a rune bearer as its next jump: two heroes carry a bolt rune (a linked sign over the head, its ring burning down to the
    // moment the chain is set, a moment before the first circle lands), and the chain runs to a bearer before it runs to whoever is nearest,
    // so where the bearers stand steers it. The first circle is laid at the cast; the rest are laid when the chain is set, with the party
    // standing where it stands then.
    const leapingBolt = () => {
      const al = f.alive(); if (!al.length) return;
      const d0 = f.ct(4.6), step = f.ct(H ? 0.82 : 0.95), nj = H ? 5 : 4, setAt = d0 - 1.7;
      f.cast('Leaping Bolt', d0, 'chain');
      // (every other Bolt starts on the tank, who then steps out of the circle and leaves the chain to hop on to a bearer, or whoever is nearest)
      const tk = f.tank();
      const start = boltN++ % 2 === 0 && tk ? tk : f.pick(f.nonTanks().length ? f.nonTanks() : al);
      const bearers = f.shuffle(al.filter(p => p.id !== start.id)).slice(0, 2).map(p => p.id);
      for (const id of bearers) f.mark(id, { sym: 'chain', col: AZ.COL.bolt, dur: setAt, key: 'azbolt' });
      const m0 = f.mech({ type: 'aoe', shape: { kind: 'circle', x: start.x, y: start.y, r: 105 }, delay: d0, dmg: dmg.bolt, follow: start.id, lockAt: 1.0, tag: 'azBolt', onResolve: () => memo(m0) });
      f.afterKeep(setAt, () => {
        f.clearMarks('azbolt');
        const now = f.alive(), s0 = now.find(p => p.id === start.id);
        const seq = [s0 || { id: start.id, x: m0.shape.x, y: m0.shape.y, gone: true }];
        for (;;) {
          if (seq.length >= nj) break;
          const cur = seq[seq.length - 1], left = now.filter(p => !seq.some(q => q.id === p.id));
          const nearest = (list, reach) => { let best = null, bd = reach; for (const p of list) { const dd = Math.hypot(p.x - cur.x, p.y - cur.y); if (dd < bd) { bd = dd; best = p; } } return best; };
          const best = nearest(left.filter(p => bearers.includes(p.id)), 900) || nearest(left, 520);
          if (!best) break;
          seq.push(best);
        }
        seq.forEach((p, i) => {
          if (!i) return;
          const m = f.mech({ type: 'aoe', shape: { kind: 'circle', x: Math.round(p.x), y: Math.round(p.y), r: 105 }, delay: d0 - setAt + i * step, dmg: dmg.bolt, follow: p.id, lockAt: 1.0, tag: 'azBolt', onResolve: () => memo(m) });
        });
      });
    };
    // Void Rifts: rifts open where heroes stand now, and again a moment later where they went
    const voidRifts = () => {
      const d = f.ct(4.4), n = H ? 4 : 3;
      f.cast('Void Rifts', d, 'rifts');
      for (const p of f.shuffle(f.alive()).slice(0, n)) rec({ kind: 'circle', x: Math.round(p.x), y: Math.round(p.y), r: 120 }, d, dmg.rift, { tag: 'azVoid', ddown: true });
      f.afterKeep(f.ct(2.5), () => {
        for (const p of f.shuffle(f.alive()).slice(0, n)) rec({ kind: 'circle', x: Math.round(p.x), y: Math.round(p.y), r: 120 }, f.ct(2.6), dmg.rift, { tag: 'azVoid', ddown: true });
      });
    };

    // --- the Rune Pair -----------------------------------------------------------------------------------------------
    const setPair = (a, b, ea, eb, el, hold) => {
      f.runePair = { a, b, ea, eb, el, rule: RULE[el], on: 1 };
      f.clearTethers();
      if (b != null) f.tether(a, b, hold, { kind: 'short', len: 99999, dmg: 0, tag: 'rune:' + ea + ':' + eb + ':' + el });   // (el: the rune that is live, for the clients' drawing)
    };
    let holdUntil = 0, tankHad = false, boltN = 0, spellDue = false;
    // an act cut short by its gate drops the spell of a Rune Mark it had begun: the pair would stay on the bots' map for good. The next act clears it
    const unpair = () => { if (spellDue) { spellDue = false; f.runePair = null; f.clearTethers(); } clk = null; f.clearMarks('azclock'); f.clearMarks('azweave'); };
    let clk = null;   // Extreme's Runic Clock in progress: { p1, p2 } the two pairs, the first to resolve and the second
    // hold: seconds from now until the spell has landed (the link on the two stays until then)
    const runeMark = (el, hold, swap) => {
      f.cast('Rune Mark', f.ct(2.4), 'rune');
      holdUntil = f.t + hold;
      spellDue = true;
      f.emit({ t: 'roomev', k: 'live', el, dur: hold });   // the sigil of the coming spell's element lights until it lands (archmage-art.js towerLife)
      // (the tank bears a rune too, for a spell that wants the pair together (frost, lightning): a positioning job on a fight where the
      // boss never walks. Chosen like anyone, except that when the last such spell left the tank out, this one brings it in: with a Swap,
      // by sending the runes to two others first, as the Swap brings the tank in. A stand-apart rune stays with the others, as before)
      const pool = f.alive();
      if (!pool.length) { f.runePair = null; return; }
      const nts = f.shuffle(f.nonTanks()), tk = RULE[el] === 'pair' && nts.length >= 2 ? f.tank() : null;
      let pr = f.shuffle(tk ? pool : nts.length >= 2 ? nts : pool);
      if (tk && !tankHad) pr = swap ? nts : [tk, nts[0]];
      const other = f.pick(ELS.filter(e => e !== el));
      const ea = f.rng() < 0.5 ? el : other, eb = ea === el ? other : el;
      setPair(pr[0].id, pr[1] ? pr[1].id : null, ea, eb, el, hold);
    };
    // Rune Swap (Hard): the runes jump to two other heroes
    const runeSwap = () => {
      const rp = f.runePair; if (!rp) return;
      const d = f.ct(2.2);
      f.cast('Rune Swap', d, 'swap');
      f.afterKeep(d, () => {
        const cur = f.runePair; if (!cur) return;
        // (two heroes who don't bear one: the other damage dealers first, then the tank, and only then, in a small party, one of the pair)
        const was = p => p.id === cur.a || p.id === cur.b, t = f.tank();
        const pr = f.shuffle(f.nonTanks().filter(p => !was(p))).concat(t && !was(t) ? [t] : [], f.shuffle(f.alive().filter(was)));
        if (pr.length < 2) return;
        setPair(pr[0].id, pr[1].id, cur.ea, cur.eb, cur.el, Math.max(1, holdUntil - f.t));
      });
    };
    // two heroes too close when a split spell is about to land: a circle of their two runes' flame or void blooms between them
    const reactCheck = (d, rp) => {
      if (!rp || rp.b == null) return;
      f.afterKeep(d - 1.45, () => {
        const a = live(rp.a), b = live(rp.b);
        if (!a || !b || Math.hypot(a.x - b.x, a.y - b.y) > (H ? 290 : 250)) return;
        f.aoe({ kind: 'circle', x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2), r: H ? 185 : 165 }, 1.35, dmg.react, { tag: 'azReact:' + rp.ea + ':' + rp.eb });
      });
    };
    // the spell: one of the two runes' elements, and the rule that goes with it
    // (rp0 and after: Extreme's Runic Clock casts one pair's spell at a time; `after` runs when the spell has landed, instead of the pair being done)
    const runeSpell = (el, rp0, after) => {
      const rp = rp0 || f.runePair;
      if (!after) spellDue = false;
      const d = f.ct(4.6);
      f.cast(SPELL[el], d, el);
      if (!rp) return;
      const A = live(rp.a), Bp = rp.b != null ? live(rp.b) : null;
      const ids = [rp.a, rp.b].filter(x => x != null);
      if (RULE[el] === 'pair' && !after) { const tkn = f.tank(); tankHad = !!tkn && ids.includes(tkn.id); }   // (did the tank bear this one? the next together-rune brings it in if not)
      let ok = () => true;
      if (el === 'fire') {
        for (const id of ids) {
          const p = live(id); if (!p) continue;
          const m = f.mech({ type: 'spread', shape: { kind: 'circle', x: p.x, y: p.y, r: 125 }, delay: d, dmg: dmg.fire, follow: id, lockAt: 1.1, tag: 'azFire', onResolve: () => memo(m) });
        }
        reactCheck(d, rp);
        ok = () => { const a = live(rp.a), b = live(rp.b); return !a || !b || Math.hypot(a.x - b.x, a.y - b.y) > (H ? 290 : 250); };
      } else if (el === 'void') {
        for (const id of ids) {
          const p = live(id); if (!p) continue;
          const m = f.mech({ type: 'aoe', shape: { kind: 'donut', x: p.x, y: p.y, r: 255, r2: 90 }, delay: d, dmg: dmg.void, follow: id, lockAt: 1.1, tag: 'azVoid', onResolve: () => memo(m) });
          f.afterKeep(d + 0.03, () => { const q = live(id); if (q) f.damagePlayer(q, dmg.voidSelf, { kind: 'azVoid', n: SPELL.void }); });
        }
        reactCheck(d, rp);
        ok = () => { const a = live(rp.a), b = live(rp.b); return !a || !b || Math.hypot(a.x - b.x, a.y - b.y) > (H ? 290 : 250); };
      } else if (el === 'frost') {
        const n = f.alive().length;
        const sx = A && Bp ? (A.x + Bp.x) / 2 : A ? A.x : 0, sy = A && Bp ? (A.y + Bp.y) / 2 : A ? A.y : 0;
        const m = f.mech({ type: 'stack', shape: { kind: 'circle', x: sx, y: sy, r: H ? 138 : 150 }, delay: d, dmg: dmg.frost * Math.min(n, 4) / 4, need: H ? n : Math.max(1, n - 1), lockAt: 1.2, tag: 'azFrost', onResolve: () => memo(m) });
        if (A && Bp) link(m, rp.a, rp.b, 'mid', 1.2);
        // a lance out of him through each bearer lands a beat before the stack: dodge the line, then close in
        for (const id of ids) {
          const q = live(id); if (!q) continue;
          f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(q.y - B.y, q.x - B.x), len: 620, w: 110 }, delay: d - (H ? 0.95 : 1.05), dmg: dmg.ice * 0.9, tag: 'azFrost', ddown: true, aimFromBoss: id, lockAt: 0.9 });
        }
      } else {
        // lightning: a bolt from one bearer to the other. Standing together makes it too short to reach anyone
        if (A && Bp) {
          const m = f.mech({ type: 'aoe', shape: AZ.linkShape('beam', A, Bp, { kind: 'rect', x: 0, y: 0, angle: 0, len: 0, w: 100 }), delay: d, dmg: dmg.beam, lockAt: 1.2, tag: 'azBeam', onResolve: () => memo(m) });
          link(m, rp.a, rp.b, 'beam', 1.2);
          ok = () => { const a = live(rp.a), b = live(rp.b); return !a || !b || Math.hypot(a.x - b.x, a.y - b.y) <= 170; };
        }
      }
      // the pair is done a moment after the spell lands; a pair that stood the way the element wanted counts as a soak for both
      f.afterKeep(d + 0.05, () => {
        if (ok()) for (const id of ids) { const st = f.stats[id]; if (st && live(id)) st.soaked++; }
        if (after) after(); else { f.runePair = null; f.clearTethers(); }
      });
    };
    // a Rune Mark and the spell that follows it (the spell's name is laid out now, so the upcoming feed already says which element it is)
    const runeSet = (gap, el, o = {}) => {
      // (a Swap leaves the new bearers about six seconds from the jump to the lock: the spell begins 5.4 s after the Swap's cast does)
      const swap = H && o.swap, g2 = swap ? 5.4 : 7.4, hold = (swap ? 4.2 : 0) + g2 + f.ct(4.6) + 0.35;
      return [[gap, () => runeMark(el, hold, swap), 'Rune Mark'], swap && [4.2, runeSwap, 'Rune Swap'], [g2, () => runeSpell(el), SPELL[el]]].filter(Boolean);
    };

    // --- Extreme: Spellweave -----------------------------------------------------------------------------------------------
    // He holds three spells as glyphs over his staff before casting any. Three heroes carry the glyphs, numbered 1 to 3 in the colour of
    // their element; each spell falls on its hero (a ring, a line, a bolt or a void), one after another. A fourth hero carries the reversal
    // glyph when there is one: then the spells fall in reverse order, the third glyph's first.
    const weaveSpell = (el, q, delay) => {
      if (el === 'fire') f.mech({ type: 'spread', shape: { kind: 'circle', x: Math.round(q.x), y: Math.round(q.y), r: 125 }, delay, dmg: dmg.fire * 0.9, follow: q.id, lockAt: 1.1, tag: 'azFire' });
      else if (el === 'frost') f.mech({ type: 'aoe', shape: { kind: 'rect', x: B.x, y: B.y, angle: Math.atan2(q.y - B.y, q.x - B.x), len: 620, w: 110 }, delay, dmg: dmg.ice, tag: 'azFrost', ddown: true, aimFromBoss: q.id, lockAt: 1.1 });
      else if (el === 'bolt') f.mech({ type: 'aoe', shape: { kind: 'circle', x: Math.round(q.x), y: Math.round(q.y), r: 105 }, delay, dmg: dmg.bolt, follow: q.id, lockAt: 1.0, tag: 'azBolt' });
      else f.mech({ type: 'aoe', shape: { kind: 'donut', x: Math.round(q.x), y: Math.round(q.y), r: 255, r2: 90 }, delay, dmg: dmg.void * 0.9, follow: q.id, lockAt: 1.1, tag: 'azVoid', ddown: true });
    };
    const weave = () => {
      const al = f.alive(); if (al.length < 2) return;
      const heroes = f.shuffle(al), nn = Math.min(3, heroes.length), nums = heroes.slice(0, nn), flipper = heroes[nn] || null;
      const rev = !!flipper && f.rng() < 0.5, els = f.shuffle(ELS).slice(0, nn);
      const d = f.ct(4.4), gap = f.ct(2.4), total = d + gap * (nn - 1);
      f.cast('Spellweave', d, 'mark');
      f.emit({ t: 'roomev', k: 'archmage-weave', els, rev, dur: total + 0.6 });   // (the glyphs over his staff, in order; the reversal glyph among them)
      const order = [...Array(nn).keys()]; if (rev) order.reverse();
      order.forEach((k, j) => {
        const tj = d + j * gap, id = nums[k].id;
        f.mark(id, { sym: 'num', n: k + 1, col: AZ.COL[els[k]], dur: tj + 0.2, key: 'azweave' });
        if (!j) weaveSpell(els[k], nums[k], tj);
        else f.afterKeep(tj - 3.2, () => { const q = live(id); if (q) weaveSpell(els[k], q, 3.2); });
      });
      if (rev) f.mark(flipper.id, { sym: 'flip', col: '#e8e0c8', dur: total + 0.3, key: 'azweave' });
    };
    // (Together with the Rune Pair: the Mark, then the Weave while the runes are held, then the rune's spell after the last weave spell has landed)
    const weaveRuneSet = (gap, el) => {
      const dW = f.ct(4.4), gW = f.ct(2.4), toSpell = dW + 2 * gW + 1.5 - f.ct(4.6), hold = 2.7 + toSpell + f.ct(4.6) + 0.35;
      return [[gap, () => runeMark(el, hold, false), 'Rune Mark'], [2.7, weave, 'Spellweave'], [toSpell, () => runeSpell(el), SPELL[el]]];
    };

    // --- Extreme: Runic Clock ----------------------------------------------------------------------------------------------
    // Two pairs of runes at once, a together pair and an apart pair, each pair's heroes wearing a sign whose ring burns down to the moment
    // their pair's spell lands: the two pairs resolve at different moments, the together pair first and then the apart pair, or the other way
    // round. The bots follow the pair whose spell is next (f.runePair).
    const clockSet = (gap, first) => {
      const tEl = epick('ct' + first, ['frost', 'bolt']), aEl = epick('ca' + first, ['fire', 'void']);
      const T = { el: tEl, other: ELS.find(e => RULE[e] === 'split' && e !== aEl) }, A = { el: aEl, other: ELS.find(e => RULE[e] === 'pair' && e !== tEl) };
      const P1 = first === 'pair' ? T : A, P2 = first === 'pair' ? A : T, g2 = 7.4, gB = 5.0;
      const mark = () => {
        f.cast('Runic Clock', f.ct(2.4), 'rune');
        const al = f.alive();
        if (al.length < 4) { clk = null; return; }
        const pr = f.shuffle(al), h1 = g2 + f.ct(4.6) + 0.35, h2 = g2 + gB + f.ct(4.6) + 0.35;
        const mk = (P, a, b, hold) => {
          const flip = f.rng() < 0.5, ea = flip ? P.other : P.el, eb = flip ? P.el : P.other;
          const rp = { a: a.id, b: b.id, ea, eb, el: P.el, rule: RULE[P.el], on: 1 };
          f.tether(a.id, b.id, hold, { kind: 'short', len: 99999, dmg: 0, tag: 'rune:' + ea + ':' + eb + ':' + P.el });
          for (const q of [a, b]) f.mark(q.id, { sym: 'chain', col: AZ.COL[P.el], dur: hold, key: 'azclock' });
          return rp;
        };
        f.clearTethers();
        clk = { p1: mk(P1, pr[0], pr[1], h1), p2: mk(P2, pr[2], pr[3], h2) };
        f.runePair = clk.p1; spellDue = true;
        f.emit({ t: 'roomev', k: 'live', el: P1.el, dur: h1 });
        f.emit({ t: 'roomev', k: 'archmage-clock', els: [P1.el, P2.el], d1: h1, d2: h2, dur: h2 });
      };
      const spell = n => () => {
        const c = clk; if (!c) return;
        const rp = n === 1 ? c.p1 : c.p2;
        if (n === 1) runeSpell(P1.el, rp, () => { if (clk === c) { f.runePair = c.p2; f.emit({ t: 'roomev', k: 'live', el: P2.el, dur: 6 }); } });
        else runeSpell(P2.el, rp, () => { if (clk === c) { clk = null; spellDue = false; f.runePair = null; f.clearTethers(); f.clearMarks('azclock'); } });
      };
      return [[gap, mark, 'Runic Clock'], [g2, spell(1), SPELL[P1.el]], [gB, spell(2), SPELL[P2.el]]];
    };

    // --- the Binding (the seam): lead each elemental to its own sigil ------------------------------------------------
    const BIND_R = 135, BIND_T = 2.3, FUSE = 17;
    const bindStart = () => {
      f.cast('The Binding', f.ct(3), 'bind');
      f.binding = { circles: ELS.map(e => ({ el: e, x: SIG[e][0], y: SIG[e][1], r: BIND_R })), items: [] };
      f.emit({ t: 'roomev', k: 'bind', els: [], dur: 60 });
      // the pulses of the working: circles on the floor all through it (one under a hero), so nobody stands idle
      for (let i = 0; i < 5; i++) f.afterKeep(f.ct(3.5) + i * 4.4, () => {
        const tgt = nonTank();
        const at = [];
        if (tgt) at.push([tgt.x, tgt.y]);
        while (at.length < 2) { const a = f.rng() * TAU, r = Math.sqrt(f.rng()) * 430; at.push([Math.cos(a) * r, Math.sin(a) * r]); }
        for (const [x, y] of at) f.aoe({ kind: 'circle', x: Math.round(x), y: Math.round(y), r: 105 }, f.ct(2.8), dmg.pulse, { tag: 'azPulse' });
      });
    };
    const bindEls = () => (f.binding ? f.binding.items.filter(i => !i.done).map(i => i.el) : []);
    const call = el => {
      f.cast('Call of the Circle', f.ct(1.8), 'bind');
      if (!f.binding) f.binding = { circles: ELS.map(e => ({ el: e, x: SIG[e][0], y: SIG[e][1], r: BIND_R })), items: [] };
      const ang = f.rng() * TAU, tank = f.tank();
      const a = f.spawnAdd({ kind: 'az' + el, x: Math.round(Math.cos(ang) * 110), y: Math.round(Math.sin(ang) * 110), hp: 9000000, r: 30, speed: 110, bite: dmg.elBite, biteEvery: 2.4, inert: true });
      if (tank) a.fix = { id: tank.id, until: 1e9 };
      f.binding.items.push({ add: a, el, t0: f.t, inT: 0, done: false, warned: false });
      f.emit({ t: 'roomev', k: 'bind', els: bindEls(), dur: 60 });
    };
    // the elementals walk after the shield (or whoever is nearest, if it has fallen), bite, and are bound when one has stood in its own sigil long enough
    f.ticker(dt => {
      const bd = f.binding; if (!bd) return;
      const al = f.alive();
      for (const it of bd.items) {
        if (it.done) continue;
        const a = it.add;
        if (!f.adds.has(a.id)) { it.done = true; f.emit({ t: 'roomev', k: 'bind', els: bindEls(), dur: 60 }); continue; }
        const lead = f.tank();
        let tgt = lead || null;
        if (!tgt) { let nd = Infinity; for (const p of al) { const d = Math.hypot(p.x - a.x, p.y - a.y); if (d < nd) { nd = d; tgt = p; } } }
        if (tgt) {
          const dx = tgt.x - a.x, dy = tgt.y - a.y, d = Math.hypot(dx, dy);
          a.facing = Math.atan2(dy, dx);
          if (d > a.r + 42) { const step = Math.min(d - (a.r + 42), a.speed * dt); a.x += dx / d * step; a.y += dy / d * step; }
          else if (f.t >= a.nextBite) { a.nextBite = f.t + a.biteEvery; f.emit({ t: 'addev', k: 'bite', id: a.id, tg: tgt.id }); f.damagePlayer(tgt, a.bite, { kind: 'bite' }); }
          f.addsDirty = true;
        }
        const c = bd.circles.find(q => q.el === it.el);
        if (Math.hypot(a.x - c.x, a.y - c.y) < c.r - 12) it.inT += dt; else it.inT = Math.max(0, it.inT - dt * 0.5);
        if (it.inT >= BIND_T) {
          it.done = true;
          for (const p of al) if (Math.hypot(p.x - c.x, p.y - c.y) < 300) f.stats[p.id].soaked++;
          f.emit({ t: 'roomev', k: 'bound', el: it.el, dur: 1.6 });
          f.killAdd(a);
          f.emit({ t: 'roomev', k: 'bind', els: bindEls(), dur: 60 });
        } else if (f.t - it.t0 >= FUSE) {
          it.done = true;
          f.emit({ t: 'roomev', k: 'surge', el: it.el, dur: 1.2 });
          f.mech({ type: 'raidwide', shape: { kind: 'circle', x: 0, y: 0, r: 0 }, delay: 0.5, dmg: dmg.surge, hidden: true, tag: 'azSurge' });
          f.killAdd(a);
          f.emit({ t: 'roomev', k: 'bind', els: bindEls(), dur: 60 });
        } else if (f.t - it.t0 >= FUSE - 2.4 && !it.warned) { it.warned = true; f.emit({ t: 'addev', k: 'fury', x: Math.round(a.x), y: Math.round(a.y) }); }
      }
    });

    // --- Convergence: every sigil lights, each in its own element, and a reaction fills the lens where two meet ------------
    const SR = 225;
    const N = ELS.length;
    // the lens where two neighbouring sigils overlap: a reaction of their two elements
    const lens = (i, delay, dm) => {
      const e = ELS[i], e2 = ELS[(i + 1) % N], A = SIG[e], C = SIG[e2];
      const mx = (A[0] + C[0]) / 2, my = (A[1] + C[1]) / 2, ang = Math.atan2(C[1] - A[1], C[0] - A[0]) + Math.PI / 2;
      f.aoe({ kind: 'rect', x: Math.round(mx - Math.cos(ang) * 125), y: Math.round(my - Math.sin(ang) * 125), angle: ang, len: 250, w: 74 }, delay, dm, { tag: 'azReact:' + e + ':' + e2 });
    };
    // Extreme: Cascading Convergence. The four sigils go off one after another, in the order they light (the lit one is the next to go), and
    // the last blow falls on the clear ground the first Convergence left: the floor between the sigils and the middle. So the party moves
    // onto ground that has already gone off. The order is the same on every pull: it turns over a little each time it comes.
    const CASC = [[0, 1, 2, 3], [2, 1, 0, 3], [1, 0, 3, 2], [3, 2, 1, 0]];
    let cascN = 0;
    const cascade = () => {
      const d = f.ct(7.2), gap = f.ct(2.0), ord = CASC[cascN++ % CASC.length], T = ELS.map((e, i) => d + ord.indexOf(i) * gap);
      f.cast('Cascading Convergence', d, 'conv');
      ord.forEach((i, j) => {
        const e = ELS[i];
        f.afterKeep(j ? d + (j - 1) * gap : 0, () => f.emit({ t: 'roomev', k: 'live', el: e, dur: (j ? gap : d) + 0.2 }));   // (the sigil that is next to go burns)
        f.aoe({ kind: 'circle', x: SIG[e][0], y: SIG[e][1], r: SR }, T[i], dmg.conv, { tag: TAG[e] });
      });
      ELS.forEach((e, i) => lens(i, Math.max(T[i], T[(i + 1) % N]), dmg.lens));
      f.emit({ t: 'roomev', k: 'archmage-cascade', order: ord, gap, dur: d + 3 * gap + 2 });
      // the last blow: the middle and the four diagonals, laid as the third sigil goes, landing a moment after the fourth
      f.afterKeep(d + 2 * gap, () => {
        const dl = gap + 1.8, sh = (x, y, r) => f.aoe({ kind: 'circle', x, y, r }, dl, dmg.settle, { tag: 'azReact:fire:void', ddown: true });
        sh(0, 0, 95);
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) sh(sx * 283, sy * 283, 140);
      });
    };
    const convergence = () => {
      if (X) return cascade();
      const d = f.ct(7.2), group = new Set();
      f.cast('Convergence', d, 'conv');
      f.emit({ t: 'roomev', k: 'conv', dur: d + 0.6 });
      for (const e of ELS) f.aoe({ kind: 'circle', x: SIG[e][0], y: SIG[e][1], r: SR }, d, dmg.conv, { tag: TAG[e], group });
      ELS.forEach((e, i) => lens(i, d, dmg.lens));
    };
    // Sigil Flare: two neighbouring sigils light and blast together, with the lens between them. Convergence on a small scale, so the
    // finale is a shape the party has met. Hard: the opposite pair follows, so the half of the floor that was safe is the next one lit
    const sigilFlare = () => {
      const d = f.ct(4.8), gap = f.ct(H ? 2.5 : 3), k = f.pick([0, 1, 2, 3]);
      f.cast('Sigil Flare', d, 'conv');   // (the staff lifts as for Convergence)
      const pair = (i, delay) => {
        const group = new Set();
        f.afterKeep(delay === d ? 0 : d, () => f.emit({ t: 'roomev', k: 'flare', els: [ELS[i], ELS[(i + 1) % N]], dur: (delay === d ? d : gap) + 0.6 }));   // (the two sigils glow until they go)
        for (const j of [i, (i + 1) % N]) f.aoe({ kind: 'circle', x: SIG[ELS[j]][0], y: SIG[ELS[j]][1], r: SR }, delay, dmg.flare, { tag: TAG[ELS[j]], group });
        lens(i, delay, dmg.flens);
      };
      pair(k, d);
      if (H) pair((k + 2) % N, d + gap);
    };

    // --- Hard only -----------------------------------------------------------------------------------------------------
    // Counterspell: what the last spell covered comes again, thrown through the middle to the far side of the room
    const counterspell = () => {
      const d = f.ct(3), dd = f.ct(3.7);   // (the far side of the room is a run away, and the echo lands soon after the cast)
      f.cast('Counterspell', d, 'counter');
      const m = mem && f.t - mem.at < 30 ? mem : null;
      if (!m) return;
      const flip = s => { const o = Object.assign({}, s); o.x = -s.x; o.y = -s.y; if (s.angle != null) o.angle = s.angle + Math.PI; return o; };
      const group = new Set(), n = f.alive().length;
      for (const e of m.list.slice(0, 3)) {   // (at most three shapes come back)
        if (e.type === 'stack') f.mech({ type: 'stack', shape: flip(e.shape), delay: dd, dmg: e.dmg * 0.9, need: n, tag: e.tag, color: 'echo' });   // (color: only the drawing reads it: an echo of the last spell)
        else f.aoe(flip(e.shape), dd, dmg.counter, { tag: e.tag, group, color: 'echo' });
      }
      // ... and the echo of the echo: the first two shapes come back to where they began a moment after the far side has gone off
      const back = new Set();
      for (const e of m.list.slice(0, 2)) if (e.type !== 'stack') f.aoe(Object.assign({}, e.shape), dd + f.ct(2.1), dmg.counter * 0.85, { tag: e.tag, group: back, color: 'echo' });
    };
    // Arcane Mark: one hero's own elemental rises where they stood: a blow for everyone to share, on that spot
    const arcaneMark = () => {
      const al = f.alive(); if (!al.length) return;
      const t = f.pick(al);   // (the tank too)
      const el = f.pick(ELS), d = f.ct(5.6), n = f.alive().length;
      f.cast('Arcane Mark', f.ct(2.4), 'mark');
      f.mech({ type: 'stack', shape: { kind: 'circle', x: Math.round(t.x), y: Math.round(t.y), r: 130 }, delay: d, dmg: dmg.mark * Math.min(n, 4) / 4, need: n, tag: 'azMark:' + el });
    };

    // --- the acts ------------------------------------------------------------------------------------------------------
    // (an act opens 5 s after the last step of the one before, or after the gate when a party pushes through it, so its first cast never
    // cuts the last one's bar. The Bursts keep their old places: a Burst takes most of a hero's health, so they stay well apart)
    // Each act opens under a named cast of its own: the floor turns to the act's element (a room change the clients draw, the sigil of the
    // element lit), then the act's first move, about as late as before
    const turn = (el, name) => () => {
      const d = f.ct(3);
      f.cast(name, d, 'conv');
      if (el === 'all') f.emit({ t: 'roomev', k: 'flare', els: ELS, dur: d + 0.6 }); else f.emit({ t: 'roomev', k: 'live', el, dur: d + 0.4 });
      f.emit({ t: 'roomev', k: 'archmage-circle', el, dur: d + 0.6 });
    };
    const CONV = X ? 'Cascading Convergence' : 'Convergence';
    const runeS = (gap, el, o) => S(...runeSet(gap, el, o));
    const withCounter = (steps, after = 6.2) => S(...steps, H && [after, counterspell, 'Counterspell']);

    // I. Fire
    const close1 = [[10, lance, 'Arcane Lance'], [10, burst, 'Arcane Burst'], [10, pyre, 'Pyre Rings']];
    const fire1 = from => f.course({
      onStart: () => { actEl = 'fire'; unpair(); },
      until: 0.78, push: true,
      sets: mix([S([1.5, turn('fire', 'Circle of Fire'), 'Circle of Fire'], [3.5, burst, 'Arcane Burst']), brandIn('fire', S([g(12), pyre, 'Pyre Rings']), H ? 4.5 : 4.8)], [
        S([g(12), lance, 'Arcane Lance']),
        H ? brandIn('fire', withCounter(runeSet(g(12), 'fire'))) : withCounter(runeSet(g(12), 'fire')),   // (Hard: this long chain, the act's longest with no tank beat, takes a Brand)
        X ? brandIn('fire', S([g(12), weave, 'Spellweave'])) : brandIn('fire', S([g(12), pyre, 'Pyre Rings'])),   // (Extreme: Spellweave, alone, in the place of a Pyre Rings set)
        S([g(12), lance, 'Arcane Lance'], [7.5, burst, 'Arcane Burst']),
        H ? runeS(g(12), 'fire', { swap: true }) : brandIn('fire', runeS(g(12), 'fire', { swap: true }), 4.8),
      ], [brandIn('fire', S([g(12), burst, 'Arcane Burst']))], [], close1, 'fire', [0, 1, 4], 2),   // (the act ends on a Burst, so no Burst opens its closing passes: an act's script must last as long as it did, or a party meets the closing passes' extra damage before the gate)
      closing: close1,
      next: frost1,
    }, from);

    // II. Frost
    const close2 = [[10, burst, 'Arcane Burst'], [10, lance, 'Arcane Lance'], [10, iceLances, 'Ice Lances']];
    const frost1 = from => f.course({
      onStart: () => { actEl = 'frost'; unpair(); },
      until: 0.55, push: true,
      sets: mix([S([1.8, turn('frost', 'Circle of Frost'), 'Circle of Frost'], [3.7, iceLances, 'Ice Lances'])], [
        S([g(12), lance, 'Arcane Lance']),
        X ? brandIn('frost', S(...clockSet(g(12), 'pair'))) : runeS(g(12), 'frost'),   // (Extreme: the Runic Clock, the together pair first, in the place of a rune set)
        H ? brandIn('frost', S([g(12), pyre, 'Pyre Rings'], [8, iceLances, 'Ice Lances'])) : S([g(12), pyre, 'Pyre Rings'], [8, iceLances, 'Ice Lances']),
        brandIn('frost', H ? S([g(12), arcaneMark, 'Arcane Mark']) : S([g(12), burst, 'Arcane Burst'])),   // (Hard: the Mark is a shared blow for everyone, the act's heal check, where Normal has a Burst)
      ], [
        brandIn('frost', withCounter(runeSet(g(12), epick('f2', ['frost', 'fire', 'frost']), { swap: true }))),
        X ? S([g(12), lance, 'Arcane Lance']) : S([g(12), lance, 'Arcane Lance'], [7.5, pyre, 'Pyre Rings']),   // (Extreme: the Pyre Rings after this Lance make room for the Runic Clock)
      ], [], close2, 'frost', [1, 2, 3], 1),
      closing: close2,
      next: bound,
    }, from);

    // The Binding, then III. Lightning
    const close3 = [[10, burst, 'Arcane Burst'], [10, lance, 'Arcane Lance'], [10, leapingBolt, 'Leaping Bolt']];
    const els = f.shuffle(ELS).slice(0, 3);
    const bound = from => f.course({
      onStart: () => { actEl = 'bolt'; unpair(); },
      until: 0.32, push: true,
      sets: mix([
        S([1.8, turn('bolt', 'Circle of Lightning'), 'Circle of Lightning'], [3.7, bindStart, 'The Binding'], [5, () => call(els[0]), 'Call of the Circle'], [8, () => call(els[1]), 'Call of the Circle'], [8, () => call(els[2]), 'Call of the Circle']),
        S([10, burst, 'Arcane Burst']),
      ], [
        S([g(12), leapingBolt, 'Leaping Bolt']),
        X ? brandIn('bolt', S(...clockSet(g(12), 'split'))) : brandIn('bolt', runeS(g(12), 'bolt')),   // (Extreme: the Runic Clock, the apart pair first, in the place of a rune set)
        X ? S([g(12), lance, 'Arcane Lance']) : S([g(12), lance, 'Arcane Lance'], [7.5, leapingBolt, 'Leaping Bolt']),   // (Extreme: the Bolt after this Lance makes room for the Runic Clock)
      ], [
        H ? brandIn('bolt', withCounter(runeSet(g(12), epick('f3', ['bolt', 'frost', 'bolt']), { swap: true }))) : withCounter(runeSet(g(12), epick('f3', ['bolt', 'frost', 'bolt']), { swap: true })),   // (Hard: a Brand rides on this chain, as in the act before, so the dances have room to move)
        brandIn('bolt', S([g(12), burst, 'Arcane Burst'], [8, sigilFlare, 'Sigil Flare'])),
      ], [], null, 'bolt', [0, 1, 2], 1),   // (its tail ends on a Burst and a Flare, so the closing passes' Burst is always near it: nothing to choose)
      closing: close3,
      next: void1,
    }, from);

    // IV. Void (Void Rifts are cut to the one opening it: the second slot, and the closing passes, are a Sigil Flare and a Leaping Bolt now)
    const close4 = [[10, lance, 'Arcane Lance'], [10, burst, 'Arcane Burst'], [10, leapingBolt, 'Leaping Bolt']];
    const void1 = from => f.course({
      onStart: () => { actEl = 'void'; unpair(); },
      until: 0.14, push: true,
      sets: mix([S([1.8, turn('void', 'Circle of the Void'), 'Circle of the Void'], [3.7, voidRifts, 'Void Rifts'])], [
        brandIn('void', S([g(12), leapingBolt, 'Leaping Bolt'], [8, sigilFlare, 'Sigil Flare']), H ? 5.4 : 0),
        S([g(12), lance, 'Arcane Lance']),
        ...(H ? [X ? brandIn('void', S(...weaveRuneSet(g(12), 'void'))) : brandIn('void', S(...runeSet(g(12), 'void'), [8.5, lance, 'Arcane Lance']))] : []),   // (Extreme: Spellweave together with the Rune Pair, in the place of the rune set and Lance)
   // (the act's second Lance: it used to hold the fight's longest stretch with none)
        H ? brandIn('void', S([g(12), burst, 'Arcane Burst'], [8, sigilFlare, 'Sigil Flare']), 5.4) : S([g(12), burst, 'Arcane Burst'], [8, sigilFlare, 'Sigil Flare']),
        ...(H ? [] : [brandIn('void', withCounter(runeSet(g(12), epick('f41', ['void', 'fire', 'void']), { swap: true }))), brandIn('void', S(...runeSet(g(12), 'void'), [8.5, lance, 'Arcane Lance']))]),   // (Normal: the Brand's rune set sits ahead of the second Lance, so no Brand comes straight after a Lance)
      ], [
        ...(H ? [brandIn('void', withCounter(runeSet(g(12), epick('f42', ['void', 'fire', 'void']), { swap: true })))] : []),
        H ? S([g(12), burst, 'Arcane Burst']) : S([12, lance, 'Arcane Lance'], [8.5, burst, 'Arcane Burst']),   // (Normal: a Lance before the last Burst, so the stretch up to the finale has a tank beat in it)
      ], [[-8, 0]], close4, 'void', [0, 1, 2], 2),   // (Act III ended on a Burst and a Sigil Flare eight seconds after it)
      closing: close4,
      next: finale,
    }, from);

    // V. Convergence. It is two courses: the sets up to 6% of his health, and the last Convergence, which opens when he falls under 6%
    // (a party that clears in about 80 s meets it with half a minute still to go; the sets after it only play for a slow party). Then the
    // closing passes until he falls.
    const close5 = [[10, burst, 'Arcane Burst'], [10, convergence, CONV], [10, lance, 'Arcane Lance']];
    const lastAct = from => f.course({
      onStart: () => { actEl = 'any'; unpair(); },
      sets: [S([5, convergence, CONV])],
      closing: close5,
      ramp: 0.08,
    }, from);
    const finale = from => f.course({
      onStart: () => { actEl = 'any'; unpair(); },
      until: 0.06, push: true,
      sets: mix([S([1.8, turn('all', 'The Seven Circles'), 'The Seven Circles'], [3.7, convergence, CONV]), S([g(13), lance, 'Arcane Lance'])], [   // (the Lance after the first Convergence is the finale's sure tank beat)
        X ? brandIn(null, S([g(12), weave, 'Spellweave'])) : runeS(g(12), epick('f51', ELS)),   // (Extreme: Spellweave, alone, in the place of the first rune set)
        H ? brandIn(null, withCounter(runeSet(g(12), epick('f52', ELS), { swap: true }))) : brandIn(null, S([g(12), burst, 'Arcane Burst'])),   // (Hard's long rune chains carry the finale's time: no plain Burst between them)
        H ? brandIn(null, S([g(13), arcaneMark, 'Arcane Mark'], [7, leapingBolt, 'Leaping Bolt'])) : S([g(13), iceLances, 'Ice Lances'], [7, leapingBolt, 'Leaping Bolt']),
      ], [], [[0, 0]], close5, 'finale', [0, 1, 2], 0),   // (Act IV ended on a Burst)
      closing: close5,
      ramp: 0.08,
      next: lastAct,
    }, from);

    fire1(0);

    // every move by name, for tools and testing (window.__game.raidHost.sim.moves.pyre())
    f.moves = { burst, lance, pyre, iceLances, leapingBolt, voidRifts, runeMark, runeSpell, runeSwap, bindStart, call, convergence, sigilFlare, counterspell, arcaneMark, weave };
  },
};

if (typeof module !== 'undefined') module.exports = { AZERATH, AZ };
