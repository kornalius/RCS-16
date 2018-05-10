/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { Tokenizer } = require('./tokenizer')
const { Lexer } = require('./lexer')
const { Transpiler } = require('./transpiler')

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
