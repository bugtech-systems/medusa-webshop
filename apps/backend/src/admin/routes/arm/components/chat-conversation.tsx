"use client";
import React, { useState, useRef, useEffect } from "react";
import {
    Drawer,
    Button,
    IconButton,
    Tooltip,
    Badge,
    Textarea,
    Input,
    Label,
    Select,
    Heading,
    Text,
    Container,
    Tabs,
} from "@medusajs/ui";
import {
    ThumbUp,
    ThumbDown,
    ArrowPath,
    PencilSquare,
    Trash,
    Check,
    XMark,
    Sparkles,
} from "@medusajs/icons";

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export interface Message {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    feedback?: "like" | "dislike" | null;
    fineTuneParams?: FineTuneParams; // stored per message
}

export interface FineTuneParams {
    temperature: number;
    top_p: number;
    max_tokens: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    notes?: string;
}

export interface MessagePair {
    id: string;
    userMessage: Message;
    assistantMessage?: Message;
    systemMessage?: Message;
}

export interface ChatConversationProps {
    /** Initial list of message pairs */
    config?: any;
    setConfig?: any;
    showSystem?: any;
    messagePairs?: MessagePair[];
    setMessagePairs?: any;
    /** Callback when user sends a new message */
    onSendMessage?: (content: string) => Promise<MessagePair>;
    /** Callback to regenerate an assistant response */
    onRegenerate?: (pairId: string) => Promise<any>;
    /** Callback when a message is edited (content and/or fine‑tune params) */
    onEditMessage?: (
        messageId: string,
        newContent: string,
        fineTuneParams?: FineTuneParams
    ) => Promise<void>;
    /** Callback when feedback (like/dislike) is given */
    onFeedback?: (
        messageId: string,
        feedback: "like" | "dislike" | null
    ) => Promise<void>;
    /** Callback when a whole message pair is deleted */
    onDeletePair?: (pairId: string) => Promise<void>;
    /** Whether the chat is in a loading state (e.g. waiting for response) */
    isLoading?: boolean;
}


// Helper function to decide how to render content
const renderMessageContent = (content: any) => {
    // Plain string
    if (typeof content === 'string') {
        return <div className="whitespace-pre-wrap">{content}</div>;
    }
    // Object with a 'message' string field (common in some APIs)
    if (content && typeof content === 'object' && typeof content.message === 'string') {
        return <div className="whitespace-pre-wrap">{content.message}</div>;
    }
    // Any other object/array → JSON viewer
    if (content && typeof content === 'object') {
        return (
            <div className="mt-2 border rounded-md bg-ui-bg-subtle p-2 overflow-auto max-h-96">
                <pre className="text-xs font-mono text-ui-fg-default whitespace-pre-wrap break-all">
                    {JSON.stringify(content, null, 2)}
                </pre>
            </div>
        );
    }
    // Fallback (numbers, booleans, etc.)
    return <div className="whitespace-pre-wrap">{String(content)}</div>;
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


// ----------------------------------------------------------------------
// Helper: message bubble colour (using Medusa UI colour classes)
// ----------------------------------------------------------------------
const getMessageColor = (role: string) => {
    switch (role) {
        case "user":
            return "bg-ui-bg-inverted text-ui-fg-on-inverted border-ui-border-inverted";
        case "assistant":
            return "bg-ui-bg-base text-ui-fg-base border-ui-border-base";
        default:
            return "bg-ui-bg-subtle text-ui-fg-subtle border-ui-border-base";
    }
};

const getMessageLabel = (role: string) => {
    switch (role) {
        case "user":
            return "You";
        case "assistant":
            return "Assistant";
        default:
            return "System";
    }
};

// ----------------------------------------------------------------------
// Edit Drawer – used for both editing message content and fine‑tuning
// ----------------------------------------------------------------------
interface EditDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    message: Message | any;
    onSave: (content: string, params: FineTuneParams) => void;
}

const isValidJson = (value: string) => {
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object";
    } catch {
        return false;
    }
};

