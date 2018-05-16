/**
 * @module app
 */

const { Emitter } = require('./mixins/common/events')
const { fs, path } = require('./utils')

const acorn = require('acorn')
const astring = require('astring')

const STOPPED = 0
const RUNNING = 1
const PAUSED = 2

const origRequire = window.require
const globals = {
  __sizeof: function (value) {
    let sz = 1
    if (_.isObjectLike(value)) {
      sz += _.keys(value).length
      for (let key in value) {
        sz += globals.__sizeof(value[key])
      }
    }
    else if (_.isArrayLike(value)) {
      sz += value.length
      for (let v of value) {
        sz += globals.__sizeof(v)
      }
    }
    else if (_.isString(value)) {
      sz += value.length
    }
    else if (_.isArrayBuffer(value)) {
      sz += value.byteLength
    }
    return sz
  },

  __v__: function (value) {
    debugger
    let sz = globals.__sizeof(value)
    if (sz > 10 * 1024 * 1024) {
      RCS.main.error('memory out of bounds (size: ' + window.prettyBytes(sz) + ')', value)
      value = undefined
    }
    return value
  },

  require: function (p) {
    p = path.join(RCS.DIRS.user, p)
    console.log('require', p)
    return origRequire(p)
  },

}


const _customGenerator = Object.assign({}, astring.baseGenerator, {
  VariableDeclarator: function (node, state) {
    this[node.id.type](node.id, state)
    state.write(' = window.__v__(')
    this[node.init.type](node.init, state)
    state.write(')')
  },
})

class Main extends Emitter {

  constructor () {
    super()

    this.reset()
    setTimeout(() => this.start())

    this._tickBound = this.tick.bind(this)
    PIXI.ticker.shared.add(this._tickBound)
  }

  reset () {
    this._state = STOPPED
    this._program = {
      path: undefined,
      code: undefined,
      tokens: undefined,
      fn: undefined,
    }
    return this
  }

  shut () {
    this.clear()

    RCS.overlays.shut()
    RCS.palette.shut()
    RCS.sprite.shut()
    RCS.video.shut()
    RCS.mouse.shut()
    RCS.keyboard.shut()
    RCS.sound.shut()

    RCS.memoryManager.shut()
  }

  get state () { return this._state }
  set state (value) {
    if (this._state !== value) {
      this._state = value
    }
  }

  get isRunning () { return this._state === RUNNING }

  get isPaused () { return this._state === PAUSED }

  get program () { return this._program }

  start () {
    if (!this.isRunning) {
      this.state = RUNNING
      this.emit('start')
    }
    return this
  }

  stop () {
    if (this.isRunning) {
      this.state = STOPPED
      this.emit('stop')
    }
    return this
  }

  pause () {
    if (!this.isPaused) {
      this.state = PAUSED
      this.emit('paused')
    }
    return this
  }

  resume () {
    if (this.isPaused) {
      this.state = RUNNING
      this.emit('resume')
    }
    return this
  }

  async exists (path) {
    try {
      await fs.stat(path)
      return true
    }
    catch (e) {
      return false
    }
  }

  async load (_path) {
    let fn = path.join(RCS.DIRS.user, _path)
    if (!await this.exists(fn)) {
      fn = path.join(RCS.DIRS.cwd, '/app', _path)
    }
    return fs.readFile(fn, 'utf8')
  }

  error () {
    let args = Array.from(arguments)
    let f = _.first(args)
    if (_.isError(f)) {
      args = [f.message]
    }
    console.error(...args)
  }

  async compile (text = '', path) {
    if (!_.isEmpty(path) && _.isEmpty(text)) {
      text = await this.load(path, 'utf8')
    }

    let fn = new Function()

    try {
      let ast = acorn.parse(text, { ecmaVersion: 6 })
      console.log(ast)
      let code = astring.generate(ast, { indent: '  ', generator: _customGenerator })
      console.log(code)
      fn = new Function('window, global', 'return function () {"use strict";\n console.log(this, window, global, require, console);' + code + '}')(globals, globals)
    }
    catch (e) {
      this.error(e)
    }

    return fn
  }

  run (fn, ...args) {
    try {
      return fn(...args)
    }
    catch (e) {
      return this.error(e)
    }
  }

  tick (delta) {
    if (this.state === RUNNING) {
      let t = performance.now()

      RCS.mouse.tick(t, delta)
      RCS.keyboard.tick(t, delta)
      RCS.palette.tick(t, delta)
      RCS.sprite.tick(t, delta)
      RCS.overlays.tick(t, delta)
      RCS.video.tick(t, delta)
      RCS.sound.tick(t, delta)

      RCS.memoryManager.tick(t, delta)
    }
  }

  async boot () {
    require('./classes/api/index')

    await RCS.memoryManager.boot()
    await RCS.video.boot()
    await RCS.sprite.boot()
    await RCS.palette.boot()
    await RCS.mouse.boot()
    await RCS.keyboard.boot()
    await RCS.overlays.boot()
    await RCS.sound.boot()
  }

}

module.exports = Main
