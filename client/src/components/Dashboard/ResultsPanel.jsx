import { PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#16a34a', '#dc2626'];

const getRiskLevel = (percentage) => {
  if (percentage <= 10) 
    return { level: 'Low', color: '#16a34a', bg: '#f0fdf4' };
  if (percentage <= 30) 
    return { level: 'Medium', color: '#d97706', bg: '#fffbeb' };
  return { level: 'High', color: '#dc2626', bg: '#fef2f2' };
};

const formatArea = (value) => {
  if (value === 0) return '0.00';
  if (value < 0.01) return '< 0.01';
  if (value < 0.1) return value.toFixed(3);
  return value.toFixed(2);
};

const ResultsPanel = ({ 
  data, onSave, isSaving,
  startLabel, endLabel 
}) => {
  if (!data) return null;

  const deforested = parseFloat(
    Math.max(0, 
      data.deforested_area_km2 ?? 
      data.deforestedArea ?? 0
    ).toFixed(4)
  );
  const total = parseFloat(
    Math.max(0,
      data.total_area_km2 ?? 
      data.totalForestArea ?? 0
    ).toFixed(4)
  );
  const remaining = parseFloat(
    Math.max(0, total - deforested).toFixed(4)
  );
  const percentage = parseFloat(
    Math.max(0,
      data.deforestation_percentage ?? 
      data.deforestationPercent ?? 0
    ).toFixed(2)
  );
  const risk = getRiskLevel(percentage);

  const pieData = [
    { name: 'Forest Remaining', value: remaining },
    { name: 'Deforested', value: deforested }
  ];

  return (
    <div style={{ width: '100%' }}>

      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div>
          <h2 style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '22px',
            fontWeight: 700,
            color: '#1a3c2e',
            margin: 0
          }}>
            Analysis Results
          </h2>
          <p style={{
            fontSize: '13px',
            color: '#4a6358',
            margin: '4px 0 0 0'
          }}>
            {startLabel && endLabel 
              ? `Comparing ${startLabel} vs ${endLabel}`
              : 'Deforestation detection complete'
            }
          </p>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving}
          style={{
            background: isSaving 
              ? '#40916c' 
              : 'linear-gradient(135deg, #2d6a4f, #40916c)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 28px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.7 : 1,
            boxShadow: '0 4px 14px rgba(45,106,79,0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          💾 {isSaving ? 'Saving...' : 'Save Report'}
        </button>
      </div>

      {/* 4-column horizontal grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        alignItems: 'stretch'
      }}>

        {/* ── Column 1: Statistics ── */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #b7e4c7',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(45,106,79,0.08)'
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#40916c',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 16px 0'
          }}>
            📊 Statistics
          </p>

          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px' 
          }}>
            {/* Total Area */}
            <div style={{
              background: '#f0faf4',
              borderRadius: '10px',
              padding: '12px 14px'
            }}>
              <p style={{ 
                fontSize: '11px', color: '#4a6358',
                margin: '0 0 4px 0', 
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Total Area
              </p>
              <p style={{
                fontSize: '22px', fontWeight: 700,
                color: '#1a3c2e', margin: 0,
                fontFamily: 'Outfit, sans-serif'
              }}>
                {formatArea(total)}
                <span style={{ 
                  fontSize: '12px', fontWeight: 400,
                  marginLeft: '4px' 
                }}>km²</span>
              </p>
            </div>

            {/* Deforested */}
            <div style={{
              background: '#fef2f2',
              borderRadius: '10px',
              padding: '12px 14px'
            }}>
              <p style={{
                fontSize: '11px', color: '#dc2626',
                margin: '0 0 4px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Deforested
              </p>
              <p style={{
                fontSize: '22px', fontWeight: 700,
                color: '#dc2626', margin: 0,
                fontFamily: 'Outfit, sans-serif'
              }}>
                {formatArea(deforested)}
                <span style={{
                  fontSize: '12px', fontWeight: 400,
                  marginLeft: '4px'
                }}>km²</span>
              </p>
            </div>

            {/* Remaining */}
            <div style={{
              background: '#f0faf4',
              borderRadius: '10px',
              padding: '12px 14px'
            }}>
              <p style={{
                fontSize: '11px', color: '#2d6a4f',
                margin: '0 0 4px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Forest Remaining
              </p>
              <p style={{
                fontSize: '22px', fontWeight: 700,
                color: '#2d6a4f', margin: 0,
                fontFamily: 'Outfit, sans-serif'
              }}>
                {formatArea(remaining)}
                <span style={{
                  fontSize: '12px', fontWeight: 400,
                  marginLeft: '4px'
                }}>km²</span>
              </p>
            </div>

            {/* Deforestation Rate */}
            <div style={{
              background: '#fff8f8',
              borderRadius: '10px',
              padding: '12px 14px',
              textAlign: 'center',
              border: '1px solid #fecaca'
            }}>
              <p style={{
                fontSize: '11px', color: '#4a6358',
                margin: '0 0 6px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Deforestation Rate
              </p>
              <p style={{
                fontSize: '34px', fontWeight: 800,
                color: '#dc2626', margin: 0,
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1
              }}>
                {percentage.toFixed(2)}%
              </p>
              <span style={{
                display: 'inline-block',
                marginTop: '8px',
                padding: '3px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                background: risk.bg,
                color: risk.color
              }}>
                {risk.level} Risk
              </span>
              {deforested < 0.01 && deforested > 0 && (
                <p style={{
                  fontSize: '10px',
                  color: '#8aab9a',
                  textAlign: 'center',
                  margin: '8px 0 0 0',
                  fontStyle: 'italic'
                }}>
                  Small deforested area detected.
                  Check map overlay for locations.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Column 2: Pie Chart ── */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #b7e4c7',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(45,106,79,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#40916c',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 16px 0',
            alignSelf: 'flex-start'
          }}>
            🌿 Forest Coverage
          </p>

          <PieChart width={190} height={190}>
            <Pie
              data={pieData}
              dataKey="value"
              cx="50%"
              cy="50%"
              outerRadius={80}
              strokeWidth={0}
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                `${formatArea(value)} km²`
              }
            />
          </PieChart>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '16px',
            alignSelf: 'stretch'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}>
              <div style={{
                width: '10px', height: '10px',
                borderRadius: '50%',
                background: '#16a34a',
                flexShrink: 0
              }} />
              <span style={{ 
                fontSize: '12px', color: '#4a6358',
                flex: 1
              }}>
                Forest
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#1a3c2e'
              }}>
                {formatArea(remaining)} km²
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}>
              <div style={{
                width: '10px', height: '10px',
                borderRadius: '50%',
                background: '#dc2626',
                flexShrink: 0
              }} />
              <span style={{ 
                fontSize: '12px', color: '#4a6358',
                flex: 1
              }}>
                Deforested
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#dc2626'
              }}>
                {formatArea(deforested)} km²
              </span>
            </div>
          </div>

          {/* Confidence if available */}
          {data.confidence && (
            <div style={{
              marginTop: '16px',
              padding: '10px 14px',
              background: '#f0faf4',
              borderRadius: '10px',
              alignSelf: 'stretch',
              textAlign: 'center'
            }}>
              <p style={{ 
                fontSize: '11px', color: '#4a6358',
                margin: '0 0 4px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Model Confidence
              </p>
              <p style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#2d6a4f',
                margin: 0,
                fontFamily: 'Outfit, sans-serif'
              }}>
                {(data.confidence * 100).toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {/* ── Column 3: Satellite Images ── */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #b7e4c7',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(45,106,79,0.08)'
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#40916c',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 16px 0'
          }}>
            📡 Satellite Comparison
          </p>
          <p style={{
            fontSize: '10px',
            color: '#8aab9a',
            margin: '-10px 0 12px 0',
            fontStyle: 'italic'
          }}>
            10m resolution Sentinel-2 imagery
          </p>

          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {/* Before image */}
            {data.before_image && (
              <div>
                <div style={{ position: 'relative' }}>
                  <img
                    src={`data:image/png;base64,${data.before_image}`}
                    alt="Before period satellite"
                    style={{
                      width: '100%',
                      height: '145px',
                      objectFit: 'cover',
                      borderRadius: '10px',
                      border: '2px solid #b7e4c7',
                      display: 'block'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(26,60,46,0.88)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backdropFilter: 'blur(4px)',
                    letterSpacing: '0.05em'
                  }}>
                    📡 BEFORE
                  </div>
                </div>
                <p style={{
                  fontSize: '11px',
                  color: '#4a6358',
                  textAlign: 'center',
                  margin: '6px 0 0 0',
                  fontWeight: 500
                }}>
                  📅 {startLabel || 'Before Period'}
                </p>
              </div>
            )}

            {/* After image */}
            {data.after_image && (
              <div>
                <div style={{ position: 'relative' }}>
                  <img
                    src={`data:image/png;base64,${data.after_image}`}
                    alt="After period satellite"
                    style={{
                      width: '100%',
                      height: '145px',
                      objectFit: 'cover',
                      borderRadius: '10px',
                      border: '2px solid #b7e4c7',
                      display: 'block'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(26,60,46,0.88)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backdropFilter: 'blur(4px)',
                    letterSpacing: '0.05em'
                  }}>
                    📡 AFTER
                  </div>
                </div>
                <p style={{
                  fontSize: '11px',
                  color: '#4a6358',
                  textAlign: 'center',
                  margin: '6px 0 0 0',
                  fontWeight: 500
                }}>
                  📅 {endLabel || 'After Period'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Column 4: Deforestation Overlay ── */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #fca5a5',
          padding: '20px',
          boxShadow: '0 2px 12px rgba(220,38,38,0.08)'
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#dc2626',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 16px 0'
          }}>
            🔴 Deforestation Map
          </p>
          <p style={{
            fontSize: '10px',
            color: '#8aab9a',
            margin: '-10px 0 12px 0',
            fontStyle: 'italic'
          }}>
            AI-detected change regions highlighted
          </p>

          {data.overlay_image ? (
            <div>
              <div style={{ position: 'relative' }}>
                <img
                  src={data.overlay_image}
                  alt="Deforestation overlay"
                  style={{
                    width: '100%',
                    height: '330px',
                    objectFit: 'cover',
                    borderRadius: '10px',
                    border: '2px solid #fca5a5',
                    display: 'block'
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '8px',
                  right: '8px',
                  background: 'rgba(220,38,38,0.82)',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  backdropFilter: 'blur(4px)',
                  textAlign: 'center'
                }}>
                  🔴 Red areas = detected deforestation
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              height: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fef2f2',
              borderRadius: '10px',
              color: '#4a6358',
              fontSize: '13px'
            }}>
              No overlay available
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ResultsPanel;

// feat(dashboard): display deforestation percentage in ResultsPanel

// feat(dashboard): render deforestation mask overlay

// feat(dashboard): add before/after image comparison slider

// feat(dashboard): add PDF export via jsPDF

// fix(dashboard): handle missing mask gracefully

// fix(dashboard): correct tooltip positioning

// show deforestation percent
