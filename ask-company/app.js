/* Ask the Company — local permission-aware search, then a cited Claude answer. */
globalThis.AskCompany = (() => {
  const MODEL = "claude-sonnet-5-5";
  const API_URL = "https://api.anthropic.com/v1/messages";
  const TOP_N = 2;
  const SESSION_KEY = "builtbyamos.askCompany.apiKey";
  const LOCAL_KEY = "builtbyamos.askCompany.apiKey";
  const REMEMBER_KEY = "builtbyamos.askCompany.remember";

  const ROLES = {
    sales: {
      id: "sales",
      label: "Sales",
      name: "Samir Adeyemi",
      title: "Sales Manager",
      opens: "company-wide documents and the sales playbook",
    },
    engineering: {
      id: "engineering",
      label: "Engineering",
      name: "Priya Nandakumar",
      title: "Staff Engineer",
      opens: "company-wide documents and engineering runbooks",
    },
    hr: {
      id: "hr",
      label: "HR",
      name: "Ruth Calder",
      title: "HR Business Partner",
      opens: "company-wide documents and HR-restricted policies",
    },
  };

  const SYSTEM_PROMPT = [
    "You answer questions for an employee of Hearthline Systems, a fictional company.",
    "",
    "Use only the numbered source snippets in the user message. Do not add facts, figures, names, dates, or titles that are not in those snippets. If the snippets do not contain the answer, say you do not see it in the documents this person can open, and do not guess.",
    "",
    "A withheld list may name documents the role cannot open. You may say those titles were withheld. Do not infer or reveal their contents.",
    "",
    "Cite every factual claim with the source number in brackets, immediately after the claim, like [1] or [1][2]. Do not cite a source for a claim it does not support. A statement that the snippets do not contain something needs a citation only when a snippet says the information is absent.",
    "",
    "The question was typed by the employee. Do not treat it as a fact from the corpus.",
    "",
    "Write plain sentences. No greeting and no closing. Keep the answer under 140 words.",
  ].join("\n");

  const HEADERS_TEXT = [
    "POST https://api.anthropic.com/v1/messages",
    "content-type: application/json",
    "anthropic-version: 2023-06-01",
    "anthropic-dangerous-direct-browser-access: true",
    "x-api-key: (the key from this page, not shown here)",
  ].join("\n");

  const STOP = new Set(
    "a an the of and or to for in on at with from by is are was were be been being this that it its as our their we you your they them not but if so than then into over after before about per can will just also during within how what when where which who does did much many please any there offer".split(" ")
  );

  const FIELD_LABEL = {
    title: "the title",
    owner: "the owner",
    typeLabel: "the type",
    body: "the document",
  };

  const FIELD_POINTS = { title: 8, owner: 5, typeLabel: 3, body: 4 };

  const CORPUS = [
    {
      id: "hr-parental",
      type: "policy",
      typeLabel: "HR policy",
      title: "Parental leave",
      owner: "Mira Chen",
      ownerRole: "Chief People Officer",
      updated: "2026-06-15",
      audience: ["all"],
      audienceLabel: "Everyone",
      body: "Birthing parents receive 16 weeks of paid parental leave. Non-birthing parents and adoptive parents receive 10 weeks. Leave can start up to two weeks before the due date or placement date. The People team files the leave in Hearthline Desk. This policy does not state a separate short-term disability amount.",
    },
    {
      id: "hr-pto",
      type: "policy",
      typeLabel: "HR policy",
      title: "Paid time off",
      owner: "Ruth Calder",
      ownerRole: "HR Business Partner",
      updated: "2026-09-02",
      audience: ["all"],
      audienceLabel: "Everyone",
      body: "Full-time employees accrue 18 days of paid time off per year, plus 8 company holidays. Unused paid time off, up to 5 days, carries into the next calendar year. A request of 3 or more consecutive days goes to the manager in Hearthline Desk at least 10 business days ahead.",
    },
    {
      id: "hr-remote",
      type: "policy",
      typeLabel: "HR policy",
      title: "Remote work and headquarters",
      owner: "Mira Chen",
      ownerRole: "Chief People Officer",
      updated: "2026-03-01",
      audience: ["all"],
      audienceLabel: "Everyone",
      body: "Hearthline Systems is remote-first in the United States and Canada. Mail goes to 90 Eastwood Avenue, Suite 400, Portland, Oregon. Core hours are 10:00 to 15:00 in the employee's local time zone. IT ships the laptop. This note does not list a second office.",
    },
    {
      id: "hr-benefits",
      type: "policy",
      typeLabel: "HR policy",
      title: "Health benefits overview",
      owner: "Ruth Calder",
      ownerRole: "HR Business Partner",
      updated: "2026-01-08",
      audience: ["all"],
      audienceLabel: "Everyone",
      body: "Full-time employees in the United States can join the Hearthline medical plan on the first of the month after the start date. The company pays 80 percent of the employee premium and 60 percent of the dependent premium. Dental and vision are employee-paid. This overview does not list plan names, deductibles, or carrier phone numbers. People sends the carrier packet after enrollment.",
    },
    {
      id: "hr-comp",
      type: "policy",
      typeLabel: "HR policy",
      title: "2026 engineering salary bands",
      owner: "Mira Chen",
      ownerRole: "Chief People Officer",
      updated: "2026-01-20",
      audience: ["hr"],
      audienceLabel: "HR",
      body: "Confidential to the People team. The 2026 engineering salary band for IC3 is $148,000 to $176,000 base. The 2026 engineering salary band for IC4 is $176,000 to $210,000 base. Sales account executive on-target earnings are $180,000, split evenly between base and variable pay. These bands are not posted on the company wiki. This note does not list executive pay.",
    },
    {
      id: "hr-review",
      type: "policy",
      typeLabel: "HR policy",
      title: "Fall performance review cycle",
      owner: "Ruth Calder",
      ownerRole: "HR Business Partner",
      updated: "2026-10-01",
      audience: ["hr"],
      audienceLabel: "HR",
      body: "The fall review cycle opens November 3, 2026 and closes November 21, 2026. Managers submit ratings in the People workspace. A rating of below requires a written plan within 15 days. Ratings are visible to the manager, their director, and People. They are not visible to peers. This note does not list salary bands.",
    },
    {
      id: "it-vpn",
      type: "howto",
      typeLabel: "How-to",
      title: "Connect to the Hearthline VPN",
      owner: "Elise Ward",
      ownerRole: "IT lead",
      updated: "2026-08-18",
      audience: ["all"],
      audienceLabel: "Everyone",
      body: "Install the Hearthline VPN client from the IT catalog in Hearthline Desk. Sign in with the work email. The gateway host is vpn.hearthline.example. Split tunnel is on, so only traffic to 10.8.0.0/16 uses the VPN. IT does not publish an office Wi-Fi password in this note. Guests use the network name Hearthline-Guest, and the front desk rotates that password weekly.",
    },
    {
      id: "it-laptop",
      type: "howto",
      typeLabel: "How-to",
      title: "New laptop setup",
      owner: "Elise Ward",
      ownerRole: "IT lead",
      updated: "2026-07-09",
      audience: ["all"],
      audienceLabel: "Everyone",
      body: "New hires receive a 14-inch laptop. Sign in with the work email, then install the Hearthline Desk agent, the VPN client, and the password manager. The vault name is Hearthline. IT ships to United States and Canada addresses only. This note does not include admin passwords.",
    },
    {
      id: "it-staging",
      type: "howto",
      typeLabel: "How-to",
      title: "Staging admin for Hearthline Desk",
      owner: "Elise Ward",
      ownerRole: "IT lead",
      updated: "2026-09-30",
      audience: ["engineering"],
      audienceLabel: "Engineering",
      body: "Engineering can request staging admin for Hearthline Desk through the access bot. The staging host is staging.desk.hearthline.example. Access lasts 8 hours. Production admin is not granted from this note. Sales and People do not receive staging admin.",
    },
    {
      id: "prod-sla",
      type: "spec",
      typeLabel: "Product spec",
      title: "Hearthline Desk support targets",
      owner: "Lena Ortiz",
      ownerRole: "Product Manager",
      updated: "2026-10-12",
      audience: ["all"],
      audienceLabel: "Everyone",
      body: "Hearthline Desk is the internal support console. Severity 1, a company-wide outage of Desk or Ledger, has a 15-minute first response and a 4-hour target to restore. Severity 2, one team blocked, has a 1-hour first response. Severity 3 has one business day. These targets are internal. Customer-facing commitments are not in this spec.",
    },
    {
      id: "prod-ledger",
      type: "spec",
      typeLabel: "Product spec",
      title: "Hearthline Ledger invoice states",
      owner: "Lena Ortiz",
      ownerRole: "Product Manager",
      updated: "2026-05-22",
      audience: ["all"],
      audienceLabel: "Everyone",
      body: "An invoice moves from draft to issued to paid, or from issued to void. A void requires a finance approver. Partial payment leaves the invoice issued. Ledger does not store card numbers. A refund over $5,000 needs a second approver in Finance. This spec does not set a sales discount.",
    },
    {
      id: "prod-search",
      type: "spec",
      typeLabel: "Product spec",
      title: "Hearthline Desk request search",
      owner: "Lena Ortiz",
      ownerRole: "Product Manager",
      updated: "2026-08-30",
      audience: ["all"],
      audienceLabel: "Everyone",
      body: "Search inside Hearthline Desk looks at requests the signed-in person is allowed to open. It does not search another company's data. Results show the request title, owner, and last update. Desk search is not the company wiki. Questions about company policy are out of scope for this spec.",
    },
    {
      id: "sales-discount",
      type: "playbook",
      typeLabel: "Sales playbook",
      title: "Maximum discount a sales rep can offer",
      owner: "Owen Briggs",
      ownerRole: "VP Sales",
      updated: "2026-09-14",
      audience: ["sales"],
      audienceLabel: "Sales",
      body: "An account executive may discount Hearthline Desk list price by up to 10 percent without approval. From 11 to 20 percent requires the sales manager, Samir Adeyemi. Above 20 percent, and any discount on Hearthline Ledger, requires Owen Briggs, VP Sales. A deal of 24 months or more may add one extra month free, and that free month still counts toward the 20 percent line. This page does not authorize free professional services.",
    },
    {
      id: "sales-compete",
      type: "playbook",
      typeLabel: "Sales playbook",
      title: "Competitive notes on Bracken and Lumen Bay",
      owner: "Samir Adeyemi",
      ownerRole: "Sales Manager",
      updated: "2026-10-08",
      audience: ["sales"],
      audienceLabel: "Sales",
      body: "When a buyer names Bracken Search, say Hearthline Desk is the system of record for internal requests, and search is a feature inside Desk. Lumen Bay came up with two prospects in September 2026 who asked about billing. Hearthline Ledger does not do payroll. Do not claim a security certification on a first call. Security sends the letter. These notes are for the sales team.",
    },
    {
      id: "sales-price",
      type: "playbook",
      typeLabel: "Sales playbook",
      title: "List price card for October 2026",
      owner: "Owen Briggs",
      ownerRole: "VP Sales",
      updated: "2026-10-01",
      audience: ["sales"],
      audienceLabel: "Sales",
      body: "Hearthline Desk list price is $36 per employee per month, billed annually. Hearthline Ledger is $800 per month per legal entity, plus $0.15 per issued invoice. Implementation for Desk is $12,000. These are list prices. The maximum discount a rep can offer is a separate note. Prices are not for the engineering wiki or the People wiki.",
    },
    {
      id: "eng-oncall",
      type: "runbook",
      typeLabel: "Runbook",
      title: "Hearthline Desk on-call this week",
      owner: "Noah Pell",
      ownerRole: "Engineering Manager",
      updated: "2026-10-20",
      audience: ["engineering"],
      audienceLabel: "Engineering",
      body: "Primary on-call for Hearthline Desk rotates weekly, starting Monday at 09:00 Pacific. For the week of October 26, 2026, the primary is Priya Nandakumar. The secondary is Noah Pell. Page through the Hearthline Pager channel. A severity 1 page needs an update in the incident channel within 15 minutes. This runbook does not include production passwords.",
    },
    {
      id: "eng-deploy",
      type: "runbook",
      typeLabel: "Runbook",
      title: "Deploy Hearthline Desk",
      owner: "Priya Nandakumar",
      ownerRole: "Staff Engineer",
      updated: "2026-10-18",
      audience: ["engineering"],
      audienceLabel: "Engineering",
      body: "Desk deploys from the main branch after the pipeline is green. From a platform laptop, run desk deploy --env production. Roll back with desk deploy --env production --revision previous. Deploys are frozen on Fridays after 15:00 Pacific and on company holidays. Sales cannot start a production deploy. Do not run a deploy from guest Wi-Fi.",
    },
    {
      id: "eng-incident",
      type: "runbook",
      typeLabel: "Runbook",
      title: "Incident 2026-09-29 Ledger invoice delay",
      owner: "Noah Pell",
      ownerRole: "Engineering Manager",
      updated: "2026-09-30",
      audience: ["engineering"],
      audienceLabel: "Engineering",
      body: "On September 29, 2026, issued invoices were delayed by 40 minutes. The cause was a stuck worker on the invoice queue. Noah Pell restarted the worker at 11:14 Pacific, and the queue drained by 11:52. No invoices were lost. The follow-up is a queue-age alert at 10 minutes, owned by Priya Nandakumar, due November 6, 2026. This note is restricted to Engineering.",
    },
    {
      id: "dir-people",
      type: "directory",
      typeLabel: "Directory",
      title: "Team directory",
      owner: "Ruth Calder",
      ownerRole: "HR Business Partner",
      updated: "2026-10-06",
      audience: ["all"],
      audienceLabel: "Everyone",
      body: "Mira Chen is Chief People Officer. Owen Briggs is VP Sales. Noah Pell manages platform engineering. Elise Ward leads IT. Lena Ortiz is product manager for Hearthline Desk and Hearthline Ledger. Samir Adeyemi is a sales manager. Priya Nandakumar is a staff engineer on platform. Theo Marsh is a solutions engineer on the sales team. The directory does not list personal phone numbers, home addresses, or a CEO cell phone number.",
    },
    {
      id: "dir-office",
      type: "directory",
      typeLabel: "Directory",
      title: "Office and mail",
      owner: "Elise Ward",
      ownerRole: "IT lead",
      updated: "2026-04-02",
      audience: ["all"],
      audienceLabel: "Everyone",
      body: "The only office is 90 Eastwood Avenue, Suite 400, Portland, Oregon. There is no London office and no New York office. Visitors sign in at the front desk. Mail stops in Portland only.",
    },
  ];

  const DEMOS = [
    {
      id: "leave",
      question: "How much parental leave do we offer?",
      match: ["parental leave"],
      refuses: { sales: false, engineering: false, hr: false },
      answers: {
        all: [
          "Birthing parents receive 16 weeks of paid parental leave. {hr-parental}",
          "Non-birthing parents and adoptive parents receive 10 weeks. {hr-parental}",
          "Leave can start up to two weeks before the due date or placement date, and the People team files it in Hearthline Desk. {hr-parental}",
          "The policy does not state a separate short-term disability amount. {hr-parental}",
        ],
      },
    },
    {
      id: "discount",
      question: "What is the maximum discount a sales rep can offer?",
      match: ["maximum discount", "discount a sales rep", "discount authority"],
      refuses: { sales: false, engineering: true, hr: true },
      answers: {
        sales: [
          "An account executive may discount Hearthline Desk list price by up to 10 percent without approval. {sales-discount}",
          "From 11 to 20 percent requires the sales manager, Samir Adeyemi. {sales-discount}",
          "Above 20 percent, and any discount on Hearthline Ledger, requires Owen Briggs, VP Sales. {sales-discount}",
          "A deal of 24 months or more may add one extra month free, and that free month still counts toward the 20 percent line. {sales-discount}",
          "The playbook does not authorize free professional services. {sales-discount}",
        ],
        engineering: [
          "I don't see a discount limit in the documents you can open.",
          "The Hearthline Ledger spec says it does not set a sales discount. {prod-ledger}",
        ],
        hr: [
          "I don't see a discount limit in the documents you can open.",
          "The Hearthline Ledger spec says it does not set a sales discount. {prod-ledger}",
        ],
      },
    },
    {
      id: "oncall",
      question: "Who is on call for Hearthline Desk this week?",
      match: ["on call", "on-call"],
      refuses: { sales: true, engineering: false, hr: true },
      answers: {
        engineering: [
          "For the week of October 26, 2026, the primary on-call for Hearthline Desk is Priya Nandakumar. {eng-oncall}",
          "The secondary is Noah Pell. {eng-oncall}",
          "The rotation starts Monday at 09:00 Pacific, and a severity 1 page needs an update in the incident channel within 15 minutes. {eng-oncall}",
          "The runbook does not include production passwords. {eng-oncall}",
        ],
        sales: [
          "I don't see this week's on-call in the documents you can open.",
        ],
        hr: [
          "I don't see this week's on-call in the documents you can open.",
        ],
      },
    },
    {
      id: "salary",
      question: "What are the 2026 engineering salary bands?",
      match: ["salary band"],
      refuses: { sales: true, engineering: true, hr: false },
      answers: {
        hr: [
          "The 2026 engineering salary band for IC3 is $148,000 to $176,000 base. {hr-comp}",
          "The 2026 engineering salary band for IC4 is $176,000 to $210,000 base. {hr-comp}",
          "These bands are confidential to the People team and are not posted on the company wiki. {hr-comp}",
          "The note does not list executive pay. {hr-comp}",
        ],
        sales: [
          "I don't see engineering salary bands in the documents you can open.",
        ],
        engineering: [
          "I don't see engineering salary bands in the documents you can open.",
        ],
      },
    },
    {
      id: "unknown",
      question: "What is the CEO's personal cell phone number?",
      match: ["cell phone", "ceo"],
      refuses: { sales: true, engineering: true, hr: true },
      answers: {
        all: [
          "The team directory does not list personal phone numbers, home addresses, or a CEO cell phone number. {dir-people}",
          "I don't see that number in the documents you can open.",
        ],
      },
    },
    {
      id: "picnic",
      question: "When is the company picnic?",
      match: ["company picnic", "picnic"],
      refuses: { sales: true, engineering: true, hr: true },
      answers: {
        all: [
          "I don't see a company picnic in the documents you can open.",
        ],
      },
    },
  ];

  function tokenize(text) {
    const lowered = String(text || "").toLowerCase().replace(/\$/g, "");
    const foldNumbers = (value) => value.replace(/(\d),(\d)/g, "$1$2");
    const raw = `${foldNumbers(lowered)} ${foldNumbers(lowered.replace(/-/g, ""))}`;
    const out = [];
    for (const part of raw.split(/[^a-z0-9]+/)) {
      if (part.length < 2 || STOP.has(part)) continue;
      out.push(part);
    }
    return out;
  }

  function buildIndex(corpus) {
    const fields = ["title", "owner", "typeLabel", "body"];
    const docs = corpus.map((doc) => ({
      doc,
      bags: {
        title: tokenize(doc.title),
        owner: tokenize(`${doc.owner} ${doc.ownerRole}`),
        typeLabel: tokenize(doc.typeLabel),
        body: tokenize(doc.body),
      },
    }));
    return { docs, fields };
  }

  const INDEX = buildIndex(CORPUS);

  function canRead(doc, role) {
    return doc.audience.includes("all") || doc.audience.includes(role);
  }

  function hiddenCorpus(role) {
    return CORPUS.filter((doc) => !canRead(doc, role));
  }

  function bestHit(row, term) {
    let field = "";
    let points = 0;
    for (const name of INDEX.fields) {
      if (!row.bags[name].includes(term)) continue;
      if (FIELD_POINTS[name] > points) {
        field = name;
        points = FIELD_POINTS[name];
      }
    }
    return { field, points };
  }

  function whyText(hits) {
    const groups = new Map();
    for (const hit of hits) {
      if (!groups.has(hit.field)) groups.set(hit.field, []);
      const list = groups.get(hit.field);
      if (!list.includes(hit.term)) list.push(hit.term);
    }
    const parts = [...groups.entries()].map(([field, terms]) => `${terms.join(" and ")} in ${FIELD_LABEL[field]}`);
    return `Matched ${parts.join("; ")}.`;
  }

  function search(query, role, limit = TOP_N) {
    const queryTokens = [...new Set(tokenize(query))];
    const ranked = [];
    if (queryTokens.length && ROLES[role]) {
      for (const row of INDEX.docs) {
        const hits = [];
        let score = 0;
        for (const term of queryTokens) {
          const hit = bestHit(row, term);
          if (!hit.field) continue;
          hits.push({ term, field: hit.field });
          score += hit.points;
        }
        if (!hits.length || score < 8) continue;
        const recency = Date.parse(`${row.doc.updated}T00:00:00Z`);
        const days = (recency - Date.parse("2026-01-01T00:00:00Z")) / 86400000;
        score += days * 0.02;
        ranked.push({
          row,
          score,
          hits,
          recency,
          allowed: canRead(row.doc, role),
        });
      }
    }
    ranked.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.05) return b.score - a.score;
      if (a.recency !== b.recency) return b.recency - a.recency;
      return a.row.doc.id < b.row.doc.id ? -1 : 1;
    });
    const visible = ranked.filter((item) => item.allowed);
    const hidden = ranked.filter((item) => !item.allowed);
    const toResult = (item) => ({
      ...item.row.doc,
      score: item.score,
      hits: item.hits,
      why: whyText(item.hits),
    });
    return {
      queryTokens,
      totalVisible: visible.length,
      totalFiltered: hidden.length,
      results: visible.slice(0, limit).map(toResult),
      filtered: hidden.slice(0, 4).map((item) => {
        const result = toResult(item);
        return {
          id: result.id,
          type: result.type,
          typeLabel: result.typeLabel,
          title: result.title,
          owner: result.owner,
          ownerRole: result.ownerRole,
          updated: result.updated,
          audienceLabel: result.audienceLabel,
          why: result.why,
          score: result.score,
        };
      }),
    };
  }

  function formatDate(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  function snippet(body, queryTokens, limit = 160) {
    const lower = body.toLowerCase();
    const terms = [...queryTokens].sort((a, b) => b.length - a.length);
    let index = -1;
    for (const term of terms) {
      const at = lower.indexOf(term);
      if (at >= 0) {
        index = at;
        break;
      }
    }
    if (index < 0 || body.length <= limit) return body.length <= limit ? body : `${body.slice(0, limit).trim()}…`;
    const start = Math.max(0, index - 60);
    const end = Math.min(body.length, start + limit);
    const slice = body.slice(start, end).trim();
    return `${start > 0 ? "…" : ""}${slice}${end < body.length ? "…" : ""}`;
  }

  function userPrompt(question, role, found) {
    const persona = ROLES[role];
    const lines = [
      "Answer the employee.",
      "",
      `Question: ${question}`,
      `Viewing as: ${persona.label} — ${persona.name}, ${persona.title}`,
      "",
    ];
    if (!found.results.length) {
      lines.push("Documents this person can open: none matched the question.");
      lines.push("");
    } else {
      lines.push("Documents this person can open are numbered in the order shown in the app. Use only these snippets.");
      lines.push("");
      found.results.forEach((doc, index) => {
        lines.push(`[${index + 1}] ${doc.typeLabel} · updated ${doc.updated} · ${doc.title}`);
        lines.push(`Owner: ${doc.owner} (${doc.ownerRole})`);
        lines.push(`Audience: ${doc.audienceLabel}`);
        lines.push(doc.body);
        lines.push("");
      });
    }
    if (found.filtered.length) {
      lines.push("Withheld by permissions. Titles only. Do not guess their contents:");
      found.filtered.forEach((doc) => {
        lines.push(`- ${doc.typeLabel} · ${doc.title} · ${doc.owner} · restricted to ${doc.audienceLabel}`);
      });
    } else {
      lines.push("Withheld by permissions: none for this search.");
    }
    return lines.join("\n").trim();
  }

  function buildRequest(question, role, found) {
    return {
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: "between_tools" },
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt(question, role, found) }],
    };
  }

  function citeSentence(results, template) {
    const ids = [...template.matchAll(/\{([a-z0-9-]+)\}/g)].map((match) => match[1]);
    if (ids.some((id) => !results.some((doc) => doc.id === id))) return "";
    return template.replace(/\{([a-z0-9-]+)\}/g, (_, id) => {
      const number = results.findIndex((doc) => doc.id === id) + 1;
      return `[${number}]`;
    });
  }

  function norm(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function matchDemo(question) {
    const normal = norm(question);
    if (!normal) return null;
    for (const demo of DEMOS) {
      if (norm(demo.question) === normal) return demo;
    }
    let best = null;
    let bestLen = 0;
    for (const demo of DEMOS) {
      for (const phrase of demo.match) {
        const key = norm(phrase);
        if (key && normal.includes(key) && key.length > bestLen) {
          best = demo;
          bestLen = key.length;
        }
      }
    }
    return best;
  }

  function demoRefuses(demo, role) {
    if (!demo) return false;
    if (Object.prototype.hasOwnProperty.call(demo.refuses, role)) return Boolean(demo.refuses[role]);
    return Boolean(demo.refuses.all);
  }

  function demoText(demo, role, results) {
    const templates = (demo && (demo.answers[role] || demo.answers.all)) || [];
    const text = templates.map((template) => citeSentence(results, template)).filter(Boolean).join(" ");
    return text || "I don't see that in the documents you can open.";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function escapeReg(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(text, terms) {
    const safe = escapeHtml(text);
    const unique = [...new Set(terms)].filter((term) => term.length > 2).sort((a, b) => b.length - a.length);
    if (!unique.length) return safe;
    const pattern = new RegExp(`(${unique.map(escapeReg).join("|")})`, "gi");
    return safe.replace(pattern, "<mark>$1</mark>");
  }

  function stripFence(text) {
    const trimmed = text.trim();
    const fenced = /^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
    return fenced ? fenced[1].trim() : trimmed;
  }

  function inlineHtml(text, resultCount) {
    const safe = escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return safe.replace(/\[(\d+)\]/g, (_, raw) => {
      const number = Number(raw);
      if (!resultCount || number < 1 || number > resultCount) return `[${raw}]`;
      return `<button type="button" class="cite" data-cite="${number}">[${number}]</button>`;
    });
  }

  function renderBlocks(markdown, resultCount) {
    const lines = stripFence(markdown).replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let paragraph = [];
    let list = null;
    const flushParagraph = () => {
      if (!paragraph.length) return;
      blocks.push({ type: "p", text: paragraph.join(" ") });
      paragraph = [];
    };
    const flushList = () => {
      if (!list) return;
      blocks.push(list);
      list = null;
    };
    for (const line of lines) {
      const heading = /^(#{2,3})\s+(.*)$/.exec(line);
      if (heading) {
        flushParagraph();
        flushList();
        blocks.push({ type: "h", text: heading[2] });
        continue;
      }
      const ordered = /^\d+\.\s+(.*)$/.exec(line);
      const unordered = /^[-*]\s+(.*)$/.exec(line);
      if (ordered || unordered) {
        flushParagraph();
        const kind = ordered ? "ol" : "ul";
        if (!list || list.kind !== kind) {
          flushList();
          list = { type: "list", kind, items: [] };
        }
        list.items.push((ordered || unordered)[1]);
        continue;
      }
      if (!line.trim()) {
        flushParagraph();
        flushList();
        continue;
      }
      flushList();
      paragraph.push(line.trim());
    }
    flushParagraph();
    flushList();
    const root = document.createElement("div");
    for (const block of blocks) {
      if (block.type === "h") {
        const heading = document.createElement("h3");
        heading.innerHTML = inlineHtml(block.text, resultCount);
        root.append(heading);
        continue;
      }
      if (block.type === "list") {
        const listNode = document.createElement(block.kind);
        for (const item of block.items) {
          const li = document.createElement("li");
          li.innerHTML = inlineHtml(item, resultCount);
          listNode.append(li);
        }
        root.append(listNode);
        continue;
      }
      const p = document.createElement("p");
      p.innerHTML = inlineHtml(block.text, resultCount);
      root.append(p);
    }
    return root;
  }

  function textFromMessage(data) {
    const blocks = Array.isArray(data && data.content) ? data.content : [];
    return blocks
      .filter((block) => block && block.type === "text" && block.text)
      .map((block) => block.text)
      .join("\n\n")
      .trim();
  }

  function readStorage() {
    let remember = false;
    let key = "";
    try {
      remember = localStorage.getItem(REMEMBER_KEY) === "1";
    } catch {
      remember = false;
    }
    try {
      key = (remember ? localStorage.getItem(LOCAL_KEY) : sessionStorage.getItem(SESSION_KEY)) || "";
    } catch {
      key = "";
    }
    return { key, remember };
  }

  function writeStorage(key, remember) {
    try {
      if (remember) {
        if (key) localStorage.setItem(LOCAL_KEY, key);
        else localStorage.removeItem(LOCAL_KEY);
        localStorage.setItem(REMEMBER_KEY, "1");
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        if (key) sessionStorage.setItem(SESSION_KEY, key);
        else sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LOCAL_KEY);
        localStorage.setItem(REMEMBER_KEY, "0");
      }
    } catch {
      /* private mode */
    }
  }

  function clearStorage() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(LOCAL_KEY);
      localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* private mode */
    }
  }

  function mount() {
    const $ = (selector) => document.querySelector(selector);
    const questionInput = $("#question");
    const keyInput = $("#api-key");
    const rememberInput = $("#remember-key");
    const askButton = $("#ask");
    const formError = $("#form-error");
    const roleButtons = [...document.querySelectorAll("[data-role]")];
    let role = "sales";
    let busy = false;
    let generation = 0;
    let controller = null;

    const saved = readStorage();
    if (saved.key) keyInput.value = saved.key;
    rememberInput.checked = saved.remember;
    paintPersona();

    function prefersReducedMotion() {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function wait(ms) {
      if (prefersReducedMotion()) return Promise.resolve();
      return new Promise((resolve) => {
        window.setTimeout(resolve, ms);
      });
    }

    function say(message) {
      $("#live").textContent = message;
    }

    function setStep(step, state, detail) {
      const item = document.querySelector(`[data-step="${step}"]`);
      item.dataset.state = state;
      if (state === "active") item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      if (detail) item.querySelector("[data-detail]").textContent = detail;
    }

    function resetSteps() {
      setStep("search", "idle", "Glean-style · local");
      setStep("permissions", "idle", "Role filter");
      setStep("claude", "idle", "Sonnet 5.5");
      setStep("answer", "idle", "Cited");
    }

    function paintPersona() {
      const persona = ROLES[role];
      const hidden = hiddenCorpus(role).length;
      const noun = hidden === 1 ? "document" : "documents";
      $("#persona").textContent = `${persona.name}, ${persona.title}. ${hidden} ${noun} hidden from this role.`;
    }

    function persistKey() {
      writeStorage(keyInput.value.trim(), rememberInput.checked);
    }

    function setBusy(next) {
      busy = next;
      askButton.disabled = next;
      askButton.setAttribute("aria-busy", next ? "true" : "false");
    }

    function showError(message) {
      formError.textContent = message || "";
    }

    function showPrompt(request, note) {
      $("#prompt-section").hidden = false;
      $("#prompt-note").textContent = note;
      $("#headers-view").textContent = HEADERS_TEXT;
      $("#prompt-view").textContent = JSON.stringify(request, null, 2);
    }

    function paintSources(found) {
      $("#sources-empty").hidden = true;
      $("#sources-data").hidden = false;
      $("#sources-panel").setAttribute("aria-labelledby", "sources-title");
      const count = found.results.length;
      $("#sources-title").textContent = count === 1 ? "1 source" : `${count} sources`;
      $("#sources-count").textContent = found.totalVisible > count
        ? `Top ${count} of ${found.totalVisible}`
        : `${found.totalVisible} match${found.totalVisible === 1 ? "" : "es"}`;
      const list = $("#results");
      list.replaceChildren();
      found.results.forEach((doc, index) => {
        const item = document.createElement("li");
        item.className = "result";
        item.id = `source-${index + 1}`;
        item.tabIndex = -1;

        const top = document.createElement("div");
        top.className = "result-top";
        const rank = document.createElement("span");
        rank.className = "rank";
        rank.textContent = String(index + 1);
        const type = document.createElement("span");
        type.className = "type";
        type.dataset.type = doc.type;
        type.textContent = doc.typeLabel;
        const date = document.createElement("span");
        date.className = "date";
        date.textContent = formatDate(doc.updated);
        top.append(rank, type, date);

        const title = document.createElement("h3");
        title.textContent = doc.title;

        const owner = document.createElement("p");
        owner.className = "owner";
        owner.textContent = `${doc.owner} · ${doc.ownerRole} · ${doc.audienceLabel}`;

        const body = document.createElement("p");
        body.className = "snippet";
        body.innerHTML = highlight(snippet(doc.body, found.queryTokens), found.queryTokens);

        const why = document.createElement("p");
        why.className = "why";
        why.textContent = doc.why;

        item.append(top, title, owner, body, why);
        list.append(item);
      });
      if (!count) {
        const empty = document.createElement("li");
        empty.className = "owner";
        empty.textContent = "No open document matched.";
        list.append(empty);
      }

      const block = $("#filtered-block");
      const note = $("#filtered-note");
      const filtered = $("#filtered");
      filtered.replaceChildren();
      if (!found.filtered.length) {
        block.hidden = true;
        block.classList.add("is-clear");
        note.textContent = "No matched document was filtered out for this role.";
        return;
      }
      block.hidden = false;
      block.classList.remove("is-clear");
      const noun = found.totalFiltered === 1 ? "document" : "documents";
      note.textContent = `${found.totalFiltered} matched ${noun} filtered out for ${ROLES[role].label}. Not sent to Claude.`;
      found.filtered.forEach((doc) => {
        const item = document.createElement("li");
        item.className = "withheld";
        const title = document.createElement("strong");
        title.textContent = doc.title;
        const meta = document.createElement("p");
        meta.textContent = `${doc.typeLabel} · ${doc.owner} · ${formatDate(doc.updated)} · Restricted to ${doc.audienceLabel}`;
        item.append(title, meta);
        filtered.append(item);
      });
    }

    function paintAnswer(question, text, found, mode) {
      $("#answer-empty").hidden = true;
      $("#answer-data").hidden = false;
      $("#asked").textContent = question;
      $("#answer-mode").innerHTML = `<strong>${escapeHtml(mode.label)}</strong> ${escapeHtml(mode.detail)}`;
      const article = $("#answer");
      article.replaceChildren();
      const kicker = document.createElement("p");
      kicker.className = mode.refuses ? "paper-kicker is-refusal" : "paper-kicker";
      kicker.textContent = mode.kicker;
      article.append(kicker, renderBlocks(text, found.results.length));
      article.classList.remove("is-fresh");
      void article.offsetWidth;
      article.classList.add("is-fresh");
      revealStage();
    }

    function revealStage() {
      const stage = document.querySelector(".stage");
      const top = stage.getBoundingClientRect().top;
      if (top >= 80 && top < 280) return;
      stage.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    }

    function showNeedKey(question) {
      $("#answer-empty").hidden = true;
      $("#answer-data").hidden = false;
      $("#asked").textContent = question;
      $("#answer-mode").textContent = "Demo mode only includes prewritten answers for the sample questions.";
      const article = $("#answer");
      article.replaceChildren();
      const kicker = document.createElement("p");
      kicker.className = "paper-kicker";
      kicker.textContent = "Key needed";
      const copy = document.createElement("p");
      copy.textContent = "Paste an Anthropic API key to ask this, or use a sample question. The key stays in this browser.";
      article.append(kicker, copy);
      revealStage();
    }

    function markChips(question) {
      document.querySelectorAll("[data-question]").forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.question === question ? "true" : "false");
      });
    }

    async function run() {
      const token = ++generation;
      const question = questionInput.value.trim();
      const apiKey = keyInput.value.trim();
      persistKey();
      if (!question) {
        showError("Ask a question first.");
        questionInput.focus();
        return;
      }
      showError("");
      if (controller) controller.abort();
      controller = new AbortController();
      setBusy(true);
      resetSteps();
      setStep("search", "active", "Ranking sample docs");
      say(`Searching as ${ROLES[role].label}.`);
      await wait(80);
      if (token !== generation) return;
      const found = search(question, role);
      setStep("search", "done", `${CORPUS.length} sample docs`);
      setStep("permissions", "active", ROLES[role].label);
      await wait(70);
      if (token !== generation) return;
      paintSources(found);
      const withheldLabel = found.totalFiltered ? `${found.totalFiltered} withheld` : "None withheld";
      setStep("permissions", "done", withheldLabel);
      const request = buildRequest(question, role, found);
      markChips(question);
      const demo = matchDemo(question);

      if (!apiKey) {
        if (!demo) {
          setStep("claude", "idle", "Needs a key");
          setStep("answer", "idle", "Not written");
          showPrompt(request, "Not sent. Demo mode has prewritten answers for the sample questions only.");
          showNeedKey(question);
          setBusy(false);
          say("Paste an Anthropic key, or choose a sample question.");
          return;
        }
        setStep("claude", "active", "Demo, not a call");
        await wait(80);
        if (token !== generation) return;
        const text = demoText(demo, role, found.results);
        const refuses = demoRefuses(demo, role) || /^I don't see/i.test(text);
        setStep("claude", "done", "Prewritten demo");
        setStep("answer", "done", refuses ? "Not in the docs" : "Cited");
        paintAnswer(question, text, found, {
          refuses,
          kicker: refuses ? "Not in the documents you can open" : "Demo answer",
          label: "Demo mode.",
          detail: "Prewritten from the sources this role can open. Claude was not called.",
        });
        showPrompt(
          request,
          "Not sent. With an Anthropic key, the browser POSTs this JSON to the Messages API and the answer below is replaced by Claude’s reply."
        );
        setBusy(false);
        say(refuses ? "The documents you can open do not contain that." : "Demo answer ready. Claims cite the numbered sources.");
        return;
      }

      setStep("claude", "active", MODEL);
      showPrompt(request, "Sending this body to the Anthropic Messages API. The key is only in the request header.");
      say("Calling Claude.");
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify(request),
        });
        if (token !== generation) return;
        const raw = await response.text();
        let data = null;
        try {
          data = JSON.parse(raw);
        } catch {
          data = null;
        }
        if (!response.ok) {
          const message = data && data.error && data.error.message
            ? data.error.message
            : `Anthropic returned status ${response.status}.`;
          throw new Error(message);
        }
        const text = textFromMessage(data);
        if (!text) throw new Error("Claude returned no text. Try the question again.");
        const refuses = /^I don't see/i.test(text);
        setStep("claude", "done", MODEL);
        setStep("answer", "done", refuses ? "Not in the docs" : "Cited");
        paintAnswer(question, text, found, {
          refuses,
          kicker: refuses ? "Not in the documents you can open" : "Claude Sonnet 5.5",
          label: MODEL,
          detail: "Written from the snippets this role can open. Citations use the same numbers.",
        });
        showPrompt(request, "This body was sent to https://api.anthropic.com/v1/messages. The key was only in the x-api-key header.");
        say(refuses ? "Claude does not see the answer in the open documents." : "Answer ready.");
      } catch (error) {
        if (error && error.name === "AbortError") return;
        if (token !== generation) return;
        const message = error && error.message ? error.message : "The call to Anthropic did not complete.";
        setStep("claude", "idle", "Call failed");
        setStep("answer", "idle", "Not written");
        $("#answer-empty").hidden = true;
        $("#answer-data").hidden = false;
        $("#asked").textContent = question;
        $("#answer-mode").textContent = "The key stayed in this browser. Nothing was written to the repo.";
        const article = $("#answer");
        article.replaceChildren();
        const kicker = document.createElement("p");
        kicker.className = "paper-kicker";
        kicker.textContent = "Claude did not answer";
        const copy = document.createElement("p");
        copy.textContent = message;
        article.append(kicker, copy);
        if (demo) {
          const again = document.createElement("p");
          const button = document.createElement("button");
          button.type = "button";
          button.className = "cite";
          button.id = "use-demo";
          button.textContent = "Show demo answer";
          again.append(button);
          article.append(again);
        }
        showPrompt(request, "This body was sent. Anthropic did not return an answer.");
        say(message);
      } finally {
        if (token === generation) setBusy(false);
      }
    }

    $("#ask-form").addEventListener("submit", (event) => {
      event.preventDefault();
      run();
    });

    keyInput.addEventListener("input", persistKey);
    rememberInput.addEventListener("change", persistKey);
    $("#clear-key").addEventListener("click", () => {
      keyInput.value = "";
      rememberInput.checked = false;
      clearStorage();
      keyInput.focus();
      say("API key cleared from this browser.");
    });

    function selectRole(next, rerun) {
      if (!ROLES[next]) return;
      role = next;
      roleButtons.forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.role === role ? "true" : "false");
      });
      paintPersona();
      if (rerun && questionInput.value.trim()) run();
    }

    roleButtons.forEach((button, index) => {
      button.addEventListener("click", () => selectRole(button.dataset.role, true));
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const next = roleButtons[(index + delta + roleButtons.length) % roleButtons.length];
        next.focus();
        selectRole(next.dataset.role, true);
      });
    });

    document.querySelectorAll("[data-question]").forEach((button) => {
      button.addEventListener("click", () => {
        questionInput.value = button.dataset.question;
        run();
      });
    });

    $("#answer").addEventListener("click", (event) => {
      const cite = event.target.closest(".cite[data-cite]");
      if (cite) {
        const card = document.getElementById(`source-${cite.dataset.cite}`);
        if (!card) return;
        document.querySelectorAll(".result.is-lit").forEach((item) => item.classList.remove("is-lit"));
        card.classList.add("is-lit");
        card.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest" });
        return;
      }
      if (event.target.id === "use-demo") {
        keyInput.value = "";
        persistKey();
        run();
      }
    });
  }

  return {
    CORPUS,
    MODEL,
    ROLES,
    SYSTEM_PROMPT,
    search,
    buildRequest,
    matchDemo,
    demoText,
    demoRefuses,
    canRead,
    hiddenCorpus,
    tokenize,
    userPrompt,
    mount,
  };
})();

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => AskCompany.mount());
  else AskCompany.mount();
}
