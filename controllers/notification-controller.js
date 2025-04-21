// ---- firebase ----
const admin = require("../firebase/firebase");

// model
const HttpError = require("../models/error/http-error");
const Notification = require("../models/schema/notification-schema");
const User = require("../models/schema/user-schema");

// controllers

// http://localhost:5000/api/notification/register
const createNotification = async (req, res, next) => {
  console.log("Incoming notification:", req.body);

  const { medicineName, dosage, compartment, status, time } = req.body;

  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    const error = new HttpError("Authorization token missing", 401);
    return next(error);
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    const notification = new Notification({
      medicineName,
      dosage,
      compartment,
      time: new Date(time),
      status,
      userId: user._id,
    });

    await notification.save();

    user.notification.push(notification._id);
    await user.save();

    res.status(201);
    res.json({ message: "Notification created successfully", notification });
  } catch (err) {
    console.log("Error saving notification", err);
    const error = new HttpError(
      "Failed to save notificaiton. Please try again later.",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/notification
const getNotification = async (req, res, next) => {
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    return next(new HttpError("Authorization token missing", 401));
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    const notification = await Notification.find({ userId: user._id });

    res.status(200);
    res.json({ notification });
  } catch (err) {
    console.log("err", err);
    const error = new HttpError(
      "Failed to retrieve notification. Please try again later",
      500
    );
    return next(error);
  }
};

// exports
exports.getNotification = getNotification;
exports.createNotification = createNotification;
