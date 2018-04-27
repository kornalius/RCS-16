// Based on qs-mongodb by shimo.im
// github.com/nswbmw/qs-mongodb

/*
Added syntax

Regex:
  ex: _path=^some.pa*
  *  -> .*
  ** -> [^\.]*
  ?  -> *

Missing field:
  if field is not specified, _path is added automatically

New string contains operator:
  ex: _path=~some

New regex operator:
  ex: _path=/^some.path$

Logical operators:
  && -> $and
  || -> $or
  ^^ -> $nor

Boolean values:
  'true'  -> true
  't'     -> true
  'false' -> false
  'f'     -> false
*/

const qs = require('qs')

var logicalOperators = {
  '&&': '$and',
  '||': '$or',
  '^^': '$nor'
}

const formatComparisonOperators = function (str) {
  str = str.replace(/=?\~/g, '[$contains]=')
  str = str.replace(/=?\@/g, '[$regex]=')
  str = str.replace(/(=?!)(?!=)/g, '[$not]=')
  str = str.replace(/=?>=/g, '[$gte]=')
  str = str.replace(/=?<=/g, '[$lte]=')
  str = str.replace(/=?(!=|<>)/g, '[$ne]=')
  str = str.replace(/=?>/g, '[$gt]=')
  str = str.replace(/=?</g, '[$lt]=')
  return str
}

const formatLogicalOperators = function (str, defaultField) {
  for (let operator in logicalOperators) {
    if (str.indexOf(operator) !== -1) {
      str = str.split(operator).map((item, index) =>
        item.split('&').map(item => {
          if (!item.match(/^(\[\w+\]|\w+)(?=[\[\=])/) && defaultField) {
            item = defaultField + (item.indexOf('=') === -1 ? '=' : '') + item
          }
          item = item.replace(/^([^\[=]+)/, '[$1]')
          return logicalOperators[operator] + '[' + index + ']' + item
        }).join('&')
      ).join('&')
      break
    }
  }
  return str
}

const formatCommaOperators = function (str) {
  if (!str.match(/,/)) {
    return str
  }
  return str.split('&').map(item =>
    item.replace(/(.+)=((.+)(,(.+))+)/g, (querystring, p1, p2) =>
      p2.split(',').map(item =>
        p1 + '[$in]=' + item
      ).join('&')
    )
  ).join('&')
}

const convertType = function (obj) {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      let value = obj[key]
      if (_.isObject(value)) {
        value = convertType(value)
      }
      else if (_.isString(value)) {
        let strReg = value.match(/^["'](.+)["']$/)
        if (strReg) {
          value = strReg[1]
        }
        else {
          let wildReg = value.match(/[\*\?\^\$]/gm)
          if (wildReg) {
            value = {
              $mm: value,
            }
          }
          else if (value === 'true' || value === 'y') {
            value = true
          }
          else if (value === 'false' || value === 'n') {
            value = false
          }
          else {
            let f = parseFloat(value)
            if (value === f) {
              value = f
            }
          }
        }
      }
      obj[key] = value
    }
  }
  return obj
}

module.exports = {
  qs: function (querystring, options) {
    if (!querystring) {
      return querystring
    }
    querystring = formatComparisonOperators(querystring)

    let pathReg
    let defaultField = _.get(options, 'defaultField')
    while (pathReg = querystring.match(/\(([^\(]+?)\)/)) {
      querystring = querystring.replace(pathReg[0], formatLogicalOperators(pathReg[1], defaultField))
    }

    querystring = formatLogicalOperators(querystring, defaultField)
    querystring = formatCommaOperators(querystring)

    return convertType(qs.parse(querystring, options))
  }
}
