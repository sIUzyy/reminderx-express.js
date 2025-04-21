const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ESP32ModelSchema = new Schema({
  model: { type: String, required: true },
  userId: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
});

module.exports = mongoose.model("ESP32", ESP32ModelSchema);
