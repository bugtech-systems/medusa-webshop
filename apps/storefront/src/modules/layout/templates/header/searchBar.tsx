"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

export default function SearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState("")

  const handleSubmit = (e: any) => {
    e.preventDefault()
    router.push(`/shop?s=${query}`)
  }

  return (
    <form onSubmit={handleSubmit} className="product-search-form">
      <div className="product-search">
        <input
          type="search"
          className="product-search-field"
          placeholder="What are you looking for?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="product-search-submit">
          <span className="dashicons dashicons-search" />
        </button>
      </div>
    </form>
  )
}
