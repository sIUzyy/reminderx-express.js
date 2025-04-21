// ----firebase----
const admin = require("../firebase/firebase");

// ----express-validator----
const { validationResult } = require("express-validator");

// ----model----
const HttpError = require("../models/error/http-error");
const Contact = require("../models/schema/contact-schema");
const User = require("../models/schema/user-schema");

// ----controllers----

// http://localhost:5000/api/contact/ - GET
const getContact = async (req, res, next) => {
  // get the contact by certain user.

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

    // find all contacts for certain userid
    const contacts = await Contact.find({ userId: user._id });

    // return the contacts
    res.status(200).json({ contacts });
  } catch (err) {
    const error = new HttpError(
      "Failed to retrieve contacts. Please try again later.",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/contact/createcontact - POST
const createContact = async (req, res, next) => {
  // this is the request body and the only thing i want to get
  const { name, phone_number } = req.body;

  // get the token [1]
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  // if idToken does not exist.
  if (!idToken) {
    const error = new HttpError("Authorization token missing", 401);
    return next(error);
  }

  try {
    // verify firebase token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;

    // find the user by firebaseUid
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // create a new contact
    const contact = new Contact({
      name,
      phone_number,
      userId: user._id, // _id from mongodb
    });

    // save the contact to the database
    await contact.save();

    // add contact reference to user's contact array and save user
    user.contact.push(contact._id);
    await user.save();

    // if success.
    res.status(201).json({ message: "Contact created successfully", contact });
  } catch (err) {
    // if there's an error.
    const error = new HttpError(
      "Failed to create a contact. Please try again later",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/contact/:id - PATCH
const updateContact = async (req, res, next) => {
  // Validate incoming data (if using express-validator)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const contactId = req.params.id; // :id
  const { name, phone_number } = req.body; // this is the thing i want to update

  try {
    // find the contact by ID and update the specified fields
    const updatedContact = await Contact.findByIdAndUpdate(
      contactId,
      {
        name,
        phone_number,
      },
      { new: true, runValidators: true } // return the updated document and validate
    );

    // if no contact found with that ID.
    if (!updatedContact) {
      const error = new HttpError("Contact does not exist.", 404);
      return next(error);
    }

    // if success update.
    res.status(200);
    res.json({
      message: "Contact updated successfully",
      contact: updatedContact,
    });
  } catch (err) {
    const error = new HttpError(
      "Updating contact failed. Please try again later",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/contact/:id - DELETE
const deleteContact = async (req, res, next) => {
  const contactId = req.params.id; // :id

  try {
    // find the contact by ID and delete it
    const contact = await Contact.findById(contactId);

    // if contact not found, return a 404 error
    if (!contact) {
      const error = new HttpError("Contact not found.", 404);
      return next(error);
    }

    // remove the contact's ID from the associated user's contact array
    await User.findByIdAndUpdate(contact.userId, {
      $pull: { contact: contactId },
    });

    // delete the contact document
    await contact.deleteOne();

    // send a success response
    res.status(200).json({ message: "Contact deleted successfully" });
  } catch (err) {
    const error = new HttpError(
      "Deleting contact failed. Please try again later.",
      500
    );
    return next(error);
  }
};

// ----exports----
exports.getContact = getContact;
exports.createContact = createContact;
exports.updateContact = updateContact;
exports.deleteContact = deleteContact;
