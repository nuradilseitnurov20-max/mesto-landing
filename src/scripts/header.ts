const hdr = document.querySelector<HTMLElement>('[data-hdr]')!;
const burger = document.querySelector<HTMLButtonElement>('[data-burger]')!;
const label = document.querySelector<HTMLElement>('[data-burger-label]')!;
const menu = document.querySelector<HTMLElement>('[data-mnav]')!;

// Фон шапки после скролла; прячем при скролле вниз, показываем при скролле вверх.
let lastY = 0;
let ticking = false;
const onScroll = () => {
  const y = window.scrollY;
  hdr.classList.toggle('is-scrolled', y > 24);
  const open = burger.getAttribute('aria-expanded') === 'true';
  hdr.classList.toggle('is-hidden', !open && y > 600 && y > lastY + 4);
  if (y < lastY - 4 || y < 600) hdr.classList.remove('is-hidden');
  lastY = y;
  ticking = false;
};
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();

// Мобильное меню
const setOpen = (open: boolean) => {
  burger.setAttribute('aria-expanded', String(open));
  label.textContent = open ? 'Закрыть меню' : 'Открыть меню';
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add('is-open'));
    menu.querySelector('a')?.focus();
  } else {
    menu.classList.remove('is-open');
    setTimeout(() => { if (burger.getAttribute('aria-expanded') === 'false') menu.hidden = true; }, 400);
  }
};
burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setOpen(false); burger.focus(); }
});
matchMedia('(min-width: 768px)').addEventListener('change', (e) => e.matches && setOpen(false));

// Якоря: секции ниже первого экрана используют content-visibility, поэтому перед переходом
// раскладываем их по-настоящему — иначе браузер считает по примерным высотам и промахивается.
const revealAll = () => {
  const html = document.documentElement;
  if (html.classList.contains('cv-off')) return;
  html.classList.add('cv-off');
  void document.body.offsetHeight;
};
document.addEventListener('click', (e) => {
  const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a || a.hash.length < 2) return;
  const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
  if (!target) return;
  e.preventDefault();
  revealAll();
  target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  history.pushState(null, '', a.hash);
});
if (location.hash.length > 1) {
  const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (t) { revealAll(); t.scrollIntoView(); }
}
