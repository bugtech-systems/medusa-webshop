// context/CartContext.tsx
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { sdk } from '../client'


interface CartContextType {
  cart: any
  addToCart: (variantId: string, quantity: number) => Promise<void>
  updateCart: (lineId: string, quantity: number) => Promise<void>
  removeFromCart: (lineId: string) => Promise<void>
  isLoading: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getOrCreateCart()
  }, [])

  const getOrCreateCart = async () => {
    try {
      let cartId = localStorage.getItem('cart_id')
      if (cartId) {
        const { cart: existingCart } = await sdk.carts.retrieve(cartId)
        setCart(existingCart)
      } else {
        const { cart: newCart } = await sdk.carts.create()
        setCart(newCart)
        localStorage.setItem('cart_id', newCart.id)
      }
    } catch (error) {
      console.error('Error with cart:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addToCart = async (variantId: string, quantity: number) => {
    if (!cart) return
    try {
      const { cart: updatedCart } = await sdk.carts.lineItems.create(cart.id, {
        variant_id: variantId,
        quantity,
      })
      setCart(updatedCart)
    } catch (error) {
      throw error
    }
  }

  const updateCart = async (lineId: string, quantity: number) => {
    if (!cart) return
    try {
      const { cart: updatedCart } = await sdk.carts.lineItems.update(cart.id, lineId, {
        quantity,
      })
      setCart(updatedCart)
    } catch (error) {
      throw error
    }
  }

  const removeFromCart = async (lineId: string) => {
    if (!cart) return
    try {
      const { cart: updatedCart } = await sdk.carts.lineItems.delete(cart.id, lineId)
      setCart(updatedCart)
    } catch (error) {
      throw error
    }
  }

  return (
    <CartContext.Provider value={{ cart, addToCart, updateCart, removeFromCart, isLoading }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}