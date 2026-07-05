/* ==========================================================
   HerBody theme.js — vanilla, no dependencies.
   Cart drawer (/cart/add.js + /cart/change.js), purchase-mode
   toggles, bundle selector, sticky ATC observer, nav, gallery.
   Emits hb:view_item / hb:add_to_cart / hb:begin_checkout
   CustomEvents consumed by tracking.js (consent-gated).
   ========================================================== */
(function () {
  'use strict';

  var HB = window.HB || { routes: {}, strings: {}, moneyFormat: '£{{amount}}' };

  /* ---------- utils ---------- */
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }
  function formatMoney(cents, format) {
    var value = (cents / 100).toFixed(2);
    var fmt = format || HB.moneyFormat || '£{{amount}}';
    if (fmt.indexOf('amount_no_decimals') !== -1) value = Math.round(cents / 100).toString();
    return fmt
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, value)
      .replace(/\{\{\s*amount\s*\}\}/, value)
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, value.replace('.', ','));
  }

  /* ---------- nav ---------- */
  var navToggle = qs('[data-nav-toggle]');
  var navLinks = qs('[data-nav-links]');
  on(navToggle, 'click', function () {
    var open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  /* ---------- scroll reveal ---------- */
  if ('IntersectionObserver' in window) {
    document.body.classList.add('js-reveal');
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    qsa('.reveal').forEach(function (el) { revealer.observe(el); });
  }

  /* ---------- cart state ---------- */
  var drawer = qs('[data-cart-drawer]');
  var overlay = qs('[data-cart-overlay]');
  var lastFocus = null;

  function setCartCount(count) {
    qsa('[data-cart-count]').forEach(function (el) {
      el.textContent = count;
      el.hidden = count === 0;
    });
    var dc = qs('[data-cart-drawer-count]');
    if (dc) dc.textContent = count > 0 ? '(' + count + ')' : '';
  }

  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.hidden = false; overlay.hidden = false;
    requestAnimationFrame(function () {
      drawer.classList.add('open'); overlay.classList.add('open');
    });
    var closeBtn = qs('[data-cart-close]', drawer);
    if (closeBtn) closeBtn.focus();
    document.addEventListener('keydown', escClose);
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open'); overlay.classList.remove('open');
    window.setTimeout(function () { drawer.hidden = true; overlay.hidden = true; }, 350);
    document.removeEventListener('keydown', escClose);
    if (lastFocus) lastFocus.focus();
  }
  function escClose(e) { if (e.key === 'Escape') closeDrawer(); }

  on(qs('[data-cart-open]'), 'click', function () { refreshDrawer().then(openDrawer); });
  on(qs('[data-cart-close]'), 'click', closeDrawer);
  on(overlay, 'click', closeDrawer);

  function fetchCart() {
    return fetch('/cart.js', { credentials: 'same-origin' }).then(function (r) { return r.json(); });
  }

  function renderDrawer(cart) {
    setCartCount(cart.item_count);
    var body = qs('[data-cart-lines]', drawer);
    var foot = qs('[data-cart-foot]', drawer);
    if (!body) return;
    if (cart.item_count === 0) {
      body.innerHTML = '<div class="cart-empty"><p>' + (HB.strings.cartEmpty || 'Your bag is empty.') + '</p></div>';
      if (foot) foot.hidden = true;
      return;
    }
    if (foot) foot.hidden = false;
    var sub = qs('[data-cart-subtotal]', drawer);
    if (sub) sub.textContent = formatMoney(cart.total_price);
    var html = cart.items.map(function (item) {
      var img = item.image
        ? '<img src="' + item.image.replace(/(\.[a-z]{3,4})(\?|$)/, '_128x$1$2') + '" alt="" width="64" height="72" loading="lazy">'
        : '<span class="pip" aria-hidden="true"></span>';
      var plan = item.selling_plan_allocation && item.selling_plan_allocation.selling_plan
        ? '<span class="plan">' + item.selling_plan_allocation.selling_plan.name + '</span>' : '';
      return (
        '<div class="cart-line" data-line-key="' + item.key + '">' +
          '<div class="thumb">' + img + '</div>' +
          '<div><a class="nm" href="' + item.url + '">' + item.product_title + '</a>' + plan +
            '<div class="qty" data-line-qty>' +
              '<button type="button" data-qty-change="-1" aria-label="−">&minus;</button>' +
              '<input type="number" value="' + item.quantity + '" min="0" data-qty-input aria-label="Quantity">' +
              '<button type="button" data-qty-change="1" aria-label="+">+</button>' +
            '</div></div>' +
          '<div><div class="lp tabular">' + formatMoney(item.final_line_price) + '</div>' +
            '<button type="button" class="rm" data-line-remove>' + (HB.strings.remove || 'Remove') + '</button></div>' +
        '</div>'
      );
    }).join('');
    body.innerHTML = html;
  }

  function refreshDrawer() { return fetchCart().then(renderDrawer); }

  function changeLine(key, quantity) {
    return fetch(HB.routes.cart_change_url + '.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    }).then(function (r) { return r.json(); }).then(renderDrawer);
  }

  // delegated events inside drawer
  on(drawer, 'click', function (e) {
    var line = e.target.closest('.cart-line');
    if (!line) return;
    var key = line.getAttribute('data-line-key');
    if (e.target.closest('[data-line-remove]')) { changeLine(key, 0); return; }
    var stepBtn = e.target.closest('[data-qty-change]');
    if (stepBtn) {
      var input = qs('[data-qty-input]', line);
      var next = Math.max(0, parseInt(input.value || '1', 10) + parseInt(stepBtn.getAttribute('data-qty-change'), 10));
      changeLine(key, next);
    }
  });
  on(drawer, 'change', function (e) {
    if (!e.target.matches('[data-qty-input]')) return;
    var line = e.target.closest('.cart-line');
    if (line) changeLine(line.getAttribute('data-line-key'), Math.max(0, parseInt(e.target.value || '0', 10)));
  });

  function addToCart(payload, button) {
    var original = button ? button.innerHTML : null;
    if (button) { button.disabled = true; button.textContent = HB.strings.adding || 'Adding…'; }
    return fetch(HB.routes.cart_add_url + '.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('add failed');
      return r.json();
    }).then(function (item) {
      emit('hb:add_to_cart', {
        id: payload.id, quantity: payload.quantity || 1,
        selling_plan: payload.selling_plan || null,
        price: item.final_price || item.price, title: item.product_title
      });
      return refreshDrawer();
    }).then(function () {
      openDrawer();
    }).catch(function () {
      window.alert(HB.strings.cartError || 'Something went wrong — please try again.');
    }).finally(function () {
      if (button) { button.disabled = false; button.innerHTML = original; }
    });
  }

  /* ---------- checkout event ---------- */
  qsa('[data-checkout-button]').forEach(function (btn) {
    on(btn, 'click', function () { emit('hb:begin_checkout', {}); });
  });

  /* ---------- quantity steppers (product page) ---------- */
  qsa('[data-product-qty]').forEach(function (wrap) {
    on(wrap, 'click', function (e) {
      var btn = e.target.closest('[data-qty-change]');
      if (!btn) return;
      var input = qs('[data-qty-input]', wrap);
      input.value = Math.max(1, parseInt(input.value || '1', 10) + parseInt(btn.getAttribute('data-qty-change'), 10));
    });
  });

  /* ---------- product buy box ---------- */
  var main = qs('[data-product-main]');
  if (main) {
    var priceOne = parseInt(main.getAttribute('data-price-one'), 10);
    var priceSub = parseInt(main.getAttribute('data-price-sub') || '0', 10);
    var planId = main.getAttribute('data-plan-id');
    var planInput = qs('[data-selling-plan-input]', main);

    emit('hb:view_item', { id: main.getAttribute('data-variant-id'), price: priceSub || priceOne });

    function setMode(mode) {
      var isSub = mode === 'sub' && priceSub > 0;
      var price = isSub ? priceSub : priceOne;
      qsa('.opt', main).forEach(function (opt) {
        var sel = opt.getAttribute('data-opt') === mode;
        opt.classList.toggle('sel', sel);
        var radio = qs('input[type=radio]', opt);
        if (radio) radio.checked = sel;
      });
      if (planInput) {
        if (isSub) { planInput.disabled = false; planInput.value = planId; }
        else { planInput.disabled = true; planInput.value = ''; }
      }
      var pd = qs('[data-price-display]', main);
      if (pd) pd.textContent = formatMoney(price);
      var cd = qs('[data-compare-display]', main);
      if (cd) cd.hidden = !isSub;
      var ap = qs('[data-atc-price]', main);
      if (ap) ap.textContent = formatMoney(price);
      var perday = qs('[data-perday-display]', main);
      if (perday) perday.textContent = '21 servings · ' + formatMoney(Math.round(price / 21)) + ' a day';
      var bp = qs('[data-buybar-price]');
      if (bp) bp.textContent = formatMoney(price) + ' · 21 servings';
    }
    qsa('.opt', main).forEach(function (opt) {
      on(opt, 'click', function () { setMode(opt.getAttribute('data-opt')); });
    });

    var form = qs('[data-product-form]', main) || qs('form[action*="/cart/add"]', main);
    on(form, 'submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var payload = {
        id: parseInt(fd.get('id'), 10),
        quantity: parseInt(fd.get('quantity') || '1', 10)
      };
      var sp = fd.get('selling_plan');
      if (sp) payload.selling_plan = parseInt(sp, 10);
      addToCart(payload, qs('[data-add-to-cart]', form));
    });
  }

  /* ---------- gallery thumbs ---------- */
  var thumbs = qs('[data-gallery-thumbs]');
  if (thumbs) {
    on(thumbs, 'click', function (e) {
      var btn = e.target.closest('[data-thumb-src]');
      if (!btn) return;
      var img = qs('[data-main-image]');
      if (img) { img.src = btn.getAttribute('data-thumb-src'); img.removeAttribute('srcset'); }
      qsa('[data-thumb-src]', thumbs).forEach(function (b) { b.removeAttribute('aria-current'); });
      btn.setAttribute('aria-current', 'true');
    });
  }

  /* ---------- sticky ATC (mobile) ---------- */
  var buybar = qs('[data-buybar]');
  var buybox = qs('[data-buybox]');
  if (buybar && buybox && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      buybar.classList.toggle('show', !visible);
      buybar.setAttribute('aria-hidden', visible ? 'true' : 'false');
    }, { rootMargin: '-60px 0px 0px 0px' });
    io.observe(buybox);
    on(qs('[data-buybar-add]', buybar), 'click', function () {
      // mirror the buy box: same variant + currently selected plan
      var payload = { id: parseInt(buybar.querySelector('[data-buybar-add]').getAttribute('data-variant-id'), 10), quantity: 1 };
      var planInput = qs('[data-selling-plan-input]');
      if (planInput && !planInput.disabled && planInput.value) payload.selling_plan = parseInt(planInput.value, 10);
      addToCart(payload, qs('[data-buybar-add]', buybar));
    });
  }

  /* ---------- bundle selector ---------- */
  var bundle = qs('[data-bundle]');
  if (bundle) {
    var bOne = parseInt(bundle.getAttribute('data-price-one'), 10);
    var bSub = parseInt(bundle.getAttribute('data-price-sub') || '0', 10);
    var bPlan = bundle.getAttribute('data-plan-id');
    var state = { qty: 1, mode: bSub > 0 ? 'sub' : 'one' };

    function bundleRender() {
      qsa('[data-bundle-mode]', bundle).forEach(function (btn) {
        btn.setAttribute('aria-pressed', btn.getAttribute('data-bundle-mode') === state.mode ? 'true' : 'false');
      });
      qsa('[data-bundle-qty]', bundle).forEach(function (card) {
        var isSel = parseInt(card.getAttribute('data-bundle-qty'), 10) === state.qty;
        card.setAttribute('aria-pressed', isSel ? 'true' : 'false');
        var price = qs('[data-bundle-price]', card);
        if (price) price.textContent = price.getAttribute(state.mode === 'sub' ? 'data-sub' : 'data-one') || price.getAttribute('data-one');
        var cmp = qs('[data-bundle-compare]', card);
        if (cmp) cmp.hidden = state.mode !== 'sub';
        var pdEl = qs('[data-bundle-perday]', card);
        if (pdEl) pdEl.textContent = pdEl.getAttribute(state.mode === 'sub' ? 'data-sub' : 'data-one') || pdEl.getAttribute('data-one');
      });
      var unit = state.mode === 'sub' && bSub > 0 ? bSub : bOne;
      var total = qs('[data-bundle-total]', bundle);
      if (total) total.textContent = formatMoney(unit * state.qty);
      var note = qs('[data-bundle-plan-note]', bundle);
      if (note) note.style.display = state.mode === 'sub' ? '' : 'none';
    }
    on(bundle, 'click', function (e) {
      var mode = e.target.closest('[data-bundle-mode]');
      if (mode) { state.mode = mode.getAttribute('data-bundle-mode'); bundleRender(); return; }
      var card = e.target.closest('[data-bundle-qty]');
      if (card) { state.qty = parseInt(card.getAttribute('data-bundle-qty'), 10); bundleRender(); return; }
      var add = e.target.closest('[data-bundle-add]');
      if (add) {
        var payload = { id: parseInt(bundle.getAttribute('data-variant-id'), 10), quantity: state.qty };
        if (state.mode === 'sub' && bPlan) payload.selling_plan = parseInt(bPlan, 10);
        addToCart(payload, add);
      }
    });
    bundleRender();
  }

  /* ---------- initial count ---------- */
  if (typeof HB.cartCount === 'number') setCartCount(HB.cartCount);
})();
