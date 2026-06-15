const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Batch, Course, College, Student, Trainer, Attendance } = require('../models');
const { authenticate } = require('../middleware/auth');

// @route   GET /api/batches
// @desc    Get all batches (optionally filtered by courseId and/or collegeId)
// @access  Authenticated
router.get('/', authenticate, async (req, res) => {
    try {
        const { courseId, collegeId } = req.query;
        const filter = {};
        if (courseId) filter.courseId = courseId;
        if (collegeId) filter.collegeId = collegeId;

        const batches = await Batch.find(filter)
            .populate('trainerIds', 'name email')
            .populate('students', 'fullName email rollNo registerNo')
            .sort({ createdAt: -1 });

        res.json(batches);
    } catch (error) {
        console.error('[ERROR] GET /api/batches failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/batches/stats
// @desc    Get batch management statistics for dashboard cards
// @access  Authenticated
router.get('/stats', authenticate, async (req, res) => {
    try {
        const { courseId, collegeId } = req.query;

        if (collegeId && courseId) {
            // Stats for College Card
            const [batchesCount, trainersCount, studentsCount] = await Promise.all([
                Batch.countDocuments({ courseId, collegeId }),
                // Get unique trainers assigned to batches in this college-course
                Batch.distinct('trainerIds', { courseId, collegeId }),
                Student.countDocuments({ courseId, collegeId })
            ]);

            return res.json({
                totalBatches: batchesCount,
                totalTrainers: trainersCount.length,
                totalStudents: studentsCount
            });
        } else if (courseId) {
            // Stats for Course Card
            const [collegesCount, batchesCount, studentsCount] = await Promise.all([
                College.countDocuments({ courseId }),
                Batch.countDocuments({ courseId }),
                Student.countDocuments({ courseId })
            ]);

            return res.json({
                totalColleges: collegesCount,
                totalBatches: batchesCount,
                totalStudents: studentsCount
            });
        }

        res.status(400).json({ message: 'Missing courseId or collegeId query parameter' });
    } catch (error) {
        console.error('[ERROR] GET /api/batches/stats failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/batches/:id
// @desc    Get a single batch by ID
// @access  Authenticated
router.get('/:id', authenticate, async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id)
            .populate('trainerIds', 'name email')
            .populate('students', 'fullName email rollNo registerNo');

        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }
        res.json(batch);
    } catch (error) {
        console.error('[ERROR] GET /api/batches/:id failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/batches
// @desc    Create a new batch
// @access  Super Admin
router.post('/', authenticate, async (req, res) => {
    try {
        const { courseId, collegeId, batchName, trainerIds, startDate, endDate, capacity, status } = req.body;

        if (!courseId || !collegeId || !batchName) {
            return res.status(400).json({ message: 'courseId, collegeId, and batchName are required' });
        }

        const batch = await Batch.create({
            courseId,
            collegeId,
            batchName,
            trainerIds: trainerIds || [],
            startDate,
            endDate,
            capacity: capacity || 60,
            status: status || 'active'
        });

        res.status(201).json(batch);
    } catch (error) {
        console.error('[ERROR] POST /api/batches failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/batches/:id
// @desc    Update a batch
// @access  Super Admin
router.put('/:id', authenticate, async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        const { batchName, batchCode, trainerIds, startDate, endDate, capacity, status } = req.body;

        if (batchName) batch.batchName = batchName;
        if (batchCode) batch.batchCode = batchCode;
        if (trainerIds) batch.trainerIds = trainerIds;
        if (startDate !== undefined) batch.startDate = startDate;
        if (endDate !== undefined) batch.endDate = endDate;
        if (capacity) batch.capacity = capacity;
        if (status) batch.status = status;

        await batch.save();
        res.json(batch);
    } catch (error) {
        console.error('[ERROR] PUT /api/batches/:id failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/batches/:id
// @desc    Delete a batch
// @access  Super Admin
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        // Clean up references in Student collection
        await Student.updateMany({ batchId: batch._id }, { $set: { batchId: null } });

        // Clean up references in Attendance collection
        await Attendance.updateMany({ batchId: batch._id }, { $set: { batchId: null } });

        await batch.deleteOne();
        res.json({ message: 'Batch deleted successfully' });
    } catch (error) {
        console.error('[ERROR] DELETE /api/batches/:id failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/batches/:id/students
// @desc    Assign students to a batch
// @access  Super Admin
router.post('/:id/students', authenticate, async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        const { studentIds } = req.body;
        if (!Array.isArray(studentIds)) {
            return res.status(400).json({ message: 'studentIds must be an array' });
        }

        // Set batchId for newly assigned students
        await Student.updateMany(
            { _id: { $in: studentIds } },
            { $set: { batchId: batch._id } }
        );

        // Remove batchId for students no longer in this list
        await Student.updateMany(
            { batchId: batch._id, _id: { $nin: studentIds } },
            { $set: { batchId: null } }
        );

        // Update Batch model's students list
        batch.students = studentIds;
        await batch.save();

        res.json({ success: true, message: 'Students assigned successfully', count: studentIds.length });
    } catch (error) {
        console.error('[ERROR] POST /api/batches/:id/students failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/batches/:id/attendance
// @desc    Get attendance records tracked under a specific batch
// @access  Authenticated
router.get('/:id/attendance', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const attendanceLogs = await Attendance.find({ batchId: id })
            .populate('trainerId', 'name email')
            .sort({ date: -1 });

        res.json(attendanceLogs);
    } catch (error) {
        console.error('[ERROR] GET /api/batches/:id/attendance failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
