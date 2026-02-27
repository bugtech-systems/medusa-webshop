import { MedusaError } from "@medusajs/utils";
import { createStep, StepResponse } from "@medusajs/workflows-sdk";
// import { DriverDTO } from "../../../modules/delivery/types/common";
import { CompanyDTO, EmployeeDTO } from "@/modules/company/types/common";
import {
  UpdateCompanyDTO,
  UpdateEmployeeDTO,
} from "@/modules/company/types/mutations";
import { COMPANY_MODULE } from "../../../modules/company";
// import { DELIVERY_MODULE } from "../../../modules/delivery";

type UpdateUserStepInput = (
  | UpdateCompanyDTO
  | UpdateEmployeeDTO
) & {
  actor_type: "company" | "driver";
};

export const updateUserStepId = "update-user-step";
export const updateUserStep = createStep(
  updateUserStepId,
  async (
    input: UpdateUserStepInput,
    { container }
  ): Promise<
    StepResponse<any | 
    // DriverDTO, 
    UpdateUserStepInput>
  > => {
    const { actor_type, ...data } = input as any;

    if (actor_type === "company") {
      const service = container.resolve(COMPANY_MODULE);

      const compensationData = {
        ...(await service.retrieveEmployee(data.id)),
        actor_type: "company" as "company",
      };

      const restaurantAdmin = await service.updateEmployees(data);

      return new StepResponse(restaurantAdmin, compensationData);
    }

    // if (actor_type === "driver") {
    //   const service = container.resolve(DELIVERY_MODULE);

    //   const compensationData = {
    //     ...(await service.retrieveDriver(data.id)),
    //     actor_type: "driver" as "driver",
    //   } as any;

    //   const driver = await service.updateDrivers(data) as any;

    //   return new StepResponse(driver, compensationData);
    // }

    throw MedusaError.Types.INVALID_DATA;
  },
  function ({ actor_type, ...data }: any, { container }) {
    if (actor_type === "company") {
      const service = container.resolve(COMPANY_MODULE);

      return service.updateEmployees(data);
    }

    // if (actor_type === "driver") {
    //   const service = container.resolve(DELIVERY_MODULE);

    //   return service.updateDrivers(data);
    // }
  }
);
