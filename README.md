# LAMINA

Hand-laid carbon fibre for sport bikes. **Counted in plies.**

A brand identity and single-page site built around one real part —
a wet lay-up tank cover — photographed as it actually is.

## What's here

| path | |
|---|---|
| `index.html` | the site (static, no build step) |
| `styles.css` | all styling, no framework |
| `img/` | product photography, 10s film (MP4 + WebM), poster |
| `fonts/` | self-hosted Archivo — OFL licensed |
| `brand/BRAND.md` | positioning, palette, type, part-code scheme |
| `brand/assets/` | logo marks (SVG + PNG 32-1024px), twill pattern |
    | `model/sportbike.glb` | donor sport bike, CC0 public domain, unbranded, 599 named parts |
    | `bike.js` / `bike-model.js` | scroll-scrubbed teardown rig (three.js r169, vendored, MIT) |

## Photo-guided tank-cover model

`cover.html` provides an interactive orbit viewer with top, underside and three-quarter presets, photo/studio materials, and GLB/OBJ downloads. `tools/build_cover.py` reproduces the mesh with Python, NumPy and Pillow.

The exterior silhouette and opening are manually traced from `img/tank-top.jpg`; `img/tank-under.jpg` is a qualitative reference for the open shell. It is not an AI scan or photogrammetric reconstruction. Depth, curvature, thickness, hidden details and perspective correction are estimated. Coordinate scale is normalized and **not measured**. Do not use this mesh for manufacturing, fitment or structural analysis. The source image already contains edited lighting and a brand overlay; photo mode retains those pixels and baked reflections. Studio mode is illustrative, not a measured material reconstruction.

Outputs: `model/tank-cover-photo.glb`, `model/tank-cover-photo.obj`, `model/tank-cover-validation.json`. Build checks include finite coordinates, nondegenerate triangles, two-face edge incidence and consistent winding. `vendor/OrbitControls.js` and `vendor/RGBELoader.js` are Three.js r169, MIT.

## Deploy

Static files. Any host works. For GitHub Pages: Settings -> Pages ->
deploy from `main` / root. `.nojekyll` is present so Jekyll stays out of it.

## The positioning

The part is hand wet lay-up, not autoclave prepreg — so the brand never
claims "aerospace grade". It leads with the underside, which is the
surface most carbon brands crop out of the photo.

## Not done yet

- No trademark or domain clearance on the name LAMINA
- Wordmark is set type, not drawn letterforms
- Gold accent untested against real gloss clearcoat in sunlight
- Part code `LMN-R6-TNK-2T-G` assumes R6 fitment — unverified

## Third-party assets

- `model/sportbike.glb` — CC0 / public domain, original unbranded model, metre scale.
  No attribution required; credited here anyway.
- `vendor/three.module.js`, `vendor/GLTFLoader.js`, `vendor/BufferGeometryUtils.js` — three.js r169, MIT.
- `env/studio_1k.hdr` — Poly Haven "photo_studio_01", CC0. Real captured light
  probe; the reflections on the carbon come from this, not from guesswork.
- `img/cf-*.jpg` — ambientCG "Fabric004" carbon weave, CC0. Scanned, not drawn:
  a hand-tiled weave alternates float directions and reads as herringbone.
- Fonts: Archivo, JetBrains Mono — SIL Open Font License.
