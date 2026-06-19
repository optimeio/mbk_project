const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { Schedule, Trainer, User, College, Course } = require('../models');
const { connectToDatabase } = require('../config/database.mjs');

async function run() {
    await connectToDatabase();
    
    const totalSchedules = await Schedule.countDocuments();
    const totalTrainers = await Trainer.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalColleges = await College.countDocuments();
    const totalCourses = await Course.countDocuments();

    console.log('--- Database Stats ---');
    console.log('Total Schedules:', totalSchedules);
    console.log('Total Trainers:', totalTrainers);
    console.log('Total Users:', totalUsers);
    console.log('Total Colleges:', totalColleges);
    console.log('Total Courses:', totalCourses);

    if (totalTrainers > 0) {
        const trainers = await Trainer.find().populate('userId');
        console.log('--- Trainers List ---');
        console.log(trainers.map(t => ({
            id: t._id,
            trainerIdCode: t.trainerId,
            name: t.name,
            email: t.email,
            userId: t.userId?._id,
            userEmail: t.userId?.email,
            userRole: t.userId?.role
        })));
    }

    if (totalSchedules > 0) {
        const schedules = await Schedule.find().limit(10).populate('trainerId');
        console.log('--- Sample Schedules (First 10) ---');
        console.log(schedules.map(s => ({
            id: s._id,
            trainerId: s.trainerId?._id || s.trainerId,
            trainerCode: s.trainerId?.trainerId,
            collegeId: s.collegeId,
            courseId: s.courseId,
            dayNumber: s.dayNumber,
            dayOfWeek: s.dayOfWeek,
            scheduledDate: s.scheduledDate,
            status: s.status
        })));
    }
    
    await mongoose.connection.close();
}

run().catch(console.error);
