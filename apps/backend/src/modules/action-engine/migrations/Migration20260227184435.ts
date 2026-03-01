import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260227184435 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "action_view" add column if not exists "description" text null, add column if not exists "parent_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "action_view" drop column if exists "description", drop column if exists "parent_id";`);
  }

}
