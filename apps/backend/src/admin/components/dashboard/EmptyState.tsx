import React from "react"
import { Container, Heading, Text as UiText, Button } from "@medusajs/ui"
import { Plus, SquaresPlus } from "@medusajs/icons"

interface EmptyStateProps {
  onCreateTab: () => void
  title?: string
  description?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onCreateTab,
  title = "No Dashboard Configured",
  description = "Create your first dashboard tab to get started with customizable widgets and layouts.",
}) => {
  return (
    <Container>
      <div className="text-center py-16 max-w-md mx-auto">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="bg-ui-bg-base-hover rounded-full p-4">
            <SquaresPlus className="w-12 h-12 text-ui-fg-subtle" />
          </div>
        </div>

        {/* Title */}
        <Heading level="h1" className="mb-3 text-2xl">
          {title}
        </Heading>

        {/* Description */}
        <UiText className="text-ui-fg-subtle mb-8">
          {description}
        </UiText>

        {/* Action Button */}
        <Button variant="primary" onClick={onCreateTab} size="large">
          <Plus className="w-5 h-5" />
          Create Your First Tab
        </Button>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-ui-border-base">
          <UiText size="small" className="text-ui-fg-muted">
            Create tabs to organize your widgets and track important metrics
          </UiText>
        </div>
      </div>
    </Container>
  )
}

// Alternative: Multiple Empty States
export const EmptyTabState: React.FC<{ onAddWidget: () => void }> = ({ onAddWidget }) => {
  return (
    <div className="text-center py-12 border-2 border-dashed border-ui-border-base rounded-lg">
      <SquaresPlus className="w-12 h-12 text-ui-fg-subtle mx-auto mb-4" />
      <Heading level="h2" className="text-lg mb-2">
        This tab is empty
      </Heading>
      <UiText className="text-ui-fg-subtle mb-6">
        Add widgets to start building your dashboard
      </UiText>
      <Button variant="secondary" onClick={onAddWidget}>
        <Plus className="w-4 h-4" />
        Add Widget
      </Button>
    </div>
  )
}

export const NoSearchResults: React.FC<{ onClear: () => void }> = ({ onClear }) => {
  return (
    <div className="text-center py-12">
      <div className="bg-ui-bg-base-hover rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
        <span className="text-2xl">🔍</span>
      </div>
      <Heading level="h2" className="text-lg mb-2">
        No results found
      </Heading>
      <UiText className="text-ui-fg-subtle mb-6">
        Try adjusting your search or filters
      </UiText>
      <Button variant="secondary" onClick={onClear}>
        Clear Filters
      </Button>
    </div>
  )
}