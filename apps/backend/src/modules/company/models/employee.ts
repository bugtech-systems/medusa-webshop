import { model } from "@medusajs/framework/utils";
import { Company } from "./company";

export const Employee = model.define("employee", {
  id: model
    .id({
      prefix: "emp",
    })
    .primaryKey(),
  first_name: model.text().nullable(),
  last_name: model.text().nullable(),
  email: model.text().nullable(),
  avatar_url: model.text().nullable(),
  spending_limit: model.bigNumber().default(0),
  is_admin: model.boolean().default(false),
  company: model.belongsTo(() => Company, {
    mappedBy: "employees",
  }),
});
