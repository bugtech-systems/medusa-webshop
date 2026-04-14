## RAG TABLE

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ai_memory (
    id TEXT PRIMARY KEY,

    scope TEXT,
    scope_id TEXT,

    content TEXT,
    action TEXT,

    embedding VECTOR(768),

    usage_count INTEGER DEFAULT 0,
    success_rate DOUBLE PRECISION DEFAULT 0,

    examples TEXT[] DEFAULT '{}',
    negative_examples TEXT[] DEFAULT '{}',

    language TEXT,

    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);