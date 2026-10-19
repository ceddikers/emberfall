// Bridges a class kit (Kit + KITS) to the game world. The local player and bots each get a CombatActor.
// The world object supplies everything scene-specific (town dummies vs. the arena boss):
//   world.now(), world.findEnemy(actor, ab), world.positional(actor), world.allyTarget(actor, ab),
//   world.isDead(id), world.defaultLink(actor), world.partyMods(actor), world.targetMods(actor),
//   world.selfMods(actor), world.recentDamage(actor, secs), world.maxHp(actor), world.moving(actor),
//   world.canAuto(actor) (optional: may auto-attacks fire right now?), world.hpFrac(actor) (optional: current HP 0..1),
//   world.onEvent(actor, ev)  <- every kit event (damage, heal, used, castStart, fail...)

class CombatActor {
  // the hero's specialization comes from ent.spec (specs.js); none means the base kit
  constructor(cls, ent, world, rng = Math.random) {
    this.cls = cls; this.ent = ent; this.world = world;
    this.spec = ent.spec || null;
    this.dash = { charges: DASH.charges, next: 0 };
    this.taunt = cls.role === 'tank' && typeof TAUNT !== 'undefined' ? { next: 0 } : null;   // tanks' taunt on T (kits.js)
    const actor = this;
    // the kit with this hero's spec, and any moves its talents grant (TALENT_ABILITIES in kits.js)
    this.kit = new Kit(kitFor(cls.id, this.spec, world.talents ? world.talents(this) : null), {
      now: () => world.now(),
      rng,
      moving: () => world.moving(actor),
      canAuto: () => (world.canAuto ? world.canAuto(actor) : true),
      target: ab => {
        if (ab.target === 'enemy') return world.findEnemy(actor, ab);
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
      isDead: id => world.isDead(id),
      defaultLink: () => world.defaultLink(actor),
      refundDash: () => actor.refundDash(world.now()),            // a kit giving back a dash charge (Driftblade's Hook Turn)
      emit: ev => world.onEvent(actor, ev),
    });
  }
  refundDash(now) {
    this.dashReady(now);
    if (this.dash.charges >= DASH.charges) return false;
    this.dash.charges++;
    if (this.dash.charges >= DASH.charges) this.dash.next = 0;
    return true;
  }
  get abilities() { return this.kit.abilities; }
  press(i) { return this.kit.press(i); }
  update() { this.kit.update(); }
  notify(type, data) { this.kit.notify(type, data); }

  dashReady(now) {
    while (this.dash.charges < DASH.charges && this.dash.next && now >= this.dash.next) {
      this.dash.charges++;
      this.dash.next = this.dash.charges < DASH.charges ? this.dash.next + DASH.cd : 0;
    }
    return this.dash.charges > 0;
  }
  useDash(now) {
    if (!this.dashReady(now)) return false;
    this.dash.charges--;
    if (!this.dash.next) this.dash.next = now + DASH.cd;
    this.kit.itemHook('dash');   // item effects that fire on a dash
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
