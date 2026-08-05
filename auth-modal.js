/* ── Rituals Auth Modal ─────────────────────────────────────────────────────
   Drop this script into any page that has #rituals-nav-links.
   It injects a "Sign In" button into the nav and handles a login/register
   modal using the existing /api/auth/* endpoints.
──────────────────────────────────────────────────────────────────────────── */

(function () {
  /* ── STYLES ── */
  const style = document.createElement('style');
  style.textContent = `
    /* Ensure nav links list is always horizontal flex without bullet points */
    #rituals-nav-links, .nav-links {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      gap: 20px !important;
      list-style: none !important;
      list-style-type: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    /* Hide nav links on mobile — hamburger takes over */
    @media (max-width: 768px) {
      #rituals-nav-links, .nav-links { display: none !important; }
    }
    #rituals-nav-links li, .nav-links li {
      display: inline-flex !important;
      align-items: center !important;
      list-style: none !important;
      list-style-type: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    #rituals-nav-links li::marker, .nav-links li::marker {
      content: "" !important;
      display: none !important;
    }

    /* Nav auth button */
    #nav-auth-btn {
      background: transparent;
      border: 1.5px solid rgba(59,47,30,0.22);
      color: #5C4A38;
      padding: 8px 18px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      letter-spacing: 0.02em;
      transition: border-color .18s, color .18s, background .18s;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    #nav-auth-btn:hover { border-color: #3B2F1E; color: #2E1F0F; background: rgba(59,47,30,0.04); }

    /* User pill when logged in */
    #nav-user-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    #nav-user-name {
      font-size: 13px;
      font-weight: 600;
      color: #3B2F1E;
      white-space: nowrap;
    }
    #nav-user-sep {
      color: #c4b49a;
      font-size: 12px;
      user-select: none;
    }
    #nav-logout-btn {
      font-size: 12px;
      color: #9c8878;
      cursor: pointer;
      background: none;
      border: none;
      font-family: 'DM Sans', sans-serif;
      text-decoration: underline;
      text-underline-offset: 2px;
      padding: 0;
      white-space: nowrap;
      transition: color .15s;
    }
    #nav-logout-btn:hover { color: #3B2F1E; }
    #nav-auth-li { white-space: nowrap; }

    /* Overlay */
    #auth-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(30,20,10,0.38);
      z-index: 99998;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      opacity: 0;
      pointer-events: none;
      transition: opacity .22s;
    }
    #auth-modal-overlay.open {
      opacity: 1;
      pointer-events: all;
    }

    /* Modal box */
    #auth-modal-box {
      background: #F5EFE6;
      border-radius: 24px;
      padding: 36px 32px;
      width: 100%;
      max-width: 400px;
      position: relative;
      box-shadow: 0 20px 60px rgba(30,20,10,0.22);
      transform: translateY(12px);
      transition: transform .22s;
    }
    #auth-modal-overlay.open #auth-modal-box { transform: translateY(0); }

    #auth-modal-close {
      position: absolute;
      top: 16px;
      right: 18px;
      background: none;
      border: none;
      cursor: pointer;
      color: #9c8878;
      font-size: 22px;
      line-height: 1;
      padding: 4px;
      transition: color .15s;
    }
    #auth-modal-close:hover { color: #3B2F1E; }

    /* Tabs */
    .am-tabs {
      display: flex;
      margin-bottom: 28px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(59,47,30,0.12);
    }
    .am-tab {
      flex: 1;
      padding: 10px;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      background: transparent;
      border: none;
      color: #5C4A38;
      font-family: 'DM Sans', sans-serif;
      transition: background .18s, color .18s;
    }
    .am-tab.active { background: #3B2F1E; color: #F5EFE6; }

    /* Form elements */
    .am-group { margin-bottom: 18px; }
    .am-group label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: #5C4A38;
      margin-bottom: 7px;
      font-family: 'DM Sans', sans-serif;
    }
    .am-group input {
      width: 100%;
      padding: 12px 16px;
      border-radius: 12px;
      border: 1.5px solid rgba(59,47,30,0.12);
      background: #EDE6DA;
      font-size: 0.9375rem;
      font-family: 'DM Sans', sans-serif;
      color: #2E1F0F;
      outline: none;
      transition: border-color .18s;
      box-sizing: border-box;
    }
    .am-group input:focus { border-color: #C49A3C; }

    .am-btn {
      display: block;
      width: 100%;
      padding: 13px 28px;
      border-radius: 100px;
      background: #3B2F1E;
      color: #F5EFE6;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: .04em;
      border: none;
      cursor: pointer;
      font-family: 'DM Sans', sans-serif;
      transition: background .18s;
      margin-top: 4px;
    }
    .am-btn:hover { background: #2C2215; }
    .am-btn:disabled { opacity: .55; cursor: default; }

    .am-error {
      background: #fdf0ec;
      color: #b04030;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 16px;
      font-family: 'DM Sans', sans-serif;
      display: none;
    }
    .am-error.show { display: block; }

    .am-logo-row {
      text-align: center;
      margin-bottom: 22px;
    }
    .am-logo-row .am-brand {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: 1.35rem;
      color: #3B2F1E;
      letter-spacing: -.02em;
    }
    .am-logo-row .am-tagline {
      font-size: 12px;
      color: #9c8878;
      margin-top: 3px;
    }

    @media (max-width: 480px) {
      #auth-modal-box { padding: 28px 20px; }
    }
  `;
  document.head.appendChild(style);

  /* ── NAV INJECTION ── */
  function injectNav(user) {
    const list = document.getElementById('rituals-nav-links');
    if (!list) return;

    // Inject cart button if not already in nav
    if (!document.getElementById('nav-cart-btn') && !document.getElementById('nav-cart-li')) {
      const cartLi = document.createElement('li');
      cartLi.id = 'nav-cart-li';
      cartLi.innerHTML = `
        <button id="nav-cart-btn" onclick="window.__authModal.toggleCart()" title="View cart" style="background:none;border:none;cursor:pointer;color:#3B2F1E;position:relative;display:flex;align-items:center;padding:4px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          <span id="cart-badge" style="position:absolute;top:-4px;right:-6px;background:#3B2F1E;color:#F5EFE6;font-size:10px;font-weight:700;border-radius:100px;min-width:18px;height:18px;display:none;align-items:center;justify-content:center;padding:0 4px;">0</span>
        </button>`;
      const items = list.querySelectorAll('li');
      const last = items[items.length - 1];
      list.insertBefore(cartLi, last);
    }

    // Remove existing auth item if any
    const existing = document.getElementById('nav-auth-li');
    if (existing) existing.remove();

    const li = document.createElement('li');
    li.id = 'nav-auth-li';

    if (user) {
      li.innerHTML = `
        <div id="nav-user-pill">
          <a href="/profile/" id="nav-user-name" style="text-decoration:none;color:#3B2F1E;">Hi, ${esc(user.name.split(' ')[0])}</a>
          <span id="nav-user-sep">·</span>
          <a href="/profile/" id="nav-orders-link" style="font-size:12px;color:#9c8878;text-decoration:underline;text-underline-offset:2px;white-space:nowrap;">My Orders</a>
          <span id="nav-user-sep2" style="color:#c4b49a;font-size:12px;user-select:none;">·</span>
          <button id="nav-logout-btn" onclick="window.__authModal.logout()">Sign out</button>
        </div>`;
    } else {
      li.innerHTML = `
        <button id="nav-auth-btn" onclick="window.__authModal.open()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Sign In
        </button>`;
    }

    // Insert before the last li (Shop Now)
    const items = list.querySelectorAll('li');
    const last = items[items.length - 1];
    list.insertBefore(li, last);

    syncCartBadge();
  }

  /* ── MODAL HTML ── */
  const overlay = document.createElement('div');
  overlay.id = 'auth-modal-overlay';
  overlay.innerHTML = `
    <div id="auth-modal-box" role="dialog" aria-modal="true" aria-label="Sign in to Rituals">
      <button id="auth-modal-close" onclick="window.__authModal.close()" aria-label="Close">✕</button>
      <div class="am-logo-row">
        <div class="am-brand">Rituals Makhana</div>
        <div class="am-tagline">Your wellness journey starts here</div>
      </div>
      <div class="am-tabs">
        <button class="am-tab active" id="am-tab-login" onclick="window.__authModal.tab('login')">Sign in</button>
        <button class="am-tab" id="am-tab-register" onclick="window.__authModal.tab('register')">Create account</button>
      </div>

      <!-- Login -->
      <form id="am-login-form" onsubmit="window.__authModal.login(event)">
        <div class="am-error" id="am-login-err"></div>
        <div class="am-group">
          <label>Email</label>
          <input type="email" id="am-login-email" placeholder="you@email.com" autocomplete="email" required/>
        </div>
        <div class="am-group">
          <label>Password</label>
          <input type="password" id="am-login-pwd" placeholder="••••••••" autocomplete="current-password" required/>
        </div>
        <button class="am-btn" type="submit" id="am-login-btn">Sign in</button>
      </form>

      <!-- Register -->
      <form id="am-register-form" onsubmit="window.__authModal.register(event)" style="display:none">
        <div class="am-error" id="am-register-err"></div>
        <div class="am-group">
          <label>Full name</label>
          <input type="text" id="am-reg-name" placeholder="Arjun Sharma" autocomplete="name" required/>
        </div>
        <div class="am-group">
          <label>Email</label>
          <input type="email" id="am-reg-email" placeholder="you@email.com" autocomplete="email" required/>
        </div>
        <div class="am-group">
          <label>Password</label>
          <input type="password" id="am-reg-pwd" placeholder="Min 6 characters" autocomplete="new-password" required minlength="6"/>
        </div>
        <button class="am-btn" type="submit" id="am-register-btn">Create account</button>
      </form>
    </div>`;
  document.body.appendChild(overlay);

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) window.__authModal.close();
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) window.__authModal.close();
  });

  /* ── AUTH LOGIC ── */
  let currentUser = null;

  async function checkSession() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      currentUser = data.user || null;
    } catch (_) {
      currentUser = null;
    }
    injectNav(currentUser);
    // Auto-open sign-in modal for visitors who aren't logged in
    if (!currentUser) {
      setTimeout(() => {
        if (window.__authModal) window.__authModal.open();
      }, 600);
    }
  }

  window.__authModal = {
    getUser() { return currentUser; },
    _onLogin: null,          // optional one-shot callback fired after sign-in/register
    requireAuth(callback) {
      if (currentUser) {
        if (typeof callback === 'function') callback();
        return true;
      } else {
        this._onLogin = callback;
        this.open();
        return false;
      }
    },
    open() {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      // Focus first input
      setTimeout(() => {
        const inp = document.getElementById('am-login-email');
        if (inp) inp.focus();
      }, 80);
    },
    close() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    },
    tab(t) {
      document.getElementById('am-login-form').style.display    = t === 'login'    ? '' : 'none';
      document.getElementById('am-register-form').style.display = t === 'register' ? '' : 'none';
      document.getElementById('am-tab-login').classList.toggle('active', t === 'login');
      document.getElementById('am-tab-register').classList.toggle('active', t === 'register');
      clearErr('am-login-err');
      clearErr('am-register-err');
    },
    async login(e) {
      e.preventDefault();
      const email = document.getElementById('am-login-email').value.trim();
      const pwd   = document.getElementById('am-login-pwd').value;
      const btn   = document.getElementById('am-login-btn');
      clearErr('am-login-err');
      btn.disabled = true; btn.textContent = 'Signing in…';
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ email, password: pwd })
        });
        const data = await res.json();
        if (!res.ok) { showErr('am-login-err', data.error || 'Login failed'); return; }
        currentUser = data;
        injectNav(currentUser);
        window.__authModal.close();
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentUser }));
        const cb = window.__authModal._onLogin; window.__authModal._onLogin = null; if (cb) cb();
      } catch (err) {
        showErr('am-login-err', err.message || 'Network error. Please try again.');
      } finally {
        btn.disabled = false; btn.textContent = 'Sign in';
      }
    },
    async register(e) {
      e.preventDefault();
      const name  = document.getElementById('am-reg-name').value.trim();
      const email = document.getElementById('am-reg-email').value.trim();
      const pwd   = document.getElementById('am-reg-pwd').value;
      const btn   = document.getElementById('am-register-btn');
      clearErr('am-register-err');
      btn.disabled = true; btn.textContent = 'Creating account…';
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ name, email, password: pwd })
        });
        let data;
        try { data = await res.json(); } catch (_) { data = {}; }
        if (!res.ok) { showErr('am-register-err', data.error || 'Account creation failed. Please try again.'); return; }
        currentUser = data;
        injectNav(currentUser);
        window.__authModal.close();
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: currentUser }));
        const cb = window.__authModal._onLogin; window.__authModal._onLogin = null; if (cb) cb();
      } catch (err) {
        showErr('am-register-err', err.message || 'Network error. Please try again.');
      } finally {
        btn.disabled = false; btn.textContent = 'Create account';
      }
    },
    async logout() {
      await fetch('/api/auth/logout', { method: 'POST' });
      currentUser = null;
      injectNav(null);
    },
    toggleCart() {
      if (typeof window.toggleCart === 'function') {
        window.toggleCart();
      } else {
        window.location.href = '/products/';
      }
    },
    syncCartBadge() {
      syncCartBadge();
    }
  };

  /* ── CART SYNC UTILS ── */
  function syncCartBadge() {
    try {
      const saved = localStorage.getItem('rituals_cart');
      const cart = saved ? JSON.parse(saved) : {};
      const items = Object.values(cart).filter(i => i && i.qty > 0);
      const totalQty = items.reduce((s, i) => s + i.qty, 0);

      document.querySelectorAll('#cart-badge, .cart-badge').forEach(badge => {
        if (totalQty > 0) {
          badge.textContent = totalQty > 9 ? '9+' : totalQty;
          badge.style.display = 'flex';
        } else {
          badge.textContent = '0';
          badge.style.display = 'none';
        }
      });
    } catch (_) {}
  }

  window.addEventListener('storage', (e) => {
    if (e.key === 'rituals_cart') syncCartBadge();
  });
  window.addEventListener('cart-updated', syncCartBadge);

  /* ── UTILS ── */
  function showErr(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
  }
  function clearErr(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('show');
  }
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  window.requireAuth = function(callback) {
    if (window.__authModal) {
      return window.__authModal.requireAuth(callback);
    } else {
      if (typeof callback === 'function') callback();
      return true;
    }
  };

  /* ── INIT ── */
  checkSession();
})();
