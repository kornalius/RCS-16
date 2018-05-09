/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { path, fs } = require('../utils')
const { error } = require('./compiler')
const { Frames } = require('./frame')
const { Token } = require('./tokenizer')

class Lexer extends Emitter {

  constructor (parser) {
    super()

    this._parser = parser
  }

  loop_while (fn, matches, end, end_next, skip) {
    let nodes = []
    if (skip) { this.skip(skip) }
    while (!this.eos && (!end || !this.is(end)) && (!matches || this.match(matches))) {
      nodes.push(fn.call(this))
      if (skip) { this.skip(skip) }
    }
    if (end) { this.expect(end, end_next) }
    return nodes
  }

  next_expr_node (left) {
    let token = this._token
    let data = {}
    if (left) {
      this.next()
      data = { left, right: this.expr() }
    }
    let node = new Node(this, token, data)
    if (!left) { this.next() }
    return node
  }

  block (end, end_next = true, block_type = null) {
    if (block_type) {
      this._frames.start(block_type)
    }
    let nodes = this.loop_while(this.statement, null, end, end_next, 'eol')
    if (block_type) {
      this._frames.end()
    }
    return nodes
  }

  statements () { return this.block() }

  statement () {
    if (this.match(['let', 'id'])) { return this.var_statement() } // variable definition
    else if (this.match(['id|id_field|this_field', 'assign|fn_assign'])) { return this.assign_statement() } // variable assignment
    else if (this.is('if')) { return this.if_statement() } // if block
    else if (this.is('for')) { return this.for_statement() } // while block
    else if (this.is('while')) { return this.while_statement() } // while block
    else if (this.is('return')) { return this.return_statement() } // return from function
    else if (this.is(['break', 'continue'])) { return this.single() } // single statement
    else if (this.is('class')) { return this.class_statement() } // class statement
    else if (this.is(['id', 'super'])) { return this.id_statement() } // function call
    else {
      error(this, this._token, 'syntax error')
      this.next()
    }
    return null
  }

  id_statement (first = true) {
    if (this.is('super')) {
      return this.super_expr()
    }
    else {
      return this.id_expr(first)
    }
  }

  var_statement () {
    let node = null
    this.next()
    if (!this.peek().is('assign|fn_assign')) {
      let t = new Token(this._token)
      t.value = '='
      t._type = 'assign'
      node = new Node(this, t, { id: this._token, expr: null })
      this._frames.add(this._token, null, 'var')
    }
    else {
      node = this.assign_statement()
    }
    node._let = true
    return node
  }

  assign_statement () {
    let node = null
    let id = this._token
    this.next()
    if (this.is('fn_assign')) {
      node = this.fn_expr(id, true)
      id._fn = true
    }
    else {
      node = new Node(this, this._token, { id })
      this.next()
      node.data.expr = this.expr()
    }
    this._frames.add(id, null, id._fn ? 'fn' : 'var')
    return node
  }

  if_statement (expect_end = true) {
    let token = this._token
    this.next()
    let expr_block
    if (this.is('open_paren')) {
      this.next()
      expr_block = this.expr()
      this.expect('close_paren')
    }
    else {
      expr_block = this.expr()
    }
    let true_body = this.block(['else', 'end'], false, 'if')
    let false_body = this.is('else') ? this.else_statement(false) : null
    if (expect_end) { this.expect('end') }
    return new Node(this, token, { expr: expr_block, true_body, false_body })
  }

  else_statement (expect_end = true) {
    let token = this._token
    let node = null
    this.next()
    if (this.is('if')) {
      node = this.if_statement(false)
      node.token = token
    }
    else {
      node = new Node(this, token, { false_body: this.block('end', false, 'else') })
    }
    if (expect_end) { this.expect('end') }
    return node
  }

