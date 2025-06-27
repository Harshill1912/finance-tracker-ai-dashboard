const express=require('express')
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); 

const budgetRoutes = require('./routes/budgetRoutes');
const authRoutes=require('./routes/authRoutes');
const protectedRoutes=require('./routes/protectedRoutes')
const expenseRoutes=require('./routes/expenseRoutes')
const splitExpenseRoutes = require('./routes/split');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// Routes
app.use('/api/budget', budgetRoutes);
app.use('/api/auth',authRoutes);
app.use('/api/expenses',expenseRoutes)
app.use('/api/splits', splitExpenseRoutes);
app.use('/api', protectedRoutes);

app.get('/api/test', (req, res) => {
    res.json({ message: "✅ Backend is Working" });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
    })
    .catch(err => console.log("❌ MongoDB connection error:", err));
