import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    /* ignore trim errors */
  }
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;

  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);

  // Format entries with timestamps
  const lines = entries.map((entry) => {
    const ts = new Date().toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });

  // Append to log file
  fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");

  // Trim if exceeds max size
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}

/**
 * Vite plugin to collect browser debug logs
 * - POST /__manus__/logs: Browser sends logs, written directly to files
 * - Files: browserConsole.log, networkRequests.log, sessionReplay.log
 * - Auto-trimmed when exceeding 1MB (keeps newest entries)
 */
function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",

    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true,
            },
            injectTo: "head",
          },
        ],
      };
    },

    configureServer(server: ViteDevServer) {
      // POST /__manus__/logs: Browser sends logs (written directly to files)
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }

        const handlePayload = (payload: any) => {
          // Write logs directly to files
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };

        const reqBody = (req as { body?: unknown }).body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    },
  };
}

/** لوحة المالك صفحة مستقلة عن تطبيق الموقع العام، لذلك تُنسخ ملفاتها الساكنة بعد بناء Vite. */
function copyAdminAssets(): Plugin {
  return {
    name: "copy-wajbat-admin-assets",
    configureServer(server: ViteDevServer) {
      server.middlewares.use("/assets/js/admin-login-fix-v2.js", (_req, res) => {
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
        fs.createReadStream(path.resolve(import.meta.dirname, "client", "public", "assets", "js", "admin-login-fix-v2.js")).pipe(res);
      });
    },
    closeBundle() {
      const source = path.resolve(import.meta.dirname, "client", "public");
      const destination = path.resolve(import.meta.dirname, "dist", "public");
      const files = [
        { source: "admin.html", destination: "admin.html" },
        { source: "admin-dashboard.html", destination: "admin-dashboard.html" },
        { source: "assets/js/admin-login-fix-v2.js", destination: "assets/js/admin-login-fix-v2.js" },
        { source: "assets/js/admin-media-binding-core.js", destination: "assets/js/admin-media-binding-core.js" },
        { source: "assets/js/admin-structured-editor.js", destination: "assets/js/admin-structured-editor.js" },
        { source: "assets/js/admin-structured-editor-r5.js", destination: "assets/js/admin-structured-editor-r3.js" },
        { source: "assets/js/admin-structured-editor-r5.js", destination: "assets/js/admin-structured-editor-r4.js" },
        { source: "assets/js/admin-homepage-manager-r1.js", destination: "assets/js/admin-homepage-manager-r1.js" },
        { source: "assets/js/admin-services-manager-r1.js", destination: "assets/js/admin-services-manager-r1.js" },
        { source: "assets/js/admin-services-manager-r2.js", destination: "assets/js/admin-services-manager-r2.js" },
        { source: "assets/js/admin-visitor-links-manager-r4.js", destination: "assets/js/admin-visitor-links-manager-r4.js" },
        { source: "assets/js/admin-owner-login-security.js", destination: "assets/js/admin-owner-login-security.js" },
        { source: "assets/js/admin-owner-login-security-r2.js", destination: "assets/js/admin-owner-login-security-r2.js" },
        { source: "assets/js/admin-owner-login-security-r3.js", destination: "assets/js/admin-owner-login-security-r3.js" },
        { source: "assets/js/admin-owner-login-enhancements-r9.js", destination: "assets/js/admin-owner-login-enhancements-r9.js" },
        { source: "assets/js/admin-owner-login-enhancements-r10.js", destination: "assets/js/admin-owner-login-enhancements-r10.js" },
        { source: "assets/js/admin-owner-login-enhancements-r11.js", destination: "assets/js/admin-owner-login-enhancements-r11.js" },
        { source: "assets/js/admin-owner-login-enhancements-r12.js", destination: "assets/js/admin-owner-login-enhancements-r12.js" },
        { source: "assets/js/admin-security-controls.js", destination: "assets/js/admin-security-controls.js" },
        { source: "assets/js/admin-list-controls-core.js", destination: "assets/js/admin-list-controls-core.js" },
        { source: "assets/js/admin-list-controls.js", destination: "assets/js/admin-list-controls.js" },
        { source: "assets/js/admin-app-r16.js", destination: "assets/js/admin-app-r16.js" },
        { source: "assets/js/admin-downloads-manager-r14.js", destination: "assets/js/admin-downloads-manager-r14.js" },
        { source: "assets/js/admin-structured-editor-r3.js", destination: "assets/js/admin-structured-editor-r6.js" },
        { source: "assets/js/admin-structured-editor-r4.js", destination: "assets/js/admin-structured-editor-r6.js" },
        { source: "assets/js/admin-structured-editor-r5.js", destination: "assets/js/admin-structured-editor-r6.js" },
        { source: "assets/js/admin-structured-editor.js", destination: "assets/js/admin-structured-editor-r6.js" },
        { source: "assets/js/admin-app-r24.js", destination: "assets/js/admin-app-r24.js" },
        { source: "assets/js/admin-app-r25.js", destination: "assets/js/admin-app-r25.js" },
        { source: "assets/js/admin-app-r26.js", destination: "assets/js/admin-app-r26.js" },
        { source: "assets/js/admin-blog-manager-r3.js", destination: "assets/js/admin-blog-manager-r3.js" },
        { source: "assets/js/admin-blog-manager-r4.js", destination: "assets/js/admin-blog-manager-r4.js" },
        { source: "assets/js/admin-blog-manager-r5.js", destination: "assets/js/admin-blog-manager-r5.js" },
        { source: "assets/js/admin-blog-manager-r6.js", destination: "assets/js/admin-blog-manager-r6.js" },
        { source: "assets/js/admin-blog-manager-r7.js", destination: "assets/js/admin-blog-manager-r7.js" },
        { source: "assets/js/admin-blog-manager-r8.js", destination: "assets/js/admin-blog-manager-r8.js" },
        { source: "assets/js/site-app-r14.js", destination: "assets/js/site-app-r32.js" },
        { source: "assets/js/site-app-r17.js", destination: "assets/js/site-app-r32.js" },
        { source: "assets/js/site-app-r19.js", destination: "assets/js/site-app-r32.js" },
        { source: "assets/js/site-app-r18.js", destination: "assets/js/site-app-r32.js" },
        { source: "assets/js/site-app-r30.js", destination: "assets/js/site-app-r32.js" },
        { source: "assets/js/admin-app-r28.js", destination: "assets/js/admin-app-r28.js" },
        { source: "assets/js/admin-app-r29.js", destination: "assets/js/admin-app-r29.js" },
        { source: "assets/js/admin-app-r30.js", destination: "assets/js/admin-app-r30.js" },

        { source: "assets/js/admin-partners-manager-r14.js", destination: "assets/js/admin-partners-manager-r14.js" },
        { source: "assets/css/style-r4.css", destination: "assets/css/style-r4.css" },
        { source: "assets/css/style-r5.css", destination: "assets/css/style-r5.css" },
        { source: "assets/css/style-r6.css", destination: "assets/css/style-r6.css" },
        { source: "assets/css/style-r9.css", destination: "assets/css/style-r9.css" },
        { source: "assets/js/admin-team-manager-r1.js", destination: "assets/js/admin-team-manager-r1.js" },
        { source: "assets/js/admin-design-studio-r2.js", destination: "assets/js/admin-design-studio-r2.js" },
        { source: "assets/js/admin-owner-login-security-r6.js", destination: "assets/js/admin-owner-login-security-r6.js" },
        { source: "assets/js/admin-owner-login-enhancements-r14.js", destination: "assets/js/admin-owner-login-enhancements-r14.js" },
        { source: "assets/css/admin.css", destination: "assets/css/admin.css" },
        { source: "assets/css/admin-r10.css", destination: "assets/css/admin-r10.css" },
        { source: "assets/css/admin-r11.css", destination: "assets/css/admin-r11.css" },
        { source: "assets/css/admin-r12.css", destination: "assets/css/admin-r12.css" },
        { source: "assets/css/admin-r14.css", destination: "assets/css/admin-r14.css" },
        { source: "assets/css/admin-owner-login-r13-mobile.css", destination: "assets/css/admin-owner-login-r13-mobile.css" },
        { source: "assets/css/admin-homepage-r1.css", destination: "assets/css/admin-homepage-r1.css" },
        { source: "assets/css/admin-services-r1.css", destination: "assets/css/admin-services-r1.css" },
        { source: "assets/css/admin-services-r2.css", destination: "assets/css/admin-services-r2.css" },
        { source: "assets/css/site-design-r2.css", destination: "assets/css/site-design-r2.css" },
        { source: "assets/css/homepage-manager-r1.css", destination: "assets/css/homepage-manager-r1.css" },
        { source: "assets/css/services-manager-r1.css", destination: "assets/css/services-manager-r1.css" },
        { source: "assets/css/services-manager-r2.css", destination: "assets/css/services-manager-r2.css" },
        { source: "assets/css/visitor-links-r1.css", destination: "assets/css/visitor-links-r1.css" },
        { source: "assets/css/style-r3.css", destination: "assets/css/style-r3.css" },
      ];
      for (const file of files) {
        const target = path.join(destination, file.destination);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(source, file.source), target);
      }
    },
  };
}

