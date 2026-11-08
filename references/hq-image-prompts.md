# Prompts for HQ boardroom backgrounds (paste into ChatGPT / Gemini / Bing Image Creator / Ideogram)

Settings: 16:9 (landscape), photorealistic. Save as public/hq/boardroom-1.jpg ... boardroom-6.jpg.
Add this line to EVERY prompt: "No text, no logos, no brand names anywhere. Leave a plain, empty dark wall
panel above the windows in the centre (for a company logo). Faces small and not the focus."

1. Photorealistic corporate boardroom at golden hour on a high floor, floor-to-ceiling windows, glowing
   San Francisco-style skyline and bay behind, long glossy dark wood conference table, black leather chairs,
   six executives in suits, one standing presenting, linear strip lights on the ceiling, warm cinematic light.
2. Photorealistic modern boardroom at night in a dense Asian megacity, neon-lit skyscrapers through
   floor-to-ceiling windows, black glass table with reflections, executives seated, cool blue and magenta
   light, light rain on the windows, cinematic.
3. Photorealistic bright minimalist European boardroom by day, overcast sky, historic city rooftops and a
   river through tall windows, pale oak table, white chairs, five people in a meeting, soft daylight.
4. Photorealistic luxury boardroom at sunset in a Gulf city, desert haze, supertall towers through the
   windows, marble table, gold accents, executives in a meeting, warm orange light.
5. Photorealistic New York style boardroom at dusk, Manhattan skyline with lights coming on, long oval
   table, leather chairs, seven executives, one presenting at a screen, moody cinematic colour grading.
6. Photorealistic tech-startup boardroom at blue hour, concrete and glass, plants, city lights below,
   white table, casual-smart people around a laptop, soft ambient light.


---

# One photo per city (task: matching HQ photo for every city)

The HQ screen loads `public/hq/boardroom-<cityId>.jpg` first and falls back to the closest of the five existing
photos when that file is missing. `dubai`, `london` and `tokyo` already have their own photo, so the 16 cities below
are the ones still to generate. Save each result with the exact file name shown (16:9, at least 1920x1080, JPG under
about 500 KB; if it is a PNG, convert it) and drop it in `public/hq/`. No code change is needed.

**Add this paragraph to EVERY prompt below:**

> Photorealistic, 16:9 landscape, cinematic. No text, no letters, no logos, no brand names, no signage anywhere.
> Composition rules: in the UPPER RIGHT of the picture (roughly 60% to 86% across, 16% to 40% down) there is a plain,
> flat, empty wall or glass panel with nothing on it and no windows in front of it (a company sign will be placed
> there). The LEFT quarter of the picture is calm and uncluttered (a stats panel will cover it). The conference table
> fills the lower half, with a clear empty stretch of table top in the lower centre. A few people sit around the table
> and one stands presenting, small in the frame; faces are not the focus. The city skyline is visible through
> floor-to-ceiling windows in the centre and left of the picture.

Each line names the real skyline and landmarks (so the picture says "this is that city") and the setting, light and mood.

