# ai-mini-apps

Small weekly web apps by [Amos Ndukwe](https://x.com/BuiltByAmos) (@BuiltByAmos). Each app is static HTML, CSS, and JavaScript: no build step, no backend, and no API keys.

## Apps

| # | App | What it does | Live |
| --- | --- | --- | --- |
| 01 | [Keto Planner](keto-planner/) | Keto macro calculator and a one-day meal planner | https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/ |
| 02 | [AI Agent Team](agent-team/) | Org chart for an agent team: jobs, tools, approvals, and handoffs | https://amosndukwe-pht.github.io/ai-mini-apps/agent-team/ |

## Live link pattern

GitHub Pages serves this repo at:

`https://amosndukwe-pht.github.io/ai-mini-apps/<app>/`

Example: [https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/](https://amosndukwe-pht.github.io/ai-mini-apps/keto-planner/)

## Run locally

```bash
python3 -m http.server 4173
```

Open http://localhost:4173/ for the gallery, http://localhost:4173/keto-planner/ for the calculator, or http://localhost:4173/agent-team/ for the org chart.
