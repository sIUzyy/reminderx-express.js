// ----firebase----
const admin = require("../firebase/firebase");

// ----express-validator----
const { validationResult } = require("express-validator");

// ----model----
const Inventory = require("../models/schema/inventory-schema");
const HttpError = require("../models/error/http-error");
const User = require("../models/schema/user-schema");

// ----controllers----

// http://localhost:5000/api/inventory - GET
const getInventory = async (req, res, next) => {
  // get list of inventory by certain user.

  // access the authorization header from request.
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  // if idToken does not exist.
  if (!idToken) {
    return next(new HttpError("Authorization token missing", 401));
  }

  // verification...
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

    // find all inventory  for a certain user id
    const inventory = await Inventory.find({ userId: user._id });

    // if success...
    res.status(200);
    res.json({ inventory });
  } catch (err) {
    // if failed...
    const error = new HttpError(
      "Failed to retrieve inventory. Please try again later",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/inventory/createinventory - POST
const createInventory = async (req, res, next) => {
  // Validate incoming data (if using express-validator)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // request body, things that i want to get from client.
  const { medicine_name, dosage, expiration_date, stock, compartment } =
    req.body;

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
    const inventory = new Inventory({
      medicine_name,
      dosage,
      expiration_date,
      stock,
      compartment,
      userId: user._id,
    });

    // save that object to inventory collection
    await inventory.save();

    // add inventory reference to user's inventory array
    user.inventory.push(inventory._id);
    await user.save(); // save it in user collection

    // if everyting is success.
    res.status(201);
    res.json({ message: "Inventory created successfully", inventory });
  } catch (err) {
    // if failed...
    const error = new HttpError(
      "Failed to create an Inventory. Please try again later",
      500
    );

    return next(error);
  }
};

// http://localhost:5000/api/inventory/esp32/compartment-stock - POST
const updateCompartmentStock = async (req, res, next) => {
  console.log("[UPDATE COMPARTMENT]: RECEIVED DATA FROM ESP32", req.body);

  try {
    let esp32Data = req.body;

    // Ensure esp32Data is always an array
    if (!Array.isArray(esp32Data)) {
      esp32Data = [esp32Data]; // Convert single object to an array
    }

    for (const data of esp32Data) {
      const { compartment, pillCount } = data;

      // Find the inventory item with the matching compartment
      const inventoryItem = await Inventory.findOne({ compartment });

      if (!inventoryItem) {
        console.warn(`No inventory found for compartment ${compartment}`);
        continue; // Skip if compartment not found
      }

      // Deduct pill count from stock (ensure stock doesn't go negative)
      inventoryItem.stock = Math.max(inventoryItem.stock - pillCount, 0);
      await inventoryItem.save();
    }

    res
      .status(200)
      .json({ status: "success", message: "Stock updated successfully" });
  } catch (err) {
    console.error("Error updating inventory stock:", err);
    return next(
      new HttpError("Failed to update stock. Please try again later", 500)
    );
  }
};

// http://localhost:5000/api/inventory/:id - PATCH
const updateInventory = async (req, res, next) => {
  // Validate incoming data (if using express-validator)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // get the id of specific inventory /:id
  const inventoryId = req.params.id;

  // request body that i want to update
  const { medicine_name, dosage, expiration_date, stock, compartment } =
    req.body;

  try {
    // update the Inventory collection and pass the inventoryId
    const updatedInventory = await Inventory.findByIdAndUpdate(
      inventoryId,
      {
        medicine_name,
        dosage,
        expiration_date,
        stock,
        compartment,
      },
      { new: true, runValidators: true } // return updated inventory document and validate
    );

    // if no inventory exist with that ID
    if (!updatedInventory) {
      return next(new HttpError("Inventory does not exist", 404));
    }

    // if success.
    res.status(200);
    res.json({
      message: "Inventory updated successfully",
      inventory: updatedInventory,
    });
  } catch (err) {
    // if failed...
    const error = new HttpError(
      "Updating Inventory failed. Please try again later",
      500
    );
    return next(error);
  }
};

// http://localhost:5000/api/inventory/:id - DELETE
const deleteInventory = async (req, res, next) => {
  // get the /:id
  const inventoryId = req.params.id;

  try {
    // check the inventoryId in Inventory collection
    const inventory = await Inventory.findById(inventoryId);

    // if that inventoryId does not exist.
    if (!inventory) {
      return next(new HttpError("Inventory not found", 404));
    }

    // update the User collection and remove the inventory in array
    await User.findByIdAndUpdate(inventory.userId, {
      $pull: { inventory: inventoryId },
    });

    // delete the certain inventory in Inventory collection
    await inventory.deleteOne();

    // if success.
    res.status(200);
    res.json({ message: "Inventory deleted successfully" });
  } catch (err) {
    // if failed
    const error = new HttpError(
      "Deleting inventory failed. Please try again later",
      500
    );

    return next(error);
  }
};

// ----exports----
exports.getInventory = getInventory;
exports.createInventory = createInventory;
exports.updateCompartmentStock = updateCompartmentStock;
exports.updateInventory = updateInventory;
exports.deleteInventory = deleteInventory;
