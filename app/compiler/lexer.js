/**
 * @module compiler
 */

const { Parser } = require('./parser')
const TOKENS = require('./tokens')

class Lexer extends Parser {

  loop_while (fn, matches, end, end_next, skip) {
    let nodes = []
    if (skip) {
      this.skip(skip)
    }
    while (!this.eos && (!end || !this.is(end)) && (!matches || this.match(matches))) {
      nodes.push(fn.call(this))
      if (skip) {
        this.skip(skip)
      }
    }
    if (end) {
      this.expect(end, end_next)
    }
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
    if (!left) {
      this.next()
    }
    return node
  }

  block (end, end_next = true, block_type) {
    if (block_type) {
      this._frames.start(block_type)
    }
    let nodes = this.loop_while(this.statement, undefined, end, end_next, TOKENS.EOL)
    if (block_type) {
      this._frames.end()
    }
    return nodes
  }

  statements () {
    return this.block()
  }

  statement () {
    if (this.match([TOKENS.LET, TOKENS.ID])) {  // variable definition
      return this.var_statement()
    }
    else if (this.match([TOKENS.ID, TOKENS.ID_FIELD, TOKENS.THIS_FIELD], [TOKENS.ASSIGN, TOKENS.FN_ASSIGN])) { // variable assignment
      return this.assign_statement()
    }
    else if (this.is(TOKENS.IF)) { // if block
      return this.if_statement()
    }
    else if (this.is(TOKENS.FOR)) {  // while block
      return this.for_statement()
    }
    else if (this.is(TOKENS.WHILE)) {  // while block
      return this.while_statement()
    }
    else if (this.is(TOKENS.RETURN)) {  //return from function
      return this.return_statement()
    }
    else if (this.is([TOKENS.BREAK, TOKENS.CONTINUE])) {  // single statement
      return this.single()
    }
    else if (this.is(TOKENS.CLASS)) {  // class statement
      return this.class_statement()
    }
    else if (this.is([TOKENS.ID, TOKENS.SUPER])) {  // function call
      return this.id_statement()
    }
    else {
      this.error('syntax error')
      this.next()
    }
    return undefined
  }

  id_statement (first = true) {
    if (this.is(TOKENS.SUPER)) {
      return this.super_expr()
    }
    else {
      return this.id_expr(first)
    }
  }

  var_statement () {
    let node
    this.next()
    if (!this.peek().is([TOKENS.ASSIGN, TOKENS.FN_ASSIGN])) {
      let t = new TOKENS.Token(this._token)
      t.value = '='
      t._type = TOKENS.ASSIGN
      node = new Node(this, t, { id: this._token, expr: undefined })
      this._frames.add(this._token, undefined, TOKENS.VAR)
    }
    else {
      node = this.assign_statement()
    }
    node._let = true
    return node
  }

  assign_statement () {
    let node
    let id = this._token
    this.next()
    if (this.is(TOKENS.FN_ASSIGN)) {
      node = this.fn_expr(id, true)
      id._fn = true
    }
    else {
      node = new Node(this, this._token, { id })
      this.next()
      node.data.expr = this.expr()
    }
    this._frames.add(id, undefined, id._fn ? TOKENS.FN : TOKENS.VAR)
    return node
  }

  if_statement (expect_end = true) {
    let token = this._token
    this.next()
    let expr_block
    if (this.is(TOKENS.OPEN_PAREN)) {
      this.next()
      expr_block = this.expr()
      this.expect(TOKENS.CLOSE_PAREN)
    }
    else {
      expr_block = this.expr()
    }
    let true_body = this.block([TOKENS.ELSE, TOKENS.END], false, TOKENS.IF)
    let false_body = this.is(TOKENS.ELSE) ? this.else_statement(false) : undefined
    if (expect_end) {
      this.expect(TOKENS.END)
    }
    return new Node(this, token, { expr: expr_block, true_body, false_body })
  }

  else_statement (expect_end = true) {
    let token = this._token
    let node
    this.next()
    if (this.is(TOKENS.IF)) {
      node = this.if_statement(false)
      node.token = token
    }
    else {
      node = new Node(this, token, { false_body: this.block(TOKENS.END, false, TOKENS.ELSE) })
    }
    if (expect_end) {
      this.expect(TOKENS.END)
    }
    return node
  }

  for_statement () {
    let token = this._token
    this.next()

    let v = this._token
    this.expect([TOKENS.ID, TOKENS.VAR], TOKENS.ASSIGN)
    let min_expr = this.expr()
    this.expect(TOKENS.TO)
    let max_expr = this.expr()
    let step_expr
    if (this.is(TOKENS.STEP)) {
      this.next()
      step_expr = this.expr()
    }
    let body = this.block(TOKENS.END, false, TOKENS.FOR)
    this.expect(TOKENS.END)
    return new Node(this, token, { v, min_expr, max_expr, step_expr, body })
  }

