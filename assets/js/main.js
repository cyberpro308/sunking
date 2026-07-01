/* ============================================================
   Sun King — Shared JavaScript
   Handles: mobile drawer, scroll reveal, smooth scroll,
   FAQ accordion, animated counters, contact form validation,
   store locator filter, newsletter, back-to-top, footer year.
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Smooth scroll for in-page [data-scroll] ---------- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-scroll]');
    if (!btn) return;
    const sel = btn.getAttribute('data-scroll');
    const target = document.querySelector(sel);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- Scroll reveal ---------- */
  const animated = $$('[data-animate]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const ent of entries) {
        if (!ent.isIntersecting) continue;
        ent.target.classList.add('in');
        io.unobserve(ent.target);
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    animated.forEach(el => io.observe(el));
  } else {
    animated.forEach(el => el.classList.add('in'));
  }

  /* ---------- Animated counters ---------- */
  const counters = $$('[data-count]');
  if (counters.length) {
    const runCounter = (el) => {
      const target = parseFloat(el.getAttribute('data-count'));
      const suffix = el.getAttribute('data-suffix') || '';
      const prefix = el.getAttribute('data-prefix') || '';
      const decimals = (String(target).split('.')[1] || '').length;
      if (reduceMotion) { el.textContent = prefix + target.toLocaleString() + suffix; return; }
      const duration = 1600;
      let startTs = null;
      const step = (ts) => {
        if (startTs === null) startTs = ts;
        const p = Math.min((ts - startTs) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = target * eased;
        el.textContent = prefix + val.toLocaleString(undefined, {
          minimumFractionDigits: decimals, maximumFractionDigits: decimals
        }) + suffix;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = prefix + target.toLocaleString() + suffix;
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      const cio = new IntersectionObserver((entries) => {
        for (const ent of entries) {
          if (!ent.isIntersecting) continue;
          runCounter(ent.target);
          cio.unobserve(ent.target);
        }
      }, { threshold: 0.5 });
      counters.forEach(el => cio.observe(el));
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ---------- Focus trap helper ---------- */
  function trapFocus(container, onClose) {
    const focusables = () => $$(
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      container
    ).filter(el => !el.hasAttribute('hidden') && el.offsetParent !== null);

    const handle = (e) => {
      if (e.key === 'Escape') { onClose && onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }

  /* ---------- Mobile drawer ---------- */
  const menuBtn = $('#menuBtn');
  const backdrop = $('#backdrop');
  const drawer = $('#drawer');
  const closeBtn = $('#closeBtn');

  if (menuBtn && drawer && backdrop) {
    let lastFocused = null;
    let untrap = null;

    const setHidden = (hidden) => { drawer.hidden = hidden; backdrop.hidden = hidden; };

    const openMenu = () => {
      lastFocused = document.activeElement;
      setHidden(false);
      requestAnimationFrame(() => {
        document.body.classList.add('menu-open');
        menuBtn.setAttribute('aria-expanded', 'true');
        (closeBtn || drawer).focus({ preventScroll: true });
        untrap = trapFocus(drawer, closeMenu);
      });
    };

    const closeMenu = () => {
      document.body.classList.remove('menu-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      if (untrap) untrap();
      const finish = () => {
        setHidden(true);
        if (lastFocused && lastFocused.focus) lastFocused.focus({ preventScroll: true });
      };
      if (reduceMotion) return finish();
      window.setTimeout(finish, 260);
    };

    menuBtn.addEventListener('click', () => {
      document.body.classList.contains('menu-open') ? closeMenu() : openMenu();
    });
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    backdrop.addEventListener('click', closeMenu);
    $$('[data-drawer-link], .drawer-nav a', drawer).forEach(a => a.addEventListener('click', closeMenu));
  }

  /* ---------- FAQ accordion ---------- */
  $$('.faq').forEach((faq) => {
    const q = $('.faq-q', faq);
    const a = $('.faq-a', faq);
    if (!q || !a) return;
    q.setAttribute('aria-expanded', 'false');
    q.addEventListener('click', () => {
      const isOpen = faq.classList.toggle('open');
      q.setAttribute('aria-expanded', String(isOpen));
      a.style.maxHeight = isOpen ? a.scrollHeight + 'px' : '0px';
    });
  });
  // Recalculate open FAQ heights on resize
  window.addEventListener('resize', () => {
    $$('.faq.open .faq-a').forEach(a => { a.style.maxHeight = a.scrollHeight + 'px'; });
  });

  /* ---------- Contact form validation + fake submit ---------- */
  const form = $('#contactForm');
  if (form) {
    const status = $('#formStatus', form) || $('#formStatus');
    const setInvalid = (field, invalid) => field.classList.toggle('invalid', invalid);

    const validators = {
      name: (v) => v.trim().length >= 2,
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      phone: (v) => v.trim() === '' || /^[0-9+()\-\s]{7,}$/.test(v.trim()),
      message: (v) => v.trim().length >= 10
    };

    const validateField = (input) => {
      const field = input.closest('.field');
      if (!field) return true;
      const type = input.getAttribute('data-validate');
      if (!type || !validators[type]) return true;
      const ok = validators[type](input.value);
      setInvalid(field, !ok);
      return ok;
    };

    $$('[data-validate]', form).forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('invalid')) validateField(input);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      $$('[data-validate]', form).forEach(input => { if (!validateField(input)) valid = false; });
      if (!valid) {
        const firstBad = $('.field.invalid input, .field.invalid textarea, .field.invalid select', form);
        if (firstBad) firstBad.focus();
        return;
      }
      const name = (form.elements['name'] && form.elements['name'].value.trim()) || 'there';
      const submitBtn = $('button[type="submit"]', form);
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

      window.setTimeout(() => {
        form.reset();
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send message'; }
        if (status) {
          status.textContent = `Thank you, ${name}! Your message has been received — a Sun King advisor will contact you within 24 hours.`;
          status.classList.add('show', 'ok');
          status.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        }
      }, 900);
    });
  }

  /* ---------- Newsletter (footer / inline) ---------- */
  $$('[data-newsletter]').forEach((nl) => {
    nl.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('input[type="email"]', nl);
      const msg = $('[data-newsletter-msg]', nl);
      if (input && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
        if (msg) { msg.textContent = 'Subscribed! Check your inbox for a welcome email.'; msg.style.color = 'var(--success)'; }
        input.value = '';
      } else if (msg) {
        msg.textContent = 'Please enter a valid email address.';
        msg.style.color = 'var(--danger)';
      }
    });
  });

  /* ---------- Store locator filter ---------- */
  const locatorInput = $('#storeSearch');
  const stateSelect = $('#stateFilter');
  const stores = $$('.store');
  const noResults = $('#noResults');
  if ((locatorInput || stateSelect) && stores.length) {
    const applyFilter = () => {
      const q = (locatorInput ? locatorInput.value : '').trim().toLowerCase();
      const st = stateSelect ? stateSelect.value : '';
      let shown = 0;
      stores.forEach(store => {
        const text = store.textContent.toLowerCase();
        const storeState = (store.getAttribute('data-state') || '').toLowerCase();
        const matchQ = !q || text.includes(q);
        const matchState = !st || storeState === st.toLowerCase();
        const show = matchQ && matchState;
        store.style.display = show ? '' : 'none';
        if (show) shown++;
      });
      if (noResults) noResults.style.display = shown === 0 ? 'block' : 'none';
    };
    if (locatorInput) locatorInput.addEventListener('input', applyFilter);
    if (stateSelect) stateSelect.addEventListener('change', applyFilter);
  }

  /* ---------- Back to top ---------- */
  const toTop = $('#toTop');
  if (toTop) {
    const onScroll = () => { toTop.classList.toggle('show', window.scrollY > 600); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
