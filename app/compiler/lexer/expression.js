/**
 * @module compiler/lexer
 */

const { Node } = require('./node')
const { Statement } = require('./statement')
const TOKENS = require('../tokens/tokens')

class Expression extends Statement {

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
    nodes.push(new Node(this.token))
    this.expect(TOKENS.OPEN_PAREN)
    if (!this.is(TOKENS.CLOSE_PAREN)) {
      nodes.push(this.expr())
    }
    nodes.push(new Node(this.token))
    this.expect(TOKENS.CLOSE_PAREN)
    return nodes
  }

  simple_expr () {
    if (this.is([TOKENS.NUMBER, TOKENS.STRING, TOKENS.CHAR])) {
      return this.next_expr_node()
    }
    else if (this.is(TOKENS.FN_ASSIGN)) {
      return this.fn_assign()
    }
    else if (this.is(TOKENS.OPEN_PAREN)) {
      return this.sub_expr()
    }
    else if (this.is(TOKENS.OPEN_BRACKET)) {
      return this.array_expr()
    }
    else if (this.is([TOKENS.OPEN_CURLY, TOKENS.KEY])) {
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
    else if (this.is(TOKENS.ID)) {
      return this.id_expr()
    }
    else {
      this.error('number, string, variable, array expr, dict expr, super, new, paren or function call/expression expected')
      this.next()
    }
    return undefined
  }

  exprs (end, end_next = false) {
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
    let node = new Node(this.token)
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
    let token = this.token
    this.next()
    let id = this.token
    this.next()
    if (!this._frames.exists(id.value, TOKENS.CLASS)) {
      this.error(id, 'undeclared class')
      return undefined
    }
    let args = []
    if (this.is(TOKENS.OPEN_PAREN)) {
      this.next()
      if (!this.is(TOKENS.CLOSE_PAREN)) {
        args = this.exprs(TOKENS.CLOSE_PAREN)
      }
      this.expect(TOKENS.CLOSE_PAREN)
    }
    return new Node(token, { id, args })
  }

  array_expr () {
    let node = new Node(this.token)
    this.expect(TOKENS.OPEN_BRACKET)
    if (!this.is(TOKENS.CLOSE_BRACKET)) {
      node.args = this.loop_while(this.expr, undefined, TOKENS.CLOSE_BRACKET, false, [TOKENS.COMMA, TOKENS.EOL])
    }
    this.expect(TOKENS.CLOSE_BRACKET)
    return node
  }

  dict_expr () {
    let node = new Node(this.token)
    node.def = []
    if (this.is(TOKENS.KEY)) {
      node.def = this.loop_while(this.key_literal, [TOKENS.KEY], undefined, false, [TOKENS.COMMA, TOKENS.EOL])
    }
    else {
      this.expect(TOKENS.OPEN_CURLY)
      if (!this.is(TOKENS.CLOSE_CURLY)) {
        node.def = this.loop_while(this.key_literal, [TOKENS.KEY], TOKENS.CLOSE_CURLY, false, [TOKENS.COMMA, TOKENS.EOL])
      }
      this.expect(TOKENS.CLOSE_CURLY)
    }
    return node
  }

  key_literal () {
    let node = new Node(this.token)
    this.expect(TOKENS.KEY)
    node.expr = this.expr()
    return node
  }

  id_field () {
    let node = new Node(this.token)
    node.token._type = TOKENS.ID
    node._field = true

    this.next()

    if (this.is(TOKENS.OPEN_BRACKET)) {
      node.fields.push(this.array_expr())
    }
    else if (this.is(TOKENS.OPEN_PAREN)) {
      this.next()
      node.token._type = TOKENS.FN
      if (!this.is(TOKENS.CLOSE_PAREN)) {
        node.fields.push(this.fn_call())
      }
      this.expect(TOKENS.CLOSE_PAREN)
    }

    return node
  }

  id_expr () {
    let i = this._frames.exists(this.token.value)
    if (!i) {
      this.error('undeclared identifier')
      this.next()
      return undefined
    }

    if (i.is(TOKENS.FN)) {
      return this.fn_call()
    }

    let node = new Node(this.token)

    this.next()

    while (this.is([TOKENS.ID_FIELD, TOKENS.OPEN_BRACKET])) {
      if (this.is(TOKENS.OPEN_BRACKET)) {
        node.fields.push(this.array_expr())
      }
      else {
        node.fields.push(this.id_field())
      }
    }

    return node
  }

  fn_arg () {
    this._frames.add(this.token.value, TOKENS.VAR)
    let node = new Node(this.token)
    this.next()
    if (this.is(TOKENS.ASSIGN)) {
      this.next()
      node.assign = this.expr()
    }
    return node
  }

  fn_args_def () {
    return this.loop_while(this.fn_arg, [TOKENS.ID], TOKENS.CLOSE_PAREN, false, [TOKENS.COMMA, TOKENS.EOL])
  }

  fn_call () {
    let node = new Node(this.token)
    node.token._type = TOKENS.FN
    node.suffix = []

    this.next()

    if (this.is(TOKENS.OPEN_PAREN)) {
      this.next()
      if (!this.is(TOKENS.CLOSE_PAREN)) {
        node.args = this.exprs(TOKENS.CLOSE_PAREN)
      }
      this.expect(TOKENS.CLOSE_PAREN)
    }
    else if (!this.is([TOKENS.ID_FIELD, TOKENS.OPEN_BRACKET])) {
      node.args = this.exprs(TOKENS.EOL)
    }

    while (this.is([TOKENS.ID_FIELD, TOKENS.OPEN_BRACKET, TOKENS.OPEN_PAREN])) {
      if (this.is(TOKENS.OPEN_BRACKET)) {
        node.suffix.push(this.array_expr())
      }
      else if (this.is(TOKENS.OPEN_PAREN)) {
        this.next()
        if (!this.is(TOKENS.CLOSE_PAREN)) {
          node.suffix.push(this.exprs(TOKENS.CLOSE_PAREN))
        }
        this.expect(TOKENS.CLOSE_PAREN)
      }
      else {
        node.suffix.push(this.id_field())
      }
    }

    return node
  }

  fn_assign (id, statement = false) {
    let node = new Node(this.token, { id })
    if (statement) {
      node._inClass = this._inClass
      node._fnLevel = this._fnLevel++
    }
    this.next()
    this._frames.start(TOKENS.FN)
    if (this.is(TOKENS.OPEN_PAREN)) {
      this.next()
      if (!this.is(TOKENS.CLOSE_PAREN)) {
        node.args = this.fn_args_def()
      }
      this.expect(TOKENS.CLOSE_PAREN)
    }
    node.body = this.block(TOKENS.END, false)
    this._frames.end()
    this.expect(TOKENS.END)
    if (statement) {
      this._fnLevel--
    }
    return node
  }

}

class Lexer extends Expression {

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
    let token = this.token
    let data = {}
    if (left) {
      this.next()
      data = { left, right: this.expr() }
    }
    let node = new Node(token, data)
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

}

module.exports = {
  Expression,
}
