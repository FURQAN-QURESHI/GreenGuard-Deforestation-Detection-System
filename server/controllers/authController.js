const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', // Standard gmail, or configure as needed
    auth: {
        user: process.env.EMAIL_USER || 'placeholder@gmail.com', // Needs env var
        pass: process.env.EMAIL_PASS || 'placeholderwrapper'     // Needs env var
    }
});

const sendEmail = async (to, subject, text) => {
    try {
        // For development, we just log to console if no credentials
        if (!process.env.EMAIL_USER) {
            console.log(`[DEV MODE] Email to ${to}: ${subject}\n${text}`);
            return;
        }
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text
        });
    } catch (error) {
        console.error("Email send error:", error);
        // Fallback log for dev
        console.log(`[FALLBACK] Email to ${to}: ${subject}\n${text}`);
    }
};

const PendingUser = require('../models/PendingUser');

exports.signup = async (req, res) => {
    try {
        const { name, email, password, organization } = req.body;

        // Check active users
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

        // Check if there is already a pending signup for this email, if so, update/overwrite it
        let pendingUser = await PendingUser.findOne({ email });
        if (pendingUser) {
            pendingUser.name = name;
            pendingUser.password_hash = password_hash;
            pendingUser.organization = organization;
            pendingUser.otp = otp;
            pendingUser.otpExpires = otpExpires;
            await pendingUser.save();
        } else {
            pendingUser = new PendingUser({
                name,
                email,
                password_hash,
                organization,
                otp,
                otpExpires
            });
            await pendingUser.save();
        }

        await sendEmail(email, 'Your GreenGuard OTP', `Your verification code is: ${otp}`);

        res.json({ msg: 'Signup initiated. OTP sent to email.', email });

    } catch (err) {
        console.error('Signup Error:', err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Find in PendingUser NOT User
        const pendingUser = await PendingUser.findOne({ email });

        if (!pendingUser) {
            // Check if already verified user?
            const existingUser = await User.findOne({ email });
            if (existingUser) return res.status(400).json({ msg: 'User already verified or invalid request' });
            return res.status(400).json({ msg: 'Invalid or expired signup request' });
        }

        if (pendingUser.otp !== otp) {
            return res.status(400).json({ msg: 'Invalid OTP' });
        }

        if (pendingUser.otpExpires < Date.now()) {
            return res.status(400).json({ msg: 'OTP expired' });
        }

        // Create Real User
        const newUser = new User({
            name: pendingUser.name,
            email: pendingUser.email,
            password_hash: pendingUser.password_hash,
            organization: pendingUser.organization,
            isVerified: true
        });

        await newUser.save();

        // Remove from pending
        await PendingUser.deleteOne({ email });

        const payload = { user: { id: newUser.id, name: newUser.name } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        if (!user.isVerified) {
            // Optional: Resend OTP here if needed, but for now just block
            return res.status(400).json({ msg: 'Account not verified. Please verify OTP.' });
        }

        const payload = { user: { id: user.id, name: user.name } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5d' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'User not found' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000;
        await user.save();

        await sendEmail(email, 'Reset Password OTP', `Your password reset code is: ${otp}`);

        res.json({ msg: 'OTP sent to email' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'User not found' });

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(newPassword, salt);
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.json({ msg: 'Password reset successful' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


// feat(auth): wire nodemailer for OTP email delivery

// refactor(auth): switch to password_hash comparison

// feat(auth): add verifyOTP controller

// feat(auth): add forgotPassword and resetPassword controllers

// refactor(auth): consolidate email transporter setup

// feat(auth): add isVerified check on login

// fix(auth): update pending user instead of creating duplicates

// fix(auth): clean up expired PendingUser documents

// style(server): reformat auth controller

// nodemailer for otp

// switch to password_hash compare

// verifyOTP controller

// forgotPassword + resetPassword

// clean up expired pending users

// sanitize user objects before send
