// Модальный плеер. <video> или iframe создаются только по клику и удаляются при закрытии,
// поэтому страница не грузит видео заранее.
const dialog = document.querySelector<HTMLDialogElement>('[data-modal]');
if (dialog) {
  const player = dialog.querySelector<HTMLElement>('[data-modal-player]')!;
  const title = dialog.querySelector<HTMLElement>('[data-modal-title]')!;
  const closeBtn = dialog.querySelector<HTMLButtonElement>('[data-modal-close]')!;
  let opener: HTMLElement | null = null;

  const open = (card: HTMLElement) => {
    const { src = '', poster = '', youtube = '', title: t = '' } = card.dataset;
    if (!src && !youtube) return;
    opener = card;
    title.textContent = t;
    player.replaceChildren();
    if (youtube) {
      const f = document.createElement('iframe');
      f.src = `https://www.youtube-nocookie.com/embed/${youtube}?autoplay=1&rel=0&playsinline=1`;
      f.title = t;
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      player.append(f);
    } else {
      const v = document.createElement('video');
      v.controls = true;
      v.playsInline = true;
      v.preload = 'none';
      v.poster = poster;
      v.src = src;
      v.setAttribute('aria-label', t);
      player.append(v);
      v.play().catch(() => undefined);
    }
    dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
    closeBtn.focus();
  };

  const close = () => { if (dialog.open) dialog.close(); };
  dialog.addEventListener('close', () => {
    player.replaceChildren(); // останавливает воспроизведение и загрузку
    document.documentElement.style.overflow = '';
    opener?.focus();
  });
  closeBtn.addEventListener('click', close);
  // клик по фону (сам <dialog>, а не его содержимое)
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });

  document.querySelectorAll<HTMLElement>('[data-video]').forEach((card) => {
    if (card.getAttribute('aria-disabled') === 'true') return;
    card.addEventListener('click', () => open(card));
  });
}
