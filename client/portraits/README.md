# Hero portraits (character select only)

Drop one PNG per hero here, named by class id. The select screen picks them up automatically;
any that are missing fall back to the animated in-game sprite.

    bastion.png  bloodreaver.png  runeguard.png
    ranger.png   shadowblade.png  pyromancer.png
    cleric.png   grovekeeper.png  chronomancer.png

Format
- Square head-and-shoulders bust. Base portraits are 440 x 440 (loaded at startup for the hero grid); spec portraits\n  (<class>-<spec>.png) are 512 x 512 and load the first time that hero's page opens.
- Cel-shaded 90s-anime style; the briefs are in docs/art/hero-portraits.md and docs/art/spec-icons.md.
- The game frames them, so no frame or text.
