"use strict";
/* ==========================================================
   Facility Walkthrough & Bid: script (shared by all pages)
   1 Settings  2 Rates & defaults  3 Data  4 Storage  5 Estimate  6 Show results  7 Buttons & startup
   The HTML pages hold all the structure; this file only fills in values and handles saving.
   ========================================================== */

/* 1. SETTINGS. Fill in to save to your organization's Microsoft 365.
   Leave clientId empty to save in this browser only. Not secrets: sign-in protects the data.
   Register the redirect URI as the folder URL of the site (for example https://org.github.io/repo/). */
const MS = {
  clientId: "", // Application (client) ID from your Entra app registration
  tenantId: "", // Directory (tenant) ID
  sharePointSite: "", // optional, e.g. 'contoso.sharepoint.com:/sites/Sales:' (empty = each user's OneDrive)
  folder: "FacilityWalkthroughs",
};

/* 2. PRODUCTION RATES (from the bidding spreadsheet) AND STARTING PRICES.
   Rates are sq ft cleaned per hour at 3+ cleans a week, [hard floor, carpet] for Simple / Medium / Hard.
   At 1-2 cleans a week they are cut in half. */
const RATES = {
  Education: [
    [2700, 4050],
    [2250, 3375],
    [1800, 2700],
  ],
  Healthcare: [
    [2400, 3600],
    [2000, 3000],
    [1600, 2400],
  ],
  "Logistics, Manufacturing & Industrial": [
    [3000, 3600],
    [2500, 3000],
    [2000, 2400],
  ],
  other: [
    [3000, 4500],
    [2500, 3500],
    [2000, 3000],
  ], // every other industry
};
const DENSITY = ["Simple", "Medium", "Hard"];
const FIXTURE_MINUTES = [2.5, 3, 3.5]; // Logistics uses [3, 3.5, 4]

/* Starting values for the Pricing settings fields (edit here) */
const DEFAULTS = {
  "p-cpay": 15,
  "p-ppay": 16,
  "p-spay": 17,
  "p-spct": 3,
  "p-load": 14,
  "p-sup": 2,
  "p-opex": 20,
  "p-mb": 80000,
  "p-ad": 1,
  "p-start": 25,
  "p-step": 0.5,
  "p-sel": 30,
  "p-adj": "",
  "p-trav": 0,
  "p-pH": 0,
  "p-pF": 0,
  "p-cR": "",
  "p-hR": "",
  "p-fM": "",
  dt: new Date().toISOString().slice(0, 10),
};

/* Storage that never crashes if the browser blocks it */
const memory = (() => {
  try {
    localStorage.setItem("_t", "1");
    localStorage.removeItem("_t");
    return {
      get: (k) => localStorage.getItem(k),
      set: (k, v) => localStorage.setItem(k, v),
      del: (k) => localStorage.removeItem(k),
      keys: () => Object.keys(localStorage),
    };
  } catch {
    const m = new Map();
    return {
      get: (k) => m.get(k) ?? null,
      set: (k, v) => m.set(k, String(v)),
      del: (k) => m.delete(k),
      keys: () => [...m.keys()],
    };
  }
})();

const $ = (id) => document.getElementById(id);
const money = (x) =>
  x.toLocaleString("en-US", { style: "currency", currency: "USD" });
const percent = (x) => (x * 100).toFixed(1) + "%";
const quarter = (x) => Math.round(x / 0.25) * 0.25;
const roundUp = (x) => Math.ceil(x * 4 - 1e-9) / 4;

/* 3. DATA: one object holds every field, kept in the browser between pages */
/* The work in progress lives in this browser TAB only (sessionStorage): it carries across the pages,
   survives a refresh, and is gone when the tab is closed, so every new visit starts blank.
   Saved walkthroughs are different: they go to localStorage / Microsoft 365 and stay until deleted. */
