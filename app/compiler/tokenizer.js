/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { path, fs } = require('../utils')
const TOKENS = require('./tokens')

const INDENT_AWARE = true

class Tokenizer extends Emitter {

  constructor () {
    super()

    this.reset()
  }

  reset () {
    this._errors = 0
    this._path = undefined
    this._text = undefined
    this._offset = 0
    this._tokens = []
    this._constants = {}
    this._lines = undefined
    this._lineOffsets = undefined
    return this
  }

  get errors () { return this._errors }
  get path () { return this._path }
  get text () { return this._text }
  get length () { return this._text.length }
  get offset () { return this._offset }
  get tokens () { return this._tokens }
  get constants () { return this._constants }

  get eos () { return this._offset >= this.length }

  get lines () {
    if (!this._lines) {
      this._lines = []
      this._lineOffsets = []

      let eol = _.find(TOKENS.RULES, r => r[0] === TOKENS.EOL)[1]
      let text = this._text
      let len = this.length
      let i = 0
      let start = 0

      while (i <= len) {
        let m = text.substring(i++).match(eol)
        if (m && m.index === 0) {
          this._lineOffsets.push(start)
          this._lines.push(text.substring(start, i - 1))
          i += m[0].length - 1
          start = i
        }
      }

      if (start < i) {
        this._lineOffsets.push(start)
        this._lines.push(text.substring(start, i - 1))
      }
    }
    return this._lines
  }

  get lineOffsets () {
    if (!this._lineOffsets) {
      let lines = this.lines // eslint-disable-line
    }
    return this._lineOffsets
  }

  lineFromOffset (offset) {
    let lineOffsets = this.lineOffsets
    for (let i = 0; i < lineOffsets.length - 1; i++) {
      if (lineOffsets[i + 1] > offset) {
        return i
      }
    }
    return -1
  }

  columnFromOffset (offset) {
    let line = this.lineFromOffset(offset)
    if (line !== -1) {
      return offset - this.lineOffsets[line]
    }
    return -1
  }

  error () {
    this._errors++
    console.error(..._.concat(Array.from(arguments), [_.get(this._tokens, this._offset, '').toString()]))
  }

  append (token) {
    let c = this._constants[token.value]
    if (c) {
      token = c
    }

    if (_.isArray(token)) {
      this._tokens = _.concat(this._tokens, token)
    }
    else {
      this._tokens.push(token)
    }
  }

  _getMatchingRule (text) {
    for (let r of TOKENS.RULES) {
      let rx = text.match(r[1])
      if (rx && rx.index === 0) {
        return {
          rule: r,
          value: rx.length > 1 ? rx.slice(1).join('') : rx.join(''),
          length: rx[0].length,
        }
      }
    }
    return undefined
  }

  findConstant (name) {
    return this._constants[name]
  }

  peek (offset, skipComments = true, skipWhitespaces = true) {
    if (offset >= this.length) {
      return undefined
    }

    let token
    let len = 0
    let indent
    let text = this._text.substring(offset)

    let r = this._getMatchingRule(text)
    if (r) {
      if (INDENT_AWARE && r.rule[0] === TOKENS.EOL) {
        debugger
        let p = this.peek(offset + r.length, skipComments, false)
        if (p && p.token.is(TOKENS.WHITESPACE)) {
          indent = p.token.length
        }
      }

      let skip = skipComments && r.rule[0] === TOKENS.COMMENT || skipWhitespaces && r.rule[0] === TOKENS.WHITESPACE

      let o = offset
      len = r.length
      offset += len

      if (!skip) {
        token = new TOKENS.Token(this, r.rule[0], r.value, o, offset, indent)
      }
      else {
        let p = this.peek(offset, skipComments, skipWhitespaces)
        if (p) {
          token = p.token
          offset = p.offset
          len = p.len
        }
        else {
          return undefined
        }
      }
    }

    else {
      let info = _.template('"…{{text}}…" at {{path}}({{line}}:{{column}}:{{offset}})')({ text: _.first(text.split('\n')), line: this.lineFromOffset(offset), column: this.columnFromOffset(offset), offset, path: path.basename(this._path) })
      this.error('syntax error', info)
      offset++
    }

    return { token, offset, len }
  }

  async next (offset, skipComments = true, skipWhitespaces = true) {
    let p = this.peek(offset, skipComments, skipWhitespaces)
    if (!p) {
      return this.length
    }

    let token = p.token
    offset = p.offset

    if (token) {
      if (token.is(TOKENS.CONST)) {
        let c = []
        this._constants[token.value] = c
        while (true) {
          let p = this.peek(offset, skipComments, skipWhitespaces)
          if (!p) {
            return this.length
          }
          token = p.token
          if (!token || token.is(TOKENS.EOL)) {
            break
          }
          c.push(token)
          offset = p.offset
        }
      }

      else if (token.is(TOKENS.INCLUDE)) {
        let fn = token.value + (path.extname(token.value) === '' ? '.rcs' : '')
        let src = await RCS.main.load(fn)
        let tokenizer = new Tokenizer()
        let tokens = await tokenizer.tokenize(src, fn)
        if (!tokenizer.errors) {
          _.extend(this._constants, tokenizer.constants)
          this.append(tokens)
        }
      }

      else {
        let c = this.findConstant(token.value)
        if (c) {
          token = c
        }
        this.append(token)
      }
    }

    return offset
  }

  async tokenize (text, path, skipComments = true, skipWhitespaces = true) {
    this.reset()

    if (!text && path) {
      text = await fs.readFile(path, 'utf8')
    }

    this._text = text
    this._path = path

    while (!this.eos) {
      this._offset = await this.next(this._offset, skipComments, skipWhitespaces)
    }

    return this._errors === 0 ? this._tokens : undefined
  }

  dump () {
    console.info('tokenizer dump')
    console.log(this._tokens)
    console.log('')
  }

}

module.exports = {
  Tokenizer,
}
