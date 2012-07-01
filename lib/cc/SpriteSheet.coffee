cc.module('cc.SpriteSheet').defines -> @set cc.Class.extend {
  tileWidth: 0,
  tileHeight: 0,
  # not to be called externally!! use Resources
  init: (path, @tileWidth, @tileHeight, onload) ->
    @image = new cc.Image path, onload

  imgWidth: -> @image.data.width
  imgHeight: -> @image.data.height
}
# vim:ts=2 sw=2
