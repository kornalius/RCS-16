/**
 * @module classes/api
 */

const { Video } = require('./video')
const { Overlays } = require('./overlays')
const { Palette } = require('./palette')
const { Text } = require('./text')
const { Sprite } = require('./sprite')
const { Mouse } = require('./mouse')

RCS.video = new Video()
RCS.palette = new Palette()
RCS.text = new Text('tiny')
RCS.sprite = new Sprite()
RCS.mouse = new Mouse(-1, 1, 1, 7, 10)
RCS.overlays = new Overlays()
