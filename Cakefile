path    = require 'path'
ake     = require 'cc.ake'
bkr     = require('cc.extend').baker
{exec}  = require 'child_process'

box2dVersion = '2.1a.3'

do ake.nodeModulePath

_bakeResources = ->
  bkr.bake 'lib/cc/gamer.coffee', 'cc/gamer.js',
    doNotMinify: true, doNotCompileCoffee: true, noCcLoader: true,
    includeFiles: [ path.join('node_modules', 'cc.extend', 'cc', 'extend.js'),
                    path.join('cc', 'gl-matrix.js'),
                    path.join('cc', 'box2d.js') ]

task 'web', 'build cc/gamer.js for use in websites', (options) ->
  ake.assert """
    mkdir -p cc &&
    ([ -f cc/gl-matrix.js ] || wget https://raw.github.com/toji/gl-matrix/master/gl-matrix.js -P cc) &&
    [ -f cc/box2d.js ] || (
      wget -c http://box2dweb.googlecode.com/files/Box2dWeb-#{box2dVersion}.zip -O cc/box2d.zip &&
      unzip cc/box2d.zip -d cc && rm cc/*.html &&
      mv cc/Box2dWeb-#{box2dVersion.replace /(\d)(\w\.)/, "$1.$2" }.js cc/box2d.js) &&
    coffee -c test""",
    _bakeResources
    'ln -sf ../cc test'
    'ln -sf ../lib/cc/physicsWorker.js cc/physics.js'

task 'clean', 'clean everything generated by build system', (options) ->
  ake.assert "rm -rf `grep '^/' .gitignore | sed 's,^/,,'`"

testServer = ->
  express = require 'express'
  app     = express.createServer()
  port    = process.env.port or 8014
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
  invoke 'web'
  ake.assert ->
    do testServer
    ake.watch 'test',
      /.coffee$/, (fname) ->
        tryExec "#{fname} changed: recompile tests", 'coffee -c test'
    ake.watch 'lib/cc',
      /.coffee$/, (fname) ->
        console.log "#{fname} changed: rebuild cc/gamer.js"
        do _bakeResources


# vim:ts=2 sw=2
