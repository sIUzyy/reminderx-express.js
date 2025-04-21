// -- importing section --
const bodyParser = require("body-parser"); // body-parser
const mongoose = require("mongoose"); // mongoose
const express = require("express"); // express js
const cors = require("cors"); // cors

const PORT = process.env.PORT || process.env.PORT_ALTER; // port
const GLOBAL_ACCESS = process.env.GLOBAL_ACCESS;
const URL = process.env.URL; // conection string to mongodb

// node-cron - inventory
const {
  scheduleInventoryCheck,
  resetNotifiedFlag,
} = require("./jobs/inventoryChecker");

// node-cron - reminder
const {
  scheduleReminderCheck,
  resetNotifiedFlagReminder,
} = require("./jobs/reminderChecker");

// routes
const notificationRoutes = require("./routes/notification-route");
const inventoryRoutes = require("./routes/inventory-route");
const reminderRoutes = require("./routes/reminder-route");
const contactRoutes = require("./routes/contact-route");
const doctorRoutes = require("./routes/doctor-route");
const userRoutes = require("./routes/user-route");
const esp32Routes = require("./routes/esp32-model-route");

// -- initialize section --

// initialize an express
const app = express();

// this will parse any incoming request body and extract any json data.
app.use(bodyParser.json());

// cors middleware
app.use(
  cors({
    origin: "*", // You can replace "*" with your frontend's URL, like "http://localhost:3000"
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  })
);

// middleware for routes - mobile app
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reminder", reminderRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notification", notificationRoutes);

// middleware for routes - esp32
app.use("/api/model", esp32Routes);

// -- error handling middleware
app.use((error, req, res, next) => {
  // check if response has already been sent
  if (res.headerSent) {
    return next(error); // if yes, we won't send a response on our own.
  }

  // if we have code status, if we don't have code status send 500 status
  res.status(error.code || 500);

  // check if there's an error message, if we don't show the default message.
  res.json({ message: error.message || "An unknown error occured." });
});

// start scheduled tasks
scheduleReminderCheck();
scheduleInventoryCheck();
resetNotifiedFlagReminder();
resetNotifiedFlag();

// -- connection section --
mongoose
  .connect(URL)
  .then(() => {
    app.listen(PORT, GLOBAL_ACCESS, () => {
      console.log("CONNECTED TO MONGODB...");
      console.log(`SERVER RUNNING ON PORT ${PORT}`);
    });
  })
  .catch((err) => console.error("MongoDB connection error:", err));