  for_statement () {
    let token = this._token
    this.next()

    let v = this._token
    this.expect('id|var')
    this.expect('assign')
    let min_expr = this.expr()
    this.expect('to')
    let max_expr = this.expr()
    let step_expr = null
    if (this.is('step')) {
      this.next()
      step_expr = this.expr()
    }
    let body = this.block('end', false, 'for')
    this.expect('end')
    return new Node(this, token, { v, min_expr, max_expr, step_expr, body })
  }

  while_statement () {
    let token = this._token
    this.next()
    let expr_block
    if (this.is('open_paren')) {
      this.next()
      expr_block = this.expr()
      this.expect('close_paren')
    }
    else {
      expr_block = this.expr()
    }
    let body = this.block('end', false, 'while')
    this.expect('end')
    return new Node(this, token, { expr: expr_block, body })
  }

  return_statement () {
    let p = false
    let end = 'eol|end|close_paren'
    let node = new Node(this, this._token)
    node.data.args = []
    this.next()
    if (this.is('open_paren')) {
      p = true
      end = 'close_paren'
      this.next()
    }
    if (!p || !this.is('close_paren')) {
      node.data.args = this.exprs(end, false)
    }
    if (p) {
      this.expect('close_paren')
    }
    return node
  }

  class_list () { return this.loop_while(this.single, ['id'], 'eol', true, 'comma') }

  class_statement () {
    let token = this._token
    this.next()
    let _extends = null
    let id = this._token
    this.next()
    if (this.is(':')) {
      this.next()
      _extends = this.class_list()
    }
    this._frames.add(id, null, 'class')
    this._inClass = true
    let body = this.block('end', false, 'class')
    this._inClass = false
    this.expect('end')
    return new Node(this, token, { id, _extends, body })
  }

  term_expr (left) { return this.is(/\+|-/) ? this.next_expr_node(left) : null }

  factor_expr (left) { return this.is(/\/|\*/) ? this.next_expr_node(left) : null }

  conditional_expr (left) { return this.is(/>|>=|<|<=|!=|<>|==/) ? this.next_expr_node(left) : null }

  junction_expr (left) { return this.is(/&|\|/) ? this.next_expr_node(left) : null }

  sub_expr () {
    let nodes = []
    nodes.push(new Node(this, this._token))
    this.expect('open_paren')
    if (!this.is('close_paren')) {
      nodes.push(this.expr())
    }
    nodes.push(new Node(this, this._token))
    this.expect('close_paren')
    return nodes
  }

  simple_expr () {
    if (this.is(['number', 'string', 'char'])) { return this.next_expr_node() }
    else if (this.is('fn_assign')) { return this.fn_expr() }
    else if (this.is('open_paren')) { return this.sub_expr() }
    else if (this.is('open_bracket')) { return this.array_expr() }
    else if (this.is('open_curly')) { return this.dict_expr() }
    else if (this.is(['this', 'this_field'])) { return this.this_expr() }
    else if (this.is('super')) { return this.super_expr() }
    else if (this.is('new')) { return this.new_expr() }
    else if (this.is('id')) { return this.id_expr() }
    else {
      error(this, this._token, 'number, string, variable, variable paren or function call/expression expected')
      this.next()
    }
    return null
  }

  exprs (end, end_next) { return this.loop_while(this.expr, null, end, end_next, 'comma') }

  expr () {
    let node = this.simple_expr()
    if (node) {
      let term = this.term_expr(node)
      if (term) { return term }

      let factor = this.factor_expr(node)
      if (factor) { return factor }

      let conditional = this.conditional_expr(node)
      if (conditional) { return conditional }

      let junction = this.junction_expr(node)
      if (junction) { return junction }
    }
    return node
  }

  single () {
    let node = new Node(this, this._token)
    this.next()
    return node
  }

  this_expr () {
    if (!this._inClass) {
      error(this, this._token, '@ cannot be used outside class definition')
      this.next()
      return null
    }
    if (this.is('this')) {
      return this.next_expr_node()
    }
    else if (this.is('this_field')) {
      return this.id_expr(false)
    }
    return null
  }

