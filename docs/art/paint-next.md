# Paint next

Each image has one block. Copy the block, paste it into the painter, save the result at the path above it. Icons and items are 256 × 256, class portraits 440 × 440, spec portraits 512 × 512. Folder names are class ids. Paint each class's base portrait first: it sets the face, and the two spec portraits use it as the reference. Tick the checklist at the end, and add nothing to `client/items/manifest.json` before the PNG is in place.

The full style text lives in `icon-prompts.md` (section I for the Kenseier), `item-icons.md` and `hero-portraits.md` if a result drifts. The Houndmaster is not built yet: its icon ids below are the ones the build must use.

---

## Kenseier (tank; folder `kenseier`)

Palette across every Kenseier image: ash grey, charcoal and pale steel, one ember-orange (`#ff8a3d`) accent on the blade's edge and wherever a blow is turned, white-gold (`#ffe2a0`) only for the boss's Posture bar and a Break. The only red is the telegraph stripe on Mikiri Step. The weapon is the ashblade: a long, slightly curved, single-edged blade with a flat ember-orange stripe along the edge, a round charcoal guard and a grip wrapped in ash-grey cord.

### Ability icons

**Ember Cut** → `client/icons/kenseier/cut.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Charcoal background; ash-grey and pale steel, one ember-orange accent (#ff8a3d), white-gold (#ffe2a0) only for the boss's Posture bar. Subject: One long, slightly curved pale blade swept diagonally from the lower left to the upper right with a flat ember-orange stripe along its cutting edge, three tapered ash-grey arc lines trailing behind the stroke, a small spray of five ember-orange sparks flying off the tip; the ember edge is the accent (the taunt rides on this button and reuses this icon). No glow, no gradients, no people, no faces, no hands, no text, no border, no samurai armour, no ninja, no oni mask, no cherry blossom, no red sun, no kanji, no dragon, no blood.
```

**Deflect** → `client/icons/kenseier/deflect.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Charcoal background; ash-grey and pale steel, one ember-orange accent (#ff8a3d), white-gold (#ffe2a0) only for the boss's Posture bar. Subject: A long pale blade rising from the lower left and meeting a dark spiky claw of three talons coming down from the upper right, at the point of contact a bold flat white-orange starburst of spark lines with a thin ring round it, the claw knocked a little off line; the spark is the only bright accent. No glow, no gradients, no people, no faces, no hands, no text, no border, no samurai armour, no ninja, no oni mask, no cherry blossom, no red sun, no kanji, no dragon, no blood.
```

**Mikiri Step** → `client/icons/kenseier/mikiri.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Charcoal background; ash-grey and pale steel, one ember-orange accent (#ff8a3d), white-gold (#ffe2a0) only for the boss's Posture bar. Subject: A bold flat stripe of red (#c43a30, the telegraph) running across the whole square from left to right, and two ash-grey bare footprints stepping straight up the square across the stripe, the stripe unbroken and drawn behind them, the nearer print larger, three small ember dust puffs at the back; the stripe is the only red. No glow, no gradients, no people, no faces, no hands, no text, no border, no samurai armour, no ninja, no oni mask, no cherry blossom, no red sun, no kanji, no dragon, no blood.
```

**Deathblow** → `client/icons/kenseier/deathblow.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Charcoal background; ash-grey and pale steel, one ember-orange accent (#ff8a3d), white-gold (#ffe2a0) only for the boss's Posture bar. Subject: A wide flat bar across the middle of the square, white-gold, split in two halves by a jagged crack, and one long pale blade stroke running diagonally from the lower left to the upper right straight through the crack with a thin white flash along it; the bar is white-gold, the blade ash and steel with an ember edge. No glow, no gradients, no people, no faces, no hands, no text, no border, no samurai armour, no ninja, no oni mask, no cherry blossom, no red sun, no kanji, no dragon, no blood.
```

**Ash Mantle** → `client/icons/kenseier/mantle.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Charcoal background; ash-grey and pale steel, one ember-orange accent (#ff8a3d), white-gold (#ffe2a0) only for the boss's Posture bar. Subject: An ash-grey pleated haori hanging open on its own, empty, as a tall shape with a pointed collar and long sleeves, an ember-orange piping along its hem and lapels, a few ember flecks floating up off it; the piping is the accent. No glow, no gradients, no people, no faces, no hands, no text, no border, no samurai armour, no ninja, no oni mask, no cherry blossom, no red sun, no kanji, no dragon, no blood.
```

