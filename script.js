/* ============================================================
   NOBLE BARBER STUDIO — script.js
   Vanilla JavaScript · No frameworks
============================================================ */

'use strict';

/* ============================================================
   1. UTILIDADES
============================================================ */

/**
 * Selector helper
 */
const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

/**
 * Throttle — limita ejecución de funciones de alto costo
 */
function throttle(fn, delay = 100) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Debounce — retrasa ejecución hasta que se deje de llamar
 */
function debounce(fn, delay = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ============================================================
   2. DARK / LIGHT MODE
============================================================ */
(function initTheme() {
  const html = document.documentElement;
  const toggleBtn = $('#themeToggle');
  const STORAGE_KEY = 'noble-theme';

  // Determinar tema inicial: preferencia guardada → preferencia del sistema → dark
  function getInitialTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', `Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`);
    }
  }

  // Aplicar tema inmediatamente sin flash
  applyTheme(getInitialTheme());

  // Toggle al hacer click
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = html.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
})();

/* ============================================================
   3. HEADER — SCROLL EFFECT
============================================================ */
(function initHeader() {
  const header = $('#header');
  if (!header) return;

  const onScroll = throttle(() => {
    if (window.scrollY > 60) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }, 50);

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // estado inicial
})();

/* ============================================================
   4. MOBILE NAV — HAMBURGER
============================================================ */
(function initMobileNav() {
  const hamburger = $('#navHamburger');
  const menu = $('#navMenu');
  if (!hamburger || !menu) return;

  // Toggle menú
  function toggleMenu(state) {
    const isOpen = state ?? !menu.classList.contains('open');
    menu.classList.toggle('open', isOpen);
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  hamburger.addEventListener('click', () => toggleMenu());

  // Cerrar al hacer click en un link
  $$('.nav__link', menu).forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  // Cerrar al hacer click fuera
  document.addEventListener('click', (e) => {
    if (menu.classList.contains('open') &&
        !menu.contains(e.target) &&
        !hamburger.contains(e.target)) {
      toggleMenu(false);
    }
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      toggleMenu(false);
    }
  });
})();

/* ============================================================
   5. SCROLL REVEAL — INTERSECTION OBSERVER
============================================================ */
(function initReveal() {
  const elements = $$('.reveal');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // se anima solo una vez
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -60px 0px'
    }
  );

  elements.forEach(el => observer.observe(el));
})();

/* ============================================================
   6. CONTADOR ANIMADO — HERO STATS
============================================================ */
(function initCounters() {
  const counters = $$('[data-target]');
  if (!counters.length) return;

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 2000; // ms
    const start = performance.now();

    // Easing out quart
    function easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function update(timestamp) {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const current = Math.round(eased * target);

      // Formatear números grandes con separador de miles
      el.textContent = target >= 1000
        ? current.toLocaleString('es-AR')
        : current.toString();

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        // Asegurarse del valor final exacto
        el.textContent = target >= 1000
          ? target.toLocaleString('es-AR')
          : target.toString();

        // Agregar símbolo "+" al final
        el.textContent += '+';
      }
    }

    requestAnimationFrame(update);
  }

  // Usar IntersectionObserver para disparar cuando sean visibles
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach(el => observer.observe(el));
})();

