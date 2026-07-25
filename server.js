import express from 'express';
import cookieParser from 'cookie-parser';
import { MongoClient } from 'mongodb';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import dns from 'node:dns';

// Force DNS resolution to prefer IPv4 (Atlas doesn't support IPv6 by default, causing SSL Alert 80 errors in serverless environments)
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/erasify";

const app = express();
app.use(express.json());
app.use(cookieParser());

// Add headers for SharedArrayBuffer / WASM multi-threading
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Database connection
let db = null;
const client = new MongoClient(MONGODB_URI);
let connectPromise = null;

async function connectDB() {
    if (db) return db;
    if (!connectPromise) {
        connectPromise = (async () => {
            await client.connect();
            const database = client.db('erasify');
            console.log('Connected to MongoDB Atlas');
            try {
                await database.collection('users').createIndex({ email: 1 }, { unique: true });
            } catch (err) {
                console.error('Index creation failed:', err);
            }
            db = database;
            return db;
        })();
    }
    return connectPromise;
}

// Start connection in background
connectDB().catch(err => console.error('Initial DB connection failed:', err));

// Middleware to ensure DB connection before handling API requests
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        try {
            await connectDB();
            if (!db) {
                return res.status(500).json({ error: 'Database connection not established' });
            }
        } catch (err) {
            return res.status(500).json({ error: `Database connection failed: ${err.message}` });
        }
    }
    next();
});

// Helper to check user session
async function getCurrentUser(req) {
    const email = req.cookies?.session_email;
    if (!email || !db) return null;
    return await db.collection('users').findOne({ email });
}

// API Endpoints
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        // Check if user exists
        const existing = await db.collection('users').findOne({ email });
        if (existing) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create new user (default Free tier: 1 image, 0 videos)
        const newUser = {
            name,
            email,
            password, // In a real production system, bcrypt would hash this. Kept simple for demo.
            plan: 'free',
            imagesLimit: 1,
            videosLimit: 0,
            imagesUsed: 0,
            videosUsed: 0,
            createdAt: new Date()
        };

        await db.collection('users').insertOne(newUser);
        
        // Set session cookie
        res.cookie('session_email', email, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
        res.json({ success: true, user: { name, email, plan: 'free' } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    try {
        const user = await db.collection('users').findOne({ email, password });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.cookie('session_email', email, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
        res.json({ success: true, user: { name: user.name, email: user.email, plan: user.plan } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('session_email');
    res.json({ success: true });
});

app.get('/api/user/profile', async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({
        name: user.name,
        email: user.email,
        plan: user.plan,
        imagesUsed: user.imagesUsed,
        videosUsed: user.videosUsed,
        imagesLimit: user.imagesLimit,
        videosLimit: user.videosLimit
    });
});

app.post('/api/user/consume', async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { type } = req.body;
    if (type !== 'image' && type !== 'video') {
        return res.status(400).json({ error: 'Invalid type' });
    }

    try {
        if (type === 'image') {
            if (user.imagesLimit !== -1 && user.imagesUsed >= user.imagesLimit) {
                return res.status(403).json({ error: 'Quota consumed. Please upgrade your plan!' });
            }
            await db.collection('users').updateOne({ email: user.email }, { $inc: { imagesUsed: 1 } });
            return res.json({ success: true, imagesUsed: user.imagesUsed + 1 });
        } else {
            if (user.videosLimit !== -1 && user.videosUsed >= user.videosLimit) {
                return res.status(403).json({ error: 'Quota consumed. Please upgrade your plan!' });
            }
            await db.collection('users').updateOne({ email: user.email }, { $inc: { videosUsed: 1 } });
            return res.json({ success: true, videosUsed: user.videosUsed + 1 });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/user/upgrade', async (req, res) => {
    const user = await getCurrentUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const { plan } = req.body;
    let imagesLimit = 0;
    let videosLimit = 0;

    if (plan === 'basic') {
        imagesLimit = 999999; // Represents unlimited images
        videosLimit = 0;      // 0 videos
    } else if (plan === 'daily') {
        imagesLimit = 15;     // 15 images/day
        videosLimit = 3;      // 3 videos/day
    } else if (plan === 'unlimited') {
        imagesLimit = 999999; // Unlimited images
        videosLimit = 100;    // 100 videos
    } else {
        return res.status(400).json({ error: 'Invalid plan selected' });
    }

    try {
        await db.collection('users').updateOne(
            { email: user.email },
            { 
                $set: { 
                    plan, 
                    imagesLimit, 
                    videosLimit,
                    imagesUsed: 0, 
                    videosUsed: 0 
                } 
            }
        );
        res.json({ success: true, plan, imagesLimit, videosLimit });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Serve built static files
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA routing
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
