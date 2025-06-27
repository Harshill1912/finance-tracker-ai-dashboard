const mongoose=require('mongoose');
const Budget = require('./budget');

const expenseSchema=new mongoose.Schema({
    user:{type:mongoose.Schema.Types.ObjectId,ref:'user',require:true},
    Budget:{type:mongoose.Schema.Types.ObjectId, ref:"Budget" ,require:true},
    title:{type:String,require:true},
    amount:{type:Number,require:true},
    category:{type:String,require:true},
    date:{type:Date,require:true},

},{timestamps:true});


module.exports=mongoose.model('Expense',expenseSchema);