/**
 * @module compiler
 */

const { Tokenizer } = require('./tokenizer')
const { Lexer } = require('./lexer')

const opcodes = {}

const error = function () {

}

module.exports = {
  opcodes,
  error,
}
