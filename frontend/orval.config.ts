import { defineConfig } from "orval";

export default defineConfig({
  matcha: {
    input: {
      target: "./openapi.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/api/generated",
      schemas: "./src/api/model",
      client: "axios",
      httpClient: "axios",
      clean: true,
      override: {
        mutator: {
          path: "./src/api/mutator/custom-instance.ts",
          name: "customInstance",
        },
      },
    },
  },
});
