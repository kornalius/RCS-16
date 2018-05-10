/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { Frames } = require('./frame')

class Node {

  constructor (parser, token, data = {}) {
    this._parser = parser
    this._token = token
    this._inClass = false
    this._fnLevel = 0
    this._data = data
  }

  get parser () { return this._parser }
  get token () { return this._token }
  get inClass () { return this._inClass }
  get fnLevel () { return this._fnLevel }
  get data () { return this._data }

  tokenProp (name) {
    return this._token ? this._token[name] : undefined
  }

  get value () { return this.tokenProp('value') }

  get type () { return this.tokenProp('type') }

  get start () { return this.tokenProp('start') }

  get end () { return this.tokenProp('end') }

  get length () { return this.tokenProp('length') }

  is (e) {
    return this._token ? this._token.is(e) : false
  }

  toString () {
    return this._token ? this._token.toString() : ''
  }

}


class Parser extends Emitter {

  constructor () {
    super()

    this.reset()
  }

  get errors () { return this._errors }
  get offset () { return this._offset }
  get nodes () { return this._nodes }
  get frames () { return this._frames }
  get prevFrame () { return this._prevFrame }
  get inClass () { return this._inClass }
  get fnLevel () { return this._fnLevel }

  get tokens () { return this._tokens }
  get length () { return this._tokens.length }

  get eos () { return this._offset >= this.length }

  get token () { return this.tokenAt(this._offset) }

  reset () {
    this._errors = 0
    this._offset = 0
    this._tokens = []
    this._nodes = []
    this._frames = new Frames()
    this._prevFrame = undefined
    this._inClass = false
    this._fnLevel = 0
  }

  validOffset (offset) {
    return offset >= 0 && offset < this.length
  }

  tokenAt (offset) {
    return this.validOffset(offset) ? this._tokens[offset] : undefined
  }

  skip (e) {
    while (this.is(e) && !this.eos) { this.next() }
  }

  is (e) {
    return this._token ? this._token.is(e) : false
  }

  error () {
    this._errors++
    console.error(..._.concat(Array.from(arguments), [this.token.toString()]))
  }

  expect (e, next = true) {
    let r = this._token ? this._token.is(e) : false
    if (!r) {
      this.error(this._token, e, 'expected')
    }
    else if (next) {
      this.next()
    }
    return r
  }

  match (offset, matches) {
    if (!_.isNumber(offset)) {
      matches = offset
      offset = this._offset
    }
    let tokens = []
    let m = 0
    while (this.validOffset(offset) && m < matches.length) {
      let token = this.tokenAt(offset++)
      if (!token.is(matches[m++])) {
        return undefined
      }
      tokens.push(token)
    }
    return tokens.length ? tokens : undefined
  }

  peek (c = 1) {
    return this.tokenAt(this._offset + c)
  }

  next (c = 1) {
    this._offset += c
    return this.tokenAt(this._offset)
  }

  async parse (tokens = []) {
    this.reset()
    this._tokens = tokens
    this._frames.start('globals')
    let nodes = this.statements()
    this._frames.end()
    this._nodes = nodes
    return this._errors === 0 ? nodes : undefined
  }

  dump () {
    console.info('parser dump')
    console.log(this._nodes)
    console.log('')
  }

}

module.exports = {
  Node,
  Parser,
}
