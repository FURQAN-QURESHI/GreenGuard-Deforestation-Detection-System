import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import ForgotPassword from './pages/Auth/ForgotPassword';

import History from './pages/Dashboard/History';
import Community from './pages/Community/Community';
import Dashboard from './pages/Dashboard/Dashboard';
import News from './pages/News/News';
import Home from './pages/Home/Home';
import Contact from './pages/Contact/Contact';

function App() {
    return (
        <Router>
            <div className="min-h-screen">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />

                    {/* Protected Routes */}
                    <Route path="/dashboard" element={
                        <PrivateRoute>
                            <Dashboard />
                        </PrivateRoute>
                    } />
                    <Route path="/history" element={
                        <PrivateRoute>
                            <History />
                        </PrivateRoute>
                    } />
                    <Route path="/community" element={
                        <PrivateRoute>
                            <Community />
                        </PrivateRoute>
                    } />
                    <Route path="/news" element={
                        <PrivateRoute>
                            <News />
                        </PrivateRoute>
                    } />
                    <Route path="/contact" element={
                        <PrivateRoute>
                            <Contact />
                        </PrivateRoute>
                    } />

                    <Route path="/" element={<Home />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;

// fix(client): register auth routes in App router

// fix(client): ensure all routes protected as required

// wire auth routes in App

// frontend final routing pass
