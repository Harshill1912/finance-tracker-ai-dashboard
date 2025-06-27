import React from 'react'

function BalanceSummary() {
  const balances={
    Harshil:500,
    XYZ:-250,
    ABC:-250,
}
  return (
    <div className='bg-white shadow rounded-lg p-4'>
      <h2 className='text-xl font-semibold text-gray-700 mb-4' >
        Balance Summary
      </h2>
      <ul className="space-y-2">
        {Object.entries(balances).map(([name, balance]) => (
          <li key={name}>
            {balance === 0 ? (
              <span>{name} is settled up</span>
            ) : balance > 0 ? (
              <span>{name} is owed ₹{balance}</span>
            ) : (
              <span>{name} owes ₹{Math.abs(balance)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default BalanceSummary