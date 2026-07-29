const express=require('express')
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); 

const budgetRoutes = require('./routes/budgetRoutes');
const authRoutes=require('./routes/authRoutes');
const protectedRoutes=require('./routes/protectedRoutes')
const expenseRoutes=require('./routes/expenseRoutes')
const splitExpenseRoutes = require('./routes/split');
const aiRoutes = require('./routes/aiRoutes');
const goalRoutes = require('./routes/goalRoutes');
const wrappedRoutes = require('./routes/wrappedRoutes');
const investmentRoutes = require('./routes/investmentRoutes');
const paymentDetailsRoutes = require('./routes/paymentDetails');
const paymentRoutes = require('./routes/paymentRoutes');
const simplePaymentRoutes = require('./routes/simplePaymentRoutes');
const groupRoutes = require('./routes/groupRoutes');
const splitwiseRoutes = require('./routes/splitwise');

const app = express();

// Middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://finance-tracker-ai-dashboard.vercel.app",
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, allow localhost with any port
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error("Not allowed by CORS"));
      }
    }
  },
  credentials: true,
}));

app.use(express.json());


// Routes
app.use('/api/budget', budgetRoutes);
app.use('/api/auth',authRoutes);
app.use('/api/expenses',expenseRoutes)
app.use('/api/splits', splitExpenseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/wrapped', wrappedRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/payment-details', paymentDetailsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/simple-payments', simplePaymentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/splitwise', splitwiseRoutes);
app.use('/api', protectedRoutes);

// Readiness states reported by mongoose.connection.readyState
const MONGO_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

app.get('/api/test', (req, res) => {
    // Kept for the frontend's "is a local backend running?" probe, which only
    // checks that this responds at all. Now also reports real database state so
    // a server that is up but cannot reach MongoDB is not reported as healthy.
    res.json({
        message: "✅ Backend is Working",
        database: MONGO_STATES[mongoose.connection.readyState] || 'unknown',
    });
});

// Real health check: fails when the database is unreachable, so uptime monitors
// and deploy checks catch a broken DB instead of only a dead process.
app.get('/api/health', (req, res) => {
    const state = MONGO_STATES[mongoose.connection.readyState] || 'unknown';
    const healthy = mongoose.connection.readyState === 1;
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        database: state,
        mongoUriConfigured: Boolean(process.env.MONGO_URI),
        uptimeSeconds: Math.round(process.uptime()),
    });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

// Track MongoDB connection state
let isMongoConnected = false;

// MongoDB connection options
const mongoOptions = {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000,
};

// Resolve the MongoDB URI. Falling back to localhost is only sensible for local
// development -- in a deployed environment there is no MongoDB inside the
// container, so an unset MONGO_URI silently produced a server that answered
// health checks but 503'd every database route. Make that case loud instead.
const resolveMongoUri = () => {
    if (process.env.MONGO_URI) return process.env.MONGO_URI;

    const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER);
    if (isProduction) {
        console.error("❌ FATAL: MONGO_URI is not set.");
        console.error("   This is a deployed environment, so there is no local MongoDB to fall back to.");
        console.error("   Set MONGO_URI to your MongoDB Atlas connection string and redeploy.");
        return null;
    }

    console.warn("⚠️  MONGO_URI is not set - falling back to mongodb://localhost:27017/finance");
    console.warn("   This only works if you have MongoDB running locally.");
    return 'mongodb://localhost:27017/finance';
};

// Connect with retry. The original code attempted a single connection at boot;
// if that failed (cold Atlas cluster, transient DNS) the process stayed up
// permanently broken with no further attempts.
const MAX_RETRY_DELAY_MS = 30000;

const connectToMongo = async (attempt = 1) => {
    const mongoUri = resolveMongoUri();
    if (!mongoUri) return; // Fatal misconfiguration; already logged.

    try {
        await mongoose.connect(mongoUri, mongoOptions);
        isMongoConnected = true;
        console.log("✅ MongoDB connected");

        // Create database indexes for better performance
        try {
            const createIndexes = require('./models/indexes');
            await createIndexes();
        } catch (indexError) {
            console.log("⚠️  Index creation skipped:", indexError.message);
        }
    } catch (err) {
        isMongoConnected = false;
        const delay = Math.min(1000 * 2 ** (attempt - 1), MAX_RETRY_DELAY_MS);
        console.error(`❌ MongoDB connection error (attempt ${attempt}):`, err.message);

        // Point at the usual culprits rather than making the reader guess.
        if (err.message?.includes('ENOTFOUND') || err.message?.includes('querySrv')) {
            console.error("   The cluster hostname does not resolve. It may have been deleted or the URI is wrong.");
        } else if (err.message?.includes('Authentication failed') || err.message?.includes('bad auth')) {
            console.error("   Credentials rejected. Check the username/password in MONGO_URI.");
        } else if (err.message?.includes('IP') || err.message?.includes('whitelist')) {
            console.error("   Likely blocked by the Atlas IP allowlist. Add 0.0.0.0/0 under Network Access.");
        }

        console.log(`⚠️  Retrying in ${delay / 1000}s. Database routes will return 503 until connected.`);
        setTimeout(() => connectToMongo(attempt + 1), delay);
    }
};

// Start server first, then connect to MongoDB
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ API available at http://localhost:${PORT}/api`);
    connectToMongo();
});

// Monitor MongoDB connection
mongoose.connection.on('disconnected', () => {
    isMongoConnected = false;
    console.log("⚠️  MongoDB disconnected");
});

mongoose.connection.on('connected', () => {
    isMongoConnected = true;
    console.log("✅ MongoDB reconnected");
});
