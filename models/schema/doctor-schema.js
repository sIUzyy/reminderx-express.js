const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const doctorSchema = new Schema({
  doctor_name: { type: String, required: true },
  specialty: { type: String, required: true },
  email: { type: String, require: true },
  mobile_number: { type: Number, required: true },
  address: { type: String, required: true },
  userId: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
});

module.exports = mongoose.model("Doctor", doctorSchema);
