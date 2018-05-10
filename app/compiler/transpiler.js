/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { Node } = require('./parser')
const TOKENS = require('./tokens')

class Transpiler extends Emitter {

  constructor (nodes = []) {
    super ()
    this.reset(nodes)
  }

  get errors () { return this._errors }
  get nodes () { return this._nodes }
  get lines () { return this._lines }
  get line () { return this._line }
  get offset () { return this._offset }
  get code () { return this._code }
  get indent () { return this._indent }

  get length () { return this._lines.length }
  get eos () { return this._offset >= this._nodes.length }
  get node () { return this.nodeAt(this._offset) }

  reset (nodes) {
    this._errors = 0
    this._nodes = nodes
    this._lines = []
    this._line = ''
    this._offset = 0
    this._code = ''
    this._indent = 0
  }

  codeStart () {
    this.writeln('(function () {')
    this._indent++
    this.writeln('\'use strict\';')
    this.writeln()
  }

  codeEnd () {
    this.writeln('})();')
    this._indent--
    this.writeln()
  }

  validOffset (offset) {
    return offset >= 0 && offset < this._nodes.length
  }

  nodeAt (offset) {
    return this.validOffset(offset) ? this._nodes[offset] : undefined
  }

  peek (c = 1) {
    return this.nodeAt(this._offset + c)
  }

  next (c = 1) {
    this._offset += c
  }

  write (...values) {
    this._line += values.join('')
  }

  writeln (...values) {
    this.write(...values)
    this._lines = this._lines.concat(this._line.split('\n'))
    this._line = ''
  }

  str (value) {
    return '\'' + value.replace(/'/g, '\'') + '\''
  }

  comma (nodes) {
    let a = []
    for (let n of nodes) {
      a.push(n instanceof Node ? this.expr(n) : n)
    }
    return a.join(', ')
  }

  ln (str) {
    return str + (!_.endsWith(str, '\n') ? '\n' : '')
  }

  indentize (str) {
    return _.padStart('', this._indent * 2) + str
  }

  assign (node) {
    let t = {}
    if (node) {
      let d = node.data || {}

      let id = this.expr(d.id)
      let _let = node._let ? 'let ' : ''
      let expr
      let op

      if (node.is(TOKENS.ASSIGN)) {
        op = ' ' + node.value + ' '
        expr = this.expr(d.expr)
      }
      else if (node.is(TOKENS.FN_ASSIGN)) {
        op = !node._in_class || node._fn_level > 0 ? ' = ' : ' '
        expr = this.fn_def(d.args, d.body, node._in_class && node._fn_level === 0)
      }

      t = {
        tmpl: '#{_let}#{id}#{op}#{expr}',
        dat: { _let, id, op, expr }
      }
    }
    return t
  }

  fn_def (args, body, in_class) {
    return _.template('#{fn}(#{args}) #{body}')({
      fn: !in_class ? 'function ' : '',
      args: this.expr(args, ', '),
      body: this.block(body),
    })
  }

  fn_call (node) {
    let t = {}
    if (node) {
      let d = node.data || {}
      t = {
        tmpl: '#{field}#{public}#{fn}(#{args})',
        dat: {
          field: node._field ? '.' : '',
          public: node._rom ? '_vm.rom.' : '',
          fn: node.value,
          args: this.expr(d.args, ', '),
        }
      }
    }
    return t
  }

  statement (node) {
    let str = ''

    if (_.isArray(node)) {
      for (let n of node) {
        str += this.statement(n)
      }
    }
    else if (node) {
      let d = node.data || {}
      let t = {}

      if (node.is([TOKENS.ASSIGN, TOKENS.FN_ASSIGN])) {
        t = this.assign(node)
      }
      else if (node.is(TOKENS.FN)) {
        t = this.fn_call(node, true)
      }
      else if (node.is(TOKENS.IF)) {
        t = {
          tmpl: 'if (#{expr}) #{true_body}#{false_body}',
          dat: {
            expr: this.expr(d.expr),
            true_body: this.block(d.true_body),
            false_body: this.statement(d.false_body),
          }
        }
      }
      else if (node.is(TOKENS.ELSE)) {
        if (d.expr) { // else if
          t = {
            tmpl: 'else if (#{expr}) #{true_body}#{false_body}',
            dat: {
              expr: this.expr(d.expr),
              true_body: this.block(d.true_body),
              false_body: this.statement(d.false_body),
            }
          }
        }
        else {
          t = {
            tmpl: 'else #{false_body}',
            dat: { false_body: this.block(d.false_body) }
          }
        }
      }
      else if (node.is(TOKENS.WHILE)) {
        t = {
          tmpl: 'while (#{expr}) #{body}',
          dat: {
            expr: this.expr(d.expr),
            body: this.block(d.body),
          }
        }
      }
      else if (node.is(TOKENS.FOR)) {
        t = {
          tmpl: 'for (let #{v} = #{min_expr}; #{v} < #{max_expr}; #{v} += #{step_expr}) #{body}',
          dat: {
            v: d.v.value,
            min_expr: this.expr(d.min_expr),
            max_expr: this.expr(d.max_expr),
            step_expr: d.step_expr ? this.expr(d.step_expr) : '1',
            body: this.block(d.body),
          }
        }
      }
      else if (node.is(TOKENS.RETURN)) {
        t = {
          tmpl: 'return #{args}',
          dat: { args: this.expr(d.args, ', ') }
        }
      }
      else if (node.is([TOKENS.BREAK, TOKENS.CONTINUE])) {
        t = {
          tmpl: '#{word}',
          dat: { word: node.value }
        }
      }
      else if (node.is(TOKENS.CLASS)) {
        t = {
          tmpl: 'class #{name}#{_extends} #{body}',
          dat: {
            name: d.id.value,
            _extends: d._extends ? ' extends ' + this.expr(d._extends, ', ') : '',
            body: this.block(d.body),
          }
        }
      }

      str = _.template(t.tmpl)(t.dat)
    }

    return this.ln(this.indentize(str))
  }

