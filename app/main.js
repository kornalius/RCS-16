/**
 * @module app
 */

const { Emitter } = require('./mixins/common/events')
const { Compiler, error } = require('./compiler/compiler')
const { fs, path } = require('./utils')

const STOPPED = 0
const RUNNING = 1
const PAUSED = 2

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

  async compile (text = '', path) {
    let compiler = new Compiler()
    let code = await compiler.compile(text, path)
    return code ? Function(code) : undefined
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

  async load (path) {
    let fn = path.join(RCS.DIRS.user, path)
    if (!await this.exists(fn)) {
      fn = path.join(RCS.DIRS.cwd, path)
    }
    return await fs.readFile(fn, 'utf8')
  }

  error (e) {
    if (_.isError(e)) {
      e = e.message
    }
    error(e)
  }

  run (fn, ...args) {
    try {
      return fn(args)
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
