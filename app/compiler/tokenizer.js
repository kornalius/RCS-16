/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { path, fs } = require('../utils')

const TOKENS = [
  ['EOL', /^[\r\n]|;/],

  ['COMMENT', /^\/\/([^\r\n]*)/],

  ['COMMA', /^,/],
  ['COLON', /^:(?=[^A-Z_])/i],

  ['NUMBER', /^([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/],
  ['HEXADECIMAL', /^\$([0-9A-F]+)|0x([0-9A-F]+)/i],

  ['RESERVED', /^(if|then|else|while)\s+/i],


  ['STRING', /^"([^"]*)"/],
  ['CHAR', /^'(.)'/],

  ['INCLUDE', /^#"([^"]*)"/i],

  ['KEY', /^:([A-Z_][A-Z_0-9]*)/i],

  ['ID', /^([A-Z_][A-Z_0-9]*)/i],
  ['ID_FIELD', /^\.([A-Z_][A-Z_0-9]*)/i],

  ['THIS', /^@(?=[^A-Z_])/i],
  ['THIS_FIELD', /^@([A-Z_][A-Z_0-9]*)/i],

  ['OPEN_PAREN', /^\(/],
  ['CLOSE_PAREN', /^\)/],
  ['OPEN_BRACKET', /^\[/],
  ['CLOSE_BRACKET', /^\]/],
  ['OPEN_CURLY', /^\{/],
  ['CLOSE_CURLY', /^\}/],

  ['SYMBOL', /^[\$]/],
  ['MATH', /^[\+\-\*\/%][^=]/],
  ['LOGIC', /^[!&\|\^][^=]/],
  ['COMP', /^>|<|>=|<=|!=|==/],

  ['ASSIGN', /^(=)[^=>]/],
  ['MATH_ASSIGN', /^[\+\-\*\/%]=/],
  ['LOGIC_ASSIGN', /^[!&\|\^]=/],
  ['FN_ASSIGN', /^=>/],
]

class Token {

  constructor (tokenizer, type, value, start, end) {
    this._tokenizer = tokenizer
    this._type = type
    this._value = value || ''
    this._start = start || { offset: 0, line: 0, column: 0 }
    this._end = end || { offset: 0, line: 0, column: 0 }
    this._length = this._end.offset - this._start.offset
  }

  get tokenizer () { return this._tokenizer }
  get type () { return this._type }
  get value () { return this._value }
  get start () { return this._start }
  get end () { return this._end }
  get length () { return this._length }

  is (e) {
    if (_.isString(e)) {
      let parts = e.split('|')
      if (parts.length > 1) {
        for (let p of parts) {
          if (this.is(p)) {
            return true
          }
        }
      }
      else {
        return e === '.' || this.type === e || this._value === e
      }
    }
    else if (_.isArray(e)) {
      for (let i of e) {
        if (this.is(i)) {
          return true
        }
      }
    }
    else if (_.isRegExp(e)) {
      return this.type.match(e) || this._value.match(e)
    }
    return false
  }

  toString () {
    return _.template('<#{type}> #{value}" at #{path}(#{line}:#{column})')({ type: this._type, value: this._value, line: this._start.line, column: this._start.column, path: path.basename(this._tokenizer.path) })
  }

}

class Tokenizer extends Emitter {

  constructor (path, text) {
    super()

    this.reset(path, text)
  }

  reset (text, path) {
    this._errors = 0
    this._path = path || ''
    this._text = text || ''
    this._length = this._text.length
    this._offset = 0
    this._line = 1
    this._column = 1
    this._tokens = []
    this._constants = {}
    return this
  }

  get errors () { return this._errors }
  get path () { return this._path }
  get text () { return this._text }
  get length () { return this._length }
  get offset () { return this._offset }
  get line () { return this._line }
  get column () { return this._column }
  get tokens () { return this._tokens }
  get constants () { return this._constants }

  get eos () { return this._offset >= this._length }

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

  posInfo (offset, line, column) {
    return { offset, line, column }
  }

  peek (offset) {
    let line = this._line
    let column = this._column
    let len = 0

    let token
    offset = _.isNumber(offset) ? offset : this._offset

    let text = this._text.substring(offset)

    for (let r of TOKENS) {
      let rx = text.match(r[1])
      if (rx && rx.index === 0) {
        let value = rx.length > 1 ? rx.slice(1).join('') : rx.join('')
        len = rx[0].length
        token = new Token(this, r[0], value, this.posInfo(offset, line, column), this.posInfo(offset + len, line, column + len - 1))
        offset += len
      }
    }

    return { token, offset, len }
  }

  async next (offset, skipComments = true) {
    offset = _.isNumber(offset) ? offset : this._offset

    let p = this.peek(offset)
    let token = p.token
    offset = p.offset
    let len = p.len

    // Skip comments
    if (skipComments) {
      while (token && token._type === 'COMMENT') {
        let t = this.peek()
        token = t.token
        offset = t.offset
        len = t.len
        this._offset = offset
        this._column += len + 1
      }
    }

    if (token) {
      if (token.type === 'RESERVED' && token.value === 'CONST') {
        let c = []
        this._constants[token.value] = c
        this._offset = offset
        this._column += len + 1
        while (true) {
          let p = this.peek()
          token = p.token
          if (token) {
            this._offset = p.offset
            this._column += p.len + 1
          }
          if (!token || token.is('EOL')) {
            break
          }
          if (token) {
            c.push(token)
          }
        }
      }

      else if (token.type === 'INCLUDE') {
        this._offset = offset
        this._column += len + 1
        let fn = token.value + (path.extname(token.value) === '' ? '.kod' : '')
        let pn = path.join(__dirname, fn)
        try {
          await fs.stat(pn)
        }
        catch (e) {
          try {
            pn = path.join(RCS.DIRS.user, fn)
            await fs.stat(pn)
          }
          catch (e) {
            pn = ''
          }
        }
        if (pn !== '') {
          let src = await fs.readFile(pn, 'utf8')
          let lx = new Tokenizer()
          lx.lex(pn, src)
          if (!lx.errors) {
            _.extend(this._constants, lx.constants)
            this.append(lx.tokens)
          }
        }
      }

      else {
        this.append(token)
        this._offset = offset
        this._column += len + 1
      }

      if (token && token.is('EOL')) {
        this._line++
        this._column = 1
      }
    }

    return token
  }

  async tokenize (text, path) {
    this.reset(text, path)
    while (!this.eos) {
      await this.next()
    }
    return this
  }

  dump () {
    console.info('tokenizer dump')
    console.log(this._tokens)
    console.log('')
  }

}

module.exports = {
  TOKENS,
  Token,
  Tokenizer,
}
