/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { path, fs } = require('../utils')
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
    this._line = 1
    this._column = 1
    this._tokens = []
    this._constants = {}
    return this
  }

  get errors () { return this._errors }
  get path () { return this._path }
  get text () { return this._text }
  get length () { return this._text.length }
  get offset () { return this._offset }
  get line () { return this._line }
  get column () { return this._column }
  get tokens () { return this._tokens }
  get constants () { return this._constants }

  get eos () { return this._offset >= this.length }

  error () {
    this._errors++
    console.error(..._.concat(Array.from(arguments), [_.get(this._tokens, [this._offset], '').toString()]))
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

    for (let r of TOKENS.TOKENS) {
      let rx = text.match(r[1])
      if (rx && rx.index === 0) {
        let value = rx.length > 1 ? rx.slice(1).join('') : rx.join('')
        len = rx[0].length
        token = new TOKENS.Token(this, r[0], value, this.posInfo(offset, line, column), this.posInfo(offset + len, line, column + len - 1))
        offset += len
        break
      }
      else {
        let info = _.template('"…{{text}}…" at {{path}}({{line}}:{{column}})')({ text: _.first(text.split('\n')), line: line, column: column, path: path.basename(this._path) })
        this.error('syntax error', info)
        offset++
        break
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

    this._offset = offset

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
    this.reset()

    if (!text && path) {
      text = await fs.readFile(path, 'utf8')
    }

    this._text = text
    this._path = path

    while (!this.eos) {
      await this.next()
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
