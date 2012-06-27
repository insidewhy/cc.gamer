# a cache of images/sounds used by a game
cc.module('cc.Resources').requires('cc.Image').defines -> @set cc.Class.extend {
  init: ->
    @images = {}
    @audios = {}
    @completeCallbacks = []
    @nToLoad = 0
    @nLoaded = 0

  # from 0 to 1.. percentage of media loaded (by number of files)
  completeness: -> if 0 is @nToLoad then 1 else @nLoaded / @nToLoad

  _loaded: ->
    ++@nLoaded
    completeness = do @completeness
    callback completeness for callback in @completeCallbacks
    return

  image: (path) ->
    img = @images[path]
    return img if img
    ++@nToLoad
    img = @images[path] = new cc.Image path, => do @_loaded
    img

  # calls callback, first with current load status, then again with load status
  # updates until disabled
  onLoadStatusUpdate: (callback) ->
    callback(do @completeness)
    @completeCallbacks.push callback
    return

  clearLoadStatusUpdates: -> @completeCallbacks.length = 0 ; return
}

# vim:ts=2 sw=2
