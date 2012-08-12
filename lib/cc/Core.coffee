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

  cc.onVisibilityChange = (callback) ->
    if document.hidden?
      hidden = "hidden"
      visibilityChange = "visibilitychange"
    else if document.mozHidden?
      hidden = "mozHidden"
      visibilityChange = "mozvisibilitychange"
    else if document.msHidden?
      hidden = "msHidden"
      visibilityChange = "msvisibilitychange"
    else if document.webkitHidden?
      hidden = "webkitHidden"
      visibilityChange = "webkitvisibilitychange"

    document.addEventListener visibilityChange,
      => callback document[hidden]
      false

  cc.ZERO = 0.0000001

  # random integer between min and max inclusive
  cc.rand = (min, max) -> Math.floor(Math.random() * (max - min + 1)) + min

# vim:ts=2 sw=2
