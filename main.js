const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const JSZip = require('jszip');
const os = require('os');

let win;

const args = process.argv.slice(1);
serve = args.some(val => val === '--serve');

let baseDir;
let driveDir;
let confDir;
const home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
if (process.platform === 'darwin') {
  baseDir = path.join(home, 'Library', 'Application Support', 'EVE Online', 'p_drive',
    'Local Settings', 'Application Data', 'CCP', 'EVE', 'SharedCache',
    'wineenv', 'drive_c', 'users', os.userInfo().username, 'Local Settings',
    'Application Data', 'CCP', 'EVE');
} else if (process.platform === 'win32') {
  baseDir = path.join(home, 'AppData', 'Local', 'CCP', 'EVE');
}
let dir = baseDir;

ipcMain.on('resetDir', (event, arg) => {
  dir = baseDir;
  win.webContents.send('resetDirResponse', process.platform);
});

ipcMain.on('setDrive', (event, arg) => {
  driveDir = arg;
  dir = path.join(baseDir, driveDir);
  win.webContents.send('setDriveResponse');
});

ipcMain.on('setConf', (event, arg) => {
  confDir = arg;
  dir = path.join(baseDir, driveDir, confDir);
  win.webContents.send('setConfResponse');
});

ipcMain.on('getFiles', (event, arg) => {
  data = fs.readdirSync(dir);
  win.webContents.send('getFilesResponse', data);
});

ipcMain.on('getFileContent', (event, arg) => {
  fs.readFile(`${dir}/${arg}`, 'utf-8', (err, data) => {
    if (!err) {
      win.webContents.send('getFileResponse', data);
    }
  });
});

ipcMain.on('copyCharSettings', (event, arg) => {
  const pre = 'core_char_'
  const main = arg[0];
  const list = arg.filter(function (char) {
    return char !== main;
  });
  let zip = new JSZip();
  list.forEach(function (char) {
    zip.file(`${pre}${char}.dat`, fs.readFileSync(`${dir}/${pre}${char}.dat`));
  });
  if (!fs.existsSync(`${dir}/.eveprofile`)) {
    fs.mkdirSync(`${dir}/.eveprofile`);
  }
  zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(`${dir}/.eveprofile/c_${new Date().toISOString()}.zip`))
    .on('finish', function () {
      list.forEach(function (char) {
        fs.copyFileSync(`${dir}/${pre}${main}.dat`, `${dir}/${pre}${char}.dat`);
      });
      win.webContents.send('copyCharResponse');
    });
});

ipcMain.on('copyAccSettings', (event, arg) => {
  const pre = 'core_user_'
  const main = arg[0];
  const list = arg.filter(function (acc) {
    return acc !== main;
  });
  let zip = new JSZip();
  list.forEach(function (acc) {
    zip.file(`${pre}${acc}.dat`, fs.readFileSync(`${dir}/${pre}${acc}.dat`));
  });
  if (!fs.existsSync(`${dir}/.eveprofile`)) {
    fs.mkdirSync(`${dir}/.eveprofile`);
  }
  zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
    .pipe(fs.createWriteStream(`${dir}/.eveprofile/a_${new Date().toISOString()}.zip`))
    .on('finish', function () {
      list.forEach(function (acc) {
        fs.copyFileSync(`${dir}/${pre}${main}.dat`, `${dir}/${pre}${acc}.dat`);
      });
      win.webContents.send('copyAccResponse');
    });
});

const createWindow = () => {
  win = new BrowserWindow({
    width: 1200,
    height: 1200,
    icon: './src/favicon.ico'
  });

  if (serve) {
    win.loadURL('http://localhost:4200');
  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }

  if (serve) {
    win.webContents.openDevTools();
  }

  win.on('closed', () => {
    win = null;
  });
}

app.on('ready', createWindow);

// on macOS, closing the window doesn't quit the app
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// initialize the app's main window
app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});
