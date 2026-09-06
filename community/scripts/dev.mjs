import { spawn } from "node:child_process";

const forwarded = process.argv.slice(2);
const args = [];

for (let index = 0; index < forwarded.length; index += 1) {
  const argument = forwarded[index];
  if (argument === "--strictPort") continue;
  if (argument === "--host") {
    args.push("--hostname", forwarded[index + 1]);
    index += 1;
    continue;
  }
  args.push(argument);
}

const nextBin = new URL("../node_modules/next/dist/bin/next", import.meta.url);
const child = spawn(process.execPath, [nextBin.pathname, "dev", ...args], { stdio: "inherit" });

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
