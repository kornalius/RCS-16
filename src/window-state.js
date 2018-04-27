var electron = require('electron')
var { app } = electron
var fs = require('fs')
var path = require('path')

module.exports = (name, defaults) => {
  var stateStoreFile = path.join(app.getPath('userData'), 'window-state-' + name + '.json')
  var state = {
    width: defaults.width,
    height: defaults.height
  }

  try {
    var loadedState = fs.readFileSync(stateStoreFile, 'utf8')
    if (loadedState !== null) {
      state = JSON.parse(loadedState)
    }
  }
  catch (err) {
  }

  var saveState = win => {
    if (!win.isMaximized() && !win.isMinimized()) {
      var position = win.getPosition()
      var size = win.getSize()
      state.x = position[0]
      state.y = position[1]
      state.width = size[0]
      state.height = size[1]
    }
    state.isMaximized = win.isMaximized()
    fs.writeFileSync(stateStoreFile, JSON.stringify(state), 'utf8')
  }

  return {
    get x () { return state.x },
    get y () { return state.y },
    get width () { return state.width },
    get height () { return state.height },
    get isMaximized () { return state.isMaximized },
    saveState
  }
}
