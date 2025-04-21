const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  age: { type: Number, required: true },
  expoPushToken: { type: String },
  contact: [{ type: mongoose.Types.ObjectId, required: true, ref: "Contact" }],
  inventory: [
    { type: mongoose.Types.ObjectId, required: true, ref: "Inventory" },
  ],
  reminder: [
    { type: mongoose.Types.ObjectId, required: true, ref: "Reminder" },
  ],
  notification: { type: [mongoose.Schema.Types.ObjectId], ref: "Notification" },
  doctor: [{ type: mongoose.Types.ObjectId, required: true, ref: "Doctor" }],
  esp32: [{ type: mongoose.Types.ObjectId, required: true, ref: "ESP32" }],
});

module.exports = mongoose.model("User", userSchema);
