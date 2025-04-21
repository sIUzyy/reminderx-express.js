// packages
const express = require("express");
const router = express.Router();

// controller
const notificationController = require("../controllers/notification-controller");

router.post("/register", notificationController.createNotification);
router.get("/", notificationController.getNotification);

// exports
module.exports = router;
