import notificationModel from './notificationModel.js'
// mapper that converts database MongoDB format into front-end format
function toNotificationDto(notification) {
  if (!notification) return null

  const data = typeof notification.toObject === 'function'
    ? notification.toObject()
    : notification

    // maper often have this
  return {
    id: String(data._id),
    channel: data.channel,
    type: data.type || data.channel,
    title: data.title,
    message: data.message,
    note: data.message,
    scheduledFor: data.scheduledFor,
    completed: Boolean(data.completed),
    read: Boolean(data.read),
    emailSentAt: data.emailSentAt || null,
    lastSendError: data.lastSendError || null,
    browserNotifiedAt: data.browserNotifiedAt || null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

async function getNotifications(userId) {
  const notifications = await notificationModel// Use the model(DB manager) to talk to MongoDB collection
    .find({ userId })//only get this user's notifications
    .sort({ scheduledFor: 1 })//ascending order, earlier first
    .lean()//converts Mongoose docs into plain JS objects

  return notifications.map(toNotificationDto)
}

// Purpose: save a new noti
// notification = data passed from controller
async function createNotification(userId, notification) {
  const createdNotification = await notificationModel.create({
    ...notification,
    userId,
  })
  return toNotificationDto(createdNotification)
}

// etc: update status 'to do' -> 'done'
async function updateNotification(userId, id, notification) {
  const updatedNotification = await notificationModel.findOneAndUpdate({
    _id: id,
    userId,
  }, notification, {
    new: true,
    runValidators: true,
  })

  return toNotificationDto(updatedNotification)
}

// Purpose: delete notification by MongoDB id
async function deleteNotification(userId, id) {
  const deletedNotification = await notificationModel.findOneAndDelete({
    _id: id,
    userId,
  })//Mongoose helper
  return toNotificationDto(deletedNotification)
}

export default {
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
}
