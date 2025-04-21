// ----firebase----
const admin = require("../firebase/firebase");

// ----model----
const HttpError = require("../models/error/http-error");
const ESP32 = require("../models/schema/esp32-model-schema");
const User = require("../models/schema/user-schema");

// ---- controllers ----

// http:localhost:5000/api/model/createmodel - POST
const createESP32Model = async (req, res, next) => {
  // expected to get
  const { model } = req.body;

  // get the id token of the user
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  // if idToken does not exist
  if (!idToken) {
    return next(new HttpError("Authorization token missing", 401));
  }

  try {
    // verify the token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // if user does no exist
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // fnd the existing ESP32 document for the user
    let esp32 = await ESP32.findOne({ userId: user._id });

    if (esp32) {
      // update the existing document
      esp32.model = model;
      await esp32.save();
      return res
        .status(200)
        .json({ message: "ESP32 Model updated successfully", esp32 });
    } else {
      // create a new document if it doesn't exist
      esp32 = new ESP32({
        model,
        userId: user._id,
      });

      // save the new model
      await esp32.save();

      // push esp32 id in user collection
      user.esp32.push(esp32._id);

      // save the new model
      await user.save();

      // return 201 if success
      return res
        .status(201)
        .json({ message: "ESP32 Model created successfully", esp32 });
    }
  } catch (err) {
    console.log(err);
    return next(
      new HttpError(
        "Failed to update the ESP32 model. Please try again later",
        500
      )
    );
  }
};

// http:localhost:5000/api/model - GET
const getESP32Model = async (req, res, next) => {
  // get the token
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  // if no token...
  if (!idToken) {
    const error = new HttpError("Authorization token missing", 401);
    return next(error);
  }

  try {
    // verify the firebase token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // find the user by firebaseUid
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      const error = new HttpError(
        "User not found. Please try againd later",
        404
      );
      return next(error);
    }

    // find esp32 model
    const esp32 = await ESP32.findOne({ userId: user._id });

    // return the esp32
    res.status(200).json({ esp32 });
  } catch (err) {
    const error = new HttpError(
      "Failed to retrieve esp32 model. Please try again later.",
      500
    );
    return next(error);
  }
};

// ---- exports
exports.createESP32Model = createESP32Model;
exports.getESP32Model = getESP32Model;
