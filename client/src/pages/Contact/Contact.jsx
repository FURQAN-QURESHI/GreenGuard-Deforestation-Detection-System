import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../api';
import {
  Mail, Send, AlertTriangle,
  CheckCircle, Loader, FileText,
  TreePine, Leaf, Phone
} from 'lucide-react';

const Contact = () => {
  const location = useLocation();
  const prefill = location.state || {};

  const [form, setForm] = useState({
    name: prefill.name || '',
    email: prefill.email || '',
    subject: prefill.subject ||
      (prefill.isShare
        ? `Sharing Report: ${prefill.areaName}`
        : ''),
    message: prefill.message ||
      (prefill.isShare && prefill.stats
        ? `I would like to share this analysis report.\n\nArea: ${prefill.areaName}\nStats: ${prefill.stats}\n\nPlease find the PDF report attached.`
        : '')
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() ||
      !form.subject.trim() || !form.message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/contact', form);
      setSuccess(true);
    } catch (err) {
      setError(
        err.response?.data?.msg ||
        'Failed to send. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1.5px solid #b7e4c7',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#1b2d27',
    background: 'white',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.2s ease'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#2d6a4f',
    marginBottom: '6px'
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f0faf4'
    }}>
      <Sidebar />

      <main style={{
        flex: 1,
        marginLeft: '280px',
        padding: '32px',
        overflowY: 'auto'
      }}>

        {/* Page Header - same style as History */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '6px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Mail size={22} color="#74c69d" />
            </div>
            <div>
              <h1 style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '26px',
                fontWeight: 700,
                color: '#1a3c2e',
                margin: 0
              }}>
                Contact Authorities
              </h1>
              <p style={{
                fontSize: '13px',
                color: '#4a6358',
                margin: '2px 0 0 0'
              }}>
                Report deforestation or reach out to
                forest conservation authorities
              </p>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '24px',
          alignItems: 'start'
        }}>

          {/* LEFT: Form card */}
          <div style={{
            background: 'white',
            borderRadius: '20px',
            border: '1px solid #b7e4c7',
            padding: '32px',
            boxShadow: '0 2px 16px rgba(45,106,79,0.08)'
          }}>
            {success ? (
              /* Success State */
              <div style={{
                textAlign: 'center',
                padding: '40px 20px'
              }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #d8f3dc, #b7e4c7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <CheckCircle size={36} color="#2d6a4f" />
                </div>
                <h2 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#1a3c2e',
                  margin: '0 0 10px 0'
                }}>
                  Message Sent Successfully
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: '#4a6358',
                  lineHeight: 1.7,
                  margin: '0 0 28px 0',
                  maxWidth: '360px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  Your message has been forwarded to
                  the relevant forest authorities.
                  We will respond within 2-3 business days.
                </p>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setForm({
                      name: '', email: '',
                      subject: '', message: ''
                    });
                  }}
                  style={{
                    padding: '12px 28px',
                    background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(45,106,79,0.3)'
                  }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              /* Form */
              <>
                <h2 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#1a3c2e',
                  margin: '0 0 24px 0'
                }}>
                  Send a Message
                </h2>

                <form onSubmit={handleSubmit}>
                  {/* Name + Email row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Your full name"
                        style={inputStyle}
                        onFocus={e => {
                          e.target.style.borderColor = '#40916c';
                          e.target.style.boxShadow = '0 0 0 3px rgba(64,145,108,0.12)';
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = '#b7e4c7';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email Address</label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        style={inputStyle}
                        onFocus={e => {
                          e.target.style.borderColor = '#40916c';
                          e.target.style.boxShadow = '0 0 0 3px rgba(64,145,108,0.12)';
                        }}
                        onBlur={e => {
                          e.target.style.borderColor = '#b7e4c7';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Subject</label>
                    <input
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      placeholder="What is this about?"
                      style={inputStyle}
                      onFocus={e => {
                        e.target.style.borderColor = '#40916c';
                        e.target.style.boxShadow = '0 0 0 3px rgba(64,145,108,0.12)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#b7e4c7';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Message</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      placeholder="Describe the issue in detail. Include location, date observed, and any other relevant information..."
                      rows={6}
                      style={{
                        ...inputStyle,
                        resize: 'vertical',
                        minHeight: '130px',
                        lineHeight: 1.6
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = '#40916c';
                        e.target.style.boxShadow = '0 0 0 3px rgba(64,145,108,0.12)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = '#b7e4c7';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  {/* PDF Attachment notice */}
                  {prefill.pdfBlobUrl && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      background: '#f0faf4',
                      border: '1.5px solid #b7e4c7',
                      borderRadius: '12px',
                      marginBottom: '16px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <FileText size={20} color="#dc2626" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1a3c2e',
                          margin: '0 0 2px 0'
                        }}>
                          {prefill.pdfFilename || 'report.pdf'}
                        </p>
                        <p style={{
                          fontSize: '11px',
                          color: '#4a6358',
                          margin: 0
                        }}>
                          PDF report attached to this message
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <a
                          href={prefill.pdfBlobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '12px',
                            color: '#40916c',
                            fontWeight: 600,
                            textDecoration: 'none',
                            padding: '6px 14px',
                            border: '1.5px solid #b7e4c7',
                            borderRadius: '8px',
                            background: 'white',
                            whiteSpace: 'nowrap',
                            display: 'inline-block'
                          }}
                        >
                          Preview
                        </a>
                        <a
                          href={prefill.pdfBlobUrl}
                          download={prefill.pdfFilename}
                          style={{
                            fontSize: '12px',
                            color: '#2d6a4f',
                            fontWeight: 600,
                            textDecoration: 'none',
                            padding: '6px 14px',
                            border: '1.5px solid #b7e4c7',
                            borderRadius: '8px',
                            background: 'white',
                            whiteSpace: 'nowrap',
                            display: 'inline-block'
                          }}
                        >
                          Download PDF
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {error && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '10px',
                      marginBottom: '16px'
                    }}>
                      <AlertTriangle size={16} color="#dc2626" />
                      <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: loading
                        ? '#40916c'
                        : 'linear-gradient(135deg, #2d6a4f, #40916c)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: loading
                        ? 'none'
                        : '0 4px 14px rgba(45,106,79,0.3)',
                      transition: 'all 0.2s ease',
                      fontFamily: 'Inter, sans-serif'
                    }}
                    onMouseEnter={e => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(45,106,79,0.4)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(45,106,79,0.3)';
                    }}
                  >
                    {loading ? (
                      <>
                        <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* RIGHT: Info cards column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Why contact card */}
            <div style={{
              background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #40916c'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px'
              }}>
                <Leaf size={20} color="#74c69d" />
                <h3 style={{
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'white',
                  margin: 0
                }}>
                  Why Contact Us?
                </h3>
              </div>
              <p style={{
                fontSize: '12px',
                color: '#a8d5ba',
                margin: 0,
                lineHeight: 1.7
              }}>
                GreenGuard connects citizens, researchers,
                and NGOs directly with forest authorities
                to protect Pakistan's forests in real time.
              </p>
            </div>

            {/* Info items */}
            {[
              {
                icon: AlertTriangle,
                color: '#dc2626',
                bg: '#fef2f2',
                border: '#fecaca',
                title: 'Report Illegal Activity',
                desc: 'Alert authorities about illegal logging or encroachment in protected areas.'
              },
              {
                icon: TreePine,
                color: '#2d6a4f',
                bg: '#f0faf4',
                border: '#b7e4c7',
                title: 'Request Data Access',
                desc: 'Get deforestation data for research, policy, or conservation planning.'
              },
              {
                icon: Mail,
                color: '#1d4ed8',
                bg: '#eff6ff',
                border: '#bfdbfe',
                title: 'Partner With Us',
                desc: 'Collaborate on forest conservation, funding, or technology initiatives.'
              },
              {
                icon: Phone,
                color: '#7c3aed',
                bg: '#f5f3ff',
                border: '#ddd6fe',
                title: 'Policy Support',
                desc: 'Request official reports for government policy and legal proceedings.'
              }
            ].map((item, i) => (
              <div key={i} style={{
                background: 'white',
                borderRadius: '14px',
                border: '1px solid #b7e4c7',
                padding: '16px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                boxShadow: '0 1px 6px rgba(45,106,79,0.06)',
                transition: 'all 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(45,106,79,0.12)';
                e.currentTarget.style.borderColor = '#74c69d';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 1px 6px rgba(45,106,79,0.06)';
                e.currentTarget.style.borderColor = '#b7e4c7';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: item.bg,
                  border: `1px solid ${item.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <item.icon size={18} color={item.color} />
                </div>
                <div>
                  <p style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1a3c2e',
                    margin: '0 0 4px 0'
                  }}>
                    {item.title}
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: '#4a6358',
                    margin: 0,
                    lineHeight: 1.5
                  }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}

            {/* Confidentiality note */}
            <div style={{
              background: '#f0faf4',
              borderRadius: '12px',
              border: '1px solid #b7e4c7',
              padding: '14px 16px',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start'
            }}>
              <CheckCircle
                size={16}
                color="#2d6a4f"
                style={{ flexShrink: 0, marginTop: '1px' }}
              />
              <p style={{
                fontSize: '11px',
                color: '#4a6358',
                margin: 0,
                lineHeight: 1.6
              }}>
                All reports are confidential and forwarded
                directly to Pakistan's forest conservation
                authorities and relevant agencies.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Contact;

// feat(contact): redesign with split-screen layout

// feat(contact): success/failure feedback with animation

// feat(contact): finalize Contact page

// fix(contact): correct form reset after submission

// redesign split-screen

// success/failure feedback animation

// finalize Contact page
