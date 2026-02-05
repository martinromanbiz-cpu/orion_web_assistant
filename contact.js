(function () {
  const form = document.getElementById("orionContactForm");
  const statusEl = document.getElementById("contactStatus");
  const successBox = document.getElementById("contactSuccess");
  const closeBtn = document.getElementById("contactClose");

  if (!form) return;

  const url = window.ORION_CONFIG?.CONTACT_WEBHOOK_URL;
  if (!url) {
    statusEl.textContent = "Chybí CONTACT_WEBHOOK_URL v config.js";
    return;
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || "";
  }

  function showSuccess() {
    form.hidden = true;
    successBox.hidden = false;
  }

  function closeSuccess() {
    successBox.hidden = true;
    form.hidden = false;
    form.reset();
    setStatus("");
  }

  if (closeBtn) closeBtn.addEventListener("click", closeSuccess);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const payload = {
      name: (fd.get("name") || "").toString().trim(),
      email: (fd.get("email") || "").toString().trim(),
      phone: (fd.get("phone") || "").toString().trim(),
      message: (fd.get("message") || "").toString().trim(),
    };

    // jednoduchá validace
    if (!payload.name || !payload.email || !payload.message) {
      setStatus("Vyplňte prosím jméno, e-mail a zprávu.");
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    setStatus("Odesílám…");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data || data.ok !== true) {
        setStatus("Nepodařilo se odeslat. Zkuste to prosím znovu.");
        if (btn) btn.disabled = false;
        return;
      }

      setStatus("");
      showSuccess();
      // “zavřít formulář” = success box + reset po zavření tlačítkem
    } catch (err) {
      setStatus("Chyba připojení. Zkuste to prosím znovu.");
      if (btn) btn.disabled = false;
    }
  });
})();
