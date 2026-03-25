import { authenticate, MiddlewareRoute } from "@medusajs/framework";

const isAllowed = (req, res, next) => {
  const { company_id, driver_id } = req?.auth_context?.app_metadata || {};
  if (company_id || driver_id) {
    const user = {
      actor_type: company_id ? "company" : "driver",
      user_id: company_id || driver_id,
    };

    req.user = user;

    next();
  } else {
    res.status(403).json({
      message:
        "Forbidden. Reason: No company_id or driver_id in app_metadata",
    });
  }
};

export const merchantMiddlewares: MiddlewareRoute[] = [
    {
      method: ["GET"],
      matcher: "/store/users/me",
      middlewares: [
        authenticate(["customer", "company", "driver"], "bearer"),
        isAllowed,
      ],
    },
    {
      method: ["POST"],
      matcher: "/store/users",
      middlewares: [
        authenticate(["driver", "company"], "bearer", {
          allowUnregistered: true,
        }),
      ],
    },
    {
      method: ["POST", "DELETE"],
      matcher: "/store/merchants/:id/**",
      middlewares: [authenticate(["company", "admin"], "bearer")],
    },
    {
      matcher: "/store/merchants/:id/admin/**",
      middlewares: [authenticate(["company", "admin"], "bearer")],
    },
  ];
