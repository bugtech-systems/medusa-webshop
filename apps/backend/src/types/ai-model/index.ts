// /types/ai-model.ts
export interface AdminAiModel {
  id: string
  name: string
  model_name?: string
  base_model?: string
  handle?: string
  status?: string
  system?: string
  provider: string
  model_type: string
  description?: string
  config: Record<string, any>
  version: string
  created_at: string
  updated_at: string
  metadata?: Record<string, any>
  deployed_environments?: string[]
}

export interface AdminAiModelResponse {
  ai_model: AdminAiModel
}

export interface AdminAiModelListResponse {
  ai_models: AdminAiModel[]
  count: number
  offset: number
  limit: number
}

export interface AdminCreateAiModel {
  name: string
  provider: string
  model_type: string
  description?: string
  config: Record<string, any>
  metadata?: Record<string, any>
}

export interface AdminUpdateAiModel {
  name?: string
  description?: string
  config?: Record<string, any>
  status?: 'draft' | 'active' | 'inactive' | 'error'
  metadata?: Record<string, any>
}