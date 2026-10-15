/* ==========================================================
   Scope of Work (scope.html, and the Scope of Work section of proposal.html)
   1 Lists from SOW_Task_List_2.xlsx   2 Walkthrough link   3 State   4 Drawing   5 Events   6 Startup
   Needs script.js loaded first: it provides data, persist, esc, value, num and rowIndexes.
   The scope is saved inside the walkthrough as data.sow, so Save / Open / New all include it.
   ========================================================== */
(() => {
  /* 1. LISTS. Edit here to add a task, rename a room, or change which industries get which rooms.
        These come from the Task List and Rooms by Industry sheets of SOW_Task_List_2.xlsx.
        "words" are the words that connect a walkthrough area name to a room type (see section 2). */
  const INDUSTRIES = [
    "Office",
    "Health",
    "Education",
    "Industrial & Manufacturing",
    "All",
  ];

  const ROOM_TYPES = [
    {
      name: "Entrance",
      industries: [
        "Office",
        "Health",
        "Education",
        "Industrial & Manufacturing",
        "All",
      ],
      words: ["entrance", "entry", "vestibule"],
    },
    {
      name: "Lobby/Reception",
      industries: [
        "Office",
        "Health",
        "Education",
        "Industrial & Manufacturing",
        "All",
      ],
      words: ["lobby", "reception", "waiting"],
    },
    {
      name: "Corridor/Hallway",
      industries: [
        "Office",
        "Health",
        "Education",
        "Industrial & Manufacturing",
        "All",
      ],
      words: ["corridor", "hallway", "hall"],
    },
    {
      name: "Restroom/Locker Room",
      industries: [
        "Office",
        "Health",
        "Education",
        "Industrial & Manufacturing",
        "All",
      ],
      words: ["restroom", "bathroom", "washroom", "locker", "toilet", "shower"],
    },
    {
      name: "Office/Cubicle Areas",
      industries: [
        "Office",
        "Health",
        "Education",
        "Industrial & Manufacturing",
        "All",
      ],
      words: ["office", "cubicle", "workstation"],
    },
    {
      name: "Breakroom/Kitchenette",
      industries: [
        "Office",
        "Health",
        "Education",
        "Industrial & Manufacturing",
        "All",
      ],
      words: ["break", "kitchen", "lunch", "pantry"],
    },
    {
      name: "Conference/Meeting Room/Library",
      industries: [
        "Office",
        "Health",
        "Education",
        "Industrial & Manufacturing",
        "All",
      ],
      words: ["conference", "meeting", "library", "boardroom"],
    },
    {
      name: "Copy/File Room",
      industries: [
        "Office",
        "Health",
        "Education",
        "Industrial & Manufacturing",
        "All",
      ],
      words: ["copy", "file", "print"],
    },
    {
      name: "Elevators",
      industries: [
        "Office",
        "Health",
        "Education",
        "Industrial & Manufacturing",
        "All",
      ],
      words: ["elevator"],
    },
    {
      name: "Stairwells",
      industries: [
        "Office",
        "Health",
        "Education",
        "Industrial & Manufacturing",
        "All",
      ],
      words: ["stair"],
    },
    {
      name: "Janitor Closets",
      industries: [
        "Office",
        "Health",
        "Education",
        "Industrial & Manufacturing",
        "All",
      ],
      words: ["janitor", "custodial", "closet"],
    },
    {
      name: "Clinical/Exam/Lab Room",
      industries: ["Health", "All"],
      words: [
        "clinical",
        "exam",
        "lab",
        "patient",
        "treatment",
        "procedure",
        "operating",
      ],
    },
    {
      name: "Classroom",
      industries: ["Education", "All"],
      words: ["classroom", "class", "lecture"],
    },
    {
      name: "Auditoriums/Assembly",
      industries: ["Education", "All"],
      words: ["auditorium", "assembly", "theater", "theatre"],
    },
    {
      name: "Production/Manufacturing Floor",
      industries: ["Industrial & Manufacturing", "All"],
      words: ["production", "manufactur", "assembly line", "fabrication"],
    },
    {
      name: "Warehouse/Storage Area",
      industries: ["Industrial & Manufacturing", "All"],
      words: ["warehouse", "storage", "stockroom", "stock room", "inventory"],
    },
    {
      name: "Shipping/Receiving Dock",
      industries: ["Industrial & Manufacturing", "All"],
      words: ["shipping", "receiving", "dock", "loading"],
    },
    {
      name: "Maintenance/Tool Shop",
      industries: ["Industrial & Manufacturing", "All"],
      words: ["maintenance", "tool", "repair"],
    },
    {
      name: "Quality Control Lab",
      industries: ["Industrial & Manufacturing", "All"],
      words: ["quality", "qc", "inspection"],
    },
  ];

  const TASKS = [
    "Clean and Disinfect All Horizontal Surfaces",
    "Clean and Disinfect All Sinks",
    "Clean and Disinfect All Sinks and Countertops",
    "Clean and Disinfect All Toilets and Urinals",
    "Clean and Disinfect All Walls and Partitions",
    "Clean and Disinfect Hard Surface Floors",
    "Clean Baseboards",
    "Clean Drinking Fountain",
    "Clean Elevator Tracks",
    "Clean Entry Glass",
    "Clean Exterior of Appliances",
    "Clean Handrails/Walls/Ledges",
    "Clean Horizontal Surfaces",
    "Clean Mirrors",
    "Clean Sinks/Countertops/Tables",
    "Clean Vending Machines",
    "Clean Window Ledges",
    "Empty Trash and Remove",
    "Full Disinfect Mop Hard Surface Floor",
    "Full Mop Hard Surface Floor",
    "Full Vacuum Carpet/Mats",
    "Full Vacuum Carpeting",
    "High/Low Dusting",
    "Keep Neat and Organized",
    "Mop Floors",
    "Mop/Vacuum Floors",
    "Organize All Chairs Around Tables",
    "Organize Desk and Tables",
    "Polish Doors and Walls",
    "Polish Tables To Remove Prints",
    "Remove Fingerprints From Partition Glass",
    "Restock All Products",
    "Spot Mop Hard Surface Floor",
    "Spot Vacuum Carpet/Mats",
    "Spot Vacuum Carpeting",
    "Sweep & Mop Floors",
    "Vacuum Carpet/Mats",
    "Vacuum Mats",
  ];

  /* The walkthrough's Industry list is longer than the SOW industries, so each one starts as:
     Education > Education, Healthcare > Health, Logistics/Manufacturing > Industrial & Manufacturing,
     everything else > Office. The Scope of Work page can then change it for this scope only. */
  const FROM_WALKTHROUGH = {
    Education: "Education",
    Healthcare: "Health",
    "Logistics, Manufacturing & Industrial": "Industrial & Manufacturing",
  };

  const byId = (id) => document.getElementById(id);
  const openRooms = new Set(); // room cards the user has opened (remembered while the page is open)
  let cardList = []; // the cards currently on screen

  /* 2. STATE saved in data.sow:
        industry (only when changed on this page), freq (only when changed), off {room: true} for rooms
        switched off, rooms {room: {tasks: [{t, f}]}}, custom [{id, name}] */
  const sow = () =>
    (data.sow ??= { rooms: {}, off: {}, custom: [], nextId: 1 });
  /* Industry chosen on the walkthrough: mapped ones as above, any other chosen industry is "Office",
     and nothing chosen at all starts as "All" */
  const fromWalkthrough = () =>
    FROM_WALKTHROUGH[value("ind")] || (value("ind") ? "Office" : "All");
  const industry = () => sow().industry || fromWalkthrough();
  const defaultFreq = () =>
    sow().freq || Math.min(7, Math.max(1, Math.round(num("cpw")) || 1));
  const peek = (key) =>
    (sow().rooms[key]?.tasks || []).filter((t) => t.t.trim());
  const tasksOf = (key) => (sow().rooms[key] ??= { tasks: [] }).tasks; // every row, including ones still blank
  const save = () => persist();

  /* The areas typed into the walkthrough (Building Details) and the restroom counts */
  function walkthroughAreas() {
    return rowIndexes("area")
      .map((i) => ({
        i,
        name: String(data[`area-n-${i}`] || "").trim(),
        sf: num(`area-sf-${i}`),
        floor: data[`area-ft-${i}`] || "",
      }))
      .filter((a) => a.name);
  }

  function restrooms() {
    const keys = ["t", "u", "s", "sh"];
    const rows = rowIndexes("rr").filter(
      (i) => data[`rr-n-${i}`] || keys.some((k) => num(`rr-${k}-${i}`) > 0),
    );
    return {
      count: rows.length,
      fixtures: rows.reduce(
        (total, i) => total + keys.reduce((s, k) => s + num(`rr-${k}-${i}`), 0),
        0,
      ),
    };
  }

  /* Which room type an area name belongs to: the type with the longest matching word wins */
  const hasWord = (text, word) =>
    new RegExp("\\b" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(text);

  function matchType(areaName, types) {
    const text = areaName.toLowerCase();
    let best = null;
    let bestLength = 0;
    for (const type of types) {
      for (const word of type.words) {
        if (word.length > bestLength && hasWord(text, word)) {
          best = type;
          bestLength = word.length;
        }
      }
    }
    return best;
  }

  /* Build the list of rooms for the scope: the industry's room types, then any walkthrough area that
     matches none of them (as its own room), then rooms added by hand */
  function cards() {
    const types = ROOM_TYPES.filter((r) => r.industries.includes(industry()));
    const areasByType = new Map(types.map((t) => [t.name, []]));
    const unmatched = [];
    for (const area of walkthroughAreas()) {
      const type = matchType(area.name, types);
      if (type) areasByType.get(type.name).push(area);
      else unmatched.push(area);
    }
    return [
      ...types.map((t) => ({
        key: `type:${t.name}`,
        name: t.name,
        kind: "type",
        areas: areasByType.get(t.name),
      })),
      ...unmatched.map((a) => ({
        key: `area:${a.i}`,
        name: a.name,
        kind: "area",
        areas: [a],
      })),
      ...sow().custom.map((c) => ({
        key: `custom:${c.id}`,
        name: c.name,
        kind: "custom",
        areas: [],
      })),
    ];
  }

  const isOn = (card) => !sow().off[card.key];

  /* "From the walkthrough: Front Lobby (800 sq ft, VCT)" shown under a room's name */
  function caption(card) {
    const parts = card.areas.map((a) => {
      const detail = [a.sf ? `${a.sf.toLocaleString()} sq ft` : "", a.floor]
        .filter(Boolean)
        .join(", ");
      return esc(a.name) + (detail ? ` (${esc(detail)})` : "");
    });
    if (card.name === "Restroom/Locker Room") {
      const r = restrooms();
      if (r.count)
        parts.push(
          `${r.count} restroom${r.count > 1 ? "s" : ""}, ${r.fixtures} fixtures`,
        );
    }
    return parts.length ? `From the walkthrough: ${parts.join(" · ")}` : "";
  }

  /* 4. DRAWING */
  /* The choices in every frequency drop-down: 1-7 times a week, then the longer cycles */
  const FREQUENCIES = [1, 2, 3, 4, 5, 6, 7, "Bi-weekly", "Monthly"];
  const freqLabel = (f) => (typeof f === "number" ? `${f}x Per Week` : f);
  const freqValue = (text) => (/^\d+$/.test(text) ? Number(text) : text); // "3" -> 3, "Monthly" stays text

  const freqOptions = (current) =>
    (FREQUENCIES.includes(current) ? FREQUENCIES : [...FREQUENCIES, current])
      .map(
        (f) =>
          `<option value="${f}"${f === current ? " selected" : ""}>${esc(freqLabel(f))}</option>`,
      )
      .join("");

  function drawTop() {
    const select = byId("sow-industry");
    if (!select) return;
    select.innerHTML = INDUSTRIES.map(
      (i) => `<option${i === industry() ? " selected" : ""}>${esc(i)}</option>`,
    ).join("");
    byId("sow-freq").innerHTML = freqOptions(defaultFreq());
    const fromWalkthrough = FROM_WALKTHROUGH[value("ind")] || "Office";
    byId("sow-industry-note").textContent = sow().industry
      ? `Changed on this page. The walkthrough industry would give "${fromWalkthrough}".`
      : value("ind")
        ? `Chosen from the walkthrough industry (${value("ind")}).`
        : 'The walkthrough has no industry yet, so this starts as "Office".';
    byId("sow-match").hidden = !sow().industry;
  }

  function drawPicker() {
    byId("sow-picker").innerHTML = cardList
      .map(
        (c, n) =>
          `<label><input type="checkbox" data-room="${n}"${isOn(c) ? " checked" : ""}> ${esc(c.name)}</label>`,
      )
      .join("");
    const shown = new Set(cardList.map((c) => c.key));
    const hidden = Object.entries(sow().rooms)
      .filter(([key, room]) => room.tasks.length && !shown.has(key))
      .map(([key]) =>
        key.startsWith("area:")
          ? data[`area-n-${key.slice(5)}`] || "a removed walkthrough area"
          : key.replace(/^type:/, ""),
      );
    byId("sow-msg").textContent = hidden.length
      ? `Kept but hidden for this industry: ${hidden.join(", ")}.`
      : "";
  }

  /* One drop-down of tasks. Tasks already used in the room are greyed out so none is picked twice. */
  const taskOptions = (current, used) =>
    [
      `<option value=""${current ? "" : " selected"} disabled>Choose a task…</option>`,
      ...TASKS.map(
        (t) =>
          `<option${t === current ? " selected" : ""}${used.has(t) && t !== current ? " disabled" : ""}>${esc(t)}</option>`,
      ),
      current && !TASKS.includes(current)
        ? `<option selected>${esc(current)}</option>`
        : "",
      '<option value="__other">Other (type your own)…</option>',
    ].join("");

  function drawEditor() {
    byId("sow-editor").innerHTML = cardList
      .map((c, n) => {
        if (!isOn(c)) return "";
        const rows = sow().rooms[c.key]?.tasks || [];
        const used = new Set(rows.map((t) => t.t));
        const filled = peek(c.key).length;
        const note = caption(c);
        const count = filled
          ? `${filled} task${filled > 1 ? "s" : ""}`
          : "no tasks yet";
        return `
        <section class="card sow-room">
          <details data-open="${n}"${openRooms.has(c.key) ? " open" : ""}>
            <summary><h2 class="sow-title">${esc(c.name)}</h2><span class="sow-count">${count}</span></summary>
            ${note ? `<p class="hint">${note}</p>` : ""}
            <ul class="sow-tasks">${rows
              .map(
                (t, j) => `
              <li>
                <select data-task="${n}:${j}" aria-label="Task ${j + 1} in ${esc(c.name)}">${taskOptions(t.t, used)}</select>
                <select data-freq="${n}:${j}" aria-label="Times per week, task ${j + 1} in ${esc(c.name)}">${freqOptions(t.f)}</select>
                <button type="button" data-del="${n}:${j}" aria-label="Remove task ${j + 1}">✕</button>
              </li>`,
              )
              .join("")}</ul>
            <p class="sow-add">
              <button type="button" data-add-task="${n}">+ Add task</button>
              ${c.kind === "custom" ? `<button type="button" data-del-room="${n}">Remove room</button>` : ""}
            </p>
          </details>
        </section>`;
      })
      .join("");
  }

  /* The Cleanable Area | Frequency table, like the example scope of work */
  function drawPreview() {
    const rooms = cardList.filter((c) => isOn(c) && peek(c.key).length);
    const html = rooms.length
      ? `<div class="table-scroll"><table class="sow-table"><thead><tr><th scope="col">Cleanable Area</th><th scope="col">Frequency</th></tr></thead><tbody>${rooms
          .map(
            (c) =>
              `<tr class="sow-room-row"><td colspan="2">${esc(c.name)}</td></tr>` +
              peek(c.key)
                .map(
                  (t) =>
                    `<tr><td>${esc(t.t)}</td><td>${esc(freqLabel(t.f))}</td></tr>`,
                )
                .join(""),
          )
          .join("")}</tbody></table></div>`
      : `<p class="hint">${
          byId("sow-editor")
            ? "No tasks selected yet. Open a room above and choose its tasks."
            : "No tasks selected yet. Choose them on the Scope of Work page."
        }</p>`;
    for (const id of ["sow-preview", "sow-proposal", "scope-proposal"]) {
      if (byId(id)) byId(id).innerHTML = html;
    }
  }

  function render() {
    cardList = cards();
    drawTop();
    if (byId("sow-editor")) {
      drawPicker();
      drawEditor();
    }
    drawPreview();
  }

  /* 5. EVENTS (one listener each for the whole page) */
  const at = (text) => text.split(":").map(Number);

  document.addEventListener("change", (event) => {
    const el = event.target;
    const d = el.dataset;
    if (el.id === "sow-industry") {
      sow().industry = el.value;
    } else if (el.id === "sow-freq") {
      sow().freq = freqValue(el.value);
      return save();
    } else if (d.room !== undefined) {
      const key = cardList[d.room].key;
      if (el.checked) delete sow().off[key];
      else sow().off[key] = true;
    } else if (d.task) {
      const [n, j] = at(d.task);
      const row = tasksOf(cardList[n].key)[j];
      let chosen = el.value;
      if (chosen === "__other")
        chosen = (
          prompt("Describe the task (for example: Wipe exam tables)") || ""
        ).trim();
      if (chosen && !tasksOf(cardList[n].key).some((t) => t.t === chosen))
        row.t = chosen;
      save();
      drawPreview(); // the table below updates straight away
      el.blur(); // closes the phone's picker first...
      setTimeout(render, 150); // ...then the drop-down is replaced by the task name
      return;
    } else if (d.freq) {
      const [n, j] = at(d.freq);
      tasksOf(cardList[n].key)[j].f = freqValue(el.value);
      save();
      return drawPreview(); // no redraw of the cards, so nothing jumps
    } else return;
    save();
    render();
  });

  document.addEventListener("click", (event) => {
    const el = event.target.closest("button");
    if (!el) return;
    const d = el.dataset;
    if (d.del) {
      const [n, j] = at(d.del);
      tasksOf(cardList[n].key).splice(j, 1);
    } else if (d.addTask !== undefined) {
      const list = tasksOf(cardList[d.addTask].key);
      list.push({ t: "", f: defaultFreq() });
      save();
      render();
      return byId("sow-editor")
        .querySelector(`[data-task="${d.addTask}:${list.length - 1}"]`)
        ?.focus();
    } else if (d.delRoom !== undefined) {
      const card = cardList[d.delRoom];
      if (!confirm(`Remove "${card.name}" from this scope?`)) return;
      sow().custom = sow().custom.filter((c) => `custom:${c.id}` !== card.key);
      delete sow().rooms[card.key];
    } else if (el.id === "sow-add-room") {
      const name = (
        prompt("Name of the new room or area (for example: Server Room)") || ""
      ).trim();
      if (!name) return;
      const id = sow().nextId++;
      sow().custom.push({ id, name });
      openRooms.add(`custom:${id}`);
    } else if (el.id === "sow-match") {
      delete sow().industry;
    } else return;
    save();
    render();
  });

  /* Remember which cards are open so a redraw does not close them (toggle does not bubble, so capture it) */
  document.addEventListener(
    "toggle",
    (event) => {
      const d = event.target.dataset;
      const n = d?.open;
      if (n === undefined || !cardList[n]) return;
      event.target.open
        ? openRooms.add(cardList[n].key)
        : openRooms.delete(cardList[n].key);
    },
    true,
  );

  /* 6. STARTUP */
  byId("new")?.addEventListener("click", () => {
    // script.js has already emptied the walkthrough if the person said yes
    if (!Object.keys(data).length) {
      openRooms.clear();
      render();
    }
  });
  addEventListener("pageshow", (event) => event.persisted && location.reload()); // back button: reload fresh data
  // Rooms that already have tasks start open, so every task is visible when you come back to this page
  for (const [key, room] of Object.entries(sow().rooms)) {
    if (room.tasks.some((t) => t.t.trim())) openRooms.add(key);
  }
  render();
})();
