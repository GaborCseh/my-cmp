/**
 * GC CMP - Consent Bar v2.0
 * Config is read from window.__gcCmpConfig (set by the GTM template).
 * All text fields can be overridden via config.tx — see GTM template parameters.
 * v2.0: Revisit consent floating button (fingerprint icon).
 * ES5 compatible.
 */
(function (w, d) {
  'use strict';

  // ── Config ─────────────────────────────────────────────────────────────────
  var cfg = w.__gcCmpConfig || {};
  var tx  = cfg.tx || {};

  // Text defaults (Hungarian). Any field can be overridden via cfg.tx.
  var T = {
    title:        tx.title        !== undefined ? tx.title        : 'Cookie beállítások',
    desc:         tx.desc         !== undefined ? tx.desc         : 'Weboldalunk cookie-kat és hasonló technológiákat használ a jobb felhasználói élményért, statisztikák készítéséhez és célzott hirdetésekhez. Kérjük, válassza meg beleegyezési beállításait.',
    btnAccept:    tx.btnAccept    !== undefined ? tx.btnAccept    : 'Elfogadom az összes sütit',
    btnReject:    tx.btnReject    !== undefined ? tx.btnReject    : 'Csak a szükségesek',
    btnManage:    tx.btnManage    !== undefined ? tx.btnManage    : 'Beállítások',
    btnSave:      tx.btnSave      !== undefined ? tx.btnSave      : 'Mentés',
    catNecLabel:  tx.catNecLabel  !== undefined ? tx.catNecLabel  : 'Szükséges',
    catNecDesc:   tx.catNecDesc   !== undefined ? tx.catNecDesc   : 'Ezek a sütik szükségesek az oldal alapvető működéséhez, és nem tilthatók le.',
    catStatLabel: tx.catStatLabel !== undefined ? tx.catStatLabel : 'Statisztikai',
    catStatDesc:  tx.catStatDesc  !== undefined ? tx.catStatDesc  : 'Segítenek megérteni, hogyan használják a látogatók az oldalt, így fejleszthetjük a felhasználói élményt.',
    catMktLabel:  tx.catMktLabel  !== undefined ? tx.catMktLabel  : 'Marketing',
    catMktDesc:   tx.catMktDesc   !== undefined ? tx.catMktDesc   : 'Személyre szabott hirdetések megjelenítéséhez és remarketing kampányok futtatásához szükségesek.',
    privacyLink:  tx.privacyLink  !== undefined ? tx.privacyLink  : 'Adatvédelmi tájékoztató',
    poweredBy:    tx.poweredBy    !== undefined ? tx.poweredBy    : 'Powered by GC CMP'
  };

  // Appearance
  var primaryColor   = cfg.pc  || '#FA4716';
  var secondaryColor = cfg.sc  || '#FA6212';
  var colorStyle     = cfg.cs  || primaryColor;
  var bannerPosition = cfg.bp  || 'center';
  var showOverlay    = cfg.so  !== 0;

  // Buttons
  var pbCls = cfg.pb ? ' ' + cfg.pb : '';
  var sbCls = cfg.sb ? ' ' + cfg.sb : '';

  // Cookie
  var cookieDomain = cfg.cd || '';
  var cookieExpiry = cfg.ce || 365;

  // Links
  var showPrivacyPolicy = cfg.opp !== 0;
  var privacyPolicyUrl  = cfg.ppDf || '/adatvedelem/';

  // Events / API
  var globalObjectName = cfg.go  || 'GCConsent';
  var enableCCU        = cfg.ccu !== false;
  var enableFCU        = cfg.fcu === true;

  // Cross-domain
  var enableXD         = cfg.xd === 1;
  var crossDomainHosts = cfg.xdh || '';

  // Revisit button (v2.0)
  var enableRevisitBtn   = cfg.rb  !== 0;
  var revisitBtnPosition = cfg.rbp || 'bottomleft';
  var revisitBtnStyle    = cfg.rbs || 'filled';

  // IDs
  var COOKIE_NAME    = 'gc-consent';
  var BANNER_ID      = 'dc-cmp-banner';
  var OVERLAY_ID     = 'dc-cmp-overlay';
  var REVISIT_BTN_ID = 'gc-cmp-revisit';

  // ── State ──────────────────────────────────────────────────────────────────
  var state = {
    ac: 0,   // analytics consent granted (0/1)
    mc: 0,   // marketing consent granted (0/1)
    rv: 0    // revisit mode (0/1)
  };

  // ── Cookie helpers ─────────────────────────────────────────────────────────
  function getCookie(name) {
    var re    = new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)');
    var match = d.cookie.match(re);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(name, value, days, domain) {
    var exp = new Date();
    exp.setTime(exp.getTime() + days * 24 * 60 * 60 * 1000);
    var str = name + '=' + encodeURIComponent(value) +
              '; expires=' + exp.toUTCString() +
              '; path=/; SameSite=Lax';
    if (domain) { str += '; domain=' + domain; }
    d.cookie = str;
  }

  function readConsent() {
    var raw = getCookie(COOKIE_NAME);
    if (!raw) { return null; }
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function writeConsent(ac, mc) {
    var arr = [];
    if (ac) { arr.push('statistics'); }
    if (mc) { arr.push('marketing'); }
    setCookie(COOKIE_NAME, JSON.stringify(arr), cookieExpiry, cookieDomain);
  }

  // ── Consent Mode v2 ────────────────────────────────────────────────────────
  function gtagUpdate(ac, mc) {
    w.dataLayer = w.dataLayer || [];
    if (typeof w.gtag !== 'function') {
      w.gtag = function () { w.dataLayer.push(arguments); };
    }
    w.gtag('consent', 'update', {
      'ad_storage':         mc ? 'granted' : 'denied',
      'ad_user_data':       mc ? 'granted' : 'denied',
      'ad_personalization': mc ? 'granted' : 'denied',
      'analytics_storage':  ac ? 'granted' : 'denied'
    });
  }

  function fireDLEvents(ac, mc, isFirst) {
    w.dataLayer = w.dataLayer || [];
    if (enableCCU) {
      w.dataLayer.push({
        event:             'cookie_consent_update',
        consent_analytics: ac ? 'granted' : 'denied',
        consent_marketing: mc ? 'granted' : 'denied'
      });
    }
    if (isFirst && enableFCU) {
      w.dataLayer.push({
        event:             'first_cookie_consent_update',
        consent_analytics: ac ? 'granted' : 'denied',
        consent_marketing: mc ? 'granted' : 'denied'
      });
    }
  }

  // ── Consent apply ──────────────────────────────────────────────────────────
  function applyConsent(ac, mc, isFirst) {
    state.ac = ac ? 1 : 0;
    state.mc = mc ? 1 : 0;
    writeConsent(ac, mc);
    gtagUpdate(ac, mc);
    fireDLEvents(ac, mc, isFirst);
    if (enableXD && crossDomainHosts) { patchXDLinks(ac, mc); }
    hideBanner();
    showRevisitBtn();
  }

  // ── Revisit button (v2.0) ──────────────────────────────────────────────────
  var FP_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 10a2 2 0 0 1 2 2v4"/>' +
    '<path d="M10 12a2 2 0 0 1 4 0"/>' +
    '<path d="M8.5 11a3.5 3.5 0 0 1 7 0v3"/>' +
    '<path d="M7 10.5a5 5 0 0 1 9.9-.7"/>' +
    '<path d="M5.5 10a6.5 6.5 0 0 1 12.9-.3"/>' +
    '<path d="M4 9.5a8 8 0 0 1 15.9-.1"/>' +
    '<path d="M10 16a2 2 0 0 0 4 0"/>' +
    '<path d="M8.5 17.5a3.5 3.5 0 0 0 7 0"/>' +
    '<path d="M7 18.5a5 5 0 0 0 9.9 0"/>' +
  '</svg>';

  function getRevisitBtnStyles() {
    if (revisitBtnStyle === 'dark') {
      return { bg: '#1a1a1a', color: '#ffffff', border: 'none', shadow: 'rgba(0,0,0,0.35)' };
    } else if (revisitBtnStyle === 'light') {
      return { bg: '#ffffff', color: '#333333', border: '1px solid rgba(0,0,0,0.12)', shadow: 'rgba(0,0,0,0.15)' };
    } else {
      return { bg: primaryColor, color: '#ffffff', border: 'none', shadow: 'rgba(0,0,0,0.25)' };
    }
  }

  function createRevisitBtn() {
    if (!enableRevisitBtn) { return; }
    var existing = d.getElementById(REVISIT_BTN_ID);
    if (existing) { return; }

    var s = getRevisitBtnStyles();
    var posStyle = revisitBtnPosition === 'bottomright'
      ? 'right:16px;bottom:16px;'
      : 'left:16px;bottom:16px;';

    var btn = d.createElement('button');
    btn.id = REVISIT_BTN_ID;
    btn.setAttribute('aria-label', 'Cookie beállítások módosítása');
    btn.innerHTML = FP_SVG;
    btn.style.cssText = [
      'position:fixed;',
      posStyle,
      'z-index:999997;',
      'width:44px;height:44px;',
      'border-radius:50%;',
      'background:' + s.bg + ';',
      'color:' + s.color + ';',
      'border:' + s.border + ';',
      'box-shadow:0 2px 8px ' + s.shadow + ';',
      'cursor:pointer;',
      'display:flex;align-items:center;justify-content:center;',
      'padding:0;',
      'transition:opacity .2s,transform .2s;',
      'opacity:0;pointer-events:none;'
    ].join('');

    btn.addEventListener('mouseover', function () {
      btn.style.transform = 'scale(1.1)';
    });
    btn.addEventListener('mouseout', function () {
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('click', function () {
      if (w[globalObjectName] && w[globalObjectName].revisitConsent) {
        w[globalObjectName].revisitConsent();
      }
    });

    d.body.appendChild(btn);
  }

  function showRevisitBtn() {
    if (!enableRevisitBtn) { return; }
    var btn = d.getElementById(REVISIT_BTN_ID);
    if (!btn) { createRevisitBtn(); btn = d.getElementById(REVISIT_BTN_ID); }
    if (btn) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  }

  function hideRevisitBtn() {
    if (!enableRevisitBtn) { return; }
    var btn = d.getElementById(REVISIT_BTN_ID);
    if (btn) {
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  function injectStyles() {
    var pos = '';
    if (bannerPosition === 'center') {
      pos = '#' + BANNER_ID + '{top:50%;left:50%;transform:translate(-50%,-50%)}';
    } else if (bannerPosition === 'bottom') {
      pos = '#' + BANNER_ID + '{bottom:0;left:0;width:100%;max-width:100%;border-radius:12px 12px 0 0}';
    } else if (bannerPosition === 'bottomleft') {
      pos = '#' + BANNER_ID + '{bottom:16px;left:16px}';
    }

    var css = [
      '#' + OVERLAY_ID + '{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:999998;display:none}',

      '#' + BANNER_ID + '{display:none;position:fixed;z-index:999999;box-sizing:border-box;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;' +
        'font-size:14px;line-height:1.5;color:#fff;' +
        'max-width:560px;width:calc(100% - 32px);' +
        'border-radius:12px;padding:24px;' +
        'background:' + colorStyle + '}',
      pos,

      '#' + BANNER_ID + ' .dct{font-size:18px;font-weight:700;margin-bottom:10px}',
      '#' + BANNER_ID + ' .dctx{font-size:13px;opacity:.9;margin-bottom:18px;line-height:1.6}',

      '#' + BANNER_ID + ' .dcbt{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}',

      '#' + BANNER_ID + ' .dcpb{flex:1 1 auto;min-width:120px;padding:10px 16px;' +
        'border:2px solid rgba(255,255,255,.9);border-radius:8px;' +
        'background:#fff;color:' + primaryColor + ';' +
        'font-size:13px;font-weight:700;cursor:pointer;transition:background .2s}',
      '#' + BANNER_ID + ' .dcpb:hover{background:rgba(255,255,255,.9)}',

      '#' + BANNER_ID + ' .dcsb{flex:1 1 auto;min-width:120px;padding:10px 16px;' +
        'border:2px solid rgba(255,255,255,.6);border-radius:8px;' +
        'background:transparent;color:#fff;' +
        'font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}',
      '#' + BANNER_ID + ' .dcsb:hover{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.9)}',

      '#' + BANNER_ID + ' .dccts{margin-bottom:16px}',
      '#' + BANNER_ID + ' .dcct{display:flex;align-items:flex-start;justify-content:space-between;' +
        'padding:10px 0;border-bottom:1px solid rgba(255,255,255,.2)}',
      '#' + BANNER_ID + ' .dcct:last-child{border-bottom:none}',
      '#' + BANNER_ID + ' .dccl{font-weight:700;font-size:13px;margin-bottom:3px}',
      '#' + BANNER_ID + ' .dccd{font-size:12px;opacity:.85;line-height:1.5;max-width:380px}',

      '#' + BANNER_ID + ' .dci{flex-shrink:0;width:44px;height:24px;border-radius:12px;' +
        'background:rgba(255,255,255,.3);cursor:pointer;position:relative;' +
        'transition:background .2s;margin-left:12px;margin-top:2px}',
      '#' + BANNER_ID + ' .dci.on{background:rgba(255,255,255,.9)}',
      '#' + BANNER_ID + ' .dci.locked{opacity:.5;cursor:not-allowed}',
      '#' + BANNER_ID + ' .dci::after{content:"";position:absolute;' +
        'width:18px;height:18px;background:#fff;border-radius:50%;' +
        'top:3px;left:3px;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.3)}',
      '#' + BANNER_ID + ' .dci.on::after{transform:translateX(20px);background:' + primaryColor + '}',

      '#' + BANNER_ID + ' .dcf{font-size:11px;opacity:.75;text-align:center}',
      '#' + BANNER_ID + ' .dcf a{color:#fff;text-decoration:underline}',

      '@media(max-width:480px){' +
        '#' + BANNER_ID + '{width:calc(100% - 16px);padding:18px}' +
        '#' + BANNER_ID + ' .dcbt{flex-direction:column}' +
        '#' + BANNER_ID + ' .dcpb,#' + BANNER_ID + ' .dcsb{min-width:unset;width:100%}' +
      '}'
    ].join('');

    var el = d.createElement('style');
    el.type = 'text/css';
    el.textContent !== undefined ? (el.textContent = css) : (el.styleSheet.cssText = css);
    d.head.appendChild(el);
  }

  // ── HTML helpers ───────────────────────────────────────────────────────────
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toggle(id, on, locked) {
    var c = 'dci' + (on ? ' on' : '') + (locked ? ' locked' : '');
    return '<div class="' + c + '" data-dc="' + id + '"></div>';
  }

  function footer() {
    var parts = [];
    if (showPrivacyPolicy) {
      parts.push('<a href="' + esc(privacyPolicyUrl) + '">' + T.privacyLink + '</a>');
    }
    if (T.poweredBy) { parts.push(T.poweredBy); }
    return parts.length ? '<div class="dcf">' + parts.join(' &nbsp;|&nbsp; ') + '</div>' : '';
  }

  function buildHTML() {
    var pb = 'dcpb' + pbCls;
    var sb = 'dcsb' + sbCls;

    // Initial view
    var vi = '<div id="dc-vi">' +
      '<div class="dct">'  + T.title + '</div>' +
      '<div class="dctx">' + T.desc  + '</div>' +
      '<div class="dcbt">' +
        '<button class="' + pb + '" id="dc-acc">'   + T.btnAccept + '</button>' +
        '<button class="' + sb + '" id="dc-rej">'   + T.btnReject + '</button>' +
        '<button class="' + sb + '" id="dc-mng">'   + T.btnManage + '</button>' +
      '</div>' +
      footer() +
    '</div>';

    // Customize view
    var vc = '<div id="dc-vc" style="display:none">' +
      '<div class="dct">' + T.title + '</div>' +
      '<div class="dccts">' +
        '<div class="dcct">' +
          '<div><div class="dccl">' + T.catNecLabel  + '</div><div class="dccd">' + T.catNecDesc  + '</div></div>' +
          toggle('nec', true, true) +
        '</div>' +
        '<div class="dcct">' +
          '<div><div class="dccl">' + T.catStatLabel + '</div><div class="dccd">' + T.catStatDesc + '</div></div>' +
          toggle('stat', state.ac === 1, false) +
        '</div>' +
        '<div class="dcct">' +
          '<div><div class="dccl">' + T.catMktLabel  + '</div><div class="dccd">' + T.catMktDesc  + '</div></div>' +
          toggle('mkt', state.mc === 1, false) +
        '</div>' +
      '</div>' +
      '<div class="dcbt">' +
        '<button class="' + pb + '" id="dc-sav">'  + T.btnSave   + '</button>' +
        '<button class="' + pb + '" id="dc-acc2">' + T.btnAccept + '</button>' +
        '<button class="' + sb + '" id="dc-rej2">' + T.btnReject + '</button>' +
      '</div>' +
      footer() +
    '</div>';

    return vi + vc;
  }

  // ── DOM ────────────────────────────────────────────────────────────────────
  function createBanner() {
    var ov = d.createElement('div');
    ov.id = OVERLAY_ID;
    d.body.appendChild(ov);

    var bn = d.createElement('div');
    bn.id = BANNER_ID;
    bn.innerHTML = buildHTML();
    d.body.appendChild(bn);

    attachEvents(bn);
  }

  function showView(v) {
    var vi = d.getElementById('dc-vi');
    var vc = d.getElementById('dc-vc');
    if (vi) { vi.style.display = v === 'i' ? '' : 'none'; }
    if (vc) { vc.style.display = v === 'c' ? '' : 'none'; }
    syncToggles();
  }

  function showBanner(customize) {
    hideRevisitBtn();
    var bn = d.getElementById(BANNER_ID);
    if (!bn) {
      createBanner();
      bn = d.getElementById(BANNER_ID);
    }
    bn.style.display = 'block';
    var ov = d.getElementById(OVERLAY_ID);
    if (ov && showOverlay) { ov.style.display = 'block'; }
    showView(customize ? 'c' : 'i');
  }

  function hideBanner() {
    var bn = d.getElementById(BANNER_ID);
    var ov = d.getElementById(OVERLAY_ID);
    if (bn) { bn.style.display = 'none'; }
    if (ov) { ov.style.display = 'none'; }
  }

  function syncToggles() {
    var els = d.querySelectorAll('[data-dc]');
    var i, el, id;
    for (i = 0; i < els.length; i++) {
      el = els[i];
      id = el.getAttribute('data-dc');
      if (id === 'stat') { toggleClass(el, 'on', state.ac === 1); }
      if (id === 'mkt')  { toggleClass(el, 'on', state.mc === 1); }
    }
  }

  function toggleClass(el, cls, add) {
    if (add) {
      if (el.classList) { el.classList.add(cls); }
      else { el.className += ' ' + cls; }
    } else {
      if (el.classList) { el.classList.remove(cls); }
      else { el.className = el.className.replace(new RegExp('\\b' + cls + '\\b', 'g'), ''); }
    }
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  function attachEvents(bn) {
    bn.addEventListener('click', function (e) {
      var t = e.target;
      var id = t.id;
      var dc = t.getAttribute ? t.getAttribute('data-dc') : null;

      if (id === 'dc-acc' || id === 'dc-acc2') {
        applyConsent(true, true, !state.rv);
      } else if (id === 'dc-rej' || id === 'dc-rej2') {
        applyConsent(false, false, !state.rv);
      } else if (id === 'dc-mng') {
        showView('c');
      } else if (id === 'dc-sav') {
        applyConsent(state.ac === 1, state.mc === 1, !state.rv);
      } else if (dc && dc !== 'nec') {
        // Toggle click
        if (t.classList) { t.classList.toggle('on'); }
        else { toggleClass(t, 'on', t.className.indexOf(' on') === -1); }
        if (dc === 'stat') { state.ac = t.className.indexOf(' on') > -1 ? 1 : 0; }
        if (dc === 'mkt')  { state.mc = t.className.indexOf(' on') > -1 ? 1 : 0; }
      }
    });
  }

  // ── Cross-domain ───────────────────────────────────────────────────────────
  function patchXDLinks(ac, mc) {
    var hosts  = crossDomainHosts.split(',');
    var params = 'dc_statistics=' + (ac ? '1' : '0') + '&dc_marketing=' + (mc ? '1' : '0');
    var links  = d.getElementsByTagName('a');
    var i, j, href, host;
    for (i = 0; i < links.length; i++) {
      href = links[i].href;
      if (!href) { continue; }
      for (j = 0; j < hosts.length; j++) {
        host = hosts[j].trim();
        if (href.indexOf(host) > -1) {
          links[i].href = href + (href.indexOf('?') > -1 ? '&' : '?') + params;
          break;
        }
      }
    }
  }

  function readXDConsent() {
    if (!enableXD) { return null; }
    var s = w.location.search;
    if (s.indexOf('dc_statistics=') === -1) { return null; }
    var sm = /dc_statistics=([01])/.exec(s);
    var mm = /dc_marketing=([01])/.exec(s);
    return {
      ac: sm && sm[1] === '1',
      mc: mm && mm[1] === '1'
    };
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();

    // Cross-domain incoming consent
    var xd = readXDConsent();
    if (xd) {
      applyConsent(xd.ac, xd.mc, true);
      return;
    }

    // Existing cookie
    var existing = readConsent();
    if (existing !== null) {
      var ac = existing.indexOf('statistics') > -1;
      var mc = existing.indexOf('marketing') > -1;
      state.ac = ac ? 1 : 0;
      state.mc = mc ? 1 : 0;
      gtagUpdate(ac, mc);
      fireDLEvents(ac, mc, false);
      showRevisitBtn();
      return;
    }

    // No consent yet — show banner
    createBanner();
    showBanner(false);
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  w[globalObjectName] = {
    show: function (customize) {
      state.rv = 1;
      showBanner(!!customize);
    },
    hide: function () {
      hideBanner();
    },
    revisitConsent: function () {
      state.rv = 1;
      var ex = readConsent();
      if (ex) {
        state.ac = ex.indexOf('statistics') > -1 ? 1 : 0;
        state.mc = ex.indexOf('marketing')  > -1 ? 1 : 0;
      }
      showBanner(true);
    },
    clearConsent: function () {
      setCookie(COOKIE_NAME, '', -1, cookieDomain);
      state.ac = 0;
      state.mc = 0;
      state.rv = 0;
      hideRevisitBtn();
      var bn = d.getElementById(BANNER_ID);
      var ov = d.getElementById(OVERLAY_ID);
      if (bn) { d.body.removeChild(bn); }
      if (ov) { d.body.removeChild(ov); }
      init();
    },
    getConsent: function () {
      return {
        ad_storage:         state.mc ? 'granted' : 'denied',
        ad_user_data:       state.mc ? 'granted' : 'denied',
        ad_personalization: state.mc ? 'granted' : 'denied',
        analytics_storage:  state.ac ? 'granted' : 'denied'
      };
    },
    hasConsent: function () {
      return readConsent() !== null;
    },
    setLanguage: function () { /* texts are set via config.tx in GTM template */ },
    getLanguage: function () { return 'custom'; }
  };

  // ── Boot ───────────────────────────────────────────────────────────────────
  if (d.readyState === 'loading') {
    d.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}(window, document));
