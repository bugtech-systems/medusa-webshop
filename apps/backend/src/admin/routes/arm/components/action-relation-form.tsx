'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { ActionNodeData } from './workflow-canvas';
import { useExecuteAction } from "../../../hooks/api/actions"
import {
  Button,
  Drawer,
  Select,
  Input,
  Label,
  Text,
  IconButton
} from '@medusajs/ui';

import {
  Plus,
  Trash,
  PencilSquare,
  ArrowLongRight,
  ArrowLongDown,
  Sparkles,
  XMark,
  ListTree,
  QueueList,
  SquareTwoStack,
  SquaresPlus,
} from '@medusajs/icons';


interface ActionDrawerProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  action?: ActionNodeData | null
  isEditing: boolean
}






export const ActionDrawer: React.FC<ActionDrawerProps> = ({ open, onClose, onSubmit, action, isEditing }) => {
  const [formData, setFormData] = useState({
    id: '',
    action_id: '',
    label: '',
    type: '',
    description: '',
    status: 'draft',
    metadata: {} as Record<string, any>,
  });

  const [configFields, setConfigFields] = useState<Array<{ key: string; value: string }>>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [isLoadingActions, setIsLoadingActions] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  const { data, mutateAsync: getActions, isError } = useExecuteAction('get-action-templates') as any;
  
  // Fetch action templates when drawer opens
  useEffect(() => {
    if (open) {
      fetchActionTemplates();
    }
  }, [open]);

  // Fetch action templates
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

  // Update actions when data changes
  useEffect(() => {
    if (data?.data) {
      setActions(data.data);
    }
  }, [data]);

  // Update form when action changes (for editing)
  useEffect(() => {
    if (action) {
      // Convert metadata object to config fields array for editing
      const metadataFields = Object.entries(action.metadata || {}).map(([key, value]) => ({
        key,
        value: String(value),
      }));
      
      setConfigFields(metadataFields);
      
      setFormData({
        id: action.id || '',
        action_id: action.action_id || action.id || '',
        label: action.label || '',
        type: action.type || '',
        status: action.status || 'draft',
        metadata: action.metadata || {},
      });
    } else {
      setFormData({
        id: '',
        action_id: '',
        label: '',
        type: '',
        status: 'draft',
        metadata: {},
      });
      setConfigFields([]);
    }
  }, [action]);

  // Handle action template selection
  const handleActionTemplateSelect = (actionId: string) => {
    const selectedAction = actions.find(a => a.id === actionId);
    if (selectedAction) {
      setSelectedTemplate(selectedAction);
      
      // Auto-populate label from action name
      const actionLabel = selectedAction.label || selectedAction.name || '';
      
      // Convert template metadata to config fields
      const templateMetadata = selectedAction.metadata || selectedAction.config || {};
      // const metadataFields = Object.entries(templateMetadata).map(([key, value]) => ({
      //   key,
      //   value: String(value),
      // }));
      
      // setConfigFields(metadataFields);
      
      setFormData({
        ...formData,
        action_id: selectedAction.id,
        label: actionLabel, // Auto-populate label
        type: selectedAction.type || ''
      });
    }
  };

  // Handle label change (allows editing)
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      label: e.target.value,
    });
  };

    // Handle label change (allows editing)
  const handleChanges = prop => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [prop]: e.target.value,
    });
  };

  // Add new metadata field
  const addMetadataField = () => {
    setConfigFields([...configFields, { key: '', value: '' }]);
  };

  // Update metadata field
  const updateMetadataField = (index: number, field: 'key' | 'value', newValue: string) => {
    const updatedFields = [...configFields];
    updatedFields[index][field] = newValue;
    setConfigFields(updatedFields);
    
    // Update formData.metadata
    const newMetadata = { ...formData.metadata };
    
    // If we're updating an existing key, remove the old one first
    if (field === 'key') {
      const oldKey = Object.keys(formData.metadata)[index];
      if (oldKey && oldKey !== newValue) {
        delete newMetadata[oldKey];
      }
    }
    
    // Rebuild metadata object from fields
    updatedFields.forEach(field => {
      if (field.key.trim()) {
        newMetadata[field.key] = field.value;
      }
    });
    
    setFormData({
      ...formData,
      metadata: newMetadata,
    });
  };

  // Remove metadata field
  const removeMetadataField = (index: number) => {
    const fieldToRemove = configFields[index];
    const updatedFields = configFields.filter((_, i) => i !== index);
    setConfigFields(updatedFields);
    
    // Update formData.metadata
    const newMetadata = { ...formData.metadata };
    if (fieldToRemove.key) {
      delete newMetadata[fieldToRemove.key];
    }
    
    setFormData({
      ...formData,
      metadata: newMetadata,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up metadata - remove empty keys
    const cleanMetadata = Object.fromEntries(
      Object.entries(formData.metadata).filter(([key, value]) => key.trim() !== '' && value !== '')
    );
    
    const submitData = {
      ...formData,
      id: formData.id || formData.action_id,
      metadata: cleanMetadata,
    };
    
    onSubmit(submitData);
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {isEditing ? `Configure Action ${formData.id}` : 'Configure New Action'}
          </Drawer.Title>
        </Drawer.Header>
        
        <Drawer.Body>
          <form onSubmit={handleSubmit} className="flex flex-col gap-y-4 max-h-[70vh] overflow-auto">
            {/* Action Template Selection - Only show for new actions */}
            {!isEditing && (
              <div>
                <Label htmlFor="action_template" className="mb-2 block">
                  Select Action Template [{formData.type && formData.type }]
                </Label>
                <Select
                  value={formData.action_id}
                  onValueChange={handleActionTemplateSelect}
                  disabled={isLoadingActions}
                >
                  <Select.Trigger>
                    <Select.Value placeholder={isLoadingActions ? "Loading actions..." : "Choose an action template"} />
                  </Select.Trigger>
                  <Select.Content>
                    {actions.map((actionItem) => (
                      <Select.Item key={actionItem.id} value={actionItem.id}>
                        <div className="flex flex-col">
                          <span>{actionItem.label || actionItem.name}</span>
                          <span className="text-xs text-gray-500">{actionItem.type}</span>
                        </div>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
                {isError && (
                  <Text className="text-red-500 text-xs mt-1">
                    Failed to load action templates
                  </Text>
                )}
              </div>
            )}


            {/* Hidden action_id field */}
            <input type="hidden" name="action_id" value={formData.action_id} />


            <div>
              <Label htmlFor="label" className="mb-2 block">
                Label
              </Label>
              <Input
                id="label"
                value={formData.label}
                onChange={handleLabelChange}
                placeholder="Enter action name"
                required
              />
              <Text className="text-xs text-gray-500 mt-1">
                Auto-populated from template, but you can edit it
              </Text>
            </div>

  
            <div>
              <Label htmlFor="description" className="mb-2 block">
                Description
              </Label>
              <Input
                id="description"
                value={formData?.description}
                onChange={handleChanges('description')}
                placeholder="Enter Description"
                required
              />
            </div>

            <div>
              <Label htmlFor="status" className="mb-2 block">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <Select.Trigger>
                  <Select.Value placeholder="Select status" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="active">Active</Select.Item>
                  <Select.Item value="draft">Draft</Select.Item>
                  <Select.Item value="archived">Archived</Select.Item>
                </Select.Content>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Metadata</Label>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={addMetadataField}
                >
                  <Plus className="w-4 h-4" />
                  Add Field
                </Button>
              </div>
              
              <div className="space-y-2">
                {configFields.map((field, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Key"
                      value={field.key}
                      onChange={(e) => updateMetadataField(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Value"
                      value={field.value}
                      onChange={(e) => updateMetadataField(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <IconButton
                      size="small"
                      variant="transparent"
                      onClick={() => removeMetadataField(index)}
                    >
                      <XMark className="w-4 h-4" />
                    </IconButton>
                  </div>
                ))}
                
                {configFields.length === 0 && (
                  <div className="text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200">
                    <Text className="text-gray-500 text-sm">
                      No metadata fields. Click "Add Field" to add custom data.
                    </Text>
                  </div>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end mt-4">
                <Button 
                  variant="danger" 
                  size="small"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this action?')) {
                      onClose();
                      onSubmit({ ...formData, _delete: true });
                    }
                  }}
                >
                  <Trash />
                  Delete Action
                </Button>
              </div>
            )}
          </form>
        </Drawer.Body>

        <Drawer.Footer>
          <div className="flex gap-x-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              disabled={!isEditing && !formData.action_id}
            >
              {isEditing ? 'Save Changes' : 'Create Action'}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
};