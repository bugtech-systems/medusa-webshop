import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260404224538 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "ai_conversation_session" drop column if exists "customer_id", drop column if exists "cart_id";`);

    this.addSql(`alter table if exists "ai_conversation_session" add column if not exists "auth_id" text null, add column if not exists "relation_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "ai_conversation_session" drop column if exists "auth_id", drop column if exists "relation_id";`);

    this.addSql(`alter table if exists "ai_conversation_session" add column if not exists "customer_id" text null, add column if not exists "cart_id" text null;`);
  }

}
