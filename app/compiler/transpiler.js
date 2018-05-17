/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { Node } = require('./parser')
const TOKENS = require('./tokens')

class Transpiler extends Emitter {

  constructor () {
    super ()
    this.reset()
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

  reset (nodes = []) {
    this._errors = 0
    this._nodes = []
    this._lines = []
    this._line = ''
    this._offset = 0
    this._code = ''
    this._indent = 0
    this._nodes = nodes
  }

  codeStart () {
    this.writeln('(function () {')
    this._indent++
    this.writeln(this.indentize('\'use strict\';'))
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
      let id = this.expr(node.id)
      let _let = node._let ? 'let ' : ''
      let expr
      let op

      if (node.is(TOKENS.ASSIGN)) {
        op = ' ' + node.value + ' '
        expr = this.expr(node.expr)
      }
      else if (node.is(TOKENS.FN_ASSIGN)) {
        op = !node._in_class || node._fn_level > 0 ? ' = ' : ' '
        expr = this.fn_def(node.args, node.body, node._in_class && node._fn_level === 0)
      }

      t = {
        tmpl: '{{_let}}{{id}}{{op}}{{expr}}',
        data: { _let, id, op, expr }
      }
    }
    return t
  }

  fn_def (args, body, in_class = false) {
    return _.template('{{fn}}({{args}}) {{body}}')({
      fn: !in_class ? 'function ' : '',
      args: this.expr(args, ', '),
      body: this.block(body),
    })
  }

