(function () {
  const cfg = window.__HUB_CONFIG__ || {};
  const hubTitle = document.getElementById("hubTitle");
  const hubMeta = document.getElementById("hubMeta");
  const cardsEl = document.getElementById("cards");
  const resetGuidesEl = document.getElementById("resetGuides");

  const btnCopyAll = document.getElementById("btnCopyAll");
  const btnCollapse = document.getElementById("btnCollapse");
  const resetPanel = document.getElementById("resetPanel");

  const collapsedKey = "__hub_guides_collapsed__";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  function isSetUrl(u) {
    return typeof u === "string" && u.trim().length > 0;
  }

  function openUrl(url) {
    try { window.open(url, "_blank", "noopener,noreferrer"); } catch { location.href = url; }
  }

  function copyText(text) {
    return navigator.clipboard.writeText(text);
  }

  function setCollapsed(on) {
    resetPanel.style.display = on ? "none" : "";
    localStorage.setItem(collapsedKey, on ? "1" : "0");
    btnCollapse.textContent = on ? "가이드 펼치기" : "가이드 접기";
  }

  function renderGuides() {
    const guides = Array.isArray(cfg.resetGuides) ? cfg.resetGuides : [];
    if (!guides.length) return;

    const html = guides.map(g => {
      const steps = Array.isArray(g.steps) ? g.steps : [];
      return `
        <div class="guide">
          <div class="guide__title">${esc(g.title || "Guide")}</div>
          <ol class="guide__steps">
            ${steps.map(s => `<li>${esc(s)}</li>`).join("")}
          </ol>
        </div>
      `;
    }).join("");

    resetGuidesEl.innerHTML = `<div class="grid2">${html}</div>`;
  }

  function renderCards() {
    const groups = Array.isArray(cfg.groups) ? cfg.groups : [];
    const items = groups.flatMap(g => (Array.isArray(g.items) ? g.items : []));

    const html = items.map(item => {
      const links = item.links || {};
      const linkEntries = Object.entries(links);

      const filledCount = linkEntries.filter(([, u]) => isSetUrl(u)).length;
      const badgeClass = filledCount > 0 ? "badge badge--ok" : "badge badge--warn";
      const badgeText = filledCount > 0 ? `READY (${filledCount})` : "NO LINKS";

      const btns = linkEntries.map(([k, url]) => {
        const label = k.toUpperCase();
        const disabled = !isSetUrl(url);
        return `
          <button class="btn" data-url="${esc(url || "")}" ${disabled ? "disabled" : ""}>
            Open ${esc(label)}
          </button>
        `;
      }).join("");

      const notes = Array.isArray(item.notes) ? item.notes : [];
      const notesHtml = notes.length
        ? `<div class="note"><div>Notes</div><ul>${notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>`
        : "";

      return `
        <div class="card" data-id="${esc(item.id || "")}">
          <div class="card__top">
            <div>
              <div class="card__title">${esc(item.title || item.id || "PoC")}</div>
              <div class="card__desc">${esc(item.desc || "")}</div>
            </div>
            <div class="${badgeClass}">${esc(badgeText)}</div>
          </div>

          <div class="links">
            ${btns || `<span class="badge badge--warn">No links configured</span>`}
            <button class="btn btn--ghost" data-copy="1">Copy links</button>
            <button class="btn btn--ghost" data-detail="${esc(item.id || "")}">Details</button>
          </div>

          ${notesHtml}
        </div>
      `;
    }).join("");

    cardsEl.innerHTML = html;

    // 이벤트 바인딩
    cardsEl.addEventListener("click", async (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;

      const card = t.closest(".card");
      if (!card) return;

      const id = card.getAttribute("data-id") || "";
      const item = findItemById(id);
      if (!item) return;

      const url = t.getAttribute("data-url");
      const isCopy = t.getAttribute("data-copy") === "1";
      const detailId = t.getAttribute("data-detail");

      if (isCopy) {
        const lines = Object.entries(item.links || {})
          .filter(([, u]) => isSetUrl(u))
          .map(([k, u]) => `${id}.${k} = ${u}`);
        if (!lines.length) return;
        try { await copyText(lines.join("\n")); } catch {}
        return;
      }

      if (detailId) {
        const page = `/poc/${detailId}.html`;
        openUrl(page);
        return;
      }

      if (url && isSetUrl(url) && !t.hasAttribute("disabled")) {
        openUrl(url);
      }
    });
  }

  function findItemById(id) {
    const groups = Array.isArray(cfg.groups) ? cfg.groups : [];
    for (const g of groups) {
      const items = Array.isArray(g.items) ? g.items : [];
      for (const it of items) {
        if (it.id === id) return it;
      }
    }
    return null;
  }

  function allLinksText() {
    const groups = Array.isArray(cfg.groups) ? cfg.groups : [];
    const items = groups.flatMap(g => (Array.isArray(g.items) ? g.items : []));
    const lines = [];
    for (const it of items) {
      const id = it.id || "poc";
      for (const [k, u] of Object.entries(it.links || {})) {
        if (!isSetUrl(u)) continue;
        lines.push(`${id}.${k} = ${u}`);
      }
    }
    return lines.join("\n");
  }

  function initHeader() {
    if (hubTitle) hubTitle.textContent = cfg.hubTitle || "BRS PoC Hub";
    const updated = cfg.updatedAt ? `updated: ${cfg.updatedAt}` : "";
    if (hubMeta) hubMeta.textContent = updated;
  }

  function initButtons() {
    btnCopyAll.addEventListener("click", async () => {
      const text = allLinksText();
      if (!text) return;
      try { await copyText(text); } catch {}
    });

    btnCollapse.addEventListener("click", () => {
      const cur = localStorage.getItem(collapsedKey) === "1";
      setCollapsed(!cur);
    });

    const collapsed = localStorage.getItem(collapsedKey) === "1";
    setCollapsed(collapsed);
  }

  initHeader();
  initButtons();
  renderGuides();
  renderCards();
})();