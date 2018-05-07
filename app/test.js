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
    RCS.text.println('Welcome to RCS-16', 45)
    RCS.text.print('Copyright (c) 2018, ArianeSoft Inc.', 8)
  }

}

module.exports = {
  Test,
}
