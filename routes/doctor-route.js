// packages
const express = require("express");
const router = express.Router();

// express-validator
const { check } = require("express-validator");

// controller
const doctorController = require("../controllers/doctor-controller");

// create a new doctor list
router.post("/createdoctor", doctorController.createDoctorList);

// get all doctor list
router.get("/", doctorController.getDoctorList);

// update doctor list
router.patch("/:id", doctorController.updateDoctorList);

// delete doctor list
router.delete("/:id", doctorController.deleteDoctorList);

// exports
module.exports = router;
