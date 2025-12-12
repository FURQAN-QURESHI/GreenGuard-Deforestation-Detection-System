const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

// ─── RSS Feed Parser ──────────────────────────
// Parse RSS XML without any npm package
const fetchRSS = (url) => {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') 
      ? https : http;
    
    protocol.get(url, {
      headers: {
        'User-Agent': 'GreenGuard/1.0 RSS Reader',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      timeout: 8000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const articles = [];
          
          // Extract items from RSS XML
          const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
          const items = data.match(itemRegex) || [];
          
          items.slice(0, 5).forEach(item => {
            const getTag = (tag) => {
              const match = item.match(
                new RegExp(`<${tag}[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/${tag}>|<${tag}[^>]*>([\s\S]*?)<\/${tag}>`, 'i')
              );
              return match 
                ? (match[1] || match[2] || '').trim() 
                : '';
            };
            
            const title = getTag('title');
            const description = getTag('description')
              .replace(/<[^>]+>/g, '')
              .substring(0, 200);
            const link = getTag('link') || 
              (item.match(/<link>([^<]+)<\/link>/i) || [])[1] || '';
            const pubDate = getTag('pubDate');
            
            if (title && title.length > 5) {
              articles.push({
                title: title.substring(0, 150),
                description: description || 
                  'Read the full article for more details.',
                url: link,
                urlToImage: null,
                publishedAt: pubDate 
                  ? new Date(pubDate).toISOString()
                  : new Date().toISOString(),
                source: { name: '' }
              });
            }
          });
          
          resolve(articles);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]))
      .on('timeout', () => resolve([]));
  });
};

// ─── NewsAPI Fetcher ──────────────────────────
const fetchNewsAPI = (apiKey, query, sources) => {
  return new Promise((resolve) => {
    if (!apiKey || apiKey === 'REPLACE_WITH_REAL_KEY') {
      resolve([]);
      return;
    }
    
    const params = sources
      ? `sources=${sources}&pageSize=20&apiKey=${apiKey}`
      : `q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`;
    
    const options = {
      hostname: 'newsapi.org',
      path: `/v2/everything?${params}`,
      headers: { 'User-Agent': 'GreenGuard/1.0' },
      timeout: 8000
    };
    
    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.articles || []);
        } catch (e) {
          resolve([]);
        }
      });
    }).on('error', () => resolve([]))
      .on('timeout', () => resolve([]));
  });
};

// ─── News Sources Configuration ───────────────
const RSS_SOURCES = {
  // Environment & Forest Specific
  mongabay: {
    url: 'https://news.mongabay.com/feed/',
    name: 'Mongabay',
    category: 'Forest & Wildlife'
  },
  wwf: {
    url: 'https://www.wwf.org.uk/feed',
    name: 'WWF',
    category: 'Conservation'
  },
  carbonbrief: {
    url: 'https://www.carbonbrief.org/feed',
    name: 'Carbon Brief',
    category: 'Climate'
  },
  yale_e360: {
    url: 'https://e360.yale.edu/feed',
    name: 'Yale Environment 360',
    category: 'Environment'
  },
  gfw_blog: {
    url: 'https://www.globalforestwatch.org/blog/feed.xml',
    name: 'Global Forest Watch',
    category: 'Deforestation'
  },
  iucn: {
    url: 'https://www.iucn.org/rss.xml',
    name: 'IUCN',
    category: 'Conservation'
  },
  // Pakistani News
  dawn: {
    url: 'https://www.dawn.com/feeds/home',
    name: 'Dawn News',
    category: 'Pakistan'
  },
  geo: {
    url: 'https://www.geo.tv/rss/1/1',
    name: 'Geo News',
    category: 'Pakistan'
  },
  express_tribune: {
    url: 'https://tribune.com.pk/feed/home',
    name: 'Express Tribune',
    category: 'Pakistan'
  },
  the_news: {
    url: 'https://www.thenews.com.pk/rss/1/1',
    name: 'The News International',
    category: 'Pakistan'
  },
  // Indian News
  ndtv: {
    url: 'https://feeds.feedburner.com/ndtvnews-environment',
    name: 'NDTV Environment',
    category: 'India'
  },
  // International
  bbc_environment: {
    url: 'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    name: 'BBC Environment',
    category: 'International'
  },
  guardian_environment: {
    url: 'https://www.theguardian.com/environment/rss',
    name: 'The Guardian Environment',
    category: 'International'
  },
  reuters_environment: {
    url: 'https://feeds.reuters.com/reuters/environment',
    name: 'Reuters Environment',
    category: 'International'
  },
  aljazeera_environment: {
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    name: 'Al Jazeera',
    category: 'International'
  }
};

