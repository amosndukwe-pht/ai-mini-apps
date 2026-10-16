/* Keto Planner — Mifflin–St Jeor, keto split, and a one-day meal plan. */
globalThis.KetoPlanner = (() => {
  const STORAGE_KEY = "builtbyamos.ketoPlanner.v1";
  const LB_PER_KG = 2.2046226218;
  const CARB_PCT = 0.05;

  const ACTIVITIES = [
    { id: "sedentary", label: "Sedentary", detail: "Desk job, little exercise", factor: 1.2 },
    { id: "light", label: "Lightly active", detail: "Exercise 1–3 days a week", factor: 1.375 },
    { id: "moderate", label: "Moderately active", detail: "Exercise 3–5 days a week", factor: 1.55 },
    { id: "active", label: "Very active", detail: "Hard exercise 6–7 days a week", factor: 1.725 },
    { id: "athlete", label: "Extra active", detail: "Physical job or two-a-days", factor: 1.9 },
  ];

  const GOALS = [
    { id: "lose", label: "Lose", detail: "−20% deficit", factor: 0.8, protein: 0.25 },
    { id: "maintain", label: "Maintain", detail: "Maintenance", factor: 1, protein: 0.22 },
    { id: "gain", label: "Gain", detail: "+10% surplus", factor: 1.1, protein: 0.2 },
  ];

  const SLOTS = [
    { id: "breakfast", label: "Breakfast", share: 0.25 },
    { id: "lunch", label: "Lunch", share: 0.3 },
    { id: "dinner", label: "Dinner", share: 0.35 },
    { id: "snack", label: "Snack", share: 0.1 },
  ];

  const egg = (qty, min = 1, max = 8) => ({
    one: "egg", many: "eggs", qty, step: 1, min, max,
    cal: 72, p: 6.3, f: 4.8, c: 0.4, role: "protein",
  });
  const oil = (qty = 1) => ({
    name: "olive oil", measure: "tbsp", qty, step: 0.25, min: 0, max: 5,
    cal: 119, p: 0, f: 13.5, c: 0, role: "filler",
  });
  const butter = (qty = 1) => ({
    name: "butter", measure: "tbsp", qty, step: 0.25, min: 0, max: 5,
    cal: 102, p: 0.1, f: 11.5, c: 0, role: "filler",
  });
  const avocado = (qty = 0.5, min = 0) => ({
    one: "avocado", many: "avocados", qty, step: 0.5, min, max: 2,
    cal: 240, p: 3, f: 22, c: 3, role: "fat",
  });
  const tomatoes = (qty = 0.5) => ({
    name: "cherry tomatoes", measure: "cup", qty, step: 0.25, min: 0, max: 1.5,
    cal: 27, p: 1.3, f: 0.3, c: 4, role: "produce",
  });
  const spinach = (qty = 1) => ({
    name: "spinach", measure: "cup", qty, step: 0.5, min: 0, max: 3,
    cal: 7, p: 0.9, f: 0.1, c: 0.4, role: "produce",
  });

  const TEMPLATES = {
    breakfast: [
      {
        name: "Herb eggs & avocado",
        items: [egg(3, 2, 6), spinach(1), tomatoes(0.5), avocado(0.5, 0.5), butter(1)],
      },
      {
        name: "Smoked salmon plate",
        items: [
          { name: "smoked salmon", measure: "oz", qty: 4, step: 0.5, min: 2, max: 8, cal: 33, p: 5.2, f: 1.2, c: 0, role: "protein" },
          { name: "cream cheese", measure: "tbsp", qty: 2, step: 0.5, min: 0, max: 4, cal: 51, p: 0.9, f: 5, c: 0.4, role: "fat" },
          { name: "cucumber", measure: "cup", qty: 0.75, step: 0.25, min: 0, max: 2, cal: 16, p: 0.7, f: 0.1, c: 2.5, role: "produce" },
          avocado(0.5, 0),
          oil(1),
        ],
      },
      {
        name: "Cheddar bacon omelette",
        items: [
          egg(3, 2, 6),
          { one: "bacon slice", many: "bacon slices", qty: 2, step: 1, min: 1, max: 5, cal: 43, p: 3, f: 3.3, c: 0.1, role: "fat" },
          { name: "cheddar", measure: "oz", qty: 1, step: 0.5, min: 0.5, max: 3, cal: 114, p: 7, f: 9.4, c: 0.4, role: "fat" },
          { name: "mushrooms", measure: "cup", qty: 1, step: 0.5, min: 0, max: 2, cal: 15, p: 2.2, f: 0.2, c: 1.6, role: "produce" },
          tomatoes(0.5),
          butter(1),
        ],
      },
      {
        name: "Sausage skillet",
        items: [
          egg(2, 1, 5),
          { one: "turkey sausage", many: "turkey sausages", qty: 2, step: 1, min: 1, max: 4, cal: 80, p: 8, f: 5, c: 1, role: "protein" },
          spinach(1.5),
          tomatoes(0.5),
          oil(1),
        ],
      },
    ],
    lunch: [
      {
        name: "Chicken caesar, no croutons",
        items: [
          { name: "chicken breast", measure: "oz", qty: 5, step: 0.5, min: 3, max: 12, cal: 47, p: 8.8, f: 1, c: 0, role: "protein" },
          { name: "romaine", measure: "cup", qty: 2, step: 0.5, min: 1, max: 4, cal: 8, p: 0.6, f: 0.1, c: 0.7, role: "produce" },
          tomatoes(0.5),
          { name: "parmesan", measure: "oz", qty: 0.5, step: 0.25, min: 0, max: 1.5, cal: 111, p: 10, f: 7, c: 1, role: "fat" },
          avocado(0.5, 0),
          oil(1.5),
        ],
      },
      {
        name: "Salmon & asparagus",
        items: [
          { name: "salmon", measure: "oz", qty: 5, step: 0.5, min: 3, max: 12, cal: 58, p: 6.2, f: 3.4, c: 0, role: "protein" },
          { one: "asparagus spear", many: "asparagus spears", qty: 8, step: 2, min: 4, max: 16, cal: 3, p: 0.4, f: 0, c: 0.5, role: "produce" },
          tomatoes(0.25),
          butter(1),
        ],
      },
      {
        name: "Steak salad with blue cheese",
        items: [
          { name: "ribeye", measure: "oz", qty: 5, step: 0.5, min: 3, max: 12, cal: 82, p: 6.8, f: 6, c: 0, role: "protein" },
          { name: "romaine", measure: "cup", qty: 2, step: 0.5, min: 1, max: 4, cal: 8, p: 0.6, f: 0.1, c: 0.7, role: "produce" },
          tomatoes(0.5),
          { name: "blue cheese", measure: "oz", qty: 1, step: 0.5, min: 0, max: 2, cal: 100, p: 6, f: 8.1, c: 0.7, role: "fat" },
          oil(1),
        ],
      },
      {
        name: "Tuna lettuce wraps",
        items: [
          { name: "tuna", measure: "oz", qty: 5, step: 0.5, min: 3, max: 12, cal: 56, p: 8, f: 2.3, c: 0, role: "protein" },
          { name: "butter lettuce", measure: "cup", qty: 2, step: 0.5, min: 1, max: 4, cal: 7, p: 0.5, f: 0.1, c: 0.6, role: "produce" },
          { one: "celery stalk", many: "celery stalks", qty: 1, step: 1, min: 0, max: 3, cal: 6, p: 0.3, f: 0, c: 0.6, role: "produce" },
          tomatoes(0.5),
          avocado(0.5, 0),
          { name: "mayonnaise", measure: "tbsp", qty: 1.5, step: 0.25, min: 0, max: 4, cal: 94, p: 0.1, f: 10.3, c: 0.1, role: "filler" },
        ],
      },
    ],
    dinner: [
      {
        name: "Ribeye & garlicky broccoli",
        items: [
          { name: "ribeye", measure: "oz", qty: 6, step: 0.5, min: 3, max: 12, cal: 82, p: 6.8, f: 6, c: 0, role: "protein" },
          { name: "broccoli", measure: "cup", qty: 1, step: 0.25, min: 0.5, max: 2, cal: 55, p: 3.7, f: 0.6, c: 6, role: "produce" },
          butter(1.5),
        ],
      },
      {
        name: "Salmon, zucchini & feta",
        items: [
          { name: "salmon", measure: "oz", qty: 6, step: 0.5, min: 3, max: 12, cal: 58, p: 6.2, f: 3.4, c: 0, role: "protein" },
          { name: "zucchini", measure: "cup", qty: 1.5, step: 0.5, min: 0.5, max: 3, cal: 20, p: 1.4, f: 0.4, c: 2.4, role: "produce" },
          { name: "feta", measure: "oz", qty: 1, step: 0.5, min: 0, max: 2, cal: 75, p: 4, f: 6, c: 1.2, role: "fat" },
          oil(1),
        ],
      },
      {
        name: "Chicken thighs & cauliflower mash",
        items: [
          { name: "chicken thigh", measure: "oz", qty: 6, step: 0.5, min: 3, max: 12, cal: 65, p: 6.5, f: 4.5, c: 0, role: "protein" },
          { name: "cauliflower", measure: "cup", qty: 1.5, step: 0.5, min: 0.5, max: 3, cal: 29, p: 2.2, f: 0.5, c: 2.2, role: "produce" },
          { name: "heavy cream", measure: "tbsp", qty: 2, step: 0.5, min: 0, max: 4, cal: 51, p: 0.4, f: 5.4, c: 0.4, role: "fat" },
          butter(1),
        ],
      },
      {
        name: "Shrimp zucchini noodles",
        items: [
          { name: "shrimp", measure: "oz", qty: 7, step: 0.5, min: 4, max: 16, cal: 28, p: 6.8, f: 0.1, c: 0, role: "protein" },
          { name: "zucchini", measure: "cup", qty: 2, step: 0.5, min: 0.5, max: 3, cal: 20, p: 1.4, f: 0.4, c: 2.4, role: "produce" },
          { name: "pesto", measure: "tbsp", qty: 1.5, step: 0.5, min: 0.5, max: 4, cal: 80, p: 1, f: 8, c: 1, role: "fat" },
          avocado(0.5, 0),
          oil(1),
        ],
      },
    ],
    snack: [
      {
        name: "Macadamias & cheddar",
        items: [
          { name: "cheddar", measure: "oz", qty: 1, step: 0.5, min: 0.5, max: 3, cal: 114, p: 7, f: 9.4, c: 0.4, role: "protein" },
          { name: "macadamia nuts", measure: "oz", qty: 0.75, step: 0.25, min: 0.25, max: 2, cal: 204, p: 2.2, f: 21.5, c: 1.5, role: "filler" },
          { name: "olives", measure: "oz", qty: 0.5, step: 0.5, min: 0, max: 2, cal: 41, p: 0.3, f: 4.3, c: 1, role: "produce" },
        ],
      },
      {
        name: "Olives & string cheese",
        items: [
          { one: "string cheese", many: "string cheeses", qty: 1, step: 1, min: 1, max: 3, cal: 80, p: 7, f: 6, c: 0.5, role: "protein" },
          { name: "olives", measure: "oz", qty: 1, step: 0.5, min: 0, max: 2, cal: 41, p: 0.3, f: 4.3, c: 1, role: "produce" },
          { name: "almond butter", measure: "tbsp", qty: 0.75, step: 0.25, min: 0, max: 2, cal: 98, p: 3.4, f: 9, c: 1.5, role: "filler" },
        ],
      },
      {
        name: "Celery & almond butter",
        items: [
          { name: "cheddar", measure: "oz", qty: 1, step: 0.5, min: 0, max: 2, cal: 114, p: 7, f: 9.4, c: 0.4, role: "protein" },
          { one: "celery stalk", many: "celery stalks", qty: 2, step: 1, min: 1, max: 4, cal: 6, p: 0.3, f: 0, c: 0.6, role: "produce" },
          { name: "almond butter", measure: "tbsp", qty: 1, step: 0.25, min: 0.5, max: 2.5, cal: 98, p: 3.4, f: 9, c: 1.5, role: "filler" },
        ],
      },
      {
        name: "Cheese, walnuts & dark chocolate",
        items: [
          { name: "cheddar", measure: "oz", qty: 1, step: 0.5, min: 0.5, max: 2, cal: 114, p: 7, f: 9.4, c: 0.4, role: "protein" },
          { name: "walnuts", measure: "oz", qty: 0.5, step: 0.25, min: 0.25, max: 1.5, cal: 185, p: 4.3, f: 18.5, c: 2, role: "filler" },
          { one: "square dark chocolate", many: "squares dark chocolate", qty: 1, step: 1, min: 0, max: 3, cal: 60, p: 1.2, f: 5.3, c: 2.2, role: "produce" },
        ],
      },
    ],
  };

  function roundStep(value, step) {
    const decimals = step < 1 ? 2 : 0;
    const snapped = Math.round((value + 1e-9) / step) * step;
    return Number(snapped.toFixed(decimals));
  }

  function clampQty(qty, item) {
    const bounded = Math.min(item.max, Math.max(item.min, qty));
    const snapped = roundStep(bounded, item.step);
    return Math.min(item.max, Math.max(item.min, snapped));
  }

  function sumItems(items) {
    return items.reduce(
      (sum, item) => ({
        cal: sum.cal + item.cal * item.qty,
        p: sum.p + item.p * item.qty,
        f: sum.f + item.f * item.qty,
        c: sum.c + item.c * item.qty,
      }),
      { cal: 0, p: 0, f: 0, c: 0 }
    );
  }

  function nudge(items, levers, dir, key, goalValue) {
    const before = sumItems(items)[key];
    const beforeErr = Math.abs(before - goalValue);
    let best = null;
    for (const item of levers) {
      const next = roundStep(item.qty + dir * item.step, item.step);
      if (next < item.min - 1e-9 || next > item.max + 1e-9) continue;
      const nutrient = key === "cal" ? item.cal : item[key];
      const after = before + (next - item.qty) * nutrient;
      const err = Math.abs(after - goalValue);
      if (err < beforeErr - 0.05 && (!best || err < best.err)) best = { item, next, err };
    }
    if (!best) return false;
    best.item.qty = best.next;
    return true;
  }

  function solveMeal(items, goal) {
    const proteins = items.filter((item) => item.role === "protein");
    const produces = items.filter((item) => item.role === "produce");
    const fillers = items.filter((item) => item.role === "filler");
    for (let n = 0; n < 28; n += 1) {
      let moved = false;
      const carbs = sumItems(items);
      if (Math.abs(carbs.c - goal.c) > 0.8) {
        moved = nudge(items, produces, goal.c > carbs.c ? 1 : -1, "c", goal.c) || moved;
      }
      const protein = sumItems(items);
      if (Math.abs(protein.p - goal.p) > 2) {
        moved = nudge(items, proteins, goal.p > protein.p ? 1 : -1, "p", goal.p) || moved;
      }
      const calories = sumItems(items);
      if (Math.abs(calories.cal - goal.cal) > 20) {
        moved = nudge(items, fillers, goal.cal > calories.cal ? 1 : -1, "cal", goal.cal) || moved;
      }
      if (!moved) break;
    }
    for (const item of items) item.anchor = item.qty;
  }

  function nearAnchor(item, dir, steps) {
    if (item.anchor == null) return true;
    const next = item.qty + dir * item.step;
    return Math.abs(next - item.anchor) <= item.step * steps + 1e-9;
  }

  function tuneDay(meals, goal) {
    const all = () => meals.flatMap((meal) => meal.items);
    const ofRole = (role) => all().filter((item) => item.role === role);

    for (let n = 0; n < 36; n += 1) {
      let moved = false;
      const carbs = sumItems(all());
      if (Math.abs(carbs.c - goal.c) > 1.5) {
        const dir = goal.c > carbs.c ? 1 : -1;
        const levers = ofRole("produce").filter((item) => nearAnchor(item, dir, 3));
        moved = nudge(all(), levers, dir, "c", goal.c) || moved;
      }
      const protein = sumItems(all());
      if (Math.abs(protein.p - goal.p) > 3) {
        const dir = goal.p > protein.p ? 1 : -1;
        const levers = ofRole("protein").filter((item) => nearAnchor(item, dir, 3));
        moved = nudge(all(), levers, dir, "p", goal.p) || moved;
      }
      const calories = sumItems(all());
      if (Math.abs(calories.cal - goal.cal) > 28) {
        const dir = goal.cal > calories.cal ? 1 : -1;
        moved = nudge(all(), ofRole("filler"), dir, "cal", goal.cal) || moved;
      }
      if (!moved) break;
    }

    for (let n = 0; n < 12; n += 1) {
      const totals = sumItems(all());
      const gap = totals.cal - goal.cal;
      if (Math.abs(gap) <= 45) break;
      const dir = gap > 0 ? -1 : 1;
      const fats = ofRole("fat").filter((item) => nearAnchor(item, dir, 4));
      if (nudge(all(), fats, dir, "cal", goal.cal)) continue;
      if (nudge(all(), ofRole("filler"), dir, "cal", goal.cal)) continue;
      break;
    }
  }

  function pickTemplate(list, avoidName, rng) {
    const pool = list.filter((template) => template.name !== avoidName);
    const source = pool.length ? pool : list;
    const index = Math.min(source.length - 1, Math.floor(rng() * source.length));
    return source[index];
  }

  function buildMeal(template, slot, goal) {
    const items = template.items.map((item) => ({ ...item }));
    const base = sumItems(items).cal || 1;
    const scale = goal.cal / base;
    for (const item of items) item.qty = clampQty(item.qty * scale, item);
    solveMeal(items, goal);
    return { slot: slot.id, label: slot.label, share: slot.share, name: template.name, items };
  }

  function generateDay(targets, options = {}) {
    const rng = options.rng || Math.random;
    const avoid = options.avoid || {};
    const meals = SLOTS.map((slot) => {
      const template = pickTemplate(TEMPLATES[slot.id], avoid[slot.id], rng);
      return buildMeal(template, slot, {
        cal: targets.calories * slot.share,
        p: targets.proteinG * slot.share,
        f: targets.fatG * slot.share,
        c: targets.carbG * slot.share,
      });
    });
    tuneDay(meals, {
      cal: targets.calories,
      p: targets.proteinG,
      f: targets.fatG,
      c: targets.carbG,
    });
    for (const meal of meals) {
      meal.items = meal.items.filter((item) => item.qty > 0.001);
      meal.totals = sumItems(meal.items);
    }
    const day = sumItems(meals.flatMap((meal) => meal.items));
    return { meals, day };
  }

  function calculate(input) {
    const activity = ACTIVITIES.find((item) => item.id === input.activity);
    const goal = GOALS.find((item) => item.id === input.goal);
    const bmr = 10 * input.kg + 6.25 * input.cm - 5 * input.age + (input.sex === "male" ? 5 : -161);
    const tdee = bmr * activity.factor;
    const calories = tdee * goal.factor;
    const proteinPct = goal.protein;
    const fatPct = 1 - CARB_PCT - proteinPct;
    return {
      bmr,
      tdee,
      calories,
      proteinPct,
      carbPct: CARB_PCT,
      fatPct,
      proteinG: (calories * proteinPct) / 4,
      carbG: (calories * CARB_PCT) / 4,
      fatG: (calories * fatPct) / 9,
      activity,
      goal,
    };
  }

  function formatQty(value) {
    const rounded = Math.round(value * 4) / 4;
    const whole = Math.floor(rounded + 1e-9);
    const frac = Math.round((rounded - whole) * 4);
    const glyphs = ["", "¼", "½", "¾"];
    if (whole <= 0) return glyphs[frac] || "0";
    if (!frac) return String(whole);
    return `${whole}${glyphs[frac]}`;
  }

  function itemLabel(item) {
    const qty = formatQty(item.qty);
    if (item.one) return `${qty} ${item.qty > 1 ? item.many : item.one}`;
    if (item.measure === "cup") return `${qty} ${item.qty > 1 ? "cups" : "cup"} ${item.name}`;
    return `${qty} ${item.measure} ${item.name}`;
  }

  function fmtCal(value) {
    return Math.round(value).toLocaleString("en-US");
  }

  function fmtG(value) {
    return String(Math.round(value));
  }

  function fmtPct(fraction) {
    const percent = Math.round(fraction * 1000) / 10;
    return `${Number.isInteger(percent) ? percent.toFixed(0) : percent}%`;
  }

  function trimNum(value) {
    if (!Number.isFinite(value)) return "";
    return String(Math.round(value * 10) / 10);
  }

  function mount() {
    const $ = (selector) => document.querySelector(selector);
    const activitySelect = $("#activity");
    for (const activity of ACTIVITIES) {
      const option = document.createElement("option");
      option.value = activity.id;
      option.textContent = activity.label;
      activitySelect.append(option);
    }

    let hydrating = false;
    let lastTargets = null;
    let lastNames = {};
    let calculated = false;

    const groups = {
      sex: document.querySelector("[aria-labelledby='sex-label']"),
      "height-unit": document.querySelector("[aria-label='Height unit']"),
      "weight-unit": document.querySelector("[aria-label='Weight unit']"),
      goal: document.querySelector("[aria-labelledby='goal-label']"),
    };

    function getPressed(group) {
      const button = document.querySelector(`[data-group="${group}"][aria-pressed="true"]`);
      return button ? button.dataset.value : "";
    }

    function setPressed(group, value) {
      document.querySelectorAll(`[data-group="${group}"]`).forEach((button) => {
        button.setAttribute("aria-pressed", button.dataset.value === value ? "true" : "false");
      });
    }

    function readForm() {
      return {
        sex: getPressed("sex"),
        age: $("#age").value.trim(),
        heightUnit: getPressed("height-unit") || "imperial",
        heightFt: $("#height-ft").value.trim(),
        heightIn: $("#height-in").value.trim(),
        heightCm: $("#height-cm").value.trim(),
        weightUnit: getPressed("weight-unit") || "lb",
        weight: $("#weight").value.trim(),
        activity: activitySelect.value,
        goal: getPressed("goal"),
      };
    }

    function heightToCm(form) {
      if (form.heightUnit === "metric") return Number(form.heightCm);
      const feet = Number(form.heightFt);
      const inches = form.heightIn === "" ? 0 : Number(form.heightIn);
      if (!Number.isFinite(feet) || !Number.isFinite(inches)) return NaN;
      return (feet * 12 + inches) * 2.54;
    }

    function weightToKg(form) {
      const weight = Number(form.weight);
      if (!Number.isFinite(weight)) return NaN;
      return form.weightUnit === "kg" ? weight : weight / LB_PER_KG;
    }

    function save() {
      if (hydrating) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(readForm()));
      } catch {
        /* private mode */
      }
    }

    function syncHeight() {
      const metric = getPressed("height-unit") === "metric";
      $("#height-imperial").hidden = metric;
      $("#height-metric").hidden = !metric;
    }

    function syncActivityDetail() {
      const activity = ACTIVITIES.find((item) => item.id === activitySelect.value);
      $("#activity-detail").textContent = activity
        ? `${activity.detail} · ×${activity.factor}`
        : "This sets the multiplier on your BMR.";
    }

    function showError(message, focusSelector) {
      $("#form-error").textContent = message || "";
      if (focusSelector) {
        const node = document.querySelector(focusSelector);
        if (node) node.focus();
      }
    }

    function validate(form) {
      if (form.sex !== "female" && form.sex !== "male") {
        return { error: "Select sex.", focus: "[data-group='sex']" };
      }
      const age = Number(form.age);
      if (!form.age || !Number.isFinite(age) || age < 16 || age > 90) {
        return { error: "Enter an age between 16 and 90.", focus: "#age" };
      }
      const cm = heightToCm(form);
      if (!Number.isFinite(cm) || cm < 120 || cm > 230) {
        return {
          error: "Enter a height between about 3′11″ and 7′6″.",
          focus: form.heightUnit === "metric" ? "#height-cm" : "#height-ft",
        };
      }
      const kg = weightToKg(form);
      if (!Number.isFinite(kg) || kg < 35 || kg > 250) {
        return { error: "Enter a weight between about 77 and 550 lb.", focus: "#weight" };
      }
      if (!ACTIVITIES.some((item) => item.id === form.activity)) {
        return { error: "Select an activity level.", focus: "#activity" };
      }
      if (!GOALS.some((item) => item.id === form.goal)) {
        return { error: "Select a goal.", focus: "[data-group='goal']" };
      }
      return { value: { sex: form.sex, age, cm, kg, activity: form.activity, goal: form.goal, form } };
    }

    function renderDonut(parts) {
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      const gap = 4;
      const keys = ["fat", "protein", "carb"];
      const usable = circumference - gap * keys.length;
      let offset = 0;
      for (const key of keys) {
        const length = Math.max(0, usable * parts[key]);
        const arc = document.querySelector(`[data-arc="${key}"]`);
        arc.style.strokeDasharray = `${length} ${circumference - length}`;
        arc.style.strokeDashoffset = String(-offset);
        offset += length + gap;
      }
    }

    function personLine(form) {
      const sex = form.sex === "male" ? "Male" : "Female";
      const height = form.heightUnit === "metric"
        ? `${trimNum(Number(form.heightCm))} cm`
        : `${form.heightFt} ft ${form.heightIn || "0"} in`;
      const weight = `${trimNum(Number(form.weight))} ${form.weightUnit}`;
      return `${sex}, ${form.age} years, ${height}, ${weight}`;
    }

    function paintResults(result, form) {
      $("#kcal").textContent = fmtCal(result.calories);
      $("#bmr").textContent = fmtCal(result.bmr);
      $("#tdee").textContent = fmtCal(result.tdee);
      $("#goal-chip").textContent = result.goal.detail;
      $("#person-line").textContent = personLine(form);
      $("#fat-g").innerHTML = `${fmtG(result.fatG)}<span>g</span>`;
      $("#protein-g").innerHTML = `${fmtG(result.proteinG)}<span>g</span>`;
      $("#carb-g").innerHTML = `${fmtG(result.carbG)}<span>g</span>`;
      $("#fat-pct").textContent = `${fmtPct(result.fatPct)} of calories`;
      $("#protein-pct").textContent = `${fmtPct(result.proteinPct)} of calories`;
      $("#carb-pct").textContent = `${fmtPct(result.carbPct)} of calories`;
      $("#donut-fat-pct").textContent = fmtPct(result.fatPct);
      $("#donut-title").textContent = `Macro split: ${fmtPct(result.fatPct)} fat, ${fmtPct(result.proteinPct)} protein, ${fmtPct(result.carbPct)} carbs`;
      $("#formula").textContent = `Mifflin–St Jeor BMR × ${result.activity.factor} activity. ${result.goal.detail}. Protein ${fmtPct(result.proteinPct)}, carbs ${fmtPct(result.carbPct)}, fat ${fmtPct(result.fatPct)}.`;

      const notes = [];
      if (result.calories < 1200) {
        notes.push("This target is under 1,200 kcal. A smaller deficit is often easier to sustain.");
      }
      if (result.carbG > 50) {
        notes.push("Five percent of these calories is over 50 g of carbs, above the range many keto plans use.");
      }
      const note = $("#extra-note");
      note.hidden = notes.length === 0;
      note.textContent = notes.join(" ");

      $("#results-empty").hidden = true;
      $("#results-data").hidden = false;
      renderDonut({ fat: 0, protein: 0, carb: 0 });
      requestAnimationFrame(() => {
        renderDonut({ fat: result.fatPct, protein: result.proteinPct, carb: result.carbPct });
      });
      $("#live").textContent = `Target ${fmtCal(result.calories)} calories. Fat ${fmtG(result.fatG)} grams, protein ${fmtG(result.proteinG)} grams, carbs ${fmtG(result.carbG)} grams.`;
    }

    function mealCard(meal) {
      const article = document.createElement("article");
      article.className = "meal";
      article.dataset.slot = meal.slot;

      const top = document.createElement("div");
      top.className = "meal-top";
      const kicker = document.createElement("span");
      kicker.className = "eyebrow";
      kicker.textContent = meal.label;
      const kcal = document.createElement("span");
      kcal.className = "meal-kcal";
      kcal.textContent = `${fmtCal(meal.totals.cal)} kcal`;
      top.append(kicker, kcal);

      const title = document.createElement("h3");
      title.textContent = meal.name;

      const list = document.createElement("ul");
      for (const item of meal.items) {
        const row = document.createElement("li");
        const name = document.createElement("span");
        name.textContent = itemLabel(item);
        const calories = document.createElement("span");
        calories.textContent = `${fmtCal(item.cal * item.qty)} kcal`;
        row.append(name, calories);
        list.append(row);
      }

      const macros = document.createElement("p");
      macros.className = "meal-macros";
      macros.innerHTML = `<span>P <b>${fmtG(meal.totals.p)}g</b></span><span>F <b>${fmtG(meal.totals.f)}g</b></span><span>C <b>${fmtG(meal.totals.c)}g</b></span>`;

      article.append(top, title, list, macros);
      return article;
    }

    function paintMeals(plan, targets) {
      const grid = $("#meal-grid");
      grid.replaceChildren(...plan.meals.map(mealCard));
      const rows = [
        ["", "Calories", "Fat", "Protein", "Carbs"],
        ["Target", fmtCal(targets.calories), `${fmtG(targets.fatG)}g`, `${fmtG(targets.proteinG)}g`, `${fmtG(targets.carbG)}g`],
        ["This plan", fmtCal(plan.day.cal), `${fmtG(plan.day.f)}g`, `${fmtG(plan.day.p)}g`, `${fmtG(plan.day.c)}g`],
      ];
      const compare = $("#compare");
      compare.replaceChildren();
      rows.forEach((cells, index) => {
        const row = document.createElement("div");
        row.className = index === 0 ? "compare-row head" : "compare-row";
        if (index === 2) row.id = "plan-row";
        for (const cell of cells) {
          const span = document.createElement("span");
          span.textContent = cell;
          row.append(span);
        }
        compare.append(row);
      });

      const dCal = Math.round(plan.day.cal - targets.calories);
      const dP = Math.round(plan.day.p - targets.proteinG);
      const dC = Math.round(plan.day.c - targets.carbG);
      const bits = [];
      bits.push(dCal === 0 ? "Calories match your target" : `${Math.abs(dCal)} kcal ${dCal > 0 ? "over" : "under"} your target`);
      bits.push(dP === 0 ? "protein matches" : `protein ${Math.abs(dP)} g ${dP > 0 ? "over" : "under"}`);
      bits.push(dC === 0 ? "carbs match" : `carbs ${Math.abs(dC)} g ${dC > 0 ? "over" : "under"}`);
      $("#fit-line").textContent = `${bits.join(" · ")}.`;
      $("#meals").hidden = false;
    }

    function runPlan(targets, avoid) {
      const plan = generateDay(targets, { avoid });
      lastNames = Object.fromEntries(plan.meals.map((meal) => [meal.slot, meal.name]));
      paintMeals(plan, targets);
    }

    function submit(event) {
      if (event) event.preventDefault();
      const form = readForm();
      save();
      const parsed = validate(form);
      if (parsed.error) {
        showError(parsed.error, parsed.focus);
        return;
      }
      showError("");
      const result = calculate(parsed.value);
      lastTargets = result;
      paintResults(result, form);
      runPlan(result, lastNames);
      calculated = true;
      $("#calculate").textContent = "Update plan";
    }

    document.querySelectorAll("[data-press-group], [role='radiogroup'], [role='group']").forEach((group) => {
      group.addEventListener("keydown", (event) => {
        if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) return;
        const buttons = [...group.querySelectorAll("button")];
        const index = buttons.indexOf(document.activeElement);
        if (index < 0) return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
        const next = buttons[(index + direction + buttons.length) % buttons.length];
        next.click();
        next.focus();
      });
    });

    document.querySelectorAll("[data-group]").forEach((button) => {
      button.addEventListener("click", () => {
        const group = button.dataset.group;
        const value = button.dataset.value;
        if (group === "height-unit") {
          const current = getPressed("height-unit");
          if (current === value) return;
          const cm = heightToCm(readForm());
          setPressed(group, value);
          if (Number.isFinite(cm) && cm > 0) {
            if (value === "metric") $("#height-cm").value = trimNum(cm);
            else {
              const totalInches = cm / 2.54;
              let feet = Math.floor(totalInches / 12);
              let inches = Math.round((totalInches - feet * 12) * 10) / 10;
              if (inches >= 12) {
                feet += 1;
                inches = 0;
              }
              $("#height-ft").value = String(feet);
              $("#height-in").value = trimNum(inches);
            }
          }
          syncHeight();
        } else if (group === "weight-unit") {
          const current = getPressed("weight-unit");
          if (current === value) return;
          const raw = Number($("#weight").value);
          setPressed(group, value);
          if (Number.isFinite(raw)) {
            const converted = current === "lb" ? raw / LB_PER_KG : raw * LB_PER_KG;
            $("#weight").value = trimNum(converted);
          }
        } else {
          setPressed(group, value);
        }
        save();
      });
    });

    $("#calculator").addEventListener("submit", submit);
    $("#regenerate").addEventListener("click", () => {
      if (!lastTargets) return;
      runPlan(lastTargets, lastNames);
    });
    activitySelect.addEventListener("change", () => {
      syncActivityDetail();
      save();
    });
    for (const id of ["#age", "#height-ft", "#height-in", "#height-cm", "#weight"]) {
      $(id).addEventListener("input", save);
    }

    hydrating = true;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") {
        if (saved.sex) setPressed("sex", saved.sex);
        if (saved.goal) setPressed("goal", saved.goal);
        if (saved.heightUnit) setPressed("height-unit", saved.heightUnit);
        if (saved.weightUnit) setPressed("weight-unit", saved.weightUnit);
        for (const [id, key] of [["#age", "age"], ["#height-ft", "heightFt"], ["#height-in", "heightIn"], ["#height-cm", "heightCm"], ["#weight", "weight"]]) {
          if (saved[key] != null) $(id).value = saved[key];
        }
        if (saved.activity) activitySelect.value = saved.activity;
        syncHeight();
        syncActivityDetail();
      }
    } catch {
      /* ignore broken storage */
    }
    hydrating = false;

    const restored = validate(readForm());
    if (!restored.error) submit();
  }

  return {
    ACTIVITIES,
    GOALS,
    calculate,
    generateDay,
    formatQty,
    itemLabel,
    sumItems,
    mount,
  };
})();

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => KetoPlanner.mount());
  else KetoPlanner.mount();
}
