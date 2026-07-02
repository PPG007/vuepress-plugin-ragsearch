import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vuepress";
import type { RAGSearchPluginOptions } from "../types";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const clientConfigFile = resolveClientConfigFile();

export const ragSearchPlugin = (options: RAGSearchPluginOptions): Plugin => {
  return {
    name: "vuepress-plugin-ragsearch",
    define: {
      __RAG_OPTIONS__: JSON.stringify(options),
    },
    clientConfigFile,
  };
};

function resolveClientConfigFile(): string {
  const sourceConfigFile = path.resolve(__dirname, "../client/config.ts");
  if (fs.existsSync(sourceConfigFile)) {
    return sourceConfigFile.replace(/\\/g, "/");
  }

  return path.resolve(__dirname, "../client/config.js").replace(/\\/g, "/");
}
