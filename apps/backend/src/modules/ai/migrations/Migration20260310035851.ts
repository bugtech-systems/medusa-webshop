import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260310035851 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "ai_memory" add column if not exists "metadata" jsonb null;`);
    this.addSql(`alter table if exists "ai_memory" alter column "scope" type text using ("scope"::text);`);
    this.addSql(`alter table if exists "ai_memory" alter column "scope" drop not null;`);
    this.addSql(`alter table if exists "ai_memory" alter column "scope_id" type text using ("scope_id"::text);`);
    this.addSql(`alter table if exists "ai_memory" alter column "scope_id" drop not null;`);
    this.addSql(`alter table if exists "ai_memory" alter column "content" type text using ("content"::text);`);
    this.addSql(`alter table if exists "ai_memory" alter column "content" drop not null;`);
    this.addSql(`alter table if exists "ai_memory" alter column "embedding" type jsonb using ("embedding"::jsonb);`);
    this.addSql(`alter table if exists "ai_memory" alter column "embedding" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "ai_memory" drop column if exists "metadata";`);

    this.addSql(`alter table if exists "ai_memory" alter column "scope" type text using ("scope"::text);`);
    this.addSql(`alter table if exists "ai_memory" alter column "scope" set not null;`);
    this.addSql(`alter table if exists "ai_memory" alter column "scope_id" type text using ("scope_id"::text);`);
    this.addSql(`alter table if exists "ai_memory" alter column "scope_id" set not null;`);
    this.addSql(`alter table if exists "ai_memory" alter column "content" type text using ("content"::text);`);
    this.addSql(`alter table if exists "ai_memory" alter column "content" set not null;`);
    this.addSql(`alter table if exists "ai_memory" alter column "embedding" type jsonb using ("embedding"::jsonb);`);
    this.addSql(`alter table if exists "ai_memory" alter column "embedding" set not null;`);
  }

}
