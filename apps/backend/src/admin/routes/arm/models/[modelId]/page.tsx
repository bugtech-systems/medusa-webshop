import {
  Container,
  Heading,
  Table,
  Text,
  Toaster,
  Badge,
  Button,
  IconButton,
  Drawer,
  Input,
  Textarea,
  Label,
  Select,
  Switch,
  Tabs,
  clx,
} from "@medusajs/ui";
import {
  PencilSquare,
  Trash,
  Plus,
  ExclamationCircle,
  ArrowPath,
  CogSixTooth,
  ChatBubble,
  Adjustments,
  DocumentText,
  CheckCircle,
} from "@medusajs/icons";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { AdminAiModel } from "../../../../../types/ai-model";
import { useAiModel, useUpdateAiModel, useAiModels } from "../../../../hooks/api";
import { useExecuteAction } from "../../../../hooks/api/actions";
import { Code } from "lucide-react";
import { AIModelTestDrawer } from "../components/model-chat-drawer";

const AIModelDetails = () => {
  const { modelId } = useParams();
  const { data, isPending, refetch } = useAiModel(modelId || "");
  const { mutateAsync: updateModel } = useUpdateAiModel(modelId || "");
  const { mutateAsync: retrainModel, isPending: isTraining } = useExecuteAction('train-model')

  const { data: baseModelsData, mutateAsync: executeAction, isPending: isExecuting, isError, error } = useExecuteAction('get-local-ollama-models')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMessagesDrawerOpen, setIsMessagesDrawerOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [jsonFields, setJsonFields] = useState<{ key: string; type: string }[]>([]);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false)
  const [formData, setFormData] = useState({
    system: "",
    status: "draft",
    base_model: "",
    model_name: "",
    config: {
      temperature: 0.7,
      num_predict: 2000,
      top_p: 1.0,
      top_k: 40,
      min_p: 0.0,
      repeat_penalty: 1.0,
      num_ctx: 2048,
    },
    metadata: {
      template: "",
      response_format: { type: "text" },
      options: {},
      base_model: "",
    },
  });

  const model = data?.ai_model;
  const availableBaseModels = useMemo(() =>
    baseModelsData?.data?.models?.filter((m: AdminAiModel) => m.id !== modelId) || [],
    [baseModelsData, modelId]
  );

  // Initialize form data when model loads
  useEffect(() => {
    if (model) {
      const oldConfig = model.config || {};
      setFormData({
        ...model,
        system: model.system || "",
        config: {
          temperature: oldConfig.temperature ?? 0.7,
          num_predict: oldConfig.num_predict ?? oldConfig.max_tokens ?? 2000,
          top_p: oldConfig.top_p ?? 1.0,
          top_k: oldConfig.top_k ?? 40,
          min_p: oldConfig.min_p ?? 0.0,
          repeat_penalty: oldConfig.repeat_penalty ?? 1.0,
          num_ctx: oldConfig.num_ctx ?? 2048,
        },
        metadata: {
          template: model.metadata?.template || "",
          response_format: model.metadata?.response_format || { type: "text" },
          options: model.metadata?.options || {},
          base_model: model.metadata?.base_model || model.base_model || "",
        },
      });

      // Initialize messages
      if (model.metadata?.messages) {
        setMessages(model.metadata.messages);
      }

      // Initialize JSON fields from schema if present
      const schema = model.metadata?.response_format?.type === 'json'
        ? model.metadata?.response_format?.schema
        : null;
      if (schema && schema.properties) {
        const fields = Object.entries(schema.properties).map(([key, prop]: [string, any]) => ({
          key,
          type: prop.type || 'string',
        }));
        setJsonFields(fields);
      } else {
        setJsonFields([]);
      }
    }
  }, [model]);

  useEffect(() => {
    handleModels()
  }, []);

  // Update schema whenever jsonFields change (only for JSON format)
  useEffect(() => {
    if (formData.metadata.response_format?.type === 'json') {
      const newSchema = {
        type: 'object',
        properties: Object.fromEntries(
          jsonFields.map(field => [field.key, { type: field.type }])
        ),
      };
      const currentSchema = formData.metadata.response_format?.schema;
      if (JSON.stringify(newSchema) !== JSON.stringify(currentSchema)) {
        handleMetadataChange('response_format', {
          type: 'json',
          schema: newSchema,
        });
      }
    }
  }, [jsonFields, formData.metadata.response_format?.type]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleConfigChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [field]: value,
      },
    }));
  };

  const handleMetadataChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      const payload: any = {
        ...formData,
        system: formData.system,
        config: formData.config,
        metadata: {
          ...formData.metadata,
          messages: messages,
        },
      };

      if (formData.metadata.base_model) {
        const selectedBaseModel = availableBaseModels.find(
          (m: AdminAiModel) => m.id === formData.metadata.base_model
        );
        if (selectedBaseModel) {
          payload.metadata.base_model_name = selectedBaseModel.name;
          payload.metadata.base_model_provider = selectedBaseModel.provider;
        }
      }

      await updateModel(payload);
      setIsDrawerOpen(false);
      refetch();
    } catch (error) {
      console.error("Failed to update model:", error);
    }
  };

  const handleAddMessage = () => {
    setEditingMessage({
      id: Date.now().toString(),
      role: "user",
      content: "",
    });
    setIsMessagesDrawerOpen(true);
  };

  const handleEditMessage = (message: any) => {
    setEditingMessage(message);
    setIsMessagesDrawerOpen(true);
  };

  const handleDeleteMessage = (id: string) => {
    setMessages(messages.filter((msg) => msg.id !== id));
  };

  const handleSaveMessage = () => {
    if (editingMessage) {
      if (messages.find((msg) => msg.id === editingMessage.id)) {
        setMessages(
          messages.map((msg) =>
            msg.id === editingMessage.id ? editingMessage : msg
          )
        );
      } else {
        setMessages([...messages, editingMessage]);
      }
      setIsMessagesDrawerOpen(false);
      setEditingMessage(null);
    }
  };

  // JSON field handlers
  const handleAddJsonField = () => {
    setJsonFields([...jsonFields, { key: '', type: 'string' }]);
  };

  const handleRemoveJsonField = (index: number) => {
    setJsonFields(jsonFields.filter((_, i) => i !== index));
  };

  const handleJsonFieldChange = (index: number, field: 'key' | 'type', value: string) => {
    const newFields = [...jsonFields];
    newFields[index][field] = value;
    setJsonFields(newFields);
  };

  const getBaseModelDisplay = (baseModelId: string) => {
    if (!baseModelId) return "-";
    const baseModel = availableBaseModels.find((m: AdminAiModel) => m.id === baseModelId);
    return baseModel ? `${baseModel.name} (${baseModel.provider})` : baseModelId;
  };

  const handleModels = async () => {
    let modelData = await executeAction({});
  };

  const handleTraining = async () => {
    await retrainModel({
      parameters: {
        id: model?.id
      }
    });
  };

  if (!model) {
    return <div>AI Model not found</div>;
  }


  console.log(availableBaseModels, baseModelsData, 'BASE MODELS')

  return (
    <div className="flex flex-col gap-4">
      {/* Model Overview Section */}
      <Container className="flex flex-col p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-ui-bg-base shadow-elevation-card-rest">
              <CogSixTooth />
            </div>
            <div>
              <Heading className="font-sans font-medium h1-core">
                {model.name}
              </Heading>
              <Text className="text-ui-fg-muted txt-small">
                {model.model_name}
              </Text>
            </div>
          </div>
          <Button onClick={() => setIsDrawerOpen(true)}>
            <PencilSquare /> Customize Model
          </Button>
        </div>

        <Table>
          <Table.Body>
            <Table.Row>
              <Table.Cell className="font-medium font-sans txt-compact-small">
                Model ID
              </Table.Cell>
              <Table.Cell>
                <Badge size="small" color="grey">
                  {model.id}
                </Badge>
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="font-medium font-sans txt-compact-small">
                Base Model
              </Table.Cell>
              <Table.Cell>
                {model.base_model || model.metadata?.base_model ? (
                  <div className="flex items-center gap-2">
                    <Badge size="small" color="blue">
                      {getBaseModelDisplay(model.metadata?.base_model || model.base_model || "")}
                    </Badge>
                    {model.metadata?.base_model_name && (
                      <Text className="txt-small text-ui-fg-muted">
                        ({model.metadata.base_model_name})
                      </Text>
                    )}
                  </div>
                ) : (
                  "-"
                )}
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="font-medium font-sans txt-compact-small">
                Version
              </Table.Cell>
              <Table.Cell>{model.version || "-"}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="font-medium font-sans txt-compact-small">
                Handle
              </Table.Cell>
              <Table.Cell>{model.handle || "-"}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="font-medium font-sans txt-compact-small">
                Status
              </Table.Cell>
              <Table.Cell>
                <Badge
                  size="small"
                  color={
                    model.status === "active"
                      ? "green"
                      : model.status === "disabled"
                        ? "red"
                        : "grey"
                  }
                >
                  {model.status || "unknown"}
                </Badge>
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="font-medium font-sans txt-compact-small">
                Description
              </Table.Cell>
              <Table.Cell>{model.description || "-"}</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </Container>

      {/* Current Configuration Preview */}
      <Container className="flex flex-col p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <Heading className="font-sans font-medium h1-core">
            Current Configuration
          </Heading>
          <div className="space-x-3">
            <Button variant="secondary" disabled={isTraining} onClick={() => handleTraining()}>
              <ArrowPath /> Re-train
            </Button>
            {/*          <Button variant="secondary" disabled={isChatDrawerOpen} onClick={() => setIsChatDrawerOpen(true)}>
              <ChatBubble className="text-ui-fg-subtle mr-2" />
              Chat-test
            </Button> */}
          </div>

        </div>

        <div className="p-6 space-y-6">
          {/* System Instruction Preview */}
          <div className="space-y-3">
            <Label weight="plus" size="small">
              System Instruction
            </Label>
            <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
              <Text className="txt-small whitespace-pre-wrap">
                {model.system || "No system instruction configured"}
              </Text>
            </div>
          </div>

          {/* Configuration Parameters Preview */}
          <div className="space-y-3">
            <Label weight="plus" size="small">
              Model Parameters
            </Label>
            <div className="grid grid-cols-2 gap-4">
              {model.config && typeof model.config === "object" ? (
                Object.entries(model.config).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <Text className="txt-small text-ui-fg-muted capitalize">
                      {key.replace(/_/g, " ")}
                    </Text>
                    <Text className="txt-medium">{String(value)}</Text>
                  </div>
                ))
              ) : (
                <Text className="txt-small text-ui-fg-muted">
                  No parameters configured
                </Text>
              )}
            </div>
          </div>

          {/* Base Model Preview */}
          {(model.metadata?.base_model || model.base_model) && (
            <div className="space-y-3">
              <Label weight="plus" size="small">
                Base Model Configuration
              </Label>
              <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Text className="font-medium txt-small">Selected Base Model</Text>
                    <Badge size="small" color="blue">
                      {getBaseModelDisplay(model.metadata?.base_model || model.base_model || "")}
                    </Badge>
                  </div>
                  {model.metadata?.base_model_provider && (
                    <div className="flex items-center gap-2">
                      <Text className="txt-small text-ui-fg-muted">Provider:</Text>
                      <Text className="txt-small">{model.metadata.base_model_provider}</Text>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Metadata Preview */}
          {model.metadata && typeof model.metadata === "object" && (
            <div className="space-y-3">
              <Label weight="plus" size="small">
                Additional Settings
              </Label>
              <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
                <pre className="txt-small font-mono overflow-auto">
                  {JSON.stringify(model.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </Container>



      {/* Edit Model Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Content className="max-h-[90vh] overflow-hidden">
          <Drawer.Header className="sticky top-0 bg-ui-bg-base z-10 border-b">
            <Drawer.Title>Customize AI Model</Drawer.Title>
            <Drawer.Description>
              Configure settings for {model.name}
            </Drawer.Description>
          </Drawer.Header>

          <div className="overflow-y-auto flex-1">
            <Drawer.Body className="pb-8">
              <Tabs defaultValue="system" className="w-full">
                <Tabs.List className="sticky top-0 bg-ui-bg-base z-10 border-b">
                  <Tabs.Trigger value="system">
                    <DocumentText className="w-4 h-4" />
                    System
                  </Tabs.Trigger>
                  <Tabs.Trigger value="parameters">
                    <Adjustments className="w-4 h-4" />
                    Parameters
                  </Tabs.Trigger>
                  <Tabs.Trigger value="format">
                    <Code className="w-4 h-4" />
                    Format
                  </Tabs.Trigger>
                  <Tabs.Trigger value="base-model">
                    <CogSixTooth className="w-4 h-4" />
                    Base Model
                  </Tabs.Trigger>
                </Tabs.List>

                {/* System Tab */}
                <Tabs.Content value="system" className="space-y-6 pt-6">
                  <div className="space-y-4">
                    <Label htmlFor="system" weight="plus" size="small">
                      System Instruction
                    </Label>
                    <Textarea
                      id="system"
                      placeholder="Enter system instructions for the AI model..."
                      value={formData.system}
                      onChange={(e) => handleInputChange("system", e.target.value)}
                      rows={6}
                      className="min-h-[120px] resize-y"
                    />
                    <Text className="txt-small text-ui-fg-muted">
                      This instruction sets the behavior and constraints for the AI model.
                    </Text>
                  </div>

                  <div className="space-y-4">
                    <Label htmlFor="template" weight="plus" size="small">
                      Prompt Template
                    </Label>
                    <Textarea
                      id="template"
                      placeholder="Enter prompt template with {{variables}}..."
                      value={formData.metadata.template || ""}
                      onChange={(e) =>
                        handleMetadataChange("template", e.target.value)
                      }
                      rows={4}
                      className="min-h-[100px] resize-y"
                    />
                    <Text className="txt-small text-ui-fg-muted">
                      'Use for dynamic content insertion.'
                    </Text>
                  </div>
                  <div className="space-y-4">
                    <Select
                      value={formData?.status || "status"}
                      onValueChange={(value) =>
                        handleInputChange("status", value)
                      }
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="draft">Draft</Select.Item>
                        <Select.Item value="active">Active</Select.Item>
                        <Select.Item value="inactive">Inactive</Select.Item>
                        <Select.Item value="training">Training</Select.Item>
                      </Select.Content>
                    </Select>
                  </div>
                </Tabs.Content>

                {/* Parameters Tab */}
                <Tabs.Content value="parameters" className="space-y-6 pt-6">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Temperature */}
                      <div className="space-y-4">
                        <Label htmlFor="temperature" weight="plus" size="small">
                          Temperature
                        </Label>
                        <div className="space-y-2">
                          <Input
                            id="temperature"
                            type="number"
                            min="0"
                            max="2"
                            step="0.1"
                            value={formData.config.temperature}
                            onChange={(e) =>
                              handleConfigChange("temperature", parseFloat(e.target.value))
                            }
                          />
                          <Text className="txt-small text-ui-fg-muted">
                            Controls randomness: 0 = deterministic, 2 = creative
                          </Text>
                        </div>
                      </div>

                      {/* Top P */}
                      <div className="space-y-4">
                        <Label htmlFor="top_p" weight="plus" size="small">
                          Top P
                        </Label>
                        <div className="space-y-2">
                          <Input
                            id="top_p"
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={formData.config.top_p}
                            onChange={(e) =>
                              handleConfigChange("top_p", parseFloat(e.target.value))
                            }
                          />
                          <Text className="txt-small text-ui-fg-muted">
                            Nucleus sampling: lower = more deterministic, 1.0 = full distribution
                          </Text>
                        </div>
                      </div>

                      {/* Top K */}
                      <div className="space-y-4">
                        <Label htmlFor="top_k" weight="plus" size="small">
                          Top K
                        </Label>
                        <div className="space-y-2">
                          <Input
                            id="top_k"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={formData.config.top_k}
                            onChange={(e) =>
                              handleConfigChange("top_k", parseInt(e.target.value, 10))
                            }
                          />
                          <Text className="txt-small text-ui-fg-muted">
                            Limits token choices to top K: 0 = off, typical 40
                          </Text>
                        </div>
                      </div>

                      {/* Min P */}
                      <div className="space-y-4">
                        <Label htmlFor="min_p" weight="plus" size="small">
                          Min P
                        </Label>
                        <div className="space-y-2">
                          <Input
                            id="min_p"
                            type="number"
                            min="0"
                            max="1"
                            step="0.05"
                            value={formData.config.min_p}
                            onChange={(e) =>
                              handleConfigChange("min_p", parseFloat(e.target.value))
                            }
                          />
                          <Text className="txt-small text-ui-fg-muted">
                            Minimum token probability: 0 = off, 0.05 = typical
                          </Text>
                        </div>
                      </div>

                      {/* Repeat Penalty */}
                      <div className="space-y-4">
                        <Label htmlFor="repeat_penalty" weight="plus" size="small">
                          Repeat Penalty
                        </Label>
                        <div className="space-y-2">
                          <Input
                            id="repeat_penalty"
                            type="number"
                            min="1"
                            max="2"
                            step="0.1"
                            value={formData.config.repeat_penalty}
                            onChange={(e) =>
                              handleConfigChange("repeat_penalty", parseFloat(e.target.value))
                            }
                          />
                          <Text className="txt-small text-ui-fg-muted">
                            Penalty for repetition: 1.0 = off, 1.1 = moderate, 2.0 = strong
                          </Text>
                        </div>
                      </div>

                      {/* Num Predict (Max Tokens) */}
                      <div className="space-y-4">
                        <Label htmlFor="num_predict" weight="plus" size="small">
                          Max Tokens (num_predict)
                        </Label>
                        <div className="space-y-2">
                          <Input
                            id="num_predict"
                            type="number"
                            min="1"
                            max="8000"
                            step="100"
                            value={formData.config.num_predict}
                            onChange={(e) =>
                              handleConfigChange("num_predict", parseInt(e.target.value, 10))
                            }
                          />
                          <Text className="txt-small text-ui-fg-muted">
                            Maximum length of the generated response
                          </Text>
                        </div>
                      </div>

                      {/* Num Ctx (Context Window) */}
                      <div className="space-y-4">
                        <Label htmlFor="num_ctx" weight="plus" size="small">
                          Context Window (num_ctx)
                        </Label>
                        <div className="space-y-2">
                          <Input
                            id="num_ctx"
                            type="number"
                            min="512"
                            max="32768"
                            step="512"
                            value={formData.config.num_ctx}
                            onChange={(e) =>
                              handleConfigChange("num_ctx", parseInt(e.target.value, 10))
                            }
                          />
                          <Text className="txt-small text-ui-fg-muted">
                            Size of the context window (tokens). Default 2048 / 4096
                          </Text>
                        </div>
                      </div>
                    </div>
                  </div>
                </Tabs.Content>

                {/* Format Tab - Refined with JSON field builder */}
                <Tabs.Content value="format" className="space-y-6 pt-6">
                  <div className="space-y-4">
                    <Label htmlFor="response_format" weight="plus" size="small">
                      Response Format
                    </Label>
                    <Select
                      value={formData.metadata.response_format?.type || "text"}
                      onValueChange={(value) => {
                        handleMetadataChange("response_format", { type: value });
                        // Clear fields if switching away from JSON
                        if (value !== 'json') {
                          setJsonFields([]);
                        }
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="text">Plain Text</Select.Item>
                        <Select.Item value="json">JSON</Select.Item>
                        <Select.Item value="html">HTML</Select.Item>
                        <Select.Item value="markdown">Markdown</Select.Item>
                      </Select.Content>
                    </Select>
                    <Text className="txt-small text-ui-fg-muted">
                      Format in which the AI model should respond
                    </Text>
                  </div>

                  {/* JSON Field Builder */}
                  {formData.metadata.response_format?.type === 'json' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label weight="plus" size="small">
                          JSON Fields
                        </Label>
                        <Button size="small" variant="secondary" onClick={handleAddJsonField}>
                          <Plus className="w-4 h-4" /> Add Field
                        </Button>
                      </div>

                      {jsonFields.length > 0 ? (
                        <Table>
                          <Table.Header>
                            <Table.Row>
                              <Table.HeaderCell>Key</Table.HeaderCell>
                              <Table.HeaderCell>Type</Table.HeaderCell>
                              <Table.HeaderCell className="w-20">Actions</Table.HeaderCell>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {jsonFields.map((field, index) => (
                              <Table.Row key={index}>
                                <Table.Cell>
                                  <Input
                                    value={field.key}
                                    onChange={(e) => handleJsonFieldChange(index, 'key', e.target.value)}
                                    placeholder="field_name"
                                  />
                                </Table.Cell>
                                <Table.Cell>
                                  <Select
                                    value={field.type}
                                    onValueChange={(value) => handleJsonFieldChange(index, 'type', value)}
                                  >
                                    <Select.Trigger>
                                      <Select.Value />
                                    </Select.Trigger>
                                    <Select.Content>
                                      <Select.Item value="string">string</Select.Item>
                                      <Select.Item value="number">number</Select.Item>
                                      <Select.Item value="boolean">boolean</Select.Item>
                                      <Select.Item value="array">array</Select.Item>
                                      <Select.Item value="object">object</Select.Item>
                                    </Select.Content>
                                  </Select>
                                </Table.Cell>
                                <Table.Cell>
                                  <IconButton
                                    size="small"
                                    variant="danger"
                                    onClick={() => handleRemoveJsonField(index)}
                                  >
                                    <Trash />
                                  </IconButton>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table>
                      ) : (
                        <div className="flex h-[100px] items-center justify-center border border-dashed border-ui-border-base rounded-lg">
                          <Text className="txt-small text-ui-fg-muted">
                            No fields defined. Click "Add Field" to start building your JSON schema.
                          </Text>
                        </div>
                      )}

                      <Text className="txt-small text-ui-fg-muted">
                        Define the structure of the JSON response. The schema will be generated automatically.
                      </Text>
                    </div>
                  )}
                </Tabs.Content>

                {/* Base Model Tab */}
                <Tabs.Content value="base-model" className="space-y-6 pt-6">
                  <div className="space-y-4">
                    <Label htmlFor="base_model_select" weight="plus" size="small">
                      Select Base Model
                    </Label>
                    <Select
                      value={formData.base_model || "llama3.2:3b"}
                      onValueChange={(value) => {
                        handleMetadataChange("base_model", value)
                        handleInputChange("base_model", value)
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Select a base model..." />
                      </Select.Trigger>
                      <Select.Content>
                        {availableBaseModels.map((model) => (
                          <Select.Item key={model.name} value={model.model}>
                            {model.name}
                          </Select.Item>
                        ))}
                        {availableBaseModels.length === 0 && (
                          <Select.Item value="" disabled>
                            <div className="flex flex-col items-center justify-center py-4">
                              <ExclamationCircle className="w-6 h-6 text-ui-fg-muted mb-2" />
                              <Text className="txt-small text-ui-fg-muted text-center">
                                No other active models available
                              </Text>
                            </div>
                          </Select.Item>
                        )}
                      </Select.Content>
                    </Select>
                    <Text className="txt-small text-ui-fg-muted">
                      Select an existing AI model to use as base. Only active models are available.
                    </Text>
                  </div>

                  {formData.metadata.base_model && (
                    <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label weight="plus" size="small">
                            Selected Base Model
                          </Label>
                          <Badge size="small" color="blue">
                            Active
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Text className="txt-small font-medium">Model:</Text>
                            <Text className="txt-small">
                              {getBaseModelDisplay(formData.metadata.base_model)}
                            </Text>
                          </div>
                          <div className="flex items-center gap-2">
                            <Text className="txt-small font-medium">ID:</Text>
                            <Badge size="xsmall" color="grey">
                              {formData.metadata.base_model}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-ui-bg-base rounded-lg border border-ui-border-base">
                    <div className="space-y-2">
                      <Label weight="plus" size="small" className="flex items-center gap-2">
                        <ExclamationCircle className="w-4 h-4" />
                        Base Model Inheritance
                      </Label>
                      <Text className="txt-small text-ui-fg-muted">
                        When a base model is selected, this model will inherit the base model's configuration.
                        You can override specific settings in this customization.
                      </Text>
                      <ul className="list-disc pl-4 txt-small text-ui-fg-muted space-y-1">
                        <li>System instructions are combined</li>
                        <li>Parameters can be overridden</li>
                        <li>Messages are appended to base conversations</li>
                      </ul>
                    </div>
                  </div>
                </Tabs.Content>
              </Tabs>
            </Drawer.Body>
          </div>

          <Drawer.Footer className="sticky bottom-0 bg-ui-bg-base border-t">
            <div className="flex items-center justify-end gap-2">
              <Drawer.Close asChild>
                <Button variant="secondary">Cancel</Button>
              </Drawer.Close>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      <AIModelTestDrawer
        open={isChatDrawerOpen}
        onOpenChange={setIsChatDrawerOpen}
        // onSendMessage={handleSendMessage}
        // onUpdateContext={handleUpdateContext}
        initialParameters={model.config}
        initialContext={model}
        model={model}
      />

      <Toaster />
    </div>
  );
};

export default AIModelDetails;