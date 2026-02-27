import { MedusaError } from "@medusajs/utils";
import { createStep, StepResponse } from "@medusajs/workflows-sdk";
// import { DriverDTO } from "../../../modules/delivery/types/common";
import { EmployeeDTO } from "../../../modules/company/types/common";
import {
  CreateDriverInput,
  CreateCompanyEmployeeDTO,
} from "../workflows/create-user";
import { COMPANY_MODULE } from "../../../modules/company";
// import { DELIVERY_MODULE } from "../../../modules/delivery";

type CreateUserStepInput = (CreateCompanyEmployeeDTO | CreateDriverInput) & {
  actor_type: "company" | "driver";
};

type CompensationStepInput = {
  id: string;
  actor_type: string;
};

export const createUserStepId = "create-user-step";
export const createUserStep = createStep(
  createUserStepId,
  async (
    input: CreateUserStepInput,
    { container }
  ): Promise<
    StepResponse<any | 
    // DriverDTO,
     CompensationStepInput>
  > => {
    if (input.actor_type === "company") {
      const service = container.resolve(COMPANY_MODULE);

      const restaurantAdmin = await service.createEmployees(
        input as CreateCompanyEmployeeDTO
      );

      const compensationData = {
        id: restaurantAdmin.id,
        actor_type: "company",
      };

      return new StepResponse(restaurantAdmin, compensationData);
    }

    // if (input.actor_type === "driver") {
    //   const service = container.resolve(DELIVERY_MODULE);

    //   const driver = await service.createDrivers(input as CreateDriverInput);

    //   const driverWithAvatar = await service.updateDrivers({
    //     id: driver.id,
    //     avatar_url: `https://robohash.org/${driver.id}?size=40x40&set=set1&bgset=bg1`,
    //   }) as any;

    //   const compensationData = {
    //     id: driverWithAvatar.id,
    //     actor_type: "driver",
    //   } as any;

    //   return new StepResponse(driverWithAvatar, compensationData);
    // }

    throw MedusaError.Types.INVALID_DATA;
  },
  function ({ id, actor_type }: CompensationStepInput, { container }) {
    if (actor_type === "company") {
      const service = container.resolve(COMPANY_MODULE);

      return service.deleteEmployees(id);
    }

    // if (actor_type === "driver") {
    //   const service = container.resolve(DELIVERY_MODULE);

    //   return service.deleteDrivers(id);
    // }
  }
);
