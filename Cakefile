path    = require 'path'
ake     = require 'cc.ake'
bkr     = require('cc.extend').baker
{exec}  = require 'child_process'
fs      = require 'fs'

do ake.nodeModulePath

_bakeResources = ->
  try
    bkr.bake 'lib/cc/gamer.coffee', 'cc/gamer.js',
      doNotMinify: true, doNotCompileCoffee: true, noCcLoader: true,
      includeFiles: [ path.join('node_modules', 'cc.extend', 'cc', 'extend.js'),
                      path.join('cc', 'gl-matrix.js'),
                      path.join('cc', 'box2d.js') ]
  catch e
    console.warn 'baking error:', e.toString()

task 'web', 'build cc/gamer.js for use in websites', (options) ->
  ake.assert (->
    fs.mkdirSync 'cc' unless fs.existsSync 'cc'),
    """([ -f cc/gl-matrix.js ] || wget --no-check-certificate https://raw.github.com/toji/gl-matrix/master/gl-matrix.js -P cc) &&
    [ -f cc/box2d.js ] || (
      wget --no-check-certificate -c https://raw.github.com/nuisanceofcats/box2d.js/master/box2d.js -O cc/box2d.js &&
      echo ';' >> cc/box2d.js) &&
    coffee -c test""",
    ->
      do _bakeResources
      ake.lnsf '../cc', 'test/cc'
      ake.lnsf '../lib/cc/physics/webWorker.js', 'cc/physics.js'

task 'clean', 'clean everything generated by build system', (options) ->
  ake.assert "rm -rf `grep '^/' .gitignore | sed 's,^/,,'`"

testServer = ->
  express = require 'express'
  app     = express()
  port    = process.env.PORT or 8014
  app.configure ->
    app.use express.static path.join(process.cwd(), 'test')
  console.log "cc.gamer test server listening on: #{port}"
  console.log "please go to http://localhost:#{port}/"
  app.listen port

tryExec = (prefix, cmd) ->
  exec cmd, (err, stdout, stderr) ->
    if err
      console.log prefix, "error #{stderr}"
    else
      console.log prefix, "success"
    return

task 'test', 'test cc.extend', (options) ->
  rebuildCcGamer = (fname) ->
    console.log "#{fname} changed: rebuild cc/gamer.js"
    do _bakeResources

  invoke 'web'
  ake.assert ->
    do testServer
    ake.watch 'test',
      /.coffee$/, (fname) ->
        tryExec "#{fname} changed: recompile tests", 'coffee -c test'
    ake.watch 'lib/cc',
      /.coffee$/, rebuildCcGamer
    ake.watch 'lib/cc/gl',
      /.coffee$/, rebuildCcGamer
    ake.watch 'lib/cc/physics',
      /.coffee$/, rebuildCcGamer
  return

task 'ghpage', 'update github page', (options) ->
  invoke 'web'
  ake.assert """git stash &&
    mkdir -p keep/cc &&
    mv cc/gamer.js keep/cc &&
    cp lib/cc/physics/webWorker.js keep/cc/physics.js &&
    cp test/*.{js,html} keep/ &&
    git checkout gh-pages &&
    cp -r keep/* .
    rm -rf keep"""

# vim:ts=2 sw=2
