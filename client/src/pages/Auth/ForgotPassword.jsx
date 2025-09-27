import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Mail, Leaf, ArrowLeft, Send, CheckCircle, Lock } from 'lucide-react';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('email'); // email, otp
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/forgot-password', { email });
            setStep('otp');
            setSuccess('OTP code sent to your email.');
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to send OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmNewPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await api.post('/auth/reset-password', {
                email,
                otp,
                newPassword
            });
            setStep('success'); // Show success message
        } catch (err) {
            setError(err.response?.data?.msg || 'Password reset failed. Invalid or expired OTP.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg-body)', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <div className="gg-card" style={{ width: '100%', maxWidth: '480px', padding: '48px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 24px',
                        boxShadow: '0 10px 20px rgba(5,150,105,0.2)'
                    }}>
                        <Leaf size={32} color="white" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, lineHeight: 1 }}>
                        <span style={{ color: 'var(--color-text-main)' }}>Green</span>
                        <span style={{ color: 'var(--color-primary)' }}>Guard</span>
                    </h1>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg text-sm">
                        {error}
                    </div>
                )}
                {success && step === 'otp' && (
                    <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg text-sm">
                        {success}
                    </div>
                )}

                {step === 'email' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: 'var(--color-text-main)' }}>Forgot Password?</h2>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                                Enter your email address and we'll send you a link to reset your password.
                            </p>
                        </div>

                        <form onSubmit={handleSendOTP}>
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="you@example.com"
                                icon={Mail}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />

                            <div style={{ paddingTop: '16px' }}>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    loading={loading}
                                    icon={Send}
                                    style={{ width: '100%' }}
                                >
                                    Send Verification Code
                                </Button>
                            </div>
                        </form>
                    </>
                )}

                {step === 'otp' && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '8px', color: 'var(--color-text-main)' }}>Verify & Reset</h2>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                                Enter the code sent to your email and your new password.
                            </p>
                        </div>

                        <form onSubmit={handleResetPassword}>
                            <Input
                                label="Verification Code"
                                type="text"
                                placeholder="123456"
                                icon={CheckCircle}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                maxLength={6}
                                style={{ textAlign: 'center', letterSpacing: '0.2em' }}
                            />
                            <Input
                                label="New Password"
                                type="password"
                                placeholder="••••••••"
                                icon={Lock} // Assuming Lock is imported, if not I will just use Lock icon (it was not imported, check imports)
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />
                            <Input
                                label="Confirm New Password"
                                type="password"
                                placeholder="••••••••"
                                icon={Lock}
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                required
                            />

                            <div style={{ paddingTop: '16px' }}>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    loading={loading}
                                    style={{ width: '100%' }}
                                >
                                    Reset Password
                                </Button>
                            </div>
                        </form>
                    </>
                )}

                {step === 'success' && (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: '#ecfdf5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px'
                        }}>
                            <CheckCircle size={40} color="var(--color-primary)" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: 'var(--color-text-main)' }}>Password Reset!</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '32px', lineHeight: 1.5 }}>
                            Your password has been successfully reset. You can now login with your new password.
                        </p>
                        <Link to="/login">
                            <Button
                                className="w-full"
                                style={{ width: '100%' }}
                            >
                                Back to Sign In
                            </Button>
                        </Link>
                    </div>
                )}

                <div style={{ marginTop: '32px', textAlign: 'center', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
                    <Link
                        to="/login"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--color-text-muted)',
                            fontWeight: 500,
                            textDecoration: 'none',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--color-primary)'}
                        onMouseLeave={(e) => e.target.style.color = 'var(--color-text-muted)'}
                    >
                        <ArrowLeft size={18} />
                        <span>Back to Sign In</span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;

// feat(auth): implement multi-step ForgotPassword flow

// fix(auth): handle OTP resend rate limiting

// multi-step forgot flow
