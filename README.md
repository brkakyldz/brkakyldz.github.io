# Berke Akyıldız — portfolio

Static site. No build step, no dependencies: open `index.html` through any static
server (`python -m http.server`) or publish the folder to GitHub Pages as is.

```
index.html                  home: opening, the projects, principles, short about
hakkimda/index.html         long about page, principles in full, CV (#ozgecmis)
isler/<project>/index.html  one page per project: facts, brief, close-up story
cv/index.html               redirect to hakkimda/#ozgecmis (keeps the old /cv/ link alive)
404.html                    GitHub Pages not-found page (root-absolute paths)
assets/site.css             the whole design
assets/site.js              clock, scroll reveals, light on the water (WebGL); optional
assets/leaves-*.svg         olive-leaf silhouettes for the shade in the top corner
assets/favicon.svg          an arch with the sea in it
```

Design notes, briefly:

- Palette: limestone in shade (`#e7e0d3`), dark ink, one field of deep sea
  (`#1c3d63`) at the end of every page, clay (`#b0573a`) for small marks only.
- Type: Newsreader for text, IBM Plex Mono for data; a short scale. Sections are
  numbered and ruled; labels hang in a left margin.
- Motion is small and switches off under `prefers-reduced-motion`: leaf shade
  sways, section rules draw in, running projects' status dots breathe, each
  project's drawing shows its system at work (the paused one stays still), light
  moves on the sea only while it is on screen.
- The project drawings live once, in `index.html`; project pages carry copies.
  Edit a drawing there and copy it to its project page.
- Every project page has a *Nasıl çalışır* figure (`figure.arch`): the system
  drawn once as inline SVG, with a few real scenarios played over it. Parts are
  `<g data-node="id">` (a `.box` or `.person`, a `.nm` name, a `.sub` line);
  connections are `<path data-edge="a b">`, drawn centre to centre under the
  parts. Each scenario is a `.arch-scene` with a name and an `<ol>`; a step's
  `data-route="a b c"` names the parts the dot passes (`"a b | a c"` sends one dot
  per branch at once), `data-tone="reply"` makes it an answer, `data-state="b: …"`
  rewrites a part's small line, `data-stop="0.6"` ends on a `.ghost` connection
  with a cross (a way that does not exist). The shaded zone is where a model
  works. `site.js` plays it on one clock; without JS it is a still drawing and a
  numbered list, and under reduced motion the reader steps through it.
