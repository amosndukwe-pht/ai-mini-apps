# ai-mini-apps

Small weekly web apps by [Amos Ndukwe](https://x.com/BuiltByAmos) (@BuiltByAmos). Each app is static HTML, CSS, and JavaScript: no build step, no backend, and no API keys.

## Apps

| # | App | What it does | Live |
| --- | --- | --- | --- |
| 01 | [Keto Planner](keto-planner/) | Keto macro calculator and a one-day meal planner | https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/ |

## Live link pattern

GitHub Pages serves this repo at:

`https://amosndukwe-pht.github.io/ai-mini-apps/<app>/`

Example: [https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/](https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/)

Ask the Company is gallery app 04: [ask-company/](ask-company/), live at https://amosndukwe-pht.github.io/ai-mini-apps/ask-company/. It ranks a fictional sample corpus in the browser, applies a role filter, then asks Claude for an answer that cites those sources or says the documents do not contain it. A pasted Anthropic key stays in the browser and is not part of this repo.

## Run locally

```bash
python3 -m http.server 4173
```

Open http://localhost:4173/ for the gallery, or http://localhost:4173/keto-planner/ for the calculator.
