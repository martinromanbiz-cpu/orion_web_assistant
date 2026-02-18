// assets/js/config.js
(function () {
  window.ORION_CONFIG = window.ORION_CONFIG || {};

  // n8n formulář webhook (PRODUCTION)
  window.ORION_CONFIG.CONTACT_WEBHOOK_URL =
    "https://martinroman36.app.n8n.cloud/webhook/52215ffe-42b0-43b9-ba97-037e46475ab3";

  // n8n chat webhook
  window.ORION_CONFIG.N8N_WEBHOOK_URL =
    "https://martinroman36.app.n8n.cloud/webhook/71df30a1-7b93-46bc-817d-61a7da4ef1a6/chat";

  // demo odkazy (Ukázky)
  window.ORION_CONFIG.DEMO_LINKS = [
    { title: "Demo E-shop (ukázka)", url: "https://martinromanbiz-cpu.github.io/chateshop/" },
    { title: "Demo Hotel (ukázka)", url: "https://martinromanbiz-cpu.github.io/chatbottest/" }
  ];
})();
