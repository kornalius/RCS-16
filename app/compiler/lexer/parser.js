/**
 * @module compiler
 */

const { Emitter } = require('../../mixins/common/events')
const TOKENS = require('../tokens/tokens')

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
  get states () { return this._states }
  get length () { return this._tokens.length }
  get eos () { return this._offset >= this.length }
  get token () { return this.tokenAt(this._offset) }

  reset () {
    this._errors = 0
    this._offset = 0
    this._tokens = []
    this._nodes = []
    this._frames = new RCS.Compiler.Frames()
    this._prevFrame = undefined
    this._inClass = false
    this._fnLevel = 0
    this._states = []
  }

  pushState () {
    let state = {
      errors: this._errors,
      offset: this._offset,
      nodes: _.clone(this._nodes),
      framesQueue: _.clone(this._frames.queue),
      prevFrameId: this._prevFrame ? this._prevFrame.id : undefined,
      inClass: this._inClass,
      fnLevel: this._fnLevel,
    }
    this._states.push(state)
  }

  popState () {
    let state = this._states.pop()
    this._errors = state.errors
    this._offset = state.offset
    this._nodes = state.nodes
    this._frames._queue = state.framesQueue
    this._prevFrame = state.prevFrameId ? _.find(this._frames.queue, { id: state.prevFrameId }) : undefined
    this._inClass = state.inClass
    this._fnLevel = state.fnLev_fnLevel
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
    return this.token ? this.token.is(e) : false
  }

  error () {
    this._errors++
    console.error(..._.concat(Array.from(arguments), this.token ? [this.token.toString()] : []))
  }

  expect (e, next = true) {
    let r = this.token.expect(e)
    if (r && next) {
      this.next()
    }
    return r
  }

  match (...matches) {
    let offset = this.offset
    let tokens = []
    for (let match of matches) {
      if (this.validOffset(offset)) {
        let token = this.tokenAt(offset)
        if (_.isFunction(match)) {
          let c = match.call(this, offset)
          offset = c.offset
          tokens.push(c.tokens)
        }
        else if (token.is(match)) {
          offset++
          tokens.push(token)
        }
      }
    }
    return tokens.length === matches.length ? tokens : undefined
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

    this._frames.start(TOKENS.GLOBALS, true)
    for (let key in RCS.Compiler.globals) {
      let v = RCS.Compiler.globals[key]
      this._frames.add(key, _.isFunction(v) ? TOKENS.FN : TOKENS.ID, v.toString())
    }

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
  Parser,
}
