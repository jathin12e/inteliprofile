const express = require("express");
const router = express.Router();
const salaryController = require("../controllers/salaryController");

// Salary routes
router.post("/calculate", salaryController.calculateMonthlySalary);
router.get("/employee/:employee_id", salaryController.getEmployeeSalary);

module.exports = router;