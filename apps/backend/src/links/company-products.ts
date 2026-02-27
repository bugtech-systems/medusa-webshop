import CompanyModule from "../modules/company";
import ProductModule from "@medusajs/product";
import { defineLink } from "@medusajs/utils";

export default defineLink(
  CompanyModule.linkable.company,
  {
    linkable: ProductModule.linkable.product,
    isList: true,
  }
);
