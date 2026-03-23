const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  win.loadFile(path.join(__dirname, "..", "index.html"));
}

function isSafePath(targetPath) {
  if (!targetPath || typeof targetPath !== "string") return false;
  if (targetPath.includes("\0")) return false;
  return true;
}

ipcMain.handle("open-folder", async (_event, folderPath) => {
  if (!isSafePath(folderPath)) {
    return { ok: false, message: "folderPath 非法" };
  }

  try {
    const normalized = path.resolve(folderPath);
    const stat = fs.statSync(normalized);
    if (!stat.isDirectory()) {
      return { ok: false, message: "目录不存在或无效" };
    }

    const errMsg = await shell.openPath(normalized);
    if (errMsg) {
      return { ok: false, message: errMsg };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: String(err?.message || err) };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
