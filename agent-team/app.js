/* AI Agent Team — org chart, tool access, and human approval steps. */
globalThis.AgentTeam = (() => {
  const STORAGE_KEY = "builtbyamos.agentTeam.v1";

  const PRESET_TOOLS = [
    { id: "x", label: "X", risks: ["post"] },
    { id: "buffer", label: "Buffer", risks: ["post"] },
    { id: "github", label: "GitHub", risks: [] },
    { id: "email", label: "Email", risks: ["email"] },
    { id: "money", label: "Money/Payments", risks: ["spend"] },
    { id: "calendar", label: "Calendar", risks: [] },
  ];

  const APPROVALS = [
    { id: "posting", label: "Posting" },
    { id: "spending", label: "Spending" },
    { id: "emailing", label: "Emailing people" },
  ];

  const EXAMPLE = {
    owner: "Amos",
    agents: [
      {
        id: "trend",
        name: "SMA Trend Analyst",
        job: "Research trends for the week",
        tools: ["x"],
        customTools: [],
        approvals: ["posting"],
        customApprovals: [],
      },
      {
        id: "strat",
        name: "Strat Analyst",
        job: "Own the weekly strategy",
        tools: ["calendar"],
        customTools: [],
        approvals: [],
        customApprovals: [],
      },
      {
        id: "video",
        name: "Marketeur",
        job: "Edit the short video",
        tools: [],
        customTools: ["Video editor"],
        approvals: [],
        customApprovals: [],
      },
      {
        id: "social",
        name: "Social Media Manager",
        job: "Run the X account",
        tools: ["x", "buffer"],
        customTools: [],
        approvals: ["posting"],
        customApprovals: [],
      },
    ],
    handoffs: [
      { id: "h1", from: "trend", to: "strat" },
      { id: "h2", from: "strat", to: "video" },
      { id: "h3", from: "strat", to: "social" },
    ],
  };

  function exampleTeam() {
    return JSON.parse(JSON.stringify(EXAMPLE));
  }

  function uid(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
  }

  function uniqueStrings(value, maxLen, limit) {
    if (!Array.isArray(value)) return [];
    const out = [];
    const seen = new Set();
    for (const item of value) {
      if (typeof item !== "string") continue;
      const trimmed = item.trim().slice(0, maxLen);
      const key = trimmed.toLowerCase();
      if (!trimmed || seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
      if (out.length >= limit) break;
    }
    return out;
  }

  function sanitize(raw) {
    if (!raw || typeof raw !== "object") return exampleTeam();
    const owner = typeof raw.owner === "string" ? raw.owner.slice(0, 40) : "Amos";
    const agents = [];
    const seen = new Set();
    if (Array.isArray(raw.agents)) {
      for (const item of raw.agents) {
        if (!item || typeof item !== "object") continue;
        const id = typeof item.id === "string" ? item.id.trim().slice(0, 40) : "";
        if (!id || id === "owner" || seen.has(id)) continue;
        const name = typeof item.name === "string" ? item.name.trim().slice(0, 48) : "";
        if (!name) continue;
        seen.add(id);
        const toolIds = new Set(PRESET_TOOLS.map((tool) => tool.id));
        const approvalIds = new Set(APPROVALS.map((item) => item.id));
        agents.push({
          id,
          name,
          job: typeof item.job === "string" ? item.job.trim().slice(0, 80) : "",
          tools: uniqueStrings(item.tools, 24, 12).filter((id) => toolIds.has(id)),
          customTools: uniqueStrings(item.customTools, 32, 12),
          approvals: uniqueStrings(item.approvals, 24, 8).filter((id) => approvalIds.has(id)),
          customApprovals: uniqueStrings(item.customApprovals, 40, 8),
        });
      }
    }
    const ids = new Set(agents.map((agent) => agent.id));
    const handoffs = [];
    const pairs = new Set();
    if (Array.isArray(raw.handoffs)) {
      for (const item of raw.handoffs) {
        if (!item || typeof item !== "object") continue;
        const from = typeof item.from === "string" ? item.from : "";
        const to = typeof item.to === "string" ? item.to : "";
        if (!from || !to || from === to) continue;
        if (!endpointOk(from, ids) || !endpointOk(to, ids)) continue;
        const key = `${from}->${to}`;
        if (pairs.has(key)) continue;
        pairs.add(key);
        const id = typeof item.id === "string" && item.id.trim() ? item.id.trim().slice(0, 40) : uid("h");
        handoffs.push({ id, from, to });
      }
    }
    return { owner, agents, handoffs };
  }

  function endpointOk(id, ids) {
    return id === "owner" || ids.has(id);
  }

  function normJob(job) {
    return String(job || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/g, "");
  }

  function risksForCustom(name) {
    const text = name.toLowerCase();
    const risks = [];
    if (/\b(money|payment|payments|spend|spending|stripe|bank|invoice|billing|payroll|venmo|paypal)\b/.test(text)) risks.push("spend");
    if (/\b(email|e-mail|gmail|inbox|mail)\b/.test(text)) risks.push("email");
    if (/\b(x|twitter|buffer|slack|sms|message|messages|post|posting|social|discord|linkedin|instagram|tiktok|whatsapp|dm|dms)\b/.test(text)) risks.push("post");
    return risks;
  }

  function toolRisks(agent) {
    const items = [];
    for (const id of agent.tools) {
      const preset = PRESET_TOOLS.find((tool) => tool.id === id);
      if (!preset) continue;
      for (const risk of preset.risks) items.push({ risk, label: preset.label });
    }
    for (const name of agent.customTools) {
      for (const risk of risksForCustom(name)) items.push({ risk, label: name });
    }
    return items;
  }

  function covers(agent, risk) {
    if (risk === "spend" && agent.approvals.includes("spending")) return true;
    if (risk === "post" && agent.approvals.includes("posting")) return true;
    if (risk === "email" && agent.approvals.includes("emailing")) return true;
    const custom = (agent.customApprovals || []).join(" ").toLowerCase();
    if (risk === "spend" && /\b(spend\w*|pay\w*|money|invoice\w*|billing)\b/.test(custom)) return true;
    if (risk === "post" && /\b(post\w*|publish\w*|tweet\w*|message\w*)\b/.test(custom)) return true;
    if (risk === "email" && /\b(e-?mail\w*)\b/.test(custom)) return true;
    return false;
  }

  function listNames(names) {
    if (names.length <= 1) return names[0] || "";
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
  }

  function warnings(team) {
    const items = [];
    const agents = Array.isArray(team.agents) ? team.agents : [];
    const handoffs = Array.isArray(team.handoffs) ? team.handoffs : [];
    const groups = new Map();
    for (const agent of agents) {
      const key = normJob(agent.job);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(agent);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      items.push({
        kind: "duplicate",
        text: `${listNames(group.map((agent) => agent.name))} own the same job: “${group[0].job.trim()}”.`,
      });
    }
    for (const agent of agents) {
      if (!normJob(agent.job)) items.push({ kind: "job", text: `${agent.name} has no job yet.` });
    }
    for (const agent of agents) {
      const uncovered = toolRisks(agent).filter((item) => !covers(agent, item.risk));
      if (!uncovered.length) continue;
      const spend = [];
      const messages = [];
      for (const item of uncovered) {
        const bucket = item.risk === "spend" ? spend : messages;
        if (!bucket.includes(item.label)) bucket.push(item.label);
      }
      const parts = [];
      if (spend.length) parts.push(`spend money (${spend.join(", ")})`);
      if (messages.length) parts.push(`send messages (${messages.join(", ")})`);
      if (parts.length) {
        items.push({
          kind: "risk",
          text: `${agent.name} can ${parts.join(" and ")} without an approval step.`,
        });
      }
    }
    for (const agent of agents) {
      const linked = handoffs.some((handoff) => handoff.from === agent.id || handoff.to === agent.id);
      if (!linked) items.push({ kind: "handoff", text: `${agent.name} has no handoff.` });
    }
    return items;
  }

  function layoutLevels(agents, handoffs) {
    const ids = agents.map((agent) => agent.id);
    const incoming = new Map(ids.map((id) => [id, []]));
    const outgoing = new Map(ids.map((id) => [id, []]));
    for (const handoff of handoffs) {
      if (handoff.from === "owner" || handoff.to === "owner") continue;
      if (!incoming.has(handoff.from) || !incoming.has(handoff.to)) continue;
      incoming.get(handoff.to).push(handoff.from);
      outgoing.get(handoff.from).push(handoff.to);
    }
    const level = new Map();
    function depth(id, trail) {
      if (level.has(id)) return level.get(id);
      if (trail.has(id)) return 0;
      trail.add(id);
      let value = 0;
      for (const pred of incoming.get(id)) value = Math.max(value, depth(pred, trail) + 1);
      trail.delete(id);
      level.set(id, value);
      return value;
    }
    for (const id of ids) depth(id, new Set());
    const maxLevel = ids.reduce((max, id) => Math.max(max, level.get(id) || 0), 0);
    const rows = Array.from({ length: ids.length ? maxLevel + 1 : 0 }, () => []);
    for (const agent of agents) rows[level.get(agent.id) || 0].push(agent);

    const indexOf = new Map();
    const order = new Map(agents.map((agent, index) => [agent.id, index]));
    const reindex = () => {
      indexOf.clear();
      rows.forEach((row) => row.forEach((agent, index) => indexOf.set(agent.id, index)));
    };
    const bary = (agent, neighbors) => {
      const found = [];
      for (const id of neighbors.get(agent.id) || []) {
        if (indexOf.has(id)) found.push(indexOf.get(id));
      }
      if (!found.length) return null;
      return found.reduce((sum, value) => sum + value, 0) / found.length;
    };
    const compare = (neighbors) => (a, b) => {
      const left = bary(a, neighbors);
      const right = bary(b, neighbors);
      if (left == null && right == null) return order.get(a.id) - order.get(b.id);
      if (left == null) return 1;
      if (right == null) return -1;
      if (Math.abs(left - right) < 0.001) return order.get(a.id) - order.get(b.id);
      return left - right;
    };
    reindex();
    for (let pass = 0; pass < 4; pass += 1) {
      for (let row = 1; row < rows.length; row += 1) {
        rows[row].sort(compare(incoming));
        reindex();
      }
      for (let row = rows.length - 2; row >= 0; row -= 1) {
        rows[row].sort(compare(outgoing));
        reindex();
      }
    }
    return rows;
  }

  function toolLabels(agent) {
    const labels = agent.tools.map((id) => PRESET_TOOLS.find((tool) => tool.id === id)?.label || id);
    return labels.concat(agent.customTools);
  }

  function approvalLabels(agent) {
    const labels = APPROVALS.filter((item) => agent.approvals.includes(item.id)).map((item) => item.label);
    return labels.concat(agent.customApprovals);
  }

  function mount() {
    const $ = (selector) => document.querySelector(selector);
    const SVG_NS = "http://www.w3.org/2000/svg";
    let state = load();
    let editingId = null;
    let selectedId = null;
    let drawMode = false;
    let drawSource = null;
    let lastRows = [];
    let edgeFrame = 0;
    let warningKey = "";

    buildToggleChips($("#tool-chips"), PRESET_TOOLS, "tool");
    buildToggleChips($("#approval-chips"), APPROVALS, "approval");
    $("#owner-name").value = state.owner;
    fillForm(null);
    bind();
    render();
    save();
    window.addEventListener("resize", scheduleEdges);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(() => scheduleEdges());
      observer.observe($("#chart-scroll"));
    }

    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return exampleTeam();
        return sanitize(JSON.parse(raw));
      } catch {
        return exampleTeam();
      }
    }

    function save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* private mode or blocked storage */
      }
    }

    function ownerLabel() {
      return state.owner.trim() || "Owner";
    }

    function labelOf(id) {
      if (id === "owner") return ownerLabel();
      const agent = state.agents.find((item) => item.id === id);
      return agent ? agent.name : "Agent";
    }

    function buildToggleChips(container, items, kind) {
      for (const item of items) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset[kind] = item.id;
        button.textContent = item.label;
        button.setAttribute("aria-pressed", "false");
        button.addEventListener("click", () => {
          const on = button.getAttribute("aria-pressed") === "true";
          button.setAttribute("aria-pressed", on ? "false" : "true");
        });
        container.append(button);
      }
    }

    function readDraft() {
      const pressed = (selector) => [...document.querySelectorAll(selector)]
        .filter((button) => button.getAttribute("aria-pressed") === "true")
        .map((button) => button.dataset.tool || button.dataset.approval);
      const chips = (selector, key) => [...document.querySelectorAll(selector)].map((node) => node.dataset[key]);
      return {
        name: $("#agent-name").value.trim().slice(0, 48),
        job: $("#agent-job").value.trim().slice(0, 80),
        tools: pressed("#tool-chips button"),
        customTools: chips("#custom-tools [data-custom-tool]", "customTool"),
        approvals: pressed("#approval-chips button"),
        customApprovals: chips("#custom-approvals [data-custom-approval]", "customApproval"),
      };
    }

    function setPressed(selector, values) {
      document.querySelectorAll(selector).forEach((button) => {
        const id = button.dataset.tool || button.dataset.approval;
        button.setAttribute("aria-pressed", values.includes(id) ? "true" : "false");
      });
    }

    function renderCustomChips(container, values, kind) {
      const key = kind === "tool" ? "customTool" : "customApproval";
      container.replaceChildren();
      for (const value of values) {
        const span = document.createElement("span");
        span.className = "chip";
        span.dataset[key] = value;
        const text = document.createElement("span");
        text.textContent = value;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "chip-x";
        remove.setAttribute("aria-label", `Remove ${value}`);
        remove.textContent = "×";
        remove.addEventListener("click", () => span.remove());
        span.append(text, remove);
        container.append(span);
      }
    }

    function fillForm(agent) {
      editingId = agent ? agent.id : null;
      $("#agent-name").value = agent ? agent.name : "";
      $("#agent-job").value = agent ? agent.job : "";
      setPressed("#tool-chips button", agent ? agent.tools : []);
      setPressed("#approval-chips button", agent ? agent.approvals : []);
      renderCustomChips($("#custom-tools"), agent ? agent.customTools : [], "tool");
      renderCustomChips($("#custom-approvals"), agent ? agent.customApprovals : [], "approval");
      $("#form-heading").textContent = agent ? "Edit agent" : "Add an agent";
      $("#save-agent").textContent = agent ? "Save agent" : "Add agent";
      $("#delete-agent").hidden = !agent;
      $("#cancel-edit").hidden = !agent;
      $("#form-error").textContent = "";
    }

    function addCustom(input, container, kind, limit) {
      const maxLen = kind === "tool" ? 32 : 40;
      const name = input.value.trim().slice(0, maxLen);
      if (!name) return;
      const draft = readDraft();
      const existing = kind === "tool" ? draft.customTools : draft.customApprovals;
      if (existing.some((item) => item.toLowerCase() === name.toLowerCase())) {
        input.value = "";
        return;
      }
      if (kind === "tool") {
        const preset = PRESET_TOOLS.find((tool) => tool.label.toLowerCase() === name.toLowerCase());
        if (preset) {
          const button = document.querySelector(`#tool-chips [data-tool="${preset.id}"]`);
          if (button) button.setAttribute("aria-pressed", "true");
          input.value = "";
          return;
        }
      }
      if (existing.length >= limit) return;
      const next = existing.concat(name);
      renderCustomChips(container, next, kind);
      input.value = "";
    }

    function bind() {
      $("#owner-name").addEventListener("keydown", (event) => {
        if (event.key === "Enter") event.preventDefault();
      });
      $("#owner-name").addEventListener("input", () => {
        state.owner = $("#owner-name").value.slice(0, 40);
        save();
        render();
      });
      $("#owner-name").addEventListener("blur", () => {
        $("#owner-name").value = state.owner.trim();
        state.owner = $("#owner-name").value;
        save();
        render();
      });
      $("#add-tool").addEventListener("click", () => addCustom($("#custom-tool"), $("#custom-tools"), "tool", 12));
      $("#add-approval").addEventListener("click", () => addCustom($("#custom-approval"), $("#custom-approvals"), "approval", 8));
      for (const id of ["#custom-tool", "#custom-approval"]) {
        $(id).addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (id === "#custom-tool") addCustom($("#custom-tool"), $("#custom-tools"), "tool", 12);
          else addCustom($("#custom-approval"), $("#custom-approvals"), "approval", 8);
        });
      }
      $("#agent-form").addEventListener("submit", submitAgent);
      $("#cancel-edit").addEventListener("click", () => {
        selectedId = null;
        fillForm(null);
        renderChart();
      });
      $("#delete-agent").addEventListener("click", deleteAgent);
      $("#draw-handoff").addEventListener("click", () => {
        drawMode = !drawMode;
        drawSource = null;
        syncDraw();
        renderChart();
      });
      $("#reset-team").addEventListener("click", resetTeam);
      $("#export-png").addEventListener("click", exportPng);
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || !drawMode) return;
        drawMode = false;
        drawSource = null;
        syncDraw();
        renderChart();
      });
    }

    function syncDraw() {
      const button = $("#draw-handoff");
      button.setAttribute("aria-pressed", drawMode ? "true" : "false");
      button.textContent = drawMode ? "Cancel drawing" : "Draw handoff";
      $("#chart").classList.toggle("drawing", drawMode);
      const hint = $("#draw-hint");
      if (!drawMode) hint.textContent = "";
      else if (!drawSource) hint.textContent = "Click who passes the work. You can start with yourself.";
      else hint.textContent = `Now click who receives work from ${labelOf(drawSource)}.`;
    }

    function submitAgent(event) {
      event.preventDefault();
      const draft = readDraft();
      if (!draft.name) {
        $("#form-error").textContent = "Name the agent first.";
        $("#agent-name").focus();
        return;
      }
      if (editingId) {
        const agent = state.agents.find((item) => item.id === editingId);
        if (!agent) return;
        Object.assign(agent, draft);
        selectedId = agent.id;
        $("#live").textContent = `Saved ${agent.name}.`;
        save();
        render();
        return;
      }
      const agent = { id: uid("agt"), ...draft };
      state.agents.push(agent);
      selectedId = null;
      fillForm(null);
      $("#live").textContent = `Added ${agent.name}.`;
      save();
      render();
    }

    function deleteAgent() {
      const agent = state.agents.find((item) => item.id === editingId);
      if (!agent) return;
      if (!window.confirm(`Remove ${agent.name} from the team?`)) return;
      state.agents = state.agents.filter((item) => item.id !== agent.id);
      state.handoffs = state.handoffs.filter((handoff) => handoff.from !== agent.id && handoff.to !== agent.id);
      if (selectedId === agent.id) selectedId = null;
      if (drawSource === agent.id) drawSource = null;
      fillForm(null);
      $("#live").textContent = `Removed ${agent.name}.`;
      save();
      render();
    }

    function resetTeam() {
      if (!window.confirm("Restore the example team? This replaces the chart saved in this browser.")) return;
      state = exampleTeam();
      editingId = null;
      selectedId = null;
      drawMode = false;
      drawSource = null;
      $("#owner-name").value = state.owner;
      fillForm(null);
      syncDraw();
      save();
      render();
      $("#live").textContent = "Example team restored.";
    }

    function onNodeClick(id) {
      if (drawMode) {
        pickHandoff(id);
        return;
      }
      if (id === "owner") {
        $("#owner-name").focus();
        selectedId = null;
        fillForm(null);
        renderChart();
        return;
      }
      const agent = state.agents.find((item) => item.id === id);
      if (!agent) return;
      selectedId = id;
      fillForm(agent);
      renderChart();
    }

    function pickHandoff(id) {
      if (!drawSource) {
        drawSource = id;
        syncDraw();
        renderChart();
        return;
      }
      if (drawSource === id) {
        drawSource = null;
        syncDraw();
        renderChart();
        return;
      }
      const exists = state.handoffs.some((handoff) => handoff.from === drawSource && handoff.to === id);
      if (exists) {
        $("#draw-hint").textContent = "That handoff is already on the chart.";
        $("#live").textContent = "That handoff already exists.";
        return;
      }
      const from = drawSource;
      state.handoffs.push({ id: uid("h"), from, to: id });
      drawSource = null;
      drawMode = false;
      syncDraw();
      save();
      render();
      $("#live").textContent = `${labelOf(from)} hands off to ${labelOf(id)}.`;
    }

    function removeHandoff(id) {
      const handoff = state.handoffs.find((item) => item.id === id);
      if (!handoff) return;
      state.handoffs = state.handoffs.filter((item) => item.id !== id);
      save();
      render();
      $("#live").textContent = `Removed the handoff from ${labelOf(handoff.from)} to ${labelOf(handoff.to)}.`;
    }

    function render() {
      renderWarnings();
      renderHandoffs();
      renderChart();
      const title = $("#chart-title");
      title.textContent = state.owner.trim() ? `${state.owner.trim()}'s team` : "Your team";
      $("#chart-summary").textContent = summaryText();
      $("#draw-handoff").disabled = state.agents.length === 0 && !drawMode;
    }

    function summaryText() {
      const bits = [`${ownerLabel()} is the human owner.`];
      for (const agent of state.agents) {
        const tools = toolLabels(agent);
        const ask = approvalLabels(agent);
        bits.push(`${agent.name}. ${agent.job || "No job yet"}. ${tools.length ? `Tools: ${tools.join(", ")}.` : "No tools."} ${ask.length ? `Asks you before ${ask.join(", ")}.` : "No approval step."}`);
      }
      for (const handoff of state.handoffs) bits.push(`${labelOf(handoff.from)} hands work to ${labelOf(handoff.to)}.`);
      return bits.join(" ");
    }

    function renderWarnings() {
      const items = warnings(state);
      const key = `${state.agents.length}:${items.map((item) => item.text).join("|")}`;
      if (key === warningKey) return;
      warningKey = key;
      const section = $("#warnings");
      section.classList.toggle("alert", items.length > 0);
      section.replaceChildren();
      const heading = document.createElement("h2");
      heading.id = "warnings-heading";
      heading.textContent = items.length ? "Warnings" : "Checks";
      section.append(heading);
      if (!items.length) {
        const copy = document.createElement("p");
        copy.className = "clear-copy";
        copy.textContent = state.agents.length
          ? "Clear. Unique jobs, approval on risky tools, and a handoff for every agent."
          : "Add an agent to start the chart.";
        section.append(copy);
        return;
      }
      const list = document.createElement("ul");
      for (const item of items) {
        const li = document.createElement("li");
        li.dataset.kind = item.kind;
        li.textContent = item.text;
        list.append(li);
      }
      section.append(list);
    }

    function renderHandoffs() {
      const list = $("#handoff-list");
      list.replaceChildren();
      if (!state.handoffs.length) {
        const li = document.createElement("li");
        const note = document.createElement("span");
        note.className = "empty-note";
        note.textContent = "No handoffs yet. Draw one on the chart.";
        li.append(note);
        list.append(li);
        return;
      }
      for (const handoff of state.handoffs) {
        const li = document.createElement("li");
        const name = document.createElement("span");
        name.className = "handoff-name";
        name.textContent = `${labelOf(handoff.from)} → ${labelOf(handoff.to)}`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "remove";
        remove.textContent = "Remove";
        remove.setAttribute("aria-label", `Remove handoff from ${labelOf(handoff.from)} to ${labelOf(handoff.to)}`);
        remove.addEventListener("click", () => removeHandoff(handoff.id));
        li.append(name, remove);
        list.append(li);
      }
    }

    function nodeButton(options) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `node${options.owner ? " owner" : ""}`;
      if (options.id === selectedId) button.classList.add("selected");
      if (options.id === drawSource) button.classList.add("source");
      button.dataset.node = options.id;
      button.setAttribute("aria-label", options.aria);
      button.addEventListener("click", () => onNodeClick(options.id));

      const kicker = document.createElement("span");
      kicker.className = "kicker";
      kicker.textContent = options.kicker;
      const name = document.createElement("span");
      name.className = "node-name";
      name.textContent = options.name;
      const job = document.createElement("span");
      job.className = "node-job";
      job.textContent = options.job;
      if (options.missingJob) job.classList.add("missing");
      button.append(kicker, name, job);

      if (options.tools.length || options.ask) {
        const row = document.createElement("span");
        row.className = "node-chips";
        for (const tool of options.tools.slice(0, 4)) {
          const chip = document.createElement("span");
          chip.textContent = tool;
          row.append(chip);
        }
        if (options.tools.length > 4) {
          const more = document.createElement("span");
          more.textContent = `+${options.tools.length - 4}`;
          row.append(more);
        }
        if (options.ask) {
          const ask = document.createElement("span");
          ask.className = "node-ask";
          ask.textContent = options.ask;
          row.append(ask);
        }
        button.append(row);
      }
      return button;
    }

    function renderChart() {
      lastRows = layoutLevels(state.agents, state.handoffs);
      const levels = $("#levels");
      levels.replaceChildren();
      const ownerRow = document.createElement("div");
      ownerRow.className = "level";
      ownerRow.append(nodeButton({
        id: "owner",
        owner: true,
        kicker: "Human owner",
        name: ownerLabel(),
        job: "You sign off on the marked steps",
        tools: [],
        ask: "",
        aria: `${ownerLabel()}. Human owner. You sign off on the marked steps.`,
      }));
      levels.append(ownerRow);
      for (const row of lastRows) {
        const level = document.createElement("div");
        level.className = "level";
        for (const agent of row) {
          const tools = toolLabels(agent);
          const ask = approvalLabels(agent);
          level.append(nodeButton({
            id: agent.id,
            kicker: "Agent",
            name: agent.name,
            job: agent.job || "No job yet",
            missingJob: !agent.job.trim(),
            tools,
            ask: ask.length ? `Asks you · ${ask.join(", ")}` : "",
            aria: `${agent.name}. ${agent.job || "No job yet"}. ${tools.length ? `Tools ${tools.join(", ")}.` : "No tools."} ${ask.length ? `Asks you before ${ask.join(", ")}.` : "No approval step."}`,
          }));
        }
        levels.append(level);
      }
      syncDraw();
      scheduleEdges();
    }

    function scheduleEdges() {
      cancelAnimationFrame(edgeFrame);
      edgeFrame = requestAnimationFrame(() => {
        edgeFrame = requestAnimationFrame(drawEdges);
      });
    }

    function relBox(el, root) {
      const a = el.getBoundingClientRect();
      const b = root.getBoundingClientRect();
      return {
        x: a.left - b.left,
        y: a.top - b.top,
        w: a.width,
        h: a.height,
        cx: a.left - b.left + a.width / 2,
        top: a.top - b.top,
        bottom: a.bottom - b.top,
      };
    }

    function connector(from, to) {
      const sameRow = Math.abs(from.top - to.top) < 24;
      const round = (value) => Math.round(value * 10) / 10;
      if (sameRow) {
        const x1 = from.cx;
        const y1 = from.bottom;
        const x2 = to.cx;
        const y2 = to.bottom + 11;
        const dip = y2 + 18;
        return {
          d: `M ${round(x1)} ${round(y1)} C ${round(x1)} ${round(dip)}, ${round(x2)} ${round(dip)}, ${round(x2)} ${round(y2)}`,
          x2, y2, upward: true,
        };
      }
      const downward = to.top >= from.bottom - 4;
      const x1 = from.cx;
      const y1 = downward ? from.bottom : from.top;
      const x2 = to.cx;
      const y2 = downward ? to.top - 9 : to.bottom + 9;
      if (Math.abs(x1 - x2) < 1.5) {
        return { d: `M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}`, x2, y2, upward: !downward };
      }
      const mid = (y1 + y2) / 2;
      return {
        d: `M ${round(x1)} ${round(y1)} C ${round(x1)} ${round(mid)}, ${round(x2)} ${round(mid)}, ${round(x2)} ${round(y2)}`,
        x2, y2, upward: !downward,
      };
    }

    function edgeSpecs() {
      const specs = [];
      const linkedOwner = new Set();
      for (const handoff of state.handoffs) {
        if (handoff.from === "owner") linkedOwner.add(handoff.to);
        if (handoff.to === "owner") linkedOwner.add(handoff.from);
        specs.push({ from: handoff.from, to: handoff.to, kind: "handoff" });
      }
      for (const agent of lastRows[0] || []) {
        if (!linkedOwner.has(agent.id)) specs.push({ from: "owner", to: agent.id, kind: "report" });
      }
      return specs;
    }

    function drawEdges() {
      const chart = $("#chart");
      const svg = $("#edges");
      if (!chart || !svg) return;
      const width = Math.max(chart.clientWidth, chart.scrollWidth);
      const height = Math.max(chart.clientHeight, chart.scrollHeight);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", String(width));
      svg.setAttribute("height", String(height));
      svg.replaceChildren();
      const defs = document.createElementNS(SVG_NS, "defs");
      const marker = document.createElementNS(SVG_NS, "marker");
      marker.setAttribute("id", "handoff-arrow");
      marker.setAttribute("viewBox", "0 0 10 10");
      marker.setAttribute("refX", "8");
      marker.setAttribute("refY", "5");
      marker.setAttribute("markerWidth", "7");
      marker.setAttribute("markerHeight", "7");
      marker.setAttribute("orient", "auto");
      const head = document.createElementNS(SVG_NS, "path");
      head.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      head.setAttribute("fill", "#e4b56a");
      marker.append(head);
      defs.append(marker);
      svg.append(defs);

      const boxes = new Map();
      chart.querySelectorAll(".node").forEach((node) => boxes.set(node.dataset.node, relBox(node, chart)));
      for (const spec of edgeSpecs()) {
        const from = boxes.get(spec.from);
        const to = boxes.get(spec.to);
        if (!from || !to || from.w < 2 || to.w < 2) continue;
        const path = document.createElementNS(SVG_NS, "path");
        const line = connector(from, to);
        path.setAttribute("d", line.d);
        path.setAttribute("fill", "none");
        if (spec.kind === "handoff") {
          path.setAttribute("stroke", "#e4b56a");
          path.setAttribute("stroke-width", "1.75");
          path.setAttribute("marker-end", "url(#handoff-arrow)");
        } else {
          path.setAttribute("stroke", "rgba(246, 241, 231, 0.42)");
          path.setAttribute("stroke-width", "1.25");
        }
        svg.append(path);
      }
    }

    function exportPng() {
      drawEdges();
      const chart = $("#chart");
      const boxes = [...chart.querySelectorAll(".node")].map((node) => ({
        id: node.dataset.node,
        box: relBox(node, chart),
      }));
      if (!boxes.length || boxes.some((item) => item.box.w < 2)) {
        $("#live").textContent = "Could not export the chart.";
        return;
      }
      const header = 78;
      const footer = 36;
      const pad = 36;
      const width = Math.max(chart.scrollWidth, chart.clientWidth) + pad * 2;
      const height = Math.max(chart.scrollHeight, chart.clientHeight) + header + footer + pad;
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        $("#live").textContent = "Could not export the chart.";
        return;
      }
      ctx.scale(scale, scale);
      const serif = getComputedStyle($("h1")).fontFamily || "Georgia, serif";
      const sans = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
      ctx.fillStyle = "#0e0d0b";
      ctx.fillRect(0, 0, width, height);
      const glow = ctx.createRadialGradient(width * 0.2, 0, 20, width * 0.2, 0, width * 0.7);
      glow.addColorStop(0, "rgba(228, 181, 106, 0.16)");
      glow.addColorStop(1, "rgba(228, 181, 106, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = "#e4b56a";
      ctx.font = `600 12px ${sans}`;
      ctx.fillText("AI AGENT TEAM", pad, 34);
      ctx.fillStyle = "#f6f1e7";
      ctx.font = `500 32px ${serif}`;
      ctx.fillText(state.owner.trim() ? `${state.owner.trim()}'s team` : "Your team", pad, 68);

      const originX = pad;
      const originY = header;
      ctx.save();
      ctx.translate(originX, originY);
      const boxById = new Map(boxes.map((item) => [item.id, item.box]));
      for (const spec of edgeSpecs()) {
        const from = boxById.get(spec.from);
        const to = boxById.get(spec.to);
        if (!from || !to) continue;
        const line = connector(from, to);
        const path = new Path2D(line.d);
        ctx.beginPath();
        ctx.strokeStyle = spec.kind === "handoff" ? "#e4b56a" : "rgba(246, 241, 231, 0.42)";
        ctx.lineWidth = spec.kind === "handoff" ? 1.75 : 1.25;
        ctx.stroke(path);
        if (spec.kind === "handoff") {
          ctx.save();
          ctx.translate(line.x2, line.y2);
          ctx.rotate(line.upward ? -Math.PI / 2 : Math.PI / 2);
          ctx.fillStyle = "#e4b56a";
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(-4, 5);
          ctx.lineTo(-4, -5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
      for (const item of boxes) paintNode(ctx, item, serif, sans);
      ctx.restore();

      ctx.fillStyle = "#b7ab9a";
      ctx.font = `13px ${sans}`;
      ctx.fillText("BuiltByAmos", pad, height - 16);

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "agent-team.png";
      document.body.append(link);
      link.click();
      link.remove();
      $("#live").textContent = "Saved agent-team.png.";
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function wrapLines(ctx, text, maxWidth, limit) {
      const words = String(text || "").split(/\s+/).filter(Boolean);
      const lines = [];
      let line = "";
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else line = next;
        if (lines.length === limit) break;
      }
      if (lines.length < limit && line) lines.push(line);
      if (words.join(" ") !== lines.join(" ") && lines.length) {
        const last = lines[lines.length - 1];
        lines[lines.length - 1] = last.length > 1 ? `${last.slice(0, Math.max(1, last.length - 1))}…` : last;
      }
      return lines;
    }

    function paintNode(ctx, item, serif, sans) {
      const { box } = item;
      const owner = item.id === "owner";
      const agent = state.agents.find((entry) => entry.id === item.id);
      roundRect(ctx, box.x, box.y, box.w, box.h, 18);
      ctx.fillStyle = owner ? "rgba(228, 181, 106, 0.16)" : "#161411";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = owner ? "rgba(228, 181, 106, 0.7)" : "rgba(246, 241, 231, 0.16)";
      ctx.stroke();
      const name = owner ? ownerLabel() : agent.name;
      const job = owner ? "You sign off on the marked steps" : (agent.job || "No job yet");
      ctx.fillStyle = "#e4b56a";
      ctx.font = `600 10px ${sans}`;
      ctx.fillText(owner ? "HUMAN OWNER" : "AGENT", box.x + 14, box.y + 20);
      ctx.fillStyle = "#f6f1e7";
      ctx.font = `500 18px ${serif}`;
      const nameLines = wrapLines(ctx, name, box.w - 28, 2);
      nameLines.forEach((line, index) => ctx.fillText(line, box.x + 14, box.y + 42 + index * 20));
      ctx.fillStyle = agent && !agent.job.trim() ? "#e3a3ad" : "#b7ab9a";
      ctx.font = `13px ${sans}`;
      const jobY = box.y + 42 + nameLines.length * 20 + 2;
      const jobLines = wrapLines(ctx, job, box.w - 28, 2);
      jobLines.forEach((line, index) => ctx.fillText(line, box.x + 14, jobY + index * 16));
      if (!owner && agent) {
        const chips = toolLabels(agent).slice(0, 3);
        const ask = approvalLabels(agent);
        if (ask.length) chips.push(`Asks you · ${ask.join(", ")}`);
        let chipX = box.x + 14;
        const chipY = Math.min(box.y + box.h - 26, jobY + jobLines.length * 16 + 6);
        ctx.font = `11px ${sans}`;
        for (const chip of chips) {
          const text = chip.length > 28 ? `${chip.slice(0, 27)}…` : chip;
          const chipW = Math.min(ctx.measureText(text).width + 14, box.w - 28);
          if (chipX + chipW > box.x + box.w - 10) break;
          roundRect(ctx, chipX, chipY, chipW, 18, 9);
          ctx.fillStyle = text.startsWith("Asks you") ? "rgba(228, 181, 106, 0.12)" : "transparent";
          ctx.fill();
          ctx.strokeStyle = text.startsWith("Asks you") ? "rgba(228, 181, 106, 0.4)" : "rgba(246, 241, 231, 0.18)";
          ctx.stroke();
          ctx.fillStyle = text.startsWith("Asks you") ? "#f3ddb0" : "#f6f1e7";
          ctx.fillText(text, chipX + 7, chipY + 13);
          chipX += chipW + 4;
        }
      }
    }

    return { save, load };
  }

  return {
    PRESET_TOOLS,
    APPROVALS,
    exampleTeam,
    sanitize,
    warnings,
    layoutLevels,
    risksForCustom,
    mount,
  };
})();

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => AgentTeam.mount());
  else AgentTeam.mount();
}
