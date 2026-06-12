const mongoose = require('mongoose');

const userDepartmentAccessSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
        index: true,
    },
    permissions: [{
        type: String,
        enum: ['view', 'edit', 'attendance', 'finance'],
        lowercase: true,
        trim: true,
    }],
}, {
    timestamps: true,
});

userDepartmentAccessSchema.index({ userId: 1, departmentId: 1 }, { unique: true });

const UserDepartmentAccess = mongoose.model('UserDepartmentAccess', userDepartmentAccessSchema);

module.exports = UserDepartmentAccess;

