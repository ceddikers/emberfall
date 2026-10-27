// Bridges a class kit (Kit + KITS) to the game world. The local player and bots each get a CombatActor.
// The world object supplies everything scene-specific (town dummies vs. the arena boss):
//   world.now(), world.findEnemy(actor, ab), world.positional(actor), world.allyTarget(actor, ab),
//   world.isDead(id), world.defaultLink(actor), world.partyMods(actor), world.targetMods(actor),
//   world.selfMods(actor), world.recentDamage(actor, secs), world.maxHp(actor), world.moving(actor),
//   world.canAuto(actor) (optional: may auto-attacks fire right now?), world.hpFrac(actor) (optional: current HP 0..1),
//   world.boss(actor) (optional: { casting, castLeft, next, onMe, vuln, selfVuln } for talents that react to the boss),
//   world.onEvent(actor, ev)  <- every kit event (damage, heal, used, castStart, fail...)

class CombatActor {
  // the hero's specialization comes from ent.spec (specs.js); none means the base kit
  constructor(cls, ent, world, rng = Math.random) {
    this.cls = cls; this.ent = ent; this.world = world;
    this.spec = ent.spec || null;
    this.dash = { charges: DASH.charges + ((cls.id === 'thresher' && typeof kitFor === 'function' && (kitFor(cls.id, ent.spec || null, null) || {}).dashPlus) || 0), next: 0 };
    this.dashMax = this.dash.charges;   // (a Phantom's Blink holds one more)
    this.taunt = cls.role === 'tank' && typeof TAUNT !== 'undefined' ? { next: 0 } : null;   // tanks' taunt, on a carrier button (kits.js TAUNT_CARRY)
    const actor = this;
    // the kit with this hero's spec, and any moves its talents grant (TALENT_ABILITIES in kits.js)
    this.kit = new Kit(kitFor(cls.id, this.spec, world.talents ? world.talents(this) : null), {
      now: () => world.now(),
      rng,
      moving: () => world.moving(actor),
      canAuto: () => (world.canAuto ? world.canAuto(actor) : true),
      target: ab => {
        if (ab.target === 'enemy') { const r = actor.kit && actor.kit.def.reach ? actor.kit.def.reach(actor.kit, ab) : null; return world.findEnemy(actor, r ? Object.assign({}, ab, { range: r }) : ab); }   // (def.reach: a Reaper's scythe, longer with Long Reach)
        if (ab.target === 'ally') return world.allyTarget(actor, ab);
        return null;
      },
      positional: () => world.positional(actor),
      partyMods: () => world.partyMods(actor),
      targetMods: () => world.targetMods(actor),
      selfMods: () => world.selfMods(actor),
      gearMods: () => (world.gearMods ? world.gearMods(actor) : null),
      talents: () => (world.talents ? world.talents(actor) : null),   // the talents this hero holds (talents.js); bots hold none
      recentDamage: secs => world.recentDamage(actor, secs),
      maxHp: () => world.maxHp(actor),
      hpFrac: () => (world.hpFrac ? world.hpFrac(actor) : 1),   // your health, 0..1 (Berserker)
      pos: () => ({ x: actor.ent.x, y: actor.ent.y }),            // where you stand (Sigilmancer's circle)
      boss: () => (world.boss ? world.boss(actor) : null),         // what the boss is doing, for talents that react to it (kits.js bossNow)
      isDead: id => world.isDead(id),
      allyHp: id => (world.allyHp ? world.allyHp(id) : null),     // an ally's health, 0..1, or null if unknown (the Alembist's Throw glow and Magnum Opus charge)
      defaultLink: () => world.defaultLink(actor),
      refundDash: () => actor.refundDash(world.now()),            // a kit giving back a dash charge (Driftblade's Hook Turn)
      emit: ev => world.onEvent(actor, ev),
      // hidden recipes this hero has found, and finding a new one (the Volatile's Reactions); null: knows them all (bots)
      known: () => (world.known ? world.known(actor) : null),
      discover: id => { if (world.discover) world.discover(actor, id); },
      // classes-c (kits.js): where you aim (the cursor, or a bot's chosen spot), pushing a point out of solid props, a
      // Threadweaver's threads ({ me, l: [[a, b, length]] }, null without a host) and reporting a Marionettist's Dolls
      aim: () => (world.aim ? world.aim(actor) : null),
      human: () => !!world.picked,
      picked: () => (world.picked ? world.picked(actor) : world.findEnemy(actor, { target: 'enemy', range: 2000 })),   // bots have no clicked target: the nearest enemy
      enemiesNear: range => (world.enemiesNear ? world.enemiesNear(actor, range) : null),   // every enemy (boss, adds) within `range` of the edge: [{ id, x, y, r }] (a Thresher's wide arc)
      collide: (o, r) => { if (world.collide) world.collide(actor, o, r); },
      threads: () => (world.threads ? world.threads(actor) : null),
      dolls: list => { if (world.dolls) world.dolls(actor, list); },
      lamps: list => { if (world.lamps) world.lamps(actor, list); },
      allies: () => (world.allies ? world.allies(actor) : null),   // the living party, you too: [{ id, hp 0..1 }] (Lantern Festival hangs a lantern over each)   // a Lanternkeeper's lanterns (kits.js lkShare; the host heals with them)
      hounds: list => { if (world.hounds) world.hounds(actor, list); },   // a Houndmaster's hounds (kennel.js draws them; the host damages them with telegraphs)
      bossFace: enemy => (world.bossFace ? world.bossFace(actor, enemy) : Math.PI / 2),   // the facing of the enemy a Houndmaster works (its hounds' left and right are the boss's own)
      shift: () => (world.shift ? !!world.shift(actor) : false),   // Shift held at the press (Whistle: Flank sends the other hound)
      danger: (x, y, within) => (world.danger ? world.danger(actor, x, y, within) : false),   // a telegraph landing on a spot within `within` s (Pirouette's glow)
      // a tank pressed its taunt carrier (kits.js TAUNT_CARRY): the world taunts if the taunt is ready and the enemy
      // (the move's target, or the one you face) is on someone else
      taunt: tg => (actor.taunt && actor.tauntReady(world.now()) && world.taunt ? world.taunt(actor, tg) : false),
      inCombat: () => (world.inCombat ? world.inCombat(actor) : null),   // (the Ultimate's trickle: engine.js ultTick)
    });
  }
  refundDash(now) {
    this.dashReady(now);
    if (this.dash.charges >= this.dashMax) return false;
    this.dash.charges++;
    if (this.dash.charges >= this.dashMax) this.dash.next = 0;
    return true;
  }
  get abilities() { return this.kit.abilities; }
  // how much quicker (or slower) the kit has you on your feet right now (a Lone Wolf riding Greyfang: kits.js HDS.SPEED), read by the walk in main.js
  moveMult() { const f = this.kit.def.moveMult; return f ? f(this.kit) : 1; }
  press(i) { return this.kit.press(i); }
  update() { this.kit.update(); }
  notify(type, data) { this.kit.notify(type, data); }
  // the hero went down: the Ultimate keeps part of its charge and an open window ends (engine.js ultDeath)
  onDeath() { this.kit.ultDeath(); }

