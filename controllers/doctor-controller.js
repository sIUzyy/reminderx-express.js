// ----firebase----
const admin = require("../firebase/firebase");

// ---- express validator ----
const { validationResult } = require("express-validator");

// ---- model ----
const Doctor = require("../models/schema/doctor-schema");
const HttpError = require("../models/error/http-error");
const User = require("../models/schema/user-schema");

// ---- controllers ----

// http://localhost:5000/api/doctor - GET
const getDoctorList = async (req, res, next) => {
  // get list of doctor by certain user.

  // access the authorization header from request.
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  // if idToken does not exist.
  if (!idToken) {
    return next(new HttpError("Authorization token missing", 401));
  }

  // verification
  try {
    // verify the token and get the uid
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // find the firebaseUid in the User collection
    const user = await User.findOne({ firebaseUid });

    // if that user is does not exist
    if (!user) {
      return next(new HttpError("User not found. Please try again later", 404));
    }

    // find all doctor for a certain user id
    const doctor = await Doctor.find({ userId: user._id });

    // if success...
    res.status(200);
    res.json({ doctor });
  } catch (err) {
    // if failed...
    const error = new HttpError(
      "Failed to retrieve doctor list. Please try again later",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/doctor/createdoctor - POST
const createDoctorList = async (req, res, next) => {
  // request body, things that i want to get from client.
  const { doctor_name, specialty, email, mobile_number, address } = req.body;

  // access the authorization header from request.
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

    // create an object to pass in the mongodb
    const doctor = new Doctor({
      doctor_name,
      specialty,
      email,
      mobile_number,
      address,
      userId: user._id,
    });

    // save that object to doctor collection
    await doctor.save();

    // add doctor reference to user's inventory array
    user.doctor.push(doctor._id);
    await user.save(); // save it in user collection

    // if everyting is success.
    res.status(201);
    res.json({ message: "Doctor list created successfully", doctor });
  } catch (err) {
    console.log(err);
    const error = new HttpError(
      "Failed to create a Doctor list. Please try again later.",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/doctor/:id - PATCH
const updateDoctorList = async (req, res, next) => {
  // get the id of the specific doctor /:id
  const doctorId = req.params.id;

  // request body that i want to update
  const { doctor_name, specialty, email, mobile_number, address } = req.body;

  try {
    // update the Doctor collection and pass the doctorId
    const updatedDoctorList = await Doctor.findByIdAndUpdate(
      doctorId,
      {
        doctor_name,
        specialty,
        email,
        mobile_number,
        address,
      },
      { new: true, runValidators: true } // return updated doctor document and validate
    );

    // if no doctor exist with that ID
    if (!updatedDoctorList) {
      return next(new HttpError("Doctor does not exist", 404));
    }

    // if success
    res.status(200);
    res.json({
      message: "Doctor udpated successfully",
      doctor: updatedDoctorList,
    });
  } catch (err) {
    // if failed...
    const error = new HttpError(
      "Updating Doctor failed. Please try again later",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/doctor/:id - DELETE
const deleteDoctorList = async (req, res, next) => {
  // get the /:id
  const doctorId = req.params.id;

  try {
    // check the doctorId in Doctor collection
    const doctor = await Doctor.findById(doctorId);

    // if that doctorId does not exist
    if (!doctor) {
      return next(new HttpError("Doctor not found", 404));
    }

    // update the User collection and remove the doctor in array
    await User.findByIdAndUpdate(doctor.userId, {
      $pull: { doctor: doctorId },
    });

    // delete the certain doctor in Doctor collection
    await doctor.deleteOne();

    // if success.
    res.status(200);
    res.json({ message: "Doctor deleted successfully" });
  } catch (err) {
    // if failed
    const error = new HttpError(
      "Deleting doctor failed. Please try again later",
      500
    );

    return next(error);
  }
};

// ---- exports ----
exports.getDoctorList = getDoctorList;
exports.createDoctorList = createDoctorList;
exports.updateDoctorList = updateDoctorList;
exports.deleteDoctorList = deleteDoctorList;
