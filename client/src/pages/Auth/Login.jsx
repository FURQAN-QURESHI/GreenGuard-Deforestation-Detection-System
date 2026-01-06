import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Mail, Lock, Leaf, ArrowRight } from 'lucide-react';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/auth/login', {
                email: formData.email,
                password: formData.password
            });

            // Store token and redirect
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));

            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.msg || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--color-bg-body)' }}>
            {/* Left Side - Branding */}
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

                <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', maxWidth: '480px', padding: '0 40px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'white',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 32px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                    }}>
                        <Leaf size={40} color="var(--color-primary)" />
                    </div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '24px', lineHeight: 1.1, fontFamily: 'Outfit, sans-serif' }}>
                        Monitor Forests <br /> with <span style={{ color: '#74c69d' }}>AI Precision</span>
                    </h1>
                    <p style={{ fontSize: '1.125rem', opacity: 0.9, lineHeight: 1.6 }}>
                        Join the global network of environmental guardians using advanced satellite analysis to detect deforestation in real-time.
                    </p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div style={{
                flex: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px'
            }}>
                <div className="gg-card" style={{ width: '100%', maxWidth: '480px', padding: '48px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', color: '#1a3c2e', fontFamily: 'Outfit, sans-serif' }}>Welcome Back</h2>
                        <p style={{ color: '#4a6358' }}>Sign in to access your dashboard</p>
                    </div>

                    {error && (
                        <div style={{
                            backgroundColor: '#fef2f2',
                            color: '#ef4444',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '24px',
                            fontSize: '0.875rem',
                            border: '1px solid #fee2e2'
                        }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder="you@example.com"
                            icon={Mail}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            icon={Lock}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px', marginTop: '-12px' }}>
                            <Link
                                to="/forgot-password"
                                style={{
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    color: 'var(--color-primary)',
                                    textDecoration: 'none'
                                }}
                            >
                                Forgot Password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            loading={loading}
                            icon={ArrowRight}
                            style={{ width: '100%', background: 'linear-gradient(135deg, #2d6a4f, #40916c)', border: 'none', boxShadow: '0 4px 14px rgba(45,106,79,0.3)', color: 'white', borderRadius: '10px' }}
                        >
                            Log In
                        </Button>
                    </form>

                    <div style={{ marginTop: '32px', textAlign: 'center', paddingTop: '24px', borderTop: '1px solid #f1f5f9' }}>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: '12px' }}>
                            Don't have an account?{' '}
                            <Link
                                to="/signup"
                                style={{
                                    color: 'var(--color-primary-dark)',
                                    fontWeight: 600,
                                    textDecoration: 'none'
                                }}
                            >
                                Create Account
                            </Link>
                        </p>
                        <p style={{ fontSize: '0.85rem' }}>
                            <Link
                                to="#"
                                style={{
                                    color: 'var(--color-text-muted)',
                                    textDecoration: 'underline',
                                    opacity: 0.8
                                }}
                            >
                                Admin Login
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

// feat(auth): connect Login form to backend /auth/login

// style(auth): redesign Login page with split-screen branding

// fix(auth): handle network errors gracefully

// fix(auth): preserve return URL after login redirect

// fix(auth): final Login page bug fixes

// connect login to backend

// redesign split-screen branding

// handle network errors

// final login page fixes

// adjust login form spacing
