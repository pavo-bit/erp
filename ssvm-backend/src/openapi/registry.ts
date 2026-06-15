import { OpenAPIRegistry, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { loginSchema, registerSchema, noticeSchema, eventSchema } from "../validators/schemas";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

const LoginSchema = registry.register("LoginInput", loginSchema);
const RegisterSchema = registry.register("RegisterInput", registerSchema);
const NoticeSchema = registry.register("NoticeInput", noticeSchema);
const EventSchema = registry.register("EventInput", eventSchema);

const ErrorResponse = registry.register("ErrorResponse", z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string(),
  instance: z.string(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional()
}));

const BearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

registry.registerPath({
  method: "post",
  path: "/api/v1/auth/login",
  description: "Login user",
  summary: "User login endpoint",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              user: z.any() // Mocking the user response
            })
          })
        }
      }
    },
    401: {
      description: "Invalid credentials",
      content: {
        "application/json": {
          schema: ErrorResponse
        }
      }
    },
    422: {
      description: "Validation Error",
      content: {
        "application/json": {
          schema: ErrorResponse
        }
      }
    }
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/students",
  description: "Get students list",
  summary: "List all students",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Students retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.any()),
          })
        }
      }
    }
  }
});

const InvoiceSchema = registry.register("InvoiceInput", z.object({
  studentId: z.string(),
  amount: z.number().positive(),
  dueDate: z.string().datetime(),
  type: z.enum(["MONTHLY", "ADMISSION", "TRANSPORT", "EXAM", "OTHER"]).default("MONTHLY"),
  description: z.string().optional()
}));

registry.registerPath({
  method: "post",
  path: "/api/v1/invoices",
  description: "Create a new invoice",
  summary: "Create Invoice",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: InvoiceSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "Invoice created successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.any(),
          })
        }
      }
    },
    422: {
      description: "Validation Error",
      content: {
        "application/json": {
          schema: ErrorResponse
        }
      }
    }
  }
});

registry.registerPath({
  method: "get",
  path: "/api/v1/invoices",
  description: "Get list of invoices",
  summary: "List Invoices",
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: "Invoices retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.array(z.any()),
          })
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/webhooks/razorpay",
  description: "Razorpay Webhook Endpoint for payment capture",
  summary: "Razorpay Webhook",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            event: z.string(),
            payload: z.any()
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Webhook processed successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean()
          })
        }
      }
    }
  }
});

// Phase 4-7 Enterprise Endpoints

registry.registerPath({
  method: "post",
  path: "/api/v1/finance/reconcile",
  description: "Bank Reconciliation Engine",
  summary: "Reconcile Bank Statements against Immutable Ledger",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            schoolId: z.string(),
            accountId: z.string(),
            statementDate: z.string().datetime(),
            statementBalance: z.number(),
            lines: z.array(z.any())
          })
        }
      }
    }
  },
  responses: {
    201: {
      description: "Reconciliation Snapshot Created",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: z.any() })
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/crm/leads",
  description: "Capture New Lead",
  summary: "Create CRM Admission Enquiry",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            schoolId: z.string(),
            studentName: z.string(),
            parentName: z.string(),
            phone: z.string(),
            email: z.string()
          })
        }
      }
    }
  },
  responses: {
    201: {
      description: "Lead Created",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: z.any() })
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/admin/governance-workflows/retention-policies",
  description: "Create Data Retention Policy",
  summary: "Configure automated database purges",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            schoolId: z.string(),
            entityName: z.string(),
            retentionDays: z.number(),
            action: z.enum(["PURGE", "ARCHIVE"])
          })
        }
      }
    }
  },
  responses: {
    201: {
      description: "Policy Created",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: z.any() })
        }
      }
    }
  }
});

// Phase 11: Webhooks
registry.registerPath({
  method: "post",
  path: "/api/v1/webhooks",
  description: "Create Webhook Endpoint",
  summary: "Register URL for outgoing events",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            url: z.string().url(),
            events: z.array(z.string()),
            enabled: z.boolean().optional()
          })
        }
      }
    }
  },
  responses: {
    201: {
      description: "Webhook Created",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: z.any() })
        }
      }
    }
  }
});

registry.registerPath({
  method: "post",
  path: "/api/v1/webhooks/razorpay",
  description: "Razorpay Inbound Webhook Listener",
  summary: "Enterprise webhooks endpoint verifying cryptographic signatures",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.any()
        }
      }
    }
  },
  responses: {
    200: {
      description: "Webhook processed successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() })
        }
      }
    }
  }
});
