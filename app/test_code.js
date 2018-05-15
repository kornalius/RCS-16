console.log(...arguments)

const acorn = require ('acorn')

let a = {
  b: 10,
  c: {
    c: 20,
    d: 30,
    f: new Array(20000),
  }
}

  let b   = a.b
  let { c, d }   = a.c
  let [ e, f ]   = [1, 2]
  let arr = new Array(20000)

console.log(a, b, arr.length)

if (c.c > 10) {
  console.log('ok')
}
