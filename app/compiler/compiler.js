/**
 * @module compiler
 */

const { Tokenizer } = require('./tokenizer')
const { Lexer } = require('./lexer')

const OPCODES = {}

const error = function () {
  console.error(...arguments)
}

module.exports = {
  OPCODES,
  error,
}
