// send notification if stock is <= 2 and if expiration date will expire in 7 days

// simplifies scheduling bg tasks in ur application
const cron = require("node-cron");
const { Expo } = require("expo-server-sdk");

// models
const Inventory = require("../models/schema/inventory-schema");
const User = require("../models/schema/user-schema");

// function to check inventory collection and send notification
const checkInventory = async () => {
  try {
    const inventory = await Inventory.find();
    const notifications = [];

    const now = new Date(); // get the current date in local time
    const nowUTC = new Date(now.toUTCString()); // normalize now to utc

    for (const item of inventory) {
      const {
        userId,
        medicine_name,
        stock,
        expiration_date,
        notifiedLowStock,
        notifiedExpiry,
      } = item;

      // convert expiration date to UTC
      const expiryDateUtc = new Date(expiration_date);

      // format the expiration date
      const formattedExpirationDate = expiryDateUtc.toLocaleDateString(
        "en-US",
        {
          year: "numeric",
          month: "long",
          day: "2-digit",
        }
      );

      // reset 'notified' if stock has increased above 2
      if (stock > 2 && notifiedLowStock) {
        item.notifiedLowStock = false;
        await item.save();
        console.log(
          `Reset notified flag for ${medicine_name} (stock: ${stock})`
        );
      }

      // Check if stock is low and send notification
      if (stock <= 2 && !notifiedLowStock) {
        notifications.push({
          userId,
          message: `${medicine_name} is running low. Only ${stock} remaining. [Restock Now]`,
          data: { screen: "Inventory" },
        });

        // Mark as notified to prevent duplicate notifications
        item.notifiedLowStock = true;
        await item.save();
      }

      // Check expiration date (7 days before expiry)
      const expiryWarningDate = new Date(expiryDateUtc);
      expiryWarningDate.setDate(expiryWarningDate.getDate() - 7);

      if (nowUTC >= expiryWarningDate && !notifiedExpiry) {
        notifications.push({
          userId,
          message: `${medicine_name} will expire on ${formattedExpirationDate}.`,
        });

        // mark as notified to prevent duplicate notifications
        item.notifiedExpiry = true;
        await item.save();
      }
    }

    // Send notifications if needed
    if (notifications.length > 0) {
      await sendPushNotifications(notifications);
    }
  } catch (error) {
    console.error(
      "An unexpected error occurred while checking the inventory:",
      error
    );
  }
};

// function to send push notifications
const sendPushNotifications = async (notifications) => {
  const expo = new Expo();
  const message = [];

  for (const notification of notifications) {
    const user = await User.findById(notification.userId);

    if (user?.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
      message.push({
        to: user.expoPushToken,
        sound: "default",
        body: notification.message,
      });
    }
  }

  // send notifications in chunks
  const chunks = expo.chunkPushNotifications(message);

  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.error(
        "An unexpected error occur while sending a push notifications:",
        error
      );
    }
  }
};

// reset the 'notified' flag at midnight
const resetNotifiedFlag = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      // Reset the 'notifiedLowStock' and 'notifiedExpiry' flag for all inventory items at midnight
      await Inventory.updateMany(
        {},
        { $set: { notifiedLowStock: false, notifiedExpiry: false } }
      );
      console.log("Notified flags reset.");
    } catch (error) {
      console.error("Error resetting notified flags:", error);
    }
  });
};

// Schedule job to run every seconds
const scheduleInventoryCheck = () => {
  cron.schedule("* * * * * *", checkInventory);
};

// Export both scheduler functions
module.exports = { scheduleInventoryCheck, resetNotifiedFlag };
