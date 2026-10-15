/* Photos for the Walkthrough page: pain points and building areas.
   - Photos are shrunk, then stored inside the same data object as everything else (data['area-photos-3'], data['ps-photos-2'], ...),
     so they are saved, reopened and removed together with their row.
   - Older saved walkthroughs simply have no photos until you add some.
   - Photos only show on the Walkthrough page (and in its PDF print). Nothing else reads them.
   Needs script.js loaded first (it provides data, persist, rowIndexes). */
(() => {
  const MAX_PHOTOS = 30; // for the whole walkthrough
  const MAX_SIDE = 1000; // longest side in pixels after shrinking
  const QUALITY = 0.62; // JPEG quality 0-1 (lower = smaller files)

  /* Which table gets photos, and which cell they go in (found by a field name starting with "cell") */
  const TABLES = [
    { prefix: "area", cell: "area-nt-", label: "area" },
    { prefix: "ps", cell: "ps-s-", label: "pain point" },
  ];

  const keyOf = (prefix, i) => `${prefix}-photos-${i}`;
  const photosOf = (key) =>
    Array.isArray(data[key])
      ? data[key].filter(
          (u) => typeof u === "string" && u.startsWith("data:image/"),
        )
      : [];
  const total = () =>
    TABLES.reduce(
      (sum, t) =>
        sum +
        rowIndexes(t.prefix).reduce(
          (n, i) => n + photosOf(keyOf(t.prefix, i)).length,
          0,
        ),
      0,
    );

  /* Shrink a picked file into a small JPEG data URL */
  async function shrink(file) {
    let bitmap;
    try {
      bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      }); // respects phone rotation
    } catch {
      bitmap = await new Promise((done, fail) => {
        const img = new Image();
        img.onload = () => done(img);
        img.onerror = fail;
        img.src = URL.createObjectURL(file);
      });
    }
    const w = bitmap.width || bitmap.naturalWidth;
    const h = bitmap.height || bitmap.naturalHeight;
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // so transparent PNGs do not turn black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", QUALITY);
  }

  /* One <dialog> shared by every thumbnail, to see a photo larger */
  const viewer = document.createElement("dialog");
  viewer.className = "photo-viewer";
  viewer.innerHTML =
    '<img alt=""><form method="dialog"><button>Close</button></form>';
  document.body.append(viewer);
  viewer.addEventListener(
    "click",
    (event) => event.target === viewer && viewer.close(),
  );

  /* Draw the thumbnails and the add button for one row */
  function drawPhotos(box) {
    const key = box.dataset.photos;
    const list = photosOf(key);
    const used = total();
    box.textContent = "";
    const thumbs = document.createElement("div");
    thumbs.className = "photo-thumbs";
    const actions = document.createElement("div");
    actions.className = "photo-actions";
    list.forEach((url, n) => {
      const thumb = document.createElement("span");
      thumb.className = "photo-thumb";
      const img = document.createElement("img");
      img.src = url;
      img.alt = `Photo ${n + 1}`;
      img.dataset.photoView = "";
      const del = document.createElement("button");
      del.type = "button";
      del.dataset.photoDel = n;
      del.setAttribute("aria-label", `Remove photo ${n + 1}`);
      del.textContent = "✕";
      thumb.append(img, del);
      thumbs.append(thumb);
    });
    const add = document.createElement("button");
    add.type = "button";
    add.dataset.photoAdd = "";
    add.textContent = "+ Photo";
    add.title = `${used} of ${MAX_PHOTOS} photos used in this walkthrough`;
    add.disabled = used >= MAX_PHOTOS;
    const count = document.createElement("small");
    count.className = "photo-count";
    count.textContent = used ? `${used}/${MAX_PHOTOS}` : "";
    const file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.multiple = true;
    file.hidden = true;
    file.setAttribute("aria-label", "Choose photos");
    actions.append(add, count, file);
    box.append(thumbs, actions);
  }

  /* Put a photo box into every row that does not have one yet */
  function decorate() {
    for (const t of TABLES) {
      document
        .querySelectorAll(`[data-rows="${t.prefix}"] tbody tr`)
        .forEach((row) => {
          if (row.querySelector("[data-photos]")) return;
          const field = row.querySelector(`[name^="${t.cell}"]`);
          const index = field?.name.match(/(\d+)$/)?.[1];
          if (!field || !index) return;
          const cell = document.createElement("div"); // text field on the left, photos on the right, button underneath
          cell.className = "photo-cell";
          field.after(cell);
          cell.append(field);
          const box = document.createElement("div");
          box.className = "photos";
          box.dataset.photos = keyOf(t.prefix, index);
          cell.append(box);
          drawPhotos(box);
        });
    }
  }

  /* Every box shows the shared "n/20" count, so refresh them all after a change */
  const drawAll = () =>
    document.querySelectorAll("[data-photos]").forEach(drawPhotos);

  async function addFiles(box, files) {
    const key = box.dataset.photos;
    let unreadable = 0;
    for (const file of files) {
      if (total() >= MAX_PHOTOS) {
        alert(
          `The limit is ${MAX_PHOTOS} photos per walkthrough. Remove a photo to add another.`,
        );
        break;
      }
      let url;
      try {
        url = await shrink(file);
      } catch {
        unreadable++; // not a picture the browser can open
        continue;
      }
      const before = data[key];
      data[key] = [...photosOf(key), url];
      try {
        persist();
      } catch {
        // the browser is out of storage space: undo this photo
        if (before === undefined) delete data[key];
        else data[key] = before;
        alert(
          "The browser has no room left for this photo. Remove some photos or delete old saved walkthroughs, then try again.",
        );
        break;
      }
      drawAll();
    }
    if (unreadable)
      alert(
        `${unreadable} file(s) could not be opened as pictures and were skipped.`,
      );
    drawAll();
  }

  document.addEventListener("click", (event) => {
    const box = event.target.closest("[data-photos]");
    if (!box) return;
    if (event.target.closest("[data-photo-add]"))
      box.querySelector('input[type="file"]').click();
    const del = event.target.closest("[data-photo-del]");
    if (del) {
      const key = box.dataset.photos;
      const list = photosOf(key);
      list.splice(Number(del.dataset.photoDel), 1);
      if (list.length) data[key] = list;
      else delete data[key];
      persist();
      drawAll();
    }
    if (event.target.matches("[data-photo-view]")) {
      viewer.querySelector("img").src = event.target.src;
      viewer.showModal();
    }
  });

  document.addEventListener("change", (event) => {
    const input = event.target;
    if (input.type !== "file" || !input.closest("[data-photos]")) return;
    const files = [...input.files];
    input.value = ""; // lets the same photo be picked again later
    addFiles(input.closest("[data-photos]"), files);
  });

  /* script.js rebuilds the table rows whenever rows are added or removed, or a walkthrough is opened or cleared.
     Watch for that and put the photo boxes back. */
  const watch = new MutationObserver(() => {
    decorate();
    drawAll();
  });
  document
    .querySelectorAll("[data-rows]")
    .forEach(
      (table) =>
        table.tBodies[0] &&
        watch.observe(table.tBodies[0], { childList: true }),
    );

  decorate();
  drawAll();
})();

// Notes / Proposed solution boxes: grow taller to show every line (the width never changes)
(() => {
  const fit = (el) => {
    el.style.blockSize = "auto";
    if (el.scrollHeight) el.style.blockSize = `${el.scrollHeight}px`;
  };
  const lastWidth = new WeakMap();
  const resized = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      if (lastWidth.get(target) === contentRect.width) continue;
      lastWidth.set(target, contentRect.width);
      fit(target);
    }
  });
  const fitAll = () =>
    document.querySelectorAll("td textarea").forEach((el) => {
      resized.observe(el);
      fit(el);
    });

  document.addEventListener("input", (event) => {
    if (event.target.matches("td textarea")) fit(event.target);
  });
  window.addEventListener("resize", fitAll);
  window.addEventListener("beforeprint", fitAll);
  const rebuilt = new MutationObserver(fitAll); // rows are redrawn when added, removed or a walkthrough opens
  document
    .querySelectorAll("[data-rows]")
    .forEach(
      (table) =>
        table.tBodies[0] &&
        rebuilt.observe(table.tBodies[0], { childList: true }),
    );
  fitAll();
})();
