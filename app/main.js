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

  destroy () {
    return this.clear()
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

  boot () {
    require('./classes/api/index')
  }

}

module.exports = Main
