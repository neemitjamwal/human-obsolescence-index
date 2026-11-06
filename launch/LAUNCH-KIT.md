# Launch kit: The Robot Uprising Is Hiring (Not You)

The distribution kit for the relaunch of two sister sites:

- **Human Obsolescence Index** ([humanobsolescenceindex.com](https://humanobsolescenceindex.com/)): type your job, get a Doom Score out of 100 built from Microsoft, OpenAI and BLS data, a tabloid verdict, a robot at your window and a share card.
- **Museum of Extinct Jobs** ([museumofextinctjobs.com](https://museumofextinctjobs.com/)): write your job's obituary on a sticker tombstone, then walk past the trades that already died.

The two loop into each other. Every Index verdict has a "Read its obituary" link to the museum, and every museum obituary for a living job has a "See your live score" link back to its Index verdict.

## Ground rules for every post

1. **The robots are theatre. The numbers are not.** Panic headlines, sirens, red eyes and evil robots are fine. Every number comes from the Stat ledger at the end of this file and links to its receipt. Never round, never estimate, never add a stat that is not in the ledger.
2. **Say it every time: AI exposure ≠ job loss.** A Doom Score blends AI exposure research with the BLS employment projection for 2025–35. It is not a forecast that anyone gets fired. Link [the methodology](https://humanobsolescenceindex.com/methodology/).
3. **Punch at the machines, never at the worker.** The joke lands on the robots and the situation. Nobody's skills, age or intelligence are the punchline.
4. **No invented quotes.** Do not put words in the mouth of a real person or company. The only speakers in this kit are the robots, and the robots are fictional.
5. **Disclose that you built it** on every community post, and stay in the thread to answer questions.
6. **Cite-only sources stay cite-only.** Do not quote figures from WEF or layoffs trackers. Our numbers come from BLS, O*NET, Microsoft Research and OpenAI's published data.

## Hacker News: Show HN

**Title:** Show HN: Type your job, get a Doom Score from BLS and AI-exposure data

**URL:** https://humanobsolescenceindex.com/

**First comment (post right after submitting):**

> I built two small static sites as a joke with receipts. The Human Obsolescence Index scores 784 U.S. occupations with a Doom Score: 65% AI exposure (a percentile blend of Microsoft Research's "Working with AI" applicability scores and the Eloundou et al. "GPTs are GPTs" ratings) and 35% the BLS employment projection for 2025–35. The official BLS AI exposure category is shown next to our number and never merged into it.
>
> Some results: telemarketers top the Index at [99/100](https://humanobsolescenceindex.com/v/telemarketers/), with BLS projecting −21.4% employment. Software developers score [62/100](https://humanobsolescenceindex.com/v/software-developers/), because very high AI exposure is offset by a projected +10.2%. Data scientists show the same split: AI exposure (percentile) 96.42, but BLS projects +34.6% ([verdict](https://humanobsolescenceindex.com/v/data-scientists/)). Exposure is not job loss, and the methodology page quotes BLS's own warning about that word for word.
>
> The robot-uprising styling is pure B-movie. Everything else is static Astro: no tracking, no API calls, and the search index loads only when you focus the box. Your optional first name stays in the URL fragment, so it never reaches a server. The sister site, the Museum of Extinct Jobs, writes your job an obituary and links back to its live score.
>
> Data pipeline, formula and every source are on [/methodology/](https://humanobsolescenceindex.com/methodology/). I'd love feedback on the scoring, especially where the exposure data feels wrong for a job you know.

**HN notes:** Post once, on a weekday morning US time. Do not ask anyone to upvote. Answer every methodology question with a link to the receipts. If someone finds a scoring error, thank them and fix it in public in the changelog.

## Reddit

Read each subreddit's sidebar and pinned rules on the day you post, since rules change. Disclose that you made the site. Reddit's long-standing guidance is that your own links should be a small part of your activity, so comment in each community before and after the post. Post one subreddit per day, never the same text twice.

### Reddit post: r/dataisbeautiful

- **Rules to respect:** Original work carries the [OC] tag. The post must be the visualization itself (upload the hall-of-shame screenshot, not a bare link). Within the first hour, add a top-level comment that names the data sources and the tools.
- **Title:** [OC] Doom Scores for 784 U.S. occupations: AI exposure research blended with BLS 2025–35 projections
- **Image:** the `/leaderboard/` hall of shame at mobile size, cropped to the top rows.
- **Required source comment:**

> Sources: BLS Employment Projections 2025–35 and the BLS AI exposure categories, BLS OEWS May 2025 wages, O*NET 31.0 tasks, Microsoft Research "Working with AI" applicability scores, and OpenAI's "GPTs are GPTs" occupation ratings. Tools: a Node pipeline that writes JSON, Astro for the static site, sharp for the images. Formula: Doom Score = 65% AI exposure percentile + 35% projection percentile, explained at https://humanobsolescenceindex.com/methodology/. The top of the board is telemarketers at 99/100; 93 occupations land in the Severe band. AI exposure is not job loss: BLS projects growth for several high scorers, such as interpreters and translators at 85/100 with +2%. Full board: https://humanobsolescenceindex.com/leaderboard/

### Reddit post: r/Futurology

- **Rules to respect:** Link posts need a submission statement comment written by you, posted quickly, explaining why the link matters for the future. No low-effort self-promotion: lead with the question, not the product.
- **Title:** If AI exposure isn't job loss, what should we measure instead? I scored 784 jobs both ways to see where they disagree
- **Submission statement:**

> I built a free index that puts AI exposure research next to the BLS employment projection for 2025–35, and the two disagree a lot. Customer service representatives (2,666,000 jobs) score 92/100, with BLS projecting −5.3%. Software developers score 62/100 while BLS projects +10.2%. Home health and personal care aides score 14/100 with +18.1% projected, across 4,677,100 jobs. The site is styled like a robot-uprising tabloid, but every number links to its source. I'm interested in where people think exposure research overstates or understates the risk. Methodology: https://humanobsolescenceindex.com/methodology/

### Reddit post: r/InternetIsBeautiful

- **Rules to respect:** Free sites only, with no signup, paywall or download, and a title that describes what the site does. No clickbait titles. I made it, so say so in the first comment.
- **Title:** A tabloid that tells you how worried to be about the robots taking your job, with sources for every number
- **First comment:**

> I made this. Type any job and you get a Doom Score out of 100 from Microsoft, OpenAI and BLS data, a robot at your window and a shareable front page. Then the sister site writes your job's obituary on a sticker tombstone (https://museumofextinctjobs.com/obituary/). No signup, no tracking, and your optional first name never leaves your browser. AI exposure ≠ job loss, and the methodology page explains exactly why.

## X thread

(1/8) 🚨 ROBOT UPRISING: YOUR JOB IS NEXT 🚨
Kidding. Mostly. I scored 784 U.S. jobs on a Doom Score out of 100. Type yours: https://humanobsolescenceindex.com/

(2/8) Top of the Doom Index: telemarketers at 99/100. BLS projects −21.4% employment from 2025 to 2035. The robots have their number. https://humanobsolescenceindex.com/v/telemarketers/

(3/8) Data entry keyers: 97/100, BLS projects −25.5%. Word processors and typists: 94/100, −34.4%. The typing pool remembers the typesetter. https://humanobsolescenceindex.com/v/word-processors-and-typists/

(4/8) Plot twist. Software developers: 62/100. AI can touch a lot of the work, yet BLS projects +10.2%. The robots want your tasks, not your desk. https://humanobsolescenceindex.com/v/software-developers/

(5/8) The robot army marched up to the trades and backed away. Electricians: 29/100. Plumbers: 18/100. https://humanobsolescenceindex.com/vs/software-developers-vs-electricians/

(6/8) The honest part: AI exposure ≠ job loss. A Doom Score is 65% AI exposure research plus 35% BLS projection. Every number has a receipt. https://humanobsolescenceindex.com/methodology/

(7/8) We've been here before. In 1950 the US still employed about 342,000 switchboard operators. The sister site keeps their tombstone. https://museumofextinctjobs.com/exhibits/switchboard-operator/

(8/8) Write your own job's obituary, add your first name, post the tombstone. It links back to your live score. https://museumofextinctjobs.com/

## LinkedIn post

**The robots are coming for your task list. Here are the receipts.**

I built a free tool that gives any U.S. occupation a Doom Score out of 100. It's dressed as a robot-uprising tabloid, but the inputs are public research: Microsoft Research's "Working with AI" scores, OpenAI's "GPTs are GPTs" ratings, and the BLS employment projection for 2025–35.

What surprised me:

- Customer service representatives (2,666,000 jobs) score 92/100, with BLS projecting −5.3%.
- Accountants and auditors score 61/100, yet BLS projects +5%.
- Registered nurses score 40/100 and BLS projects +5.6%.
- Data scientists are among the most exposed to AI, at AI exposure (percentile) 96.42, and BLS still projects +34.6%.

The lesson is not "panic." AI exposure ≠ job loss. Exposure tells you which tasks are about to change, so it is a map of where to get ahead, not a pink slip.

Try your own job: https://humanobsolescenceindex.com/ · How it's calculated: https://humanobsolescenceindex.com/methodology/

## Product Hunt listing

- **Name:** Human Obsolescence Index
- **Tagline:** Type your job. The robots print the headline.
- **Topics:** Artificial Intelligence, Data Visualization, Fun
- **Description:** A robot-uprising tabloid built on real labor data. Type any of 784 U.S. occupations and get a Doom Score out of 100 (AI exposure research plus the BLS employment projection for 2025–35), a verdict with a robot at the window, and a share card with your first name. Pick two jobs and start a fight in "Who's safer?", or browse the hall of shame. Every number links to its source, and AI exposure ≠ job loss is printed next to every result. Its sister site, the Museum of Extinct Jobs, writes your job's obituary.
- **Gallery (in order):** home hero with the robot army; a verdict reveal (telemarketers, 99/100); a story share card; the "Who's safer?" battle (software developers vs electricians); the hall of shame; a museum obituary tombstone.
- **Maker's first comment:**

> Hi Product Hunt! This started as a joke about robot overlords and turned into a data project. The Doom Score is 65% AI exposure and 35% BLS projection, both shown as percentiles, with the official BLS category beside it. There are no accounts and no tracking. The optional first name on your card stays in your browser. I'd love to hear which job's score feels most wrong to you, because that's where the research is weakest.

## Short-video hooks

Vertical video, captions burned in, under a minute. Every number on screen must come from the Stat ledger. End every video on the "AI exposure ≠ job loss" line and the URL.

### Hook 1: "The robots have your number"

- **Hook line:** "I typed my job into a robot-uprising tabloid and it printed my obituary."
- **Shot list:**
  - Shot 1 (0:00–0:02): Close-up of a phone typing "telemarketer" into the "Type your job" box, siren sound.
  - Shot 2 (0:02–0:05): The verdict slams in: Doom Score 99/100, the SEVERE stamp thuds.
  - Shot 3 (0:05–0:09): Zoom on the red-eyed robot at the blinds and its speech bubble.
  - Shot 4 (0:09–0:13): Scroll to "BLS projects −21.4%", tap the receipt link.
  - Shot 5 (0:13–0:16): End card: "AI exposure ≠ job loss" and humanobsolescenceindex.com.

### Hook 2: "Coders vs electricians"

- **Hook line:** "Who survives the robot uprising: the coder or the electrician?"
- **Shot list:**
  - Shot 1 (0:00–0:02): Split screen, two job names typed into "Who's safer?".
  - Shot 2 (0:02–0:06): Score tiles flip: software developers 62/100, electricians 29/100.
  - Shot 3 (0:06–0:10): The robot referee hands the pink slip to the higher score.
  - Shot 4 (0:10–0:14): Caption: BLS still projects +10.2% for software developers.
  - Shot 5 (0:14–0:17): End card with the battle URL.

### Hook 3: "The typing pool"

- **Hook line:** "This job is on the BLS fastest-declining list, and the robots noticed."
- **Shot list:**
  - Shot 1 (0:00–0:03): Typewriter sound, type "word processor".
  - Shot 2 (0:03–0:06): Verdict: 94/100, BLS projects −34.4%.
  - Shot 3 (0:06–0:10): Tap "Historical precedent", cut to the museum's typesetter tombstone.
  - Shot 4 (0:10–0:14): Caption: "Desktop publishing killed the typesetter."
  - Shot 5 (0:14–0:16): End card.

### Hook 4: "Write your job's obituary"

- **Hook line:** "I wrote my job an obituary before the robots could."
- **Shot list:**
  - Shot 1 (0:00–0:02): Museum home, type a first name and a job.
  - Shot 2 (0:02–0:05): Tombstone rises, stickers slap on, "CAUSE OF DEATH" killer sticker.
  - Shot 3 (0:05–0:08): Switch the tone chips: Tearjerker, Roast, Gospel choir.
  - Shot 4 (0:08–0:12): Tap "See your live score on the Index", the verdict slams in.
  - Shot 5 (0:12–0:15): Download the tombstone card, end on museumofextinctjobs.com.

### Hook 5: "The most doomed jobs in America"

- **Hook line:** "The hall of shame: the jobs the robots want most."
- **Shot list:**
  - Shot 1 (0:00–0:03): Scroll the hall of shame, red score bars flying past.
  - Shot 2 (0:03–0:06): Freeze on telemarketers 99/100 and telephone operators 98/100.
  - Shot 3 (0:06–0:10): Caption: 93 occupations in the Severe band.
  - Shot 4 (0:10–0:14): Tap one row, the verdict reveal plays.
  - Shot 5 (0:14–0:17): End card with "AI exposure ≠ job loss".

### Hook 6: "Nurses vs accountants"

- **Hook line:** "Accountant or nurse: who does the robot fire first?"
- **Shot list:**
  - Shot 1 (0:00–0:02): Battle page with both names typed.
  - Shot 2 (0:02–0:05): Accountants and auditors 61/100 vs registered nurses 40/100.
  - Shot 3 (0:05–0:09): Robot referee, pink slip moment.
  - Shot 4 (0:09–0:13): Twist caption: BLS projects growth for both, +5% and +5.6%.
  - Shot 5 (0:13–0:16): End card.

### Hook 7: "The robots want your tasks, not your desk"

- **Hook line:** "This job is extremely exposed to AI and still growing fast."
- **Shot list:**
  - Shot 1 (0:00–0:03): Type "data scientist".
  - Shot 2 (0:03–0:06): AI exposure (percentile) 96.42 on screen.
  - Shot 3 (0:06–0:09): BLS projects +34.6%, the robot's bubble: "We want your tasks, not your desk."
  - Shot 4 (0:09–0:13): Doom Score 63/100 and the "AI exposure ≠ job loss" line.
  - Shot 5 (0:13–0:15): End card.

### Hook 8: "We've been here before"

- **Hook line:** "In 1950, America had about 342,000 of these jobs."
- **Shot list:**
  - Shot 1 (0:00–0:03): Museum switchboard operator exhibit slab slaps onto the wall.
  - Shot 2 (0:03–0:06): Epitaph close-up: "Number, please. The line went dead."
  - Shot 3 (0:06–0:10): Cut to the Index: customer service representatives, 92/100.
  - Shot 4 (0:10–0:14): Caption: 2,666,000 jobs today, BLS projects −5.3%.
  - Shot 5 (0:14–0:17): End card with both URLs.

### Hook 9: "Which jobs the robots fear"

- **Hook line:** "The robot army looked at these jobs and backed away slowly."
- **Shot list:**
  - Shot 1 (0:00–0:03): Type "massage therapist", the verdict lands softly.
  - Shot 2 (0:03–0:06): Doom Score 7/100, tied for the bottom of the Index.
  - Shot 3 (0:06–0:10): Plumbers 18/100, home health and personal care aides 14/100.
  - Shot 4 (0:10–0:14): Caption: BLS projects +18.1% for home health and personal care aides.
  - Shot 5 (0:14–0:16): End card.

### Hook 10: "Put your name on it"

- **Hook line:** "The robots printed my name on the front page."
- **Shot list:**
  - Shot 1 (0:00–0:02): Type a first name in the optional field.
  - Shot 2 (0:02–0:05): The headline rewrites itself with the name in marker scrawl.
  - Shot 3 (0:05–0:08): The story card renders, tap Download.
  - Shot 4 (0:08–0:12): Caption: "The name never leaves your phone."
  - Shot 5 (0:12–0:15): End card: "AI exposure ≠ job loss" and the URL.

## Press pitch emails

Send each pitch to one named reporter whose recent work fits. Personalize the first line. Never attach a claim the site cannot back with a receipt.

### Pitch: tech desk

**Subject:** Free tool scores 784 jobs on AI exposure vs BLS projections, styled as a robot-uprising tabloid

Hi [Name],

I read your piece on [recent story] and thought this might be useful.

The Human Obsolescence Index (https://humanobsolescenceindex.com/) gives 784 U.S. occupations a Doom Score out of 100. It blends Microsoft Research's "Working with AI" applicability scores and OpenAI's "GPTs are GPTs" ratings (65%) with the BLS employment projection for 2025–35 (35%), and shows the official BLS AI exposure category next to it.

The interesting part is where exposure and projections disagree. Software developers score 62/100 while BLS projects +10.2%. Data scientists sit at AI exposure (percentile) 96.42 with +34.6% projected. Telemarketers top the Index at 99/100 with −21.4% projected.

It is a static site with no tracking, every number links to its public source, and the methodology page quotes BLS's warning that exposure is not job loss. Happy to walk through the pipeline or provide the stat pack (https://humanobsolescenceindex.com/press/).

[Your name]

### Pitch: labor desk

**Subject:** Which jobs face AI pressure and which BLS still sees growing, in one sourced index

Hi [Name],

Your reporting on [recent story] is why I'm writing.

I built a free index that puts AI exposure research beside the BLS employment projection for 2025–35 for 784 occupations. Some large occupations stand out. Customer service representatives (2,666,000 jobs) score 92/100, and BLS projects −5.3%. Secretaries and administrative assistants score 88/100, with BLS projecting −6%. Home health and personal care aides score 14/100, and BLS projects +18.1%.

The site is deliberately loud (the robots are the villains, never the workers), but the data is careful: the BLS category is shown separately, coverage gaps are flagged, and every page prints AI exposure ≠ job loss. Its sister site, the Museum of Extinct Jobs (https://museumofextinctjobs.com/), shows how earlier waves played out, from switchboard operators to typesetters.

Happy to share the methodology (https://humanobsolescenceindex.com/methodology/) or the full stat pack.

[Your name]

### Pitch: local desk

**Subject:** A local angle on AI and work: the jobs your readers do, scored with national data

Hi [Name],

I built a free, sourced tool that local readers can use on their own jobs: type an occupation and get its Doom Score out of 100 from national AI exposure research and the BLS employment projection for 2025–35.

The Index uses national data only, so the local story is yours to report: find residents in the region's big occupations and ask whether the national picture matches what they see. Good candidates by national size: cashiers (3,106,300 jobs, 72/100), registered nurses (3,465,400 jobs, 40/100) and fast food and counter workers (3,855,900 jobs, 33/100).

A reader-participation hook: residents write their job's obituary at the Museum of Extinct Jobs (https://museumofextinctjobs.com/obituary/) and share the tombstone. Every page notes that AI exposure ≠ job loss and links the methodology, so the piece stays fair to the people doing the work.

[Your name]

## Two-week posting schedule

Times are US Eastern. Do not post the same copy twice. Reply to comments for at least two hours after each post.

| Day | Channel | What to post |
| --- | --- | --- |
| Day 1 | X, LinkedIn | Soft launch: the X thread and the LinkedIn post. Fix anything friends report. |
| Day 2 | Hacker News | Show HN at 9am ET, first comment immediately, stay in the thread all day. |
| Day 3 | TikTok, Reels, Shorts | Hook 1 and Hook 2. |
| Day 4 | Reddit | r/dataisbeautiful post with the source comment. |
| Day 5 | Email | Tech desk pitch to three reporters, personalized. |
| Day 6 | TikTok, Reels, Shorts | Hook 4 (museum obituary). |
| Day 7 | Product Hunt | Launch at 12:01am PT, maker comment, share the listing on X. |
| Day 8 | Reddit | r/InternetIsBeautiful post. |
| Day 9 | TikTok, Reels, Shorts | Hook 3 and Hook 8 (the history loop). |
| Day 10 | Email | Labor desk pitch. |
| Day 11 | Reddit | r/Futurology post with the submission statement. |
| Day 12 | TikTok, Reels, Shorts | Hook 6 and Hook 7. |
| Day 13 | Email, LinkedIn | Local desk pitch; LinkedIn follow-up with a battle card. |
| Day 14 | All | Hook 5, Hook 9 and Hook 10; a thank-you post; log what worked and update the changelog. |

## Stat ledger

Every number in this kit, what it is, where the value lives in the committed data, and its receipt. `tests/launch-kit.test.ts` extracts every number from the kit and fails if one is missing here or does not match the data exactly.

<!-- stat-ledger:start -->
| Printed | What it is | Data reference | Source |
| --- | --- | --- | --- |
| 784 | Scored occupations | `verdicts.meta.count` | [Methodology](https://humanobsolescenceindex.com/methodology/) · [BLS EP](https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx) |
| 100 | Top of the Doom Score scale ("out of 100") | `scale:obs` | [Methodology](https://humanobsolescenceindex.com/methodology/) |
| 93 | Occupations in the Severe band | `band-count:severe` | [Leaderboard](https://humanobsolescenceindex.com/leaderboard/) |
| 65% | Exposure weight in the Doom Score | `weight:exposure` | [Methodology](https://humanobsolescenceindex.com/methodology/) |
| 35% | Projection weight in the Doom Score | `weight:trajectory` | [Methodology](https://humanobsolescenceindex.com/methodology/) |
| 2025–35 | BLS projection period | `source:bls-ep` | [BLS EP](https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx) |
| 2025 | BLS projection base year | `source:bls-ep` | [BLS EP](https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx) |
| 2035 | BLS projection end year | `projection-end` | [BLS EP](https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx) |
| 31.0 | O*NET database version | `source:onet-31` | [O*NET 31.0](https://www.onetcenter.org/dl_files/database/db_31_0_text.zip) |
| 99/100 | Telemarketers, Doom Score | `verdict:telemarketers.obs` | [Verdict](https://humanobsolescenceindex.com/v/telemarketers/) |
| −21.4% | Telemarketers, BLS projected change | `verdict:telemarketers.projectedChangePct` | [Verdict](https://humanobsolescenceindex.com/v/telemarketers/) · [BLS EP](https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx) |
| 98/100 | Telephone operators, Doom Score | `verdict:telephone-operators.obs` | [Verdict](https://humanobsolescenceindex.com/v/telephone-operators/) |
| 97/100 | Data entry keyers, Doom Score | `verdict:data-entry-keyers.obs` | [Verdict](https://humanobsolescenceindex.com/v/data-entry-keyers/) |
| −25.5% | Data entry keyers, BLS projected change | `verdict:data-entry-keyers.projectedChangePct` | [Verdict](https://humanobsolescenceindex.com/v/data-entry-keyers/) |
| 94/100 | Word processors and typists, Doom Score | `verdict:word-processors-and-typists.obs` | [Verdict](https://humanobsolescenceindex.com/v/word-processors-and-typists/) |
| −34.4% | Word processors and typists, BLS projected change | `verdict:word-processors-and-typists.projectedChangePct` | [Verdict](https://humanobsolescenceindex.com/v/word-processors-and-typists/) |
| 92/100 | Customer service representatives, Doom Score | `verdict:customer-service-representatives.obs` | [Verdict](https://humanobsolescenceindex.com/v/customer-service-representatives/) |
| 2,666,000 | Customer service representatives, employment 2025 | `verdict:customer-service-representatives.employment` | [Verdict](https://humanobsolescenceindex.com/v/customer-service-representatives/) · [BLS EP](https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx) |
| −5.3% | Customer service representatives, BLS projected change | `verdict:customer-service-representatives.projectedChangePct` | [Verdict](https://humanobsolescenceindex.com/v/customer-service-representatives/) |
| 88/100 | Secretaries and administrative assistants, Doom Score | `verdict:secretaries-and-administrative-assistants-except-legal-medical-and-executive.obs` | [Verdict](https://humanobsolescenceindex.com/v/secretaries-and-administrative-assistants-except-legal-medical-and-executive/) |
| −6% | Secretaries and administrative assistants, BLS projected change | `verdict:secretaries-and-administrative-assistants-except-legal-medical-and-executive.projectedChangePct` | [Verdict](https://humanobsolescenceindex.com/v/secretaries-and-administrative-assistants-except-legal-medical-and-executive/) |
| 85/100 | Interpreters and translators, Doom Score | `verdict:interpreters-and-translators.obs` | [Verdict](https://humanobsolescenceindex.com/v/interpreters-and-translators/) |
| +2% | Interpreters and translators, BLS projected change | `verdict:interpreters-and-translators.projectedChangePct` | [Verdict](https://humanobsolescenceindex.com/v/interpreters-and-translators/) |
| 62/100 | Software developers, Doom Score | `verdict:software-developers.obs` | [Verdict](https://humanobsolescenceindex.com/v/software-developers/) |
| +10.2% | Software developers, BLS projected change | `verdict:software-developers.projectedChangePct` | [Verdict](https://humanobsolescenceindex.com/v/software-developers/) |
| 63/100 | Data scientists, Doom Score | `verdict:data-scientists.obs` | [Verdict](https://humanobsolescenceindex.com/v/data-scientists/) |
| 96.42 | Data scientists, AI exposure (percentile) | `verdict:data-scientists.exposure` | [Verdict](https://humanobsolescenceindex.com/v/data-scientists/) · [Microsoft](https://raw.githubusercontent.com/microsoft/working-with-ai/main/ai_applicability_scores.csv) · [OpenAI](https://raw.githubusercontent.com/openai/GPTs-are-GPTs/main/data/occ_level.csv) |
| +34.6% | Data scientists, BLS projected change | `verdict:data-scientists.projectedChangePct` | [Verdict](https://humanobsolescenceindex.com/v/data-scientists/) |
| 61/100 | Accountants and auditors, Doom Score | `verdict:accountants-and-auditors.obs` | [Verdict](https://humanobsolescenceindex.com/v/accountants-and-auditors/) |
| +5% | Accountants and auditors, BLS projected change | `verdict:accountants-and-auditors.projectedChangePct` | [Verdict](https://humanobsolescenceindex.com/v/accountants-and-auditors/) |
| 40/100 | Registered nurses, Doom Score | `verdict:registered-nurses.obs` | [Verdict](https://humanobsolescenceindex.com/v/registered-nurses/) |
| +5.6% | Registered nurses, BLS projected change | `verdict:registered-nurses.projectedChangePct` | [Verdict](https://humanobsolescenceindex.com/v/registered-nurses/) |
| 3,465,400 | Registered nurses, employment 2025 | `verdict:registered-nurses.employment` | [Verdict](https://humanobsolescenceindex.com/v/registered-nurses/) |
| 29/100 | Electricians, Doom Score | `verdict:electricians.obs` | [Verdict](https://humanobsolescenceindex.com/v/electricians/) |
| 18/100 | Plumbers, pipefitters and steamfitters, Doom Score | `verdict:plumbers-pipefitters-and-steamfitters.obs` | [Verdict](https://humanobsolescenceindex.com/v/plumbers-pipefitters-and-steamfitters/) |
| 14/100 | Home health and personal care aides, Doom Score | `verdict:home-health-and-personal-care-aides.obs` | [Verdict](https://humanobsolescenceindex.com/v/home-health-and-personal-care-aides/) |
| +18.1% | Home health and personal care aides, BLS projected change | `verdict:home-health-and-personal-care-aides.projectedChangePct` | [Verdict](https://humanobsolescenceindex.com/v/home-health-and-personal-care-aides/) |
| 4,677,100 | Home health and personal care aides, employment 2025 | `verdict:home-health-and-personal-care-aides.employment` | [Verdict](https://humanobsolescenceindex.com/v/home-health-and-personal-care-aides/) |
| 7/100 | Massage therapists, Doom Score (lowest on the Index, tied) | `verdict:massage-therapists.obs` | [Verdict](https://humanobsolescenceindex.com/v/massage-therapists/) |
| 72/100 | Cashiers, Doom Score | `verdict:cashiers.obs` | [Verdict](https://humanobsolescenceindex.com/v/cashiers/) |
| 3,106,300 | Cashiers, employment 2025 | `verdict:cashiers.employment` | [Verdict](https://humanobsolescenceindex.com/v/cashiers/) |
| 33/100 | Fast food and counter workers, Doom Score | `verdict:fast-food-and-counter-workers.obs` | [Verdict](https://humanobsolescenceindex.com/v/fast-food-and-counter-workers/) |
| 3,855,900 | Fast food and counter workers, employment 2025 | `verdict:fast-food-and-counter-workers.employment` | [Verdict](https://humanobsolescenceindex.com/v/fast-food-and-counter-workers/) |
| 1950 | Switchboard operators still employed in 1950 (year) | `precedent:switchboard-operator` | [Museum exhibit](https://museumofextinctjobs.com/exhibits/switchboard-operator/) |
| 342,000 | US switchboard operators in 1950 | `precedent:switchboard-operator` | [Museum exhibit](https://museumofextinctjobs.com/exhibits/switchboard-operator/) |
<!-- stat-ledger:end -->