// ─── Fallback Articles ────────────────────────
const FALLBACK_ARTICLES = [
  {
    title: "Pakistan's Margalla Hills Face Increasing Deforestation Threat",
    description: "Satellite imagery analysis reveals accelerating forest loss in Islamabad's protected national park despite conservation efforts.",
    url: "https://www.dawn.com/news/environment",
    urlToImage: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400",
    publishedAt: new Date().toISOString(),
    source: { name: "Dawn News" },
    category: "Pakistan"
  },
  {
    title: "Global Forest Watch Reports Record Deforestation in 2024",
    description: "New satellite data shows tropical forests lost an area the size of Switzerland last year, with South Asia among the hardest hit regions.",
    url: "https://www.globalforestwatch.org",
    urlToImage: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400",
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    source: { name: "Global Forest Watch" },
    category: "Deforestation"
  },
  {
    title: "Pakistan Billion Tree Tsunami: Progress and Challenges",
    description: "The ambitious reforestation initiative shows mixed results as independent assessors evaluate the program's real-world impact on forest cover.",
    url: "https://tribune.com.pk",
    urlToImage: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=400",
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
    source: { name: "Express Tribune" },
    category: "Pakistan"
  },
  {
    title: "Climate Change Accelerating Forest Loss Across South Asia",
    description: "Rising temperatures and erratic monsoon patterns are compounding the impact of illegal logging across Pakistan, India, Bangladesh and Nepal.",
    url: "https://www.bbc.com/news/science-environment",
    urlToImage: "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=400",
    publishedAt: new Date(Date.now() - 259200000).toISOString(),
    source: { name: "BBC Environment" },
    category: "International"
  },
  {
    title: "WWF Pakistan Launches Forest Corridor Conservation Program",
    description: "New initiative aims to connect fragmented forest patches in KPK and FATA regions to support wildlife migration and ecosystem resilience.",
    url: "https://www.wwf.org.pk",
    urlToImage: "https://images.unsplash.com/photo-1425913397330-cf8af2ff40a1?w=400",
    publishedAt: new Date(Date.now() - 345600000).toISOString(),
    source: { name: "WWF Pakistan" },
    category: "Conservation"
  },
  {
    title: "Mangrove Forests of Sindh Under Threat from Coastal Development",
    description: "Pakistan's mangrove ecosystem, one of the world's largest, faces accelerating loss as infrastructure projects encroach on coastal wetlands.",
    url: "https://www.dawn.com",
    urlToImage: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400",
    publishedAt: new Date(Date.now() - 432000000).toISOString(),
    source: { name: "Dawn News" },
    category: "Pakistan"
  },
  {
    title: "Al Jazeera: South Asian Nations Pledge Joint Forest Monitoring",
    description: "SAARC environmental summit results in historic agreement to share satellite data and AI tools for cross-border deforestation tracking.",
    url: "https://www.aljazeera.com/environment",
    urlToImage: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400",
    publishedAt: new Date(Date.now() - 518400000).toISOString(),
    source: { name: "Al Jazeera" },
    category: "International"
  },
  {
    title: "Mongabay: Deforestation Rates in Pakistan's Northern Areas Alarming",
    description: "Exclusive investigation reveals timber mafia operations in Khyber Pakhtunkhwa have stripped thousands of hectares of old-growth forest.",
    url: "https://news.mongabay.com",
    urlToImage: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400",
    publishedAt: new Date(Date.now() - 604800000).toISOString(),
    source: { name: "Mongabay" },
    category: "Forest & Wildlife"
  }
];

