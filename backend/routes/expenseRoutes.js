const express=require('express');
const Expense=require('../models/expense');
const Budget=require('../models/budget');
const auth=require('../authMiddleare');

const router=express.Router();

router.post('/',auth,async(req,res)=>{
    const{title,amount,category,date,budgetId} =req.body;
    if(!title || !amount || !category || !date || !budgetId){
        return res.status(400).json({message:"All feilds are req."});
    }
    try {
        const expense=new Expense({
            title,
            amount,
            category,
            budget:budgetId,
            user: req.user._id,
        });
        await expense.save();

        //update Budget

        const budget=await Budget.findById(budgetId);

        if(!budget){
            return res.status(404).json({message:'Budget not found'});
        }
        budget.spent +=amount;
        await budget.save();

        res.status(201).json({expense,updatedBudget:budget});

    } catch (error) {
        res.status(500).json({message:"Error creatign expenses",error:error.message});
    }
})

//get expense

router.get('/',auth,async(req,res)=>{
      try {
        const expenses=await Expense.find({user:req.user._id}).sort({date:-1});
        res.json(expenses);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching expenses', error: error.message });
      }
})

//delete expsne and subract from budget


router.delete('/:id',auth,async(req,res)=>{
    try {
        const expense=await Expense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if(!expense) return res.status(404).json({message:'expense not found'});

        const budget=await Budget.findById(expense.budget);
        if(budget){
            budget.spent-=expense.amount;
            await budget.save();
        }
        res.json({message:"Expense delted",updatedBudget:budget});
    } catch (error) {
        res.status(500).json({ message: 'Error deleting expense', error: error.message });
    }
})

module.exports=router;