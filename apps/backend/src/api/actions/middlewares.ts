import {
  MiddlewareRoute,
} from "@medusajs/framework";
import { authenticate } from "@medusajs/medusa";
import { authMiddleware } from "../middlewares/auth-middleware";
import { optionalAuthMiddleware } from "../middlewares/optional-auth";

export const actionsMiddlewares: MiddlewareRoute[] = [
  /* Company middlewares */
  {
    method: "ALL",
    matcher: "/actions*",
    middlewares: [optionalAuthMiddleware(), authMiddleware()],
  }
];
