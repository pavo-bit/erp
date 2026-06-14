import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry";

export function generateSpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "SSVM Platform API",
      description: "Auto-generated OpenAPI 3.0 specification for the SSVM backend.",
    },
    servers: [
      { url: "/api/v1", description: "V1 API" },
      { url: "/api", description: "Legacy API" },
    ],
  });
}

// If this file is run directly (e.g. by `ts-node src/openapi/generate.ts`)
if (require.main === module) {
  const spec = generateSpec();
  console.log(JSON.stringify(spec, null, 2));
}
