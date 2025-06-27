import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from './pages/Home'
import Dashboard from './pages/dashboard';
import Reports from './pages/reports';
import Ai from './pages/ai';
import Budgets from './pages/budgets';
import Login from './pages/login';
import Signup from './pages/signUp';
import Profile from './pages/profile';
import SplitExpenseForm from './pages/splitexpenses';
import Saving from './pages/saving';
function App() {
  
  return (
    <>
    <Routes>
      <Route path='/' element={<Home/>}/>
      <Route path='/dashboard' element={<Dashboard/>}/>
      <Route path='/report' element={<Reports/>}/>
      <Route path='/ai' element={<Ai/>}/>
      <Route path='/budgets' element={<Budgets/>}/>
      <Route path='/login' element={<Login/>}/>
      <Route path='/signup' element={<Signup/>}/>
      <Route  path='/profile' element={<Profile/>}/>
      <Route path='/split' element={<SplitExpenseForm/>}/>
      <Route path='/saving' element={<Saving/>}/>
    </Routes>
  
    </>
  )
}

export default App
