# Design directions (R1 shoot-out) · Human Obsolescence Index

Standalone static mockups for the relaunch. Open `<slug>/index.html` directly in a browser; there is no build step. This folder sits outside `src/pages/` and `public/`, so Astro never copies it into `dist/` and it is never deployed.

Every occupation title, OBS score, rank and BLS figure in these mockups comes from `src/data/occupations.json` (2026-Q4 edition). Every verdict, story and battle card carries the "AI exposure ≠ job loss" small print and the site URL.

Screenshots: `<slug>/shots/mobile.png` (390×844, full page) and `<slug>/shots/desktop.png` (1280×800, full page).

## A. The Daily Doom (`tabloid-doom/`)

**Pitch:** your job's AI verdict printed as a screaming tabloid front page, with your name in the headline.

- **Palette:** ink `#0B0B0B`, newsprint `#FFFBEA`, highlighter yellow `#FFE500`, tabloid red `#E4002B`, sticker blue `#1F5BFF`
- **Fonts (Google Fonts):** Anton (headlines, scores), Archivo 400/700/900 (body, labels), Permanent Marker (hand-scrawled roasts and the name)
- **Hero state shown:** "telemarket" typed with live suggestions (Telemarketers 99, Telephone operators 98), name "Dave", verdict "DAVE, THE ROBOTS HAVE YOUR NUMBER" with a red starburst 99, a SEVERE stamp, #1 of 120, BLS −21.4% (60,900 → 47,800 by 2035), BLS official exposure Very high, plus the 1080×1920 front-page story card.
- **Secondary view:** Hall of Shame top 10 as a front-page list with red score bars, and the "Who's safer?" teaser: Telemarketers 99 vs Plumbers, pipefitters, and steamfitters 18.
- **Motion idea:** the verdict slams onto the page like a printing press (scale-down and rotate), the starburst spins in, the SEVERE stamp thuds at an angle, and a red breaking-news ticker loops. Reduced motion shows the final state with no animation.
- **Why it gets shared:** a tabloid front page is an instantly readable meme format. "DAVE, THE ROBOTS HAVE YOUR NUMBER" with a giant 99 is a screenshot people send to the group chat to roast a friend, and every job gets its own front page.

## B. Doom Show (`doom-show/`)

**Pitch:** a neon game show where you buzz in with your job and the scoreboard lights up your doom score.

- **Palette:** stage night `#170033`, violet `#3A0A7A`, hot pink `#FF2D95`, electric lime `#CCFF00`, cyan `#00E0FF`, marquee gold `#FFC700`
- **Fonts (Google Fonts):** Bungee Shade (marquee titles), Bungee (scores, buttons, labels), Rubik 400–900 (body)
- **Hero state shown:** host bubble "CONTESTANT, WHAT DO YOU DO FOR A LIVING?", "data entry keyer" typed and matched to Data entry keyers (SOC 43-9021), contestant "Dave", a bulb-framed scoreboard with a neon 97, a doom-o-meter gauge, the lit SEVERE band tile, prize tiles (#2 of 120, BLS −25.5%, 131,800 → 98,200 jobs), the roast "Survey says: the keyboard is typing itself now", and the 1080×1920 story card.
- **Secondary view:** Hall of Shame as an arcade HIGH SCORES table (gold, silver, bronze), and a fighting-game "Who's safer?" round: Computer programmers 94 vs Software developers 62 with health bars (BLS −7.3% vs +10.2%).
- **Motion idea:** the buzzer throbs, the score flickers on like a neon tube, the gauge needle swings past the danger zone with an overshoot, and the marquee bulbs chase. Reduced motion shows the final lit state.
- **Why it gets shared:** game-show language ("Survey says", "Challenge a friend", "K.O.!") turns a grim number into a competition. People share scores to beat each other, and the battle card is a ready-made dare.

## Small print and honesty notes

- OBS = round(0.65 × Exposure + 0.35 × Trajectory); bands are Severe ≥ 75, Elevated ≥ 50, Moderate ≥ 25, Low below that. The BLS official category is shown separately from our score.
- Roast lines punch at the machines and the situation, never at the worker.
- The optional name is shown here as a static example only. In the real build it is sanitized and rendered with textContent or canvas.
