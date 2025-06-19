'use client'

import { useState } from 'react'

export default function TestAuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [result, setResult] = useState('')
  
  const testLogin = async () => {
    try {
      const url = process.env.NODE_ENV === 'development' 
        ? '/backend/api/auth/login'
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`;
        
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      
      const data = await response.text()
      setResult(`Login Test:\nStatus: ${response.status}\nResponse: ${data}\n\nEmail: ${email}\nPassword length: ${password.length}`)
    } catch (error) {
      setResult(`Error: ${error}`)
    }
  }
  
  const testRegister = async () => {
    try {
      const url = process.env.NODE_ENV === 'development' 
        ? '/backend/api/auth/register'
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/register`;
        
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password: newPassword || password,
          fullname: 'Test User'
        }),
      })
      
      const data = await response.text()
      setResult(`Register Test:\nStatus: ${response.status}\nResponse: ${data}`)
    } catch (error) {
      setResult(`Error: ${error}`)
    }
  }
  
  return (
    <div className="min-h-screen bg-dark-bg p-8">
      <div className="max-w-2xl mx-auto bg-gray-800 p-6 rounded-lg">
        <h1 className="text-2xl font-bold text-white mb-6">Auth Debug Page</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-white mb-2">Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded"
              placeholder="your@email.com"
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded"
              placeholder="Your password"
            />
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={testLogin}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Test Login
            </button>
            
            <button
              onClick={testRegister}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test Register (will say if user exists)
            </button>
          </div>
          
          <div className="mt-4">
            <label className="block text-white mb-2">New Password (for re-registration):</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded"
              placeholder="New password if you want to re-register"
            />
          </div>
          
          {result && (
            <div className="mt-6 p-4 bg-gray-900 rounded">
              <pre className="text-white whitespace-pre-wrap">{result}</pre>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-yellow-900 rounded">
            <p className="text-yellow-200">
              <strong>Common issues:</strong><br/>
              • Extra spaces in email or password<br/>
              • Wrong email case (email@example.com vs Email@example.com)<br/>
              • Password was changed<br/>
              • Account was created on local backend, not production
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 