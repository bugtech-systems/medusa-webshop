// src/admin/components/editor/monaco-wrapper.tsx
import React, { Suspense, lazy } from 'react'
import { Loader } from "@medusajs/icons"

// Simple Monaco environment setup
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.MonacoEnvironment = {
    getWorkerUrl: function (_moduleId: string, label: string) {
      // Using CDN approach for simplicity
      const getWorker = (label: string) => {
        const base = 'https://unpkg.com/monaco-editor@latest/min/vs'
        const workers: Record<string, string> = {
          editor: `${base}/editor/editor.worker.js`,
          json: `${base}/language/json/json.worker.js`,
          css: `${base}/language/css/css.worker.js`,
          html: `${base}/language/html/html.worker.js`,
          typescript: `${base}/language/typescript/ts.worker.js`,
          javascript: `${base}/language/typescript/ts.worker.js`
        }
        return workers[label] || workers.editor
      }
      
      return getWorker(label)
    }
  }
}

// Lazy load Monaco Editor using React.lazy
const MonacoEditorComponent = lazy(() => 
  import('@monaco-editor/react').then(mod => {
    // Configure Monaco loader to use CDN
    if (typeof window !== 'undefined') {
      // @ts-ignore
      const loader = window.require || window.monacoLoader
      if (loader) {
        loader.config({ 
          paths: { 
            vs: 'https://unpkg.com/monaco-editor@latest/min/vs' 
          } 
        })
      }
    }
    return { default: mod.default }
  })
)

// Wrapper component with Suspense
export const MonacoEditor = (props: any) => {
  return (
    <Suspense fallback={
      <div className="h-full w-full flex items-center justify-center bg-ui-bg-subtle rounded">
        <Loader className="text-ui-fg-subtle animate-spin" />
      </div>
    }>
      <MonacoEditorComponent {...props} />
    </Suspense>
  )
}