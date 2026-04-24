"use client";

import React, { useState, useEffect } from "react";
import {
    Drawer,
    Tabs,
    Input,
    Label,
    Select,
    Button,
    Badge,

    Textarea,
    IconButton,
    Container,
    Heading,
    Text,
} from "@medusajs/ui";
import { Sparkles, DocumentText } from "@medusajs/icons";
import { Settings } from "lucide-react";
import { useExecuteAction, useExecution } from "../../../../admin/hooks/api/actions";
import { DEFAULT_CONFIG } from "../page";

// Types
interface ChatConfig {
    session_id: string;
    model: string;
    relation_id: string;
    chat_url: string;
    feedback_url: string;
}

interface GenerateParameters {
    temperature: number;
    top_p: number;
    max_tokens: number;
    presence_penalty?: number;
    frequency_penalty?: number;
}

interface ChatSessionConfigDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave?: any;
    config?: any;
    setConfig?: any;
    initialContext?: Record<string, any>;
    initialParameters?: Partial<GenerateParameters>;
    models?: Array<{ name: string; id: string }>;
    actions?: Array<{ id: string; label: string }>;
    isLoading?: boolean;
}

// Default values


const DEFAULT_CONTEXT: Record<string, any> = {
    system_prompt: "You are a helpful assistant.",
    user_info: {
        name: "",
        preferences: {},
    },
    conversation_history: [],
};

const DEFAULT_PARAMETERS: GenerateParameters = {
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 2000,
    presence_penalty: 0,
    frequency_penalty: 0,
};

const RangeSlider = ({
    value,
    onValueChange,
    min,
    max,
    step
}: {
    value: number[]
    onValueChange: (value: number[]) => void
    min: number
    max: number
    step: number
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange([parseFloat(e.target.value)])
    }

    return (
        <div className="relative w-full">
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value[0]}
                onChange={handleChange}
                className="w-full h-2 bg-ui-bg-subtle rounded-lg appearance-none cursor-pointer accent-ui-bg-interactive"
            />
            <div className="flex justify-between mt-1">
                <span className="text-xs text-ui-fg-subtle">{min}</span>
                <span className="text-xs text-ui-fg-subtle">{max}</span>
            </div>
        </div>
    )
}



// Simple JSON Editor component using Textarea
const JSONEditor: React.FC<{
    data: Record<string, any>;
    onChange: (data: Record<string, any>) => void;
    expandLevel?: number;
}> = ({ data, onChange }) => {
    const [jsonString, setJsonString] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setJsonString(JSON.stringify(data, null, 2));
        setError(null);
    }, [data]);

    const handleChange = (value: string) => {
        setJsonString(value);
        try {
            const parsed = JSON.parse(value);
            setError(null);
            onChange(parsed);
        } catch (e) {
            setError((e as Error).message);
        }
    };

    return (
        <div className="w-full">
            <Textarea
                value={jsonString}
                onChange={(e) => handleChange(e.target.value)}
                rows={20}
                className="font-mono text-sm"
                placeholder="Edit JSON context here..."
            />
            {error && (
                <Text className="text-red-500 text-xs mt-2">
                    Invalid JSON: {error}
                </Text>
            )}
        </div>
    );
};

export const ChatSessionConfigDrawer: React.FC<
    ChatSessionConfigDrawerProps