| File name | City | Prompt (put the paragraph above after it) |
|---|---|---|
| `boardroom-sf.jpg` | San Francisco | Boardroom on a high floor in San Francisco's financial district at golden hour: the Golden Gate Bridge and a low bank of fog in the distance, the Bay with the Bay Bridge, a pointed pyramid-shaped tower and a tall tapered glass tower in the skyline, steep hills. Warm light, dark wood table, black leather chairs. |
| `boardroom-nyc.jpg` | New York | Boardroom on a high floor in Manhattan at dusk: the Empire State Building, the One World Trade tower and the Hudson River with lights coming on, dense grid of towers, yellow cabs as tiny dots far below. Long oval table, leather chairs, moody blue-orange light. |
| `boardroom-mexicocity.jpg` | Mexico City | Boardroom above Paseo de la Reforma in Mexico City in the late afternoon: the Torre Latinoamericana, a row of glass towers along the avenue, the green treetops of Chapultepec park, and the snow-capped volcano Popocatepetl faint in the haze on the horizon. Warm terracotta and walnut interior, golden-pink light. |
| `boardroom-saopaulo.jpg` | São Paulo | Boardroom on a high floor in São Paulo at dusk: a vast dense skyline of concrete towers stretching to the horizon, the cable-stayed Octavio Frias bridge with its X-shaped mast on the right, grey-pink hazy sky, tropical plants in the room. Warm wood, concrete and green accents. |
| `boardroom-paris.jpg` | Paris | Elegant boardroom in Paris on an overcast morning: the Eiffel Tower in the distance, cream Haussmann rooftops with zinc roofs and chimney pots, the Seine curving through, the golden dome of Les Invalides. Herringbone parquet, pale oak table, soft daylight. |
| `boardroom-munich.jpg` | Munich | Boardroom in Munich on a clear autumn afternoon: the twin onion-domed towers of the Frauenkirche over red-tiled roofs, the Olympic Tower and the tent-roof of Olympiapark, the Alps as a blue line on the horizon. Light timber and glass, precise and tidy, crisp daylight. |
| `boardroom-moscow.jpg` | Moscow | Boardroom in Moscow at winter dusk: the glass skyscrapers of the Moscow City business district beside the frozen Moskva river, snow on the roofs, the onion domes and red-brick towers of the old city glowing in the distance. Dark panelled walls, long table, warm lamps against a blue twilight. |
| `boardroom-beijing.jpg` | Beijing | Boardroom in Beijing's central business district at dawn: the unusual looped shape of the big television-headquarters building, a tall vase-shaped skyscraper, wide ring roads with early traffic, pale haze, and curved temple roofs far in the distance. Black stone table, red-lacquer accents, cool dawn light. |
| `boardroom-singapore.jpg` | Singapore | Boardroom in Singapore at night: the three towers topped by a ship-shaped sky park at Marina Bay, the giant tree-like Supertrees of the gardens, a big observation wheel, the harbour full of cargo ships and the water glittering. Tropical plants in the room, glass table, teal and gold lights. |
| `boardroom-bangalore.jpg` | Bengaluru | Boardroom in Bengaluru in the monsoon season: glass tech-park towers rising out of a canopy of green trees, a grand granite government building with a domed centre in the distance, heavy grey-silver clouds with a break of sunlight. Warm teak, plants, soft humid light. |
| `boardroom-cairo.jpg` | Cairo | Boardroom in Cairo at sunset: the Nile with feluccas, a tall lotus-shaped lattice tower on an island, minarets and domes of the old city, and the faint triangles of the Giza pyramids on the dusty golden horizon. Sandstone and dark wood, brass lamps, warm amber light. |
| `boardroom-lagos.jpg` | Lagos | Boardroom in Lagos at sunset: the lagoon with fishing boats and canoes, a long bridge crossing the water, the tall modern towers of Victoria Island and Eko Atlantic on the shore, the ocean beyond, humid orange haze. Bright patterned fabrics on the chairs, warm wood table, lively colours. |
| `boardroom-seattle.jpg` | Seattle | Boardroom in Seattle on a clear evening after rain: the saucer-topped Space Needle, the green ferries on Puget Sound, a distinctive old tower among the glass towers, and snow-capped Mount Rainier glowing pink on the horizon. Timber, glass and green plants, cool damp light with warm lamps. |
| `boardroom-austin.jpg` | Austin | Boardroom in Austin at golden hour: the pink-granite Texas State Capitol dome at the end of a wide avenue, glass towers of downtown, a long bridge over a calm lake with kayaks, big live oak trees. Warm timber and leather, relaxed and sunny. |
| `boardroom-stockholm.jpg` | Stockholm | Boardroom in Stockholm in the late-afternoon Nordic light: the copper spires and ochre buildings of the old island town, a red-brick city hall tower on the waterfront, sailboats and ferries on the bright water between islands. Pale birch wood, white walls, wool throws on the chairs, calm and minimal. |
| `boardroom-hangzhou.jpg` | Hangzhou | Boardroom in Hangzhou on a misty morning: the still West Lake with willows and a small arched stone bridge, a slender old pagoda on a green hill, and modern glass towers and a lotus-shaped stadium along the river in the distance, soft mist over bamboo hills. Pale bamboo and jade accents, serene silvery light. |

After adding a photo, check the sign is not cut off by the stats panel: open that city's HQ at 1280x720. If the blank
panel is somewhere else in the picture, set its position in `CITY_PHOTO_LAYOUT_OVERRIDES` in `src/ui/PhotoBoardroom.tsx`.
