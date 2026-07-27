(() => {
  'use strict';

  const DATA_EL_ID = 'eizo-booking-widget-data';
  const SEEN_KEY = 'eizo_bw_seen';
  const POPUP_CLOSED_KEY = 'eizo_bw_popup_closed';
  const LS = (() => {
    try { return window.localStorage; } catch { return null; }
  })();

  function readConfig() {
    const el = document.getElementById(DATA_EL_ID);
    if (!el) return null;
    try {
      return JSON.parse(el.textContent.trim() || '{}');
    } catch {
      console.error('[EIZO Booking] Invalid widget data');
      return null;
    }
  }

  const CONFIG = readConfig();
  if (!CONFIG) return;

  const API_URL = (CONFIG.apiUrl || '').replace(/\/$/, '');
  const ORGANIZER_ID = CONFIG.organizerId || 'fred';
  const COLOR_TAG = (CONFIG.coloredgeTag || 'coloredge').toLowerCase();
  const TEMPLATE = CONFIG.template || '';
  const POPUP_DELAY_MS = 0;

  const state = {
    organizer: null,
    currentMonth: new Date(),
    selectedDate: null,
    selectedSlot: null,
    popupShown: false,
  };

  function getInitials(name = '') {
    return name
      .split(' ')
      .map(n => n[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  function isColorEdgeProduct() {
    // Forcer temporairement l'affichage sur les collections/pages hors produit
    return TEMPLATE !== 'product';
  }

  function readSeen() {
    if (!LS) return [];
    try {
      return JSON.parse(LS.getItem(SEEN_KEY) || '[]');
    } catch { return []; }
  }

  function saveSeen(list) {
    if (!LS) return;
    try { LS.setItem(SEEN_KEY, JSON.stringify(list.slice(-10))); } catch {}
  }

  function isPopupClosed() {
    if (!LS) return false;
    try { return LS.getItem(POPUP_CLOSED_KEY) === 'true'; } catch { return false; }
  }

  function markPopupClosed() {
    if (!LS) return;
    try { LS.setItem(POPUP_CLOSED_KEY, 'true'); } catch {}
  }

  function trackView() {
    if (!isColorEdgeProduct()) return 0;
    const key = CONFIG.productHandle || TEMPLATE || window.location.pathname || '';
    if (!key) return 0;
    const seen = readSeen().filter(h => h !== key);
    seen.push(key);
    saveSeen(seen);
    return seen.length;
  }

  function shouldShowPopup() {
    if (!CONFIG.showPopup) return false;
    if (TEMPLATE === 'product') return false;
    if (!isColorEdgeProduct()) return false;
    if (isPopupClosed()) return false;
    const threshold = parseInt(CONFIG.triggerThreshold || '3', 10);
    const count = trackView();
    return count >= threshold;
  }

  async function fetchOrganizer() {
    const res = await fetch(`${API_URL}/api/public/organizers/${encodeURIComponent(ORGANIZER_ID)}`);
    if (!res.ok) throw new Error('Organizer not found');
    return res.json();
  }

  async function fetchSlots(date) {
    const res = await fetch(`${API_URL}/api/public/availability/${encodeURIComponent(ORGANIZER_ID)}?date=${date}`);
    if (!res.ok) throw new Error('Failed to load slots');
    return res.json();
  }

  async function createBooking(payload) {
    const res = await fetch(`${API_URL}/api/public/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizerId: ORGANIZER_ID,
        ...payload,
        productId: CONFIG.productId,
        productTitle: CONFIG.productTitle,
        productHandle: CONFIG.productHandle,
        shopDomain: CONFIG.shopDomain,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Booking failed');
    return data;
  }

  function injectStyles() {
    if (document.getElementById('eizo-bw-styles')) return;
    const style = document.createElement('style');
    style.id = 'eizo-bw-styles';
    style.textContent = `
      :root {
        --eizo-primary: #0066CC;
        --eizo-primary-10: rgba(0,102,204,0.1);
        --eizo-text: #0B1220;
        --eizo-muted: #5E6A7E;
        --eizo-border: #E3E8EF;
        --eizo-bg: #F6F8FB;
        --eizo-white: #FFFFFF;
        --eizo-success: #10B981;
        --eizo-danger: #EF4444;
        --eizo-radius: 16px;
        --eizo-shadow: 0 4px 24px rgba(0,0,0,0.08);
        --eizo-shadow-lg: 0 25px 60px rgba(0,0,0,0.18);
      }
      .eizo-bw-hidden { display: none !important; }
      .eizo-bw-popup {
        position: fixed; bottom: 24px; right: 24px; z-index: 9000;
        width: min(420px, calc(100vw - 32px));
        background: var(--eizo-white); border-radius: var(--eizo-radius);
        box-shadow: var(--eizo-shadow-lg); padding: 22px;
        opacity: 0; transform: translateY(16px) scale(0.97);
        transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1);
        pointer-events: none;
      }
      .eizo-bw-popup.eizo-bw-active { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
      .eizo-bw-popup-close { position: absolute; top: 10px; right: 10px; width: 32px; height: 32px; border: none; background: transparent; border-radius: 50%; cursor: pointer; color: var(--eizo-muted); font-size: 20px; line-height: 1; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
      .eizo-bw-popup-close:hover { background: var(--eizo-bg); color: var(--eizo-text); }
      .eizo-bw-popup-header { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
      .eizo-bw-popup-avatar { width: 52px; height: 52px; border-radius: 50%; background: var(--eizo-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; flex-shrink: 0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,102,204,0.2); }
      .eizo-bw-popup-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .eizo-bw-popup-title { font-size: 17px; font-weight: 700; color: var(--eizo-text); margin: 0 0 2px; padding-right: 24px; }
      .eizo-bw-popup-subtitle { font-size: 13px; color: var(--eizo-primary); font-weight: 600; margin: 0; }
      .eizo-bw-popup-text { font-size: 14px; color: var(--eizo-muted); margin: 0 0 18px; line-height: 1.5; }
      .eizo-bw-popup-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 22px; border: none; border-radius: 10px; background: var(--eizo-primary); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; transition: filter 0.2s, transform 0.2s; }
      .eizo-bw-popup-btn:hover { filter: brightness(0.93); transform: translateY(-1px); }
      .eizo-bw-fab { position: fixed; bottom: 24px; right: 24px; z-index: 9000; padding: 14px 20px; border: none; border-radius: 50px; background: var(--eizo-primary); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: var(--eizo-shadow); opacity: 0; transform: translateY(10px); transition: opacity 0.3s, transform 0.3s; }
      .eizo-bw-fab.eizo-bw-active { opacity: 1; transform: translateY(0); }
      .eizo-bw-fab:hover { filter: brightness(0.93); }
      .eizo-bw-backdrop { position: fixed; inset: 0; z-index: 10000; display: none; align-items: center; justify-content: center; background: rgba(11,18,32,0.45); backdrop-filter: blur(4px); opacity: 0; transition: opacity 0.3s ease; padding: 16px; }
      .eizo-bw-backdrop.eizo-bw-active { display: flex; opacity: 1; }
      .eizo-bw-modal { position: relative; width: min(960px, 100%); max-height: calc(100vh - 32px); background: var(--eizo-white); border-radius: var(--eizo-radius); box-shadow: var(--eizo-shadow-lg); overflow: hidden; display: grid; grid-template-columns: 300px 1fr; opacity: 0; transform: translateY(24px) scale(0.98); transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1); }
      .eizo-bw-backdrop.eizo-bw-active .eizo-bw-modal { opacity: 1; transform: translateY(0) scale(1); }
      .eizo-bw-close { position: absolute; top: 16px; right: 16px; z-index: 10; width: 36px; height: 36px; border: none; background: rgba(246,248,251,0.9); border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--eizo-muted); transition: background 0.2s, color 0.2s; }
      .eizo-bw-close:hover { background: var(--eizo-bg); color: var(--eizo-text); }
      .eizo-bw-sidebar { background: var(--eizo-bg); padding: 32px 28px; border-right: 1px solid var(--eizo-border); overflow-y: auto; }
      .eizo-bw-avatar { width: 80px; height: 80px; border-radius: 50%; background: var(--eizo-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 600; margin-bottom: 20px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,102,204,0.2); }
      .eizo-bw-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .eizo-bw-name { font-size: 20px; font-weight: 700; color: var(--eizo-text); margin: 0 0 4px; }
      .eizo-bw-specialty { font-size: 14px; font-weight: 600; color: var(--eizo-primary); margin: 0 0 12px; }
      .eizo-bw-description { font-size: 14px; line-height: 1.6; color: var(--eizo-muted); }
      .eizo-bw-main { padding: 32px; overflow-y: auto; min-height: 560px; }
      .eizo-bw-step { display: none; }
      .eizo-bw-step.eizo-bw-active { display: block; }
      .eizo-bw-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
      .eizo-bw-heading { font-size: 20px; font-weight: 700; color: var(--eizo-text); margin: 0; }
      .eizo-bw-nav { display: flex; align-items: center; gap: 14px; }
      .eizo-bw-nav-btn { width: 34px; height: 34px; border: 1px solid var(--eizo-border); background: #fff; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--eizo-text); transition: border-color 0.2s, color 0.2s, background 0.2s; }
      .eizo-bw-nav-btn:hover { border-color: var(--eizo-primary); color: var(--eizo-primary); background: var(--eizo-primary-10); }
      .eizo-bw-month-label { font-weight: 700; color: var(--eizo-text); min-width: 150px; text-align: center; font-size: 15px; }
      .eizo-bw-calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 26px; }
      .eizo-bw-day-label { text-align: center; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: var(--eizo-muted); padding: 10px 0; }
      .eizo-bw-day { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border: 1px solid transparent; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; color: var(--eizo-text); background: transparent; transition: all 0.2s; }
      .eizo-bw-day:hover:not(.eizo-bw-disabled):not(.eizo-bw-empty) { border-color: var(--eizo-primary); background: var(--eizo-primary-10); }
      .eizo-bw-day.eizo-bw-today { border-color: var(--eizo-primary); color: var(--eizo-primary); font-weight: 700; }
      .eizo-bw-day.eizo-bw-selected { background: var(--eizo-primary); color: #fff; border-color: var(--eizo-primary); }
      .eizo-bw-day.eizo-bw-disabled { color: #CBD5E1; cursor: not-allowed; }
      .eizo-bw-day.eizo-bw-empty { cursor: default; }
      .eizo-bw-slots-title { font-size: 15px; font-weight: 700; color: var(--eizo-text); margin-bottom: 14px; }
      .eizo-bw-slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
      .eizo-bw-slot { padding: 13px 10px; border: 1.5px solid var(--eizo-border); background: #fff; border-radius: 12px; text-align: center; cursor: pointer; font-size: 14px; font-weight: 600; color: var(--eizo-text); transition: all 0.2s; }
      .eizo-bw-slot:hover { border-color: var(--eizo-primary); color: var(--eizo-primary); background: var(--eizo-primary-10); }
      .eizo-bw-slot.eizo-bw-selected { background: var(--eizo-primary); color: #fff; border-color: var(--eizo-primary); }
      .eizo-bw-form-title { font-size: 18px; font-weight: 700; color: var(--eizo-text); margin: 0 0 6px; }
      .eizo-bw-form-subtitle { font-size: 14px; color: var(--eizo-muted); margin-bottom: 24px; }
      .eizo-bw-back { background: none; border: none; color: var(--eizo-muted); font-size: 14px; cursor: pointer; margin-bottom: 18px; padding: 0; display: inline-flex; align-items: center; gap: 6px; transition: color 0.2s; }
      .eizo-bw-back:hover { color: var(--eizo-primary); }
      .eizo-bw-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
      .eizo-bw-form-group { margin-bottom: 16px; }
      .eizo-bw-form-label { display: block; font-size: 13px; font-weight: 700; color: var(--eizo-text); margin-bottom: 6px; }
      .eizo-bw-form-input, .eizo-bw-form-textarea { width: 100%; padding: 13px 14px; border: 1px solid var(--eizo-border); border-radius: 10px; font-size: 15px; color: var(--eizo-text); background: #fff; font-family: inherit; transition: border-color 0.2s, box-shadow 0.2s; }
      .eizo-bw-form-input:focus, .eizo-bw-form-textarea:focus { outline: none; border-color: var(--eizo-primary); box-shadow: 0 0 0 3px var(--eizo-primary-10); }
      .eizo-bw-form-textarea { resize: vertical; min-height: 90px; }
      .eizo-bw-submit { width: 100%; padding: 15px; border: none; border-radius: 10px; background: var(--eizo-primary); color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; transition: filter 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px; }
      .eizo-bw-submit:hover:not(:disabled) { filter: brightness(0.93); }
      .eizo-bw-submit:disabled { opacity: 0.7; cursor: not-allowed; }
      .eizo-bw-loader { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: eizo-bw-spin 0.8s linear infinite; }
      @keyframes eizo-bw-spin { to { transform: rotate(360deg); } }
      .eizo-bw-success { text-align: center; padding: 48px 20px; }
      .eizo-bw-success-icon { width: 64px; height: 64px; margin: 0 auto 24px; border-radius: 50%; background: rgba(16,185,129,0.1); color: var(--eizo-success); display: flex; align-items: center; justify-content: center; font-size: 30px; }
      .eizo-bw-success-title { font-size: 22px; font-weight: 700; color: var(--eizo-text); margin: 0 0 10px; }
      .eizo-bw-success-text { font-size: 15px; color: var(--eizo-muted); line-height: 1.5; }
      .eizo-bw-error { padding: 14px; border-radius: 10px; background: #FEF2F2; color: var(--eizo-danger); font-size: 14px; margin-bottom: 16px; }
      @media (max-width: 740px) {
        .eizo-bw-popup { left: 16px; right: 16px; bottom: 16px; width: auto; padding: 18px; }
        .eizo-bw-modal { width: 100%; height: 100%; max-height: none; border-radius: 0; grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
        .eizo-bw-sidebar { border-right: none; border-bottom: 1px solid var(--eizo-border); padding: 20px 24px; display: flex; align-items: center; gap: 18px; }
        .eizo-bw-avatar { width: 56px; height: 56px; font-size: 18px; margin-bottom: 0; flex-shrink: 0; }
        .eizo-bw-description { display: none; }
        .eizo-bw-main { padding: 22px; min-height: auto; }
        .eizo-bw-form-row { grid-template-columns: 1fr; }
        .eizo-bw-calendar { gap: 6px; }
        .eizo-bw-day { font-size: 13px; }
      }
    `;
    document.head.appendChild(style);
  }

  async function buildWidget() {
    if (state.widgetBuilt) return;
    state.widgetBuilt = true;
    injectStyles();

    state.organizer = await fetchOrganizer().catch(err => {
      console.error('[EIZO Booking]', err);
      return null;
    });

    const org = state.organizer || {};
    const popupAvatar = org.avatar_url
      ? `<img src="${escapeHtml(org.avatar_url)}" alt="${escapeHtml(org.name || 'Expert')}">`
      : getInitials(org.name || 'EIZO');
    const popup = document.createElement('div');
    popup.id = 'eizo-bw-popup';
    popup.className = 'eizo-bw-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-label', 'Prendre rendez-vous');
    popup.innerHTML = `
      <button class="eizo-bw-popup-close" aria-label="Fermer">×</button>
      <div class="eizo-bw-popup-header">
        <div class="eizo-bw-popup-avatar">${popupAvatar}</div>
        <div class="eizo-bw-popup-meta">
          <h3 class="eizo-bw-popup-title">Réserver une démonstration</h3>
          <p class="eizo-bw-popup-subtitle">Avec ${escapeHtml(org.name || 'nos experts EIZO')}</p>
        </div>
      </div>
      <p class="eizo-bw-popup-text">Besoin d'aide pour choisir votre écran ColorEdge ? Réservez un créneau personnalisé.</p>
      <button class="eizo-bw-popup-btn" type="button" id="eizo-bw-popup-cta">Choisir un créneau</button>
    `;

    const fab = document.createElement('button');
    fab.id = 'eizo-bw-fab';
    fab.className = 'eizo-bw-fab';
    fab.type = 'button';
    fab.textContent = 'Prendre rendez-vous';

    const backdrop = document.createElement('div');
    backdrop.id = 'eizo-bw-backdrop';
    backdrop.className = 'eizo-bw-backdrop';
    backdrop.innerHTML = `
      <div class="eizo-bw-modal" role="dialog" aria-modal="true" aria-label="Réserver une démonstration">
        <button class="eizo-bw-close" aria-label="Fermer">×</button>
        <aside class="eizo-bw-sidebar">
          <div class="eizo-bw-avatar" id="eizo-bw-avatar"></div>
          <div>
            <h3 class="eizo-bw-name" id="eizo-bw-name"></h3>
            <p class="eizo-bw-specialty" id="eizo-bw-specialty"></p>
          </div>
          <p class="eizo-bw-description" id="eizo-bw-description"></p>
        </aside>
        <div class="eizo-bw-main">
          <div class="eizo-bw-step eizo-bw-active" id="eizo-bw-step-calendar">
            <div class="eizo-bw-header">
              <h2 class="eizo-bw-heading">Choisir une date</h2>
              <div class="eizo-bw-nav">
                <button class="eizo-bw-nav-btn" id="eizo-bw-prev" aria-label="Mois précédent">‹</button>
                <span class="eizo-bw-month-label" id="eizo-bw-month"></span>
                <button class="eizo-bw-nav-btn" id="eizo-bw-next" aria-label="Mois suivant">›</button>
              </div>
            </div>
            <div class="eizo-bw-calendar" id="eizo-bw-calendar"></div>
            <div id="eizo-bw-slots-area"></div>
          </div>
          <div class="eizo-bw-step" id="eizo-bw-step-form">
            <button class="eizo-bw-back" id="eizo-bw-back" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Choisir une autre date
            </button>
            <h2 class="eizo-bw-form-title">Confirmer le rendez-vous</h2>
            <p class="eizo-bw-form-subtitle" id="eizo-bw-selected-datetime"></p>
            <div id="eizo-bw-error" class="eizo-bw-error eizo-bw-hidden"></div>
            <form id="eizo-bw-form">
              <div class="eizo-bw-form-row">
                <div class="eizo-bw-form-group">
                  <label class="eizo-bw-form-label" for="eizo-bw-first-name">Prénom *</label>
                  <input class="eizo-bw-form-input" id="eizo-bw-first-name" name="firstName" type="text" required placeholder="Jean">
                </div>
                <div class="eizo-bw-form-group">
                  <label class="eizo-bw-form-label" for="eizo-bw-last-name">Nom *</label>
                  <input class="eizo-bw-form-input" id="eizo-bw-last-name" name="lastName" type="text" required placeholder="Dupont">
                </div>
              </div>
              <div class="eizo-bw-form-group">
                <label class="eizo-bw-form-label" for="eizo-bw-email">Email *</label>
                <input class="eizo-bw-form-input" id="eizo-bw-email" name="email" type="email" required placeholder="jean@example.com">
              </div>
              <div class="eizo-bw-form-group">
                <label class="eizo-bw-form-label" for="eizo-bw-phone">Téléphone</label>
                <input class="eizo-bw-form-input" id="eizo-bw-phone" name="phone" type="tel" placeholder="+33 6 12 34 56 78">
              </div>
              <div class="eizo-bw-form-group">
                <label class="eizo-bw-form-label" for="eizo-bw-notes">Notes / Questions</label>
                <textarea class="eizo-bw-form-textarea" id="eizo-bw-notes" name="notes" rows="3" placeholder="Décrivez votre besoin..."></textarea>
              </div>
              <button class="eizo-bw-submit" type="submit">Confirmer le rendez-vous</button>
            </form>
          </div>
          <div class="eizo-bw-step" id="eizo-bw-step-success">
            <div class="eizo-bw-success">
              <div class="eizo-bw-success-icon">✓</div>
              <h3 class="eizo-bw-success-title">Rendez-vous confirmé</h3>
              <p class="eizo-bw-success-text">Vous allez recevoir un email de confirmation.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    document.body.appendChild(fab);
    document.body.appendChild(backdrop);

    renderSidebar();
    bindEvents(popup, fab, backdrop);
  }

  function renderSidebar() {
    const org = state.organizer;
    const avatar = document.getElementById('eizo-bw-avatar');
    const name = document.getElementById('eizo-bw-name');
    const specialty = document.getElementById('eizo-bw-specialty');
    const description = document.getElementById('eizo-bw-description');
    if (!org || !avatar) return;

    name.textContent = org.name;
    specialty.textContent = org.specialty || 'Expert EIZO';
    description.textContent = org.description || '';

    if (org.avatar_url) {
      avatar.innerHTML = `<img src="${escapeHtml(org.avatar_url)}" alt="${escapeHtml(org.name)}">`;
    } else {
      avatar.textContent = getInitials(org.name);
    }
  }

  function bindEvents(popup, fab, backdrop) {
    popup.querySelector('.eizo-bw-popup-close').addEventListener('click', () => {
      popup.classList.remove('eizo-bw-active');
      markPopupClosed();
    });
    popup.querySelector('#eizo-bw-popup-cta').addEventListener('click', () => {
      popup.classList.remove('eizo-bw-active');
      openModal();
    });

    fab.addEventListener('click', openModal);

    backdrop.querySelector('.eizo-bw-close').addEventListener('click', closeModal);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    document.getElementById('eizo-bw-prev').addEventListener('click', () => changeMonth(-1));
    document.getElementById('eizo-bw-next').addEventListener('click', () => changeMonth(1));
    document.getElementById('eizo-bw-back').addEventListener('click', showCalendar);
    document.getElementById('eizo-bw-form').addEventListener('submit', submitBooking);
  }

  function showPopup() {
    if (state.popupShown) return;
    state.popupShown = true;
    const popup = document.getElementById('eizo-bw-popup');
    if (popup) popup.classList.add('eizo-bw-active');
  }

  function showFab() {
    const fab = document.getElementById('eizo-bw-fab');
    if (fab && CONFIG.showBookingButton) fab.classList.add('eizo-bw-active');
  }

  async function openModal() {
    const backdrop = document.getElementById('eizo-bw-backdrop');
    if (!backdrop) return;
    if (!state.organizer) await buildWidget();
    backdrop.classList.add('eizo-bw-active');
    document.body.style.overflow = 'hidden';
    renderCalendar(state.currentMonth);
  }

  function closeModal() {
    const backdrop = document.getElementById('eizo-bw-backdrop');
    if (backdrop) backdrop.classList.remove('eizo-bw-active');
    document.body.style.overflow = '';
  }

  function changeMonth(delta) {
    state.currentMonth.setMonth(state.currentMonth.getMonth() + delta);
    renderCalendar(state.currentMonth);
  }

  function renderCalendar(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startOffset = firstDay.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthLabel = document.getElementById('eizo-bw-month');
    monthLabel.textContent = new Date(year, month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const calendar = document.getElementById('eizo-bw-calendar');
    calendar.innerHTML = '';

    ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].forEach(day => {
      const el = document.createElement('div');
      el.className = 'eizo-bw-day-label';
      el.textContent = day;
      calendar.appendChild(el);
    });

    for (let i = 0; i < startOffset; i++) {
      const empty = document.createElement('div');
      empty.className = 'eizo-bw-day eizo-bw-empty';
      calendar.appendChild(empty);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const dateStr = dateObj.toISOString().split('T')[0];
      const isPast = dateObj < today;
      const isToday = dateObj.getTime() === today.getTime();
      const classes = ['eizo-bw-day'];
      if (isPast) classes.push('eizo-bw-disabled');
      if (isToday) classes.push('eizo-bw-today');
      if (state.selectedDate === dateStr) classes.push('eizo-bw-selected');

      const cell = document.createElement('div');
      cell.className = classes.join(' ');
      cell.textContent = day;
      if (!isPast) {
        cell.addEventListener('click', () => {
          state.selectedDate = dateStr;
          renderCalendar(monthDate);
          loadSlots(dateStr);
        });
      }
      calendar.appendChild(cell);
    }
  }

  async function loadSlots(date) {
    const area = document.getElementById('eizo-bw-slots-area');
    area.innerHTML = '<p style="color: var(--eizo-muted); font-size: 14px;">Chargement des créneaux...</p>';

    try {
      const { slots } = await fetchSlots(date);
      const available = (slots || []).filter(s => s.available);

      if (available.length === 0) {
        area.innerHTML = '<p style="color: var(--eizo-muted); font-size: 14px;">Aucun créneau disponible pour cette date.</p>';
        return;
      }

      area.innerHTML = `
        <h3 class="eizo-bw-slots-title">${available.length} créneau${available.length > 1 ? 'x' : ''} disponible${available.length > 1 ? 's' : ''}</h3>
        <div class="eizo-bw-slots">
          ${available.map(slot => `<button type="button" class="eizo-bw-slot" data-time="${slot.time}">${slot.time}</button>`).join('')}
        </div>
      `;

      area.querySelectorAll('.eizo-bw-slot').forEach(btn => {
        btn.addEventListener('click', () => selectSlot(date, btn.dataset.time));
      });
    } catch (err) {
      area.innerHTML = '<p style="color: var(--eizo-danger); font-size: 14px;">Impossible de charger les créneaux.</p>';
    }
  }

  function selectSlot(date, time) {
    state.selectedDate = date;
    state.selectedSlot = time;
    showForm(date, time);
  }

  function showCalendar() {
    showStep('eizo-bw-step-calendar');
  }

  function showForm(date, time) {
    const datetime = `${formatDate(date)} à ${time}`;
    document.getElementById('eizo-bw-selected-datetime').textContent = datetime;
    document.getElementById('eizo-bw-error').classList.add('eizo-bw-hidden');
    showStep('eizo-bw-step-form');
    document.getElementById('eizo-bw-first-name').focus();
  }

  function showStep(id) {
    ['eizo-bw-step-calendar', 'eizo-bw-step-form', 'eizo-bw-step-success'].forEach(stepId => {
      document.getElementById(stepId).classList.toggle('eizo-bw-active', stepId === id);
    });
  }

  function showError(message) {
    const el = document.getElementById('eizo-bw-error');
    el.textContent = message;
    el.classList.remove('eizo-bw-hidden');
  }

  async function submitBooking(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.eizo-bw-submit');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="eizo-bw-loader"></span> Confirmation...';

    try {
      const result = await createBooking({
        date: state.selectedDate,
        time: state.selectedSlot,
        customerName: `${form.firstName.value.trim()} ${form.lastName.value.trim()}`,
        customerEmail: form.email.value.trim(),
        customerPhone: form.phone.value.trim() || undefined,
        notes: form.notes.value.trim() || undefined,
      });
      showStep('eizo-bw-step-success');
      form.reset();
    } catch (err) {
      showError(err.message || 'Erreur lors de la réservation. Veuillez réessayer.');
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function init() {
    await buildWidget();

    const show = shouldShowPopup();
    console.log('[EIZO Booking] init', { show, threshold: CONFIG.triggerThreshold });
    if (show) {
      setTimeout(showPopup, POPUP_DELAY_MS);
    } else if (isColorEdgeProduct()) {
      showFab();
    }
  }

  function runInit() {
    init().catch(err => console.error('[EIZO Booking] init error', err));
  }

  window.EIZO_BOOKING = {
    open: openModal,
    close: closeModal,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInit);
  } else {
    runInit();
  }

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) runInit();
  });
})();
