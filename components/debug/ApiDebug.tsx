'use client'

import { useState, useEffect } from 'react'

export default function ApiDebug() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  const [testResult, setTestResult] = useState<string>('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginResult, setLoginResult] = useState<string>('')
  const [windowOrigin, setWindowOrigin] = useState<string>('...')
  
  useEffect(() => {
    // Only access window on client side after mount
    setWindowOrigin(window.location.origin)
  }, [])

  const testBackend = async () => {
    setTestResult('Testing...')
    try {
      // Test the root endpoint which should work
      const response = await fetch(`${backendUrl}/api/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const text = await response.text()
      setTestResult(`Status: ${response.status}, Response: ${text}`)
    } catch (error) {
      setTestResult(`Error: ${error}`)
    }
  }
  
  const testDirectLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setLoginResult('Please enter email and password')
      return
    }
    
    setLoginResult('Testing direct login...')
    try {
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      })
      
      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
      
      setLoginResult(`Status: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      setLoginResult(`Error: ${error}`)
    }
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg shadow-lg z-50 max-w-md">
      <h3 className="font-bold mb-2">API Debug Info - Updated 16:01</h3>
      <div className="space-y-1 text-sm">
        <p><span className="text-yellow-400">Backend URL:</span> {backendUrl || 'NOT SET'}</p>
        <p><span className="text-yellow-400">Window Location:</span> {windowOrigin}</p>
        <p><span className="text-yellow-400">NODE_ENV:</span> {process.env.NODE_ENV}</p>
        <p><span className="text-green-400">Code Updated:</span> 16:01 PST</p>
      </div>
      {!backendUrl && (
        <div className="mt-2 text-red-400 text-xs">
          ⚠️ NEXT_PUBLIC_BACKEND_URL is not set! Check your .env.local file.
        </div>
      )}
      {backendUrl && (
        <>
          <button 
            onClick={testBackend}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            Test Backend Connection
          </button>
          {testResult && (
            <div className="mt-2 text-xs bg-gray-800 p-2 rounded overflow-x-auto">
              {testResult}
            </div>
          )}
          
          <div className="mt-4 border-t border-gray-600 pt-3">
            <h4 className="font-bold text-sm mb-2">Test Direct Login</h4>
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-gray-700 rounded mb-2"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-gray-700 rounded mb-2"
            />
            <button 
              onClick={testDirectLogin}
              className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
            >
              Test Login API
            </button>
            {loginResult && (
              <div className="mt-2 text-xs bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {loginResult}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
} 