import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Mail, Lock, User, Building2, Leaf, ArrowRight, Check } from 'lucide-react';

const Signup = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        organization: '',
        password: '',
        confirmPassword: ''
    });
    const [step, setStep] = useState('signup'); // signup, otp
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/signup', {
                name: formData.name,
                email: formData.email,
                organization: formData.organization,
                password: formData.password
            });
            setStep('otp'); // Move to OTP step
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.msg || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/verify-otp', {
                email: formData.email,
                otp
            });

            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));

            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.msg || 'OTP Verification failed.');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        'Real-time satellite monitoring',
        'AI-powered deforestation detection',
        'Custom alert notifications',
        'Detailed analysis reports'
    ];

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg-body)' }}>
            {/* Left Side - Form */}
            <div style={{
                flex: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
                overflowY: 'auto'
            }}>
                <div className="gg-card" style={{ width: '100%', maxWidth: '480px', padding: '40px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', color: '#1a3c2e', fontFamily: 'Outfit, sans-serif' }}>Create Account</h2>
                        <p style={{ color: '#4a6358' }}>Join the forest protection network</p>
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: '#fef2f2',
                            color: '#ef4444',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            fontSize: '0.875rem',
                            border: '1px solid #fee2e2'
                        }}>
                            {error}
                        </div>
                    )}

                    {step === 'signup' ? (
                        <form onSubmit={handleSubmit}>
                            <Input
                                label="Full Name"
                                type="text"
                                placeholder="John Doe"
                                icon={User}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                            <Input
                                label="Email Address"
                                type="email"
                                placeholder="you@example.com"
                                icon={Mail}
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                            <Input
                                label="Organization (Optional)"
                                type="text"
                                placeholder="Your organization"
                                icon={Building2}
                                value={formData.organization}
                                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                            />
                            <Input
                                label="Password"
                                type="password"
                                placeholder="••••••••"
                                icon={Lock}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                            <Input
                                label="Confirm Password"
                                type="password"
                                placeholder="••••••••"
                                icon={Lock}
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                required
                            />

                            <div style={{ paddingTop: '16px' }}>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    loading={loading}
                                    icon={ArrowRight}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #2d6a4f, #40916c)', border: 'none', boxShadow: '0 4px 14px rgba(45,106,79,0.3)', color: 'white', borderRadius: '10px' }}
                                >
                                    Create Account
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP}>
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <p style={{ color: 'var(--color-text-muted)' }}>
                                    We've sent a 6-digit code to <strong>{formData.email}</strong>
                                </p>
                            </div>
                            <Input
                                label="Verification Code"
                                type="text"
                                placeholder="123456"
                                icon={Lock}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                maxLength={6}
                                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.25rem' }}
                            />
                            <div style={{ paddingTop: '16px' }}>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    loading={loading}
                                    icon={Check}
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #2d6a4f, #40916c)', border: 'none', boxShadow: '0 4px 14px rgba(45,106,79,0.3)', color: 'white', borderRadius: '10px' }}
                                >
                                    Verify & Complete
                                </Button>
                            </div>
                        </form>
                    )}

                    <div style={{ marginTop: '24px', textAlign: 'center' }}>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                style={{
                                    color: 'var(--color-primary)',
                                    fontWeight: 600,
                                    textDecoration: 'none'
                                }}
                            >
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Branding */}
            <div style={{
                flex: '1',
                background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
            }} className="hidden lg:flex">
                {/* Abstract Shapes */}
                <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '400px', height: '400px', background: 'white', opacity: 0.05, borderRadius: '50%' }} />
                <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '300px', height: '300px', background: 'white', opacity: 0.05, borderRadius: '50%' }} />

                <div style={{ position: 'relative', zIndex: 10, maxWidth: '480px', padding: '0 40px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'white',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '32px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                    }}>
                        <Leaf size={32} color="var(--color-primary)" />
                    </div>

                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px', lineHeight: 1.2, fontFamily: 'Outfit, sans-serif' }}>
                        Start protecting <br /> forests today
                    </h2>
                    <p style={{ fontSize: '1.125rem', opacity: 0.9, marginBottom: '40px', lineHeight: 1.6 }}>
                        Join thousands of environmental guardians using AI to monitor and protect our planet's forests.
                    </p>

                    {/* Features List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {features.map((feature, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    background: 'rgba(255,255,255,0.2)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Check size={14} color="white" />
                                </div>
                                <span style={{ fontSize: '1rem', fontWeight: 500 }}>{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;

// feat(auth): connect Signup form with OTP flow

// feat(auth): add OTP verification step to Signup

// fix(auth): handle 'already verified' error state

// style(auth): unify Login and Signup visual language
