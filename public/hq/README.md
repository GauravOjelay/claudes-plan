# HQ boardroom backgrounds

Put generated boardroom images here. The HQ screen uses them as the background, adds the company
logo on the back wall and table, and adds gentle motion. Only use images the team made (AI image
generator) or that are free to use (e.g. Unsplash/Pexels licence).

Names: `boardroom-1.jpg` ... `boardroom-6.jpg` (16:9, at least 1920x1080, JPG under ~500 KB each).
Prompts that work: see `references/hq-image-prompts.md`.

## One photo per city
Name a city's own photo `boardroom-<cityId>.jpg` (e.g. `boardroom-paris.jpg`; city ids are in `src/contracts/cities.ts`).
The HQ screen tries that file first and falls back to the mood photo in `manifest.json` when it is missing. Prompts for
the 16 cities that still need one (and the composition rules for the sign panel) are in `references/hq-image-prompts.md`.
