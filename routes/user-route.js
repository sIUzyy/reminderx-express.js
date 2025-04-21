// packages
const express = require("express");
const router = express.Router();

// express-validator
const { check } = require("express-validator");

// controllers
const userController = require("../controllers/user-controller");

// sign up
router.post(
  "/signup",
  [
    [
      check("email").isEmail().withMessage("Invalid email format"),
      check("name").not().isEmpty().withMessage("Name is required"),
      check("address").not().isEmpty().withMessage("Address is required"),
    ],
  ],
  userController.signUp
);

// save expoPushToken
router.post("/token", userController.saveExpoPushToken);

// sign in
router.post("/signin", userController.signIn);

// get the email of user
router.get("/:email", userController.userEmail);

// update user
router.patch(
  "/:uid",
  [
    check("name")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Name cannot be empty"),
    check("address")
      .optional()
      .not()
      .isEmpty()
      .withMessage("Address cannot be empty"),
  ],
  userController.updateUser
);

// exports
module.exports = router;