  dashReady(now) {
    while (this.dash.charges < this.dashMax && this.dash.next && now >= this.dash.next) {
      this.dash.charges++;
      this.dash.next = this.dash.charges < this.dashMax ? this.dash.next + DASH.cd : 0;
    }
    return this.dash.charges > 0;
  }
  useDash(now, info) {
    if (!this.dashReady(now)) return false;
    this.dash.charges--;
    if (!this.dash.next) this.dash.next = now + DASH.cd;
    this.kit.itemHook('dash');   // item effects that fire on a dash
    if (this.kit.def.onBlink) this.kit.def.onBlink(this.kit, info);   // (a Reaper's Blink: where from and to, and whether it went through a telegraph)
    return true;
  }
  dashFraction(now) { return this.dash.next ? Math.max(0, (this.dash.next - now) / DASH.cd) : 0; }

  tauntReady(now) { return !!this.taunt && now >= this.taunt.next; }
  // starts the cooldown and gives the class's own part of it (Resolve and a counter, Blood, a Rune: TAUNT in kits.js)
  useTaunt(now) {
    if (!this.tauntReady(now)) return false;
    this.taunt.next = now + TAUNT.cd;
    const t = TAUNT[this.cls.id];
    if (t && t.use) t.use(this.kit);
    this.kit.stats.taunts = (this.kit.stats.taunts || 0) + 1;
    return true;
  }
  tauntLeft(now) { return this.taunt ? Math.max(0, this.taunt.next - now) : 0; }
}

if (typeof module !== 'undefined') module.exports = { CombatActor };
