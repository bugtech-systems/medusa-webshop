import React from "react"
import { Container, Heading } from "@medusajs/ui"

export const LoadingState: React.FC = () => {
  return (
    <Container>
      <div className="text-center py-12">
        <div className="animate-pulse">
          {/* Header Skeleton */}
          <div className="flex justify-center mb-8">
            <div className="h-8 bg-ui-bg-base-hover rounded w-48"></div>
          </div>
          
          {/* Tabs Skeleton */}
          <div className="flex justify-center gap-4 mb-8">
            <div className="h-10 bg-ui-bg-base-hover rounded w-24"></div>
            <div className="h-10 bg-ui-bg-base-hover rounded w-24"></div>
            <div className="h-10 bg-ui-bg-base-hover rounded w-24"></div>
          </div>
          
          {/* Grid Skeleton */}
          <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="space-y-3">
                <div className="h-32 bg-ui-bg-base-hover rounded-lg"></div>
                <div className="h-4 bg-ui-bg-base-hover rounded w-3/4 mx-auto"></div>
              </div>
            ))}
          </div>
          
          {/* Loading Text */}
          <div className="mt-8">
            <div className="h-4 bg-ui-bg-base-hover rounded w-40 mx-auto"></div>
          </div>
        </div>
      </div>
    </Container>
  )
}

// Alternative: Skeleton Grid Component
export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-ui-border-base pb-4">
        <div className="h-8 bg-ui-bg-base-hover rounded w-64 animate-pulse"></div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 animate-pulse">
        <div className="h-10 bg-ui-bg-base-hover rounded w-24"></div>
        <div className="h-10 bg-ui-bg-base-hover rounded w-24"></div>
        <div className="h-10 bg-ui-bg-base-hover rounded w-24"></div>
      </div>
      
      {/* Grid */}
      <div className="grid grid-cols-3 gap-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-ui-bg-base-hover rounded-lg h-48"></div>
        ))}
      </div>
    </div>
  )
}