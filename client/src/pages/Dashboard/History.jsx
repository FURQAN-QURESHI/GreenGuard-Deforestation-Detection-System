import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { Eye, Download, X, MapPin, Calendar, TrendingDown, Trees, AlertTriangle, CheckCircle, Clock, BarChart3, Leaf, Target, Trash2, Share2, RefreshCw, TreePine, History as HistoryIcon } from 'lucide-react';
import { fetchReports } from '../../api';
import api from '../../api'; // For delete
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatArea = (value) => {
  const num = parseFloat(value) || 0;
  if (num === 0) return '0.00';
  if (num < 0.01) return '< 0.01';
  if (num < 0.1) return num.toFixed(3);
  return num.toFixed(2);
};

const formatPercent = (value) => {
  const num = parseFloat(value) || 0;
  if (num === 0) return '0.00';
  if (num < 0.01) return '< 0.01';
  return num.toFixed(2);
};

const History = () => {
    const [sidebarMargin, setSidebarMargin] = useState(
        window.innerWidth >= 1024 ? 280 : 0
    );

    useEffect(() => {
        const handleResize = () => setSidebarMargin(window.innerWidth >= 1024 ? 280 : 0);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [reports, setReports] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredReports, setFilteredReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadReports = async () => {
            try {
                const { data } = await fetchReports();
                console.log("History Page - Fetched Reports:", data);
                setReports(data || []);
                setFilteredReports(data || []);
            } catch (error) {
                console.error("Failed to fetch history", error);
            } finally {
                setLoading(false);
            }
        };
        loadReports();
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredReports(reports);
        } else {
            const query = searchQuery.toLowerCase().trim();
            setFilteredReports(
                reports.filter(r =>
                    r.areaName?.toLowerCase().includes(query)
                )
            );
        }
    }, [searchQuery, reports]);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        const confirmed = window.confirm(
            'Are you sure you want to delete this report?\n\n' +
            'This will permanently remove the analysis ' +
            'report and all its data.\n\n' +
            'This action cannot be undone.'
        );
        if (!confirmed) return;
        try {
            await api.delete(`/reports/${id}`);
            setReports(reports.filter(r => r._id !== id));
            setFilteredReports(filteredReports.filter(r => r._id !== id));
        } catch (err) {
            console.error('Failed to delete', err);
            alert('Failed to delete report');
        }
    };

    const handleShare = async (report, e) => {
        e.stopPropagation();
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;

            const sectionHeader = (text, yPos) => {
                doc.setFillColor(45, 106, 79);
                doc.roundedRect(14, yPos - 3, 3, 11, 1, 1, 'F');
                doc.setTextColor(26, 60, 46);
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(text, 20, yPos + 5);
                return yPos + 12;
            };

            const fmtArea = (v) => {
                const n = parseFloat(v) || 0;
                if (n === 0) return '0.00 km2';
                if (n < 0.01) return '< 0.01 km2';
                if (n < 0.1) return `${n.toFixed(3)} km2`;
                return `${n.toFixed(2)} km2`;
            };

            // Header
            doc.setFillColor(26, 60, 46);
            doc.rect(0, 0, pageWidth, 28, 'F');
            doc.setTextColor(116, 198, 157);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('GreenGuard', 14, 12);
            doc.setTextColor(168, 213, 186);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Forest Monitor — Analysis Report', 14, 22);
            doc.setTextColor(200, 230, 210);
            doc.setFontSize(8);
            doc.text(
                new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
                pageWidth - 14, 16, { align: 'right' }
            );

            let y = 36;

            // Report name
            doc.setTextColor(26, 60, 46);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(report.areaName || 'Analysis Report', 14, y);
            y += 5;
            doc.setDrawColor(180, 220, 190);
            doc.setLineWidth(0.3);
            doc.line(14, y, pageWidth - 14, y);
            y += 7;

            // Period
            const startDate = report.startDate
                ? new Date(report.startDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                : 'N/A';
            const endDate = report.endDate
                ? new Date(report.endDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                : 'N/A';
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(74, 99, 88);
            doc.text(
                `Period: ${startDate} to ${endDate}   |   Generated: ${new Date().toLocaleDateString('en-GB')}`,
                14, y
            );
            y += 10;

            // Stats table
            y = sectionHeader('Analysis Statistics', y);
            const totalArea = parseFloat(report.total_area_km2 || report.totalForestArea || 0);
            const deforestedArea = parseFloat(report.deforested_area_km2 || report.deforestedArea || 0);
            const remainingArea = Math.max(0, totalArea - deforestedArea);
            const deforestPct = parseFloat(report.deforestation_percentage || report.deforestationPercent || 0);
            const getRisk = (p) => p <= 10 ? 'Low' : p <= 30 ? 'Medium' : 'High';
            const riskLevel = getRisk(deforestPct);

            autoTable(doc, {
                startY: y,
                head: [['Metric', 'Value', 'Status']],
                body: [
                    ['Total Area', fmtArea(totalArea), 'Measured'],
                    ['Deforested', fmtArea(deforestedArea), deforestedArea > 0 ? 'Detected' : 'Clear'],
                    ['Remaining', fmtArea(remainingArea), 'Protected'],
                    ['Deforestation Rate', `${deforestPct.toFixed(2)}%`, `${riskLevel} Risk`],
                ],
                headStyles: { fillColor: [45, 106, 79], textColor: 255, fontSize: 9, cellPadding: 3 },
                bodyStyles: { fontSize: 9, textColor: [26, 60, 46], cellPadding: 3 },
                alternateRowStyles: { fillColor: [240, 250, 244] },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 72 }, 1: { cellWidth: 52 }, 2: { cellWidth: 50 } },
                margin: { left: 14, right: 14 }
            });

            // Footer
            doc.setFillColor(26, 60, 46);
            doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');
            doc.setTextColor(116, 198, 157);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text(
                "GreenGuard — Pakistan's First AI-Powered Deforestation Detection System",
                pageWidth / 2, pageHeight - 5, { align: 'center' }
            );

            // Get PDF as blob
            const pdfBlob = doc.output('blob');
            const blobUrl = URL.createObjectURL(pdfBlob);

            const pdfFilename = `GreenGuard_${(report.areaName || 'report')
              .replace(/[^a-zA-Z0-9\s]/g, '')
              .replace(/\s+/g, '_')
              .toLowerCase()}.pdf`;

            navigate('/contact', {
                state: {
                    name: '',
                    email: '',
                    subject: `Sharing Analysis Report: ${report.areaName}`,
                    message: `I am sharing the following forest analysis report from GreenGuard:\n\nReport: ${report.areaName}\nTotal Area: ${fmtArea(totalArea)}\nDeforested Area: ${fmtArea(deforestedArea)}\nDeforestation Rate: ${deforestPct.toFixed(2)}%\nRisk Level: ${riskLevel}\n\nPlease find the detailed PDF report attached.`,
                    isShare: true,
                    areaName: report.areaName,
                    pdfBlobUrl: blobUrl,
                    pdfFilename: pdfFilename,
                    stats: `Total: ${fmtArea(totalArea)}, Deforested: ${fmtArea(deforestedArea)}, Rate: ${deforestPct.toFixed(2)}%`
                }
            });
        } catch (err) {
            console.error('Share failed:', err);
            alert('Failed to prepare report for sharing.');
        }
    };


    const handleUpdate = (report, e) => {
        e.stopPropagation();
        // Redirect to dashboard with coordinates to run analysis again
        alert("Redirecting to Dashboard to run new analysis for this area...");
        navigate('/dashboard', {
            state: {
                coordinates: report.coordinates,
                mode: 'update'
            }
        });
    };

    // Get risk level based on deforestation percentage
    const getRiskLevel = (percent) => {
        if (percent >= 50) return { level: 'Critical', color: '#dc2626', bg: '#fef2f2' };
        if (percent >= 30) return { level: 'High', color: '#ea580c', bg: '#fff7ed' };
        if (percent >= 15) return { level: 'Moderate', color: '#ca8a04', bg: '#fefce8' };
        return { level: 'Low', color: '#16a34a', bg: '#f0fdf4' };
    };

    const getLocationText = (coordinates) => {
        if (!coordinates || coordinates.length === 0) 
            return 'Margalla Hills, Islamabad';
        const first = coordinates[0];
        if (first.lat && first.lng) {
            return `${parseFloat(first.lat).toFixed(3)}°N, ${parseFloat(first.lng).toFixed(3)}°E`;
        }
        if (Array.isArray(first)) {
            return `${parseFloat(first[1]).toFixed(3)}°N, ${parseFloat(first[0]).toFixed(3)}°E`;
        }
        return 'Margalla Hills, Islamabad';
    };

    // Chart data for the modal
    const getChartData = (report) => {
        const remaining = 100 - (report.deforestationPercent || 0);
        return [
            { name: 'Remaining Forest', value: parseFloat(remaining.toFixed(1)), color: '#16a34a' },
            { name: 'Deforested Area', value: parseFloat((report.deforestationPercent || 0).toFixed(1)), color: '#dc2626' }
        ];
    };

    const generatePDF = (report) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Section header helper - compact version
  const sectionHeader = (text, yPos) => {
    doc.setFillColor(45, 106, 79);
    doc.roundedRect(14, yPos - 3, 3, 11, 1, 1, 'F');
    doc.setTextColor(26, 60, 46);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(text, 20, yPos + 5);
    return yPos + 12;
  };

  // Area format helper
  const fmtArea = (v) => {
    const n = parseFloat(v) || 0;
    if (n === 0) return '0.00 km2';
    if (n < 0.01) return '< 0.01 km2';
    if (n < 0.1) return `${n.toFixed(3)} km2`;
    return `${n.toFixed(2)} km2`;
  };

  // ── COMPACT HEADER ──────────────────────────
  // Thin header bar - only 28px tall
  doc.setFillColor(26, 60, 46);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(116, 198, 157);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('GreenGuard', 14, 12);

  doc.setTextColor(168, 213, 186);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Forest Monitor — Analysis Report', 14, 22);

  doc.setTextColor(200, 230, 210);
  doc.setFontSize(8);
  doc.text(
    new Date().toLocaleDateString('en-GB', {
      day: '2-digit', month: 'long', year: 'numeric'
    }),
    pageWidth - 14, 16,
    { align: 'right' }
  );

  doc.setDrawColor(116, 198, 157);
  doc.setLineWidth(0.5);
  doc.line(0, 28, pageWidth, 28);

  let y = 36;

  // ── REPORT NAME ─────────────────────────────
  doc.setTextColor(26, 60, 46);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(report.areaName || 'Analysis Report', 14, y);
  y += 5;

  doc.setDrawColor(180, 220, 190);
  doc.setLineWidth(0.3);
  doc.line(14, y, pageWidth - 14, y);
  y += 7;

  // ── PERIOD INFO ─────────────────────────────
  const startDate = report.startDate
    ? new Date(report.startDate)
        .toLocaleDateString('en-GB', {
          month: 'long', year: 'numeric'
        })
    : 'N/A';
  const endDate = report.endDate
    ? new Date(report.endDate)
        .toLocaleDateString('en-GB', {
          month: 'long', year: 'numeric'
        })
    : 'N/A';

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 99, 88);
  doc.text(
    `Period: ${startDate} to ${endDate}   |   Generated: ${new Date().toLocaleDateString('en-GB')}`,
    14, y
  );
  y += 10;

  // ── STATISTICS TABLE ─────────────────────────
  y = sectionHeader('Analysis Statistics', y);

  const totalArea = parseFloat(
    report.total_area_km2 || report.totalForestArea || 0
  );
  const deforestedArea = parseFloat(
    report.deforested_area_km2 || report.deforestedArea || 0
  );
  const remainingArea = Math.max(0, totalArea - deforestedArea);
  const deforestPct = parseFloat(
    report.deforestation_percentage || 
    report.deforestationPercent || 0
  );

  const getRisk = (pct) => {
    if (pct <= 10) return 'Low';
    if (pct <= 30) return 'Medium';
    return 'High';
  };
  const riskLevel = getRisk(deforestPct);

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value', 'Status']],
    body: [
      ['Total Analyzed Area', fmtArea(totalArea), 'Measured'],
      [
        'Deforested Area',
        fmtArea(deforestedArea),
        deforestedArea > 0 ? 'Detected' : 'Clear'
      ],
      ['Forest Remaining', fmtArea(remainingArea), 'Protected'],
      [
        'Deforestation Rate',
        `${deforestPct.toFixed(2)}%`,
        `${riskLevel} Risk`
      ],
      [
        'Model Confidence',
        report.confidence
          ? `${(report.confidence * 100).toFixed(1)}%`
          : 'N/A',
        'Verified'
      ],
    ],
    headStyles: {
      fillColor: [45, 106, 79],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      font: 'helvetica',
      cellPadding: 3
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [26, 60, 46],
      font: 'helvetica',
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [240, 250, 244]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 72 },
      1: { cellWidth: 52 },
      2: { cellWidth: 50 }
    },
    margin: { left: 14, right: 14 }
  });

  y = doc.lastAutoTable.finalY + 4;

  // km2 footnote - very small
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(160, 175, 165);
  doc.text('* km2 = square kilometers', 14, y);
  y += 10;

  // ── TWO COLUMN LAYOUT ────────────────────────
  // Pie chart LEFT + Risk & Coverage RIGHT
  // This saves vertical space significantly

  const leftColX = 14;
  const rightColX = pageWidth / 2 + 4;
  const colWidth = pageWidth / 2 - 18;
  const sectionY = y;

  // LEFT: Pie Chart
  // Section label
  doc.setFillColor(45, 106, 79);
  doc.roundedRect(leftColX, sectionY - 3, 3, 11, 1, 1, 'F');
  doc.setTextColor(26, 60, 46);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Forest Coverage', leftColX + 6, sectionY + 5);

  const pieStartY = sectionY + 14;

  // Draw pie chart - smaller size
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  const cx = 120, cy = 120, r = 100;
  const forestFraction = totalArea > 0
    ? remainingArea / totalArea : 1;

  // Forest slice
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, -Math.PI / 2,
    -Math.PI / 2 + 2 * Math.PI * forestFraction
  );
  ctx.closePath();
  ctx.fillStyle = '#16a34a';
  ctx.fill();

  // Deforested slice
  if (forestFraction < 1) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r,
      -Math.PI / 2 + 2 * Math.PI * forestFraction,
      -Math.PI / 2 + 2 * Math.PI
    );
    ctx.closePath();
    ctx.fillStyle = '#dc2626';
    ctx.fill();
  }

  // White donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Center text
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a3c2e';
  ctx.font = 'bold 24px Arial';
  ctx.fillText(
    `${(100 - deforestPct).toFixed(1)}%`,
    cx, cy - 4
  );
  ctx.font = '12px Arial';
  ctx.fillStyle = '#4a6358';
  ctx.fillText('Forest', cx, cy + 14);

  const pieImg = canvas.toDataURL('image/png');
  // Smaller pie: 55x55
  const pieSize = 55;
  doc.addImage(pieImg, 'PNG', leftColX, pieStartY, 
    pieSize, pieSize
  );

  // Legend beside pie chart
  const legX = leftColX + pieSize + 8;
  let legY = pieStartY + 8;

  doc.setFillColor(22, 163, 74);
  doc.roundedRect(legX, legY, 7, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(26, 60, 46);
  doc.text('Forest', legX + 10, legY + 5.5);
  legY += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(45, 106, 79);
  doc.text(fmtArea(remainingArea), legX + 10, legY);
  legY += 12;

  doc.setFillColor(220, 38, 38);
  doc.roundedRect(legX, legY, 7, 7, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 60, 46);
  doc.text('Deforested', legX + 10, legY + 5.5);
  legY += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 38, 38);
  doc.text(fmtArea(deforestedArea), legX + 10, legY);

  // RIGHT COLUMN: Risk Assessment
  doc.setFillColor(45, 106, 79);
  doc.roundedRect(rightColX, sectionY - 3, 3, 11, 
    1, 1, 'F'
  );
  doc.setTextColor(26, 60, 46);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Risk Assessment', rightColX + 6, sectionY + 5);

  const riskY = sectionY + 14;
  const riskColorMap = {
    Low: [22, 163, 74],
    Medium: [217, 119, 6],
    High: [220, 38, 38]
  };
  const rc = riskColorMap[riskLevel] || [22, 163, 74];

  doc.setFillColor(...rc);
  doc.roundedRect(rightColX, riskY, colWidth, 18, 
    3, 3, 'F'
  );
  doc.setTextColor(255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `${riskLevel} Risk`,
    rightColX + colWidth / 2,
    riskY + 8,
    { align: 'center' }
  );
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Deforestation Rate: ${deforestPct.toFixed(2)}%`,
    rightColX + colWidth / 2,
    riskY + 15,
    { align: 'center' }
  );

  // Right column: Quick stats boxes
  let statsBoxY = riskY + 26;
  const boxW = (colWidth - 4) / 2;

  // Box 1: Total Area
  doc.setFillColor(240, 250, 244);
  doc.roundedRect(rightColX, statsBoxY, boxW, 22, 
    3, 3, 'F'
  );
  doc.setTextColor(74, 99, 88);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Area', rightColX + boxW/2, 
    statsBoxY + 7, { align: 'center' }
  );
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 60, 46);
  doc.text(
    fmtArea(totalArea),
    rightColX + boxW/2,
    statsBoxY + 16,
    { align: 'center' }
  );

  // Box 2: Deforested
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(
    rightColX + boxW + 4, statsBoxY, boxW, 22, 
    3, 3, 'F'
  );
  doc.setTextColor(220, 38, 38);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Deforested',
    rightColX + boxW + 4 + boxW/2,
    statsBoxY + 7,
    { align: 'center' }
  );
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(
    fmtArea(deforestedArea),
    rightColX + boxW + 4 + boxW/2,
    statsBoxY + 16,
    { align: 'center' }
  );

  statsBoxY += 28;

  // Coordinates (if available) in right column
  if (report.coordinates && 
      report.coordinates.length > 0) {
    const first = report.coordinates[0];
    let lat = 'N/A', lng = 'N/A';
    if (first?.lat !== undefined) {
      lat = parseFloat(first.lat).toFixed(3);
      lng = parseFloat(first.lng).toFixed(3);
    } else if (Array.isArray(first)) {
      lat = parseFloat(first[1]).toFixed(3);
      lng = parseFloat(first[0]).toFixed(3);
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 60, 46);
    doc.text('Location:', rightColX, statsBoxY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(74, 99, 88);
    doc.text(
      `${lat} N,  ${lng} E`,
      rightColX,
      statsBoxY + 7
    );
    doc.text(
      `${report.coordinates.length} boundary points`,
      rightColX,
      statsBoxY + 14
    );
  }

  // ── FOOTER ──────────────────────────────────
  doc.setFillColor(26, 60, 46);
  doc.rect(0, pageHeight - 14, pageWidth, 14, 'F');
  doc.setTextColor(116, 198, 157);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    "GreenGuard — Pakistan's First AI-Powered Deforestation Detection System",
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );
  doc.setTextColor(168, 213, 186);
  doc.text(
    `Generated: ${new Date().toLocaleDateString('en-GB')}`,
    pageWidth - 14,
    pageHeight - 5,
    { align: 'right' }
  );

  // ── SAVE ────────────────────────────────────
  const safeName = (report.areaName || 'report')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .toLowerCase();
  doc.save(`GreenGuard_${safeName}.pdf`);
};

    // Enhanced Report View Modal Component
    const ReportModal = ({ report, onClose }) => {
        const risk = getRiskLevel(report.deforestationPercent || 0);
        const chartData = getChartData(report);
        const remainingForest = 100 - (report.deforestationPercent || 0);

        return (
            <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                <div
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
                    style={{ animation: 'fadeInUp 0.3s ease-out' }}
                >
                    {/* Header */}
                    <div
                        className="p-6 text-white relative overflow-hidden"
                        style={{
                            background: 'linear-gradient(135deg, #16a34a 0%, #14532d 100%)',
                        }}
                    >
                        <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
                            <Leaf size={256} />
                        </div>
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <p className="text-green-200 text-sm font-medium mb-1">GreenGuard Analysis Report</p>
                                <h3 className="text-2xl font-bold">{report.areaName || 'Untitled Area'}</h3>
                                <div className="flex items-center gap-4 mt-3 text-green-100 text-sm">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        {new Date(report.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={14} />
                                        {new Date(report.createdAt).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/20 rounded-full transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <span
                                className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                            >
                                <CheckCircle size={12} /> Completed
                            </span>
                            <span className="text-xs text-green-200">ID: {report._id}</span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 280px)' }}>
                        {/* Risk Alert Banner */}
                        <div
                            className="rounded-xl p-4 mb-6 flex items-center gap-4"
                            style={{ backgroundColor: risk.bg, border: `1px solid ${risk.color}20` }}
                        >
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: risk.color + '20' }}
                            >
                                <AlertTriangle size={24} style={{ color: risk.color }} />
                            </div>
                            <div>
                                <p className="font-semibold" style={{ color: risk.color }}>
                                    {risk.level} Risk Level
                                </p>
                                <p className="text-sm text-gray-600">
                                    {report.deforestationPercent >= 50
                                        ? 'Immediate action required. Critical deforestation detected.'
                                        : report.deforestationPercent >= 30
                                            ? 'Significant deforestation observed. Monitoring recommended.'
                                            : report.deforestationPercent >= 15
                                                ? 'Moderate deforestation levels. Continue observation.'
                                                : 'Healthy forest coverage. Minimal deforestation detected.'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                                <div className="flex items-center gap-2 text-green-600 mb-2">
                                    <Trees size={18} />
                                    <span className="text-xs font-medium uppercase tracking-wide">Total Forest</span>
                                </div>
                                <p className="text-2xl font-bold text-green-800">
                                    {formatArea(report.total_area_km2 || report.totalForestArea || 0)}
                                </p>
                                <p className="text-xs text-green-600">sq km</p>
                            </div>

                            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                                <div className="flex items-center gap-2 text-red-600 mb-2">
                                    <TrendingDown size={18} />
                                    <span className="text-xs font-medium uppercase tracking-wide">Deforested</span>
                                </div>
                                <p className="text-2xl font-bold text-red-800">
                                    {formatArea(report.deforested_area_km2 || report.deforestedArea || 0)}
                                </p>
                                <p className="text-xs text-red-600">sq km</p>
                            </div>

                            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
                                <div className="flex items-center gap-2 text-amber-600 mb-2">
                                    <BarChart3 size={18} />
                                    <span className="text-xs font-medium uppercase tracking-wide">Deforestation</span>
                                </div>
                                <p className="text-2xl font-bold text-amber-800">
                                    {formatPercent(report.deforestation_percentage || report.deforestationPercent || 0)}%
                                </p>
                                <p className="text-xs text-amber-600">of total area</p>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border border-emerald-200">
                                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                    <Target size={18} />
                                    <span className="text-xs font-medium uppercase tracking-wide">Remaining</span>
                                </div>
                                <p className="text-2xl font-bold text-emerald-800">
                                    {remainingForest.toFixed(1)}%
                                </p>
                                <p className="text-xs text-emerald-600">forest cover</p>
                            </div>
                        </div>

                        {report.coordinates && report.coordinates.length > 0 && (() => {
                            const bounds = report.coordinates.map(c => {
                                if (c.lat !== undefined) return [c.lat, c.lng];
                                if (Array.isArray(c)) return [c[1], c[0]];
                                return [0, 0];
                            });
                            return (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-green-800 mb-2 text-sm">Analyzed Area Map</h4>
                                    <div style={{ height: '280px', width: '100%' }} className="rounded-lg overflow-hidden border border-gray-200 mb-6">
                                        <MapContainer
                                            bounds={bounds}
                                            boundsOptions={{ padding: [20, 20] }}
                                            scrollWheelZoom={false}
                                            dragging={false}
                                            zoomControl={false}
                                            attributionControl={false}
                                            style={{ height: '100%', width: '100%' }}
                                        >
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                            {report.deforestation_geojson?.features?.length > 0 && (
                                                <GeoJSON
                                                    data={report.deforestation_geojson}
                                                    style={{ color: '#dc2626', weight: 1, fillColor: '#dc2626', fillOpacity: 0.5 }}
                                                />
                                            )}
                                        </MapContainer>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Chart and Details Row */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Pie Chart */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <BarChart3 size={20} className="text-green-600" />
                                    Forest Coverage Analysis
                                </h4>
                                <div style={{ height: 220 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => `${value}%`}
                                                contentStyle={{
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                                }}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                height={36}
                                                formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Location Details */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <MapPin size={20} className="text-green-600" />
                                    Location Details
                                </h4>

                                <div className="space-y-4">
                                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Northeast Bound</p>
                                        <p className="font-mono text-sm text-gray-800">
                                            {report.coordinates?.ne
                                                ? `${report.coordinates.ne.lat.toFixed(6)}, ${report.coordinates.ne.lng.toFixed(6)}`
                                                : 'N/A'
                                            }
                                        </p>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Southwest Bound</p>
                                        <p className="font-mono text-sm text-gray-800">
                                            {report.coordinates?.sw
                                                ? `${report.coordinates.sw.lat.toFixed(6)}, ${report.coordinates.sw.lng.toFixed(6)}`
                                                : 'N/A'
                                            }
                                        </p>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 border border-gray-100">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Analysis Period</p>
                                        <p className="text-sm text-gray-800">
                                            {report.startDate
                                                ? `${new Date(report.startDate).toLocaleDateString()} — ${new Date(report.endDate).toLocaleDateString()}`
                                                : 'Single Date Analysis'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-gray-50 px-6 py-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-xs text-gray-500">
                            Analysis powered by DeepLabV3+ • GreenGuard © {new Date().getFullYear()}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 text-gray-700 font-medium transition-all"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => generatePDF(report)}
                                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 font-medium shadow-lg shadow-green-500/25 transition-all flex items-center gap-2"
                            >
                                <Download size={18} />
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-[#f8fdf9] overflow-hidden">
            <Sidebar />
            <main 
                className="flex-1 h-screen overflow-y-auto p-4 lg:p-8 w-full transition-all duration-300"
                style={{ marginLeft: sidebarMargin }}
            >
                {/* Header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center">
                      <HistoryIcon className="text-white" size={20} />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-green-900" style={{fontFamily:'Outfit,sans-serif'}}>
                        Analysis History
                      </h1>
                      <p className="text-sm text-green-600">
                        View and manage your past analysis reports
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '24px',
                  marginTop: '16px'
                }}>
                  <div style={{
                    flex: 1,
                    position: 'relative',
                    maxWidth: '480px'
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#74c69d',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      🔍
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search reports by name..."
                      style={{
                        width: '100%',
                        padding: '12px 16px 12px 42px',
                        border: '1.5px solid #b7e4c7',
                        borderRadius: '12px',
                        fontSize: '14px',
                        color: '#1b2d27',
                        background: 'white',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s ease',
                        fontFamily: 'Inter, sans-serif'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#40916c';
                        e.target.style.boxShadow = 
                          '0 0 0 3px rgba(64,145,108,0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#b7e4c7';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#8aab9a',
                          fontSize: '16px',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  
                  {/* Results count */}
                  <p style={{
                    fontSize: '13px',
                    color: '#4a6358',
                    margin: 0,
                    whiteSpace: 'nowrap'
                  }}>
                    {filteredReports.length} report
                    {filteredReports.length !== 1 ? 's' : ''}
                    {searchQuery && ` found for "${searchQuery}"`}
                  </p>
                </div>

                {/* Cards */}
                {loading ? <div className="p-8 text-center text-green-700">Loading history...</div> : (
                <div className="space-y-4">
                  {filteredReports.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      color: '#4a6358'
                    }}>
                      <p style={{ 
                        fontSize: '48px', 
                        margin: '0 0 16px 0' 
                      }}>
                        🔍
                      </p>
                      <p style={{ 
                        fontSize: '16px', 
                        fontWeight: 600,
                        color: '#1a3c2e',
                        margin: '0 0 8px 0',
                        fontFamily: 'Outfit, sans-serif'
                      }}>
                        No reports found
                      </p>
                      <p style={{ 
                        fontSize: '13px',
                        margin: 0
                      }}>
                        {searchQuery 
                          ? `No reports match "${searchQuery}". Try a different name.`
                          : 'No analysis reports saved yet. Run an analysis and save it.'
                        }
                      </p>
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          style={{
                            marginTop: '16px',
                            padding: '10px 20px',
                            background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  ) : filteredReports.map(report => {
                    const risk = getRiskLevel(
                      report.deforestationPercent || report.deforestation_percentage || 0
                    );
                    return (
                      <div key={report._id}
                        className="bg-white rounded-2xl border border-green-100 p-5 hover:shadow-lg hover:border-green-300 transition-all duration-200 cursor-pointer"
                        onClick={() => setSelectedReport(report)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Green icon circle */}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-700 to-green-500 flex items-center justify-center flex-shrink-0">
                              <TreePine className="text-white" size={22} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-green-900 text-base">
                                {report.areaName || 'Untitled Area'}
                              </h3>
                              <p className="text-sm text-green-600 mt-0.5 flex items-center gap-1">
                                <MapPin size={12} />
                                {getLocationText(report.coordinates)}
                              </p>
                              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(report.createdAt).toLocaleDateString('en-GB', {
                                    day:'2-digit', month:'short', year:'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            {/* Stats */}
                            <div className="text-center hidden md:block">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">Total Area</p>
                              <p className="font-bold text-green-800">
                                {formatArea(report.total_area_km2 || report.totalForestArea || 0)} km²
                              </p>
                            </div>
                            
                            {/* Risk badge */}
                            <div className="text-center">
                              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Deforestation</p>
                              <span className="px-3 py-1 rounded-full text-sm font-bold"
                                style={{ backgroundColor: risk.bg, color: risk.color }}>
                                {formatPercent(report.deforestation_percentage || report.deforestationPercent || 0)}%
                              </span>
                            </div>
                            
                            {/* Risk level */}
                            <div className="text-center hidden lg:block">
                              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Risk</p>
                              <span className="font-semibold text-sm" style={{ color: risk.color }}>
                                {risk.level}
                              </span>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedReport(report); }}
                                className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition"
                                title="View Report">
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={(e) => handleUpdate(report, e)}
                                className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                                title="Re-analyze">
                                <RefreshCw size={16} />
                              </button>
                              <button
                                onClick={(e) => handleShare(report, e)}
                                className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                                title="Share">
                                <Share2 size={16} />
                              </button>
                              <button
                                onClick={(e) => handleDelete(report._id, e)}
                                className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                                title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}

                {/* Report Modal */}
                {selectedReport && (
                    <ReportModal
                        report={selectedReport}
                        onClose={() => setSelectedReport(null)}
                    />
                )}
            </main>
        </div>
    );
};

export default History;

// feat(history): fetch and render user reports

// feat(history): add report deletion with confirmation

// feat(history): add report name inline editing

// feat(history): add sorting by date and name

// fix(history): correct userId comparison after schema change

// feat(history): add detail modal with full report view

// feat(history): add export all reports to CSV

// feat(history): add filter by date range

// style(history): final table styling

// fix(history): correct date formatting in table

// fetch and render reports

// inline editing of report names

// sort by date and name

// detail modal with full view