const session = (() => {
  try {
    sessionStorage.setItem("_t", "1");
    sessionStorage.removeItem("_t");
    return sessionStorage;
  } catch {
    const m = new Map(); // storage blocked: keep the draft in memory only
    return {
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => m.set(k, String(v)),
    };
  }
})();

let data = JSON.parse(session.getItem("draft") || "{}");
const persist = () => session.setItem("draft", JSON.stringify(data));
const value = (name) => data[name] ?? DEFAULTS[name] ?? "";
/* "123 Main St, Atlanta, GA 30301" (older saves that only have the street line still work) */
const fullAddress = () =>
  [
    value("addr"),
    value("city"),
    [value("state"), value("zip")].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
const num = (name) => parseFloat(value(name)) || 0;

/* Repeating table rows (Areas, Restrooms, Pain points).
   Each table remembers its row numbers in data['rows:<prefix>'], for example data['rows:area'] = [1, 2, 4]. */
function rowIndexes(prefix) {
  if (data[`rows:${prefix}`]) return data[`rows:${prefix}`];
  const found = new Set(); // older saves: work the row numbers out from the field names
  for (const key of Object.keys(data)) {
    const match = key.match(new RegExp(`^${prefix}-[a-z]+-(\\d+)$`));
    if (match) found.add(Number(match[1]));
  }
  if (found.size) return [...found].sort((a, b) => a - b);
  const start =
    Number(document.querySelector(`[data-rows="${prefix}"]`)?.dataset.start) ||
    3;
  return Array.from({ length: start }, (_, i) => i + 1);
}

function drawRows(table) {
  const prefix = table.dataset.rows;
  const template = document.querySelector(`template[data-for="${prefix}"]`);
  table.tBodies[0].innerHTML = rowIndexes(prefix)
    .map((i) => template.innerHTML.replaceAll("{i}", i))
    .join("");
}

function fillFields() {
  document.querySelectorAll("[data-rows]").forEach(drawRows);
  for (const el of document.querySelectorAll("[name]")) {
    if (el.type === "checkbox")
      el.checked = data[el.name]?.includes(el.value) ?? false;
    else el.value = value(el.name);
  }
}

document.addEventListener("input", (event) => {
  const el = event.target;
  if (!el.name) return;
  data[el.name] =
    el.type === "checkbox"
      ? [...document.querySelectorAll(`input[name="${el.name}"]:checked`)].map(
          (box) => box.value,
        )
      : el.value;
  persist();
  showResults();
});

/* Add row / remove row buttons */
document.addEventListener("click", (event) => {
  const add = event.target.closest("[data-add-row]");
  const remove = event.target.closest("[data-remove-row]");
  if (add) {
    const prefix = add.dataset.addRow;
    const rows = rowIndexes(prefix);
    data[`rows:${prefix}`] = [...rows, Math.max(0, ...rows) + 1];
    persist();
    fillFields();
    document
      .querySelector(`[data-rows="${prefix}"] tbody tr:last-child [name]`)
      ?.focus();
  } else if (remove) {
    const prefix = remove.closest("[data-rows]").dataset.rows;
    const index = Number(
      remove
        .closest("tr")
        .querySelector("[name]")
        .name.match(/(\d+)$/)[1],
    );
    for (const key of Object.keys(data)) {
      if (new RegExp(`^${prefix}-[a-z]+-${index}$`).test(key)) delete data[key];
    }
    data[`rows:${prefix}`] = rowIndexes(prefix).filter((i) => i !== index);
    persist();
    fillFields();
    showResults();
  }
});

/* 4. STORAGE: Microsoft OneDrive/SharePoint when configured, otherwise this browser */
const useMicrosoft = Boolean(MS.clientId);
const scopes = [
  "User.Read",
  MS.sharePointSite ? "Sites.ReadWrite.All" : "Files.ReadWrite",
];
let msalApp;

async function getToken() {
  if (!msalApp) {
    msalApp = new msal.PublicClientApplication({
      auth: {
        clientId: MS.clientId,
        authority: `https://login.microsoftonline.com/${MS.tenantId}`,
        redirectUri: location.origin + location.pathname.replace(/[^/]*$/, ""),
      },
      cache: { cacheLocation: "localStorage" },
    });
    await msalApp.initialize();
  }
  if (!msalApp.getAllAccounts()[0]) await msalApp.loginPopup({ scopes });
  const account = msalApp.getAllAccounts()[0];
  try {
    return (await msalApp.acquireTokenSilent({ scopes, account })).accessToken;
  } catch {
    return (await msalApp.acquireTokenPopup({ scopes })).accessToken;
  }
}

async function graph(path, init = {}) {
  const res = await fetch("https://graph.microsoft.com/v1.0" + path, {
    ...init,
    headers: { Authorization: `Bearer ${await getToken()}`, ...init.headers },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Microsoft error ${res.status}`);
  return res;
}

const folder = () =>
  `/${MS.sharePointSite ? `sites/${MS.sharePointSite}/drive` : "me/drive"}/root:/${MS.folder}`;

const storage = {
  async save(id, record) {
    if (!useMicrosoft) return memory.set(`wt-${id}`, JSON.stringify(record));
    await graph(`${folder()}/${id}.json:/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
  },
  async load(id) {
    if (!useMicrosoft) return JSON.parse(memory.get(`wt-${id}`));
    return (await graph(`${folder()}/${id}.json:/content`))?.json();
  },
  async list() {
    if (!useMicrosoft) {
      return memory
        .keys()
        .filter((k) => k.startsWith("wt-"))
        .map((k) => JSON.parse(memory.get(k)));
    }
    const res = await graph(`${folder()}:/children?$select=name`);
    const files = res ? (await res.json()).value : [];
    const ids = files
      .filter((f) => f.name.endsWith(".json"))
      .map((f) => f.name.slice(0, -5));
    return (await Promise.all(ids.map((id) => this.load(id)))).filter(Boolean);
  },
  async remove(id) {
    if (!useMicrosoft) return memory.del(`wt-${id}`);
    await graph(`${folder()}/${id}.json`, { method: "DELETE" });
  },
};

/* 5. ESTIMATE: the same math as the bidding spreadsheet */
function estimate() {
  const price = (key) => num(`p-${key}`);
  const column = (prefix) =>
    rowIndexes("rr").reduce((total, i) => total + num(`${prefix}-${i}`), 0);

  let areaSqFt = 0;
  let carpetSqFt = 0;
  for (const i of rowIndexes("area")) {
    areaSqFt += num(`area-sf-${i}`);
    if (value(`area-ft-${i}`) === "Carpet") carpetSqFt += num(`area-sf-${i}`);
  }
  const hardSqFt = areaSqFt ? areaSqFt - carpetSqFt : num("sqft");

  const toilets = column("rr-t");
  const urinals = column("rr-u");
  const sinks = column("rr-s");
  const showers = column("rr-sh");
  const fixtures = toilets + urinals + sinks + showers;

  const industry = value("ind");
  const level = Math.max(0, DENSITY.indexOf(value("den")));
  const cleansPerWeek = num("cpw");
  const half = cleansPerWeek && cleansPerWeek <= 2 ? 0.5 : 1;
  const [hardRate, carpetRate] = (RATES[industry] ?? RATES.other)[level];
  const carpetPerHour = price("cR") || carpetRate * half;
  const hardPerHour = price("hR") || hardRate * half;
  const fixtureMinutes =
    price("fM") ||
    (industry.startsWith("Logistics") ? [3, 3.5, 4] : FIXTURE_MINUTES)[level];

  const carpetHours = carpetSqFt / carpetPerHour;
  const hardHours = hardSqFt / hardPerHour;
  const fixtureHours = (fixtures * fixtureMinutes) / 60;
  const hoursPerClean =
    (price("adj") > 0 ? price("adj") : carpetHours + hardHours + fixtureHours) +
    price("trav");
  const cleanerHours = quarter(hoursPerClean * cleansPerWeek * 4.33333);
  const porterHours = quarter(price("pH") * price("pF") * 4.33);
  const totalHours = cleanerHours + porterHours;

  const loaded = 1 + price("load") / 100;
  const laborCost =
    (price("cpay") * loaded +
      ((price("spay") * price("spct")) / 100) * loaded) *
      cleanerHours +
    price("ppay") * loaded * porterHours;
  const billing = price("mb");
  const royalty =
    billing > 300000
      ? 0.06
      : billing > 100000
        ? 0.07
        : billing > 50000
          ? 0.08
          : 0.09;

  const atRate = (rate) => {
    const invoice = totalHours * rate;
    const ad = (invoice * price("ad")) / 100;
    const supply = (invoice * price("sup")) / 100;
    const opex = (invoice * price("opex")) / 100;
    const gross = invoice - invoice * royalty - ad - laborCost - supply;
    const net = gross - opex;
    return {
      rate,
      invoice,
      royalty: invoice * royalty,
      ad,
      supply,
      gross,
      opex,
      net,
      grossPct: invoice ? gross / invoice : 0,
      netPct: invoice ? net / invoice : 0,
    };
  };
  const rows = Array.from({ length: 18 }, (_, i) =>
    atRate(price("start") + i * price("step")),
  );

  return {
    areaSqFt,
    carpetSqFt,
    hardSqFt,
    toilets,
    urinals,
    sinks,
    showers,
    fixtures,
    industry,
    cleansPerWeek,
    carpetPerHour,
    hardPerHour,
    fixtureMinutes,
    carpetHours,
    hardHours,
    fixtureHours,
    hoursPerClean,
    totalHours,
    laborCost,
    royalty,
    rows,
    chosen: atRate(price("sel")),
  };
}

/* 6. SHOW RESULTS: fills every  <span data-out="name">  in the HTML, plus the bid table rows */
function showResults() {
  const targets = document.querySelectorAll("[data-out]");
  if (!targets.length) return;
  const e = estimate();
  const c = e.chosen;
  const painList = [value("p1"), value("p2"), value("p3")];
  for (const i of rowIndexes("ps")) {
    const pain = value(`ps-p-${i}`);
    if (pain)
      painList.push(
        value(`ps-s-${i}`) ? `${pain} → ${value(`ps-s-${i}`)}` : pain,
      );
  }
  const pains = painList.filter(Boolean);

  const text = {
    facility: value("name") || "Unnamed facility",
    context: [
      fullAddress(),
      value("type"),
      `${e.industry || "Industry not set"} / ${value("den") || "Simple"}`,
    ]
      .filter(Boolean)
      .join(" · "),
    sqft: (e.areaSqFt || num("sqft")).toLocaleString(),
    carpet: e.carpetSqFt.toLocaleString(),
    hard: e.hardSqFt.toLocaleString(),
    carpetHard: `${e.carpetSqFt.toLocaleString()} / ${e.hardSqFt.toLocaleString()}`,
    fixtures: e.fixtures,
    toilets: e.toilets,
    urinals: e.urinals,
    sinks: e.sinks,
    showers: e.showers,
    floors: value("fl") || "–",
    floorLine: value("fl") ? `Number of Floors: ${value("fl")}` : "",
    pains: pains.map((p) => `• ${p}`).join("\n") || "(none recorded)",
    painLine: pains.join("; ") || "(none recorded)",
    carpetHours: roundUp(e.carpetHours).toFixed(2),
    hardHours: roundUp(e.hardHours).toFixed(2),
    fixtureHours: roundUp(e.fixtureHours).toFixed(2),
    hoursPerClean: roundUp(e.hoursPerClean).toFixed(2),
    hours: e.totalHours,
    carpetRate: Math.round(e.carpetPerHour),
    hardRate: Math.round(e.hardPerHour),
    fixtureMinutes: e.fixtureMinutes,
    cpw: e.cleansPerWeek || value("cpw"),
    labor: money(e.laborCost),
    gross: `${money(c.gross)} (${percent(c.grossPct)})`,
    net: `${money(c.net)} (${percent(c.netPct)})`,
    annual: money(c.net * 12),
    royaltyTier: percent(e.royalty),
    rate: money(c.rate),
    price: money(c.invoice),
    name: value("name"),
    addr: fullAddress(),
    contact: value("contact"),
    date: value("dt"),
    freq: value("rf"),
    time: value("pt"),
    start: value("st") || value("sd"),
    decision: value("dd"),
    final: value("fin"),
  };
  targets.forEach((el) => (el.textContent = text[el.dataset.out] ?? ""));

  if ($("bid-rows")) {
    $("bid-rows").innerHTML = e.rows
      .map(
        (
          r,
        ) => `<tr data-rate="${r.rate}"${Math.abs(r.rate - c.rate) < 1e-9 ? ' class="selected"' : ""}>
      <td>${money(r.rate)}</td><td>${money(r.invoice)}</td><td>${money(r.royalty)}</td><td>${money(r.ad)}</td>
      <td>${money(e.laborCost)}</td><td>${money(r.supply)}</td><td>${money(r.gross)}</td><td>${percent(r.grossPct)}</td>
      <td>${money(r.opex)}</td><td>${money(r.net)}</td><td>${percent(r.netPct)}</td></tr>`,
      )
      .join("");
  }
}

/* 7. BUTTONS & STARTUP */
const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const status = (message) => {
  $("status").textContent = message;
  setTimeout(() => ($("status").textContent = ""), 3000);
};

$("save").addEventListener("click", async () => {
  // The address is required: street, city, state and a 5-digit ZIP
  const walkthroughForm = document.getElementById("wt");
  const addressOk =
    ["addr", "city", "state"].every((k) => String(data[k] || "").trim()) &&
    /^\d{5}(-\d{4})?$/.test(String(data.zip || "").trim());
  if (walkthroughForm) {
    if (!walkthroughForm.reportValidity()) return; // shows the browser's "please fill in" message on the empty field
  } else if (!addressOk) {
    return status(
      "Add the street address, city, state and ZIP on the Walkthrough page first",
    );
  }
  data["record-id"] ||= Date.now().toString(36);
  data.updated = new Date().toISOString();
  persist();
  try {
    await storage.save(data["record-id"], data);
    status("Saved ✓");
  } catch {
    status("Save failed");
  }
});

$("new").addEventListener("click", () => {
  if (!confirm("Start a new walkthrough? Unsaved changes will be lost."))
    return;
  data = {};
  persist();
  fillFields();
  showResults();
});

/* Bid table: click a row to choose the proposal price */
$("bid-rows")?.addEventListener("click", (event) => {
  const row = event.target.closest("[data-rate]");
  if (!row) return;
  data["p-sel"] = row.dataset.rate;
  persist();
  fillFields();
  showResults();
});

/* Saved page: list, open and delete */
async function drawSaved() {
  const list = $("saved-list");
  list.textContent = "Loading…";
  const items = (await storage.list().catch(() => [])).sort((a, b) =>
    (b.updated || "").localeCompare(a.updated || ""),
  );
  list.innerHTML = items.length
    ? items
        .map(
          (
            w,
          ) => `<li><button type="button" data-open="${esc(w["record-id"])}">${esc(w.name || "Unnamed")} (${esc(w.dt)})</button>
        <button type="button" data-remove="${esc(w["record-id"])}">Delete</button></li>`,
        )
        .join("")
    : "<li>Nothing saved yet.</li>";
}

$("saved-list")?.addEventListener("click", async (event) => {
  const { open, remove } = event.target.dataset;
  if (open) {
    data = await storage.load(open);
    persist();
    location.href = "index.html";
  } else if (remove && confirm("Delete this walkthrough?")) {
    await storage.remove(remove);
    drawSaved();
  }
});

fillFields();
showResults();
if ($("saved-list")) drawSaved();
