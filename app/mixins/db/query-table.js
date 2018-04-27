/**
 * @module mixins
 */

const { sift } = require('../../utils')
const { micromatch } = require('../../utils')
const { qs } = require('../../classes/db/qs')

const _QUERY_DELIMITER = ['{', '}']
const _SORT_DELIMITER = '@'
const _PATH_DELIMITER = '.'
const _LIMIT_DELIMITER = '#'
const _SKIP_DELIMITER = '$'

const DELIMITERS = [
  _QUERY_DELIMITER,
  _SORT_DELIMITER,
  _PATH_DELIMITER,
  _LIMIT_DELIMITER,
  _SKIP_DELIMITER,
]

sift.use({
  $contains: function (a, b) {
    if (_.isArray(a)) {
      if (_.isArray(b)) {
        for (let v of b) {
          if (_.includes(a, v)) {
            return true
          }
        }
        return false
      }
      return _.includes(a, b)
    }
    return b.indexOf(a) !== -1
  },
  $mm: function (a, b) {
    return !_.isEmpty(micromatch(b, a, { basename: true, dot: true, nocase: true }))
  },
})

const QueryTableMixin = Mixin(superclass => class QueryTableMixin extends superclass {

  _qs (pattern) {
    return qs(pattern, {
      allowDots: true,
      allowPrototypes: true,
      ignoreQueryPrefix: true,
      delimiter: /[&;]/,
    })
  }

  // .field@asc_field{query}#100$25
  async _parseQuery (path) {
    let i = 0
    let l = path.length

    let read_token = function (until, skips = []) {
      let token = ''
      while (i < l) {
        let c = path[i++]
        if (!_.includes(skips, c) && _.includes(DELIMITERS, c) || c === until) {
          i--
          break
        }
        token += c
      }
      return _.trim(token)
    }

    let query
    let pattern = {}
    let sort
    let limit
    let skip

    while (i < l) {
      let c = path[i++]
      switch (c) {
        case _PATH_DELIMITER:
          path = read_token(undefined, [_PATH_DELIMITER])
          break
        case _SORT_DELIMITER:
          sort = read_token()
          break
        case _LIMIT_DELIMITER:
          limit = _.parseInt(read_token())
          break
        case _SKIP_DELIMITER:
          skip = _.parseInt(read_token())
          break
        case _QUERY_DELIMITER[0]:
          query = read_token(_QUERY_DELIMITER[1])
          break
      }
    }

    // convert query from string to object
    if (_.isString(query)) {
      pattern = this._qs(query)
    }

    return { query, pattern, sort, limit, skip }
  }

  _queryField (q, filter = false) {
    if (_.isString(q)) {
      if (_.isUUID(q)) { // id
        return filter ? { id: q } : { field: 'id', value: q }
      }
      else {
        return this._parseQuery(q)
      }
    }
    else if (!_.isEmpty(q.id)) {
      return filter ? { id: q.id } : { field: 'id', value: q.id }
    }
    else {
      if (!_.isEmpty(q.pattern)) {
        return q
      }
      return { pattern: q }
    }
  }

  _emptyCollection () {
    const db = this._table.db
    return new db.Collection(new db.WhereClause(this._table))
  }

  async _filter (q) {
    let qf = this._queryField(q)
    if (qf) {
      let coll = await this._table.filter(sift(qf.pattern))
      if (qf.sort) {
        coll.orderBy(qf.sort)
      }
      if (q.limit) {
        coll.limit(q.limit)
      }
      if (q.skip) {
        coll.offset(q.skip)
      }
      await this._updateItems(coll)
      return coll
    }
    return this._emptyCollection()
  }

})

module.exports = {
  QueryTableMixin,
}
