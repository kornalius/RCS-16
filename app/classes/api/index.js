/**
 * @module classes/api
 */

const { Video, stage, renderer } = require('./video')
const { Overlays } = require('./overlays')
const { Palette } = require('./palette')
const { Text } = require('./text')
const { Sprite } = require('./sprite')

const video = new Video()
const overlays = new Overlays()
const palette = new Palette()
const text = new Text()
const sprite = new Sprite()

module.exports = {
  video,
  stage,
  renderer,
  overlays,
  palette,
  text,
  sprite,
}
