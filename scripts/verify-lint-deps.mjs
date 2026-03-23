import { execSync } from "node:child_process";

try {
  execSync("npm ls eslint eslint-config-next --depth=0", { stdio: "pipe" });
} catch {
  console.error(
    "Lint tooling dependencies are out of sync with package-lock.json. Run `npm ci` and retry.",
  );
  process.exit(1);
}
