'use strict';

class ScrollReveal {
  #observer;

  constructor(selector = '.reveal', stagger = 55) {
    this.#observer = new IntersectionObserver(
      (entries) => entries.forEach((e, i) => {
        if (!e.isIntersecting) return;
        const extra = parseInt(e.target.dataset.delay ?? 0, 10);
        setTimeout(() => e.target.classList.add('visible'), i * stagger + extra);
        this.#observer.unobserve(e.target);
      }),
      { threshold: 0.1 }
    );

    document.querySelectorAll(selector).forEach(el => {
      el.getBoundingClientRect().top < window.innerHeight
        ? el.classList.add('visible')
        : this.#observer.observe(el);
    });
  }
}

class MagneticLetter {
  #el;
  #x = 0; #y = 0;
  #vx = 0; #vy = 0;

  static #K  = 0.10;
  static #D  = 0.68;
  static #R  = 90;
  static #F  = 36;

  constructor(el) { this.#el = el; }

  update(mx, my) {
    const rect = this.#el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = cx - mx, dy = cy - my;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let tx = 0, ty = 0;
    if (dist > 0 && dist < MagneticLetter.#R) {
      const s = (1 - dist / MagneticLetter.#R);
      tx = (dx / dist) * MagneticLetter.#F * s;
      ty = (dy / dist) * MagneticLetter.#F * s;
    }

    this.#vx += -MagneticLetter.#K * (this.#x - tx) - MagneticLetter.#D * this.#vx;
    this.#vy += -MagneticLetter.#K * (this.#y - ty) - MagneticLetter.#D * this.#vy;
    this.#x  += this.#vx;
    this.#y  += this.#vy;

    this.#el.style.transform = `translate(${this.#x.toFixed(2)}px,${this.#y.toFixed(2)}px)`;

    return Math.abs(this.#vx) > 0.01 || Math.abs(this.#vy) > 0.01
        || Math.abs(this.#x)  > 0.01 || Math.abs(this.#y)  > 0.01;
  }
}

class MagneticName {
  #letters = [];
  #raf = null;
  #mx = -9999; #my = -9999;

  constructor(selector = '.hero-name') {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = document.querySelector(selector);
    if (!el) return;

    this.#splitLetters(el);
    this.#letters = [...el.querySelectorAll('.letter')].map(span => new MagneticLetter(span));

    document.addEventListener('mousemove', e => {
      this.#mx = e.clientX;
      this.#my = e.clientY;
      if (!this.#raf) this.#raf = requestAnimationFrame(() => this.#tick());
    }, { passive: true });
  }

  #splitLetters(el) {
    el.innerHTML = el.innerHTML
      .split(/<br\s*\/?>/i)
      .map(line =>
        [...line.trim()].map(ch =>
          ch === ' '
            ? '<span class="letter"> </span>'
            : `<span class="letter">${ch}</span>`
        ).join('')
      )
      .join('<br>');
  }

  #tick() {
    this.#raf = null;
    let alive = false;
    for (const l of this.#letters) if (l.update(this.#mx, this.#my)) alive = true;
    if (alive) this.#raf = requestAnimationFrame(() => this.#tick());
  }
}

class CursorLight {
  #el;
  #tx; #ty;
  #cx; #cy;

  constructor(id = 'cursorLight') {
    this.#el = document.getElementById(id);
    this.#tx = this.#cx = window.innerWidth  / 2;
    this.#ty = this.#cy = window.innerHeight / 2;

    document.addEventListener('mousemove', e => {
      this.#tx = e.clientX;
      this.#ty = e.clientY;
    });

    this.#tick();
  }

  #tick() {
    this.#cx += (this.#tx - this.#cx) * 0.1;
    this.#cy += (this.#ty - this.#cy) * 0.1;
    this.#el.style.setProperty('--cx', `${this.#cx}px`);
    this.#el.style.setProperty('--cy', `${this.#cy}px`);
    requestAnimationFrame(() => this.#tick());
  }
}

class VisitCounter {
  #el;

  constructor({ elementId = 'visitCount', namespace, key } = {}) {
    this.#el = document.getElementById(elementId);
    fetch(`https://abacus.jasoncameron.dev/hit/${namespace}/${key}`)
      .then(r => r.json())
      .then(d => this.#animateCount(d.value ?? 0))
      .catch(() => { this.#el.textContent = '—'; });
  }

  #animateCount(target) {
    const start    = performance.now();
    const duration = 1200;
    const step     = (now) => {
      const p    = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      this.#el.textContent = Math.round(target * ease).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

class Navigation {
  #nav;

  constructor(selector = 'nav') {
    this.#nav = document.querySelector(selector);
    window.addEventListener('scroll', () => this.#onScroll(), { passive: true });
  }

  #onScroll() {
    this.#nav.style.padding = window.scrollY > 50 ? '12px 52px' : '20px 52px';
  }
}

class StatCounter {
  constructor(selector = '.stat-number', initialDelay = 650) {
    setTimeout(() => {
      document.querySelectorAll(selector).forEach((el, i) => {
        const raw    = el.textContent.trim();
        const num    = parseInt(raw, 10);
        const suffix = raw.replace(/^\d+/, '');
        el.textContent = '0' + suffix;
        setTimeout(() => this.#run(el, num, suffix), i * 200);
      });
    }, initialDelay);
  }

  #run(el, target, suffix) {
    const start = performance.now();
    const dur   = 1600;
    const tick  = (now) => {
      const p    = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * ease) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

class SkillTagStagger {
  constructor() {
    const cards = document.querySelectorAll('.skill-card');

    cards.forEach(card =>
      card.querySelectorAll('.skill-tag').forEach(tag => {
        tag.style.opacity   = '0';
        tag.style.transform = 'translateY(6px) scale(0.95)';
      })
    );

    const obs = new IntersectionObserver(
      (entries) => entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll('.skill-tag').forEach((tag, i) => {
          setTimeout(() => {
            tag.style.transition = 'opacity 0.3s cubic-bezier(0.23,1,0.32,1), transform 0.3s cubic-bezier(0.23,1,0.32,1)';
            tag.style.opacity    = '1';
            tag.style.transform  = 'translateY(0) scale(1)';
          }, 80 + i * 38);
        });
        obs.unobserve(entry.target);
      }),
      { threshold: 0.25 }
    );

    cards.forEach(card => obs.observe(card));
  }
}

class HeroParallax {
  #hero;
  #heroH;

  constructor(selector = '#hero') {
    this.#hero  = document.querySelector(selector);
    if (!this.#hero) return;
    this.#heroH = this.#hero.offsetHeight;
    window.addEventListener('scroll', () => this.#onScroll(), { passive: true });
  }

  #onScroll() {
    if (window.scrollY > this.#heroH) return;
    const shift = (window.scrollY * 0.28).toFixed(1);
    this.#hero.style.backgroundPositionY = `calc(62% + ${shift}px)`;
  }
}

class ProjectTiles {
  constructor() {
    const grid = document.querySelector('.projects-grid');
    if (!grid) return;

    const cards = [...grid.querySelectorAll('.project-card')];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (reduced) return;

    cards.forEach(card => {
      card.addEventListener('mousemove',  e => this.#tilt(e, card), { passive: true });
      card.addEventListener('mouseleave', ()  => this.#reset(card));
    });
  }

  #tilt(e, card) {
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    card.style.transition = 'transform 0.1s ease, box-shadow 0.1s ease';
    card.style.transform  = `perspective(700px) rotateX(${(-y * 10).toFixed(1)}deg) rotateY(${(x * 10).toFixed(1)}deg) translateZ(8px)`;
    card.style.boxShadow  = `${(-x * 14).toFixed(1)}px ${(-y * 10 + 6).toFixed(1)}px 30px rgba(249,168,0,0.18)`;
  }

  #reset(card) {
    card.style.transition = 'transform 0.45s cubic-bezier(0.23,1,0.32,1), box-shadow 0.45s cubic-bezier(0.23,1,0.32,1)';
    card.style.transform  = '';
    card.style.boxShadow  = '';
  }
}

class BlackHoleField {
  #canvas; #ctx; #stars = [];
  #raf = null;
  #cx = 0; #cy = 0;
  #W  = 0; #H  = 0;

  static #COUNT  = 130;
  static #EH     = 65;
  static #FADE   = 140;

  constructor() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.#canvas = document.getElementById('blackHoleCanvas');
    if (!this.#canvas) return;
    this.#ctx = this.#canvas.getContext('2d');

    this.#resize();
    window.addEventListener('resize', () => this.#resize(), { passive: true });

    for (let i = 0; i < BlackHoleField.#COUNT; i++) {
      this.#stars.push(this.#spawn(true));
    }
    this.#raf = requestAnimationFrame(() => this.#tick());
  }

  #resize() {
    const hero = document.getElementById('hero');
    this.#W = this.#canvas.width  = hero.offsetWidth;
    this.#H = this.#canvas.height = hero.offsetHeight;
    this.#cx = this.#W * 0.50;
    this.#cy = this.#H * 0.62;
  }

  #spawn(scatter = false) {
    const maxR = Math.hypot(this.#W, this.#H) * 0.65;
    const minR = BlackHoleField.#EH + BlackHoleField.#FADE + 20;
    return {
      r:        scatter ? minR + Math.random() * (maxR - minR) : maxR * (0.72 + Math.random() * 0.3),
      theta:    Math.random() * Math.PI * 2,
      size:     0.3 + Math.random() * 1.2,
      opacity0: 0.18 + Math.random() * 0.55,
      vr:       0.10 + Math.random() * 0.22,
      omega:    -(0.0008 + Math.random() * 0.0024),
    };
  }

  #tick() {
    this.#ctx.clearRect(0, 0, this.#W, this.#H);
    const { EH, FADE } = { EH: BlackHoleField.#EH, FADE: BlackHoleField.#FADE };

    for (let i = 0; i < this.#stars.length; i++) {
      const s = this.#stars[i];

      const accel = 1 + Math.pow(Math.max(0, 1 - s.r / (EH + FADE * 1.5)), 2) * 4;
      s.r     -= s.vr * accel;
      s.theta += s.omega;

      if (s.r <= EH) { this.#stars[i] = this.#spawn(false); continue; }

      const x = this.#cx + Math.cos(s.theta) * s.r;
      const y = this.#cy + Math.sin(s.theta) * s.r;
      if (x < -4 || x > this.#W + 4 || y < -4 || y > this.#H + 4) {
        this.#stars[i] = this.#spawn(false); continue;
      }

      const fadeT = Math.min(1, Math.max(0, (s.r - EH) / FADE));
      const alpha = (s.opacity0 * fadeT).toFixed(3);

      this.#ctx.beginPath();
      this.#ctx.arc(x, y, s.size, 0, Math.PI * 2);
      this.#ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      this.#ctx.fill();
    }

    this.#raf = requestAnimationFrame(() => this.#tick());
  }

  destroy() { cancelAnimationFrame(this.#raf); }
}

class MobileMenu {
  #btn;
  #links;
  #isOpen = false;

  constructor() {
    this.#btn  = document.getElementById('navHamburger');
    this.#links = document.getElementById('navLinks');
    if (!this.#btn || !this.#links) return;

    this.#btn.addEventListener('click', () => this.#toggle());

    this.#links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => this.#close())
    );

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.#isOpen) this.#close();
    });
  }

  #toggle() { this.#isOpen ? this.#close() : this.#openMenu(); }

  #openMenu() {
    this.#isOpen = true;
    this.#btn.classList.add('open');
    this.#links.classList.add('open');
    this.#btn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  #close() {
    this.#isOpen = false;
    this.#btn.classList.remove('open');
    this.#links.classList.remove('open');
    this.#btn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
}

class TextScramble {
  #el;
  #chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ·-/';
  #raf  = null;

  constructor(selector = '.hero-title') {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.#el = document.querySelector(selector);
    if (!this.#el) return;

    if (this.#el.classList.contains('visible')) {
      this.#run(this.#el.textContent.trim());
      return;
    }

    const obs = new MutationObserver(() => {
      if (!this.#el.classList.contains('visible')) return;
      obs.disconnect();
      this.#run(this.#el.textContent.trim());
    });
    obs.observe(this.#el, { attributes: true, attributeFilter: ['class'] });
  }

  #run(target) {
    const len = target.length;
    let frame = 0;
    const framesPerChar = 4;

    const tick = () => {
      const revealed = Math.floor(frame / framesPerChar);
      let out = '';
      for (let i = 0; i < len; i++) {
        if (target[i] === ' ') { out += ' '; continue; }
        out += i < revealed
          ? target[i]
          : this.#chars[Math.floor(Math.random() * this.#chars.length)];
      }
      this.#el.textContent = out;
      frame++;
      if (revealed < len) {
        this.#raf = requestAnimationFrame(tick);
      } else {
        this.#el.textContent = target;
      }
    };
    this.#raf = requestAnimationFrame(tick);
  }
}

class ActiveNavHighlight {
  #links   = new Map();
  #sections = [];
  #current  = null;

  constructor() {
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
      const id = link.getAttribute('href').slice(1);
      this.#links.set(id, link);
    });

    this.#sections = [...document.querySelectorAll('section[id]')];

    window.addEventListener('scroll', () => this.#update(), { passive: true });
    this.#update();
  }

  #update() {
    const threshold = window.scrollY + window.innerHeight * 0.38;
    let current = this.#sections[0]?.id ?? null;

    for (const s of this.#sections) {
      if (s.offsetTop <= threshold) current = s.id;
    }

    if (current === this.#current) return;
    this.#current = current;
    this.#links.forEach((link, id) =>
      link.classList.toggle('active', id === current)
    );
  }
}

class App {
  constructor() {
    new TextScramble();
    new ScrollReveal();
    new MagneticName();
    new CursorLight();
    new Navigation();
    new MobileMenu();
    new ActiveNavHighlight();
    new VisitCounter({ namespace: 'avvottikk.github.io', key: 'visits' });
    new StatCounter();
    new SkillTagStagger();
    new HeroParallax();
    new ProjectTiles();
    new BlackHoleField();
  }
}

new App();
