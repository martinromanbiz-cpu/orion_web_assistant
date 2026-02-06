(() => {
  const url = window.ORION_CONFIG?.CONTACT_WEBHOOK_URL;

  const form = document.querySelector("#contactForm");
  const statusEl = document.querySelector("#contactStatus");

  if (!form) return;

  if (!url) {
    if (statusEl) statusEl.textContent = "Chybí CONTACT_WEBHOOK_URL v config.js";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: form.querySelector('[name="name"]')?.value?.trim() || "",
      email: form.querySelector('[name="email"]')?.value?.trim() || "",
      phone: form.querySelector('[name="phone"]')?.value?.trim() || "",
      message: form.querySelector('[name="message"]')?.value?.trim() || ""
    };

    if (statusEl) statusEl.textContent = "Odesílám…";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);

      if (statusEl) statusEl.textContent = "Děkuji, zpráva byla odeslána.";
      form.reset();
    } catch (err) {
      if (statusEl) statusEl.textContent = "Nepodařilo se odeslat zprávu. Zkuste to prosím znovu.";
      console.error(err);
    }
  });
})();
