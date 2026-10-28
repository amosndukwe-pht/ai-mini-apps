# ai-mini-apps

Small weekly web apps by [Amos Ndukwe](https://x.com/BuiltByAmos) (@BuiltByAmos). Each app is static HTML, CSS, and JavaScript: no build step, no backend, and no API keys.

## Apps

| # | App | What it does | Live |
| --- | --- | --- | --- |
| 01 | [Keto Planner](keto-planner/) | Keto macro calculator and a one-day meal planner | https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/ |

## Live link pattern

Onboarding Buddy is gallery app 05: [onboarding-buddy/](onboarding-buddy/), live at https://amosndukwe-pht.github.io/ai-mini-apps/onboarding-buddy/. A new hire picks a sample profile, then the page ranks a fictional onboarding packet in the browser and asks Claude for a Day 1, Week 1, and Day 30 checklist with owners and deadlines. A pasted Anthropic key stays in the browser and is not part of this repo.

GitHub Pages serves this repo at:

`https://amosndukwe-pht.github.io/ai-mini-apps/<app>/`

Example: [https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/](https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/)

## Run locally

```bash
python3 -m http.server 4173
```

Open http://localhost:4173/ for the gallery, or http://localhost:4173/keto-planner/ for the calculator.
