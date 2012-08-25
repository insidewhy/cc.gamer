cc.module('cc.Viewport').defines -> @set cc.Class.extend {
  init: (@width, @height, _screenWidth, _screenHeight, @x = 0, @y = 0) ->
    @maxX = @width - _screenWidth
    @maxY = @height - _screenHeight

  setWidth: (width) ->
    @maxX += (width - @width)
    @width = width
    return

  setHeight: (height) ->
    @maxX += (height - @width)
    @height = height
    return

  checkX: ->
    if @x > @maxX
      @x = @maxX
    else if @x < 0
      @x = 0
    return

  checkY: ->
    if @y > @maxY
      @y = @maxY
    else if @y < 0
      @y = 0
    return

  scrollTo: (x, y) ->
    @x = x
    @y = y
    @checkX()
    @checkY()
    return

  scroll: (sx, sy) ->
    @x += sx
    @y += sy
    @checkX()
    @checkY()
    return

  scrollUp: (s) ->
    @y -= s
    if @y < 0
      @y = 0
    return

  scrollRight: (s) ->
    @x += s
    if @x > @maxX
      @x = @maxX
    return

  scrollDown: (s) ->
    @y += s
    if @y > @maxY
      @y = @maxY
    return

  scrollLeft: (s) ->
    @x -= s
    if @x < 0
      @x = 0
    return
}
# vim:ts=2 sw=2
