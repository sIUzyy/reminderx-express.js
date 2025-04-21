const cron = require("node-cron");
const { Expo } = require("expo-server-sdk");

// models
const Reminder = require("../models/schema/reminder-schema");
const User = require("../models/schema/user-schema");
const Contact = require("../models/schema/contact-schema");

// axios
const axios = require("axios");

// SMS API
const IPROG_SMS_URL = process.env.SMS_URL;
const IPROG_SMS_API_KEY = process.env.SMS_API;

const checkReminder = async () => {
  try {
    const reminders = await Reminder.find();
    const notifications = [];
    const now = new Date();

    for (const reminder of reminders) {
      const { _id: reminderId, userId, times, specificDays } = reminder;

      const today = now.toLocaleDateString("en-US", { weekday: "long" });
      const isToday = specificDays.length === 0 || specificDays.includes(today);

      if (!isToday) continue;

      reminder.notifiedTimes = reminder.notifiedTimes || {};
      let shouldSaveReminder = false;

      for (const time of times) {
        const timeKey = time;
        const reminderTime = new Date(time);

        if (reminder.notifiedTimes[timeKey]) continue;

        if (
          now.getHours() === reminderTime.getHours() &&
          now.getMinutes() === reminderTime.getMinutes()
        ) {
          notifications.push({
            userId,
            reminderId,
            message: `It's medication time! Your medication is being auto-dispensed — please check the tray for your medicine.`,
          });

          reminder.notifiedTimes[timeKey] = true;
          shouldSaveReminder = true;
        }
      }

      if (shouldSaveReminder) {
        await reminder.save();
      }
    }

    if (notifications.length > 0) {
      await sendPushNotifications(notifications);
      for (const notification of notifications) {
        retryPushNotification(notification);
      }
    }
  } catch (error) {
    console.log(
      "An unexpected error occurred while checking the reminder",
      error
    );
  }
};

const sendSMS = async (phoneNumber, message) => {
  try {
    const response = await axios.post(
      IPROG_SMS_URL,
      {
        phone_number: phoneNumber,
        message: message,
      },
      {
        headers: { "Content-Type": "application/json" },
        params: { api_token: IPROG_SMS_API_KEY },
      }
    );

    console.log(`SMS sent successfully to ${phoneNumber}:`, response.data);
  } catch (error) {
    console.error(
      `Error sending SMS to ${phoneNumber}:`,
      error.response?.data || error.message
    );
  }
};

const retryPushNotification = async (notification, attempt = 1) => {
  const { userId, reminderId } = notification;
  const delayMapping = [
    300000, // 5 minutes
    180000, // 3 minutes
    120000, // 2 minutes
  ];

  if (attempt > delayMapping.length) {
    console.log("Maximum retry attempts reached for reminder:", reminderId);

    const reminder = await Reminder.findById(reminderId);
    if (reminder) {
      const currentDate = new Date();
      const dateString = currentDate.toISOString().split("T")[0];

      const todayDosages = reminder.dosage.filter((d) => {
        const dDate = new Date(d.time);
        return dDate.toISOString().startsWith(dateString);
      });

      if (todayDosages.length > 0) {
        const closestDosage = todayDosages.reduce((closest, d) => {
          const diff = Math.abs(new Date(d.time) - currentDate);
          const closestDiff = Math.abs(new Date(closest.time) - currentDate);
          return diff < closestDiff ? d : closest;
        }, todayDosages[0]);

        const dosageTimeKey = new Date(closestDosage.time)
          .toISOString()
          .slice(0, 16);

        const alreadyMarked = reminder.history.some(
          (entry) =>
            entry.forDate === dateString &&
            entry.forTime === dosageTimeKey &&
            ["taken", "skipped"].includes(entry.status)
        );

        if (!alreadyMarked) {
          reminder.history.push({
            timestamp: currentDate,
            status: "skipped",
            forDate: dateString,
            forTime: dosageTimeKey,
          });
          reminder.notifiedTimes.set(dosageTimeKey, "skipped");
          await reminder.save();
          console.log(`Reminder ${reminderId} marked as skipped.`);
        }
      }
    }

    // Fetch all emergency contacts and populate the user's name
    const contacts = await Contact.find({ userId }).populate("userId", "name");

    // // Fetch all emergency contacts for the user
    if (contacts.length > 0) {
      for (const contact of contacts) {
        const userName = contact.userId.name || "your loved one";
        const smsMessage = `Hi ${contact.name}, this is ReminderX. We want to inform you that ${userName} missed their scheduled medication. Please check on them soon to ensure they’re okay. If you have any inquiries, email us at support@reminderx.com .`;

        await sendSMS(contact.phone_number, smsMessage);
      }
    } else {
      console.log("No emergency contacts found for user:", userId);
    }

    return;
  }

  setTimeout(async () => {
    console.log(`Retry attempt ${attempt} for reminder ${reminderId}`);

    try {
      const reminder = await Reminder.findById(reminderId);
      if (!reminder) {
        console.log(
          `Reminder with ID ${reminderId} has been deleted. Stopping retries.`
        );
        return;
      }

      const isConfirmed = reminder.history.some(
        (entry) =>
          (entry.forDate === new Date().toISOString().split("T")[0] &&
            entry.status === "taken") ||
          entry.status === "skipped"
      );

      if (isConfirmed) {
        console.log(
          "Reminder already confirmed or skipped, stopping retries for reminder:",
          reminderId
        );
        return;
      }

      const user = await User.findById(userId);
      if (user?.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
        const expo = new Expo();

        const message = [
          {
            to: user.expoPushToken,
            sound: "default",
            channelId: "default",
            body:
              attempt === 1
                ? "[Attempt 1] Your medicine is ready in the tray. Please take it now so we know you're staying on track."
                : attempt === 2
                ? "[Attempt 2] Still waiting — your medicine is still in the tray. Please take it as soon as possible!"
                : "[Last Attempt] We still haven't heard from you! We'll notify your emergency contact via SMS to ensure you're okay.",
            data: { screen: "EventSchedule" }, // go to this screen when click
          },
        ];

        await expo.sendPushNotificationsAsync(message);
        console.log(
          `Retrying notification for reminder ${reminderId}, attempt ${attempt}`
        );
      }

      retryPushNotification(notification, attempt + 1);
    } catch (error) {
      console.log("Error during notification retry:", error);
    }
  }, delayMapping[attempt - 1]);
};

const sendPushNotifications = async (notifications) => {
  const expo = new Expo();
  const message = [];

  for (const notification of notifications) {
    const user = await User.findById(notification.userId);

    if (user?.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
      message.push({
        to: user.expoPushToken,
        sound: "default",
        channelId: "default",
        body: notification.message,
        data: { screen: "EventSchedule" },
      });
    }
  }

  const chunks = expo.chunkPushNotifications(message);

  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (error) {
      console.log(
        "An unexpected error occurred while sending a push notification",
        error
      );
    }
  }
};

const resetNotifiedFlagReminder = () => {
  cron.schedule("0 0 * * *", async () => {
    try {
      await Reminder.updateMany({}, { $set: { notifiedTimes: {} } });
      console.log("Reminder notified flags reset");
    } catch (error) {
      console.log("Error resetting notified flags of reminder:", error);
    }
  });
};

const scheduleReminderCheck = () => {
  cron.schedule("* * * * *", checkReminder);
};

module.exports = { scheduleReminderCheck, resetNotifiedFlagReminder };