  while_statement () {
    let token = this._token
    this.next()
    let expr_block
    if (this.is(TOKENS.OPEN_PAREN)) {
      this.next()
      expr_block = this.expr()
      this.expect(TOKENS.CLOSE_PAREN)
    }
    else {
      expr_block = this.expr()
    }
    let body = this.block(TOKENS.END, false, TOKENS.WHILE)
    this.expect(TOKENS.END)
    return new Node(this, token, { expr: expr_block, body })
  }

  return_statement () {
    let p = false
    let end = [TOKENS.EOL, TOKENS.END, TOKENS.CLOSE_PAREN]
    let node = new Node(this, this._token)
    node.data.args = []
    this.next()
    if (this.is(TOKENS.OPEN_PAREN)) {
      p = true
      end = TOKENS.CLOSE_PAREN
      this.next()
    }
    if (!p || !this.is(TOKENS.CLOSE_PAREN)) {
      node.data.args = this.exprs(end, false)
    }
    if (p) {
      this.expect(TOKENS.CLOSE_PAREN)
    }
    return node
  }

  class_list () {
    return this.loop_while(this.single, [TOKENS.ID], TOKENS.EOL, true, TOKENS.COMMA)
  }

  class_statement () {
    let token = this._token
    this.next()
    let _extends
    let id = this._token
    this.next()
    if (this.is(TOKENS.COLON)) {
      this.next()
      _extends = this.class_list()
    }
    this._frames.add(id, undefined, TOKENS.CLASS)
    this._inClass = true
    let body = this.block(TOKENS.END, false, TOKENS.CLASS)
    this._inClass = false
    this.expect(TOKENS.END)
    return new Node(this, token, { id, _extends, body })
  }

  term_expr (left) {
    return this.is([TOKENS.PLUS, TOKENS.MINUS]) ? this.next_expr_node(left) : undefined
  }

  factor_expr (left) {
    return this.is([TOKENS.DIVIDE, TOKENS.MULTIPLY, TOKENS.MODULUS]) ? this.next_expr_node(left) : undefined
  }

  conditional_expr (left) {
    return this.is([TOKENS.GREATER, TOKENS.GREATER_EQUAL, TOKENS.LESSER, TOKENS.LESSER_EQUAL, TOKENS.NOT_EQUAL, TOKENS.EQUAL_EQUAL]) ? this.next_expr_node(left) : undefined
  }

  junction_expr (left) {
    return this.is([TOKENS.AND, TOKENS.OR, TOKENS.XOR]) ? this.next_expr_node(left) : undefined
  }

  sub_expr () {
    let nodes = []
    nodes.push(new Node(this, this._token))
    this.expect(TOKENS.OPEN_PAREN)
    if (!this.is(TOKENS.CLOSE_PAREN)) {
      nodes.push(this.expr())
    }
    nodes.push(new Node(this, this._token))
    this.expect(TOKENS.CLOSE_PAREN)
    return nodes
  }

  simple_expr () {
    if (this.is([TOKENS.NUMBER, TOKENS.STRING, TOKENS.CHAR])) {
      return this.next_expr_node()
    }
    else if (this.is(TOKENS.FN_ASSIGN)) {
      return this.fn_expr()
    }
    else if (this.is(TOKENS.OPEN_PAREN)) {
      return this.sub_expr()
    }
    else if (this.is(TOKENS.OPEN_BRACKET)) {
      return this.array_expr()
    }
    else if (this.is(TOKENS.OPEN_CURLY)) {
      return this.dict_expr()
    }
    else if (this.is([TOKENS.THIS, TOKENS.THIS_FIELD])) {
      return this.this_expr()
    }
    else if (this.is(TOKENS.SUPER)) {
      return this.super_expr()
    }
    else if (this.is(TOKENS.NEW)) {
      return this.new_expr()
    }
    else if (this.TOKENS.is(TOKENS.ID)) {
      return this.id_expr()
    }
    else {
      this.error('number, string, variable, variable paren or function call/expression expected')
      this.next()
    }
    return undefined
  }

  exprs (end, end_next) {
    return this.loop_while(this.expr, undefined, end, end_next, TOKENS.COMMA)
  }

  expr () {
    let node = this.simple_expr()
    if (node) {
      let term = this.term_expr(node)
      if (term) {
        return term
      }

      let factor = this.factor_expr(node)
      if (factor) {
        return factor
      }

      let conditional = this.conditional_expr(node)
      if (conditional) {
        return conditional
      }

      let junction = this.junction_expr(node)
      if (junction) {
        return junction
      }
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
      this.error(TOKENS.AMPER + ' cannot be used outside class definition')
      this.next()
      return undefined
    }
    if (this.is(TOKENS.THIS)) {
      return this.next_expr_node()
    }
    else if (this.is(TOKENS.THIS_FIELD)) {
      return this.id_expr(false)
    }
    return undefined
  }

