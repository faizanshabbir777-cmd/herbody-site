/* ============ HerBody DTC · shared interactions ============ */
(function () {
  'use strict';

  var STORAGE_KEY = 'herbody.bag.count';

  /* ---------- bag count, persisted across pages ---------- */
  function readBagCount() {
    try { return parseInt(sessionStorage.getItem(STORAGE_KEY), 10) || 0; }
    catch (e) { return 0; }
  }
  function writeBagCount(n) {
    try { sessionStorage.setItem(STORAGE_KEY, String(n)); } catch (e) {}
  }
  function paintBagCount() {
    var n = readBagCount();
    document.querySelectorAll('[data-bag-count], .bag .count').forEach(function (el) {
      el.textContent = String(n);
    });
  }
  function bumpBag(by) {
    var n = readBagCount() + (by || 1);
    writeBagCount(n);
    paintBagCount();
    flashBag();
  }
  function flashBag() {
    document.querySelectorAll('[data-bag], .bag').forEach(function (el) {
      el.style.transition = 'transform .2s ease';
      el.style.transform = 'scale(1.08)';
      setTimeout(function () { el.style.transform = ''; }, 220);
    });
  }
  paintBagCount();

  /* ---------- "Add to bag" buttons (opt-in via data-add-to-bag) ---------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-add-to-bag]');
    if (!btn) return;
    e.preventDefault();
    var qty = parseInt(btn.getAttribute('data-qty') || '1', 10) || 1;
    bumpBag(qty);
    var label = btn.querySelector('[data-add-label]') || btn;
    var original = label.dataset.original || label.textContent;
    if (!label.dataset.original) label.dataset.original = original;
    label.textContent = '✓ Added to bag';
    setTimeout(function () { label.textContent = label.dataset.original; }, 1600);
  });

  /* expose for page-specific scripts (e.g. PDP qty stepper integration) */
  window.HerBody = window.HerBody || {};
  window.HerBody.bumpBag = bumpBag;
  window.HerBody.readBagCount = readBagCount;

  /* ---------- bag button → scroll to product strip ---------- */
  document.querySelectorAll('[data-bag], .bag').forEach(function (btn) {
    if (btn.dataset.bagWired === '1') return;
    btn.dataset.bagWired = '1';
    btn.addEventListener('click', function (e) {
      var n = readBagCount();
      if (n === 0) {
        var anchor = document.querySelector('#shop-cta') || document.querySelector('#buy');
        if (anchor) {
          e.preventDefault();
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  /* ---------- FAQ accordions (turn .faq tiles into toggles) ---------- */
  document.querySelectorAll('.faq-grid > .faq, .faq-grid > div:not(.faq-head)').forEach(function (item) {
    var q = item.querySelector('.q');
    var a = item.querySelector('.a');
    if (!q || !a) return;
    item.classList.add('faq-toggle');
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-expanded', 'false');

    /* collapse */
    a.style.maxHeight = '0px';
    a.style.overflow = 'hidden';
    a.style.opacity = '0';
    a.style.marginTop = '0px';
    a.style.transition = 'max-height .25s ease, opacity .2s ease, margin-top .25s ease';

    /* add a small caret to the question */
    if (!q.querySelector('.faq-caret')) {
      var caret = document.createElement('span');
      caret.className = 'faq-caret';
      caret.textContent = '+';
      caret.style.cssText = 'float:right;font-family:Newsreader,serif;font-style:italic;color:var(--berry-deep);font-weight:500;font-size:26px;line-height:.7;margin-left:14px;transition:transform .2s ease';
      q.appendChild(caret);
    }

    function toggle() {
      var open = item.getAttribute('aria-expanded') === 'true';
      item.setAttribute('aria-expanded', open ? 'false' : 'true');
      var caret = q.querySelector('.faq-caret');
      if (open) {
        a.style.maxHeight = '0px';
        a.style.opacity = '0';
        a.style.marginTop = '0px';
        if (caret) { caret.textContent = '+'; caret.style.transform = ''; }
      } else {
        a.style.maxHeight = a.scrollHeight + 'px';
        a.style.opacity = '1';
        a.style.marginTop = '12px';
        if (caret) { caret.textContent = '−'; }
      }
    }

    item.addEventListener('click', toggle);
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
    item.style.cursor = 'pointer';
  });

  /* ---------- Subscribe / single toggle on PDP ---------- */
  document.querySelectorAll('.toggle-row').forEach(function (row) {
    var options = row.querySelectorAll('[data-purchase-mode]');
    options.forEach(function (opt) {
      opt.addEventListener('click', function () {
        options.forEach(function (o) { o.classList.remove('on'); });
        opt.classList.add('on');
        var price = opt.getAttribute('data-price');
        var label = opt.getAttribute('data-purchase-mode');
        document.querySelectorAll('[data-purchase-price]').forEach(function (n) { n.textContent = price; });
        document.querySelectorAll('[data-purchase-label]').forEach(function (n) { n.textContent = label; });
      });
    });
  });

  /* ---------- Quantity stepper ---------- */
  document.querySelectorAll('[data-qty-stepper]').forEach(function (stepper) {
    var display = stepper.querySelector('[data-qty-display]');
    var btn = stepper.parentElement.querySelector('#add-to-bag, [data-add-to-bag]');
    function setQty(n) {
      n = Math.max(1, Math.min(99, n));
      if (display) display.textContent = String(n);
      if (btn) btn.setAttribute('data-qty', String(n));
    }
    stepper.querySelectorAll('[data-qty-action]').forEach(function (b) {
      b.addEventListener('click', function () {
        var current = parseInt(display && display.textContent, 10) || 1;
        setQty(current + (b.getAttribute('data-qty-action') === 'inc' ? 1 : -1));
      });
    });
    setQty(parseInt(display && display.textContent, 10) || 1);
  });

  /* ---------- Newsletter forms ---------- */
  document.querySelectorAll('[data-newsletter], .news-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[type="email"]');
      var hint = form.querySelector('.hint');
      if (input) input.value = '';
      if (hint) hint.textContent = '✓ thank you — first letter ships friday';
    });
  });

  /* ---------- Pact selector in app phone (clickable) ---------- */
  document.querySelectorAll('.mphone.pact .pact-list, .big-phone.pact .pl').forEach(function (list) {
    list.querySelectorAll('.pi').forEach(function (item) {
      item.style.cursor = 'pointer';
      item.addEventListener('click', function () {
        list.querySelectorAll('.pi').forEach(function (p) { p.classList.remove('on'); });
        item.classList.add('on');
      });
    });
  });

  /* ---------- topic chip filter (visual only, on Quarterly) ---------- */
  document.querySelectorAll('.topics .ch').forEach(function (chip) {
    chip.addEventListener('click', function () {
      chip.parentElement.querySelectorAll('.ch').forEach(function (c) { c.classList.remove('on'); });
      chip.classList.add('on');
    });
  });

  /* ---------- smooth scroll for in-page anchors ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;
    a.addEventListener('click', function (e) {
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
