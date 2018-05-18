/**
 * @module compiler
 */

const { Emitter } = require('../../mixins/common/events')

class Node extends Emitter {

  constructor (token, data = {}) {
    super()

    this._token = token
    this.fields = []
    this.args = []
    _.extend(this, data)
    this._inClass = false
    this._fnLevel = 0
  }

  get inClass () { return this._inClass }
  get fnLevel () { return this._fnLevel }

  get token () { return this._token }
  get value () { return _.get(this._token, 'value') }
  get type () { return _.get(this._token, 'type') }
  get start () { return _.get(this._token, 'start', 0) }
  get end () { return _.get(this._token, 'end', this.length) }
  get length () { return _.get(this._token, 'length', 0) }

  is (e) {
    return this._token ? this._token.is(e) : false
  }

  toString () {
    return this._token ? this._token.toString() : ''
  }

}

module.exports = {
  Node,
}
