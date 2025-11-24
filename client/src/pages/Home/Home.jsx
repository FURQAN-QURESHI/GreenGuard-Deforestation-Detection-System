import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

const Home = () => {
    const mainRef = useRef(null);
    const heroTextRef = useRef(null);
    const heroButtonRef = useRef(null);
    const bgGridRef = useRef(null);
    const techSectionRef = useRef(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Hero Animations
            const tl = gsap.timeline();

            // 1. Grid Fade In
            tl.fromTo(bgGridRef.current,
                { opacity: 0 },
                { opacity: 0.2, duration: 1.5, ease: "power2.out" }
            );

            // 2. Text Reveal
            tl.fromTo(".hero-text-line",
                { y: 100, opacity: 0, rotateX: -20 },
                { y: 0, opacity: 1, rotateX: 0, duration: 1.2, stagger: 0.2, ease: "power4.out" },
                "-=1"
            );

            // 3. Button Reveal
            tl.fromTo(heroButtonRef.current,
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)" },
                "-=0.5"
            );

            // Scroll Animations for sections
            gsap.utils.toArray('.fade-up-section').forEach(section => {
                gsap.fromTo(section,
                    { y: 50, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 1,
                        scrollTrigger: {
                            trigger: section,
                            start: "top 80%",
                            toggleActions: "play none none reverse"
                        }
                    }
                );
            });

            // Tech Cards Animation
            gsap.fromTo(".tech-card",
                { y: 100, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    stagger: 0.2,
                    scrollTrigger: {
                        trigger: techSectionRef.current,
                        start: "top 70%",
                    }
                }
            );

            // Parallax Effect for Background Elements
            gsap.to(".parallax-bg", {
                yPercent: 50,
                ease: "none",
                scrollTrigger: {
                    trigger: mainRef.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: true
                }
            });

        }, mainRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={mainRef} className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#ccff00] selection:text-black overflow-x-hidden relative">

            {/* Background Grid */}
            <div ref={bgGridRef} className="fixed inset-0 z-0 pointer-events-none opacity-0"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)',
                    backgroundSize: '80px 80px'
                }}
            />

            {/* Ambient Glows */}
            <div className="fixed top-[-20%] left-[20%] w-[250px] h-[250px] md:w-[400px] md:h-[400px] lg:w-[500px] lg:h-[500px] bg-emerald-900/40 rounded-full blur-[120px] pointer-events-none parallax-bg" />
            <div className="fixed bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-emerald-900/20 to-transparent pointer-events-none" />

            {/* Navbar */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-8 md:px-12 max-w-7xl mx-auto">
                <div className="hero-text-line opacity-0 border border-white/20 px-4 py-1.5 uppercase font-bold tracking-widest text-sm hover:bg-white hover:text-black transition-colors cursor-pointer">
                    GreenGuard
                </div>

                <div className="hidden md:flex items-center gap-10 text-xs font-semibold tracking-widest uppercase text-gray-400">
                    {['Technology', 'Analysis', 'Mission', 'Contact'].map((item, i) => (
                        <a key={item} href={`#${item.toLowerCase()}`} className="hero-text-line opacity-0 hover:text-white transition-colors flex items-center gap-1">
                            {item}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <Link to="/login" className="hero-text-line opacity-0 text-xs font-bold uppercase tracking-widest hover:text-[#ccff00] transition-colors">
                        Login
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative z-10 min-h-[85vh] flex flex-col items-center justify-center px-6 max-w-7xl mx-auto text-center perspective-[1000px]">

                <div ref={heroTextRef} className="z-20 transform-gpu">
                    <div className="overflow-hidden">
                        <h1 className="hero-text-line text-5xl md:text-7xl lg:text-[8rem] font-bold leading-[0.85] tracking-tighter mix-blend-screen">
                            Preserving
                        </h1>
                    </div>

                    <div className="overflow-hidden">
                        <h1 className="hero-text-line text-5xl md:text-7xl lg:text-[8rem] font-bold leading-[0.85] tracking-tighter">
                            <span className="font-serif italic font-normal text-[#ccff00] relative inline-block px-4 mx-2">
                                Earth
                                {/* Simple SVG Orbit Ring */}
                                <svg className="absolute inset-0 w-full h-full -scale-y-110 scale-x-125 pointer-events-none" viewBox="0 0 100 50" preserveAspectRatio="none">
                                    <path d="M5,25 C5,5 95,5 95,25 C95,45 5,45 5,25" fill="none" stroke="white" strokeWidth="0.5" className="opacity-60" />
                                </svg>
                                {/* Star icons */}
                                <span className="absolute -top-4 -right-8 text-white text-2xl animate-pulse">✨</span>
                            </span>
                        </h1>
                    </div>

                    <div className="overflow-hidden">
                        <h1 className="hero-text-line text-5xl md:text-7xl lg:text-[8rem] font-bold leading-[0.85] tracking-tighter">
                            With AI Precision
                        </h1>
                    </div>

                    <div ref={heroButtonRef} className="mt-16 opacity-0">
                        <Link to="/login" className="group relative inline-flex items-center gap-3 px-8 py-4 bg-[#ccff00] text-black rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white transition-all transform hover:scale-105 shadow-[0_0_40px_rgba(204,255,0,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.4)]">
                            Start Analysis
                            <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Mission Statement */}
            <section id="mission" className="fade-up-section py-32 px-6 max-w-5xl mx-auto text-center relative z-20">
                <p className="text-2xl md:text-4xl leading-tight font-light text-gray-200">
                    GREENGUARD <span className="font-serif italic text-gray-500">utilizes advanced</span> SATELLITE SEGMENTATION <br />
                    <span className="font-serif italic text-gray-500">to provide</span> REAL-TIME DEFORESTATION ALERTS <span className="font-serif italic text-gray-500">empowering</span> <br />
                    GOVERNMENTS <span className="font-serif italic text-gray-500">and</span> NGOs <br />
                    TO ACT <span className="font-serif italic text-[#ccff00] font-semibold text-shadow-glow">DECISIVELY.</span>
                </p>
            </section>

            {/* Technology Section (Ensemble Predictor) */}
            <section id="technology" ref={techSectionRef} className="relative py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16 fade-up-section">
                    <span className="text-[#ccff00] font-bold uppercase tracking-widest text-xs mb-4 block">The Core Technology</span>
                    <h2 className="text-4xl md:text-6xl font-serif mb-6">Ensemble Intelligence</h2>
                    <p className="max-w-2xl mx-auto text-gray-400 text-lg">
                        We don't rely on a single perspective. Our architecture fuses three state-of-the-art deep learning models to achieve an unprecedented level of accuracy.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Model 1 */}
                    <div className="tech-card bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-6xl font-bold">01</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">DeepLabV3+</h3>
                        <p className="text-[#ccff00] font-mono text-sm mb-6">Weight: 33.0%</p>
                        <p className="text-gray-400 text-sm leading-relaxed mb-8">
                            Utilizes Atrous Spatial Pyramid Pooling (ASPP) to capture multi-scale contextual information, ensuring no large-scale patterns are missed.
                        </p>
                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#ccff00]" style={{ width: '33.0%' }}></div>
                        </div>
                    </div>

                    {/* Model 2 */}
                    <div className="tech-card bg-white/5 border border-[#ccff00]/30 rounded-2xl p-8 hover:bg-white/10 transition-colors relative overflow-hidden group shadow-[0_0_30px_rgba(5,150,105,0.1)]">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-6xl font-bold">02</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Attention U-Net</h3>
                        <p className="text-[#ccff00] font-mono text-sm mb-6">Weight: 33.7%</p>
                        <p className="text-gray-400 text-sm leading-relaxed mb-8">
                            Integrates Attention Gates to suppress irrelevant regions and highlight salient features, providing superior focus on small details.
                        </p>
                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#ccff00]" style={{ width: '33.7%' }}></div>
                        </div>
                    </div>

                    {/* Model 3 */}
                    <div className="tech-card bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-colors relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="text-6xl font-bold">03</span>
                        </div>
                        <h3 className="text-2xl font-bold mb-2">U-Net++</h3>
                        <p className="text-[#ccff00] font-mono text-sm mb-6">Weight: 33.3%</p>
                        <p className="text-gray-400 text-sm leading-relaxed mb-8">
                            Features nested and dense skip pathways to reduce the semantic gap between feature maps, improving gradient flow and segmentation accuracy.
                        </p>
                        <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-[#ccff00]" style={{ width: '33.3%' }}></div>
                        </div>
                    </div>
                </div>

                <div className="mt-16 text-center fade-up-section">
                    <div className="inline-block bg-white/5 border border-white/10 px-8 py-4 rounded-xl font-mono text-sm text-gray-300">
                        <span className="text-[#ccff00]">Prediction</span> = Σ (Model<span className="text-[10px] align-sub">i</span> × Weight<span className="text-[10px] align-sub">i</span>)
                    </div>
                </div>
            </section>

            {/* Parallax Earth/Space Image */}
            <div className="fade-up-section relative w-full h-[60vh] md:h-[80vh] overflow-hidden group bg-[#050505]">
                <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] to-[#050505] z-0"></div>
                <div className="absolute inset-0 bg-black/20 z-10 group-hover:bg-transparent transition-colors duration-700"></div>
                <img
                    src="https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=2072&auto=format&fit=crop"
                    alt="Earth Horizon"
                    className="relative z-0 w-full h-full object-cover transform scale-110 group-hover:scale-100 transition-transform duration-[2s] ease-out parallax-img opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505/50] z-20"></div>
            </div>

            {/* Green Section - Analysis ID */}
            <section id="analysis" className="fade-up-section bg-[#ccff00] text-black py-32 px-6 relative overflow-hidden">
                {/* Rotating Badge */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 bg-black rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
                    <div className="text-[#ccff00] text-center text-[8px] font-bold uppercase tracking-widest absolute inset-2">
                        • Analyze • Protect • Restore • Monitor
                    </div>
                    <div className="w-24 h-24 border border-[#ccff00]/30 rounded-full flex items-center justify-center">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccff00" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto text-center mt-12">
                    <p className="text-xs font-bold uppercase tracking-widest mb-6 border-b border-black/10 inline-block pb-2">Join the Guardians</p>
                    <h2 className="text-4xl md:text-7xl font-serif leading-tight">
                        Start monitoring <br />
                        your region <span className="italic relative inline-block">
                            today.
                            <svg className="absolute bottom-0 left-0 w-full h-3" viewBox="0 0 100 10" preserveAspectRatio="none">
                                <path d="M0 5 Q 50 10 100 5" transform="scale(1, -1)" transform-origin="center" stroke="black" strokeWidth="2" fill="none" />
                            </svg>
                        </span>
                    </h2>
                    <div className="mt-16">
                        <Link to="/contact" className="inline-block px-10 py-4 border-2 border-black rounded-full text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-[#ccff00] transition-all transform hover:-translate-y-1 hover:shadow-xl">
                            Deploy Models
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer - Contact ID */}
            <footer id="contact" className="fade-up-section bg-[#020202] text-white pt-24 pb-12 px-6 border-t border-gray-900/50">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-16">

                    {/* Left: Logo & Input */}
                    <div className="flex-1">
                        <div className="border border-white/20 px-4 py-1.5 uppercase font-bold tracking-widest text-sm inline-block mb-12 hover:border-[#ccff00] transition-colors">
                            GreenGuard
                        </div>
                        <h3 className="text-2xl md:text-4xl font-serif mb-8 leading-snug">
                            Sign up for <br /> global <span className="text-[#ccff00]">insights.</span>
                        </h3>
                        <div className="flex gap-4 max-w-md group">
                            <input type="email" placeholder="Email Address" className="flex-1 bg-transparent border-b border-gray-700 px-4 py-3 text-sm focus:border-[#ccff00] outline-none transition-colors placeholder:text-gray-600" />
                            <button className="px-6 border-b border-gray-700 text-gray-400 group-hover:text-[#ccff00] group-hover:border-[#ccff00] transition-colors">
                                →
                            </button>
                        </div>
                    </div>

                    {/* Right: Links */}
                    <div className="flex gap-16 text-sm text-gray-400">
                        <div className="flex flex-col gap-6">
                            <span className="text-white font-bold uppercase tracking-widest text-xs mb-2 text-[#ccff00]">Platform</span>
                            <a href="#" className="hover:text-white hover:translate-x-1 transition-all">Ensemble Models</a>
                            <a href="#" className="hover:text-white hover:translate-x-1 transition-all">Segmentation</a>
                            <a href="#" className="hover:text-white hover:translate-x-1 transition-all">API Access</a>
                        </div>
                        <div className="flex flex-col gap-6">
                            <span className="text-white font-bold uppercase tracking-widest text-xs mb-2 text-[#ccff00]">Company</span>
                            <a href="#" className="hover:text-white hover:translate-x-1 transition-all">About</a>
                            <a href="#" className="hover:text-white hover:translate-x-1 transition-all">Research</a>
                            <a href="#" className="hover:text-white hover:translate-x-1 transition-all">Contact</a>
                        </div>
                    </div>
                </div>

                {/* Alien/Icon Centered */}
                <div className="flex justify-center mt-24 mb-10">
                    <div className="w-16 h-16 bg-[#ccff00] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:scale-110 transition-transform cursor-pointer">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="black">
                            <path d="M12 2a10 10 0 0 0-10 10c0 5.523 4.477 10 10 10s10-4.477 10-10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                            <circle cx="9" cy="10" r="1.5" />
                            <circle cx="15" cy="10" r="1.5" />
                            <path d="M8.5 15c1-1 2.5-1 3.5 0 1-1 2.5-1 3.5 0" />
                        </svg>
                    </div>
                </div>

                <div className="text-center text-[10px] text-gray-700 uppercase tracking-[0.2em] hover:text-gray-500 transition-colors">
                    © 2025 GreenGuard AI. All Rights Reserved.
                </div>
            </footer>
        </div>
    );
};

export default Home;

// feat(home): add hero section with animated background

// feat(home): add feature cards section

// feat(home): add CTA section and footer

// feat(home): add scroll animations with framer-motion

// feat(home): add team section

// fix(home): correct navigation anchor scrolling

// hero section with animated bg

// feature cards section

// CTA section and footer

// team section
