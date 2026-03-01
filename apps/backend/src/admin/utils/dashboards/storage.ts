import { DashboardTab, PendingChange } from "../../../types/dashboards"

const DASHBOARD_STORAGE_KEY = "dashboard-config"
const PENDING_CHANGES_KEY = "dashboard-pending"

export const loadDashboardFromStorage = (): DashboardTab[] | null => {
  try {
    const saved = localStorage.getItem(DASHBOARD_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error("Failed to load dashboard from localStorage:", error)
  }
  return null
}

export const saveDashboardToStorage = (tabs: DashboardTab[]): void => {
  try {
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(tabs))
  } catch (error) {
    console.error("Failed to save dashboard to localStorage:", error)
  }
}

export const loadPendingChanges = (): PendingChange[] => {
  try {
    const saved = localStorage.getItem(PENDING_CHANGES_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error("Failed to load pending changes:", error)
  }
  return []
}

export const savePendingChanges = (changes: PendingChange[]): void => {
  try {
    localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(changes))
  } catch (error) {
    console.error("Failed to save pending changes:", localStorage)
  }
}

export const clearPendingChanges = (): void => {
  localStorage.removeItem(PENDING_CHANGES_KEY)
}