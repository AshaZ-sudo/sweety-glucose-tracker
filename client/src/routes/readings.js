const express = require("express");
const { pool } = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const validSlots = [
  "Morning (fasting)",
  "After breakfast",
  "After lunch",
  "After dinner",
];

// Add a reading
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { reading_date, slot, value } = req.body;

    if (!reading_date || !slot || value === undefined) {
      return res.status(400).json({
        message: "Date, slot, and glucose value are required",
      });
    }

    if (!validSlots.includes(slot)) {
      return res.status(400).json({ message: "Invalid reading slot" });
    }

    const glucoseValue = Number(value);

    if (!Number.isInteger(glucoseValue) || glucoseValue < 40 || glucoseValue > 600) {
      return res.status(400).json({
        message: "Glucose value must be an integer between 40 and 600",
      });
    }

    const dateCheck = await pool.query(
      "SELECT $1::date AS date_value, CURRENT_DATE AS today",
      [reading_date]
    );

    if (!dateCheck.rows[0].date_value) {
      return res.status(400).json({ message: "Invalid date" });
    }

    if (dateCheck.rows[0].date_value > dateCheck.rows[0].today) {
      return res.status(400).json({ message: "Future dates are not allowed" });
    }

    const result = await pool.query(
      `INSERT INTO readings (user_id, reading_date, slot, value)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.userId, reading_date, slot, glucoseValue]
    );

    res.status(201).json({
      message: "Reading added successfully",
      reading: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "A reading already exists for this date and slot",
      });
    }

    console.error("Add reading error:", error.message);
    res.status(500).json({ message: "Server error adding reading" });
  }
});

// View all readings for the logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, reading_date, slot, value, created_at
       FROM readings
       WHERE user_id = $1
       ORDER BY reading_date DESC, slot`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch readings error:", error.message);
    res.status(500).json({ message: "Server error fetching readings" });
  }
});

// Edit a reading
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { reading_date, slot, value } = req.body;

    if (!reading_date || !slot || value === undefined) {
      return res.status(400).json({
        message: "Date, slot, and glucose value are required",
      });
    }

    if (!validSlots.includes(slot)) {
      return res.status(400).json({ message: "Invalid reading slot" });
    }

    const glucoseValue = Number(value);

    if (!Number.isInteger(glucoseValue) || glucoseValue < 40 || glucoseValue > 600) {
      return res.status(400).json({
        message: "Glucose value must be an integer between 40 and 600",
      });
    }

    const dateCheck = await pool.query(
      "SELECT $1::date AS date_value, CURRENT_DATE AS today",
      [reading_date]
    );

    if (!dateCheck.rows[0].date_value) {
      return res.status(400).json({ message: "Invalid date" });
    }

    if (dateCheck.rows[0].date_value > dateCheck.rows[0].today) {
      return res.status(400).json({ message: "Future dates are not allowed" });
    }

    const result = await pool.query(
      `UPDATE readings
       SET reading_date = $1, slot = $2, value = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [reading_date, slot, glucoseValue, req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Reading not found" });
    }

    res.json({
      message: "Reading updated successfully",
      reading: result.rows[0],
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "A reading already exists for this date and slot",
      });
    }

    console.error("Update reading error:", error.message);
    res.status(500).json({ message: "Server error updating reading" });
  }
});

// Delete a reading
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM readings WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Reading not found" });
    }

    res.json({ message: "Reading deleted successfully" });
  } catch (error) {
    console.error("Delete reading error:", error.message);
    res.status(500).json({ message: "Server error deleting reading" });
  }
});

// Daily report
router.get("/reports/daily", authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required (YYYY-MM-DD)" });
    }

    const result = await pool.query(
      `SELECT reading_date, slot, value
       FROM readings
       WHERE user_id = $1 AND reading_date = $2::date
       ORDER BY slot`,
      [req.userId, date]
    );

    res.json({
      date,
      readings: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Daily report error:", error.message);
    res.status(500).json({ message: "Server error generating daily report" });
  }
});

// Monthly report
router.get("/reports/monthly", authMiddleware, async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "Month is required in YYYY-MM format" });
    }

    const result = await pool.query(
      `SELECT reading_date, slot, value
       FROM readings
       WHERE user_id = $1
         AND reading_date >= ($2 || '-01')::date
         AND reading_date < (($2 || '-01')::date + INTERVAL '1 month')
       ORDER BY reading_date, slot`,
      [req.userId, month]
    );

    const summary = await pool.query(
      `SELECT COUNT(*)::int AS total_readings,
              ROUND(AVG(value), 1) AS average_value,
              MIN(value) AS min_value,
              MAX(value) AS max_value
       FROM readings
       WHERE user_id = $1
         AND reading_date >= ($2 || '-01')::date
         AND reading_date < (($2 || '-01')::date + INTERVAL '1 month')`,
      [req.userId, month]
    );

    res.json({
      month,
      readings: result.rows,
      summary: summary.rows[0],
    });
  } catch (error) {
    console.error("Monthly report error:", error.message);
    res.status(500).json({ message: "Server error generating monthly report" });
  }
});

// Previous month report
router.get("/reports/previous-month", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
  `SELECT
      TO_CHAR(DATE_TRUNC('month', reading_date), 'YYYY-MM') AS month,
      COUNT(*)::int AS total_readings,
      ROUND(AVG(value), 1) AS average_value,
      MIN(value) AS min_value,
      MAX(value) AS max_value
   FROM readings
   WHERE user_id = $1
     AND reading_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
     AND reading_date < DATE_TRUNC('month', CURRENT_DATE)
   GROUP BY DATE_TRUNC('month', reading_date)
   ORDER BY DATE_TRUNC('month', reading_date)`,
  [req.userId]
);

    res.json({
      report: result.rows[0] || {
        message: "No readings found for the previous month",
      },
    });
  } catch (error) {
    console.error("Previous month report error:", error.message);
    res.status(500).json({ message: "Server error generating previous month report" });
  }
});

module.exports = router;