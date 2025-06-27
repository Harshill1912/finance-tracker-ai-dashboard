
import React from 'react'

function ExpenseList() {
    const expenses=[
        {title:'Dinner' ,amount:1500,paidBy:"Harshil",sharedWith:["XYZ","ABC"]},
        {title:'CAB' , amount:1000 , paidBy:'XYZ' , sharedWith:["Harshil","ABC"]},
    ]
  return (
    <div className='bg-white shadow rounded-lg p-4 mb-6'>
        <h2 className='font-semibold text-xl text-gray-700 mb-4'>Expense History</h2>

        <ul className='space-y-3'>
            {expenses.map((exp,idx)=>(
              <li key={idx} className='bordr-b pb-2'>
                <strong>{exp.title}</strong> - ₹{exp.amount} paid by {exp.paidBy} <br />
                 <span className='text-sm text-gray-500'>
                    sharedWith:{exp.sharedWith.join(",")}
                 </span>
              </li>
            ))}
        </ul>
    </div>
  )
}

export default ExpenseList