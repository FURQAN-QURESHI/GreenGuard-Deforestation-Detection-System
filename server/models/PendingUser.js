const mongoose = require('mongoose');

const PendingUserSchema = new mongoose.Schema({
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
    otp: {
        type: String,
        required: true
    },
    otpExpires: {
        type: Date,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 900 // Automatically delete after 15 minutes (900 seconds)
    }
});

module.exports = mongoose.model('PendingUser', PendingUserSchema);
