'use strict'

const electron = require('electron')

// Module to control application life.
const app = electron.app
app.commandLine.appendSwitch('js-flags', '--harmony')

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const windowStateKeeper = require('./window-state')

const path = require('path')

// require('./server')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
let mainWindowState

process.env.NODE_ENV = 'development'

const isDev = process.env.NODE_ENV === 'development'

function createWindow () {
  mainWindowState = windowStateKeeper('main', { width: 1000, height: 600 })

  // Create the browser window.
  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,

    width: mainWindowState.width,
    height: mainWindowState.height,

    webPreferences: {
      webSecurity: false,
      plugins: true,
      textAreasAreResizable: false,
      experimentalFeatures: true,
      experimentalCanvasFeatures: true,
      allowDisplayingInsecureContent: true,
      allowRunningInsecureContent: true,
      sharedWorker: true,
      nodeIntegrationInWorker: true,
      backgroundThrottling: false,
      // blinkFeatures: 'Accelerated2dCanvas,ColorCanvasExtensions,CompositorWorker,CSS3Text,CSS3TextDecorations,CSSApplyAtRules,CSSBackdropFilter,CSSContainment,CSSDisplayContents,CSSFontDisplay,CSSFontSizeAdjust,CSSGridLayout,CSSHyphens,CSSVariableFonts,CSSVariables2,CSSViewport,CSSVariables,CustomElementsV1,CustomElementsBuiltin,ExperimentalV8Extras,HeapCompaction,IDBObserver,MemoryInfoInWorkers,OverlayScrollbars,PerformanceObserver,PerformancePaintTiming,PreciseMemoryInfo,RenderingPipelineThrottling,ResizeObserver,SharedArrayBuffer,SharedWorker,StableBlinkFeatures,StackedCSSPropertyAnimations,StorageEstimate,StyleSharing,VisualViewportAPI,WebAnimationsAPI,WebAnimationsSVG,WebGLDraftExtensions,Database,FileSystem,ModuleScripts',
    }
  })

  if (mainWindowState.isMaximized) {
    mainWindow.maximize()
  }

  process.chdir(path.join(__dirname, '../app'))

  // and load the index.html of the app.
  const url = `file://${__dirname}/../app/index.html`
  mainWindow.loadURL(url)

  // Open the DevTools.
  if (isDev) {
    // mainWindow.webContents.openDevTools()

    // require('devtron').install()

    // var installExtension = require('electron-devtools-installer').default

    // var installPixiDevTool = () => {
    //   installExtension('aamddddknhcagpehecnhphigffljadon')
    //     .then(name => console.log(`Added Extension:  ${name}`))
    //     .catch(err => console.log('An error occurred: ', err))
    // }

    // var installInsight = () => {
    //   installExtension('djdcbmfacaaocoomokenoalbomllhnko')
    //     .then(name => console.log(`Added Extension:  ${name}`))
    //     .catch(err => console.log('An error occurred: ', err))
    // }

    // installPixiDevTool()
    // installInsight()
  }

  mainWindow.on('close', () => {
    mainWindowState.saveState(mainWindow)
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
