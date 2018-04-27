/**
 * @module mixins
 */

const TickMixin = Mixin(superclass => class TickMixin extends superclass {

  timeout (name, args = [], timeout = 1) {
    let fn = _.isFunction(name) ? name : this[name]
    if (fn) {
      setTimeout(() => fn.call(this, ...args), timeout)
    }
  }

  defer (name, args = [], timeout = 1) {
    if (arguments.length === 2) {
      if (_.isNumber(args)) {
        timeout = args
        args = []
      }
    }
    this.timeout(name, args, timeout)
  }

  nextTick (name, args = []) {
    this.timeout(name, args)
  }

})

module.exports = {
  TickMixin,
}