/**
 * تُنسخ نقاط دخول النسخة المنشورة بأسماء إصدار مستقلة؛ إذ لا تكفي معاملات
 * الاستعلام وحدها عندما تحتفظ شبكة التوزيع بنسخة قديمة من الحزمة المحزّمة.
 */
function publishVersionedEntryAssets(): Plugin {
  const sourceRoot = path.resolve(import.meta.dirname, "client", "public", "assets");
  const entries = [
    { source: "js/site-app-r32.js", destination: "js/site-app-r32.js" },
    { source: "js/admin-app-r16.js", destination: "js/admin-app-r17.js" },
  ];

  return {
    name: "publish-wajbat-versioned-entry-assets",
    configureServer(server: ViteDevServer) {
      for (const entry of entries) {
        server.middlewares.use(`/assets/${entry.destination}`, (_req, res) => {
          res.setHeader("Content-Type", "application/javascript; charset=utf-8");
          fs.createReadStream(path.join(sourceRoot, entry.source)).pipe(res);
        });
      }
    },
    closeBundle() {
      const destinationRoot = path.resolve(import.meta.dirname, "dist", "public", "assets");
      for (const entry of entries) {
        const target = path.join(destinationRoot, entry.destination);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(path.join(sourceRoot, entry.source), target);
      }
    },
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), copyAdminAssets(), publishVersionedEntryAssets()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client", "public"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        site: path.resolve(import.meta.dirname, "client/public/index.html"),
        "js/site-app-r19": path.resolve(import.meta.dirname, "client/public/assets/js/site-app-r19.js"),
        "js/site-app-r30": path.resolve(import.meta.dirname, "client/public/assets/js/site-app-r32.js"),
        "js/site-app-r18": path.resolve(import.meta.dirname, "client/public/assets/js/site-app-r18.js"),
      },
    },
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