**Guard Stance** → `client/icons/kenseier/guard.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Charcoal background; ash-grey and pale steel, one ember-orange accent (#ff8a3d), white-gold (#ffe2a0) only for the boss's Posture bar. Subject: A long pale blade laid flat across the top of the square, below it a small plain round-headed silhouette in pale blue-grey with no face (an ally) crouched under it, a thin ember-orange arc curving over the figure under the blade; the arc is the only accent. No glow, no gradients, no people except the one faceless silhouette, no faces, no hands, no text, no border, no samurai armour, no ninja, no oni mask, no cherry blossom, no red sun, no kanji, no dragon, no blood.
```

### Spec moves

**Iai Stance (Deathblade, replaces Guard Stance)** → `client/icons/kenseier/iai.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Charcoal background; ash-grey and pale steel, one ember-orange accent (#ff8a3d), white-gold (#ffe2a0) only for the boss's Posture bar. Subject: A long sheathed blade held level across the square in a charcoal scabbard with an ash-grey cord, a charcoal gauntlet only (no arm, no body) gripping the hilt at the left, and a thin flat ember-orange line showing in the gap where the blade is half drawn at the guard; calm and still, no sparks. No glow, no gradients, no people, no faces, no bare hands, no text, no border, no samurai armour, no ninja, no oni mask, no cherry blossom, no red sun, no kanji, no dragon, no blood.
```

**Redirect (Warden, replaces Pommel)** → `client/icons/kenseier/redirect.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Charcoal background; ash-grey and pale steel, one ember-orange accent (#ff8a3d), white-gold (#ffe2a0) only for the boss's Posture bar. Subject: A curved pale blade at the lower left turning a blow aside, a bold ash-grey arrow looping from the blade round and back up to the upper right, and riding the arrow a small dark spiky claw shape flung back the way it came with three ember sparks at the turn; the looping arrow is the largest shape. No glow, no gradients, no people, no faces, no hands, no text, no border, no samurai armour, no ninja, no oni mask, no cherry blossom, no red sun, no kanji, no dragon, no blood.
```

### Talent moves

**Whirlwind Slash (replaces Mikiri Step)** → `client/icons/kenseier/whirlwind.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Charcoal background; ash-grey and pale steel, one ember-orange accent (#ff8a3d), white-gold (#ffe2a0) only for the boss's Posture bar. Subject: A long pale blade seen from above in the middle of the square spinning a full circle, three tapered ember-orange arcs trailing round it in a ring of three-quarters of a turn, and two small dark claw shapes at the edge being cut, a few ember sparks; round and open, unlike the footprints of Mikiri Step. No glow, no gradients, no people, no faces, no hands, no text, no border, no samurai armour, no ninja, no oni mask, no cherry blossom, no red sun, no kanji, no dragon, no blood.
```

**Ember Duel (replaces Guard Stance)** → `client/icons/kenseier/duel.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Charcoal background; ash-grey and pale steel, one ember-orange accent (#ff8a3d), white-gold (#ffe2a0) only for the boss's Posture bar. Subject: Two pale blades crossed in an X at the centre with a bold ember-orange spark at their crossing, and under them a row of five evenly spaced round ash-grey beads like a steady beat, the middle bead ember-orange; a thin ring of ember round the crossing. No glow, no gradients, no people, no faces, no hands, no text, no border, no samurai armour, no ninja, no oni mask, no cherry blossom, no red sun, no kanji, no dragon, no blood.
```

### Ultimate

**Thousand Cuts** → `client/icons/kenseier/thousandcuts.png`
```text
Cel-shaded cartoon fantasy game ability icon, one big bold object filling the square, thick dark outline, flat colours with one hard shadow, a thin flat gold rim along its top edge, light from the upper left. Charcoal background; ash-grey and pale steel, one ember-orange accent (#ff8a3d), white-gold (#ffe2a0) only for the boss's Posture bar and a Break. Subject: A round arena floor seen at a slant, a dark ash-grey ellipse with a tight tangle of many thin pale diagonal slash lines crossing over it, in the middle one bold white-gold slash from the lower left to the upper right, ember-orange sparks flung off it, and a white-gold crack running up through the centre of the picture; the tangle is thin and calm, the one gold slash is the largest shape. No glow, no gradients, no people, no faces, no hands, no text, no border, no samurai armour, no ninja, no oni mask, no cherry blossom, no red sun, no kanji, no dragon, no blood.
```

