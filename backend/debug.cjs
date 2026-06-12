try {
    require("./routes/attendanceRoutes");
    console.log("attendanceRoutes loaded OK");
} catch (e) {
    console.error("ATTENDANCE BOOT ERROR:", e.message);
    console.error("STACK:", e.stack);
}