const EditMessageDrawer: React.FC<EditDrawerProps> = ({
    open,
    onOpenChange,
    message,
    onSave
}) => {
    const [content, setContent] = useState<string>("");
    const [metadata, setMetadata] = useState<any>({});
    const [activeTab, setActiveTab] = useState<"content" | "metadata">("content");

    const [isJsonContent, setIsJsonContent] = useState(false);

    // Reset when message changes
    useEffect(() => {
        if (message && open) {
            const rawContent = message.content ?? "";
            const isJson = isValidJson(typeof rawContent == 'object' ? JSON.stringify(rawContent) : rawContent);
            console.log(message, 'MESSSA', isJson)


            setIsJsonContent(isJson);
            setContent(rawContent);

            setMetadata(message.metadata ?? {});
        }
    }, [message, open]);

    const handleContentChange = (value: any) => {
        if (typeof value === "string") {
            setContent(value);
        } else {
            setContent(JSON.stringify(value, null, 2));
        }
    };

    const handleSave = () => {
        if (!message) return;

        let finalContent: any = content;

        // If JSON mode, try to normalize before saving
        if (isJsonContent) {
            try {
                finalContent = JSON.parse(content);
            } catch {
                finalContent = content; // fallback safe
            }
        }

        onSave(finalContent, metadata);
        onOpenChange(false);
    };
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <Drawer.Content className="flex flex-col h-full">

                {/* HEADER */}
                <Drawer.Header className="shrink-0">
                    <Heading>Edit Message</Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                        {message?.role === "assistant"
                            ? "Edit assistant response"
                            : "Edit user message"}
                    </Text>
                </Drawer.Header>

                {/* TABS */}
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as any)}
                    className="flex flex-col flex-1 overflow-hidden"
                >

                    {/* TAB HEADER */}
                    <div className="border-b px-6 shrink-0">
                        <Tabs.List>
                            <Tabs.Trigger value="content">Content</Tabs.Trigger>
                            <Tabs.Trigger value="metadata">Metadata</Tabs.Trigger>
                        </Tabs.List>
                    </div>

                    {/* CONTENT AREA */}
                    <div className="flex-1 overflow-y-auto px-6 py-4">

                        {/* CONTENT TAB */}
                        <Tabs.Content value="content" className="h-full">
                            <div className="h-full flex flex-col">

                                <Label className="mb-2">
                                    Message Content {isJsonContent ? "(JSON)" : "(Text)"}
                                </Label>

                                <div className="flex-1 min-h-0">
                                    {isJsonContent ? (
                                        <JSONEditor
                                            data={
                                                (() => {
                                                    try {
                                                        return JSON.parse(content);
                                                    } catch {
                                                        return content;
                                                    }
                                                })()
                                            }
                                            onChange={handleContentChange}
                                            expandLevel={2}
                                        />
                                    ) : (
                                        <Textarea
                                            value={content}
                                            onChange={(e) => setContent(e.target.value)}
                                            className="h-full font-mono"
                                            rows={10}
                                        />
                                    )}
                                </div>
                            </div>
                        </Tabs.Content>

                        {/* METADATA TAB */}
                        <Tabs.Content value="metadata" className="h-full">
                            <div className="h-full flex flex-col">

                                <Label className="mb-2">Message Metadata</Label>

                                <div className="flex-1 min-h-0">
                                    <JSONEditor
                                        data={metadata}
                                        onChange={(newData) => setMetadata(newData)}
                                        expandLevel={2}
                                    />
                                </div>
                            </div>
                        </Tabs.Content>

                    </div>
                </Tabs>

                {/* FOOTER */}
                <Drawer.Footer className="shrink-0 border-t px-6 py-4 flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        <Check />
                        Save changes
                    </Button>
                </Drawer.Footer>

            </Drawer.Content>
        </Drawer>
    );
};

