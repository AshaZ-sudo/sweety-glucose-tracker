const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { pool, initializeDatabase } = require("./db");
const authRoutes = require("./routes/auth");
const readingsRoutes = require("./routes/readings");

const app = express();

app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.json({ message: "Sweety Glucose Tracker API is running!" });
});

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/readings", readingsRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await pool.query("SELECT NOW()");
    console.log("PostgreSQL connected successfully.");

    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
