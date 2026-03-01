export type Column = { 
  key: string; 
  label: string; 
  sortable?: boolean; 
  type?: 'text' | 'number' | 'date' | 'status' 
}

export type Filter = { 
  key: string; 
  label: string; 
  type: "text" | "select"; 
  options?: Array<{ value: string; label: string }> 
}

export type FormField = { 
  name: string; 
  label: string; 
  type: "text" | "number" | "select" | "textarea" | "json"; 
  options?: string[]; 
  required?: boolean;
  placeholder?: string;
  helpText?: string;
}

export type Config = { 
  columns: Column[]; 
  filters: Filter[]; 
  formFields: FormField[] 
}

export interface ReportsListProps {
  config: Config
}