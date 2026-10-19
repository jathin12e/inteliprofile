const db = require("../config/db");

// Calculate monthly salary
exports.calculateMonthlySalary = async (req, res) => {
    try {
        const { employee_id, year, month } = req.body;
        
        // Get employee basic salary
        const [employee] = await db.execute(
            "SELECT id, name, basic_salary FROM employees WHERE id = ?",
            [employee_id]
        );
        
        if (employee.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Employee not found" 
            });
        }
        
        // Get attendance for the month
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-${new Date(year, month, 0).getDate()}`;
        
        const [attendance] = await db.execute(
            `SELECT 
                COUNT(*) as total_days,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_days,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
                SUM(working_hours) as total_hours,
                SUM(overtime_hours) as total_overtime
            FROM attendance 
            WHERE employee_id = ? AND date BETWEEN ? AND ?`,
            [employee_id, startDate, endDate]
        );
        
        // Calculate salary
        const basicSalary = employee[0].basic_salary;
        const perDaySalary = basicSalary / attendance[0].total_days;
        const presentAmount = perDaySalary * attendance[0].present_days;
        const halfDayAmount = (perDaySalary / 2) * attendance[0].half_days;
        const overtimeAmount = attendance[0].total_overtime * (perDaySalary / 8) * 1.5; // 1.5x for overtime
        
        const totalSalary = presentAmount + halfDayAmount + overtimeAmount;
        
        // Save salary record
        const [result] = await db.execute(
            `INSERT INTO salaries 
            (employee_id, month, year, basic_salary, present_days, half_days, absent_days, 
             total_hours, overtime_hours, overtime_amount, total_salary, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [employee_id, month, year, basicSalary, attendance[0].present_days, 
             attendance[0].half_days, attendance[0].absent_days, attendance[0].total_hours,
             attendance[0].total_overtime, overtimeAmount, totalSalary]
        );
        
        res.status(200).json({
            success: true,
            message: "Salary calculated successfully",
            data: {
                salary_id: result.insertId,
                employee_name: employee[0].name,
                basic_salary: basicSalary,
                present_days: attendance[0].present_days,
                half_days: attendance[0].half_days,
                absent_days: attendance[0].absent_days,
                overtime_hours: attendance[0].total_overtime,
                overtime_amount: overtimeAmount,
                total_salary: totalSalary
            }
        });
        
    } catch (error) {
        console.error("Calculate Salary Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

// Get salary by employee
exports.getEmployeeSalary = async (req, res) => {
    try {
        const { employee_id } = req.params;
        
        const [rows] = await db.execute(
            `SELECT s.*, e.name, e.employee_code 
             FROM salaries s
             JOIN employees e ON s.employee_id = e.id
             WHERE s.employee_id = ?
             ORDER BY s.year DESC, s.month DESC`,
            [employee_id]
        );
        
        res.status(200).json({
            success: true,
            data: rows,
            count: rows.length
        });
    } catch (error) {
        console.error("Get Salary Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};