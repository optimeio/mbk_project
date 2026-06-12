import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createRequire } from 'module';
import Student from '../models/Student.js';
import Company from '../models/Company.js';
import User from '../models/User.js';

const require = createRequire(import.meta.url);
const {
  requestStudentPasswordResetOtp,
  verifyStudentPasswordResetOtp,
  resetStudentPasswordWithToken,
} = require('../services/auth/studentPasswordResetService.js');
const { validateUniqueness } = require('../services/auth/globalUniquenessService.js');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production';

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // simple-auth tokens use `id`; tokens from jwtUtils (general /api/auth login) use `userId`
    req.userId = decoded.id || decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// ============================================================================
// STUDENT API ROUTES
// ============================================================================

router.post('/student/register', async (req, res) => {
  try {
    const { fullName, email, phone, college, course, password, confirmPassword } = req.body;

    if (!fullName || !email || !phone || !college || !course || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    if (phone.replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid phone number' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Validate global uniqueness for email and phone across all collections
    const validated = await validateUniqueness({ email, phone });

    const newStudent = new Student({
      fullName,
      email: validated.email,
      phoneNumber: validated.phone,
      collegeName: college,
      course,
      password,
      // Legacy required fields placeholder
      collegeId: null,
      rollNo: 'N/A',
      name: fullName
    });
    // Unique per-student placeholder; 'N/A' for everyone collides with the
    // unique { collegeId, registerNo } index (E11000) after the first signup.
    newStudent.registerNo = `SELF-${newStudent._id}`;

    await newStudent.save();

    const token = jwt.sign(
      { id: newStudent._id, email: newStudent.email, fullName: newStudent.fullName, role: 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Student Registration Successful',
      token,
      student: {
        id: newStudent._id,
        fullName: newStudent.fullName,
        email: newStudent.email,
        phone: newStudent.phoneNumber,
        college: newStudent.collegeName,
        course: newStudent.course,
      },
      studentId: newStudent._id,
    });
  } catch (err) {
    console.error('Registration error:', err);
    
    // Handle uniqueness validation errors
    if (err.statusCode === 409 && err.field) {
      return res.status(409).json({ 
        success: false, 
        message: err.message,
        field: err.field,
        foundIn: err.foundIn,
      });
    }
    
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email or phone already exists' });
    }
    
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      message: err.message || 'Error creating account. Please try again.', 
      error: err.message 
    });
  }
});

router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const student = await Student.findOne({ email: email.toLowerCase() });
    if (!student) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isPasswordValid = await student.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: student._id, email: student.email, fullName: student.fullName, role: 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      student: {
        id: student._id,
        fullName: student.fullName,
        email: student.email,
        phone: student.phoneNumber,
        college: student.collegeName,
        course: student.course,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Error logging in. Please try again.', error: err.message });
  }
});

const handleStudentResetError = (res, error) => {
  const status = error.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: error.message || 'Request failed',
  });
};

router.post('/student/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    const result = await requestStudentPasswordResetOtp({
      email,
      ipAddress: req.ip,
    });
    return res.json(result);
  } catch (error) {
    console.error('[AUTH] student forgot-password error:', error);
    return handleStudentResetError(res, error);
  }
});

router.post('/student/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const result = await verifyStudentPasswordResetOtp({ email, otp });
    return res.json(result);
  } catch (error) {
    console.error('[AUTH] student verify-reset-otp error:', error);
    return handleStudentResetError(res, error);
  }
});

router.post('/student/reset-password', async (req, res) => {
  try {
    const { tempToken, password } = req.body || {};
    const result = await resetStudentPasswordWithToken({ tempToken, password });
    return res.json(result);
  } catch (error) {
    console.error('[AUTH] student reset-password error:', error);
    return handleStudentResetError(res, error);
  }
});

router.get('/student/dashboard', verifyToken, async (req, res) => {
  try {
    const student = await Student.findById(req.userId).select('-password');
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    return res.status(200).json({
      success: true,
      student: {
        id: student._id,
        fullName: student.fullName,
        email: student.email,
        phone: student.phoneNumber,
        college: student.collegeName,
        course: student.course,
        companyCode: student.companyCode || null,
        createdAt: student.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
  }
});

router.put('/student/profile', verifyToken, async (req, res) => {
  try {
    if (String(req.userRole || '').toLowerCase() !== 'student') {
      return res.status(403).json({ success: false, message: 'Student access required' });
    }

    const student = await Student.findById(req.userId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const { fullName, phone, college, course } = req.body || {};
    
    // Validate phone uniqueness if being updated
    if (phone && phone !== student.phoneNumber) {
      const { validateUniqueness } = require('../services/auth/globalUniquenessService.js');
      const validated = await validateUniqueness({ 
        email: student.email, // Keep existing email
        phone,
        excludeId: student._id,
        excludeModel: 'Student',
      });
      student.phoneNumber = validated.phone;
    }
    
    if (fullName) student.fullName = String(fullName).trim();
    if (college) student.collegeName = String(college).trim();
    if (course) student.course = String(course).trim();

    await student.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      student: {
        id: student._id,
        fullName: student.fullName,
        email: student.email,
        phone: student.phoneNumber,
        college: student.collegeName,
        course: student.course,
        companyCode: student.companyCode || null,
        createdAt: student.createdAt,
      },
    });
  } catch (err) {
    console.error('Profile update error:', err);
    
    // Handle uniqueness validation errors
    if (err.statusCode === 409 && err.field) {
      return res.status(409).json({ 
        success: false, 
        message: err.message,
        field: err.field,
      });
    }
    
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      message: err.message || 'Error updating profile' 
    });
  }
});

