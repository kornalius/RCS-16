/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { path, fs } = require('../utils')
const TOKENS = require('./tokens')

class Tokenizer extends Emitter {

  constructor (path, text) {
    super()

    this.reset(path, text)
  }

  reset (text = '', path = '') {
    this._errors = 0
    this._path = path
    this._text = text
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
        token = new TOKENS.Token(this, r[0], value, this.posInfo(offset, line, column), this.posInfo(offset + len, line, column + len - 1))
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
      while (token && token._type === TOKENS.COMMENT) {
        let t = this.peek()
        token = t.token
        offset = t.offset
        len = t.len
        this._offset = offset
        this._column += len + 1
      }
    }

    if (token) {
      if (token.type === TOKENS.RESERVED && token.value === TOKENS.CONST) {
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
          if (!token || token.is(TOKENS.EOL)) {
            break
          }
          if (token) {
            c.push(token)
          }
        }
      }

      else if (token.type === TOKENS.INCLUDE) {
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

      if (token && token.is(TOKENS.EOL)) {
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
  Tokenizer,
}
