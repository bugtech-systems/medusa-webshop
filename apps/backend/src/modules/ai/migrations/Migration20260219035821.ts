import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260219035821 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "ai_conversation_message" add column if not exists "model_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "ai_conversation_message" drop column if exists "model_id";`);
  }

}
