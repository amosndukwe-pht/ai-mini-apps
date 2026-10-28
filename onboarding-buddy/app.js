/* Onboarding Buddy — local sample search, then a cited Claude checklist. */
globalThis.OnboardingBuddy = (() => {
  const MODEL = "claude-sonnet-5-5";
  const API_URL = "https://api.anthropic.com/v1/messages";
  const PLAN_LIMIT = 12;
  const ASK_LIMIT = 4;
  const INTRO_LIMIT = 6;
  const SESSION_KEY = "builtbyamos.onboardingBuddy.apiKey";
  const LOCAL_KEY = "builtbyamos.onboardingBuddy.apiKey";
  const REMEMBER_KEY = "builtbyamos.onboardingBuddy.remember";
  const CHECKS_KEY = "builtbyamos.onboardingBuddy.checks.v1";

  const DUE_OFFSET = { day0: 0, day7: 7, day14: 14, day30: 30 };

  const PHASES = [
    { id: "day1", title: "Day 1", blurb: "Due on the start date." },
    { id: "week1", title: "Week 1", blurb: "Due by day 7, or day 14 for benefits." },
    { id: "day30", title: "Day 30", blurb: "Due on day 30." },
  ];

  const PROFILES = {
    amina: {
      id: "amina",
      name: "Amina Okonkwo",
      role: "Associate, AI Solutions",
      team: "AI Solutions",
      teamId: "ai-solutions",
      start: "2026-11-02",
      location: "Riverton office",
      locationId: "riverton",
      manager: "Nia Okoye",
      managerRole: "Director, AI Solutions",
      demo: true,
    },
    diego: {
      id: "diego",
      name: "Diego Morales",
      role: "Associate, Customer Solutions",
      team: "Customer Solutions",
      teamId: "customer-solutions",
      start: "2026-11-16",
      location: "Remote, United States",
      locationId: "remote-us",
      manager: "Imani Brooks",
      managerRole: "Manager, Customer Solutions",
      demo: false,
    },
    harper: {
      id: "harper",
      name: "Harper Lin",
      role: "Associate, Implementation",
      team: "Implementation",
      teamId: "implementation",
      start: "2026-12-01",
      location: "Remote, Canada",
      locationId: "remote-ca",
      manager: "Adrian Walsh",
      managerRole: "Manager, Implementation",
      demo: false,
    },
  };

  const SYSTEM_PLAN = [
    "You build a first-month onboarding checklist for a new hire at Marlow Pine, a fictional company.",
    "",
    "Use only the numbered source snippets in the user message. Do not add facts, systems, owners, or steps that those snippets do not support. If a step is not in the snippets, leave it out.",
    "",
    "Every item needs an owner named in the snippets, the next step, a pineboard:// link copied from the snippets, and at least one citation number.",
    "",
    "The profile in the user message is the new hire. Use that name, role, team, location, and manager. Do not invent a different manager.",
    "",
    "Office hires in Riverton collect a badge and a laptop at reception. Remote hires start on the video call and use the shipped laptop. Do not give a remote hire the badge step.",
    "",
    "AI Solutions requests CRM read. Customer Solutions and Implementation request the CRM user role.",
    "",
    "Deadlines are tokens only. Use day0 for the start date, day7 for the end of week 1, day14 for the benefits window, and day30 for the check-in. Do not write a calendar date.",
    "",
    "Return JSON only, with no markdown fence, in this shape:",
    '{"phases":[{"id":"day1","items":[{"id":"short-slug","action":"One step under 28 words.","owner":"Person from a snippet","ownerRole":"Role from a snippet","href":"pineboard://copied-from-a-snippet","hrefLabel":"Document title","cites":[1],"due":"day0"}]}]}',
    "",
    "Use phase id day1 for day0 items, week1 for day7 and day14 items, and day30 for day30 items.",
    "Put 3 to 5 items in day1, 2 to 4 in week1, and 1 to 3 in day30.",
  ].join("\n");

  const SYSTEM_ASK = [
    "You answer a new hire at Marlow Pine, a fictional company.",
    "",
    "Use only the numbered source snippets in the user message. Do not add facts, names, systems, or steps that those snippets do not support. If the snippets do not contain the answer, say you do not see it in the onboarding documents, and do not guess.",
    "",
    "When the snippets name an owner and a next step, include both. Cite every factual claim with the source number in brackets, immediately after the claim, like [1]. Do not cite a source for a claim it does not support.",
    "",
    "The question was typed by the new hire. Do not treat it as a fact from the packet.",
    "",
    "Write plain sentences. No greeting and no closing. Keep the answer under 120 words.",
  ].join("\n");

  const SYSTEM_INTRO = [
    "You draft a short note a new hire can copy to their manager at Marlow Pine, a fictional company.",
    "",
    "Use only the profile and the numbered source snippets. Do not add facts the snippets do not support. Do not mention compensation, pay, or a start-date negotiation.",
    "",
    "The note is first person, under 90 words, and includes the hire's name, team, location, and one question about the first week. Write the note only. No subject line, no citations, and no preamble.",
    "",
    "Nothing is sent. The hire will copy it.",
  ].join("\n");

  const HEADERS_TEXT = [
    "POST https://api.anthropic.com/v1/messages",
    "content-type: application/json",
    "anthropic-version: 2023-06-01",
    "anthropic-dangerous-direct-browser-access: true",
    "x-api-key: (the key from this page, not shown here)",
  ].join("\n");

  const STOP = new Set(
    "a an the of and or to for in on at with from by is are was were be been being this that it its as our their we you your they them not but if so than then into over after before about per can will just also during within how what when where which who does did do get me my please any there i am".split(" ")
  );

  const FIELD_LABEL = {
    title: "the title",
    owner: "the owner",
    typeLabel: "the type",
    body: "the document",
  };

  const FIELD_POINTS = { title: 8, owner: 6, typeLabel: 3, body: 4 };

  const CORPUS = [
    {
      id: "place-start",
      type: "policy",
      typeLabel: "Onboarding policy",
      title: "Day 1 onboarding: Riverton badge and remote start",
      owner: "Helena Voss",
      ownerRole: "People Partner",
      updated: "2026-09-12",
      teams: ["all"],
      href: "pineboard://places/riverton",
      body: "Helena Voss, People Partner, owns this arrival note. Riverton office hires arrive at 18 Cedar Street by 9:00 local time and collect a badge from reception. Remote hires in the United States or Canada start on a video call in Pineboard at 9:30 in their time zone. There is no second office. This note does not list a building door code or a visitor Wi-Fi password. The page is pineboard://places/riverton.",
    },
    {
      id: "laptop",
      type: "access",
      typeLabel: "IT access",
      title: "Laptop and first Pineboard login",
      owner: "Chris Adelayo",
      ownerRole: "IT Access",
      updated: "2026-08-20",
      teams: ["all"],
      href: "pineboard://it/laptop",
      body: "Chris Adelayo leads IT Access. IT ships a laptop to United States and Canada addresses before the start date. Office hires in Riverton pick up the laptop at reception on day 1. Sign in with the work email ending in @marlowpine.example, then install the Pineboard agent the same day. This note does not include admin passwords. The setup page is pineboard://it/laptop.",
    },
    {
      id: "access-request",
      type: "access",
      typeLabel: "IT access",
      title: "How to request system access",
      owner: "Chris Adelayo",
      ownerRole: "IT Access",
      updated: "2026-09-02",
      teams: ["all"],
      href: "pineboard://access/new",
      body: "Open a Pineboard access request at pineboard://access/new. Name the system, the role you need, and your manager. Chris Adelayo's IT Access team provisions standard access within one business day after the manager approves. Customer data systems also need Security to mark training complete. This note does not grant access by email or chat.",
    },
    {
      id: "crm-access",
      type: "access",
      typeLabel: "IT access",
      title: "Marlow CRM access",
      owner: "Meera Shah",
      ownerRole: "CRM owner",
      updated: "2026-10-01",
      teams: ["all"],
      href: "pineboard://systems/marlow-crm",
      body: "Marlow CRM is the customer system of record. The system page is pineboard://systems/marlow-crm. Customer Solutions and Implementation request the CRM user role. AI Solutions requests CRM read unless the manager asks for write. Submit the request in Pineboard. Meera Shah owns Marlow CRM and approves the role after the manager. Do not share a teammate's login.",
    },
    {
      id: "ai-workspace",
      type: "access",
      typeLabel: "IT access",
      title: "AI Solutions workspace access",
      owner: "Nia Okoye",
      ownerRole: "Director, AI Solutions",
      updated: "2026-10-08",
      teams: ["ai-solutions"],
      href: "pineboard://access/new",
      body: "Associates on AI Solutions request the Pineboard workspace AI Solutions at pineboard://access/new and request Marlow CRM read. They do not request production admin. Nia Okoye approves the AI Solutions workspace. Meera Shah approves CRM read after the manager. Claude runs with a key the associate pastes in the browser. This note does not provide an API key.",
    },
    {
      id: "lumen-boards",
      type: "directory",
      typeLabel: "System directory",
      title: "Who owns the analytics dashboards",
      owner: "Evan Cho",
      ownerRole: "Analytics",
      updated: "2026-10-11",
      teams: ["all"],
      href: "pineboard://systems/lumen-boards",
      body: "Evan Cho owns the analytics dashboards in Lumen Boards. The workspace is Lumen / Company. The system page is pineboard://systems/lumen-boards. To get a viewer seat, file a Pineboard request named Lumen Boards viewer and name Evan Cho as the system owner. Editors are limited to Analytics. This note does not publish dashboard passwords.",
    },
    {
      id: "directory",
      type: "directory",
      typeLabel: "System directory",
      title: "System owner directory",
      owner: "Chris Adelayo",
      ownerRole: "IT Access",
      updated: "2026-10-04",
      teams: ["all"],
      href: "pineboard://systems/directory",
      body: "System owners approve access after the manager. Marlow CRM owner is Meera Shah. Lumen Boards, which holds the analytics dashboards, is owned by Evan Cho. Pineboard owner is Chris Adelayo. The password vault named Marlow is owned by IT Access. This directory does not list personal phone numbers or home addresses. The directory page is pineboard://systems/directory.",
    },
    {
      id: "team-ai",
      type: "team",
      typeLabel: "Team page",
      title: "AI Solutions team",
      owner: "Nia Okoye",
      ownerRole: "Director, AI Solutions",
      updated: "2026-10-15",
      teams: ["ai-solutions"],
      href: "pineboard://teams/ai-solutions",
      body: "AI Solutions reports to Nia Okoye, Director, AI Solutions. Nia Okoye is the manager for new associates on this team. The team page is pineboard://teams/ai-solutions. In week 1 an associate shadows one customer workflow and reads the company glossary. The team uses Claude for drafting. Marlow Pine does not store an API key. The team does not own Marlow CRM.",
    },
    {
      id: "team-cs",
      type: "team",
      typeLabel: "Team page",
      title: "Customer Solutions team",
      owner: "Imani Brooks",
      ownerRole: "Manager, Customer Solutions",
      updated: "2026-10-14",
      teams: ["customer-solutions"],
      href: "pineboard://teams/customer-solutions",
      body: "Imani Brooks manages Customer Solutions. The team works from the Riverton office and remote in the United States. New associates request the Marlow CRM user role on day 1. The Monday standup is 09:30 Pacific. The team page is pineboard://teams/customer-solutions.",
    },
    {
      id: "team-impl",
      type: "team",
      typeLabel: "Team page",
      title: "Implementation team",
      owner: "Adrian Walsh",
      ownerRole: "Manager, Implementation",
      updated: "2026-10-13",
      teams: ["implementation"],
      href: "pineboard://teams/implementation",
      body: "Adrian Walsh manages Implementation. New associates shadow a go-live in the first 30 days and request the Marlow CRM user role plus the implementation workspace. Remote hires in Canada use the same tool list. The team page is pineboard://teams/implementation.",
    },
    {
      id: "benefits",
      type: "benefits",
      typeLabel: "Benefits",
      title: "Benefits enrollment window",
      owner: "Helena Voss",
      ownerRole: "People Partner",
      updated: "2026-07-18",
      teams: ["all"],
      href: "pineboard://benefits/enroll",
      body: "Enroll in medical, dental, and retirement within 14 days of the start date. The window closes at the end of day 14. Helena Voss and the People team send the packet in Pineboard on day 1. Missing the window waits until the next annual enrollment, except for a qualifying life event. This note does not list premiums or carrier phone numbers. The form is pineboard://benefits/enroll.",
    },
    {
      id: "security",
      type: "training",
      typeLabel: "Security training",
      title: "Security training for new hires",
      owner: "Marcus Ellison",
      ownerRole: "Security",
      updated: "2026-09-28",
      teams: ["all"],
      href: "pineboard://learning/security-basics",
      body: "Complete Marlow Pine Security Basics by the end of day 7. The course is in Pineboard under Learning at pineboard://learning/security-basics. A score of 80 percent is required. Customer data stays locked until Security marks the course complete. Marcus Ellison owns the course. This note does not include the quiz answers.",
    },
    {
      id: "glossary",
      type: "glossary",
      typeLabel: "Glossary",
      title: "Company glossary",
      owner: "Nia Okoye",
      ownerRole: "Director, AI Solutions",
      updated: "2026-06-02",
      teams: ["all"],
      href: "pineboard://glossary",
      body: "Pineboard is the internal workspace for requests, learning, and team pages. Marlow CRM is the customer system of record. Lumen Boards holds the analytics dashboards. A system owner approves access after the manager. Riverton, at 18 Cedar Street, is the only office. This glossary does not define customer contract terms. The glossary page is pineboard://glossary.",
    },
    {
      id: "week1",
      type: "policy",
      typeLabel: "Onboarding policy",
      title: "Week 1 onboarding checklist",
      owner: "Helena Voss",
      ownerRole: "People Partner",
      updated: "2026-09-20",
      teams: ["all"],
      href: "pineboard://onboarding/week-1",
      body: "By the end of week 1, finish security training, request the tools your team uses, start benefits enrollment, and meet your team. Helena Voss and the People team track completion in Pineboard. A new hire who has not finished security training by day 7 loses access to customer data until the course is complete. The week 1 page is pineboard://onboarding/week-1.",
    },
    {
      id: "day30",
      type: "policy",
      typeLabel: "Onboarding policy",
      title: "Day 30 check-in",
      owner: "Helena Voss",
      ownerRole: "People Partner",
      updated: "2026-09-22",
      teams: ["all"],
      href: "pineboard://onboarding/day-30",
      body: "On day 30 the manager holds a check-in. Nia Okoye holds it for AI Solutions. Imani Brooks holds it for Customer Solutions. Adrian Walsh holds it for Implementation. The new hire brings a short note on the tools they can use and one workflow they have shadowed. People does not decide the outcome. The check-in page is pineboard://onboarding/day-30.",
    },
    {
      id: "manager-intro",
      type: "policy",
      typeLabel: "Onboarding policy",
      title: "Manager intro on day 1",
      owner: "Helena Voss",
      ownerRole: "People Partner",
      updated: "2026-08-30",
      teams: ["all"],
      href: "pineboard://onboarding/manager-intro",
      body: "On day 1, send your manager a short note with your name, your team, the city or remote location you are starting from, and one question about the first week. Keep it under 120 words. Do not include compensation. People does not send this note for you. Helena Voss owns this guide. The guide is pineboard://onboarding/manager-intro.",
    },
  ];

  const DEMO_PLAN = [
    {
      phase: "day1",
      id: "arrive",
      action: "Arrive at 18 Cedar Street by 9:00 and collect your badge at reception.",
      owner: "Helena Voss",
      ownerRole: "People Partner",
      href: "pineboard://places/riverton",
      hrefLabel: "Day 1 onboarding: Riverton badge and remote start",
      cites: ["place-start"],
      due: "day0",
    },
    {
      phase: "day1",
      id: "laptop",
      action: "Pick up your laptop at reception, sign in with your @marlowpine.example email, and install the Pineboard agent.",
      owner: "Chris Adelayo",
      ownerRole: "IT Access",
      href: "pineboard://it/laptop",
      hrefLabel: "Laptop and first Pineboard login",
      cites: ["laptop"],
      due: "day0",
    },
    {
      phase: "day1",
      id: "access",
      action: "File a Pineboard request for the AI Solutions workspace and for Marlow CRM read. Do not request production admin.",
      owner: "Nia Okoye",
      ownerRole: "Director, AI Solutions",
      also: "Meera Shah approves CRM read",
      href: "pineboard://access/new",
      hrefLabel: "AI Solutions workspace access",
      cites: ["ai-workspace"],
      due: "day0",
    },
    {
      phase: "day1",
      id: "intro",
      action: "Send Nia Okoye a short note with your name, team, Riverton start, and one question about the first week.",
      owner: "Nia Okoye",
      ownerRole: "Director, AI Solutions",
      href: "pineboard://onboarding/manager-intro",
      hrefLabel: "Manager intro on day 1",
      cites: ["manager-intro", "team-ai"],
      due: "day0",
    },
    {
      phase: "week1",
      id: "security",
      action: "Finish Marlow Pine Security Basics with a score of at least 80 percent so customer data can unlock.",
      owner: "Marcus Ellison",
      ownerRole: "Security",
      href: "pineboard://learning/security-basics",
      hrefLabel: "Security training for new hires",
      cites: ["security"],
      due: "day7",
    },
    {
      phase: "week1",
      id: "benefits",
      action: "Enroll in medical, dental, and retirement. The window closes at the end of day 14.",
      owner: "Helena Voss",
      ownerRole: "People Partner",
      href: "pineboard://benefits/enroll",
      hrefLabel: "Benefits enrollment window",
      cites: ["benefits"],
      due: "day14",
    },
    {
      phase: "week1",
      id: "shadow",
      action: "Shadow one customer workflow and read the company glossary.",
      owner: "Nia Okoye",
      ownerRole: "Director, AI Solutions",
      href: "pineboard://teams/ai-solutions",
      hrefLabel: "AI Solutions team",
      cites: ["team-ai", "glossary"],
      due: "day7",
    },
    {
      phase: "day30",
      id: "checkin",
      action: "Bring a short note on the tools you can use and one workflow you shadowed to your check-in with Nia Okoye.",
      owner: "Nia Okoye",
      ownerRole: "Director, AI Solutions",
      href: "pineboard://onboarding/day-30",
      hrefLabel: "Day 30 check-in",
      cites: ["day30"],
      due: "day30",
    },
  ];

  const DEMO_INTRO = {
    text: "Hi Nia — I'm Amina Okonkwo, starting as an Associate on AI Solutions from the Riverton office. I'll file the Pineboard request for the AI Solutions workspace and Marlow CRM read after we meet. What should I shadow in the first week?",
    cites: ["manager-intro", "ai-workspace"],
  };

  const DEMOS = [
    {
      id: "crm",
      question: "How do I get access to the CRM?",
      match: ["access to the crm", "crm access"],
      lines: [
        "File a Pineboard access request and ask for Marlow CRM read. AI Solutions requests CRM read unless the manager asks for write. {crm-access}",
        "Nia Okoye approves the AI Solutions workspace. Meera Shah approves CRM read after the manager. {ai-workspace}",
        "Meera Shah owns Marlow CRM. {crm-access}",
        "Chris Adelayo's IT Access team provisions standard access within one business day after the manager approves. {access-request}",
        "Next step: open pineboard://systems/marlow-crm and submit the request at pineboard://access/new. Do not share a teammate's login. {crm-access}",
      ],
    },
    {
      id: "dashboards",
      question: "Who owns the analytics dashboards?",
      match: ["analytics dashboards", "analytics dashboard"],
      lines: [
        "Evan Cho owns the analytics dashboards in Lumen Boards. {lumen-boards}",
        "Next step: file a Pineboard request named Lumen Boards viewer and name Evan Cho as the system owner. {lumen-boards}",
        "The system page is pineboard://systems/lumen-boards. Editors are limited to Analytics. {lumen-boards}",
      ],
    },
    {
      id: "door",
      question: "What is the Riverton office door code?",
      match: ["door code"],
      lines: [
        "I don't see a Riverton door code in the onboarding documents.",
        "The arrival note does not list a building door code. {place-start}",
      ],
    },
  ];

  function tokenize(text) {
    const raw = String(text || "").toLowerCase();
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
        body: tokenize(`${doc.body} ${doc.href}`),
      },
    }));
    return { docs, fields };
  }

  const INDEX = buildIndex(CORPUS);

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

  function teamAdjust(doc, profile) {
    if (doc.teams.includes(profile.teamId)) return 6;
    if (doc.teams.includes("all")) return 3;
    return -12;
  }

  function search(query, profile, limit) {
    const queryTokens = [...new Set(tokenize(query))];
    const ranked = [];
    if (queryTokens.length && profile && PROFILES[profile.id]) {
      for (const row of INDEX.docs) {
        const hits = [];
        let score = 0;
        for (const term of queryTokens) {
          const hit = bestHit(row, term);
          if (!hit.field) continue;
          hits.push({ term, field: hit.field });
          score += hit.points;
        }
        if (!hits.length) continue;
        score += teamAdjust(row.doc, profile);
        if (score < 8) continue;
        ranked.push({
          row,
          score,
          hits,
          recency: Date.parse(`${row.doc.updated}T00:00:00Z`) || 0,
        });
      }
    }
    ranked.sort((a, b) => {
      if (Math.abs(b.score - a.score) > 0.05) return b.score - a.score;
      if (a.recency !== b.recency) return b.recency - a.recency;
      return a.row.doc.id < b.row.doc.id ? -1 : 1;
    });
    const results = ranked.slice(0, limit).map((item) => ({
      ...item.row.doc,
      score: item.score,
      hits: item.hits,
      why: whyText(item.hits),
    }));
    return { queryTokens, total: ranked.length, results };
  }

  function planQuery(profile) {
    const place = profile.locationId === "riverton"
      ? "badge reception Riverton office"
      : "remote video call laptop shipment";
    return [
      "day 1 onboarding",
      "week 1",
      "day 30 check-in",
      "laptop login",
      "security training",
      "benefits enrollment",
      "manager intro",
      "access request",
      "glossary",
      profile.team,
      profile.manager,
      profile.location,
      place,
    ].join(" ");
  }

  function introQuery(profile) {
    return `manager intro note ${profile.team} ${profile.manager} ${profile.location} workspace access`;
  }

  function shiftISO(iso, days) {
    const [year, month, day] = String(iso).split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day + days));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatWhen(iso, withYear) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: withYear ? "numeric" : undefined,
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }

  function dueLabel(start, due) {
    const iso = shiftISO(start, DUE_OFFSET[due]);
    return `Due ${formatWhen(iso, false)}`;
  }

  function sourceBlock(found) {
    if (!found.results.length) return "Retrieved documents: none.";
    const lines = ["Retrieved documents, numbered in the order shown in the app. Use only these snippets.", ""];
    found.results.forEach((doc, index) => {
      lines.push(`[${index + 1}] ${doc.typeLabel} · updated ${doc.updated} · ${doc.title}`);
      lines.push(`Owner: ${doc.owner} (${doc.ownerRole})`);
      lines.push(`Link: ${doc.href}`);
      lines.push(doc.body);
      lines.push("");
    });
    return lines.join("\n").trim();
  }

  function profileBlock(profile) {
    return [
      "Company: Marlow Pine (fictional).",
      `Name: ${profile.name}`,
      `Role: ${profile.role}`,
      `Team: ${profile.team}`,
      `Start date: ${profile.start} (${formatWhen(profile.start, true)})`,
      `Location: ${profile.location}`,
      `Manager: ${profile.manager}, ${profile.managerRole}`,
      "Due tokens: day0 is the start date, day7 is start plus 7 days, day14 is start plus 14 days, day30 is start plus 30 days. The app prints the calendar date. Do not write one.",
    ].join("\n");
  }

  function userPrompt(kind, profile, found, question) {
    const lines = [profileBlock(profile), ""];
    if (kind === "ask") {
      lines.push(`Question: ${question}`, "", sourceBlock(found));
    } else if (kind === "intro") {
      lines.push("Draft the intro note to the manager.", "", sourceBlock(found));
    } else {
      lines.push("Build the checklist from the retrieved documents.", "", sourceBlock(found));
    }
    return lines.join("\n").trim();
  }

  function buildRequest(kind, profile, found, question) {
    const system = kind === "plan" ? SYSTEM_PLAN : kind === "ask" ? SYSTEM_ASK : SYSTEM_INTRO;
      return {
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: "between_tools" },
      output_config: { effort: "medium" },
      system,
      messages: [{ role: "user", content: userPrompt(kind, profile, found, question) }],
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

  function demoAnswer(question, found) {
    const demo = matchDemo(question);
    if (!demo) return "";
    return demo.lines.map((line) => citeSentence(found.results, line)).filter(Boolean).join(" ");
  }

  function citeNumbers(results, ids) {
    return ids.map((id) => results.findIndex((doc) => doc.id === id) + 1).filter((number) => number > 0);
  }

  function resolveDemoPlan(profile, found) {
    if (!profile || !profile.demo) return null;
    return DEMO_PLAN.map((item) => ({
      ...item,
      citeNums: citeNumbers(found.results, item.cites),
    }));
  }

  function groupItems(items) {
    const groups = { day1: [], week1: [], day30: [] };
    for (const item of items) {
      const phase = item.due === "day0" ? "day1" : item.due === "day30" ? "day30" : "week1";
      groups[phase].push(item);
    }
    return groups;
  }

  function normalizePlan(raw, resultCount) {
    const phases = Array.isArray(raw && raw.phases) ? raw.phases : [];
    const allowedDue = new Set(Object.keys(DUE_OFFSET));
    const seen = new Set();
    const items = [];
    for (const phase of phases) {
      if (!phase || !Array.isArray(phase.items)) continue;
      for (const item of phase.items) {
        if (!item || typeof item.action !== "string" || !item.action.trim()) continue;
        if (typeof item.owner !== "string" || !item.owner.trim()) continue;
        if (typeof item.href !== "string" || !item.href.startsWith("pineboard://") || /\s/.test(item.href)) continue;
        if (!allowedDue.has(item.due)) continue;
        const cites = (Array.isArray(item.cites) ? item.cites : [])
          .map(Number)
          .filter((number) => Number.isInteger(number) && number >= 1 && number <= resultCount);
        if (!cites.length) continue;
        let id = String(item.id || item.action).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
        if (!id) id = "item";
        while (seen.has(id)) id = `${id}x`.slice(0, 40);
        seen.add(id);
        items.push({
          id,
          action: item.action.trim(),
          owner: item.owner.trim(),
          ownerRole: typeof item.ownerRole === "string" ? item.ownerRole.trim() : "",
          href: item.href.trim(),
          hrefLabel: typeof item.hrefLabel === "string" && item.hrefLabel.trim() ? item.hrefLabel.trim() : item.href.trim(),
          citeNums: cites,
          due: item.due,
        });
      }
    }
    return groupItems(items);
  }

  function parsePlan(text) {
    const stripped = stripFence(text);
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(stripped.slice(start, end + 1));
    } catch {
      return null;
    }
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
    const trimmed = String(text || "").trim();
    const fenced = /^```(?:json|markdown|md)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
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
    const root = document.createElement("div");
    let paragraph = [];
    const flush = () => {
      if (!paragraph.length) return;
      const p = document.createElement("p");
      p.innerHTML = inlineHtml(paragraph.join(" "), resultCount);
      root.append(p);
      paragraph = [];
    };
    for (const line of lines) {
      if (!line.trim()) {
        flush();
        continue;
      }
      paragraph.push(line.trim());
    }
    flush();
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

  function snippet(body, queryTokens, limit = 180) {
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
    const start = Math.max(0, index - 50);
    const end = Math.min(body.length, start + limit);
    const slice = body.slice(start, end).trim();
    return `${start > 0 ? "…" : ""}${slice}${end < body.length ? "…" : ""}`;
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

  function loadChecks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHECKS_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function setCheck(profileId, itemId, on) {
    const all = loadChecks();
    if (!all[profileId] || typeof all[profileId] !== "object") all[profileId] = {};
    if (on) all[profileId][itemId] = true;
    else delete all[profileId][itemId];
    try {
      localStorage.setItem(CHECKS_KEY, JSON.stringify(all));
    } catch {
      /* private mode */
    }
  }

  function isChecked(profileId, itemId) {
    const all = loadChecks();
    return Boolean(all[profileId] && all[profileId][itemId]);
  }

  function ownerLine(names) {
    const unique = [];
    for (const name of names) {
      if (name && !unique.includes(name)) unique.push(name);
    }
    if (!unique.length) return "";
    if (unique.length === 1) return unique[0];
    if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
    return `${unique.slice(0, -1).join(", ")}, and ${unique[unique.length - 1]}`;
  }

  function mount() {
    const $ = (selector) => document.querySelector(selector);
    const questionInput = $("#question");
    const keyInput = $("#api-key");
    const rememberInput = $("#remember-key");
    const buildButton = $("#build-plan");
    const draftButton = $("#draft-intro");
    const askButton = $("#ask");
    const formError = $("#form-error");
    const outputName = $("#output-name");
    const profileButtons = [...document.querySelectorAll("[data-profile]")];
    let profileId = "";
    let busy = false;
    let generation = 0;
    let controller = null;
    let currentItems = [];

    const saved = readStorage();
    if (saved.key) keyInput.value = saved.key;
    rememberInput.checked = saved.remember;

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
      if (!item) return;
      item.dataset.state = state;
      if (state === "active") item.setAttribute("aria-current", "step");
      else item.removeAttribute("aria-current");
      if (detail) item.querySelector("[data-detail]").textContent = detail;
    }

    function resetSteps(kind) {
      outputName.textContent = kind === "ask" ? "Answer" : kind === "intro" ? "Draft" : "Plan";
      setStep("search", "idle", "Glean-style · local");
      setStep("owners", "idle", "People and systems");
      setStep("claude", "idle", "Sonnet 5.5");
      setStep("output", "idle", kind === "ask" ? "Cited" : kind === "intro" ? "Copy only" : "Checklist");
    }

    function profile() {
      return PROFILES[profileId] || null;
    }

    function persistKey() {
      writeStorage(keyInput.value.trim(), rememberInput.checked);
    }

    function setBusy(next) {
      busy = next;
      buildButton.disabled = next;
      draftButton.disabled = next;
      askButton.disabled = next;
      buildButton.setAttribute("aria-busy", next ? "true" : "false");
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

    function fillMode(node, mode) {
      node.replaceChildren();
      const strong = document.createElement("strong");
      strong.textContent = mode.label;
      node.append(strong, document.createTextNode(` ${mode.detail}`));
    }

    function clearOutput() {
      currentItems = [];
      $("#plan-empty").hidden = false;
      $("#plan-data").hidden = true;
      $("#plan-panel").setAttribute("aria-labelledby", "plan-heading");
      $("#plan-heading").textContent = "The first month lands here.";
      $("#answer-panel").hidden = true;
      $("#draft-panel").hidden = true;
      $("#sources-empty").hidden = false;
      $("#sources-data").hidden = true;
      $("#prompt-section").hidden = true;
    }

    function paintSources(found) {
      $("#sources-empty").hidden = true;
      $("#sources-data").hidden = false;
      const count = found.results.length;
      $("#sources-title").textContent = count === 1 ? "1 source" : `${count} sources`;
      const extra = found.total > count ? `Top ${count} of ${found.total}` : `${found.total} match${found.total === 1 ? "" : "es"}`;
      $("#sources-count").textContent = extra;
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
        owner.textContent = `${doc.owner} · ${doc.ownerRole}`;
        const link = document.createElement("p");
        link.className = "result-link";
        link.textContent = doc.href;
        const body = document.createElement("p");
        body.className = "snippet";
        body.innerHTML = highlight(snippet(doc.body, found.queryTokens), found.queryTokens);
        const why = document.createElement("p");
        why.className = "why";
        why.textContent = doc.why;
        item.append(top, title, owner, link, body, why);
        list.append(item);
      });
      if (!count) {
        const empty = document.createElement("li");
        empty.className = "owner";
        empty.textContent = "No sample document matched.";
        list.append(empty);
      }
    }

    function ownerSummary(found) {
      const names = found.results.map((doc) => doc.owner);
      const label = ownerLine(names);
      if (!names.length) return "No owners in this packet";
      const extra = new Set(names).size;
      return extra === 1 ? names[0] : `${names[0]} + ${extra - 1}`;
    }

    function paintProgress() {
      const total = currentItems.length;
      const done = currentItems.filter((item) => isChecked(profileId, item.id)).length;
      const progress = document.querySelector(".progress");
      if (progress) progress.hidden = total === 0;
      const track = $("#progress-track");
      track.setAttribute("aria-valuemax", String(total || 1));
      track.setAttribute("aria-valuenow", String(done));
      $("#progress-bar").style.width = total ? `${Math.round((done / total) * 100)}%` : "0%";
      $("#progress-label").textContent = total ? `${done} of ${total} complete` : "0 complete";
    }

    function addCites(parent, numbers) {
      numbers.forEach((number) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "cite";
        button.dataset.cite = String(number);
        button.textContent = `[${number}]`;
        parent.append(button);
      });
    }

    function renderPlan(person, groups, found, mode) {
      currentItems = PHASES.flatMap((phase) => groups[phase.id] || []);
      $("#plan-empty").hidden = true;
      $("#plan-data").hidden = false;
      $("#plan-panel").setAttribute("aria-labelledby", "plan-title");
      $("#plan-kicker").textContent = person.team;
      $("#plan-title").textContent = `${person.name.split(" ")[0]}’s first month`;
      $("#plan-deadline").textContent = `Deadlines counted from ${formatWhen(person.start, true)}.`;
      const names = [];
      currentItems.forEach((item) => names.push(item.owner));
      $("#plan-owners").textContent = names.length ? `Contact ${ownerLine(names)}.` : "";
      const root = $("#phases");
      root.replaceChildren();
      PHASES.forEach((phase) => {
        const section = document.createElement("section");
        section.className = "phase";
        const head = document.createElement("div");
        head.className = "phase-head";
        const heading = document.createElement("h3");
        const items = groups[phase.id] || [];
        heading.textContent = `${phase.title} · ${items.length}`;
        const blurb = document.createElement("p");
        blurb.className = "phase-blurb";
        blurb.textContent = phase.blurb;
        head.append(heading, blurb);
        section.append(head);
        if (!items.length) {
          const empty = document.createElement("p");
          empty.className = "phase-empty";
          empty.textContent = "No cited step for this phase.";
          section.append(empty);
          root.append(section);
          return;
        }
        const list = document.createElement("ul");
        list.className = "tasks";
        items.forEach((item) => {
          const li = document.createElement("li");
          li.className = "task";
          const checked = isChecked(person.id, item.id);
          if (checked) li.classList.add("is-done");
          const label = document.createElement("label");
          label.className = "task-hit";
          const input = document.createElement("input");
          input.type = "checkbox";
          input.value = item.id;
          input.checked = checked;
          const copy = document.createElement("span");
          const action = document.createElement("span");
          action.className = "task-action";
          action.textContent = item.action;
          const meta = document.createElement("span");
          meta.className = "task-meta";
          const due = document.createElement("span");
          due.className = "due";
          due.textContent = dueLabel(person.start, item.due);
          const who = document.createElement("span");
          const role = item.ownerRole ? ` · ${item.ownerRole}` : "";
          const also = item.also ? ` · ${item.also}` : "";
          who.textContent = `Contact ${item.owner}${role}${also}`;
          meta.append(due, who);
          copy.append(action, meta);
          label.append(input, copy);
          const links = document.createElement("div");
          links.className = "task-links";
          addCites(links, item.citeNums || []);
          const jump = document.createElement("button");
          jump.type = "button";
          jump.className = "source-jump";
          jump.textContent = item.href;
          if (item.citeNums && item.citeNums[0]) jump.dataset.cite = String(item.citeNums[0]);
          links.append(jump);
          li.append(label, links);
          list.append(li);
        });
        section.append(list);
        root.append(section);
      });
      fillMode($("#plan-mode"), mode);
      paintProgress();
    }

    function paintAnswer(question, text, found, mode) {
      $("#answer-panel").hidden = false;
      $("#asked").textContent = question;
      const article = $("#answer");
      article.replaceChildren();
      const kicker = document.createElement("p");
      kicker.className = mode.refuses ? "paper-kicker is-refusal" : "paper-kicker";
      kicker.textContent = mode.kicker;
      article.append(kicker, renderBlocks(text, found.results.length));
      article.classList.remove("is-fresh");
      void article.offsetWidth;
      article.classList.add("is-fresh");
      fillMode($("#answer-mode"), mode);
    }

    function paintDraft(person, text, found, citeIds, mode) {
      $("#draft-panel").hidden = false;
      $("#draft-text").value = text;
      $("#copy-draft").textContent = "Copy";
      const cites = $("#draft-cites");
      cites.replaceChildren();
      const numbers = citeNumbers(found.results, citeIds);
      if (numbers.length) {
        const label = document.createElement("span");
        label.textContent = "Grounded in ";
        cites.append(label);
        addCites(cites, numbers);
      }
      fillMode($("#draft-mode"), mode);
      $("#draft-text").focus();
    }

    function showNeedKey(kind, person) {
      const name = person.demo ? "This profile has a demo." : "Demo answers are written for Amina Okonkwo only.";
      if (kind === "ask") {
        $("#answer-panel").hidden = false;
        $("#asked").textContent = questionInput.value.trim();
        const article = $("#answer");
        article.replaceChildren();
        const kicker = document.createElement("p");
        kicker.className = "paper-kicker";
        kicker.textContent = "Key needed";
        const copy = document.createElement("p");
        copy.textContent = `${name} Paste an Anthropic API key to ask this. The key stays in this browser.`;
        article.append(kicker, copy);
        fillMode($("#answer-mode"), {
          label: "Demo mode.",
          detail: "Prewritten answers cover the sample questions for Amina only.",
        });
      } else if (kind === "intro") {
        $("#draft-panel").hidden = false;
        $("#draft-text").value = "";
        $("#draft-cites").textContent = "";
        fillMode($("#draft-mode"), {
          label: "Key needed.",
          detail: `${name} Nothing was drafted and nothing was sent.`,
        });
      } else {
        $("#plan-empty").hidden = true;
        $("#plan-data").hidden = false;
        $("#plan-panel").setAttribute("aria-labelledby", "plan-title");
        $("#plan-title").textContent = "A key writes this plan.";
        $("#plan-kicker").textContent = person.name;
        $("#plan-deadline").textContent = "Amina Okonkwo is the sample profile with a prewritten plan.";
        $("#plan-owners").textContent = "";
        $("#phases").replaceChildren();
        currentItems = [];
        paintProgress();
        fillMode($("#plan-mode"), {
          label: "Key needed.",
          detail: "Paste an Anthropic API key, or choose Amina Okonkwo for the demo plan.",
        });
      }
    }

    function markChips(question) {
      document.querySelectorAll("[data-question]").forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.question === question ? "true" : "false");
      });
    }

    async function callClaude(request, apiKey, signal) {
      const response = await fetch(API_URL, {
        method: "POST",
        referrerPolicy: "no-referrer",
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
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
      const text = textFromMessage(data);
      if (!text) throw new Error("Claude returned no text. Try again.");
      return text;
    }

    function fail(kind, message, person, demoReady) {
      if (kind === "ask") {
        $("#answer-panel").hidden = false;
        $("#asked").textContent = questionInput.value.trim();
        const article = $("#answer");
        article.replaceChildren();
        const kicker = document.createElement("p");
        kicker.className = "paper-kicker";
        kicker.textContent = "Claude did not answer";
        const copy = document.createElement("p");
        copy.textContent = message;
        article.append(kicker, copy);
        if (demoReady) article.append(demoButton());
        fillMode($("#answer-mode"), { label: "Call failed.", detail: "The key stayed in this browser." });
      } else if (kind === "intro") {
        $("#draft-panel").hidden = false;
        $("#draft-text").value = "";
        $("#draft-cites").replaceChildren();
        if (demoReady) $("#draft-cites").append(demoButton());
        fillMode($("#draft-mode"), { label: "Call failed.", detail: message });
      } else {
        $("#plan-empty").hidden = true;
        $("#plan-data").hidden = false;
        $("#plan-panel").setAttribute("aria-labelledby", "plan-title");
        $("#plan-title").textContent = "Claude did not return a plan.";
        $("#plan-deadline").textContent = message;
        $("#plan-owners").textContent = "";
        $("#phases").replaceChildren();
        if (demoReady) $("#phases").append(demoButton());
        currentItems = [];
        paintProgress();
        fillMode($("#plan-mode"), { label: "Call failed.", detail: "The key stayed in this browser." });
      }
      say(message);
    }

    function demoButton() {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cite";
      button.id = "use-demo";
      button.textContent = "Show demo";
      return button;
    }

    async function run(kind) {
      const person = profile();
      if (!person) {
        showError("Pick a profile first.");
        const first = profileButtons[0];
        if (first) first.focus();
        return;
      }
      const question = questionInput.value.trim();
      const apiKey = keyInput.value.trim();
      persistKey();
      if (kind === "ask" && !question) {
        showError("Ask a question first.");
        questionInput.focus();
        return;
      }
      const token = ++generation;
      showError("");
      if (controller) controller.abort();
      controller = new AbortController();
      setBusy(true);
      resetSteps(kind);
      const labels = { plan: "Building…", ask: "Asking…", intro: "Drafting…" };
      const idleLabels = { plan: "Build my plan", ask: "Ask", intro: "Draft intro to my manager" };
      buildButton.textContent = idleLabels.plan;
      draftButton.textContent = idleLabels.intro;
      askButton.textContent = idleLabels.ask;
      const activeButton = kind === "plan" ? buildButton : kind === "intro" ? draftButton : askButton;
      activeButton.textContent = labels[kind];

      setStep("search", "active", "Ranking sample docs");
      say(`Searching the onboarding packet for ${person.name}.`);
      await wait(80);
      if (token !== generation) return;

      const query = kind === "plan" ? planQuery(person) : kind === "intro" ? introQuery(person) : question;
      const limit = kind === "plan" ? PLAN_LIMIT : kind === "intro" ? INTRO_LIMIT : ASK_LIMIT;
      const found = search(query, person, limit);
      setStep("search", "done", `${CORPUS.length} sample docs`);
      setStep("owners", "active", "Reading owners");
      await wait(70);
      if (token !== generation) return;
      paintSources(found);
      setStep("owners", "done", ownerSummary(found));
      const request = buildRequest(kind, person, found, question);
      if (kind === "ask") markChips(question);

      const demoReady = Boolean(person.demo && (kind !== "ask" || matchDemo(question)));
      const sentNote = "This body was sent to https://api.anthropic.com/v1/messages. The key was only in the x-api-key header.";
      const demoNote = "Not sent. With an Anthropic key, the browser POSTs this JSON to the Messages API and the prewritten text is replaced by Claude’s reply.";

      try {
        if (!apiKey) {
          if (!demoReady) {
            setStep("claude", "idle", "Needs a key");
            setStep("output", "idle", "Not written");
            showPrompt(request, "Not sent. Demo mode has prewritten output for Amina Okonkwo only.");
            showNeedKey(kind, person);
            say("Paste an Anthropic key, or choose Amina Okonkwo.");
            return;
          }
          setStep("claude", "active", "Demo, not a call");
          await wait(80);
          if (token !== generation) return;
          if (kind === "plan") {
            const resolved = resolveDemoPlan(person, found) || [];
            const groups = groupItems(resolved.map((item) => ({ ...item, citeNums: item.citeNums })));
            setStep("claude", "done", "Prewritten demo");
            setStep("output", "done", `${resolved.length} items`);
            renderPlan(person, groups, found, {
              label: "Demo mode.",
              detail: "Prewritten from the sample packet for Amina Okonkwo. Claude was not called.",
            });
            say("Demo plan ready. Deadlines are counted from the start date.");
          } else if (kind === "ask") {
            const text = demoAnswer(question, found) || "I don't see that in the onboarding documents.";
            const refuses = /^I don't see/i.test(text);
            setStep("claude", "done", "Prewritten demo");
            setStep("output", "done", refuses ? "Not in the docs" : "Cited");
            paintAnswer(question, text, found, {
              refuses,
              kicker: refuses ? "Not in the onboarding documents" : "Demo answer",
              label: "Demo mode.",
              detail: "Prewritten from the sources above. Claude was not called.",
            });
            say(refuses ? "The onboarding documents do not cover that." : "Demo answer ready.");
          } else {
            setStep("claude", "done", "Prewritten demo");
            setStep("output", "done", "Copy only");
            paintDraft(person, DEMO_INTRO.text, found, DEMO_INTRO.cites, {
              label: "Demo mode.",
              detail: "Prewritten for Amina Okonkwo. Claude was not called. Nothing is sent.",
            });
            say("Demo intro ready. Copy only. Nothing is sent.");
          }
          showPrompt(request, demoNote);
          return;
        }

        setStep("claude", "active", MODEL);
        showPrompt(request, "Sending this body to the Anthropic Messages API. The key is only in the request header.");
        say("Calling Claude.");
        const text = await callClaude(request, apiKey, controller.signal);
        if (token !== generation) return;
        if (kind === "plan") {
          const parsed = parsePlan(text);
          const groups = parsed ? normalizePlan(parsed, found.results.length) : null;
          const count = groups ? PHASES.reduce((sum, phase) => sum + groups[phase.id].length, 0) : 0;
          if (!count) throw new Error("Claude did not return a checklist with owners, links, and citations.");
          setStep("claude", "done", MODEL);
          setStep("output", "done", `${count} items`);
          renderPlan(person, groups, found, {
            label: MODEL,
            detail: "Written from the snippets above. Deadlines are counted from the start date.",
          });
          say("Plan ready.");
        } else if (kind === "ask") {
          const refuses = /^I don't see/i.test(text);
          setStep("claude", "done", MODEL);
          setStep("output", "done", refuses ? "Not in the docs" : "Cited");
          paintAnswer(question, text, found, {
            refuses,
            kicker: refuses ? "Not in the onboarding documents" : "Claude Sonnet 5.5",
            label: MODEL,
            detail: "Written from the snippets above. Citations use the same numbers.",
          });
          say(refuses ? "Claude does not see that in the onboarding documents." : "Answer ready.");
        } else {
          const note = stripFence(text).trim();
          if (!note) throw new Error("Claude returned an empty note.");
          setStep("claude", "done", MODEL);
          setStep("output", "done", "Copy only");
          paintDraft(person, note, found, ["manager-intro", "team-ai", "ai-workspace"], {
            label: MODEL,
            detail: "Draft only. Nothing is sent.",
          });
          say("Intro draft ready. Copy only. Nothing is sent.");
        }
        showPrompt(request, sentNote);
      } catch (error) {
        if (error && error.name === "AbortError") return;
        if (token !== generation) return;
        const message = error && error.message ? error.message : "The call to Anthropic did not complete.";
        setStep("claude", "idle", "Call failed");
        setStep("output", "idle", "Not written");
        showPrompt(request, "This body was sent. Anthropic did not return a usable result.");
        fail(kind, message, person, demoReady);
      } finally {
        if (token === generation) {
          activeButton.textContent = idleLabels[kind];
          setBusy(false);
        }
      }
    }

    function selectProfile(next) {
      if (!PROFILES[next] || next === profileId) return;
      profileId = next;
      generation += 1;
      if (controller) controller.abort();
      setBusy(false);
      buildButton.textContent = "Build my plan";
      draftButton.textContent = "Draft intro to my manager";
      askButton.textContent = "Ask";
      profileButtons.forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.profile === profileId ? "true" : "false");
      });
      resetSteps("plan");
      clearOutput();
      showError("");
      markChips("");
      say(`${PROFILES[next].name} selected.`);
    }

    $("#ask-form").addEventListener("submit", (event) => {
      event.preventDefault();
      run("ask");
    });
    buildButton.addEventListener("click", () => run("plan"));
    draftButton.addEventListener("click", () => run("intro"));

    keyInput.addEventListener("input", persistKey);
    rememberInput.addEventListener("change", persistKey);
    $("#clear-key").addEventListener("click", () => {
      keyInput.value = "";
      rememberInput.checked = false;
      clearStorage();
      keyInput.focus();
      say("API key cleared from this browser.");
    });

    profileButtons.forEach((button, index) => {
      button.addEventListener("click", () => selectProfile(button.dataset.profile));
      button.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const delta = event.key === "ArrowRight" ? 1 : -1;
        const next = profileButtons[(index + delta + profileButtons.length) % profileButtons.length];
        next.focus();
        selectProfile(next.dataset.profile);
      });
    });

    document.querySelectorAll("[data-question]").forEach((button) => {
      button.addEventListener("click", () => {
        questionInput.value = button.dataset.question;
        run("ask");
      });
    });

    $("#phases").addEventListener("change", (event) => {
      const input = event.target;
      if (!input || input.type !== "checkbox" || !profileId) return;
      const item = input.closest(".task");
      if (item) item.classList.toggle("is-done", input.checked);
      setCheck(profileId, input.value, input.checked);
      paintProgress();
    });

    document.body.addEventListener("click", (event) => {
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
        rememberInput.checked = false;
        clearStorage();
        const person = profile();
        if (person && person.demo) selectProfile("amina");
        profileId = "amina";
        profileButtons.forEach((button) => {
          button.setAttribute("aria-pressed", button.dataset.profile === "amina" ? "true" : "false");
        });
        const redo = $("#answer-panel").hidden ? ($("#draft-panel").hidden ? "plan" : "intro") : "ask";
        run(redo);
      }
    });

    $("#copy-draft").addEventListener("click", async () => {
      const text = $("#draft-text").value;
      const button = $("#copy-draft");
      const area = $("#draft-text");
      if (!text.trim()) {
        showError("The note is empty.");
        return;
      }
      showError("");
      let copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch {
          copied = false;
        }
      }
      if (!copied) {
        area.focus();
        area.select();
        try {
          copied = document.execCommand("copy");
        } catch {
          copied = false;
        }
      }
      button.textContent = copied ? "Copied" : "Select and copy";
      say(copied ? "Draft copied on this device. Nothing was sent." : "Select the note and copy it. Nothing was sent.");
    });
  }

  return {
    CORPUS,
    MODEL,
    PROFILES,
    SYSTEM_PLAN,
    SYSTEM_ASK,
    SYSTEM_INTRO,
    search,
    planQuery,
    introQuery,
    buildRequest,
    matchDemo,
    demoAnswer,
    resolveDemoPlan,
    normalizePlan,
    parsePlan,
    shiftISO,
    formatWhen,
    tokenize,
    mount,
  };
})();

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => OnboardingBuddy.mount());
  else OnboardingBuddy.mount();
}
