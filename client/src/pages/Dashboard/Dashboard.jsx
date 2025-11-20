import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api, { analyzeArea } from '../../api';
import Sidebar from '../../components/Sidebar';
import MapComponent from '../../components/Map/MapComponent';
import ResultsPanel from '../../components/Dashboard/ResultsPanel';
import { RefreshCcw, XCircle, Calendar, BarChart3, Map as MapIcon, AlertTriangle, Clock, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = () => {
    const location = useLocation();

    // --- State: Layout Sidebar ---
    const [sidebarMargin, setSidebarMargin] = useState(
        window.innerWidth >= 1024 ? 280 : 0
    );

    useEffect(() => {
        const handleResize = () => {
            setSidebarMargin(window.innerWidth >= 1024 ? 280 : 0);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- State: Area ---
    const AOI_COORDINATES = [
        [72.83006459906208, 33.75992197053082],
        [72.81392842962849, 33.713955521176736],
        [72.85169393255818, 33.679678798720474],
        [72.95434743597615, 33.710528464301944],
        [72.96327382757771, 33.70138897734782],
        [73.10369283392536, 33.74878950106604],
        [73.11948568060505, 33.720809224597446],
        [73.32356524976677, 33.81731322240773],
        [73.27481341871209, 33.861798796957075],
        [72.83006459906208, 33.75992197053082]
    ].map(coord => ({ lng: coord[0], lat: coord[1] }));

    const [selectedArea, setSelectedArea] = useState(AOI_COORDINATES);
    const [baseAOI] = useState(AOI_COORDINATES);
    const [mapCenter, setMapCenter] = useState([33.75, 73.0]);
    const [mapZoom, setMapZoom] = useState(11);

    // --- State: Data & UI ---
    const [analysisResults, setAnalysisResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortControllerRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [dashStats, setDashStats] = useState({
        totalAnalyses: 0,
        totalArea: 0,
        totalDeforested: 0,
        lastAnalysisDate: null
    });
    const resultsRef = useRef(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [reportName, setReportName] = useState('');
    const [nameError, setNameError] = useState('');

    // --- State: Date Selection (Strict 6-month intervals) ---
    // Years: 2017 - 2025
    const availableYears = Array.from({ length: 9 }, (_, i) => 2017 + i);
    const [startYear, setStartYear] = useState(2020);
    const [startPeriod, setStartPeriod] = useState('jan-jun'); // 'jan-jun' or 'jul-dec'

    const [endYear, setEndYear] = useState(2023);
    const [endPeriod, setEndPeriod] = useState('jul-dec');

    useEffect(() => {
        if (location.state && location.state.coordinates) {
            setSelectedArea(location.state.coordinates);
            if (location.state.coordinates.ne && location.state.coordinates.sw) {
                const lat = (location.state.coordinates.ne.lat + location.state.coordinates.sw.lat) / 2;
                const lng = (location.state.coordinates.ne.lng + location.state.coordinates.sw.lng) / 2;
                setMapCenter([lat, lng]);
                setMapZoom(13);
            }
        }
    }, [location.state]);

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                const response = await api.get('/reports');
                const reports = response.data;
                if (reports && reports.length > 0) {
                    const totalArea = parseFloat(reports.reduce((sum, r) => sum + (r.total_area_km2 || 0), 0).toFixed(2));
                    const totalDeforested = parseFloat(reports.reduce((sum, r) => sum + (r.deforested_area_km2 || 0), 0).toFixed(2));
                    const sorted = [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setDashStats({
                        totalAnalyses: reports.length,
                        totalArea: totalArea,
                        totalDeforested: totalDeforested,
                        lastAnalysisDate: sorted[0]?.createdAt 
                            ? new Date(sorted[0].createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'None yet'
                    });
                }
            } catch (err) {
                console.error('Failed to fetch dashboard stats');
            }
        };
        fetchDashboardStats();
    }, []);

    const handleAreaSelected = (coordinates) => {
        setSelectedArea(coordinates);
    };

    const handleCancelAnalysis = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setLoading(false);
            setError("Analysis cancelled by user.");
        }
    };

    const handleConfirmSave = async () => {
        const trimmedName = reportName.trim();
        if (!trimmedName) {
            setNameError('Please enter a report name');
            return;
        }
        if (trimmedName.length < 3) {
            setNameError('Name must be at least 3 characters');
            return;
        }

        try {
            const existingReports = await api.get('/reports');
            const nameExists = existingReports.data.some(
                r => r.areaName.toLowerCase() === trimmedName.toLowerCase()
            );
            if (nameExists) {
                setNameError('A report with this name already exists. Please use a different name.');
                return;
            }
        } catch (err) {
            console.error('Could not check existing names');
        }

        setIsSaving(true);
        setShowSaveModal(false);

        try {
            const startMonth1 = startPeriod === 'jan-jun' ? '01' : '07';
            const reqStartDate = `${startYear}-${startMonth1}-01`;

            const endMonth2 = endPeriod === 'jan-jun' ? '06' : '12';
            const endDay2 = endPeriod === 'jan-jun' ? '30' : '31';
            const reqEndDate = `${endYear}-${endMonth2}-${endDay2}`;

            const totalKm2 = parseFloat((analysisResults.total_area_km2 || analysisResults.totalForestArea || 0).toFixed(4));
            const deforestedKm2 = parseFloat((analysisResults.deforested_area_km2 || analysisResults.deforestedArea || 0).toFixed(4));
            const deforestPct = parseFloat((analysisResults.deforestation_percentage || analysisResults.deforestationPercent || 0).toFixed(2));

            const reportPayload = {
                areaName: trimmedName,
                coordinates: Array.isArray(selectedArea) ? selectedArea : [],
                startDate: reqStartDate,
                endDate: reqEndDate,
                deforestation_geojson: analysisResults.deforestation_geojson || null,
                before_image: analysisResults.before_image || null,
                after_image: analysisResults.after_image || null,
                total_area_km2: totalKm2,
                deforested_area_km2: deforestedKm2,
                deforestation_percentage: deforestPct,
                totalForestArea: totalKm2,
                deforestedArea: deforestedKm2,
                deforestationPercent: deforestPct,
                confidence: analysisResults.confidence || 0,
                message: analysisResults.message || ''
            };
            await api.post('/reports', reportPayload);
            setError(null);
            alert(`✅ Report "${trimmedName}" saved successfully!`);
            
            setDashStats(p => ({
                ...p,
                totalAnalyses: p.totalAnalyses + 1,
                totalArea: (parseFloat(p.totalArea) + totalKm2).toFixed(2),
                totalDeforested: (parseFloat(p.totalDeforested) + deforestedKm2).toFixed(2),
                lastAnalysisDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            }));
        } catch (err) {
            alert('Failed to save report. Please try again.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        setAnalysisResults(null);

        abortControllerRef.current = new AbortController();

        // Calculate strict start/end dates
        // Calculate Date Range 1 (Start)
        const startMonth1 = startPeriod === 'jan-jun' ? '01' : '07';
        const startDate1 = `${startYear}-${startMonth1}-01`;
        const endDate1 = startPeriod === 'jan-jun' ? `${startYear}-06-30` : `${startYear}-12-31`;

        // Calculate Date Range 2 (End)
        const startMonth2 = endPeriod === 'jan-jun' ? '01' : '07';
        const startDate2 = `${endYear}-${startMonth2}-01`;
        const endDate2 = endPeriod === 'jan-jun' ? `${endYear}-06-30` : `${endYear}-12-31`;

        console.log(`Analyzing comparison: ${startDate1} - ${endDate1} VS ${startDate2} - ${endDate2}`);

        try {
            let coordinatesToSend = [];
            if (Array.isArray(selectedArea)) {
                coordinatesToSend = selectedArea;
            } else if (selectedArea && selectedArea.ne && selectedArea.sw) {
                coordinatesToSend = [
                    { lat: selectedArea.ne.lat, lng: selectedArea.sw.lng },
                    { lat: selectedArea.ne.lat, lng: selectedArea.ne.lng },
                    { lat: selectedArea.sw.lat, lng: selectedArea.ne.lng },
                    { lat: selectedArea.sw.lat, lng: selectedArea.sw.lng },
                    { lat: selectedArea.ne.lat, lng: selectedArea.sw.lng }
                ];
            } else {
                coordinatesToSend = AOI_COORDINATES;
            }

            const { data } = await analyzeArea({
                coordinates: coordinatesToSend,
                range1: {
                    startDate: startDate1,
                    endDate: endDate1
                },
                range2: {
                    startDate: startDate2,
                    endDate: endDate2
                }
            });

            if (!abortControllerRef.current) return;

            if (data.status === 'success') {
                setAnalysisResults(data);
                setTimeout(() => {
                    resultsRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 300);
            } else {
                setError(data.message || "Analysis failed");
            }
        } catch (err) {
            if (err.name === 'CanceledError' || !abortControllerRef.current) {
                console.log('Request canceled');
            } else {
                console.error(err);
                setError("Analysis failed. Please try again.");
            }
        } finally {
            if (abortControllerRef.current) {
                setLoading(false);
                abortControllerRef.current = null;
            }
        }
    };

    return (
        <div className="flex h-screen bg-[#f8fdf9] overflow-hidden">
            <Sidebar />

            <main 
                className="flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300"
                style={{ marginLeft: sidebarMargin }}
            >
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: '16px',
                    padding: '24px',
                    paddingBottom: '0',
                    zIndex: 20
                }}>
                    <div style={{ background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)' }} className="rounded-2xl p-5 text-white flex flex-col gap-2 shadow-[0_8px_32px_rgba(45,106,79,0.12)]">
                        <div className="flex items-center gap-3">
                            <BarChart3 color="#74c69d" size={20} />
                            <p style={{ color: '#a8d5ba', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Total Analyses</p>
                        </div>
                        <p style={{ color: 'white', fontSize: '36px', fontWeight: 'bold', fontFamily: 'Outfit, sans-serif', marginTop: 'auto' }}>{dashStats.totalAnalyses}</p>
                        <p style={{ color: '#74c69d', fontSize: '11px', marginTop: '4px' }}>Total reports saved</p>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #2d6a4f, #40916c)' }} className="rounded-2xl p-5 text-white flex flex-col gap-2 shadow-[0_8px_32px_rgba(45,106,79,0.12)]">
                        <div className="flex items-center gap-3">
                            <MapIcon color="#d8f3dc" size={20} />
                            <p style={{ color: '#d8f3dc', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Area Monitored</p>
                        </div>
                        <p style={{ color: 'white', fontSize: '36px', fontWeight: 'bold', fontFamily: 'Outfit, sans-serif', marginTop: 'auto' }}>{typeof dashStats.totalArea === 'number' ? dashStats.totalArea.toFixed(2) : dashStats.totalArea}<span className="text-sm font-normal ml-1">km²</span></p>
                        <p style={{ color: '#d8f3dc', fontSize: '11px', marginTop: '4px' }}>Combined area across all analyses</p>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #991b1b, #dc2626)' }} className="rounded-2xl p-5 text-white flex flex-col gap-2 shadow-[0_8px_32px_rgba(153,27,27,0.12)]">
                        <div className="flex items-center gap-3">
                            <AlertTriangle color="#fca5a5" size={20} />
                            <p style={{ color: '#fca5a5', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Deforestation</p>
                        </div>
                        <p style={{ color: 'white', fontSize: '36px', fontWeight: 'bold', fontFamily: 'Outfit, sans-serif', marginTop: 'auto' }}>{typeof dashStats.totalDeforested === 'number' ? dashStats.totalDeforested.toFixed(2) : dashStats.totalDeforested}<span className="text-sm font-normal ml-1">km²</span></p>
                        <p style={{ color: '#fca5a5', fontSize: '11px', marginTop: '4px' }}>Total deforested area detected</p>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #1a3c2e, #1f4d38)' }} className="rounded-2xl p-5 text-white flex flex-col gap-2 shadow-[0_8px_32px_rgba(45,106,79,0.12)]">
                        <div className="flex items-center gap-3">
                            <Clock color="#74c69d" size={20} />
                            <p style={{ color: '#a8d5ba', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Last Analysis</p>
                        </div>
                        <p style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', fontFamily: 'Outfit, sans-serif', marginTop: 'auto' }}>{dashStats.lastAnalysisDate ?? 'None yet'}</p>
                        <p style={{ color: '#a8d5ba', fontSize: '11px', marginTop: '4px' }}>Most recent report date</p>
                    </div>
                </div>
                {/* Header */}
                <header style={{
                    background: 'var(--color-bg-card)',
                    backdropFilter: 'blur(10px)',
                    padding: '16px 32px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: 'var(--glass-border)',
                    zIndex: 10
                }}>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Satellite Analysis</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>Monitor deforestation in real-time</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

                        {/* 6-Month Interval Selection wrapped in styled card */}
                        <div style={{ background: '#f0faf4', border: '1px solid #b7e4c7', borderRadius: '12px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                            {/* Start Date Group */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#40916c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Start Date</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#b7e4c7]">
                                        <Calendar size={14} color="#74c69d" />
                                        <select
                                            value={startYear}
                                            onChange={(e) => setStartYear(parseInt(e.target.value))}
                                            className="bg-transparent border-none outline-none font-medium text-sm text-[#1b2d27] cursor-pointer hover:text-green-700 transition-colors"
                                        >
                                            {availableYears.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#b7e4c7]">
                                        <select
                                            value={startPeriod}
                                            onChange={(e) => setStartPeriod(e.target.value)}
                                            className="bg-transparent border-none outline-none font-medium text-sm text-[#1b2d27] cursor-pointer hover:text-green-700 transition-colors"
                                        >
                                            <option value="jan-jun">Jan-Jun</option>
                                            <option value="jul-dec">Jul-Dec</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ width: '1px', height: '32px', background: '#b7e4c7' }}></div>

                            {/* End Date Group */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#40916c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>End Date</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#b7e4c7]">
                                        <Calendar size={14} color="#74c69d" />
                                        <select
                                            value={endYear}
                                            onChange={(e) => setEndYear(parseInt(e.target.value))}
                                            className="bg-transparent border-none outline-none font-medium text-sm text-[#1b2d27] cursor-pointer hover:text-green-700 transition-colors"
                                        >
                                            {availableYears.map(year => (
                                                <option key={year} value={year}>{year}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#b7e4c7]">
                                        <select
                                            value={endPeriod}
                                            onChange={(e) => setEndPeriod(e.target.value)}
                                            className="bg-transparent border-none outline-none font-medium text-sm text-[#1b2d27] cursor-pointer hover:text-green-700 transition-colors"
                                        >
                                            <option value="jan-jun">Jan-Jun</option>
                                            <option value="jul-dec">Jul-Dec</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {loading ? (
                            <button
                                style={{
                                    background: 'white',
                                    color: '#dc2626',
                                    border: '1.5px solid #fca5a5',
                                    borderRadius: '10px',
                                    padding: '12px 20px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 14px rgba(220,38,38,0.1)',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                }}
                                onClick={handleCancelAnalysis}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                            >
                                <XCircle size={18} />
                                <span>Cancel</span>
                            </button>
                        ) : (
                            <button
                                style={{
                                    background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '12px 24px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 14px rgba(45,106,79,0.3)',
                                    transition: 'transform 0.2s ease',
                                    cursor: 'pointer'
                                }}
                                onClick={handleAnalyze}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                            >
                                <BarChart2 size={18} />
                                <span>Run Analysis</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Content Area - vertical layout */}
                <div className="flex flex-col overflow-y-auto" style={{ flex: 1 }}>
                    {/* Map Section - full width */}
                    <div style={{ height: '500px', position: 'relative', flexShrink: 0, overflow: 'hidden' }}>
                        <MapComponent
                            onAreaSelected={handleAreaSelected}
                            selectedArea={selectedArea}
                            baseAOI={baseAOI}
                            mapCenter={mapCenter}
                            mapZoom={mapZoom}
                            analysisResults={analysisResults}
                        />
                    </div>

                    {/* Results Section - below map, full width */}
                    <AnimatePresence>
                        {analysisResults && (
                            <motion.div
                                ref={resultsRef}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 30 }}
                                transition={{ 
                                    duration: 0.5, 
                                    ease: [0.25, 0.46, 0.45, 0.94],
                                    delay: 0.1
                                }}
                                style={{
                                    padding: '24px',
                                    background: '#f0faf4',
                                    borderTop: '1px solid #b7e4c7'
                                }}
                            >
                                <ResultsPanel 
                                    data={analysisResults}
                                    onSave={() => {
                                        setReportName('Analysis ' + new Date().toLocaleDateString('en-GB'));
                                        setNameError('');
                                        setShowSaveModal(true);
                                    }}
                                    isSaving={isSaving}
                                    startLabel={`${startYear} ${startPeriod === 'jan-jun' ? 'Jan–Jun' : 'Jul–Dec'}`}
                                    endLabel={`${endYear} ${endPeriod === 'jan-jun' ? 'Jan–Jun' : 'Jul–Dec'}`}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                    {/* Error */}
                    {error && (
                        <div style={{
                            position: 'fixed',
                            top: '20px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            zIndex: 9999,
                            width: '90%',
                            maxWidth: '500px',
                            padding: '12px',
                            background: '#fef2f2',
                            border: '1px solid #ef4444',
                            borderRadius: '8px',
                            color: '#ef4444',
                            fontSize: '0.875rem',
                        }}>
                            {error}
                        </div>
                    )}
                </div>

                {/* Save Report Modal */}
                {showSaveModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(4px)'
                }}>
                    <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '32px',
                        width: '100%',
                        maxWidth: '440px',
                        boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
                        border: '1px solid #b7e4c7'
                    }}
                    >
                    <h3 style={{
                        fontFamily: 'Outfit, sans-serif',
                        fontSize: '20px',
                        fontWeight: 700,
                        color: '#1a3c2e',
                        margin: '0 0 8px 0'
                    }}>
                        Save Analysis Report
                    </h3>
                    <p style={{
                        fontSize: '13px',
                        color: '#4a6358',
                        margin: '0 0 24px 0'
                    }}>
                        Give this analysis a meaningful name 
                        to find it easily in your history.
                    </p>
                    <label style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#2d6a4f',
                        display: 'block',
                        marginBottom: '8px'
                    }}>
                        Report Name *
                    </label>
                    <input
                        type="text"
                        value={reportName}
                        onChange={(e) => {
                        setReportName(e.target.value);
                        setNameError('');
                        }}
                        onKeyDown={(e) => {
                        if (e.key === 'Enter') 
                            handleConfirmSave();
                        }}
                        placeholder="e.g. Margalla Hills 2020-2023"
                        maxLength={80}
                        style={{
                        width: '100%',
                        border: nameError 
                            ? '1.5px solid #dc2626' 
                            : '1.5px solid #b7e4c7',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: '#1b2d27',
                        background: '#f9fefb',
                        outline: 'none',
                        boxSizing: 'border-box',
                        marginBottom: '4px'
                        }}
                        autoFocus
                    />
                    {nameError && (
                        <p style={{
                        fontSize: '12px',
                        color: '#dc2626',
                        margin: '4px 0 16px 0'
                        }}>
                        {nameError}
                        </p>
                    )}
                    {!nameError && (
                        <div style={{ marginBottom: '16px' }} />
                    )}
                    <div style={{ 
                        display: 'flex', 
                        gap: '12px' 
                    }}>
                        <button
                        onClick={() => setShowSaveModal(false)}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'white',
                            border: '1.5px solid #b7e4c7',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#4a6358',
                            cursor: 'pointer'
                        }}
                        >
                        Cancel
                        </button>
                        <button
                        onClick={handleConfirmSave}
                        disabled={isSaving}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'white',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            opacity: isSaving ? 0.7 : 1,
                            boxShadow: '0 4px 14px rgba(45,106,79,0.3)'
                        }}
                        >
                        {isSaving ? 'Saving...' : 'Save Report'}
                        </button>
                    </div>
                    </motion.div>
                </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;

// feat(dashboard): wire MapComponent and ResultsPanel

// feat(dashboard): add date range selection (6-month intervals)

// feat(dashboard): add loading indicators during analysis

// feat(dashboard): persist selected area in URL state

// feat(dashboard): add dashboard stats panel

// feat(dashboard): integrate new ML analyze endpoint

// feat(dashboard): add save-report modal with name validation

// style(dashboard): align map error state with theme

// fix(dashboard): abort pending requests on unmount

// 6-month date range selection

// persist area in URL state

// dashboard stats panel

// align error state with theme
