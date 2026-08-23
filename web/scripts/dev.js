/**
 * Dev server: picks the first free port (from 3000 up) and opens Chrome.
 * Usage: npm run dev  (from web/ or repo root)
 */

const { createServer } = require("net");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const webRoot = path.join(__dirname, "..");

function findFreePort(startPort = 3000, maxTries = 40) {
  return new Promise((resolve, reject) => {
    let port = startPort;

    const tryListen = () => {
      if (port > startPort + maxTries) {
        reject(new Error(`No free port found between ${startPort} and ${startPort + maxTries}`));
        return;
      }

      const server = createServer();
      server.unref();
      server.on("error", () => {
        port += 1;
        tryListen();
      });
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(port));
      });
    };

    tryListen();
  });
}

function openInChrome(url) {
  const platform = process.platform;

  if (platform === "win32") {
    const chromePaths = [
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
      process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
      process.env["PROGRAMFILES(X86)"] &&
        path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    ].filter(Boolean);

    const chrome = chromePaths.find((p) => fs.existsSync(p));
    if (chrome) {
      spawn(chrome, [url], { detached: true, stdio: "ignore" }).unref();
      return;
    }
    // Fallback: Windows default handler / App Paths "chrome"
    spawn("cmd", ["/c", "start", "", "chrome", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (platform === "darwin") {
    spawn("open", ["-a", "Google Chrome", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("google-chrome", [url], { detached: true, stdio: "ignore" }).on("error", () => {
    spawn("chromium-browser", [url], { detached: true, stdio: "ignore" }).on("error", () => {
      spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    });
  });
}

async function main() {
  const port = await findFreePort(3000);
  const url = `http://localhost:${port}`;

  console.log(`\nFree port found: ${port}`);
  console.log(`Starting Next.js… will open Chrome at ${url}\n`);

  const nextBin = path.join(webRoot, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "dev", "-H", "localhost", "-p", String(port)], {
    cwd: webRoot,
    stdio: "inherit",
    env: { ...process.env, PORT: String(port) },
  });

  let opened = false;
  const openOnce = () => {
    if (opened) return;
    opened = true;
    openInChrome(url);
  };

  // Open after server is likely ready; also retry shortly after
  setTimeout(openOnce, 2800);
  setTimeout(openOnce, 5500);

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
