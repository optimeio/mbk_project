/**
 * Runtime reference audit - checks all functions extracted to sideeffects.js
 * still exist as either local definitions or imports in attendanceRoutes.js
 */
const fs = require('fs');
const content = fs.readFileSync('./routes/attendanceRoutes.js', 'utf8');

const extractedFunctions = [
    'hasAttendanceDocs',
    'hasGeoTagDocs',
    'normalizeVerificationStatus',
    'buildDocsStatusLabel',
    'buildGeoStatusLabel',
    'normalizeDayStatus',
    'buildPersistedDayStatus',
    'syncScheduleDayState',
    'deriveScheduleLifecycleStatusFromAttendance',
    'syncScheduleLifecycleStatusFromAttendance',
    'emitAttendanceRealtimeUpdate',
];

let allClear = true;
for (const fn of extractedFunctions) {
    // Count call sites (not just definitions/imports)
    const callPattern = new RegExp(`${fn}\\s*\\(`, 'g');
    const callSites = (content.match(callPattern) || []).length;
    const isImported = content.includes(`${fn},`) || content.includes(`${fn}\n`) || content.includes(`${fn} `);
    const isLocalDefined = content.includes(`const ${fn} =`) || content.includes(`function ${fn}`);
    
    if (callSites > 0 && !isImported && !isLocalDefined) {
        console.error(`❌ MISSING: ${fn} is called ${callSites} time(s) but not imported or defined locally`);
        allClear = false;
    } else if (callSites > 0) {
        console.log(`✅ OK: ${fn} found (${callSites} call site(s)) - imported=${isImported}, local=${isLocalDefined}`);
    } else {
        console.log(`⚪ UNUSED in attendanceRoutes: ${fn}`);
    }
}

if (allClear) {
    console.log('\n✅ All extracted functions are properly accounted for.');
} else {
    console.log('\n❌ Some functions are missing - server will crash at runtime!');
}
