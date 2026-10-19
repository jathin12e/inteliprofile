const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");

// Attendance routes
router.post("/punch-in", attendanceController.punchIn);
router.post("/punch-out", attendanceController.punchOut);
router.get("/get-attendance", attendanceController.getAttendanceByDateRange);
router.get("/today-summary", attendanceController.getTodaySummary);

module.exports = router;