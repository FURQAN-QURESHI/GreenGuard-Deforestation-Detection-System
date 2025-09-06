import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart2, History, LogOut, Users, Newspaper, Mail, Leaf, LayoutDashboard } from 'lucide-react';

const Sidebar = () => {
    const location = useLocation();
    const [isOpen, setIsOpen] = React.useState(false);

    const menuItems = [
        { icon: BarChart2, label: 'New Analysis', path: '/dashboard' },
        { icon: History, label: 'History', path: '/history' },
        { icon: Users, label: 'Community', path: '/community' },
        { icon: Newspaper, label: 'News', path: '/news' },
        { icon: Mail, label: 'Contact', path: '/contact' },
    ];

    const [user, setUser] = React.useState({ name: 'User', email: 'user@example.com' });

    React.useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    };

    return (
        <>
            {/* Mobile Hamburger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-4 left-4 z-[1002] lg:hidden p-2 bg-[#2d6a4f] text-white rounded-lg shadow-lg"
            >
                {isOpen ? <LogOut size={24} className="rotate-180" /> : <LayoutDashboard size={24} />}
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[999] lg:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <div className={`fixed left-0 top-0 h-screen w-[280px] flex flex-col z-[1000] shadow-2xl transition-transform duration-300 transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`} 
                 style={{ background: '#1a3c2e' }}>
                
                {/* Logo Section */}
                <div style={{ padding: '24px 24px 16px 24px' }}>
                    <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                        <Leaf size={28} color="#74c69d" />
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, lineHeight: 1, color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                                GreenGuard
                            </h1>
                            <p style={{ margin: 0, fontSize: '0.75rem', marginTop: '2px', color: '#74c69d' }}>Forest Monitor</p>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsOpen(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    fontWeight: 500,
                                    fontSize: '14px',
                                    color: isActive ? 'white' : '#a8d5ba',
                                    background: isActive ? '#2d6a4f' : 'transparent',
                                    borderLeft: isActive ? '3px solid #74c69d' : '3px solid transparent',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                        e.currentTarget.style.color = 'white';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = '#a8d5ba';
                                    }
                                }}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: '#2d6a4f',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '16px',
                            color: 'white'
                        }}>
                            {user.name && user.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.name}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#74c69d', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.email}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'transparent',
                            border: 'none',
                            color: '#74c69d',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontWeight: 500,
                            fontSize: '14px',
                            transition: 'color 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#fca5a5';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#74c69d';
                        }}
                    >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
