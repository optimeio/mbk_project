const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://master_admin:8ZARAthCf6gLX3Mo@masteradmin.xctbswi.mongodb.net/management_system?retryWrites=true&w=majority';

async function reproduce() {
    try {
        const { Schedule, Attendance, Trainer, User } = require('./models');
        const { deleteScheduleFeed } = require('./modules/schedules/schedules.service');
        await mongoose.connect(MONGO_URI);

        console.log('--- Step 1: Create Schedule & Attendance ---');
        const trainerId = '69a812d6bb1cc06febcdf20e';
        const trainer = await Trainer.findById(trainerId);
        
        const schedule = await Schedule.create({
            trainerId: trainer._id,
            collegeId: new mongoose.Types.ObjectId(),
            courseId: new mongoose.Types.ObjectId(),
            companyId: new mongoose.Types.ObjectId(),
            scheduledDate: new Date('2026-03-27'),
            startTime: '09:00',
            endTime: '17:00',
            dayNumber: 1,
            status: 'scheduled',
            isActive: true
        });

        const attendance = await Attendance.create({
            scheduleId: schedule._id,
            trainerId: trainer._id,
            date: new Date('2026-03-27'),
            status: 'Pending',
            verificationStatus: 'pending'
        });

        console.log('Created Schedule:', schedule._id);
        console.log('Created Attendance:', attendance._id);

        console.log('--- Step 2: Delete Schedule via Service ---');
        await deleteScheduleFeed({ 
            scheduleId: schedule._id, 
            payload: { reason: 'Reproduction test' } 
        });
        console.log('Schedule deleted via service.');

        const deletedSchedule = await Schedule.findById(schedule._id);
        console.log('Schedule in DB after delete:', deletedSchedule ? 'STILL EXISTS' : 'GONE');

        const linkedAttendance = await Attendance.findOne({ scheduleId: schedule._id });
        console.log('Linked Attendance Info:', {
            id: linkedAttendance?._id,
            status: linkedAttendance?.status,
            verificationStatus: linkedAttendance?.verificationStatus
        });
        
        if (linkedAttendance && linkedAttendance.status === 'cancelled') {
            console.log('SUCCESS: Attendance record marked as cancelled.');
        } else {
            console.log('FAILURE: Attendance record NOT marked as cancelled.');
        }

        // Cleanup
        await Attendance.deleteOne({ _id: attendance._id });
        console.log('Cleanup done.');

        process.exit(0);
    } catch (err) {
        console.error('Reproduction Error:', err);
        process.exit(1);
    }
}

reproduce();
