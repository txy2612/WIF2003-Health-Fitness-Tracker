const notificationSeeds = [
  {
    channel: 'workout',
    title: 'Morning Run',
    message: '30-minute run around campus',
    scheduledFor: new Date('2026-06-04T07:00:00+08:00'),
    completed: false,
    read: false,
  },

  {
    channel: 'hydration',
    title: 'Drink Water',
    message: 'Drink 2 glasses of water',
    scheduledFor: new Date('2026-06-04T10:00:00+08:00'),
    completed: false,
    read: false,
  },

  {
    channel: 'nutrition',
    title: 'Lunch Reminder',
    message: 'High-protein lunch',
    scheduledFor: new Date('2026-06-04T12:30:00+08:00'),
    completed: false,
    read: false,
  },

  {
    channel: 'workout',
    title: 'Gym Session',
    message: 'Leg day',
    scheduledFor: new Date('2026-06-04T18:00:00+08:00'),
    completed: true,
    read: false,
  },
]

export default notificationSeeds
