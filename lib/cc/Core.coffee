cc.module('cc.Core').defines ->
  # the following line is an error, some browser security restriction I guess
  # o = t:window.mozRequestAnimationFrame ; t(cllback);
  _requestAnimFrame = do ->
    window.requestAnimationFrame or
      window.webkitRequestAnimationFrame or
      window.mozRequestAnimationFrame or
      window.oRequestAnimationFrame or
      window.msRequestAnimationFrame or
      (callback, element) ->
        window.setTimeout callback, 1000/60

  cc.requestAnimationFrame = (callback, element) ->
    _requestAnimFrame callback, element

  cc.initGL = (canvas, width, height) ->
    try
      gl = canvas.getContext("experimental-webgl")
      gl.viewportWidth = canvas.width = width
      gl.viewportHeight = canvas.height = height
      gl
    catch e
      alert("could not initialise WebGL")
      null

  cc.main = (canvas, gameClass, options) ->
    if not canvas.getContext?
      if not (canvas instanceof String)
        throw 'canvas argument must be Canvas object or selector'

      if canvas[0] == '#'
        canvas = document.getElementById canvas[1..]
      else
        canvas = document.getElementById canvas

      throw "could not find canvas" if not canvas.getContext?
    # TODO:


# vim:ts=2 sw=2
