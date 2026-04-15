const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const testRoutes = require('./routes/testRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const standardRoutes = require('./routes/standardRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const healthRoutes = require('./routes/healthRoutes');

dotenv.config();

const app = express();
app.disable('x-powered-by');

const requiredEnvVars = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_GOOGLE_BYPASS === 'true') {
    console.warn('Security warning: ALLOW_DEV_GOOGLE_BYPASS is enabled in production. Disable it immediately.');
}


app.use(fileUpload({
    createParentPath: true,
    safeFileNames: true,
    preserveExtension: true,
    abortOnLimit: true,
    useTempFiles: false,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
}));



const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests. Please try again later.' }
});

app.use('/api', apiLimiter);

const allowedOrigins = [
    process.env.CLIENT_ORIGIN,
    ...(process.env.CLIENT_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://atozeducation.study'
].filter(Boolean);

const allowedOriginPatterns = [
    /^https:\/\/a-to-z-education-[a-z0-9-]+\.vercel\.app$/i
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        if (allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    }
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Razorpay webhook signatures require the raw request body.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/standards', standardRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/health', healthRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running on port ${PORT}`));