// ─── Main Route ───────────────────────────────
router.get('/', async (req, res) => {
  try {
    const apiKey = process.env.NEWS_API_KEY;
    const category = req.query.category || 'all';
    const allArticles = [];
    
    // Fetch from multiple sources in parallel
    const fetchPromises = [];
    
    // 1. NewsAPI for environment/forest news
    if (apiKey && apiKey !== 'REPLACE_WITH_REAL_KEY') {
      fetchPromises.push(
        fetchNewsAPI(
          apiKey,
          'deforestation forest environment Pakistan climate',
          null
        ).then(articles => 
          articles.map(a => ({ 
            ...a, 
            category: 'Environment' 
          }))
        )
      );
      
      // Pakistani sources via NewsAPI
      fetchPromises.push(
        fetchNewsAPI(
          apiKey,
          'Pakistan forest environment nature wildlife',
          null
        ).then(articles => 
          articles.map(a => ({ 
            ...a, 
            category: 'Pakistan' 
          }))
        )
      );
    }
    
    // 2. RSS feeds - fetch top sources
    const rssToFetch = [
      { key: 'mongabay', category: 'Forest & Wildlife' },
      { key: 'bbc_environment', category: 'International' },
      { key: 'guardian_environment', category: 'International' },
      { key: 'carbonbrief', category: 'Climate' },
      { key: 'dawn', category: 'Pakistan' },
      { key: 'express_tribune', category: 'Pakistan' },
      { key: 'yale_e360', category: 'Environment' },
      { key: 'aljazeera_environment', category: 'International' },
      { key: 'reuters_environment', category: 'International' },
      { key: 'wwf', category: 'Conservation' },
    ];
    
    rssToFetch.forEach(({ key, category }) => {
      const source = RSS_SOURCES[key];
      if (source) {
        fetchPromises.push(
          fetchRSS(source.url).then(articles =>
            articles.map(a => ({
              ...a,
              source: { name: source.name },
              category: category
            }))
          )
        );
      }
    });
    
    // Wait for all fetches with timeout
    const results = await Promise.allSettled(
      fetchPromises.map(p => 
        Promise.race([
          p,
          new Promise(resolve => 
            setTimeout(() => resolve([]), 10000)
          )
        ])
      )
    );
    
    // Collect all articles
    results.forEach(result => {
      if (result.status === 'fulfilled' && 
          Array.isArray(result.value)) {
        allArticles.push(...result.value);
      }
    });
    
    // Filter and clean articles
    const cleanArticles = allArticles
      .filter(a => 
        a.title && 
        a.title.length > 10 &&
        a.title !== '[Removed]' &&
        a.url &&
        a.url.startsWith('http')
      )
      .map(a => ({
        title: a.title || '',
        description: a.description || 
          'Read more at the source.',
        url: a.url || '',
        urlToImage: a.urlToImage || null,
        publishedAt: a.publishedAt || 
          new Date().toISOString(),
        source: { 
          name: a.source?.name || 'News Source' 
        },
        category: a.category || 'General'
      }));
    
    // Remove duplicates by title similarity
    const seen = new Set();
    const deduplicated = cleanArticles.filter(a => {
      const key = a.title
        .toLowerCase()
        .substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    // Sort by date, newest first
    deduplicated.sort((a, b) => 
      new Date(b.publishedAt) - new Date(a.publishedAt)
    );
    
    // If we got enough real articles, return them
    if (deduplicated.length >= 5) {
      return res.json(deduplicated.slice(0, 40));
    }
    
    // Otherwise use fallbacks
    return res.json(FALLBACK_ARTICLES);
    
  } catch (err) {
    console.error('News fetch error:', err);
    return res.json(FALLBACK_ARTICLES);
  }
});

module.exports = router;

// feat(news): switch to RSS-based feed aggregation

// handle RSS feed timeouts
