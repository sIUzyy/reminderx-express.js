// packages
const express = require("express");
const router = express.Router();

// controller
const ESP32Controller = require("../controllers/esp32-model-controller");

// create a esp32 model
router.post("/createmodel", ESP32Controller.createESP32Model);

// get the model
router.get("/", ESP32Controller.getESP32Model);

// exports
module.exports = router;
