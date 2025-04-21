// ----firebase----
const admin = require("../firebase/firebase");

// ----express-validator----
const { validationResult } = require("express-validator");

// ----model----
const Reminder = require("../models/schema/reminder-schema");
const HttpError = require("../models/error/http-error");
const User = require("../models/schema/user-schema");
const Esp32 = require("../models/schema/esp32-model-schema");
const Notification = require("../models/schema/notification-schema");

// ----controllers----

// http://localhost:5000/api/reminder/createreminder - POST
const createReminder = async (req, res, next) => {
  console.log("Incoming reminder data:", req.body);

  // request body, things that i want to get from client.
  const { medicineName, frequency, specificDays, dosage, times, compartment } =
    req.body;

  // access the authorization header from the request.
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  // if idToken does not exist.
  if (!idToken) {
    const error = new HttpError("Authorization token missing", 401);
    return next(error);
  }

  try {
    // verify the token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // find the firebaseUid in User collection
    const user = await User.findOne({ firebaseUid });

    // if firebaseUid does not exist.
    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    // create an object to pass in the mongodb.
    const reminder = new Reminder({
      medicineName,
      frequency,
      specificDays,
      dosage,
      times,
      compartment,
      userId: user._id,
    });

    // save that object to reminder collection
    await reminder.save();

    // add reminder reference to user's reminder array
    user.reminder.push(reminder._id);
    await user.save(); // save it in user collection

    // if everything is success.
    res.status(201);
    res.json({ message: "Reminder created successfully", reminder });
  } catch (err) {
    // if failed...

    console.error("Error creating reminder:", err);

    const error = new HttpError(
      "Failed to create a Reminder. Please try again later",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/reminder - GET
const getReminder = async (req, res, next) => {
  // get list of reminder by certain user.

  // access the authorization header from request.
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  // if idToken does not exist.
  if (!idToken) {
    return next(new HttpError("Authorization token missing", 401));
  }

  // verification...
  try {
    // verify the token and get the uid
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // find the firebaseUid in the User collection
    const user = await User.findOne({ firebaseUid });

    // if that user does not exist
    if (!user) {
      return next(new HttpError("User not found. Please try again later", 404));
    }

    // find all reminder for a certain user id
    const reminder = await Reminder.find({ userId: user._id });

    // if success...
    res.status(200);
    res.json({ reminder });
  } catch (err) {
    const error = new HttpError(
      "Failed to retrieve reminder. Please try again later",
      500
    );

    return next(error);
  }
};

// http://localhost:5000/api/reminder/esp32/:model - GET
const sendReminderToEsp32 = async (req, res, next) => {
  try {
    // get the model
    const { model } = req.params;

    // if no model
    if (!model) {
      return next(
        new HttpError("ESP32 Model is required. Please try again later", 404)
      );
    }

    // find the model in esp32 schema
    const esp32Device = await Esp32.findOne({ model });

    // if esp32Device does not exist
    if (!esp32Device) {
      return next(
        new HttpError("Model not found. Please try again later", 404)
      );
    }

    // find the reminder of that model
    const reminders = await Reminder.find({ userId: esp32Device.userId });

    // send the reminders
    res.status(200).json(reminders);
  } catch (err) {
    const error = new HttpError(
      "Failed to retrieve reminder in ESP32. Please try again later",
      500
    );

    return next(error);
  }
};

// http://localhost:5000/api/reminder/:id - PATCH
const updateReminderHistory = async (req, res, next) => {
  const reminderId = req.params.id;
  const { timestamp, status } = req.body;
  const forDate = new Date(timestamp).toISOString().split("T")[0];

  try {
    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      return next(new HttpError("Reminder not found", 404));
    }

    // Check if a record for this date already exists
    const existingRecord = reminder.history.find(
      (entry) => entry.forDate === forDate
    );

    if (existingRecord) {
      // Update the existing record
      existingRecord.status = status;
      existingRecord.timestamp = timestamp;
    } else {
      // Add a new record
      reminder.history.push({ timestamp, status, forDate });
    }

    await reminder.save();

    res.status(200);
    res.json({ message: "Reminder history updated", reminder });
  } catch (err) {
    console.log("Error updating reminder history: ", err);

    const error = new HttpError(
      "Updating reminder history failed. Please try again later.",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/reminder/esp32/status - POST
const updateReminderStatus = async (req, res, next) => {
  console.log("[UPDATE STATUS]: RECEIVED DATA FROM ESP32", req.body);

  try {
    const { reminderId, status } = req.body;

    // Validate the status
    if (!["taken", "skipped"].includes(status)) {
      return next(
        new HttpError("Invalid status. It must be 'taken' or 'skipped'.", 400)
      );
    }

    // Find the reminder by its ID
    const reminder = await Reminder.findById(reminderId);
    if (!reminder) {
      console.warn(`No reminder found for reminderId ${reminderId}`);
      return next(new HttpError("Reminder not found.", 404));
    }

    const currentDate = new Date();
    const dateString = currentDate.toISOString().split("T")[0];

    // Find the closest scheduled dosage time for today
    const todayDosages = reminder.dosage.filter((d) => {
      const dDate = new Date(d.time);
      return dDate.toISOString().startsWith(dateString);
    });

    if (todayDosages.length === 0) {
      return next(new HttpError("No dosage scheduled for today.", 400));
    }

    // Find the closest time
    const closestDosage = todayDosages.reduce((closest, d) => {
      const diff = Math.abs(new Date(d.time) - currentDate);
      const closestDiff = Math.abs(new Date(closest.time) - currentDate);
      return diff < closestDiff ? d : closest;
    }, todayDosages[0]);

    const dosageTimeKey = new Date(closestDosage.time)
      .toISOString()
      .slice(0, 16); // Use up to minutes

    // Add to history
    reminder.history.push({
      timestamp: currentDate,
      status,
      forDate: dateString,
      forTime: dosageTimeKey, // 👈 Add this
    });

    // Update notifiedTimes with timestamp key
    reminder.notifiedTimes.set(dosageTimeKey, status);

    // Save the reminder
    await reminder.save();

    // Create a new notification
    const notification = new Notification({
      medicineName: reminder.medicineName,
      dosage: closestDosage.dosage,
      compartment: reminder.compartment,
      time: currentDate,
      status,
      userId: reminder.userId,
    });

    await notification.save();

    res.status(200).json({
      status: "success",
      message: `Reminder status updated to '${status}' for ${dosageTimeKey} and notification created.`,
    });
  } catch (err) {
    console.error("Error updating the reminder status", err);
    return next(
      new HttpError("Failed to update status. Please try again later", 500)
    );
  }
};

// http://localhost:5000/api/reminder/:id - DELETE
const deleteReminder = async (req, res, next) => {
  const reminderId = req.params.id;

  try {
    // Fetch the reminder
    const reminder = await Reminder.findById(reminderId);

    if (!reminder) {
      return next(new HttpError("Reminder not found", 404));
    }

    // Update the user document to remove the reminder
    const userUpdate = await User.findByIdAndUpdate(reminder.userId, {
      $pull: { reminder: reminderId },
    });

    if (!userUpdate) {
      return next(
        new HttpError(
          "User not found. Reminder not removed from user data.",
          404
        )
      );
    }

    // Delete the reminder from the Reminder collection
    const deleteResult = await reminder.deleteOne();

    // Send success response
    res.status(200).json({ message: "Reminder deleted successfully" });
  } catch (err) {
    console.error("Error during reminder deletion:", err.message);

    const error = new HttpError(
      "Deleting reminder failed. Please try again later",
      500
    );

    return next(error);
  }
};

// ----exports----
exports.createReminder = createReminder;
exports.getReminder = getReminder;
exports.sendReminderToEsp32 = sendReminderToEsp32;
exports.updateReminderHistory = updateReminderHistory;
exports.updateReminderStatus = updateReminderStatus;
exports.deleteReminder = deleteReminder;
