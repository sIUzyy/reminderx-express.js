const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reminderSchema = new Schema({
  medicineName: { type: String, required: true, trim: true },
  frequency: {
    type: String,
    enum: ["Once a day", "Twice a day", "3 times a day", "Every X hours"],
    required: function () {
      return this.specificDays.length === 0;
    },
  },
  specificDays: {
    type: [String], // Array of strings for specific days
    enum: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    default: [],
  },
  dosage: {
    type: [
      {
        time: { type: Date, required: true }, // Time for dosage
        dosage: { type: Number, required: true, min: 1, max: 999 }, // Dosage count
      },
    ],
  },
  times: {
    type: [String], // Times array
    required: true,
    validate: {
      validator: function (value) {
        // Ensure `times` matches `dosage.time`
        return (
          value.length > 0 &&
          this.dosage.every(
            (d, idx) =>
              new Date(value[idx]).getTime() === new Date(d.time).getTime()
          )
        );
      },
      message: "Times array must match dosage times.",
    },
  },
  compartment: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  notifiedTimes: {
    type: Map,
    of: String,
    default: {}, // Initialize as an empty object
  },
  history: {
    type: [
      {
        timestamp: { type: Date, required: true },
        status: {
          type: String,
          enum: ["taken", "skipped"],
          required: true,
        },
        forDate: { type: String, required: true },
        forTime: { type: String, required: true }, // 👈 Add this line
      },
    ],
    default: [],
  },
  userId: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
});

module.exports = mongoose.model("Reminder", reminderSchema);
