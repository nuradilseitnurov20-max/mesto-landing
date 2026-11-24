// Мини-демо: зал сверху → приближение к столу → размытие → панорама с перетаскиванием → назад.
// Анимируются только transform и opacity.

type Table = { n: number; x: number; y: number; label: string; src: string; srcset: string; ratio: number };

const root = document.querySelector<HTMLElement>('[data-demo]');
if (root) init(root);

function init(root: HTMLElement) {
  const tables: Table[] = JSON.parse(root.dataset.tables || '[]');
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const plan = root.querySelector<HTMLElement>('[data-plan]')!;
  const pano = root.querySelector<HTMLElement>('[data-pano]')!;
  const track = root.querySelector<HTMLElement>('[data-track]')!;
  const img = root.querySelector<HTMLImageElement>('[data-panoimg]')!;
  const label = root.querySelector<HTMLElement>('[data-label]')!;
  const hint = root.querySelector<HTMLElement>('[data-hint]')!;
  const back = root.querySelector<HTMLButtonElement>('[data-back]')!;
  const openers = [...root.querySelectorAll<HTMLButtonElement>('[data-open]')];
  const chips = [...root.querySelectorAll<HTMLButtonElement>('.chip[data-open]')];

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T_ZOOM = reduce ? 0 : 1000;
  const T_BLUR = reduce ? 0 : 580;
  const T_FADE = reduce ? 0 : 600;
  const SCALE = 2.6;

  let current: Table | null = null;
  let busy = false;
  let opener: HTMLElement | null = null;
  let offset = 0; // translateX панорамы, px (≤ 0)
  let imgW = 0;
  let hintTimer = 0;

  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const sizes = () => `${Math.ceil(stage.clientHeight * (current?.ratio ?? 2.35))}px`;

  // ---------- предзагрузка при наведении ----------
  const preloaded = new Set<number>();
  const preload = (t: Table) => {
    if (preloaded.has(t.n)) return;
    preloaded.add(t.n);
    const i = new Image();
    i.sizes = `${Math.ceil(stage.clientHeight * t.ratio)}px`;
    i.srcset = t.srcset;
    i.src = t.src;
  };
  openers.forEach((b) => {
    const t = tables.find((x) => x.n === Number(b.dataset.open))!;
    b.addEventListener('pointerenter', () => preload(t), { passive: true });
    b.addEventListener('focus', () => preload(t));
    b.addEventListener('click', () => open(t, b));
  });

  // ---------- приближение ----------
  function zoomTransform(t: Table) {
    const sw = stage.clientWidth;
    const sh = stage.clientHeight;
    const L = plan.offsetLeft;
    const px = (t.x / 100) * plan.offsetWidth;
    const py = (t.y / 100) * plan.offsetHeight;
    const tx = sw / 2 - L - SCALE * px;
    const ty = sh / 2 - SCALE * py;
    return `translate3d(${tx}px, ${ty}px, 0) scale(${SCALE})`;
  }

  async function open(t: Table, from: HTMLElement) {
    if (busy) return;
    if (current) { if (current.n === t.n) return; await close(false); }
    busy = true;
    current = t;
    opener = from;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(Number(c.dataset.open) === t.n)));

    // грузим панораму параллельно с анимацией
    img.alt = `Вид с места: ${t.label}`;
    img.sizes = sizes();
    img.srcset = t.srcset;
    img.src = t.src;
    const loaded = img.decode().catch(() => undefined);

    root.classList.add('is-zoom');
    plan.style.transform = zoomTransform(t);
    await wait(T_BLUR);
    root.classList.add('is-blur');
    await wait(T_ZOOM - T_BLUR);
    const slow = setTimeout(() => root.classList.add('is-loading'), 150);
    await loaded;
    clearTimeout(slow);
    root.classList.remove('is-loading');

    // показать панораму
    label.textContent = t.label;
    pano.hidden = false;
    layoutPano(true);
    img.style.transition = 'none';
    img.style.transform = `translate3d(${offset}px,0,0) scale(1.06)`;
    void img.offsetWidth;
    img.style.transition = '';
    requestAnimationFrame(() => {
      root.classList.add('is-pano');
      img.style.transform = `translate3d(${offset}px,0,0) scale(1)`;
    });
    back.focus({ preventScroll: true });
    hint.classList.remove('is-gone');
    clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => hint.classList.add('is-gone'), 4500);
    await wait(T_FADE);
    img.style.transition = 'none';
    busy = false;
  }

  async function close(restoreFocus = true) {
    if (!current) return;
    busy = true;
    stopInertia();
    root.classList.remove('is-pano');
    await wait(reduce ? 0 : 350);
    pano.hidden = true;
    root.classList.remove('is-blur');
    plan.style.transform = '';
    await wait(reduce ? 0 : 700);
    root.classList.remove('is-zoom');
    chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
    const n = current.n;
    current = null;
    busy = false;
    if (restoreFocus) {
      const pin = root.querySelector<HTMLElement>(`.pin[data-open="${n}"]`);
      (opener && opener.offsetParent ? opener : pin)?.focus({ preventScroll: true });
    }
  }
  back.addEventListener('click', () => { if (!busy) close(); });

  // ---------- панорама: размеры и перетаскивание ----------
  function bounds() { return { min: Math.min(0, stage.clientWidth - imgW), max: 0 }; }
  const clamp = (v: number) => { const b = bounds(); return Math.max(b.min, Math.min(b.max, v)); };

  function layoutPano(center = false) {
    if (!current) return;
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : current.ratio;
    imgW = stage.clientHeight * ratio;
    img.style.width = `${imgW}px`;
    offset = center ? (stage.clientWidth - imgW) / 2 : clamp(offset);
  }
  const apply = () => { img.style.transform = `translate3d(${offset}px,0,0)`; };

  let dragging = false;
  let startX = 0;
  let startOffset = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let raf = 0;

  function stopInertia() { cancelAnimationFrame(raf); raf = 0; }

  track.addEventListener('pointerdown', (e) => {
    if (busy || !current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stopInertia();
    dragging = true;
    startX = lastX = e.clientX;
    startOffset = offset;
    lastT = performance.now();
    velocity = 0;
    img.style.transition = 'none';
    track.setPointerCapture(e.pointerId);
    hint.classList.add('is-gone');
  });
  track.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    velocity = 0.8 * ((e.clientX - lastX) / dt) + 0.2 * velocity;
    lastX = e.clientX;
    lastT = now;
    offset = clamp(startOffset + (e.clientX - startX));
    apply();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    if (reduce || Math.abs(velocity) < 0.05) return;
    let prev = performance.now();
    const step = (now: number) => {
      const dt = now - prev;
      prev = now;
      offset = clamp(offset + velocity * dt);
      velocity *= Math.pow(0.94, dt / 16);
      apply();
      const b = bounds();
      if (Math.abs(velocity) > 0.02 && offset > b.min && offset < b.max) raf = requestAnimationFrame(step);
      else raf = 0;
    };
    raf = requestAnimationFrame(step);
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('lostpointercapture', endDrag);

  // плавный шаг (клавиатура и стрелки)
  function nudge(dir: number) {
    if (!current || busy) return;
    stopInertia();
    hint.classList.add('is-gone');
    img.style.transition = reduce ? 'none' : 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
    offset = clamp(offset - dir * stage.clientWidth * 0.35);
    apply();
  }
  root.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) =>
    b.addEventListener('click', () => nudge(Number(b.dataset.step))),
  );
  root.addEventListener('keydown', (e) => {
    if (!current) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.target === track && e.key === 'ArrowLeft') { e.preventDefault(); nudge(-1); }
    else if (e.target === track && e.key === 'ArrowRight') { e.preventDefault(); nudge(1); }
  });

  // ---------- ресайз ----------
  let rz = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => {
      if (!current) return;
      plan.style.transition = 'none';
      plan.style.transform = zoomTransform(current);
      void plan.offsetWidth;
      plan.style.transition = '';
      if (!pano.hidden) { layoutPano(); img.style.transition = 'none'; apply(); }
    });
  }).observe(stage);
}
