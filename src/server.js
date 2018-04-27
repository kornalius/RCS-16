const server = require('server')

const { get, post } = server.router

RCS.server({ port: 3002 }, [
  get('/', ctx => 'Hello world!')
])
