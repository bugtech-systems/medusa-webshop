import { createRemoteLinkStep } from "@medusajs/core-flows";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/workflows-sdk";
import { APPROVAL_MODULE } from "../../../modules/approval";
import { COMPANY_MODULE } from "../../../modules/company";
import { ModuleCreateCompany } from "../../../types1";
import { createApprovalSettingsStep } from "../../approval/steps/create-approval-settings";
import { createCompaniesStep } from "../steps";

export const createCompanyWorkflow = createWorkflow(
  "create-company",
  function (input: ModuleCreateCompany) {
    const companies = createCompaniesStep([input]);

    const approvalSettings = createApprovalSettingsStep(companies);

    const linkData = transform(approvalSettings, (settings) =>
      settings.map((setting) => ({
        [COMPANY_MODULE]: {
          company_id: setting.company_id,
        },
        [APPROVAL_MODULE]: {
          approval_settings_id: setting.id,
        },
      }))
    );

    createRemoteLinkStep(linkData);

    return new WorkflowResponse(companies);
  }
);
