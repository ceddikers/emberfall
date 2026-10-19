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
    const actor = this;
    this.kit = new Kit(kitFor(cls.id, this.spec), {
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
      recentDamage: secs => world.recentDamage(actor, secs),
      maxHp: () => world.maxHp(actor),
      hpFrac: () => (world.hpFrac ? world.hpFrac(actor) : 1),   // your health, 0..1 (Berserker)
      pos: () => ({ x: actor.ent.x, y: actor.ent.y }),            // where you stand (Sigilmancer's circle)
      isDead: id => world.isDead(id),
      defaultLink: () => world.defaultLink(actor),
      emit: ev => world.onEvent(actor, ev),
    });
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
    return true;
  }
  dashFraction(now) { return this.dash.next ? Math.max(0, (this.dash.next - now) / DASH.cd) : 0; }
}

if (typeof module !== 'undefined') module.exports = { CombatActor };
