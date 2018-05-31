/**
 * @module mixins
 */

class Event {

  constructor (target, name, data, options) {
    this.__eventObject = true
    this.timeStamp = performance.now()
    this.bubbles = _.get(options, 'bubbles', true)
    this.cancelable = _.get(options, 'cancelable', true)
    this.composed = _.get(options, 'composed', false)
    this.target = target
    this.type = name
    this.detail = data
    this.stopped = false
    this.stoppedImmediate = false
    this.defaultPrevented = false
  }

  stop () {
    this.stopped = true
  }

  stopImmediate () {
    this.stoppedImmediate = true
    this.stopped = true
  }

  stopPropagation () {
    this.stopped = true
  }

  stopImmediatePropagation () {
    this.stoppedImmediate = true
    this.stopped = true
  }

  preventDefault () {
    this.defaultPrevented = true
  }
}


const EventsManager = Mixin(superclass => class EventsManager extends superclass {

  _isElementEvent (name) {
    return this.addEventListener && !_.isUndefined(this['on' + name])
  }

  on (name, fn, options = {}) {
    if (this._isElementEvent(name)) {
      this.addEventListener(name, fn, options)
      return this
    }

    this._listeners = this._listeners || {}
    this._listeners[name] = this._listeners[name] || []
    this._listeners[name].push({ fn, order: options.order || 0 })
    this._listeners[name] = _.sortBy(this._listeners[name], 'order')

    return this
  }

  once (name, fn, options = {}) {
    if (this._isElementEvent(name)) {
      this.addEventListener(name, fn, _.extend({}, options, { once: true }))
      return this
    }

    this._listeners = this._listeners || {}

    let that = this
    let onceHandlerWrapper = () => {
      fn.apply(that.off(name, onceHandlerWrapper), arguments)
    }
    onceHandlerWrapper._originalHandler = fn

    return this.on(name, onceHandlerWrapper)
  }

  off (name, fn, options = {}) {
    if (this._isElementEvent(name)) {
      this.removeEventListener(name, fn, options)
      return this
    }

    this._listeners = this._listeners || {}

    if (!this._listeners[name]) {
      return this
    }

    let list = this._listeners[name]
    let i = fn ? list.length : 0

    while (i-- > 0) {
      if (list[i].fn === fn || list[i]._originalHandler === fn) {
        list.splice(i, 1)
      }
    }

    if (_.isEmpty(list)) {
      delete this._listeners[name]
    }

    return this
  }

  emit (name, data, options) {
    if (this._isElementEvent(name)) {
      let e = new CustomEvent(name, _.extend({ detail: data }, options || {}))
      return this.dispatchEvent(e)
    }

    this._listeners = this._listeners || {}

    let origEvent
    let e = data

    if (!data || !data.__eventObject) {
      if (data && data.type) {
        origEvent = data
      }
      e = new Event(this, name, data, options)
    }

    if (this._listeners[name]) {
      for (let l of _.clone(this._listeners[name])) {
        l.fn.call(this, e)
        if (e.stoppedImmediate) {
          break
        }
      }

      if (e.stopped) {
        if (origEvent) {
          origEvent.stopped = true
        }
        return e.defaultPrevented
      }
    }

    let p = this.parentNode
    if (p instanceof DocumentFragment && e.composed && _.isFunction(_.get(this, 'parent.emit'))) {
      p.emit(name, e)
    }

    return e.defaultPrevented
  }

})

module.exports = {
  Event,
  EventsManager,
  Emitter: class Emitter extends mix(Object).with(EventsManager) {}
}