### Items

**Watchman's Ashblade** → `client/items/kenseier_w0.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Long single-edged sword on the diagonal, handle bottom-left, tip top-right. Colours: ash grey, charcoal and pale steel with one ember-orange detail. A plain slightly curved steel blade with a nicked edge, a faded ember-orange stripe like a banked coal, a plain round iron guard, a grip wrapped in frayed grey cord, no shine. No glow, no gradients, no hands, no text, no border, no samurai armour, no kanji, no blood.
```

**Silk-Wrapped Ashblade** → `client/items/kenseier_w1.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Long single-edged sword on the diagonal, handle bottom-left, tip top-right. Colours: ash grey, charcoal and pale steel with one ember-orange detail. A pale-steel blade with a thin ember-orange edge line, a round charcoal guard, the grip wrapped in pale spider-silk cord with a loose strand trailing, a small web etched near the guard. No glow, no gradients, no hands, no text, no border, no samurai armour, no kanji, no blood.
```

**Forgefire Ashblade** → `client/items/kenseier_w2.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Long single-edged sword on the diagonal, handle bottom-left, tip top-right. Colours: ash grey, charcoal and pale steel with one ember-orange detail. A dark forged blade with a hammered ridge and a bright ember-orange edge along its whole length, a thick round charcoal guard with rivets, a short soot-streaked grey-cord grip, a few ember flecks on the steel. No glow, no gradients, no hands, no text, no border, no samurai armour, no kanji, no blood.
```

**Barrow Ashblade** → `client/items/kenseier_w3.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Long single-edged sword on the diagonal, handle bottom-left, tip top-right. Colours: ash grey, charcoal and pale steel with one ember-orange detail. A rain-dark slate-grey blade with a thin ember-orange edge, a round guard of pitted dark stone-grey iron with green-grey moss in its crevices, a damp dark-cord grip, a small notched tassel of grey thread. No glow, no gradients, no hands, no text, no border, no samurai armour, no kanji, no blood.
```

**Ashblade of the Last Watch** → `client/items/kenseier_w4.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Long single-edged sword on the diagonal, handle bottom-left, tip top-right. Colours: ash grey, charcoal and pale steel with one ember-orange detail. A tall elegant pale-steel blade with a graceful curve and a bright ember-orange line burning the whole edge, a round charcoal guard inlaid with a ring of pale ash-white dots, a small dull-brass collar, an ash-grey cord grip with a short white-gold tassel, a faint hairline crack in the steel. No glow, no gradients, no hands, no text, no border, no samurai armour, no kanji, no blood.
```

**Ashblade of the Ninth Cut** → `client/items/kenseier_w8.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Long single-edged sword on the diagonal, handle bottom-left, tip top-right. Colours: ash grey, charcoal and pale steel with one ember-orange detail. A long pale ash-steel blade with nine fine cut-notches in a row along its spine, a bright ember-orange edge, a round charcoal guard with a thin pale sea-green verdigris rim, a grip wrapped in grey cord with nine small knots, a small dull-brass collar; grander than the other blades, one clean bold shape. No glow, no gradients, no hands, no text, no border, no samurai armour, no kanji, no blood.
```

**Ember-Watch Haori** → `client/items/kenseier_a1.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Open pleated haori coat on its own, front view. Colours: ash grey, charcoal and pale steel with one ember-orange detail. A plain ash-grey pleated haori over a short charcoal lacquered shoulder plate, a thin ember-orange piping along the lapels and hem, a charcoal sash knotted at the waist, one scorched patch on the collar. No glow, no gradients, no hands, no text, no border, no samurai armour, no kanji, no blood.
```

**Webweave Haori** → `client/items/kenseier_a2.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Open pleated haori coat on its own, front view. Colours: ash grey, charcoal and pale steel with one ember-orange detail. An ash-grey haori with pale spider-silk web lining at the cuffs and collar, a small web pattern woven across the chest, chitin-dark charcoal shoulder plates, a thin ember-orange piping, a charcoal sash. No glow, no gradients, no hands, no text, no border, no samurai armour, no kanji, no blood.
```

**Stormash Haori** → `client/items/kenseier_a3.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Open pleated haori coat on its own, front view. Colours: ash grey, charcoal and pale steel with one ember-orange detail. A slate-ash haori darkened at the hem as if rain-soaked, wide storm collar, charcoal shoulder plates, a thin blue-white lightning stitch down the centre seam, thin ember-orange piping on the lapels. No glow, no gradients, no hands, no text, no border, no samurai armour, no kanji, no blood.
```

**Gravestill Haori** → `client/items/kenseier_a4.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Open pleated haori coat on its own, front view. Colours: ash grey, charcoal and pale steel with one ember-orange detail. A long ash-white haori dusted with grey grave dust, ragged at the hem, tall charcoal shoulder plates, a small dull-brass clasp at the throat, thin ember-orange piping, a few ember-orange flecks near the hem. No glow, no gradients, no hands, no text, no border, no samurai armour, no kanji, no blood.
```

### Portraits
Paint the base portrait first: attach it as the character reference for the two spec portraits.

**Kenseier** → `client/portraits/kenseier.png`
```text
Cel-shaded 90s fantasy anime portrait, head and shoulders, three-quarter view, clean line art, flat two-tone shading, expressive face, plain one-colour background with one simple shape behind the head. A masked swordsman, tall and lean, no particular age: the lower face under a charcoal cloth mask, only calm dark eyes showing, a pale ash-grey headband with its tails drifting behind, a dark topknot, an ash-grey haori with ember-orange piping over charcoal lacquered shoulder plates, one gauntleted hand raising a long single-edged blade upright beside the face, its ember-orange edge catching a flat spark where something has just glanced off it, flecks of ash drifting past. One small flaw: a nicked edge on the blade and a scorched, mended patch on the haori's collar. Flat charcoal background with a pale ash-grey circle behind the head; ash grey and charcoal in the clothes; accent #ff8a3d only on the blade's edge and the sparks. No glow, no airbrushing, no sparkly eyes, no text, no border.
```

**Deathblade** → `client/portraits/kenseier-deathblade.png`
```text
Cel-shaded 90s fantasy anime portrait, head and shoulders, three-quarter view, clean line art, flat two-tone shading, expressive face, plain one-colour background with one simple shape behind the head. The same masked swordsman as the Kill Stroke: the blade held low and back in both hands as if about to strike, the mask pulled up to the eyes, the ember-orange edge burning brighter with a thin line of flat sparks lifting off the tip, an ember-orange sash knotted at the shoulder streaming behind, the haori tied back; a patient, deadly stance, the eyes narrowed. Flat charcoal background with a few bold diagonal ash-grey bands behind the head; accent #ff8a3d a little stronger, on the edge, the sparks and the sash only. No glow, no airbrushing, no sparkly eyes, no text, no border.
```

**Warden of the Ash** → `client/portraits/kenseier-warden.png`
```text
Cel-shaded 90s fantasy anime portrait, head and shoulders, three-quarter view, clean line art, flat two-tone shading, expressive face, plain one-colour background with one simple shape behind the head. The same masked swordsman as the Turning Blade: a pale ash-white mantle over one shoulder, the blade held level across the front of the body as if turning a blow aside from someone behind, a thin pale curved arc standing off the shoulder like a ward, a flat white-orange spark where the blade meets something, the other hand open and low, the eyes steady; a protective, calm stance. Flat charcoal background with one large pale ash-grey curved arc behind the head; accent #ff8a3d only on the edge and the spark. No glow, no airbrushing, no sparkly eyes, no text, no border.
```

---

## Houndmaster (melee damage; folder `houndmaster`; not built yet)

**Ids the build must use** (icon files go in `client/icons/houndmaster/<id>.png`; add `"howl"` and `"longchase"` to `client/icons/talent-icons.json` when the class is built):

| Button | Move | Id |
|---|---|---|
| Q | Hunting Knife | `knife` |
| W | Whistle: Flank | `flank` |
| E | Pack Finisher | `finisher` |
| R | Whistle: Hold / Pounce | `pounce` |
| D | Call Off | `calloff` |
| F | Mark the Quarry | `quarry` |
| T | Wild Hunt (Ultimate) | `wildhunt` |
| spec | Relay (Pack Leader, replaces Call Off) | `relay` |
| spec | Mount (Lone Wolf, replaces Whistle: Flank) | `mount` |
| spec | Ride Down (Lone Wolf, the dismount that follows Mount) | `ridedown` |
| talent | Howl (replaces Whistle: Flank) | `howl` |
| talent | The Long Chase (replaces Mark the Quarry) | `longchase` |

Items: `houndmaster_w0` to `houndmaster_w4`, `houndmaster_a1` to `houndmaster_a4`. Portraits: `houndmaster`, `houndmaster-packleader`, `houndmaster-lonewolf`.

Palette across every Houndmaster image: moss green, tan leather, ash grey (`#b8b2a8`), one rust-orange (`#c46a3a`) accent. The hounds are lean grey-brown lurchers: narrow muzzles, long legs, thin curved tails, drawn with a few curves. Rust wears a rust collar, Ash an ash-grey collar; Greyfang, the Lone Wolf's one great hound, is bigger and greyer.

