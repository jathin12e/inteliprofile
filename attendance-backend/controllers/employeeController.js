const db = require("../config/db");
const bcrypt = require('bcrypt');

// Get all employees
exports.getAllEmployees = async (req, res) => {
    try {
        const [rows] = await db.execute(
            "SELECT id, employee_code, name, email, phone, department, position, joining_date, status, created_at FROM employees ORDER BY id DESC"
        );
        
        res.status(200).json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error("Get Employees Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

// Get employee by ID
exports.getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await db.execute(
            "SELECT id, employee_code, name, email, phone, department, position, joining_date, status, created_at FROM employees WHERE id = ?",
            [id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Employee not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error("Get Employee Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

// Create new employee
exports.createEmployee = async (req, res) => {
    try {
        const { employee_code, name, email, phone, department, position, joining_date, password } = req.body;
        
        // Validate required fields
        if (!employee_code || !name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Required fields missing" 
            });
        }
        
        // Check if employee already exists
        const [existing] = await db.execute(
            "SELECT id FROM employees WHERE employee_code = ? OR email = ?",
            [employee_code, email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Employee code or email already exists" 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.execute(
            `INSERT INTO employees 
            (employee_code, name, email, phone, department, position, joining_date, password, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
            [employee_code, name, email, phone, department, position, joining_date, hashedPassword]
        );
        
        res.status(201).json({
            success: true,
            message: "Employee created successfully",
            data: { id: result.insertId, employee_code, name, email }
        });
    } catch (error) {
        console.error("Create Employee Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

// Update employee
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, department, position, status } = req.body;
        
        const [result] = await db.execute(
            `UPDATE employees 
            SET name = ?, email = ?, phone = ?, department = ?, position = ?, status = ?, updated_at = NOW()
            WHERE id = ?`,
            [name, email, phone, department, position, status, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Employee not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Employee updated successfully"
        });
    } catch (error) {
        console.error("Update Employee Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.execute("DELETE FROM employees WHERE id = ?", [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Employee not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Employee deleted successfully"
        });
    } catch (error) {
        console.error("Delete Employee Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};