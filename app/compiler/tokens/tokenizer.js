/**
 * @module compiler
 */

const { Emitter } = require('../../mixins/common/events')
const { path, fs } = require('../../utils')
const { Token } = require('./token')
const TOKENS = require('./tokens')

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
    this._indentMode = true
    this._indentSpaces = 0
    this._indent = 0
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
    let text = this._text
    let len = this.length
    let i = 0
    let start = 0

    const push = () => {
      let line = text.substring(start, i - 1)
      this._lineOffsets.push(start)
      this._lines.push(line)
    }

    if (!this._lines) {
      this._lines = []
      this._lineOffsets = []

      let eol = _.find(TOKENS.RULES, r => r[0] === TOKENS.EOL)[1]

      while (i <= len) {
        let m = text.substring(i++).match(eol)
        if (m && m.index === 0) {
          push()
          i += m[0].length - 1
          start = i
        }
      }

      if (start < i) {
        push()
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

  lineTokens (l) {
    let tokens = []
    let offsets = this.lineOffsets
    let start = offsets[l]
    let end = l + 1 < offsets.length ? offsets[l + 1] : this.length
    for (let t of this._tokens) {
      if (t._start >= start && t._end <= end) {
        tokens.push(t)
      }
    }
    return tokens
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
    if (_.isArray(token)) {
      for (let t of token) {
        this.append(t)
      }
    }
    else {
      let c = this.findConstant(token.value)
      if (c) {
        token = c
      }
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
    return this._constants.hasOwnProperty(name) ? this._constants[name] : undefined
  }

  peek (offset, skipComments = true) {
    if (offset >= this.length) {
      return undefined
    }

    let token
    let len = 0
    let text = this._text.substring(offset)
    let rule

    let r = this._getMatchingRule(text)
    if (r) {
      let o = offset
      len = r.length
      rule = _.first(r.rule)
      offset += len

      if (!skipComments || rule !== TOKENS.COMMENT) {
        token = new Token(this, rule, r.value, o, offset)
      }
      else {
        let p = this.peek(offset, skipComments)
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

    return { token, offset, len, rule }
  }

  async next (offset, skipComments = true, checkIndent = true) {
    let p = this.peek(offset, skipComments)
    if (!p) {
      return this.length
    }

    let token = p.token
    offset = p.offset

    if (token) {

      if (checkIndent) {
        while (p && p.rule === TOKENS.EOL) { // when new line
          this.append(token) // append EOL

          p = this.peek(offset, skipComments)
          if (p) {
            if (p.rule === TOKENS.WHITESPACE) { // has some whitespaces

              token = p.token
              offset = p.offset

              let c = 0
              for (let ch of token.value) {
                c += ch === '\t' ? 2 : 1
              }
              c = Math.trunc(c / 2)

              if (c > this._indent) {
                for (let i = this._indent; i < c; i++) {
                  this.append(new Token(this, TOKENS.INDENT, '≥', token._start, token._end))
                }
              }
              else if (c < this._indent) {
                for (let i = c; i < this._indent; i++) {
                  this.append(new Token(this, TOKENS.DEDENT, '≤', token._start, token._end))
                }
              }

              this._indent = c

              // peek next token
              p = this.peek(offset, skipComments)
            }

            else if (p.rule !== TOKENS.EOL) { // line starts with no whitespaces
              for (let i = 0; i < this._indent; i++) {
                this.append(new Token(this, TOKENS.DEDENT, '≤', token._start, token._end))
              }
              this._indent = 0
            }

            token = p.token
            offset = p.offset
          }
        }
      }

      if (token.is(TOKENS.CONST)) {
        let c = []
        this._constants[token.value] = c
        while (true) {
          let p = this.peek(offset, skipComments)
          if (!p) {
            return this.length
          }
          token = p.token
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

      else if (!token.is(TOKENS.WHITESPACE)) {
        this.append(token)
      }
    }

    return offset
  }

  async tokenize (text, path, skipComments = true) {
    this.reset()

    if (!text && path) {
      text = await fs.readFile(path, 'utf8')
    }

    this._text = text
    this._path = path

    let lines = this.lines // eslint-disable-line

    while (!this.eos) {
      this._offset = await this.next(this._offset, skipComments)
    }

    return this._errors === 0 ? this._tokens : undefined
  }

  dump () {
    console.info('Tokenizer dump')
    console.log(_.map(this._tokens, t => _.isEmpty(t.value) ? t.type : t.value).join(' '))
    console.log('Tokens: ', this._tokens)
    // console.log('Lines: ', this._lines)
    // console.log('Offsets: ', this._lineOffsets)
    console.log('')
  }

}

module.exports = {
  Tokenizer,
}
