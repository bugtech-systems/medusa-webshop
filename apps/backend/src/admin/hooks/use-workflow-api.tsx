"use client"

import { useState, useCallback } from "react"

type Workflow = {
  id: string
  name: string
  nodes?: any[]
  edges?: any[]
  layout?: string
}

// Hook for fetching a single workflow (query)
export const useWorkflow = (id: string | null) => {
  const [data, setData] = useState<{ workflow: Workflow } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchWorkflow = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/admin/workflows/${id}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  // You can call fetchWorkflow manually, but we'll auto-fetch on id change via useEffect in component
  return { data, isLoading, error, refetch: fetchWorkflow }
}

// Hook for creating a workflow (mutation)
export const useCreateWorkflow = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutateAsync = useCallback(async (name: string): Promise<Workflow> => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/admin/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      const json = await res.json()
      return json.workflow
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { mutateAsync, isLoading, error }
}

// Hook for updating a workflow (mutation)
export const useUpdateWorkflow = (id: string | null) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutateAsync = useCallback(async (data: { name?: string; nodes?: any[]; edges?: any[]; layout?: string }) => {
    if (!id) throw new Error('No workflow ID')
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`/admin/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const json = await res.json()
      return json.workflow
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [id])

  return { mutateAsync, isLoading, error }
}

// Hook for fetching all workflows (query)
export const useWorkflows = () => {
  const [data, setData] = useState<{ workflows: Workflow[] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchWorkflows = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/admin/workflows')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { data, isLoading, error, refetch: fetchWorkflows }
}