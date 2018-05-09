import _ from 'lodash'

export var Transpiler

Transpiler = class {

  constructor (nodes) {
    this.reset(nodes || [])
  }

  get length () { return this.lines.length }

  get eos () { return this.offset >= this.nodes.length }

  get node () { return this.node_at(this.offset) }

  validOffset (offset) { return offset >= 0 && offset < this.nodes.length }

  node_at (offset) { return this.validOffset(offset) ? this.nodes[offset] : null }

  peek (c = 1) { return this.node_at(this.offset + c) }

  next (c = 1) { this.offset += c }

  write (...values) { this.line += values.join('') }

  writeln (...values) {
    this.write(...values)
    this.lines = this.lines.concat(this.line.split('\n'))
    this.line = ''
  }

  reset (nodes) {
    this.errors = 0
    this.nodes = nodes
    this.lines = []
    this.line = ''
    this.offset = 0
    this.code = ''
    this.indent_level = 0
  }

  code_start () {
    this.writeln('(function () {')
    this.indent_level++
    this.writeln('\'use strict\';')
    this.writeln()
  }

  code_end () {
    this.writeln('})();')
    this.indent_level--
    this.writeln()
  }

  str (value) { return '\'' + value.replace(/'/g, '\'') + '\'' }

  comma (nodes) {
    let a = []
    for (let n of nodes) {
      a.push(n instanceof Node ? this.expr(n) : n)
    }
    return a.join(', ')
  }

  ln (str) { return str + (!_.endsWith(str, '\n') ? '\n' : '') }

  indent (str) { return _.padStart('', this.indent_level * 2) + str }

  assign (node) {
    let t = {}
    if (node) {
      let d = node.data || {}

      let id = this.expr(d.id)
      let _let = node._let ? 'let ' : ''
      let expr
      let op

      if (node.is('assign')) {
        op = ' ' + node.value + ' '
        expr = this.expr(d.expr)
      }
      else if (node.is('fn_assign')) {
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

      if (node.is(['assign', 'fn_assign'])) {
        t = this.assign(node)
      }
      else if (node.is('fn')) {
        t = this.fn_call(node, true)
      }
      else if (node.is('if')) {
        t = {
          tmpl: 'if (#{expr}) #{true_body}#{false_body}',
          dat: {
            expr: this.expr(d.expr),
            true_body: this.block(d.true_body),
            false_body: this.statement(d.false_body),
          }
        }
      }
      else if (node.is('else')) {
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
      else if (node.is('while')) {
        t = {
          tmpl: 'while (#{expr}) #{body}',
          dat: {
            expr: this.expr(d.expr),
            body: this.block(d.body),
          }
        }
      }
      else if (node.is('for')) {
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
      else if (node.is('return')) {
        t = {
          tmpl: 'return #{args}',
          dat: { args: this.expr(d.args, ', ') }
        }
      }
      else if (node.is(['break', 'continue'])) {
        t = {
          tmpl: '#{word}',
          dat: { word: node.value }
        }
      }
      else if (node.is('class')) {
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

    return this.ln(this.indent(str))
  }

  block (node) {
    let str = this.ln('{')

    this.indent_level++

    if (_.isArray(node)) {
      for (let n of node) {
        str += this.statement(n)
      }
    }
    else {
      str = this.statement(node)
    }

    this.indent_level--

    str += this.ln(this.indent('}'))

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
        else if (node.is('fn')) {
          t = this.fn_call(node)
        }
        else if (node.is('fn_assign')) {
          t = {
            tmpl: '#{fn}',
            dat: { fn: this.fn_def(d.args, d.body) }
          }
        }
        else if (node.is('open_bracket')) {
          t = {
            tmpl: '[#{args}]#{fields}',
            dat: {
              args: this.expr(d.args, ', '),
              fields: d.fields ? this.expr(d.fields, '') : '',
            }
          }
        }
        else if (node.is('open_curly')) {
          let def = _.map(d.def, f => _.template('#{value}: #{expr}')({ value: f.value, expr: this.expr(f.data.expr) }))
          t = {
            tmpl: '{#{def}}#{fields}',
            dat: {
              def: this.expr(def, ', '),
              fields: d.fields ? this.expr(d.fields, '') : ''
            }
          }
        }
        else if (node.is(['math', 'logic', 'comp'])) {
          t = {
            tmpl: '#{left} #{op} #{right}',
            dat: {
              op: node.value,
              left: this.expr(d.left),
              right: this.expr(d.right),
            }
          }
        }
        else if (node.is(['this', 'this_field'])) {
          t = {
            tmpl: 'this#{dot}#{field}#{fields}',
            dat: {
              dot: node.is('this_field') ? '.' : '',
              field: node.is('this_field') ? node.value : '',
              fields: d.fields ? this.expr(d.fields, '') : '',
            }
          }
        }
        else if (node.is(['char', 'string'])) {
          t = {
            tmpl: '#{value}',
            dat: { value: this.str(node.value) }
          }
        }
        else if (node.is('new')) {
          t = {
            tmpl: 'new #{id}(#{args})',
            dat: {
              id: d.id.value,
              args: this.expr(d.args, ', '),
            }
          }
        }
        else if (node.is('id')) {
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

  run (nodes) {
    this.reset(nodes)
    this.code_start()
    while (!this.eos) {
      this.writeln(this.statement(this.node))
      this.next()
    }
    this.code_end()
    this.code = this.lines.join('\n')
    return this.code
  }

  dump () {
    console.info('transpiler dump')
    console.log(this.code)
    console.log('')
  }

}
