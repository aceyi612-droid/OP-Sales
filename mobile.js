/* Phones only: each section folds up. Tap a section title to open or close it. */
(() => {
  const phone = matchMedia("(max-width: 40rem)");
  const cards = [...document.querySelectorAll("form > .card")].filter((c) =>
    c.querySelector(":scope > h2"),
  );
  if (!cards.length) return;

  const titleOf = (card) =>
    card.querySelector(":scope > h2").textContent.trim();
  const KEY = "open-sections:" + location.pathname.split("/").pop();
  const remembered = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY));
    } catch {
      return null;
    }
  })();

  /* First visit: Walkthrough opens only its first section; Summary & Bid closes only Pricing Settings */
  const startsClosed = (card, i) =>
    remembered
      ? !remembered.includes(titleOf(card))
      : document.getElementById("pricing")
        ? titleOf(card) === "Pricing Settings"
        : i > 0;

  const remember = () => {
    try {
      const open = cards
        .filter((c) => !c.classList.contains("collapsed"))
        .map(titleOf);
      sessionStorage.setItem(KEY, JSON.stringify(open));
    } catch {}
  };

  const setClosed = (card, closed) => {
    card.classList.toggle("collapsed", closed);
    card
      .querySelector(":scope > h2")
      .setAttribute("aria-expanded", String(!closed));
  };

  const toggle = (card) => {
    if (!phone.matches) return;
    setClosed(card, !card.classList.contains("collapsed"));
    remember();
  };

  cards.forEach((card, i) => {
    const title = card.querySelector(":scope > h2");
    setClosed(card, startsClosed(card, i));
    title.addEventListener("click", () => toggle(card));
    title.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle(card);
      }
    });
  });

  /* Titles act like buttons only on phones */
  const sync = () =>
    cards.forEach((card) => {
      const title = card.querySelector(":scope > h2");
      if (phone.matches) {
        title.setAttribute("role", "button");
        title.tabIndex = 0;
      } else {
        title.removeAttribute("role");
        title.removeAttribute("tabindex");
      }
    });
  phone.addEventListener("change", sync);
  sync();

  /* If Save complains about a field inside a folded section, open that section */
  document.addEventListener(
    "invalid",
    (event) => {
      const card = event.target.closest(".card");
      if (card?.classList.contains("collapsed")) setClosed(card, false);
    },
    true,
  );
})();
