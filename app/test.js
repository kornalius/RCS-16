/**
 * @module app
 */

const { Emitter } = require('./mixins/common/events')

class Test extends Emitter {

  start () {
    RCS.text.move_to(10, 10)
    RCS.text.print('Hello World')
  }

}

module.exports = {
  Test,
}
