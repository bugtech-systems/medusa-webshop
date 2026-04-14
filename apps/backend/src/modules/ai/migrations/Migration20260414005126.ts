import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260414005126 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "ai_memory" drop column if exists "input", drop column if exists "isOutputType";`);

    this.addSql(`alter table if exists "ai_memory" add column if not exists "content" text null, add column if not exists "action" text null, add column if not exists "usage_count" integer not null default 0, add column if not exists "success_rate" integer not null default 0, add column if not exists "examples" text[] not null default '{}', add column if not exists "negative_examples" text[] not null default '{}';`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "ai_memory" drop column if exists "content", drop column if exists "action", drop column if exists "usage_count", drop column if exists "success_rate", drop column if exists "examples", drop column if exists "negative_examples";`);

    this.addSql(`alter table if exists "ai_memory" add column if not exists "input" text null, add column if not exists "isOutputType" text null;`);
  }

}
