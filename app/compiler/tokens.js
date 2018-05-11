/**
 * @module compiler
 */

const { path } = require('../utils')

const SPACE = '\\s'
const TAB = '\\t'
const UNDERSCORE = '_'

const CR = '\\r'
const LF = '\\n'

const COMMA = ','
const COLON = ':'
const SEMI_COLON = ';'
const HASH = '#'
const QUOTE = '\''
const DOUBLE_QUOTE = '"'
const OPEN_PAREN = '('
const CLOSE_PAREN = ')'
const OPEN_BRACKET = '['
const CLOSE_BRACKET = ']'
const OPEN_CURLY = '{'
const CLOSE_CURLY = '}'
const AMPER = '@'
const PLUS = '+'
const MINUS = '-'
const MULTIPLY = '*'
const DIVIDE = '/'
const MODULUS = '%'
const AND = '&'
const OR = '|'
const XOR = '^'
const NOT = '!'
const EQUAL = '='
const NOT_EQUAL = '!='
const EQUAL_EQUAL = '=='
const LESSER = '<'
const LESSER_EQUAL = '<='
const GREATER = '>'
const GREATER_EQUAL = '>='

const ALPHA = '[A-Z_]'
const NOT_ALPHA = '[^A-Z_]'
const NUM = '[0-9]'
const ALPHA_NUM = '[A-Z_0-9]'
const HEXA = '[0-9A-F]'
const MINUS_PLUS = '[' + MINUS + PLUS + ']'

const EOL = 'EOL'
const COMMENT = 'COMMENT'
const CONST = 'CONST'
const IF = 'IF'
const ELSE = 'ELSE'
const WHILE = 'WHILE'
const FOR = 'FOR'
const LET = 'LET'
const CLASS = 'CLASS'
const NEW = 'NEW'
const SUPER = 'SUPER'
const RETURN = 'RETURN'
const BREAK = 'BREAK'
const CONTINUE = 'CONTINUE'
const FN = 'FN'
const VAR = 'VAR'
const END = 'END'
const STEP = 'STEP'
const TO = 'TO'

const WHITESPACE = 'WHITESPACE'
const NUMBER = 'NUMBER'
const HEXADECIMAL = 'HEXADECIMAL'
const RESERVED = 'RESERVED'
const STRING = 'STRING'
const CHAR = 'CHAR'
const INCLUDE = 'INCLUDE'
const KEY = 'KEY'
const ID = 'ID'
const ID_FIELD = 'ID_FIELD'
const THIS = 'THIS'
const THIS_FIELD = 'THIS_FIELD'
const ASSIGN = 'ASSIGN'
const MATH_ASSIGN = 'MATH_ASSIGN'
const LOGIC_ASSIGN = 'LOGIC_ASSIGN'
const FN_ASSIGN = 'FN_ASSIGN'

const COMP = [GREATER, LESSER, GREATER + EQUAL, LESSER_EQUAL, NOT_EQUAL, EQUAL_EQUAL]
const MATH = [PLUS, MINUS, MULTIPLY, DIVIDE, MODULUS]
const LOGIC = [AND, OR, XOR, NOT]

const RULES = [
  [WHITESPACE, new RegExp('^[' + SPACE + TAB + ']+')],

  [EOL, new RegExp('^[' + CR + LF + ']|' + SEMI_COLON)],

  [COMMENT, new RegExp('^\\' + DIVIDE + '\\' + DIVIDE + '([^' + CR + LF + ']*)')],

  [COMMA, new RegExp('^' + COMMA)],
  [COLON, new RegExp('^' + COLON)],

  [NUMBER, new RegExp('^(' + MINUS_PLUS + '?' + NUM + '*\\.?' + NUM + '+([eE]' + MINUS_PLUS + '?' + NUM + '+)?)')],
  [HEXADECIMAL, new RegExp('^0x(' + HEXA + '+)', 'i')],

  [RESERVED, new RegExp('^(' + [IF, ELSE, WHILE, CONST, RETURN, BREAK, CONTINUE, FOR, LET, CLASS, NEW, SUPER, END, STEP, TO].join('|') + ')' + SPACE + '+', 'i')],

  [STRING, new RegExp('^' + DOUBLE_QUOTE + '([^' + DOUBLE_QUOTE + ']*)' + DOUBLE_QUOTE)],
  [CHAR, new RegExp('^' + QUOTE + '(.)' + QUOTE)],

  [INCLUDE, new RegExp('^' + HASH + DOUBLE_QUOTE + '([^' + DOUBLE_QUOTE + ']*)' + DOUBLE_QUOTE)],

  [KEY, new RegExp('^' + COLON + '(' + ALPHA + ALPHA_NUM + '*)', 'i')],

  [ID, new RegExp('^(' + ALPHA + ALPHA_NUM + '*)', 'i')],
  [ID_FIELD, new RegExp('^\\.(' + ALPHA + ALPHA_NUM + '*)', 'i')],

  [THIS, new RegExp('^' + AMPER + '(?=' + NOT_ALPHA + ')', 'i')],
  [THIS_FIELD, new RegExp('^' + AMPER + '(' + ALPHA + ALPHA_NUM + '*)', 'i')],

  [ASSIGN, new RegExp('^(' + EQUAL + ')[^' + EQUAL + GREATER + ']')],
  [MATH_ASSIGN, new RegExp('^([\\' + MATH.join('\\') + '])' + EQUAL)],
  [LOGIC_ASSIGN, new RegExp('^([\\' + LOGIC.join('\\') + '])' + EQUAL)],
  [FN_ASSIGN, new RegExp('^' + EQUAL + GREATER)],

  [OPEN_PAREN, new RegExp('^\\' + OPEN_PAREN)],
  [CLOSE_PAREN, new RegExp('^\\' + CLOSE_PAREN)],
  [OPEN_BRACKET, new RegExp('^\\' + OPEN_BRACKET)],
  [CLOSE_BRACKET, new RegExp('^\\' + CLOSE_BRACKET)],
  [OPEN_CURLY, new RegExp('^\\' + OPEN_CURLY)],
  [CLOSE_CURLY, new RegExp('^\\' + CLOSE_CURLY)],

  [PLUS, new RegExp('^\\' + PLUS)],
  [MINUS, new RegExp('^\\' + MINUS)],
  [MULTIPLY, new RegExp('^\\' + MULTIPLY)],
  [DIVIDE, new RegExp('^\\' + DIVIDE)],
  [MODULUS, new RegExp('^\\' + MODULUS)],

  [EQUAL, new RegExp('^\\' + EQUAL)],
  [NOT_EQUAL, new RegExp('^\\' + NOT_EQUAL)],
  [LESSER, new RegExp('^\\' + LESSER)],
  [LESSER_EQUAL, new RegExp('^\\' + LESSER_EQUAL)],
  [GREATER, new RegExp('^\\' + GREATER)],
  [GREATER_EQUAL, new RegExp('^\\' + GREATER_EQUAL)],

  [AND, new RegExp('^\\' + AND)],
  [OR, new RegExp('^\\' + OR)],
  [XOR, new RegExp('^\\' + XOR)],
  [NOT, new RegExp('^\\' + NOT)],
]

