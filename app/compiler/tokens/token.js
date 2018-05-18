/**
 * @module compiler/tokens
 */

const { path } = require('../../utils')
const TOKENS = require('./tokens')

class Token {

  constructor (tokenizer, type, value = '', start, end, indent) {
    if (tokenizer instanceof Token) {
      type = tokenizer.type
      value = tokenizer.value
      start = tokenizer.start
      end = tokenizer.end
      indent = tokenizer.indent
      tokenizer = tokenizer.tokenizer
    }
    if (_.isString(tokenizer)) {
      end = start
      start = value
      value = type
      type = tokenizer
    }
    this._tokenizer = tokenizer
    this._type = type
    this._value = value
    this._start = start
    this._end = end
    this._indent = indent
  }

  get tokenizer () { return this._tokenizer }

  get type () {
    if (this._type === TOKENS.RESERVED) {
      return this._value.toUpperCase()
    }
    return this._type
  }

  get value () { return this._value }
  get start () { return this._offsetPos(this._start) }
  get end () { return this._offsetPos(this._end) }
  get length () { return this._end - this._start }
  get indent () { return this._indent }

  _offsetPos (offset) {
    let tokenizer = this._tokenizer
    let line = tokenizer ? tokenizer.lineFromOffset(offset) : -1
    return {
      offset: offset,
      line: line,
      column: offset - (tokenizer ? tokenizer.lineOffsets[line] : 0),
    }
  }

  is (e) {
    if (_.isString(e)) {
      return this._type === e || this.type === e || (this._type === TOKENS.ID && this._value === e)
    }
    else if (_.isArray(e)) {
      for (let i of e) {
        if (this.is(i)) {
          return true
        }
      }
    }
    else if (_.isRegExp(e)) {
      return this.type.match(e) || this._type.match(e) || this._value.match(e)
    }
    else if (_.isFunction(e)) {
      return e.call(this)
    }
    return false
  }

  toString () {
    return _.template('{{type}} "{{value}}" at {{path}}({{line}}:{{column}})')({ type: this._type, value: this._value, line: this.start.line + 1, column: this.start.column + 1, path: this._tokenizer ? path.basename(this._tokenizer.path) : '' })
  }

}

module.exports = {
  Token,
}
