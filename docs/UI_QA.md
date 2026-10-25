# UI Reference Board Comparison

The supplied board is the intended reference. This checklist records the current implementation against each screen; complete visual comparison at 1280×800 and 390×844 after capturing screenshots.

| Board screen | Current implementation | Remaining differences |
|---|---|---|
| 01 Landing | Full-bleed CSS scene, logo, start/continue/how-to-play, settings, name dialog | CSS landscape is a placeholder for processed scene and hero art. |
| 02 Grade select | Two curriculum-derived grade cards and selection | Card imagery is CSS scenery until art assets exist. |
| 03 World map | All six markers, selected grade, lock reasons, legend and HUD | Marker layout is data-driven but paths/card bottom-sheet interaction are simplified; art is CSS. |
| 04 Realm | Five stage nodes, Guardian, progress, rewards, start action | Stage trail and reward presentation are simplified vs board. |
| 05 Learning Read | Paged lesson, vocabulary, worked-example stepper, mistakes, real-world page | Wizard portrait is CSS fallback; panel proportions need screenshot comparison. |
| 06 Picture | Plate (script-generated pixel-art), validated code SVG, mentor key points and honest caption | Plates are script-generated placeholders, not AI (Pollinations unavailable); regenerate via `npm run art:gen`. |
| 06b Video | Browser speech, timer fallback, scene navigation, captions and speed | Browser voice appearance varies; visual player styling remains simplified. |
| 07 Battle | HUD, arena, reducer-driven question/options/powers, source label | Hero/enemy images are code glyph fallbacks; motion effects are limited. |
| 08 Feedback | Ribbon, exact check, explanation, picked-option rationale, heart/shield note | Impact animation and floating number are not implemented. |
| 09 Boss | Boss name, HP, hearts, phase and taunt | Guardian illustration and dramatic phase animation are placeholders. |
| 10 Results | Stars, XP/coins/accuracy/combo, score, badge, progress, remedial scroll | Confetti and animated star reveal are not implemented. |
| 11 Profile | Stats and registry-driven badges with hints | Portrait art is a CSS fallback. |
| 12 Journal | Tier/mastery bars, rule legend, weakest skill link | Styling and spacing should be compared directly to board. |
| 13 Settings | Sound, feature-gated music, motion, readable, demo, reset, about | Uses standard select/checkbox controls rather than all pixel-kit controls. |
| 14 Mobile | Responsive layout and safe-area bottom navigation | Needs manual verification on real iOS/Android browsers. |

No reference-board image or crop is used in the application.
