import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260413235050 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "ai_memory" add column if not exists "isOutputType" text null;`);
    this.addSql(`alter table if exists "ai_memory" rename column "content" to "input";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "ai_memory" drop column if exists "isOutputType";`);

    this.addSql(`alter table if exists "ai_memory" rename column "input" to "content";`);
  }

}
