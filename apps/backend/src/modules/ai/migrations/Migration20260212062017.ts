import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260212062017 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "ai_conversation_session" ("id" text not null, "customer_id" text null, "cart_id" text null, "language" text not null default 'en', "metadata" jsonb null, "context" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_conversation_session_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_conversation_session_deleted_at" ON "ai_conversation_session" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_conversation_message" ("id" text not null, "session_id" text null, "role" text check ("role" in ('system', 'user', 'assistant', 'tool')) not null, "content" text not null, "metadata" jsonb null, "ai_conversation_session_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_conversation_message_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_conversation_message_ai_conversation_session_id" ON "ai_conversation_message" ("ai_conversation_session_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_conversation_message_deleted_at" ON "ai_conversation_message" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_memory" ("id" text not null, "scope" text not null, "scope_id" text not null, "content" text not null, "embedding" jsonb not null, "language" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_memory_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_memory_deleted_at" ON "ai_memory" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_model" ("id" text not null, "name" text not null, "model_name" text not null, "description" text null, "base_model" text null, "status" text null, "version" text null, "handle" text null, "provider" text null, "system" text null, "metadata" jsonb not null, "config" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_model_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_model_deleted_at" ON "ai_model" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "ai_tool_execution" ("id" text not null, "session_id" text not null, "tool_name" text not null, "input" jsonb not null, "output" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "ai_tool_execution_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_ai_tool_execution_deleted_at" ON "ai_tool_execution" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "ai_conversation_message" add constraint "ai_conversation_message_ai_conversation_session_id_foreign" foreign key ("ai_conversation_session_id") references "ai_conversation_session" ("id") on update cascade;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "ai_conversation_message" drop constraint if exists "ai_conversation_message_ai_conversation_session_id_foreign";`);

    this.addSql(`drop table if exists "ai_conversation_session" cascade;`);

    this.addSql(`drop table if exists "ai_conversation_message" cascade;`);

    this.addSql(`drop table if exists "ai_memory" cascade;`);

    this.addSql(`drop table if exists "ai_model" cascade;`);

    this.addSql(`drop table if exists "ai_tool_execution" cascade;`);
  }

}
