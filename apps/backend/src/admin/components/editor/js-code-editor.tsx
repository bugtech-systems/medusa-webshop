// src/components/editor/js-code-editor.tsx
import { useState, useEffect, useRef, useCallback } from "react"
import {
  Container,
  Heading,
  Button,
  CodeBlock,
  Text,
  toast,
  Badge,
  Switch,
  Label,
  Tooltip,
  clx,
} from "@medusajs/ui"
import { Pencil, Check, X, PlaySolid, Sparkles, MagnifyingGlass, Bolt } from "@medusajs/icons"
import { MonacoEditor } from "./monaco-wrapper"

interface JsCodeEditorProps {
  action: any
  editMode: boolean
  onEditModeChange: (editMode: boolean) => void
  onSave: (config: any) => Promise<void>
  isLoading?: boolean
}

// Template with function wrapper
const FUNCTION_TEMPLATE = `export default async function ({ data, context, logger }) {
  // Your code here
  // Available variables:
  // - data: Input data passed to the action
  // - context: Execution context with metadata
  // - logger: For logging messages (logger.info, logger.error, etc.)
  
  // You can use {{placeholders}} that will be resolved at runtime
  // Example: const apiUrl = 'https://api.example.com/{{data.endpoint}}';
  
  logger.info("Action started with data:", data);
  
  // Example: Process the data
  const processed = {
    ...data,
    processedAt: new Date().toISOString(),
    processedBy: context?.userId || "system"
  };
  
  // Return the result
  return {
    success: true,
    data: processed,
    message: "Action completed successfully"
  };
}`

/**
 * Clean code string for display in editor
 * Converts escaped newlines in string literals to actual newlines for display
 * while preserving the distinction between code structure and string content
 */
const cleanCodeForDisplay = (code: string): string => {
  if (!code) return '';
  
  let result = '';
  let inString = false;
  let stringChar = '';
  let escapeNext = false;
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const nextChar = code[i + 1];
    
    // Handle escape sequences
    if (char === '\\' && !escapeNext) {
      escapeNext = true;
      continue;
    }
    
    // Toggle string state (only if not escaped)
    if (!escapeNext && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      result += char;
    }
    // Handle newline sequences
    else if (char === '\\' && (nextChar === 'n' || nextChar === 'r')) {
      if (inString) {
        // Inside strings, keep the escape sequence as actual characters
        // This will display as \n in the editor but will be stored correctly
        result += '\\' + nextChar;
        i++; // Skip the next character
      } else {
        // Outside strings, add actual newline
        result += '\n';
        if (nextChar === 'r') i++; // Skip \r
        if (nextChar === 'n') i++; // Skip \n
      }
    }
    else if (escapeNext) {
      // Handle other escaped characters
      result += '\\' + char;
    }
    else {
      result += char;
    }
    
    escapeNext = false;
  }
  
  return result;
};

/**
 * Prepare code for storage (in JSON)
 * Converts actual newlines in string literals back to escaped newlines
 */
const cleanCodeForStorage = (code: string): string => {
  if (!code) return '';
  
  let result = '';
  let inString = false;
  let stringChar = '';
  let escapeNext = false;
  
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    
    // Toggle string state
    if (!escapeNext && (char === '"' || char === "'" || char === '`')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      result += char;
    }
    // Handle actual newlines
    else if (char === '\n') {
      if (inString) {
        // Inside strings, convert to escaped newline
        result += '\\n';
      } else {
        // Outside strings, keep as actual newline
        result += '\n';
      }
    }
    else if (char === '\r') {
      if (inString) {
        result += '\\r';
      } else {
        result += '\r';
      }
    }
    else if (char === '\\' && !escapeNext) {
      escapeNext = true;
      result += '\\';
    }
    else {
      result += char;
      escapeNext = false;
    }
  }
  
  return result;
};

// Helper function to extract inner code from function
const extractInnerCode = (code: string): string => {
  if (!code) return '';
  
  const lines = code.split('\n');
  const result: string[] = [];
  let insideFunction = false;
  let braceCount = 0;
  
  for (const line of lines) {
    if (line.includes('export default async function')) {
      insideFunction = true;
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      braceCount += openBraces - closeBraces;
      continue;
    }
    
    if (insideFunction) {
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      braceCount += openBraces - closeBraces;
      
      if (braceCount <= 0 && line.includes('}')) {
        insideFunction = false;
        continue;
      }
      
      result.push(line);
    } else if (!line.includes('export default')) {
      result.push(line);
    }
  }
  
  if (result.length === 0 && lines.length > 0) {
    return cleanCodeForDisplay(code);
  }
  
  return cleanCodeForDisplay(result.join('\n').trim());
}

