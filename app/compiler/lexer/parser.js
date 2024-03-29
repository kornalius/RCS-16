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

  static get globals () {
    return {
      print: function () { console.log(...arguments) },
      console: RCS.console,
      main: RCS.main,
      TTY: RCS.TTY,
    }
  }

  get errors () { return this._errors }
  get offset () { return this._offset }
  get nodes () { return this._nodes }
  get frames () { return this._frames }
  get prevFrame () { return this._prevFrame }
  get inArgs () { return this._inArgs }
  get fnLevel () { return this._fnLevel }

  get tokens () { return this._tokens }
  get states () { return this._states }
  get length () { return this._tokens.length }
  get eos () { return this._offset >= this.length }
  get token () { return this.tokenAt(this._offset) }

  reset () {
    this._errors = 0
    this._offset = 0
    this._matching = 0
    this._tokens = []
    this._nodes = []
    this._frames = new RCS.Compiler.Frames()
    this._prevFrame = undefined
    this._inArgs = false
    this._fnLevel = 0
    this._states = []
  }

  pushState () {
    let state = {
      errors: this._errors,
      offset: this._offset,
      matching: this._matching,
      nodes: _.clone(this._nodes),
      framesQueue: _.clone(this._frames.queue),
      prevFrameId: this._prevFrame ? this._prevFrame.id : undefined,
      inArgs: this._inArgs,
      fnLevel: this._fnLevel,
    }
    this._states.push(state)
  }

  popState () {
    let state = this._states.pop()
    this._errors = state.errors
    this._offset = state.offset
    this._matching = state.matching
    this._nodes = state.nodes
    this._frames._queue = state.framesQueue
    this._prevFrame = state.prevFrameId ? _.find(this._frames.queue, { id: state.prevFrameId }) : undefined
    this._inArgs = state.inArgs
    this._fnLevel = state.fnLevel
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
    if (!this._matching) {
      this._errors++
      console.error(..._.concat(Array.from(arguments), this.token ? [this.token.toString()] : []))
    }
  }

  expect (e, next = true) {
    let r = this.is(e)
    if (!r) {
      if (_.isArray(e)) {
        e = e.join(' or ')
      }
      this.error(e, 'expected')
    }
    if (r && next) {
      this.next()
    }
    return r
  }

  match (...matches) {
    this._matching = true
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
    this._matching = false
    return tokens.length === matches.length ? tokens : undefined
  }

  peek (c = 1) {
    return this.tokenAt(this._offset + c)
  }

  prev (c = 1) {
    this._offset -= c
    return this.tokenAt(this._offset)
  }

  next (c = 1) {
    this._offset += c
    return this.tokenAt(this._offset)
  }

  async parse (tokens = []) {
    this.reset()

    this._tokens = tokens

    this._frames.start('PROGRAM', TOKENS.GLOBALS, true)

    for (let key in Parser.globals) {
      let v = Parser.globals[key]
      let isClass = _.isClass(v)
      let fi = this._frames.add(key, isClass ? TOKENS.CLASS : TOKENS.ID, v)
      if (isClass) {
        let f = this._frames.start(key, TOKENS.CLASS, false)
        fi._classFrame = f

        for (let propName of Object.getOwnPropertyNames(v.prototype)) {
          let desc = Object.getOwnPropertyDescriptor(v.prototype, propName)
          if (desc && _.isFunction(desc.value)) {
            this._frames.add(propName, TOKENS.FN, desc.value)
          }
        }

        this._frames.end(false)
      }
    }

    let nodes = this.statements()

    this._frames.end()

    this._nodes = nodes

    return this._errors === 0 ? nodes : undefined
  }

  getEnd (end, expected) {
    if (this.match(TOKENS.EOL, TOKENS.INDENT)) {
      end = expected
      this.next(2)
    }
    return end
  }

  dump () {
    console.info('Parser dump')
    console.log(this._nodes)
    console.log('')
  }

}

module.exports = {
  Parser,
}
