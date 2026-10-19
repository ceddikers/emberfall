# Painted item icons

One square PNG per item, named by item key (e.g. `g_cleaver.png`, `bastion_w2.png`). The keys and the art
briefs are in `docs/art/item-icons.md`.

- Plain dark background, no frame: the game adds the rarity frame and tint.
- List every key that has a file in `manifest.json` (a JSON array). Only listed keys are loaded; anything
  else keeps its code-drawn icon.
