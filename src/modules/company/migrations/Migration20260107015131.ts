import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260107015131 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_company_deleted_at" ON "company" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "employee" alter column "raw_spending_limit" type jsonb using ("raw_spending_limit"::jsonb);`);
    this.addSql(`alter table if exists "employee" alter column "raw_spending_limit" set default '{"value":"0","precision":20}';`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_employee_deleted_at" ON "employee" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_company_deleted_at";`);

    this.addSql(`drop index if exists "IDX_employee_deleted_at";`);

    this.addSql(`alter table if exists "employee" alter column "raw_spending_limit" drop default;`);
    this.addSql(`alter table if exists "employee" alter column "raw_spending_limit" type jsonb using ("raw_spending_limit"::jsonb);`);
  }

}
