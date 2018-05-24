/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { Tokenizer } = require('./tokens/tokenizer')
const { Node } = require('./lexer/node')
const { Lexer } = require('./lexer/lexer')

const globals = {
  print: function print () { console.log(...arguments) }
}

RCS.Compiler = {
  Node,
  Lexer,
  Tokenizer,
  globals,
}

const { FrameItem, Frame, Frames } = require('./frame')
const { Transpiler } = require('./transpiler')

_.extend(RCS.Compiler, {
  Transpiler,
  FrameItem,
  Frame,
  Frames,
})

class Compiler extends Emitter {

  constructor () {
    super()

    this._tokenizer = new Tokenizer()
    this._lexer = new Lexer()
    this._transpiler = new Transpiler()
  }

  async compile (text, path, dump = false) {
    await this._tokenizer.tokenize(text, path)
    if (!this._tokenizer.errors) {
      if (dump) {
        this._tokenizer.dump()
      }
      await this._lexer.parse(this._tokenizer.tokens)
      if (!this._lexer.errors) {
        if (dump) {
          this._lexer.dump()
        }
        await this._transpiler.transpile(this._lexer.nodes)
        if (!this._transpiler.errors) {
          if (dump) {
            this._transpiler.dump()
          }
          return this._transpiler.code
        }
      }
    }
    return undefined
  }

  dump () {
    this._tokenizer.dump()
    this._lexer.dump()
    this._transpiler.dump()
  }

}

module.exports = {
  Compiler,
}
