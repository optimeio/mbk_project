import Trainer from '../models/Trainer.mjs';
import College from '../models/College.mjs';
import TrainerUpload from '../models/TrainerUpload.mjs';
import ErrorLog from '../models/ErrorLog.mjs';
import { createTrainerFolderStructure, createCollegeFolderStructure } from '../services/googleDriveService.mjs';

// Register new trainer
export const registerTrainer = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, qualifications } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !qualifications || qualifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Check if trainer already exists
    const existingTrainer = await Trainer.findOne({ $or: [{ email }, { phone }] });
    if (existingTrainer) {
      return res.status(409).json({
        success: false,
        message: 'Trainer with this email or phone already exists',
      });
    }

    // Create Google Drive folder structure
    const trainerName = `${firstName}_${lastName}`.replace(/\s+/g, '_');
    let googleDriveFolderId = null;
    let googleDocsId = null;

    try {
      const folderResult = await createTrainerFolderStructure(trainerName);
      googleDriveFolderId = folderResult.trainerId;
      googleDocsId = folderResult.docsId;
    } catch (error) {
      // Log error but continue - trainer can upload to Google Drive manually
      await ErrorLog.create({
        errorType: error.type || 'FOLDER_CREATION_FAILED',
        severity: 'high',
        message: error.message,
        metadata: {
          trainerName,
          email,
          phone,
        },
      });
    }

    // Create trainer record
    const trainer = await Trainer.create({
      firstName,
      lastName,
      email,
      phone,
      qualifications,
      googleDriveFolderId,
      registrationStatus: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Trainer registered successfully',
      data: {
        trainerId: trainer._id,
        email: trainer.email,
        registrationStatus: trainer.registrationStatus,
      },
    });
  } catch (error) {
    console.error('Trainer registration error:', error);
    
    await ErrorLog.create({
      errorType: 'VALIDATION_ERROR',
      severity: 'high',
      message: error.message,
      stack: error.stack,
      metadata: req.body,
    });

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

// Get trainer profile
export const getTrainerProfile = async (req, res) => {
  try {
    const { trainerId } = req.params;

    const trainer = await Trainer.findById(trainerId).populate('colleges.collegeId');

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found',
      });
    }

    // Get recent uploads
    const recentUploads = await TrainerUpload.find({
      trainerId,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        trainer,
        recentUploads,
      },
    });
  } catch (error) {
    console.error('Get trainer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainer profile',
      error: error.message,
    });
  }
};

// Get all trainers (admin)
export const getAllTrainers = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    const skip = (page - 1) * limit;
    const query = {};

    if (status) query.registrationStatus = status;
    if (search) {
      query.$or = [
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const trainers = await Trainer.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Trainer.countDocuments(query);

    res.status(200).json({
      success: true,
      data: trainers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get all trainers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainers',
      error: error.message,
    });
  }
};

// Approve trainer registration
export const approveTrainer = async (req, res) => {
  try {
    const { trainerId } = req.params;

    const trainer = await Trainer.findByIdAndUpdate(
      trainerId,
      { registrationStatus: 'approved', verificationStatus: 'verified' },
      { new: true }
    );

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Trainer approved successfully',
      data: trainer,
    });
  } catch (error) {
    console.error('Approve trainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve trainer',
      error: error.message,
    });
  }
};

// Assign college to trainer
export const assignCollegeToTrainer = async (req, res) => {
  try {
    const { trainerId, collegeId, collegeName } = req.body;

    // Validation
    if (!trainerId || !collegeId || !collegeName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Get trainer and college
    const trainer = await Trainer.findById(trainerId);
    const college = await College.findById(collegeId);

    if (!trainer || !college) {
      return res.status(404).json({
        success: false,
        message: 'Trainer or College not found',
      });
    }

    // Check if already assigned
    const alreadyAssigned = trainer.colleges.some(c => c.collegeId.toString() === collegeId);
    if (alreadyAssigned) {
      return res.status(409).json({
        success: false,
        message: 'College already assigned to this trainer',
      });
    }

    // Create college folder structure in Google Drive
    let collegeFolderId = null;
    let dayFolders = null;

    try {
      if (trainer.googleDriveFolderId) {
        const folderResult = await createCollegeFolderStructure(
          trainer.googleDriveFolderId,
          collegeName
        );
        collegeFolderId = folderResult.collegeFolderId;
        dayFolders = folderResult.dayFolders;
      }
    } catch (error) {
      await ErrorLog.create({
        errorType: error.type || 'FOLDER_CREATION_FAILED',
        severity: 'high',
        message: error.message,
        metadata: {
          trainerId,
          collegeName,
          collegeId,
        },
      });
      // Continue anyway - folders can be created manually
    }

    // Add college to trainer
    trainer.colleges.push({
      collegeId,
      collegeName,
      googleDriveFolderId: collegeFolderId,
      assignedDate: new Date(),
    });

    await trainer.save();

    // Increment total trainers for college
    college.totalTrainers += 1;
    await college.save();

    res.status(200).json({
      success: true,
      message: 'College assigned to trainer successfully',
      data: {
        trainerId,
        collegeId,
        collegeName,
        googleDriveFolderId: collegeFolderId,
        dayFolders,
      },
    });
  } catch (error) {
    console.error('Assign college error:', error);
    
    await ErrorLog.create({
      errorType: 'DATABASE_ERROR',
      severity: 'high',
      message: error.message,
      metadata: req.body,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to assign college',
      error: error.message,
    });
  }
};

// Get trainer's assigned colleges
export const getTrainerColleges = async (req, res) => {
  try {
    const { trainerId } = req.params;

    const trainer = await Trainer.findById(trainerId).populate('colleges.collegeId');

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found',
      });
    }

    res.status(200).json({
      success: true,
      data: trainer.colleges,
    });
  } catch (error) {
    console.error('Get trainer colleges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainer colleges',
      error: error.message,
    });
  }
};

export default {
  registerTrainer,
  getTrainerProfile,
  getAllTrainers,
  approveTrainer,
  assignCollegeToTrainer,
  getTrainerColleges,
};
