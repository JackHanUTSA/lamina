# LAMINA — brand guide v1

Carbon composite parts for sport bikes.

---

## 1. Positioning

**What the product actually is.** The reference part (tank cover) is hand wet lay-up
with an aramid/glass backing layer, vacuum bagged, gloss clear-coated, with a
4-hole front mounting tab. It is *not* autoclave prepreg. The exterior finish is
genuinely good; the interior shows overlapping ply edges, resin-rich pooling and
untrimmed flange fiber.

**So the brand must not claim aerospace pedigree.** Anyone who flips the part over
sees the truth in four seconds, and a claim that dies on inspection kills a parts
brand faster than a plain one ever would.

**Position instead on:** craft, fitment, finish, and honesty about process.
Hand-laid, small batch, fitted twice, coded and traceable.

- **Tagline:** COUNTED IN PLIES
- **Voice:** specific, technical, unembellished. Name the weave, the finish, the
  fitment. Never "aerospace grade", never "forged from pure carbon".
- **Example copy:** *"Hand-laid. Vacuum bagged. Fitted twice."*

## 2. Name

**lamina** (n.) — a single thin layer of composite. The unit the whole product is
built from. Latin root, reads premium across EU and JP markets, no awkward
phonetics in English, Italian, German or Japanese.

Check before use: trademark search in your classes (Nice class 12 — vehicle parts),
plus domain and social handles. This has **not** been cleared.

## 3. Logo

Two routes. **Route 01 (Ply Stack) is recommended.**

| | Route 01 — Ply Stack | Route 02 — Bias L |
|---|---|---|
| Concept | Three plies on the bias, stacked and tapering | An L with the ±45° ply in its counter |
| Strength | No letterform — works globally, never fights a model name | Strong on a billet badge; literal monogram |
| Weakness | More abstract | Reads as a generic arrow below ~24px |

Both were tested at 20/24/32/48 px and hold.

A third route (woven 2×2 cell) was **cut** — it dissolves below 32px. It survives
as the brand pattern instead, which is a better job for it.

**Clear space:** one mark-height on all sides. **Minimum size:** 16px / 6mm.

## 4. Palette

| Name | Hex | Role |
|---|---|---|
| Carbon | `#0A0B0D` | Base. Everything sits on it. |
| Graphite | `#1A1D21` | Panels, secondary surface. |
| Tow Grey | `#8A9099` | Body copy, the weave's own sheen. |
| Aramid Gold | `#C8A94B` | Accent only — never more than ~5% of a surface. |
| Clearcoat | `#ECEEF1` | Type and marks on dark. |

Aramid Gold is pulled from the aramid backing layer visible inside the real part.
It is the only warm note on an otherwise black-on-black product, which is exactly
why it must stay rare.

## 5. Type

- **Archivo ExtraBold** — wordmark, headlines. Wordmark tracked +0.30em, uppercase.
- **Archivo Regular** — body copy.
- **JetBrains Mono** — part codes, specs, technical data.
- **Barlow Condensed Bold** — packaging labels, box ends.

All four are open-source (OFL), so there is no licensing cost for packaging,
web or print.

## 6. Pattern

True 2×2 twill with the diagonal rib — matching the cloth actually on the part.
Use at 8–15% opacity on panels; full strength on box liner, tape and the inside
of the clamshell.

## 7. Part code system

```
LMN - R6 - TNK - 2T - G
 │     │     │     │    └── finish:  G gloss · M matte · S satin
 │     │     │     └─────── weave:   2T 2×2 twill · PW plain · FG forged
 │     │     └───────────── part:    TNK tank cover, FEN fender, HUG hugger…
 │     └─────────────────── fitment: model code
 └───────────────────────── brand
```

Laser-etch the code inside the flange — where the hand lay-up is visible anyway.
It turns the one honest surface into the proof of origin, and it makes returns,
warranty and re-orders unambiguous.

## 8. Files

```
assets/
  mark-plystack.svg              primary mark (vector)
  mark-plystack-mono-dark.svg    single colour, for light backgrounds
  mark-plystack-mono-light.svg   single colour, for dark backgrounds
  mark-bias-l.svg                alternate route
  mark-*-{32..1024}.png          raster exports
  lockup-full.png                mark + wordmark + part code
  lockup-wordmark.png            mark + wordmark
  pattern-twill-2x2.png          tileable texture
01_logo_routes.png               route comparison board
02_system.png                    palette / type / pattern / codes
03_applied.png                   applied to the real part
```

## 9. Not done yet

- Trademark and domain clearance
- Wordmark letterforms are set type, not drawn — custom-draw the A and M before
  any trademark filing
- Packaging structure, website, decal die-lines
- Physical proof: print the decal and check the gold against real gloss clear-coat
  under sunlight, which no screen mockup can settle
