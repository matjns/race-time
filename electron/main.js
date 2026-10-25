// RaceTime — Electron shell. Saves live in localStorage inside the app's userData folder
// (~/Library/Application Support/RaceTime), so they persist across launches.
const {app,BrowserWindow,Menu,shell}=require('electron');
const path=require('path');
app.setName('RaceTime');
function createWindow(){
 const win=new BrowserWindow({width:1280,height:800,minWidth:1024,minHeight:680,backgroundColor:'#0a0d12',title:'Race Time',
  webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
 win.loadFile(path.join(__dirname,'app','index.html'));
 win.webContents.setWindowOpenHandler(({url})=>{shell.openExternal(url);return{action:'deny'};});
}
const tpl=[{label:'RaceTime',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]},
 {label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
 {label:'View',submenu:[{role:'reload'},{role:'togglefullscreen'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{type:'separator'},{role:'toggleDevTools'}]},
 {role:'windowMenu'}];
app.whenReady().then(()=>{Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
