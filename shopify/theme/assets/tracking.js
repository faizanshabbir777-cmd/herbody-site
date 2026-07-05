/* ==========================================================
   HerBody tracking.js — consent-gated analytics stubs.
   UK PECR: NO marketing/analytics pixels load until the visitor
   explicitly accepts. Consent choice persists in localStorage.
   Pixels (each only if its ID is set in theme settings):
     · GA4 (gtag)      · Meta Pixel      · TikTok Pixel
   Theme events (from theme.js):
     hb:view_item → view_item / ViewContent
     hb:add_to_cart → add_to_cart / AddToCart
     hb:begin_checkout → begin_checkout / InitiateCheckout
   Events fired before consent/pixel-load are queued and replayed.
   ========================================================== */
(function () {
  'use strict';

  var HB = window.HB || {};
  var IDS = (HB.tracking || {});
  var KEY = 'hb_consent_v1';
  var loaded = false;
  var queue = [];

  function getConsent() {
    try { return window.localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function setConsent(value) {
    try { window.localStorage.setItem(KEY, value); } catch (e) { /* private mode */ }
  }

  /* ---------- banner ---------- */
  var banner = document.getElementById('hb-consent');
  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
    banner.classList.add('show');
  }
  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('show');
    banner.hidden = true;
  }

  if (banner) {
    var acceptBtn = banner.querySelector('[data-consent-accept]');
    var declineBtn = banner.querySelector('[data-consent-decline]');
    if (acceptBtn) acceptBtn.addEventListener('click', function () {
      setConsent('granted'); hideBanner(); loadPixels();
    });
    if (declineBtn) declineBtn.addEventListener('click', function () {
      setConsent('denied'); hideBanner();
    });
  }

  var hasAnyPixel = !!(IDS.ga4 || IDS.metaPixel || IDS.tiktokPixel);

  var consent = getConsent();
  if (consent === 'granted') {
    loadPixels();
  } else if (consent === null && hasAnyPixel) {
    // Only ask when there is actually something to consent to.
    showBanner();
  }

  /* ---------- pixel loaders ---------- */
  function injectScript(src) {
    var s = document.createElement('script');
    s.async = true; s.src = src;
    document.head.appendChild(s);
  }

  function loadPixels() {
    if (loaded || !hasAnyPixel) { loaded = true; flush(); return; }
    loaded = true;

    if (IDS.ga4) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', IDS.ga4, { anonymize_ip: true });
      injectScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(IDS.ga4));
    }

    if (IDS.metaPixel) {
      /* Meta Pixel base snippet (official, minified) */
      !function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
        n.queue = []; t = b.createElement(e); t.async = !0; t.src = v;
        s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', IDS.metaPixel);
      window.fbq('track', 'PageView');
    }

    if (IDS.tiktokPixel) {
      /* TikTok Pixel base snippet (official, minified) */
      !function (w, d, t) {
        w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
        ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
        ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.load = function (e, n) {
          var i = 'https://analytics.tiktok.com/i18n/pixel/events.js';
          ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = i;
          ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = n || {};
          var o = document.createElement('script'); o.type = 'text/javascript'; o.async = !0; o.src = i + '?sdkid=' + e + '&lib=' + t;
          var a = document.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a);
        };
        ttq.load(IDS.tiktokPixel);
        ttq.page();
      }(window, document, 'ttq');
    }

    flush();
  }

  /* ---------- event bridge ---------- */
  function toPounds(cents) { return Math.round(cents) / 100; }

  function send(name, detail) {
    var value = detail.price ? toPounds(detail.price * (detail.quantity || 1)) : undefined;

    if (window.gtag && IDS.ga4) {
      var ga4Names = { view_item: 'view_item', add_to_cart: 'add_to_cart', begin_checkout: 'begin_checkout' };
      window.gtag('event', ga4Names[name], {
        currency: 'GBP',
        value: value,
        items: detail.id ? [{ item_id: String(detail.id), item_name: detail.title || 'The Daily', quantity: detail.quantity || 1 }] : undefined
      });
    }
    if (window.fbq && IDS.metaPixel) {
      var fbNames = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout' };
      window.fbq('track', fbNames[name], {
        currency: 'GBP',
        value: value,
        content_ids: detail.id ? [String(detail.id)] : undefined,
        content_type: 'product'
      });
    }
    if (window.ttq && IDS.tiktokPixel) {
      var ttNames = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout' };
      window.ttq.track(ttNames[name], {
        currency: 'GBP',
        value: value,
        content_id: detail.id ? String(detail.id) : undefined,
        content_type: 'product'
      });
    }
  }

  function handle(name) {
    return function (e) {
      if (getConsent() !== 'granted') return;      // PECR: dropped unless consented
      if (!loaded) { queue.push([name, e.detail || {}]); return; }
      send(name, e.detail || {});
    };
  }
  function flush() {
    if (getConsent() !== 'granted') { queue = []; return; }
    while (queue.length) { var ev = queue.shift(); send(ev[0], ev[1]); }
  }

  document.addEventListener('hb:view_item', handle('view_item'));
  document.addEventListener('hb:add_to_cart', handle('add_to_cart'));
  document.addEventListener('hb:begin_checkout', handle('begin_checkout'));
})();