### Ability icons

**Hunting Knife** → `client/icons/houndmaster/knife.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Deep moss-green background; tan leather, grey-brown hide and ash-grey, one rust-orange accent (#c46a3a). Subject: One broad-bladed skinning knife swung diagonally from the lower left to the upper right, pale steel blade with a small hard highlight, tan leather-wrapped grip with a dented brass pommel, a rust-orange thong dangling from the pommel, three tapered ash-grey arc lines trailing behind the stroke, three rust-orange flat chips flying off the tip. No glow, no gradients, no people, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

**Whistle: Flank** → `client/icons/houndmaster/flank.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Deep moss-green background; tan leather, grey-brown hide and ash-grey, one rust-orange accent (#c46a3a). Subject: A small tan bone whistle on a short cord at the lower left, two bold curved ash-grey note lines sweeping from it round the right-hand side of the square and ending in a flat arrowhead, a small ash-grey ring at the arrowhead; the whistle is the lowest, smallest shape and the curved arrow the largest. No glow, no gradients, no people, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

**Pack Finisher** → `client/icons/houndmaster/finisher.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Deep moss-green background; tan leather, grey-brown hide and ash-grey, one rust-orange accent (#c46a3a). Subject: The jaws of two lean grey-brown lurchers meeting from the left and the right in the centre of the square, the left muzzle with a rust-orange collar edge at the lower left, the right muzzle with an ash-grey collar edge at the lower right, white teeth meeting on a flat rust-orange starburst of five bold points between them, two short crossing claw lines under it. No glow, no gradients, no people, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

**Whistle: Hold / Pounce** → `client/icons/houndmaster/pounce.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Deep moss-green background; tan leather, grey-brown hide and ash-grey, one rust-orange accent (#c46a3a). Subject: One lean grey-brown lurcher caught mid-leap on the diagonal, forelegs reaching up to the right, hindlegs stretched out behind, a rust-orange collar, a thin curved dotted arc under it and a small flat ash-grey dust ring where it will land at the lower right, three tapered speed lines. No glow, no gradients, no people, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

**Call Off** → `client/icons/houndmaster/calloff.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Deep moss-green background; tan leather, grey-brown hide and ash-grey, one rust-orange accent (#c46a3a). Subject: Two lean grey-brown lurchers, one with a rust collar and one with an ash-grey collar, sprinting side by side from the upper left towards a tan leather boot planted at the lower right, three tapered speed lines behind them, a small round ash-grey ring round the boot; the boot is a plain flat shape, not a person. No glow, no gradients, no people, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

**Mark the Quarry** → `client/icons/houndmaster/quarry.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Deep moss-green background; tan leather, grey-brown hide and ash-grey, one rust-orange accent (#c46a3a). Subject: A bold flat strip of rust-orange cloth tied in a knot round a bare dark branch that angles up from the lower left, the cloth ends fluttering to the right in two curled tips, three small round rust-orange berry-like dots on the branch, a few dark leaf-shapes; the cloth is the only rust-orange shape that is large. No glow, no gradients, no people, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

### Spec moves

**Relay (Pack Leader, replaces Call Off)** → `client/icons/houndmaster/relay.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Deep moss-green background; tan leather, grey-brown hide and ash-grey, one rust-orange accent (#c46a3a). Subject: Two lean grey-brown lurchers facing each other, one with a rust collar on the left and one with an ash-grey collar on the right, two bold curved arrows crossing in an X between them so each hound's arrow ends at the other's place, a small round ash-grey swap ring at the crossing; balanced and symmetrical, unlike Call Off. No glow, no gradients, no people, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

**Mount (Lone Wolf, replaces Whistle: Flank)** → `client/icons/houndmaster/mount.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Deep moss-green background; tan leather, grey-brown hide and ash-grey, one rust-orange accent (#c46a3a). Subject: One huge grey lurcher in full stride from the left to the right filling the square, a small moss-green hunched rider silhouette with a leather cap and no face low on its back, a rust-orange collar and a short rust-orange rein, three long speed lines and two flat ash-grey dust puffs under the paws; the hound is the largest shape. No glow, no gradients, no people except the one faceless silhouette, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

**Ride Down (Lone Wolf, dismount after Mount)** → `client/icons/houndmaster/ridedown.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Deep moss-green background; tan leather, grey-brown hide and ash-grey, one rust-orange accent (#c46a3a). Subject: A huge grey lurcher landing hard at the lower right, forepaws planted, a flat round ash-grey dust ring bursting out from under it, a small moss-green rider silhouette with a leather cap and no face flung forward off its back in a diving arc from the upper left with one long knife pointing down, a bold downward arrow, three rust-orange impact ticks at the landing. No glow, no gradients, no people except the one faceless silhouette, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

### Talent moves

**Howl (replaces Whistle: Flank)** → `client/icons/houndmaster/howl.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Deep moss-green background; tan leather, grey-brown hide and ash-grey, one rust-orange accent (#c46a3a). Subject: The head and neck of a lean grey-brown lurcher in profile at the lower left raised to the sky with its mouth open in a howl, a rust-orange collar, three bold curved ash-grey sound arcs rippling up and to the right in widening rings, a small pale flat moon disc at the upper right; the sound arcs are the largest shapes. No glow, no gradients, no people, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

**The Long Chase (replaces Mark the Quarry)** → `client/icons/houndmaster/longchase.png`
```text
Cel-shaded cartoon fantasy game ability icon, one bold object filling most of the square, thick dark outline, flat colours with one hard shadow, light from the upper left, magic as flat solid shapes. Deep moss-green background; tan leather, grey-brown hide and ash-grey, one rust-orange accent (#c46a3a). Subject: Two lean grey-brown lurchers, one with a rust collar and one with an ash-grey collar, running nose to tail round a big oval track of tan dirt, the oval filling the square with four small round ash-grey marker dots at its quarters, a bold curved arrowhead on the track, speed lines trailing behind the hounds. No glow, no gradients, no people, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

### Ultimate

**Wild Hunt** → `client/icons/houndmaster/wildhunt.png`
```text
Cel-shaded cartoon fantasy game ability icon, one big bold object filling the square, thick dark outline, flat colours with one hard shadow, a thin flat gold rim along its top edge, light from the upper left. Deep moss-green background; tan leather, pale ash-grey, one rust-orange accent (#c46a3a). Subject: A large pale ash-grey full moon at the top with three small craters, under it four ghostly pale ash-white lean lurchers racing across the lower half in a staggered wedge, flat solid shapes with a thin moss-green outline inside the dark outline, a rust-orange collar on the nearest one, one flat curved hunting horn in tan at the lower left, a round dark arena floor seen at a slant under their paws. No glow, no gradients, no people, no faces, no hands, no text, no border, no wolves, no puppies, no guns, no blood.
```

### Items

**Kennel Knife** → `client/items/houndmaster_w0.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Hunting knife on the diagonal, handle bottom-left, tip top-right. Colours: moss green, tan leather and ash grey with one rust-orange detail. A short plain skinning knife with a dull nicked blade, a tan grip wrapped in twine, a dented brass pommel with a rust-orange leather thong tied through it, no shine. No glow, no gradients, no hands, no text, no border, no guns, no blood.
```

**Webcut Skinner** → `client/items/houndmaster_w1.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Hunting knife on the diagonal, handle bottom-left, tip top-right. Colours: moss green, tan leather and ash grey with one rust-orange detail. A curved skinning knife with a pale spider-web pattern etched on the blade, a grip wrapped in pale silk cord, a strand of silk caught on the tip, a small chitin guard, a rust-orange stitch in the sheath-cord at the pommel. No glow, no gradients, no hands, no text, no border, no guns, no blood.
```

**Ember-Forged Skinner** → `client/items/houndmaster_w2.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Hunting knife on the diagonal, handle bottom-left, tip top-right. Colours: moss green, tan leather and ash grey with one rust-orange detail. A heavy dark forged skinner with a hammered ridge, a thin rust-orange line along the whole cutting edge like heated iron, a riveted tan leather grip, a short iron guard, a few flat rust flecks on the blade. No glow, no gradients, no hands, no text, no border, no guns, no blood.
```

**Barrow-Hound Knife** → `client/items/houndmaster_w3.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Hunting knife on the diagonal, handle bottom-left, tip top-right. Colours: moss green, tan leather and ash grey with one rust-orange detail. A slate-grey rain-dark knife with a bone grip carved as a lean hound's head with a rust-orange collar line, moss-green stains in the blade's fuller, a damp dark leather thong, one small chip in the edge. No glow, no gradients, no hands, no text, no border, no guns, no blood.
```

**Knife of the Hollow Hunt** → `client/items/houndmaster_w4.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Hunting knife on the diagonal, handle bottom-left, tip top-right. Colours: moss green, tan leather and ash grey with one rust-orange detail. A long grand hunting knife with a pale grey-white blade and a faint moss-green vein running through it, a crossguard shaped as two small hound heads facing each other, a bone-white grip wrapped in moss-green leather, a small tarnished-gold crown-point pommel, a thin bright rust-orange line along the edge. No glow, no gradients, no hands, no text, no border, no guns, no blood.
```

**Kennelman's Jerkin** → `client/items/houndmaster_a1.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Leather jerkin on its own, front view. Colours: moss green, tan leather and ash grey with one rust-orange detail. A tan leather jerkin laced up the front with rust-orange cord, a grey-brown fur collar, a coil of leash and a small bone whistle on a cord at the belt, a patched shoulder. No glow, no gradients, no hands, no text, no border, no guns, no blood.
```

**Silkhide Jerkin** → `client/items/houndmaster_a2.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Leather jerkin on its own, front view. Colours: moss green, tan leather and ash grey with one rust-orange detail. A tan hide jerkin with pale spider-silk panels at the sides and collar, moss-green piping, chitin buttons, a silk leash looped at the hip, a thin rust-orange stitch along the hem. No glow, no gradients, no hands, no text, no border, no guns, no blood.
```

**Stormhide Jerkin** → `client/items/houndmaster_a3.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Leather jerkin on its own, front view. Colours: moss green, tan leather and ash grey with one rust-orange detail. A slate-darkened hide jerkin rain-soaked at the hem, a wide upturned storm collar in grey-brown fur, a thin blue-white lightning stitch down the centre seam, tarnished buckles, a rust-orange lace at the neck. No glow, no gradients, no hands, no text, no border, no guns, no blood.
```

**Gravehound Jerkin** → `client/items/houndmaster_a4.png`
```text
Cel-shaded cartoon fantasy game item icon, one object centred, thick dark outline, flat colours with one hard shadow, plain dark background with a lighter circle behind it. Leather jerkin on its own, front view. Colours: moss green, tan leather and ash grey with one rust-orange detail. A dark grey-green leather jerkin dusted with ash-grey grave dust, a ragged hem, a small pale bone clasp shaped like a hound's skull at the throat, rust-orange lacing, a short fur mantle worn thin. No glow, no gradients, no hands, no text, no border, no guns, no blood.
```

### Portraits
Paint the base portrait first: attach it as the character reference for the two spec portraits.

**Houndmaster** → `client/portraits/houndmaster.png`
```text
Cel-shaded 90s fantasy anime portrait, head and shoulders, three-quarter view, clean line art, flat two-tone shading, expressive face, plain one-colour background with one simple shape behind the head. A gruff huntsman in his fifties, weathered tan skin, a heavy brow, a crooked nose, grey stubble, narrow patient pale-green eyes, a worn brown leather cap, a moss-green coat with a grey-brown fur collar turned up, a curved hunting horn on a leather cord across his chest, the hilt of a long knife at his hip, a lean grey-brown lurcher's head with a rust-orange collar resting at his left shoulder and another with an ash-grey collar at his right, both calm and half asleep. One small flaw: a split tip on the horn and a stitched tear in the cap. Flat moss-green background with a pale ash-grey circle behind the head; moss green and tan in the clothes; accent #c46a3a only in one collar and the cord. No glow, no airbrushing, no sparkly eyes, no text, no border.
```

**Pack Leader** → `client/portraits/houndmaster-packleader.png`
```text
Cel-shaded 90s fantasy anime portrait, head and shoulders, three-quarter view, clean line art, flat two-tone shading, expressive face, plain one-colour background with one simple shape behind the head. The same gruff huntsman as the Two-Dog Hunt: head up, two fingers at his lips mid-whistle, the horn swinging at his chest, a lean grey-brown lurcher with a rust-orange collar at one shoulder and another with an ash-grey collar at the other, both alert with ears forward and mouths open, the three of them looking the same way; busy, quick and in charge. Flat moss-green background with a pair of bold curved ash-grey whistle-note lines behind the head; accent #c46a3a on the rust collar and the notes only. No glow, no airbrushing, no sparkly eyes, no text, no border.
```

**Lone Wolf** → `client/portraits/houndmaster-lonewolf.png`
```text
Cel-shaded 90s fantasy anime portrait, head and shoulders, three-quarter view, clean line art, flat two-tone shading, expressive face, plain one-colour background with one simple shape behind the head. The same gruff huntsman as the Rider: the coat collar turned up and the cap pulled low, one hand resting in the thick scruff of one great grey hound, Greyfang, a huge lean grey lurcher whose head and shoulders fill the right side of the frame and rise higher than his own, a rust-orange collar, scarred ears, calm yellow-brown eyes, the two of them looking straight ahead; quiet and bonded, no second hound. Flat moss-green background with one large dark round shape behind both heads; accent #c46a3a only on the collar. No glow, no airbrushing, no sparkly eyes, no text, no border.
```

---

## Checklist (48 files)

### Kenseier (24)
- [x] `client/portraits/kenseier.png`
- [x] `client/portraits/kenseier-deathblade.png`
- [x] `client/portraits/kenseier-warden.png`
- [x] `client/icons/kenseier/cut.png`
- [x] `client/icons/kenseier/deflect.png`
- [x] `client/icons/kenseier/mikiri.png`
- [x] `client/icons/kenseier/deathblow.png`
- [x] `client/icons/kenseier/mantle.png`
- [x] `client/icons/kenseier/guard.png`
- [x] `client/icons/kenseier/iai.png`
- [x] `client/icons/kenseier/redirect.png`
- [x] `client/icons/kenseier/whirlwind.png`
- [x] `client/icons/kenseier/duel.png`
- [x] `client/icons/kenseier/thousandcuts.png`
- [x] `client/items/kenseier_w0.png`
- [x] `client/items/kenseier_w1.png`
- [x] `client/items/kenseier_w2.png`
- [x] `client/items/kenseier_w3.png`
- [x] `client/items/kenseier_w4.png`
- [x] `client/items/kenseier_w8.png`
- [x] `client/items/kenseier_a1.png`
- [x] `client/items/kenseier_a2.png`
- [x] `client/items/kenseier_a3.png`
- [x] `client/items/kenseier_a4.png`

### Houndmaster (24)
- [ ] `client/portraits/houndmaster.png`
- [ ] `client/portraits/houndmaster-packleader.png`
- [ ] `client/portraits/houndmaster-lonewolf.png`
- [ ] `client/icons/houndmaster/knife.png`
- [ ] `client/icons/houndmaster/flank.png`
- [ ] `client/icons/houndmaster/finisher.png`
- [ ] `client/icons/houndmaster/pounce.png`
- [ ] `client/icons/houndmaster/calloff.png`
- [ ] `client/icons/houndmaster/quarry.png`
- [ ] `client/icons/houndmaster/relay.png`
- [ ] `client/icons/houndmaster/mount.png`
- [ ] `client/icons/houndmaster/ridedown.png`
- [ ] `client/icons/houndmaster/howl.png`
- [ ] `client/icons/houndmaster/longchase.png`
- [ ] `client/icons/houndmaster/wildhunt.png`
- [ ] `client/items/houndmaster_w0.png`
- [ ] `client/items/houndmaster_w1.png`
- [ ] `client/items/houndmaster_w2.png`
- [ ] `client/items/houndmaster_w3.png`
- [ ] `client/items/houndmaster_w4.png`
- [ ] `client/items/houndmaster_a1.png`
- [ ] `client/items/houndmaster_a2.png`
- [ ] `client/items/houndmaster_a3.png`
- [ ] `client/items/houndmaster_a4.png`
