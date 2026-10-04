/**
 * main.js - Electron Main Process for Windows & Mac Desktop App
 * Runs completely offline with native system menus and print support.
 */

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1300,
        height: 850,
        minWidth: 1050,
        minHeight: 700,
        title: 'InvoiceMaster - Desktop Invoice Generator',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        },
        backgroundColor: '#0f172a',
        show: false
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Native Application Menu
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Invoice',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => mainWindow.webContents.executeJavaScript('window.invoiceBuilder.resetToNewInvoice(); window.switchTab("invoiceTab");')
                },
                {
                    label: 'Save Invoice',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow.webContents.executeJavaScript('window.invoiceBuilder.saveInvoice();')
                },
                {
                    label: 'Print / Export PDF',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => mainWindow.webContents.executeJavaScript('window.invoiceBuilder.printInvoice();')
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About InvoiceMaster',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About InvoiceMaster',
                            message: 'InvoiceMaster Desktop v1.0.0',
                            detail: 'Offline local desktop invoice generator with Excel catalog support.\n100% private, zero cloud dependencies.'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
