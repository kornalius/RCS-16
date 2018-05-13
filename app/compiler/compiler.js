/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { Tokenizer } = require('./tokenizer')
const { Node, Parser } = require('./parser')
const { Lexer } = require('./lexer')

RCS.Compiler = {
  Node,
  Parser,
  Tokenizer,
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

  async tokenize (text, path) {
    let tokenizer = new Tokenizer()
    return tokenizer.tokenize(text, path)
  }

  async parse (tokens) {
    let lexer = new Lexer(tokens)
    return lexer.parse(tokens)
  }

  async transpile (nodes) {
    let transpiler = new Transpiler(nodes)
    return transpiler.transpile(nodes)
  }

  async compile (text, path) {
    let tokens = await this.tokenize(text, path)
    if (tokens) {
      console.log(tokens)

      let nodes = await this.parse(tokens)
      if (nodes) {
        console.log(nodes)

        let code = await this.transpile(nodes)
        console.log(code)
        return code
      }
    }
    return undefined
  }

}

module.exports = {
  Compiler,
}
