/**
 * @module classes
 */

class Scheduler {

  constructor () {
    this._pending = null
    this._requests = []
    this._performUpdates = this.performUpdates.bind(this)
    this._needUpdates = false
    this._last = 0
    this._updateFreq = 5
  }

  get requests () {
    return this._requests
  }

  get needUpdates () {
    return this._needUpdates
  }

  queue (hash, fn, options = {}) {
    let q = _.find(this._requests, _.extend({ hash }, options))
    if (q) {
      q.fn = fn
    }
    else {
      this._requests.push(_.extend({ hash, fn }, options))
    }
    if (!this._pending) {
      this._pending = window.requestAnimationFrame(this._performUpdates)
    }
    return this
  }

  async performUpdates () {
    let t = _.now()
    if (t - this._last >= this._updateFreq) {
      this._needUpdates = true

      let promises = []
      while (this._requests.length > 0) {
        let q = this._requests.shift()
        let r = q.fn()
        if (r instanceof Promise) {
          promises.push(r)
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises)
      }

      this._pending = null
      this._needUpdates = false

      this._last = t
    }
    else {
      this._pending = window.requestAnimationFrame(this._performUpdates)
    }
  }

}

module.exports = {
  Scheduler,
}