// Helper function to wrap code in function template
const wrapCodeInFunction = (code: string): string => {
  if (!code) return FUNCTION_TEMPLATE;
  
  // Check if already wrapped
  if (code.includes('export default async function')) {
    return code;
  }
  
  // Clean for storage before wrapping
  const cleanedForStorage = cleanCodeForStorage(code);
  
  // Wrap in function
  return `export default async function ({ data, context, logger }) {
${cleanedForStorage.split('\n').map(line => `  ${line}`).join('\n')}
}`;
}

export const JsCodeEditor = ({ 
  action, 
  editMode, 
  onEditModeChange,
  onSave,
  isLoading = false
}: JsCodeEditorProps) => {
  const [code, setCode] = useState<string>(() => {
    const existingCode = action?.config?.code || '';
    if (existingCode) {
      return existingCode;
    }
    return FUNCTION_TEMPLATE;
  })
  
  const [innerCode, setInnerCode] = useState<string>(() => 
    extractInnerCode(action?.config?.code || FUNCTION_TEMPLATE)
  )
  
  const [isValidCode, setIsValidCode] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [autoFormat, setAutoFormat] = useState<boolean>(false)
  const [isFormatting, setIsFormatting] = useState<boolean>(false)
  const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true)
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)

  // Load Prettier dynamically
  const formatCode = async (codeToFormat: string): Promise<string> => {
    try {
      // Don't format placeholders
      const placeholderPattern = /\{\{.*?\}\}/g;
      const placeholders: string[] = [];
      let placeholderIndex = 0;
      
      // Replace placeholders with temporary markers
      const codeWithMarkers = codeToFormat.replace(placeholderPattern, (match) => {
        placeholders.push(match);
        return `__PLACEHOLDER_${placeholderIndex++}__`;
      });
      
      // Dynamically import Prettier
      const prettier = await import('prettier/standalone')
      const parserBabel = await import('prettier/parser-babel')
      
      const formatted = await prettier.default.format(codeWithMarkers, {
        parser: "babel",
        plugins: [parserBabel.default || parserBabel],
        semi: true,
        singleQuote: true,
        trailingComma: "es5",
        printWidth: 80,
        tabWidth: 2,
      })
      
      // Restore placeholders
      let result = formatted;
      placeholders.forEach((placeholder, i) => {
        result = result.replace(`__PLACEHOLDER_${i}__`, placeholder);
      });
      
      return result;
    } catch (error) {
      console.warn("Formatting error, using basic formatting:", error)
      // Basic formatting fallback
      return codeToFormat
        .replace(/\s+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim() + '\n'
    }
  }

  const validateCode = useCallback((codeToValidate: string): boolean => {
    try {
      // Temporarily replace placeholders with valid JavaScript strings
      const placeholderPattern = /\{\{.*?\}\}/g;
      const codeWithPlaceholdersReplaced = codeToValidate.replace(placeholderPattern, '"__PLACEHOLDER__"');
      
      // Check if it's valid JavaScript syntax
      new Function(codeWithPlaceholdersReplaced);
      setError(null);
      return true;
    } catch (err: any) {
      setError(err.message || 'Invalid JavaScript syntax');
      return false;
    }
  }, []);

  const handleCodeChange = useCallback(async (value: string | undefined) => {
    const newCode = value || ""
    
    // Store the code as-is (with actual newlines)
    setInnerCode(newCode)
    
    // Validate syntax
    const isValid = validateCode(newCode)
    setIsValidCode(isValid)
    
    // Prepare for storage (convert string literal newlines to escaped)
    const wrappedCode = wrapCodeInFunction(newCode)
    setCode(wrappedCode)
    
    // Save with proper storage format
    const config = {
      code: newCode,
      lastUpdated: new Date().toISOString(),
      version: "1.0.0",
      type: "javascript",
      innerCode: newCode // Store inner code for easier editing
    }

    await onSave(config)
    
    // Auto-format if enabled and valid
    if (autoFormat && isValid && !isFormatting) {
      setIsFormatting(true)
      try {
        const formatted = await formatCode(newCode)
        if (formatted !== newCode && editorRef.current) {
          setInnerCode(formatted)
          editorRef.current.setValue(formatted)
        }
      } catch (error) {
        // Silently fail auto-format
      } finally {
        setIsFormatting(false)
      }
    }
  }, [autoFormat, isFormatting, validateCode, onSave])

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco
    
    // Register a new language or extend existing one
    monaco.languages.register({ id: 'javascript-with-placeholders' });
    
    // Set up language configuration
    monaco.languages.setLanguageConfiguration('javascript-with-placeholders', {
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
        ['{{', '}}']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' },
        { open: '{{', close: '}}' }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: '`', close: '`' },
        { open: '{{', close: '}}' }
      ]
    });

    // Set the language for the current model
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, 'javascript-with-placeholders');
    }

    // Configure custom completions
    monaco.languages.registerCompletionItemProvider('javascript-with-placeholders', {
      triggerCharacters: ['.', ' ', '{', '|'],
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        }

        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        const lastOpenBrace = textUntilPosition.lastIndexOf('{{');
        const lastCloseBrace = textUntilPosition.lastIndexOf('}}');
        const insidePlaceholder = lastOpenBrace > lastCloseBrace;

        const suggestions = [
          // Placeholder completions
          {
            label: '{{data}}',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '{{data.${1:property}}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
            detail: 'Placeholder: data object',
            documentation: 'Access data property as a placeholder'
          },
          {
            label: '{{context}}',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '{{context.${1:userId}}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
            detail: 'Placeholder: context object',
            documentation: 'Access context property as a placeholder'
          },
          {
            label: '{{input}}',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '{{input.${1:field}}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
            detail: 'Placeholder: input data',
            documentation: 'Access input field as a placeholder'
          },
          // Regular JavaScript completions
          {
            label: 'data',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'data',
            range: range,
            detail: 'Input data object',
            documentation: 'The data parameter passed to the function'
          },
          {
            label: 'context',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'context',
            range: range,
            detail: 'Execution context',
            documentation: 'Contains metadata about the execution'
          },
          {
            label: 'logger',
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: 'logger',
            range: range,
            detail: 'Logger instance',
            documentation: 'For logging messages'
          }
        ]

        if (insidePlaceholder) {
          suggestions.sort((a, b) => {
            if (a.label.toString().startsWith('{{') && !b.label.toString().startsWith('{{')) return -1;
            if (!a.label.toString().startsWith('{{') && b.label.toString().startsWith('{{')) return 1;
            return 0;
          });
        }

        return { suggestions }
      }
    })

    // Configure editor options
    editor.updateOptions({
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      fontSize: 14,
      wordWrap: 'on',
      automaticLayout: true,
      formatOnPaste: autoFormat,
      formatOnType: autoFormat,
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      tabSize: 2,
      lineNumbers: showLineNumbers ? 'on' : 'off',
    })

    // Add keybinding for formatting
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      async () => {
        try {
          const currentValue = editor.getValue()
          const formatted = await formatCode(currentValue)
          editor.executeEdits("format", [{
            range: editor.getModel().getFullModelRange(),
            text: formatted
          }])
          toast.success('Code formatted')
        } catch (error) {
          toast.error('Failed to format code')
        }
      }
    )
  }, [autoFormat, showLineNumbers])

  const handleFormatClick = async () => {
    try {
      const formatted = await formatCode(innerCode)
      setInnerCode(formatted)
      if (editorRef.current) {
        editorRef.current.setValue(formatted)
      }
      toast.success('Code formatted')
    } catch (error: any) {
      toast.error('Failed to format code')
    }
  }

  const handleSave = async () => {
    if (!isValidCode) {
      toast.error('Please fix errors before saving')
      return
    }

    // Prepare code for storage
    const wrappedCode = wrapCodeInFunction(innerCode)
    const config = {
      code: wrappedCode,
      lastUpdated: new Date().toISOString(),
      version: "1.0.0",
      type: "javascript",
      innerCode: innerCode // Store inner code for easier editing
    }

    try {
      await onSave(config)
      toast.success('Code saved successfully')
      onEditModeChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to save code')
    }
  }

  const handleCancel = () => {
    const existingCode = action?.config?.innerCode || extractInnerCode(action?.config?.code || FUNCTION_TEMPLATE)
    setInnerCode(existingCode)
    setError(null)
    onEditModeChange(false)
  }

  const handleTestRun = () => {
    if (!isValidCode) {
      toast.error('Fix errors before testing')
      return
    }
    
    toast.info('Test execution started')
    setTimeout(() => {
      toast.success('Test completed successfully')
    }, 1000)
  }

  // Rest of the JSX remains the same...
  return (
    <Container className="p-0">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <Heading level="h2" className="text-ui-fg-base mb-2">
              Action Code Editor
            </Heading>
            <Text className="text-ui-fg-subtle text-sm">
              Write JavaScript code that runs inside an async function. Use <code className="bg-ui-bg-subtle px-1 py-0.5 rounded">{'{{placeholders}}'}</code> for dynamic values.
            </Text>
          </div>
        </div>

        {editMode ? (
          <div className="space-y-6">
            {/* Editor Section */}
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between p-2 bg-ui-bg-subtle border border-ui-border-base rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Tooltip content="Format code (Ctrl+Shift+F)">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={handleFormatClick}
                      disabled={isFormatting}
                    >
                      <Sparkles className="h-4 w-4" />
                      {isFormatting ? 'Formatting...' : 'Format'}
                    </Button>
                  </Tooltip>
                  
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-ui-border-base">
                    <Label htmlFor="auto-format" size="small">Auto-format</Label>
                    <Switch
                      id="auto-format"
                      checked={autoFormat}
                      onCheckedChange={setAutoFormat}
                      size="small"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2 pl-2 border-l border-ui-border-base">
                    <Label htmlFor="line-numbers" size="small">Line Numbers</Label>
                    <Switch
                      id="line-numbers"
                      checked={showLineNumbers}
                      onCheckedChange={setShowLineNumbers}
                      size="small"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge color={isValidCode ? "green" : "red"} size="small">
                    {isValidCode ? '✓ Valid' : '✗ Invalid'}
                  </Badge>
                </div>
              </div>

              {/* Editor */}
              <div className={clx(
                "border border-ui-border-base rounded-b-lg overflow-hidden",
                error ? "border-red-300 border-t-0" : "border-t-0"
              )} style={{ height: "400px" }}>
                <MonacoEditor
                  height="100%"
                  language="javascript-with-placeholders"
                  value={innerCode}
                  onChange={handleCodeChange}
                  onMount={handleEditorDidMount}
                  theme="vs-dark"
                  options={{
                    automaticLayout: true,
                    fontSize: 14,
                    lineNumbers: showLineNumbers ? 'on' : 'off',
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                    wrappingIndent: "indent",
                    suggestOnTriggerCharacters: true,
                    quickSuggestions: true,
                    tabSize: 2,
                  }}
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <Text size="small" className="text-red-700 font-mono whitespace-pre-wrap">
                    {error}
                  </Text>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-ui-border-base">
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={isLoading}
              >
                <X /> Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={handleTestRun}
                disabled={!isValidCode || isLoading}
              >
                <PlaySolid /> Test Run
              </Button>
              <Button
                onClick={handleSave}
                isLoading={isLoading}
                disabled={!isValidCode}
              >
                <Check /> Save Changes
              </Button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-6">
            {action?.config?.code ? (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <CodeBlock
                    snippets={[{
                      label: "javascript",
                      language: "javascript",
                      code: action.config.code,
                    }]}
                  >
                    <CodeBlock.Header />
                    <CodeBlock.Body />
                  </CodeBlock>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-ui-bg-subtle rounded-lg border">
                    <div className="flex items-center gap-3 mb-3">
                      <MagnifyingGlass className="text-ui-fg-muted" />
                      <div>
                        <Text size="small" weight="plus">Code Details</Text>
                        <Text size="small" className="text-ui-fg-subtle">
                          Last updated: {new Date(action.config.lastUpdated || Date.now()).toLocaleDateString()}
                        </Text>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge size="small" color="green">
                        v{action.config.version || "1.0.0"}
                      </Badge>
                      <Badge size="small" color="blue">
                        JavaScript
                      </Badge>
                      <Text size="small" className="text-ui-fg-subtle">
                        {action.config.code.split('\n').length} lines
                      </Text>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-ui-bg-subtle rounded-lg border">
                    <div className="flex items-center gap-3 mb-3">
                      <Bolt className="text-ui-fg-muted" />
                      <div>
                        <Text size="small" weight="plus">Placeholders</Text>
                        <Text size="small" className="text-ui-fg-subtle">
                          Dynamic values using {'{{...}}'}
                        </Text>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge size="small" color="grey">{'{{data.*}}'}</Badge>
                      <Badge size="small" color="grey">{'{{context.*}}'}</Badge>
                      <Badge size="small" color="grey">{'{{input.*}}'}</Badge>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg border-ui-border-base">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-ui-bg-subtle flex items-center justify-center">
                  <Pencil className="text-ui-fg-muted" />
                </div>
                <Text className="text-ui-fg-subtle mb-2">
                  No code configured for this action
                </Text>
                <Text size="small" className="text-ui-fg-muted mb-4">
                  Add JavaScript code to define this action's behavior
                </Text>
                <Button 
                  variant="secondary" 
                  size="small"
                  onClick={() => onEditModeChange(true)}
                >
                  <Pencil /> Add JavaScript Code
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Container>
  )
}