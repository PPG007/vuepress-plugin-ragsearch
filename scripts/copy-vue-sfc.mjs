import { extname } from "node:path";
import { cp, mkdir, stat } from "node:fs/promises";

await mkdir("lib/client/components", { recursive: true });
await cp("src/client/components", "lib/client/components", {
  recursive: true,
  filter: async (source) =>
    (await stat(source)).isDirectory() || extname(source) === ".vue",
});