// ----------------------------------------------------------------------
// Main Chat Conversation Component
// ----------------------------------------------------------------------
export const ChatConversation: React.FC<ChatConversationProps> = ({
    showSystem,
    messagePairs = [],
    setMessagePairs,
    onSendMessage,
    onRegenerate,
    onEditMessage,
    onFeedback,
    onDeletePair,
    isLoading = false,
}) => {
    const [inputValue, setInputValue] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
    const [editDrawerOpen, setEditDrawerOpen] = useState(false);
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messagePairs]);

    // Send a new message
    const handleSend = async () => {
        if (!inputValue.trim() || isSending || isLoading) return;
        setIsSending(true);
        try {
            let newPair: MessagePair;
            if (onSendMessage) {
                newPair = await onSendMessage(inputValue);
            } else {
                // Mock: create a temporary pair with a dummy assistant response
                const tempId = Date.now().toString();
                newPair = {
                    id: tempId,
                    userMessage: {
                        id: `${tempId}-user`,
                        role: "user",
                        content: inputValue,
                        timestamp: new Date(),
                    },
                    assistantMessage: {
                        id: `${tempId}-assistant`,
                        role: "assistant",
                        content: "This is a mock response. Implement onSendMessage to connect to your AI.",
                        timestamp: new Date(),
                        feedback: null,
                    },
                };
            }
            setMessagePairs((prev) => [...prev, newPair]);
            setInputValue("");
        } finally {
            setIsSending(false);
        }
    };

    // Regenerate assistant message for a given pair
    const handleRegenerate = async (pairId: string) => {
        console.log(pairId, 'PAIIR')
        if (!onRegenerate) return;
        setIsRegenerating(pairId);
        try {
            const newAssistantMessage = await onRegenerate(pairId);
            setMessagePairs((prev) =>
                prev.map((pair) =>
                    pair.id === pairId
                        ? { ...pair, assistantMessage: newAssistantMessage }
                        : pair
                )
            );
        } finally {
            setIsRegenerating(null);
        }
    };

    // Delete a whole message pair
    const handleDeletePair = async (pairId: string) => {
        if (onDeletePair) {
            await onDeletePair(pairId);
        }
        setMessagePairs((prev) => prev.filter((pair) => pair.id !== pairId));
    };

    // Open edit drawer for a message
    const handleEditMessage = (pair: Message) => {
        setEditingMessage(pair);
        setEditDrawerOpen(true);
    };

    // Save edited message (content + fine‑tune params)
    const handleSaveEdit = async (newContent: string, newParams: FineTuneParams) => {
        if (!editingMessage) return;
        if (onEditMessage) {
            await onEditMessage(editingMessage.id, newContent, newParams);
        }
        // Update local state
        setMessagePairs((prev) =>
            prev.map((pair) => {
                const updatedUser =
                    pair.userMessage.id === editingMessage.id
                        ? { ...pair.userMessage, content: newContent, fineTuneParams: newParams }
                        : pair.userMessage;
                const updatedAssistant =
                    pair.assistantMessage?.id === editingMessage.id
                        ? { ...pair.assistantMessage, content: newContent, fineTuneParams: newParams }
                        : pair.assistantMessage;
                return {
                    ...pair,
                    userMessage: updatedUser,
                    assistantMessage: updatedAssistant,
                };
            })
        );
        setEditingMessage(null);
    };

    // Handle feedback (like/dislike)
    const handleFeedback = async (messageId: string, feedback: "like" | "dislike") => {
        const newFeedback = feedback; // toggle? We'll just set the given value
        if (onFeedback) {
            await onFeedback(messageId, newFeedback);
        }
        setMessagePairs((prev) =>
            prev.map((pair) => {
                if (pair.assistantMessage?.id === messageId) {
                    return {
                        ...pair,
                        assistantMessage: {
                            ...pair.assistantMessage,
                            feedback: pair.assistantMessage.feedback === newFeedback ? null : newFeedback,
                        },
                    };
                }
                return pair;
            })
        );
    };


    return (
        <Container className="flex flex-col h-[80vh] max-h-[80vh] bg-ui-bg-base rounded-lg shadow-elevation-card">
            {/* Message history */}
            <div className="flex-1 p-4 overflow-auto">
                <div className="space-y-6">
                    {messagePairs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-ui-fg-subtle">
                            <Text>How can I help you?</Text>
                        </div>
                    ) : (
                        messagePairs.map((pair: any) => (
                            <div key={pair.id} className="space-y-4">
                                {/* Optional system message */}
                                {(showSystem && pair.systemMessage) && (
                                    <div className="bg-ui-bg-subtle rounded-lg p-3 text-sm text-ui-fg-subtle border">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge size="small" color="grey">
                                                {getMessageLabel("system")}
                                            </Badge>
                                        </div>
                                        <div className="whitespace-pre-wrap">
                                            {pair.systemMessage.content}
                                        </div>
                                    </div>
                                )}

                                {/* User message */}
                                <div
                                    className={`rounded-lg p-4 border ${getMessageColor(
                                        "user"
                                    )} relative group`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge size="small" color="grey">
                                                {getMessageLabel("user")}
                                            </Badge>
                                            <Text size="small" className="text-ui-fg-subtle">
                                                {pair.userMessage.created_at?.toLocaleTimeString()}
                                            </Text>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip content="Edit message">
                                                <IconButton
                                                    size="small"
                                                    variant="transparent"
                                                    onClick={() => handleEditMessage(pair.userMessage)}
                                                >
                                                    <PencilSquare />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip content="Delete conversation">
                                                <IconButton
                                                    size="small"
                                                    variant="transparent"
                                                    onClick={() => handleDeletePair(pair.id)}
                                                >
                                                    <Trash />
                                                </IconButton>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div className="text-black whitespace-pre-wrap">{pair.userMessage.content}</div>
                                </div>

                                {/* Assistant message */}
                                {pair.assistantMessage && (
                                    <div
                                        className={`rounded-lg p-4 border ${getMessageColor(
                                            "assistant"
                                        )} relative group`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge size="small" color="blue">
                                                    {getMessageLabel("assistant")}
                                                </Badge>
                                                <Text size="small" className="text-ui-fg-subtle">
                                                    {pair.assistantMessage.created_at?.toLocaleTimeString()}
                                                </Text>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {/* Feedback buttons */}
                                                <Tooltip content="Like">
                                                    <IconButton
                                                        size="small"
                                                        variant={
                                                            pair.assistantMessage.feedback === "like"
                                                                ? "primary"
                                                                : "transparent"
                                                        }
                                                        onClick={() =>
                                                            handleFeedback(pair!.id, "like")
                                                        }
                                                    >
                                                        <ThumbUp />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip content="Dislike">
                                                    <IconButton
                                                        size="small"
                                                        variant={
                                                            pair.assistantMessage.feedback === "dislike"
                                                                ? "primary"
                                                                : "transparent"
                                                        }
                                                        onClick={() =>
                                                            handleFeedback(pair!.id, "dislike")
                                                        }
                                                    >
                                                        <ThumbDown />
                                                    </IconButton>
                                                </Tooltip>

                                                {/* Regenerate */}
                                                <Tooltip content="Regenerate response">
                                                    <IconButton
                                                        size="small"
                                                        variant="transparent"
                                                        onClick={() => handleRegenerate(pair.id)}
                                                        isLoading={isRegenerating === pair.id}
                                                    >
                                                        <ArrowPath />
                                                    </IconButton>
                                                </Tooltip>

                                                {/* Edit + fine‑tune */}
                                                <Tooltip content="Edit & fine‑tune">
                                                    <IconButton
                                                        size="small"
                                                        variant="transparent"
                                                        onClick={() => handleEditMessage(pair.assistantMessage)}
                                                    >
                                                        <PencilSquare />
                                                    </IconButton>
                                                </Tooltip>
                                            </div>
                                        </div>
                                        <div className="whitespace-pre-wrap">
                                            {renderMessageContent(pair.assistantMessage.content?.message ?? pair.assistantMessage.content)}
                                        </div>
                                        {pair.assistantMessage.fineTuneParams?.notes && (
                                            <div className="mt-2 text-xs text-ui-fg-subtle border-t pt-2">
                                                <span className="font-semibold">Fine‑tune note:</span>{" "}
                                                {pair.assistantMessage.fineTuneParams.notes}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>


            {/* Edit & fine‑tune drawer */}
            <EditMessageDrawer
                open={editDrawerOpen}
                onOpenChange={setEditDrawerOpen}
                message={editingMessage}
                onSave={handleSaveEdit}
            />
        </Container>
    );
};