  fn_call (node) {
    let t = {}
    if (node) {
      t = {
        tmpl: '{{field}}{{fn}}({{args}}){{suffix}}',
        data: {
          field: node._field ? '.' : '',
          fn: node.value,
          args: !_.isEmpty(node.args) ? this.expr(node.args, ', ') : '',
          suffix: !_.isEmpty(node.suffix) ? this.expr(node.suffix, '') : '',
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
      let t = {}

      if (node.is([TOKENS.ASSIGN, TOKENS.FN_ASSIGN])) {
        t = this.assign(node)
      }
      else if (node.is(TOKENS.FN)) {
        t = this.fn_call(node)
      }
      else if (node.is(TOKENS.IF)) {
        t = {
          tmpl: 'if ({{expr}}) {{true_body}}{{false_body}}',
          data: {
            expr: this.expr(node.expr),
            true_body: this.block(node.true_body),
            false_body: this.statement(node.false_body),
          }
        }
      }
      else if (node.is(TOKENS.ELSE)) {
        if (node.expr) { // else if
          t = {
            tmpl: 'else if ({{expr}}) {{true_body}}{{false_body}}',
            data: {
              expr: this.expr(node.expr),
              true_body: this.block(node.true_body),
              false_body: this.statement(node.false_body),
            }
          }
        }
        else {
          t = {
            tmpl: 'else {{false_body}}',
            data: { false_body: this.block(node.false_body) }
          }
        }
      }
      else if (node.is(TOKENS.WHILE)) {
        t = {
          tmpl: 'while ({{expr}}) {{body}}',
          data: {
            expr: this.expr(node.expr),
            body: this.block(node.body),
          }
        }
      }
      else if (node.is(TOKENS.FOR)) {
        t = {
          tmpl: 'for (let {{v}} = {{min_expr}}; {{v}} < {{max_expr}}; {{v}} += {{step_expr}}) {{body}}',
          data: {
            v: node.v.value,
            min_expr: this.expr(node.min_expr),
            max_expr: this.expr(node.max_expr),
            step_expr: node.step_expr ? this.expr(node.step_expr) : '1',
            body: this.block(node.body),
          }
        }
      }
      else if (node.is(TOKENS.RETURN)) {
        t = {
          tmpl: 'return {{args}}',
          data: {
            args: !_.isEmpty(node.args) ? this.expr(node.args, ', ') : '',
          }
        }
      }
      else if (node.is([TOKENS.BREAK, TOKENS.CONTINUE])) {
        t = {
          tmpl: '{{word}}',
          data: { word: node.value }
        }
      }
      else if (node.is(TOKENS.CLASS)) {
        t = {
          tmpl: 'class {{name}}{{_extends}} {{body}}',
          data: {
            name: node.id.value,
            _extends: node._extends ? ' extends ' + this.expr(node._extends, ', ') : '',
            body: this.block(node.body),
          }
        }
      }

      str = _.template(t.tmpl)(t.data)
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
      let t = { tmpl: '', data: {} }

      if (node) {
        if (_.isString(node)) {
          t = {
            tmpl: '{{node}}',
            data: { node }
          }
        }
        else if (node.is(TOKENS.FN)) {
          t = this.fn_call(node)
        }
        else if (node.is(TOKENS.FN_ASSIGN)) {
          t = {
            tmpl: '{{fn}}',
            data: {
              fn: this.fn_def(node.args, node.body),
            }
          }
        }
        else if (node.is(TOKENS.OPEN_BRACKET)) {
          t = {
            tmpl: '[{{args}}]{{fields}}',
            data: {
              args: !_.isEmpty(node.args) ? this.expr(node.args, ', ') : '',
              fields: !_.isEmpty(node.fields) ? this.expr(node.fields, '') : '',
            }
          }
        }
        else if (node.is([TOKENS.OPEN_CURLY, TOKENS.KEY])) {
          let def = _.map(node.def, f => _.template('{{value}}: {{expr}}')({ value: f.value, expr: this.expr(f.expr) }))
          t = {
            tmpl: '{ {{def}} }{{fields}}',
            data: {
              def: def.join(', '),
              fields: !_.isEmpty(node.fields) ? this.expr(node.fields, '') : ''
            }
          }
        }
        else if (node.is([TOKENS.MATH, TOKENS.LOGIC, TOKENS.COMP])) {
          t = {
            tmpl: '{{left}} {{op}} {{right}}',
            data: {
              op: node.value,
              left: this.expr(node.left),
              right: this.expr(node.right),
            }
          }
        }
        else if (node.is([TOKENS.THIS, TOKENS.THIS_FIELD])) {
          t = {
            tmpl: 'this{{dot}}{{field}}{{fields}}',
            data: {
              dot: node.is(TOKENS.THIS_FIELD) ? '.' : '',
              field: node.is(TOKENS.THIS_FIELD) ? node.value : '',
              fields: !_.isEmpty(node.fields) ? this.expr(node.fields, '') : '',
            }
          }
        }
        else if (node.is([TOKENS.CHAR, TOKENS.STRING])) {
          t = {
            tmpl: '{{value}}',
            data: { value: this.str(node.value) }
          }
        }
        else if (node.is(TOKENS.NEW)) {
          t = {
            tmpl: 'new {{id}}({{args}})',
            data: {
              id: node.id.value,
              args: !_.isEmpty(node.args) ? this.expr(node.args, ', ') : '',
            }
          }
        }
        else if (node.is(TOKENS.ID)) {
          t = {
            tmpl: '{{field}}{{public}}{{value}}{{fields}}{{assign}}',
            data: {
              field: node._field ? '.' : '',
              public: node._rom ? '_vm.rom.' : '',
              value: node.value,
              fields: !_.isEmpty(node.fields) ? this.expr(node.fields, '') : '',
              assign: node.assign ? ' = ' + this.expr(node.assign, '') : '',
            }
          }
        }
        else {
          t = {
            tmpl: '{{value}}',
            data: { value: node.value }
          }
        }
      }
      else {
        t = {
          tmpl: 'undefined',
          data: {}
        }
      }

      str = _.template(t.tmpl)(t.data)
    }

    return str
  }

  async transpile (nodes) {
    this.reset(nodes)

    this.codeStart()

    for (let key in RCS.Compiler.globals) {
      let v = RCS.Compiler.globals[key]
      if (_.isFunction(v)) {
        this.writeln(this.indentize(v.toString()))
      }
    }
    this.writeln()

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
