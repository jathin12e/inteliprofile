const db = require("../config/db");

// Get company settings
exports.getSettings = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT * FROM company_settings LIMIT 1");
        
        if (rows.length === 0) {
            // Return default settings if none exist
            return res.status(200).json({
                success: true,
                data: {
                    company_name: "Your Company",
                    full_day_hours: 8,
                    half_day_hours: 4,
                    office_start_time: "09:00:00",
                    office_end_time: "18:00:00",
                    overtime_enabled: true,
                    overtime_rate: 1.5
                }
            });
        }
        
        res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error("Get Settings Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

// Update company settings
exports.updateSettings = async (req, res) => {
    try {
        const { 
            company_name, 
            full_day_hours, 
            half_day_hours, 
            office_start_time, 
            office_end_time,
            overtime_enabled,
            overtime_rate 
        } = req.body;
        
        // Check if settings exist
        const [existing] = await db.execute("SELECT id FROM company_settings LIMIT 1");
        
        let result;
        if (existing.length === 0) {
            // Insert new settings
            [result] = await db.execute(
                `INSERT INTO company_settings 
                (company_name, full_day_hours, half_day_hours, office_start_time, 
                 office_end_time, overtime_enabled, overtime_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [company_name, full_day_hours, half_day_hours, office_start_time, 
                 office_end_time, overtime_enabled, overtime_rate]
            );
        } else {
            // Update existing settings
            [result] = await db.execute(
                `UPDATE company_settings 
                SET company_name = ?, full_day_hours = ?, half_day_hours = ?, 
                    office_start_time = ?, office_end_time = ?, overtime_enabled = ?, 
                    overtime_rate = ?, updated_at = NOW()
                WHERE id = ?`,
                [company_name, full_day_hours, half_day_hours, office_start_time, 
                 office_end_time, overtime_enabled, overtime_rate, existing[0].id]
            );
        }
        
        res.status(200).json({
            success: true,
            message: "Settings updated successfully"
        });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
};