/**
 * @module app
 */

const { Emitter } = require('./mixins/common/events')

class Test extends Emitter {

  start () {
    RCS.text.move_to(0, 0)
    // for (let i = 0; i < 40; i++) {
    //   RCS.text.print((i < 10 ? '0' : '') + i + '234567890123456789012345678901234567890123456789012345678901234567890123456789')
    // }
    RCS.text.print('Welcome to RCS-16')
  }

}

module.exports = {
  Test,
}
