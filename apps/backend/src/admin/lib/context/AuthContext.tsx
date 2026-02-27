// context/AuthContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { sdk } from '../client'


interface AuthContextType {
  customer: any
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, first_name: string, last_name: string) => Promise<void>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { customer } = await sdk.auth.getSession()
      setCustomer(customer)
    } catch (error) {
      console.error('Not authenticated')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const { customer } = await sdk.auth.authenticate({
        email,
        password,
      })
      setCustomer(customer)
    } catch (error) {
      throw error
    }
  }

  const register = async (email: string, password: string, first_name: string, last_name: string) => {
    try {
      const { customer } = await sdk.customers.create({
        email,
        password,
        first_name,
        last_name,
      })
      setCustomer(customer)
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await sdk.auth.deleteSession()
      setCustomer(null)
    } catch (error) {
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ customer, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}