/* ============================================================
   7. FORMULARIO DE RESERVA — VALIDACIÓN
============================================================ */
(function initBookingForm() {
  const form = $('#bookingForm');
  const successMsg = $('#formSuccess');
  const submitBtn = $('#submitBtn');
  if (!form) return;

  // Setear fecha mínima = hoy
  const dateInput = $('#fecha');
  if (dateInput) {
    const today = new Date();
    // Compensar UTC
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
    dateInput.min = today.toISOString().split('T')[0];
  }

  /* ---- Reglas de validación ---- */
  const rules = {
    nombre: {
      validate: (val) => val.trim().length >= 3,
      message: 'Por favor ingresa tu nombre completo (mín. 3 caracteres).'
    },
    telefono: {
      validate: (val) => /^[\d\s\+\-\(\)]{8,20}$/.test(val.trim()),
      message: 'Ingresa un número de teléfono válido.'
    },
    servicio: {
      validate: (val) => val !== '',
      message: 'Selecciona el servicio que deseas.'
    },
    fecha: {
      validate: (val) => {
        if (!val) return false;
        const selected = new Date(val);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selected >= today;
      },
      message: 'Selecciona una fecha válida (hoy o posterior).'
    }
  };

  /**
   * Mostrar error en un campo
   */
  function showError(fieldId, message) {
    const input = $(`#${fieldId}`);
    const errorEl = $(`#${fieldId}-error`);
    if (input) input.classList.add('error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.animation = 'none';
      // Force reflow para reiniciar animación
      void errorEl.offsetHeight;
      errorEl.style.animation = 'fadeInUp 0.25s ease-out';
    }
  }

  /**
   * Limpiar error en un campo
   */
  function clearError(fieldId) {
    const input = $(`#${fieldId}`);
    const errorEl = $(`#${fieldId}-error`);
    if (input) input.classList.remove('error');
    if (errorEl) errorEl.textContent = '';
  }

  /**
   * Validar un solo campo
   */
  function validateField(fieldId) {
    const rule = rules[fieldId];
    if (!rule) return true;
    const input = $(`#${fieldId}`);
    if (!input) return true;
    const isValid = rule.validate(input.value);
    if (!isValid) {
      showError(fieldId, rule.message);
    } else {
      clearError(fieldId);
    }
    return isValid;
  }

  /**
   * Validar todos los campos
   */
  function validateAll() {
    const fields = Object.keys(rules);
    let allValid = true;
    fields.forEach(fieldId => {
      if (!validateField(fieldId)) allValid = false;
    });
    return allValid;
  }

  // Validación en tiempo real al salir de cada campo
  Object.keys(rules).forEach(fieldId => {
    const input = $(`#${fieldId}`);
    if (!input) return;

    input.addEventListener('blur', () => validateField(fieldId));
    input.addEventListener('input', debounce(() => {
      if (input.classList.contains('error')) {
        validateField(fieldId);
      }
    }, 300));
  });

  /**
   * Simular envío del formulario
   */
  function simulateSubmit() {
    return new Promise(resolve => setTimeout(resolve, 1800));
  }

  /* ---- Submit handler ---- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validar
    const isValid = validateAll();
    if (!isValid) {
      // Hacer scroll al primer error
      const firstError = form.querySelector('.form__input.error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstError.focus();
      }
      return;
    }

    // Estado de carga
    submitBtn.classList.add('btn--loading');
    submitBtn.disabled = true;

    try {
      await simulateSubmit();

      // Mostrar éxito
      form.style.opacity = '0';
      form.style.transform = 'translateY(-10px)';
      form.style.transition = 'all 0.4s ease-out';

      setTimeout(() => {
        form.style.display = 'none';
        if (successMsg) {
          successMsg.classList.add('visible');
        }
      }, 400);

    } catch (error) {
      // Restaurar en caso de error
      submitBtn.classList.remove('btn--loading');
      submitBtn.disabled = false;
      showError('nombre', 'Ocurrió un error. Por favor intenta nuevamente.');
    }
  });
})();

/* ============================================================
   8. SMOOTH SCROLL — NAVEGACIÓN INTERNA
============================================================ */
(function initSmoothScroll() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;

    const targetId = link.getAttribute('href');
    if (targetId === '#') return;

    const target = $(targetId);
    if (!target) return;

    e.preventDefault();

    const headerHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--header-h')
    ) || 72;

    const targetTop = target.getBoundingClientRect().top + window.scrollY - headerHeight;

    window.scrollTo({
      top: targetTop,
      behavior: 'smooth'
    });
  });
})();

/* ============================================================
   9. BACK TO TOP
============================================================ */
(function initBackToTop() {
  const btn = $('#backToTop');
  if (!btn) return;

  const onScroll = throttle(() => {
    if (window.scrollY > 500) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, 100);

  window.addEventListener('scroll', onScroll, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ============================================================
   10. ACTIVE NAV LINK — HIGHLIGHT SEGÚN SCROLL
============================================================ */
(function initActiveNav() {
  const sections = $$('section[id]');
  const navLinks = $$('.nav__link:not(.nav__link--cta)');
  if (!sections.length || !navLinks.length) return;

  const headerHeight = () =>
    parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue('--header-h')) || 72;

  function updateActive() {
    let current = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop - headerHeight() - 100;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === `#${current}`) {
        link.classList.add('active');
      }
    });
  }

  window.addEventListener('scroll', throttle(updateActive, 100), { passive: true });
  updateActive();
})();

