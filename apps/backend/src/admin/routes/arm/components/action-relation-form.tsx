'use client';

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { ActionNodeData } from './workflow-canvas';
import { useExecuteAction } from "../../../hooks/api/actions";
import {
  Button,
  Drawer,
  Select,
  Input,
  Label,
  Text,
  IconButton,
} from '@medusajs/ui';

import {
  Plus,
  Trash,
  XMark,
  Check,
  MagnifyingGlass
} from '@medusajs/icons';

interface ActionDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  action?: ActionNodeData | null;
  isEditing: boolean;
}

interface MetadataField {
  id: string;
  key: string;
  value: string;
}

// Fixed Searchable Select Component with proper default value display
// Alternative: Custom trigger that shows the label
const SearchableSelect = ({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  isLoading,
  error,
  clearable = true
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ id: string; label: string; subtitle?: string; metadata?: any }>;
  placeholder: string;
  disabled?: boolean;
  isLoading?: boolean;
  error?: boolean;
  clearable?: boolean;
}) => {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(value);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter(option =>
      option.label.toLowerCase().includes(searchLower) ||
      option.subtitle?.toLowerCase().includes(searchLower) ||
      option.id.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  const selectedOption = options.find(opt => opt.id === internalValue);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    } else {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleValueChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange(newValue);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleValueChange('');
  };

  return (
    <div className="relative">
      <Select
        value={internalValue}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <Select.Trigger className="w-full">
          <div className="flex items-center justify-between w-full">
            <span className="truncate">
              {isLoading ? "Loading..." : (selectedOption?.label || placeholder)}
            </span>
            <MagnifyingGlass className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Select.Trigger>
        <Select.Content className="max-h-[400px] p-0" align="start" sideOffset={5}>
          <div className="flex flex-col">
            {/* Search Input */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-2 z-10">
              <div className="relative">
                <MagnifyingGlass className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Clear Selection Option */}
            {clearable && internalValue && (
              <div className="border-b border-gray-200">
                <div
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm flex items-center gap-2 text-red-600"
                  onClick={handleClear}
                >
                  <XMark className="w-4 h-4" />
                  Clear selection
                </div>
              </div>
            )}

            {/* Options List */}
            <div className="max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  Loading options...
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-3 py-4 text-sm text-gray-500 text-center">
                  No results found for "{search}"
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <Select.Item
                    key={option.id}
                    value={option.id}
                    className="py-2"
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{option.label}</span>
                        {internalValue === option.id && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                      </div>
                      {option.subtitle && (
                        <span className="text-xs text-gray-500">{option.subtitle}</span>
                      )}
                      {option.metadata?.description && (
                        <span className="text-xs text-gray-400 line-clamp-1">
                          {option.metadata.description}
                        </span>
                      )}
                    </div>
                  </Select.Item>
                ))
              )}
            </div>
          </div>
        </Select.Content>
      </Select>
      {error && (
        <Text className="text-red-500 text-xs mt-1">
          Failed to load options
        </Text>
      )}
    </div>
  );
};

