import notificationModel from './notificationModel.js'

async function getNotifications() {
  return notificationModel// Use the model(DB manager) to talk to MongoDB collection
    .find({})//no filter , get evth
    .sort({ scheduledFor: 1 })//ascending order, earlier first
    .lean()//converts Mongoose docs into plain JS objects
}

// Purpose: save a new noti
// notification = data passed from controller
async function createNotification(notification) {
  return notificationModel.create(notification)
}

// Purpose: delete notification by MongoDB id
async function deleteNotification(id) {
  return notificationModel.findByIdAndDelete(id)//Mongoose helper
}

export default {
  getNotifications,
  createNotification,
  deleteNotification,
}