/* ============================================================
   11. GALLERY — LIGHTBOX SIMPLE
============================================================ */
(function initGalleryLightbox() {
  const galleryItems = $$('.gallery__item');
  if (!galleryItems.length) return;

  // Crear lightbox en el DOM
  const lightbox = document.createElement('div');
  lightbox.id = 'lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Imagen ampliada');
  lightbox.innerHTML = `
    <div class="lightbox__backdrop"></div>
    <div class="lightbox__content">
      <button class="lightbox__close" aria-label="Cerrar">✕</button>
      <img class="lightbox__img" src="" alt="" />
      <p class="lightbox__caption"></p>
    </div>
  `;
  document.body.appendChild(lightbox);

  // Estilos del lightbox (inyectados con JS para mantener el CSS independiente)
  const style = document.createElement('style');
  style.textContent = `
    #lightbox {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.35s ease;
      padding: 1rem;
    }
    #lightbox.open {
      opacity: 1;
      pointer-events: auto;
    }
    .lightbox__backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.93);
      backdrop-filter: blur(8px);
    }
    .lightbox__content {
      position: relative;
      z-index: 1;
      max-width: min(900px, 95vw);
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      transform: scale(0.94);
      transition: transform 0.35s cubic-bezier(0.22,1,0.36,1);
    }
    #lightbox.open .lightbox__content {
      transform: scale(1);
    }
    .lightbox__img {
      max-width: 100%;
      max-height: 80vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6);
    }
    .lightbox__caption {
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.1rem;
      font-style: italic;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.04em;
    }
    .lightbox__close {
      position: absolute;
      top: -3rem;
      right: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 50%;
      color: white;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .lightbox__close:hover {
      background: rgba(255,255,255,0.2);
    }
  `;
  document.head.appendChild(style);

  const lbImg = lightbox.querySelector('.lightbox__img');
  const lbCaption = lightbox.querySelector('.lightbox__caption');
  const lbClose = lightbox.querySelector('.lightbox__close');
  const lbBackdrop = lightbox.querySelector('.lightbox__backdrop');

  function openLightbox(imgSrc, caption) {
    lbImg.src = imgSrc;
    lbImg.alt = caption;
    lbCaption.textContent = caption;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    // Limpiar src después de la animación
    setTimeout(() => { lbImg.src = ''; }, 400);
  }

  // Eventos de apertura
  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      const caption = item.querySelector('.gallery__item-overlay span')?.textContent || '';
      if (img) openLightbox(img.src, caption);
    });

    // Teclado
    item.setAttribute('tabindex', '0');
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.click();
      }
    });
  });

  // Cerrar
  lbClose.addEventListener('click', closeLightbox);
  lbBackdrop.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) {
      closeLightbox();
    }
  });
})();

/* ============================================================
   12. MICROINTERACCIONES — CURSOR PERSONALIZADO (Desktop)
============================================================ */
(function initCustomCursor() {
  // Solo en desktop
  if (window.matchMedia('(max-width: 768px)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return;

  const cursor = document.createElement('div');
  cursor.id = 'custom-cursor';
  document.body.appendChild(cursor);

  const cursorStyle = document.createElement('style');
  cursorStyle.textContent = `
    #custom-cursor {
      position: fixed;
      width: 8px;
      height: 8px;
      background: var(--gold);
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease, opacity 0.3s ease, width 0.25s ease, height 0.25s ease, background 0.25s ease;
      mix-blend-mode: difference;
      opacity: 0;
    }
    #custom-cursor.visible { opacity: 1; }
    #custom-cursor.expanded {
      width: 40px;
      height: 40px;
      background: rgba(201, 168, 76, 0.2);
      border: 1px solid var(--gold);
    }
  `;
  document.head.appendChild(cursorStyle);

  let mouseX = 0, mouseY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.left = mouseX + 'px';
    cursor.style.top = mouseY + 'px';
    cursor.classList.add('visible');
  });

  document.addEventListener('mouseleave', () => {
    cursor.classList.remove('visible');
  });

  // Expandir sobre elementos interactivos
  const interactiveSelectors = 'a, button, .service-card, .gallery__item, .benefit-card, input, select';
  
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveSelectors)) {
      cursor.classList.add('expanded');
    }
  });

  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactiveSelectors)) {
      cursor.classList.remove('expanded');
    }
  });
})();

