// Все контактные данные и плейсхолдеры — в одном месте. См. TODO.md.
export const site = {
  name: 'MESTO',
  title: 'MESTO — бронирование стола с видом с места',
  description:
    'Гость видит зал сверху, выбирает конкретный стол и заранее смотрит панораму с этого места. Онлайн-бронь для ресторанов Алматы, подключение — около дня.',
  email: 'mestorestaurant@gmail.com',
  whatsappConnect:
    'https://wa.me/77777325194?text=Здравствуйте%21%20Хочу%20подключить%20сервис%20MESTO',
  whatsappPartner:
    'https://wa.me/77777325194?text=Здравствуйте%21%20Хочу%20обсудить%20сотрудничество%20с%20MESTO',
  // TODO (см. TODO.md): пока строки-плейсхолдеры, кнопки показываются с пометкой.
  telegram: '[@НИК]',
  demoUrl: '[ССЫЛКА НА ДЕМО]',
};

export const isPlaceholder = (v: string) => v.startsWith('[');

export const telegramUrl = (nick: string) => `https://t.me/${nick.replace(/^@/, '')}`;
