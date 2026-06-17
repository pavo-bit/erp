import { registry } from "./registry";
import { z } from "zod";

// Auto-generated generic response schema
const GenericResponse = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional()
});

export function registerGeneratedRoutes() {

  registry.registerPath({
    method: "post",
    path: "/api/v1/2fa/setup",
    description: "Auto-generated endpoint for /api/v1/2fa/setup",
    summary: "POST /api/v1/2fa/setup",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/2fa/verify-setup",
    description: "Auto-generated endpoint for /api/v1/2fa/verify-setup",
    summary: "POST /api/v1/2fa/verify-setup",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/2fa/disable",
    description: "Auto-generated endpoint for /api/v1/2fa/disable",
    summary: "POST /api/v1/2fa/disable",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/2fa/validate",
    description: "Auto-generated endpoint for /api/v1/2fa/validate",
    summary: "POST /api/v1/2fa/validate",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/academic/sessions",
    description: "Auto-generated endpoint for /api/v1/academic/sessions",
    summary: "GET /api/v1/academic/sessions",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/academic/sessions",
    description: "Auto-generated endpoint for /api/v1/academic/sessions",
    summary: "POST /api/v1/academic/sessions",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/academic/classes",
    description: "Auto-generated endpoint for /api/v1/academic/classes",
    summary: "GET /api/v1/academic/classes",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/academic/classes",
    description: "Auto-generated endpoint for /api/v1/academic/classes",
    summary: "POST /api/v1/academic/classes",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/academic/classes/bulk",
    description: "Auto-generated endpoint for /api/v1/academic/classes/bulk",
    summary: "POST /api/v1/academic/classes/bulk",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/academic/sections",
    description: "Auto-generated endpoint for /api/v1/academic/sections",
    summary: "GET /api/v1/academic/sections",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/academic/sections",
    description: "Auto-generated endpoint for /api/v1/academic/sections",
    summary: "POST /api/v1/academic/sections",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/academic/sections/bulk",
    description: "Auto-generated endpoint for /api/v1/academic/sections/bulk",
    summary: "POST /api/v1/academic/sections/bulk",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/academic/class-teachers",
    description: "Auto-generated endpoint for /api/v1/academic/class-teachers",
    summary: "POST /api/v1/academic/class-teachers",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/academic/class-teachers/{sectionId}",
    description: "Auto-generated endpoint for /api/v1/academic/class-teachers/{sectionId}",
    summary: "GET /api/v1/academic/class-teachers/{sectionId}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        sectionId: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/academic/class-teachers/{id}",
    description: "Auto-generated endpoint for /api/v1/academic/class-teachers/{id}",
    summary: "DELETE /api/v1/academic/class-teachers/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/activity",
    description: "Auto-generated endpoint for /api/v1/activity",
    summary: "GET /api/v1/activity",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/admissions",
    description: "Auto-generated endpoint for /api/v1/admissions",
    summary: "GET /api/v1/admissions",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/admissions/apply",
    description: "Auto-generated endpoint for /api/v1/admissions/apply",
    summary: "POST /api/v1/admissions/apply",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/admissions/{id}/review",
    description: "Auto-generated endpoint for /api/v1/admissions/{id}/review",
    summary: "PUT /api/v1/admissions/{id}/review",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/admissions/{id}/enroll",
    description: "Auto-generated endpoint for /api/v1/admissions/{id}/enroll",
    summary: "POST /api/v1/admissions/{id}/enroll",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/admissions/{id}",
    description: "Auto-generated endpoint for /api/v1/admissions/{id}",
    summary: "DELETE /api/v1/admissions/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/alumni",
    description: "Auto-generated endpoint for /api/v1/alumni",
    summary: "GET /api/v1/alumni",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/alumni",
    description: "Auto-generated endpoint for /api/v1/alumni",
    summary: "PUT /api/v1/alumni",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/alumni/contributions",
    description: "Auto-generated endpoint for /api/v1/alumni/contributions",
    summary: "GET /api/v1/alumni/contributions",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/alumni/contributions",
    description: "Auto-generated endpoint for /api/v1/alumni/contributions",
    summary: "POST /api/v1/alumni/contributions",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/assets",
    description: "Auto-generated endpoint for /api/v1/assets",
    summary: "GET /api/v1/assets",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/assets",
    description: "Auto-generated endpoint for /api/v1/assets",
    summary: "POST /api/v1/assets",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/assets/{id}",
    description: "Auto-generated endpoint for /api/v1/assets/{id}",
    summary: "PUT /api/v1/assets/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/assets/{id}",
    description: "Auto-generated endpoint for /api/v1/assets/{id}",
    summary: "DELETE /api/v1/assets/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/assets/{id}/assign",
    description: "Auto-generated endpoint for /api/v1/assets/{id}/assign",
    summary: "POST /api/v1/assets/{id}/assign",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/assets/{id}/assign",
    description: "Auto-generated endpoint for /api/v1/assets/{id}/assign",
    summary: "DELETE /api/v1/assets/{id}/assign",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/assets/{id}/maintenance",
    description: "Auto-generated endpoint for /api/v1/assets/{id}/maintenance",
    summary: "GET /api/v1/assets/{id}/maintenance",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/assets/{id}/maintenance",
    description: "Auto-generated endpoint for /api/v1/assets/{id}/maintenance",
    summary: "POST /api/v1/assets/{id}/maintenance",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/assets/vendors",
    description: "Auto-generated endpoint for /api/v1/assets/vendors",
    summary: "POST /api/v1/assets/vendors",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/assets/vendors/{id}",
    description: "Auto-generated endpoint for /api/v1/assets/vendors/{id}",
    summary: "PUT /api/v1/assets/vendors/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/assets/categories",
    description: "Auto-generated endpoint for /api/v1/assets/categories",
    summary: "POST /api/v1/assets/categories",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/assets/categories/{id}",
    description: "Auto-generated endpoint for /api/v1/assets/categories/{id}",
    summary: "PUT /api/v1/assets/categories/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/assets/stats",
    description: "Auto-generated endpoint for /api/v1/assets/stats",
    summary: "GET /api/v1/assets/stats",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/assets/{id}/transfer",
    description: "Auto-generated endpoint for /api/v1/assets/{id}/transfer",
    summary: "POST /api/v1/assets/{id}/transfer",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/assets/categories",
    description: "Auto-generated endpoint for /api/v1/assets/categories",
    summary: "GET /api/v1/assets/categories",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/assets/vendors",
    description: "Auto-generated endpoint for /api/v1/assets/vendors",
    summary: "GET /api/v1/assets/vendors",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/assignments",
    description: "Auto-generated endpoint for /api/v1/assignments",
    summary: "GET /api/v1/assignments",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/assignments",
    description: "Auto-generated endpoint for /api/v1/assignments",
    summary: "POST /api/v1/assignments",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/assignments/{id}/submit",
    description: "Auto-generated endpoint for /api/v1/assignments/{id}/submit",
    summary: "POST /api/v1/assignments/{id}/submit",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/assignments/submissions/{submissionId}/grade",
    description: "Auto-generated endpoint for /api/v1/assignments/submissions/{submissionId}/grade",
    summary: "POST /api/v1/assignments/submissions/{submissionId}/grade",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        submissionId: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/assignments/study-materials",
    description: "Auto-generated endpoint for /api/v1/assignments/study-materials",
    summary: "GET /api/v1/assignments/study-materials",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/attendance",
    description: "Auto-generated endpoint for /api/v1/attendance",
    summary: "GET /api/v1/attendance",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/attendance",
    description: "Auto-generated endpoint for /api/v1/attendance",
    summary: "POST /api/v1/attendance",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/attendance/teachers",
    description: "Auto-generated endpoint for /api/v1/attendance/teachers",
    summary: "GET /api/v1/attendance/teachers",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/attendance/teachers",
    description: "Auto-generated endpoint for /api/v1/attendance/teachers",
    summary: "POST /api/v1/attendance/teachers",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/login",
    description: "Auto-generated endpoint for /api/v1/auth/login",
    summary: "POST /api/v1/auth/login",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/student/login",
    description: "Auto-generated endpoint for /api/v1/auth/student/login",
    summary: "POST /api/v1/auth/student/login",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/refresh",
    description: "Auto-generated endpoint for /api/v1/auth/refresh",
    summary: "POST /api/v1/auth/refresh",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/logout",
    description: "Auto-generated endpoint for /api/v1/auth/logout",
    summary: "POST /api/v1/auth/logout",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/logout/all",
    description: "Auto-generated endpoint for /api/v1/auth/logout/all",
    summary: "POST /api/v1/auth/logout/all",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/auth/sessions",
    description: "Auto-generated endpoint for /api/v1/auth/sessions",
    summary: "GET /api/v1/auth/sessions",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/auth/sessions/{id}",
    description: "Auto-generated endpoint for /api/v1/auth/sessions/{id}",
    summary: "DELETE /api/v1/auth/sessions/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/revoke-session",
    description: "Auto-generated endpoint for /api/v1/auth/revoke-session",
    summary: "POST /api/v1/auth/revoke-session",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/alumni/register",
    description: "Auto-generated endpoint for /api/v1/auth/alumni/register",
    summary: "POST /api/v1/auth/alumni/register",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/register",
    description: "Auto-generated endpoint for /api/v1/auth/register",
    summary: "POST /api/v1/auth/register",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/auth/me",
    description: "Auto-generated endpoint for /api/v1/auth/me",
    summary: "GET /api/v1/auth/me",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/auth/events",
    description: "Auto-generated endpoint for /api/v1/auth/events",
    summary: "GET /api/v1/auth/events",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/change-password",
    description: "Auto-generated endpoint for /api/v1/auth/change-password",
    summary: "POST /api/v1/auth/change-password",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/backups/status",
    description: "Auto-generated endpoint for /api/v1/backups/status",
    summary: "GET /api/v1/backups/status",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/backups/trigger",
    description: "Auto-generated endpoint for /api/v1/backups/trigger",
    summary: "POST /api/v1/backups/trigger",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/backups/{id}/download",
    description: "Auto-generated endpoint for /api/v1/backups/{id}/download",
    summary: "GET /api/v1/backups/{id}/download",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/branches",
    description: "Auto-generated endpoint for /api/v1/branches",
    summary: "GET /api/v1/branches",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/branches",
    description: "Auto-generated endpoint for /api/v1/branches",
    summary: "POST /api/v1/branches",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/branches/{id}",
    description: "Auto-generated endpoint for /api/v1/branches/{id}",
    summary: "PUT /api/v1/branches/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/branches/{id}",
    description: "Auto-generated endpoint for /api/v1/branches/{id}",
    summary: "DELETE /api/v1/branches/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/bulk/upload",
    description: "Auto-generated endpoint for /api/v1/bulk/upload",
    summary: "POST /api/v1/bulk/upload",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/bulk/jobs",
    description: "Auto-generated endpoint for /api/v1/bulk/jobs",
    summary: "GET /api/v1/bulk/jobs",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/bulk/jobs/{id}",
    description: "Auto-generated endpoint for /api/v1/bulk/jobs/{id}",
    summary: "GET /api/v1/bulk/jobs/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/certificates/templates",
    description: "Auto-generated endpoint for /api/v1/certificates/templates",
    summary: "GET /api/v1/certificates/templates",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/certificates/issue",
    description: "Auto-generated endpoint for /api/v1/certificates/issue",
    summary: "POST /api/v1/certificates/issue",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/certificates/verify/{certNo}",
    description: "Auto-generated endpoint for /api/v1/certificates/verify/{certNo}",
    summary: "GET /api/v1/certificates/verify/{certNo}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        certNo: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/cms/testimonials",
    description: "Auto-generated endpoint for /api/v1/cms/testimonials",
    summary: "GET /api/v1/cms/testimonials",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/cms/testimonials",
    description: "Auto-generated endpoint for /api/v1/cms/testimonials",
    summary: "POST /api/v1/cms/testimonials",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/cms/site-content",
    description: "Auto-generated endpoint for /api/v1/cms/site-content",
    summary: "GET /api/v1/cms/site-content",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/cms/site-content",
    description: "Auto-generated endpoint for /api/v1/cms/site-content",
    summary: "PUT /api/v1/cms/site-content",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/cms/analytics",
    description: "Auto-generated endpoint for /api/v1/cms/analytics",
    summary: "GET /api/v1/cms/analytics",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/communications/templates",
    description: "Auto-generated endpoint for /api/v1/communications/templates",
    summary: "GET /api/v1/communications/templates",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/communications/templates",
    description: "Auto-generated endpoint for /api/v1/communications/templates",
    summary: "POST /api/v1/communications/templates",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/communications/send",
    description: "Auto-generated endpoint for /api/v1/communications/send",
    summary: "POST /api/v1/communications/send",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/communications/logs",
    description: "Auto-generated endpoint for /api/v1/communications/logs",
    summary: "GET /api/v1/communications/logs",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/crm/leads",
    description: "Auto-generated endpoint for /api/v1/crm/leads",
    summary: "POST /api/v1/crm/leads",
    
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/crm/leads/{id}/interactions",
    description: "Auto-generated endpoint for /api/v1/crm/leads/{id}/interactions",
    summary: "POST /api/v1/crm/leads/{id}/interactions",
    
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/crm/leads/{id}/stage",
    description: "Auto-generated endpoint for /api/v1/crm/leads/{id}/stage",
    summary: "PUT /api/v1/crm/leads/{id}/stage",
    
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/crm/pipeline",
    description: "Auto-generated endpoint for /api/v1/crm/pipeline",
    summary: "GET /api/v1/crm/pipeline",
    
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/discipline/incidents",
    description: "Auto-generated endpoint for /api/v1/discipline/incidents",
    summary: "GET /api/v1/discipline/incidents",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/discipline/incidents",
    description: "Auto-generated endpoint for /api/v1/discipline/incidents",
    summary: "POST /api/v1/discipline/incidents",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/discipline/incidents/{id}/resolve",
    description: "Auto-generated endpoint for /api/v1/discipline/incidents/{id}/resolve",
    summary: "PUT /api/v1/discipline/incidents/{id}/resolve",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/discipline/incidents/student/{id}",
    description: "Auto-generated endpoint for /api/v1/discipline/incidents/student/{id}",
    summary: "GET /api/v1/discipline/incidents/student/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/documents",
    description: "Auto-generated endpoint for /api/v1/documents",
    summary: "GET /api/v1/documents",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/documents/upload",
    description: "Auto-generated endpoint for /api/v1/documents/upload",
    summary: "POST /api/v1/documents/upload",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/documents/{id}",
    description: "Auto-generated endpoint for /api/v1/documents/{id}",
    summary: "GET /api/v1/documents/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/documents/{id}",
    description: "Auto-generated endpoint for /api/v1/documents/{id}",
    summary: "DELETE /api/v1/documents/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/documents/{id}/verify",
    description: "Auto-generated endpoint for /api/v1/documents/{id}/verify",
    summary: "PUT /api/v1/documents/{id}/verify",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/events",
    description: "Auto-generated endpoint for /api/v1/events",
    summary: "GET /api/v1/events",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/events",
    description: "Auto-generated endpoint for /api/v1/events",
    summary: "POST /api/v1/events",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/events/{id}",
    description: "Auto-generated endpoint for /api/v1/events/{id}",
    summary: "PUT /api/v1/events/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/events/{id}",
    description: "Auto-generated endpoint for /api/v1/events/{id}",
    summary: "DELETE /api/v1/events/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/exams",
    description: "Auto-generated endpoint for /api/v1/exams",
    summary: "GET /api/v1/exams",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/exams",
    description: "Auto-generated endpoint for /api/v1/exams",
    summary: "POST /api/v1/exams",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/exams/{id}",
    description: "Auto-generated endpoint for /api/v1/exams/{id}",
    summary: "PUT /api/v1/exams/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/exams/{id}/marks",
    description: "Auto-generated endpoint for /api/v1/exams/{id}/marks",
    summary: "POST /api/v1/exams/{id}/marks",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/exams/{examId}/report-card/{studentId}",
    description: "Auto-generated endpoint for /api/v1/exams/{examId}/report-card/{studentId}",
    summary: "GET /api/v1/exams/{examId}/report-card/{studentId}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        examId: z.string(),
        studentId: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/exams/{id}",
    description: "Auto-generated endpoint for /api/v1/exams/{id}",
    summary: "DELETE /api/v1/exams/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/finance-governance/periods/{id}/close",
    description: "Auto-generated endpoint for /api/v1/finance-governance/periods/{id}/close",
    summary: "POST /api/v1/finance-governance/periods/{id}/close",
    
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/finance-governance/reconcile",
    description: "Auto-generated endpoint for /api/v1/finance-governance/reconcile",
    summary: "POST /api/v1/finance-governance/reconcile",
    
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/finance-reconciliation",
    description: "Auto-generated endpoint for /api/v1/finance-reconciliation",
    summary: "GET /api/v1/finance-reconciliation",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/finance-reconciliation/unmatched",
    description: "Auto-generated endpoint for /api/v1/finance-reconciliation/unmatched",
    summary: "GET /api/v1/finance-reconciliation/unmatched",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/finance-reconciliation/manual-match",
    description: "Auto-generated endpoint for /api/v1/finance-reconciliation/manual-match",
    summary: "POST /api/v1/finance-reconciliation/manual-match",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/finance-reconciliation/trigger",
    description: "Auto-generated endpoint for /api/v1/finance-reconciliation/trigger",
    summary: "POST /api/v1/finance-reconciliation/trigger",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/finance/defaulters",
    description: "Auto-generated endpoint for /api/v1/finance/defaulters",
    summary: "GET /api/v1/finance/defaulters",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/finance/generate-monthly-fees",
    description: "Auto-generated endpoint for /api/v1/finance/generate-monthly-fees",
    summary: "POST /api/v1/finance/generate-monthly-fees",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/finance/ledger/trial-balance",
    description: "Auto-generated endpoint for /api/v1/finance/ledger/trial-balance",
    summary: "GET /api/v1/finance/ledger/trial-balance",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/finance/ledger/profit-loss",
    description: "Auto-generated endpoint for /api/v1/finance/ledger/profit-loss",
    summary: "GET /api/v1/finance/ledger/profit-loss",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/gallery",
    description: "Auto-generated endpoint for /api/v1/gallery",
    summary: "GET /api/v1/gallery",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/gallery",
    description: "Auto-generated endpoint for /api/v1/gallery",
    summary: "POST /api/v1/gallery",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/gallery/{id}",
    description: "Auto-generated endpoint for /api/v1/gallery/{id}",
    summary: "DELETE /api/v1/gallery/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/guardians/me/students",
    description: "Auto-generated endpoint for /api/v1/guardians/me/students",
    summary: "GET /api/v1/guardians/me/students",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/guardians/me/fees",
    description: "Auto-generated endpoint for /api/v1/guardians/me/fees",
    summary: "GET /api/v1/guardians/me/fees",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/health",
    description: "Auto-generated endpoint for /api/v1/health",
    summary: "GET /api/v1/health",
    
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/hr/salaries",
    description: "Auto-generated endpoint for /api/v1/hr/salaries",
    summary: "GET /api/v1/hr/salaries",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/hr/salaries",
    description: "Auto-generated endpoint for /api/v1/hr/salaries",
    summary: "POST /api/v1/hr/salaries",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/hr/payroll/generate",
    description: "Auto-generated endpoint for /api/v1/hr/payroll/generate",
    summary: "POST /api/v1/hr/payroll/generate",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/hr/salaries/{id}/pay",
    description: "Auto-generated endpoint for /api/v1/hr/salaries/{id}/pay",
    summary: "PUT /api/v1/hr/salaries/{id}/pay",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/hr/payslips/{teacherId}",
    description: "Auto-generated endpoint for /api/v1/hr/payslips/{teacherId}",
    summary: "GET /api/v1/hr/payslips/{teacherId}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        teacherId: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/hr/leaves",
    description: "Auto-generated endpoint for /api/v1/hr/leaves",
    summary: "GET /api/v1/hr/leaves",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/hr/leaves",
    description: "Auto-generated endpoint for /api/v1/hr/leaves",
    summary: "POST /api/v1/hr/leaves",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/hr/leaves/{id}",
    description: "Auto-generated endpoint for /api/v1/hr/leaves/{id}",
    summary: "PUT /api/v1/hr/leaves/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/inventory/movements",
    description: "Auto-generated endpoint for /api/v1/inventory/movements",
    summary: "POST /api/v1/inventory/movements",
    
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/inventory/stocks",
    description: "Auto-generated endpoint for /api/v1/inventory/stocks",
    summary: "GET /api/v1/inventory/stocks",
    
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/invoices",
    description: "Auto-generated endpoint for /api/v1/invoices",
    summary: "GET /api/v1/invoices",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/invoices",
    description: "Auto-generated endpoint for /api/v1/invoices",
    summary: "POST /api/v1/invoices",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/invoices/{id}/pay",
    description: "Auto-generated endpoint for /api/v1/invoices/{id}/pay",
    summary: "PUT /api/v1/invoices/{id}/pay",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/library/books",
    description: "Auto-generated endpoint for /api/v1/library/books",
    summary: "GET /api/v1/library/books",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/library/books",
    description: "Auto-generated endpoint for /api/v1/library/books",
    summary: "POST /api/v1/library/books",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/library/books/{id}",
    description: "Auto-generated endpoint for /api/v1/library/books/{id}",
    summary: "PUT /api/v1/library/books/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/library/books/{id}",
    description: "Auto-generated endpoint for /api/v1/library/books/{id}",
    summary: "DELETE /api/v1/library/books/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/library/issues",
    description: "Auto-generated endpoint for /api/v1/library/issues",
    summary: "POST /api/v1/library/issues",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/library/issues/{id}/return",
    description: "Auto-generated endpoint for /api/v1/library/issues/{id}/return",
    summary: "POST /api/v1/library/issues/{id}/return",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/library/issues/{id}/waive-fine",
    description: "Auto-generated endpoint for /api/v1/library/issues/{id}/waive-fine",
    summary: "PUT /api/v1/library/issues/{id}/waive-fine",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/library/issues",
    description: "Auto-generated endpoint for /api/v1/library/issues",
    summary: "GET /api/v1/library/issues",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/library/overdue",
    description: "Auto-generated endpoint for /api/v1/library/overdue",
    summary: "GET /api/v1/library/overdue",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/library/fines/calculate",
    description: "Auto-generated endpoint for /api/v1/library/fines/calculate",
    summary: "POST /api/v1/library/fines/calculate",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/messages/threads",
    description: "Auto-generated endpoint for /api/v1/messages/threads",
    summary: "GET /api/v1/messages/threads",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/messages/{threadId}",
    description: "Auto-generated endpoint for /api/v1/messages/{threadId}",
    summary: "GET /api/v1/messages/{threadId}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        threadId: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/messages/threads",
    description: "Auto-generated endpoint for /api/v1/messages/threads",
    summary: "POST /api/v1/messages/threads",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/messages/{threadId}",
    description: "Auto-generated endpoint for /api/v1/messages/{threadId}",
    summary: "POST /api/v1/messages/{threadId}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        threadId: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/messages/{threadId}/read",
    description: "Auto-generated endpoint for /api/v1/messages/{threadId}/read",
    summary: "PUT /api/v1/messages/{threadId}/read",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        threadId: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/mobile/config",
    description: "Auto-generated endpoint for /api/v1/mobile/config",
    summary: "GET /api/v1/mobile/config",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/mobile/devices",
    description: "Auto-generated endpoint for /api/v1/mobile/devices",
    summary: "POST /api/v1/mobile/devices",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/mobile/devices/{token}",
    description: "Auto-generated endpoint for /api/v1/mobile/devices/{token}",
    summary: "DELETE /api/v1/mobile/devices/{token}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        token: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/mobile/config/{platform}",
    description: "Auto-generated endpoint for /api/v1/mobile/config/{platform}",
    summary: "PUT /api/v1/mobile/config/{platform}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        platform: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/notices",
    description: "Auto-generated endpoint for /api/v1/notices",
    summary: "GET /api/v1/notices",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/notices",
    description: "Auto-generated endpoint for /api/v1/notices",
    summary: "POST /api/v1/notices",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/notices/{id}",
    description: "Auto-generated endpoint for /api/v1/notices/{id}",
    summary: "GET /api/v1/notices/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/notices/{id}",
    description: "Auto-generated endpoint for /api/v1/notices/{id}",
    summary: "PUT /api/v1/notices/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/notices/{id}",
    description: "Auto-generated endpoint for /api/v1/notices/{id}",
    summary: "DELETE /api/v1/notices/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/notifications/send",
    description: "Auto-generated endpoint for /api/v1/notifications/send",
    summary: "POST /api/v1/notifications/send",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/notifications/bulk",
    description: "Auto-generated endpoint for /api/v1/notifications/bulk",
    summary: "POST /api/v1/notifications/bulk",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/notifications",
    description: "Auto-generated endpoint for /api/v1/notifications",
    summary: "GET /api/v1/notifications",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/notifications/fee-reminder",
    description: "Auto-generated endpoint for /api/v1/notifications/fee-reminder",
    summary: "POST /api/v1/notifications/fee-reminder",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/notifications/templates",
    description: "Auto-generated endpoint for /api/v1/notifications/templates",
    summary: "GET /api/v1/notifications/templates",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/notifications/templates",
    description: "Auto-generated endpoint for /api/v1/notifications/templates",
    summary: "POST /api/v1/notifications/templates",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/notifications/templates/{id}",
    description: "Auto-generated endpoint for /api/v1/notifications/templates/{id}",
    summary: "PUT /api/v1/notifications/templates/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/notifications/templates/{id}",
    description: "Auto-generated endpoint for /api/v1/notifications/templates/{id}",
    summary: "DELETE /api/v1/notifications/templates/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/payments/create-order",
    description: "Auto-generated endpoint for /api/v1/payments/create-order",
    summary: "POST /api/v1/payments/create-order",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/payments/verify",
    description: "Auto-generated endpoint for /api/v1/payments/verify",
    summary: "POST /api/v1/payments/verify",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/payments/trigger-late-fines",
    description: "Auto-generated endpoint for /api/v1/payments/trigger-late-fines",
    summary: "POST /api/v1/payments/trigger-late-fines",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/payments/webhook",
    description: "Auto-generated endpoint for /api/v1/payments/webhook",
    summary: "POST /api/v1/payments/webhook",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/preferences",
    description: "Auto-generated endpoint for /api/v1/preferences",
    summary: "GET /api/v1/preferences",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/preferences",
    description: "Auto-generated endpoint for /api/v1/preferences",
    summary: "PUT /api/v1/preferences",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/preferences/consent",
    description: "Auto-generated endpoint for /api/v1/preferences/consent",
    summary: "POST /api/v1/preferences/consent",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/preferences/consent",
    description: "Auto-generated endpoint for /api/v1/preferences/consent",
    summary: "GET /api/v1/preferences/consent",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/procurement/requests",
    description: "Auto-generated endpoint for /api/v1/procurement/requests",
    summary: "POST /api/v1/procurement/requests",
    
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/procurement/requests/{id}/approve",
    description: "Auto-generated endpoint for /api/v1/procurement/requests/{id}/approve",
    summary: "POST /api/v1/procurement/requests/{id}/approve",
    
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/procurement/orders/{id}/receive",
    description: "Auto-generated endpoint for /api/v1/procurement/orders/{id}/receive",
    summary: "POST /api/v1/procurement/orders/{id}/receive",
    
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/reception/enquiries",
    description: "Auto-generated endpoint for /api/v1/reception/enquiries",
    summary: "GET /api/v1/reception/enquiries",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/reception/enquiries",
    description: "Auto-generated endpoint for /api/v1/reception/enquiries",
    summary: "POST /api/v1/reception/enquiries",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/reception/enquiries/{id}",
    description: "Auto-generated endpoint for /api/v1/reception/enquiries/{id}",
    summary: "PUT /api/v1/reception/enquiries/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/reception/visitors",
    description: "Auto-generated endpoint for /api/v1/reception/visitors",
    summary: "GET /api/v1/reception/visitors",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/reception/visitors",
    description: "Auto-generated endpoint for /api/v1/reception/visitors",
    summary: "POST /api/v1/reception/visitors",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/reception/visitors/{id}",
    description: "Auto-generated endpoint for /api/v1/reception/visitors/{id}",
    summary: "PUT /api/v1/reception/visitors/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/reception/complaints",
    description: "Auto-generated endpoint for /api/v1/reception/complaints",
    summary: "GET /api/v1/reception/complaints",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/reception/complaints",
    description: "Auto-generated endpoint for /api/v1/reception/complaints",
    summary: "POST /api/v1/reception/complaints",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/reception/complaints/{id}",
    description: "Auto-generated endpoint for /api/v1/reception/complaints/{id}",
    summary: "PUT /api/v1/reception/complaints/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/reception/calls",
    description: "Auto-generated endpoint for /api/v1/reception/calls",
    summary: "GET /api/v1/reception/calls",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/reception/calls",
    description: "Auto-generated endpoint for /api/v1/reception/calls",
    summary: "POST /api/v1/reception/calls",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/reception/calls/{id}",
    description: "Auto-generated endpoint for /api/v1/reception/calls/{id}",
    summary: "PUT /api/v1/reception/calls/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/reports/generate/receipt",
    description: "Auto-generated endpoint for /api/v1/reports/generate/receipt",
    summary: "POST /api/v1/reports/generate/receipt",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/reports/generate/report-card",
    description: "Auto-generated endpoint for /api/v1/reports/generate/report-card",
    summary: "POST /api/v1/reports/generate/report-card",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/reports/export/attendance",
    description: "Auto-generated endpoint for /api/v1/reports/export/attendance",
    summary: "GET /api/v1/reports/export/attendance",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/results",
    description: "Auto-generated endpoint for /api/v1/results",
    summary: "GET /api/v1/results",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/results",
    description: "Auto-generated endpoint for /api/v1/results",
    summary: "POST /api/v1/results",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/saas/request",
    description: "Auto-generated endpoint for /api/v1/saas/request",
    summary: "POST /api/v1/saas/request",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/saas/requests",
    description: "Auto-generated endpoint for /api/v1/saas/requests",
    summary: "GET /api/v1/saas/requests",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/saas/approve/{id}",
    description: "Auto-generated endpoint for /api/v1/saas/approve/{id}",
    summary: "POST /api/v1/saas/approve/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/saas/reject/{id}",
    description: "Auto-generated endpoint for /api/v1/saas/reject/{id}",
    summary: "POST /api/v1/saas/reject/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/finance/scholarships",
    description: "Auto-generated endpoint for /api/v1/finance/scholarships",
    summary: "GET /api/v1/finance/scholarships",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/finance/scholarships",
    description: "Auto-generated endpoint for /api/v1/finance/scholarships",
    summary: "POST /api/v1/finance/scholarships",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/finance/scholarships/{id}/approve",
    description: "Auto-generated endpoint for /api/v1/finance/scholarships/{id}/approve",
    summary: "PUT /api/v1/finance/scholarships/{id}/approve",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/finance/scholarships/{id}/reject",
    description: "Auto-generated endpoint for /api/v1/finance/scholarships/{id}/reject",
    summary: "PUT /api/v1/finance/scholarships/{id}/reject",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/schools",
    description: "Auto-generated endpoint for /api/v1/schools",
    summary: "GET /api/v1/schools",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/schools/{id}",
    description: "Auto-generated endpoint for /api/v1/schools/{id}",
    summary: "GET /api/v1/schools/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/schools",
    description: "Auto-generated endpoint for /api/v1/schools",
    summary: "POST /api/v1/schools",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/schools/{id}/setup",
    description: "Auto-generated endpoint for /api/v1/schools/{id}/setup",
    summary: "POST /api/v1/schools/{id}/setup",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/schools/{id}",
    description: "Auto-generated endpoint for /api/v1/schools/{id}",
    summary: "PUT /api/v1/schools/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/schools/{id}/onboarding",
    description: "Auto-generated endpoint for /api/v1/schools/{id}/onboarding",
    summary: "GET /api/v1/schools/{id}/onboarding",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/schools/{id}/onboarding",
    description: "Auto-generated endpoint for /api/v1/schools/{id}/onboarding",
    summary: "PUT /api/v1/schools/{id}/onboarding",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/schools/{id}",
    description: "Auto-generated endpoint for /api/v1/schools/{id}",
    summary: "DELETE /api/v1/schools/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/schools/{id}/stats",
    description: "Auto-generated endpoint for /api/v1/schools/{id}/stats",
    summary: "GET /api/v1/schools/{id}/stats",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/search",
    description: "Auto-generated endpoint for /api/v1/search",
    summary: "GET /api/v1/search",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/security/quarantine",
    description: "Auto-generated endpoint for /api/v1/security/quarantine",
    summary: "GET /api/v1/security/quarantine",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/security/quarantine/{id}/release",
    description: "Auto-generated endpoint for /api/v1/security/quarantine/{id}/release",
    summary: "POST /api/v1/security/quarantine/{id}/release",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/security/quarantine/{id}",
    description: "Auto-generated endpoint for /api/v1/security/quarantine/{id}",
    summary: "DELETE /api/v1/security/quarantine/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/sessions",
    description: "Auto-generated endpoint for /api/v1/sessions",
    summary: "GET /api/v1/sessions",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/sessions/{sessionId}",
    description: "Auto-generated endpoint for /api/v1/sessions/{sessionId}",
    summary: "DELETE /api/v1/sessions/{sessionId}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        sessionId: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/sessions/logout-all",
    description: "Auto-generated endpoint for /api/v1/sessions/logout-all",
    summary: "POST /api/v1/sessions/logout-all",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/sse",
    description: "Auto-generated endpoint for /api/v1/sse",
    summary: "GET /api/v1/sse",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/stats/public",
    description: "Auto-generated endpoint for /api/v1/stats/public",
    summary: "GET /api/v1/stats/public",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/stats/detailed",
    description: "Auto-generated endpoint for /api/v1/stats/detailed",
    summary: "GET /api/v1/stats/detailed",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/stats/activity-feed",
    description: "Auto-generated endpoint for /api/v1/stats/activity-feed",
    summary: "GET /api/v1/stats/activity-feed",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/stats/finance",
    description: "Auto-generated endpoint for /api/v1/stats/finance",
    summary: "GET /api/v1/stats/finance",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/storage/upload",
    description: "Auto-generated endpoint for /api/v1/storage/upload",
    summary: "POST /api/v1/storage/upload",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/storage/signed-url",
    description: "Auto-generated endpoint for /api/v1/storage/signed-url",
    summary: "GET /api/v1/storage/signed-url",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/students/me",
    description: "Auto-generated endpoint for /api/v1/students/me",
    summary: "GET /api/v1/students/me",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/students",
    description: "Auto-generated endpoint for /api/v1/students",
    summary: "POST /api/v1/students",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/students",
    description: "Auto-generated endpoint for /api/v1/students",
    summary: "GET /api/v1/students",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/students/{id}",
    description: "Auto-generated endpoint for /api/v1/students/{id}",
    summary: "GET /api/v1/students/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/students/{id}",
    description: "Auto-generated endpoint for /api/v1/students/{id}",
    summary: "PUT /api/v1/students/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/subscriptions/plans",
    description: "Auto-generated endpoint for /api/v1/subscriptions/plans",
    summary: "GET /api/v1/subscriptions/plans",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/subscriptions/stats",
    description: "Auto-generated endpoint for /api/v1/subscriptions/stats",
    summary: "GET /api/v1/subscriptions/stats",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/subscriptions/plans",
    description: "Auto-generated endpoint for /api/v1/subscriptions/plans",
    summary: "POST /api/v1/subscriptions/plans",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/subscriptions/plans/{id}",
    description: "Auto-generated endpoint for /api/v1/subscriptions/plans/{id}",
    summary: "PUT /api/v1/subscriptions/plans/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/subscriptions/plans/{id}",
    description: "Auto-generated endpoint for /api/v1/subscriptions/plans/{id}",
    summary: "DELETE /api/v1/subscriptions/plans/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/subscriptions/assign",
    description: "Auto-generated endpoint for /api/v1/subscriptions/assign",
    summary: "POST /api/v1/subscriptions/assign",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/subscriptions/{id}/renew",
    description: "Auto-generated endpoint for /api/v1/subscriptions/{id}/renew",
    summary: "PUT /api/v1/subscriptions/{id}/renew",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/subscriptions/{id}/suspend",
    description: "Auto-generated endpoint for /api/v1/subscriptions/{id}/suspend",
    summary: "PUT /api/v1/subscriptions/{id}/suspend",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/subscriptions/sync-expiries",
    description: "Auto-generated endpoint for /api/v1/subscriptions/sync-expiries",
    summary: "POST /api/v1/subscriptions/sync-expiries",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/subscriptions/payments",
    description: "Auto-generated endpoint for /api/v1/subscriptions/payments",
    summary: "GET /api/v1/subscriptions/payments",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/subscriptions/payments",
    description: "Auto-generated endpoint for /api/v1/subscriptions/payments",
    summary: "POST /api/v1/subscriptions/payments",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/subscriptions/my",
    description: "Auto-generated endpoint for /api/v1/subscriptions/my",
    summary: "GET /api/v1/subscriptions/my",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/teachers",
    description: "Auto-generated endpoint for /api/v1/teachers",
    summary: "GET /api/v1/teachers",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/teachers/{id}",
    description: "Auto-generated endpoint for /api/v1/teachers/{id}",
    summary: "GET /api/v1/teachers/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/teachers",
    description: "Auto-generated endpoint for /api/v1/teachers",
    summary: "POST /api/v1/teachers",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/teachers/{id}",
    description: "Auto-generated endpoint for /api/v1/teachers/{id}",
    summary: "PUT /api/v1/teachers/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/teachers/{id}",
    description: "Auto-generated endpoint for /api/v1/teachers/{id}",
    summary: "DELETE /api/v1/teachers/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/timetable",
    description: "Auto-generated endpoint for /api/v1/timetable",
    summary: "GET /api/v1/timetable",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/timetable/teacher/{teacherId}",
    description: "Auto-generated endpoint for /api/v1/timetable/teacher/{teacherId}",
    summary: "GET /api/v1/timetable/teacher/{teacherId}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        teacherId: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/timetable",
    description: "Auto-generated endpoint for /api/v1/timetable",
    summary: "POST /api/v1/timetable",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/timetable/{id}",
    description: "Auto-generated endpoint for /api/v1/timetable/{id}",
    summary: "DELETE /api/v1/timetable/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/users",
    description: "Auto-generated endpoint for /api/v1/users",
    summary: "GET /api/v1/users",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/users",
    description: "Auto-generated endpoint for /api/v1/users",
    summary: "POST /api/v1/users",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/users/{id}",
    description: "Auto-generated endpoint for /api/v1/users/{id}",
    summary: "PUT /api/v1/users/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/users/{id}/status",
    description: "Auto-generated endpoint for /api/v1/users/{id}/status",
    summary: "PUT /api/v1/users/{id}/status",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "put",
    path: "/api/v1/users/{id}/reset-password",
    description: "Auto-generated endpoint for /api/v1/users/{id}/reset-password",
    summary: "PUT /api/v1/users/{id}/reset-password",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/webhooks",
    description: "Auto-generated endpoint for /api/v1/webhooks",
    summary: "GET /api/v1/webhooks",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/webhooks",
    description: "Auto-generated endpoint for /api/v1/webhooks",
    summary: "POST /api/v1/webhooks",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/webhooks/{id}",
    description: "Auto-generated endpoint for /api/v1/webhooks/{id}",
    summary: "DELETE /api/v1/webhooks/{id}",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        id: z.string()
      }),
      
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/webhooks/razorpay",
    description: "Auto-generated endpoint for /api/v1/webhooks/razorpay",
    summary: "POST /api/v1/webhooks/razorpay",
    security: [{ bearerAuth: [] }],
    request: {
      params: z.object({
        
      }),
      body: {
        content: {
          "application/json": { schema: z.any() }
        }
      }
    },
    responses: {
      200: {
        description: "Success response",
        content: { "application/json": { schema: GenericResponse } }
      },
      400: { description: "Bad Request", content: { "application/json": { schema: GenericResponse } } },
      401: { description: "Unauthorized", content: { "application/json": { schema: GenericResponse } } },
      500: { description: "Server Error", content: { "application/json": { schema: GenericResponse } } }
    }
  });

}
