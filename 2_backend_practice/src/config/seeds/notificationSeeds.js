const notificationSeeds = [
  {
    id: 1,
    channel: 'workout',
    title: 'Morning Run',
    message: '30-minute run around campus',
    scheduledFor: new Date('2026-05-25T07:00:00.000+08:00'),
    note: '30-minute run around campus',
    completed: false,
  },
  {
    id: 2,
    channel: 'nutrition',
    title: 'Drink Water',
    message: 'Drink 2 glasses of water',
    scheduledFor: new Date('2026-05-25T10:00:00.000+08:00'),
    note: 'Drink 2 glasses of water',
    completed: false,
  },
  {
    id: 3,
    channel: 'nutrition',
    title: 'Lunch Reminder',
    message: 'High-protein lunch',
    scheduledFor: new Date('2026-05-25T12:30:00.000+08:00'),
    note: 'High-protein lunch',
    completed: false,
  },
  {
    id: 4,
    channel: 'workout',
    title: 'Gym Session',
    message: 'Leg day',
    scheduledFor: new Date('2026-05-25T18:00:00.000+08:00'),
    note: 'Leg day',
    completed: true,
  },
]

export default notificationSeeds