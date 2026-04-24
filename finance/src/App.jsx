import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { Routes, Route } from "react-router-dom";
import Home from './pages/Home'
import Dashboard from './pages/dashboard';
import Reports from './pages/ReportsNew';
import Ai from './pages/ai';
import AIChatbotNew from './pages/AIChatbotNew';
import Budgets from './pages/BudgetsNew';
import BudgetRedesigned from './pages/BudgetRedesigned';
import Login from './pages/login';
import Signup from './pages/signUp';
import Profile from './pages/profile';
import SplitExpenseForm from './pages/splitexpenses';
import Saving from './pages/saving';
import Goals from './pages/goals';
import Expenses from './pages/ExpensesNew';
import Investments from './pages/investments';
import InvitationPage from './pages/invitation';
import PaymentDetails from './pages/PaymentDetails';
import Settings from './pages/Settings';
import ExpenseDetail from './pages/ExpenseDetail';
import PaymentLink from './pages/PaymentLink';

function App() {
  return (
    <Routes>
      <Route path='/' element={<Home/>}/>
      <Route path='/dashboard' element={<Dashboard/>}/>
      <Route path='/report' element={<Reports/>}/>
      <Route path='/ai' element={<AIChatbotNew/>}/>
      <Route path='/ai-old' element={<Ai/>}/>
      <Route path='/budgets' element={<BudgetRedesigned/>}/>
      <Route path='/budgets-old' element={<Budgets/>}/>
      <Route path='/login' element={<Login/>}/>
      <Route path='/signup' element={<Signup/>}/>
      <Route path='/profile' element={<Profile/>}/>
      <Route path='/settings' element={<Settings/>}/>
      <Route path='/payment-details' element={<PaymentDetails/>}/>
      <Route path='/split' element={<SplitExpenseForm/>}/>
      <Route path='/splitexpenses' element={<SplitExpenseForm/>}/>
      <Route path='/invitation' element={<InvitationPage/>}/>
      <Route path='/saving' element={<Saving/>}/>
      <Route path='/investments' element={<Investments/>}/>
      <Route path='/goals' element={<Goals/>}/>
      <Route path='/transactions' element={<Expenses/>}/>
      <Route path='/expenses' element={<Expenses/>}/>
      <Route path='/expenses/:id' element={<ExpenseDetail/>}/>
      <Route path='/pay/:token' element={<PaymentLink/>}/>
    </Routes>
  )
}

export default App
