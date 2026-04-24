const mongoose=require('mongoose');
const Budget = require('./budget');

const expenseSchema=new mongoose.Schema({
    user:{type:mongoose.Schema.Types.ObjectId,ref:'user',require:true},
    Budget:{type:mongoose.Schema.Types.ObjectId, ref:"Budget" ,require:true},
    title:{type:String,require:true},
    amount:{type:Number,require:true},
    category:{type:String,require:true},
    date:{type:Date,require:true},
    description:{type:String,default:''},
    paymentMethod:{type:String,enum:['UPI','Card','Cash','Online','Other'],default:'Other'},
    merchant:{type:String,default:''},
    isAnomaly:{type:Boolean,default:false},
    anomalyReason:{type:String,default:''},
},{timestamps:true});


module.exports=mongoose.model('Expense',expenseSchema);