class Token {

  constructor (tokenizer, type, value = '', start, end, indent) {
    this._tokenizer = tokenizer
    this._type = type
    this._value = value
    this._start = start
    this._end = end
    this._indent = indent
  }

  get tokenizer () { return this._tokenizer }

  get type () {
    if (this._type === RESERVED) {
      return this._value.toUpperCase()
    }
    return this._type
  }

  get value () { return this._value }
  get start () { return this._offsetPos(this._start) }
  get end () { return this._offsetPos(this._end) }
  get length () { return this._end - this._start }
  get indent () { return this._indent }

  _offsetPos (offset) {
    let tokenizer = this._tokenizer
    let line = tokenizer.lineFromOffset(offset)
    return {
      offset: offset,
      line: line,
      column: offset - tokenizer.lineOffsets[line],
    }
  }

  is (e) {
    if (_.isString(e)) {
      return this._type === e || this.type === e || this._value === e
    }
    else if (_.isArray(e)) {
      for (let i of e) {
        if (this.is(i)) {
          return true
        }
      }
    }
    else if (_.isRegExp(e)) {
      return this.type.match(e) || this._type.match(e) || this._value.match(e)
    }
    return false
  }

  toString () {
    return _.template('{{type}} "{{value}}" at {{path}}({{line}}:{{column}})')({ type: this._type, value: this._value, line: this.start.line, column: this.start.column, path: path.basename(this._tokenizer.path) })
  }

}

module.exports = {
  SPACE,
  TAB,
  UNDERSCORE,
  CR,
  LF,
  COMMA,
  COLON,
  SEMI_COLON,
  HASH,
  QUOTE,
  DOUBLE_QUOTE,
  OPEN_PAREN,
  CLOSE_PAREN,
  OPEN_BRACKET,
  CLOSE_BRACKET,
  OPEN_CURLY,
  CLOSE_CURLY,
  AMPER,
  PLUS,
  MINUS,
  MULTIPLY,
  DIVIDE,
  MODULUS,
  AND,
  OR,
  XOR,
  NOT,
  EQUAL,
  NOT_EQUAL,
  EQUAL_EQUAL,
  LESSER,
  LESSER_EQUAL,
  GREATER,
  GREATER_EQUAL,
  ALPHA,
  NOT_ALPHA,
  NUM,
  ALPHA_NUM,
  HEXA,
  MINUS_PLUS,
  EOL,
  COMMENT,
  CONST,
  IF,
  ELSE,
  WHILE,
  FOR,
  LET,
  CLASS,
  NEW,
  SUPER,
  RETURN,
  BREAK,
  CONTINUE,
  FN,
  VAR,
  END,
  STEP,
  TO,
  WHITESPACE,
  NUMBER,
  HEXADECIMAL,
  RESERVED,
  STRING,
  CHAR,
  INCLUDE,
  KEY,
  ID,
  ID_FIELD,
  THIS,
  THIS_FIELD,
  ASSIGN,
  MATH_ASSIGN,
  LOGIC_ASSIGN,
  FN_ASSIGN,
  COMP,
  MATH,
  LOGIC,

  RULES,

  Token,
}