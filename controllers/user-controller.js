// ----firebase----
const admin = require("../firebase/firebase");

// ----express-validator----
const { validationResult } = require("express-validator");

// ----model----
const HttpError = require("../models/error/http-error");
const User = require("../models/schema/user-schema");

// ---- mongoose ----
const mongoose = require("mongoose");

// ----controllers----

// http://localhost:5000/api/user/signup - POST
const signUp = async (req, res, next) => {
  // Validate incoming data (if using express-validator)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { firebaseUid, expoPushToken, email, name, address, age } = req.body;

  try {
    // Create a new user
    const newUser = new User({
      firebaseUid,
      email,
      name,
      address,
      age,
      expoPushToken: expoPushToken || null,
      max_sensor: [], // initialize with an empty array or provide defaults if needed
      contact: [],
      inventory: [],
      reminder: [],
    });

    // Save the user to the database
    await newUser.save();

    // Respond with success
    return res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error(error);
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email already exists" });
    }
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// http://localhost:5000/api/user/token - POST
const saveExpoPushToken = async (req, res, next) => {
  const { expoPushToken } = req.body;
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

    user.expoPushToken = expoPushToken;
    await user.save();

    res.status(200);
    res.json({ message: "Token saved successfully!" });
  } catch (err) {
    const error = new HttpError(
      "An unexpected error occur. Failed to save token",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/user/signin - POST
const signIn = async (req, res, next) => {
  try {
    // body parser
    const { email, password, token, expoPushToken } = req.body;

    // check if email and password are provided
    if (!email || !password) {
      const error = new HttpError("Email and Password are required", 400);
      return next(error);
    }

    // verify firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Check if user exists in MongoDB
    const existingUser = await User.findOne({ firebaseUid });

    // if not existing
    if (!existingUser) {
      return res
        .status(401)
        .json({ message: "User does not exist, please create an account." });
    }

    // update expo push token if provided
    if (expoPushToken && expoPushToken !== existingUser.expoPushToken) {
      existingUser.expoPushToken = expoPushToken;
      await existingUser.save();
    }

    // if success send json format
    res.status(200).json({
      message: "Sign in successful.",
      user: {
        email: existingUser.email,
        name: existingUser.name,
        address: existingUser.address,
        age: existingUser.age,
      },
    });
  } catch (err) {
    const error = new HttpError(
      "Signing in failed, please try again later.",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/user/:email - GET
const userEmail = async (req, res, next) => {
  // get the email in route.
  const { email } = req.params;

  try {
    // findOne method using mongodb
    const user = await User.findOne({ email: email });

    if (!user) {
      const error = new HttpError("User not found", 404);
      return next(error);
    }

    res.json(user);
  } catch (err) {
    const error = new HttpError("Server error", 500);
    return next(error);
  }
};

// http://localhost:5000/api/user/:uid - PATCH
const updateUser = async (req, res, next) => {
  // Validate incoming data (if using express-validator)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // get the userId /:uid
  const userId = req.params.uid;

  // this is the request that i want.
  const { name, address, age } = req.body;

  // construct the update object only with fields that are defined
  const updateData = {};
  if (name) updateData.name = name;
  if (address) updateData.address = address;
  if (age) updateData.age = age;

  // update user
  try {
    const updatedUser = await mongoose
      .model("User")
      .findByIdAndUpdate(userId, updateData, { new: true });

    // if that user does not exist.
    if (!updatedUser) {
      return next(new HttpError("User not found", 404));
    }

    res
      .status(200)
      .json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the user" });
  }
};

// ----exports----
exports.signUp = signUp;
exports.signIn = signIn;
exports.userEmail = userEmail;
exports.updateUser = updateUser;
exports.saveExpoPushToken = saveExpoPushToken;
