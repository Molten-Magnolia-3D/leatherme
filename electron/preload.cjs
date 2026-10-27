const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("leathermeDesktop", {
  packaged: true,
});
