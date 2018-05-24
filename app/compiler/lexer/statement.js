/**
 * @module compiler/lexer
 */

const { Node } = require('./node')
const TOKENS = require('../tokens/tokens')
const { Parser } = require('./parser')

class Statement extends Parser {

  isArguments (offset) {
    this.pushState()
    let tokens = []
    this._offset = offset
    if (this.is(TOKENS.OPEN_PAREN)) {
      tokens.push('(arguments)')
      this.next()
      if (!this.is(TOKENS.CLOSE_PAREN)) {
        this.exprs(TOKENS.CLOSE_PAREN)
      }
      this.expect(TOKENS.CLOSE_PAREN)
    }
    let newOffset = this.offset
    this.popState()
    return { offset: newOffset, tokens }
  }

  statements () {
    return this.block()
  }

  statement () {
    if (this.match([TOKENS.LET], [TOKENS.ID], [TOKENS.ASSIGN, TOKENS.MATH_ASSIGN, TOKENS.LOGIC_ASSIGN])) { // variable assignment
      this.next() // skip LET keyword
      return this.var_assign(true)
    }
    else if (this.match([TOKENS.LET], [TOKENS.ID], this.isArguments, TOKENS.FN_ASSIGN)) { // function assignment
      this.next() // skip LET keyword
      return this.fn_assign(true, true)
    }
    else if (this.match([TOKENS.ID, TOKENS.ID_FIELD, TOKENS.THIS_FIELD], [TOKENS.ASSIGN, TOKENS.MATH_ASSIGN, TOKENS.LOGIC_ASSIGN])) { // variable assignment
      return this.var_assign()
    }
    else if (this.match([TOKENS.ID, TOKENS.ID_FIELD, TOKENS.THIS_FIELD], this.isArguments, TOKENS.FN_ASSIGN)) { // function assignment
      return this.fn_assign(false, true)
    }
    else if (this.is(TOKENS.IF)) { // if block
      return this.if_statement()
    }
    else if (this.is(TOKENS.FOR)) { // while block
      return this.for_statement()
    }
    else if (this.is(TOKENS.WHILE)) { // while block
      return this.while_statement()
    }
    else if (this.is(TOKENS.RETURN)) { // return from function
      return this.return_statement()
    }
    else if (this.is([TOKENS.BREAK, TOKENS.CONTINUE])) { // single statement
      return this.single()
    }
    else if (this.is(TOKENS.CLASS)) { // class statement
      return this.class_statement()
    }
    else if (this.is(TOKENS.NEW)) { // new statement
      return this.new_expr()
    }
    else if (this.is(TOKENS.ID)) {
      return this.id_statement()
    }
    else {
      this.error('syntax error')
      this.next()
    }
    return undefined
  }

  id_statement () {
    if (this.is(TOKENS.SUPER)) {
      return this.super_expr()
    }
    else {
      return this.id_expr()
    }
  }

  var_assign (_let = false) {
    let id = this.token

    this.next()

    let node = new Node(this.token, { id })

    this.next()

    if (this.match(TOKENS.EOL, TOKENS.INDENT)) {
      this.next(2)
    }

    this._classFrame = undefined
    node.expr = this.expr()
    node._let = _let

    if (_let) {
      this._frames.add(id.value, TOKENS.VAR, this._classFrame)
    }

    return node
  }

  if_statement (expect_end = true) {
    let token = this.token

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

    let end = [TOKENS.ELSE, TOKENS.END]
    if (this.match(TOKENS.EOL, TOKENS.INDENT)) {
      end = [TOKENS.DEDENT, TOKENS.ELSE]
      this.next(2)
    }

    let true_body = this.block(end, false, TOKENS.IF)

    if (this.is(TOKENS.DEDENT)) {
      this.next()
    }

    let false_body = this.is(TOKENS.ELSE) ? this.else_statement() : undefined

    if (expect_end) {
      this.expect(end)
    }

    return new Node(token, { expr: expr_block, true_body, false_body })
  }

  else_statement () {
    let token = this.token
    let node

    this.next()
    if (this.is(TOKENS.IF)) {
      node = this.if_statement(false)
      node._token = token
    }
    else {
      let end = TOKENS.END
      if (this.match(TOKENS.EOL, TOKENS.INDENT)) {
        end = TOKENS.DEDENT
        this.next(2)
      }

      node = new Node(token, { false_body: this.block(end, false, TOKENS.ELSE) })
    }

    return node
  }

  for_statement () {
    let token = this.token

    this.next()
    let v = this.token

    this.expect([TOKENS.ID, TOKENS.VAR], TOKENS.ASSIGN)
    let min_expr = this.expr()

    this.expect(TOKENS.TO)
    let max_expr = this.expr()

    let step_expr
    if (this.is(TOKENS.STEP)) {
      this.next()
      step_expr = this.expr()
    }

    let end = TOKENS.END
    if (this.match(TOKENS.EOL, TOKENS.INDENT)) {
      end = TOKENS.DEDENT
      this.next(2)
    }

    let body = this.block(end, false, TOKENS.FOR)

    this.expect(end)

    return new Node(token, { v, min_expr, max_expr, step_expr, body })
  }

  while_statement () {
    let token = this.token

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

    let end = TOKENS.END
    if (this.match(TOKENS.EOL, TOKENS.INDENT)) {
      end = TOKENS.DEDENT
      this.next(2)
    }

    let body = this.block(end, false, TOKENS.WHILE)

    this.expect(end)

    return new Node(token, { expr: expr_block, body })
  }

  return_statement () {
    let p = false
    let end = TOKENS.END
    let node = new Node(this.token)

    this.next()
    if (this.is(TOKENS.OPEN_PAREN)) {
      p = true
      end = TOKENS.CLOSE_PAREN
      this.next()
    }

    else if (this.match(TOKENS.EOL, TOKENS.INDENT)) {
      end = TOKENS.DEDENT
      p = true
      this.next(2)
    }

    if (!p || !this.is(TOKENS.CLOSE_PAREN)) {
      node.args = this.exprs(end)
    }

    if (p) {
      this.expect(end)
    }

    return node
  }

  class_list () {
    return this.loop_while(this.single, [TOKENS.ID], TOKENS.EOL, true, TOKENS.COMMA)
  }

  class_statement () {
    let token = this.token

    this.next()
    let id = this.token

    this.next()
    let _extends
    if (this.is(TOKENS.EXTENDS)) {
      this.next()
      _extends = this.class_list()
    }

    this._frames.add(id.value, TOKENS.CLASS)

    let end = TOKENS.END
    if (this.match(TOKENS.EOL, TOKENS.INDENT)) {
      end = TOKENS.DEDENT
      this.next(2)
    }

    this._inClass = true
    let body = this.block(end, false, TOKENS.CLASS)
    this._inClass = false

    this.expect(end)

    return new Node(token, { id, _extends, body })
  }

}

module.exports = {
  Statement,
}
