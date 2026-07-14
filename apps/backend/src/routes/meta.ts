import type { FastifyInstance } from "fastify";
import { moduleManifest } from "../modules/manifest.js";

export async function registerMetaRoutes(app: FastifyInstance) {
  app.get("/api/v1/meta", async () => ({
    product: "print-flow-saas",
    version: "0.1.0",
    modules: moduleManifest,
  }));
}

