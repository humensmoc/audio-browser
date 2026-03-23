const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const HOST = "127.0.0.1";
const PORT = 3210;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wav": "audio/wav"
};

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  setCorsHeaders(res);
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function isSafePath(targetPath) {
  if (!targetPath || typeof targetPath !== "string") return false;
  if (targetPath.includes("\0")) return false;
  return true;
}

function openFolder(folderPath) {
  const normalized = path.resolve(folderPath);
  return new Promise((resolve, reject) => {
    fs.stat(normalized, (statErr, stats) => {
      if (statErr || !stats.isDirectory()) {
        reject(new Error("目录不存在或无效"));
        return;
      }
      const child = spawn("explorer.exe", [normalized], {
        detached: true,
        stdio: "ignore",
        shell: false
      });
      child.on("error", (err) => reject(err));
      child.unref();
      resolve();
    });
  });
}

function readBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let body = "";
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("请求体过大"));
        req.destroy();
        return;
      }
      body += chunk.toString("utf-8");
    });
    req.on("end", () => resolve(body));
    req.on("error", (err) => reject(err));
  });
}

async function handleApi(req, res) {
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return true;
  }

  if (req.url === "/api/ping" && req.method === "GET") {
    sendJson(res, 200, { ok: true, message: "audio-tool backend ready" });
    return true;
  }

  if (req.url === "/api/open-folder" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const parsed = JSON.parse(body || "{}");
      const folderPath = parsed?.folderPath;
      if (!isSafePath(folderPath)) {
        sendJson(res, 400, { ok: false, message: "folderPath 非法" });
        return true;
      }
      await openFolder(folderPath);
      sendJson(res, 200, { ok: true });
      return true;
    } catch (err) {
      sendJson(res, 500, { ok: false, message: String(err.message || err) });
      return true;
    }
  }

  return false;
}

function safeResolveFilePath(urlPath) {
  const cleanPath = (urlPath || "/").split("?")[0].split("#")[0];
  const relativePath = cleanPath === "/" ? "/index.html" : cleanPath;
  const absolutePath = path.resolve(ROOT, `.${relativePath}`);
  if (!absolutePath.startsWith(ROOT)) return null;
  return absolutePath;
}

function serveStatic(req, res) {
  const filePath = safeResolveFilePath(req.url);
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const handledApi = await handleApi(req, res);
    if (handledApi) return;
    serveStatic(req, res);
  } catch (err) {
    sendJson(res, 500, { ok: false, message: String(err.message || err) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Audio tool server running at http://${HOST}:${PORT}`);
});
