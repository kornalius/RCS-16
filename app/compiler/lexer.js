/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { path, fs } = require('../utils')

class Token {

  constructor (lexer, type, value, start, end) {
    if (lexer instanceof Token) {
      let t = lexer
      this._lexer = t.lexer
      this._type = t._type
      this._reserved = t._reserved
      this._value = t.value
      this._start = _.clone(t.start)
      this._end = _.clone(t.end)
      this._length = t.value.length
    }
    else {
      this._lexer = lexer
      this._type = type
      this._reserved = false
      this._value = value || ''
      this._start = start || { offset: 0, line: 0, column: 0 }
      this._end = end || { offset: 0, line: 0, column: 0 }
      this._length = this._end.offset - this._start.offset
    }
  }

  get lexer () { return this._lexer }
  get reserved () { return this._reserved }
  get value () { return this._value }
  get start () { return this._start }
  get end () { return this._end }
  get length () { return this._length }

  get type () {
    if (this._type === 'math_assign' || this._type === 'logic_assign') {
      this._type = 'assign'
    }
    else if (this._type === 'super') {
      this._type = 'super'
    }
    else if (this._type === 'id') {
      let r = this._value.match(this._lexer.rom_regexp) // public words
      if (r && r.length > 0) {
        this._rom = true
      }
    }
    return this._type
  }

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
    else if (_.isRegExp(e)) {
      return this.type.match(e) || this._value.match(e)
    }
    else if (_.isArray(e)) {
      for (let i of e) {
        if (this.is(i)) {
          return true
        }
      }
    }
    return false
  }

  toString () {
    return _.template('"#{value}" at #{path}(#{line}:#{column})')({ value: this._value, line: this._start.line, column: this._start.column, path: path.basename(this._lexer.path) })
  }

}


class Lexer extends Emitter {

  constructor (path, text) {
    this._token_types = {
      eol: /^[\r\n]|;/,
      comma: /^,/,
      colon: /^:(?=[^A-Z_])/i,

      comment: /^\/\/([^\r\n]*)/,

      reserved: /^(if|then|else|while|const|let)\s+/i,

      hex: /^\$([0-9A-F]+)|0x([0-9A-F]+)/i,
      number: /^([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/,

      string: /^"([^"]*)"/,
      char: /^'(.)'/,

      include: /^#"([^"]*)"/i,

      key: /^:([A-Z_][A-Z_0-9]*)/i,

      id: /^([A-Z_][A-Z_0-9]*)/i,
      id_field: /^\.([A-Z_][A-Z_0-9]*)/i,

      this: /^@(?=[^A-Z_])/i,
      this_field: /^@([A-Z_][A-Z_0-9]*)/i,

      open_paren: /^\(/,
      close_paren: /^\)/,
      open_bracket: /^\[/,
      close_bracket: /^\]/,
      open_curly: /^\{/,
      close_curly: /^\}/,

      symbol: /^[\$]/,
      math: /^[\+\-\*\/%][^=]/,
      logic: /^[!&\|\^][^=]/,
      comp: /^>|<|>=|<=|!=|==/,

      assign: /^(=)[^=>]/,
      math_assign: /^[\+\-\*\/%]=/,
      logic_assign: /^[!&\|\^]=/,
      fn_assign: /^=>/,
    }

    this.reset(path, text)
  }

  reset (path, text) {
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

  get token_types () { return this._token_types }
  get errors () { return this._errors }
  get path () { return this._path }
  get text () { return this._text }
  get length () { return this._length }
  get offset () { return this._offset }
  get line () { return this._line }
  get column () { return this._column }
  get tokens () { return this._tokens }
  get constants () { return this._constants }

  validOffset (offset) { return offset >= 0 && offset < this._length }

  eos () { return this.validOffset(this._offset) }

  char_at (i) { return this._text.charAt(i) }

  subtext (i) { return this._text.substring(i) }

  peek () {
    let pos_info = (offset, line, column) => { return { offset, line, column } }

    let token = null
    let l = _.last(this._tokens)
    let offset = this._offset
    let len = 0

    while ([' ', '\t'].indexOf(this.char_at(offset)) !== -1) {
      if (l && !l.next_is_space) {
        l.next_is_space = true
      }
      if (!this.validOffset(offset)) {
        return { token, offset }
      }
      offset++
    }

    let old_offset = offset

    let line = this._line
    let column = this._column
    for (let k in this._token_types) {
      let r = this.subtext(offset).match(this._token_types[k])
      if (r && r.index === 0) {
        let value = r.length > 1 ? r.slice(1).join('') : r.join('')
        len = r[0].length
        token = new Token(this, k, value, pos_info(offset, line, column), pos_info(offset + len, line, column + len - 1))
        offset += len
        break
      }
    }
    if (offset === old_offset) {
      this._offset = offset + 1
    }
    return { token, offset, len }
  }

  insertToken (t) {
    let c = this._constants[t.value]
    if (_.isArray(c)) {
      for (let t of c) {
        this.insertToken(t)
      }
    }
    else {
      this._tokens.push(t)
    }
  }

  next () {
    let { token, offset, len } = this.peek()

    while (token && token._type === 'comment') {
      let t = this.peek()
      token = t.token
      offset = t.offset
      len = t.len
      this._offset = offset
      this._column += len + 1
    }

    if (token) {
      if (token.type === 'reserved' && token.value === 'const') {
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
          if (!token || token.is('eol')) {
            break
          }
          if (token) {
            c.push(token)
          }
        }
      }

      else if (token.type === 'include') {
        this._offset = offset
        this._column += len + 1
        let fn = token.value + (path.extname(token.value) === '' ? '.kod' : '')
        let pn = path.join(__dirname, fn)
        try {
          fs.statSync(pn)
        }
        catch (e) {
          try {
            pn = path.join(RCS.DIRS.user, fn)
            fs.statSync(pn)
          }
          catch (e) {
            pn = ''
          }
        }
        if (pn !== '') {
          let src = fs.readFileSync(pn, 'utf8')
          let lx = new Lexer(this.vm)
          lx.run(pn, src)
          if (!lx.errors) {
            _.extend(this._constants, lx.constants)
            this._tokens = this._tokens.concat(lx.tokens)
          }
        }
      }

      else {
        this.insertToken(token)
        this._offset = offset
        this._column += len + 1
      }

      if (token && token.is('eol')) {
        this._line++
        this._column = 1
      }
    }

    return token
  }

  run (path, text) {
    if (!text) {
      text = path
      path = ''
    }
    this.reset(path, text)
    while (this.validOffset(this._offset)) {
      this.next()
    }
    return this
  }

  dump () {
    console.info('lexer dump')
    console.log(this._tokens)
    console.log('')
  }

}

module.exports = {
  Token,
  Lexer,
}
