// Все контактные данные и плейсхолдеры — в одном месте. См. TODO.md.
export const site = {
  name: 'MESTO',
  title: 'MESTO — всё для вашего ресторана в одной системе',
  description:
    'Онлайн-бронирование с выбором стола и видом с места, электронное меню, CRM и аналитика — для удобства гостей и эффективного управления рестораном.',
  email: 'mestorestaurant@gmail.com',
  whatsappConnect:
    'https://wa.me/77777325194?text=Здравствуйте%21%20Хочу%20подключить%20сервис%20MESTO',
  whatsappPartner:
    'https://wa.me/77777325194?text=Здравствуйте%21%20Хочу%20обсудить%20сотрудничество%20с%20MESTO',
  // TODO (см. TODO.md): пока строки-плейсхолдеры, кнопки показываются с пометкой.
  telegram: '[@НИК]',
  demoUrl: 'https://mesto-eta.vercel.app/r/dadli-mesto',
};

export const isPlaceholder = (v: string) => v.startsWith('[');

export const telegramUrl = (nick: string) => `https://t.me/${nick.replace(/^@/, '')}`;
