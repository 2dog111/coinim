# IMG-2 Acceptance Report

All six final images were generated as complete scenes, including handwriting and, for letter 10, the response-card print. No text was added or repaired programmatically.

## Letter 7

- File: `assets/img2-letter-07-soil-sachet.webp`
- Attempts: 1
- Manual transcription: `Mr Ferreira — The sachet holds forty grams of the plot itself, taken eleven metres in from the road. It is dry, pale and full of shell. That tells you more about what it will cost to build there than the survey does, and the survey`
- COPY: `Mr Ferreira — The sachet holds forty grams of the plot itself, taken eleven metres in from the road. It is dry, pale and full of shell. That tells you more about what it will cost to build there than the survey does, and the survey`
- Comparison: exact match; final word `survey`, no full stop.

## Letter 8

- File: `assets/img2-letter-08-fabric.webp`
- Attempts: 1
- Manual transcription: `Ms Lindqvist — Sewn above is the fabric your supplier calls heavy-duty. Rub it between finger and thumb for three seconds. Whatever word you have just thought of, it was not heavy-duty, and that word is the one I would like to talk about.`
- COPY: `Ms Lindqvist — Sewn above is the fabric your supplier calls heavy-duty. Rub it between finger and thumb for three seconds. Whatever word you have just thought of, it was not heavy-duty, and that word is the one I would like to talk about.`
- Comparison: exact match.

## Letter 9

- File: `assets/img2-letter-09-map.webp`
- Attempts: 1
- Manual transcription: `Mr Bhatt — The scrap glued below is one square mile around your third site, cut from a survey sheet printed in 1974. Everything on it that mattered then still matters now, except one road, and that road is why your delivery radius`
- COPY: `Mr Bhatt — The scrap glued below is one square mile around your third site, cut from a survey sheet printed in 1974. Everything on it that mattered then still matters now, except one road, and that road is why your delivery radius`
- Comparison: exact match; final word `radius`, no full stop. Map markings are visual cartographic detail, not readable labels.

## Letter 10

- File: `assets/img2-letter-10-response-card.webp`
- Attempts: 1
- Manual transcription, letter: `Ms Aguirre — The card below carries three lines and a stamp already paid. Tick one and post it; that is the whole ask. I have made it this easy because the third line is the one I actually want, and it says: wrong person, try`
- COPY, letter: `Ms Aguirre — The card below carries three lines and a stamp already paid. Tick one and post it; that is the whole ask. I have made it this easy because the third line is the one I actually want, and it says: wrong person, try`
- Manual transcription, card: `Call me` / `Not now. Try in` / `Wrong person. Try`
- COPY, card: `Call me` / `Not now. Try in` / `Wrong person. Try`
- Comparison: exact match for letter and all three card lines; letter ends at `try`, no full stop.

## Letter 11

- File: `assets/img2-letter-11-seeds.webp`
- Attempts: 1
- Manual transcription: `Mr Castellan — The packet holds sixty days of nothing, and then a plant. I sent it because I am about to make you an offer with exactly that shape, and I would rather you saw the shape now than found out in week three that I had`
- COPY: `Mr Castellan — The packet holds sixty days of nothing, and then a plant. I sent it because I am about to make you an offer with exactly that shape, and I would rather you saw the shape now than found out in week three that I had`
- Comparison: exact match; final word `had`, no full stop.

## Letter 12

- File: `assets/img2-letter-12-hourglass.webp`
- Attempts: 1
- Manual transcription: `Ms Nakamura — The glass taped above runs for three minutes. Turn it over and read on. If I have not earned the rest by the time the sand is down, throw this away. I have put myself on a clock because your quarter closes in`
- COPY: `Ms Nakamura — The glass taped above runs for three minutes. Turn it over and read on. If I have not earned the rest by the time the sand is down, throw this away. I have put myself on a clock because your quarter closes in`
- Comparison: exact match; final word `in`, no full stop.

## Technical Acceptance

- Final dimensions: 1600 x 2000 pixels, 4:5 portrait.
- Final format: WebP.
- Every image is below 700 KB.
- Whole-scene generation tool: built-in OpenAI ImageGen.
- Format conversion and proportional resize: `cwebp`.
- Visual inspection: Codex image viewer.
- Text-rendering libraries, fonts, canvas, SVG, CSS, PIL, and compositing tools used: none.
- Text shortening: none.

## Final Prompt Set

Each prompt used the unchanged IMG-2 scene and object specification, the corresponding COPY block verbatim, and these shared constraints: complete one-pass generated scene including text; overhead 4:5 framing; walnut table at least 30%; sharp-cornered unlined cream laid paper; left directional light; blue English calligraphic cursive; no other readable text, hands, cups, devices, logos, ruling, or watermark.