> = ({
    open,
    onOpenChange,
    onSave,
    config,
    setConfig,
    isLoading = false,
}) => {
        const { data: actionRelations, mutateAsync: fetchActionRelations } = useExecuteAction('get-relation-workflows')
        const { data: modelsData, refetch: fetchBaseModels } = useExecution('get-db-models') as any;
        const [activeTab, setActiveTab] = useState<
            "config" | "context" | "parameters"
        >("config");

        const [context, setContext] = useState<Record<string, any>>({});
        const [parameters, setParameters] = useState<GenerateParameters>({});



        // const handleSession = async (id) => {

        //     const res = await fetch(`/actions/session/${id}`, {
        //         method: "GET",
        //         headers: {
        //             "Content-Type": "application/json",
        //         }
        //     })

        //     const json = await res.json()
        //     setConfig({ ...(config?.id ? config : DEFAULT_CONFIG), ...json, ...json.metadata, session_id: id });
        //     setContext({ ...json.context || {} });
        //     setParameters({ ...json.metadata.chat_params });
        // }

        const handleSaveSession = async () => {

            let res = await fetch(`/actions/session/${config?.session_id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: config?.session_id, ...config, context, metadata: { chat_params: parameters, model_id: config.model_id, chat_url: config?.chat_url, feedback_url: config?.feedback_url } })
            })

            let json = await res.json();
            console.log(json, 'SAVVED')
            // await onSave({ config, context, parameters });
            // handleSession(config?.session_id)
            await onSave({ ...json, ...json.metadata });
            localStorage.removeItem('config')


        }
        const handleSession = async (id) => {

            const res = await fetch(`/actions/session/${id}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            })

            const json = await res.json()
            console.log(json, "LATEST SESSION")
            setConfig({ ...config, ...json, ...json.metadata, session_id: id, id });
            setContext({ ...config.context, ...json?.context });
            setParameters({ ...config.chat_params, ...json.metadata?.chat_params });


        }


        // Reset form when drawer opens with new initial values
        useEffect(() => {
            let session_id = localStorage.getItem("session_id") as any;

            if (open) {
                if (session_id) {
                    handleSession(session_id)
                }
                fetchBaseModels();
                fetchActionRelations({ parameters: { id: { "$notnull": true } } })
            }
        }, [open]);

        const handleUpdateParameters = (updates: Partial<GenerateParameters>) => {
            setParameters((prev) => ({ ...prev, ...updates }));
        };



        const handleReset = async () => {
            let session_id = localStorage.getItem("session_id") as any;
            const res = await fetch(`/actions/session/reset`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "session_id": session_id
                }
            })

            const json = await res.json()
            localStorage.setItem('session_id', json.id)
            setConfig({ ...DEFAULT_CONFIG, ...json, session_id: json.id });
            setContext({});
            setParameters({ ...DEFAULT_PARAMETERS });
        };


        let models = modelsData?.data ?? [];
        let actions = actionRelations?.data ? actionRelations?.data : [];


        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <Drawer.Content className="flex flex-col h-[90vh] max-h-[90vh]">
                    {/* HEADER */}
                    <Drawer.Title className="shrink-0 border-b px-6 py-4">
                        <Heading>Chat Session Configuration</Heading>
                        <Text size="small" className="text-ui-fg-subtle">
                            Configure session settings, context data, and generation parameters
                        </Text>
                    </Drawer.Title>

                    {/* TABS CONTAINER */}
                    <Tabs
                        value={activeTab}
                        onValueChange={(value) =>
                            setActiveTab(value as "config" | "context" | "parameters")
                        }
                        className="flex flex-col flex-1 overflow-hidden"
                    >
                        {/* FIXED TAB NAV */}
                        <div className="border-b px-6 shrink-0 bg-ui-bg-base z-10">
                            <Tabs.List>
                                <Tabs.Trigger value="config">
                                    <Sparkles />
                                    Config
                                </Tabs.Trigger>
                                <Tabs.Trigger value="context">
                                    <DocumentText />
                                    Context
                                </Tabs.Trigger>
                                <Tabs.Trigger value="parameters">
                                    <Settings />
                                    Parameters
                                </Tabs.Trigger>
                            </Tabs.List>
                        </div>

                        {/* SCROLLABLE CONTENT */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {/* CONFIG TAB */}
                            <Tabs.Content value="config" className="space-y-6">
                                <div>
                                    <Label htmlFor="session_id">Session ID</Label>
                                    <Input
                                        id="session_id"
                                        value={config.session_id}
                                        onChange={(e) =>
                                            setConfig({ ...config, session_id: e.target.value })
                                        }
                                        placeholder="Enter unique session identifier"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="model_id">AI Model</Label>
                                    <Select
                                        value={config?.model_id}
                                        onValueChange={(value) =>
                                            setConfig({ ...config, model: value, model_id: value })
                                        }
                                    >
                                        <Select.Trigger id="model_id">
                                            <Select.Value placeholder="Select a model" />
                                        </Select.Trigger>
                                        <Select.Content>
                                            {models.map((model) => (
                                                <Select.Item key={model.name} value={model.id}>
                                                    {model.model_name}
                                                </Select.Item>
                                            ))}
                                        </Select.Content>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="relation_id">Relation ID</Label>
                                    <Select
                                        value={config.relation_id}
                                        onValueChange={(value) =>
                                            setConfig({ ...config, relation_id: value })
                                        }
                                    >
                                        <Select.Trigger id="relation_id">
                                            <Select.Value placeholder="Select an action relation" />
                                        </Select.Trigger>
                                        <Select.Content>
                                            {actions.map((action) => (
                                                <Select.Item key={action.id} value={action.id}>
                                                    {action.label}
                                                </Select.Item>
                                            ))}
                                        </Select.Content>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="chat_url">Chat URL</Label>
                                    <Input
                                        id="chat_url"
                                        type="url"
                                        value={config.chat_url}
                                        onChange={(e) =>
                                            setConfig({ ...config, chat_url: e.target.value })
                                        }
                                        placeholder="https://api.example.com/chat"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="feedback_url">Feedback URL</Label>
                                    <Input
                                        id="feedback_url"
                                        type="url"
                                        value={config.feedback_url}
                                        onChange={(e) =>
                                            setConfig({ ...config, feedback_url: e.target.value })
                                        }
                                        placeholder="https://api.example.com/feedback"
                                    />
                                </div>
                            </Tabs.Content>

                            {/* CONTEXT TAB */}
                            <Tabs.Content value="context" className="h-full">
                                <div className="h-full flex flex-col">
                                    <div className="bg-ui-bg-subtle rounded-lg p-4 flex flex-col flex-1 min-h-0">
                                        <div className="flex items-center justify-between mb-3 shrink-0">
                                            <Heading level="h3" className="text-sm font-medium">
                                                Full Context (JSON)
                                            </Heading>
                                            <Badge color="blue" size="small">
                                                Editable
                                            </Badge>
                                        </div>

                                        <div className="flex-1 min-h-0 overflow-auto border rounded-md">
                                            <JSONEditor
                                                data={context}
                                                onChange={(newData) => setContext(newData)}
                                            />
                                        </div>

                                        <Text size="small" className="text-ui-fg-subtle mt-3">
                                            Edit the JSON above to customize conversation context,
                                            system prompts, user information, and other metadata.
                                        </Text>
                                    </div>
                                </div>
                            </Tabs.Content>

                            {/* PARAMETERS TAB */}
                            <Tabs.Content value="parameters" className="space-y-6">
                                <div className="bg-ui-bg-subtle rounded-lg p-6 space-y-6">
                                    <div className="flex items-center gap-2">
                                        <Settings className="text-ui-fg-subtle" />
                                        <Heading level="h3" className="text-sm font-medium">
                                            Model Generation Parameters
                                        </Heading>
                                    </div>

                                    {/* Temperature */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <Label>Temperature</Label>
                                            <Text size="small" className="text-ui-fg-subtle">
                                                {parameters.temperature}
                                            </Text>
                                        </div>
                                        <RangeSlider
                                            value={[parameters.temperature]}
                                            onValueChange={(v) =>
                                                handleUpdateParameters({ temperature: v[0] })
                                            }
                                            min={0}
                                            max={2}
                                            step={0.01}
                                        />
                                        <Text size="small" className="text-ui-fg-subtle">
                                            Controls randomness: Lower = more deterministic, Higher =
                                            more creative
                                        </Text>
                                    </div>

                                    {/* Top P */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <Label>Top P (Nucleus Sampling)</Label>
                                            <Text size="small" className="text-ui-fg-subtle">
                                                {parameters.top_p}
                                            </Text>
                                        </div>
                                        <RangeSlider
                                            value={[parameters.top_p]}
                                            onValueChange={(v) =>
                                                handleUpdateParameters({ top_p: v[0] })
                                            }
                                            min={0}
                                            max={1}
                                            step={0.01}
                                        />
                                        <Text size="small" className="text-ui-fg-subtle">
                                            Limits token selection to top probability mass
                                        </Text>
                                    </div>

                                    {/* Max Tokens */}
                                    <div className="space-y-2">
                                        <Label htmlFor="max_tokens">Max Tokens</Label>
                                        <Input
                                            id="max_tokens"
                                            type="number"
                                            value={parameters.max_tokens}
                                            onChange={(e) =>
                                                handleUpdateParameters({
                                                    max_tokens: parseInt(e.target.value) || 2000,
                                                })
                                            }
                                            min={1}
                                            max={32000}
                                        />
                                        <Text size="small" className="text-ui-fg-subtle">
                                            Maximum number of tokens to generate in the response
                                        </Text>
                                    </div>

                                    {/* Presence Penalty */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <Label>Presence Penalty</Label>
                                            <Text size="small" className="text-ui-fg-subtle">
                                                {parameters.presence_penalty}
                                            </Text>
                                        </div>
                                        <RangeSlider
                                            value={[parameters.presence_penalty || 0]}
                                            onValueChange={(v) =>
                                                handleUpdateParameters({ presence_penalty: v[0] })
                                            }
                                            min={-2}
                                            max={2}
                                            step={0.01}
                                        />
                                        <Text size="small" className="text-ui-fg-subtle">
                                            Penalizes new tokens based on their presence in the text so
                                            far
                                        </Text>
                                    </div>

                                    {/* Frequency Penalty */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <Label>Frequency Penalty</Label>
                                            <Text size="small" className="text-ui-fg-subtle">
                                                {parameters.frequency_penalty}
                                            </Text>
                                        </div>
                                        <RangeSlider
                                            value={[parameters.frequency_penalty || 0]}
                                            onValueChange={(v) =>
                                                handleUpdateParameters({ frequency_penalty: v[0] })
                                            }
                                            min={-2}
                                            max={2}
                                            step={0.01}
                                        />
                                        <Text size="small" className="text-ui-fg-subtle">
                                            Penalizes new tokens based on their frequency in the text
                                            so far
                                        </Text>
                                    </div>
                                </div>
                            </Tabs.Content>
                        </div>
                    </Tabs>

                    {/* FIXED FOOTER */}
                    <Drawer.Footer className="shrink-0 border-t px-6 py-4 flex justify-between">
                        <Button
                            variant="secondary"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Close
                        </Button>

                        <div className="flex gap-2">
                            <Button variant="secondary" onClick={handleReset} disabled={isLoading}>
                                Reset
                            </Button>

                            <Button
                                variant="primary"
                                onClick={handleSaveSession}
                                isLoading={isLoading}
                                disabled={isLoading}
                            >
                                Save Configuration
                            </Button>
                        </div>
                    </Drawer.Footer>
                </Drawer.Content>
            </Drawer>
        );
    };

