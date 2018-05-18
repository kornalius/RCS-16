/**
 * @module compiler/lexer
 */

const { Node } = require('./node')
const { Expression } = require('./expression')
const TOKENS = require('../tokens/tokens')

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
      this._frames.start('', block_type)
    }
    let nodes = this.loop_while(this.statement, undefined, end, end_next, TOKENS.EOL)
    if (block_type) {
      this._frames.end()
    }
    return nodes
  }

}

module.exports = {
  Lexer,
}
