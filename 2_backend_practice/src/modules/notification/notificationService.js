import notificationModel from './notificationModel.js'

async function getNotifications() {
  return notificationModel// Use the model(DB manager) to talk to MongoDB collection
    .find({})//no filter , get evth
    .sort({ datetime: 1 })//ascending order, earlier first
    .lean()//converts Mongoose docs into plain JS objects
}

// Purpose: save a new noti
// notification = data passed from controller
async function createNotification(notification) {
  return notificationModel.create(notification)
}

// Purpose: delete noti by front-end generated id
async function deleteNotification(id) {// id bcz front-end stores id: idCounter++
  return notificationModel.findOneAndDelete({
    id: Number(id)
  })
}

export default {
  getNotifications,
  createNotification,
  deleteNotification,
}