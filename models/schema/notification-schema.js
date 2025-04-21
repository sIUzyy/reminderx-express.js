const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  medicineName: { type: String, required: true },
  dosage: { type: Number, required: true },
  compartment: { type: Number, required: true },
  time: { type: Date, required: true },
  status: { type: String, enum: ["taken", "skipped"], required: true },
  userId: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
});

module.exports = mongoose.model("Notification", notificationSchema);
