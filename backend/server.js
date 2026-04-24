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

app.get('/api/test', (req, res) => {
    res.json({ message: "✅ Backend is Working" });
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

// Start server first, then connect to MongoDB
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ API available at http://localhost:${PORT}/api`);
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/finance';
    mongoose.connect(mongoUri, mongoOptions)
        .then(async () => {
            isMongoConnected = true;
            console.log("✅ MongoDB connected");
            
            // Create database indexes for better performance
            try {
                const createIndexes = require('./models/indexes');
                await createIndexes();
            } catch (indexError) {
                console.log("⚠️  Index creation skipped:", indexError.message);
            }
        })
        .catch(err => {
            isMongoConnected = false;
            console.log("❌ MongoDB connection error:", err.message);
            console.log("⚠️  Server running without database connection");
            console.log("⚠️  Note: Database features will not work until MongoDB is connected");
        });
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
