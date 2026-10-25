# UI Reference Board Comparison

The supplied board is the intended reference. This checklist records the current implementation against each screen; complete visual comparison at 1280×800 and 390×844 after capturing screenshots.

| Board screen | Current implementation | Remaining differences |
|---|---|---|
| 01 Landing | Full-bleed CSS scene, logo, start/continue/how-to-play, settings, redirect gate to `/create` for fresh saves | Scene imagery uses CSS/manifest fallbacks until high-res custom pixel backdrops are generated. |
| 01b Hero Creation | 3-step creation flow (`/create`): Name (with class-specific defaults), Style (variant), Class (Knight, Mage, Ranger) with passives/specials preview | Character sprites use pixel silhouette fallbacks when art assets are missing. |
| 02 Grade select | Two curriculum-derived grade cards and selection | Card imagery is CSS scenery until art assets exist. |
| 03 World map | All six markers, selected grade, lock reasons, legend and HUD with active hero chip | Marker layout is data-driven; map terrain art is procedural SVG/CSS. |
| 04 Realm | Five stage nodes, Guardian, progress, rewards, start action | Stage trail and reward presentation are simplified vs board. |
| 05 Learning Read | Paged lesson, vocabulary, worked-example stepper, mistakes, real-world page | Wizard portrait is CSS fallback; panel proportions need screenshot comparison. |
| 06 Picture | Plate (script-generated pixel-art), validated code SVG, mentor key points and honest caption | Plates are script-generated placeholders, not AI (Pollinations unavailable); regenerate via `npm run art:gen`. |
| 06b Video | Browser speech, timer fallback, scene navigation, captions and speed | Browser voice appearance varies; visual player styling remains simplified. |
| 07 Battle | HUD, arena, hero portrait, weapon tier, favoured foe banner, special ability button (`P` key) with charge pips, passive badge with tooltip, reducer-driven question/options/powers | Motion effects (slash, bolt, arrow) are CSS-driven; guardian illustration is code glyph fallback. |
| 08 Feedback | Ribbon, exact check, explanation, picked-option rationale, heart/shield note | Impact animation and floating number are not implemented. |
| 09 Boss | Boss name, HP, hearts, phase and taunt | Guardian illustration and dramatic phase animation are placeholders. |
| 10 Results | Hero portrait, stars, XP/coins/accuracy/combo, score, badge, progress, remedial scroll | Confetti and animated star reveal are not implemented. |
| 11 Profile | Hero portrait, class name, weapon name and tier, stats, registry-driven badges with hints | Portrait art uses pixel weapon fallback when art is missing. |
| 12 Journal | Hero badge, tier/mastery bars, rule legend, weakest skill link | Styling and spacing should be compared directly to board. |
| 13 Settings | Sound, feature-gated music, motion, readable, demo, reset, about | Uses standard select/checkbox controls rather than all pixel-kit controls. |
| 14 Mobile | Responsive layout and safe-area bottom navigation | Needs manual verification on real iOS/Android browsers. |

No reference-board image or crop is used in the application.