  block (node) {
    let str = this.ln('{')
    this._indent++
    if (_.isArray(node)) {
      for (let n of node) {
        str += this.statement(n)
      }
    }
    else {
      str = this.statement(node)
    }
    this._indent--
    str += this.ln(this.indentize('}'))
    return str
  }

  expr (node, separator) {
    let str = ''

    if (_.isArray(node)) {
      let a = []
      for (let n of node) {
        a.push(this.expr(n))
      }
      str = a.join(separator || '')
    }
    else {
      let d = node && node.data || {}
      let t = { tmpl: '', dat: {} }

      if (node) {
        if (_.isString(node)) {
          t = {
            tmpl: '#{node}',
            dat: { node }
          }
        }
        else if (node.is(TOKENS.FN)) {
          t = this.fn_call(node)
        }
        else if (node.is(TOKENS.FN_ASSIGN)) {
          t = {
            tmpl: '#{fn}',
            dat: { fn: this.fn_def(d.args, d.body) }
          }
        }
        else if (node.is(TOKENS.OPEN_BRACKET)) {
          t = {
            tmpl: '[#{args}]#{fields}',
            dat: {
              args: this.expr(d.args, ', '),
              fields: d.fields ? this.expr(d.fields, '') : '',
            }
          }
        }
        else if (node.is(TOKENS.OPEN_CURLY)) {
          let def = _.map(d.def, f => _.template('#{value}: #{expr}')({ value: f.value, expr: this.expr(f.data.expr) }))
          t = {
            tmpl: '{#{def}}#{fields}',
            dat: {
              def: this.expr(def, ', '),
              fields: d.fields ? this.expr(d.fields, '') : ''
            }
          }
        }
        else if (node.is([TOKENS.MATH, TOKENS.LOGIC, TOKENS.COMP])) {
          t = {
            tmpl: '#{left} #{op} #{right}',
            dat: {
              op: node.value,
              left: this.expr(d.left),
              right: this.expr(d.right),
            }
          }
        }
        else if (node.is([TOKENS.THIS, TOKENS.THIS_FIELD])) {
          t = {
            tmpl: 'this#{dot}#{field}#{fields}',
            dat: {
              dot: node.is(TOKENS.THIS_FIELD) ? '.' : '',
              field: node.is(TOKENS.THIS_FIELD) ? node.value : '',
              fields: d.fields ? this.expr(d.fields, '') : '',
            }
          }
        }
        else if (node.is([TOKENS.CHAR, TOKENS.STRING])) {
          t = {
            tmpl: '#{value}',
            dat: { value: this.str(node.value) }
          }
        }
        else if (node.is(TOKENS.NEW)) {
          t = {
            tmpl: 'new #{id}(#{args})',
            dat: {
              id: d.id.value,
              args: this.expr(d.args, ', '),
            }
          }
        }
        else if (node.is(TOKENS.ID)) {
          t = {
            tmpl: '#{field}#{public}#{value}#{fields}#{assign}',
            dat: {
              field: node._field ? '.' : '',
              public: node._rom ? '_vm.rom.' : '',
              value: node.value,
              fields: d.fields ? this.expr(d.fields, '') : '',
              assign: d.assign ? ' = ' + this.expr(d.assign, '') : '',
            }
          }
        }
        else {
          t = {
            tmpl: '#{value}',
            dat: { value: node.value }
          }
        }
      }
      else {
        t = {
          tmpl: 'undefined',
          dat: {}
        }
      }

      str = _.template(t.tmpl)(t.dat)
    }

    return str
  }

  transpile (nodes) {
    this.reset(nodes)
    this.codeStart()
    while (!this.eos) {
      this.writeln(this.statement(this.node))
      this.next()
    }
    this.codeEnd()
    this._code = this._lines.join('\n')
    return this._code
  }

  dump () {
    console.info('transpiler dump')
    console.log(this._code)
    console.log('')
  }

}

module.exports = {
  Transpiler,
}
