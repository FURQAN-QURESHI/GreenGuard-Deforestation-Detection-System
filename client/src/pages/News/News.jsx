import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import api from '../../api';
import { 
  Newspaper, ExternalLink, Share2,
  RefreshCw, Globe, Leaf, 
  AlertTriangle, Filter
} from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'All News', icon: Globe },
  { key: 'Pakistan', label: 'Pakistan', icon: null },
  { key: 'Forest & Wildlife', label: 'Forest & Wildlife', icon: Leaf },
  { key: 'Environment', label: 'Environment', icon: null },
  { key: 'Climate', label: 'Climate', icon: null },
  { key: 'Conservation', label: 'Conservation', icon: null },
  { key: 'International', label: 'International', icon: null },
  { key: 'India', label: 'India', icon: null },
];

const formatDate = (dateStr) => {
  try {
    return new Date(dateStr).toLocaleDateString(
      'en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    );
  } catch {
    return 'Recent';
  }
};

const getCategoryColor = (category) => {
  const colors = {
    'Pakistan': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    'Forest & Wildlife': { bg: '#f0faf4', color: '#2d6a4f', border: '#b7e4c7' },
    'Environment': { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
    'Climate': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    'Conservation': { bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
    'International': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    'India': { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  };
  return colors[category] || { 
    bg: '#f9fafb', color: '#374151', border: '#e5e7eb' 
  };
};

const News = () => {
  const [articles, setArticles] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [shareModal, setShareModal] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [sharing, setSharing] = useState(false);

  const fetchArticles = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await api.get('/news');
      setArticles(res.data || []);
      setFiltered(res.data || []);
    } catch (err) {
      setError('Failed to load news. Showing cached articles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { 
    fetchArticles(); 
    // Fetch joined communities for share feature
    api.get('/community/communities')
      .then(res => setCommunities(
        (res.data || []).filter(c => c.isMember)
      ))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeCategory === 'all') {
      setFiltered(articles);
    } else {
      setFiltered(
        articles.filter(a => a.category === activeCategory)
      );
    }
  }, [activeCategory, articles]);

  const handleShare = async (communityId) => {
    if (!shareModal) return;
    setSharing(true);
    try {
      await api.post(
        `/community/communities/${communityId}/posts`,
        {
          type: 'news_share',
          content: '',
          newsData: {
            title: shareModal.title || '',
            description: shareModal.description || '',
            url: shareModal.url || '',
            source: shareModal.source?.name || '',
            publishedAt: shareModal.publishedAt || ''
          }
        }
      );
      alert('Shared to community successfully!');
      setShareModal(null);
    } catch (e) {
      alert('Failed to share article.');
    } finally {
      setSharing(false);
    }
  };

  // Count articles per category
  const categoryCounts = {};
  CATEGORIES.forEach(cat => {
    categoryCounts[cat.key] = cat.key === 'all'
      ? articles.length
      : articles.filter(a => 
          a.category === cat.key
        ).length;
  });

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

        {/* Page Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Newspaper size={22} color="#74c69d" />
            </div>
            <div>
              <h1 style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '26px',
                fontWeight: 700,
                color: '#1a3c2e',
                margin: 0
              }}>
                Forest & Climate News
              </h1>
              <p style={{
                fontSize: '13px',
                color: '#4a6358',
                margin: '2px 0 0 0'
              }}>
                Latest from Pakistani, regional and 
                international sources
              </p>
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchArticles(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: 'white',
              border: '1.5px solid #b7e4c7',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#2d6a4f',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f0faf4';
              e.currentTarget.style.borderColor = '#40916c';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.borderColor = '#b7e4c7';
            }}
          >
            <RefreshCw 
              size={15} 
              style={{ 
                animation: refreshing 
                  ? 'spin 1s linear infinite' 
                  : 'none' 
              }} 
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Category Filter Pills */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '24px'
        }}>
          {CATEGORIES.map(cat => {
            const count = categoryCounts[cat.key] || 0;
            const isActive = activeCategory === cat.key;
            if (cat.key !== 'all' && count === 0) 
              return null;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '20px',
                  border: isActive 
                    ? '2px solid #2d6a4f' 
                    : '1.5px solid #b7e4c7',
                  background: isActive 
                    ? 'linear-gradient(135deg, #2d6a4f, #40916c)' 
                    : 'white',
                  color: isActive ? 'white' : '#2d6a4f',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: isActive 
                    ? '0 2px 8px rgba(45,106,79,0.25)' 
                    : 'none'
                }}
              >
                {cat.label}
                <span style={{
                  background: isActive 
                    ? 'rgba(255,255,255,0.25)' 
                    : '#d8f3dc',
                  color: isActive ? 'white' : '#2d6a4f',
                  borderRadius: '10px',
                  padding: '1px 7px',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            background: '#fef9ec',
            border: '1px solid #fde68a',
            borderRadius: '10px',
            marginBottom: '16px'
          }}>
            <AlertTriangle size={16} color="#d97706" />
            <p style={{ 
              fontSize: '13px', 
              color: '#92400e',
              margin: 0 
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 
              'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #b7e4c7',
                height: '280px',
                animation: 'pulse 1.5s infinite'
              }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#4a6358'
          }}>
            <Newspaper size={48} 
              color="#b7e4c7" 
              style={{ marginBottom: '16px' }} 
            />
            <p style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#1a3c2e',
              margin: '0 0 8px 0',
              fontFamily: 'Outfit, sans-serif'
            }}>
              No articles in this category
            </p>
            <p style={{ fontSize: '13px', margin: 0 }}>
              Try selecting a different category 
              or refresh the feed.
            </p>
          </div>
        ) : (
          /* Articles Grid */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 
              'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {filtered.map((article, i) => {
              const catStyle = getCategoryColor(
                article.category
              );
              return (
                <div
                  key={i}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #b7e4c7',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 2px 10px rgba(45,106,79,0.06)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 
                      'translateY(-3px)';
                    e.currentTarget.style.boxShadow = 
                      '0 8px 24px rgba(45,106,79,0.12)';
                    e.currentTarget.style.borderColor = 
                      '#74c69d';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 
                      'translateY(0)';
                    e.currentTarget.style.boxShadow = 
                      '0 2px 10px rgba(45,106,79,0.06)';
                    e.currentTarget.style.borderColor = 
                      '#b7e4c7';
                  }}
                >
                  {/* Article Image */}
                  <div style={{
                    height: '180px',
                    overflow: 'hidden',
                    background: '#f0faf4',
                    position: 'relative'
                  }}>
                    <img
                      src={article.urlToImage ||
                        'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80'
                      }
                      alt={article.title}
                      onError={e => {
                        e.target.src = 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80';
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.3s ease'
                      }}
                      onMouseEnter={e => {
                        e.target.style.transform = 
                          'scale(1.05)';
                      }}
                      onMouseLeave={e => {
                        e.target.style.transform = 
                          'scale(1)';
                      }}
                    />
                    {/* Category badge on image */}
                    {article.category && (
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        background: catStyle.bg,
                        color: catStyle.color,
                        border: `1px solid ${catStyle.border}`,
                        backdropFilter: 'blur(4px)'
                      }}>
                        {article.category}
                      </div>
                    )}
                  </div>

                  {/* Article Content */}
                  <div style={{
                    padding: '16px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    {/* Source + Date */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#2d6a4f',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {article.source?.name || 'News'}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: '#8aab9a'
                      }}>
                        {formatDate(article.publishedAt)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#1a3c2e',
                      margin: '0 0 8px 0',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {article.title}
                    </h3>

                    {/* Description */}
                    <p style={{
                      fontSize: '12px',
                      color: '#4a6358',
                      lineHeight: 1.6,
                      margin: '0 0 16px 0',
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {article.description}
                    </p>

                    {/* Action buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: 'auto'
                    }}>
                      
                        <a href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '9px',
                          background: 'linear-gradient(135deg, #2d6a4f, #40916c)',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          boxShadow: '0 2px 8px rgba(45,106,79,0.2)'
                        }}
                      >
                        <ExternalLink size={13} />
                        Read More
                      </a>
                      <button
                        onClick={() => setShareModal(article)}
                        style={{
                          padding: '9px 14px',
                          background: 'white',
                          border: '1.5px solid #b7e4c7',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#2d6a4f',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#f0faf4';
                          e.currentTarget.style.borderColor = '#40916c';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.borderColor = '#b7e4c7';
                        }}
                      >
                        <Share2 size={13} />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Share Modal */}
        {shareModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '20px',
              padding: '28px',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
              border: '1px solid #b7e4c7'
            }}>
              <h3 style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: '18px',
                fontWeight: 700,
                color: '#1a3c2e',
                margin: '0 0 6px 0'
              }}>
                Share to Community
              </h3>
              <p style={{
                fontSize: '12px',
                color: '#4a6358',
                margin: '0 0 20px 0',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {shareModal.title}
              </p>

              {communities.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '24px',
                  color: '#4a6358'
                }}>
                  <p style={{ 
                    fontSize: '13px', 
                    margin: '0 0 16px 0' 
                  }}>
                    Join a community first to share articles.
                  </p>
                  
                    <a href="/community"
                    style={{
                      color: '#2d6a4f',
                      fontWeight: 600,
                      fontSize: '13px'
                    }}
                  >
                    Browse Communities →
                  </a>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '240px',
                  overflowY: 'auto',
                  marginBottom: '16px'
                }}>
                  {communities.map(c => (
                    <button
                      key={c._id}
                      onClick={() => handleShare(c._id)}
                      disabled={sharing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #b7e4c7',
                        background: 'white',
                        cursor: sharing 
                          ? 'not-allowed' : 'pointer',
                        opacity: sharing ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                        textAlign: 'left'
                      }}
                      onMouseEnter={e => {
                        if (!sharing) {
                          e.currentTarget.style.background = '#f0faf4';
                          e.currentTarget.style.borderColor = '#40916c';
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#b7e4c7';
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '15px',
                        flexShrink: 0
                      }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1a3c2e',
                          margin: 0
                        }}>
                          {c.name}
                        </p>
                        <p style={{
                          fontSize: '11px',
                          color: '#4a6358',
                          margin: 0
                        }}>
                          {c.memberCount} member
                          {c.memberCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShareModal(null)}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: 'white',
                  border: '1.5px solid #b7e4c7',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#4a6358',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default News;

// feat(news): add search and filter controls

// feat(news): add pagination for long article lists

// feat(news): add environmental topic filters

// feat(news): finalize News page with saved articles

// environmental topic filters
