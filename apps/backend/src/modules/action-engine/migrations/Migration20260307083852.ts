import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260307083852 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "action_connection" ("id" text not null, "source" text not null, "target" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "action_connection_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_action_connection_deleted_at" ON "action_connection" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "action_relation" ("id" text not null, "label" text not null, "action_id" text not null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "action_relation_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_action_relation_deleted_at" ON "action_relation" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "action_template" ("id" text not null, "name" text not null, "description" text null, "status" text null, "handle" text null, "type" text not null default '', "config" jsonb null, "order_index" integer null, "dependencies" jsonb null, "conditions" jsonb null, "output_template" jsonb null, "parameters" jsonb null, "output_as" text null, "context_template" jsonb null, "timeout_seconds" integer not null default 30, "retry_count" integer not null default 0, "fail_fast" boolean not null default true, "pre_hooks" jsonb null, "post_hooks" jsonb null, "success_hooks" jsonb null, "error_hooks" jsonb null, "metadata" jsonb null, "ai_action_templates" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "action_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_action_template_deleted_at" ON "action_template" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "action_view" ("id" text not null, "label" text not null, "description" text null, "parent_id" text null, "type" text null, "handle" text null, "action_id" text null, "metadata" jsonb null, "configuration" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "action_view_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_action_view_deleted_at" ON "action_view" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "execution" ("id" text not null, "workflow_id" text not null, "status" text not null default 'pending', "started_at" timestamptz not null, "completed_at" timestamptz null, "duration_ms" integer null, "input_data" jsonb null, "output_data" jsonb null, "error_message" text null, "created_by" text null, "metadata" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "execution_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_execution_deleted_at" ON "execution" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "action_connection" cascade;`);

    this.addSql(`drop table if exists "action_relation" cascade;`);

    this.addSql(`drop table if exists "action_template" cascade;`);

    this.addSql(`drop table if exists "action_view" cascade;`);

    this.addSql(`drop table if exists "execution" cascade;`);
  }

}
