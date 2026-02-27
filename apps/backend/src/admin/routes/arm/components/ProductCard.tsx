// components/ProductCard.tsx
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import { useCart } from '@lib/context/CartContext'

interface ProductCardProps {
  product: any
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()
  const thumbnail = product.thumbnail || product.images?.[0]?.url
  const price = product.variants?.[0]?.prices?.find(
    (p: any) => p.currency_code === 'usd'
  )?.amount / 100 || 0

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      await addToCart(product.variants[0].id, 1)
      alert('Product added to cart!')
    } catch (error) {
      console.error('Error adding to cart:', error)
    }
  }

  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-64 w-full">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={product.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{product.title}</h3>
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
          
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-gray-900">${price.toFixed(2)}</span>
            <button
              onClick={handleAddToCart}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ShoppingCartIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}