/* ============================================================
   13. PARALLAX SUTIL — HERO
============================================================ */
(function initParallax() {
  const heroImg = $('.hero__bg-img');
  if (!heroImg) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const onScroll = throttle(() => {
    const scrolled = window.scrollY;
    const heroHeight = document.querySelector('.hero')?.offsetHeight || 0;
    if (scrolled > heroHeight) return;
    const rate = scrolled * 0.3;
    heroImg.style.transform = `scale(1) translateY(${rate}px)`;
  }, 16);

  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* ============================================================
   14. CARDS — EFECTO TILT 3D SUTIL (Desktop)
============================================================ */
(function initTiltEffect() {
  if (window.matchMedia('(max-width: 768px)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = $$('.service-card, .benefit-card, .testimonial-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;

      card.style.transform = `
        translateY(-6px)
        rotateX(${rotateX}deg)
        rotateY(${rotateY}deg)
      `;
      card.style.transition = 'transform 0.1s ease';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.4s cubic-bezier(0.22,1,0.36,1)';
    });
  });
})();

/* ============================================================
   15. LAZY LOADING — IMÁGENES
============================================================ */
(function initLazyImages() {
  // IntersectionObserver para imágenes con loading="lazy" que no tengan soporte nativo
  if ('loading' in HTMLImageElement.prototype) return; // soporte nativo, no hacer nada

  const lazyImages = $$('img[loading="lazy"]');
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src || img.src;
        img.removeAttribute('loading');
        imageObserver.unobserve(img);
      }
    });
  });

  lazyImages.forEach(img => imageObserver.observe(img));
})();

/* ============================================================
   16. FORM — FEEDBACK DE CARACTERES EN NOMBRE
============================================================ */
(function initCharFeedback() {
  const nombreInput = $('#nombre');
  if (!nombreInput) return;

  nombreInput.addEventListener('input', debounce(() => {
    const len = nombreInput.value.trim().length;
    if (len > 0 && len < 3) {
      const errorEl = $('#nombre-error');
      if (errorEl && !nombreInput.classList.contains('error')) {
        errorEl.textContent = `${3 - len} caracteres más`;
        errorEl.style.color = 'var(--gold)';
      }
    } else {
      const errorEl = $('#nombre-error');
      if (errorEl) {
        errorEl.style.color = '';
        if (!nombreInput.classList.contains('error')) {
          errorEl.textContent = '';
        }
      }
    }
  }, 150));
})();

/* ============================================================
   17. ANIMACIÓN DE NÚMERO AL PRECIO DE SERVICIOS
   (hover effect — solo visual)
============================================================ */
(function initServiceHover() {
  const serviceCards = $$('.service-card');

  serviceCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      const number = card.querySelector('.service-card__number');
      if (number) {
        number.style.transition = 'color 0.4s ease, transform 0.4s ease';
        number.style.transform = 'translateX(8px)';
      }
    });

    card.addEventListener('mouseleave', () => {
      const number = card.querySelector('.service-card__number');
      if (number) {
        number.style.transform = '';
      }
    });
  });
})();

/* ============================================================
   18. INTERSECTION OBSERVER — ANIMAR BARRAS DE PROGRESO
   (podría usarse en futuras secciones de skills)
   Preparado para extensibilidad
============================================================ */

/* ============================================================
   19. CONSOLE SIGNATURE
============================================================ */
(function printSignature() {
  const styles = [
    'color: #c9a84c',
    'font-family: Georgia, serif',
    'font-size: 14px',
    'padding: 8px 0'
  ].join(';');

  console.log('%c✦ Noble Barber Studio — Código limpio, estilo sin concesiones.', styles);
})();

/* ============================================================
   20. ACCESIBILIDAD — FOCUS VISIBLE SOLO CON TECLADO
============================================================ */
(function initFocusVisible() {
  let usingMouse = false;

  document.addEventListener('mousedown', () => {
    if (!usingMouse) {
      usingMouse = true;
      document.documentElement.classList.add('using-mouse');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && usingMouse) {
      usingMouse = false;
      document.documentElement.classList.remove('using-mouse');
    }
  });

  // Agregar estilos
  const style = document.createElement('style');
  style.textContent = `
    .using-mouse :focus {
      outline: none;
    }
    :not(.using-mouse) :focus-visible {
      outline: 2px solid var(--gold);
      outline-offset: 3px;
      border-radius: 2px;
    }
  `;
  document.head.appendChild(style);
})();
