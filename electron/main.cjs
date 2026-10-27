const { app, BrowserWindow, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const PORT = process.env.LEATHERME_PORT || "4733";
const URL = `http://127.0.0.1:${PORT}`;

let serverProcess;

function waitForServer(tries = 80) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      const req = http.get(URL, (res) => {
        res.resume();
        resolve(undefined);
      });
      req.on("error", () => {
        if (left <= 0) reject(new Error("Leatherme server did not start."));
        else setTimeout(() => attempt(left - 1), 250);
      });
    };
    attempt(tries);
  });
}

function startServer() {
  if (!app.isPackaged) return;
  const standaloneDir = path.join(process.resourcesPath, "standalone");
  serverProcess = spawn(process.execPath, [path.join(standaloneDir, "server.js")], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT,
      HOSTNAME: "127.0.0.1",
    },
    stdio: "inherit",
  });
}

async function createWindow() {
  startServer();
  await waitForServer();
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 390,
    minHeight: 640,
    backgroundColor: "#3b2416",
    title: "Leatherme",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
    },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  await win.loadURL(URL);
}

app.whenReady().then(async () => {
  await createWindow();
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    void autoUpdater.checkForUpdatesAndNotify();
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) serverProcess.kill();
});
