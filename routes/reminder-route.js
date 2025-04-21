// packages
const express = require("express");
const router = express.Router();

// controller
const reminderController = require("../controllers/reminder-controller");

// create a new reminder
router.post("/createreminder", reminderController.createReminder);

// get all reminder
router.get("/", reminderController.getReminder);

// send reminder data to esp32
router.get("/esp32/:model", reminderController.sendReminderToEsp32);

// update the status of reminder
router.patch("/:id", reminderController.updateReminderHistory);

// receive a status of reminder by esp32
router.post("/esp32/status", reminderController.updateReminderStatus);

// delete a reminder
router.delete("/:id", reminderController.deleteReminder);

// exports
module.exports = router;
