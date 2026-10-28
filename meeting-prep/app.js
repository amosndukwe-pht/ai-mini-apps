/* Meeting Prep — local sample search, then a cited Claude brief. */
globalThis.MeetingPrep = (() => {
  const MODEL = "claude-sonnet-5-5";
  const API_URL = "https://api.anthropic.com/v1/messages";
  const TOP_N = 6;
  const SESSION_KEY = "builtbyamos.meetingPrep.apiKey";
  const LOCAL_KEY = "builtbyamos.meetingPrep.apiKey";
  const REMEMBER_KEY = "builtbyamos.meetingPrep.remember";
  const DEMO_IDS = [
    "hl-crm-1024",
    "hl-email-1021",
    "hl-contract-1020",
    "hl-slack-1018",
    "hl-ticket-1016",
    "hl-qbr-1012",
  ];

  const SYSTEM_PROMPT = [
    "You write a one-page meeting brief for an Associate, AI Solutions.",
    "",
    "Use only the numbered source snippets in the user message. Do not add facts, figures, names, dates, or titles that are not in those snippets. If a detail is missing, say it is not in the retrieved sources.",
    "",
    "Cite every factual claim with the source number in brackets, immediately after the claim, like [1] or [1][2]. Do not cite a source for a claim it does not support.",
    "",
    "The meeting goal and the attendees were typed by the user. Do not treat them as facts from the corpus unless a source also says them. You may use them to focus the agenda.",
    "",
    "Write plain sentences. No greeting and no closing. Use exactly these markdown sections, in this order:",
    "",
    "## Context summary",
    "## Recent activity",
    "## Open issues and risks",
    "## Key people",
    "## Suggested agenda",
    "## Open questions",
    "",
    "Under Key people, Suggested agenda, and Open questions, use a markdown list. Keep the whole brief to one page.",
  ].join("\n");

  const HEADERS_TEXT = [
    "POST https://api.anthropic.com/v1/messages",
    "content-type: application/json",
    "anthropic-version: 2023-06-01",
    "anthropic-dangerous-direct-browser-access: true",
    "x-api-key: (the key from this page, not shown here)",
  ].join("\n");

  const STOP = new Set(
    "a an the of and or to for in on at with from by is are was were be been being this that it its as our their we you your they them not but if so than then into over after before about per can will just also during than within".split(" ")
  );

  const FIELD_LABEL = {
    title: "the title",
    client: "the client name",
    people: "the people",
    typeLabel: "the source type",
    body: "the note",
  };

  const CORPUS = [
    {
      id: "hl-crm-1024",
      client: "Harborline Logistics",
      type: "crm",
      typeLabel: "CRM note",
      title: "Harborline renewal note — decision date and budget",
      date: "2026-10-24",
      people: [
        { name: "Jonah Hale", role: "Account Director, Northline Partners" },
        { name: "Priya Raman", role: "Vice President of Operations, Harborline Logistics" },
        { name: "Leah Okon", role: "Associate, AI Solutions, Northline Partners" },
      ],
      body: "Jonah Hale, account director at Northline Partners, logged this note on October 24, 2026 after a call with Priya Raman, Vice President of Operations at Harborline Logistics. Harborline Logistics is a freight brokerage. Priya said the search over lane rates is the reason to renew. Harborline can carry a renewal of about $180,000 for a twelve-month internal search deployment if the November 12 steering meeting agrees. She does not want auto-drafted replies to customers in the renewal scope. Leah Okon, Associate, AI Solutions at Northline Partners, is to bring a one-page scope that drops auto-reply and keeps search, plus a written US-only processing note.",
    },
    {
      id: "hl-email-1021",
      client: "Harborline Logistics",
      type: "email",
      typeLabel: "Email",
      title: "Pause auto-drafted replies before the steering meeting",
      date: "2026-10-21",
      people: [
        { name: "Priya Raman", role: "Vice President of Operations, Harborline Logistics" },
        { name: "Jonah Hale", role: "Account Director, Northline Partners" },
        { name: "Leah Okon", role: "Associate, AI Solutions, Northline Partners" },
      ],
      body: "Email from Priya Raman to Jonah Hale on October 21, 2026, copied to Leah Okon. Priya wrote that coordinators trust the search for accessorial rules and do not trust the drafted customer replies. She asked Northline to pause auto-drafted replies before the November 12 steering meeting. She will bring Ellis Cho and Naomi Feld. She wrote that search can stay on.",
    },
    {
      id: "hl-contract-1020",
      client: "Harborline Logistics",
      type: "contract",
      typeLabel: "Contract summary",
      title: "Harborline pilot statement of work, marked for renewal",
      date: "2026-10-20",
      people: [
        { name: "Naomi Feld", role: "General Counsel, Harborline Logistics" },
        { name: "Jonah Hale", role: "Account Director, Northline Partners" },
      ],
      body: "Summary dated October 20, 2026, prepared by Jonah Hale from marks Naomi Feld, general counsel at Harborline Logistics, made on the renewal draft. The pilot statement of work runs through November 30, 2026 and does not auto-renew. Pilot fees listed are $42,000. Naomi marked two points: processing and storage stay in the United States, and the indemnity cap stays at fees paid in the prior twelve months. The draft calls auto-drafted outbound email optional, and those drafts are not in the pilot fees.",
    },
    {
      id: "hl-slack-1018",
      client: "Harborline Logistics",
      type: "slack",
      typeLabel: "Slack thread",
      title: "#harborline-pilot — weekly usage",
      date: "2026-10-18",
      people: [
        { name: "Mara Quill", role: "Customer Success, Northline Partners" },
        { name: "Leah Okon", role: "Associate, AI Solutions, Northline Partners" },
      ],
      body: "Mara Quill, customer success at Northline Partners, posted in #harborline-pilot on October 18, 2026. In the week of October 12, 14 of 22 operations coordinators ran at least one search. The draft-reply action was used twice that week, and both uses were discarded. Mara asked that the renewal meeting lead with search usage rather than the draft feature.",
    },
    {
      id: "hl-ticket-1016",
      client: "Harborline Logistics",
      type: "ticket",
      typeLabel: "Ticket",
      title: "IT-4418 Outlook connector waiting on admin consent",
      date: "2026-10-16",
      people: [
        { name: "Ellis Cho", role: "IT lead, Harborline Logistics" },
      ],
      body: "Ticket IT-4418 is open. Ellis Cho, IT lead at Harborline Logistics, wrote it on October 16, 2026. The Outlook connector for the Harborline shared mailbox is blocked on admin consent for the mailbox read scope. No customer mail has been indexed. Okta single sign-on and SCIM provisioning already work. Security will not approve the mailbox scope until Northline confirms US-only processing in writing. The ticket does not name the person at Harborline who signs that note.",
    },
    {
      id: "hl-qbr-1012",
      client: "Harborline Logistics",
      type: "meeting",
      typeLabel: "Meeting notes",
      title: "Harborline pilot review",
      date: "2026-10-12",
      people: [
        { name: "Priya Raman", role: "Vice President of Operations, Harborline Logistics" },
        { name: "Ellis Cho", role: "IT lead, Harborline Logistics" },
        { name: "Jonah Hale", role: "Account Director, Northline Partners" },
        { name: "Mara Quill", role: "Customer Success, Northline Partners" },
        { name: "Leah Okon", role: "Associate, AI Solutions, Northline Partners" },
      ],
      body: "Meeting notes from the Harborline Logistics pilot review on October 12, 2026. Priya Raman, Jonah Hale, Ellis Cho, Mara Quill, and Leah Okon attended. Priya said search is useful when a coordinator needs an accessorial rule during a live call. Two drafted replies were off tone, and Priya asked that drafts stay off for customer mail. Ellis said the mailbox connector is the remaining IT item. Jonah said the renewal conversation belongs in November, before the pilot ends on November 30.",
    },
    {
      id: "hl-email-1009",
      client: "Harborline Logistics",
      type: "email",
      typeLabel: "Email",
      title: "Okta is in; the mailbox scope is not",
      date: "2026-10-09",
      people: [
        { name: "Ellis Cho", role: "IT lead, Harborline Logistics" },
        { name: "Leah Okon", role: "Associate, AI Solutions, Northline Partners" },
      ],
      body: "Email from Ellis Cho to Leah Okon on October 9, 2026. Okta single sign-on is live for the Harborline pilot group, and SCIM can provision coordinators. Ellis will not grant the mailbox read scope until security signs a US-only processing note. He asked Leah for that note before October 20, 2026.",
    },
    {
      id: "hl-ticket-0928",
      client: "Harborline Logistics",
      type: "ticket",
      typeLabel: "Ticket",
      title: "CS-2201 Retired warehouse code in a demo answer",
      date: "2026-09-28",
      people: [
        { name: "Mara Quill", role: "Customer Success, Northline Partners" },
        { name: "Priya Raman", role: "Vice President of Operations, Harborline Logistics" },
      ],
      body: "Ticket CS-2201 is closed. During a Harborline demo the assistant cited warehouse code SAV-2 for the Savannah yard. Harborline retired SAV-2 in July 2026. The current code is SAV-4. Mara Quill closed the ticket on September 28, 2026 after the rate sheet was corrected. Priya Raman asked that demo answers quote the sheet date.",
    },
    {
      id: "hl-notes-0812",
      client: "Harborline Logistics",
      type: "meeting",
      typeLabel: "Meeting notes",
      title: "Harborline discovery — where the lane rates live",
      date: "2026-08-12",
      people: [
        { name: "Priya Raman", role: "Vice President of Operations, Harborline Logistics" },
        { name: "Ellis Cho", role: "IT lead, Harborline Logistics" },
        { name: "Leah Okon", role: "Associate, AI Solutions, Northline Partners" },
      ],
      body: "Discovery notes from August 12, 2026 with Priya Raman, Ellis Cho, and Leah Okon. Lane rates and accessorial rules sit in three spreadsheets and a shared mailbox, not in the transportation system. Coordinators lose minutes on live calls looking for the rule. Priya’s success test is a correct accessorial answer in under a minute. Auto-reply was not discussed.",
    },
    {
      id: "cu-crm-1019",
      client: "Copperline Credit Union",
      type: "crm",
      typeLabel: "CRM note",
      title: "Copperline wants handbook search, not denial letters",
      date: "2026-10-19",
      people: [
        { name: "Ruth Pell", role: "Director, Northline Partners" },
        { name: "Ivy Solano", role: "General Counsel, Copperline Credit Union" },
        { name: "Benito Marsh", role: "Chief Operating Officer, Copperline Credit Union" },
      ],
      body: "Ruth Pell, director at Northline Partners, logged this note on October 19, 2026. She met Ivy Solano, general counsel at Copperline Credit Union, and Benito Marsh, chief operating officer. They will consider a March 2027 pilot if the assistant only quotes the member handbook and never drafts a denial, an adverse-action letter, or a rate quote. No dollar figure was discussed. The next working session is November 4, 2026.",
    },
    {
      id: "cu-email-1015",
      client: "Copperline Credit Union",
      type: "email",
      typeLabel: "Email",
      title: "Do not draft member denials",
      date: "2026-10-15",
      people: [
        { name: "Ivy Solano", role: "General Counsel, Copperline Credit Union" },
        { name: "Ruth Pell", role: "Director, Northline Partners" },
      ],
      body: "Email from Ivy Solano to Ruth Pell on October 15, 2026. Any draft which tells a member yes or no on a product is out of scope. The assistant may show the handbook passage and the page number. Copperline’s core system is called Ledgerwell. The assistant must not write back into Ledgerwell.",
    },
    {
      id: "cu-ticket-1007",
      client: "Copperline Credit Union",
      type: "ticket",
      typeLabel: "Ticket",
      title: "CU-118 Ledgerwell access is read-only and not approved",
      date: "2026-10-07",
      people: [
        { name: "Nia Okonkwo", role: "IT, Copperline Credit Union" },
        { name: "Benito Marsh", role: "Chief Operating Officer, Copperline Credit Union" },
      ],
      body: "Ticket CU-118 is open as of October 7, 2026. Benito Marsh’s team has not approved a read-only connection to Ledgerwell. Until then the index is the member handbook PDF only, version dated June 3, 2026. The owner is Nia Okonkwo, IT at Copperline Credit Union.",
    },
    {
      id: "cu-slack-1001",
      client: "Copperline Credit Union",
      type: "slack",
      typeLabel: "Slack thread",
      title: "#copperline — brochure stays out of the index",
      date: "2026-10-01",
      people: [
        { name: "Ruth Pell", role: "Director, Northline Partners" },
        { name: "Samir Adel", role: "Associate, Northline Partners" },
      ],
      body: "Ruth Pell posted in #copperline on October 1, 2026. The product brochure stays out of the index until marketing reviews it. The member handbook is the only source. Samir Adel asked whether the June 3 handbook includes holiday hours. Ruth confirmed that it does, on page 14.",
    },
    {
      id: "cu-notes-0922",
      client: "Copperline Credit Union",
      type: "meeting",
      typeLabel: "Meeting notes",
      title: "Copperline working session — handbook and brochure",
      date: "2026-09-22",
      people: [
        { name: "Nia Okonkwo", role: "IT, Copperline Credit Union" },
        { name: "Benito Marsh", role: "Chief Operating Officer, Copperline Credit Union" },
        { name: "Ruth Pell", role: "Director, Northline Partners" },
      ],
      body: "Working session notes from September 22, 2026. Nia Okonkwo showed that fee schedules live in the member handbook and product names live in a separate brochure. Benito Marsh asked Northline not to index the brochure until marketing reviews it. Ivy Solano did not attend. Ruth Pell recorded the gap.",
    },
    {
      id: "cu-contract-0902",
      client: "Copperline Credit Union",
      type: "contract",
      typeLabel: "Contract summary",
      title: "Copperline mutual NDA summary",
      date: "2026-09-02",
      people: [
        { name: "Ivy Solano", role: "General Counsel, Copperline Credit Union" },
      ],
      body: "A mutual NDA with Copperline Credit Union was signed on September 2, 2026. It covers handbook samples already sent. It is not a statement of work, and it lists no pilot fees. The NDA runs two years from September 2, 2026. Counsel of record is Ivy Solano.",
    },
    {
      id: "fs-slack-1025",
      client: "Fieldnote Studio",
      type: "slack",
      typeLabel: "Slack thread",
      title: "#fieldnote-westlamp — pin-up moved to November 3",
      date: "2026-10-25",
      people: [
        { name: "Theo Brant", role: "Project Architect, Fieldnote Studio" },
        { name: "Helen Voss", role: "Managing Partner, Fieldnote Studio" },
        { name: "Leah Okon", role: "Associate, AI Solutions, Northline Partners" },
      ],
      body: "Theo Brant posted in #fieldnote-westlamp on October 25, 2026. The internal pin-up for the Westlamp Library project moved from October 28 to November 3, 2026, because sheet A-301 is still missing. Helen Voss asked Leah Okon for a search demo on the specs only, with client mail excluded, at that pin-up.",
    },
    {
      id: "fs-crm-1023",
      client: "Fieldnote Studio",
      type: "crm",
      typeLabel: "CRM note",
      title: "Fieldnote — client mail stays out of the index",
      date: "2026-10-23",
      people: [
        { name: "Helen Voss", role: "Managing Partner, Fieldnote Studio" },
        { name: "Theo Brant", role: "Project Architect, Fieldnote Studio" },
        { name: "Leah Okon", role: "Associate, AI Solutions, Northline Partners" },
      ],
      body: "Leah Okon logged this note on October 23, 2026. Helen Voss, managing partner at Fieldnote Studio, said client email is out of the index. She will allow project specs, the drawing index, and site-visit notes for the Westlamp Library project. Theo Brant, project architect, wants search live before the design review. No fee has been proposed.",
    },
    {
      id: "fs-ticket-1012",
      client: "Fieldnote Studio",
      type: "ticket",
      typeLabel: "Ticket",
      title: "FN-77 Westlamp upload missing sheet A-301",
      date: "2026-10-12",
      people: [
        { name: "Theo Brant", role: "Project Architect, Fieldnote Studio" },
        { name: "Helen Voss", role: "Managing Partner, Fieldnote Studio" },
        { name: "Leah Okon", role: "Associate, AI Solutions, Northline Partners" },
      ],
      body: "Ticket FN-77 is open. The October 6, 2026 issue set in the Fieldnote project room does not include sheet A-301, the reading-room plan. Helen Voss confirmed A-301 is not confidential. It was left out of the zip file. The owner is Theo Brant. Leah Okon is waiting on a replacement zip. Sheets A-100 and A-201 are in the set.",
    },
    {
      id: "fs-email-1011",
      client: "Fieldnote Studio",
      type: "email",
      typeLabel: "Email",
      title: "Sheet A-301 missing from the drawing index",
      date: "2026-10-11",
      people: [
        { name: "Theo Brant", role: "Project Architect, Fieldnote Studio" },
        { name: "Leah Okon", role: "Associate, AI Solutions, Northline Partners" },
      ],
      body: "Email from Theo Brant to Leah Okon on October 11, 2026. The uploaded drawing index for the Westlamp Library project is missing sheet A-301, the reading-room plan, issued October 6, 2026. Sheets A-100 and A-201 are present. Theo asked for A-301 to be searchable before the internal pin-up.",
    },
    {
      id: "fs-notes-0918",
      client: "Fieldnote Studio",
      type: "meeting",
      typeLabel: "Meeting notes",
      title: "Fieldnote discovery — specs, notes, and no client mail",
      date: "2026-09-18",
      people: [
        { name: "Helen Voss", role: "Managing Partner, Fieldnote Studio" },
        { name: "Theo Brant", role: "Project Architect, Fieldnote Studio" },
      ],
      body: "Discovery notes from September 18, 2026. Site-visit notes for the Westlamp Library project are a shared notebook in the project room. Specs are PDFs named by division, not by room. Theo Brant said people ask what was promised for the reading room and then hunt. Helen Voss repeated that client correspondence is not to be indexed.",
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
    const fields = ["title", "client", "people", "typeLabel", "body"];
    const docs = corpus.map((doc) => ({
      doc,
      bags: {
        title: tokenize(doc.title),
        client: tokenize(doc.client),
        people: tokenize(doc.people.map((person) => `${person.name} ${person.role}`).join(" ")),
        typeLabel: tokenize(doc.typeLabel),
        body: tokenize(doc.body),
      },
    }));
    return { docs, fields };
  }

  const INDEX = buildIndex(CORPUS);
  const FIELD_POINTS = { title: 8, client: 6, people: 5, typeLabel: 2, body: 4 };

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

  function whyText(item) {
    const groups = new Map();
    for (const hit of item.hits) {
      if (!groups.has(hit.field)) groups.set(hit.field, []);
      const list = groups.get(hit.field);
      if (!list.includes(hit.term)) list.push(hit.term);
    }
    const parts = [...groups.entries()].map(([field, terms]) => `${terms.join(" and ")} in ${FIELD_LABEL[field]}`);
    let sentence = `Matched ${parts.join("; ")}.`;
    if (item.entityLookup) sentence += " Newer notes for that client are listed first.";
    else if (item.clientCovered && !groups.has("client")) sentence += " The client name matches too.";
    return sentence;
  }

  function search(query, limit = TOP_N) {
    const queryTokens = [...new Set(tokenize(query))];
    if (!queryTokens.length) return { total: 0, results: [] };
    const ranked = [];
    for (const row of INDEX.docs) {
      const clientTokens = new Set(row.bags.client);
      const hits = [];
      let score = 0;
      for (const term of queryTokens) {
        const hit = bestHit(row, term);
        if (!hit.field) continue;
        hits.push({ term, field: hit.field });
        score += hit.points;
      }
      if (!hits.length) continue;
      const clientCovered = clientTokens.size > 0 && [...clientTokens].every((term) => queryTokens.includes(term));
      const queryIsName = queryTokens.every((term) => clientTokens.has(term));
      const entityLookup = queryIsName && (clientCovered || queryTokens.some((term) => term.length >= 6));
      if (clientCovered) score += 20;
      else if ([...clientTokens].some((term) => queryTokens.includes(term) && term.length >= 6)) score += 10;
      const recency = Date.parse(`${row.doc.date}T00:00:00Z`);
      const days = (recency - Date.parse("2026-01-01T00:00:00Z")) / 86400000;
      if (!entityLookup) score += days * 0.05;
      ranked.push({ row, score, hits, entityLookup, clientCovered, recency });
    }
    ranked.sort((a, b) => {
      if (a.entityLookup !== b.entityLookup) return a.entityLookup ? -1 : 1;
      if (a.entityLookup && b.entityLookup && a.recency !== b.recency) return b.recency - a.recency;
      if (Math.abs(b.score - a.score) > 0.05) return b.score - a.score;
      if (a.recency !== b.recency) return b.recency - a.recency;
      return a.row.doc.id < b.row.doc.id ? -1 : 1;
    });
    return {
      total: ranked.length,
      results: ranked.slice(0, limit).map((item) => ({
        ...item.row.doc,
        score: item.score,
        hits: item.hits,
        entityLookup: item.entityLookup,
        why: whyText(item),
      })),
    };
  }

  function formatDate(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  function formatShort(iso) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  function snippet(body, queryTokens, limit = 150) {
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
    const start = Math.max(0, index - 70);
    const end = Math.min(body.length, start + limit);
    const slice = body.slice(start, end).trim();
    return `${start > 0 ? "…" : ""}${slice}${end < body.length ? "…" : ""}`;
  }

  function userPrompt(input, results) {
    const lines = [
      "Prepare the meeting brief.",
      "",
      `Client or project: ${input.client}`,
      `Meeting goal (typed by the user, not a source): ${input.goal || "(none)"}`,
      `Attendees (typed by the user, not a source): ${input.attendees || "(none)"}`,
      "",
      "Sources are numbered in the order shown in the app. Use only these snippets.",
      "",
    ];
    results.forEach((doc, index) => {
      const people = doc.people.map((person) => `${person.name} (${person.role})`).join("; ");
      lines.push(`[${index + 1}] ${doc.typeLabel} · ${doc.date} · ${doc.title}`);
      lines.push(`Client: ${doc.client}`);
      lines.push(`People: ${people}`);
      lines.push(doc.body);
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  function buildRequest(input, results) {
    return {
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: "between_tools" },
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt(input, results) }],
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

  function prose(results, templates) {
    return templates.map((template) => citeSentence(results, template)).filter(Boolean).join(" ");
  }

  function bullets(results, templates) {
    return templates
      .map((template) => citeSentence(results, template))
      .filter(Boolean)
      .map((line) => `- ${line}`)
      .join("\n");
  }

  function demoBrief(results) {
    const context = prose(results, [
      "Harborline Logistics is a freight brokerage, and Priya Raman said the search over lane rates is the reason to renew. {hl-crm-1024}",
      "She wrote that coordinators trust the search for accessorial rules. {hl-email-1021}",
      "The pilot statement of work runs through November 30, 2026, lists fees of $42,000, and does not auto-renew. {hl-contract-1020}",
      "Naomi Feld, general counsel at Harborline Logistics, marked the renewal draft so processing and storage stay in the United States, the indemnity cap stays at fees paid in the prior twelve months, and auto-drafted outbound email stays optional and outside the pilot fees. {hl-contract-1020}",
    ]);
    const recent = prose(results, [
      "On October 24, 2026, Jonah Hale, account director at Northline Partners, logged a call with Priya Raman, Vice President of Operations. {hl-crm-1024}",
      "Harborline can carry about $180,000 for a twelve-month internal search deployment if the November 12 steering meeting agrees, and she does not want auto-drafted replies to customers in that renewal scope. {hl-crm-1024}",
      "Leah Okon, Associate, AI Solutions at Northline Partners, is to bring a one-page scope that drops auto-reply and keeps search, plus a written US-only processing note. {hl-crm-1024}",
      "On October 21, 2026, Priya wrote to pause auto-drafted replies before that steering meeting, said search can stay on, and said she will bring Ellis Cho and Naomi Feld. {hl-email-1021}",
      "For the week of October 12, Mara Quill posted that 14 of 22 operations coordinators ran at least one search, and that the draft-reply action was used twice and discarded both times. {hl-slack-1018}",
    ]);
    const risks = prose(results, [
      "Ticket IT-4418 is open. The Outlook connector for the Harborline shared mailbox is blocked on admin consent for the mailbox read scope, and no customer mail has been indexed. {hl-ticket-1016}",
      "Ellis Cho, IT lead at Harborline Logistics, wrote that Okta single sign-on and SCIM provisioning already work, and that security will not approve the mailbox scope until Northline confirms US-only processing in writing. {hl-ticket-1016}",
      "The ticket does not name the person at Harborline who signs that note. {hl-ticket-1016}",
      "The renewal draft Naomi Feld marked says processing and storage stay in the United States. {hl-contract-1020}",
      "At the October 12, 2026 review, two drafted replies were off tone, Priya asked that drafts stay off for customer mail, and Ellis said the mailbox connector is the remaining IT item. {hl-qbr-1012}",
    ]);
    const people = bullets(results, [
      "Priya Raman, Vice President of Operations at Harborline Logistics, does not want auto-drafted replies to customers in the renewal scope. {hl-crm-1024}",
      "Ellis Cho, IT lead, wrote open ticket IT-4418 on the mailbox connector. {hl-ticket-1016}",
      "Naomi Feld, general counsel, marked United States processing and storage and the indemnity cap. {hl-contract-1020}",
      "Jonah Hale, account director at Northline Partners, wrote the October 24 renewal note. {hl-crm-1024}",
      "Mara Quill, customer success at Northline Partners, posted the usage in #harborline-pilot and asked that the renewal meeting lead with search usage rather than the draft feature. {hl-slack-1018}",
      "Leah Okon, Associate, AI Solutions at Northline Partners, is to bring the revised scope and the written US-only note. {hl-crm-1024}",
    ]);
    const agenda = bullets(results, [
      "Open with the week of October 12: 14 of 22 operations coordinators ran at least one search. {hl-slack-1018}",
      "Mention the October 12 review: search is useful for an accessorial rule on a live call, and drafts should stay off customer mail. {hl-qbr-1012}",
      "Confirm auto-drafted replies are out of the renewal scope, in line with the October 21 pause. {hl-crm-1024}{hl-email-1021}",
      "Walk ticket IT-4418 and the written US-only note security is waiting on. {hl-ticket-1016}",
      "Check Naomi Feld’s marks and the pilot end date of November 30, 2026, with no auto-renew. {hl-contract-1020}",
      "Leave time for the November 12 steering meeting and the figure of about $180,000. {hl-crm-1024}",
    ]);
    const questions = bullets(results, [
      "The October 24 note says Harborline can carry about $180,000 if the November 12 steering meeting agrees. It does not say who must agree, or whether that figure is already budgeted. {hl-crm-1024}",
      "The contract summary says Naomi Feld marked processing and storage in the United States, and the indemnity cap. It does not say she has accepted that wording. {hl-contract-1020}",
      "Ticket IT-4418 does not name the person at Harborline who signs the US-only note. {hl-ticket-1016}",
      "Mara Quill’s usage post covers the week of October 12 and does not say whether that rate continued later. {hl-slack-1018}",
    ]);
    return [
      "## Context summary",
      context || "Not enough of these sources were retrieved.",
      "",
      "## Recent activity",
      recent || "Not enough of these sources were retrieved.",
      "",
      "## Open issues and risks",
      risks || "Not enough of these sources were retrieved.",
      "",
      "## Key people",
      people || "- Not enough of these sources were retrieved.",
      "",
      "## Suggested agenda",
      agenda || "- Not enough of these sources were retrieved.",
      "",
      "## Open questions",
      questions || "- Not enough of these sources were retrieved.",
    ].join("\n");
  }

  function demoEligible(results) {
    const ids = new Set(results.map((doc) => doc.id));
    return DEMO_IDS.filter((id) => ids.has(id)).length >= 4;
  }

  function sourcesAppendix(results) {
    return results
      .map((doc, index) => {
        const people = doc.people.map((person) => person.name).join(", ");
        return `[${index + 1}] ${doc.typeLabel} · ${doc.title} · ${formatDate(doc.date)} · ${doc.client} · ${people}`;
      })
      .join("\n");
  }

  function markdownFile(input, brief, results, modeLine) {
    const goal = input.goal ? `Meeting goal (typed, not a source): ${input.goal}` : "Meeting goal: none typed";
    const attendees = input.attendees ? `Attendees (typed, not a source): ${input.attendees}` : "Attendees: none typed";
    return [
      `# Meeting brief: ${input.client}`,
      "",
      goal,
      attendees,
      modeLine,
      "Corpus: fictional sample for Northline Partners. Ranked in the browser. This file is not from Glean.",
      "",
      brief.trim(),
      "",
      "## Sources",
      sourcesAppendix(results),
      "",
    ].join("\n");
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
        blocks.push({ type: heading[1].length === 2 ? "h2" : "h3", text: heading[2] });
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
      if (block.type === "h2" || block.type === "h3") {
        const heading = document.createElement(block.type === "h2" ? "h3" : "h3");
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
    const clientInput = $("#client");
    const goalInput = $("#goal");
    const attendeesInput = $("#attendees");
    const keyInput = $("#api-key");
    const rememberInput = $("#remember-key");
    const prepareButton = $("#prepare");
    const searchButton = $("#search-only");
    const formError = $("#form-error");
    let current = null;
    let fileText = "";
    let busy = false;
    let controller = null;

    const saved = readStorage();
    if (saved.key) keyInput.value = saved.key;
    rememberInput.checked = saved.remember;
    syncPrepareLabel();

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
      setStep("retrieve", "idle", "Top snippets");
      setStep("claude", "idle", "Sonnet 5.5");
      setStep("brief", "idle", "Cited page");
    }

    function readInput() {
      return {
        client: clientInput.value.trim(),
        goal: goalInput.value.trim(),
        attendees: attendeesInput.value.trim(),
        key: keyInput.value.trim(),
      };
    }

    function syncPrepareLabel() {
      prepareButton.textContent = keyInput.value.trim() ? "Prepare brief" : "Prepare demo brief";
    }

    function persistKey() {
      writeStorage(keyInput.value.trim(), rememberInput.checked);
      syncPrepareLabel();
    }

    function setBusy(next) {
      busy = next;
      prepareButton.disabled = next;
      searchButton.disabled = next;
      prepareButton.setAttribute("aria-busy", next ? "true" : "false");
    }

    function showError(message) {
      formError.textContent = message || "";
    }

    function showPrompt(request, note, open) {
      $("#prompt-section").hidden = false;
      $("#prompt-note").textContent = note;
      $("#headers-view").textContent = HEADERS_TEXT;
      $("#prompt-view").textContent = JSON.stringify(request, null, 2);
      $("#prompt-details").open = Boolean(open);
    }

    function paintResults(found, query) {
      const queryTokens = tokenize(query);
      $("#results-empty").hidden = true;
      $("#results-data").hidden = false;
      $("#results-panel").setAttribute("aria-labelledby", "results-title");
      const count = found.results.length;
      $("#results-title").textContent = count === 1 ? "1 source" : `${count} sources`;
      $("#results-count").textContent = found.total > count
        ? `Top ${count} of ${found.total}`
        : `${found.total} match${found.total === 1 ? "" : "es"}`;
      const entity = found.results.some((doc) => doc.entityLookup);
      $("#results-why").textContent = entity
        ? "The query names that client, so newer notes are listed first. These snippets are what the brief can use."
        : "Ranked by how the words matched. These snippets are what the brief can use.";
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
        date.textContent = formatShort(doc.date);
        top.append(rank, type, date);

        const title = document.createElement("h3");
        title.textContent = doc.title;

        const meta = document.createElement("p");
        meta.className = "hint meta-line";
        meta.textContent = `${doc.client} · ${doc.people.map((person) => person.name).join(", ")}`;

        const body = document.createElement("p");
        body.className = "snippet";
        body.innerHTML = highlight(snippet(doc.body, queryTokens), queryTokens);

        const why = document.createElement("p");
        why.className = "why";
        why.textContent = doc.why;

        item.append(top, title, meta, body, why);
        list.append(item);
      });
    }

    function paintBrief(input, brief, results, mode) {
      $("#brief-section").hidden = false;
      $("#brief-heading").textContent = input.client;
      $("#brief-kicker").textContent = mode.kicker;
      $("#brief-mode").innerHTML = `<strong>${escapeHtml(mode.label)}</strong> ${escapeHtml(mode.detail)}`;
      const article = $("#brief");
      article.replaceChildren();
      const kicker = document.createElement("p");
      kicker.className = "paper-kicker";
      kicker.textContent = mode.paperKicker;
      const title = document.createElement("h2");
      title.textContent = input.client;
      article.append(kicker, title);
      if (input.goal || input.attendees) {
        const yours = document.createElement("p");
        yours.className = "yours";
        const bits = [];
        if (input.goal) bits.push(`Your goal: ${input.goal}`);
        if (input.attendees) bits.push(`Your attendees: ${input.attendees}`);
        yours.textContent = `${bits.join(" · ")}. Typed by you, not taken from the sample notes.`;
        article.append(yours);
      }
      if (mode.warning) {
        const callout = document.createElement("p");
        callout.className = "callout";
        callout.textContent = mode.warning;
        article.append(callout);
      }
      article.append(renderBlocks(brief, results.length));
      fileText = markdownFile(input, brief, results, mode.fileLine);
      $("#copy-brief").textContent = "Copy brief";
    }

    function showNeedKey(clientName) {
      $("#brief-section").hidden = false;
      $("#brief-heading").textContent = "Key needed";
      $("#brief-kicker").textContent = "Claude";
      $("#brief-mode").textContent = "Demo mode has a prewritten brief for Harborline Logistics only.";
      const article = $("#brief");
      article.replaceChildren();
      const title = document.createElement("h2");
      title.textContent = clientName;
      const copy = document.createElement("p");
      copy.textContent = "Paste an Anthropic API key to write this brief, or choose Harborline Logistics and use the demo brief. The demo does not invent a brief for other clients.";
      article.append(title, copy);
      fileText = "";
    }

    async function run(write) {
      if (busy) return;
      const input = readInput();
      persistKey();
      if (!input.client) {
        showError("Enter a client or project.");
        clientInput.focus();
        return;
      }
      showError("");
      if (controller) controller.abort();
      controller = new AbortController();
      setBusy(true);
      resetSteps();
      setStep("search", "active", "Ranking sample docs");
      say(`Searching the sample corpus for ${input.client}.`);
      await wait(160);
      const query = [input.client, input.goal, input.attendees].filter(Boolean).join(" ");
      const found = search(query);
      setStep("search", "done", `${CORPUS.length} sample docs`);
      if (!found.results.length) {
        setStep("retrieve", "done", "No match");
        setStep("claude", "idle", "Skipped");
        setStep("brief", "idle", "Skipped");
        $("#results-empty").hidden = false;
        $("#results-data").hidden = true;
        $("#results-panel").setAttribute("aria-labelledby", "results-heading");
        $("#results-empty").querySelector("h2").textContent = "No sample notes matched.";
        $("#results-empty").querySelector("p:last-child").textContent = "Try Harborline Logistics, Copperline Credit Union, or Fieldnote Studio.";
        $("#brief-section").hidden = true;
        $("#prompt-section").hidden = true;
        setBusy(false);
        say("No sample documents matched.");
        return;
      }
      setStep("retrieve", "active", "Packing snippets");
      await wait(140);
      paintResults(found, query);
      setStep("retrieve", "done", `${found.results.length} snippets`);
      const request = buildRequest(input, found.results);
      current = { input, results: found.results, request };
      document.querySelectorAll("[data-client]").forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.client === input.client ? "true" : "false");
      });

      if (!write) {
        setStep("claude", "idle", "Not called");
        setStep("brief", "idle", "Not written");
        showPrompt(request, "Search only. This body was not sent.", false);
        $("#brief-section").hidden = true;
        setBusy(false);
        say(`Found ${found.results.length} sources. No brief written.`);
        return;
      }

      if (!input.key) {
        if (!demoEligible(found.results)) {
          setStep("claude", "idle", "Needs a key");
          setStep("brief", "idle", "Not written");
          showPrompt(request, "Not sent. Demo mode only includes a prewritten brief when the Harborline sources are in the results.", false);
          showNeedKey(input.client);
          setBusy(false);
          say("Paste an Anthropic key, or open the Harborline Logistics demo.");
          return;
        }
        setStep("claude", "active", "Demo, not a call");
        await wait(180);
        const brief = demoBrief(found.results);
        setStep("claude", "done", "Prewritten demo");
        setStep("brief", "done", "Cited page");
        paintBrief(input, brief, found.results, {
          kicker: "Demo brief",
          label: "Demo mode.",
          detail: "Prewritten from these sources so the page works without a key. Claude was not called.",
          paperKicker: "Sample brief · fictional notes",
          fileLine: "Mode: demo. Prewritten from the sample corpus. Claude was not called.",
        });
        showPrompt(
          request,
          "Not sent. With an Anthropic key, the browser POSTs this JSON to the Messages API and the brief below is replaced by Claude’s reply.",
          false
        );
        setBusy(false);
        say("Demo brief ready. Claims cite the numbered sources.");
        $("#brief").focus({ preventScroll: true });
        return;
      }

      setStep("claude", "active", MODEL);
      showPrompt(request, "Sending this body to the Anthropic Messages API. The key is only in the request header.", false);
      say("Calling Claude.");
      try {
        const response = await fetch(API_URL, {
          method: "POST",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            "x-api-key": input.key,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify(request),
        });
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
        const brief = textFromMessage(data);
        if (!brief) throw new Error("Claude returned no text. Try the request again.");
        const limited = data && data.stop_reason === "max_tokens";
        setStep("claude", "done", MODEL);
        setStep("brief", "done", "Cited page");
        paintBrief(input, brief, found.results, {
          kicker: "Claude brief",
          label: MODEL,
          detail: "Written from the snippets above. Citations use the same numbers.",
          paperKicker: "Claude Sonnet 5.5 · grounded in the snippets",
          warning: limited ? "The reply hit the length limit before it finished." : "",
          fileLine: `Mode: Claude ${MODEL}, via the Anthropic Messages API.`,
        });
        showPrompt(request, "This body was sent to https://api.anthropic.com/v1/messages. The key was only in the x-api-key header.", false);
        say("Brief ready.");
        $("#brief").focus({ preventScroll: true });
      } catch (error) {
        if (error && error.name === "AbortError") return;
        const message = error && error.message ? error.message : "The call to Anthropic did not complete.";
        setStep("claude", "idle", "Call failed");
        setStep("brief", "idle", "Not written");
        $("#brief-section").hidden = false;
        $("#brief-heading").textContent = "Claude did not answer";
        $("#brief-kicker").textContent = "Claude";
        $("#brief-mode").textContent = "The key stayed in this browser. Nothing was written to the repo.";
        const article = $("#brief");
        article.replaceChildren();
        const title = document.createElement("h2");
        title.textContent = "The request failed";
        const copy = document.createElement("p");
        copy.textContent = message;
        article.append(title, copy);
        if (demoEligible(found.results)) {
          const again = document.createElement("p");
          const button = document.createElement("button");
          button.type = "button";
          button.className = "cite";
          button.id = "use-demo";
          button.textContent = "Show demo brief";
          again.append(button);
          article.append(again);
        }
        fileText = "";
        showPrompt(request, "This body was sent. Anthropic did not return a brief.", true);
        say(message);
      } finally {
        setBusy(false);
      }
    }

    $("#prep-form").addEventListener("submit", (event) => {
      event.preventDefault();
      run(true);
    });
    searchButton.addEventListener("click", () => run(false));
    keyInput.addEventListener("input", persistKey);
    rememberInput.addEventListener("change", persistKey);
    $("#clear-key").addEventListener("click", () => {
      keyInput.value = "";
      rememberInput.checked = false;
      clearStorage();
      syncPrepareLabel();
      keyInput.focus();
      say("API key cleared from this browser.");
    });
    document.querySelectorAll("[data-client]").forEach((button) => {
      button.addEventListener("click", () => {
        clientInput.value = button.dataset.client;
        document.querySelectorAll("[data-client]").forEach((other) => {
          other.setAttribute("aria-pressed", other === button ? "true" : "false");
        });
        clientInput.focus();
      });
    });
    $("#copy-brief").addEventListener("click", async () => {
      if (!fileText) return;
      let copied = false;
      try {
        await navigator.clipboard.writeText(fileText);
        copied = true;
      } catch {
        try {
          const area = document.createElement("textarea");
          area.value = fileText;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.left = "-9999px";
          document.body.append(area);
          area.select();
          copied = document.execCommand("copy");
          area.remove();
        } catch {
          copied = false;
        }
      }
      if (!copied) {
        say("Could not copy. Download the Markdown instead.");
        return;
      }
      $("#copy-brief").textContent = "Copied";
      say("Brief copied.");
      window.setTimeout(() => {
        if ($("#copy-brief").textContent === "Copied") $("#copy-brief").textContent = "Copy brief";
      }, 1600);
    });
    $("#download-brief").addEventListener("click", () => {
      if (!fileText || !current) return;
      const slug = current.input.client.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "meeting";
      const blob = new Blob([fileText], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slug}-meeting-brief.md`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      say("Markdown download started.");
    });
    $("#brief").addEventListener("click", (event) => {
      const cite = event.target.closest(".cite[data-cite]");
      if (cite) {
        const card = document.getElementById(`source-${cite.dataset.cite}`);
        if (!card) return;
        document.querySelectorAll(".result.is-lit").forEach((item) => item.classList.remove("is-lit"));
        card.classList.add("is-lit");
        card.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
        card.focus({ preventScroll: true });
        return;
      }
      if (event.target.id === "use-demo" && current) {
        keyInput.value = "";
        persistKey();
        const brief = demoBrief(current.results);
        setStep("claude", "done", "Prewritten demo");
        setStep("brief", "done", "Cited page");
        paintBrief(current.input, brief, current.results, {
          kicker: "Demo brief",
          label: "Demo mode.",
          detail: "Shown after the Claude call failed. Claude was not used for this text.",
          paperKicker: "Sample brief · fictional notes",
          fileLine: "Mode: demo. Prewritten from the sample corpus. Claude was not called.",
        });
        say("Demo brief ready.");
      }
    });
  }

  return {
    CORPUS,
    MODEL,
    SYSTEM_PROMPT,
    search,
    buildRequest,
    demoBrief,
    demoEligible,
    tokenize,
    mount,
  };
})();

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => MeetingPrep.mount());
  else MeetingPrep.mount();
}
