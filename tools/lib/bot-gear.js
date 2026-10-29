// Player gear for headless bot fights: the levels (fresh, mid, full, post1..post5) and buildGear. Shared by tools/bot-raid.js and
// tools/comp-sweep.js. The levels and items live in client/js/bot-gear.js (BotGear), which the live game also uses to gear its
// fill-in bots, so a tuning run and a real raid's bots wear the same thing. buildGear's level may be an array (one level per entry);
// FEAST=pie|stew|broth|tarts picks the feast. Needs data.js loaded into the globals first (CLASSES), as both tools do.
const path = require('path');
const { BotGear } = require(path.join(__dirname, '../../client/js/bot-gear.js'));

function buildGear(levelIn, entries) {
  try { return BotGear.build(levelIn, entries, process.env.FEAST || 'pie'); }
  catch (e) { console.error(e.message); process.exit(1); }
}
module.exports = { buildGear, GEN: BotGear.GEN, POST1: BotGear.POST1, POST2: BotGear.POST2, POST3: BotGear.POST3, POST4: BotGear.POST4, POST5: BotGear.POST5, FEASTS_: BotGear.FEASTS };
