// packages
const express = require("express");
const router = express.Router();

// express-validator
const { check } = require("express-validator");

// controller
const contactController = require("../controllers/contact-controller");

// display all the contact
router.get("/", contactController.getContact);

// create a contact
router.post(
  "/createcontact",
  [
    check("name").not().isEmpty().withMessage("Name is required"),
    check("phone_number")
      .not()
      .isEmpty()
      .withMessage("Phone number is required")
      .isNumeric()
      .withMessage("Phone number should contain only numbers")
      .isLength({ min: 10, max: 15 })
      .withMessage("Phone number should be between 10 and 15 digits"),
  ],
  contactController.createContact
);

// update a contact
router.patch(
  "/:id",
  [
    check("name").not().isEmpty().withMessage("Name is required"),
    check("phone_number")
      .not()
      .isEmpty()
      .withMessage("Phone number is required")
      .isNumeric()
      .withMessage("Phone number should contain only numbers")
      .isLength({ min: 10, max: 15 })
      .withMessage("Phone number should be between 10 and 15 digits"),
  ],
  contactController.updateContact
);

// delete a contact
router.delete("/:id", contactController.deleteContact);

// exports
module.exports = router;