  super_expr () {
    if (!this._inClass) {
      this.error(TOKENS.SUPER + ' cannot be used outside class definition')
      this.next()
      return undefined
    }
    return this.id_expr(false)
  }

  new_expr () {
    let token = this._token
    this.next()
    let id = this._token
    this.next()
    if (!this._frames.exists(id.value, TOKENS.CLASS)) {
      this.error(id, 'undeclared class')
      return undefined
    }
    let args = []
    if (this.is(TOKENS.OPEN_PAREN)) {
      this.next()
      if (!this.is(TOKENS.CLOSE_PAREN)) {
        args = this.exprs(TOKENS.CLOSE_PAREN, false)
      }
      this.expect(TOKENS.CLOSE_PAREN)
    }
    return new Node(this, token, { id, args })
  }

  array_expr () {
    let node = new Node(this, this._token)
    node.data.args = []
    this.expect(TOKENS.OPEN_BRACKET)
    if (!this.is(TOKENS.CLOSE_BRACKET)) {
      node.data.args = this.loop_while(this.expr, undefined, TOKENS.CLOSE_BRACKET, false, 'comma|eol')
    }
    this.expect(TOKENS.CLOSE_BRACKET)
    return node
  }

  dict_expr () {
    let node = new Node(this, this._token)
    node.data.def = []
    this.expect(TOKENS.OPEN_CURLY)
    if (!this.is(TOKENS.CLOSE_CURLY)) {
      node.data.def = this.loop_while(this.key_literal, [TOKENS.KEY], TOKENS.CLOSE_CURLY, false, [TOKENS.COMMA, TOKENS.EOL])
    }
    this.expect(TOKENS.CLOSE_CURLY)
    return node
  }

  key_literal () {
    let node = new Node(this, this._token)
    this.expect(TOKENS.KEY)
    node.data.expr = this.expr()
    return node
  }

  fn_arg () {
    this._frames.add(this._token, undefined, TOKENS.VAR)
    let node = new Node(this, this._token)
    this.next()
    if (this.is(TOKENS.ASSIGN)) {
      this.next()
      node.data.assign = this.expr()
    }
    return node
  }

  fn_args_def () {
    return this.loop_while(this.fn_arg, [TOKENS.ID], TOKENS.CLOSE_PAREN, false, [TOKENS.COMMA, TOKENS.EOL])
  }

  id_field () {
    let node = new Node(this, this._token)
    node.data.args = []
    node.token._type = TOKENS.ID
    node._field = true
    this.next()
    if (this.is(TOKENS.OPEN_BRACKET)) {
      if (!node.data.fields) {
        node.data.fields = []
      }
      node.data.fields.push(this.array_expr())
    }
    if (this.is(TOKENS.OPEN_PAREN)) {
      this.next()
      node.token._type = TOKENS.FN
      if (!this.is(TOKENS.CLOSE_PAREN)) {
        node.data.args = this.exprs(TOKENS.CLOSE_PAREN, false)
      }
      this.expect(TOKENS.CLOSE_PAREN)
    }
    return node
  }

  id_expr (first = true) {
    if (first && !this._token._rom && !this._frames.exists(this._token.value)) {
      this.error('undeclared identifier')
      return undefined
    }
    let node = new Node(this, this._token)
    this.next()
    if (this.is(TOKENS.OPEN_BRACKET)) {
      if (!node.data.fields) {
        node.data.fields = []
      }
      node.data.fields.push(this.array_expr())
    }
    if (this.is(TOKENS.OPEN_PAREN)) {
      this.next()
      node.token._type = TOKENS.FN
      if (!this.is(TOKENS.CLOSE_PAREN)) {
        node.data.args = this.exprs(TOKENS.CLOSE_PAREN, false)
      }
      this.expect(TOKENS.CLOSE_PAREN)
    }
    while (this.is([TOKENS.ID_FIELD, TOKENS.OPEN_BRACKET])) {
      if (!node.data.fields) {
        node.data.fields = []
      }
      node.data.fields.push(this.id_field())
      this.skip(TOKENS.COMMA)
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
    this._frames.start(TOKENS.FN)
    if (this.is(TOKENS.OPEN_PAREN)) {
      this.next()
      if (!this.is(TOKENS.CLOSE_PAREN)) {
        node.data.args = this.fn_args_def()
      }
      this.expect(TOKENS.CLOSE_PAREN)
    }
    node.data.body = this.TOKENS.block(TOKENS.END, false)
    this._frames.end()
    this.expect(TOKENS.END)
    if (statement) {
      this._fnLevel--
    }
    return node
  }

}

module.exports = {
  Lexer,
}
