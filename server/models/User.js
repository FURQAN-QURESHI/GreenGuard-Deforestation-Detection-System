const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password_hash: {
        type: String,
        required: true
    },
    organization: {
        type: String,
        default: 'Individual'
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    date_created: {
        type: Date,
        default: Date.now
    },
    otp: {
        type: String
    },
    otpExpires: {
        type: Date
    },
    isVerified: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('User', UserSchema);

// feat(auth): migrate User schema to name/password_hash fields