// ============================================================================
// COMPANY API ROUTES
// ============================================================================

router.post('/company/register', async (req, res) => {
  try {
    const { companyName, adminName, email, phone, address, website, password, confirmPassword } = req.body;

    if (!companyName || !adminName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Required fields are missing' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Validate global uniqueness for email and phone across all collections
    const validated = await validateUniqueness({ email, phone });

    const newCompany = new Company({
      name: companyName,
      adminName,
      email: validated.email,
      phone: validated.phone,
      address: address || null,
      website: website || null,
      password,
      // companyCode will be auto-generated by pre-validate hook
    });

    await newCompany.save();

    const token = jwt.sign(
      { id: newCompany._id, email: newCompany.email, name: newCompany.name, role: 'company' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Company Registration Successful',
      token,
      company: {
        id: newCompany._id,
        name: newCompany.name,
        adminName: newCompany.adminName,
        email: newCompany.email,
        phone: newCompany.phone,
        companyCode: newCompany.companyCode,
      },
      companyId: newCompany._id,
    });
  } catch (err) {
    console.error('Company registration error:', err);
    
    // Handle uniqueness validation errors
    if (err.statusCode === 409 && err.field) {
      return res.status(409).json({ 
        success: false, 
        message: err.message,
        field: err.field,
        foundIn: err.foundIn,
      });
    }
    
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A company with this email or phone already exists' });
    }
    
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      message: err.message || 'Error creating company account.', 
      error: err.message 
    });
  }
});

router.post('/company/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const company = await Company.findOne({ email: email.toLowerCase() });
    if (!company) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isPasswordValid = await company.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: company._id, email: company.email, name: company.name, role: 'company' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      company: {
        id: company._id,
        name: company.name,
        adminName: company.adminName,
        email: company.email,
        phone: company.phone,
        companyCode: company.companyCode,
      },
    });
  } catch (err) {
    console.error('Company login error:', err);
    return res.status(500).json({ success: false, message: 'Error logging in.', error: err.message });
  }
});

router.get('/company/dashboard', verifyToken, async (req, res) => {
  try {
    const company = await Company.findById(req.userId).select('-password');
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    return res.status(200).json({
      success: true,
      company: {
        id: company._id,
        name: company.name,
        adminName: company.adminName,
        email: company.email,
        phone: company.phone,
        address: company.address,
        website: company.website,
        companyCode: company.companyCode,
        createdAt: company.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error fetching dashboard data' });
  }
});

router.put('/company/profile', verifyToken, async (req, res) => {
  try {
    const role = String(req.userRole || '').toLowerCase();
    if (role !== 'company' && role !== 'companyadmin') {
      return res.status(403).json({ success: false, message: 'Company access required' });
    }

    const company = await Company.findById(req.userId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const { adminName, phone, address, website } = req.body || {};
    
    // Validate phone uniqueness if being updated
    if (phone && phone !== company.phone) {
      const { validateUniqueness } = require('../services/auth/globalUniquenessService.js');
      const validated = await validateUniqueness({ 
        email: company.email, // Keep existing email
        phone,
        excludeId: company._id,
        excludeModel: 'Company',
      });
      company.phone = validated.phone;
    }
    
    if (adminName) company.adminName = String(adminName).trim();
    if (address !== undefined) company.address = address ? String(address).trim() : null;
    if (website !== undefined) company.website = website ? String(website).trim() : null;

    await company.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      company: {
        id: company._id,
        name: company.name,
        adminName: company.adminName,
        email: company.email,
        phone: company.phone,
        address: company.address,
        website: company.website,
        companyCode: company.companyCode,
        createdAt: company.createdAt,
      },
    });
  } catch (err) {
    console.error('Profile update error:', err);
    
    // Handle uniqueness validation errors
    if (err.statusCode === 409 && err.field) {
      return res.status(409).json({ 
        success: false, 
        message: err.message,
        field: err.field,
      });
    }
    
    return res.status(err.statusCode || 500).json({ 
      success: false, 
      message: err.message || 'Error updating profile' 
    });
  }
});

// Auth verify generic
router.get('/verify', verifyToken, async (req, res) => {
  try {
    let user = null;
    const normalizedRole = String(req.userRole || '').trim().toLowerCase();
    if (normalizedRole === 'student') {
      user = await Student.findById(req.userId).select('-password');
    } else if (normalizedRole === 'company' || normalizedRole === 'companyadmin') {
      user = await Company.findById(req.userId).select('-password');
    } else {
      user = await User.findById(req.userId).select('-password');
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      role: req.userRole,
      user
    });
  } catch (err) {
    return res.status(401).json({ success: false, authenticated: false });
  }
});

router.post('/logout', verifyToken, (req, res) => {
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export default router;
