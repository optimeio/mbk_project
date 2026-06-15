const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { assertUniqueEmail, assertUniquePhone } = require('../services/auth/globalUniquenessService');

const studentSchema = new mongoose.Schema({
    // Existing identifiers
    // Legacy identifiers (optional for backward compatibility)
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: false },
    rollNo: { type: String, required: false },
    registerNo: { type: String, required: false },
    // New fields required for registration/auth flow
    fullName: { type: String, required: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true,
      index: true,
    },
    phoneNumber: { 
      type: String, 
      required: true,
      index: true,
      trim: true,
    },
    collegeName: { type: String, required: true },
    course: { type: String, required: true },
    password: { type: String, required: true },
    // Existing optional references
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    companyCode: { type: String, default: null, index: true, uppercase: true, trim: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
}, { timestamps: true });

// Composite index to ensure unique students within a college.
// Partial: only enforced when collegeId is a real ObjectId, so self-registered
// students (collegeId: null) never collide with each other.
studentSchema.index(
  { collegeId: 1, registerNo: 1 },
  { unique: true, partialFilterExpression: { collegeId: { $type: 'objectId' } } }
);
studentSchema.index({ companyId: 1, collegeId: 1 });

// GLOBAL UNIQUENESS ENFORCEMENT: Email and phone must be unique across ALL collections
studentSchema.pre('save', async function (next) {
  // Only validate uniqueness if email or phoneNumber is modified or new document
  if (this.isModified('email') || this.isModified('phoneNumber') || this.isNew) {
    try {
      // Validate email uniqueness across all collections
      if (this.isModified('email') || this.isNew) {
        await assertUniqueEmail(this.email, this._id, 'Student');
        this.email = this.email.toLowerCase().trim();
      }
      
      // Validate phone uniqueness across all collections
      if (this.isModified('phoneNumber') || this.isNew) {
        await assertUniquePhone(this.phoneNumber, this._id, 'Student');
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Pre-save hook for fetching company code
studentSchema.pre('save', async function (next) {
    if (this.companyCode || !this.companyId) return next();
    try {
        const Company = mongoose.model('Company');
        const company = await Company.findById(this.companyId).select('companyCode');
        if (company?.companyCode) this.companyCode = company.companyCode;
        next();
    } catch (error) {
        next(error);
    }
});

// Hash password before saving
studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
studentSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
