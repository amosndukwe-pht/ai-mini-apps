# ai-mini-apps

Small weekly web apps by [Amos Ndukwe](https://x.com/BuiltByAmos) (@BuiltByAmos). Each app is static HTML, CSS, and JavaScript: no build step and no backend. Meeting Prep can call Claude with a key you paste in the page. That key stays in the browser and is not part of this repo.

## Apps

| # | App | What it does | Live |
| --- | --- | --- | --- |
| 01 | [Keto Planner](keto-planner/) | Keto macro calculator and a one-day meal planner | https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/ |
| 03 | [Meeting Prep](meeting-prep/) | Sample-corpus search, then a cited Claude brief for a client meeting | https://amosndukwe-pht.github.io/ai-mini-apps/meeting-prep/ |

## Live link pattern

GitHub Pages serves this repo at:

`https://amosndukwe-pht.github.io/ai-mini-apps/<app>/`

Example: [https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/](https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/)

## Run locally

```bash
python3 -m http.server 4173
```

Open http://localhost:4173/ for the gallery, or http://localhost:4173/keto-planner/ for the calculator.
