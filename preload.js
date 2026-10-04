/**
 * preload.js - Electron Preload Bridge
 * Secure Context Isolation
 */

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    isDesktop: true
});
