const { app, BrowserWindow } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        title: 'Mirror Dash',
        width: 1024,
        height: 768,
        icon: '../public/favicon.png',
    });
    win.loadFile('../dist/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});