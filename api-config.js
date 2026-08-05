// ── API Configuration ──
// If you publish this site on Replit, replace the URL below with your
// published Replit URL (e.g. https://rituals-makhana.yourname.repl.co)
// For now, it points to the Replit dev server.

(function () {
  // On Replit itself — use relative paths
  if (window.location.hostname.includes('replit') ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1') {
    window.API_BASE = '';
  } else {
    // On external hosting (Hostinger etc.) — point to Replit backend
    // TODO: Replace with your published Replit URL after clicking "Publish"
    window.API_BASE = 'https://8461802b-0311-424c-92cf-c609dd785ef0-00-38u5faesnsfkk.sisko.replit.dev';
  }
})();
