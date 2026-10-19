const db = require("../config/db");

// Calculate working hours between check-in and check-out
const calculateHours = (checkIn, checkOut) => {
    const checkInTime = new Date(checkIn);
    const checkOutTime = new Date(checkOut);
    const diff = checkOutTime - checkInTime;
    return parseFloat((diff / (1000 * 60 * 60)).toFixed(2)); // hours with 2 decimals
};

// Calculate overtime hours
const calculateOvertime = (hours, settings) => {
    if (hours > settings.full_day_hours) {
        return parseFloat((hours - settings.full_day_hours).toFixed(2));
    }
    return 0;
};

// Decide attendance status based on working hours and company rules
const getStatus = (hours, settings) => {
    if (hours >= settings.full_day_hours) return "present";
    if (hours >= settings.half_day_hours) return "half_day";
    if (hours > 0 && hours < settings.half_day_hours) return "absent";
    return "absent";
};

// Check if employee already punched in today
const checkTodayAttendance = async (employee_id) => {
    const today = new Date().toISOString().split('T')[0];
    const [rows] = await db.execute(
        "SELECT * FROM attendance WHERE employee_id = ? AND date = ?",
        [employee_id, today]
    );
    return rows[0] || null;
};

// Validate punch-in time (e.g., not before 6 AM)
const isValidPunchInTime = (punchTime) => {
    const hours = new Date(punchTime).getHours();
    return hours >= 6 && hours <= 22; // Allow punches between 6 AM and 10 PM
};

// Get late arrival minutes
const getLateMinutes = (checkInTime, settings) => {
    const checkInHour = new Date(checkInTime).getHours();
    const checkInMinute = new Date(checkInTime).getMinutes();
    const officeStartHour = settings.office_start_time.split(':')[0];
    const officeStartMinute = settings.office_start_time.split(':')[1];
    
    if (checkInHour > officeStartHour || 
        (checkInHour === parseInt(officeStartHour) && checkInMinute > parseInt(officeStartMinute))) {
        const lateMinutes = (checkInHour - officeStartHour) * 60 + 
                           (checkInMinute - officeStartMinute);
        return lateMinutes;
    }
    return 0;
};

module.exports = {
    calculateHours,
    calculateOvertime,
    getStatus,
    checkTodayAttendance,
    isValidPunchInTime,
    getLateMinutes
};