  super_expr () {
    if (!this._inClass) {
      error(this, this._token, 'super cannot be used outside class definition')
      this.next()
      return null
    }
    return this.id_expr(false)
  }

  new_expr () {
    let token = this._token
    this.next()
    let id = this._token
    this.next()
    if (!this._frames.exists(id.value, 'class')) {
      error(this, id, 'undeclared class')
      return null
    }
    let args = []
    if (this.is('open_paren')) {
      this.next()
      if (!this.is('close_paren')) {
        args = this.exprs('close_paren', false)
      }
      this.expect('close_paren')
    }
    return new Node(this, token, { id, args })
  }

  array_expr () {
    let node = new Node(this, this._token)
    node.data.args = []
    this.expect('open_bracket')
    if (!this.is('close_bracket')) {
      node.data.args = this.loop_while(this.expr, null, 'close_bracket', false, 'comma|eol')
    }
    this.expect('close_bracket')
    return node
  }

  dict_expr () {
    let node = new Node(this, this._token)
    node.data.def = []
    this.expect('open_curly')
    if (!this.is('close_curly')) {
      node.data.def = this.loop_while(this.key_literal, ['key'], 'close_curly', false, 'comma|eol')
    }
    this.expect('close_curly')
    return node
  }

  key_literal () {
    let node = new Node(this, this._token)
    this.expect('key')
    node.data.expr = this.expr()
    return node
  }

  fn_arg () {
    this._frames.add(this._token, null, 'var')
    let node = new Node(this, this._token)
    this.next()
    if (this.is('assign')) {
      this.next()
      node.data.assign = this.expr()
    }
    return node
  }

  fn_args_def () { return this.loop_while(this.fn_arg, ['id'], 'close_paren', false, 'comma|eol') }

  id_field () {
    let node = new Node(this, this._token)
    node.data.args = []
    node.token._type = 'id'
    node._field = true
    this.next()
    if (this.is('open_bracket')) {
      if (!node.data.fields) {
        node.data.fields = []
      }
      node.data.fields.push(this.array_expr())
    }
    if (this.is('open_paren')) {
      this.next()
      node.token._type = 'fn'
      if (!this.is('close_paren')) {
        node.data.args = this.exprs('close_paren', false)
      }
      this.expect('close_paren')
    }
    return node
  }

  id_expr (first = true) {
    if (first && !this._token._rom && !this._frames.exists(this._token.value)) {
      error(this, this._token, 'undeclared identifier')
      return null
    }
    let node = new Node(this, this._token)
    this.next()
    if (this.is('open_bracket')) {
      if (!node.data.fields) {
        node.data.fields = []
      }
      node.data.fields.push(this.array_expr())
    }
    if (this.is('open_paren')) {
      this.next()
      node.token._type = 'fn'
      if (!this.is('close_paren')) {
        node.data.args = this.exprs('close_paren', false)
      }
      this.expect('close_paren')
    }
    while (this.is(['id_field', 'open_bracket'])) {
      if (!node.data.fields) {
        node.data.fields = []
      }
      node.data.fields.push(this.id_field())
      this.skip('comma')
    }
    return node
  }

  fn_expr (id, statement = false) {
    let node = new Node(this, this._token, { id })
    node.data.args = []
    if (statement) {
      node._in_class = this._inClass
      node._fnLevel = this._fnLevel++
    }
    this.next()
    this._frames.start('fn')
    if (this.is('open_paren')) {
      this.next()
      if (!this.is('close_paren')) {
        node.data.args = this.fn_args_def()
      }
      this.expect('close_paren')
    }
    node.data.body = this.block('end', false)
    this._frames.end()
    this.expect('end')
    if (statement) {
      this._fnLevel--
    }
    return node
  }

}

module.exports = {
  Lexer,
}
