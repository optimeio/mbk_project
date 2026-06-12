// CommonJS on purpose: 14+ legacy files load this with require(); ESM files
// (authController.js, simpleAuth.js) still work via `import User from ...`.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { assertUniqueEmail, assertUniquePhone } = require('../services/auth/globalUniquenessService');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      // NOTE: intentionally selectable by default — legacy routes
      // (userRoutes verify-password, authLoginService) read user.password directly.
    },
    role: {
      // No enum: legacy documents use 'SuperAdmin', 'SPOCAdmin', 'Trainer',
      // 'Accountant', etc., while the new auth flow uses lowercase roles.
      type: String,
      default: 'student',
      required: true,
    },

    // ── Legacy top-level identity fields (existing documents/routes) ────────
    name: String,
    firstName: String,
    lastName: String,
    phoneNumber: {
      type: String,
      index: true,
    },
    city: String,
    profilePicture: String,
    accountStatus: String, // 'pending' | 'approved' | 'rejected'
    emailVerified: Boolean,

    // ── New auth-system profile fields ───────────────────────────────────────
    profile: {
      fullName: String,
      phone: {
        type: String,
        match: [/^[0-9+\-\s()]{7,20}$/, 'Please provide a valid phone number'],
      },
      avatar: String,
      bio: String,
    },
    studentProfile: {
      college: String,
      course: String,
      enrollmentNumber: String,
      batch: String,
    },
    trainerProfile: {
      specialization: String,
      experience: Number,
      qualifications: [String],
      certifications: [String],
    },
    companyProfile: {
      companyName: String,
      industryType: String,
      website: String,
      address: String,
      contactPerson: String,
      designation: String,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpiry: Date,
    passwordResetToken: String,
    passwordResetExpiry: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    metadata: {
      ipAddress: String,
      userAgent: String,
      lastLoginIP: String,
    },
  },
  {
    timestamps: true,
    // Preserve any other legacy fields on existing documents instead of
    // silently dropping them on writes.
    strict: false,
  }
);

// GLOBAL UNIQUENESS ENFORCEMENT: Email and phone must be unique across ALL collections
userSchema.pre('save', async function (next) {
  // Validate email and phone uniqueness if modified or new
  if (this.isModified('email') || this.isModified('phoneNumber') || this.isModified('profile.phone') || this.isNew) {
    try {
      // Validate email uniqueness across all collections
      if (this.isModified('email') || this.isNew) {
        await assertUniqueEmail(this.email, this._id, 'User');
        this.email = this.email.toLowerCase().trim();
      }
      
      // Validate phoneNumber uniqueness (legacy field)
      if ((this.isModified('phoneNumber') || this.isNew) && this.phoneNumber) {
        await assertUniquePhone(this.phoneNumber, this._id, 'User');
      }
      
      // Validate profile.phone uniqueness
      if ((this.isModified('profile.phone') || this.isNew) && this.profile?.phone) {
        await assertUniquePhone(this.profile.phone, this._id, 'User');
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.plainPassword;
  delete user.passwordResetToken;
  delete user.emailVerificationToken;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.incrementLoginAttempts = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 30 * 60 * 1000;

  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1, lockUntil: null },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isAccountLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCK_TIME) };
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lockUntil: null },
  });
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