export const ActionDrawer: React.FC<ActionDrawerProps> = ({
  open,
  onClose,
  onSubmit,
  action,
  isEditing
}) => {
  const [formData, setFormData] = useState({
    id: '',
    action_id: '',
    model_id: 'alayon',
    label: '',
    type: '',
    description: '',
    status: 'draft' as 'active' | 'draft' | 'archived',
    metadata: {} as Record<string, any>,
  });

  const [configFields, setConfigFields] = useState<MetadataField[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: modelsData, mutateAsync: fetchBaseModels } = useExecuteAction('get-db-models') as any;
  const { data, mutateAsync: getActions, isError } = useExecuteAction('get-action-templates') as any;

  // Fetch data when drawer opens
  useEffect(() => {
    if (open) {
      setIsInitialized(false);
      Promise.all([fetchActionTemplates(), fetchBaseModels()]);
    }
  }, [open]);

  const fetchActionTemplates = async () => {
    setIsLoadingActions(true);
    try {
      await getActions({ parameters: { status: "active" } });
    } catch (error) {
      console.error('Failed to fetch action templates:', error);
    } finally {
      setIsLoadingActions(false);
    }
  };

  // Update data from API
  useEffect(() => {
    if (modelsData?.data) {
      setModels(modelsData.data);
    }
    if (data?.data) {
      setActions(data.data);
      console.log('Actions loaded:', data.data);
    }
  }, [data, modelsData]);

  // Initialize form when action changes (for editing) or when actions are loaded
  useEffect(() => {
    if (!isInitialized && actions.length > 0 && open) {
      if (action) {
        // Populate form with existing action data
        setFormData({
          id: action.id || '',
          action_id: action.action_id || '',
          model_id: action.model_id || 'alayon',
          label: action.label || '',
          type: action.type || '',
          description: action.description || '',
          status: action.status || 'draft',
          metadata: action.metadata || {},
        });

        // Convert metadata to config fields for editing
        if (action.metadata && Object.keys(action.metadata).length > 0) {
          const fields = Object.entries(action.metadata).map(([key, value], index) => ({
            id: `field-${Date.now()}-${index}`,
            key,
            value: String(value),
          }));
          setConfigFields(fields);
        } else {
          setConfigFields([]);
        }
      } else {
        // Check if there's a default action to select
        const defaultAction = actions.find(a => a.is_default || a.id === 'default');
        if (defaultAction && !formData.action_id) {
          handleActionTemplateSelect(defaultAction.id);
        }
      }
      setIsInitialized(true);
    }
  }, [action, actions, open, isInitialized]);

  // Reset initialization when drawer closes
  useEffect(() => {
    if (!open) {
      setIsInitialized(false);
    }
  }, [open]);

  // Handle action template selection and auto-populate fields
  const handleActionTemplateSelect = (actionId: string) => {
    console.log('Selected action ID:', actionId);

    const selectedAction = actions.find(a => a.id === actionId);
    if (selectedAction) {
      console.log('Selected action details:', selectedAction);

      // Auto-populate label from action name if empty
      const actionLabel = selectedAction.label || selectedAction.name || '';

      // Auto-populate type from selected action
      const actionType = selectedAction.type || selectedAction.action_type || '';

      // Auto-populate description if available
      const actionDescription = selectedAction.description || '';

      // Auto-populate metadata template if available
      const templateMetadata = selectedAction.metadata || selectedAction.config || {};

      // Convert template metadata to config fields
      if (Object.keys(templateMetadata).length > 0) {
        const fields = Object.entries(templateMetadata).map(([key, value], index) => ({
          id: `field-${Date.now()}-${index}`,
          key,
          value: String(value),
        }));
        setConfigFields(fields);

        // Update formData.metadata
        const newMetadata: Record<string, any> = {};
        fields.forEach(field => {
          if (field.key.trim()) {
            newMetadata[field.key] = field.value;
          }
        });

        setFormData(prev => ({
          ...prev,
          action_id: actionId,
          label: prev.label || actionLabel,
          type: actionType,
          description: prev.description || actionDescription,
          metadata: newMetadata,
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          action_id: actionId,
          label: prev.label || actionLabel,
          type: actionType,
          description: prev.description || actionDescription,
        }));
      }
    } else {
      console.warn('Action not found with ID:', actionId);
    }
  };

  // Handle form field changes
  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Add new metadata field
  const addMetadataField = () => {
    const newField: MetadataField = {
      id: `field-${Date.now()}-${configFields.length}`,
      key: '',
      value: '',
    };
    setConfigFields(prev => [...prev, newField]);
  };

  // Update metadata field
  const updateMetadataField = (id: string, field: 'key' | 'value', newValue: string) => {
    setConfigFields(prev => {
      const updatedFields = prev.map(f =>
        f.id === id ? { ...f, [field]: newValue } : f
      );

      // Update formData.metadata
      const newMetadata: Record<string, any> = {};
      updatedFields.forEach(field => {
        if (field.key.trim()) {
          newMetadata[field.key] = field.value;
        }
      });

      setFormData(prevData => ({
        ...prevData,
        metadata: newMetadata,
      }));

      return updatedFields;
    });
  };

  // Remove metadata field
  const removeMetadataField = (id: string) => {
    setConfigFields(prev => {
      const updatedFields = prev.filter(f => f.id !== id);

      // Update formData.metadata
      const newMetadata: Record<string, any> = {};
      updatedFields.forEach(field => {
        if (field.key.trim()) {
          newMetadata[field.key] = field.value;
        }
      });

      setFormData(prevData => ({
        ...prevData,
        metadata: newMetadata,
      }));

      return updatedFields;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isEditing && !formData.action_id) {
      errors.action_id = 'Please select an action template';
    }

    if (!formData.label.trim()) {
      errors.label = 'Label is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Failed to submit form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this action?')) {
      onSubmit({ ...formData, _delete: true });
      onClose();
    }
  };

  // Prepare options for selects with enhanced metadata
  const actionOptions = actions.map(actionItem => ({
    id: actionItem.id,
    label: actionItem.label || actionItem.name || actionItem.id,
    subtitle: actionItem.type || actionItem.action_type || 'Action',
    metadata: {
      description: actionItem.description,
      config: actionItem.config,
      parameters: actionItem.parameters
    }
  }));

  const modelOptions = models.map(modelItem => ({
    id: modelItem.id,
    label: modelItem.model_name || modelItem.name || modelItem.id,
    subtitle: modelItem.provider || 'Model',
  }));

  const statusOptions = [
    { id: 'active', label: 'Active', subtitle: 'Action is active and can be used' },
    { id: 'draft', label: 'Draft', subtitle: 'Action is in draft mode' },
    { id: 'archived', label: 'Archived', subtitle: 'Action is archived and not usable' }
  ];

  // Display selected action details
  const selectedActionDetails = actions.find(a => a.id === formData.action_id);

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <Drawer.Content className="flex flex-col h-full">
        <Drawer.Header>
          <Drawer.Title>
            {isEditing ? `Configure Action ${formData.id}` : 'Configure New Action'}
          </Drawer.Title>
        </Drawer.Header>

        <div className="flex-1 overflow-y-auto">
          <Drawer.Body>
            <form id="action-form" onSubmit={handleSubmit} className="flex flex-col gap-y-4">
              {/* Action Template Selection - Only show for new actions */}
              <div>
                <Label htmlFor="action_template" className="mb-2 block">
                  Select Action Template <span className="text-red-500">*</span>
                </Label>
                <SearchableSelect
                  value={formData.action_id}
                  onValueChange={handleActionTemplateSelect}
                  options={actionOptions}
                  placeholder={isLoadingActions ? "Loading actions..." : "Search by action name or ID..."}
                  disabled={isLoadingActions}
                  isLoading={isLoadingActions}
                  error={isError || !!formErrors.action_id}
                  clearable={true}
                />
                {formErrors.action_id && (
                  <Text className="text-red-500 text-xs mt-1">{formErrors.action_id}</Text>
                )}

                {/* Show selected action preview */}
                {selectedActionDetails && formData.action_id && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <Text className="text-xs font-medium text-blue-800 mb-1">Selected Action:</Text>
                    <Text className="text-sm text-blue-900">{selectedActionDetails.label || selectedActionDetails.name}</Text>
                    {selectedActionDetails.description && (
                      <Text className="text-xs text-blue-700 mt-1">{selectedActionDetails.description}</Text>
                    )}
                  </div>
                )}
              </div>

              {/* Model Selection */}
              <div>
                <Label htmlFor="model_id" className="mb-2 block">
                  Select Model
                </Label>
                <SearchableSelect
                  value={formData.model_id}
                  onValueChange={(value) => handleFieldChange('model_id', value)}
                  options={modelOptions}
                  placeholder="Search by model name..."
                  clearable={false}
                />
              </div>

              {/* Label Input */}
              <div>
                <Label htmlFor="label" className="mb-2 block">
                  Label <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => handleFieldChange('label', e.target.value)}
                  placeholder="Enter action name"
                  className={formErrors.label ? 'border-red-500' : ''}
                />
                {formErrors.label && (
                  <Text className="text-red-500 text-xs mt-1">{formErrors.label}</Text>
                )}
              </div>

              {/* Description Input */}
              <div>
                <Label htmlFor="description" className="mb-2 block">
                  Description
                </Label>
                <Input
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Enter description"
                />
              </div>

              {/* Type Display (read-only, auto-populated) */}
              {formData.type && (
                <div>
                  <Label className="mb-2 block">
                    Type
                  </Label>
                  <div className="px-3 py-2 bg-gray-50 rounded-md border">
                    <Text size="small">{formData.type}</Text>
                  </div>
                </div>
              )}

              {/* Status Selection */}
              <div>
                <Label htmlFor="status" className="mb-2 block">
                  Status
                </Label>
                <SearchableSelect
                  value={formData.status}
                  onValueChange={(value) => handleFieldChange('status', value as any)}
                  options={statusOptions}
                  placeholder="Select status"
                  clearable={false}
                />
              </div>

              {/* Metadata Section */}
              <div className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Metadata</Label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={addMetadataField}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Field
                  </Button>
                </div>

                <div className="space-y-2">
                  {configFields.map((field) => (
                    <div key={field.id} className="flex items-start gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Key"
                          value={field.key}
                          onChange={(e) => updateMetadataField(field.id, 'key', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Value"
                          value={field.value}
                          onChange={(e) => updateMetadataField(field.id, 'value', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <IconButton
                        size="small"
                        variant="transparent"
                        onClick={() => removeMetadataField(field.id)}
                        type="button"
                      >
                        <XMark className="w-4 h-4" />
                      </IconButton>
                    </div>
                  ))}

                  {configFields.length === 0 && (
                    <div className="text-center py-4 bg-gray-50 rounded-md border border-dashed border-gray-200">
                      <Text className="text-gray-500 text-sm">
                        No metadata fields. Click "Add Field" to add custom data.
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </Drawer.Body>
        </div>

        <Drawer.Footer className="border-t border-gray-200 bg-white">
          <div className="flex justify-between items-center w-full">
            {isEditing && (
              <Button
                variant="danger"
                onClick={handleDelete}
                type="button"
              >
                <Trash className="w-4 h-4 mr-1" />
                Delete Action
              </Button>
            )}
            <div className="flex gap-x-2 ml-auto">
              <Button variant="secondary" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={(!isEditing && !formData.action_id) || isSubmitting}
                isLoading={isSubmitting}
                type="submit"
                form="action-form"
              >
                {isEditing ? 'Save Changes' : 'Create Action'}
              </Button>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
};