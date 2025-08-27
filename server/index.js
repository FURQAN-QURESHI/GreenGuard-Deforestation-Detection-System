const dns = require('dns');
// Set Google & Cloudflare DNS to bypass local router issues
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// Database Connection
// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/greenguard')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/community', require('./routes/community'));
app.use('/api/news', require('./routes/news'));
app.use('/api/contact', require('./routes/contact'));

app.get('/', (req, res) => {
    res.send('GreenGuard API is running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
