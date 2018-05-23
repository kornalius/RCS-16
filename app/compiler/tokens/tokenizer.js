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
    this._lineIndents = undefined
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

    const indentCount = line => {
      let ll = line.length

      let x = 0
      let c = 0
      while (x < ll) {
        if (line.substr(x, 2) === '  ') {
          x += 2
          c++
        }
        else if (line.charAt(x) === TOKENS.TAB) {
          x++
          c++
        }
        else {
          break
        }
      }

      return c
    }

    const push = () => {
      let line = text.substring(start, i - 1)
      this._lineIndents.push(indentCount(line))
      this._lineOffsets.push(start)
      this._lines.push(line)
    }

    if (!this._lines) {
      this._lines = []
      this._lineOffsets = []
      this._lineIndents = []

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

  get lineIndents () {
    if (!this._lineIndents) {
      let lines = this.lines // eslint-disable-line
    }
    return this._lineIndents
  }

  get lineTokens () { return this._lineTokens }

  getTokensForLine (l) {
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
      let skip = skipComments && r.rule[0] === TOKENS.COMMENT || skipWhitespaces && r.rule[0] === TOKENS.WHITESPACE

      let o = offset
      len = r.length
      offset += len

      if (!skip) {
        token = new Token(this, r.rule[0], r.value, o, offset, indent)
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

    let lines = this.lines // eslint-disable-line

    while (!this.eos) {
      this._offset = await this.next(this._offset, skipComments, skipWhitespaces)
    }

    this.addIndentEnds()

    return this._errors === 0 ? this._tokens : undefined
  }

  addIndentEnds () {
    if (!_.isEmpty(this._tokens)) {
      let l = 0
      let level = 0
      let needsEnd = {}
      let needsIndentLevel = false
      let newTokens = []
      let queued = []
      let tokens = this._tokens
      let lineIndents = this._lineIndents

      const addEnds = (level, indents, token) => {
        let start = token ? token.start : this.length
        let end = token ? token.end : this.length
        while (level >= indents) {
          while (needsEnd[level] > 0) {
            queued.unshift(new Token(this, TOKENS.EOL, '\n', start, end))
            queued.unshift(new Token(this, TOKENS.END, 'end', start, end))
            needsEnd[level]--
            console.log(indents, level, needsEnd[level], _.padStart('end', level * 2 + 3, ' '))
          }
          level--
        }
      }

      for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i]

        queued.push(token)

        if (token.is(TOKENS.EOL)) {
          let lineTokens = this.getTokensForLine(l)
          let first = _.first(lineTokens)

          if (!first || first.is(TOKENS.EOL)) {
            newTokens = _.concat(newTokens, queued)
            queued = []
            l++
            continue
          }

          let indents = lineIndents[l]
          let last = _.nth(lineTokens, -2)

          let debug = []
          let newIndent = false

          // if (!first.is(TOKENS.EOL) && needsIndentLevel > 0 && indents !== needsIndentLevel) {
          //   this._offset = i
          //   this.error('Indentation error', indents, needsIndentLevel)
          // }
          // needsIndentLevel = 0

          if (indents < level && !first.is([TOKENS.END, TOKENS.ELSE]) && needsEnd[indents] > 0) {
            addEnds(level, indents, token)
            needsIndentLevel = indents - 1
          }

          if (first.is([TOKENS.IF, TOKENS.CLASS]) || last && last.is(TOKENS.FN_ASSIGN)) {
            if (_.isUndefined(needsEnd[indents])) {
              needsEnd[indents] = 0
            }
            needsEnd[indents]++
            needsIndentLevel = indents + 1
            newIndent = true
          }

          debug.push(indents)
          debug.push(level)
          debug.push(needsEnd[indents] || 0)
          debug.push(this.lines[l])
          if (newIndent) {
            debug.push('**')
          }

          console.log(...debug)

          level = indents

          newTokens = _.concat(newTokens, queued)
          queued = []
          l++
        }
      }

      addEnds(0, 0)

      newTokens = _.concat(newTokens, queued)
      queued = []

      this._tokens = newTokens
    }
  }

  dump () {
    console.info('Tokenizer dump')
    console.log('Tokens: ', this._tokens)
    console.log(_.map(this._tokens, 'value').join(' '))
    console.log('Lines: ', this._lines)
    console.log('Lines Tokens: ', this._lineTokens)
    console.log('Offsets: ', this._lineOffsets)
    console.log('Indents: ', this._lineIndents)
    console.log('')
  }

}

module.exports = {
  Tokenizer,
}
