// packages
const express = require("express");
const router = express.Router();

// express-validator
const { check } = require("express-validator");

// controller
const inventoryController = require("../controllers/inventory-controller");

router.get("/", inventoryController.getInventory);
router.post(
  "/createinventory",
  [
    check("medicine_name")
      .not()
      .isEmpty()
      .withMessage("Medicine name is required"),
    check("dosage")
      .not()
      .isEmpty()
      .withMessage("Dosage is required")
      .isNumeric()
      .withMessage("Dosage should contain only numbers")
      .isLength({ min: 2, max: 3 })
      .withMessage("Dosage should be between 2 and 3 digits."),
    check("expiration_date")
      .not()
      .isEmpty()
      .withMessage("Expiration Date is required"),
    check("stock")
      .not()
      .isEmpty()
      .withMessage("Stock is required")
      .isNumeric()
      .withMessage("Stock should contain only numbers")
      .isLength({ min: 1, max: 3 })
      .withMessage("Stock should be between 1 and 3 digits"),
  ],
  inventoryController.createInventory
);

router.post(
  "/esp32/compartment-stock",
  inventoryController.updateCompartmentStock
);

router.patch(
  "/:id",
  [
    check("medicine_name")
      .not()
      .isEmpty()
      .withMessage("Medicine name is required"),
    check("dosage")
      .not()
      .isEmpty()
      .withMessage("Dosage is required")
      .isNumeric()
      .withMessage("Dosage should contain only numbers")
      .isLength({ min: 2, max: 3 })
      .withMessage("Dosage should be between 2 and 3 digits."),
    check("expiration_date")
      .not()
      .isEmpty()
      .withMessage("Expiration Date is required"),
    check("stock")
      .not()
      .isEmpty()
      .withMessage("Stock is required")
      .isNumeric()
      .withMessage("Stock should contain only numbers")
      .isLength({ min: 1, max: 3 })
      .withMessage("Stock should be between 1 and 3 digits"),
  ],
  inventoryController.updateInventory
);
router.delete("/:id", inventoryController.deleteInventory);

// exports
module.exports = router;
