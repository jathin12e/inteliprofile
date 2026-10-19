const db = require("../config/db");
const { 
    calculateHours, 
    calculateOvertime, 
    getStatus, 
    checkTodayAttendance,
    isValidPunchInTime,
    getLateMinutes 
} = require("../services/attendanceService");

// ✅ Punch IN
exports.punchIn = async (req, res) => {
    try {
        const { employee_id, latitude, longitude, photo, device_info } = req.body;

        // Validate required fields
        if (!employee_id || !photo) {
            return res.status(400).json({ 
                success: false, 
                message: "Employee ID and photo are required" 
            });
        }

        // Check if employee exists
        const [employee] = await db.execute(
            "SELECT * FROM employees WHERE id = ? AND status = 'active'",
            [employee_id]
        );
        
        if (employee.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Employee not found or inactive" 
            });
        }

        // Check if already punched in today
        const existingAttendance = await checkTodayAttendance(employee_id);
        if (existingAttendance && existingAttendance.check_out_time === null) {
            return res.status(400).json({ 
                success: false, 
                message: "Already punched in today. Please punch out first ❌",
                data: { check_in_time: existingAttendance.check_in_time }
            });
        }

        if (existingAttendance && existingAttendance.check_out_time !== null) {
            return res.status(400).json({ 
                success: false, 
                message: "Already completed attendance for today" 
            });
        }

        // Validate punch time
        if (!isValidPunchInTime(new Date())) {
            return res.status(400).json({ 
                success: false, 
                message: "Punch in only allowed between 6 AM and 10 PM" 
            });
        }

        // Get company settings
        const [settings] = await db.execute(
            "SELECT * FROM company_settings LIMIT 1"
        );
        
        const companySettings = settings[0] || {
            full_day_hours: 8,
            half_day_hours: 4,
            office_start_time: "09:00:00"
        };

        // Process base64 photo
        const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
        const photoBuffer = Buffer.from(base64Data, "base64");

        const today = new Date().toISOString().split('T')[0];
        
        // Insert attendance record
        const [result] = await db.execute(
            `INSERT INTO attendance 
            (employee_id, date, check_in_time, latitude, longitude, photo, device_info, status) 
            VALUES (?, ?, NOW(), ?, ?, ?, ?, 'pending')`,
            [employee_id, today, latitude, longitude, photoBuffer, device_info]
        );

        // Get late minutes
        const lateMinutes = getLateMinutes(new Date(), companySettings);

        res.status(200).json({
            success: true,
            message: "Punch In Successful ✅",
            data: {
                attendance_id: result.insertId,
                employee_id: employee_id,
                check_in_time: new Date().toISOString(),
                late_minutes: lateMinutes,
                date: today
            }
        });

    } catch (error) {
        console.error("Punch In Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

// ✅ Punch OUT
exports.punchOut = async (req, res) => {
    try {
        const { employee_id } = req.body;

        if (!employee_id) {
            return res.status(400).json({ 
                success: false, 
                message: "Employee ID is required" 
            });
        }

        // Get today's attendance record
        const attendance = await checkTodayAttendance(employee_id);
        
        if (!attendance) {
            return res.status(400).json({ 
                success: false, 
                message: "No punch-in record found for today. Please punch in first ❌" 
            });
        }

        if (attendance.check_out_time) {
            return res.status(400).json({ 
                success: false, 
                message: "Already punched out for today" 
            });
        }

        // Get company settings
        const [settings] = await db.execute(
            "SELECT * FROM company_settings LIMIT 1"
        );
        
        const companySettings = settings[0] || {
            full_day_hours: 8,
            half_day_hours: 4
        };

        // Calculate working hours
        const checkOutTime = new Date();
        const workingHours = calculateHours(attendance.check_in_time, checkOutTime);
        const overtime = calculateOvertime(workingHours, companySettings);
        const status = getStatus(workingHours, companySettings);

        // Update attendance record
        await db.execute(
            `UPDATE attendance 
            SET check_out_time = NOW(), 
                working_hours = ?, 
                overtime_hours = ?, 
                status = ?,
                updated_at = NOW()
            WHERE id = ?`,
            [workingHours, overtime, status, attendance.id]
        );

        res.status(200).json({
            success: true,
            message: "Punch Out Successful ✅",
            data: {
                attendance_id: attendance.id,
                employee_id: employee_id,
                check_in_time: attendance.check_in_time,
                check_out_time: checkOutTime.toISOString(),
                working_hours: workingHours,
                overtime_hours: overtime,
                status: status,
                date: attendance.date
            }
        });

    } catch (error) {
        console.error("Punch Out Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

// ✅ Get Attendance by Date Range
exports.getAttendanceByDateRange = async (req, res) => {
    try {
        const { employee_id, start_date, end_date } = req.query;
        
        let query = `
            SELECT a.*, e.name, e.employee_code, e.department 
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE 1=1
        `;
        const params = [];

        if (employee_id) {
            query += " AND a.employee_id = ?";
            params.push(employee_id);
        }

        if (start_date && end_date) {
            query += " AND a.date BETWEEN ? AND ?";
            params.push(start_date, end_date);
        }

        query += " ORDER BY a.date DESC, a.check_in_time DESC";

        const [rows] = await db.execute(query, params);
        
        res.status(200).json({
            success: true,
            data: rows,
            count: rows.length
        });

    } catch (error) {
        console.error("Get Attendance Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

// ✅ Get Today's Attendance Summary
exports.getTodaySummary = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const [result] = await db.execute(`
            SELECT 
                COUNT(*) as total_employees,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN status = 'half_day' THEN 1 ELSE 0 END) as half_day,
                SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN check_in_time IS NOT NULL AND check_out_time IS NULL THEN 1 ELSE 0 END) as working_now
            FROM attendance a
            JOIN employees e ON a.employee_id = e.id
            WHERE a.date = ? AND e.status = 'active'
        `, [today]);

        res.status(200).json({
            success: true,
            data: result[0],
            date: today
        });

    } catch (error) {
        console.error("Get Summary Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};