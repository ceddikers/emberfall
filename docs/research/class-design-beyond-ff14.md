# Research: what makes combat classes fun and deep (outside FF14)

*Compiled by a research agent, 2026-10-19. Sources are linked inline. Items marked (GK) come from general knowledge, not a fetched page.*

## 1. Design theory

- **Bushnell's Law ("easy to learn, difficult to master").** Nolan Bushnell drew it from the failure of *Computer Space*, whose four identical-looking buttons confused new players. A low floor is mostly about **comprehension**: if inputs and UI are legible, the depth can live underneath. https://en.wikipedia.org/wiki/Bushnell%27s_Law
- **Rosewater's "lenticular design".** Mechanics should look simple to novices while hiding depth for experts. His rules:
  - Every ability needs an obvious surface value.
  - Novices don't plan ahead, so "should I hold this?" stays invisible to them while experts exploit it.
  - Never make a newbie feel they have to wait. "Only good if..." abilities fail this test.

  https://magic.wizards.com/en/news/making-magic/lenticular-design-2014-12-15
- **Depth and complexity are separate axes.** "Complex = hard to learn, deep = hard to master." Too much complexity can reduce depth, because players stop noticing their options. https://www.gamedeveloper.com/design/depth-from-complexity-pt-2
- **Riot's skill floor and ceiling.** Champions with high skill floors (Taliyah, Azir) took new players about 50 losses to learn, which Riot considers too much. Yasuo had a ceiling of 1,000+ games of improvement. Riot's target is a low floor with a long skill curve. https://mcvuk.com/development-news/riot-games-taking-play-seriously/
- **Hard numbers on the gap.** WoW's Single-Button Assistant plays a passable rotation and loses only about 2–30% damage depending on spec. So **the GCD filler can be almost automatic; the gap comes from off-GCD weaving, cooldown timing and movement.** https://www.wowhead.com/news/blizzard-reports-overwhelmingly-positive-feedback-with-single-button-assistant-377940
- **Street Fighter 6 "Modern" controls.** A simpler input path costs a modest efficiency tax (about 20% less damage) while the decision layer stays intact. https://caniplaythat.com/2022/06/16/street-fighter-6-game-director-says-modern-control-type-is-by-no-means-an-easy-mode/

## 2. WoW specs players love, and why

- **Fury Warrior.** Rage is spent on Rampage, which triggers Enrage, which speeds up Rage gain. A positive feedback loop.
- **Protection Warrior.** Rage comes from taking damage and is spent on Ignore Pain, so mitigation is a resource rather than a buff you keep up. https://warcraft.wiki.gg/wiki/WoW_Blog/Legion_Class_Preview_Warrior
- **Fire Mage (the best proc design to copy).**
  - A crit grants Heating Up; a second crit grants Hot Streak, which makes Pyroblast instant.
  - Fire Blast is off-GCD and castable mid-cast, so experts *manufacture* the second proc.
  - Combustion guarantees crits during the burst window.

  https://warcraft.wiki.gg/wiki/WoW_Blog/Legion_Class_Preview_Mage
- **Shadow Priest Voidform (Legion).** At full Insanity you enter Voidform, which drains faster and faster, and you fight to extend it. The purest "reward staying in a risky state" gauge. It was later toned down for being punishing (GK).
- **Discipline Priest Atonement.** Damage heals everyone who carries Atonement. Pre-applying it before predictable damage is invisible mastery, which is lenticular design.
- **Brewmaster Monk Stagger.** Hits become a damage-over-time effect, and Purifying Brew charges clear it. The skill is banking charges for known spikes.
- **Windwalker Monk Combo Strikes.** +25% damage for not repeating the previous ability. "More depth from less complexity": one rule, constant micro-decisions.
- **Destruction Warlock.** Pool Soul Shards for burst windows.
- **Assassination and Subtlety Rogue.** Bleeds refund energy; Shadow Dance gives windows of stealth abilities.
- **Outlaw Rogue Roll the Bones.** Divisive: random buffs and "fishing" rerolls feel bad to many players. https://wow.gg/guides/rogue-outlaw

**Why specs get called boring:**
- Static rotations with no procs.
- All the damage packed into one cooldown.
- Randomness you can't steer.
- Walls of cooldown buttons.
- No forgiveness for small mistakes.

**Ghostcrawler:** about four core rotational abilities is the sweet spot; players value rotational additions over strong situational buttons. https://www.engadget.com/2011-04-26-dev-watercooler-ghostcrawler-discusses-the-number-of-player-abi.html

**Ion Hazzikostas:** Legion's pruning went "too far" and focused too much on button count. https://massivelyop.com/?p=230629

## 3. Patterns from other games

- **Lost Ark identity gauges.** Fill a meter by landing skills, then spend it on a transformation or empowered skill. https://maxroll.gg/lost-ark/resources/class-overview
  - Deathblade: tiered orbs, a natural spend-now-or-pool decision.
  - Artist (support): spend on a party damage buff *or* a heal.
- **GW2 Elementalist attunements.** Stance swaps with on-swap triggers hide a big skill ceiling behind "press swap when it's up". https://snowcrows.com/guides/professions/introduction-to-elementalist
- **Doom (2016/Eternal).** Each resource is restocked by a different aggressive action, so sustain comes from aggression. https://www.shacknews.com/article/116635/hell-razer-the-making-of-doom-eternal?page=4
- **Destiny 2 keywords.** Shared verbs (Scorch, Jolt, Weaken) make synergy legible. https://www.bungie.net/en/News/Article/51678
- **Dota's Pudge hook.** Understood instantly, hard to land: one skill shot whose payoff scales with prediction.
- **Hades.** Weapons with different input demands let each player self-select. https://www.rockpapershotgun.com/2020/06/24/how-supergiant-games-made-the-hacknslash-accessible-with-hades/
- **Juice it or lose it (GDC 2012).** Feedback (hit-stop, flashes, sound, particles) makes the basic loop satisfying on its own. https://www.cs.cornell.edu/courses/cs3152/2020sp/communication/critique4.php

## 4. Where pros pull ahead without raising the floor

1. **Off-GCD weaving.** Optional bonuses on top of a complete basic loop.
2. **Proc conversion.** Novices react to the glow; experts manufacture procs.
3. **Pooling for burst windows.** Spending immediately is always fine; pooling for the party buff is the expert multiplier.
4. **Pre-positioning against known damage.** Reacting works; predicting is much stronger. Perfect for a scripted raid.
5. **Sustaining a risky state.** Falling out costs only the bonus.
6. **Sequencing rules.** For example, no repeating the same ability twice in a row.
7. **Uptime under movement.** Instants, procs and charges let you keep attacking while dodging.
8. **Efficiency (no overcap).** Invisible to novices, visible on the meter.

## 5. Pitfalls

- Uncontrollable randomness.
- One cooldown holding half the damage.
- Hidden complexity in the UI.
- Conditional abilities that make novices wait.
- Counting buttons as a measure of depth.
- Overlapping abilities that create trap choices.
