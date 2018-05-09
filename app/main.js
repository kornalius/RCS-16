/**
 * @module app
 */

const { Emitter } = require('./mixins/common/events')

const _STOPPED = 0
const _RUNNING = 1
const _PAUSED = 2

class Main extends Emitter {

  constructor () {
    super()

    this.reset()
    setTimeout(() => this.start())

    this._tickBound = this.tick.bind(this)
    PIXI.ticker.shared.add(this._tickBound)
  }

  reset () {
    this._state = _STOPPED
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

  get isRunning () { return this._state === _RUNNING }

  get isPaused () { return this._state === _PAUSED }

  get program () { return this._program }

  start () {
    if (!this.isRunning) {
      this.state = _RUNNING
      this.emit('start')
    }
    return this
  }

  stop () {
    if (this.isRunning) {
      this.state = _STOPPED
      this.emit('stop')
    }
    return this
  }

  pause () {
    if (!this.isPaused) {
      this.state = _PAUSED
      this.emit('paused')
    }
    return this
  }

  resume () {
    if (this.isPaused) {
      this.state = _RUNNING
      this.emit('resume')
    }
    return this
  }

  load (path, text) {
    return Function(text)
  }

  error (e) {
    console.error(e.message)
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
    if (this.state === _RUNNING) {
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
