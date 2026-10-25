# Berke Akyıldız — portfolio

Static site. No build step, no dependencies: open `index.html` through any static
server (`python -m http.server`) or publish the folder to GitHub Pages as is.

```
index.html                  home: opening, four projects, a short about
hakkimda/index.html         about and CV (#ozgecmis)
isler/<project>/index.html  one short page per project: recordings, brief, how it works, numbers
cv/index.html               redirect to hakkimda/#ozgecmis (keeps the old /cv/ link alive)
404.html                    GitHub Pages not-found page (root-absolute paths)
assets/site.css             the whole design
assets/site.js              language switch, recordings, flows, galleries, scenario player, light on the water
assets/shots/<project>/     recordings, posters and screenshots, each with a -thumb
assets/leaves-*.svg         olive-leaf silhouettes for the shade in the top corner
assets/favicon.svg          an arch with the sea in it
```

## Two languages

Every page carries English and Turkish side by side and shows one of them.
English is the default; the EN / TR button switches, the choice is kept in
`localStorage`, and `?lang=tr` in a link opens Turkish.

- Text: a pair of siblings, `<span data-l="en">…</span><span data-l="tr">…</span>`
  (in SVG, `<tspan data-l>`). CSS hides the one not in use from `<html data-lang>`.
- Attributes: `data-en-label` / `data-tr-label` set `aria-label`,
  `data-en-alt` / `data-tr-alt` set `alt`, `data-title-tr` on `<html>` the title.
- A scenario step's small-line rewrite: `data-state` (English) and `data-state-tr`.
- Strings the script writes itself (Play, Pause, …) live in `T` in `site.js`.
- Each page's head starts with the same one-line script that picks the language
  before the first paint.

## Design notes

- Palette: limestone in shade (`#e9e3d7`), dark ink, a field of Riviera blue
  (`#1d4673`) at the end of every page, clay (`#b0573a`) for small marks only.
- Type: Newsreader, set large and light for the few display lines; IBM Plex Mono
  for data. Sections are numbered and ruled; labels hang in a left margin.
- Motion stops off screen and switches off under `prefers-reduced-motion`.
- Home page, per project: a muted recording that plays only while on screen
  (`.stage .screen`, with a pause button and a progress hairline), a `.flow`
  strip (the system's parts left to right, a pulse running through them, a
  caption saying what happens at each; parts with `data-model` are where a model
  works), then three measured figures. Second Brain OS has no recording, so its
  stage is an illustrative terminal session (`.term`), typed out line by line.
- Project pages: a `.gallery` (one slide large, thumbnails from each slide's
  `data-thumb`; stills open full size), a four-line brief, the *How it works*
  figure, numbers.
- *How it works* (`figure.arch`): the system drawn once as inline SVG, with a few
  real scenarios played over it. Parts are `<g data-node="id">` (a `.box` or
  `.person`, a `.nm` name, a `.sub` line); connections are
  `<path data-edge="a b">`, drawn centre to centre under the parts. Each scenario
  is a `.arch-scene` with a name and an `<ol>`; a step's `data-route="a b c"`
  names the parts the dot passes (`"a b | a c"` sends one dot per branch),
  `data-tone="reply"` makes it an answer, `data-state="b: …"` rewrites a part's
  small line, `data-stop="0.6"` ends on a `.ghost` connection with a cross (a way
  that does not exist). Without JS it is a still drawing and a numbered list;
  under reduced motion the reader steps through it.
- Preview clips are cut from each project's own demo with ffmpeg (H.264, no
  audio, `faststart`); keep each under ~1.5 MB.
