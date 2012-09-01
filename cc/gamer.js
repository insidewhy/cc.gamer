(function() {
  var CC, Module, Self, cc,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

  Self = (function() {

    function Self(ccModName) {
      this.__cc = {
        modName: ccModName
      };
    }

    Self.prototype._getName = function(name) {
      return "" + this.__cc.modName + "." + name;
    };

    Self.prototype.jClass = function(name, val) {
      if (val) {
        cc.jClass(this._getName(name), val);
      } else {
        cc.jClass(this.__cc.modName, name);
      }
      return this;
    };

    Self.prototype.set = function(name, val) {
      if (typeof val !== 'undefined') {
        cc.set(this._getName(name), val);
      } else {
        cc.set(this.__cc.modName, name);
      }
      return this;
    };

    return Self;

  })();

  Module = (function() {

    function Module(name) {
      this.name = name;
      this.status = 'loading';
      this.onloads = [];
      this.deps = [];
    }

    Module.prototype.requires = function() {
      var lib, libs, _i, _len;
      libs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      for (_i = 0, _len = libs.length; _i < _len; _i++) {
        lib = libs[_i];
        this.deps.push(lib);
      }
      return this;
    };

    Module.prototype.parent = function(lib) {
      this._parent = lib;
      this.deps.push(lib);
      return this;
    };

    Module.prototype.pushOnload = function(callback) {
      this.onloads.push(callback);
      return this;
    };

    Module.prototype.jClass = function(classContent) {
      var _this = this;
      this.defines(function() {
        var parent;
        if (_this._parent) {
          parent = cc.get(_this._parent);
          if (!parent) {
            throw "parent " + _this._parent + " does not exist";
          } else if (parent.extend) {
            cc.set(_this.name, parent.extend(classContent));
            return;
          } else {
            classContent.isa = parent;
          }
        }
        return cc.jClass(_this.name, classContent);
      });
      return this;
    };

    Module.prototype.set = function(val) {
      var _this = this;
      this.defines(function() {
        return cc.set(_this.name, val);
      });
      return this;
    };

    Module.prototype.defines = function(defineCallback) {
      var dep, onLoad, toLoad, _i, _len, _ref,
        _this = this;
      this.defineCallback = defineCallback;
      if (!this.deps.length) {
        this._define();
      } else {
        toLoad = this.deps.length;
        onLoad = function(errMod) {
          if (errMod) {
            alert("" + _this.name + ": error loading dependency " + errMod);
            if (_this.script && _this.script.onerror && _this.status !== 'failed') {
              return _this.script.onerror();
            }
          } else if (0 === --toLoad) {
            return _this._define();
          }
        };
        _ref = this.deps;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          dep = _ref[_i];
          cc.require(dep, onLoad);
        }
      }
      return this;
    };

    Module.prototype.empty = function() {
      var onload, _i, _len, _ref;
      _ref = this.onloads;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        onload = _ref[_i];
        onload();
      }
      delete this.onloads;
      this.status = 'defined';
    };

    Module.prototype._define = function() {
      var hasKey, onload, self, _i, _len, _ref,
        _this = this;
      this.status = 'loaded';
      self = new Self(this.name);
      try {
        this.defineCallback.call(self);
      } catch (e) {
        this.status = 'failed';
        alert("" + this.name + ".defines failed: " + e.message);
        _ref = this.onloads;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          onload = _ref[_i];
          onload(this.name);
        }
      }
      hasKey = function() {
        var key;
        for (key in self) {
          if (!__hasProp.call(self, key)) continue;
          if (key !== '__cc') {
            return true;
          }
        }
        return false;
      };
      if (hasKey()) {
        cc.set(this.name, self);
      }
      return this.empty();
    };

    return Module;

  })();

  CC = (function() {

    function CC() {
      var re;
      this.firefoxVersion = -1 !== navigator.userAgent.indexOf("Firefox");
      this.ieVersion = navigator.appName === 'Microsoft Internet Explorer' ? (re = /MSIE ([0-9]{1,}[\.0-9]{0,})/, re.exec(navigator.userAgent) ? parseFloat(RegExp.$1) : 0) : 0;
      this.libpath = 'lib';
      this.modules = {};
      this.global = window ? window : GLOBAL;
      this.head = document.getElementsByTagName('head')[0];
      this.ieScriptPollTimeout = 5000;
    }

    CC.prototype.module = function(name) {
      var mod;
      mod = this.modules[name];
      if (mod) {
        return mod;
      } else {
        return cc.modules[name] = new Module(name);
      }
    };

    CC.prototype.namespaceFor = function(ns) {
      var components, current, obj, space, _i, _len, _ref;
      obj = this.global;
      components = ns.split('.');
      _ref = components.slice(0, components.length - 1);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        space = _ref[_i];
        current = obj[space];
        if (!current) {
          obj = obj[space] = {};
        } else if (typeof current === 'object') {
          obj = current;
        } else {
          alert("namespace conflict, " + ns + " = " + current + " of " + (typeof current));
        }
      }
      return [obj, components[components.length - 1]];
    };

    CC.prototype.set = function(ns, val) {
      var current, key, lastComp, obj, subval, _ref;
      _ref = this.namespaceFor(ns), obj = _ref[0], lastComp = _ref[1];
      current = obj[lastComp];
      if (current) {
        if (typeof current === 'object' && typeof val === 'object') {
          for (key in val) {
            if (!__hasProp.call(val, key)) continue;
            subval = val[key];
            current[key] = subval;
          }
        } else {
          alert("namespace conflict, " + ns + " = " + current + " of " + (typeof current));
        }
      } else {
        obj[lastComp] = val;
      }
      return this;
    };

    CC.prototype.get = function(id) {
      var modId, ret, _i, _len, _ref;
      ret = this.global;
      _ref = id.split('.');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        modId = _ref[_i];
        try {
          ret = ret[modId];
        } catch (e) {
          throw "cc.get accessing " + id + " at " + modId;
        }
      }
      return ret;
    };

    CC.prototype.jClass = function(ns, clss) {
      if (!(typeof Class !== "undefined" && Class !== null)) {
        throw 'please install Joose to use cc.jClass';
      }
      this.namespaceFor(ns);
      Class(ns, clss);
      return this;
    };

    CC.prototype.scriptOnload = function(script, onload) {
      if (script.readyState) {
        script.onreadystatechange = function() {
          switch (script.readyState) {
            case "loaded":
            case "complete":
              onload();
              return script.onreadystatechange = null;
          }
        };
      } else {
        script.onload = onload;
      }
      return this;
    };

    CC.prototype.loadScript = function(path, onload, onerror) {
      var loaded, script, _ref;
      script = document.createElement('script');
      script.type = 'text/javascript';
      if ('file:' === ((_ref = document.location) != null ? _ref.protocol : void 0) && this.firefoxVersion) {
        loaded = false;
        this.scriptOnload(script, function() {
          loaded = true;
          if (onload) {
            return onload();
          }
        });
        setTimeout(function() {
          if (!loaded) {
            return onerror();
          }
        }, 2000);
      } else {
        if (!this.ieVersion ? onload : void 0) {
          this.scriptOnload(script, onload);
        }
        if (onerror) {
          script.onerror = onerror;
        }
      }
      script.src = path;
      this.head.appendChild(script);
      return script;
    };

    CC.prototype.require = function(name, callback) {
      var loadingModules, mod, path,
        _this = this;
      mod = this.modules[name];
      if (mod) {
        if (callback) {
          if ('failed' === mod.status) {
            callback(name);
          } else if ('defined' !== mod.status) {
            mod.pushOnload(callback);
          } else {
            callback();
          }
        }
        return this;
      }
      mod = this.modules[name] = new Module(name);
      if (callback) {
        mod.pushOnload(callback);
      }
      path = this.libpath + '/' + name.replace(/\./g, '/') + '.js';
      mod.script = this.loadScript(path, null, function() {
        if ('failed' === mod.status) {
          return;
        }
        mod.status = 'failed';
        if (callback) {
          return callback(name);
        } else {
          return alert("error requiring " + name);
        }
      });
      if (this.ieVersion && !this._pollingForStupidIE) {
        loadingModules = [];
        this._pollingForStupidIE = setInterval(function() {
          var key, _i, _len, _ref;
          for (_i = 0, _len = loadingModules.length; _i < _len; _i++) {
            mod = loadingModules[_i];
            if ('loading' === mod.status) {
              mod.script.onerror();
            }
          }
          loadingModules.length = 0;
          _ref = _this.modules;
          for (key in _ref) {
            if (!__hasProp.call(_ref, key)) continue;
            mod = _ref[key];
            if (mod.script && mod.status === 'loading') {
              loadingModules.push(mod);
            }
          }
          if (!loadingModules.length) {
            clearInterval(_this._pollingForStupidIE);
            delete _this._pollingForStupidIE;
          }
        }, this.ieScriptPollTimeout);
      }
      return this;
    };

    return CC;

  })();

  cc = new CC;

  cc.global.cc = cc;

}).call(this);
(function() {

  cc.module('cc.extend').defines(function() {
    var fnTest, initing;
    initing = false;
    fnTest = /kit/.test(function() {
      return kit;
    }) ? /\bparent\b/ : /.*/;
    cc.avoidCloning = function(val) {
      return !val || !(val instanceof Object) || val instanceof cc.Class || val instanceof HTMLElement;
    };
    cc.clone = function(obj) {
      if (cc.avoidCloning(obj)) {
        return obj;
      } else {
        return cc.cloneCloneable(obj);
      }
    };
    cc.cloneCloneable = function(obj) {
      var i, k, retObj, v, val, _i, _len;
      if (obj instanceof Array) {
        retObj = [];
        retObj.length = obj.length;
        for (i = _i = 0, _len = obj.length; _i < _len; i = ++_i) {
          val = obj[i];
          retObj[i] = cc.clone(val);
        }
        return retObj;
      } else {
        retObj = {};
        for (k in obj) {
          v = obj[k];
          retObj[k] = cc.clone(v);
        }
        return retObj;
      }
    };
    cc.extend = function(parent, members) {
      var attr, attrName, attributes, member, name, prntAttr, prntName, prntProto, proto, _ref;
      prntProto = parent.prototype;
      initing = true;
      proto = new parent;
      initing = false;
      attributes = {};
      if (parent.attributes) {
        _ref = parent.attributes;
        for (prntName in _ref) {
          prntAttr = _ref[prntName];
          attributes[prntName] = prntAttr;
        }
      }
      proto.__super = {};
      for (name in members) {
        member = members[name];
        if (typeof member === "function") {
          proto.__super[name] = (function(name, member) {
            return function() {
              return prntProto[name].apply(this.__this, arguments);
            };
          })(name, member);
          proto[name] = typeof prntProto[name] === "function" && fnTest.test(member) ? (function(name, member) {
            return function() {
              var ret, tmp;
              tmp = this.parent;
              this.parent = prntProto[name];
              ret = member.apply(this, arguments);
              this.parent = tmp;
              return ret;
            };
          })(name, member) : member;
        } else if (cc.avoidCloning(member)) {
          proto[name] = member;
        } else {
          attributes[name] = member;
        }
      }
      function ChildClass() {;

      if (initing) {
        return;
      }
      this.__super.__this = this;
      for (attrName in attributes) {
        attr = attributes[attrName];
        this[attrName] = cc.cloneCloneable(attr);
      }
      if (this.init) {
        this.init.apply(this, arguments);
      }
      };

      ChildClass.prototype = proto;
      ChildClass.attributes = attributes;
      ChildClass.constructor = ChildClass;
      ChildClass.extend = function(members) {
        return cc.extend(ChildClass, members);
      };
      ChildClass.inject = function(members) {
        return cc.inject(ChildClass, members);
      };
      return ChildClass;
    };
    return cc.inject = function(clss, members) {
      var backup, member, name, proto;
      proto = clss.prototype;
      for (name in members) {
        member = members[name];
        if (typeof member === "function" && typeof proto[name] === "function" && fnTest.test(member)) {
          backup = proto[name];
          proto[name] = function() {
            var ret, tmp;
            tmp = this.parent;
            this.parent = backup;
            ret = member.apply(this, arguments);
            this.parent = tmp;
            return ret;
          };
        } else {
          proto[name] = member;
        }
      }
      return clss;
    };
  });

  cc.module('cc.Class').defines(function() {
    this.set(cc.extend(Function, {}));
  });

}).call(this);
/**
 * @fileoverview gl-matrix - High performance matrix and vector operations for WebGL
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 1.3.7
 */

/*
 * Copyright (c) 2012 Brandon Jones, Colin MacKenzie IV
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

// Updated to use a modification of the "returnExportsGlobal" pattern from https://github.com/umdjs/umd

(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory(global);
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], function () {
            return factory(root);
        });
    } else {
        // Browser globals
        factory(root);
    }
}(this, function (root) {
    "use strict";

    // Tweak to your liking
    var FLOAT_EPSILON = 0.000001;

    var glMath = {};
    (function() {
        if (typeof(Float32Array) != 'undefined') {
            var y = new Float32Array(1);
            var i = new Int32Array(y.buffer);

            /**
             * Fast way to calculate the inverse square root,
             * see http://jsperf.com/inverse-square-root/5
             *
             * If typed arrays are not available, a slower
             * implementation will be used.
             *
             * @param {Number} number the number
             * @returns {Number} Inverse square root
             */
            glMath.invsqrt = function(number) {
              var x2 = number * 0.5;
              y[0] = number;
              var threehalfs = 1.5;

              i[0] = 0x5f3759df - (i[0] >> 1);

              var number2 = y[0];

              return number2 * (threehalfs - (x2 * number2 * number2));
            };
        } else {
            glMath.invsqrt = function(number) { return 1.0 / Math.sqrt(number); };
        }
    })();

    /**
     * @class System-specific optimal array type
     * @name MatrixArray
     */
    var MatrixArray = null;
    
    // explicitly sets and returns the type of array to use within glMatrix
    function setMatrixArrayType(type) {
        MatrixArray = type;
        return MatrixArray;
    }

    // auto-detects and returns the best type of array to use within glMatrix, falling
    // back to Array if typed arrays are unsupported
    function determineMatrixArrayType() {
        MatrixArray = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
        return MatrixArray;
    }
    
    determineMatrixArrayType();

    /**
     * @class 3 Dimensional Vector
     * @name vec3
     */
    var vec3 = {};
     
    /**
     * Creates a new instance of a vec3 using the default array type
     * Any javascript array-like objects containing at least 3 numeric elements can serve as a vec3
     *
     * @param {vec3} [vec] vec3 containing values to initialize with
     *
     * @returns {vec3} New vec3
     */
    vec3.create = function (vec) {
        var dest = new MatrixArray(3);

        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
            dest[2] = vec[2];
        } else {
            dest[0] = dest[1] = dest[2] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a vec3, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value

     * @returns {vec3} New vec3
     */
    vec3.createFrom = function (x, y, z) {
        var dest = new MatrixArray(3);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;

        return dest;
    };

    /**
     * Copies the values of one vec3 to another
     *
     * @param {vec3} vec vec3 containing values to copy
     * @param {vec3} dest vec3 receiving copied values
     *
     * @returns {vec3} dest
     */
    vec3.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        dest[2] = vec[2];

        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec3} a First vector
     * @param {vec3} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec3.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON
        );
    };

    /**
     * Performs a vector addition
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.add = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] += vec2[0];
            vec[1] += vec2[1];
            vec[2] += vec2[2];
            return vec;
        }

        dest[0] = vec[0] + vec2[0];
        dest[1] = vec[1] + vec2[1];
        dest[2] = vec[2] + vec2[2];
        return dest;
    };

    /**
     * Performs a vector subtraction
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.subtract = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] -= vec2[0];
            vec[1] -= vec2[1];
            vec[2] -= vec2[2];
            return vec;
        }

        dest[0] = vec[0] - vec2[0];
        dest[1] = vec[1] - vec2[1];
        dest[2] = vec[2] - vec2[2];
        return dest;
    };

    /**
     * Performs a vector multiplication
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.multiply = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] *= vec2[0];
            vec[1] *= vec2[1];
            vec[2] *= vec2[2];
            return vec;
        }

        dest[0] = vec[0] * vec2[0];
        dest[1] = vec[1] * vec2[1];
        dest[2] = vec[2] * vec2[2];
        return dest;
    };

    /**
     * Negates the components of a vec3
     *
     * @param {vec3} vec vec3 to negate
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.negate = function (vec, dest) {
        if (!dest) { dest = vec; }

        dest[0] = -vec[0];
        dest[1] = -vec[1];
        dest[2] = -vec[2];
        return dest;
    };

    /**
     * Multiplies the components of a vec3 by a scalar value
     *
     * @param {vec3} vec vec3 to scale
     * @param {number} val Value to scale by
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.scale = function (vec, val, dest) {
        if (!dest || vec === dest) {
            vec[0] *= val;
            vec[1] *= val;
            vec[2] *= val;
            return vec;
        }

        dest[0] = vec[0] * val;
        dest[1] = vec[1] * val;
        dest[2] = vec[2] * val;
        return dest;
    };

    /**
     * Generates a unit vector of the same direction as the provided vec3
     * If vector length is 0, returns [0, 0, 0]
     *
     * @param {vec3} vec vec3 to normalize
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.normalize = function (vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            len = Math.sqrt(x * x + y * y + z * z);

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        } else if (len === 1) {
            dest[0] = x;
            dest[1] = y;
            dest[2] = z;
            return dest;
        }

        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        return dest;
    };

    /**
     * Generates the cross product of two vec3s
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.cross = function (vec, vec2, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            x2 = vec2[0], y2 = vec2[1], z2 = vec2[2];

        dest[0] = y * z2 - z * y2;
        dest[1] = z * x2 - x * z2;
        dest[2] = x * y2 - y * x2;
        return dest;
    };

    /**
     * Caclulates the length of a vec3
     *
     * @param {vec3} vec vec3 to calculate length of
     *
     * @returns {number} Length of vec
     */
    vec3.length = function (vec) {
        var x = vec[0], y = vec[1], z = vec[2];
        return Math.sqrt(x * x + y * y + z * z);
    };

    /**
     * Caclulates the squared length of a vec3
     *
     * @param {vec3} vec vec3 to calculate squared length of
     *
     * @returns {number} Squared Length of vec
     */
    vec3.squaredLength = function (vec) {
        var x = vec[0], y = vec[1], z = vec[2];
        return x * x + y * y + z * z;
    };

    /**
     * Caclulates the dot product of two vec3s
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     *
     * @returns {number} Dot product of vec and vec2
     */
    vec3.dot = function (vec, vec2) {
        return vec[0] * vec2[0] + vec[1] * vec2[1] + vec[2] * vec2[2];
    };

    /**
     * Generates a unit vector pointing from one vector to another
     *
     * @param {vec3} vec Origin vec3
     * @param {vec3} vec2 vec3 to point to
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.direction = function (vec, vec2, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0] - vec2[0],
            y = vec[1] - vec2[1],
            z = vec[2] - vec2[2],
            len = Math.sqrt(x * x + y * y + z * z);

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        }

        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        return dest;
    };

    /**
     * Performs a linear interpolation between two vec3
     *
     * @param {vec3} vec First vector
     * @param {vec3} vec2 Second vector
     * @param {number} lerp Interpolation amount between the two inputs
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.lerp = function (vec, vec2, lerp, dest) {
        if (!dest) { dest = vec; }

        dest[0] = vec[0] + lerp * (vec2[0] - vec[0]);
        dest[1] = vec[1] + lerp * (vec2[1] - vec[1]);
        dest[2] = vec[2] + lerp * (vec2[2] - vec[2]);

        return dest;
    };

    /**
     * Calculates the euclidian distance between two vec3
     *
     * Params:
     * @param {vec3} vec First vector
     * @param {vec3} vec2 Second vector
     *
     * @returns {number} Distance between vec and vec2
     */
    vec3.dist = function (vec, vec2) {
        var x = vec2[0] - vec[0],
            y = vec2[1] - vec[1],
            z = vec2[2] - vec[2];
            
        return Math.sqrt(x*x + y*y + z*z);
    };

    // Pre-allocated to prevent unecessary garbage collection
    var unprojectMat = null;
    var unprojectVec = new MatrixArray(4);
    /**
     * Projects the specified vec3 from screen space into object space
     * Based on the <a href="http://webcvs.freedesktop.org/mesa/Mesa/src/glu/mesa/project.c?revision=1.4&view=markup">Mesa gluUnProject implementation</a>
     *
     * @param {vec3} vec Screen-space vector to project
     * @param {mat4} view View matrix
     * @param {mat4} proj Projection matrix
     * @param {vec4} viewport Viewport as given to gl.viewport [x, y, width, height]
     * @param {vec3} [dest] vec3 receiving unprojected result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.unproject = function (vec, view, proj, viewport, dest) {
        if (!dest) { dest = vec; }

        if(!unprojectMat) {
            unprojectMat = mat4.create();
        }

        var m = unprojectMat;
        var v = unprojectVec;
        
        v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
        v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
        v[2] = 2.0 * vec[2] - 1.0;
        v[3] = 1.0;
        
        mat4.multiply(proj, view, m);
        if(!mat4.inverse(m)) { return null; }
        
        mat4.multiplyVec4(m, v);
        if(v[3] === 0.0) { return null; }

        dest[0] = v[0] / v[3];
        dest[1] = v[1] / v[3];
        dest[2] = v[2] / v[3];
        
        return dest;
    };

    var xUnitVec3 = vec3.createFrom(1,0,0);
    var yUnitVec3 = vec3.createFrom(0,1,0);
    var zUnitVec3 = vec3.createFrom(0,0,1);

    var tmpvec3 = vec3.create();
    /**
     * Generates a quaternion of rotation between two given normalized vectors
     *
     * @param {vec3} a Normalized source vector
     * @param {vec3} b Normalized target vector
     * @param {quat4} [dest] quat4 receiving operation result.
     *
     * @returns {quat4} dest if specified, a new quat4 otherwise
     */
    vec3.rotationTo = function (a, b, dest) {
        if (!dest) { dest = quat4.create(); }
        
        var d = vec3.dot(a, b);
        var axis = tmpvec3;
        if (d >= 1.0) {
            quat4.set(identityQuat4, dest);
        } else if (d < (0.000001 - 1.0)) {
            vec3.cross(xUnitVec3, a, axis);
            if (vec3.length(axis) < 0.000001)
                vec3.cross(yUnitVec3, a, axis);
            if (vec3.length(axis) < 0.000001)
                vec3.cross(zUnitVec3, a, axis);
            vec3.normalize(axis);
            quat4.fromAngleAxis(Math.PI, axis, dest);
        } else {
            var s = Math.sqrt((1.0 + d) * 2.0);
            var sInv = 1.0 / s;
            vec3.cross(a, b, axis);
            dest[0] = axis[0] * sInv;
            dest[1] = axis[1] * sInv;
            dest[2] = axis[2] * sInv;
            dest[3] = s * 0.5;
            quat4.normalize(dest);
        }
        if (dest[3] > 1.0) dest[3] = 1.0;
        else if (dest[3] < -1.0) dest[3] = -1.0;
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec3} vec Vector to represent as a string
     *
     * @returns {string} String representation of vec
     */
    vec3.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ']';
    };

    /**
     * @class 3x3 Matrix
     * @name mat3
     */
    var mat3 = {};

    /**
     * Creates a new instance of a mat3 using the default array type
     * Any javascript array-like object containing at least 9 numeric elements can serve as a mat3
     *
     * @param {mat3} [mat] mat3 containing values to initialize with
     *
     * @returns {mat3} New mat3
     */
    mat3.create = function (mat) {
        var dest = new MatrixArray(9);

        if (mat) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];
            dest[8] = mat[8];
        } else {
            dest[0] = dest[1] =
            dest[2] = dest[3] =
            dest[4] = dest[5] =
            dest[6] = dest[7] =
            dest[8] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a mat3, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m02
     * @param {number} m10
     * @param {number} m11
     * @param {number} m12
     * @param {number} m20
     * @param {number} m21
     * @param {number} m22

     * @returns {mat3} New mat3
     */
    mat3.createFrom = function (m00, m01, m02, m10, m11, m12, m20, m21, m22) {
        var dest = new MatrixArray(9);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m02;
        dest[3] = m10;
        dest[4] = m11;
        dest[5] = m12;
        dest[6] = m20;
        dest[7] = m21;
        dest[8] = m22;

        return dest;
    };

    /**
     * Calculates the determinant of a mat3
     *
     * @param {mat3} mat mat3 to calculate determinant of
     *
     * @returns {Number} determinant of mat
     */
    mat3.determinant = function (mat) {
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8];

        return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
    };

    /**
     * Calculates the inverse matrix of a mat3
     *
     * @param {mat3} mat mat3 to calculate inverse of
     * @param {mat3} [dest] mat3 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat3} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat3.inverse = function (mat, dest) {
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8],

            b01 = a22 * a11 - a12 * a21,
            b11 = -a22 * a10 + a12 * a20,
            b21 = a21 * a10 - a11 * a20,

            d = a00 * b01 + a01 * b11 + a02 * b21,
            id;

        if (!d) { return null; }
        id = 1 / d;

        if (!dest) { dest = mat3.create(); }

        dest[0] = b01 * id;
        dest[1] = (-a22 * a01 + a02 * a21) * id;
        dest[2] = (a12 * a01 - a02 * a11) * id;
        dest[3] = b11 * id;
        dest[4] = (a22 * a00 - a02 * a20) * id;
        dest[5] = (-a12 * a00 + a02 * a10) * id;
        dest[6] = b21 * id;
        dest[7] = (-a21 * a00 + a01 * a20) * id;
        dest[8] = (a11 * a00 - a01 * a10) * id;
        return dest;
    };
    
    /**
     * Performs a matrix multiplication
     *
     * @param {mat3} mat First operand
     * @param {mat3} mat2 Second operand
     * @param {mat3} [dest] mat3 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat3} dest if specified, mat otherwise
     */
    mat3.multiply = function (mat, mat2, dest) {
        if (!dest) { dest = mat; }
        

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8],

            b00 = mat2[0], b01 = mat2[1], b02 = mat2[2],
            b10 = mat2[3], b11 = mat2[4], b12 = mat2[5],
            b20 = mat2[6], b21 = mat2[7], b22 = mat2[8];

        dest[0] = b00 * a00 + b01 * a10 + b02 * a20;
        dest[1] = b00 * a01 + b01 * a11 + b02 * a21;
        dest[2] = b00 * a02 + b01 * a12 + b02 * a22;

        dest[3] = b10 * a00 + b11 * a10 + b12 * a20;
        dest[4] = b10 * a01 + b11 * a11 + b12 * a21;
        dest[5] = b10 * a02 + b11 * a12 + b12 * a22;

        dest[6] = b20 * a00 + b21 * a10 + b22 * a20;
        dest[7] = b20 * a01 + b21 * a11 + b22 * a21;
        dest[8] = b20 * a02 + b21 * a12 + b22 * a22;

        return dest;
    };

    /**
     * Transforms the vec2 according to the given mat3.
     *
     * @param {mat3} matrix mat3 to multiply against
     * @param {vec2} vec    the vector to multiply
     * @param {vec2} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec2} The multiplication result
     **/
    mat3.multiplyVec2 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1];
      dest[0] = x * matrix[0] + y * matrix[3] + matrix[6];
      dest[1] = x * matrix[1] + y * matrix[4] + matrix[7];
      return dest;
    };

    /**
     * Transforms the vec3 according to the given mat3
     *
     * @param {mat3} matrix mat3 to multiply against
     * @param {vec3} vec    the vector to multiply
     * @param {vec3} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec3} The multiplication result
     **/
    mat3.multiplyVec3 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1], z = vec[2];
      dest[0] = x * matrix[0] + y * matrix[3] + z * matrix[6];
      dest[1] = x * matrix[1] + y * matrix[4] + z * matrix[7];
      dest[2] = x * matrix[2] + y * matrix[5] + z * matrix[8];
      
      return dest;
    };

    /**
     * Copies the values of one mat3 to another
     *
     * @param {mat3} mat mat3 containing values to copy
     * @param {mat3} dest mat3 receiving copied values
     *
     * @returns {mat3} dest
     */
    mat3.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat3} a First matrix
     * @param {mat3} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat3.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
            Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
            Math.abs(a[5] - b[5]) < FLOAT_EPSILON &&
            Math.abs(a[6] - b[6]) < FLOAT_EPSILON &&
            Math.abs(a[7] - b[7]) < FLOAT_EPSILON &&
            Math.abs(a[8] - b[8]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat3 to an identity matrix
     *
     * @param {mat3} dest mat3 to set
     *
     * @returns dest if specified, otherwise a new mat3
     */
    mat3.identity = function (dest) {
        if (!dest) { dest = mat3.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 1;
        dest[5] = 0;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 1;
        return dest;
    };

    /**
     * Transposes a mat3 (flips the values over the diagonal)
     *
     * Params:
     * @param {mat3} mat mat3 to transpose
     * @param {mat3} [dest] mat3 receiving transposed values. If not specified result is written to mat
     *
     * @returns {mat3} dest is specified, mat otherwise
     */
    mat3.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a01 = mat[1], a02 = mat[2],
                a12 = mat[5];

            mat[1] = mat[3];
            mat[2] = mat[6];
            mat[3] = a01;
            mat[5] = mat[7];
            mat[6] = a02;
            mat[7] = a12;
            return mat;
        }

        dest[0] = mat[0];
        dest[1] = mat[3];
        dest[2] = mat[6];
        dest[3] = mat[1];
        dest[4] = mat[4];
        dest[5] = mat[7];
        dest[6] = mat[2];
        dest[7] = mat[5];
        dest[8] = mat[8];
        return dest;
    };

    /**
     * Copies the elements of a mat3 into the upper 3x3 elements of a mat4
     *
     * @param {mat3} mat mat3 containing values to copy
     * @param {mat4} [dest] mat4 receiving copied values
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat3.toMat4 = function (mat, dest) {
        if (!dest) { dest = mat4.create(); }

        dest[15] = 1;
        dest[14] = 0;
        dest[13] = 0;
        dest[12] = 0;

        dest[11] = 0;
        dest[10] = mat[8];
        dest[9] = mat[7];
        dest[8] = mat[6];

        dest[7] = 0;
        dest[6] = mat[5];
        dest[5] = mat[4];
        dest[4] = mat[3];

        dest[3] = 0;
        dest[2] = mat[2];
        dest[1] = mat[1];
        dest[0] = mat[0];

        return dest;
    };

    /**
     * Returns a string representation of a mat3
     *
     * @param {mat3} mat mat3 to represent as a string
     *
     * @param {string} String representation of mat
     */
    mat3.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] +
            ', ' + mat[3] + ', ' + mat[4] + ', ' + mat[5] +
            ', ' + mat[6] + ', ' + mat[7] + ', ' + mat[8] + ']';
    };

    /**
     * @class 4x4 Matrix
     * @name mat4
     */
    var mat4 = {};

    /**
     * Creates a new instance of a mat4 using the default array type
     * Any javascript array-like object containing at least 16 numeric elements can serve as a mat4
     *
     * @param {mat4} [mat] mat4 containing values to initialize with
     *
     * @returns {mat4} New mat4
     */
    mat4.create = function (mat) {
        var dest = new MatrixArray(16);

        if (mat) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];
            dest[8] = mat[8];
            dest[9] = mat[9];
            dest[10] = mat[10];
            dest[11] = mat[11];
            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        return dest;
    };

    /**
     * Creates a new instance of a mat4, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m02
     * @param {number} m03
     * @param {number} m10
     * @param {number} m11
     * @param {number} m12
     * @param {number} m13
     * @param {number} m20
     * @param {number} m21
     * @param {number} m22
     * @param {number} m23
     * @param {number} m30
     * @param {number} m31
     * @param {number} m32
     * @param {number} m33

     * @returns {mat4} New mat4
     */
    mat4.createFrom = function (m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
        var dest = new MatrixArray(16);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m02;
        dest[3] = m03;
        dest[4] = m10;
        dest[5] = m11;
        dest[6] = m12;
        dest[7] = m13;
        dest[8] = m20;
        dest[9] = m21;
        dest[10] = m22;
        dest[11] = m23;
        dest[12] = m30;
        dest[13] = m31;
        dest[14] = m32;
        dest[15] = m33;

        return dest;
    };

    /**
     * Copies the values of one mat4 to another
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat4} dest mat4 receiving copied values
     *
     * @returns {mat4} dest
     */
    mat4.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        dest[9] = mat[9];
        dest[10] = mat[10];
        dest[11] = mat[11];
        dest[12] = mat[12];
        dest[13] = mat[13];
        dest[14] = mat[14];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat4} a First matrix
     * @param {mat4} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
            Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
            Math.abs(a[5] - b[5]) < FLOAT_EPSILON &&
            Math.abs(a[6] - b[6]) < FLOAT_EPSILON &&
            Math.abs(a[7] - b[7]) < FLOAT_EPSILON &&
            Math.abs(a[8] - b[8]) < FLOAT_EPSILON &&
            Math.abs(a[9] - b[9]) < FLOAT_EPSILON &&
            Math.abs(a[10] - b[10]) < FLOAT_EPSILON &&
            Math.abs(a[11] - b[11]) < FLOAT_EPSILON &&
            Math.abs(a[12] - b[12]) < FLOAT_EPSILON &&
            Math.abs(a[13] - b[13]) < FLOAT_EPSILON &&
            Math.abs(a[14] - b[14]) < FLOAT_EPSILON &&
            Math.abs(a[15] - b[15]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat4 to an identity matrix
     *
     * @param {mat4} dest mat4 to set
     *
     * @returns {mat4} dest
     */
    mat4.identity = function (dest) {
        if (!dest) { dest = mat4.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = 1;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 0;
        dest[9] = 0;
        dest[10] = 1;
        dest[11] = 0;
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;
        return dest;
    };

    /**
     * Transposes a mat4 (flips the values over the diagonal)
     *
     * @param {mat4} mat mat4 to transpose
     * @param {mat4} [dest] mat4 receiving transposed values. If not specified result is written to mat
     *
     * @param {mat4} dest is specified, mat otherwise
     */
    mat4.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a01 = mat[1], a02 = mat[2], a03 = mat[3],
                a12 = mat[6], a13 = mat[7],
                a23 = mat[11];

            mat[1] = mat[4];
            mat[2] = mat[8];
            mat[3] = mat[12];
            mat[4] = a01;
            mat[6] = mat[9];
            mat[7] = mat[13];
            mat[8] = a02;
            mat[9] = a12;
            mat[11] = mat[14];
            mat[12] = a03;
            mat[13] = a13;
            mat[14] = a23;
            return mat;
        }

        dest[0] = mat[0];
        dest[1] = mat[4];
        dest[2] = mat[8];
        dest[3] = mat[12];
        dest[4] = mat[1];
        dest[5] = mat[5];
        dest[6] = mat[9];
        dest[7] = mat[13];
        dest[8] = mat[2];
        dest[9] = mat[6];
        dest[10] = mat[10];
        dest[11] = mat[14];
        dest[12] = mat[3];
        dest[13] = mat[7];
        dest[14] = mat[11];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Calculates the determinant of a mat4
     *
     * @param {mat4} mat mat4 to calculate determinant of
     *
     * @returns {number} determinant of mat
     */
    mat4.determinant = function (mat) {
        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
            a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
            a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
            a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

        return (a30 * a21 * a12 * a03 - a20 * a31 * a12 * a03 - a30 * a11 * a22 * a03 + a10 * a31 * a22 * a03 +
                a20 * a11 * a32 * a03 - a10 * a21 * a32 * a03 - a30 * a21 * a02 * a13 + a20 * a31 * a02 * a13 +
                a30 * a01 * a22 * a13 - a00 * a31 * a22 * a13 - a20 * a01 * a32 * a13 + a00 * a21 * a32 * a13 +
                a30 * a11 * a02 * a23 - a10 * a31 * a02 * a23 - a30 * a01 * a12 * a23 + a00 * a31 * a12 * a23 +
                a10 * a01 * a32 * a23 - a00 * a11 * a32 * a23 - a20 * a11 * a02 * a33 + a10 * a21 * a02 * a33 +
                a20 * a01 * a12 * a33 - a00 * a21 * a12 * a33 - a10 * a01 * a22 * a33 + a00 * a11 * a22 * a33);
    };

    /**
     * Calculates the inverse matrix of a mat4
     *
     * @param {mat4} mat mat4 to calculate inverse of
     * @param {mat4} [dest] mat4 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat4} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat4.inverse = function (mat, dest) {
        if (!dest) { dest = mat; }

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
            a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
            a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
            a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

            b00 = a00 * a11 - a01 * a10,
            b01 = a00 * a12 - a02 * a10,
            b02 = a00 * a13 - a03 * a10,
            b03 = a01 * a12 - a02 * a11,
            b04 = a01 * a13 - a03 * a11,
            b05 = a02 * a13 - a03 * a12,
            b06 = a20 * a31 - a21 * a30,
            b07 = a20 * a32 - a22 * a30,
            b08 = a20 * a33 - a23 * a30,
            b09 = a21 * a32 - a22 * a31,
            b10 = a21 * a33 - a23 * a31,
            b11 = a22 * a33 - a23 * a32,

            d = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06),
            invDet;

            // Calculate the determinant
            if (!d) { return null; }
            invDet = 1 / d;

        dest[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
        dest[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
        dest[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
        dest[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
        dest[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
        dest[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
        dest[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
        dest[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
        dest[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
        dest[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
        dest[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
        dest[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
        dest[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
        dest[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
        dest[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
        dest[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;

        return dest;
    };

    /**
     * Copies the upper 3x3 elements of a mat4 into another mat4
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat4} [dest] mat4 receiving copied values
     *
     * @returns {mat4} dest is specified, a new mat4 otherwise
     */
    mat4.toRotationMat = function (mat, dest) {
        if (!dest) { dest = mat4.create(); }

        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        dest[9] = mat[9];
        dest[10] = mat[10];
        dest[11] = mat[11];
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;

        return dest;
    };

    /**
     * Copies the upper 3x3 elements of a mat4 into a mat3
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat3} [dest] mat3 receiving copied values
     *
     * @returns {mat3} dest is specified, a new mat3 otherwise
     */
    mat4.toMat3 = function (mat, dest) {
        if (!dest) { dest = mat3.create(); }

        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[4];
        dest[4] = mat[5];
        dest[5] = mat[6];
        dest[6] = mat[8];
        dest[7] = mat[9];
        dest[8] = mat[10];

        return dest;
    };

    /**
     * Calculates the inverse of the upper 3x3 elements of a mat4 and copies the result into a mat3
     * The resulting matrix is useful for calculating transformed normals
     *
     * Params:
     * @param {mat4} mat mat4 containing values to invert and copy
     * @param {mat3} [dest] mat3 receiving values
     *
     * @returns {mat3} dest is specified, a new mat3 otherwise, null if the matrix cannot be inverted
     */
    mat4.toInverseMat3 = function (mat, dest) {
        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[4], a11 = mat[5], a12 = mat[6],
            a20 = mat[8], a21 = mat[9], a22 = mat[10],

            b01 = a22 * a11 - a12 * a21,
            b11 = -a22 * a10 + a12 * a20,
            b21 = a21 * a10 - a11 * a20,

            d = a00 * b01 + a01 * b11 + a02 * b21,
            id;

        if (!d) { return null; }
        id = 1 / d;

        if (!dest) { dest = mat3.create(); }

        dest[0] = b01 * id;
        dest[1] = (-a22 * a01 + a02 * a21) * id;
        dest[2] = (a12 * a01 - a02 * a11) * id;
        dest[3] = b11 * id;
        dest[4] = (a22 * a00 - a02 * a20) * id;
        dest[5] = (-a12 * a00 + a02 * a10) * id;
        dest[6] = b21 * id;
        dest[7] = (-a21 * a00 + a01 * a20) * id;
        dest[8] = (a11 * a00 - a01 * a10) * id;

        return dest;
    };

    /**
     * Performs a matrix multiplication
     *
     * @param {mat4} mat First operand
     * @param {mat4} mat2 Second operand
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.multiply = function (mat, mat2, dest) {
        if (!dest) { dest = mat; }

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[ 0], a01 = mat[ 1], a02 = mat[ 2], a03 = mat[3];
        var a10 = mat[ 4], a11 = mat[ 5], a12 = mat[ 6], a13 = mat[7];
        var a20 = mat[ 8], a21 = mat[ 9], a22 = mat[10], a23 = mat[11];
        var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

        // Cache only the current line of the second matrix
        var b0  = mat2[0], b1 = mat2[1], b2 = mat2[2], b3 = mat2[3];  
        dest[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[4];
        b1 = mat2[5];
        b2 = mat2[6];
        b3 = mat2[7];
        dest[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[8];
        b1 = mat2[9];
        b2 = mat2[10];
        b3 = mat2[11];
        dest[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[12];
        b1 = mat2[13];
        b2 = mat2[14];
        b3 = mat2[15];
        dest[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        return dest;
    };

    /**
     * Transforms a vec3 with the given matrix
     * 4th vector component is implicitly '1'
     *
     * @param {mat4} mat mat4 to transform the vector with
     * @param {vec3} vec vec3 to transform
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    mat4.multiplyVec3 = function (mat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2];

        dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
        dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
        dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];

        return dest;
    };

    /**
     * Transforms a vec4 with the given matrix
     *
     * @param {mat4} mat mat4 to transform the vector with
     * @param {vec4} vec vec4 to transform
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec4} dest if specified, vec otherwise
     */
    mat4.multiplyVec4 = function (mat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2], w = vec[3];

        dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12] * w;
        dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13] * w;
        dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14] * w;
        dest[3] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15] * w;

        return dest;
    };

    /**
     * Translates a matrix by the given vector
     *
     * @param {mat4} mat mat4 to translate
     * @param {vec3} vec vec3 specifying the translation
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.translate = function (mat, vec, dest) {
        var x = vec[0], y = vec[1], z = vec[2],
            a00, a01, a02, a03,
            a10, a11, a12, a13,
            a20, a21, a22, a23;

        if (!dest || mat === dest) {
            mat[12] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
            mat[13] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
            mat[14] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
            mat[15] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
            return mat;
        }

        a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
        a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
        a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];

        dest[0] = a00; dest[1] = a01; dest[2] = a02; dest[3] = a03;
        dest[4] = a10; dest[5] = a11; dest[6] = a12; dest[7] = a13;
        dest[8] = a20; dest[9] = a21; dest[10] = a22; dest[11] = a23;

        dest[12] = a00 * x + a10 * y + a20 * z + mat[12];
        dest[13] = a01 * x + a11 * y + a21 * z + mat[13];
        dest[14] = a02 * x + a12 * y + a22 * z + mat[14];
        dest[15] = a03 * x + a13 * y + a23 * z + mat[15];
        return dest;
    };

    /**
     * Scales a matrix by the given vector
     *
     * @param {mat4} mat mat4 to scale
     * @param {vec3} vec vec3 specifying the scale for each axis
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @param {mat4} dest if specified, mat otherwise
     */
    mat4.scale = function (mat, vec, dest) {
        var x = vec[0], y = vec[1], z = vec[2];

        if (!dest || mat === dest) {
            mat[0] *= x;
            mat[1] *= x;
            mat[2] *= x;
            mat[3] *= x;
            mat[4] *= y;
            mat[5] *= y;
            mat[6] *= y;
            mat[7] *= y;
            mat[8] *= z;
            mat[9] *= z;
            mat[10] *= z;
            mat[11] *= z;
            return mat;
        }

        dest[0] = mat[0] * x;
        dest[1] = mat[1] * x;
        dest[2] = mat[2] * x;
        dest[3] = mat[3] * x;
        dest[4] = mat[4] * y;
        dest[5] = mat[5] * y;
        dest[6] = mat[6] * y;
        dest[7] = mat[7] * y;
        dest[8] = mat[8] * z;
        dest[9] = mat[9] * z;
        dest[10] = mat[10] * z;
        dest[11] = mat[11] * z;
        dest[12] = mat[12];
        dest[13] = mat[13];
        dest[14] = mat[14];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the specified axis
     * If rotating around a primary axis (X,Y,Z) one of the specialized rotation functions should be used instead for performance
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {vec3} axis vec3 representing the axis to rotate around
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotate = function (mat, angle, axis, dest) {
        var x = axis[0], y = axis[1], z = axis[2],
            len = Math.sqrt(x * x + y * y + z * z),
            s, c, t,
            a00, a01, a02, a03,
            a10, a11, a12, a13,
            a20, a21, a22, a23,
            b00, b01, b02,
            b10, b11, b12,
            b20, b21, b22;

        if (!len) { return null; }
        if (len !== 1) {
            len = 1 / len;
            x *= len;
            y *= len;
            z *= len;
        }

        s = Math.sin(angle);
        c = Math.cos(angle);
        t = 1 - c;

        a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
        a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
        a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];

        // Construct the elements of the rotation matrix
        b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
        b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
        b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform rotation-specific matrix multiplication
        dest[0] = a00 * b00 + a10 * b01 + a20 * b02;
        dest[1] = a01 * b00 + a11 * b01 + a21 * b02;
        dest[2] = a02 * b00 + a12 * b01 + a22 * b02;
        dest[3] = a03 * b00 + a13 * b01 + a23 * b02;

        dest[4] = a00 * b10 + a10 * b11 + a20 * b12;
        dest[5] = a01 * b10 + a11 * b11 + a21 * b12;
        dest[6] = a02 * b10 + a12 * b11 + a22 * b12;
        dest[7] = a03 * b10 + a13 * b11 + a23 * b12;

        dest[8] = a00 * b20 + a10 * b21 + a20 * b22;
        dest[9] = a01 * b20 + a11 * b21 + a21 * b22;
        dest[10] = a02 * b20 + a12 * b21 + a22 * b22;
        dest[11] = a03 * b20 + a13 * b21 + a23 * b22;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the X axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateX = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a10 = mat[4],
            a11 = mat[5],
            a12 = mat[6],
            a13 = mat[7],
            a20 = mat[8],
            a21 = mat[9],
            a22 = mat[10],
            a23 = mat[11];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[4] = a10 * c + a20 * s;
        dest[5] = a11 * c + a21 * s;
        dest[6] = a12 * c + a22 * s;
        dest[7] = a13 * c + a23 * s;

        dest[8] = a10 * -s + a20 * c;
        dest[9] = a11 * -s + a21 * c;
        dest[10] = a12 * -s + a22 * c;
        dest[11] = a13 * -s + a23 * c;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the Y axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateY = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a00 = mat[0],
            a01 = mat[1],
            a02 = mat[2],
            a03 = mat[3],
            a20 = mat[8],
            a21 = mat[9],
            a22 = mat[10],
            a23 = mat[11];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[0] = a00 * c + a20 * -s;
        dest[1] = a01 * c + a21 * -s;
        dest[2] = a02 * c + a22 * -s;
        dest[3] = a03 * c + a23 * -s;

        dest[8] = a00 * s + a20 * c;
        dest[9] = a01 * s + a21 * c;
        dest[10] = a02 * s + a22 * c;
        dest[11] = a03 * s + a23 * c;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the Z axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateZ = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a00 = mat[0],
            a01 = mat[1],
            a02 = mat[2],
            a03 = mat[3],
            a10 = mat[4],
            a11 = mat[5],
            a12 = mat[6],
            a13 = mat[7];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
            dest[8] = mat[8];
            dest[9] = mat[9];
            dest[10] = mat[10];
            dest[11] = mat[11];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[0] = a00 * c + a10 * s;
        dest[1] = a01 * c + a11 * s;
        dest[2] = a02 * c + a12 * s;
        dest[3] = a03 * c + a13 * s;

        dest[4] = a00 * -s + a10 * c;
        dest[5] = a01 * -s + a11 * c;
        dest[6] = a02 * -s + a12 * c;
        dest[7] = a03 * -s + a13 * c;

        return dest;
    };

    /**
     * Generates a frustum matrix with the given bounds
     *
     * @param {number} left Left bound of the frustum
     * @param {number} right Right bound of the frustum
     * @param {number} bottom Bottom bound of the frustum
     * @param {number} top Top bound of the frustum
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.frustum = function (left, right, bottom, top, near, far, dest) {
        if (!dest) { dest = mat4.create(); }
        var rl = (right - left),
            tb = (top - bottom),
            fn = (far - near);
        dest[0] = (near * 2) / rl;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = (near * 2) / tb;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = (right + left) / rl;
        dest[9] = (top + bottom) / tb;
        dest[10] = -(far + near) / fn;
        dest[11] = -1;
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = -(far * near * 2) / fn;
        dest[15] = 0;
        return dest;
    };

    /**
     * Generates a perspective projection matrix with the given bounds
     *
     * @param {number} fovy Vertical field of view
     * @param {number} aspect Aspect ratio. typically viewport width/height
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.perspective = function (fovy, aspect, near, far, dest) {
        var top = near * Math.tan(fovy * Math.PI / 360.0),
            right = top * aspect;
        return mat4.frustum(-right, right, -top, top, near, far, dest);
    };

    /**
     * Generates a orthogonal projection matrix with the given bounds
     *
     * @param {number} left Left bound of the frustum
     * @param {number} right Right bound of the frustum
     * @param {number} bottom Bottom bound of the frustum
     * @param {number} top Top bound of the frustum
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.ortho = function (left, right, bottom, top, near, far, dest) {
        if (!dest) { dest = mat4.create(); }
        var rl = (right - left),
            tb = (top - bottom),
            fn = (far - near);
        dest[0] = 2 / rl;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = 2 / tb;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 0;
        dest[9] = 0;
        dest[10] = -2 / fn;
        dest[11] = 0;
        dest[12] = -(left + right) / rl;
        dest[13] = -(top + bottom) / tb;
        dest[14] = -(far + near) / fn;
        dest[15] = 1;
        return dest;
    };

    /**
     * Generates a look-at matrix with the given eye position, focal point, and up axis
     *
     * @param {vec3} eye Position of the viewer
     * @param {vec3} center Point the viewer is looking at
     * @param {vec3} up vec3 pointing "up"
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.lookAt = function (eye, center, up, dest) {
        if (!dest) { dest = mat4.create(); }

        var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
            eyex = eye[0],
            eyey = eye[1],
            eyez = eye[2],
            upx = up[0],
            upy = up[1],
            upz = up[2],
            centerx = center[0],
            centery = center[1],
            centerz = center[2];

        if (eyex === centerx && eyey === centery && eyez === centerz) {
            return mat4.identity(dest);
        }

        //vec3.direction(eye, center, z);
        z0 = eyex - centerx;
        z1 = eyey - centery;
        z2 = eyez - centerz;

        // normalize (no check needed for 0 because of early return)
        len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;

        //vec3.normalize(vec3.cross(up, z, x));
        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
        if (!len) {
            x0 = 0;
            x1 = 0;
            x2 = 0;
        } else {
            len = 1 / len;
            x0 *= len;
            x1 *= len;
            x2 *= len;
        }

        //vec3.normalize(vec3.cross(z, x, y));
        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;

        len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
        if (!len) {
            y0 = 0;
            y1 = 0;
            y2 = 0;
        } else {
            len = 1 / len;
            y0 *= len;
            y1 *= len;
            y2 *= len;
        }

        dest[0] = x0;
        dest[1] = y0;
        dest[2] = z0;
        dest[3] = 0;
        dest[4] = x1;
        dest[5] = y1;
        dest[6] = z1;
        dest[7] = 0;
        dest[8] = x2;
        dest[9] = y2;
        dest[10] = z2;
        dest[11] = 0;
        dest[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
        dest[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
        dest[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
        dest[15] = 1;

        return dest;
    };

    /**
     * Creates a matrix from a quaternion rotation and vector translation
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.translate(dest, vec);
     *     var quatMat = mat4.create();
     *     quat4.toMat4(quat, quatMat);
     *     mat4.multiply(dest, quatMat);
     *
     * @param {quat4} quat Rotation quaternion
     * @param {vec3} vec Translation vector
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to a new mat4
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.fromRotationTranslation = function (quat, vec, dest) {
        if (!dest) { dest = mat4.create(); }

        // Quaternion math
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;
        dest[3] = 0;
        dest[4] = xy - wz;
        dest[5] = 1 - (xx + zz);
        dest[6] = yz + wx;
        dest[7] = 0;
        dest[8] = xz + wy;
        dest[9] = yz - wx;
        dest[10] = 1 - (xx + yy);
        dest[11] = 0;
        dest[12] = vec[0];
        dest[13] = vec[1];
        dest[14] = vec[2];
        dest[15] = 1;
        
        return dest;
    };

    /**
     * Returns a string representation of a mat4
     *
     * @param {mat4} mat mat4 to represent as a string
     *
     * @returns {string} String representation of mat
     */
    mat4.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] +
            ', ' + mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] +
            ', ' + mat[8] + ', ' + mat[9] + ', ' + mat[10] + ', ' + mat[11] +
            ', ' + mat[12] + ', ' + mat[13] + ', ' + mat[14] + ', ' + mat[15] + ']';
    };

    /**
     * @class Quaternion
     * @name quat4
     */
    var quat4 = {};

    /**
     * Creates a new instance of a quat4 using the default array type
     * Any javascript array containing at least 4 numeric elements can serve as a quat4
     *
     * @param {quat4} [quat] quat4 containing values to initialize with
     *
     * @returns {quat4} New quat4
     */
    quat4.create = function (quat) {
        var dest = new MatrixArray(4);

        if (quat) {
            dest[0] = quat[0];
            dest[1] = quat[1];
            dest[2] = quat[2];
            dest[3] = quat[3];
        } else {
            dest[0] = dest[1] = dest[2] = dest[3] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a quat4, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value
     * @param {number} w W value

     * @returns {quat4} New quat4
     */
    quat4.createFrom = function (x, y, z, w) {
        var dest = new MatrixArray(4);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = w;

        return dest;
    };

    /**
     * Copies the values of one quat4 to another
     *
     * @param {quat4} quat quat4 containing values to copy
     * @param {quat4} dest quat4 receiving copied values
     *
     * @returns {quat4} dest
     */
    quat4.set = function (quat, dest) {
        dest[0] = quat[0];
        dest[1] = quat[1];
        dest[2] = quat[2];
        dest[3] = quat[3];

        return dest;
    };

    /**
     * Compares two quaternions for equality within a certain margin of error
     *
     * @param {quat4} a First vector
     * @param {quat4} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    quat4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Creates a new identity Quat4
     *
     * @param {quat4} [dest] quat4 receiving copied values
     *
     * @returns {quat4} dest is specified, new quat4 otherwise
     */
    quat4.identity = function (dest) {
        if (!dest) { dest = quat4.create(); }
        dest[0] = 0;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    var identityQuat4 = quat4.identity();

    /**
     * Calculates the W component of a quat4 from the X, Y, and Z components.
     * Assumes that quaternion is 1 unit in length.
     * Any existing W component will be ignored.
     *
     * @param {quat4} quat quat4 to calculate W component of
     * @param {quat4} [dest] quat4 receiving calculated values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.calculateW = function (quat, dest) {
        var x = quat[0], y = quat[1], z = quat[2];

        if (!dest || quat === dest) {
            quat[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
            return quat;
        }
        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
        return dest;
    };

    /**
     * Calculates the dot product of two quaternions
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     *
     * @return {number} Dot product of quat and quat2
     */
    quat4.dot = function(quat, quat2){
        return quat[0]*quat2[0] + quat[1]*quat2[1] + quat[2]*quat2[2] + quat[3]*quat2[3];
    };

    /**
     * Calculates the inverse of a quat4
     *
     * @param {quat4} quat quat4 to calculate inverse of
     * @param {quat4} [dest] quat4 receiving inverse values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.inverse = function(quat, dest) {
        var q0 = quat[0], q1 = quat[1], q2 = quat[2], q3 = quat[3],
            dot = q0*q0 + q1*q1 + q2*q2 + q3*q3,
            invDot = dot ? 1.0/dot : 0;
        
        // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0
        
        if(!dest || quat === dest) {
            quat[0] *= -invDot;
            quat[1] *= -invDot;
            quat[2] *= -invDot;
            quat[3] *= invDot;
            return quat;
        }
        dest[0] = -quat[0]*invDot;
        dest[1] = -quat[1]*invDot;
        dest[2] = -quat[2]*invDot;
        dest[3] = quat[3]*invDot;
        return dest;
    };


    /**
     * Calculates the conjugate of a quat4
     * If the quaternion is normalized, this function is faster than quat4.inverse and produces the same result.
     *
     * @param {quat4} quat quat4 to calculate conjugate of
     * @param {quat4} [dest] quat4 receiving conjugate values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.conjugate = function (quat, dest) {
        if (!dest || quat === dest) {
            quat[0] *= -1;
            quat[1] *= -1;
            quat[2] *= -1;
            return quat;
        }
        dest[0] = -quat[0];
        dest[1] = -quat[1];
        dest[2] = -quat[2];
        dest[3] = quat[3];
        return dest;
    };

    /**
     * Calculates the length of a quat4
     *
     * Params:
     * @param {quat4} quat quat4 to calculate length of
     *
     * @returns Length of quat
     */
    quat4.length = function (quat) {
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
        return Math.sqrt(x * x + y * y + z * z + w * w);
    };

    /**
     * Generates a unit quaternion of the same direction as the provided quat4
     * If quaternion length is 0, returns [0, 0, 0, 0]
     *
     * @param {quat4} quat quat4 to normalize
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.normalize = function (quat, dest) {
        if (!dest) { dest = quat; }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            len = Math.sqrt(x * x + y * y + z * z + w * w);
        if (len === 0) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
            return dest;
        }
        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        dest[3] = w * len;

        return dest;
    };

    /**
     * Performs quaternion addition
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.add = function (quat, quat2, dest) {
        if(!dest || quat === dest) {
            quat[0] += quat2[0];
            quat[1] += quat2[1];
            quat[2] += quat2[2];
            quat[3] += quat2[3];
            return quat;
        }
        dest[0] = quat[0]+quat2[0];
        dest[1] = quat[1]+quat2[1];
        dest[2] = quat[2]+quat2[2];
        dest[3] = quat[3]+quat2[3];
        return dest;
    };

    /**
     * Performs a quaternion multiplication
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.multiply = function (quat, quat2, dest) {
        if (!dest) { dest = quat; }

        var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3],
            qbx = quat2[0], qby = quat2[1], qbz = quat2[2], qbw = quat2[3];

        dest[0] = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
        dest[1] = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
        dest[2] = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
        dest[3] = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

        return dest;
    };

    /**
     * Transforms a vec3 with the given quaternion
     *
     * @param {quat4} quat quat4 to transform the vector with
     * @param {vec3} vec vec3 to transform
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns dest if specified, vec otherwise
     */
    quat4.multiplyVec3 = function (quat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3],

            // calculate quat * vec
            ix = qw * x + qy * z - qz * y,
            iy = qw * y + qz * x - qx * z,
            iz = qw * z + qx * y - qy * x,
            iw = -qx * x - qy * y - qz * z;

        // calculate result * inverse quat
        dest[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        dest[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        dest[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;

        return dest;
    };

    /**
     * Multiplies the components of a quaternion by a scalar value
     *
     * @param {quat4} quat to scale
     * @param {number} val Value to scale by
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.scale = function (quat, val, dest) {
        if(!dest || quat === dest) {
            quat[0] *= val;
            quat[1] *= val;
            quat[2] *= val;
            quat[3] *= val;
            return quat;
        }
        dest[0] = quat[0]*val;
        dest[1] = quat[1]*val;
        dest[2] = quat[2]*val;
        dest[3] = quat[3]*val;
        return dest;
    };

    /**
     * Calculates a 3x3 matrix from the given quat4
     *
     * @param {quat4} quat quat4 to create matrix from
     * @param {mat3} [dest] mat3 receiving operation result
     *
     * @returns {mat3} dest if specified, a new mat3 otherwise
     */
    quat4.toMat3 = function (quat, dest) {
        if (!dest) { dest = mat3.create(); }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;

        dest[3] = xy - wz;
        dest[4] = 1 - (xx + zz);
        dest[5] = yz + wx;

        dest[6] = xz + wy;
        dest[7] = yz - wx;
        dest[8] = 1 - (xx + yy);

        return dest;
    };

    /**
     * Calculates a 4x4 matrix from the given quat4
     *
     * @param {quat4} quat quat4 to create matrix from
     * @param {mat4} [dest] mat4 receiving operation result
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    quat4.toMat4 = function (quat, dest) {
        if (!dest) { dest = mat4.create(); }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;
        dest[3] = 0;

        dest[4] = xy - wz;
        dest[5] = 1 - (xx + zz);
        dest[6] = yz + wx;
        dest[7] = 0;

        dest[8] = xz + wy;
        dest[9] = yz - wx;
        dest[10] = 1 - (xx + yy);
        dest[11] = 0;

        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;

        return dest;
    };

    /**
     * Performs a spherical linear interpolation between two quat4
     *
     * @param {quat4} quat First quaternion
     * @param {quat4} quat2 Second quaternion
     * @param {number} slerp Interpolation amount between the two inputs
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.slerp = function (quat, quat2, slerp, dest) {
        if (!dest) { dest = quat; }

        var cosHalfTheta = quat[0] * quat2[0] + quat[1] * quat2[1] + quat[2] * quat2[2] + quat[3] * quat2[3],
            halfTheta,
            sinHalfTheta,
            ratioA,
            ratioB;

        if (Math.abs(cosHalfTheta) >= 1.0) {
            if (dest !== quat) {
                dest[0] = quat[0];
                dest[1] = quat[1];
                dest[2] = quat[2];
                dest[3] = quat[3];
            }
            return dest;
        }

        halfTheta = Math.acos(cosHalfTheta);
        sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

        if (Math.abs(sinHalfTheta) < 0.001) {
            dest[0] = (quat[0] * 0.5 + quat2[0] * 0.5);
            dest[1] = (quat[1] * 0.5 + quat2[1] * 0.5);
            dest[2] = (quat[2] * 0.5 + quat2[2] * 0.5);
            dest[3] = (quat[3] * 0.5 + quat2[3] * 0.5);
            return dest;
        }

        ratioA = Math.sin((1 - slerp) * halfTheta) / sinHalfTheta;
        ratioB = Math.sin(slerp * halfTheta) / sinHalfTheta;

        dest[0] = (quat[0] * ratioA + quat2[0] * ratioB);
        dest[1] = (quat[1] * ratioA + quat2[1] * ratioB);
        dest[2] = (quat[2] * ratioA + quat2[2] * ratioB);
        dest[3] = (quat[3] * ratioA + quat2[3] * ratioB);

        return dest;
    };

    /**
     * Creates a quaternion from the given 3x3 rotation matrix.
     * If dest is omitted, a new quaternion will be created.
     *
     * @param {mat3}  mat    the rotation matrix
     * @param {quat4} [dest] an optional receiving quaternion
     *
     * @returns {quat4} the quaternion constructed from the rotation matrix
     *
     */
    quat4.fromRotationMatrix = function(mat, dest) {
        if (!dest) dest = quat4.create();
        
        // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
        // article "Quaternion Calculus and Fast Animation".

        var fTrace = mat[0] + mat[4] + mat[8];
        var fRoot;

        if ( fTrace > 0.0 ) {
            // |w| > 1/2, may as well choose w > 1/2
            fRoot = Math.sqrt(fTrace + 1.0);  // 2w
            dest[3] = 0.5 * fRoot;
            fRoot = 0.5/fRoot;  // 1/(4w)
            dest[0] = (mat[7]-mat[5])*fRoot;
            dest[1] = (mat[2]-mat[6])*fRoot;
            dest[2] = (mat[3]-mat[1])*fRoot;
        } else {
            // |w| <= 1/2
            var s_iNext = quat4.fromRotationMatrix.s_iNext = quat4.fromRotationMatrix.s_iNext || [1,2,0];
            var i = 0;
            if ( mat[4] > mat[0] )
              i = 1;
            if ( mat[8] > mat[i*3+i] )
              i = 2;
            var j = s_iNext[i];
            var k = s_iNext[j];
            
            fRoot = Math.sqrt(mat[i*3+i]-mat[j*3+j]-mat[k*3+k] + 1.0);
            dest[i] = 0.5 * fRoot;
            fRoot = 0.5 / fRoot;
            dest[3] = (mat[k*3+j] - mat[j*3+k]) * fRoot;
            dest[j] = (mat[j*3+i] + mat[i*3+j]) * fRoot;
            dest[k] = (mat[k*3+i] + mat[i*3+k]) * fRoot;
        }
        
        return dest;
    };

    /**
     * Alias. See the description for quat4.fromRotationMatrix().
     */
    mat3.toQuat4 = quat4.fromRotationMatrix;

    (function() {
        var mat = mat3.create();
        
        /**
         * Creates a quaternion from the 3 given vectors. They must be perpendicular
         * to one another and represent the X, Y and Z axes.
         *
         * If dest is omitted, a new quat4 will be created.
         *
         * Example: The default OpenGL orientation has a view vector [0, 0, -1],
         * right vector [1, 0, 0], and up vector [0, 1, 0]. A quaternion representing
         * this orientation could be constructed with:
         *
         *   quat = quat4.fromAxes([0, 0, -1], [1, 0, 0], [0, 1, 0], quat4.create());
         *
         * @param {vec3}  view   the view vector, or direction the object is pointing in
         * @param {vec3}  right  the right vector, or direction to the "right" of the object
         * @param {vec3}  up     the up vector, or direction towards the object's "up"
         * @param {quat4} [dest] an optional receiving quat4
         *
         * @returns {quat4} dest
         **/
        quat4.fromAxes = function(view, right, up, dest) {
            mat[0] = right[0];
            mat[3] = right[1];
            mat[6] = right[2];

            mat[1] = up[0];
            mat[4] = up[1];
            mat[7] = up[2];

            mat[2] = view[0];
            mat[5] = view[1];
            mat[8] = view[2];

            return quat4.fromRotationMatrix(mat, dest);
        };
    })();

    /**
     * Sets a quat4 to the Identity and returns it.
     *
     * @param {quat4} [dest] quat4 to set. If omitted, a
     * new quat4 will be created.
     *
     * @returns {quat4} dest
     */
    quat4.identity = function(dest) {
        if (!dest) dest = quat4.create();
        dest[0] = 0;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    /**
     * Sets a quat4 from the given angle and rotation axis,
     * then returns it. If dest is not given, a new quat4 is created.
     *
     * @param {Number} angle  the angle in radians
     * @param {vec3}   axis   the axis around which to rotate
     * @param {quat4}  [dest] the optional quat4 to store the result
     *
     * @returns {quat4} dest
     **/
    quat4.fromAngleAxis = function(angle, axis, dest) {
        // The quaternion representing the rotation is
        //   q = cos(A/2)+sin(A/2)*(x*i+y*j+z*k)
        if (!dest) dest = quat4.create();
        
        var half = angle * 0.5;
        var s = Math.sin(half);
        dest[3] = Math.cos(half);
        dest[0] = s * axis[0];
        dest[1] = s * axis[1];
        dest[2] = s * axis[2];
        
        return dest;
    };

    /**
     * Stores the angle and axis in a vec4, where the XYZ components represent
     * the axis and the W (4th) component is the angle in radians.
     *
     * If dest is not given, src will be modified in place and returned, after
     * which it should not be considered not a quaternion (just an axis and angle).
     *
     * @param {quat4} quat   the quaternion whose angle and axis to store
     * @param {vec4}  [dest] the optional vec4 to receive the data
     *
     * @returns {vec4} dest
     */
    quat4.toAngleAxis = function(src, dest) {
        if (!dest) dest = src;
        // The quaternion representing the rotation is
        //   q = cos(A/2)+sin(A/2)*(x*i+y*j+z*k)

        var sqrlen = src[0]*src[0]+src[1]*src[1]+src[2]*src[2];
        if (sqrlen > 0)
        {
            dest[3] = 2 * Math.acos(src[3]);
            var invlen = glMath.invsqrt(sqrlen);
            dest[0] = src[0]*invlen;
            dest[1] = src[1]*invlen;
            dest[2] = src[2]*invlen;
        } else {
            // angle is 0 (mod 2*pi), so any axis will do
            dest[3] = 0;
            dest[0] = 1;
            dest[1] = 0;
            dest[2] = 0;
        }
        
        return dest;
    };

    /**
     * Returns a string representation of a quaternion
     *
     * @param {quat4} quat quat4 to represent as a string
     *
     * @returns {string} String representation of quat
     */
    quat4.str = function (quat) {
        return '[' + quat[0] + ', ' + quat[1] + ', ' + quat[2] + ', ' + quat[3] + ']';
    };
    
    /**
     * @class 2 Dimensional Vector
     * @name vec2
     */
    var vec2 = {};
     
    /**
     * Creates a new vec2, initializing it from vec if vec
     * is given.
     *
     * @param {vec2} [vec] the vector's initial contents
     * @returns {vec2} a new 2D vector
     */
    vec2.create = function(vec) {
        var dest = new MatrixArray(2);

        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
        } else {
            dest[0] = 0;
            dest[1] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a vec2, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value

     * @returns {vec2} New vec2
     */
    vec2.createFrom = function (x, y) {
        var dest = new MatrixArray(2);

        dest[0] = x;
        dest[1] = y;

        return dest;
    };
    
    /**
     * Adds the vec2's together. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.add = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] + vecB[0];
        dest[1] = vecA[1] + vecB[1];
        return dest;
    };
    
    /**
     * Subtracts vecB from vecA. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.subtract = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] - vecB[0];
        dest[1] = vecA[1] - vecB[1];
        return dest;
    };
    
    /**
     * Multiplies vecA with vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.multiply = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] * vecB[0];
        dest[1] = vecA[1] * vecB[1];
        return dest;
    };
    
    /**
     * Divides vecA by vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.divide = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] / vecB[0];
        dest[1] = vecA[1] / vecB[1];
        return dest;
    };
    
    /**
     * Scales vecA by some scalar number. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecA.
     *
     * This is the same as multiplying each component of vecA
     * by the given scalar.
     *
     * @param {vec2}   vecA the vector to be scaled
     * @param {Number} scalar the amount to scale the vector by
     * @param {vec2}   [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.scale = function(vecA, scalar, dest) {
        if (!dest) dest = vecA;
        dest[0] = vecA[0] * scalar;
        dest[1] = vecA[1] * scalar;
        return dest;
    };

    /**
     * Calculates the euclidian distance between two vec2
     *
     * Params:
     * @param {vec2} vecA First vector
     * @param {vec2} vecB Second vector
     *
     * @returns {number} Distance between vecA and vecB
     */
    vec2.dist = function (vecA, vecB) {
        var x = vecB[0] - vecA[0],
            y = vecB[1] - vecA[1];
        return Math.sqrt(x*x + y*y);
    };

    /**
     * Copies the values of one vec2 to another
     *
     * @param {vec2} vec vec2 containing values to copy
     * @param {vec2} dest vec2 receiving copied values
     *
     * @returns {vec2} dest
     */
    vec2.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec2} a First vector
     * @param {vec2} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec2.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON
        );
    };

    /**
     * Negates the components of a vec2
     *
     * @param {vec2} vec vec2 to negate
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec2} dest if specified, vec otherwise
     */
    vec2.negate = function (vec, dest) {
        if (!dest) { dest = vec; }
        dest[0] = -vec[0];
        dest[1] = -vec[1];
        return dest;
    };

    /**
     * Normlize a vec2
     *
     * @param {vec2} vec vec2 to normalize
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec2} dest if specified, vec otherwise
     */
    vec2.normalize = function (vec, dest) {
        if (!dest) { dest = vec; }
        var mag = vec[0] * vec[0] + vec[1] * vec[1];
        if (mag > 0) {
            mag = Math.sqrt(mag);
            dest[0] = vec[0] / mag;
            dest[1] = vec[1] / mag;
        } else {
            dest[0] = dest[1] = 0;
        }
        return dest;
    };

    /**
     * Computes the cross product of two vec2's. Note that the cross product must by definition
     * produce a 3D vector. If a dest vector is given, it will contain the resultant 3D vector.
     * Otherwise, a scalar number will be returned, representing the vector's Z coordinate, since
     * its X and Y must always equal 0.
     *
     * Examples:
     *    var crossResult = vec3.create();
     *    vec2.cross([1, 2], [3, 4], crossResult);
     *    //=> [0, 0, -2]
     *
     *    vec2.cross([1, 2], [3, 4]);
     *    //=> -2
     *
     * See http://stackoverflow.com/questions/243945/calculating-a-2d-vectors-cross-product
     * for some interesting facts.
     *
     * @param {vec2} vecA left operand
     * @param {vec2} vecB right operand
     * @param {vec2} [dest] optional vec2 receiving result. If not specified a scalar is returned
     *
     */
    vec2.cross = function (vecA, vecB, dest) {
        var z = vecA[0] * vecB[1] - vecA[1] * vecB[0];
        if (!dest) return z;
        dest[0] = dest[1] = 0;
        dest[2] = z;
        return dest;
    };
    
    /**
     * Caclulates the length of a vec2
     *
     * @param {vec2} vec vec2 to calculate length of
     *
     * @returns {Number} Length of vec
     */
    vec2.length = function (vec) {
      var x = vec[0], y = vec[1];
      return Math.sqrt(x * x + y * y);
    };

    /**
     * Caclulates the squared length of a vec2
     *
     * @param {vec2} vec vec2 to calculate squared length of
     *
     * @returns {Number} Squared Length of vec
     */
    vec2.squaredLength = function (vec) {
      var x = vec[0], y = vec[1];
      return x * x + y * y;
    };

    /**
     * Caclulates the dot product of two vec2s
     *
     * @param {vec2} vecA First operand
     * @param {vec2} vecB Second operand
     *
     * @returns {Number} Dot product of vecA and vecB
     */
    vec2.dot = function (vecA, vecB) {
        return vecA[0] * vecB[0] + vecA[1] * vecB[1];
    };
    
    /**
     * Generates a 2D unit vector pointing from one vector to another
     *
     * @param {vec2} vecA Origin vec2
     * @param {vec2} vecB vec2 to point to
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec2} dest if specified, vecA otherwise
     */
    vec2.direction = function (vecA, vecB, dest) {
        if (!dest) { dest = vecA; }

        var x = vecA[0] - vecB[0],
            y = vecA[1] - vecB[1],
            len = x * x + y * y;

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        }

        len = 1 / Math.sqrt(len);
        dest[0] = x * len;
        dest[1] = y * len;
        return dest;
    };

    /**
     * Performs a linear interpolation between two vec2
     *
     * @param {vec2} vecA First vector
     * @param {vec2} vecB Second vector
     * @param {Number} lerp Interpolation amount between the two inputs
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec2} dest if specified, vecA otherwise
     */
    vec2.lerp = function (vecA, vecB, lerp, dest) {
        if (!dest) { dest = vecA; }
        dest[0] = vecA[0] + lerp * (vecB[0] - vecA[0]);
        dest[1] = vecA[1] + lerp * (vecB[1] - vecA[1]);
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec2} vec Vector to represent as a string
     *
     * @returns {String} String representation of vec
     */
    vec2.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ']';
    };
    
    /**
     * @class 2x2 Matrix
     * @name mat2
     */
    var mat2 = {};
    
    /**
     * Creates a new 2x2 matrix. If src is given, the new matrix
     * is initialized to those values.
     *
     * @param {mat2} [src] the seed values for the new matrix, if any
     * @returns {mat2} a new matrix
     */
    mat2.create = function(src) {
        var dest = new MatrixArray(4);
        
        if (src) {
            dest[0] = src[0];
            dest[1] = src[1];
            dest[2] = src[2];
            dest[3] = src[3];
        } else {
            dest[0] = dest[1] = dest[2] = dest[3] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a mat2, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m10
     * @param {number} m11

     * @returns {mat2} New mat2
     */
    mat2.createFrom = function (m00, m01, m10, m11) {
        var dest = new MatrixArray(4);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m10;
        dest[3] = m11;

        return dest;
    };
    
    /**
     * Copies the values of one mat2 to another
     *
     * @param {mat2} mat mat2 containing values to copy
     * @param {mat2} dest mat2 receiving copied values
     *
     * @returns {mat2} dest
     */
    mat2.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat2} a First matrix
     * @param {mat2} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat2.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat2 to an identity matrix
     *
     * @param {mat2} [dest] mat2 to set. If omitted a new one will be created.
     *
     * @returns {mat2} dest
     */
    mat2.identity = function (dest) {
        if (!dest) { dest = mat2.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    /**
     * Transposes a mat2 (flips the values over the diagonal)
     *
     * @param {mat2} mat mat2 to transpose
     * @param {mat2} [dest] mat2 receiving transposed values. If not specified result is written to mat
     *
     * @param {mat2} dest if specified, mat otherwise
     */
    mat2.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a00 = mat[1];
            mat[1] = mat[2];
            mat[2] = a00;
            return mat;
        }
        
        dest[0] = mat[0];
        dest[1] = mat[2];
        dest[2] = mat[1];
        dest[3] = mat[3];
        return dest;
    };

    /**
     * Calculates the determinant of a mat2
     *
     * @param {mat2} mat mat2 to calculate determinant of
     *
     * @returns {Number} determinant of mat
     */
    mat2.determinant = function (mat) {
      return mat[0] * mat[3] - mat[2] * mat[1];
    };
    
    /**
     * Calculates the inverse matrix of a mat2
     *
     * @param {mat2} mat mat2 to calculate inverse of
     * @param {mat2} [dest] mat2 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat2} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat2.inverse = function (mat, dest) {
        if (!dest) { dest = mat; }
        var a0 = mat[0], a1 = mat[1], a2 = mat[2], a3 = mat[3];
        var det = a0 * a3 - a2 * a1;
        if (!det) return null;
        
        det = 1.0 / det;
        dest[0] =  a3 * det;
        dest[1] = -a1 * det;
        dest[2] = -a2 * det;
        dest[3] =  a0 * det;
        return dest;
    };
    
    /**
     * Performs a matrix multiplication
     *
     * @param {mat2} matA First operand
     * @param {mat2} matB Second operand
     * @param {mat2} [dest] mat2 receiving operation result. If not specified result is written to matA
     *
     * @returns {mat2} dest if specified, matA otherwise
     */
    mat2.multiply = function (matA, matB, dest) {
        if (!dest) { dest = matA; }
        var a11 = matA[0],
            a12 = matA[1],
            a21 = matA[2],
            a22 = matA[3];
        dest[0] = a11 * matB[0] + a12 * matB[2];
        dest[1] = a11 * matB[1] + a12 * matB[3];
        dest[2] = a21 * matB[0] + a22 * matB[2];
        dest[3] = a21 * matB[1] + a22 * matB[3];
        return dest;
    };

    /**
     * Rotates a 2x2 matrix by an angle
     *
     * @param {mat2}   mat   The matrix to rotate
     * @param {Number} angle The angle in radians
     * @param {mat2} [dest]  Optional mat2 receiving the result. If omitted mat will be used.
     *
     * @returns {mat2} dest if specified, mat otherwise
     */
    mat2.rotate = function (mat, angle, dest) {
        if (!dest) { dest = mat; }
        var a11 = mat[0],
            a12 = mat[1],
            a21 = mat[2],
            a22 = mat[3],
            s = Math.sin(angle),
            c = Math.cos(angle);
        dest[0] = a11 *  c + a12 * s;
        dest[1] = a11 * -s + a12 * c;
        dest[2] = a21 *  c + a22 * s;
        dest[3] = a21 * -s + a22 * c;
        return dest;
    };

    /**
     * Multiplies the vec2 by the given 2x2 matrix
     *
     * @param {mat2} matrix the 2x2 matrix to multiply against
     * @param {vec2} vec    the vector to multiply
     * @param {vec2} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec2} The multiplication result
     **/
    mat2.multiplyVec2 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1];
      dest[0] = x * matrix[0] + y * matrix[1];
      dest[1] = x * matrix[2] + y * matrix[3];
      return dest;
    };
    
    /**
     * Scales the mat2 by the dimensions in the given vec2
     *
     * @param {mat2} matrix the 2x2 matrix to scale
     * @param {vec2} vec    the vector containing the dimensions to scale by
     * @param {vec2} [dest] an optional receiving mat2. If not given, matrix is used.
     *
     * @returns {mat2} dest if specified, matrix otherwise
     **/
    mat2.scale = function(matrix, vec, dest) {
      if (!dest) { dest = matrix; }
      var a11 = matrix[0],
          a12 = matrix[1],
          a21 = matrix[2],
          a22 = matrix[3],
          b11 = vec[0],
          b22 = vec[1];
      dest[0] = a11 * b11;
      dest[1] = a12 * b22;
      dest[2] = a21 * b11;
      dest[3] = a22 * b22;
      return dest;
    };

    /**
     * Returns a string representation of a mat2
     *
     * @param {mat2} mat mat2 to represent as a string
     *
     * @param {String} String representation of mat
     */
    mat2.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] + ']';
    };
    
    /**
     * @class 4 Dimensional Vector
     * @name vec4
     */
    var vec4 = {};
     
    /**
     * Creates a new vec4, initializing it from vec if vec
     * is given.
     *
     * @param {vec4} [vec] the vector's initial contents
     * @returns {vec4} a new 2D vector
     */
    vec4.create = function(vec) {
        var dest = new MatrixArray(4);
        
        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
            dest[2] = vec[2];
            dest[3] = vec[3];
        } else {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a vec4, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value
     * @param {number} w W value

     * @returns {vec4} New vec4
     */
    vec4.createFrom = function (x, y, z, w) {
        var dest = new MatrixArray(4);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = w;

        return dest;
    };
    
    /**
     * Adds the vec4's together. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.add = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] + vecB[0];
      dest[1] = vecA[1] + vecB[1];
      dest[2] = vecA[2] + vecB[2];
      dest[3] = vecA[3] + vecB[3];
      return dest;
    };
    
    /**
     * Subtracts vecB from vecA. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.subtract = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] - vecB[0];
      dest[1] = vecA[1] - vecB[1];
      dest[2] = vecA[2] - vecB[2];
      dest[3] = vecA[3] - vecB[3];
      return dest;
    };
    
    /**
     * Multiplies vecA with vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.multiply = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] * vecB[0];
      dest[1] = vecA[1] * vecB[1];
      dest[2] = vecA[2] * vecB[2];
      dest[3] = vecA[3] * vecB[3];
      return dest;
    };
    
    /**
     * Divides vecA by vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.divide = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] / vecB[0];
      dest[1] = vecA[1] / vecB[1];
      dest[2] = vecA[2] / vecB[2];
      dest[3] = vecA[3] / vecB[3];
      return dest;
    };
    
    /**
     * Scales vecA by some scalar number. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecA.
     *
     * This is the same as multiplying each component of vecA
     * by the given scalar.
     *
     * @param {vec4}   vecA the vector to be scaled
     * @param {Number} scalar the amount to scale the vector by
     * @param {vec4}   [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.scale = function(vecA, scalar, dest) {
      if (!dest) dest = vecA;
      dest[0] = vecA[0] * scalar;
      dest[1] = vecA[1] * scalar;
      dest[2] = vecA[2] * scalar;
      dest[3] = vecA[3] * scalar;
      return dest;
    };

    /**
     * Copies the values of one vec4 to another
     *
     * @param {vec4} vec vec4 containing values to copy
     * @param {vec4} dest vec4 receiving copied values
     *
     * @returns {vec4} dest
     */
    vec4.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        dest[2] = vec[2];
        dest[3] = vec[3];
        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec4} a First vector
     * @param {vec4} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Negates the components of a vec4
     *
     * @param {vec4} vec vec4 to negate
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec4} dest if specified, vec otherwise
     */
    vec4.negate = function (vec, dest) {
        if (!dest) { dest = vec; }
        dest[0] = -vec[0];
        dest[1] = -vec[1];
        dest[2] = -vec[2];
        dest[3] = -vec[3];
        return dest;
    };

    /**
     * Caclulates the length of a vec2
     *
     * @param {vec2} vec vec2 to calculate length of
     *
     * @returns {Number} Length of vec
     */
    vec4.length = function (vec) {
      var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
      return Math.sqrt(x * x + y * y + z * z + w * w);
    };

    /**
     * Caclulates the squared length of a vec4
     *
     * @param {vec4} vec vec4 to calculate squared length of
     *
     * @returns {Number} Squared Length of vec
     */
    vec4.squaredLength = function (vec) {
      var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
      return x * x + y * y + z * z + w * w;
    };

    /**
     * Performs a linear interpolation between two vec4
     *
     * @param {vec4} vecA First vector
     * @param {vec4} vecB Second vector
     * @param {Number} lerp Interpolation amount between the two inputs
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec4} dest if specified, vecA otherwise
     */
    vec4.lerp = function (vecA, vecB, lerp, dest) {
        if (!dest) { dest = vecA; }
        dest[0] = vecA[0] + lerp * (vecB[0] - vecA[0]);
        dest[1] = vecA[1] + lerp * (vecB[1] - vecA[1]);
        dest[2] = vecA[2] + lerp * (vecB[2] - vecA[2]);
        dest[3] = vecA[3] + lerp * (vecB[3] - vecA[3]);
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec4} vec Vector to represent as a string
     *
     * @returns {String} String representation of vec
     */
    vec4.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ', ' + vec[3] + ']';
    };

    /*
     * Exports
     */

    if(root) {
        root.glMatrixArrayType = MatrixArray;
        root.MatrixArray = MatrixArray;
        root.setMatrixArrayType = setMatrixArrayType;
        root.determineMatrixArrayType = determineMatrixArrayType;
        root.glMath = glMath;
        root.vec2 = vec2;
        root.vec3 = vec3;
        root.vec4 = vec4;
        root.mat2 = mat2;
        root.mat3 = mat3;
        root.mat4 = mat4;
        root.quat4 = quat4;
    }

    return {
        glMatrixArrayType: MatrixArray,
        MatrixArray: MatrixArray,
        setMatrixArrayType: setMatrixArrayType,
        determineMatrixArrayType: determineMatrixArrayType,
        glMath: glMath,
        vec2: vec2,
        vec3: vec3,
        vec4: vec4,
        mat2: mat2,
        mat3: mat3,
        mat4: mat4,
        quat4: quat4
    };
}));
function ja(b){throw b}var Ha=void 0,Sa=!0,Ab=null,Gb=!1;function Hb(){return(function(){})}function Lb(b){return(function(){return b})}try{this.Module=Module}catch(Sb){this.Module=Module={}}var Tb="object"===typeof process,Vb="object"===typeof window,Wb="function"===typeof importScripts,Xb=!Vb&&!Tb&&!Wb;if(Tb){Module.print=(function(b){process.stdout.write(b+"\n")});Module.printErr=(function(b){process.stderr.write(b+"\n")});var dc=require("fs"),hc=require("path");Module.read=(function(b){var b=hc.normalize(b),d=dc.readFileSync(b).toString();!d&&b!=hc.resolve(b)&&(b=path.join(__dirname,"..","src",b),d=dc.readFileSync(b).toString());return d});Module.load=(function(b){ic(read(b))});Module.arguments||(Module.arguments=process.argv.slice(2))}else{Xb?(Module.print=print,"undefined"!=typeof printErr&&(Module.printErr=printErr),Module.read="undefined"!=typeof read?read:(function(b){snarf(b)}),Module.arguments||("undefined"!=typeof scriptArgs?Module.arguments=scriptArgs:"undefined"!=typeof arguments&&(Module.arguments=arguments))):Vb?(Module.print||(Module.print=(function(b){console.log(b)})),Module.printErr||(Module.printErr=(function(b){console.log(b)})),Module.read=(function(b){var d=new XMLHttpRequest;d.open("GET",b,Gb);d.send(Ab);return d.responseText}),Module.arguments||"undefined"!=typeof arguments&&(Module.arguments=arguments)):Wb?Module.load=importScripts:ja("Unknown runtime environment. Where are we?")}function ic(b){eval.call(Ab,b)}"undefined"==!Module.load&&Module.read&&(Module.load=(function(b){ic(Module.read(b))}));Module.print||(Module.print=Hb());Module.printErr||(Module.printErr=Module.print);Module.arguments||(Module.arguments=[]);Module.print=Module.print;Module.gc=Module.printErr;Module.preRun||(Module.preRun=[]);Module.postRun||(Module.postRun=[]);function mc(b){if(1==nc){return 1}var d={"%i1":1,"%i8":1,"%i16":2,"%i32":4,"%i64":8,"%float":4,"%double":8}["%"+b];d||("*"==b[b.length-1]?d=nc:"i"==b[0]&&(b=parseInt(b.substr(1)),rc(0==b%8),d=b/8));return d}var zc;function Bc(){var b=[],d=0;this.hc=(function(e){e&=255;d&&(b.push(e),d--);if(0==b.length){if(128>e){return String.fromCharCode(e)}b.push(e);d=191<e&&224>e?1:2;return""}if(0<d){return""}var e=b[0],f=b[1],g=b[2],e=191<e&&224>e?String.fromCharCode((e&31)<<6|f&63):String.fromCharCode((e&15)<<12|(f&63)<<6|g&63);b.length=0;return e});this.Oh=(function(b){for(var b=unescape(encodeURIComponent(b)),d=[],g=0;g<b.length;g++){d.push(b.charCodeAt(g))}return d})}function Dc(b){var d=a;a+=b;a=a+3>>2<<2;return d}function Kc(b){var d=Rc;Rc+=b;Rc=Rc+3>>2<<2;if(Rc>=Sc){for(;Sc<=Rc;){Sc=2*Sc+4095>>12<<12}var b=c,e=new ArrayBuffer(Sc);c=new Int8Array(e);i=new Int16Array(e);l=new Int32Array(e);ed=new Uint8Array(e);jd=new Uint16Array(e);o=new Uint32Array(e);q=new Float32Array(e);ud=new Float64Array(e);c.set(b)}return d}var nc=4,vd={},Nd,s;function Od(b){Module.print(b+":\n"+Error().stack);ja("Assertion: "+b)}function rc(b,d){b||Od("Assertion failed: "+d)}var Wd=this;function ke(b,d,e,f){function g(b,d){if("string"==d){if(b===Ab||b===Ha||0===b){return 0}h||(h=a);var e=Dc(b.length+1);le(b,e);return e}return"array"==d?(h||(h=a),e=Dc(b.length),me(b,e),e):b}var h=0;try{var j=eval("_"+b)}catch(k){try{j=Wd.Module["_"+b]}catch(m){}}rc(j,"Cannot call unknown function "+b+" (perhaps LLVM optimizations or closure removed it?)");var n=0,b=f?f.map((function(b){return g(b,e[n++])})):[],d=(function(b,d){if("string"==d){return we(b)}rc("array"!=d);return b})(j.apply(Ab,b),d);h&&(a=h);return d}Module.ccall=ke;Module.cwrap=(function(b,d,e){return(function(){return ke(b,d,e,Array.prototype.slice.call(arguments))})});function xe(b,d,e){e=e||"i8";"*"===e[e.length-1]&&(e="i32");switch(e){case"i1":c[b]=d;break;case"i8":c[b]=d;break;case"i16":i[b>>1]=d;break;case"i32":l[b>>2]=d;break;case"i64":l[b>>2]=d;break;case"float":q[b>>2]=d;break;case"double":Ee[0]=d;l[b>>2]=t[0];l[b+4>>2]=t[1];break;default:Od("invalid type for setValue: "+e)}}Module.setValue=xe;function Fe(b,d){d=d||"i8";"*"===d[d.length-1]&&(d="i32");switch(d){case"i1":return c[b];case"i8":return c[b];case"i16":return i[b>>1];case"i32":return l[b>>2];case"i64":return l[b>>2];case"float":return q[b>>2];case"double":return t[0]=l[b>>2],t[1]=l[b+4>>2],Ee[0];default:Od("invalid type for setValue: "+d)}return Ab}Module.getValue=Fe;var Ge=1,v=2;Module.ALLOC_NORMAL=0;Module.ALLOC_STACK=Ge;Module.ALLOC_STATIC=v;function B(b,d,e){var f,g;"number"===typeof b?(f=Sa,g=b):(f=Gb,g=b.length);var h="string"===typeof d?d:Ab,e=[Ne,Dc,Kc][e===Ha?v:e](Math.max(g,h?1:d.length));if(f){return Oe(e,g),e}f=0;for(var j;f<g;){var k=b[f];"function"===typeof k&&(k=vd.ji(k));j=h||d[f];0===j?f++:("i64"==j&&(j="i32"),xe(e+f,k,j),f+=mc(j))}return e}Module.allocate=B;function we(b,d){for(var e=new Bc,f="undefined"==typeof d,g="",h=0,j;;){j=ed[b+h];if(f&&0==j){break}g+=e.hc(j);h+=1;if(!f&&h==d){break}}return g}Module.Pointer_stringify=we;Module.Array_stringify=(function(b){for(var d="",e=0;e<b.length;e++){d+=String.fromCharCode(b[e])}return d});var K,Pe=4096,c,ed,i,jd,l,o,q,ud,a,Qe,Rc,Ze=Module.TOTAL_STACK||5242880,Sc=Module.TOTAL_MEMORY||10485760;rc(!!Int32Array&&!!Float64Array&&!!(new Int32Array(1)).subarray&&!!(new Int32Array(1)).set,"Cannot fallback to non-typed array case: Code is too specialized");var gf=new ArrayBuffer(Sc);c=new Int8Array(gf);i=new Int16Array(gf);l=new Int32Array(gf);ed=new Uint8Array(gf);jd=new Uint16Array(gf);o=new Uint32Array(gf);q=new Float32Array(gf);ud=new Float64Array(gf);l[0]=255;rc(255===ed[0]&&0===ed[3],"Typed arrays 2 must be run on a little-endian system");var rf=hf("(null)");Rc=rf.length;for(var sf=0;sf<rf.length;sf++){c[sf]=rf[sf]}Module.HEAP=Ha;Module.HEAP8=c;Module.HEAP16=i;Module.HEAP32=l;Module.HEAPU8=ed;Module.HEAPU16=jd;Module.HEAPU32=o;Module.HEAPF32=q;Module.HEAPF64=ud;Qe=(a=4*Math.ceil(Rc/4))+Ze;var tf=8*Math.ceil(Qe/8);c.subarray(tf);var t=l.subarray(tf>>2),M=q.subarray(tf>>2),Ee=ud.subarray(tf>>3);Qe=tf+8;Rc=Qe+4095>>12<<12;function uf(b){for(;0<b.length;){var d=b.shift(),e=d.fb;"number"===typeof e&&(e=K[e]);e(d.Jh===Ha?Ab:d.Jh)}}var vf=[],wf=[],Mf=[];function Nf(b){for(var d=0;c[b+d];){d++}return d}Module.String_len=Nf;function hf(b,d,e){b=(new Bc).Oh(b);e&&(b.length=e);d||b.push(0);return b}Module.intArrayFromString=hf;Module.intArrayToString=(function(b){for(var d=[],e=0;e<b.length;e++){var f=b[e];255<f&&(f&=255);d.push(String.fromCharCode(f))}return d.join("")});function le(b,d,e){b=hf(b,e);for(e=0;e<b.length;){c[d+e]=b[e],e+=1}}Module.writeStringToMemory=le;function me(b,d){for(var e=0;e<b.length;e++){c[d+e]=b[e]}}Module.writeArrayToMemory=me;var N=[];function Of(b,d){return 0<=b?b:32>=d?2*Math.abs(1<<d-1)+b:Math.pow(2,d)+b}function Pf(b,d){if(0>=b){return b}var e=32>=d?Math.abs(1<<d-1):Math.pow(2,d-1);if(b>=e&&(32>=d||b>e)){b=-2*e+b}return b}var Qf=0,kg={},lg=Gb;function mg(b){Qf++;Module.monitorRunDependencies&&Module.monitorRunDependencies(Qf);b&&(rc(!kg[b]),kg[b]=1)}Module.addRunDependency=mg;function Dg(b){Qf--;Module.monitorRunDependencies&&Module.monitorRunDependencies(Qf);b&&(rc(kg[b]),delete kg[b]);0==Qf&&!lg&&Eg()}Module.removeRunDependency=Dg;Module.preloadedImages={};Module.preloadedAudios={};function fh(b){var d,e,f=b>>2;l[f]=-1;e=(b+12|0)>>2;l[e]=16;l[f+2]=0;var g=Ne(576);d=(b+4|0)>>2;l[d]=g;Oe(g,36*l[e]|0);var g=l[e]-1|0,h=0<(g|0);a:do{if(h){for(var j=0;;){var k=j+1|0;l[(l[d]+36*j+20|0)>>2]=k;l[(l[d]+36*j+32|0)>>2]=-1;j=l[e]-1|0;if((k|0)>=(j|0)){var m=j;break a}j=k}}else{m=g}}while(0);l[(l[d]+36*m+20|0)>>2]=-1;l[(l[d]+36*(l[e]-1)+32|0)>>2]=-1;d=(b+16|0)>>2;l[d]=0;l[d+1]=0;l[d+2]=0;l[d+3]=0;l[(b+48|0)>>2]=16;l[f+13]=0;b=Ne(192);l[f+11]=b;l[f+9]=16;l[f+10]=0;b=Ne(64);l[f+8]=b}function gh(b,d,e){var f,g=b|0,h=hh(g);f=(b+4|0)>>2;var j=q[d+4>>2]-.10000000149011612,k=l[f]+36*h|0,m=(M[0]=q[d>>2]-.10000000149011612,t[0]),j=(M[0]=j,t[0])|0;l[(k|0)>>2]=0|m;l[(k+4|0)>>2]=j;m=q[d+12>>2]+.10000000149011612;k=l[f]+36*h+8|0;d=(M[0]=q[d+8>>2]+.10000000149011612,t[0]);m=(M[0]=m,t[0])|0;l[(k|0)>>2]=0|d;l[(k+4|0)>>2]=m;l[(l[f]+36*h+16|0)>>2]=e;l[(l[f]+36*h+32|0)>>2]=0;Bh(g,h);e=b+28|0;l[e>>2]=l[e>>2]+1|0;e=(b+40|0)>>2;f=l[e];g=b+36|0;b=(b+32|0)>>2;(f|0)==(l[g>>2]|0)&&(d=l[b],l[g>>2]=f<<1,f=Ne(f<<3),l[b]=f,Ch(f,d,l[e]<<2),Dh(d),f=l[e]);l[((f<<2)+l[b]|0)>>2]=h;l[e]=l[e]+1|0;return h}function Eh(b,d,e,f,g){var h,j=b>>2;h=(b+60|0)>>2;l[h]=0;var k=f+12|0,m=q[g+12>>2],n=q[k>>2],p=q[g+8>>2],u=q[f+16>>2],r=m*n-p*u+q[g>>2]-q[e>>2],g=p*n+m*u+q[g+4>>2]-q[e+4>>2],m=q[e+12>>2],n=q[e+8>>2],e=m*r+n*g,r=r*-n+m*g,m=d+12|0,g=o[m>>2],m=o[m+4>>2],n=(t[0]=g,M[0]),p=(t[0]=m,M[0]),w=d+20|0,u=o[w>>2],w=o[w+4>>2],x=(t[0]=u,M[0]),y=(t[0]=w,M[0]),A=x-n,C=y-p,z=A*(x-e)+C*(y-r),D=e-n,E=r-p,G=A*D+C*E,f=q[d+8>>2]+q[f+8>>2],H=0<G;do{if(H){if(0<z){var F=A*A+C*C;0<F||P(N.Pe|0,127,N.je|0,N.Qe|0);var I=1/F,F=e-(n*z+x*G)*I,I=r-(p*z+y*G)*I;if(F*F+I*I<=f*f){F=-C;0>D*F+A*E?(I=C,F=-A):(I=F,F=A);var J=Fh(I*I+F*F);1.1920928955078125e-7>J?J=F:(J=1/J,I*=J,J*=F);l[h]=1;l[j+14]=1;F=b+40|0;I=(M[0]=I,t[0]);J=(M[0]=J,t[0])|0;l[F>>2]=0|I;l[F+4>>2]=J;F=b+48|0;l[F>>2]=g;l[F+4>>2]=m;F=b+16|0;l[F>>2]=0;I=F;c[F]=0;c[I+1|0]=0;c[I+2|0]=1;c[I+3|0]=0;F=k;I=b;J=l[F+4>>2];l[I>>2]=l[F>>2];l[I+4>>2]=J}}else{if(F=e-x,I=r-y,F*F+I*I<=f*f){if(0!=(c[d+45|0]&1)<<24>>24){var L=d+36|0,J=L|0,L=L+4|0,L=l[L>>2],J=(t[0]=l[J>>2],M[0]),L=(t[0]=L,M[0]);if(0<(J-x)*F+(L-y)*I){break}}l[h]=1;l[j+14]=0;q[j+10]=0;q[j+11]=0;I=b+48|0;F=I|0;l[F>>2]=u;F=I+4|0;l[F>>2]=w;F=b+16|0;l[F>>2]=0;I=F;c[F]=1;c[I+1|0]=0;c[I+2|0]=0;c[I+3|0]=0;I=k;J=b;F=I|0;I=I+4|0;L=l[I>>2];I=J|0;l[I>>2]=l[F>>2];F=J+4|0;l[F>>2]=L}}}else{if(D*D+E*E<=f*f){if(0!=(c[d+44|0]&1)<<24>>24&&(F=d+28|0,J=F|0,L=F+4|0,F=l[L>>2],I=(t[0]=l[J>>2],M[0]),F=(t[0]=F,M[0]),0<(n-I)*(n-e)+(p-F)*(p-r))){break}l[h]=1;l[j+14]=0;q[j+10]=0;q[j+11]=0;I=b+48|0;F=I|0;l[F>>2]=g;F=I+4|0;l[F>>2]=m;F=b+16|0;l[F>>2]=0;I=F;c[F]=0;c[I+1|0]=0;c[I+2|0]=0;c[I+3|0]=0;I=k;J=b;F=I|0;F=l[F>>2];I=I+4|0;L=l[I>>2];I=J|0;l[I>>2]=F;F=J+4|0;l[F>>2]=L}}}while(0)}function Gh(b,d,e,f,g,h){var j,k,m,n,p,u,r,w,x,y,A,C,z,D,E,G,H,F,I,J,L,O,R,T,S,U,W,Q,$,ea,sa,Ba,oa,ga,qa,la,Ca,ia,ya,ta,Ia,na,Z,ba,ca,ma,ka,aa,ra,ha,za,X,ua,da,fa,Aa,Pa=g>>2,pa=b>>2,cb=a;a+=84;var Qa;Aa=cb>>2;var Ta=cb+12,$a=cb+36;fa=$a>>2;var va=cb+60;da=va>>2;var Wa=b+132|0,fb=q[f+12>>2],gb=q[h+8>>2],Xa=q[f+8>>2],Ua=q[h+12>>2],Va=fb*gb-Xa*Ua,pb=fb*Ua+Xa*gb,nb=(M[0]=Va,t[0]),La=(M[0]=pb,t[0]),qb=0|nb,bb=La|0,Fa=q[h>>2]-q[f>>2],Ma=q[h+4>>2]-q[f+4>>2],wa=fb*Fa+Xa*Ma,hb=Fa*-Xa+fb*Ma,Ya=(M[0]=wa,t[0]),Za=(M[0]=hb,t[0])|0,Da=Wa|0;l[Da>>2]=0|Ya;var Na=Wa+4|0;l[Na>>2]=Za;var ib=b+140|0;l[ib>>2]=qb;l[ib+4>>2]=bb;ua=(b+144|0)>>2;var ab=q[Pa+3];X=(b+140|0)>>2;var Ga=q[Pa+4];za=(Wa|0)>>2;var jb=pb*ab-Va*Ga+wa;ha=(b+136|0)>>2;var Ea=Va*ab+pb*Ga+hb,Oa=b+148|0,Ja=(M[0]=jb,t[0]),db=(M[0]=Ea,t[0])|0;l[Oa>>2]=0|Ja;l[Oa+4>>2]=db;var xa=e+28|0,Ra=b+156|0,Ka=l[xa>>2],tb=l[xa+4>>2];l[Ra>>2]=Ka;l[Ra+4>>2]=tb;var kb=e+12|0,ub=b+164|0,rb=l[kb>>2],Bb=l[kb+4>>2];l[ub>>2]=rb;l[ub+4>>2]=Bb;var lb=e+20|0,yb=b+172|0,xb=l[lb>>2],Ib=l[lb+4>>2];l[yb>>2]=xb;l[yb+4>>2]=Ib;var wb=e+36|0,vb=b+180|0,zb=l[wb>>2],Eb=l[wb+4>>2];l[vb>>2]=zb;l[vb+4>>2]=Eb;var Cb=c[e+44|0]&1,eb=0!=Cb<<24>>24,sb=c[e+45|0],ob=0!=(sb&1)<<24>>24,Db=(t[0]=xb,M[0]),Jb=(t[0]=rb,M[0]),Rb=Db-Jb,Nb=(t[0]=Ib,M[0]),Ob=b+168|0,Kb=(t[0]=Bb,M[0]),Pb=Nb-Kb,Mb=Fh(Rb*Rb+Pb*Pb),Yb=1.1920928955078125e-7>Mb,Zb=(t[0]=Ka,M[0]),ec=(t[0]=tb,M[0]),Ub=(t[0]=zb,M[0]),jc=(t[0]=Eb,M[0]);if(Yb){var Qb=Rb,mb=Pb}else{var cc=1/Mb,Qb=Rb*cc,mb=Pb*cc}var Fb=b+196|0,gc=-Qb;ra=(Fb|0)>>2;q[ra]=mb;aa=(b+200|0)>>2;q[aa]=gc;var vc=mb*(jb-Jb)+(Ea-Kb)*gc;if(eb){var pc=Jb-Zb,qc=Kb-ec,$c=Fh(pc*pc+qc*qc);if(1.1920928955078125e-7>$c){var Ec=pc,sc=qc}else{var kd=1/$c,Ec=pc*kd,sc=qc*kd}var wd=-Ec;q[pa+47]=sc;q[pa+48]=wd;var Lc=0<=Ec*mb-sc*Qb,$b=sc*(jb-Zb)+(Ea-ec)*wd}else{$b=Lc=0}a:do{if(ob){var ac=Ub-Db,oc=jc-Nb,tc=Fh(ac*ac+oc*oc);if(1.1920928955078125e-7>tc){var Nc=ac,ld=oc}else{var Wc=1/tc,Nc=ac*Wc,ld=oc*Wc}var ad=-Nc;ka=(b+204|0)>>2;q[ka]=ld;ma=(b+208|0)>>2;q[ma]=ad;var Xc=0<Qb*ld-mb*Nc,Cc=ld*(jb-Db)+(Ea-Nb)*ad;if(0==(Cb&sb)<<24>>24){var fd=Cc,md=Xc;Qa=39}else{if(Lc&Xc){var nd=0>$b&0>vc;do{if(nd){var Oc=0<=Cc;c[b+248|0]=Oc&1;var gd=b+212|0;if(Oc){var od=gd;break}var pd=gd,Pd=(M[0]=-mb,t[0]),Xd=(M[0]=Qb,t[0]),qd=0|Pd,Qd=Xd|0,Pc=pd|0;ca=Pc>>2;l[ca]=qd;var Ic=pd+4|0;ba=Ic>>2;l[ba]=Qd;var Jc=b+228|0,fc=Jc|0;Z=fc>>2;l[Z]=qd;var hd=Jc+4|0;na=hd>>2;l[na]=Qd;var xd=b+236|0,bd=xd|0;Ia=bd>>2;l[Ia]=qd;var rd=xd+4|0;ta=rd>>2;l[ta]=Qd;Qa=66;break a}c[b+248|0]=1;od=b+212|0}while(0);var ye=Fb,Yd=od,Tc=ye|0;ya=Tc>>2;var wc=l[ya],bc=ye+4|0;ia=bc>>2;var Ed=l[ia],xc=Yd|0;Ca=xc>>2;l[Ca]=wc;var Ac=Yd+4|0;la=Ac>>2;l[la]=Ed;var Zd=b+188|0,$d=b+228|0,cd=Zd|0;qa=cd>>2;var yc=l[qa],kc=Zd+4|0;ga=kc>>2;var Rd=l[ga],Fc=$d|0;oa=Fc>>2;l[oa]=yc;var Qc=$d+4|0;Ba=Qc>>2;l[Ba]=Rd;var Mc=b+204|0,ne=b+236|0,Sd=Mc|0;sa=Sd>>2;var Td=l[sa],Ud=Mc+4|0;ea=Ud>>2;var xf=l[ea];l[ne>>2]=Td;l[ne+4>>2]=xf}else{if(Lc){var Fd=0>$b;do{if(Fd){if(0>vc){c[b+248|0]=0;var oe=b+212|0}else{var He=0<=Cc;c[b+248|0]=He&1;var ae=b+212|0;if(He){var Gc=ae;break}oe=ae}var dd=oe,be=(M[0]=-mb,t[0]),pe=(M[0]=Qb,t[0])|0,Uc=dd|0;$=Uc>>2;l[$]=0|be;var lc=dd+4|0;Q=lc>>2;l[Q]=pe;var Gd=-q[ma],Hd=b+228|0,Re=(M[0]=-q[ka],t[0]),Id=(M[0]=Gd,t[0])|0,Jd=Hd|0;W=Jd>>2;l[W]=0|Re;var qe=Hd+4|0;U=qe>>2;l[U]=Id;var re=-q[aa],Kd=b+236|0,Se=(M[0]=-q[ra],t[0]),Rf=(M[0]=re,t[0])|0;l[Kd>>2]=0|Se;l[Kd+4>>2]=Rf;Qa=66;break a}c[b+248|0]=1;Gc=b+212|0}while(0);var sd=Fb,Vc=Gc,Tc=sd|0;ya=Tc>>2;var Te=l[ya],bc=sd+4|0;ia=bc>>2;var Ue=l[ia],xc=Vc|0;Ca=xc>>2;l[Ca]=Te;Ac=Vc+4|0;la=Ac>>2;l[la]=Ue;var ce=b+188|0,Yc=b+228|0,cd=ce|0;qa=cd>>2;var yd=l[qa],kc=ce+4|0;ga=kc>>2;var $e=l[ga],Fc=Yc|0;oa=Fc>>2;l[oa]=yd;Qc=Yc+4|0;Ba=Qc>>2;l[Ba]=$e;var ze=b+236|0,Zc=sd|0;S=Zc>>2;var Ld=l[S],Md=sd+4|0;T=Md>>2;var de=l[T],zd=ze|0;R=zd>>2;l[R]=Ld;var ee=ze+4|0;O=ee>>2;l[O]=de}else{if(Xc){var yf=0>Cc;do{if(yf){if(0>$b){c[b+248|0]=0;var af=b+212|0}else{var Ie=0<=vc;c[b+248|0]=Ie&1;var zf=b+212|0;if(Ie){var jf=zf;break}af=zf}var bf=af,Sf=(M[0]=-mb,t[0]),kf=(M[0]=Qb,t[0])|0,Uc=bf|0;$=Uc>>2;l[$]=0|Sf;lc=bf+4|0;Q=lc>>2;l[Q]=kf;var Ae=-q[aa],Ad=b+228|0,Af=(M[0]=-q[ra],t[0]),Tf=(M[0]=Ae,t[0])|0,Jd=Ad|0;W=Jd>>2;l[W]=0|Af;qe=Ad+4|0;U=qe>>2;l[U]=Tf;var Fg=-q[pa+48],Gg=b+236|0,ng=(M[0]=-q[pa+47],t[0]),og=(M[0]=Fg,t[0])|0,pg=Gg|0;l[pg>>2]=0|ng;var Bf=Gg+4|0;l[Bf>>2]=og;Qa=66;break a}c[b+248|0]=1;jf=b+212|0}while(0);var Uf=Fb,Vf=jf,Tc=Uf|0;ya=Tc>>2;var Hg=l[ya],bc=Uf+4|0;ia=bc>>2;var Ih=l[ia],xc=Vf|0;Ca=xc>>2;l[Ca]=Hg;Ac=Vf+4|0;la=Ac>>2;l[la]=Ih;var Ig=b+228|0,Uc=Uf|0;$=Uc>>2;var Ej=l[$],lc=Uf+4|0;Q=lc>>2;var Ii=l[Q];l[Ig>>2]=Ej;l[Ig+4>>2]=Ii;var qg=b+204|0,Jh=b+236|0,Zc=qg|0;S=Zc>>2;var Wf=l[S],Md=qg+4|0;T=Md>>2;var Kh=l[T],zd=Jh|0;R=zd>>2;l[R]=Wf;ee=Jh+4|0;O=ee>>2;l[O]=Kh}else{var lf=0>$b|0>vc;do{if(!lf){var rg=0<=Cc;c[b+248|0]=rg&1;var ih=b+212|0;if(!rg){var Lh=ih;break}var Be=Fb,sg=ih,se=Be|0;L=se>>2;var Jg=o[L],fe=Be+4|0;J=fe>>2;var te=o[J],ue=sg|0;I=ue>>2;l[I]=Jg;var ge=sg+4|0;F=ge>>2;l[F]=te;var mf=b+228|0,Pc=mf|0;ca=Pc>>2;l[ca]=Jg;Ic=mf+4|0;ba=Ic>>2;l[ba]=te;var Ji=b+236|0,fc=Ji|0;Z=fc>>2;l[Z]=Jg;hd=Ji+4|0;na=hd>>2;l[na]=te;Qa=66;break a}c[b+248|0]=0;Lh=b+212|0}while(0);var Kg=Lh,tg=(M[0]=-mb,t[0]),jh=(M[0]=Qb,t[0])|0,Uc=Kg|0;$=Uc>>2;l[$]=0|tg;lc=Kg+4|0;Q=lc>>2;l[Q]=jh;var Mh=-q[ma],ug=b+228|0,Nh=(M[0]=-q[ka],t[0]),Oh=(M[0]=Mh,t[0])|0,Jd=ug|0;W=Jd>>2;l[W]=0|Nh;qe=ug+4|0;U=qe>>2;l[U]=Oh;var Lg=-q[pa+48],Mg=b+236|0,Hc=(M[0]=-q[pa+47],t[0]),uc=(M[0]=Lg,t[0])|0,pg=Mg|0;l[pg>>2]=0|Hc;Bf=Mg+4|0;l[Bf>>2]=uc}}}Qa=66}}else{md=fd=0,Qa=39}}while(0);a:do{if(39==Qa){if(eb){var Ki=0<=$b;if(Lc){do{if(!Ki){var Ph=0<=vc;c[b+248|0]=Ph&1;var Ng=b+212|0;if(Ph){var Og=Ng;break}var Pg=Ng,Li=(M[0]=-mb,t[0]),Qh=(M[0]=Qb,t[0]),Qg=Qh|0,Pc=Pg|0;ca=Pc>>2;l[ca]=0|Li;Ic=Pg+4|0;ba=Ic>>2;l[ba]=Qg;var Rh=Fb,kh=b+228|0,Fc=Rh|0;oa=Fc>>2;var Sh=l[oa],Qc=Rh+4|0;Ba=Qc>>2;var Mi=l[Ba],nf=kh|0;H=nf>>2;l[H]=Sh;var he=kh+4|0;G=he>>2;l[G]=Mi;var Bd=b+236|0,cf=-(t[0]=Sh,M[0]),vg=Bd,Ce=0|(M[0]=cf,t[0]),Cf=Qh|0;l[vg>>2]=Ce;l[vg+4>>2]=Cf;break a}c[b+248|0]=1;Og=b+212|0}while(0);var td=Fb,Rg=Og,Tc=td|0;ya=Tc>>2;var Fj=l[ya],bc=td+4|0;ia=bc>>2;var Th=l[ia],xc=Rg|0;Ca=xc>>2;l[Ca]=Fj;Ac=Rg+4|0;la=Ac>>2;l[la]=Th;var Ni=b+188|0,wg=b+228|0,cd=Ni|0;qa=cd>>2;var Uh=l[qa],kc=Ni+4|0;ga=kc>>2;var Vh=l[ga],Fc=wg|0;oa=Fc>>2;l[oa]=Uh;Qc=wg+4|0;Ba=Qc>>2;l[Ba]=Vh;var Wh=-q[aa],Xh=b+236|0,Gj=(M[0]=-q[ra],t[0]),Je=(M[0]=Wh,t[0])|0,Xf=Xh|0;l[Xf>>2]=0|Gj;var Yf=Xh+4|0;l[Yf>>2]=Je}else{do{if(Ki){var Yh=0<=vc;c[b+248|0]=Yh&1;var Sg=b+212|0;if(!Yh){var lh=Sg;break}var Df=Fb,Zh=Sg,se=Df|0;L=se>>2;var Tg=o[L],fe=Df+4|0;J=fe>>2;var $h=o[J],ue=Zh|0;I=ue>>2;l[I]=Tg;ge=Zh+4|0;F=ge>>2;l[F]=$h;var xg=b+228|0,Pc=xg|0;ca=Pc>>2;l[ca]=Tg;Ic=xg+4|0;ba=Ic>>2;l[ba]=$h;var Oi=b+236|0,df=-(t[0]=Tg,M[0]),mh=Oi,nh=(M[0]=df,t[0]),oh=(M[0]=Qb,t[0])|0,Zf=mh|0;E=Zf>>2;l[E]=0|nh;var Ve=mh+4|0;D=Ve>>2;l[D]=oh;break a}c[b+248|0]=0;lh=b+212|0}while(0);var of=lh,Ug=(M[0]=-mb,t[0]),ai=(M[0]=Qb,t[0])|0,Uc=of|0;$=Uc>>2;l[$]=0|Ug;lc=of+4|0;Q=lc>>2;l[Q]=ai;var Vg=Fb,Wg=b+228|0,We=Vg|0;z=We>>2;var Pi=l[z],ef=Vg+4|0;C=ef>>2;var Hj=l[C],bd=Wg|0;Ia=bd>>2;l[Ia]=Pi;rd=Wg+4|0;ta=rd>>2;l[ta]=Hj;var $f=-q[pa+48],Ef=b+236|0,ph=(M[0]=-q[pa+47],t[0]),bi=(M[0]=$f,t[0])|0,ff=Ef|0;l[ff>>2]=0|ph;var pf=Ef+4|0;l[pf>>2]=bi}}else{var qf=0<=vc;if(ob){if(md){do{if(!qf){var yg=0<=fd;c[b+248|0]=yg&1;var zg=b+212|0;if(yg){var Ff=zg;break}var Xg=zg,Yg=(M[0]=-mb,t[0]),ie=(M[0]=Qb,t[0]),Gf=0|Yg,Hf=ie|0,Pc=Xg|0;ca=Pc>>2;l[ca]=Gf;Ic=Xg+4|0;ba=Ic>>2;l[ba]=Hf;var qh=b+228|0,fc=qh|0;Z=fc>>2;l[Z]=Gf;hd=qh+4|0;na=hd>>2;l[na]=Hf;var Qi=Fb,Ri=b+236|0,Zc=Qi|0;S=Zc>>2;var Ij=l[S],Md=Qi+4|0;T=Md>>2;var ci=l[T],zd=Ri|0;R=zd>>2;l[R]=Ij;ee=Ri+4|0;O=ee>>2;l[O]=ci;break a}c[b+248|0]=1;Ff=b+212|0}while(0);var di=Fb,Pk=Ff,Tc=di|0;ya=Tc>>2;var wn=l[ya],bc=di+4|0;ia=bc>>2;var Jj=l[ia],xc=Pk|0;Ca=xc>>2;l[Ca]=wn;Ac=Pk+4|0;la=Ac>>2;l[la]=Jj;var Kj=-q[aa],Si=b+228|0,Ti=(M[0]=-q[ra],t[0]),Qk=(M[0]=Kj,t[0])|0,Sd=Si|0;sa=Sd>>2;l[sa]=0|Ti;Ud=Si+4|0;ea=Ud>>2;l[ea]=Qk;var Ke=b+204|0,Lj=b+236|0,ei=Ke|0,Rk=l[ei>>2],Ui=Ke+4|0,Sk=l[Ui>>2],Xf=Lj|0;l[Xf>>2]=Rk;Yf=Lj+4|0;l[Yf>>2]=Sk}else{do{if(qf){var Vi=0<=fd;c[b+248|0]=Vi&1;var Mj=b+212|0;if(!Vi){var Nj=Mj;break}var Oj=Fb,ag=Mj,se=Oj|0;L=se>>2;var fi=o[L],fe=Oj+4|0;J=fe>>2;var If=o[J],ue=ag|0;I=ue>>2;l[I]=fi;ge=ag+4|0;F=ge>>2;l[F]=If;var Wi=b+228|0,Tk=-(t[0]=fi,M[0]),Pj=Wi,Uk=(M[0]=Tk,t[0]),Vk=(M[0]=Qb,t[0])|0,Xi=Pj|0;l[Xi>>2]=0|Uk;var gi=Pj+4|0;l[gi>>2]=Vk;var Qj=b+236|0,Zf=Qj|0;E=Zf>>2;l[E]=fi;Ve=Qj+4|0;D=Ve>>2;l[D]=If;break a}c[b+248|0]=0;Nj=b+212|0}while(0);var Rj=Nj,Sj=(M[0]=-mb,t[0]),Zg=(M[0]=Qb,t[0])|0,Uc=Rj|0;$=Uc>>2;l[$]=0|Sj;lc=Rj+4|0;Q=lc>>2;l[Q]=Zg;var Wk=-q[pa+52],Yi=b+228|0,Xk=(M[0]=-q[pa+51],t[0]),Yk=(M[0]=Wk,t[0])|0,ei=Yi|0;l[ei>>2]=0|Xk;Ui=Yi+4|0;l[Ui>>2]=Yk;var Zi=Fb,Tj=b+236|0,hi=l[Zi>>2],Zk=l[Zi+4>>2],ff=Tj|0;l[ff>>2]=hi;pf=Tj+4|0;l[pf>>2]=Zk}}else{c[b+248|0]=qf&1;var $i=b+212|0;if(qf){var $k=Fb,aj=$i,se=$k|0;L=se>>2;var ii=o[L],fe=$k+4|0;J=fe>>2;var al=l[J],ue=aj|0;I=ue>>2;l[I]=ii;ge=aj+4|0;F=ge>>2;l[F]=al;var bj=b+228|0,Uj=-(t[0]=ii,M[0]),Vj=bj,ji=(M[0]=Uj,t[0]),om=(M[0]=Qb,t[0]),pm=0|ji,bl=om|0,Xi=Vj|0;l[Xi>>2]=pm;gi=Vj+4|0;l[gi>>2]=bl;var bg=b+236|0,Zf=bg|0;E=Zf>>2;l[E]=pm;Ve=bg+4|0;D=Ve>>2;l[D]=bl}else{var ki=$i,cl=(M[0]=-mb,t[0]),qm=(M[0]=Qb,t[0])|0,Pc=ki|0;ca=Pc>>2;l[ca]=0|cl;Ic=ki+4|0;ba=Ic>>2;l[ba]=qm;var cj=Fb,Wj=b+228|0,Fc=cj|0;oa=Fc>>2;var Le=l[oa],Qc=cj+4|0;Ba=Qc>>2;var dl=l[Ba],nf=Wj|0;H=nf>>2;l[H]=Le;he=Wj+4|0;G=he>>2;l[G]=dl;var Xj=b+236|0,zd=Xj|0;R=zd>>2;l[R]=Le;ee=Xj+4|0;O=ee>>2;l[O]=dl}}}}}while(0);A=(g+148|0)>>2;var el=l[A];y=(b+128|0)>>2;l[y]=el;var Yj=0<(l[A]|0);a:do{if(Yj){for(var Jf=0;;){var fl=q[ua],dj=q[((Jf<<3)+20>>2)+Pa],Zj=q[X],gl=q[((Jf<<3)+24>>2)+Pa],rm=Zj*dj+fl*gl+q[ha],ej=(Jf<<3)+b|0,hl=(M[0]=fl*dj-Zj*gl+q[za],t[0]),$g=(M[0]=rm,t[0])|0,zd=ej|0;R=zd>>2;l[R]=0|hl;ee=ej+4|0;O=ee>>2;l[O]=$g;var il=q[ua],jl=q[((Jf<<3)+84>>2)+Pa],$j=q[X],ak=q[((Jf<<3)+88>>2)+Pa],kl=$j*jl+il*ak,ll=(Jf<<3)+b+64|0,ml=(M[0]=il*jl-$j*ak,t[0]),rh=(M[0]=kl,t[0])|0,Da=ll|0;l[Da>>2]=0|ml;Na=ll+4|0;l[Na>>2]=rh;var nl=Jf+1|0;if((nl|0)>=(l[A]|0)){break a}Jf=nl}}}while(0);x=(b+244|0)>>2;q[x]=.019999999552965164;var li=d+60|0;l[li>>2]=0;var sh=b+248|0,ah=l[y],bk=0<(ah|0);a:do{if(bk){for(var ol=q[pa+41],sm=q[Ob>>2],ck=q[pa+53],fj=q[pa+54],th=0,cg=3.4028234663852886e+38;;){var dk=ck*(q[(th<<3>>2)+pa]-ol)+fj*(q[((th<<3)+4>>2)+pa]-sm),mi=dk<cg?dk:cg,gj=th+1|0;if((gj|0)==(ah|0)){var bh=mi;break a}th=gj;cg=mi}}else{bh=3.4028234663852886e+38}}while(0);var ek=bh>q[x];a:do{if(!ek){var hj=cb,Ag=b,fk=Ha,pl=Ha,ql=Ha,uh=Ag>>2,ij=Ha,ql=(hj|0)>>2;l[ql]=0;pl=(hj+4|0)>>2;l[pl]=-1;fk=(hj+8|0)>>2;q[fk]=-3.4028234663852886e+38;for(var tm=q[uh+54],um=q[uh+53],pq=l[uh+32],qq=Ag+164|0,Bt=Ag+168|0,xn=Ag+172|0,rq=Ag+176|0,sq=Ag+244|0,tq=Ag+228|0,Ct=Ag+232|0,Dt=Ag+236|0,uq=Ag+240|0,je=0,rl=-3.4028234663852886e+38;(je|0)<(pq|0);){var yn=q[((je<<3)+64>>2)+uh],gk=-yn,jj=-q[((je<<3)+68>>2)+uh],zn=q[(je<<3>>2)+uh],An=q[((je<<3)+4>>2)+uh],vq=(zn-q[qq>>2])*gk+(An-q[Bt>>2])*jj,wq=(zn-q[xn>>2])*gk+(An-q[rq>>2])*jj,sl=vq<wq?vq:wq;if(sl>q[sq>>2]){l[ql]=2;l[pl]=je;q[fk]=sl;break}if(0>yn*tm+um*jj){if(-.03490658849477768<=(gk-q[tq>>2])*um+(jj-q[Ct>>2])*tm&sl>rl){ij=9}else{var Bn=rl,ij=10}}else{-.03490658849477768<=(gk-q[Dt>>2])*um+(jj-q[uq>>2])*tm&sl>rl?ij=9:(Bn=rl,ij=10)}9==ij&&(l[ql]=2,l[pl]=je,Bn=q[fk]=sl);je=je+1|0;rl=Bn}var Cn=l[Aa],Et=0==(Cn|0);do{if(Et){Qa=75}else{var vm=q[Aa+2];if(vm>q[x]){break a}if(vm>.9800000190734863*bh+.0010000000474974513){var hk=o[Aa+1],ik=d+56|0;if(1==(Cn|0)){var Dn=ik;Qa=77}else{l[ik>>2]=2;var tl=Ta,se=ub|0;L=se>>2;var ul=l[L],fe=ub+4|0;J=fe>>2;var vl=l[J],ue=tl|0;I=ue>>2;l[I]=ul;ge=tl+4|0;F=ge>>2;l[F]=vl;var Bg=Ta+8|0,kj=Bg;c[Bg]=0;var ni=hk&255;c[kj+1|0]=ni;c[kj+2|0]=0;c[kj+3|0]=1;var lj=Ta+12|0,nf=yb|0;H=nf>>2;var mj=l[H],he=yb+4|0;G=he>>2;var jk=l[G],Sd=lj|0;sa=Sd>>2;l[sa]=mj;Ud=lj+4|0;ea=Ud>>2;l[ea]=jk;var kk=Ta+20|0,nj=kk;c[kk]=0;c[nj+1|0]=ni;c[nj+2|0]=0;c[nj+3|0]=1;var wl=hk+1|0,lk=(wl|0)<(l[y]|0)?wl:0,mk=(hk<<3)+b|0,wm=l[mk>>2],xl=l[mk+4>>2],nk=(lk<<3)+b|0,ok=l[nk>>2],oi=l[nk+4>>2],vh=(hk<<3)+b+64|0,pk=l[vh>>2],qk=l[vh+4>>2],yl=lk&255,zl=(t[0]=ul,M[0]),Al=(t[0]=vl,M[0]),xm=(t[0]=mj,M[0]),Bl=(t[0]=jk,M[0]),wh=hk,oj=yl,xh=wm,pi=xl,pj=ok,qj=oi,rj=pk,qi=qk,sj=xm,Cg=zl,rk=Bl,yh=Al,sk=ni,zh=0;Qa=84}}else{Qa=75}}}while(0);75==Qa&&(Dn=d+56|0,Qa=77);if(77==Qa){l[Dn>>2]=1;var tj=l[y],ym=1<(tj|0);b:do{if(ym){for(var tk=q[pa+54],dg=q[pa+53],Cl=0,eg=dg*q[pa+16]+tk*q[pa+17],Xe=1;;){var zm=dg*q[((Xe<<3)+64>>2)+pa]+tk*q[((Xe<<3)+68>>2)+pa],Am=zm<eg,ri=Am?Xe:Cl,Ft=Am?zm:eg,En=Xe+1|0;if((En|0)>=(tj|0)){var Dl=ri;break b}Cl=ri;eg=Ft;Xe=En}}else{Dl=0}}while(0);var xq=Dl+1|0,El=(xq|0)<(tj|0)?xq:0,Fn=(Dl<<3)+b|0,yq=Ta,xc=Fn|0;Ca=xc>>2;var Fl=l[Ca],Ac=Fn+4|0;la=Ac>>2;var Gn=l[la];l[yq>>2]=Fl;l[yq+4>>2]=Gn;var Hn=Ta+8|0,Gl=Hn;c[Hn]=0;var In=Dl&255;c[Gl+1|0]=In;c[Gl+2|0]=1;c[Gl+3|0]=0;var Hl=(El<<3)+b|0,Jn=Ta+12|0,Kn=l[Hl>>2],zq=l[Hl+4>>2];l[Jn>>2]=Kn;l[Jn+4>>2]=zq;var Aq=Ta+20|0,Ln=Aq;c[Aq]=0;c[Ln+1|0]=El&255;c[Ln+2|0]=1;c[Ln+3|0]=0;var Gt=0==(c[sh]&1)<<24>>24,Ht=(t[0]=Fl,M[0]),It=(t[0]=Gn,M[0]),Jt=(t[0]=Kn,M[0]),Kt=(t[0]=zq,M[0]);if(Gt){var Mn=yb|0,Nn=yb+4|0,Lt=l[Mn>>2],Mt=l[Nn>>2],On=ub|0,Pn=ub+4|0,Bq=l[On>>2],Cq=l[Pn>>2],Nt=-q[aa],Ot=(M[0]=-q[ra],t[0]),Pt=(M[0]=Nt,t[0]),wh=1,oj=0,xh=Lt,pi=Mt,pj=Bq,qj=Cq,rj=Ot,qi=Pt}else{var Mn=ub|0,Nn=ub+4|0,On=yb|0,Pn=yb+4|0,Dq=Fb,wh=0,oj=1,xh=l[Mn>>2],pi=l[Nn>>2],pj=l[On>>2],qj=l[Pn>>2],rj=l[Dq>>2],qi=l[Dq+4>>2]}sj=Jt;Cg=Ht;rk=Kt;yh=It;sk=In;zh=1}var Il=(t[0]=xh,M[0]),Jl=(t[0]=pi,M[0]),Qt=(t[0]=qj,M[0]),si=(t[0]=rj,M[0]),ti=(t[0]=qi,M[0]),Qn=-si,Eq=ti*Il+Jl*Qn,Rt=si*Qt,St=(t[0]=pj,M[0]),Rn=-ti,Me=St*Rn+Rt,Vd=ti*Cg+yh*Qn-Eq,Sn=Ta+12|0,uj=ti*sj+rk*Qn-Eq;if(0<Vd){var Kl=0}else{w=$a>>2,r=Ta>>2,l[w]=l[r],l[w+1]=l[r+1],l[w+2]=l[r+2],Kl=1}if(0<uj){var uk=Kl}else{u=($a+12*Kl|0)>>2,p=Sn>>2,l[u]=l[p],l[u+1]=l[p+1],l[u+2]=l[p+2],uk=Kl+1|0}if(0>Vd*uj){var Cd=Vd/(Vd-uj),ve=yh+(rk-yh)*Cd,Tn=$a+12*uk|0,Fq=(M[0]=Cg+(sj-Cg)*Cd,t[0]),Gq=(M[0]=ve,t[0])|0,We=Tn|0;z=We>>2;l[z]=0|Fq;ef=Tn+4|0;C=ef>>2;l[C]=Gq;var Un=$a+12*uk+8|0,Bm=Un;c[Un]=wh&255;c[Bm+1|0]=sk;c[Bm+2|0]=0;c[Bm+3|0]=1;var Vn=uk+1|0}else{Vn=uk}if(2<=(Vn|0)){var Cm=q[fa],Dm=q[fa+1],Ll=Cm*Rn+si*Dm-Me,Em=$a+12|0,Hq=q[Em>>2],Iq=q[fa+4],Fm=Hq*Rn+si*Iq-Me;if(0<Ll){var Gm=0}else{n=va>>2,m=$a>>2,l[n]=l[m],l[n+1]=l[m+1],l[n+2]=l[m+2],Gm=1}if(0<Fm){var Ml=Gm}else{k=(va+12*Gm|0)>>2,j=Em>>2,l[k]=l[j],l[k+1]=l[j+1],l[k+2]=l[j+2],Ml=Gm+1|0}if(0>Ll*Fm){var Jq=Ll/(Ll-Fm),Tt=Dm+(Iq-Dm)*Jq,Kq=va+12*Ml|0,Ut=(M[0]=Cm+(Hq-Cm)*Jq,t[0]),Vt=(M[0]=Tt,t[0])|0,We=Kq|0;z=We>>2;l[z]=0|Ut;ef=Kq+4|0;C=ef>>2;l[C]=Vt;var Hm=va+12*Ml+8|0,Im=Hm;c[Hm]=oj;c[Im+1|0]=c[$a+9|0];c[Im+2|0]=0;c[Im+3|0]=1;var Wn=Ml+1|0}else{Wn=Ml}if(2<=(Wn|0)){var Xn=d+40|0;if(zh){var Yn=Xn;l[Yn>>2]=0|rj;l[Yn+4>>2]=qi|0;var Zn=d+48|0,nf=Zn|0;H=nf>>2;l[H]=0|xh;he=Zn+4|0;G=he>>2;l[G]=pi|0;var $n=q[da],Jm=q[da+1],Km=q[x];if(si*($n-Il)+ti*(Jm-Jl)>Km){var vk=0,ao=Km}else{var Nl=$n-q[za],Lm=Jm-q[ha],bo=q[ua],co=q[X],Lq=Nl*-co+bo*Lm,Mq=d,Wt=(M[0]=bo*Nl+co*Lm,t[0]),Nq=(M[0]=Lq,t[0])|0,bd=Mq|0;Ia=bd>>2;l[Ia]=0|Wt;rd=Mq+4|0;ta=rd>>2;l[ta]=Nq;l[d+16>>2]=l[da+2];vk=1;ao=q[x]}var eo=q[da+3],ui=q[da+4];if(si*(eo-Il)+ti*(ui-Jl)>ao){var ch=vk}else{var Ol=eo-q[za],fo=ui-q[ha],Mm=q[ua],Nm=q[X],go=Ol*-Nm+Mm*fo,ho=d+20*vk|0,io=(M[0]=Mm*Ol+Nm*fo,t[0]),Oq=(M[0]=go,t[0])|0,Zc=ho|0;S=Zc>>2;l[S]=0|io;Md=ho+4|0;T=Md>>2;l[T]=Oq;l[(d+16>>2)+(5*vk|0)]=l[da+5];ch=vk+1|0}}else{var Pq=(wh<<3)+g+84|0,Pl=Xn,Tc=Pq|0;ya=Tc>>2;var Xt=l[ya],bc=Pq+4|0;ia=bc>>2;var Yt=l[ia],xc=Pl|0;Ca=xc>>2;l[Ca]=Xt;Ac=Pl+4|0;la=Ac>>2;l[la]=Yt;var Om=(wh<<3)+g+20|0,Pm=d+48|0,cd=Om|0;qa=cd>>2;var Qq=l[qa],kc=Om+4|0;ga=kc>>2;var jo=l[ga],Fc=Pm|0;oa=Fc>>2;l[oa]=Qq;Qc=Pm+4|0;Ba=Qc>>2;l[Ba]=jo;var Ql=q[x];if(si*(q[da]-Il)+ti*(q[da+1]-Jl)>Ql){var wk=0,Qm=Ql}else{var ko=va,lo=d,se=ko|0;L=se>>2;var Rq=l[L],fe=ko+4|0;J=fe>>2;var Zt=l[J],ue=lo|0;I=ue>>2;l[I]=Rq;ge=lo+4|0;F=ge>>2;l[F]=Zt;var Sq=va+8|0,Rm=Sq,mo=d+16|0,xk=mo;c[xk+2|0]=c[Rm+3|0];c[xk+3|0]=c[Rm+2|0];c[mo]=c[Rm+1|0];c[xk+1|0]=c[Sq];wk=1;Qm=q[x]}var no=va+12|0;if(si*(q[no>>2]-Il)+ti*(q[da+4]-Jl)>Qm){ch=wk}else{var Sm=no,oo=d+20*wk|0,Tc=Sm|0;ya=Tc>>2;var po=l[ya],bc=Sm+4|0;ia=bc>>2;var Tq=l[ia],xc=oo|0;Ca=xc>>2;l[Ca]=po;Ac=oo+4|0;la=Ac>>2;l[la]=Tq;var qo=va+20|0,Tm=qo,Uq=d+20*wk+16|0,yk=Uq;c[yk+2|0]=c[Tm+3|0];c[yk+3|0]=c[Tm+2|0];c[Uq]=c[Tm+1|0];c[yk+1|0]=c[qo];ch=wk+1|0}}l[li>>2]=ch}}}}while(0);a=cb}function Hh(b,d,e,f,g){var h=d>>2,j=l[h+37],k=q[g+12>>2],m=q[f+12>>2],n=q[g+8>>2],p=q[f+16>>2],u=q[e+12>>2],r=q[h+3],w=q[e+8>>2],x=q[h+4],y=k*m-n*p+q[g>>2]-(u*r-w*x+q[e>>2]),m=n*m+k*p+q[g+4>>2]-(w*r+u*x+q[e+4>>2]),k=u*y+w*m,u=y*-w+u*m,w=0<(j|0);a:do{if(w){y=0;m=-3.4028234663852886e+38;for(n=0;;){if(p=q[((n<<3)+84>>2)+h]*k+q[((n<<3)+88>>2)+h]*u,y=(r=p>m)?n:y,m=r?p:m,n=n+1|0,(n|0)==(j|0)){var A=y;break a}}}else{A=0}}while(0);h=Fi(d,e,A,f,g);k=(0<(A|0)?A:j)-1|0;u=Fi(d,e,k,f,g);w=A+1|0;w=(w|0)<(j|0)?w:0;y=Fi(d,e,w,f,g);m=u>h&u>y;a:do{if(m){n=u;for(p=k;;){r=(0<(p|0)?p:j)-1|0;x=Fi(d,e,r,f,g);if(x<=n){var C=n,z=p;break a}n=x;p=r}}else{if(y>h){n=y;for(p=w;;){r=p+1|0;r=(r|0)<(j|0)?r:0;x=Fi(d,e,r,f,g);if(x<=n){C=n;z=p;break a}n=x;p=r}}else{C=h,z=A}}}while(0);l[b>>2]=z;return C}function Fi(b,d,e,f,g){var f=f>>2,h=b>>2,j=l[f+37];4==(-1<(e|0)?(l[h+37]|0)>(e|0)?5:4:4)&&P(N.Ib|0,32,N.ke|0,N.Eb|0);var b=q[d+12>>2],k=q[((e<<3)+84>>2)+h],m=q[d+8>>2],n=q[((e<<3)+88>>2)+h],p=b*k-m*n,k=m*k+b*n,n=q[g+12>>2],u=q[g+8>>2],r=n*p+u*k,w=p*-u+n*k,x=0<(j|0);a:do{if(x){for(var y=0,A=3.4028234663852886e+38,C=0;;){var z=q[((C<<3)+20>>2)+f]*r+q[((C<<3)+24>>2)+f]*w,D=z<A,y=D?C:y,A=D?z:A,C=C+1|0;if((C|0)==(j|0)){var E=y;break a}}}else{E=0}}while(0);j=q[((e<<3)+20>>2)+h];e=q[((e<<3)+24>>2)+h];h=q[((E<<3)+20>>2)+f];E=q[((E<<3)+24>>2)+f];return(n*h-u*E+q[g>>2]-(b*j-m*e+q[d>>2]))*p+(u*h+n*E+q[g+4>>2]-(m*j+b*e+q[d+4>>2]))*k}function Gi(b,d,e,f,g,h){var j,k=g>>2,m=e>>2,n=d>>2;j=(d+60|0)>>2;var p=0==(l[j]|0);a:do{if(!p){var u=l[n+14];if(0==(u|0)){var r=b|0;q[r>>2]=1;var w=b+4|0;q[w>>2]=0;var x=q[m+3],y=q[n+12],A=q[m+2],C=q[n+13],z=x*y-A*C+q[m],D=A*y+x*C+q[m+1],E=q[k+3],G=q[n],H=q[k+2],F=q[n+1],I=E*G-H*F+q[k],J=H*G+E*F+q[k+1],L=z-I,O=D-J;if(1.4210854715202004e-14<L*L+O*O){var R=I-z,T=J-D,S=b,U=(M[0]=R,t[0]),W=(M[0]=T,t[0])|0;l[S>>2]=0|U;l[S+4>>2]=W;var Q=Fh(R*R+T*T);if(1.1920928955078125e-7>Q){var $=R,ea=T}else{var sa=1/Q,Ba=R*sa;q[r>>2]=Ba;var oa=T*sa;q[w>>2]=oa;$=Ba;ea=oa}}else{$=1,ea=0}var ga=.5*(D+ea*f+(J-ea*h)),qa=b+8|0,la=(M[0]=.5*(z+$*f+(I-$*h)),t[0]),Ca=(M[0]=ga,t[0])|0;l[qa>>2]=0|la;l[qa+4>>2]=Ca}else{if(1==(u|0)){var ia=e+12|0,ya=q[ia>>2],ta=q[n+10],Ia=e+8|0,na=q[Ia>>2],Z=q[n+11],ba=ya*ta-na*Z,ca=na*ta+ya*Z,ma=b,ka=(M[0]=ba,t[0]),aa=(M[0]=ca,t[0])|0,ra=ma|0;l[ra>>2]=0|ka;var ha=ma+4|0;l[ha>>2]=aa;var za=q[ia>>2],X=q[n+12],ua=q[Ia>>2],da=q[n+13],fa=za*X-ua*da+q[m],Aa=ua*X+za*da+q[m+1];if(0<(l[j]|0)){for(var Pa=g+12|0,pa=g+8|0,cb=g|0,Qa=g+4|0,Ta=b|0,$a=b+4|0,va=0,Wa=ba,fb=ca;;){var gb=q[Pa>>2],Xa=q[n+(5*va|0)],Ua=q[pa>>2],Va=q[n+(5*va|0)+1],pb=gb*Xa-Ua*Va+q[cb>>2],nb=Ua*Xa+gb*Va+q[Qa>>2],La=f-((pb-fa)*Wa+(nb-Aa)*fb),qb=.5*(nb+fb*La+(nb-fb*h)),bb=(va<<3)+b+8|0,Fa=(M[0]=.5*(pb+Wa*La+(pb-Wa*h)),t[0]),Ma=(M[0]=qb,t[0])|0,wa=bb|0;l[wa>>2]=0|Fa;var hb=bb+4|0;l[hb>>2]=Ma;var Ya=va+1|0;if((Ya|0)>=(l[j]|0)){break a}va=Ya;Wa=q[Ta>>2];fb=q[$a>>2]}}}else{if(2==(u|0)){var Za=g+12|0,Da=q[Za>>2],Na=q[n+10],ib=g+8|0,ab=q[ib>>2],Ga=q[n+11],jb=Da*Na-ab*Ga,Ea=ab*Na+Da*Ga,Oa=b,Ja=(M[0]=jb,t[0]),db=(M[0]=Ea,t[0])|0,ra=Oa|0;l[ra>>2]=0|Ja;ha=Oa+4|0;l[ha>>2]=db;var xa=q[Za>>2],Ra=q[n+12],Ka=q[ib>>2],tb=q[n+13],kb=xa*Ra-Ka*tb+q[k],ub=Ka*Ra+xa*tb+q[k+1],rb=0<(l[j]|0);b:do{if(rb){for(var Bb=e+12|0,lb=e+8|0,yb=e|0,xb=e+4|0,Ib=b|0,wb=b+4|0,vb=0,zb=jb,Eb=Ea;;){var Cb=q[Bb>>2],eb=q[n+(5*vb|0)],sb=q[lb>>2],ob=q[n+(5*vb|0)+1],Db=Cb*eb-sb*ob+q[yb>>2],Jb=sb*eb+Cb*ob+q[xb>>2],Rb=h-((Db-kb)*zb+(Jb-ub)*Eb),Nb=.5*(Jb-Eb*f+Jb+Eb*Rb),Ob=(vb<<3)+b+8|0,Kb=(M[0]=.5*(Db-zb*f+Db+zb*Rb),t[0]),Pb=(M[0]=Nb,t[0])|0,wa=Ob|0;l[wa>>2]=0|Kb;hb=Ob+4|0;l[hb>>2]=Pb;var Mb=vb+1|0,Yb=q[Ib>>2],Zb=q[wb>>2];if((Mb|0)>=(l[j]|0)){var ec=Yb,Ub=Zb;break b}vb=Mb;zb=Yb;Eb=Zb}}else{ec=jb,Ub=Ea}}while(0);var jc=(M[0]=-ec,t[0]),Qb=(M[0]=-Ub,t[0])|0;l[Oa>>2]=0|jc;l[Oa+4>>2]=Qb}}}}}while(0)}function Hi(b,d,e){var f=d>>2,g=b>>2,h,j=l[f+1];if(0==(j|0)){l[g+4]=d+12|0,l[g+5]=1,q[g+6]=q[f+2]}else{if(2==(j|0)){l[g+4]=d+20|0,l[g+5]=l[f+37],q[g+6]=q[f+2]}else{if(3==(j|0)){j=d+16|0;h=-1<(e|0)?(l[j>>2]|0)>(e|0)?8:7:7;7==h&&P(N.s|0,53,N.ob|0,N.Gf|0);d=d+12|0;h=(e<<3)+l[d>>2]|0;var k=l[(h+4|0)>>2];l[b>>2]=l[(h|0)>>2];l[b+4>>2]=k;h=e+1|0;e=b+8|0;d=l[d>>2];(h|0)<(l[j>>2]|0)?(d=(h<<3)+d|0,j=l[d>>2],d=l[d+4>>2],l[(e|0)>>2]=j,l[(e+4|0)>>2]=d):(j=l[d+4>>2],l[e>>2]=l[d>>2],l[e+4>>2]=j);l[g+4]=b|0;l[g+5]=2;q[g+6]=q[f+2]}else{1==(j|0)?(l[g+4]=d+12|0,l[g+5]=2,q[g+6]=q[f+2]):P(N.s|0,81,N.ob|0,N.l|0)}}}}function Bj(b,d,e){var f,g,h,j,k,m,n,p,u,r,w,x,y,A,C,z,D,E=a;a+=168;var G,H=E+16,F=E+32,I=E+144,J=E+156;l[Cj>>2]=l[Cj>>2]+1|0;var L=e|0,O=e+28|0;D=E>>2;z=(e+56|0)>>2;l[D]=l[z];l[D+1]=l[z+1];l[D+2]=l[z+2];l[D+3]=l[z+3];C=H>>2;A=(e+72|0)>>2;l[C]=l[A];l[C+1]=l[A+1];l[C+2]=l[A+2];l[C+3]=l[A+3];var R,T,S,U,W=F>>2,Q,$=d+4|0,ea=jd[$>>1];if(4>(ea&65535)){var sa=ea}else{P(N.s|0,102,N.Fe|0,N.gh|0),sa=i[$>>1]}var Ba=sa&65535;U=(F+108|0)>>2;l[U]=Ba;var oa=F|0;S=oa>>2;var ga=0==sa<<16>>16;a:do{if(ga){var qa=Ba}else{for(var la=L+20|0,Ca=L+16|0,ia=O+20|0,ya=O+16|0,ta=E+12|0,Ia=E+8|0,na=E|0,Z=E+4|0,ba=H+12|0,ca=H+8|0,ma=H|0,ka=H+4|0,aa=0;;){var ra=oa+36*aa|0,ha=ed[d+(aa+6)|0]&255;l[S+(9*aa|0)+7]=ha;var za=ed[d+(aa+9)|0]&255,X=oa+36*aa+32|0;l[X>>2]=za;if((l[la>>2]|0)>(ha|0)){var ua=za}else{P(N.i|0,103,N.h|0,N.j|0),ua=l[X>>2]}var da=(ha<<3)+l[Ca>>2]|0,fa=l[da+4>>2],Aa=(t[0]=l[da>>2],M[0]),Pa=(t[0]=fa,M[0]);Q=-1<(ua|0)?(l[ia>>2]|0)>(ua|0)?11:10:10;10==Q&&P(N.i|0,103,N.h|0,N.j|0);var pa=(ua<<3)+l[ya>>2]|0,cb=pa|0;T=cb>>2;var Qa=pa+4|0;R=Qa>>2;var Ta=l[R],$a=(t[0]=l[T],M[0]),va=(t[0]=Ta,M[0]),Wa=q[ta>>2],fb=q[Ia>>2],gb=Wa*Aa-fb*Pa+q[na>>2],Xa=fb*Aa+Wa*Pa+q[Z>>2],Ua=ra,Va=(M[0]=gb,t[0]),pb=(M[0]=Xa,t[0])|0;l[Ua>>2]=0|Va;l[Ua+4>>2]=pb;var nb=q[ba>>2],La=q[ca>>2],qb=nb*$a-La*va+q[ma>>2],bb=La*$a+nb*va+q[ka>>2],Fa=oa+36*aa+8|0,Ma=(M[0]=qb,t[0]),wa=(M[0]=bb,t[0])|0;l[Fa>>2]=0|Ma;l[Fa+4>>2]=wa;var hb=q[S+(9*aa|0)+3]-q[S+(9*aa|0)+1],Ya=oa+36*aa+16|0,Za=(M[0]=qb-gb,t[0]),Da=(M[0]=hb,t[0])|0;l[Ya>>2]=0|Za;l[Ya+4>>2]=Da;q[S+(9*aa|0)+6]=0;var Na=aa+1|0,ib=l[U];if((Na|0)>=(ib|0)){qa=ib;break a}aa=Na}}}while(0);var ab=1<(qa|0);a:do{if(ab){var Ga=q[d>>2];if(2==(qa|0)){var jb=q[W+4]-q[W+13],Ea=q[W+5]-q[W+14],Oa=Fh(jb*jb+Ea*Ea)}else{if(3==(qa|0)){var Ja=q[W+4],db=q[W+5],Oa=(q[W+13]-Ja)*(q[W+23]-db)-(q[W+14]-db)*(q[W+22]-Ja)}else{P(N.s|0,259,N.Ma|0,N.l|0),Oa=0}}var xa=Oa<.5*Ga;do{if(!xa&&!(2*Ga<Oa|1.1920928955078125e-7>Oa)){var Ra=l[U];Q=21;break a}}while(0);l[U]=0;Q=22}else{Ra=qa,Q=21}}while(0);21==Q&&(Q=0==(Ra|0)?22:27);if(22==Q){l[W+7]=0;l[W+8]=0;0<(l[L+20>>2]|0)||P(N.i|0,103,N.h|0,N.j|0);var Ka=l[L+16>>2],cb=Ka|0;T=cb>>2;Qa=Ka+4|0;R=Qa>>2;var tb=l[R],kb=(t[0]=l[T],M[0]),ub=(t[0]=tb,M[0]);0<(l[O+20>>2]|0)||P(N.i|0,103,N.h|0,N.j|0);var rb=l[O+16>>2],cb=rb|0;T=cb>>2;Qa=rb+4|0;R=Qa>>2;var Bb=l[R],lb=(t[0]=l[T],M[0]),yb=(t[0]=Bb,M[0]),xb=q[E+12>>2],Ib=q[E+8>>2],wb=xb*kb-Ib*ub+q[E>>2],vb=Ib*kb+xb*ub+q[E+4>>2],zb=(M[0]=wb,t[0]),Eb=(M[0]=vb,t[0])|0;l[F>>2]=0|zb;l[F+4>>2]=Eb;var Cb=q[H+12>>2],eb=q[H+8>>2],sb=Cb*lb-eb*yb+q[H>>2],ob=eb*lb+Cb*yb+q[H+4>>2],Db=F+8|0,Jb=(M[0]=sb,t[0]),Rb=(M[0]=ob,t[0])|0;l[Db>>2]=0|Jb;l[Db+4>>2]=Rb;var Nb=ob-vb,Ob=F+16|0,Kb=(M[0]=sb-wb,t[0]),Pb=(M[0]=Nb,t[0])|0;l[Ob>>2]=0|Kb;l[Ob+4>>2]=Pb;l[U]=1}var Mb=F|0;y=Mb>>2;x=(F+108|0)>>2;var Yb=l[x];0==(Yb|0)?P(N.s|0,194,N.oa|0,N.l|0):1==(Yb|0)||2==(Yb|0)||3==(Yb|0)||P(N.s|0,207,N.oa|0,N.l|0);var Zb=E+12|0,ec=E+8|0,Ub=e+16|0,jc=e+20|0,Qb=E|0,mb=E+4|0,cc=H+12|0,Fb=H+8|0,gc=e+44|0,vc=e+48|0,pc=H|0,qc=H+4|0;w=(F+16|0)>>2;r=(F+20|0)>>2;u=(F+52|0)>>2;p=(F+56|0)>>2;var $c=F+16|0,Ec=F+52|0,sc=F+24|0,kd=F+60|0,wd=F+36|0,Lc=0;a:for(;;){if(20<=(Lc|0)){var $b=Lc;break}var ac=o[x],oc=0<(ac|0);b:do{if(oc){for(var tc=0;;){l[I+(tc<<2)>>2]=l[y+(9*tc|0)+7];l[J+(tc<<2)>>2]=l[y+(9*tc|0)+8];var Nc=tc+1|0;if((Nc|0)==(ac|0)){break b}tc=Nc}}else{G=9}}while(0);if(1==(ac|0)){G=20}else{if(2==(ac|0)){var ld=l[$c+4>>2],Wc=(t[0]=l[$c>>2],M[0]),ad=(t[0]=ld,M[0]),Xc=l[Ec+4>>2],Cc=(t[0]=l[Ec>>2],M[0]),fd=(t[0]=Xc,M[0]),md=Cc-Wc,nd=fd-ad,Oc=Wc*md+ad*nd,gd=-Oc;if(0>Oc){var od=Cc*md+fd*nd;if(0<od){var pd=1/(od-Oc);q[sc>>2]=od*pd;q[kd>>2]=pd*gd;l[x]=2;var Pd=Cc,Xd=Wc;G=25}else{q[kd>>2]=1;l[x]=1;for(var qd=wd>>2,Qd=F>>2,Pc=qd+9;qd<Pc;qd++,Qd++){l[Qd]=l[qd]}G=17}}else{q[sc>>2]=1;l[x]=1;var Ic=Wc;G=24}}else{if(3==(ac|0)){var Jc=F,fc=Jc>>2,hd=Jc+16|0,xd=l[hd+4>>2],bd=(t[0]=l[hd>>2],M[0]),rd=(t[0]=xd,M[0]),ye=Jc+36|0,Yd=Jc+52|0,Tc=l[Yd+4>>2],wc=(t[0]=l[Yd>>2],M[0]),bc=(t[0]=Tc,M[0]),Ed=Jc+72|0,xc=Jc+88|0,Ac=l[xc+4>>2],Zd=(t[0]=l[xc>>2],M[0]),$d=(t[0]=Ac,M[0]),cd=wc-bd,yc=bc-rd,kc=bd*cd+rd*yc,Rd=wc*cd+bc*yc,Fc=-kc,Qc=Zd-bd,Mc=$d-rd,ne=bd*Qc+rd*Mc,Sd=Zd*Qc+$d*Mc,Td=-ne,Ud=Zd-wc,xf=$d-bc,Fd=wc*Ud+bc*xf,oe=Zd*Ud+$d*xf,He=-Fd,ae=cd*Mc-yc*Qc,Gc=ae*(wc*$d-bc*Zd),dd=ae*(Zd*rd-$d*bd),be=ae*(bd*bc-rd*wc);if(0>kc|0>ne){if(0<=kc|0>=Rd|0<be){if(0<=ne|0>=Sd|0<dd){if(0<Rd|0>Fd){if(0<Sd|0<oe){if(0<=Fd|0>=oe|0<Gc){var pe=1/(Gc+dd+be);q[fc+6]=Gc*pe;q[fc+15]=dd*pe;q[fc+24]=be*pe;l[fc+27]=3}else{var Uc=1/(oe-Fd);q[fc+15]=oe*Uc;q[fc+24]=Uc*He;l[fc+27]=2;for(var lc=Ed>>2,Gd=Jc>>2,Hd=lc+9;lc<Hd;lc++,Gd++){l[Gd]=l[lc]}}}else{q[fc+24]=1;l[fc+27]=1;lc=Ed>>2;Gd=Jc>>2;for(Hd=lc+9;lc<Hd;lc++,Gd++){l[Gd]=l[lc]}}}else{q[fc+15]=1;l[fc+27]=1;lc=ye>>2;Gd=Jc>>2;for(Hd=lc+9;lc<Hd;lc++,Gd++){l[Gd]=l[lc]}}}else{var Re=1/(Sd-ne);q[fc+6]=Sd*Re;q[fc+24]=Re*Td;l[fc+27]=2;lc=Ed>>2;Gd=ye>>2;for(Hd=lc+9;lc<Hd;lc++,Gd++){l[Gd]=l[lc]}}}else{var Id=1/(Rd-kc);q[fc+6]=Rd*Id;q[fc+15]=Id*Fc;l[fc+27]=2}}else{q[fc+6]=1,l[fc+27]=1}}else{P(N.s|0,498,N.he|0,N.l|0)}G=17}}do{if(17==G){var Jd=l[x];if(3==(Jd|0)){$b=Lc;break a}else{if(0==(Jd|0)){P(N.s|0,194,N.oa|0,N.l|0),G=20}else{if(1==(Jd|0)||2==(Jd|0)){var qe=Jd;G=21}else{P(N.s|0,207,N.oa|0,N.l|0),G=20}}}}}while(0);20==G&&(qe=l[x],G=21);if(21==G){if(1==(qe|0)){Ic=q[w],G=24}else{if(2==(qe|0)){Pd=q[u],Xd=q[w],G=25}else{P(N.s|0,184,N.Oe|0,N.l|0);var re=Dj,Kd=l[re+4>>2],Se=(t[0]=l[re>>2],M[0]),Rf=(t[0]=Kd,M[0]),sd=Se,Vc=Rf;G=29}}}if(24==G){sd=-Ic,Vc=-q[r]}else{if(25==G){var Te=Pd-Xd,Ue=q[r],ce=q[p]-Ue;0<Te*-Ue-ce*-Xd?(sd=-1*ce,Vc=Te):(sd=ce,Vc=-1*Te)}}if(1.4210854715202004e-14>sd*sd+Vc*Vc){$b=Lc;break}var Yc=o[x],yd=Mb+36*Yc|0,$e=-Vc,ze=q[Zb>>2],Zc=q[ec>>2],Ld=ze*-sd+Zc*$e,Md=sd*Zc+ze*$e,de=l[Ub>>2];n=de>>2;var zd=l[jc>>2],ee=1<(zd|0);do{if(ee){for(var yf=0,af=q[n]*Ld+q[n+1]*Md,Ie=1;;){var zf=q[(Ie<<3>>2)+n]*Ld+q[((Ie<<3)+4>>2)+n]*Md,jf=zf>af,bf=jf?Ie:yf,Sf=jf?zf:af,kf=Ie+1|0;if((kf|0)==(zd|0)){break}yf=bf;af=Sf;Ie=kf}var Ae=Mb+36*Yc+28|0;l[Ae>>2]=bf;var Ad=yd|0;if(-1<(bf|0)){ng=bf,og=Ae,pg=Ad,G=35}else{var Af=bf,Tf=Ae,Fg=Ad;G=36}}else{var Gg=Mb+36*Yc+28|0,ng=l[Gg>>2]=0,og=Gg,pg=yd|0;G=35}}while(0);if(35==G){if((zd|0)>(ng|0)){var Bf=ng,Uf=og,Vf=pg,Hg=de;G=37}else{Af=ng,Tf=og,Fg=pg,G=36}}36==G&&(P(N.i|0,103,N.h|0,N.j|0),Bf=Af,Uf=Tf,Vf=Fg,Hg=l[Ub>>2]);var Ih=q[Hg+(Bf<<3)>>2],Ig=q[Hg+(Bf<<3)+4>>2],Ej=Zc*Ih+ze*Ig+q[mb>>2],Ii=yd,qg=(M[0]=ze*Ih-Zc*Ig+q[Qb>>2],t[0]),Jh=(M[0]=Ej,t[0])|0,Wf=Ii|0;l[Wf>>2]=0|qg;var Kh=Ii+4|0;l[Kh>>2]=Jh;var lf=q[cc>>2],rg=q[Fb>>2],ih=lf*sd+rg*Vc,Lh=sd*-rg+lf*Vc,Be=l[gc>>2];m=Be>>2;var sg=l[vc>>2],se=1<(sg|0);do{if(se){for(var Jg=0,fe=q[m]*ih+q[m+1]*Lh,te=1;;){var ue=q[(te<<3>>2)+m]*ih+q[((te<<3)+4>>2)+m]*Lh,ge=ue>fe,mf=ge?te:Jg,Ji=ge?ue:fe,Kg=te+1|0;if((Kg|0)==(sg|0)){break}Jg=mf;fe=Ji;te=Kg}var tg=Mb+36*Yc+32|0;l[tg>>2]=mf;var jh=Mb+36*Yc+8|0;if(-1<(mf|0)){Lg=mf,Mg=tg,Hc=jh,G=42}else{var Mh=mf,ug=tg,Nh=jh;G=43}}else{var Oh=Mb+36*Yc+32|0,Lg=l[Oh>>2]=0,Mg=Oh,Hc=Mb+36*Yc+8|0;G=42}}while(0);if(42==G){if((sg|0)>(Lg|0)){var uc=Lg,Ki=Mg,Ph=Hc,Ng=Be;G=44}else{Mh=Lg,ug=Mg,Nh=Hc,G=43}}43==G&&(P(N.i|0,103,N.h|0,N.j|0),uc=Mh,Ki=ug,Ph=Nh,Ng=l[gc>>2]);var Og=q[Ng+(uc<<3)>>2],Pg=q[Ng+(uc<<3)+4>>2],Li=lf*Og-rg*Pg+q[pc>>2],Qh=rg*Og+lf*Pg+q[qc>>2],Qg=Ph,Rh=(M[0]=Li,t[0]),kh=(M[0]=Qh,t[0])|0,Wf=Qg|0;l[Wf>>2]=0|Rh;Kh=Qg+4|0;l[Kh>>2]=kh;var Sh=Qh-q[Vf+4>>2],Mi=Mb+36*Yc+16|0,nf=(M[0]=Li-q[Vf>>2],t[0]),he=(M[0]=Sh,t[0])|0;l[Mi>>2]=0|nf;l[Mi+4>>2]=he;var Bd=Lc+1|0;l[zk>>2]=l[zk>>2]+1|0;for(var cf=0;(cf|0)<(ac|0);){if((l[Uf>>2]|0)==(l[I+(cf<<2)>>2]|0)&&(l[Ki>>2]|0)==(l[J+(cf<<2)>>2]|0)){$b=Bd;break a}cf=cf+1|0}l[x]=l[x]+1|0;Lc=Bd}var vg=l[Lk>>2];l[Lk>>2]=(vg|0)>($b|0)?vg:$b;var Ce=b+8|0,Cf=b|0,td=F>>2,Rg=l[td+27];if(0==(Rg|0)){P(N.s|0,217,N.zb|0,N.l|0)}else{if(1==(Rg|0)){var Fj=l[F+4>>2];l[Cf>>2]=l[F>>2];l[Cf+4>>2]=Fj;var Th=F+8|0,Ni=l[Th+4>>2];l[Ce>>2]=l[Th>>2];l[Ce+4>>2]=Ni}else{if(2==(Rg|0)){var wg=F+24|0,Uh=q[wg>>2],Vh=F+60|0,Wh=q[Vh>>2],Xh=q[td+1]*Uh+q[td+10]*Wh,Gj=(M[0]=q[td]*Uh+q[td+9]*Wh,t[0]),Je=(M[0]=Xh,t[0])|0;l[Cf>>2]=0|Gj;l[Cf+4>>2]=Je;var Xf=q[wg>>2],Yf=q[Vh>>2],Yh=q[td+3]*Xf+q[td+12]*Yf,Sg=(M[0]=q[td+2]*Xf+q[td+11]*Yf,t[0]),lh=(M[0]=Yh,t[0])|0;l[Ce>>2]=0|Sg;l[Ce+4>>2]=lh}else{if(3==(Rg|0)){var Df=q[td+6],Zh=q[td+15],Tg=q[td+24],$h=q[td+1]*Df+q[td+10]*Zh+q[td+19]*Tg,xg=(M[0]=q[td]*Df+q[td+9]*Zh+q[td+18]*Tg,t[0]),Oi=(M[0]=$h,t[0]),df=0|xg,mh=Oi|0;l[Cf>>2]=df;l[Cf+4>>2]=mh;l[Ce>>2]=df;l[Ce+4>>2]=mh}else{P(N.s|0,236,N.zb|0,N.l|0)}}}}k=(b|0)>>2;j=(Ce|0)>>2;var nh=q[k]-q[j];h=(b+4|0)>>2;g=(b+12|0)>>2;var oh=q[h]-q[g],Zf=Fh(nh*nh+oh*oh);f=(b+16|0)>>2;q[f]=Zf;l[b+20>>2]=$b;var Ve=l[x];if(0==(Ve|0)){P(N.s|0,246,N.Ma|0,N.l|0);var of=0}else{if(1==(Ve|0)){of=0}else{if(2==(Ve|0)){var Ug=q[w]-q[u],ai=q[r]-q[p],of=Fh(Ug*Ug+ai*ai)}else{if(3==(Ve|0)){var Vg=q[w],Wg=q[r],of=(q[u]-Vg)*(q[F+92>>2]-Wg)-(q[p]-Wg)*(q[F+88>>2]-Vg)}else{P(N.s|0,259,N.Ma|0,N.l|0),of=0}}}}q[d>>2]=of;var We=l[x];i[d+4>>1]=We&65535;var Pi=0<(We|0);a:do{if(Pi){for(var ef=0;;){c[d+(ef+6)|0]=l[y+(9*ef|0)+7]&255;c[d+(ef+9)|0]=l[y+(9*ef|0)+8]&255;var Hj=ef+1|0;if((Hj|0)>=(We|0)){break a}ef=Hj}}}while(0);if(0!=(c[e+88|0]&1)<<24>>24){var $f=q[e+24>>2],Ef=q[e+52>>2],ph=q[f],bi=$f+Ef;if(ph>bi&1.1920928955078125e-7<ph){q[f]=ph-bi;var ff=q[j],pf=q[k],qf=ff-pf,yg=q[g],zg=q[h],Ff=yg-zg,Xg=Fh(qf*qf+Ff*Ff);if(1.1920928955078125e-7>Xg){var Yg=qf,ie=Ff}else{var Gf=1/Xg,Yg=qf*Gf,ie=Ff*Gf}var Hf=ie*$f;q[k]=pf+Yg*$f;q[h]=zg+Hf;var qh=ie*Ef;q[j]=ff-Yg*Ef;q[g]=yg-qh}else{var Qi=.5*(q[h]+q[g]),Ri=(M[0]=.5*(q[k]+q[j]),t[0]),Ij=(M[0]=Qi,t[0]),ci=0|Ri,di=Ij|0;l[b>>2]=ci;l[b+4>>2]=di;l[Ce>>2]=ci;l[Ce+4>>2]=di;q[f]=0}}a=E}function hh(b){var d,e,f,g;g=(b+16|0)>>2;var h=l[g];if(-1==(h|0)){h=b+8|0;f=h>>2;d=(b+12|0)>>2;e=l[d];if((l[f]|0)==(e|0)){var j=e}else{P(N.c|0,61,N.ne|0,N.cf|0),j=l[d]}b=b+4|0;e=b>>2;var k=l[e];l[d]=j<<1;j=Ne(72*j|0);l[e]=j;Ch(j,k,36*l[f]|0);Dh(k);var j=l[f],k=l[d]-1|0,m=(j|0)<(k|0);a:do{if(m){for(var n=j;;){var p=n+1|0;l[(l[e]+36*n+20|0)>>2]=p;l[(l[e]+36*n+32|0)>>2]=-1;n=l[d]-1|0;if((p|0)>=(n|0)){var u=n;break a}n=p}}else{u=k}}while(0);l[(l[e]+36*u+20|0)>>2]=-1;l[(l[e]+36*(l[d]-1)+32|0)>>2]=-1;u=l[f];l[g]=u;d=b>>2}else{u=h,d=(b+4|0)>>2,h=b+8|0}f=l[d]+36*u+20|0;l[g]=l[f>>2];l[f>>2]=-1;l[(l[d]+36*u+24|0)>>2]=-1;l[(l[d]+36*u+28|0)>>2]=-1;l[(l[d]+36*u+32|0)>>2]=0;l[(l[d]+36*u+16|0)>>2]=0;l[h>>2]=l[h>>2]+1|0;return u}function Bh(b,d){var e,f,g,h,j;h=b+24|0;l[h>>2]=l[h>>2]+1|0;j=(b|0)>>2;var k=l[j],m=-1==(k|0);a:do{if(m){l[j]=d,l[(l[b+4>>2]+36*d+20|0)>>2]=-1}else{h=(b+4|0)>>2;g=l[h]>>2;var n=q[g+(9*d|0)];e=q[g+(9*d|0)+1];for(var p=q[g+(9*d|0)+2],u=q[g+(9*d|0)+3],r=k;;){var w=l[g+(9*r|0)+6];if(-1==(w|0)){break}var x=l[g+(9*r|0)+7],y=q[g+(9*r|0)+2],A=q[g+(9*r|0)],C=q[g+(9*r|0)+3],z=q[g+(9*r|0)+1],D=2*((y>p?y:p)-(A<n?A:n)+((C>u?C:u)-(z<e?z:e)));f=2*D;var y=2*(D-2*(y-A+(C-z))),A=q[g+(9*w|0)],C=n<A?n:A,z=q[g+(9*w|0)+1],D=e<z?e:z,E=q[g+(9*w|0)+2],G=p>E?p:E,H=q[g+(9*w|0)+3],F=u>H?u:H,A=(-1==(l[g+(9*w|0)+6]|0)?2*(G-C+(F-D)):2*(G-C+(F-D))-2*(E-A+(H-z)))+y,C=q[g+(9*x|0)],z=n<C?n:C,D=q[g+(9*x|0)+1],E=e<D?e:D,G=q[g+(9*x|0)+2],H=p>G?p:G,F=q[g+(9*x|0)+3],I=u>F?u:F,y=(-1==(l[g+(9*x|0)+6]|0)?2*(H-z+(I-E)):2*(H-z+(I-E))-2*(G-C+(F-D)))+y;if(f<A&f<y){break}r=A<y?w:x}g=l[g+(9*r|0)+5];w=hh(b);l[(l[h]+36*w+20|0)>>2]=g;l[(l[h]+36*w+16|0)>>2]=0;x=l[h];f=x>>2;y=q[f+(9*r|0)];A=q[f+(9*r|0)+1];A=e<A?e:A;e=x+36*w|0;n=(M[0]=n<y?n:y,t[0]);y=(M[0]=A,t[0])|0;l[(e|0)>>2]=0|n;l[(e+4|0)>>2]=y;n=q[f+(9*r|0)+2];e=q[f+(9*r|0)+3];u=u>e?u:e;e=x+36*w+8|0;p=(M[0]=p>n?p:n,t[0]);u=(M[0]=u,t[0])|0;l[(e|0)>>2]=0|p;l[(e+4|0)>>2]=u;p=l[h];l[(p+36*w+32|0)>>2]=l[(p+32>>2)+(9*r|0)]+1|0;p=l[h];-1==(g|0)?(l[(p+36*w+24|0)>>2]=r,l[(l[h]+36*w+28|0)>>2]=d,l[(l[h]+36*r+20|0)>>2]=w,l[(l[h]+36*d+20|0)>>2]=w,l[j]=w):(u=p+36*g+24|0,(l[u>>2]|0)==(r|0)?l[u>>2]=w:l[(p+36*g+28|0)>>2]=w,l[(l[h]+36*w+24|0)>>2]=r,l[(l[h]+36*w+28|0)>>2]=d,l[(l[h]+36*r+20|0)>>2]=w,l[(l[h]+36*d+20|0)>>2]=w);r=l[(l[h]+20>>2)+(9*d|0)];if(-1!=(r|0)){for(;;){if(r=Mk(b,r),u=l[h],p=l[(u+24>>2)+(9*r|0)],u=l[(u+28>>2)+(9*r|0)],-1==(p|0)&&P(N.c|0,307,N.jb|0,N.ph|0),-1==(u|0)&&P(N.c|0,308,N.jb|0,N.uh|0),n=l[h],e=l[(n+32>>2)+(9*p|0)],g=l[(n+32>>2)+(9*u|0)],l[(n+36*r+32|0)>>2]=((e|0)>(g|0)?e:g)+1|0,n=l[h],e=n>>2,g=q[e+(9*p|0)],w=q[e+(9*u|0)],x=q[e+(9*p|0)+1],f=q[e+(9*u|0)+1],f=x<f?x:f,x=n+36*r|0,g=(M[0]=g<w?g:w,t[0]),w=(M[0]=f,t[0])|0,l[(x|0)>>2]=0|g,l[(x+4|0)>>2]=w,g=q[e+(9*p|0)+2],w=q[e+(9*u|0)+2],p=q[e+(9*p|0)+3],u=q[e+(9*u|0)+3],p=p>u?p:u,u=n+36*r+8|0,n=(M[0]=g>w?g:w,t[0]),p=(M[0]=p,t[0])|0,l[(u|0)>>2]=0|n,l[(u+4|0)>>2]=p,r=l[(l[h]+20>>2)+(9*r|0)],-1==(r|0)){break a}}}}}while(0)}function Nk(b,d){var e,f,g=-1<(d|0);e=g?(l[b+12>>2]|0)>(d|0)?5:4:4;4==e&&P(N.c|0,126,N.kb|0,N.o|0);f=(b+4|0)>>2;-1!=(l[(l[f]+24>>2)+(9*d|0)]|0)&&P(N.c|0,127,N.kb|0,N.Tb|0);Ok(b,d);e=g?(l[b+12>>2]|0)>(d|0)?10:9:9;9==e&&P(N.c|0,97,N.G|0,N.Z|0);e=(b+8|0)>>2;0<(l[e]|0)||P(N.c|0,98,N.G|0,N.Ba|0);g=b+16|0;l[(l[f]+36*d+20|0)>>2]=l[g>>2];l[(l[f]+36*d+32|0)>>2]=-1;l[g>>2]=d;l[e]=l[e]-1|0}function Ok(b,d){var e,f,g,h,j,k;k=(b|0)>>2;var m=(l[k]|0)==(d|0);a:do{if(m){l[k]=-1}else{j=(b+4|0)>>2;f=l[j];h=f>>2;var n=l[h+(9*d|0)+5];g=l[h+(9*n|0)+5];e=l[h+(9*n|0)+6];h=(e|0)==(d|0)?l[h+(9*n|0)+7]:e;if(-1==(g|0)){l[k]=h,l[(f+36*h+20|0)>>2]=-1,f=-1<(n|0)?(l[b+12>>2]|0)>(n|0)?20:19:19,19==f&&P(N.c|0,97,N.G|0,N.Z|0),g=(b+8|0)>>2,0<(l[g]|0)||P(N.c|0,98,N.G|0,N.Ba|0),f=b+16|0,l[(l[j]+36*n+20|0)>>2]=l[f>>2],l[(l[j]+36*n+32|0)>>2]=-1,l[f>>2]=n,l[g]=l[g]-1|0}else{e=f+36*g+24|0;(l[e>>2]|0)==(n|0)?l[e>>2]=h:l[(f+36*g+28|0)>>2]=h;l[(l[j]+36*h+20|0)>>2]=g;f=-1<(n|0)?(l[b+12>>2]|0)>(n|0)?13:12:12;12==f&&P(N.c|0,97,N.G|0,N.Z|0);f=(b+8|0)>>2;0<(l[f]|0)||P(N.c|0,98,N.G|0,N.Ba|0);h=b+16|0;l[(l[j]+36*n+20|0)>>2]=l[h>>2];l[(l[j]+36*n+32|0)>>2]=-1;l[h>>2]=n;l[f]=l[f]-1|0;for(n=g;;){n=Mk(b,n);h=l[j];e=h>>2;f=l[e+(9*n|0)+6];g=l[e+(9*n|0)+7];var p=q[e+(9*f|0)],u=q[e+(9*g|0)],r=q[e+(9*f|0)+1],w=q[e+(9*g|0)+1],w=r<w?r:w,r=h+36*n|0,p=(M[0]=p<u?p:u,t[0]),u=(M[0]=w,t[0])|0;l[(r|0)>>2]=0|p;l[(r+4|0)>>2]=u;p=q[e+(9*f|0)+2];u=q[e+(9*g|0)+2];r=q[e+(9*f|0)+3];e=q[e+(9*g|0)+3];e=r>e?r:e;h=h+36*n+8|0;p=(M[0]=p>u?p:u,t[0]);e=(M[0]=e,t[0])|0;l[(h|0)>>2]=0|p;l[(h+4|0)>>2]=e;h=l[j];f=l[(h+32>>2)+(9*f|0)];g=l[(h+32>>2)+(9*g|0)];l[(h+36*n+32|0)>>2]=((f|0)>(g|0)?f:g)+1|0;n=l[(l[j]+20>>2)+(9*n|0)];if(-1==(n|0)){break a}}}}}while(0)}function Rl(b,d,e,f){var g,h;h=-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4;4==h&&P(N.c|0,135,N.lb|0,N.o|0);g=(b+4|0)>>2;var j=l[g];-1!=(l[(j+24>>2)+(9*d|0)]|0)&&(P(N.c|0,137,N.lb|0,N.Tb|0),j=l[g]);h=j>>2;j=e|0;if(q[h+(9*d|0)]>q[j>>2]){var k=e+4|0;h=12}else{var m=e+4|0;if(q[h+(9*d|0)+1]>q[m>>2]){k=m,h=12}else{if(q[e+8>>2]>q[h+(9*d|0)+2]){k=m,h=12}else{if(q[e+12>>2]>q[h+(9*d|0)+3]){k=m,h=12}else{var n=0;h=19}}}}12==h&&(Ok(b,d),n=q[j>>2]-.10000000149011612,k=q[k>>2]-.10000000149011612,j=q[e+8>>2]+.10000000149011612,e=q[e+12>>2]+.10000000149011612,m=2*q[f>>2],h=2*q[f+4>>2],0>m?(f=n+m,n=j):(f=n,n=j+m),0>h?k+=h:e+=h,g=l[g]>>2,q[g+(9*d|0)]=f,q[g+(9*d|0)+1]=k,q[g+(9*d|0)+2]=n,q[g+(9*d|0)+3]=e,Bh(b,d),n=1);return n}function Mk(b,d){var e,f,g,h,j,k,m,n,p,u,r,w,x,y,A,C,z,D,E,G,H,F,I,J,L=b>>2,O;-1==(d|0)&&P(N.c|0,382,N.v|0,N.xh|0);J=(b+4|0)>>2;var R=l[J];I=R>>2;var T=R+36*d|0;F=(R+36*d+24|0)>>2;var S=l[F];if(-1==(S|0)){var U=d}else{if(H=(R+36*d+32|0)>>2,2>(l[H]|0)){U=d}else{G=(R+36*d+28|0)>>2;var W=l[G];O=-1<(S|0)?(S|0)<(l[L+3]|0)?9:8:8;8==O&&P(N.c|0,392,N.v|0,N.Dh|0);O=-1<(W|0)?(W|0)<(l[L+3]|0)?12:11:11;11==O&&P(N.c|0,393,N.v|0,N.Re|0);var Q=l[J];E=Q>>2;var $=Q+36*S|0,ea=Q+36*W|0;D=(Q+36*W+32|0)>>2;z=(Q+36*S+32|0)>>2;var sa=l[D]-l[z]|0;if(1<(sa|0)){var Ba=Q+36*W+24|0,oa=l[Ba>>2];C=(Q+36*W+28|0)>>2;var ga=l[C],qa=Q+36*oa|0,la=Q+36*ga|0;O=-1<(oa|0)?(oa|0)<(l[L+3]|0)?16:15:15;15==O&&P(N.c|0,407,N.v|0,N.Xe|0);O=-1<(ga|0)?(ga|0)<(l[L+3]|0)?19:18:18;18==O&&P(N.c|0,408,N.v|0,N.ff|0);l[Ba>>2]=d;var Ca=R+36*d+20|0,ia=l[Ca>>2];A=(Q+36*W+20|0)>>2;l[A]=ia;l[Ca>>2]=W;var ya=l[A];if(-1==(ya|0)){l[L]=W}else{var ta=l[J],Ia=ta+36*ya+24|0;if((l[Ia>>2]|0)==(d|0)){l[Ia>>2]=W}else{if((l[(ta+28>>2)+(9*ya|0)]|0)==(d|0)){var na=ya,Z=ta}else{P(N.c|0,424,N.v|0,N.of|0),na=l[A],Z=l[J]}l[(Z+28>>2)+(9*na|0)]=W}}y=(Q+36*oa+32|0)>>2;x=(Q+36*ga+32|0)>>2;if((l[y]|0)>(l[x]|0)){l[C]=oa;l[G]=ga;l[(Q+36*ga+20|0)>>2]=d;var ba=q[$>>2],ca=q[la>>2],ma=ba<ca?ba:ca,ka=q[E+(9*S|0)+1],aa=q[E+(9*ga|0)+1],ra=ka<aa?ka:aa,ha=(M[0]=ma,t[0]),za=(M[0]=ra,t[0]),X=0|ha,ua=za|0,da=T|0;w=da>>2;l[w]=X;var fa=T+4|0;r=fa>>2;l[r]=ua;var Aa=q[E+(9*S|0)+2],Pa=q[E+(9*ga|0)+2],pa=q[E+(9*S|0)+3],cb=q[E+(9*ga|0)+3],Qa=pa>cb?pa:cb,Ta=R+36*d+8|0,$a=(M[0]=Aa>Pa?Aa:Pa,t[0]),va=(M[0]=Qa,t[0]),Wa=0|$a,fb=va|0,gb=Ta|0;u=gb>>2;l[u]=Wa;var Xa=Ta+4|0;p=Xa>>2;l[p]=fb;var Ua=q[qa>>2],Va=q[I+(9*d|0)+1],pb=q[E+(9*oa|0)+1],nb=Va<pb?Va:pb,La=(M[0]=ma<Ua?ma:Ua,t[0]),qb=(M[0]=nb,t[0]),bb=0|La,Fa=qb|0,Ma=ea|0;n=Ma>>2;l[n]=bb;var wa=ea+4|0;m=wa>>2;l[m]=Fa;var hb=q[I+(9*d|0)+2],Ya=q[E+(9*oa|0)+2],Za=q[I+(9*d|0)+3],Da=q[E+(9*oa|0)+3],Na=Za>Da?Za:Da,ib=Q+36*W+8|0,ab=(M[0]=hb>Ya?hb:Ya,t[0]),Ga=(M[0]=Na,t[0]),jb=0|ab,Ea=Ga|0,Oa=ib|0;k=Oa>>2;l[k]=jb;var Ja=ib+4|0;j=Ja>>2;l[j]=Ea;var db=l[z],xa=l[x],Ra=((db|0)>(xa|0)?db:xa)+1|0;l[H]=Ra;var Ka=l[y],tb=(Ra|0)>(Ka|0)?Ra:Ka}else{l[C]=ga;l[G]=oa;l[(Q+36*oa+20|0)>>2]=d;var kb=q[$>>2],ub=q[qa>>2],rb=kb<ub?kb:ub,Bb=q[E+(9*S|0)+1],lb=q[E+(9*oa|0)+1],yb=Bb<lb?Bb:lb,xb=(M[0]=rb,t[0]),Ib=(M[0]=yb,t[0]),wb=0|xb,vb=Ib|0,da=T|0;w=da>>2;l[w]=wb;fa=T+4|0;r=fa>>2;l[r]=vb;var zb=q[E+(9*S|0)+2],Eb=q[E+(9*oa|0)+2],Cb=q[E+(9*S|0)+3],eb=q[E+(9*oa|0)+3],sb=Cb>eb?Cb:eb,ob=R+36*d+8|0,Db=(M[0]=zb>Eb?zb:Eb,t[0]),Jb=(M[0]=sb,t[0]),Rb=0|Db,Nb=Jb|0,gb=ob|0;u=gb>>2;l[u]=Rb;Xa=ob+4|0;p=Xa>>2;l[p]=Nb;var Ob=q[la>>2],Kb=q[I+(9*d|0)+1],Pb=q[E+(9*ga|0)+1],Mb=Kb<Pb?Kb:Pb,Yb=(M[0]=rb<Ob?rb:Ob,t[0]),Zb=(M[0]=Mb,t[0]),ec=0|Yb,Ub=Zb|0,Ma=ea|0;n=Ma>>2;l[n]=ec;wa=ea+4|0;m=wa>>2;l[m]=Ub;var jc=q[I+(9*d|0)+2],Qb=q[E+(9*ga|0)+2],mb=q[I+(9*d|0)+3],cc=q[E+(9*ga|0)+3],Fb=mb>cc?mb:cc,gc=Q+36*W+8|0,vc=(M[0]=jc>Qb?jc:Qb,t[0]),pc=(M[0]=Fb,t[0]),qc=0|vc,$c=pc|0,Oa=gc|0;k=Oa>>2;l[k]=qc;Ja=gc+4|0;j=Ja>>2;l[j]=$c;var Ec=l[z],sc=l[y],kd=((Ec|0)>(sc|0)?Ec:sc)+1|0;l[H]=kd;var wd=l[x],tb=(kd|0)>(wd|0)?kd:wd}l[D]=tb+1|0;U=W}else{if(-1>(sa|0)){var Lc=Q+36*S+24|0,$b=l[Lc>>2];h=(Q+36*S+28|0)>>2;var ac=l[h],oc=Q+36*$b|0,tc=Q+36*ac|0;O=-1<($b|0)?($b|0)<(l[L+3]|0)?34:33:33;33==O&&P(N.c|0,467,N.v|0,N.tf|0);O=-1<(ac|0)?(ac|0)<(l[L+3]|0)?37:36:36;36==O&&P(N.c|0,468,N.v|0,N.wf|0);l[Lc>>2]=d;var Nc=R+36*d+20|0,ld=l[Nc>>2];g=(Q+36*S+20|0)>>2;l[g]=ld;l[Nc>>2]=S;var Wc=l[g];if(-1==(Wc|0)){l[L]=S}else{var ad=l[J],Xc=ad+36*Wc+24|0;if((l[Xc>>2]|0)==(d|0)){l[Xc>>2]=S}else{if((l[(ad+28>>2)+(9*Wc|0)]|0)==(d|0)){var Cc=Wc,fd=ad}else{P(N.c|0,484,N.v|0,N.Cf|0),Cc=l[g],fd=l[J]}l[(fd+28>>2)+(9*Cc|0)]=S}}f=(Q+36*$b+32|0)>>2;e=(Q+36*ac+32|0)>>2;if((l[f]|0)>(l[e]|0)){l[h]=$b;l[F]=ac;l[(Q+36*ac+20|0)>>2]=d;var md=q[ea>>2],nd=q[tc>>2],Oc=md<nd?md:nd,gd=q[E+(9*W|0)+1],od=q[E+(9*ac|0)+1],pd=gd<od?gd:od,Pd=(M[0]=Oc,t[0]),Xd=(M[0]=pd,t[0]),qd=0|Pd,Qd=Xd|0,da=T|0;w=da>>2;l[w]=qd;fa=T+4|0;r=fa>>2;l[r]=Qd;var Pc=q[E+(9*W|0)+2],Ic=q[E+(9*ac|0)+2],Jc=q[E+(9*W|0)+3],fc=q[E+(9*ac|0)+3],hd=Jc>fc?Jc:fc,xd=R+36*d+8|0,bd=(M[0]=Pc>Ic?Pc:Ic,t[0]),rd=(M[0]=hd,t[0]),ye=0|bd,Yd=rd|0,gb=xd|0;u=gb>>2;l[u]=ye;Xa=xd+4|0;p=Xa>>2;l[p]=Yd;var Tc=q[oc>>2],wc=q[I+(9*d|0)+1],bc=q[E+(9*$b|0)+1],Ed=wc<bc?wc:bc,xc=(M[0]=Oc<Tc?Oc:Tc,t[0]),Ac=(M[0]=Ed,t[0]),Zd=0|xc,$d=Ac|0,Ma=$|0;n=Ma>>2;l[n]=Zd;wa=$+4|0;m=wa>>2;l[m]=$d;var cd=q[I+(9*d|0)+2],yc=q[E+(9*$b|0)+2],kc=q[I+(9*d|0)+3],Rd=q[E+(9*$b|0)+3],Fc=kc>Rd?kc:Rd,Qc=Q+36*S+8|0,Mc=(M[0]=cd>yc?cd:yc,t[0]),ne=(M[0]=Fc,t[0]),Sd=0|Mc,Td=ne|0,Oa=Qc|0;k=Oa>>2;l[k]=Sd;Ja=Qc+4|0;j=Ja>>2;l[j]=Td;var Ud=l[D],xf=l[e],Fd=((Ud|0)>(xf|0)?Ud:xf)+1|0;l[H]=Fd;var oe=l[f],He=(Fd|0)>(oe|0)?Fd:oe}else{l[h]=ac;l[F]=$b;l[(Q+36*$b+20|0)>>2]=d;var ae=q[ea>>2],Gc=q[oc>>2],dd=ae<Gc?ae:Gc,be=q[E+(9*W|0)+1],pe=q[E+(9*$b|0)+1],Uc=be<pe?be:pe,lc=(M[0]=dd,t[0]),Gd=(M[0]=Uc,t[0]),Hd=0|lc,Re=Gd|0,da=T|0;w=da>>2;l[w]=Hd;fa=T+4|0;r=fa>>2;l[r]=Re;var Id=q[E+(9*W|0)+2],Jd=q[E+(9*$b|0)+2],qe=q[E+(9*W|0)+3],re=q[E+(9*$b|0)+3],Kd=qe>re?qe:re,Se=R+36*d+8|0,Rf=(M[0]=Id>Jd?Id:Jd,t[0]),sd=(M[0]=Kd,t[0]),Vc=0|Rf,Te=sd|0,gb=Se|0;u=gb>>2;l[u]=Vc;Xa=Se+4|0;p=Xa>>2;l[p]=Te;var Ue=q[tc>>2],ce=q[I+(9*d|0)+1],Yc=q[E+(9*ac|0)+1],yd=ce<Yc?ce:Yc,$e=(M[0]=dd<Ue?dd:Ue,t[0]),ze=(M[0]=yd,t[0]),Zc=0|$e,Ld=ze|0,Ma=$|0;n=Ma>>2;l[n]=Zc;wa=$+4|0;m=wa>>2;l[m]=Ld;var Md=q[I+(9*d|0)+2],de=q[E+(9*ac|0)+2],zd=q[I+(9*d|0)+3],ee=q[E+(9*ac|0)+3],yf=zd>ee?zd:ee,af=Q+36*S+8|0,Ie=(M[0]=Md>de?Md:de,t[0]),zf=(M[0]=yf,t[0]),jf=0|Ie,bf=zf|0,Oa=af|0;k=Oa>>2;l[k]=jf;Ja=af+4|0;j=Ja>>2;l[j]=bf;var Sf=l[D],kf=l[f],Ae=((Sf|0)>(kf|0)?Sf:kf)+1|0;l[H]=Ae;var Ad=l[e],He=(Ae|0)>(Ad|0)?Ae:Ad}l[z]=He+1|0;U=S}else{U=d}}}}return U}function gm(b,d){4==(-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4)&&P(N.c|0,563,N.Je|0,N.Z|0);var e=l[b+4>>2],f=l[(e+24>>2)+(9*d|0)];if(-1==(f|0)){return 0}f=gm(b,f);e=gm(b,l[(e+28>>2)+(9*d|0)]);return((f|0)>(e|0)?f:e)+1|0}function hm(b,d){var e,f,g=b|0;f=(b+4|0)>>2;for(var h=b+12|0,j=d;-1!=(j|0);){(l[g>>2]|0)==(j|0)&&-1!=(l[(l[f]+20>>2)+(9*j|0)]|0)&&P(N.c|0,591,N.N|0,N.Jf|0);e=l[f]>>2;var k=l[e+(9*j|0)+6],m=l[e+(9*j|0)+7];if(-1==(k|0)){-1!=(m|0)&&P(N.c|0,602,N.N|0,N.Hb|0);if(0==(l[e+(9*j|0)+8]|0)){break}P(N.c|0,603,N.N|0,N.Jb|0);break}e=-1<(k|0)?(k|0)<(l[h>>2]|0)?15:14:14;14==e&&P(N.c|0,607,N.N|0,N.Kb|0);e=-1<(m|0)?(m|0)<(l[h>>2]|0)?18:17:17;17==e&&P(N.c|0,608,N.N|0,N.Lb|0);e=l[f];(l[(e+20>>2)+(9*k|0)]|0)!=(j|0)&&(P(N.c|0,610,N.N|0,N.ag|0),e=l[f]);(l[(e+20>>2)+(9*m|0)]|0)!=(j|0)&&P(N.c|0,611,N.N|0,N.hg|0);hm(b,k);j=m}}function im(b,d){var e,f,g,h;g=(b+4|0)>>2;for(var j=b+12|0,k=d;-1!=(k|0);){f=l[g]>>2;var m=l[f+(9*k|0)+6],n=l[f+(9*k|0)+7];if(-1==(m|0)){-1!=(n|0)&&P(N.c|0,632,N.M|0,N.Hb|0);if(0==(l[f+(9*k|0)+8]|0)){break}P(N.c|0,633,N.M|0,N.Jb|0);break}h=-1<(m|0)?(m|0)<(l[j>>2]|0)?12:11:11;11==h&&P(N.c|0,637,N.M|0,N.Kb|0);h=-1<(n|0)?(n|0)<(l[j>>2]|0)?15:14:14;14==h&&P(N.c|0,638,N.M|0,N.Lb|0);h=l[g];var p=l[(h+32>>2)+(9*m|0)],u=l[(h+32>>2)+(9*n|0)];if((l[f+(9*k|0)+8]|0)!=(((p|0)>(u|0)?p:u)+1|0)){P(N.c|0,644,N.M|0,N.kg|0),h=l[g]}e=h>>2;h=q[e+(9*m|0)];var p=q[e+(9*n|0)],u=q[e+(9*m|0)+1],r=q[e+(9*n|0)+1],w=q[e+(9*m|0)+2],x=q[e+(9*n|0)+2],w=w>x?w:x,x=q[e+(9*m|0)+3];e=q[e+(9*n|0)+3];e=x>e?x:e;h=(h<p?h:p)==q[f+(9*k|0)]?(u<r?u:r)==q[f+(9*k|0)+1]?20:19:19;19==h&&P(N.c|0,649,N.M|0,N.og|0);h=w==q[f+(9*k|0)+2]?e==q[f+(9*k|0)+3]?23:22:22;22==h&&P(N.c|0,650,N.M|0,N.sg|0);im(b,m);k=n}}function jm(b){var d,e;d=(b|0)>>2;hm(b,l[d]);im(b,l[d]);var f=l[b+16>>2],g=-1==(f|0);a:do{if(g){var h=0}else{for(var j=b+12|0,k=b+4|0,m=0,n=f;;){if(e=-1<(n|0)?(n|0)<(l[j>>2]|0)?7:6:6,6==e&&P(N.c|0,665,N.La|0,N.zg|0),m=m+1|0,n=l[(l[k>>2]+20>>2)+(9*n|0)],-1==(n|0)){h=m;break a}}}}while(0);f=l[d];d=-1==(f|0)?0:l[(l[b+4>>2]+32>>2)+(9*f|0)];f=gm(b,f);(d|0)!=(f|0)&&P(N.c|0,670,N.La|0,N.Ag|0);(l[b+8>>2]+h|0)!=(l[b+12>>2]|0)&&P(N.c|0,672,N.La|0,N.Cg|0)}function km(b){var d,e,f,g;g=(b+8|0)>>2;var h=Ne(l[g]<<2);f=h>>2;var j=b+12|0,k=l[j>>2],m=0<(k|0);a:do{if(m){e=(b+4|0)>>2;var n=b+16|0,p=0;d=0;for(var u=k;;){var r=l[e];0>(l[(r+32>>2)+(9*p|0)]|0)?r=d:-1==(l[(r+24>>2)+(9*p|0)]|0)?(l[(r+36*p+20|0)>>2]=-1,l[((d<<2)+h|0)>>2]=p,r=d+1|0):((u|0)>(p|0)||P(N.c|0,97,N.G|0,N.Z|0),0<(l[g]|0)||P(N.c|0,98,N.G|0,N.Ba|0),l[(l[e]+36*p+20|0)>>2]=l[n>>2],l[(l[e]+36*p+32|0)>>2]=-1,l[n>>2]=p,l[g]=l[g]-1|0,r=d);p=p+1|0;u=l[j>>2];if((p|0)>=(u|0)){break}d=r}if(1<(r|0)){for(n=r;;){p=l[e];d=p>>2;for(var w=u=-1,x=3.4028234663852886e+38,y=0;;){var A=l[(y<<2>>2)+f],C=q[d+(9*A|0)],z=q[d+(9*A|0)+1],D=q[d+(9*A|0)+2],A=q[d+(9*A|0)+3],E=y+1|0,G=(E|0)<(n|0);b:do{if(G){for(var H=u,F=w,I=x,J=E;;){var L=l[(J<<2>>2)+f],O=q[d+(9*L|0)],R=q[d+(9*L|0)+1],T=q[d+(9*L|0)+2],L=q[d+(9*L|0)+3],O=2*((D>T?D:T)-(C<O?C:O)+((A>L?A:L)-(z<R?z:R))),H=(R=O<I)?J:H,F=R?y:F,I=R?O:I,J=J+1|0;if((J|0)==(n|0)){var S=H,U=F,W=I;break b}}}else{S=u,U=w,W=x}}while(0);if((E|0)==(n|0)){break}u=S;w=U;x=W;y=E}u=(U<<2)+h|0;y=l[u>>2];w=(S<<2)+h|0;C=l[w>>2];x=hh(b);z=l[e];l[(z+36*x+24|0)>>2]=y;l[(z+36*x+28|0)>>2]=C;D=l[d+(9*y|0)+8];A=l[d+(9*C|0)+8];l[(z+36*x+32|0)>>2]=((D|0)>(A|0)?D:A)+1|0;D=q[d+(9*y|0)];A=q[d+(9*C|0)];E=q[d+(9*y|0)+1];G=q[d+(9*C|0)+1];G=E<G?E:G;E=z+36*x|0;D=(M[0]=D<A?D:A,t[0]);A=(M[0]=G,t[0])|0;l[(E|0)>>2]=0|D;l[(E+4|0)>>2]=A;D=q[d+(9*y|0)+2];A=q[d+(9*C|0)+2];E=q[d+(9*y|0)+3];d=q[d+(9*C|0)+3];E=E>d?E:d;d=z+36*x+8|0;D=(M[0]=D>A?D:A,t[0]);A=(M[0]=E,t[0])|0;l[(d|0)>>2]=0|D;l[(d+4|0)>>2]=A;l[(z+36*x+20|0)>>2]=-1;l[(p+36*y+20|0)>>2]=x;l[(p+36*C+20|0)>>2]=x;n=n-1|0;l[w>>2]=l[(n<<2>>2)+f];l[u>>2]=x;if(1>=(n|0)){break a}}}}}while(0);l[b>>2]=l[f];Dh(h);jm(b)}function lm(b,d,e,f){var g=b>>2,h=1-f,j=q[g+4]*h+q[g+6]*f,k=q[g+5]*h+q[g+7]*f,m=h*q[g+8]+q[g+9]*f,n=mm(m),m=nm(m),p=q[g+2],u=q[g+3],j=j-(m*p-n*u),k=k-(n*p+m*u),p=q[g+13]*h+q[g+15]*f,u=q[g+14]*h+q[g+16]*f,h=h*q[g+17]+q[g+18]*f,f=mm(h),h=nm(h),r=q[g+11],w=q[g+12],p=p-(h*r-f*w),u=u-(f*r+h*w),r=l[g+20];if(0==(r|0)){var r=b+92|0,w=b+96|0,x=l[g],b=-1<(d|0)?(l[x+20>>2]|0)>(d|0)?6:5:5;5==b&&P(N.i|0,103,N.h|0,N.j|0);var b=(d<<3)+l[x+16>>2]|0,d=(b|0)>>2,b=(b+4|0)>>2,b=l[b],x=(t[0]=l[d],M[0]),y=(t[0]=b,M[0]),g=l[g+1],b=-1<(e|0)?(l[g+20>>2]|0)>(e|0)?9:8:8;8==b&&P(N.i|0,103,N.h|0,N.j|0);g=(e<<3)+l[g+16>>2]|0;d=(g|0)>>2;b=(g+4|0)>>2;g=l[b];e=(t[0]=l[d],M[0]);g=(t[0]=g,M[0]);n=(h*e-f*g+p-(m*x-n*y+j))*q[r>>2]+(f*e+h*g+u-(n*x+m*y+k))*q[w>>2]}else{1==(r|0)?(d=q[g+23],b=q[g+24],r=m*d-n*b,w=n*d+m*b,d=q[g+21],b=q[g+22],j=m*d-n*b+j,n=n*d+m*b+k,m=l[g+1],b=-1<(e|0)?(l[m+20>>2]|0)>(e|0)?13:12:12,12==b&&P(N.i|0,103,N.h|0,N.j|0),m=(e<<3)+l[m+16>>2]|0,d=(m|0)>>2,b=(m+4|0)>>2,m=l[b],k=(t[0]=l[d],M[0]),m=(t[0]=m,M[0]),n=(h*k-f*m+p-j)*r+(f*k+h*m+u-n)*w):2==(r|0)?(b=q[g+23],r=q[g+24],e=h*b-f*r,r=f*b+h*r,b=q[g+21],w=q[g+22],p=h*b-f*w+p,f=f*b+h*w+u,h=l[g],b=-1<(d|0)?(l[h+20>>2]|0)>(d|0)?17:16:16,16==b&&P(N.i|0,103,N.h|0,N.j|0),h=(d<<3)+l[h+16>>2]|0,d=(h|0)>>2,b=(h+4|0)>>2,h=l[b],g=(t[0]=l[d],M[0]),h=(t[0]=h,M[0]),n=(m*g-n*h+j-p)*e+(n*g+m*h+k-f)*r):(P(N.Ca|0,242,N.Ne|0,N.l|0),n=0)}return n}function Um(b,d,e){var f;4==(-1<(e|0)?(l[b+16>>2]-1|0)>(e|0)?5:4:4)&&P(N.F|0,89,N.He|0,N.ah|0);l[d+4>>2]=1;q[d+8>>2]=q[b+8>>2];f=(b+12|0)>>2;var g=(e<<3)+l[f]|0,h=d+12|0,j=l[g+4>>2];l[h>>2]=l[g>>2];l[h+4>>2]=j;g=(e+1<<3)+l[f]|0;h=d+20|0;j=l[g+4>>2];l[h>>2]=l[g>>2];l[h+4>>2]=j;g=d+28|0;0<(e|0)?(h=(e-1<<3)+l[f]|0,j=l[(h+4|0)>>2],l[(g|0)>>2]=l[(h|0)>>2],l[(g+4|0)>>2]=j,c[d+44|0]=1):(h=b+20|0,j=l[(h+4|0)>>2],l[(g|0)>>2]=l[(h|0)>>2],l[(g+4|0)>>2]=j,c[d+44|0]=c[b+36|0]&1);g=d+36|0;(l[b+16>>2]-2|0)>(e|0)?(e=(e+2<<3)+l[f]|0,b=l[(e|0)>>2],e=l[(e+4|0)>>2],l[(g|0)>>2]=b,l[(g+4|0)>>2]=e,c[d+45|0]=1):(f=b+28|0,e=l[(f|0)>>2],f=l[(f+4|0)>>2],l[(g|0)>>2]=e,l[(g+4|0)>>2]=f,c[d+45|0]=c[b+37|0]&1)}function Vm(b,d,e,f){var e=e>>2,g=q[f>>2],h=q[e]-g,j=q[f+4>>2],k=q[e+1]-j,m=q[f+12>>2],n=q[f+8>>2],f=m*h+n*k,p=-n,h=h*p+m*k,g=q[e+2]-g,k=q[e+3]-j,j=m*g+n*k-f,m=g*p+m*k-h,p=b+12|0,n=l[p+4>>2],p=(t[0]=l[p>>2],M[0]),n=(t[0]=n,M[0]),g=b+20|0,b=l[g+4>>2],g=(t[0]=l[g>>2],M[0]),k=(t[0]=b,M[0]),b=g-p,g=k-n,u=-b,k=g*g+b*b,r=Fh(k);if(1.1920928955078125e-7>r){r=g}else{var w=1/r,r=g*w,u=w*u}var w=r*(p-f)+u*(n-h),x=r*j+u*m;0==x?d=0:(x=w/x,0>x?d=0:q[e+4]<x|0==k?d=0:(e=((f+j*x-p)*b+(h+m*x-n)*g)/k,0>e|1<e?d=0:(q[d+8>>2]=x,0<w?(e=(M[0]=-r,t[0]),f=(M[0]=-u,t[0])|0):(e=(M[0]=r,t[0]),f=(M[0]=u,t[0])|0),l[d>>2]=0|e,l[d+4>>2]=f,d=1)));return d}function Wm(b,d,e,f,g){var h=b>>2,j=b+148|0;l[j>>2]=4;var k=-d,m=-e;q[h+5]=k;q[h+6]=m;q[h+7]=d;q[h+8]=m;q[h+9]=d;q[h+10]=e;q[h+11]=k;q[h+12]=e;q[h+21]=0;q[h+22]=-1;q[h+23]=1;q[h+24]=0;q[h+25]=0;q[h+26]=1;q[h+27]=-1;q[h+28]=0;d=f>>2;e=b+12|0;f=l[d+1];l[e>>2]=l[d];l[e+4>>2]=f;for(var e=l[d+1],d=(t[0]=l[d],M[0]),e=(t[0]=e,M[0]),f=mm(g),g=nm(g),k=0,n=m,m=-1;;){var p=(k<<3)+b+20|0,u=q[p>>2],r=f*u+g*n+e,n=(M[0]=g*u-f*n+d,t[0]),r=(M[0]=r,t[0])|0;l[p>>2]=0|n;l[p+4>>2]=r;r=(k<<3)+b+84|0;p=q[r>>2];n=f*p+g*m;m=(M[0]=g*p-f*m,t[0]);n=(M[0]=n,t[0])|0;l[r>>2]=0|m;l[r+4>>2]=n;k=k+1|0;if((k|0)>=(l[j>>2]|0)){break}n=q[((k<<3)+24>>2)+h];m=q[((k<<3)+88>>2)+h]}}function on(b,d,e){if(6>(e-3|0)>>>0){var f=b+148|0;l[f>>2]=e;e=5}else{P(N.O|0,122,N.mb|0,N.zf|0);var g=b+148|0;l[g>>2]=e;if(0<(e|0)){f=g,e=5}else{var h=e,e=13}}do{if(5==e){for(e=0;;){var j=(e<<3)+d|0,g=(e<<3)+b+20|0,k=l[j+4>>2];l[g>>2]=l[j>>2];l[g+4>>2]=k;e=e+1|0;j=o[f>>2];if((e|0)>=(j|0)){break}}if(0<(j|0)){g=j;for(k=0;;){var e=k+1|0,m=(e|0)<(g|0)?e:0,n=q[b+(m<<3)+20>>2]-q[b+(k<<3)+20>>2],m=q[b+(m<<3)+24>>2]-q[b+(k<<3)+24>>2],p=m*m;1.4210854715202004e-14<n*n+p||P(N.O|0,137,N.mb|0,N.ng|0);var g=(k<<3)+b+84|0,u=-1*n,n=g,r=(M[0]=m,t[0]),u=(M[0]=u,t[0])|0;l[n>>2]=0|r;l[n+4>>2]=u;k=(k<<3)+b+88|0;n=q[k>>2];p=Fh(p+n*n);1.1920928955078125e-7>p||(p=1/p,q[g>>2]=m*p,q[k>>2]=n*p);m=o[f>>2];if((e|0)>=(m|0)){break}g=m;k=e}e=b+12|0;g=b+20|0;if(2<(m|0)){var w=m,x=e,y=g,e=16}else{var A=m,C=e,z=g,e=15}}else{h=j,e=13}}}while(0);13==e&&(A=h,C=b+12|0,z=b+20|0,e=15);if(15==e){if(P(N.O|0,76,N.gb|0,N.Xb|0),0<(A|0)){w=A,x=C,y=z,e=16}else{var D=0,E=0,G=0,H=C,e=21}}do{if(16==e){for(h=d=C=A=0;;){var F=(C<<3)+b+20|0,I=l[F+4>>2],F=(t[0]=l[F>>2],M[0]),J=(t[0]=I,M[0]),C=C+1|0,z=(C|0)<(w|0)?(C<<3)+b+20|0:y,I=l[z+4>>2],z=(t[0]=l[z>>2],M[0]),f=(t[0]=I,M[0]),j=.5*(F*f-J*z),I=A+j,A=.3333333432674408*j,F=d+(F+z)*A,J=h+(J+f)*A;if((C|0)==(w|0)){break}A=I;d=F;h=J}if(1.1920928955078125e-7<I){var L=J,O=F,R=I,T=x,e=22}else{D=J,E=F,G=I,H=x,e=21}}}while(0);21==e&&(P(N.O|0,115,N.gb|0,N.Vb|0),L=D,O=E,R=G,T=H);b=1/R;O=(M[0]=O*b,t[0]);L=(M[0]=L*b,t[0])|0;l[T>>2]=0|O;l[T+4>>2]=L}function pn(b,d,e){var f=d>>2,d=q[f+4],g=q[f+8],h=q[f+5],j=q[f+7],k=d*g-h*j,m=q[f+6],n=q[f+3],p=h*m-n*g,u=n*j-d*m,r=q[f],w=q[f+1],f=q[f+2],x=r*k+w*p+f*u,x=0!=x?1/x:x,y=q[e>>2],A=q[e+4>>2],e=q[e+8>>2];q[b>>2]=x*(y*k+A*p+e*u);q[b+4>>2]=x*(r*(A*g-e*j)+w*(e*m-y*g)+f*(y*j-A*m));q[b+8>>2]=x*(r*(d*e-h*A)+w*(h*y-n*e)+f*(n*A-d*y))}function qn(b,d){var e,f,g,h=0==(d|0);a:do{if(h){g=0}else{g=0<(d|0);do{if(g){if(640>=(d|0)){break}g=Ne(d);break a}P(N.e|0,104,N.Fa|0,N.Va|0)}while(0);g=ed[rn+d|0];var j=g&255;14>(g&255)||P(N.e|0,112,N.Fa|0,N.g|0);g=((j<<2)+b+12|0)>>2;f=o[g];if(0==(f|0)){f=(b+4|0)>>2;var k=o[f],m=b+8|0;e=(b|0)>>2;if((k|0)==(l[m>>2]|0)){var n=l[e],k=k+128|0;l[m>>2]=k;m=Ne(k<<3);l[e]=m;Ch(m,n,l[f]<<3);m=((l[f]<<3)+l[e]|0)>>2;for(k=m+256;m<k;m++){l[m]=0}Dh(n);n=l[f]}else{n=k}k=l[e];m=Ne(16384);e=((n<<3)+k+4|0)>>2;l[e]=m;j=l[sn+(j<<2)>>2];l[((n<<3)+k|0)>>2]=j;n=16384/(j|0)&-1;16385>(n*j|0)?k=m:(P(N.e|0,140,N.Fa|0,N.dh|0),k=l[e]);n=n-1|0;m=0<(n|0);b:do{if(m){for(var p=0,u=k;;){var r=p+1|0;l[(u+p*j|0)>>2]=u+r*j|0;u=l[e];if((r|0)==(n|0)){var w=u;break b}p=r}}else{w=k}}while(0);l[(w+n*j|0)>>2]=0;l[g]=l[l[e]>>2];l[f]=l[f]+1|0;g=l[e]}else{l[g]=l[f>>2],g=f}}}while(0);return g}function V(b){function d(b){var d;"double"===b?d=(t[0]=l[g+j>>2],t[1]=l[g+(j+4)>>2],Ee[0]):"i64"==b?d=[l[g+j>>2],l[g+(j+4)>>2]]:(b="i32",d=l[g+j>>2]);j+=Math.max(mc(b),nc);return d}var e=a;a+=4;l[e>>2]=arguments[V.length];for(var f=l[tn>>2],g=l[e>>2],h=b,j=0,k=[],m,n;;){var p=h;m=c[h];if(0===m){break}n=c[h+1];if(37==m){var u=Gb,r=Gb,w=Gb,x=Gb;a:for(;;){switch(n){case 43:u=Sa;break;case 45:r=Sa;break;case 35:w=Sa;break;case 48:if(x){break a}else{x=Sa;break};default:break a}h++;n=c[h+1]}var y=0;if(42==n){y=d("i32"),h++,n=c[h+1]}else{for(;48<=n&&57>=n;){y=10*y+(n-48),h++,n=c[h+1]}}var A=Gb;if(46==n){var C=0,A=Sa;h++;n=c[h+1];if(42==n){C=d("i32"),h++}else{for(;;){n=c[h+1];if(48>n||57<n){break}C=10*C+(n-48);h++}}n=c[h+1]}else{C=6}var z;switch(String.fromCharCode(n)){case"h":n=c[h+2];104==n?(h++,z=1):z=2;break;case"l":n=c[h+2];108==n?(h++,z=8):z=4;break;case"L":case"q":case"j":z=8;break;case"z":case"t":case"I":z=4;break;default:z=Ab}z&&h++;n=c[h+1];if(-1!="diuoxXp".split("").indexOf(String.fromCharCode(n))){p=100==n||105==n;z=z||4;var D=m=d("i"+8*z),E;8==z&&(m=117==n?(m[0]>>>0)+4294967296*(m[1]>>>0):(m[0]>>>0)+4294967296*(m[1]|0));4>=z&&(m=(p?Pf:Of)(m&Math.pow(256,z)-1,8*z));var G=Math.abs(m),p="";if(100==n||105==n){E=8==z&&un?un.stringify(D[0],D[1]):Pf(m,8*z).toString(10)}else{if(117==n){E=8==z&&un?un.stringify(D[0],D[1],Sa):Of(m,8*z).toString(10),m=Math.abs(m)}else{if(111==n){E=(w?"0":"")+G.toString(8)}else{if(120==n||88==n){p=w?"0x":"";if(0>m){m=-m;E=(G-1).toString(16);D=[];for(w=0;w<E.length;w++){D.push((15-parseInt(E[w],16)).toString(16))}for(E=D.join("");E.length<2*z;){E="f"+E}}else{E=G.toString(16)}88==n&&(p=p.toUpperCase(),E=E.toUpperCase())}else{112==n&&(0===G?E="(nil)":(p="0x",E=G.toString(16)))}}}}if(A){for(;E.length<C;){E="0"+E}}for(u&&(p=0>m?"-"+p:"+"+p);p.length+E.length<y;){r?E+=" ":x?E="0"+E:p=" "+p}E=p+E;E.split("").forEach((function(b){k.push(b.charCodeAt(0))}))}else{if(-1!="fFeEgG".split("").indexOf(String.fromCharCode(n))){m=d("double");if(isNaN(m)){E="nan",x=Gb}else{if(isFinite(m)){A=Gb;z=Math.min(C,20);if(103==n||71==n){A=Sa,C=C||1,z=parseInt(m.toExponential(z).split("e")[1],10),C>z&&-4<=z?(n=(103==n?"f":"F").charCodeAt(0),C-=z+1):(n=(103==n?"e":"E").charCodeAt(0),C--),z=Math.min(C,20)}if(101==n||69==n){E=m.toExponential(z),/[eE][-+]\d$/.test(E)&&(E=E.slice(0,-1)+"0"+E.slice(-1))}else{if(102==n||70==n){E=m.toFixed(z)}}p=E.split("e");if(A&&!w){for(;1<p[0].length&&-1!=p[0].indexOf(".")&&("0"==p[0].slice(-1)||"."==p[0].slice(-1));){p[0]=p[0].slice(0,-1)}}else{for(w&&-1==E.indexOf(".")&&(p[0]+=".");C>z++;){p[0]+="0"}}E=p[0]+(1<p.length?"e"+p[1]:"");69==n&&(E=E.toUpperCase());u&&0<=m&&(E="+"+E)}else{E=(0>m?"-":"")+"inf",x=Gb}}for(;E.length<y;){E=r?E+" ":x&&("-"==E[0]||"+"==E[0])?E[0]+"0"+E.slice(1):(x?"0":" ")+E}97>n&&(E=E.toUpperCase());E.split("").forEach((function(b){k.push(b.charCodeAt(0))}))}else{if(115==n){u=d("i8*")||0;x=Nf(u);A&&(x=Math.min(Nf(u),C));if(!r){for(;x<y--;){k.push(32)}}for(w=0;w<x;w++){k.push(ed[u++])}if(r){for(;x<y--;){k.push(32)}}}else{if(99==n){for(r&&k.push(d("i8"));0<--y;){k.push(32)}r||k.push(d("i8"))}else{if(110==n){r=d("i32*"),l[r>>2]=k.length}else{if(37==n){k.push(m)}else{for(w=p;w<h+2;w++){k.push(c[w])}}}}}}}h+=2}else{k.push(m),h+=1}}h=a;E=B(k,"i8",Ge);r=1*k.length;0!=r&&-1==vn(f,E,r)&&ro[f]&&(ro[f].error=Sa);a=h;a=e}function so(b,d){var e;e=(b+102796|0)>>2;var f=l[e];0<(f|0)||(P(N.n|0,63,N.pb|0,N.eh|0),f=l[e]);f=f-1|0;(l[(b+102412>>2)+(3*f|0)]|0)!=(d|0)&&P(N.n|0,65,N.pb|0,N.lh|0);if(0==(c[b+12*f+102420|0]&1)<<24>>24){var f=b+12*f+102416|0,g=b+102400|0;l[g>>2]=l[g>>2]-l[f>>2]|0}else{Dh(d),f=b+12*f+102416|0}g=b+102404|0;l[g>>2]=l[g>>2]-l[f>>2]|0;l[e]=l[e]-1|0}function to(b,d,e){var f,g,h=d>>2,j=b>>2,k=b+12|0,m=b+64|0,n=d+4|0,p=q[n>>2];(!isNaN(p)&&!isNaN(0))&-Infinity<p&Infinity>p?(p=q[h+2],g=(!isNaN(p)&&!isNaN(0))&-Infinity<p&Infinity>p?5:4):g=4;4==g&&P(N.k|0,27,N.R|0,N.Kf|0);p=d+16|0;g=q[p>>2];(!isNaN(g)&&!isNaN(0))&-Infinity<g&Infinity>g?(g=q[h+5],g=(!isNaN(g)&&!isNaN(0))&-Infinity<g&Infinity>g?8:7):g=7;7==g&&P(N.k|0,28,N.R|0,N.vg|0);g=(d+12|0)>>2;var u=q[g];(!isNaN(u)&&!isNaN(0))&-Infinity<u&Infinity>u||P(N.k|0,29,N.R|0,N.Sg|0);var u=d+24|0,r=q[u>>2];(!isNaN(r)&&!isNaN(0))&-Infinity<r&Infinity>r||P(N.k|0,30,N.R|0,N.fh|0);var r=d+32|0,w=q[r>>2];0>w|(!isNaN(w)&&!isNaN(0))&-Infinity<w&Infinity>w^1&&P(N.k|0,31,N.R|0,N.mh|0);w=d+28|0;f=q[w>>2];0>f|(!isNaN(f)&&!isNaN(0))&-Infinity<f&Infinity>f^1&&P(N.k|0,32,N.R|0,N.th|0);f=(b+4|0)>>1;i[f]=0;var x=0==(c[d+39|0]&1)<<24>>24?0:i[f]=8;0!=(c[d+38|0]&1)<<24>>24&&(x|=16,i[f]=x);0!=(c[d+36|0]&1)<<24>>24&&(x|=4,i[f]=x);0!=(c[d+37|0]&1)<<24>>24&&(x|=2,i[f]=x);0!=(c[d+40|0]&1)<<24>>24&&(i[f]=x|32);l[j+22]=e;d=l[n>>2];n=l[n+4>>2];l[k>>2]=d;l[k+4>>2]=n;k=q[g];e=mm(k);q[j+5]=e;k=nm(k);q[j+6]=k;q[j+7]=0;q[j+8]=0;k=b+36|0;l[k>>2]=d;l[k+4>>2]=n;k=b+44|0;l[k>>2]=d;l[k+4>>2]=n;q[j+13]=q[g];q[j+14]=q[g];q[j+15]=0;l[j+27]=0;l[j+28]=0;l[j+23]=0;l[j+24]=0;g=l[p+4>>2];l[m>>2]=l[p>>2];l[m+4>>2]=g;q[j+18]=q[u>>2];q[j+33]=q[w>>2];q[j+34]=q[r>>2];q[j+35]=q[h+12];q[j+19]=0;q[j+20]=0;q[j+21]=0;q[j+36]=0;m=l[h];l[j]=m;b=b+116|0;2==(m|0)?(q[b>>2]=1,q[j+30]=1):(q[b>>2]=0,q[j+30]=0);q[j+31]=0;q[j+32]=0;l[j+37]=l[h+11];l[j+25]=0;l[j+26]=0}function uo(b,d){var e,f,g=b>>2,h=a;a+=16;f=(b+88|0)>>2;var j=l[l[f]+102868>>2];0!=(j&2|0)&&(P(N.k|0,115,N.we|0,N.V|0),j=l[l[f]+102868>>2]);j=0==(j&2|0);a:do{if(j&&(e=(b|0)>>2,(l[e]|0)!=(d|0))){l[e]=d;vo(b);e=0==(l[e]|0);b:do{if(e){q[g+16]=0;q[g+17]=0;q[g+18]=0;var k=q[g+14];q[g+13]=k;var m=b+44|0,n=b+36|0,p=l[m>>2],m=l[m+4>>2];l[n>>2]=p;l[n+4>>2]=m;n=mm(k);q[h+8>>2]=n;var u=nm(k);q[h+12>>2]=u;var r=q[g+7],w=q[g+8],k=u*r-n*w,n=n*r+u*w,p=(t[0]=p,M[0])-k,n=(t[0]=m,M[0])-n,m=h,p=(M[0]=p,t[0]),n=(M[0]=n,t[0])|0;l[m>>2]=0|p;l[m+4>>2]=n;p=l[f]+102872|0;n=l[g+25];if(0!=(n|0)){for(m=b+12|0;;){if(wo(n,p,h,m),n=l[n+4>>2],0==(n|0)){break b}}}}}while(0);e=b+4|0;p=i[e>>1];0==(p&2)<<16>>16&&(i[e>>1]=p|2,q[g+36]=0);q[g+19]=0;q[g+20]=0;q[g+21]=0;e=l[g+25];if(0!=(e|0)){for(;;){if(xo(e),e=l[e+4>>2],0==(e|0)){break a}}}}}while(0);a=h}function vo(b){var d,e,f,g,h=a;a+=16;e=b+116|0;g=e>>2;var j=b+120|0;f=(b+124|0)>>2;var k=b+128|0,m=b+28|0;q[m>>2]=0;q[b+32>>2]=0;e>>=2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;e=l[(b|0)>>2];if(0==(e|0)||1==(e|0)){var n=b+12|0,p=b+36|0;e=l[(n|0)>>2];n=l[(n+4|0)>>2];l[p>>2]=e;l[p+4>>2]=n;p=b+44|0;l[p>>2]=e;l[p+4>>2]=n;q[b+52>>2]=q[b+56>>2];e=20}else{2!=(e|0)&&P(N.k|0,284,N.rb|0,N.ef|0),e=5}if(5==e){e=Dj;p=l[e+4>>2];e=(t[0]=l[e>>2],M[0]);var p=(t[0]=p,M[0]),n=l[b+100>>2],u=0==(n|0);a:do{if(u){var r=p,w=e}else{var x=h|0,y=h+4|0,A=h+8|0,C=h+12|0,z=p,D=e;d=n;for(d>>=2;;){var E=q[d];if(0!=E){var G=l[d+3];K[l[l[G>>2]+28>>2]](G,h,E);E=q[x>>2];q[g]+=E;D+=q[y>>2]*E;z+=q[A>>2]*E;q[f]+=q[C>>2]}d=l[d+1];if(0==(d|0)){r=z;w=D;break a}d>>=2}}}while(0);e=q[g];0<e?(g=1/e,q[j>>2]=g,j=w*g,r*=g,w=e):(q[g]=1,q[j>>2]=1,j=w,w=1);g=q[f];if(0<g){if(0!=(i[b+4>>1]&16)<<16>>16){e=18}else{var H=g-w*(j*j+r*r);q[f]=H;0<H||(P(N.k|0,319,N.rb|0,N.Db|0),H=q[f]);H=1/H;e=19}}else{e=18}18==e&&(H=q[f]=0);q[k>>2]=H;H=b+44|0;k=l[(H+4|0)>>2];f=(t[0]=l[(H|0)>>2],M[0]);k=(t[0]=k,M[0]);w=(M[0]=j,t[0]);g=(M[0]=r,t[0])|0;l[m>>2]=0|w;l[m+4>>2]=g;w=b+36|0;g=q[b+24>>2];e=q[b+20>>2];m=g*j-e*r+q[b+12>>2];r=e*j+g*r+q[b+16>>2];g=(M[0]=m,t[0]);j=(M[0]=r,t[0]);g|=0;j|=0;l[H>>2]=g;l[H+4>>2]=j;l[w>>2]=g;l[w+4>>2]=j;H=q[b+72>>2];j=b+64|0;q[j>>2]+=(r-k)*-H;b=b+68|0;q[b>>2]+=(m-f)*H}a=h}function cp(b,d){var e,f,g,h,j,k,m=d>>2;k=(b+88|0)>>2;var n=l[k];j=l[n+102868>>2];0!=(j&2|0)&&(P(N.k|0,153,N.ve|0,N.V|0),n=j=l[k],j=l[j+102868>>2]);if(0==(j&2|0)){f=n|0;n=qn(f,44);0==(n|0)?n=0:(i[n+32>>1]=1,i[n+34>>1]=-1,i[n+36>>1]=0,l[n+40>>2]=0,l[n+24>>2]=0,l[n+28>>2]=0,l[n>>2]=0,l[n+4>>2]=0,l[n+8>>2]=0,l[n+12>>2]=0);j=n>>2;l[j+10]=l[m+1];q[j+4]=q[m+2];q[j+5]=q[m+3];j=n+8|0;l[j>>2]=b;var p=n+4|0;l[p>>2]=0;h=(n+32|0)>>1;g=(d+22|0)>>1;i[h]=i[g];i[h+1]=i[g+1];i[h+2]=i[g+2];c[n+38|0]=c[d+20|0]&1;g=l[m];h=K[l[l[g>>2]+8>>2]](g,f);g=(n+12|0)>>2;l[g]=h;h=K[l[l[h>>2]+12>>2]](h);e=qn(f,28*h|0);f=(n+24|0)>>2;l[f]=e;var u=0<(h|0);a:do{if(u&&(l[(e+16|0)>>2]=0,l[(l[f]+24|0)>>2]=-1,1!=(h|0))){for(var r=1;;){if(l[(l[f]+28*r+16|0)>>2]=0,l[(l[f]+28*r+24|0)>>2]=-1,r=r+1|0,(r|0)==(h|0)){break a}}}}while(0);e=(n+28|0)>>2;l[e]=0;h=n|0;q[h>>2]=q[m+4];m=0==(i[b+4>>1]&32)<<16>>16;a:do{if(!m){var u=l[k]+102872|0,r=b+12|0,w=l[g],w=K[l[l[w>>2]+12>>2]](w);l[e]=w;if(0<(w|0)){for(w=0;;){var x=l[f],y=x+28*w|0,A=l[g],C=y|0;K[l[l[A>>2]+24>>2]](A,C,r,w);y=gh(u,C,y);l[(x+28*w+24|0)>>2]=y;l[(x+28*w+16|0)>>2]=n;l[(x+28*w+20|0)>>2]=w;w=w+1|0;if((w|0)>=(l[e]|0)){break a}}}}}while(0);g=b+100|0;l[p>>2]=l[g>>2];l[g>>2]=n;p=b+104|0;l[p>>2]=l[p>>2]+1|0;l[j>>2]=b;0<q[h>>2]&&vo(b);k=l[k]+102868|0;l[k>>2]|=1;k=n}else{k=0}return k}function ep(b,d){var e,f,g;g=(b+88|0)>>2;f=l[l[g]+102868>>2];0!=(f&2|0)&&(P(N.k|0,201,N.ma|0,N.V|0),f=l[l[g]+102868>>2]);if(0==(f&2|0)){var h=d+8|0;(l[h>>2]|0)!=(b|0)&&P(N.k|0,207,N.ma|0,N.Ch|0);f=(b+104|0)>>2;0<(l[f]|0)||P(N.k|0,210,N.ma|0,N.Ih|0);for(e=b+100|0;;){var j=l[e>>2];if(0==(j|0)){P(N.k|0,226,N.ma|0,N.We|0);break}if((j|0)!=(d|0)){e=j+4|0}else{l[e>>2]=l[d+4>>2];break}}e=l[b+112>>2];j=0==(e|0);a:do{if(!j){for(var k=e;;){var m=l[k+4>>2],k=l[k+12>>2];(l[m+48>>2]|0)==(d|0)|(l[m+52>>2]|0)==(d|0)&&fp(l[g]+102872|0,m);if(0==(k|0)){break a}}}}while(0);g=o[g];j=g|0;if(0!=(i[b+4>>1]&32)<<16>>16){e=(d+28|0)>>2;m=0<(l[e]|0);a:do{if(m){for(var k=d+24|0,n=g+102912|0,p=g+102904|0,u=g+102900|0,r=g+102872|0,w=0;;){for(var x=l[k>>2]+28*w+24|0,y=l[x>>2],A=l[n>>2],C=0;(C|0)<(A|0);){var z=(C<<2)+l[p>>2]|0;if((l[z>>2]|0)!=(y|0)){C=C+1|0}else{l[z>>2]=-1;break}}l[u>>2]=l[u>>2]-1|0;Nk(r,y);l[x>>2]=-1;w=w+1|0;if((w|0)>=(l[e]|0)){break a}}}}while(0);l[e]=0}gp(d,j);l[h>>2]=0;l[d+4>>2]=0;h=ed[rn+44|0];e=h&255;14>(h&255)||P(N.e|0,173,N.f|0,N.g|0);h=(e<<2)+g+12|0;l[d>>2]=l[h>>2];l[h>>2]=d;l[f]=l[f]-1|0;vo(b)}}function hp(b,d){var e,f,g=b+88|0;f=l[l[g>>2]+102868>>2];0==(f&2|0)?g=f:(P(N.k|0,340,N.qb|0,N.V|0),g=l[l[g>>2]+102868>>2]);if(0==(g&2|0)&&2==(l[b>>2]|0)){var h=b+120|0;q[h>>2]=0;f=(b+124|0)>>2;q[f]=0;g=b+128|0;q[g>>2]=0;e=q[d>>2];e=0<e?e:1;q[b+116>>2]=e;q[h>>2]=1/e;h=q[d+12>>2];if(0<h&&0==(i[b+4>>1]&16)<<16>>16){var j=q[d+4>>2],k=q[d+8>>2];e=h-e*(j*j+k*k);q[f]=e;0<e?f=e:(P(N.k|0,366,N.qb|0,N.Db|0),f=q[f]);q[g>>2]=1/f}j=b+28|0;e=(b+44|0)>>2;f=l[e+1];g=(t[0]=l[e],M[0]);f=(t[0]=f,M[0]);var h=d+4|0,m=l[h>>2],h=l[h+4>>2];l[j>>2]=m;l[j+4>>2]=h;var j=b+36|0,k=q[b+24>>2],m=(t[0]=m,M[0]),n=q[b+20>>2],p=(t[0]=h,M[0]),h=k*m-n*p+q[b+12>>2],k=n*m+k*p+q[b+16>>2],n=(M[0]=h,t[0]),m=(M[0]=k,t[0]),n=0|n,m=m|0;l[e]=n;l[e+1]=m;l[j>>2]=n;l[j+4>>2]=m;e=q[b+72>>2];j=b+64|0;q[j>>2]+=(k-f)*-e;f=b+68|0;q[f>>2]+=(h-g)*e}}function ip(b,d,e){var f,g=b>>2;f=(b+88|0)>>2;var h=l[f],j=l[h+102868>>2];0!=(j&2|0)&&(P(N.k|0,404,N.ue|0,N.V|0),h=j=l[f],j=l[j+102868>>2]);if(0==(j&2|0)){var j=b+12|0,k=mm(e);q[g+5]=k;var m=nm(e);q[g+6]=m;var n=l[d>>2],p=l[d+4>>2];l[j>>2]=n;l[j+4>>2]=p;var d=b+44|0,u=q[g+7],r=q[g+8],n=(t[0]=n,M[0]),n=m*u-k*r+n,p=(t[0]=p,M[0]),k=k*u+m*r+p,m=(M[0]=n,t[0]),u=(M[0]=k,t[0]),k=0|m,m=u|0;l[d>>2]=k;l[d+4>>2]=m;q[g+14]=e;b=b+36|0;l[b>>2]=k;l[b+4>>2]=m;q[g+13]=e;e=h+102872|0;g=l[g+25];if(0==(g|0)){f=h}else{for(;!(wo(g,e,j,j),g=l[g+4>>2],0==(g|0));){}f=l[f]}f=f+102872|0;jp(f|0,f)}}function kp(b,d){var e,f,g,h;h=(b+88|0)>>2;0!=(l[l[h]+102868>>2]&2|0)&&P(N.k|0,443,N.xe|0,N.V|0);g=(b+4|0)>>1;var j=i[g],k=0!=(j&32)<<16>>16^d;a:do{if(k){if(d){i[g]=j|32;var m=l[h]+102872|0;f=l[b+100>>2];if(0!=(f|0)){for(var n=b+12|0,p=f;;){f=(p+28|0)>>2;0!=(l[f]|0)&&P(N.Pa|0,124,N.Ee|0,N.Ab|0);var u=p+12|0,r=l[u>>2],r=K[l[l[r>>2]+12>>2]](r);l[f]=r;r=0<(r|0);b:do{if(r){var w=p+24|0;for(e=0;;){var x=l[w>>2],y=x+28*e|0,A=l[u>>2],C=y|0;K[l[l[A>>2]+24>>2]](A,C,n,e);y=gh(m,C,y);l[(x+28*e+24|0)>>2]=y;l[(x+28*e+16|0)>>2]=p;l[(x+28*e+20|0)>>2]=e;e=e+1|0;if((e|0)>=(l[f]|0)){break b}}}}while(0);f=l[p+4>>2];if(0==(f|0)){break a}p=f}}}else{i[g]=j&-33;m=l[h];n=l[b+100>>2];f=0==(n|0);b:do{if(!f){p=m+102912|0;u=m+102904|0;r=m+102900|0;w=m+102872|0;for(x=n;;){e=(x+28|0)>>2;y=0<(l[e]|0);c:do{if(y){A=x+24|0;for(C=0;;){for(var z=l[A>>2]+28*C+24|0,D=l[z>>2],E=l[p>>2],G=0;(G|0)<(E|0);){var H=(G<<2)+l[u>>2]|0;if((l[H>>2]|0)!=(D|0)){G=G+1|0}else{l[H>>2]=-1;break}}l[r>>2]=l[r>>2]-1|0;Nk(w,D);l[z>>2]=-1;C=C+1|0;if((C|0)>=(l[e]|0)){break c}}}}while(0);l[e]=0;e=l[x+4>>2];if(0==(e|0)){break b}x=e}}}while(0);m=b+112|0;n=l[m>>2];f=0==(n|0);b:do{if(!f){for(p=n;;){u=l[p+12>>2];fp(l[h]+102872|0,l[p+4>>2]);if(0==(u|0)){break b}p=u}}}while(0);l[m>>2]=0}}}while(0)}function lp(b){var d=b>>2,e=a,f=b+8|0,g=l[f>>2];V(N.Qa|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.vf|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));var h=l[d];V(N.Bf|0,(s=a,a+=4,l[s>>2]=h,s));var h=q[d+3],j=q[d+4];V(N.Ff|0,(s=a,a+=16,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=j,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));h=q[d+14];V(N.Lf|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s));h=q[d+16];j=q[d+17];V(N.Of|0,(s=a,a+=16,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=j,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));h=q[d+18];V(N.Qf|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s));h=q[d+33];V(N.Tf|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s));h=q[d+34];V(N.Xf|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=(b+4|0)>>1;h=jd[b]&4;V(N.Yf|0,(s=a,a+=4,l[s>>2]=h,s));h=jd[b]&2;V(N.cg|0,(s=a,a+=4,l[s>>2]=h,s));h=jd[b]&16;V(N.ig|0,(s=a,a+=4,l[s>>2]=h,s));h=jd[b]&8;V(N.lg|0,(s=a,a+=4,l[s>>2]=h,s));b=jd[b]&32;V(N.pg|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+35];V(N.tg|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=l[f>>2];V(N.xg|0,(s=a,a+=4,l[s>>2]=f,s));V(N.Za|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));d=l[d+25];f=0==(d|0);a:do{if(!f){for(b=d;;){if(V(N.Dg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),mp(b,g),V(N.Fg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),b=l[b+4>>2],0==(b|0)){break a}}}}while(0);V(N.Ra|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));a=e}function fp(b,d){var e,f;e=l[l[d+48>>2]+8>>2];var g=l[l[d+52>>2]+8>>2];f=l[b+72>>2];if(0!=(f|0)&&0!=(l[d+4>>2]&2|0)){K[l[l[f>>2]+12>>2]](f,d)}var h=d+8|0,j=l[h>>2];f=(d+12|0)>>2;0!=(j|0)&&(l[(j+12|0)>>2]=l[f]);j=l[f];0!=(j|0)&&(l[(j+8|0)>>2]=l[h>>2]);h=b+60|0;(l[h>>2]|0)==(d|0)&&(l[h>>2]=l[f]);h=d+24|0;j=l[h>>2];f=(d+28|0)>>2;0!=(j|0)&&(l[(j+12|0)>>2]=l[f]);j=l[f];0!=(j|0)&&(l[(j+8|0)>>2]=l[h>>2]);e=e+112|0;(d+16|0)==(l[e>>2]|0)&&(l[e>>2]=l[f]);f=d+40|0;h=l[f>>2];e=(d+44|0)>>2;0!=(h|0)&&(l[(h+12|0)>>2]=l[e]);h=l[e];0!=(h|0)&&(l[(h+8|0)>>2]=l[f>>2]);g=g+112|0;(d+32|0)==(l[g>>2]|0)&&(l[g>>2]=l[e]);g=l[b+76>>2];0==(c[np]&1)<<24>>24&&P(N.$|0,103,N.Ja|0,N.Jg|0);e=d+48|0;if(0<(l[d+124>>2]|0)){f=l[l[e>>2]+8>>2];h=f+4|0;j=i[h>>1];0==(j&2)<<16>>16&&(i[h>>1]=j|2,q[f+144>>2]=0);f=d+52|0;var h=l[l[f>>2]+8>>2],j=h+4|0,k=i[j>>1];0==(k&2)<<16>>16&&(i[j>>1]=k|2,q[h+144>>2]=0)}else{f=d+52|0}e=l[l[l[e>>2]+12>>2]+4>>2];f=l[l[l[f>>2]+12>>2]+4>>2];-1<(e|0)&4>(f|0)||(P(N.$|0,114,N.Ja|0,N.Rb|0),P(N.$|0,115,N.Ja|0,N.Rb|0));K[l[(op+4>>2)+(12*e|0)+(3*f|0)]](d,g);g=b+64|0;l[g>>2]=l[g>>2]-1|0}function pp(b){var d,e,f,g,h,j=l[b+60>>2],k=0==(j|0);a:do{if(!k){var m=b+12|0,n=b+4|0,p=b+72|0,u=b+68|0,r=j;for(g=r>>2;;){var w=l[g+12];e=l[g+13];var x=l[g+14],y=l[g+15],A=l[w+8>>2],C=l[e+8>>2];f=(r+4|0)>>2;var z=l[f],D=0==(z&8|0);b:do{if(D){h=19}else{h=2==(l[C>>2]|0)?7:2==(l[A>>2]|0)?7:12;c:do{if(7==h){for(h=C+108|0;;){h=l[h>>2];if(0==(h|0)){break}if((l[h>>2]|0)==(A|0)&&0==(c[l[h+4>>2]+61|0]&1)<<24>>24){break c}h=h+12|0}h=l[u>>2];if(0!=(h|0)){if(!K[l[l[h>>2]+8>>2]](h,w,e)){f=l[g+3];fp(b,r);var E=f;h=13;break b}z=l[f]}l[f]=z&-9;h=19;break b}}while(0);E=l[g+3];fp(b,r);h=13}}while(0);19==h&&((0==(i[A+4>>1]&2)<<16>>16?0:0!=(l[A>>2]|0))|(0==(i[C+4>>1]&2)<<16>>16?0:0!=(l[C>>2]|0))?(w=l[(l[w+24>>2]+24>>2)+(7*x|0)],y=l[(l[e+24>>2]+24>>2)+(7*y|0)],h=-1<(w|0)?(l[m>>2]|0)>(w|0)?28:27:27,27==h&&P(N.q|0,159,N.H|0,N.o|0),x=l[n>>2],e=x>>2,-1<(y|0)?(l[m>>2]|0)>(y|0)?(d=x,d>>=2,h=31):h=30:h=30,30==h&&(P(N.q|0,159,N.H|0,N.o|0),d=l[n>>2],d>>=2),0<q[d+(9*y|0)]-q[e+(9*w|0)+2]|0<q[d+(9*y|0)+1]-q[e+(9*w|0)+3]|0<q[e+(9*w|0)]-q[d+(9*y|0)+2]|0<q[e+(9*w|0)+1]-q[d+(9*y|0)+3])?(g=l[g+3],fp(b,r),E=g):(qp(r,l[p>>2]),E=l[g+3]):E=l[g+3]);if(0==(E|0)){break a}r=E;g=r>>2}}}while(0)}function jp(b,d){var e,f,g=a;a+=4;var h;f=(b+52|0)>>2;l[f]=0;e=(b+40|0)>>2;h=l[e];if(0<(h|0)){for(var j=b+32|0,k=b+56|0,m=b|0,n=b+12|0,p=b+4|0,u=0;;){var r=l[l[j>>2]+(u<<2)>>2];l[k>>2]=r;if(-1!=(r|0)){h=-1<(r|0)?(l[n>>2]|0)>(r|0)?8:7:7;7==h&&P(N.q|0,159,N.H|0,N.o|0);var w=m,x=b,y=l[p>>2]+36*r|0,A=Ha,C=r=h=Ha,z=Ha,D=Ha,E=Ha,G=a;a+=1036;var H=G+4|0,E=(G|0)>>2;l[E]=H;D=(G+1028|0)>>2;z=(G+1032|0)>>2;l[z]=256;l[H>>2]=l[w>>2];l[D]=1;var w=w+4|0,F=y|0,I=y+4|0,J=y+8|0,y=y+12|0,C=(x+56|0)>>2,r=(x+52|0)>>2,L=x+48|0;h=(x+44|0)>>2;A=1;for(x=H;;){var O=A-1|0;l[D]=O;var R=l[x+(O<<2)>>2];if(-1==(R|0)){x=O}else{var T=l[w>>2],A=T>>2;if(0<q[F>>2]-q[A+(9*R|0)+2]|0<q[I>>2]-q[A+(9*R|0)+3]|0<q[A+(9*R|0)]-q[J>>2]|0<q[A+(9*R|0)+1]-q[y>>2]){x=O}else{if(A=T+36*R+24|0,-1==(l[A>>2]|0)){A=l[C],(A|0)==(R|0)?x=O:(x=l[r],(x|0)==(l[L>>2]|0)&&(A=l[h],l[L>>2]=x<<1,x=Ne(24*x|0),l[h]=x,Ch(x,A,12*l[r]|0),Dh(A),A=l[C],x=l[r]),l[(l[h]+12*x|0)>>2]=(A|0)>(R|0)?R:A,x=l[C],l[(l[h]+12*l[r]+4|0)>>2]=(x|0)<(R|0)?R:x,l[r]=l[r]+1|0,x=l[D])}else{if((O|0)==(l[z]|0)){l[z]=O<<1;O=Ne(O<<3);l[E]=O;var S=x;Ch(O,S,l[D]<<2);(x|0)!=(H|0)&&Dh(S)}l[((l[D]<<2)+l[E]|0)>>2]=l[A>>2];x=l[D]+1|0;l[D]=x;R=T+36*R+28|0;(x|0)==(l[z]|0)&&(A=l[E],l[z]=x<<1,x=Ne(x<<3),l[E]=x,T=A,Ch(x,T,l[D]<<2),(A|0)!=(H|0)&&Dh(T));l[((l[D]<<2)+l[E]|0)>>2]=l[R>>2];R=l[D]+1|0;x=l[D]=R}}}R=l[E];if(0>=(x|0)){break}A=x;x=R}(R|0)!=(H|0)&&(Dh(R),l[E]=0);a=G;h=l[e]}u=u+1|0;if((u|0)>=(h|0)){break}}j=l[f]}else{j=0}l[e]=0;e=(b+44|0)>>2;k=l[e];l[g>>2]=2;rp(k,k+12*j|0,g);j=0<(l[f]|0);a:do{if(j){k=b+12|0;m=b+4|0;u=l[e];n=0;p=u;u=l[u>>2];b:for(;;){r=p+12*n|0;h=-1<(u|0)?(l[k>>2]|0)>(u|0)?16:15:15;15==h&&P(N.q|0,153,N.S|0,N.o|0);h=l[m>>2];z=l[(h+16>>2)+(9*u|0)];C=p+12*n+4|0;D=l[C>>2];if(-1<(D|0)){if((l[k>>2]|0)>(D|0)){var U=h;h=19}else{h=18}}else{h=18}18==h&&(P(N.q|0,153,N.S|0,N.o|0),U=l[m>>2]);sp(d,z,l[(U+16>>2)+(9*D|0)]);h=l[f];for(z=n;;){z=z+1|0;if((z|0)>=(h|0)){break a}D=l[e];E=l[(D>>2)+(3*z|0)];if((E|0)!=(l[r>>2]|0)){n=z;p=D;u=E;continue b}if((l[(D+4>>2)+(3*z|0)]|0)!=(l[C>>2]|0)){n=z;p=D;u=E;continue b}}}}}while(0);a=g}function sp(b,d,e){var f,g,h=l[d+16>>2],j=l[e+16>>2],d=l[d+20>>2],e=l[e+20>>2],k=l[h+8>>2],m=l[j+8>>2],n=(k|0)==(m|0);a:do{if(!n){for(var p=m+112|0;;){p=l[p>>2];if(0==(p|0)){break}if((l[p>>2]|0)==(k|0)){g=l[p+4>>2]>>2;var u=l[g+12],r=l[g+13];f=l[g+14];g=l[g+15];if((u|0)==(h|0)&(r|0)==(j|0)&(f|0)==(d|0)&(g|0)==(e|0)){break a}if((u|0)==(j|0)&(r|0)==(h|0)&(f|0)==(e|0)&(g|0)==(d|0)){break a}}p=p+12|0}if(!(2!=(l[m>>2]|0)&&2!=(l[k>>2]|0))){for(p=m+108|0;;){p=l[p>>2];if(0==(p|0)){break}if((l[p>>2]|0)==(k|0)&&0==(c[l[p+4>>2]+61|0]&1)<<24>>24){break a}p=p+12|0}p=l[b+68>>2];if(0==(p|0)||K[l[l[p>>2]+8>>2]](p,h,j)){p=h;u=d;r=j;f=e;g=l[b+76>>2];0==(c[np]&1)<<24>>24&&(l[op>>2]=4,l[op+4>>2]=6,c[op+8|0]=1,l[op+96>>2]=8,l[op+100>>2]=10,c[op+104|0]=1,l[op+24>>2]=8,l[op+28>>2]=10,c[op+32|0]=0,l[op+120>>2]=12,l[op+124>>2]=14,c[op+128|0]=1,l[op+48>>2]=16,l[op+52>>2]=18,c[op+56|0]=1,l[op+12>>2]=16,l[op+16>>2]=18,c[op+20|0]=0,l[op+72>>2]=20,l[op+76>>2]=22,c[op+80|0]=1,l[op+108>>2]=20,l[op+112>>2]=22,c[op+116|0]=0,l[op+144>>2]=24,l[op+148>>2]=26,c[op+152|0]=1,l[op+36>>2]=24,l[op+40>>2]=26,c[op+44|0]=0,l[op+168>>2]=28,l[op+172>>2]=30,c[op+176|0]=1,l[op+132>>2]=28,l[op+136>>2]=30,c[op+140|0]=0,c[np]=1);var w=o[l[p+12>>2]+4>>2],x=o[l[r+12>>2]+4>>2];4>w>>>0||P(N.$|0,80,N.wb|0,N.gf|0);4>x>>>0||P(N.$|0,81,N.wb|0,N.Zf|0);var y=o[(op>>2)+(12*w|0)+(3*x|0)],r=0==(y|0)?0:0==(c[op+48*w+12*x+8|0]&1)<<24>>24?K[y](r,f,p,u,g):K[y](p,u,r,f,g);0!=(r|0)&&(u=l[l[r+48>>2]+8>>2],p=l[l[r+52>>2]+8>>2],l[(r+8|0)>>2]=0,f=(b+60|0)>>2,l[(r+12|0)>>2]=l[f],g=l[f],0!=(g|0)&&(l[(g+8|0)>>2]=r),l[f]=r,g=r+16|0,l[(r+20|0)>>2]=r,l[(g|0)>>2]=p,l[(r+24|0)>>2]=0,f=(u+112|0)>>2,l[(r+28|0)>>2]=l[f],w=l[f],0!=(w|0)&&(l[(w+8|0)>>2]=g),l[f]=g,g=r+32|0,l[(r+36|0)>>2]=r,l[(g|0)>>2]=u,l[(r+40|0)>>2]=0,f=(p+112|0)>>2,l[(r+44|0)>>2]=l[f],r=l[f],0!=(r|0)&&(l[(r+8|0)>>2]=g),l[f]=g,r=u+4|0,f=i[r>>1],0==(f&2)<<16>>16&&(i[r>>1]=f|2,q[u+144>>2]=0),u=p+4|0,r=i[u>>1],0==(r&2)<<16>>16&&(i[u>>1]=r|2,q[p+144>>2]=0),p=b+64|0,l[p>>2]=l[p>>2]+1|0)}}}}while(0)}function rp(b,d,e){var f,g,h,j,k,m,n,p,u,r,w,x,y,A,C,z,D,E,G,H,F,I,J,L,O,R,T,S,U,W,Q,$,ea,sa,Ba,oa,ga,qa,la,Ca,ia,ya,ta,Ia,na,Z,ba,ca,ma,ka,aa=e>>2,ra=a;a+=12;var ha,za=d,X=b;ka=X>>2;a:for(;;){var ua=X;ma=(X|0)>>2;ca=(X+4|0)>>2;ba=(X+8|0)>>2;Z=X>>2;var da=X+12|0,fa=za;b:for(;;){var Aa=fa,Pa=Aa-ua|0,pa=(Pa|0)/12&-1;if(0==(pa|0)||1==(pa|0)){ha=81;break a}else{if(2==(pa|0)){var cb=fa-12|0;if(!K[l[aa]](cb,X)){ha=81;break a}var Qa=l[ma],Ta=l[ca],$a=l[ba];na=cb>>2;l[Z]=l[na];l[Z+1]=l[na+1];l[Z+2]=l[na+2];l[cb>>2]=Qa;l[fa-12+4>>2]=Ta;l[fa-12+8>>2]=$a;ha=81;break a}else{if(3==(pa|0)){var va=fa-12|0;Ia=va>>2;var Wa=K[l[aa]](da,X),fb=K[l[aa]](va,da);if(!Wa){if(!fb){ha=81;break a}var gb=da|0,Xa=l[gb>>2],Ua=X+16|0,Va=l[Ua>>2],pb=X+20|0,nb=l[pb>>2];ta=da>>2;ya=va>>2;l[ta]=l[ya];l[ta+1]=l[ya+1];l[ta+2]=l[ya+2];l[Ia]=Xa;l[fa-12+4>>2]=Va;l[fa-12+8>>2]=nb;if(!K[l[aa]](da,X)){ha=81;break a}var La=l[ma],qb=l[ca],bb=l[ba];l[Z]=l[ta];l[Z+1]=l[ta+1];l[Z+2]=l[ta+2];l[gb>>2]=La;l[Ua>>2]=qb;l[pb>>2]=bb;ha=81;break a}var Fa=l[ma],Ma=l[ca],wa=l[ba];if(fb){ia=va>>2;l[Z]=l[ia];l[Z+1]=l[ia+1];l[Z+2]=l[ia+2];l[Ia]=Fa;l[fa-12+4>>2]=Ma;l[fa-12+8>>2]=wa;ha=81;break a}Ca=da>>2;l[Z]=l[Ca];l[Z+1]=l[Ca+1];l[Z+2]=l[Ca+2];var hb=da|0;l[hb>>2]=Fa;var Ya=X+16|0;l[Ya>>2]=Ma;var Za=X+20|0;l[Za>>2]=wa;if(!K[l[aa]](va,da)){ha=81;break a}var Da=l[hb>>2],Na=l[Ya>>2],ib=l[Za>>2];la=va>>2;l[Ca]=l[la];l[Ca+1]=l[la+1];l[Ca+2]=l[la+2];l[Ia]=Da;l[fa-12+4>>2]=Na;l[fa-12+8>>2]=ib;ha=81;break a}else{if(4==(pa|0)){tp(X,da,X+24|0,fa-12|0,e);ha=81;break a}else{if(5==(pa|0)){var ab=X+24|0,Ga=X+36|0,jb=fa-12|0;tp(X,da,ab,Ga,e);if(!K[l[aa]](jb,Ga)){ha=81;break a}var Ea=Ga|0,Oa=l[Ea>>2],Ja=X+40|0,db=l[Ja>>2],xa=X+44|0,Ra=l[xa>>2];qa=Ga>>2;ga=jb>>2;l[qa]=l[ga];l[qa+1]=l[ga+1];l[qa+2]=l[ga+2];l[jb>>2]=Oa;l[fa-12+4>>2]=db;l[fa-12+8>>2]=Ra;if(!K[l[aa]](Ga,ab)){ha=81;break a}var Ka=ab|0,tb=l[Ka>>2],kb=X+28|0,ub=l[kb>>2],rb=X+32|0,Bb=l[rb>>2];oa=ab>>2;l[oa]=l[qa];l[oa+1]=l[qa+1];l[oa+2]=l[qa+2];l[Ea>>2]=tb;l[Ja>>2]=ub;l[xa>>2]=Bb;if(!K[l[aa]](ab,da)){ha=81;break a}var lb=da|0,yb=l[lb>>2],xb=X+16|0,Ib=l[xb>>2],wb=X+20|0,vb=l[wb>>2];Ba=da>>2;l[Ba]=l[oa];l[Ba+1]=l[oa+1];l[Ba+2]=l[oa+2];l[Ka>>2]=yb;l[kb>>2]=Ib;l[rb>>2]=vb;if(!K[l[aa]](da,X)){ha=81;break a}var zb=l[ma],Eb=l[ca],Cb=l[ba];l[Z]=l[Ba];l[Z+1]=l[Ba+1];l[Z+2]=l[Ba+2];l[lb>>2]=zb;l[xb>>2]=Eb;l[wb>>2]=Cb;ha=81;break a}else{if(372>(Pa|0)){ha=22;break a}var eb=fa-12|0;sa=eb>>2;var sb=(Pa|0)/24&-1,ob=X+12*sb|0;if(11988<(Pa|0)){var Db=(Pa|0)/48&-1,Jb=X+12*Db|0,Rb=Db+sb|0,Nb=X+12*Rb|0,Ob=tp(X,Jb,ob,Nb,e);if(K[l[aa]](eb,Nb)){var Kb=Nb|0,Pb=l[Kb>>2],Mb=X+12*Rb+4|0,Yb=l[Mb>>2],Zb=X+12*Rb+8|0,ec=l[Zb>>2];ea=Nb>>2;$=eb>>2;l[ea]=l[$];l[ea+1]=l[$+1];l[ea+2]=l[$+2];l[sa]=Pb;l[fa-12+4>>2]=Yb;l[fa-12+8>>2]=ec;var Ub=Ob+1|0;if(K[l[aa]](Nb,ob)){var jc=ob|0,Qb=l[jc>>2],mb=X+12*sb+4|0,cc=l[mb>>2],Fb=X+12*sb+8|0,gc=l[Fb>>2];Q=ob>>2;l[Q]=l[ea];l[Q+1]=l[ea+1];l[Q+2]=l[ea+2];l[Kb>>2]=Qb;l[Mb>>2]=cc;l[Zb>>2]=gc;var vc=Ob+2|0;if(K[l[aa]](ob,Jb)){var pc=Jb|0,qc=l[pc>>2],$c=X+12*Db+4|0,Ec=l[$c>>2],sc=X+12*Db+8|0,kd=l[sc>>2];W=Jb>>2;l[W]=l[Q];l[W+1]=l[Q+1];l[W+2]=l[Q+2];l[jc>>2]=qc;l[mb>>2]=Ec;l[Fb>>2]=kd;var wd=Ob+3|0;if(K[l[aa]](Jb,X)){var Lc=l[ma],$b=l[ca],ac=l[ba];l[Z]=l[W];l[Z+1]=l[W+1];l[Z+2]=l[W+2];l[pc>>2]=Lc;l[$c>>2]=$b;l[sc>>2]=ac;oc=Ob+4|0}else{oc=wd}}else{oc=vc}}else{oc=Ub}}else{var oc=Ob}}else{var tc=K[l[aa]](ob,X),Nc=K[l[aa]](eb,ob);if(tc){var ld=l[ma],Wc=l[ca],ad=l[ba];if(Nc){U=eb>>2,l[Z]=l[U],l[Z+1]=l[U+1],l[Z+2]=l[U+2],l[sa]=ld,l[fa-12+4>>2]=Wc,l[fa-12+8>>2]=ad,oc=1}else{S=ob>>2;l[Z]=l[S];l[Z+1]=l[S+1];l[Z+2]=l[S+2];var Xc=ob|0;l[Xc>>2]=ld;var Cc=X+12*sb+4|0;l[Cc>>2]=Wc;var fd=X+12*sb+8|0;l[fd>>2]=ad;if(K[l[aa]](eb,ob)){var md=l[Xc>>2],nd=l[Cc>>2],Oc=l[fd>>2];T=eb>>2;l[S]=l[T];l[S+1]=l[T+1];l[S+2]=l[T+2];l[sa]=md;l[fa-12+4>>2]=nd;l[fa-12+8>>2]=Oc;oc=2}else{oc=1}}}else{if(Nc){var gd=ob|0,od=l[gd>>2],pd=X+12*sb+4|0,Pd=l[pd>>2],Xd=X+12*sb+8|0,qd=l[Xd>>2];R=ob>>2;O=eb>>2;l[R]=l[O];l[R+1]=l[O+1];l[R+2]=l[O+2];l[sa]=od;l[fa-12+4>>2]=Pd;l[fa-12+8>>2]=qd;if(K[l[aa]](ob,X)){var Qd=l[ma],Pc=l[ca],Ic=l[ba];l[Z]=l[R];l[Z+1]=l[R+1];l[Z+2]=l[R+2];l[gd>>2]=Qd;l[pd>>2]=Pc;l[Xd>>2]=Ic;oc=2}else{oc=1}}else{oc=0}}}if(K[l[aa]](X,ob)){var Jc=eb,fc=oc}else{for(var hd=eb;;){var xd=hd-12|0,bd=o[aa];if((X|0)==(xd|0)){break b}if(K[bd](xd,ob)){break}hd=xd}var rd=l[ma],ye=l[ca],Yd=l[ba];L=xd>>2;l[Z]=l[L];l[Z+1]=l[L+1];l[Z+2]=l[L+2];l[xd>>2]=rd;l[hd-12+4>>2]=ye;l[hd-12+8>>2]=Yd;Jc=xd;fc=oc+1|0}var Tc=da>>>0<Jc>>>0;c:do{if(Tc){for(var wc=Jc,bc=da,Ed=fc,xc=ob;;){var Ac=bc;for(J=Ac>>2;;){var Zd=K[l[aa]](Ac,xc),$d=Ac+12|0;if(!Zd){var cd=wc;break}Ac=$d;J=Ac>>2}for(;;){var yc=cd-12|0;if(K[l[aa]](yc,xc)){break}cd=yc}if(Ac>>>0>yc>>>0){var kc=Ac;I=kc>>2;var Rd=Ed,Fc=xc;F=Fc>>2;break c}var Qc=l[J],Mc=l[J+1],ne=l[J+2];H=Ac>>2;G=yc>>2;l[H]=l[G];l[H+1]=l[G+1];l[H+2]=l[G+2];l[yc>>2]=Qc;l[cd-12+4>>2]=Mc;l[cd-12+8>>2]=ne;var Sd=(xc|0)==(Ac|0)?yc:xc,wc=yc,bc=$d,Ed=Ed+1|0,xc=Sd}}else{kc=da,I=kc>>2,Rd=fc,Fc=ob,F=Fc>>2}}while(0);if((kc|0)==(Fc|0)){var Td=Rd}else{if(K[l[aa]](Fc,kc)){var Ud=l[I],xf=l[I+1],Fd=l[I+2];E=kc>>2;D=Fc>>2;l[E]=l[D];l[E+1]=l[D+1];l[E+2]=l[D+2];l[F]=Ud;l[F+1]=xf;l[F+2]=Fd;Td=Rd+1|0}else{Td=Rd}}if(0==(Td|0)){var oe=up(X,kc,e),He=kc+12|0;if(up(He,fa,e)){if(oe){ha=81;break a}fa=kc;continue}else{if(oe){za=fa;X=He;ka=X>>2;continue a}}}var ae=kc;if((ae-ua|0)<(Aa-ae|0)){rp(X,kc,e);za=fa;X=kc+12|0;ka=X>>2;continue a}rp(kc+12|0,fa,e);fa=kc}}}}}}if(K[bd](X,eb)){var Gc=da}else{var dd=da;for(z=dd>>2;;){if((dd|0)==(eb|0)){ha=81;break a}var be=K[l[aa]](X,dd),pe=dd+12|0;if(be){break}dd=pe;z=dd>>2}var Uc=l[z],lc=l[z+1],Gd=l[z+2];C=dd>>2;A=eb>>2;l[C]=l[A];l[C+1]=l[A+1];l[C+2]=l[A+2];l[sa]=Uc;l[fa-12+4>>2]=lc;l[fa-12+8>>2]=Gd;Gc=pe}if((Gc|0)==(eb|0)){ha=81;break}for(var Hd=eb,Re=Gc;;){var Id=Re;for(y=Id>>2;;){var Jd=K[l[aa]](X,Id),qe=Id+12|0;if(Jd){var re=Hd;break}Id=qe;y=Id>>2}for(;;){var Kd=re-12|0;if(!K[l[aa]](X,Kd)){break}re=Kd}if(Id>>>0>=Kd>>>0){za=fa;X=Id;ka=X>>2;continue a}var Se=l[y],Rf=l[y+1],sd=l[y+2];x=Id>>2;w=Kd>>2;l[x]=l[w];l[x+1]=l[w+1];l[x+2]=l[w+2];l[Kd>>2]=Se;l[re-12+4>>2]=Rf;l[re-12+8>>2]=sd;Hd=Kd;Re=qe}}a:do{if(22==ha){r=ra>>2;var Vc=X+24|0;u=Vc>>2;var Te=K[l[aa]](da,X),Ue=K[l[aa]](Vc,da);if(Te){var ce=l[ma],Yc=l[ca],yd=l[ba];if(Ue){p=Vc>>2,l[Z]=l[p],l[Z+1]=l[p+1],l[Z+2]=l[p+2],l[u]=ce,l[ka+7]=Yc,l[ka+8]=yd}else{n=da>>2;l[Z]=l[n];l[Z+1]=l[n+1];l[Z+2]=l[n+2];var $e=da|0;l[$e>>2]=ce;var ze=X+16|0;l[ze>>2]=Yc;var Zc=X+20|0;l[Zc>>2]=yd;if(K[l[aa]](Vc,da)){var Ld=l[$e>>2],Md=l[ze>>2],de=l[Zc>>2];m=Vc>>2;l[n]=l[m];l[n+1]=l[m+1];l[n+2]=l[m+2];l[u]=Ld;l[ka+7]=Md;l[ka+8]=de}}}else{if(Ue){var zd=da|0,ee=l[zd>>2],yf=X+16|0,af=l[yf>>2],Ie=X+20|0,zf=l[Ie>>2];k=da>>2;j=Vc>>2;l[k]=l[j];l[k+1]=l[j+1];l[k+2]=l[j+2];l[u]=ee;l[ka+7]=af;l[ka+8]=zf;if(K[l[aa]](da,X)){var jf=l[ma],bf=l[ca],Sf=l[ba];l[Z]=l[k];l[Z+1]=l[k+1];l[Z+2]=l[k+2];l[zd>>2]=jf;l[yf>>2]=bf;l[Ie>>2]=Sf}}}var kf=X+36|0;if((kf|0)!=(fa|0)){for(var Ae=Vc,Ad=kf;;){if(K[l[aa]](Ad,Ae)){h=Ad>>2;l[r]=l[h];l[r+1]=l[h+1];l[r+2]=l[h+2];for(var Af=Ae,Tf=Ad;;){g=Tf>>2;f=Af>>2;l[g]=l[f];l[g+1]=l[f+1];l[g+2]=l[f+2];if((Af|0)==(X|0)){break}var Fg=Af-12|0;if(!K[l[aa]](ra,Fg)){break}Tf=Af;Af=Fg}l[f]=l[r];l[f+1]=l[r+1];l[f+2]=l[r+2]}var Gg=Ad+12|0;if((Gg|0)==(fa|0)){break a}Ae=Ad;Ad=Gg}}}}while(0);a=ra}function tp(b,d,e,f,g){var h,j,k,m,n=g>>2;k=e>>2;var g=b>>2,p=K[l[n]](d,b);j=K[l[n]](e,d);if(p){var u=l[g];m=l[g+1];p=l[g+2];h=b>>2;j?(j=e>>2,l[h]=l[j],l[h+1]=l[j+1],l[h+2]=l[j+2],l[k]=u,l[k+1]=m,l[k+2]=p,k=1):(j=d>>2,l[h]=l[j],l[h+1]=l[j+1],l[h+2]=l[j+2],h=d|0,l[h>>2]=u,u=d+4|0,l[u>>2]=m,m=d+8|0,l[m>>2]=p,K[l[n]](e,d)?(p=l[h>>2],u=l[u>>2],h=l[m>>2],m=e>>2,l[j]=l[m],l[j+1]=l[m+1],l[j+2]=l[m+2],l[k]=p,l[k+1]=u,l[k+2]=h,k=2):k=1)}else{if(j){var p=d|0,r=l[p>>2];m=d+4|0;var w=l[m>>2],u=d+8|0,x=l[u>>2];j=d>>2;h=e>>2;l[j]=l[h];l[j+1]=l[h+1];l[j+2]=l[h+2];l[k]=r;l[k+1]=w;l[k+2]=x;K[l[n]](d,b)?(h=l[g],r=l[g+1],w=l[g+2],k=b>>2,l[k]=l[j],l[k+1]=l[j+1],l[k+2]=l[j+2],l[p>>2]=h,l[m>>2]=r,l[u>>2]=w,k=2):k=1}else{k=0}}if(K[l[n]](f,e)){if(p=e|0,r=l[p>>2],m=e+4|0,w=l[m>>2],u=e+8|0,x=l[u>>2],j=e>>2,h=f>>2,l[j]=l[h],l[j+1]=l[h+1],l[j+2]=l[h+2],l[f>>2]=r,l[f+4>>2]=w,l[f+8>>2]=x,f=k+1|0,K[l[n]](e,d)){f=d|0;w=l[f>>2];h=d+4|0;var x=l[h>>2],r=d+8|0,y=l[r>>2],e=d>>2;l[e]=l[j];l[e+1]=l[j+1];l[e+2]=l[j+2];l[p>>2]=w;l[m>>2]=x;l[u>>2]=y;j=k+2|0;K[l[n]](d,b)?(d=l[g],n=l[g+1],g=l[g+2],b>>=2,l[b]=l[e],l[b+1]=l[e+1],l[b+2]=l[e+2],l[f>>2]=d,l[h>>2]=n,l[r>>2]=g,b=k+3|0):b=j}else{b=f}}else{b=k}return b}function up(b,d,e){var f,g,h,j,k,m,n,p,u,r,w,x,y,A,C,z,D,E,G,H,F,I,J,L,O,R,T,S=e>>2,U=b>>2,W=a;a+=12;var Q=(d-b|0)/12&-1;a:do{if(0==(Q|0)||1==(Q|0)){var $=1}else{if(2==(Q|0)){var ea=d-12|0;if(K[l[S]](ea,b)){var sa=l[U],Ba=l[U+1],oa=l[U+2];T=b>>2;R=ea>>2;l[T]=l[R];l[T+1]=l[R+1];l[T+2]=l[R+2];l[ea>>2]=sa;l[d-12+4>>2]=Ba;l[d-12+8>>2]=oa}$=1}else{if(3==(Q|0)){var ga=b+12|0,qa=d-12|0;O=qa>>2;var la=K[l[S]](ga,b),Ca=K[l[S]](qa,ga);if(la){var ia=l[U],ya=l[U+1],ta=l[U+2];L=b>>2;if(Ca){J=qa>>2,l[L]=l[J],l[L+1]=l[J+1],l[L+2]=l[J+2],l[O]=ia,l[d-12+4>>2]=ya,l[d-12+8>>2]=ta}else{I=ga>>2;l[L]=l[I];l[L+1]=l[I+1];l[L+2]=l[I+2];var Ia=ga|0;l[Ia>>2]=ia;var na=b+16|0;l[na>>2]=ya;var Z=b+20|0;l[Z>>2]=ta;if(K[l[S]](qa,ga)){var ba=l[Ia>>2],ca=l[na>>2],ma=l[Z>>2];F=qa>>2;l[I]=l[F];l[I+1]=l[F+1];l[I+2]=l[F+2];l[O]=ba;l[d-12+4>>2]=ca;l[d-12+8>>2]=ma}}}else{if(Ca){var ka=ga|0,aa=l[ka>>2],ra=b+16|0,ha=l[ra>>2],za=b+20|0,X=l[za>>2];H=ga>>2;G=qa>>2;l[H]=l[G];l[H+1]=l[G+1];l[H+2]=l[G+2];l[O]=aa;l[d-12+4>>2]=ha;l[d-12+8>>2]=X;if(K[l[S]](ga,b)){var ua=l[U],da=l[U+1],fa=l[U+2];E=b>>2;l[E]=l[H];l[E+1]=l[H+1];l[E+2]=l[H+2];l[ka>>2]=ua;l[ra>>2]=da;l[za>>2]=fa}}}$=1}else{if(4==(Q|0)){tp(b,b+12|0,b+24|0,d-12|0,e),$=1}else{if(5==(Q|0)){var Aa=b+12|0,Pa=b+24|0,pa=b+36|0,cb=d-12|0;tp(b,Aa,Pa,pa,e);if(K[l[S]](cb,pa)){var Qa=pa|0,Ta=l[Qa>>2],$a=b+40|0,va=l[$a>>2],Wa=b+44|0,fb=l[Wa>>2];D=pa>>2;z=cb>>2;l[D]=l[z];l[D+1]=l[z+1];l[D+2]=l[z+2];l[cb>>2]=Ta;l[d-12+4>>2]=va;l[d-12+8>>2]=fb;if(K[l[S]](pa,Pa)){var gb=Pa|0,Xa=l[gb>>2],Ua=b+28|0,Va=l[Ua>>2],pb=b+32|0,nb=l[pb>>2];C=Pa>>2;l[C]=l[D];l[C+1]=l[D+1];l[C+2]=l[D+2];l[Qa>>2]=Xa;l[$a>>2]=Va;l[Wa>>2]=nb;if(K[l[S]](Pa,Aa)){var La=Aa|0,qb=l[La>>2],bb=b+16|0,Fa=l[bb>>2],Ma=b+20|0,wa=l[Ma>>2];A=Aa>>2;l[A]=l[C];l[A+1]=l[C+1];l[A+2]=l[C+2];l[gb>>2]=qb;l[Ua>>2]=Fa;l[pb>>2]=wa;if(K[l[S]](Aa,b)){var hb=l[U],Ya=l[U+1],Za=l[U+2];y=b>>2;l[y]=l[A];l[y+1]=l[A+1];l[y+2]=l[A+2];l[La>>2]=hb;l[bb>>2]=Ya;l[Ma>>2]=Za}}}}$=1}else{var Da=b+24|0;x=Da>>2;var Na=b+12|0,ib=K[l[S]](Na,b),ab=K[l[S]](Da,Na);if(ib){var Ga=l[U],jb=l[U+1],Ea=l[U+2];w=b>>2;if(ab){r=Da>>2,l[w]=l[r],l[w+1]=l[r+1],l[w+2]=l[r+2],l[x]=Ga,l[U+7]=jb,l[U+8]=Ea}else{u=Na>>2;l[w]=l[u];l[w+1]=l[u+1];l[w+2]=l[u+2];var Oa=Na|0;l[Oa>>2]=Ga;var Ja=b+16|0;l[Ja>>2]=jb;var db=b+20|0;l[db>>2]=Ea;if(K[l[S]](Da,Na)){var xa=l[Oa>>2],Ra=l[Ja>>2],Ka=l[db>>2];p=Da>>2;l[u]=l[p];l[u+1]=l[p+1];l[u+2]=l[p+2];l[x]=xa;l[U+7]=Ra;l[U+8]=Ka}}}else{if(ab){var tb=Na|0,kb=l[tb>>2],ub=b+16|0,rb=l[ub>>2],Bb=b+20|0,lb=l[Bb>>2];n=Na>>2;m=Da>>2;l[n]=l[m];l[n+1]=l[m+1];l[n+2]=l[m+2];l[x]=kb;l[U+7]=rb;l[U+8]=lb;if(K[l[S]](Na,b)){var yb=l[U],xb=l[U+1],Ib=l[U+2];k=b>>2;l[k]=l[n];l[k+1]=l[n+1];l[k+2]=l[n+2];l[tb>>2]=yb;l[ub>>2]=xb;l[Bb>>2]=Ib}}}j=W>>2;for(var wb=b+36|0,vb=0,zb=Da;;){if((wb|0)==(d|0)){$=1;break a}if(K[l[S]](wb,zb)){h=wb>>2;l[j]=l[h];l[j+1]=l[h+1];l[j+2]=l[h+2];for(var Eb=zb,Cb=wb;;){g=Cb>>2;f=Eb>>2;l[g]=l[f];l[g+1]=l[f+1];l[g+2]=l[f+2];if((Eb|0)==(b|0)){break}var eb=Eb-12|0;if(!K[l[S]](W,eb)){break}Cb=Eb;Eb=eb}l[f]=l[j];l[f+1]=l[j+1];l[f+2]=l[j+2];var sb=vb+1|0;if(8==(sb|0)){break}var ob=sb}else{ob=vb}zb=wb;wb=wb+12|0;vb=ob}$=(wb+12|0)==(d|0)}}}}}}while(0);a=W;return $}function gp(b,d){var e,f;0!=(l[b+28>>2]|0)&&P(N.Pa|0,72,N.xb|0,N.Ab|0);f=(b+12|0)>>2;e=l[f];var g=K[l[l[e>>2]+12>>2]](e);e=b+24|0;var h=o[e>>2],g=28*g|0,j=0==(g|0);a:do{if(!j){var k=0<(g|0);do{if(k){if(640>=(g|0)){break}Dh(h);break a}P(N.e|0,164,N.f|0,N.Va|0)}while(0);var m=ed[rn+g|0],k=m&255;14>(m&255)||P(N.e|0,173,N.f|0,N.g|0);m=h;k=(k<<2)+d+12|0;l[h>>2]=l[k>>2];l[k>>2]=m}}while(0);l[e>>2]=0;h=o[f];e=h>>2;g=l[e+1];0==(g|0)?(K[l[l[e]>>2]](h),g=ed[rn+20|0],j=g&255,14>(g&255)||P(N.e|0,173,N.f|0,N.g|0),g=(j<<2)+d+12|0,l[e]=l[g>>2],l[g>>2]=h):1==(g|0)?(K[l[l[e]>>2]](h),g=ed[rn+48|0],j=g&255,14>(g&255)||P(N.e|0,173,N.f|0,N.g|0),g=(j<<2)+d+12|0,l[e]=l[g>>2],l[g>>2]=h):2==(g|0)?(K[l[l[e]>>2]](h),g=ed[rn+152|0],j=g&255,14>(g&255)||P(N.e|0,173,N.f|0,N.g|0),g=(j<<2)+d+12|0,l[e]=l[g>>2],l[g>>2]=h):3==(g|0)?(K[l[l[e]>>2]](h),g=ed[rn+40|0],j=g&255,14>(g&255)||P(N.e|0,173,N.f|0,N.g|0),g=(j<<2)+d+12|0,l[e]=l[g>>2],l[g>>2]=h):P(N.Pa|0,115,N.xb|0,N.l|0);l[f]=0}function wo(b,d,e,f){var g,h,j=a;a+=40;var k=j+16,m=j+32,n=b+28|0,p=0<(l[n>>2]|0);a:do{if(p){var u=b+24|0,r=b+12|0,w=j|0,x=k|0,y=j+4|0,A=k+4|0,C=j+8|0,z=k+8|0,D=j+12|0,E=k+12|0,G=f|0,H=e|0,F=f+4|0,I=e+4|0,J=m|0,L=m+4|0,O=d|0;h=(d+40|0)>>2;var R=d+36|0;g=(d+32|0)>>2;for(var T=0;;){var S=l[u>>2],U=l[r>>2],W=S+28*T+20|0;K[l[l[U>>2]+24>>2]](U,j,e,l[W>>2]);U=l[r>>2];K[l[l[U>>2]+24>>2]](U,k,f,l[W>>2]);var W=S+28*T|0,U=q[w>>2],Q=q[x>>2],$=q[y>>2],ea=q[A>>2],ea=$<ea?$:ea,$=W,U=(M[0]=U<Q?U:Q,t[0]),Q=(M[0]=ea,t[0])|0;l[($|0)>>2]=0|U;l[($+4|0)>>2]=Q;U=q[C>>2];Q=q[z>>2];$=q[D>>2];ea=q[E>>2];ea=$>ea?$:ea;$=S+28*T+8|0;U=(M[0]=U>Q?U:Q,t[0]);Q=(M[0]=ea,t[0])|0;l[($|0)>>2]=0|U;l[($+4|0)>>2]=Q;U=q[F>>2]-q[I>>2];q[J>>2]=q[G>>2]-q[H>>2];q[L>>2]=U;S=l[(S+24>>2)+(7*T|0)];Rl(O,S,W,m)&&(U=l[h],(U|0)==(l[R>>2]|0)?(W=l[g],l[R>>2]=U<<1,U=Ne(U<<3),l[g]=U,Ch(U,W,l[h]<<2),Dh(W),W=l[h]):W=U,l[((W<<2)+l[g]|0)>>2]=S,l[h]=l[h]+1|0);T=T+1|0;if((T|0)>=(l[n>>2]|0)){break a}}}}while(0);a=j}function xo(b){var d,e,f=b+8|0,g=l[f>>2],h=0==(g|0);a:do{if(!h){e=l[g+112>>2];if(0==(e|0)){e=g}else{for(;;){var j=l[e+4>>2];(l[j+48>>2]|0)==(b|0)|(l[j+52>>2]|0)==(b|0)&&(j=j+4|0,l[j>>2]|=8);e=l[e+12>>2];if(0==(e|0)){break}}e=l[f>>2]}d=l[e+88>>2];if(0!=(d|0)&&(j=b+28|0,0<(l[j>>2]|0))){var k=b+24|0;e=(d+102912|0)>>2;var m=d+102908|0;d=(d+102904|0)>>2;for(var n=0,p=l[e];;){var u=l[(l[k>>2]+24>>2)+(7*n|0)];if((p|0)==(l[m>>2]|0)){var r=l[d];l[m>>2]=p<<1;p=Ne(p<<3);l[d]=p;Ch(p,r,l[e]<<2);Dh(r);r=l[e]}else{r=p}l[((r<<2)+l[d]|0)>>2]=u;u=l[e]+1|0;l[e]=u;n=n+1|0;if((n|0)>=(l[j>>2]|0)){break a}p=u}}}}while(0)}function mp(b,d){var e,f,g=a,h;V(N.Gg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));f=q[b+16>>2];V(N.Vg|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=q[b+20>>2];V(N.hh|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=q[b>>2];V(N.nh|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=c[b+38|0]&1;V(N.vh|0,(s=a,a+=4,l[s>>2]=f,s));f=jd[b+32>>1]&65535;V(N.yh|0,(s=a,a+=4,l[s>>2]=f,s));f=jd[b+34>>1]&65535;V(N.Eh|0,(s=a,a+=4,l[s>>2]=f,s));f=i[b+36>>1]<<16>>16;V(N.Se|0,(s=a,a+=4,l[s>>2]=f,s));var j=o[b+12>>2];f=j>>2;var k=l[f+1];do{if(0==(k|0)){V(N.Ye|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),h=q[f+2],V(N.Bb|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s)),h=q[f+3],e=q[f+4],V(N.nf|0,(s=a,a+=16,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=e,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s)),h=13}else{if(1==(k|0)){h=j;V(N.sf|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));e=q[f+2];V(N.Bb|0,(s=a,a+=8,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],s));var m=j+28|0;e=q[m>>2];m=q[m+4>>2];V(N.xf|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));e=q[f+3];m=q[f+4];V(N.Df|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));m=j+20|0;e=q[m>>2];m=q[m+4>>2];V(N.Hf|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));e=q[f+9];m=q[f+10];V(N.Mf|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));e=c[j+44|0]&1;V(N.Pf|0,(s=a,a+=4,l[s>>2]=e,s));h=c[h+45|0]&1;V(N.Rf|0,(s=a,a+=4,l[s>>2]=h,s));h=13}else{if(2==(k|0)){V(N.Uf|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.Mb|0,(s=a,a+=4,l[s>>2]=8,s));h=j+148|0;e=o[h>>2];m=0<(e|0);a:do{if(m){for(var n=j+20|0,p=0;;){var u=q[n+(p<<3)>>2],r=q[n+(p<<3)+4>>2];V(N.Nb|0,(s=a,a+=20,l[s>>2]=p,Ee[0]=u,l[s+4>>2]=t[0],l[s+8>>2]=t[1],Ee[0]=r,l[s+12>>2]=t[0],l[s+16>>2]=t[1],s));p=p+1|0;u=l[h>>2];if((p|0)>=(u|0)){var w=u;break a}}}else{w=e}}while(0);V(N.jg|0,(s=a,a+=4,l[s>>2]=w,s));h=13}else{if(3==(k|0)){h=j;V(N.mg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));e=(j+16|0)>>2;m=l[e];V(N.Mb|0,(s=a,a+=4,l[s>>2]=m,s));m=l[e];n=0<(m|0);a:do{if(n){p=j+12|0;for(u=0;;){var x=l[p>>2],r=q[x+(u<<3)>>2],x=q[x+(u<<3)+4>>2];V(N.Nb|0,(s=a,a+=20,l[s>>2]=u,Ee[0]=r,l[s+4>>2]=t[0],l[s+8>>2]=t[1],Ee[0]=x,l[s+12>>2]=t[0],l[s+16>>2]=t[1],s));u=u+1|0;r=l[e];if((u|0)>=(r|0)){var y=r;break a}}}else{y=m}}while(0);V(N.qg|0,(s=a,a+=4,l[s>>2]=y,s));m=j+20|0;e=q[m>>2];m=q[m+4>>2];V(N.ug|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));m=j+28|0;e=q[m>>2];m=q[m+4>>2];V(N.yg|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));e=c[j+36|0]&1;V(N.Bg|0,(s=a,a+=4,l[s>>2]=e,s));h=c[h+37|0]&1;V(N.Eg|0,(s=a,a+=4,l[s>>2]=h,s));h=13}else{h=14}}}}}while(0);13==h&&(V(N.Za|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),V(N.Ig|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),V(N.Za|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),V(N.Mg|0,(s=a,a+=4,l[s>>2]=d,s)));a=g}function vp(b,d,e,f,g,h){var j,k,m,n,p=b>>2;j=(b+40|0)>>2;l[j]=d;l[p+11]=e;l[p+12]=f;l[p+7]=0;l[p+9]=0;l[p+8]=0;b=(b|0)>>2;l[b]=g;l[p+1]=h;k=d<<2;d=(g+102796|0)>>2;h=l[d];32>(h|0)?m=h:(P(N.n|0,38,N.w|0,N.D|0),m=l[d]);h=(g+12*m+102412|0)>>2;l[(g+102416>>2)+(3*m|0)]=k;n=(g+102400|0)>>2;var u=l[n];102400<(u+k|0)?(n=Ne(k),l[h]=n,c[g+12*m+102420|0]=1):(l[h]=g+u|0,c[g+12*m+102420|0]=0,l[n]=l[n]+k|0);m=g+102404|0;k=l[m>>2]+k|0;l[m>>2]=k;g=g+102408|0;m=l[g>>2];l[g>>2]=(m|0)>(k|0)?m:k;l[d]=l[d]+1|0;l[p+2]=l[h];g=l[b];h=e<<2;e=(g+102796|0)>>2;d=l[e];32>(d|0)?k=d:(P(N.n|0,38,N.w|0,N.D|0),k=l[e]);d=g+12*k+102412|0;l[(g+12*k+102416|0)>>2]=h;m=(g+102400|0)>>2;n=l[m];102400<(n+h|0)?(m=Ne(h),l[(d|0)>>2]=m,c[g+12*k+102420|0]=1):(l[(d|0)>>2]=g+n|0,c[g+12*k+102420|0]=0,l[m]=l[m]+h|0);k=g+102404|0;h=l[k>>2]+h|0;l[k>>2]=h;g=g+102408|0;k=l[g>>2];l[g>>2]=(k|0)>(h|0)?k:h;l[e]=l[e]+1|0;l[p+3]=l[d>>2];e=l[b];d=f<<2;f=(e+102796|0)>>2;g=l[f];32>(g|0)?h=g:(P(N.n|0,38,N.w|0,N.D|0),h=l[f]);g=e+12*h+102412|0;l[(e+12*h+102416|0)>>2]=d;k=(e+102400|0)>>2;m=l[k];102400<(m+d|0)?(k=Ne(d),l[(g|0)>>2]=k,c[e+12*h+102420|0]=1):(l[(g|0)>>2]=e+m|0,c[e+12*h+102420|0]=0,l[k]=l[k]+d|0);h=e+102404|0;d=l[h>>2]+d|0;l[h>>2]=d;e=e+102408|0;h=l[e>>2];l[e>>2]=(h|0)>(d|0)?h:d;l[f]=l[f]+1|0;l[p+4]=l[g>>2];g=l[b];d=12*l[j]|0;f=(g+102796|0)>>2;e=l[f];32>(e|0)?h=e:(P(N.n|0,38,N.w|0,N.D|0),h=l[f]);e=g+12*h+102412|0;l[(g+12*h+102416|0)>>2]=d;k=(g+102400|0)>>2;m=l[k];102400<(m+d|0)?(k=Ne(d),l[(e|0)>>2]=k,c[g+12*h+102420|0]=1):(l[(e|0)>>2]=g+m|0,c[g+12*h+102420|0]=0,l[k]=l[k]+d|0);h=g+102404|0;d=l[h>>2]+d|0;l[h>>2]=d;g=g+102408|0;h=l[g>>2];l[g>>2]=(h|0)>(d|0)?h:d;l[f]=l[f]+1|0;l[p+6]=l[e>>2];b=l[b];e=12*l[j]|0;j=(b+102796|0)>>2;f=l[j];32>(f|0)?g=f:(P(N.n|0,38,N.w|0,N.D|0),g=l[j]);f=b+12*g+102412|0;l[(b+12*g+102416|0)>>2]=e;d=(b+102400|0)>>2;h=l[d];102400<(h+e|0)?(d=Ne(e),l[(f|0)>>2]=d,c[b+12*g+102420|0]=1):(l[(f|0)>>2]=b+h|0,c[b+12*g+102420|0]=0,l[d]=l[d]+e|0);g=b+102404|0;e=l[g>>2]+e|0;l[g>>2]=e;b=b+102408|0;g=l[b>>2];l[b>>2]=(g|0)>(e|0)?g:e;l[j]=l[j]+1|0;l[p+5]=l[f>>2]}function wp(b,d){var e,f;e=b>>2;var g=b|0,h=b+8|0;l[h>>2]=128;l[e+1]=0;var j=Ne(1024);l[e]=j;Oe(j,l[h>>2]<<3);h=(b+12|0)>>2;for(j=h+14;h<j;h++){l[h]=0}if(0==(c[xp]&1)<<24>>24){j=0;for(h=1;!(14>(j|0)||P(N.e|0,73,N.Ga|0,N.Ta|0),(h|0)>(l[sn+(j<<2)>>2]|0)&&(j=j+1|0),c[rn+h|0]=j&255,h=h+1|0,641==(h|0));){}c[xp]=1}l[e+25617]=0;l[e+25618]=0;l[e+25619]=0;l[e+25716]=0;fh(b+102872|0);l[e+25733]=0;l[e+25734]=0;l[e+25735]=yp;l[e+25736]=zp;h=b+102948|0;j=b+102968|0;l[e+25745]=0;l[e+25746]=0;f=h>>2;l[f]=0;l[f+1]=0;l[f+2]=0;l[f+3]=0;l[f+4]=0;c[b+102992|0]=1;c[b+102993|0]=1;c[b+102994|0]=0;c[b+102995|0]=1;c[b+102976|0]=1;f=l[d+4>>2];l[j>>2]=l[d>>2];l[j+4>>2]=f;l[e+25717]=4;q[e+25747]=0;l[h>>2]=g;e=(b+102996|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0}function Ap(b){var d=b>>2,e=b|0,f=l[d+25738];a:for(;0!=(f|0);){for(var g=l[f+96>>2],h=l[f+100>>2];;){if(0==(h|0)){f=g;continue a}var j=l[h+4>>2];l[h+28>>2]=0;gp(h,e);h=j}}Dh(l[d+25726]);Dh(l[d+25729]);Dh(l[d+25719]);0!=(l[d+25617]|0)&&P(N.n|0,32,N.Q|0,N.Ua|0);0!=(l[d+25716]|0)&&P(N.n|0,33,N.Q|0,N.Xa|0);d=b+4|0;e=0<(l[d>>2]|0);b|=0;f=l[b>>2];a:do{if(e){g=0;for(h=f;;){if(Dh(l[h+(g<<3)+4>>2]),g=g+1|0,h=l[b>>2],(g|0)>=(l[d>>2]|0)){var k=h;break a}}}else{k=f}}while(0);Dh(k)}function Bp(b,d){var e,f,g,h;h=(b+102960|0)>>2;0<(l[h]|0)||P(N.t|0,133,N.sb|0,N.Wf|0);g=b+102868|0;var j=l[g>>2];0==(j&2|0)?g=j:(P(N.t|0,134,N.sb|0,N.pa|0),g=l[g>>2]);if(0==(g&2|0)){g=(d+108|0)>>2;var j=l[g],k=0==(j|0);a:do{if(!k){for(var m=b+102980|0,n=j;;){var p=l[n+12>>2],u=l[m>>2];0==(u|0)?u=n+4|0:(n=n+4|0,K[l[l[u>>2]+8>>2]](u,l[n>>2]),u=n);Cp(b,l[u>>2]);l[g]=p;if(0==(p|0)){break a}n=p}}}while(0);l[g]=0;g=d+112|0;j=l[g>>2];k=0==(j|0);a:do{if(!k){m=b+102872|0;for(p=j;;){u=l[p+12>>2];fp(m,l[p+4>>2]);if(0==(u|0)){break a}p=u}}}while(0);l[g>>2]=0;g=(d+100|0)>>2;j=l[g];k=0==(j|0);a:do{if(k){e=d+104|0}else{for(var m=b+102980|0,p=b+102912|0,u=b+102904|0,n=b+102900|0,r=b+102872|0,w=b|0,x=d+104|0,y=j;;){var A=o[y+4>>2];f=l[m>>2];if(0!=(f|0)){K[l[l[f>>2]+12>>2]](f,y)}f=(y+28|0)>>2;var C=0<(l[f]|0);b:do{if(C){for(var z=y+24|0,D=0;;){for(var E=l[z>>2]+28*D+24|0,G=l[E>>2],H=l[p>>2],F=0;(F|0)<(H|0);){var I=(F<<2)+l[u>>2]|0;if((l[I>>2]|0)!=(G|0)){F=F+1|0}else{l[I>>2]=-1;break}}l[n>>2]=l[n>>2]-1|0;Nk(r,G);l[E>>2]=-1;D=D+1|0;if((D|0)>=(l[f]|0)){break b}}}}while(0);l[f]=0;gp(y,w);f=ed[rn+44|0];C=f&255;14>(f&255)||P(N.e|0,173,N.f|0,N.g|0);f=(C<<2)+b+12|0;l[y>>2]=l[f>>2];l[f>>2]=y;l[g]=A;l[x>>2]=l[x>>2]-1|0;if(0==(A|0)){e=x;break a}y=A}}}while(0);l[g]=0;l[e>>2]=0;g=d+92|0;j=l[g>>2];e=(d+96|0)>>2;0!=(j|0)&&(l[(j+96|0)>>2]=l[e]);j=l[e];0!=(j|0)&&(l[(j+92|0)>>2]=l[g>>2]);g=b+102952|0;(l[g>>2]|0)==(d|0)&&(l[g>>2]=l[e]);l[h]=l[h]-1|0;h=ed[rn+152|0];e=h&255;14>(h&255)||P(N.e|0,173,N.f|0,N.g|0);h=(e<<2)+b+12|0;l[d>>2]=l[h>>2];l[h>>2]=d}}function Cp(b,d){var e,f,g,h,j=b+102868|0;e=l[j>>2];0==(e&2|0)?j=e:(P(N.t|0,274,N.tb|0,N.pa|0),j=l[j>>2]);j=0==(j&2|0);a:do{if(j){e=c[d+61|0]&1;var k=d+8|0;f=l[k>>2];h=(d+12|0)>>2;0!=(f|0)&&(l[(f+12|0)>>2]=l[h]);f=l[h];0!=(f|0)&&(l[(f+8|0)>>2]=l[k>>2]);k=b+102956|0;(l[k>>2]|0)==(d|0)&&(l[k>>2]=l[h]);h=l[d+48>>2];k=l[d+52>>2];f=h+4|0;g=i[f>>1];0==(g&2)<<16>>16&&(i[f>>1]=g|2,q[h+144>>2]=0);f=k+4|0;g=i[f>>1];0==(g&2)<<16>>16&&(i[f>>1]=g|2,q[k+144>>2]=0);var m=d+16|0;g=(d+24|0)>>2;var n=l[g];f=(d+28|0)>>2;0!=(n|0)&&(l[(n+12|0)>>2]=l[f]);n=l[f];0!=(n|0)&&(l[(n+8|0)>>2]=l[g]);n=h+108|0;(m|0)==(l[n>>2]|0)&&(l[n>>2]=l[f]);l[g]=0;l[f]=0;m=d+32|0;g=(d+40|0)>>2;n=l[g];f=(d+44|0)>>2;0!=(n|0)&&(l[(n+12|0)>>2]=l[f]);n=l[f];0!=(n|0)&&(l[(n+8|0)>>2]=l[g]);n=k+108|0;(m|0)==(l[n>>2]|0)&&(l[n>>2]=l[f]);l[g]=0;l[f]=0;f=d;m=b|0;g=f>>2;K[l[l[g]+20>>2]](f);n=l[g+1];if(3==(n|0)){var n=ed[rn+176|0],p=n&255;14>(n&255)||P(N.e|0,173,N.f|0,N.g|0);m=(p<<2)+m+12|0;l[g]=l[m>>2];l[m>>2]=f}else{5==(n|0)?(n=ed[rn+168|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):2==(n|0)?(n=ed[rn+256|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):1==(n|0)?(n=ed[rn+228|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):4==(n|0)?(n=ed[rn+196|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):6==(n|0)?(n=ed[rn+276|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):7==(n|0)?(n=ed[rn+224|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):8==(n|0)?(n=ed[rn+208|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):9==(n|0)?(n=ed[rn+180|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):10==(n|0)?(n=ed[rn+168|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):P(N.m|0,166,N.ze|0,N.l|0)}f=(b+102964|0)>>2;g=l[f];0<(g|0)||(P(N.t|0,346,N.tb|0,N.Hg|0),g=l[f]);l[f]=g-1|0;if(0==e<<24>>24&&(e=l[k+112>>2],0!=(e|0))){for(e>>=2;;){(l[e]|0)==(h|0)&&(k=l[e+1]+4|0,l[k>>2]|=8);e=l[e+3];if(0==(e|0)){break a}e>>=2}}}}while(0)}function Dp(b,d){var e,f,g,h,j,k=b+102868|0,m=l[k>>2];if(0==(m&2|0)){var n=m}else{P(N.t|0,214,N.Be|0,N.pa|0),n=l[k>>2]}var p=0==(n&2|0);a:do{if(p){var u,r=d,w=b|0,x=Ha,y=Ha,A=Ha,C=Ha,z=Ha,D=Ha,E=Ha,G=Ha,H=Ha,F=Ha,I=Ha,J=Ha,L=Ha,O=Ha,R=Ha,T=Ha,S=Ha,U=Ha,W=Ha,Q=Ha,$=r>>2,Q=(r|0)>>2,ea=l[Q];if(3==(ea|0)){var sa=qn(w,176),W=sa>>2;if(0==(sa|0)){var Ba=0}else{l[sa>>2]=Ep+8|0;var oa=r+8|0,ga=r+12|0;(l[oa>>2]|0)==(l[ga>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[W+1]=l[Q];l[W+2]=0;l[W+3]=0;l[W+12]=l[oa>>2];l[W+13]=l[ga>>2];l[W+14]=0;c[sa+61|0]=c[r+16|0]&1;c[sa+60|0]=0;l[W+16]=l[$+1];U=(sa+16|0)>>2;l[U]=0;l[U+1]=0;l[U+2]=0;l[U+3]=0;l[U+4]=0;l[U+5]=0;l[U+6]=0;l[U+7]=0;l[sa>>2]=Fp+8|0;var qa=sa+88|0,la=r+20|0,Ca=sa+80|0,ia=la|0,S=ia>>2,ya=l[S],ta=la+4|0,T=ta>>2,Ia=l[T],na=Ca|0,R=na>>2;l[R]=ya;var Z=Ca+4|0,O=Z>>2;l[O]=Ia;var ba=r+28|0,ca=ba|0,L=ca>>2,ma=l[L],ka=ba+4|0,J=ka>>2,aa=l[J],ra=qa|0,I=ra>>2;l[I]=ma;var ha=qa+4|0,F=ha>>2;l[F]=aa;q[W+26]=q[$+9];q[W+17]=q[$+10];q[W+18]=q[$+11];q[W+25]=0;q[W+24]=0;q[W+19]=0;Ba=sa}var za=Ba|0}else{if(5==(ea|0)){var X=qn(w,168);if(0==(X|0)){var ua=0}else{Gp(X,r),ua=X}za=ua|0}else{if(2==(ea|0)){var da=qn(w,256);if(0==(da|0)){var fa=0}else{Hp(da,r),fa=da}za=fa|0}else{if(1==(ea|0)){var Aa=qn(w,228),H=Aa>>2;if(0==(Aa|0)){var Pa=0}else{l[Aa>>2]=Ep+8|0;var pa=r+8|0,cb=r+12|0;(l[pa>>2]|0)==(l[cb>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[H+1]=l[Q];l[H+2]=0;l[H+3]=0;l[H+12]=l[pa>>2];l[H+13]=l[cb>>2];l[H+14]=0;c[Aa+61|0]=c[r+16|0]&1;c[Aa+60|0]=0;l[H+16]=l[$+1];G=(Aa+16|0)>>2;l[G]=0;l[G+1]=0;l[G+2]=0;l[G+3]=0;l[G+4]=0;l[G+5]=0;l[G+6]=0;l[G+7]=0;l[Aa>>2]=Ip+8|0;var Qa=Aa+76|0,Ta=r+20|0,$a=Aa+68|0,ia=Ta|0,S=ia>>2,va=l[S],ta=Ta+4|0,T=ta>>2,Wa=l[T],na=$a|0,R=na>>2;l[R]=va;Z=$a+4|0;O=Z>>2;l[O]=Wa;var fb=r+28|0,ca=fb|0,L=ca>>2,gb=l[L],ka=fb+4|0,J=ka>>2,Xa=l[J],ra=Qa|0,I=ra>>2;l[I]=gb;ha=Qa+4|0;F=ha>>2;l[F]=Xa;q[H+29]=q[$+9];var E=(Aa+84|0)>>2,Ua=r+44|0;l[E]=0;l[E+1]=0;l[E+2]=0;l[E+3]=0;q[H+30]=q[Ua>>2];q[H+31]=q[$+12];q[H+26]=q[$+15];q[H+27]=q[$+14];c[Aa+112|0]=c[r+40|0]&1;c[Aa+100|0]=c[r+52|0]&1;l[H+56]=0;Pa=Aa}za=Pa|0}else{if(4==(ea|0)){var Va=qn(w,196);if(0==(Va|0)){var pb=0}else{Jp(Va,r),pb=Va}za=pb|0}else{if(6==(ea|0)){var nb=qn(w,276);if(0==(nb|0)){var La=0}else{Kp(nb,r),La=nb}za=La|0}else{if(7==(ea|0)){var qb=qn(w,224);if(0==(qb|0)){var bb=0}else{Lp(qb,r),bb=qb}za=bb|0}else{if(8==(ea|0)){var Fa=qn(w,208),D=Fa>>2;if(0==(Fa|0)){var Ma=0}else{l[Fa>>2]=Ep+8|0;var wa=r+8|0,hb=r+12|0;(l[wa>>2]|0)==(l[hb>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[D+1]=l[Q];l[D+2]=0;l[D+3]=0;l[D+12]=l[wa>>2];l[D+13]=l[hb>>2];l[D+14]=0;c[Fa+61|0]=c[r+16|0]&1;c[Fa+60|0]=0;l[D+16]=l[$+1];z=(Fa+16|0)>>2;l[z]=0;l[z+1]=0;l[z+2]=0;l[z+3]=0;l[z+4]=0;l[z+5]=0;l[z+6]=0;l[z+7]=0;l[Fa>>2]=Mp+8|0;var Ya=Fa+88|0,Za=r+20|0,Da=Fa+80|0,ia=Za|0,S=ia>>2,Na=l[S],ta=Za+4|0,T=ta>>2,ib=l[T],na=Da|0,R=na>>2;l[R]=Na;Z=Da+4|0;O=Z>>2;l[O]=ib;var ab=r+28|0,ca=ab|0,L=ca>>2,Ga=l[L],ka=ab+4|0,J=ka>>2,jb=l[J],ra=Ya|0,I=ra>>2;l[I]=Ga;ha=Ya+4|0;F=ha>>2;l[F]=jb;q[D+24]=q[$+9];q[D+17]=q[$+10];q[D+18]=q[$+11];q[D+26]=0;q[D+27]=0;q[D+28]=0;Ma=Fa}za=Ma|0}else{if(9==(ea|0)){var Ea=qn(w,180),C=Ea>>2;if(0==(Ea|0)){var Oa=0}else{l[Ea>>2]=Ep+8|0;var Ja=r+8|0,db=r+12|0;(l[Ja>>2]|0)==(l[db>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[C+1]=l[Q];l[C+2]=0;l[C+3]=0;l[C+12]=l[Ja>>2];l[C+13]=l[db>>2];l[C+14]=0;c[Ea+61|0]=c[r+16|0]&1;c[Ea+60|0]=0;l[C+16]=l[$+1];A=(Ea+16|0)>>2;l[A]=0;l[A+1]=0;l[A+2]=0;l[A+3]=0;l[A+4]=0;l[A+5]=0;l[A+6]=0;l[A+7]=0;l[Ea>>2]=Np+8|0;var xa=Ea+76|0,Ra=r+20|0,Ka=Ea+68|0,ia=Ra|0,S=ia>>2,tb=l[S],ta=Ra+4|0,T=ta>>2,kb=l[T],na=Ka|0,R=na>>2;l[R]=tb;Z=Ka+4|0;O=Z>>2;l[O]=kb;var ub=r+28|0,ca=ub|0,L=ca>>2,rb=l[L],ka=ub+4|0,J=ka>>2,Bb=l[J],ra=xa|0,I=ra>>2;l[I]=rb;ha=xa+4|0;F=ha>>2;l[F]=Bb;q[C+21]=0;q[C+22]=0;q[C+23]=0;q[C+24]=q[$+9];q[C+25]=q[$+10];Oa=Ea}za=Oa|0}else{if(10==(ea|0)){var lb=qn(w,168),y=lb>>2;if(0==(lb|0)){var yb=0}else{l[lb>>2]=Ep+8|0;var xb=r+8|0,Ib=r+12|0;(l[xb>>2]|0)==(l[Ib>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[y+1]=l[Q];l[y+2]=0;l[y+3]=0;l[y+12]=l[xb>>2];l[y+13]=l[Ib>>2];l[y+14]=0;c[lb+61|0]=c[r+16|0]&1;c[lb+60|0]=0;l[y+16]=l[$+1];x=(lb+16|0)>>2;l[x]=0;l[x+1]=0;l[x+2]=0;l[x+3]=0;l[x+4]=0;l[x+5]=0;l[x+6]=0;l[x+7]=0;l[lb>>2]=Op+8|0;var wb=lb+76|0,vb=r+20|0,zb=lb+68|0,ia=vb|0,S=ia>>2,Eb=l[S],ta=vb+4|0,T=ta>>2,Cb=l[T],na=zb|0,R=na>>2;l[R]=Eb;Z=zb+4|0;O=Z>>2;l[O]=Cb;var eb=r+28|0,ca=eb|0,L=ca>>2,sb=l[L],ka=eb+4|0,J=ka>>2,ob=l[J],ra=wb|0,I=ra>>2;l[I]=sb;ha=wb+4|0;F=ha>>2;l[F]=ob;q[y+21]=q[$+9];q[y+40]=0;q[y+23]=0;l[y+41]=0;q[y+22]=0;yb=lb}za=yb|0}else{P(N.m|0,113,N.ye|0,N.l|0),za=0}}}}}}}}}}u=za;j=u>>2;l[j+2]=0;h=(b+102956|0)>>2;l[j+3]=l[h];var Db=l[h];0!=(Db|0)&&(l[(Db+8|0)>>2]=u);l[h]=u;var Jb=b+102964|0;l[Jb>>2]=l[Jb>>2]+1|0;var Rb=u+16|0;l[j+5]=u;g=(u+52|0)>>2;l[Rb>>2]=l[g];l[j+6]=0;f=(u+48|0)>>2;var Nb=l[f],Ob=Nb+108|0;l[j+7]=l[Ob>>2];var Kb=l[Ob>>2];if(0==(Kb|0)){var Pb=Nb}else{l[(Kb+8|0)>>2]=Rb,Pb=l[f]}l[Pb+108>>2]=Rb;var Mb=u+32|0;l[j+9]=u;l[Mb>>2]=l[f];l[j+10]=0;var Yb=l[g],Zb=Yb+108|0;l[j+11]=l[Zb>>2];var ec=l[Zb>>2];if(0==(ec|0)){var Ub=Yb}else{l[(ec+8|0)>>2]=Mb,Ub=l[g]}l[Ub+108>>2]=Mb;var jc=l[d+8>>2];if(0!=(c[d+16|0]&1)<<24>>24){var Qb=u}else{var mb=l[l[d+12>>2]+112>>2];if(0==(mb|0)){Qb=u}else{var cc=mb;for(e=cc>>2;;){if((l[e]|0)==(jc|0)){var Fb=l[e+1]+4|0;l[Fb>>2]|=8}var gc=l[e+3];if(0==(gc|0)){Qb=u;break a}cc=gc;e=cc>>2}}}}else{Qb=0}}while(0);return Qb}function Pp(b,d,e,f){var g,h,j,k,m=b>>2,n=a;a+=24;var p;k=n>>2;j=(b+102868|0)>>2;var u=l[j];if(0==(u&1|0)){var r=u}else{var w=b+102872|0;jp(w|0,w);var x=l[j]&-2,r=l[j]=x}l[j]=r|2;h=(n|0)>>2;q[h]=d;l[k+3]=e;l[k+4]=f;var y=0<d;q[k+1]=y?1/d:0;var A=b+102988|0;q[k+2]=q[A>>2]*d;c[n+20|0]=c[b+102992|0]&1;pp(b+102872|0);q[m+25750]=0;if(!(0==(c[b+102995|0]&1)<<24>>24|y^1)){var C,z,D,E,G,H,F,I,J,L,O,R,T,S,U=b>>2,W=a;a+=100;var Q=W+16;S=Q>>2;var $=W+68;T=(b+103008|0)>>2;q[T]=0;R=(b+103012|0)>>2;q[R]=0;O=(b+103016|0)>>2;q[O]=0;var ea=b+102960|0,sa=b+102872|0,Ba=b+68|0;vp(Q,l[ea>>2],l[U+25734],l[U+25741],Ba,l[U+25736]);var oa=b+102952|0,ga=l[oa>>2],qa=0==(ga|0);a:do{if(!qa){for(var la=ga;;){var Ca=la+4|0;i[Ca>>1]&=-2;var ia=l[la+96>>2];if(0==(ia|0)){break a}la=ia}}}while(0);var ya=l[U+25733],ta=0==(ya|0);a:do{if(!ta){for(var Ia=ya;;){var na=Ia+4|0;l[na>>2]&=-2;var Z=l[Ia+12>>2];if(0==(Z|0)){break a}Ia=Z}}}while(0);var ba=l[U+25739],ca=0==(ba|0);a:do{if(!ca){for(var ma=ba;;){c[ma+60|0]=0;var ka=l[ma+12>>2];if(0==(ka|0)){break a}ma=ka}}}while(0);var aa=l[ea>>2],ra=aa<<2;L=(b+102864|0)>>2;var ha=l[L];if(32>(ha|0)){var za=ha}else{P(N.n|0,38,N.w|0,N.D|0),za=l[L]}J=(b+12*za+102480|0)>>2;l[U+(3*za|0)+25621]=ra;I=(b+102468|0)>>2;var X=l[I];if(102400<(X+ra|0)){var ua=Ne(ra);l[J]=ua;c[b+12*za+102488|0]=1}else{l[J]=b+(X+68)|0,c[b+12*za+102488|0]=0,l[I]=l[I]+ra|0}var da=b+102472|0,fa=l[da>>2]+ra|0;l[da>>2]=fa;var Aa=b+102476|0,Pa=l[Aa>>2];l[Aa>>2]=(Pa|0)>(fa|0)?Pa:fa;l[L]=l[L]+1|0;var pa=l[J];F=(Q+28|0)>>2;var cb=Q+36|0,Qa=Q+32|0,Ta=Q+40|0;H=(Q+8|0)>>2;for(var $a=Q+44|0,va=Q+12|0,Wa=Q+48|0,fb=Q+16|0,gb=b+102968|0,Xa=b+102976|0,Ua=$+12|0,Va=$+16|0,pb=$+20|0,nb=oa;;){var La=l[nb>>2];if(0==(La|0)){break}G=(La+4|0)>>1;var qb=34==(i[G]&35)<<16>>16;a:do{if(qb&&0!=(l[La>>2]|0)){l[F]=0;l[cb>>2]=0;l[Qa>>2]=0;l[pa>>2]=La;i[G]|=1;var bb=l[Ta>>2],Fa=l[H],Ma=l[$a>>2],wa=l[va>>2],hb=l[Wa>>2],Ya=l[fb>>2],Za=1,Da=0,Na=0,ib=0;b:for(;;){for(var ab=Za,Ga=Da;;){if(0>=(ab|0)){break b}var jb=ab-1|0,Ea=l[pa+(jb<<2)>>2];E=(Ea+4|0)>>1;0==(i[E]&32)<<16>>16&&P(N.t|0,445,N.Ha|0,N.Xg|0);(Ga|0)<(bb|0)||P(N.J|0,54,N.na|0,N.Aa|0);l[(Ea+8|0)>>2]=Ga;l[((Ga<<2)+Fa|0)>>2]=Ea;var Oa=Ga+1|0;l[F]=Oa;var Ja=i[E];0==(Ja&2)<<16>>16&&(i[E]=Ja|2,q[Ea+144>>2]=0);if(0!=(l[Ea>>2]|0)){break}ab=jb;Ga=Oa}for(var db=Ea+112|0,xa=jb,Ra=ib;;){var Ka=l[db>>2];if(0==(Ka|0)){break}var tb=l[Ka+4>>2];D=(tb+4|0)>>2;if(6==(l[D]&7|0)){if(0!=(c[l[tb+48>>2]+38|0]&1)<<24>>24){var kb=xa,ub=Ra}else{if(0!=(c[l[tb+52>>2]+38|0]&1)<<24>>24){kb=xa,ub=Ra}else{(Ra|0)<(Ma|0)||P(N.J|0,62,N.Ia|0,N.Wa|0);var rb=Ra+1|0;l[cb>>2]=rb;l[((Ra<<2)+wa|0)>>2]=tb;l[D]|=1;var Bb=l[Ka>>2];z=(Bb+4|0)>>1;0!=(i[z]&1)<<16>>16?kb=xa:((xa|0)<(aa|0)||P(N.t|0,495,N.Ha|0,N.Sb|0),l[((xa<<2)+pa|0)>>2]=Bb,i[z]|=1,kb=xa+1|0);ub=rb}}}else{kb=xa,ub=Ra}db=Ka+12|0;xa=kb;Ra=ub}for(var lb=Ea+108|0,yb=xa,xb=Na;;){var Ib=l[lb>>2];if(0==(Ib|0)){Za=yb;Da=Oa;Na=xb;ib=Ra;continue b}var wb=Ib+4|0,vb=l[wb>>2];if(0==(c[vb+60|0]&1)<<24>>24){var zb=l[Ib>>2];C=(zb+4|0)>>1;if(0==(i[C]&32)<<16>>16){var Eb=yb,Cb=xb}else{(xb|0)<(hb|0)||P(N.J|0,68,N.De|0,N.rg|0);var eb=xb+1|0;l[Qa>>2]=eb;l[((xb<<2)+Ya|0)>>2]=vb;c[l[wb>>2]+60|0]=1;0!=(i[C]&1)<<16>>16?Eb=yb:((yb|0)<(aa|0)||P(N.t|0,524,N.Ha|0,N.Sb|0),l[((yb<<2)+pa|0)>>2]=zb,i[C]|=1,Eb=yb+1|0);Cb=eb}}else{Eb=yb,Cb=xb}lb=Ib+12|0;yb=Eb;xb=Cb}}var sb=Q,ob=$,Db=n,Jb=gb,Rb=0!=(c[Xa]&1)<<24>>24,Nb=Ha,Ob=Ha,Kb=Ha,Pb=Ha,Mb=Ha,Yb=Ha,Zb=Ha,ec=Ha,Ub=Ha,jc=Ha,Qb=Ha,mb=Ha,cc=Ha,Fb=Ha,gc=Ha,vc=Ha,pc=a;a+=148;var qc=pc+20,$c=pc+52,vc=$c>>2,Ec=pc+96,gc=Ec>>2,sc=q[Db>>2],Fb=(sb+28|0)>>2,kd=0<(l[Fb]|0);b:do{if(kd){for(var wd=sb+8|0,Lc=Jb|0,$b=Jb+4|0,ac=sb+20|0,oc=sb+24|0,tc=0;;){var Nc=l[l[wd>>2]+(tc<<2)>>2],cc=Nc>>2,ld=Nc+44|0,Wc=q[ld>>2],ad=q[cc+12],Xc=q[cc+14],Cc=Nc+64|0,fd=Cc|0,md=Cc+4|0,nd=l[md>>2],Oc=(t[0]=l[fd>>2],M[0]),gd=(t[0]=nd,M[0]),od=q[cc+18],pd=ld,Pd=Nc+36|0,Xd=l[pd+4>>2];l[(Pd|0)>>2]=l[pd>>2];l[(Pd+4|0)>>2]=Xd;q[cc+13]=Xc;if(2==(l[cc]|0)){var qd=q[cc+35],Qd=q[cc+30],Pc=1-sc*q[cc+33],Ic=1>Pc?Pc:1,Jc=0>Ic?0:Ic,fc=1-sc*q[cc+34],hd=1>fc?fc:1,xd=(od+sc*q[cc+32]*q[cc+21])*(0>hd?0:hd),bd=(Oc+(q[Lc>>2]*qd+q[cc+19]*Qd)*sc)*Jc,rd=(gd+(q[$b>>2]*qd+q[cc+20]*Qd)*sc)*Jc}else{xd=od,bd=Oc,rd=gd}var ye=l[ac>>2];q[(ye>>2)+(3*tc|0)]=Wc;q[(ye+4>>2)+(3*tc|0)]=ad;q[(l[ac>>2]+8>>2)+(3*tc|0)]=Xc;var Yd=l[oc>>2]+12*tc|0,Tc=(M[0]=bd,t[0]),wc=(M[0]=rd,t[0])|0;l[(Yd|0)>>2]=0|Tc;l[(Yd+4|0)>>2]=wc;q[(l[oc>>2]+8>>2)+(3*tc|0)]=xd;var bc=tc+1|0;if((bc|0)>=(l[Fb]|0)){var Ed=ac,mb=Ed>>2,xc=oc,Qb=xc>>2;break b}tc=bc}}else{Ed=sb+20|0,mb=Ed>>2,xc=sb+24|0,Qb=xc>>2}}while(0);jc=qc>>2;Ub=Db>>2;l[jc]=l[Ub];l[jc+1]=l[Ub+1];l[jc+2]=l[Ub+2];l[jc+3]=l[Ub+3];l[jc+4]=l[Ub+4];l[jc+5]=l[Ub+5];var Ac=l[mb];l[qc+24>>2]=Ac;var Zd=l[Qb];l[qc+28>>2]=Zd;ec=$c>>2;l[ec]=l[Ub];l[ec+1]=l[Ub+1];l[ec+2]=l[Ub+2];l[ec+3]=l[Ub+3];l[ec+4]=l[Ub+4];l[ec+5]=l[Ub+5];var $d=sb+12|0;l[vc+6]=l[$d>>2];Zb=(sb+36|0)>>2;l[vc+7]=l[Zb];l[vc+8]=Ac;l[vc+9]=Zd;l[vc+10]=l[sb>>2];Qp(Ec,$c);Rp(Ec);if(0!=(c[Db+20|0]&1)<<24>>24){var cd=Ec,yc=Ha,kc=Ha,Rd=cd+48|0,Fc=0<(l[Rd>>2]|0);b:do{if(Fc){for(var Qc=cd+40|0,kc=(cd+28|0)>>2,Mc=0;;){var ne=l[Qc>>2],yc=ne>>2,Sd=l[yc+(38*Mc|0)+28],Td=l[yc+(38*Mc|0)+29],Ud=q[yc+(38*Mc|0)+30],xf=q[yc+(38*Mc|0)+32],Fd=q[yc+(38*Mc|0)+31],oe=q[yc+(38*Mc|0)+33],He=l[yc+(38*Mc|0)+36],ae=l[kc],Gc=ae+12*Sd|0,dd=l[Gc+4>>2],be=(t[0]=l[Gc>>2],M[0]),pe=(t[0]=dd,M[0]),Uc=q[(ae+8>>2)+(3*Sd|0)],lc=ae+12*Td|0,Gd=l[lc+4>>2],Hd=(t[0]=l[lc>>2],M[0]),Re=(t[0]=Gd,M[0]),Id=q[(ae+8>>2)+(3*Td|0)],Jd=ne+152*Mc+72|0,qe=l[Jd+4>>2],re=(t[0]=l[Jd>>2],M[0]),Kd=(t[0]=qe,M[0]),Se=-1*re,Rf=0<(He|0);c:do{if(Rf){for(var sd=Re,Vc=Hd,Te=pe,Ue=be,ce=Uc,Yc=Id,yd=0;;){var $e=q[yc+(38*Mc|0)+(9*yd|0)+4],ze=q[yc+(38*Mc|0)+(9*yd|0)+5],Zc=re*$e+Kd*ze,Ld=Kd*$e+Se*ze,Md=ce-xf*(q[yc+(38*Mc|0)+(9*yd|0)]*Ld-q[yc+(38*Mc|0)+(9*yd|0)+1]*Zc),de=Ue-Zc*Ud,zd=Te-Ld*Ud,ee=Yc+oe*(q[yc+(38*Mc|0)+(9*yd|0)+2]*Ld-q[yc+(38*Mc|0)+(9*yd|0)+3]*Zc),yf=Vc+Zc*Fd,af=sd+Ld*Fd,Ie=yd+1|0;if((Ie|0)==(He|0)){var zf=af,jf=yf,bf=zd,Sf=de,kf=Md,Ae=ee;break c}sd=af;Vc=yf;Te=zd;Ue=de;ce=Md;Yc=ee;yd=Ie}}else{zf=Re,jf=Hd,bf=pe,Sf=be,kf=Uc,Ae=Id}}while(0);var Ad=(M[0]=Sf,t[0]),Af=(M[0]=bf,t[0])|0;l[(Gc|0)>>2]=0|Ad;l[(Gc+4|0)>>2]=Af;q[(l[kc]+8>>2)+(3*Sd|0)]=kf;var Tf=l[kc]+12*Td|0,Fg=(M[0]=jf,t[0]),Gg=(M[0]=zf,t[0])|0;l[(Tf|0)>>2]=0|Fg;l[(Tf+4|0)>>2]=Gg;q[(l[kc]+8>>2)+(3*Td|0)]=Ae;var ng=Mc+1|0;if((ng|0)>=(l[Rd>>2]|0)){break b}Mc=ng}}}while(0)}for(var Yb=(sb+32|0)>>2,Mb=(sb+16|0)>>2,og=0;(og|0)<(l[Yb]|0);){var pg=l[l[Mb]+(og<<2)>>2];K[l[l[pg>>2]+28>>2]](pg,qc);og=og+1|0}q[ob+12>>2]=0;for(var Bf=Db+12|0,Uf=0;(Uf|0)<(l[Bf>>2]|0);){for(var Vf=0;(Vf|0)<(l[Yb]|0);){var Hg=l[l[Mb]+(Vf<<2)>>2];K[l[l[Hg>>2]+32>>2]](Hg,qc);Vf=Vf+1|0}Sp(Ec);Uf=Uf+1|0}var Ih=l[gc+12],Ig=0<(Ih|0);b:do{if(Ig){for(var Ej=l[gc+10],Pb=Ej>>2,Ii=l[gc+11],qg=0;;){var Jh=l[Ii+(l[Pb+(38*qg|0)+37]<<2)>>2],Wf=Ej+152*qg+144|0,Kh=0<(l[Wf>>2]|0);c:do{if(Kh){for(var lf=0;;){q[(Jh+72>>2)+(5*lf|0)]=q[Pb+(38*qg|0)+(9*lf|0)+4];q[(Jh+76>>2)+(5*lf|0)]=q[Pb+(38*qg|0)+(9*lf|0)+5];var rg=lf+1|0;if((rg|0)>=(l[Wf>>2]|0)){break c}lf=rg}}}while(0);var ih=qg+1|0;if((ih|0)>=(Ih|0)){break b}qg=ih}}}while(0);q[ob+16>>2]=0;var Lh=0<(l[Fb]|0);b:do{if(Lh){for(var Be=0;;){var sg=l[mb],se=sg+12*Be|0,Jg=l[se+4>>2],fe=(t[0]=l[se>>2],M[0]),te=(t[0]=Jg,M[0]),ue=q[(sg+8>>2)+(3*Be|0)],ge=l[Qb],mf=ge+12*Be|0,Ji=l[mf+4>>2],Kg=(t[0]=l[mf>>2],M[0]),tg=(t[0]=Ji,M[0]),jh=q[(ge+8>>2)+(3*Be|0)],Mh=Kg*sc,ug=tg*sc,Nh=Mh*Mh+ug*ug;if(4<Nh){var Oh=2/Fh(Nh),Lg=Kg*Oh,Mg=tg*Oh}else{Lg=Kg,Mg=tg}var Hc=sc*jh,uc=2.4674012660980225<Hc*Hc?jh*(1.5707963705062866/(0<Hc?Hc:-Hc)):jh,Ki=te+Mg*sc,Ph=ue+sc*uc,Ng=(M[0]=fe+Lg*sc,t[0]),Og=(M[0]=Ki,t[0])|0;l[(se|0)>>2]=0|Ng;l[(se+4|0)>>2]=Og;q[(l[mb]+8>>2)+(3*Be|0)]=Ph;var Pg=l[Qb]+12*Be|0,Li=(M[0]=Lg,t[0]),Qh=(M[0]=Mg,t[0])|0;l[(Pg|0)>>2]=0|Li;l[(Pg+4|0)>>2]=Qh;q[(l[Qb]+8>>2)+(3*Be|0)]=uc;var Qg=Be+1|0;if((Qg|0)>=(l[Fb]|0)){break b}Be=Qg}}}while(0);for(var Rh=Db+16|0,kh=0;;){if((kh|0)>=(l[Rh>>2]|0)){var Sh=1;break}var Mi,nf=Ec,he=Ha,Bd=Ha,cf=a;a+=52;var vg=cf+16,Ce=cf+32,Cf=nf+48|0,td=0<(l[Cf>>2]|0);b:do{if(td){for(var Rg=nf+36|0,Bd=(nf+24|0)>>2,Fj=cf+8|0,Th=cf+12|0,Ni=vg+8|0,wg=vg+12|0,Uh=cf,Vh=vg,Wh=Ce,Xh=Ce+8|0,Gj=Ce+16|0,Je=0,Xf=0;;){var Yf=l[Rg>>2],he=Yf>>2,Yh=Yf+88*Je|0,Sg=l[he+(22*Je|0)+8],lh=l[he+(22*Je|0)+9],Df=Yf+88*Je+48|0,Zh=l[Df+4>>2],Tg=(t[0]=l[Df>>2],M[0]),$h=(t[0]=Zh,M[0]),xg=q[he+(22*Je|0)+10],Oi=q[he+(22*Je|0)+16],df=Yf+88*Je+56|0,mh=l[df+4>>2],nh=(t[0]=l[df>>2],M[0]),oh=(t[0]=mh,M[0]),Zf=q[he+(22*Je|0)+11],Ve=q[he+(22*Je|0)+17],of=l[he+(22*Je|0)+21],Ug=l[Bd],ai=Ug+12*Sg|0,Vg=l[ai+4>>2],Wg=(t[0]=l[ai>>2],M[0]),We=(t[0]=Vg,M[0]),Pi=q[(Ug+8>>2)+(3*Sg|0)],ef=Ug+12*lh|0,Hj=l[ef+4>>2],$f=(t[0]=l[ef>>2],M[0]),Ef=(t[0]=Hj,M[0]),ph=q[(Ug+8>>2)+(3*lh|0)];if(0<(of|0)){for(var bi=xg+Zf,ff=Ef,pf=$f,qf=We,yg=Wg,zg=Pi,Ff=ph,Xg=Xf,Yg=0;;){var ie=mm(zg);q[Fj>>2]=ie;var Gf=nm(zg);q[Th>>2]=Gf;var Hf=mm(Ff);q[Ni>>2]=Hf;var qh=nm(Ff);q[wg>>2]=qh;var Qi=qf-(ie*Tg+Gf*$h),Ri=(M[0]=yg-(Gf*Tg-ie*$h),t[0]),Ij=(M[0]=Qi,t[0])|0;l[Uh>>2]=0|Ri;l[Uh+4>>2]=Ij;var ci=ff-(Hf*nh+qh*oh),di=(M[0]=pf-(qh*nh-Hf*oh),t[0]),Pk=(M[0]=ci,t[0])|0;l[Vh>>2]=0|di;l[Vh+4>>2]=Pk;Tp(Ce,Yh,cf,vg,Yg);var wn=l[Wh+4>>2],Jj=(t[0]=l[Wh>>2],M[0]),Kj=(t[0]=wn,M[0]),Si=l[Xh+4>>2],Ti=(t[0]=l[Xh>>2],M[0]),Qk=(t[0]=Si,M[0]),Ke=q[Gj>>2],Lj=Ti-yg,ei=Qk-qf,Rk=Ti-pf,Ui=Qk-ff,Sk=Xg<Ke?Xg:Ke,Vi=.20000000298023224*(Ke+.004999999888241291),Mj=0>Vi?Vi:0,Nj=Lj*Kj-ei*Jj,Oj=Rk*Kj-Ui*Jj,ag=bi+Oi*Nj*Nj+Ve*Oj*Oj,fi=0<ag?-(-.20000000298023224>Mj?-.20000000298023224:Mj)/ag:0,If=Jj*fi,Wi=Kj*fi,Tk=yg-If*xg,Pj=qf-Wi*xg,Uk=zg-Oi*(Lj*Wi-ei*If),Vk=pf+If*Zf,Xi=ff+Wi*Zf,gi=Ff+Ve*(Rk*Wi-Ui*If),Qj=Yg+1|0;if((Qj|0)==(of|0)){break}ff=Xi;pf=Vk;qf=Pj;yg=Tk;zg=Uk;Ff=gi;Xg=Sk;Yg=Qj}var Rj=Xi,Sj=Vk,Zg=Pj,Wk=Tk,Yi=Uk,Xk=gi,Yk=Sk,Zi=l[Bd]}else{Rj=Ef,Sj=$f,Zg=We,Wk=Wg,Yi=Pi,Xk=ph,Yk=Xf,Zi=Ug}var Tj=Zi+12*Sg|0,hi=(M[0]=Wk,t[0]),Zk=(M[0]=Zg,t[0])|0;l[(Tj|0)>>2]=0|hi;l[(Tj+4|0)>>2]=Zk;q[(l[Bd]+8>>2)+(3*Sg|0)]=Yi;var $i=l[Bd]+12*lh|0,$k=(M[0]=Sj,t[0]),aj=(M[0]=Rj,t[0])|0;l[($i|0)>>2]=0|$k;l[($i+4|0)>>2]=aj;q[(l[Bd]+8>>2)+(3*lh|0)]=Xk;var ii=Je+1|0;if((ii|0)>=(l[Cf>>2]|0)){var al=Yk;break b}Je=ii;Xf=Yk}}else{al=0}}while(0);a=cf;Mi=-.014999999664723873<=al;for(var bj=0,Uj=1;(bj|0)<(l[Yb]|0);){var Vj=l[l[Mb]+(bj<<2)>>2],ji=K[l[l[Vj>>2]+36>>2]](Vj,qc),om=Uj&ji,bj=bj+1|0,Uj=om}if(Mi&Uj){Sh=0;break}kh=kh+1|0}var pm=0<(l[Fb]|0);b:do{if(pm){for(var bl=sb+8|0,bg=0;;){var ki=l[l[bl>>2]+(bg<<2)>>2],Kb=ki>>2,cl=l[mb]+12*bg|0,qm=ki+44|0,cj=l[cl>>2],Wj=l[cl+4>>2],fd=qm|0;l[fd>>2]=cj;md=qm+4|0;l[md>>2]=Wj;var Le=q[(l[mb]+8>>2)+(3*bg|0)];q[Kb+14]=Le;var dl=l[Qb]+12*bg|0,Xj=ki+64|0,el=l[dl+4>>2];l[(Xj|0)>>2]=l[dl>>2];l[(Xj+4|0)>>2]=el;q[Kb+18]=q[(l[Qb]+8>>2)+(3*bg|0)];var Yj=mm(Le);q[Kb+5]=Yj;var Jf=nm(Le);q[Kb+6]=Jf;var fl=ki+12|0,dj=q[Kb+7],Zj=q[Kb+8],gl=Jf*dj-Yj*Zj,rm=Yj*dj+Jf*Zj,ej=(t[0]=cj,M[0])-gl,hl=(t[0]=Wj,M[0])-rm,$g=fl,il=(M[0]=ej,t[0]),jl=(M[0]=hl,t[0])|0;l[($g|0)>>2]=0|il;l[($g+4|0)>>2]=jl;var $j=bg+1|0;if(($j|0)>=(l[Fb]|0)){break b}bg=$j}}}while(0);q[ob+20>>2]=0;var ak=o[gc+10],Ob=ak>>2,kl=sb+4|0,ll=0==(l[kl>>2]|0);b:do{if(!ll&&0<(l[Zb]|0)){for(var ml=pc+16|0,rh=0;;){var nl=l[l[$d>>2]+(rh<<2)>>2],li=l[Ob+(38*rh|0)+36];l[ml>>2]=li;var sh=0<(li|0);c:do{if(sh){for(var ah=0;;){q[pc+(ah<<2)>>2]=q[Ob+(38*rh|0)+(9*ah|0)+4];q[pc+(ah<<2)+8>>2]=q[Ob+(38*rh|0)+(9*ah|0)+5];var bk=ah+1|0;if((bk|0)==(li|0)){break c}ah=bk}}}while(0);var ol=l[kl>>2];K[l[l[ol>>2]+20>>2]](ol,nl,pc);var sm=rh+1|0;if((sm|0)>=(l[Zb]|0)){break b}rh=sm}}}while(0);b:do{if(Rb&&0<(l[Fb]|0)){for(var ck=sb+8|0,fj=3.4028234663852886e+38,th=0;;){var cg=l[l[ck>>2]+(th<<2)>>2],dk=0==(l[cg>>2]|0);c:do{if(dk){var mi=fj}else{var gj=0==(i[cg+4>>1]&4)<<16>>16;do{if(!gj){var bh=q[cg+72>>2];if(.001218469929881394>=bh*bh){var ek=q[cg+64>>2],hj=q[cg+68>>2];if(9999999747378752e-20>=ek*ek+hj*hj){var Ag=cg+144|0,fk=q[Ag>>2]+sc;q[Ag>>2]=fk;mi=fj<fk?fj:fk;break c}}}}while(0);mi=q[cg+144>>2]=0}}while(0);var pl=th+1|0,ql=o[Fb];if((pl|0)>=(ql|0)){break}fj=mi;th=pl}if(0<(ql|0)&((.5>mi|Sh)^1)){for(var uh=0;;){var ij=l[l[ck>>2]+(uh<<2)>>2],tm=ij+4|0;i[tm>>1]&=-3;q[ij+144>>2]=0;Nb=(ij+64|0)>>2;l[Nb]=0;l[Nb+1]=0;l[Nb+2]=0;l[Nb+3]=0;l[Nb+4]=0;l[Nb+5]=0;var um=uh+1|0;if((um|0)>=(l[Fb]|0)){break b}uh=um}}}}while(0);var pq=l[gc+8];so(pq,ak);so(pq,l[gc+9]);a=pc;q[T]+=q[Ua>>2];q[R]+=q[Va>>2];q[O]+=q[pb>>2];var qq=l[F];if(0<(qq|0)){for(var Bt=l[H],xn=0;;){var rq=l[Bt+(xn<<2)>>2];if(0==(l[rq>>2]|0)){var sq=rq+4|0;i[sq>>1]&=-2}var tq=xn+1|0;if((tq|0)>=(qq|0)){break a}xn=tq}}}}while(0);nb=La+96|0}so(Ba,pa);for(var Ct=W+8|0,Dt=W+12|0,uq=oa;;){var je=l[uq>>2];if(0==(je|0)){break}var rl=0==(i[je+4>>1]&1)<<16>>16;a:do{if(!rl&&0!=(l[je>>2]|0)){var yn=q[je+52>>2],gk=mm(yn);q[Ct>>2]=gk;var jj=nm(yn);q[Dt>>2]=jj;var zn=q[je+28>>2],An=q[je+32>>2],vq=q[je+40>>2]-(gk*zn+jj*An),wq=(M[0]=q[je+36>>2]-(jj*zn-gk*An),t[0]),sl=(M[0]=vq,t[0])|0;l[W>>2]=0|wq;l[W+4>>2]=sl;var Bn=l[je+88>>2]+102872|0,Cn=l[je+100>>2];if(0!=(Cn|0)){for(var Et=je+12|0,vm=Cn;;){wo(vm,Bn,W,Et);var hk=l[vm+4>>2];if(0==(hk|0)){break a}vm=hk}}}}while(0);uq=je+96|0}jp(sa|0,sa);q[U+25755]=0;var ik=l[S];so(ik,l[S+5]);so(ik,l[S+6]);so(ik,l[fb>>2]);so(ik,l[va>>2]);so(ik,l[H]);a=W;q[m+25751]=0}if(0==(c[b+102993|0]&1)<<24>>24){p=12}else{var Dn=q[h];if(0<Dn){var tl,ul,vl,Bg,kj,ni,lj,mj,jk,kk,nj,wl,lk,mk,wm,xl,nk,ok,oi,vh,pk,qk,yl,zl,Al,xm,Bl,wh,oj,xh,pi,pj,qj,rj,qi,sj,Cg,rk,yh,sk,zh,tj,ym,tk,dg=a;a+=240;var Cl,eg=dg+16;tk=eg>>2;var Xe=dg+68,zm=dg+200,Am=dg+208,ri=dg+216,Ft=b+68|0,En=b+102872|0;ym=(b+102944|0)>>2;vp(eg,64,32,0,Ft,l[ym]);var Dl=b+102995|0,xq=0==(c[Dl]&1)<<24>>24;a:do{if(xq){var El=b+102932|0}else{var Fn=l[b+102952>>2],yq=0==(Fn|0);b:do{if(!yq){for(var Fl=Fn;;){var Gn=Fl+4|0;i[Gn>>1]&=-2;q[Fl+60>>2]=0;var Hn=l[Fl+96>>2];if(0==(Hn|0)){break b}Fl=Hn}}}while(0);var Gl=b+102932|0,In=l[Gl>>2];if(0==(In|0)){El=Gl}else{var Hl=In;for(tj=Hl>>2;;){var Jn=Hl+4|0;l[Jn>>2]&=-34;l[tj+32]=0;q[tj+33]=1;var Kn=l[tj+3];if(0==(Kn|0)){El=Gl;break a}Hl=Kn;tj=Hl>>2}}}}while(0);var zq=Xe+16|0,Aq=Xe+20|0,Ln=Xe+24|0,Gt=Xe+44|0,Ht=Xe+48|0,It=Xe+52|0,Jt=Xe|0,Kt=Xe+28|0,Mn=Xe+56|0,Nn=Xe+92|0,Lt=Xe+128|0,Mt=zm|0,On=zm+4|0;zh=(eg+28|0)>>2;sk=(eg+36|0)>>2;var Pn=eg+32|0,Bq=eg+40|0;yh=(eg+8|0)>>2;var Cq=eg+44|0;rk=(eg+12|0)>>2;for(var Nt=Am|0,Ot=Am+4|0,Pt=n|0,Dq=ri|0,Il=ri+4|0,Jl=ri+8|0,Qt=ri+16|0,si=n+12|0,ti=ri+12|0,Qn=ri+20|0,Eq=dg+8|0,Rt=dg+12|0,St=En|0,Rn=b+102994|0,Me=0,Vd=1,Sn=El;;){var uj=l[Sn>>2];Cg=uj>>2;if(0==(uj|0)){if(0==(Me|0)|.9999988079071045<Vd){var Kl=1,uk=l[yh];break}var Cd=l[l[Me+48>>2]+8>>2],ve=l[l[Me+52>>2]+8>>2];sj=(Cd+28|0)>>2;var Tn=q[sj];qi=(Cd+32|0)>>2;var Fq=q[qi],Gq=Cd+36|0,Un=q[Gq>>2];rj=(Cd+40|0)>>2;var Bm=q[rj];qj=(Cd+44|0)>>2;var Vn=q[qj];pj=(Cd+48|0)>>2;var Cm=q[pj];pi=(Cd+52|0)>>2;var Dm=q[pi];xh=(Cd+56|0)>>2;var Ll=q[xh];oj=(Cd+60|0)>>2;var Em=q[oj];wh=(ve+28|0)>>2;var Hq=q[wh];Bl=(ve+32|0)>>2;var Iq=q[Bl],Fm=ve+36|0,Gm=q[Fm>>2];xm=(ve+40|0)>>2;var Ml=q[xm];Al=(ve+44|0)>>2;var Jq=q[Al];zl=(ve+48|0)>>2;var Tt=q[zl];yl=(ve+52|0)>>2;var Kq=q[yl];qk=(ve+56|0)>>2;var Ut=q[qk];pk=(ve+60|0)>>2;var Vt=q[pk];if(1>Em){var Hm=Em,Im=Un,Wn=Bm,Xn=Vn,Yn=Cm,Zn=Dm,$n=Ll,Jm=Tn,Km=Fq,vk=Cd+36|0}else{P(N.ba|0,723,N.Y|0,N.U|0);var ao=Cd+36|0,Hm=q[oj],Im=q[ao>>2],Wn=q[rj],Xn=q[qj],Yn=q[pj],Zn=q[pi],$n=q[xh],Jm=q[sj],Km=q[qi],vk=ao}var Nl=(Vd-Hm)/(1-Hm),Lm=1-Nl,bo=Im*Lm+Xn*Nl,co=Wn*Lm+Yn*Nl,Lq=vk,Mq=(M[0]=bo,t[0]),Wt=(M[0]=co,t[0]),Nq=0|Mq,eo=Wt|0,ui=Lq|0;vh=ui>>2;l[vh]=Nq;var ch=Lq+4|0;oi=ch>>2;l[oi]=eo;var Ol=Lm*Zn+Nl*$n;q[pi]=Ol;q[oj]=Vd;var fo=Cd+44|0,Mm=fo|0;l[Mm>>2]=Nq;var Nm=fo+4|0;l[Nm>>2]=eo;q[xh]=Ol;var go=mm(Ol),ho=Cd+20|0;q[ho>>2]=go;var io=nm(Ol),Oq=Cd+24|0;q[Oq>>2]=io;var Pq=co-(go*Jm+io*Km),Pl=Cd+12|0,Xt=(M[0]=bo-(io*Jm-go*Km),t[0]),Yt=(M[0]=Pq,t[0])|0,Om=Pl|0;l[Om>>2]=0|Xt;var Pm=Pl+4|0;l[Pm>>2]=Yt;var Qq=q[pk];if(1>Qq){var jo=Qq}else{P(N.ba|0,723,N.Y|0,N.U|0),jo=q[pk]}var Ql=(Vd-jo)/(1-jo),wk=ve+36|0,Qm=1-Ql,ko=q[wk>>2]*Qm+q[Al]*Ql,lo=q[xm]*Qm+q[zl]*Ql,Rq=wk,Zt=(M[0]=ko,t[0]),Sq=(M[0]=lo,t[0]),Rm=0|Zt,mo=Sq|0;l[(Rq|0)>>2]=Rm;l[(Rq+4|0)>>2]=mo;var xk=Qm*q[yl]+Ql*q[qk];q[yl]=xk;q[pk]=Vd;var no=ve+44|0;l[(no|0)>>2]=Rm;l[(no+4|0)>>2]=mo;q[qk]=xk;var Sm=mm(xk),oo=ve+20|0;q[oo>>2]=Sm;var po=nm(xk),Tq=ve+24|0;q[Tq>>2]=po;var qo=q[wh],Tm=q[Bl],Uq=lo-(Sm*qo+po*Tm),yk=ve+12|0,nP=(M[0]=ko-(po*qo-Sm*Tm),t[0]),oP=(M[0]=Uq,t[0])|0;l[(yk|0)>>2]=0|nP;l[(yk+4|0)>>2]=oP;qp(Me,l[ym]);ok=(Me+4|0)>>2;var qu=l[ok];l[ok]=qu&-33;var Iy=Me+128|0;l[Iy>>2]=l[Iy>>2]+1|0;if(6==(qu&6|0)){nk=(Cd+4|0)>>1;var Jy=i[nk];0==(Jy&2)<<16>>16&&(i[nk]=Jy|2,q[Cd+144>>2]=0);xl=(ve+4|0)>>1;var Ky=i[xl];0==(Ky&2)<<16>>16&&(i[xl]=Ky|2,q[ve+144>>2]=0);l[zh]=0;l[sk]=0;l[Pn>>2]=0;var Ly=l[Bq>>2];if(0<(Ly|0)){var ru=Cd+8|0;l[ru>>2]=0;var su=l[yh];l[su>>2]=Cd;l[zh]=1;if(1<(Ly|0)){var My=ru,Ny=su;Cl=71}else{Oy=ru,Py=su,Cl=70}}else{P(N.J|0,54,N.na|0,N.Aa|0);var Qy=Cd+8|0;l[Qy>>2]=0;var Ry=l[yh];l[Ry>>2]=Cd;l[zh]=1;var Oy=Qy,Py=Ry;Cl=70}70==Cl&&(P(N.J|0,54,N.na|0,N.Aa|0),My=Oy,Ny=Py);var Sy=ve+8|0;l[Sy>>2]=1;l[Ny+4>>2]=ve;l[zh]=2;0<(l[Cq>>2]|0)||P(N.J|0,62,N.Ia|0,N.Wa|0);l[sk]=1;l[l[rk]>>2]=Me;i[nk]|=1;i[xl]|=1;l[ok]|=1;l[Nt>>2]=Cd;l[Ot>>2]=ve;for(var Ty=l[Bq>>2],Uy=l[Cq>>2],pP=l[rk],qP=l[yh],fr=0;2>(fr|0);){var tu=l[Am+(fr<<2)>>2],rP=2==(l[tu>>2]|0);a:do{if(rP){for(var sP=tu+4|0,Vy=tu+112|0;;){var gr=l[Vy>>2];if(0==(gr|0)){break a}var yo=l[zh];if((yo|0)==(Ty|0)){break a}var hr=l[sk];if((hr|0)==(Uy|0)){break a}var zo=l[gr+4>>2];wm=(zo+4|0)>>2;var tP=0==(l[wm]&1|0);b:do{if(tP){var id=l[gr>>2],Wy=id|0,uP=2==(l[Wy>>2]|0);do{if(uP&&0==(i[sP>>1]&8)<<16>>16&&0==(i[id+4>>1]&8)<<16>>16){break b}}while(0);if(0==(c[l[zo+48>>2]+38|0]&1)<<24>>24&&0==(c[l[zo+52>>2]+38|0]&1)<<24>>24){mk=(id+28|0)>>2;var Sl=q[mk];lk=(id+32|0)>>2;var Tl=q[lk];wl=(id+36|0)>>2;var uu=q[wl];nj=(id+40|0)>>2;var vu=q[nj];kk=(id+44|0)>>2;var Ao=q[kk];jk=(id+48|0)>>2;var Bo=q[jk];mj=(id+52|0)>>2;var wu=q[mj];lj=(id+56|0)>>2;var Ul=q[lj];ni=(id+60|0)>>2;var ir=q[ni];kj=(id+4|0)>>1;if(0==(i[kj]&1)<<16>>16){if(1>ir){var xu=ir,Xy=uu,Yy=vu,Zy=Ao,$y=Bo,az=wu,bz=Ul,yu=Sl,zu=Tl,cz=id+36|0}else{P(N.ba|0,723,N.Y|0,N.U|0);var dz=id+36|0,xu=q[ni],Xy=q[dz>>2],Yy=q[nj],Zy=q[kk],$y=q[jk],az=q[mj],bz=q[lj],yu=q[mk],zu=q[lk],cz=dz}var jr=(Vd-xu)/(1-xu),Au=1-jr,ez=Xy*Au+Zy*jr,fz=Yy*Au+$y*jr,gz=cz,vP=(M[0]=ez,t[0]),wP=(M[0]=fz,t[0]),hz=0|vP,iz=wP|0,ui=gz|0;vh=ui>>2;l[vh]=hz;ch=gz+4|0;oi=ch>>2;l[oi]=iz;var kr=Au*az+jr*bz;q[mj]=kr;q[ni]=Vd;var jz=id+44|0,Mm=jz|0;l[Mm>>2]=hz;Nm=jz+4|0;l[Nm>>2]=iz;q[lj]=kr;var Bu=mm(kr);q[id+20>>2]=Bu;var Cu=nm(kr);q[id+24>>2]=Cu;var xP=fz-(Bu*yu+Cu*zu),kz=id+12|0,yP=(M[0]=ez-(Cu*yu-Bu*zu),t[0]),zP=(M[0]=xP,t[0])|0,Om=kz|0;l[Om>>2]=0|yP;Pm=kz+4|0;l[Pm>>2]=zP}qp(zo,l[ym]);var Du=l[wm];if(0==(Du&4|0)){q[mk]=Sl;q[lk]=Tl;q[wl]=uu;q[nj]=vu;q[kk]=Ao;q[jk]=Bo;q[mj]=wu;q[lj]=Ul;q[ni]=ir;var Eu=mm(Ul);q[id+20>>2]=Eu;var Fu=nm(Ul);q[id+24>>2]=Fu;var AP=Bo-(Eu*Sl+Fu*Tl),lz=id+12|0,BP=(M[0]=Ao-(Fu*Sl-Eu*Tl),t[0]),CP=(M[0]=AP,t[0])|0,Gu=lz|0;l[Gu>>2]=0|BP;var Hu=lz+4|0;l[Hu>>2]=CP}else{if(0==(Du&2|0)){q[mk]=Sl;q[lk]=Tl;q[wl]=uu;q[nj]=vu;q[kk]=Ao;q[jk]=Bo;q[mj]=wu;q[lj]=Ul;q[ni]=ir;var Iu=mm(Ul);q[id+20>>2]=Iu;var Ju=nm(Ul);q[id+24>>2]=Ju;var DP=Bo-(Iu*Sl+Ju*Tl),mz=id+12|0,EP=(M[0]=Ao-(Ju*Sl-Iu*Tl),t[0]),FP=(M[0]=DP,t[0])|0,Gu=mz|0;l[Gu>>2]=0|EP;Hu=mz+4|0;l[Hu>>2]=FP}else{l[wm]=Du|1;(hr|0)<(Uy|0)||P(N.J|0,62,N.Ia|0,N.Wa|0);l[sk]=hr+1|0;l[((hr<<2)+pP|0)>>2]=zo;var lr=i[kj];0==(lr&1)<<16>>16&&(i[kj]=lr|1,0!=(l[Wy>>2]|0)&&0==(lr&2)<<16>>16&&(i[kj]=lr|3,q[id+144>>2]=0),(yo|0)<(Ty|0)||P(N.J|0,54,N.na|0,N.Aa|0),l[(id+8|0)>>2]=yo,l[((yo<<2)+qP|0)>>2]=id,l[zh]=yo+1|0)}}}}}while(0);Vy=gr+12|0}}}while(0);fr=fr+1|0}var nz=(1-Vd)*q[Pt>>2];q[Dq>>2]=nz;q[Il>>2]=1/nz;q[Jl>>2]=1;l[Qt>>2]=20;l[ti>>2]=l[si>>2];c[Qn]=0;var Ah=eg,mr=ri,Xm=l[My>>2],Ym=l[Sy>>2],nr=Ha,Vl=Ha,Zm=Ha,Wl=Ha,Xl=Ha,or=Ha,$m=Ha,vj=Ha,Yl=Ha,pr=Ha,an=Ha,Zl=a;a+=116;var Ku=Zl+20,an=Ku>>2,Co=Zl+64,pr=Co>>2,Yl=(Ah+28|0)>>2,oz=l[Yl];if((oz|0)>(Xm|0)){var Lu=oz}else{P(N.Gb|0,386,N.vb|0,N.df|0),Lu=l[Yl]}if((Lu|0)>(Ym|0)){var pz=Lu}else{P(N.Gb|0,387,N.vb|0,N.Vf|0),pz=l[Yl]}var GP=0<(pz|0);a:do{if(GP){for(var HP=Ah+8|0,Mu=Ah+20|0,Nu=Ah+24|0,$l=0;;){var qr=l[l[HP>>2]+($l<<2)>>2],qz=qr+44|0,rz=l[Mu>>2]+12*$l|0,Ou=qz|0,Pu=qz+4|0,IP=l[Pu>>2],Qu=rz|0;l[Qu>>2]=l[Ou>>2];var Ru=rz+4|0;l[Ru>>2]=IP;q[(l[Mu>>2]+8>>2)+(3*$l|0)]=q[qr+56>>2];var sz=qr+64|0,tz=l[Nu>>2]+12*$l|0,JP=l[sz+4>>2];l[(tz|0)>>2]=l[sz>>2];l[(tz+4|0)>>2]=JP;q[(l[Nu>>2]+8>>2)+(3*$l|0)]=q[qr+72>>2];var uz=$l+1|0;if((uz|0)>=(l[Yl]|0)){var Su=Mu,vj=Su>>2,Tu=Nu,$m=Tu>>2;break a}$l=uz}}else{Su=Ah+20|0,vj=Su>>2,Tu=Ah+24|0,$m=Tu>>2}}while(0);var vz=Ah+12|0;l[an+6]=l[vz>>2];or=(Ah+36|0)>>2;l[an+7]=l[or];l[an+10]=l[Ah>>2];Xl=Ku>>2;Wl=mr>>2;l[Xl]=l[Wl];l[Xl+1]=l[Wl+1];l[Xl+2]=l[Wl+2];l[Xl+3]=l[Wl+3];l[Xl+4]=l[Wl+4];l[Xl+5]=l[Wl+5];l[an+8]=l[vj];l[an+9]=l[$m];Qp(Co,Ku);for(var KP=mr+16|0,Uu=0;(Uu|0)<(l[KP>>2]|0);){var Vu=Co,LP=Xm,MP=Ym,Ak=Ha,bn=Ha,am=a;a+=52;var rr=am+16,sr=am+32,wz=Vu+48|0,NP=0<(l[wz>>2]|0);a:do{if(NP){for(var OP=Vu+36|0,bn=(Vu+24|0)>>2,PP=am+8|0,QP=am+12|0,RP=rr+8|0,SP=rr+12|0,xz=am,yz=rr,zz=sr,Az=sr+8|0,TP=sr+16|0,dh=0,Wu=0;;){var tr=l[OP>>2],Ak=tr>>2,UP=tr+88*dh|0,cn=l[Ak+(22*dh|0)+8],ur=l[Ak+(22*dh|0)+9],Bz=tr+88*dh+48|0,VP=l[Bz+4>>2],Cz=(t[0]=l[Bz>>2],M[0]),Dz=(t[0]=VP,M[0]),Ez=tr+88*dh+56|0,WP=l[Ez+4>>2],Fz=(t[0]=l[Ez>>2],M[0]),Gz=(t[0]=WP,M[0]),Hz=l[Ak+(22*dh|0)+21];if((cn|0)==(LP|0)|(cn|0)==(MP|0)){var Xu=q[Ak+(22*dh|0)+16],vr=q[Ak+(22*dh|0)+10]}else{vr=Xu=0}var Iz=q[Ak+(22*dh|0)+17],Yu=q[Ak+(22*dh|0)+11],Do=l[bn],Jz=Do+12*cn|0,XP=l[Jz+4>>2],Kz=(t[0]=l[Jz>>2],M[0]),Lz=(t[0]=XP,M[0]),Mz=q[(Do+8>>2)+(3*cn|0)],Nz=Do+12*ur|0,YP=l[Nz+4>>2],Oz=(t[0]=l[Nz>>2],M[0]),Pz=(t[0]=YP,M[0]),Qz=q[(Do+8>>2)+(3*ur|0)];if(0<(Hz|0)){for(var ZP=vr+Yu,wr=Pz,xr=Oz,yr=Lz,zr=Kz,Zu=Wu,Ar=Mz,Br=Qz,$u=0;;){var av=mm(Ar);q[PP>>2]=av;var bv=nm(Ar);q[QP>>2]=bv;var cv=mm(Br);q[RP>>2]=cv;var dv=nm(Br);q[SP>>2]=dv;var $P=yr-(av*Cz+bv*Dz),aQ=(M[0]=zr-(bv*Cz-av*Dz),t[0]),bQ=(M[0]=$P,t[0])|0;l[xz>>2]=0|aQ;l[xz+4>>2]=bQ;var cQ=wr-(cv*Fz+dv*Gz),dQ=(M[0]=xr-(dv*Fz-cv*Gz),t[0]),eQ=(M[0]=cQ,t[0])|0;l[yz>>2]=0|dQ;l[yz+4>>2]=eQ;Tp(sr,UP,am,rr,$u);var fQ=l[zz+4>>2],ev=(t[0]=l[zz>>2],M[0]),fv=(t[0]=fQ,M[0]),gQ=l[Az+4>>2],Rz=(t[0]=l[Az>>2],M[0]),Sz=(t[0]=gQ,M[0]),gv=q[TP>>2],Tz=Rz-zr,Uz=Sz-yr,Vz=Rz-xr,Wz=Sz-wr,Xz=Zu<gv?Zu:gv,Yz=.75*(gv+.004999999888241291),Zz=0>Yz?Yz:0,$z=Tz*fv-Uz*ev,aA=Vz*fv-Wz*ev,bA=ZP+Xu*$z*$z+Iz*aA*aA,cA=0<bA?-(-.20000000298023224>Zz?-.20000000298023224:Zz)/bA:0,Cr=ev*cA,Dr=fv*cA,dA=zr-Cr*vr,eA=yr-Dr*vr,fA=Ar-Xu*(Tz*Dr-Uz*Cr),gA=xr+Cr*Yu,hA=wr+Dr*Yu,iA=Br+Iz*(Vz*Dr-Wz*Cr),jA=$u+1|0;if((jA|0)==(Hz|0)){break}wr=hA;xr=gA;yr=eA;zr=dA;Zu=Xz;Ar=fA;Br=iA;$u=jA}var kA=hA,lA=gA,mA=eA,nA=dA,hv=Xz,oA=fA,pA=iA,qA=l[bn]}else{kA=Pz,lA=Oz,mA=Lz,nA=Kz,hv=Wu,oA=Mz,pA=Qz,qA=Do}var rA=qA+12*cn|0,hQ=(M[0]=nA,t[0]),iQ=(M[0]=mA,t[0])|0;l[(rA|0)>>2]=0|hQ;l[(rA+4|0)>>2]=iQ;q[(l[bn]+8>>2)+(3*cn|0)]=oA;var sA=l[bn]+12*ur|0,jQ=(M[0]=lA,t[0]),kQ=(M[0]=kA,t[0])|0;l[(sA|0)>>2]=0|jQ;l[(sA+4|0)>>2]=kQ;q[(l[bn]+8>>2)+(3*ur|0)]=pA;var tA=dh+1|0;if((tA|0)>=(l[wz>>2]|0)){var uA=hv;break a}dh=tA;Wu=hv}}else{uA=0}}while(0);a=am;if(-.007499999832361937<=uA){break}Uu=Uu+1|0}var Zm=(Ah+8|0)>>2,vA=l[vj]+12*Xm|0,wA=l[l[Zm]+(Xm<<2)>>2]+36|0,Ou=vA|0,lQ=l[Ou>>2],Pu=vA+4|0,mQ=l[Pu>>2],Qu=wA|0;l[Qu>>2]=lQ;Ru=wA+4|0;l[Ru>>2]=mQ;q[l[l[Zm]+(Xm<<2)>>2]+52>>2]=q[(l[vj]+8>>2)+(3*Xm|0)];var xA=l[vj]+12*Ym|0,yA=l[l[Zm]+(Ym<<2)>>2]+36|0,nQ=l[xA+4>>2],iv=yA|0;l[iv>>2]=l[xA>>2];var jv=yA+4|0;l[jv>>2]=nQ;q[l[l[Zm]+(Ym<<2)>>2]+52>>2]=q[(l[vj]+8>>2)+(3*Ym|0)];Rp(Co);for(var oQ=mr+12|0,kv=0;(kv|0)<(l[oQ>>2]|0);){Sp(Co),kv=kv+1|0}var dn=q[mr>>2],pQ=0<(l[Yl]|0);a:do{if(pQ){for(var vi=0;;){var zA=l[vj],Er=zA+12*vi|0,qQ=l[Er+4>>2],rQ=(t[0]=l[Er>>2],M[0]),sQ=(t[0]=qQ,M[0]),tQ=q[(zA+8>>2)+(3*vi|0)],AA=l[$m],BA=AA+12*vi|0,uQ=l[BA+4>>2],lv=(t[0]=l[BA>>2],M[0]),mv=(t[0]=uQ,M[0]),nv=q[(AA+8>>2)+(3*vi|0)],CA=lv*dn,DA=mv*dn,EA=CA*CA+DA*DA;if(4<EA){var FA=2/Fh(EA),ov=lv*FA,pv=mv*FA}else{ov=lv,pv=mv}var Eo=dn*nv,qv=2.4674012660980225<Eo*Eo?nv*(1.5707963705062866/(0<Eo?Eo:-Eo)):nv,GA=rQ+ov*dn,HA=sQ+pv*dn,Fr=tQ+dn*qv,vQ=(M[0]=GA,t[0]),wQ=(M[0]=HA,t[0]),IA=0|vQ,JA=wQ|0;l[(Er|0)>>2]=IA;l[(Er+4|0)>>2]=JA;q[(l[vj]+8>>2)+(3*vi|0)]=Fr;var KA=l[$m]+12*vi|0,xQ=(M[0]=ov,t[0]),yQ=(M[0]=pv,t[0]),LA=0|xQ,MA=yQ|0,iv=KA|0;l[iv>>2]=LA;jv=KA+4|0;l[jv>>2]=MA;q[(l[$m]+8>>2)+(3*vi|0)]=qv;var Gr=l[l[Zm]+(vi<<2)>>2],Vl=Gr>>2,NA=Gr+44|0;l[(NA|0)>>2]=IA;l[(NA+4|0)>>2]=JA;q[Vl+14]=Fr;var OA=Gr+64|0;l[(OA|0)>>2]=LA;l[(OA+4|0)>>2]=MA;q[Vl+18]=qv;var rv=mm(Fr);q[Vl+5]=rv;var sv=nm(Fr);q[Vl+6]=sv;var PA=q[Vl+7],QA=q[Vl+8],zQ=HA-(rv*PA+sv*QA),RA=Gr+12|0,AQ=(M[0]=GA-(sv*PA-rv*QA),t[0]),BQ=(M[0]=zQ,t[0])|0;l[(RA|0)>>2]=0|AQ;l[(RA+4|0)>>2]=BQ;var SA=vi+1|0;if((SA|0)>=(l[Yl]|0)){break a}vi=SA}}}while(0);var TA=l[pr+10],nr=TA>>2,UA=Ah+4|0,CQ=0==(l[UA>>2]|0);a:do{if(!CQ&&0<(l[or]|0)){for(var DQ=Zl+16|0,en=0;;){var EQ=l[l[vz>>2]+(en<<2)>>2],tv=l[nr+(38*en|0)+36];l[DQ>>2]=tv;var FQ=0<(tv|0);b:do{if(FQ){for(var fn=0;;){q[Zl+(fn<<2)>>2]=q[nr+(38*en|0)+(9*fn|0)+4];q[Zl+(fn<<2)+8>>2]=q[nr+(38*en|0)+(9*fn|0)+5];var VA=fn+1|0;if((VA|0)==(tv|0)){break b}fn=VA}}}while(0);var WA=l[UA>>2];K[l[l[WA>>2]+20>>2]](WA,EQ,Zl);var XA=en+1|0;if((XA|0)>=(l[or]|0)){break a}en=XA}}}while(0);var YA=l[pr+8];so(YA,TA);so(YA,l[pr+9]);a=Zl;for(var GQ=l[zh],ZA=l[yh],Hr=0;(Hr|0)<(GQ|0);){var uv=l[ZA+(Hr<<2)>>2];Bg=uv>>2;var $A=uv+4|0;i[$A>>1]&=-2;var HQ=2==(l[Bg]|0);a:do{if(HQ){var aB=q[Bg+13],vv=mm(aB);q[Eq>>2]=vv;var wv=nm(aB);q[Rt>>2]=wv;var bB=q[Bg+7],cB=q[Bg+8],IQ=q[Bg+10]-(vv*bB+wv*cB),JQ=(M[0]=q[Bg+9]-(wv*bB-vv*cB),t[0]),KQ=(M[0]=IQ,t[0])|0;l[dg>>2]=0|JQ;l[dg+4>>2]=KQ;var LQ=l[Bg+22]+102872|0,dB=l[Bg+25],MQ=0==(dB|0);b:do{if(!MQ){for(var NQ=uv+12|0,xv=dB;;){wo(xv,LQ,dg,NQ);var eB=l[xv+4>>2];if(0==(eB|0)){break b}xv=eB}}}while(0);var fB=l[Bg+28];if(0!=(fB|0)){for(var yv=fB;;){var gB=l[yv+4>>2]+4|0;l[gB>>2]&=-34;var hB=l[yv+12>>2];if(0==(hB|0)){break a}yv=hB}}}}while(0);Hr=Hr+1|0}jp(St,En);if(0!=(c[Rn]&1)<<24>>24){Kl=0;uk=ZA;break}}else{l[ok]=qu&-37;q[sj]=Tn;q[qi]=Fq;q[Gq>>2]=Un;q[rj]=Bm;q[qj]=Vn;q[pj]=Cm;q[pi]=Dm;q[xh]=Ll;q[oj]=Em;q[wh]=Hq;q[Bl]=Iq;q[Fm>>2]=Gm;q[xm]=Ml;q[Al]=Jq;q[zl]=Tt;q[yl]=Kq;q[qk]=Ut;q[pk]=Vt;var iB=q[xh],zv=mm(iB);q[ho>>2]=zv;var Av=nm(iB);q[Oq>>2]=Av;var jB=q[sj],kB=q[qi],OQ=q[pj]-(zv*jB+Av*kB),PQ=(M[0]=q[qj]-(Av*jB-zv*kB),t[0]),QQ=(M[0]=OQ,t[0])|0;l[(Pl|0)>>2]=0|PQ;l[(Pl+4|0)>>2]=QQ;var lB=q[qk],Bv=mm(lB);q[oo>>2]=Bv;var Cv=nm(lB);q[Tq>>2]=Cv;var mB=q[wh],nB=q[Bl],RQ=q[zl]-(Bv*mB+Cv*nB),SQ=(M[0]=q[Al]-(Cv*mB-Bv*nB),t[0]),TQ=(M[0]=RQ,t[0])|0;l[(yk|0)>>2]=0|SQ;l[(yk+4|0)>>2]=TQ}Me=0;Vd=1;Sn=El}else{vl=(uj+4|0)>>2;var oB=l[vl],UQ=0==(oB&4|0);do{if(UQ){var Bk=Me,Ck=Vd}else{if(8<(l[Cg+32]|0)){Bk=Me,Ck=Vd}else{if(0==(oB&32|0)){var Dv=l[Cg+12],Ev=l[Cg+13];if(0!=(c[Dv+38|0]&1)<<24>>24){Bk=Me;Ck=Vd;break}if(0!=(c[Ev+38|0]&1)<<24>>24){Bk=Me;Ck=Vd;break}var wi=l[Dv+8>>2],xi=l[Ev+8>>2],Fv=l[wi>>2],Gv=l[xi>>2];2==(Fv|0)|2==(Gv|0)||P(N.t|0,641,N.ub|0,N.oh|0);var pB=i[wi+4>>1],qB=i[xi+4>>1];if(!(0!=(pB&2)<<16>>16&0!=(Fv|0)|0!=(qB&2)<<16>>16&0!=(Gv|0))){Bk=Me;Ck=Vd;break}if(!(0!=(pB&8)<<16>>16|2!=(Fv|0)|0!=(qB&8)<<16>>16|2!=(Gv|0))){Bk=Me;Ck=Vd;break}var VQ=wi+28|0;ul=(wi+60|0)>>2;var bm=q[ul],WQ=xi+28|0;tl=(xi+60|0)>>2;var gn=q[tl];if(bm<gn){if(1>bm){var Hv=bm}else{P(N.ba|0,723,N.Y|0,N.U|0),Hv=q[ul]}var Ir=(gn-Hv)/(1-Hv),rB=wi+36|0,Iv=1-Ir,XQ=q[wi+40>>2]*Iv+q[wi+48>>2]*Ir,sB=rB,YQ=(M[0]=q[rB>>2]*Iv+q[wi+44>>2]*Ir,t[0]),ZQ=(M[0]=XQ,t[0]),$Q=0|YQ,aR=ZQ|0,ui=sB|0;vh=ui>>2;l[vh]=$Q;ch=sB+4|0;oi=ch>>2;l[oi]=aR;var tB=wi+52|0;q[tB>>2]=Iv*q[tB>>2]+Ir*q[wi+56>>2];var Jr=q[ul]=gn}else{if(gn<bm){if(1>gn){var Jv=gn}else{P(N.ba|0,723,N.Y|0,N.U|0),Jv=q[tl]}var Kr=(bm-Jv)/(1-Jv),uB=xi+36|0,Kv=1-Kr,bR=q[xi+40>>2]*Kv+q[xi+48>>2]*Kr,vB=uB,cR=(M[0]=q[uB>>2]*Kv+q[xi+44>>2]*Kr,t[0]),dR=(M[0]=bR,t[0]),eR=0|cR,fR=dR|0,ui=vB|0;vh=ui>>2;l[vh]=eR;ch=vB+4|0;oi=ch>>2;l[oi]=fR;var wB=xi+52|0;q[wB>>2]=Kv*q[wB>>2]+Kr*q[xi+56>>2];q[tl]=bm}Jr=bm}1>Jr||P(N.t|0,676,N.ub|0,N.U|0);var gR=l[Cg+14],hR=l[Cg+15];l[zq>>2]=0;l[Aq>>2]=0;q[Ln>>2]=0;l[Gt>>2]=0;l[Ht>>2]=0;q[It>>2]=0;Hi(Jt,l[Dv+12>>2],gR);Hi(Kt,l[Ev+12>>2],hR);for(var wj=VQ>>2,Fo=Mn>>2,Lv=wj+9;wj<Lv;wj++,Fo++){l[Fo]=l[wj]}wj=WQ>>2;Fo=Nn>>2;for(Lv=wj+9;wj<Lv;wj++,Fo++){l[Fo]=l[wj]}q[Lt>>2]=1;var xB=zm,Dk=Xe,Ek=Ha,Fk=Ha,Gk=Ha,Hk=Ha,Lr=Ha,Mr=Ha,Nr=Ha,Or=Ha,Ik=Ha,Jk=Ha,Ye=a;a+=308;var cm=Ha,yi=Ye+36,Mv=Ye+72,eh=Ye+84,yB=Ye+176,Pr=Ye+200,zB=Ye+300,AB=Ye+304;l[Up>>2]=l[Up>>2]+1|0;Jk=(xB|0)>>2;l[Jk]=0;var BB=Dk+128|0,iR=q[BB>>2],Ik=(xB+4|0)>>2;q[Ik]=iR;for(var jR=Dk|0,CB=Dk+28|0,xj=(Dk+56|0)>>2,Go=Ye>>2,Ov=xj+9;xj<Ov;xj++,Go++){l[Go]=l[xj]}xj=(Dk+92|0)>>2;Go=yi>>2;for(Ov=xj+9;xj<Ov;xj++,Go++){l[Go]=l[xj]}var Or=(Ye+24|0)>>2,DB=q[Or],FB=6.2831854820251465*Vp(DB/6.2831854820251465),GB=DB-FB;q[Or]=GB;var Nr=(Ye+28|0)>>2,HB=q[Nr]-FB;q[Nr]=HB;var Mr=(yi+24|0)>>2,IB=q[Mr],JB=6.2831854820251465*Vp(IB/6.2831854820251465),KB=IB-JB;q[Mr]=KB;var Lr=(yi+28|0)>>2,LB=q[Lr]-JB;q[Lr]=LB;var MB=q[BB>>2],NB=q[Dk+24>>2]+q[Dk+52>>2]-.014999999664723873,hn=.004999999888241291>NB?.004999999888241291:NB;.0012499999720603228<hn||P(N.Ca|0,280,N.ie|0,N.rf|0);i[Mv+4>>1]=0;Hk=eh>>2;Gk=Dk>>2;l[Hk]=l[Gk];l[Hk+1]=l[Gk+1];l[Hk+2]=l[Gk+2];l[Hk+3]=l[Gk+3];l[Hk+4]=l[Gk+4];l[Hk+5]=l[Gk+5];l[Hk+6]=l[Gk+6];Fk=(eh+28|0)>>2;Ek=CB>>2;l[Fk]=l[Ek];l[Fk+1]=l[Ek+1];l[Fk+2]=l[Ek+2];l[Fk+3]=l[Ek+3];l[Fk+4]=l[Ek+4];l[Fk+5]=l[Ek+5];l[Fk+6]=l[Ek+6];c[eh+88|0]=0;var kR=Ye+8|0,lR=Ye+12|0,mR=Ye+16|0,nR=Ye+20|0,oR=Ye|0,pR=Ye+4|0,qR=yi+8|0,rR=yi+12|0,sR=yi+16|0,tR=yi+20|0,uR=yi|0,vR=yi+4|0,wR=eh+56|0,xR=eh+60|0,yR=eh+64|0,zR=eh+68|0,AR=eh+72|0,BR=eh+76|0,CR=eh+80|0,DR=eh+84|0,ER=yB+16|0,Pv=hn+.0012499999720603228,OB=hn-.0012499999720603228,Kf=0,Ho=0,PB=GB,QB=HB,RB=KB,SB=LB;a:for(;;){var jn=1-Kf,FR=q[kR>>2]*jn+q[mR>>2]*Kf,GR=q[lR>>2]*jn+q[nR>>2]*Kf,TB=jn*PB+QB*Kf,Qv=mm(TB),Rv=nm(TB),UB=q[oR>>2],VB=q[pR>>2],HR=FR-(Rv*UB-Qv*VB),IR=GR-(Qv*UB+Rv*VB),JR=q[qR>>2]*jn+q[sR>>2]*Kf,KR=q[rR>>2]*jn+q[tR>>2]*Kf,WB=jn*RB+SB*Kf,Sv=mm(WB),Tv=nm(WB),XB=q[uR>>2],YB=q[vR>>2],LR=JR-(Tv*XB-Sv*YB),MR=KR-(Sv*XB+Tv*YB);q[wR>>2]=HR;q[xR>>2]=IR;q[yR>>2]=Qv;q[zR>>2]=Rv;q[AR>>2]=LR;q[BR>>2]=MR;q[CR>>2]=Sv;q[DR>>2]=Tv;Bj(yB,Mv,eh);var ZB=q[ER>>2];if(0>=ZB){l[Jk]=2;q[Ik]=0;var Io=Ho,cm=29;break}if(ZB<Pv){l[Jk]=3;q[Ik]=Kf;Io=Ho;cm=29;break}var fg=Pr,Kk=Mv,Uv=jR,NR=Ye,Vv=CB,OR=yi,dm=Kf,zi=Ha,Ai=Ha,Qr=Ha,Jo=Ha,Lf=fg>>2,Jo=(fg|0)>>2;l[Jo]=Uv;Qr=(fg+4|0)>>2;l[Qr]=Vv;var Wv=jd[Kk+4>>1];0!=Wv<<16>>16&3>(Wv&65535)||P(N.Ca|0,50,N.se|0,N.kh|0);for(var $B=fg+8|0,yj=NR>>2,Ko=$B>>2,Xv=yj+9;yj<Xv;yj++,Ko++){l[Ko]=l[yj]}for(var aC=fg+44|0,yj=OR>>2,Ko=aC>>2,Xv=yj+9;yj<Xv;yj++,Ko++){l[Ko]=l[yj]}var kn=1-dm,PR=q[Lf+4]*kn+q[Lf+6]*dm,QR=q[Lf+5]*kn+q[Lf+7]*dm,bC=kn*q[Lf+8]+q[Lf+9]*dm,Bi=mm(bC),Ci=nm(bC),cC=q[$B>>2],dC=q[Lf+3],Yv=PR-(Ci*cC-Bi*dC),Zv=QR-(Bi*cC+Ci*dC),RR=q[Lf+13]*kn+q[Lf+15]*dm,SR=q[Lf+14]*kn+q[Lf+16]*dm,eC=kn*q[Lf+17]+q[Lf+18]*dm,Di=mm(eC),Ei=nm(eC),fC=q[aC>>2],gC=q[Lf+12],$v=RR-(Ei*fC-Di*gC),aw=SR-(Di*fC+Ei*gC);if(1==Wv<<16>>16){l[Lf+20]=0;var hC=l[Jo],iC=ed[Kk+6|0]&255;(l[hC+20>>2]|0)>(iC|0)||P(N.i|0,103,N.h|0,N.j|0);var jC=(iC<<3)+l[hC+16>>2]|0,zj=jC|0,Ai=zj>>2,Aj=jC+4|0,zi=Aj>>2,TR=l[zi],kC=(t[0]=l[Ai],M[0]),lC=(t[0]=TR,M[0]),mC=l[Qr],nC=ed[Kk+9|0]&255;(l[mC+20>>2]|0)>(nC|0)||P(N.i|0,103,N.h|0,N.j|0);var oC=(nC<<3)+l[mC+16>>2]|0,zj=oC|0,Ai=zj>>2,Aj=oC+4|0,zi=Aj>>2,UR=l[zi],pC=(t[0]=l[Ai],M[0]),qC=(t[0]=UR,M[0]),bw=fg+92|0,Rr=Ei*pC-Di*qC+$v-(Ci*kC-Bi*lC+Yv),Sr=Di*pC+Ei*qC+aw-(Bi*kC+Ci*lC+Zv),VR=(M[0]=Rr,t[0]),WR=(M[0]=Sr,t[0])|0;l[bw>>2]=0|VR;l[bw+4>>2]=WR;var rC=Fh(Rr*Rr+Sr*Sr);if(1.1920928955078125e-7<=rC){var XR=fg+96|0,sC=1/rC;q[bw>>2]=Rr*sC;q[XR>>2]=Sr*sC}}else{var cw=Kk+6|0,tC=Kk+7|0,uC=fg+80|0;if(c[cw]<<24>>24==c[tC]<<24>>24){l[uC>>2]=2;var vC=ed[Kk+9|0]&255,wC=Vv+20|0,xC=o[wC>>2];if((xC|0)>(vC|0)){var yC=xC}else{P(N.i|0,103,N.h|0,N.j|0),yC=l[wC>>2]}var zC=Vv+16|0,AC=o[zC>>2],BC=(vC<<3)+AC|0,YR=l[BC+4>>2],CC=(t[0]=l[BC>>2],M[0]),DC=(t[0]=YR,M[0]),EC=ed[Kk+10|0]&255;if((yC|0)>(EC|0)){var FC=AC}else{P(N.i|0,103,N.h|0,N.j|0),FC=l[zC>>2]}var GC=(EC<<3)+FC|0,ZR=l[GC+4>>2],HC=(t[0]=l[GC>>2],M[0]),IC=(t[0]=ZR,M[0]),Lo=fg+92|0,Mo=IC-DC,No=-1*(HC-CC),$R=(M[0]=Mo,t[0]),aS=(M[0]=No,t[0])|0;l[Lo>>2]=0|$R;l[Lo+4>>2]=aS;var JC=Lo|0,KC=fg+96|0,LC=Fh(Mo*Mo+No*No);if(1.1920928955078125e-7>LC){var dw=Mo,ew=No}else{var MC=1/LC,NC=Mo*MC;q[JC>>2]=NC;var OC=No*MC;q[KC>>2]=OC;dw=NC;ew=OC}var bS=Ei*dw-Di*ew,cS=Di*dw+Ei*ew,fw=.5*(CC+HC),gw=.5*(DC+IC),PC=fg+84|0,dS=(M[0]=fw,t[0]),eS=(M[0]=gw,t[0])|0,hw=PC|0;l[hw>>2]=0|dS;var iw=PC+4|0;l[iw>>2]=eS;var fS=Ei*fw-Di*gw+$v,gS=Di*fw+Ei*gw+aw,QC=ed[cw]&255;(l[Uv+20>>2]|0)>(QC|0)||P(N.i|0,103,N.h|0,N.j|0);var RC=(QC<<3)+l[Uv+16>>2]|0,zj=RC|0,Ai=zj>>2,Aj=RC+4|0,zi=Aj>>2,hS=l[zi],SC=(t[0]=l[Ai],M[0]),TC=(t[0]=hS,M[0]);if(0>(Ci*SC-Bi*TC+Yv-fS)*bS+(Bi*SC+Ci*TC+Zv-gS)*cS){var iS=-q[KC>>2],jS=(M[0]=-q[JC>>2],t[0]),kS=(M[0]=iS,t[0])|0,jw=Lo|0;l[jw>>2]=0|jS;var kw=Lo+4|0;l[kw>>2]=kS}}else{l[uC>>2]=1;var lw=l[Jo],UC=ed[cw]&255,VC=o[lw+20>>2];if((VC|0)>(UC|0)){var WC=lw,XC=VC}else{P(N.i|0,103,N.h|0,N.j|0);var YC=l[Jo],WC=YC,XC=l[YC+20>>2]}var ZC=(UC<<3)+l[lw+16>>2]|0,lS=l[ZC+4>>2],$C=(t[0]=l[ZC>>2],M[0]),aD=(t[0]=lS,M[0]),bD=ed[tC]&255;(XC|0)>(bD|0)||P(N.i|0,103,N.h|0,N.j|0);var cD=(bD<<3)+l[WC+16>>2]|0,zj=cD|0,Ai=zj>>2,Aj=cD+4|0,zi=Aj>>2,mS=l[zi],dD=(t[0]=l[Ai],M[0]),eD=(t[0]=mS,M[0]),Oo=fg+92|0,Po=eD-aD,Qo=-1*(dD-$C),nS=(M[0]=Po,t[0]),oS=(M[0]=Qo,t[0])|0;l[Oo>>2]=0|nS;l[Oo+4>>2]=oS;var fD=Oo|0,gD=fg+96|0,hD=Fh(Po*Po+Qo*Qo);if(1.1920928955078125e-7>hD){var mw=Po,nw=Qo}else{var iD=1/hD,jD=Po*iD;q[fD>>2]=jD;var kD=Qo*iD;q[gD>>2]=kD;mw=jD;nw=kD}var pS=Ci*mw-Bi*nw,qS=Bi*mw+Ci*nw,ow=.5*($C+dD),pw=.5*(aD+eD),lD=fg+84|0,rS=(M[0]=ow,t[0]),sS=(M[0]=pw,t[0]),tS=0|rS,uS=sS|0,hw=lD|0;l[hw>>2]=tS;iw=lD+4|0;l[iw>>2]=uS;var vS=Ci*ow-Bi*pw+Yv,wS=Bi*ow+Ci*pw+Zv,mD=l[Qr],nD=ed[Kk+9|0]&255;(l[mD+20>>2]|0)>(nD|0)||P(N.i|0,103,N.h|0,N.j|0);var oD=(nD<<3)+l[mD+16>>2]|0,zj=oD|0,Ai=zj>>2,Aj=oD+4|0,zi=Aj>>2,xS=l[zi],pD=(t[0]=l[Ai],M[0]),qD=(t[0]=xS,M[0]);if(0>(Ei*pD-Di*qD+$v-vS)*pS+(Di*pD+Ei*qD+aw-wS)*qS){var yS=-q[gD>>2],zS=(M[0]=-q[fD>>2],t[0]),AS=(M[0]=yS,t[0])|0,jw=Oo|0;l[jw>>2]=0|zS;kw=Oo+4|0;l[kw>>2]=AS}}}for(var rD=0,Ro=MB;;){var Tr,em=Pr,fm=Ro,So=Ha,Ur=Ha,To=Ha,Vr=Ha,Uo=Ha,Vo=Ha,ln=AB>>2,mn=zB>>2,Dd=em>>2,De=Ha,nn=1-fm,BS=q[Dd+4]*nn+q[Dd+6]*fm,CS=q[Dd+5]*nn+q[Dd+7]*fm,sD=nn*q[Dd+8]+q[Dd+9]*fm,gg=mm(sD),hg=nm(sD),tD=q[Dd+2],uD=q[Dd+3],qw=BS-(hg*tD-gg*uD),rw=CS-(gg*tD+hg*uD),DS=q[Dd+13]*nn+q[Dd+15]*fm,ES=q[Dd+14]*nn+q[Dd+16]*fm,vD=nn*q[Dd+17]+q[Dd+18]*fm,ig=mm(vD),jg=nm(vD),wD=q[Dd+11],xD=q[Dd+12],sw=DS-(jg*wD-ig*xD),tw=ES-(ig*wD+jg*xD),uw=l[Dd+20];if(0==(uw|0)){var yD=em+92|0,Wr=q[yD>>2],zD=em+96|0,vw=q[zD>>2],AD=hg*Wr+gg*vw,BD=Wr*-gg+hg*vw,CD=-vw,DD=jg*-Wr+ig*CD,ED=Wr*ig+jg*CD,FD=em|0,GD=l[FD>>2],Vo=l[GD+16>>2]>>2,HD=l[GD+20>>2],FS=1<(HD|0);b:do{if(FS){for(var ID=0,ww=q[Vo]*AD+q[Vo+1]*BD,Wo=1;;){var JD=q[(Wo<<3>>2)+Vo]*AD+q[((Wo<<3)+4>>2)+Vo]*BD,KD=JD>ww,LD=KD?Wo:ID,GS=KD?JD:ww,MD=Wo+1|0;if((MD|0)==(HD|0)){var ND=LD;break b}ID=LD;ww=GS;Wo=MD}}else{ND=0}}while(0);l[mn]=ND;var OD=em+4|0,PD=l[OD>>2],Uo=l[PD+16>>2]>>2,QD=l[PD+20>>2],HS=1<(QD|0);b:do{if(HS){for(var RD=0,xw=q[Uo]*DD+q[Uo+1]*ED,Xo=1;;){var SD=q[(Xo<<3>>2)+Uo]*DD+q[((Xo<<3)+4>>2)+Uo]*ED,TD=SD>xw,UD=TD?Xo:RD,IS=TD?SD:xw,VD=Xo+1|0;if((VD|0)==(QD|0)){var yw=UD;break b}RD=UD;xw=IS;Xo=VD}}else{yw=0}}while(0);l[ln]=yw;var WD=l[FD>>2],zw=l[mn];if(-1<(zw|0)){if((l[WD+20>>2]|0)>(zw|0)){var Xr=yw,De=12}else{De=11}}else{De=11}11==De&&(P(N.i|0,103,N.h|0,N.j|0),Xr=l[ln]);var XD=(zw<<3)+l[WD+16>>2]|0,JS=l[XD+4>>2],YD=(t[0]=l[XD>>2],M[0]),ZD=(t[0]=JS,M[0]),$D=l[OD>>2],De=-1<(Xr|0)?(l[$D+20>>2]|0)>(Xr|0)?15:14:14;14==De&&P(N.i|0,103,N.h|0,N.j|0);var aE=(Xr<<3)+l[$D+16>>2]|0,KS=l[aE+4>>2],bE=(t[0]=l[aE>>2],M[0]),cE=(t[0]=KS,M[0]),Yr=(jg*bE-ig*cE+sw-(hg*YD-gg*ZD+qw))*q[yD>>2]+(ig*bE+jg*cE+tw-(gg*YD+hg*ZD+rw))*q[zD>>2]}else{if(1==(uw|0)){var dE=q[Dd+23],eE=q[Dd+24],Aw=hg*dE-gg*eE,fE=gg*dE+hg*eE,gE=q[Dd+21],hE=q[Dd+22],LS=hg*gE-gg*hE+qw,MS=gg*gE+hg*hE+rw,iE=-fE,jE=jg*-Aw+ig*iE,kE=Aw*ig+jg*iE;l[mn]=-1;var Vr=(em+4|0)>>2,lE=l[Vr],To=l[lE+16>>2]>>2,mE=l[lE+20>>2],NS=1<(mE|0);do{if(NS){for(var nE=0,Bw=q[To]*jE+q[To+1]*kE,Yo=1;;){var oE=q[(Yo<<3>>2)+To]*jE+q[((Yo<<3)+4>>2)+To]*kE,pE=oE>Bw,Zo=pE?Yo:nE,OS=pE?oE:Bw,qE=Yo+1|0;if((qE|0)==(mE|0)){break}nE=Zo;Bw=OS;Yo=qE}l[ln]=Zo;var rE=l[Vr];if(-1<(Zo|0)){Zr=Zo,$r=rE,De=21}else{var sE=Zo,tE=rE,De=22}}else{var Zr=l[ln]=0,$r=l[Vr],De=21}}while(0);if(21==De){if((l[$r+20>>2]|0)>(Zr|0)){var uE=Zr,vE=$r,De=23}else{sE=Zr,tE=$r,De=22}}22==De&&(P(N.i|0,103,N.h|0,N.j|0),uE=sE,vE=tE);var wE=(uE<<3)+l[vE+16>>2]|0,Cw=wE|0,Dw=wE+4|0,PS=l[Dw>>2],xE=(t[0]=l[Cw>>2],M[0]),yE=(t[0]=PS,M[0]),Yr=(jg*xE-ig*yE+sw-LS)*Aw+(ig*xE+jg*yE+tw-MS)*fE}else{if(2==(uw|0)){var zE=q[Dd+23],AE=q[Dd+24],Ew=jg*zE-ig*AE,BE=ig*zE+jg*AE,CE=q[Dd+21],DE=q[Dd+22],QS=jg*CE-ig*DE+sw,RS=ig*CE+jg*DE+tw,EE=-BE,FE=hg*-Ew+gg*EE,GE=Ew*gg+hg*EE;l[ln]=-1;var Ur=(em|0)>>2,HE=l[Ur],So=l[HE+16>>2]>>2,IE=l[HE+20>>2],SS=1<(IE|0);do{if(SS){for(var JE=0,Fw=q[So]*FE+q[So+1]*GE,$o=1;;){var KE=q[($o<<3>>2)+So]*FE+q[(($o<<3)+4>>2)+So]*GE,LE=KE>Fw,ap=LE?$o:JE,TS=LE?KE:Fw,ME=$o+1|0;if((ME|0)==(IE|0)){break}JE=ap;Fw=TS;$o=ME}l[mn]=ap;var NE=l[Ur];if(-1<(ap|0)){as=ap,bs=NE,De=29}else{var OE=ap,PE=NE,De=30}}else{var as=l[mn]=0,bs=l[Ur],De=29}}while(0);if(29==De){if((l[bs+20>>2]|0)>(as|0)){var QE=as,RE=bs,De=31}else{OE=as,PE=bs,De=30}}30==De&&(P(N.i|0,103,N.h|0,N.j|0),QE=OE,RE=PE);var SE=(QE<<3)+l[RE+16>>2]|0,Cw=SE|0,Dw=SE+4|0,US=l[Dw>>2],TE=(t[0]=l[Cw>>2],M[0]),UE=(t[0]=US,M[0]),Yr=(hg*TE-gg*UE+qw-QS)*Ew+(gg*TE+hg*UE+rw-RS)*BE}else{P(N.Ca|0,183,N.Me|0,N.l|0),l[mn]=-1,l[ln]=-1,Yr=0}}}Tr=Yr;if(Tr>Pv){l[Jk]=4;q[Ik]=MB;cm=25;break a}if(Tr>OB){var Gw=Ro}else{var VE=o[zB>>2],WE=o[AB>>2],Hw=lm(Pr,VE,WE,Kf);if(Hw<OB){l[Jk]=1;q[Ik]=Kf;cm=25;break a}if(Hw<=Pv){l[Jk]=3;q[Ik]=Kf;cm=25;break a}for(var cs=Ro,bp=Kf,ds=0,es=Hw,Iw=Tr;;){var fs=0==(ds&1|0)?.5*(bp+cs):bp+(hn-es)*(cs-bp)/(Iw-es),gs=lm(Pr,VE,WE,fs),Jw=gs-hn;if(.0012499999720603228>(0<Jw?Jw:-Jw)){var Kw=ds,XE=fs;break}var hs=gs>hn,VS=hs?Iw:gs,WS=hs?gs:es,XS=hs?fs:bp,YS=hs?cs:fs,YE=ds+1|0;l[Wp>>2]=l[Wp>>2]+1|0;if(50==(YE|0)){Kw=50;XE=Ro;break}cs=YS;bp=XS;ds=YE;es=WS;Iw=VS}var ZE=l[Xp>>2];l[Xp>>2]=(ZE|0)>(Kw|0)?ZE:Kw;var $E=rD+1|0;if(8!=($E|0)){rD=$E;Ro=XE;continue}Gw=Kf}var aF=Ho+1|0;l[Yp>>2]=l[Yp>>2]+1|0;if(20==(aF|0)){l[Jk]=1;q[Ik]=Gw;Io=20;cm=29;break a}Kf=Gw;Ho=aF;PB=q[Or];QB=q[Nr];RB=q[Mr];SB=q[Lr];continue a}}25==cm&&(l[Yp>>2]=l[Yp>>2]+1|0,Io=Ho+1|0);var bF=l[Zp>>2];l[Zp>>2]=(bF|0)>(Io|0)?bF:Io;a=Ye;if(3==(l[Mt>>2]|0)){var cF=Jr+(1-Jr)*q[On>>2],Ow=1>cF?cF:1}else{Ow=1}q[Cg+33]=Ow;l[vl]|=32;var Pw=Ow}else{Pw=q[Cg+33]}Pw<Vd?(Bk=uj,Ck=Pw):(Bk=Me,Ck=Vd)}}}while(0);Me=Bk;Vd=Ck;Sn=uj+12|0}}c[Dl]=Kl;var dp=l[tk];so(dp,l[tk+5]);so(dp,l[tk+6]);so(dp,l[tk+4]);so(dp,l[rk]);so(dp,uk);a=dg;q[m+25756]=0;p=12}else{var dF=Dn;p=13}}12==p&&(dF=q[h]);0<dF&&(q[A>>2]=q[k+1]);var Qw=l[j],ZS=0==(Qw&4|0);do{if(ZS){var Rw=Qw}else{var eF=l[m+25738];if(0==(eF|0)){Rw=Qw}else{var Sw=eF;for(g=Sw>>2;;){q[g+19]=0;q[g+20]=0;q[g+21]=0;var fF=l[g+24];if(0==(fF|0)){break}Sw=fF;g=Sw>>2}Rw=l[j]}}}while(0);l[j]=Rw&-3;q[m+25749]=0;a=n}function $p(b,d,e,f){var g,h=e>>2,j=a;a+=112;var k,m=j+8,n=j+16,p=j+24,u=j+32,r=j+40,w=j+48,x=l[d+12>>2],d=x>>2,y=l[d+1];a:do{if(0==(y|0)){g=q[h+3];var A=q[d+3];k=q[h+2];var C=q[d+4],z=k*A+g*C+q[h+1];q[j>>2]=g*A-k*C+q[h];q[j+4>>2]=z;A=q[d+2];q[m>>2]=g-0;q[m+4>>2]=k;g=l[b+102984>>2];K[l[l[g>>2]+20>>2]](g,j,A,m,f)}else{if(1==(y|0)){g=q[h+3];z=q[d+3];k=q[h+2];var D=q[d+4],A=q[h],C=q[h+1],E=k*z+g*D+C;q[n>>2]=g*z-k*D+A;q[n+4>>2]=E;D=x+20|0;z=q[D>>2];D=q[D+4>>2];C=k*z+g*D+C;q[p>>2]=g*z-k*D+A;q[p+4>>2]=C;g=l[b+102984>>2];K[l[l[g>>2]+24>>2]](g,n,p,f)}else{if(3==(y|0)){k=l[d+4];g=l[d+3]>>2;var A=e+12|0,G=q[A>>2],E=q[g],C=e+8|0,H=q[C>>2],F=q[g+1],z=e|0,I=q[z>>2],D=e+4|0,J=q[D>>2],L=H*E+G*F+J;q[u>>2]=G*E-H*F+I;q[u+4>>2]=L;if(1<(k|0)){for(var E=r|0,F=r+4|0,L=b+102984|0,O=r,R=u,T=1,S=J;;){var J=q[(T<<3>>2)+g],U=q[((T<<3)+4>>2)+g],S=H*J+G*U+S;q[E>>2]=G*J-H*U+I;q[F>>2]=S;J=l[L>>2];K[l[l[J>>2]+24>>2]](J,u,r,f);J=l[L>>2];K[l[l[J>>2]+16>>2]](J,u,.05000000074505806,f);J=l[O+4>>2];l[R>>2]=l[O>>2];l[R+4>>2]=J;T=T+1|0;if((T|0)==(k|0)){break a}G=q[A>>2];H=q[C>>2];I=q[z>>2];S=q[D>>2]}}}else{if(2==(y|0)){g=l[d+37];if(9>(g|0)){if(k=w|0,0<(g|0)){Q=k,k=12}else{var W=k;k=14}}else{P(N.t|0,1077,N.Ce|0,N.zh|0);var Q=w|0;k=12}b:do{if(12==k){A=x+20|0;C=q[h+3];z=q[h+2];D=q[h];E=q[h+1];for(F=0;;){if(R=q[A+(F<<3)>>2],T=q[A+(F<<3)+4>>2],O=z*R+C*T+E,L=(F<<3)+w|0,R=(M[0]=C*R-z*T+D,t[0]),O=(M[0]=O,t[0])|0,l[L>>2]=0|R,l[L+4>>2]=O,F=F+1|0,(F|0)==(g|0)){W=Q;break b}}}}while(0);k=l[b+102984>>2];K[l[l[k>>2]+12>>2]](k,W,g,f)}}}}}while(0);a=j}function aq(b){var d,e,f,g,h,j=a;a+=120;var k,m=j+12,n=j+24,p=j+36,u=j+48,r=j+60;h=r>>2;var w=j+72,x=j+104;g=(b+102984|0)>>2;var y=l[g],A=0==(y|0);a:do{if(!A){var C=l[y+4>>2],z=0==(C&1|0);b:do{if(!z){var D=l[b+102952>>2];if(0!=(D|0)){for(var E=j|0,G=j+4|0,H=j+8|0,F=p|0,I=p+4|0,J=p+8|0,L=u|0,O=u+4|0,R=u+8|0,T=m|0,S=m+4|0,U=m+8|0,W=n|0,Q=n+4|0,$=n+8|0,ea=D;;){var sa=ea+12|0,Ba=l[ea+100>>2],oa=0==(Ba|0);c:do{if(!oa){for(var ga=ea+4|0,qa=ea|0,la=Ba;;){var Ca=i[ga>>1];if(0==(Ca&32)<<16>>16){q[E>>2]=.5,q[G>>2]=.5,q[H>>2]=.30000001192092896,$p(b,la,sa,j)}else{var ia=l[qa>>2];0==(ia|0)?(q[T>>2]=.5,q[S>>2]=.8999999761581421,q[U>>2]=.5,$p(b,la,sa,m)):1==(ia|0)?(q[W>>2]=.5,q[Q>>2]=.5,q[$>>2]=.8999999761581421,$p(b,la,sa,n)):0==(Ca&2)<<16>>16?(q[F>>2]=.6000000238418579,q[I>>2]=.6000000238418579,q[J>>2]=.6000000238418579,$p(b,la,sa,p)):(q[L>>2]=.8999999761581421,q[O>>2]=.699999988079071,q[R>>2]=.699999988079071,$p(b,la,sa,u))}var ya=l[la+4>>2];if(0==(ya|0)){break c}la=ya}}}while(0);var ta=l[ea+96>>2];if(0==(ta|0)){break b}ea=ta}}}}while(0);var Ia=0==(C&2|0);b:do{if(!Ia){var na=l[b+102956>>2];if(0!=(na|0)){for(var Z=na;;){var ba=b,ca=Z,ma=Ha,ka=Ha,aa=Ha,ra=a;a+=60;var ha=ra+8,za=ra+16,X=ra+24,ua=ra+32,aa=ua>>2,da=ra+44,fa=ra+52,Aa=l[ca+52>>2]+12|0,Pa=l[ca+48>>2]+12|0,pa=l[Pa+4>>2];l[ra>>2]=l[Pa>>2];l[ra+4>>2]=pa;var cb=l[Aa+4>>2];l[ha>>2]=l[Aa>>2];l[ha+4>>2]=cb;K[l[l[ca>>2]>>2]](za,ca);K[l[l[ca>>2]+4>>2]](X,ca);q[aa]=.5;q[aa+1]=.800000011920929;q[aa+2]=.800000011920929;var Qa=l[ca+4>>2];if(3==(Qa|0)){var Ta=l[ba+102984>>2];K[l[l[Ta>>2]+24>>2]](Ta,za,X,ua)}else{if(4==(Qa|0)){var $a=ca+68|0,va=l[$a+4>>2];l[da>>2]=l[$a>>2];l[da+4>>2]=va;var Wa=ca+76|0,fb=l[Wa+4>>2];l[fa>>2]=l[Wa>>2];l[fa+4>>2]=fb;var ka=(ba+102984|0)>>2,gb=l[ka];K[l[l[gb>>2]+24>>2]](gb,da,za,ua);var Xa=l[ka];K[l[l[Xa>>2]+24>>2]](Xa,fa,X,ua);var Ua=l[ka];K[l[l[Ua>>2]+24>>2]](Ua,da,fa,ua)}else{if(5!=(Qa|0)){var ma=(ba+102984|0)>>2,Va=l[ma];K[l[l[Va>>2]+24>>2]](Va,ra,za,ua);var pb=l[ma];K[l[l[pb>>2]+24>>2]](pb,za,X,ua);var nb=l[ma];K[l[l[nb>>2]+24>>2]](nb,ha,X,ua)}}}a=ra;var La=l[Z+12>>2];if(0==(La|0)){break b}Z=La}}}}while(0);var qb=0==(C&8|0);b:do{if(!qb){for(var bb=b+102932|0;;){var Fa=l[bb>>2];if(0==(Fa|0)){break b}bb=Fa+12|0}}}while(0);var Ma=0==(C&4|0);b:do{if(!Ma){q[h]=.8999999761581421;q[h+1]=.30000001192092896;q[h+2]=.8999999761581421;var wa=l[b+102952>>2];if(0!=(wa|0)){for(var hb=b+102884|0,Ya=b+102876|0,Za=w|0,Da=w|0,Na=w+4|0,ib=w+8|0,ab=w+12|0,Ga=w+16|0,jb=w+20|0,Ea=w+24|0,Oa=w+28|0,Ja=wa;;){var db=0==(i[Ja+4>>1]&32)<<16>>16;c:do{if(!db){var xa=l[Ja+100>>2];if(0!=(xa|0)){for(var Ra=xa;;){var Ka=Ra+28|0,tb=0<(l[Ka>>2]|0);d:do{if(tb){for(var kb=Ra+24|0,ub=0;;){var rb=l[(l[kb>>2]+24>>2)+(7*ub|0)];k=-1<(rb|0)?(l[hb>>2]|0)>(rb|0)?34:33:33;33==k&&P(N.q|0,159,N.H|0,N.o|0);f=l[Ya>>2]>>2;var Bb=q[f+(9*rb|0)],lb=q[f+(9*rb|0)+1],yb=q[f+(9*rb|0)+2],xb=q[f+(9*rb|0)+3];q[Da>>2]=Bb;q[Na>>2]=lb;q[ib>>2]=yb;q[ab>>2]=lb;q[Ga>>2]=yb;q[jb>>2]=xb;q[Ea>>2]=Bb;q[Oa>>2]=xb;var Ib=l[g];K[l[l[Ib>>2]+8>>2]](Ib,Za,4,r);var wb=ub+1|0;if((wb|0)>=(l[Ka>>2]|0)){break d}ub=wb}}}while(0);var vb=l[Ra+4>>2];if(0==(vb|0)){break c}Ra=vb}}}}while(0);var zb=l[Ja+96>>2];if(0==(zb|0)){break b}Ja=zb}}}}while(0);if(0!=(C&16|0)){var Eb=l[b+102952>>2];if(0!=(Eb|0)){e=x>>2;for(var Cb=x,eb=Eb;;){d=(eb+12|0)>>2;l[e]=l[d];l[e+1]=l[d+1];l[e+2]=l[d+2];l[e+3]=l[d+3];var sb=eb+44|0,ob=l[sb+4>>2];l[Cb>>2]=l[sb>>2];l[Cb+4>>2]=ob;var Db=l[g];K[l[l[Db>>2]+28>>2]](Db,x);var Jb=l[eb+96>>2];if(0==(Jb|0)){break a}eb=Jb}}}}}while(0);a=j}function bq(b){var d,e=b>>2,f=a;if(0==(l[e+25717]&2|0)){var g=q[e+25742];d=q[e+25743];V(N.Fh|0,(s=a,a+=16,Ee[0]=g,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=d,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));V(N.Te|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));g=l[e+25740];V(N.Ze|0,(s=a,a+=4,l[s>>2]=g,s));g=l[e+25741];V(N.hf|0,(s=a,a+=4,l[s>>2]=g,s));e=l[e+25738];g=0==(e|0);a:do{if(!g){d=0;for(var h=e;;){l[h+8>>2]=d;lp(h);h=l[h+96>>2];if(0==(h|0)){break a}d=d+1|0}}}while(0);b=(b+102956|0)>>2;e=l[b];g=0==(e|0);a:do{if(!g){d=0;for(h=e;;){l[h+56>>2]=d;h=l[h+12>>2];if(0==(h|0)){break}d=d+1|0}d=l[b];if(0!=(d|0)){h=d;for(d=h>>2;;){6!=(l[d+1]|0)&&(V(N.Qa|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),K[l[l[d]+16>>2]](h),V(N.Ra|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)));d=l[d+3];if(0==(d|0)){break}h=d;d=h>>2}d=l[b];if(0!=(d|0)){h=d;for(d=h>>2;;){6==(l[d+1]|0)&&(V(N.Qa|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),K[l[l[d]+16>>2]](h),V(N.Ra|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)));d=l[d+3];if(0==(d|0)){break a}h=d;d=h>>2}}}}}while(0);V(N.yf|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.Ef|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.If|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.Nf|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s))}a=f}function qp(b,d){var e,f,g,h,j,k=b>>2,m=a;a+=192;j=m>>2;var n=m+92,p=m+104,u=m+128;h=u>>2;var r=b+64|0,w=r>>2;g=u>>2;for(var x=w+16;w<x;w++,g++){l[g]=l[w]}g=(b+4|0)>>2;w=o[g];l[g]=w|4;var x=w>>>1,y=o[k+12],A=o[k+13],w=0!=((c[A+38|0]|c[y+38|0])&1)<<24>>24,C=o[y+8>>2],z=o[A+8>>2],D=C+12|0,E=z+12|0;do{if(w){e=l[y+12>>2];f=l[A+12>>2];var G=l[k+14],H=l[k+15];l[j+4]=0;l[j+5]=0;q[j+6]=0;l[j+11]=0;l[j+12]=0;q[j+13]=0;Hi(m|0,e,G);Hi(m+28|0,f,H);f=(m+56|0)>>2;e=D>>2;l[f]=l[e];l[f+1]=l[e+1];l[f+2]=l[e+2];l[f+3]=l[e+3];f=(m+72|0)>>2;e=E>>2;l[f]=l[e];l[f+1]=l[e+1];l[f+2]=l[e+2];l[f+3]=l[e+3];c[m+88|0]=1;i[n+4>>1]=0;Bj(p,n,m);e=11920928955078125e-22>q[p+16>>2]&1;l[k+31]=0;f=e;e=x&1}else{K[l[l[k]>>2]](b,r,D,E);G=b+124|0;f=0<(l[G>>2]|0);e=f&1;a:do{if(f){for(var H=l[h+15],F=0;;){var I=b+20*F+72|0;q[I>>2]=0;var J=b+20*F+76|0;q[J>>2]=0;for(var L=l[k+(5*F|0)+20],O=0;(O|0)<(H|0);){if((l[h+(5*O|0)+4]|0)!=(L|0)){O=O+1|0}else{q[I>>2]=q[h+(5*O|0)+2];q[J>>2]=q[h+(5*O|0)+3];break}}F=F+1|0;if((F|0)>=(l[G>>2]|0)){break a}}}}while(0);G=x&1;if((f&1|0)!=(G|0)&&(f=C+4|0,H=i[f>>1],0==(H&2)<<16>>16&&(i[f>>1]=H|2,q[C+144>>2]=0),f=z+4|0,H=i[f>>1],0==(H&2)<<16>>16)){i[f>>1]=H|2,q[z+144>>2]=0}f=e;e=G}}while(0);h=0!=f<<24>>24;j=l[g];l[g]=h?j|2:j&-3;j=h^1;k=0==(d|0);if(!(0!=(e|0)|j|k)){K[l[l[d>>2]+8>>2]](d,b)}if(!(h|0==(e|0)|k)){K[l[l[d>>2]+12>>2]](d,b)}if(!(w|j|k)){K[l[l[d>>2]+16>>2]](d,b,u)}a=m}function Qp(b,d){var e,f,g,h,j,k,m,n,p,u=d>>2;n=b>>2;p=d>>2;l[n]=l[p];l[n+1]=l[p+1];l[n+2]=l[p+2];l[n+3]=l[p+3];l[n+4]=l[p+4];l[n+5]=l[p+5];var r=l[u+10];m=b+32|0;l[m>>2]=r;n=l[u+7];p=(b+48|0)>>2;l[p]=n;var w=88*n|0;n=(r+102796|0)>>2;var x=l[n];if(32>(x|0)){var y=x}else{P(N.n|0,38,N.w|0,N.D|0),y=l[n]}x=r+12*y+102412|0;l[(r+12*y+102416|0)>>2]=w;k=(r+102400|0)>>2;j=l[k];102400<(j+w|0)?(k=Ne(w),l[(x|0)>>2]=k,c[r+12*y+102420|0]=1):(l[(x|0)>>2]=r+j|0,c[r+12*y+102420|0]=0,l[k]=l[k]+w|0);y=r+102404|0;w=l[y>>2]+w|0;l[y>>2]=w;r=r+102408|0;y=l[r>>2];l[r>>2]=(y|0)>(w|0)?y:w;l[n]=l[n]+1|0;n=b+36|0;l[n>>2]=l[x>>2];r=l[m>>2];w=152*l[p]|0;m=(r+102796|0)>>2;x=l[m];32>(x|0)?y=x:(P(N.n|0,38,N.w|0,N.D|0),y=l[m]);x=r+12*y+102412|0;l[(r+12*y+102416|0)>>2]=w;k=(r+102400|0)>>2;j=l[k];102400<(j+w|0)?(k=Ne(w),l[(x|0)>>2]=k,c[r+12*y+102420|0]=1):(l[(x|0)>>2]=r+j|0,c[r+12*y+102420|0]=0,l[k]=l[k]+w|0);y=r+102404|0;w=l[y>>2]+w|0;l[y>>2]=w;r=r+102408|0;y=l[r>>2];l[r>>2]=(y|0)>(w|0)?y:w;l[m]=l[m]+1|0;m=b+40|0;l[m>>2]=l[x>>2];l[b+24>>2]=l[u+8];l[b+28>>2]=l[u+9];u=l[u+6];x=b+44|0;l[x>>2]=u;r=0<(l[p]|0);a:do{if(r){w=b+20|0;y=b+8|0;k=0;for(j=u;;){var A=l[j+(k<<2)>>2];j=A>>2;var C=l[j+12];h=l[j+13];var z=q[l[C+12>>2]+8>>2],D=q[l[h+12>>2]+8>>2],E=l[C+8>>2],G=l[h+8>>2],C=l[j+31],H=0<(C|0);H||P(N.aa|0,71,N.qe|0,N.jf|0);var F=l[m>>2];h=F>>2;q[h+(38*k|0)+34]=q[j+34];q[h+(38*k|0)+35]=q[j+35];var I=E+8|0;l[(F+152*k+112|0)>>2]=l[I>>2];var J=G+8|0;l[(F+152*k+116|0)>>2]=l[J>>2];var L=E+120|0;q[h+(38*k|0)+30]=q[L>>2];var O=G+120|0;q[h+(38*k|0)+31]=q[O>>2];e=E+128|0;q[h+(38*k|0)+32]=q[e>>2];var R=G+128|0;q[h+(38*k|0)+33]=q[R>>2];l[(F+152*k+148|0)>>2]=k;l[(F+152*k+144|0)>>2]=C;g=(F+152*k+80|0)>>2;l[g]=0;l[g+1]=0;l[g+2]=0;l[g+3]=0;l[g+4]=0;l[g+5]=0;l[g+6]=0;l[g+7]=0;g=l[n>>2];f=g>>2;l[(g+88*k+32|0)>>2]=l[I>>2];l[(g+88*k+36|0)>>2]=l[J>>2];q[f+(22*k|0)+10]=q[L>>2];q[f+(22*k|0)+11]=q[O>>2];E=E+28|0;I=g+88*k+48|0;J=l[E+4>>2];l[(I|0)>>2]=l[E>>2];l[(I+4|0)>>2]=J;G=G+28|0;E=g+88*k+56|0;I=l[G+4>>2];l[(E|0)>>2]=l[G>>2];l[(E+4|0)>>2]=I;q[f+(22*k|0)+16]=q[e>>2];q[f+(22*k|0)+17]=q[R>>2];e=A+104|0;R=g+88*k+16|0;G=l[e+4>>2];l[(R|0)>>2]=l[e>>2];l[(R+4|0)>>2]=G;e=A+112|0;R=g+88*k+24|0;G=l[e+4>>2];l[(R|0)>>2]=l[e>>2];l[(R+4|0)>>2]=G;l[(g+88*k+84|0)>>2]=C;q[f+(22*k|0)+19]=z;q[f+(22*k|0)+20]=D;l[(g+88*k+72|0)>>2]=l[j+30];b:do{if(H){for(z=0;;){if(D=A+20*z+64|0,0==(c[w]&1)<<24>>24?(q[h+(38*k|0)+(9*z|0)+4]=0,q[h+(38*k|0)+(9*z|0)+5]=0):(q[h+(38*k|0)+(9*z|0)+4]=q[y>>2]*q[j+(5*z|0)+18],q[h+(38*k|0)+(9*z|0)+5]=q[y>>2]*q[j+(5*z|0)+19]),e=F+152*k+36*z|0,q[h+(38*k|0)+(9*z|0)+6]=0,q[h+(38*k|0)+(9*z|0)+7]=0,q[h+(38*k|0)+(9*z|0)+8]=0,f=(z<<3)+g+88*k|0,e>>=2,l[e]=0,l[e+1]=0,l[e+2]=0,l[e+3]=0,e=l[D+4>>2],l[(f|0)>>2]=l[D>>2],l[(f+4|0)>>2]=e,z=z+1|0,(z|0)==(C|0)){break b}}}}while(0);k=k+1|0;if((k|0)>=(l[p]|0)){break a}j=l[x>>2]}}}while(0)}function Rp(b){var d,e,f,g,h=a;a+=56;var j=h+16,k=h+32,m=b+48|0,n=0<(l[m>>2]|0);a:do{if(n){for(var p=b+40|0,u=b+36|0,r=b+44|0,w=b+24|0,x=b+28|0,y=h+8|0,A=h+12|0,C=j+8|0,z=j+12|0,D=h,E=j,G=k,H=0;;){var F=o[p>>2];g=F>>2;var I=l[u>>2],J=q[(I+76>>2)+(22*H|0)],L=q[(I+80>>2)+(22*H|0)],O=l[l[r>>2]+(l[g+(38*H|0)+37]<<2)>>2],R=O+64|0,T=l[g+(38*H|0)+28],S=l[g+(38*H|0)+29],U=q[g+(38*H|0)+30],W=q[g+(38*H|0)+31],Q=q[g+(38*H|0)+32],$=q[g+(38*H|0)+33],ea=I+88*H+48|0,sa=l[ea+4>>2],Ba=(t[0]=l[ea>>2],M[0]),oa=(t[0]=sa,M[0]),ga=I+88*H+56|0,qa=l[ga+4>>2],la=(t[0]=l[ga>>2],M[0]),Ca=(t[0]=qa,M[0]),ia=l[w>>2],ya=ia+12*T|0,ta=l[ya+4>>2],Ia=(t[0]=l[ya>>2],M[0]),na=(t[0]=ta,M[0]),Z=q[(ia+8>>2)+(3*T|0)],ba=l[x>>2],ca=ba+12*T|0,ma=l[ca+4>>2],ka=(t[0]=l[ca>>2],M[0]),aa=(t[0]=ma,M[0]),ra=q[(ba+8>>2)+(3*T|0)],ha=ia+12*S|0,za=l[ha+4>>2],X=(t[0]=l[ha>>2],M[0]),ua=(t[0]=za,M[0]),da=q[(ia+8>>2)+(3*S|0)],fa=ba+12*S|0,Aa=l[fa+4>>2],Pa=(t[0]=l[fa>>2],M[0]),pa=(t[0]=Aa,M[0]),cb=q[(ba+8>>2)+(3*S|0)];0<(l[O+124>>2]|0)||P(N.aa|0,168,N.pe|0,N.$f|0);var Qa=mm(Z);q[y>>2]=Qa;var Ta=nm(Z);q[A>>2]=Ta;var $a=mm(da);q[C>>2]=$a;var va=nm(da);q[z>>2]=va;var Wa=na-(Qa*Ba+Ta*oa),fb=(M[0]=Ia-(Ta*Ba-Qa*oa),t[0]),gb=(M[0]=Wa,t[0])|0;l[D>>2]=0|fb;l[D+4>>2]=gb;var Xa=ua-($a*la+va*Ca),Ua=(M[0]=X-(va*la-$a*Ca),t[0]),Va=(M[0]=Xa,t[0])|0;l[E>>2]=0|Ua;l[E+4>>2]=Va;Gi(k,R,h,J,j,L);var pb=F+152*H+72|0,nb=pb,La=l[G+4>>2];l[nb>>2]=l[G>>2];l[nb+4>>2]=La;f=(F+152*H+144|0)>>2;var qb=l[f],bb=0<(qb|0);do{if(bb){e=(F+152*H+76|0)>>2;d=(pb|0)>>2;for(var Fa=U+W,Ma=-cb,wa=-ra,hb=F+152*H+140|0,Ya=0;;){var Za=q[k+(Ya<<3)+8>>2],Da=Za-Ia,Na=q[k+(Ya<<3)+12>>2],ib=Na-na,ab=F+152*H+36*Ya|0,Ga=(M[0]=Da,t[0]),jb=(M[0]=ib,t[0])|0;l[ab>>2]=0|Ga;l[ab+4>>2]=jb;var Ea=Za-X,Oa=Na-ua,Ja=F+152*H+36*Ya+8|0,db=(M[0]=Ea,t[0]),xa=(M[0]=Oa,t[0])|0;l[Ja>>2]=0|db;l[Ja+4>>2]=xa;var Ra=q[e],Ka=q[g+(38*H|0)+(9*Ya|0)+1],tb=q[d],kb=Da*Ra-Ka*tb,ub=q[g+(38*H|0)+(9*Ya|0)+3],rb=Ea*Ra-ub*tb,Bb=Fa+Q*kb*kb+$*rb*rb;q[g+(38*H|0)+(9*Ya|0)+6]=0<Bb?1/Bb:0;var lb=q[e],yb=-1*q[d],xb=Da*yb-Ka*lb,Ib=Ea*yb-ub*lb,wb=Fa+Q*xb*xb+$*Ib*Ib;q[g+(38*H|0)+(9*Ya|0)+7]=0<wb?1/wb:0;var vb=F+152*H+36*Ya+32|0;q[vb>>2]=0;var zb=q[d]*(Pa+ub*Ma-ka-Ka*wa)+q[e]*(pa+Ea*cb-aa-Da*ra);-1>zb&&(q[vb>>2]=zb*-q[hb>>2]);var Eb=Ya+1|0;if((Eb|0)==(qb|0)){break}Ya=Eb}if(2==(l[f]|0)){var Cb=q[e],eb=q[d],sb=q[g+(38*H|0)]*Cb-q[g+(38*H|0)+1]*eb,ob=q[g+(38*H|0)+2]*Cb-q[g+(38*H|0)+3]*eb,Db=q[g+(38*H|0)+9]*Cb-q[g+(38*H|0)+10]*eb,Jb=q[g+(38*H|0)+11]*Cb-q[g+(38*H|0)+12]*eb,Rb=Q*sb,Nb=$*ob,Ob=Fa+Rb*sb+Nb*ob,Kb=Fa+Q*Db*Db+$*Jb*Jb,Pb=Fa+Rb*Db+Nb*Jb,Mb=Ob*Kb-Pb*Pb;if(Ob*Ob<1e3*Mb){q[g+(38*H|0)+24]=Ob;q[g+(38*H|0)+25]=Pb;q[g+(38*H|0)+26]=Pb;q[g+(38*H|0)+27]=Kb;var Yb=0!=Mb?1/Mb:Mb,Zb=Pb*-Yb,ec=Yb*Ob;q[g+(38*H|0)+20]=Yb*Kb;q[g+(38*H|0)+21]=Zb;q[g+(38*H|0)+22]=Zb;q[g+(38*H|0)+23]=ec}else{l[f]=1}}}}while(0);var Ub=H+1|0;if((Ub|0)>=(l[m>>2]|0)){break a}H=Ub}}}while(0);a=h}function Sp(b){var d,e,f,g,h,j=b+48|0,k=0<(l[j>>2]|0);a:do{if(k){var m=b+40|0;g=(b+28|0)>>2;for(var n=0;;){var p=o[m>>2];f=p>>2;var u=p+152*n|0,r=o[f+(38*n|0)+28],w=o[f+(38*n|0)+29],x=q[f+(38*n|0)+30],y=q[f+(38*n|0)+32],A=q[f+(38*n|0)+31],C=q[f+(38*n|0)+33],z=p+152*n+144|0,D=o[z>>2],E=l[g],G=E+12*r|0,H=l[G+4>>2],F=(t[0]=l[G>>2],M[0]),I=(t[0]=H,M[0]),J=q[(E+8>>2)+(3*r|0)],L=E+12*w|0,O=l[L+4>>2],R=(t[0]=l[L>>2],M[0]),T=(t[0]=O,M[0]),S=q[(E+8>>2)+(3*w|0)],U=p+152*n+72|0,W=l[U+4>>2],Q=(t[0]=l[U>>2],M[0]),$=(t[0]=W,M[0]),ea=-1*Q,sa=q[f+(38*n|0)+34];if(2>(D-1|0)>>>0){var Ba=T,oa=R,ga=I,qa=F,la=J,Ca=S,ia=0;h=6}else{if(P(N.aa|0,311,N.nb|0,N.Kg|0),0<(D|0)){Ba=T,oa=R,ga=I,qa=F,la=J,Ca=S,ia=0,h=6}else{var ya=T,ta=R,Ia=I,na=F,Z=J,ba=S;h=7}}b:do{if(6==h){for(;;){var ca=q[f+(38*n|0)+(9*ia|0)+3],ma=q[f+(38*n|0)+(9*ia|0)+2],ka=q[f+(38*n|0)+(9*ia|0)+1],aa=q[f+(38*n|0)+(9*ia|0)],ra=sa*q[f+(38*n|0)+(9*ia|0)+4],ha=p+152*n+36*ia+20|0,za=q[ha>>2],X=za+q[f+(38*n|0)+(9*ia|0)+7]*-((oa+ca*-Ca-qa-ka*-la)*$+(Ba+ma*Ca-ga-aa*la)*ea),ua=-ra,da=X<ra?X:ra,fa=da<ua?ua:da,Aa=fa-za;q[ha>>2]=fa;var Pa=$*Aa,pa=ea*Aa,cb=qa-Pa*x,Qa=ga-pa*x,Ta=la-y*(aa*pa-ka*Pa),$a=oa+Pa*A,va=Ba+pa*A,Wa=Ca+C*(ma*pa-ca*Pa),fb=ia+1|0;if((fb|0)==(D|0)){ya=va;ta=$a;Ia=Qa;na=cb;Z=Ta;ba=Wa;break b}Ba=va;oa=$a;ga=Qa;qa=cb;la=Ta;Ca=Wa;ia=fb}}}while(0);var gb=1==(l[z>>2]|0);b:do{if(gb){var Xa=q[f+(38*n|0)+3],Ua=q[f+(38*n|0)+2],Va=q[f+(38*n|0)+1],pb=q[u>>2],nb=p+152*n+16|0,La=q[nb>>2],qb=La+((ta+Xa*-ba-na-Va*-Z)*Q+(ya+Ua*ba-Ia-pb*Z)*$-q[f+(38*n|0)+8])*-q[f+(38*n|0)+6],bb=0<qb?qb:0,Fa=bb-La;q[nb>>2]=bb;var Ma=Q*Fa,wa=$*Fa,hb=ba+C*(Ua*wa-Xa*Ma),Ya=Z-y*(pb*wa-Va*Ma),Za=na-Ma*x,Da=Ia-wa*x,Na=ta+Ma*A,ib=ya+wa*A}else{e=(p+152*n+16|0)>>2;var ab=q[e];d=(p+152*n+52|0)>>2;var Ga=q[d];0>ab|0>Ga&&P(N.aa|0,406,N.nb|0,N.Yg|0);var jb=-ba,Ea=q[f+(38*n|0)+3],Oa=q[f+(38*n|0)+2],Ja=-Z,db=q[f+(38*n|0)+1],xa=q[u>>2],Ra=q[f+(38*n|0)+12],Ka=q[f+(38*n|0)+11],tb=q[f+(38*n|0)+10],kb=q[f+(38*n|0)+9],ub=q[f+(38*n|0)+26],rb=q[f+(38*n|0)+25],Bb=(ta+Ea*jb-na-db*Ja)*Q+(ya+Oa*ba-Ia-xa*Z)*$-q[f+(38*n|0)+8]-(q[f+(38*n|0)+24]*ab+ub*Ga),lb=(ta+Ra*jb-na-tb*Ja)*Q+(ya+Ka*ba-Ia-kb*Z)*$-q[f+(38*n|0)+17]-(rb*ab+q[f+(38*n|0)+27]*Ga),yb=q[f+(38*n|0)+20]*Bb+q[f+(38*n|0)+22]*lb,xb=q[f+(38*n|0)+21]*Bb+q[f+(38*n|0)+23]*lb,Ib=-yb,wb=-xb;if(0<yb|0<xb){var vb=Bb*-q[f+(38*n|0)+6],zb=0>vb;do{if(!zb&&0<=rb*vb+lb){var Eb=vb-ab,Cb=-Ga,eb=Q*Eb,sb=$*Eb,ob=Q*Cb,Db=$*Cb,Jb=eb+ob,Rb=sb+Db,Nb=na-Jb*x,Ob=Ia-Rb*x,Kb=Z-y*(xa*sb-db*eb+(kb*Db-tb*ob)),Pb=ta+Jb*A,Mb=ya+Rb*A,Yb=ba+C*(Oa*sb-Ea*eb+(Ka*Db-Ra*ob));q[e]=vb;q[d]=0;hb=Yb;Ya=Kb;Za=Nb;Da=Ob;Na=Pb;ib=Mb;break b}}while(0);var Zb=lb*-q[f+(38*n|0)+15],ec=0>Zb;do{if(!ec&&0<=ub*Zb+Bb){var Ub=-ab,jc=Zb-Ga,Qb=Q*Ub,mb=$*Ub,cc=Q*jc,Fb=$*jc,gc=Qb+cc,vc=mb+Fb,pc=na-gc*x,qc=Ia-vc*x,$c=Z-y*(xa*mb-db*Qb+(kb*Fb-tb*cc)),Ec=ta+gc*A,sc=ya+vc*A,kd=ba+C*(Oa*mb-Ea*Qb+(Ka*Fb-Ra*cc));q[e]=0;q[d]=Zb;hb=kd;Ya=$c;Za=pc;Da=qc;Na=Ec;ib=sc;break b}}while(0);if(0>Bb|0>lb){hb=ba,Ya=Z,Za=na,Da=Ia,Na=ta,ib=ya}else{var wd=-ab,Lc=-Ga,$b=Q*wd,ac=$*wd,oc=Q*Lc,tc=$*Lc,Nc=$b+oc,ld=ac+tc,Wc=na-Nc*x,ad=Ia-ld*x,Xc=Z-y*(xa*ac-db*$b+(kb*tc-tb*oc)),Cc=ta+Nc*A,fd=ya+ld*A,md=ba+C*(Oa*ac-Ea*$b+(Ka*tc-Ra*oc));q[e]=0;q[d]=0;hb=md;Ya=Xc;Za=Wc;Da=ad;Na=Cc;ib=fd}}else{var nd=Ib-ab,Oc=wb-Ga,gd=Q*nd,od=$*nd,pd=Q*Oc,Pd=$*Oc,Xd=gd+pd,qd=od+Pd,Qd=na-Xd*x,Pc=Ia-qd*x,Ic=Z-y*(xa*od-db*gd+(kb*Pd-tb*pd)),Jc=ta+Xd*A,fc=ya+qd*A,hd=ba+C*(Oa*od-Ea*gd+(Ka*Pd-Ra*pd));q[e]=Ib;q[d]=wb;hb=hd;Ya=Ic;Za=Qd;Da=Pc;Na=Jc;ib=fc}}}while(0);var xd=l[g]+12*r|0,bd=(M[0]=Za,t[0]),rd=(M[0]=Da,t[0])|0;l[(xd|0)>>2]=0|bd;l[(xd+4|0)>>2]=rd;q[(l[g]+8>>2)+(3*r|0)]=Ya;var ye=l[g]+12*w|0,Yd=(M[0]=Na,t[0]),Tc=(M[0]=ib,t[0])|0;l[(ye|0)>>2]=0|Yd;l[(ye+4|0)>>2]=Tc;q[(l[g]+8>>2)+(3*w|0)]=hb;var wc=n+1|0;if((wc|0)>=(l[j>>2]|0)){break a}n=wc}}}while(0)}function Tp(b,d,e,f,g){var h=f>>2,j=e>>2,d=d>>2;0<(l[d+21]|0)||P(N.aa|0,617,N.te|0,N.ih|0);var k=l[d+18];if(0==(k|0)){var e=q[j+3],k=q[d+6],m=q[j+2],n=q[d+7],g=e*k-m*n+q[j],j=m*k+e*n+q[j+1],k=q[h+3],m=q[d],n=q[h+2],f=q[d+1],e=k*m-n*f+q[h],m=n*m+k*f+q[h+1],h=e-g,k=m-j,n=(M[0]=h,t[0]),f=(M[0]=k,t[0])|0;l[b>>2]=0|n;l[b+4>>2]=f;n=Fh(h*h+k*k);1.1920928955078125e-7>n?(n=h,f=k):(f=1/n,n=h*f,q[b>>2]=n,f*=k,q[(b+4|0)>>2]=f);var p=b+8|0,g=(M[0]=.5*(g+e),t[0]),j=(M[0]=.5*(j+m),t[0])|0;l[p>>2]=0|g;l[p+4>>2]=j;q[b+16>>2]=h*n+k*f-q[d+19]-q[d+20]}else{if(1==(k|0)){var m=e+12|0,k=q[m>>2],n=q[d+4],f=e+8|0,p=q[f>>2],u=q[d+5],e=k*n-p*u,k=p*n+k*u,n=(M[0]=e,t[0]),p=(M[0]=k,t[0])|0;l[(b|0)>>2]=0|n;l[(b+4|0)>>2]=p;var m=q[m>>2],n=q[d+6],f=q[f>>2],p=q[d+7],u=q[h+3],r=q[(g<<3>>2)+d],w=q[h+2],x=q[((g<<3)+4>>2)+d],g=u*r-w*x+q[h],h=w*r+u*x+q[h+1];q[b+16>>2]=(g-(m*n-f*p+q[j]))*e+(h-(f*n+m*p+q[j+1]))*k-q[d+19]-q[d+20];b=b+8|0;d=(M[0]=g,t[0]);h=(M[0]=h,t[0])|0;l[(b|0)>>2]=0|d;l[(b+4|0)>>2]=h}else{2==(k|0)&&(m=f+12|0,k=q[m>>2],n=q[d+4],f=f+8|0,p=q[f>>2],u=q[d+5],e=k*n-p*u,k=p*n+k*u,n=(M[0]=e,t[0]),p=(M[0]=k,t[0])|0,l[(b|0)>>2]=0|n,l[(b+4|0)>>2]=p,m=q[m>>2],n=q[d+6],f=q[f>>2],p=q[d+7],u=q[j+3],r=q[(g<<3>>2)+d],w=q[j+2],x=q[((g<<3)+4>>2)+d],g=u*r-w*x+q[j],j=w*r+u*x+q[j+1],q[b+16>>2]=(g-(m*n-f*p+q[h]))*e+(j-(f*n+m*p+q[h+1]))*k-q[d+19]-q[d+20],d=b+8|0,h=(M[0]=g,t[0]),j=(M[0]=j,t[0])|0,l[(d|0)>>2]=0|h,l[(d+4|0)>>2]=j,d=(M[0]=-e,t[0]),h=(M[0]=-k,t[0])|0,l[b>>2]=0|d,l[b+4>>2]=h)}}}function Kp(b,d){var e,f,g,h,j,k,m,n,p,u,r=b>>2,w=b|0;l[w>>2]=Ep+8|0;var x=d+8|0,y=d+12|0;(l[x>>2]|0)==(l[y>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[r+1]=l[d>>2];l[r+2]=0;l[r+3]=0;var A=b+48|0;l[A>>2]=l[x>>2];var C=b+52|0;l[C>>2]=l[y>>2];l[r+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[r+16]=l[d+4>>2];u=(b+16|0)>>2;l[u]=0;l[u+1]=0;l[u+2]=0;l[u+3]=0;l[u+4]=0;l[u+5]=0;l[u+6]=0;l[u+7]=0;l[w>>2]=cq+8|0;var z=b+92|0,D=b+100|0,E=b+108|0,G=b+116|0,H=b+124|0,F=b+132|0,I=d+20|0,J=l[I>>2],L=b+68|0;l[L>>2]=J;var O=d+24|0,R=l[O>>2],T=b+72|0;l[T>>2]=R;var S=l[J+4>>2],U=b+76|0;l[U>>2]=S;var W=o[R+4>>2];p=(b+80|0)>>2;l[p]=W;if(2>(S-1|0)>>>0){var Q=W}else{P(N.Ob|0,53,N.hb|0,N.mf|0),Q=l[p]}2>(Q-1|0)>>>0||P(N.Ob|0,54,N.hb|0,N.bg|0);var $=o[L>>2],ea=o[$+48>>2];n=ea>>2;l[r+21]=ea;var sa=o[$+52>>2];m=sa>>2;l[A>>2]=sa;var Ba=q[m+5],oa=q[m+6],ga=q[n+5],qa=q[n+6],la=o[I>>2];if(1==(l[U>>2]|0)){var Ca=q[m+14],ia=q[n+14],ya=la+68|0,ta=ya|0,Ia=l[ta>>2],na=ya+4|0,Z=l[na>>2],ba=E|0;k=ba>>2;l[k]=Ia;var ca=E+4|0;j=ca>>2;l[j]=Z;var ma=la+76|0,ka=ma|0,aa=l[ka>>2],ra=ma+4|0,ha=l[ra>>2],za=z|0;h=za>>2;l[h]=aa;var X=z+4|0;g=X>>2;l[g]=ha;var ua=q[la+116>>2];q[r+35]=ua;q[H>>2]=0;q[r+32]=0;var da=Ca-ia-ua}else{var fa=q[n+4],Aa=q[n+3],Pa=q[m+4],pa=q[m+3],cb=la+68|0,ba=cb|0;k=ba>>2;var Qa=l[k],ca=cb+4|0;j=ca>>2;var Ta=l[j],$a=E|0;l[$a>>2]=Qa;var va=E+4|0;l[va>>2]=Ta;var Wa=la+76|0,za=Wa|0;h=za>>2;var fb=l[h],X=Wa+4|0;g=X>>2;var gb=l[g],Xa=z|0;l[Xa>>2]=fb;var Ua=z+4|0;l[Ua>>2]=gb;q[r+35]=q[la+100>>2];var Va=la+84|0,pb=Va|0,nb=l[pb>>2],La=Va+4|0,qb=l[La>>2],bb=H|0;l[bb>>2]=nb;var Fa=H+4|0;l[Fa>>2]=qb;var Ma=(t[0]=Qa,M[0]),wa=(t[0]=Ta,M[0]),hb=(t[0]=fb,M[0]),Ya=oa*hb,Za=(t[0]=gb,M[0]),Da=Ya-Ba*Za+(pa-Aa),Na=Ba*hb+oa*Za+(Pa-fa),ib=qa*Da+ga*Na-Ma,ab=Da*-ga+qa*Na-wa,Ga=(t[0]=nb,M[0]),jb=ib*Ga,Ea=(t[0]=qb,M[0]),da=jb+ab*Ea}var Oa=l[T>>2],Ja=l[Oa+48>>2];f=Ja>>2;l[r+22]=Ja;var db=l[Oa+52>>2];e=db>>2;l[C>>2]=db;var xa=q[e+5],Ra=q[e+6],Ka=q[f+5],tb=q[f+6],kb=l[O>>2];if(1==(l[p]|0)){var ub=q[e+14],rb=q[f+14],Bb=kb+68|0,ta=Bb|0,lb=l[ta>>2],na=Bb+4|0,yb=l[na>>2],ba=G|0;k=ba>>2;l[k]=lb;ca=G+4|0;j=ca>>2;l[j]=yb;var xb=kb+76|0,ka=xb|0,Ib=l[ka>>2],ra=xb+4|0,wb=l[ra>>2],za=D|0;h=za>>2;l[h]=Ib;X=D+4|0;g=X>>2;l[g]=wb;var vb=q[kb+116>>2];q[r+36]=vb;q[F>>2]=0;q[r+34]=0;var zb=ub-rb-vb}else{var Eb=q[f+4],Cb=q[f+3],eb=q[e+4],sb=q[e+3],ob=kb+68|0,ba=ob|0;k=ba>>2;var Db=l[k],ca=ob+4|0;j=ca>>2;var Jb=l[j],$a=G|0;l[$a>>2]=Db;va=G+4|0;l[va>>2]=Jb;var Rb=kb+76|0,za=Rb|0;h=za>>2;var Nb=l[h],X=Rb+4|0;g=X>>2;var Ob=l[g],Xa=D|0;l[Xa>>2]=Nb;Ua=D+4|0;l[Ua>>2]=Ob;q[r+36]=q[kb+100>>2];var Kb=kb+84|0,pb=Kb|0,Pb=l[pb>>2],La=Kb+4|0,Mb=l[La>>2],bb=F|0;l[bb>>2]=Pb;Fa=F+4|0;l[Fa>>2]=Mb;var Yb=(t[0]=Db,M[0]),Zb=(t[0]=Jb,M[0]),ec=(t[0]=Nb,M[0]),Ub=Ra*ec,jc=(t[0]=Ob,M[0]),Qb=Ub-xa*jc+(sb-Cb),mb=xa*ec+Ra*jc+(eb-Eb),cc=tb*Qb+Ka*mb-Yb,Fb=Qb*-Ka+tb*mb-Zb,gc=(t[0]=Pb,M[0]),vc=cc*gc,pc=(t[0]=Mb,M[0]),zb=vc+Fb*pc}var qc=q[d+28>>2];q[r+38]=qc;q[r+37]=da+qc*zb;q[r+39]=0}function Gp(b,d){var e,f,g=b>>2,h=b|0;l[h>>2]=Ep+8|0;var j=d+8|0;f=d+12|0;(l[j>>2]|0)==(l[f>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[g+1]=l[d>>2];l[g+2]=0;l[g+3]=0;l[g+12]=l[j>>2];j=b+52|0;l[j>>2]=l[f>>2];l[g+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[g+16]=l[d+4>>2];f=(b+16|0)>>2;l[f]=0;l[f+1]=0;l[f+2]=0;l[f+3]=0;l[f+4]=0;l[f+5]=0;l[f+6]=0;l[f+7]=0;l[h>>2]=dq+8|0;h=b+68|0;e=b+76|0;var k=d+20|0;f=q[k>>2];(!isNaN(f)&&!isNaN(0))&-Infinity<f&Infinity>f?(f=q[d+24>>2],f=(!isNaN(f)&&!isNaN(0))&-Infinity<f&Infinity>f?7:6):f=6;6==f&&P(N.ca|0,34,N.ea|0,N.pf|0);f=d+28|0;var m=q[f>>2];0>m|(!isNaN(m)&&!isNaN(0))&-Infinity<m&Infinity>m^1&&P(N.ca|0,35,N.ea|0,N.dg|0);var m=d+32|0,n=q[m>>2];0>n|(!isNaN(n)&&!isNaN(0))&-Infinity<n&Infinity>n^1&&P(N.ca|0,36,N.ea|0,N.Og|0);var n=d+36|0,p=q[n>>2];0>p|(!isNaN(p)&&!isNaN(0))&-Infinity<p&Infinity>p^1&&P(N.ca|0,37,N.ea|0,N.$g|0);p=o[k>>2];k=o[k+4>>2];l[e>>2]=p;l[e+4>>2]=k;e=o[j>>2]>>2;var j=(t[0]=p,M[0])-q[e+3],k=(t[0]=k,M[0])-q[e+4],p=q[e+6],u=q[e+5];e=(M[0]=p*j+u*k,t[0]);j=(M[0]=j*-u+p*k,t[0])|0;l[h>>2]=0|e;l[h+4>>2]=j;q[g+26]=q[f>>2];q[g+24]=0;q[g+25]=0;q[g+21]=q[m>>2];q[g+22]=q[n>>2];q[g+23]=0;q[g+27]=0}function Hp(b,d){var e,f,g;e=d>>2;var h=b>>2;f=b|0;l[f>>2]=Ep+8|0;g=d+8|0;var j=d+12|0;(l[g>>2]|0)==(l[j>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[h+1]=l[e];l[h+2]=0;l[h+3]=0;l[h+12]=l[g>>2];l[h+13]=l[j>>2];l[h+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[h+16]=l[e+1];g=(b+16|0)>>2;l[g]=0;l[g+1]=0;l[g+2]=0;l[g+3]=0;l[g+4]=0;l[g+5]=0;l[g+6]=0;l[g+7]=0;l[f>>2]=eq+8|0;j=b+76|0;g=b+84|0;f=b+92|0;var k=d+20|0,m=b+68|0,n=l[k+4>>2];l[m>>2]=l[k>>2];l[m+4>>2]=n;k=d+28|0;m=l[k+4>>2];l[j>>2]=l[k>>2];l[j+4>>2]=m;k=d+36|0;j=l[k>>2];k=l[k+4>>2];l[g>>2]=j;l[g+4>>2]=k;j=(t[0]=j,M[0]);k=(t[0]=k,M[0]);m=Fh(j*j+k*k);1.1920928955078125e-7>m?g=k:(m=1/m,j*=m,q[g>>2]=j,g=k*m,q[(b+88|0)>>2]=g);g=(M[0]=-1*g,t[0]);j=(M[0]=j,t[0])|0;l[f>>2]=0|g;l[f+4>>2]=j;q[h+25]=q[e+11];q[h+63]=0;f=(b+104|0)>>2;l[f]=0;l[f+1]=0;l[f+2]=0;l[f+3]=0;q[h+30]=q[(d+52|0)>>2];q[h+31]=q[e+14];q[h+32]=q[e+16];q[h+33]=q[e+17];c[b+136|0]=c[d+48|0]&1;c[b+137|0]=c[d+60|0]&1;l[h+35]=0;e=(b+184|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0}function fq(b,d,e,f,g,h,j,k){var m=b>>2;l[m+2]=d;l[m+3]=e;var n=b+20|0,p=l[f+4>>2];l[n>>2]=l[f>>2];l[n+4>>2]=p;n=b+28|0;p=l[g+4>>2];l[n>>2]=l[g>>2];l[n+4>>2]=p;var n=h|0,p=q[n>>2]-q[d+12>>2],h=h+4|0,u=q[h>>2]-q[d+16>>2],r=q[d+24>>2],w=q[d+20>>2],d=b+36|0,x=(M[0]=r*p+w*u,t[0]),p=(M[0]=p*-w+r*u,t[0])|0;l[d>>2]=0|x;l[d+4>>2]=p;d=j|0;p=q[d>>2]-q[e+12>>2];j=j+4|0;u=q[j>>2]-q[e+16>>2];r=q[e+24>>2];e=q[e+20>>2];b=b+44|0;x=(M[0]=r*p+e*u,t[0]);e=(M[0]=p*-e+r*u,t[0])|0;l[b>>2]=0|x;l[b+4>>2]=e;b=q[n>>2]-q[f>>2];f=q[h>>2]-q[f+4>>2];f=Fh(b*b+f*f);q[m+13]=f;f=q[d>>2]-q[g>>2];g=q[j>>2]-q[g+4>>2];g=Fh(f*f+g*g);q[m+14]=g;q[m+15]=k;1.1920928955078125e-7<k||P(N.Qb|0,51,N.re|0,N.qf|0)}function Jp(b,d){var e,f=b>>2,g=b|0;l[g>>2]=Ep+8|0;e=d+8|0;var h=d+12|0;(l[e>>2]|0)==(l[h>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[f+1]=l[d>>2];l[f+2]=0;l[f+3]=0;l[f+12]=l[e>>2];l[f+13]=l[h>>2];l[f+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[f+16]=l[d+4>>2];e=(b+16|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0;l[g>>2]=gq+8|0;h=b+76|0;e=b+92|0;var g=b+100|0,j=d+20|0,k=b+68|0,m=l[j+4>>2];l[k>>2]=l[j>>2];l[k+4>>2]=m;j=d+28|0;k=l[j+4>>2];l[h>>2]=l[j>>2];l[h+4>>2]=k;h=d+36|0;j=l[h+4>>2];l[e>>2]=l[h>>2];l[e+4>>2]=j;e=d+44|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;g=d+52|0;q[f+21]=q[g>>2];e=d+56|0;q[f+22]=q[e>>2];h=d+60|0;j=q[h>>2];0!=j?h=j:(P(N.Qb|0,65,N.oe|0,N.fg|0),h=q[h>>2]);q[f+28]=h;q[f+27]=q[g>>2]+h*q[e>>2];q[f+29]=0}function Lp(b,d){var e,f;e=d>>2;var g=b>>2,h=b|0;l[h>>2]=Ep+8|0;f=d+8|0;var j=d+12|0;(l[f>>2]|0)==(l[j>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[g+1]=l[e];l[g+2]=0;l[g+3]=0;l[g+12]=l[f>>2];l[g+13]=l[j>>2];l[g+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[g+16]=l[e+1];f=(b+16|0)>>2;l[f]=0;l[f+1]=0;l[f+2]=0;l[f+3]=0;l[f+4]=0;l[f+5]=0;l[f+6]=0;l[f+7]=0;l[h>>2]=hq+8|0;j=b+84|0;f=b+92|0;var h=b+100|0,k=d+20|0,m=b+76|0,n=l[k+4>>2];l[m>>2]=l[k>>2];l[m+4>>2]=n;k=d+28|0;m=l[k+4>>2];l[j>>2]=l[k>>2];l[j+4>>2]=m;k=d+36|0;j=l[k>>2];k=l[k+4>>2];l[f>>2]=j;l[f+4>>2]=k;f=-1*(t[0]=k,M[0]);f=0|(M[0]=f,t[0]);l[h>>2]=f;l[h+4>>2]=j|0;q[g+51]=0;q[g+27]=0;q[g+52]=0;q[g+28]=0;q[g+53]=0;q[g+29]=0;q[g+30]=q[e+12];q[g+31]=q[e+13];c[b+128|0]=c[d+44|0]&1;q[g+17]=q[e+14];q[g+18]=q[e+15];q[g+54]=0;q[g+55]=0;e=(b+172|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0}function iq(b){return l[b+68>>2]}function jq(b){return l[b+64>>2]}function kq(b,d){l[b+68>>2]=d}function lq(b,d){l[b+76>>2]=d}function mq(b,d){l[b+64>>2]=d}function nq(b,d){l[b+60>>2]=d}function oq(b){return l[b+72>>2]}function Vq(){var b,d=Wq(80);b=d>>2;fh(d);l[b+15]=0;l[b+16]=0;l[b+17]=yp;l[b+18]=zp;l[b+19]=0;return d}function Xq(b){jp(b|0,b)}function Yq(b,d){l[b+72>>2]=d}function Zq(b){return l[b+60>>2]}function $q(b){return l[b+76>>2]}function ar(b){return q[b+20>>2]}function br(b,d){q[b+16>>2]=d}function cr(b){return l[b+12>>2]}function dr(b,d){q[b+20>>2]=d}function er(b){return l[b+8>>2]}function is(b){return l[b+4>>2]}function js(b){return q[b+16>>2]}function ks(b){return l[b+40>>2]}function ls(b,d){q[b>>2]=d}function ms(b,d){var e=b+38|0;if((d&1|0)!=(c[e]&1|0)){var f=o[b+8>>2],g=f+4|0,h=i[g>>1];0==(h&2)<<16>>16&&(i[g>>1]=h|2,q[f+144>>2]=0);c[e]=d&1}}function ns(b,d){return l[b+24>>2]+28*d|0}function os(b,d){l[b+40>>2]=d}function ps(b){return 0!=(c[b+38|0]&1)<<24>>24}function qs(b){return l[l[b+12>>2]+4>>2]}function rs(b){return q[b>>2]}function ss(b){var d,e=l[b>>2];if(-1==(e|0)){d=0}else{d=l[b+4>>2]>>2;var e=2*(q[d+(9*e|0)+2]-q[d+(9*e|0)]+(q[d+(9*e|0)+3]-q[d+(9*e|0)+1])),b=l[b+12>>2],f=0<(b|0);a:do{if(f){for(var g=0,h=0;;){if(g=0>(l[d+(9*h|0)+8]|0)?g:g+2*(q[d+(9*h|0)+2]-q[d+(9*h|0)]+(q[d+(9*h|0)+3]-q[d+(9*h|0)+1])),h=h+1|0,(h|0)==(b|0)){var j=g;break a}}}else{j=0}}while(0);d=j/e}return d}function ts(b){var d=l[b>>2];return-1==(d|0)?0:l[(l[b+4>>2]+32>>2)+(9*d|0)]}function us(b){return l[b+28>>2]}function vs(b,d){c[b+102994|0]=d&1}function ws(b){var d,e=l[b+102872>>2];if(-1==(e|0)){d=0}else{d=l[b+102876>>2]>>2;var e=2*(q[d+(9*e|0)+2]-q[d+(9*e|0)]+(q[d+(9*e|0)+3]-q[d+(9*e|0)+1])),b=l[b+102884>>2],f=0<(b|0);a:do{if(f){for(var g=0,h=0;;){if(g=0>(l[d+(9*h|0)+8]|0)?g:g+2*(q[d+(9*h|0)+2]-q[d+(9*h|0)]+(q[d+(9*h|0)+3]-q[d+(9*h|0)+1])),h=h+1|0,(h|0)==(b|0)){var j=g;break a}}}else{j=0}}while(0);d=j/e}return d}function xs(b){var d=l[b+102872>>2];return-1==(d|0)?0:l[(l[b+102876>>2]+32>>2)+(9*d|0)]}function ys(b){return 0!=(c[b+102994|0]&1)<<24>>24}function zs(b,d){l[b+102944>>2]=d}function As(b,d){c[b+102993|0]=d&1}function Bs(b,d){var e=b+102968|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function Cs(b){return l[b+102960>>2]}function Ds(b){return 0!=(l[b+102868>>2]&4|0)}function Es(b){return 0!=(c[b+102993|0]&1)<<24>>24}function Fs(b){return l[b+102956>>2]}function Gs(b){return l[b+102952>>2]}function Hs(b,d){l[b+102980>>2]=d}function Is(b){return l[b+102964>>2]}function Js(b){var d,b=l[b+102952>>2],e=0==(b|0);a:do{if(!e){d=b;for(d>>=2;;){q[d+19]=0;q[d+20]=0;q[d+21]=0;d=l[d+24];if(0==(d|0)){break a}d>>=2}}}while(0)}function Ks(b){0!=(b|0)&&(Dh(l[b+32>>2]),Dh(l[b+44>>2]),Dh(l[b+4>>2]),Ls(b))}function Ms(b,d){for(var e=d>>2,f=b>>2,g=e+15;e<g;e++,f++){l[f]=l[e]}}function Ns(b,d){var e,f;f=(b+32|0)>>1;e=d>>1;i[f]=i[e];i[f+1]=i[e+1];i[f+2]=i[e+2];xo(b)}function Os(){var b=Wq(44);i[b+32>>1]=1;i[b+34>>1]=-1;i[b+36>>1]=0;l[b+40>>2]=0;l[b+24>>2]=0;l[b+28>>2]=0;l[b>>2]=0;l[b+4>>2]=0;l[b+8>>2]=0;l[b+12>>2]=0;return b}function Ps(b,d){var e=l[b+12>>2];K[l[l[e>>2]+28>>2]](e,d,q[b>>2])}function Qs(b,d){var e=l[b+12>>2];return K[l[l[e>>2]+16>>2]](e,l[b+8>>2]+12|0,d)}function Rs(b){0!=(b|0)&&Ls(b)}function Ss(b,d,e,f){var g=l[b+12>>2];return K[l[l[g>>2]+20>>2]](g,d,e,l[b+8>>2]+12|0,f)}function Ts(b,d){4==(-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4)&&P(N.q|0,159,N.H|0,N.o|0);return l[b+4>>2]+36*d|0}function Us(b,d){4==(-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4)&&P(N.q|0,153,N.S|0,N.o|0);return l[(l[b+4>>2]+16>>2)+(9*d|0)]}function Vs(b){0!=(b|0)&&(Dh(l[b+32>>2]),Dh(l[b+44>>2]),Dh(l[b+4>>2]),Ls(b))}function Ws(){var b=Wq(60);fh(b);return b}function Xs(b){var d=b+12|0,e=l[d>>2],f=0<(e|0);a:do{if(f){for(var g=b+4|0,h=0,j=0,k=l[g>>2],m=e;;){if(2<=(l[(k+32>>2)+(9*j|0)]|0)){var n=k+36*j+24|0,p=l[n>>2];-1==(p|0)?(P(N.c|0,686,N.Ka|0,N.Ya|0),p=l[n>>2],n=l[g>>2],m=l[d>>2]):n=k;k=l[(n+32>>2)+(9*l[(k+28>>2)+(9*j|0)]|0)]-l[(n+32>>2)+(9*p|0)]|0;k=0<(k|0)?k:-k|0;h=(h|0)>(k|0)?h:k;k=n}j=j+1|0;if((j|0)>=(m|0)){var u=h;break a}}}else{u=0}}while(0);return u}function Ys(b,d,e){var f,g,h;h=-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4;4==h&&P(N.q|0,159,N.H|0,N.o|0);var j=b+4|0;h=l[j>>2];g=h>>2;-1<(e|0)?(l[b+12>>2]|0)>(e|0)?(f=h>>2,h=8):h=7:h=7;7==h&&(P(N.q|0,159,N.H|0,N.o|0),b=l[j>>2],f=b>>2);return(0<q[f+(9*e|0)]-q[g+(9*d|0)+2]|0<q[f+(9*e|0)+1]-q[g+(9*d|0)+3]|0<q[g+(9*d|0)]-q[f+(9*e|0)+2]|0<q[g+(9*d|0)+1]-q[f+(9*e|0)+3])^1}function Zs(b,d){var e,f;f=(b+40|0)>>2;var g=l[f],h=b+36|0;e=(b+32|0)>>2;if((g|0)==(l[h>>2]|0)){var j=l[e];l[h>>2]=g<<1;g=Ne(g<<3);l[e]=g;Ch(g,j,l[f]<<2);Dh(j);j=l[f]}else{j=g}l[((j<<2)+l[e]|0)>>2]=d;l[f]=l[f]+1|0}function $s(b,d,e,f){if(Rl(b|0,d,e,f)){var e=(b+40|0)>>2,f=l[e],g=b+36|0,b=(b+32|0)>>2;if((f|0)==(l[g>>2]|0)){var h=l[b];l[g>>2]=f<<1;f=Ne(f<<3);l[b]=f;Ch(f,h,l[e]<<2);Dh(h);f=l[e]}l[((f<<2)+l[b]|0)>>2]=d;l[e]=l[e]+1|0}}function at(b,d){for(var e=l[b+40>>2],f=b+32|0,g=0;(g|0)<(e|0);){var h=(g<<2)+l[f>>2]|0;if((l[h>>2]|0)!=(d|0)){g=g+1|0}else{l[h>>2]=-1;break}}e=b+28|0;l[e>>2]=l[e>>2]-1|0;Nk(b|0,d)}function bt(b,d,e){var f=a;a+=8;b=b+102872|0;l[f>>2]=b;l[f+4>>2]=d;var g=b|0,h,j,k,b=a;a+=1036;var m,n=b+4|0,d=(b|0)>>2;l[d]=n;k=(b+1028|0)>>2;j=(b+1032|0)>>2;l[j]=256;l[n>>2]=l[g>>2];l[k]=1;for(var g=g+4|0,p=e|0,u=e+4|0,r=e+8|0,e=e+12|0,w=f|0,x=f+4|0,y=1;0<(y|0);){var A=y-1|0;l[k]=A;m=l[d];y=l[m+(A<<2)>>2];if(-1==(y|0)){y=A}else{var C=l[g>>2];h=C>>2;if(0<q[p>>2]-q[h+(9*y|0)+2]|0<q[u>>2]-q[h+(9*y|0)+3]|0<q[h+(9*y|0)]-q[r>>2]|0<q[h+(9*y|0)+1]-q[e>>2]){y=A}else{if(h=C+36*y+24|0,-1==(l[h>>2]|0)){C=l[w>>2];m=-1<(y|0)?(l[C+12>>2]|0)>(y|0)?12:11:11;11==m&&P(N.q|0,153,N.S|0,N.o|0);m=l[x>>2];if(!K[l[l[m>>2]+8>>2]](m,l[l[(l[C+4>>2]+16>>2)+(9*y|0)]+16>>2])){break}y=l[k]}else{if((A|0)==(l[j]|0)){l[j]=A<<1;A=Ne(A<<3);l[d]=A;var z=m;Ch(A,z,l[k]<<2);(m|0)!=(n|0)&&Dh(z)}l[((l[k]<<2)+l[d]|0)>>2]=l[h>>2];m=l[k]+1|0;l[k]=m;y=C+36*y+28|0;(m|0)==(l[j]|0)&&(C=l[d],l[j]=m<<1,m=Ne(m<<3),l[d]=m,h=C,Ch(m,h,l[k]<<2),(C|0)!=(n|0)&&Dh(h));l[((l[k]<<2)+l[d]|0)>>2]=l[y>>2];y=l[k]+1|0;l[k]=y}}}}j=l[d];(j|0)!=(n|0)&&(Dh(j),l[d]=0);a=b;a=f}function ct(b){var d=b+102884|0,e=l[d>>2],f=0<(e|0);a:do{if(f){for(var g=b+102876|0,h=0,j=0,k=l[g>>2],m=e;;){if(2<=(l[(k+32>>2)+(9*j|0)]|0)){var n=k+36*j+24|0,p=l[n>>2];-1==(p|0)?(P(N.c|0,686,N.Ka|0,N.Ya|0),p=l[n>>2],n=l[g>>2],m=l[d>>2]):n=k;k=l[(n+32>>2)+(9*l[(k+28>>2)+(9*j|0)]|0)]-l[(n+32>>2)+(9*p|0)]|0;k=0<(k|0)?k:-k|0;h=(h|0)>(k|0)?h:k;k=n}j=j+1|0;if((j|0)>=(m|0)){var u=h;break a}}}else{u=0}}while(0);return u}function dt(b,d){var e,f=b+102868|0;e=l[f>>2];0==(e&2|0)?f=e:(P(N.t|0,109,N.Ae|0,N.pa|0),f=l[f>>2]);if(0==(f&2|0)){f=qn(b|0,152);0==(f|0)?f=0:to(f,d,b);l[f+92>>2]=0;e=(b+102952|0)>>2;l[f+96>>2]=l[e];var g=l[e];0!=(g|0)&&(l[(g+92|0)>>2]=f);l[e]=f;e=b+102960|0;l[e>>2]=l[e>>2]+1|0}else{f=0}return f}function et(b){var d=Wq(103028);wp(d,b);return d}function ft(b){return 0!=(c[b+102992|0]&1)<<24>>24}function gt(b,d){var e=b+102976|0,f=(d&1|0)==(c[e]&1|0);a:do{if(!f&&(c[e]=d&1,!d)){var g=l[b+102952>>2];if(0!=(g|0)){for(;;){var h=g+4|0,j=i[h>>1];0==(j&2)<<16>>16&&(i[h>>1]=j|2,q[g+144>>2]=0);g=l[g+96>>2];if(0==(g|0)){break a}}}}}while(0)}function ht(b){return 0!=(c[b+102976|0]&1)<<24>>24}function it(b){return l[b+102900>>2]}function jt(b){return 0!=(l[b+102868>>2]&2|0)}function kt(b){return l[b+102932>>2]}function lt(b,d){l[b+102984>>2]=d}function mt(b,d){var e=b+102868|0,f=l[e>>2];l[e>>2]=d?f|4:f&-5}function nt(b){return l[b+102936>>2]}function ot(b,d){c[b+102992|0]=d&1}function pt(b,d){l[b+102940>>2]=d}function qt(b){return l[b+4>>2]}function rt(b,d){q[b+8>>2]=d}function st(b){return q[b+8>>2]}function tt(b,d){var e=b+12|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function ut(b,d){var e=b+4|0;l[e>>2]|=d}function vt(b,d){var e=b+4|0;l[e>>2]&=d^-1}function wt(b,d){l[b+4>>2]=d}function xt(b){return l[b+4>>2]}function yt(b){return l[b+12>>2]}function zt(b){return l[b+48>>2]}function At(b){return l[b+52>>2]}function $t(b){return l[b+64>>2]}function au(b){return l[b+4>>2]}function bu(b,d){l[b+64>>2]=d}function cu(b){return 0!=(c[b+61|0]&1)<<24>>24}function du(b){return 0==(i[l[b+48>>2]+4>>1]&32)<<16>>16?0:0!=(i[l[b+52>>2]+4>>1]&32)<<16>>16}function eu(b){var d=l[b>>2];return-1==(d|0)?0:l[(l[b+4>>2]+32>>2)+(9*d|0)]}function fu(b){var d,e=l[b>>2];if(-1==(e|0)){d=0}else{d=l[b+4>>2]>>2;var e=2*(q[d+(9*e|0)+2]-q[d+(9*e|0)]+(q[d+(9*e|0)+3]-q[d+(9*e|0)+1])),b=l[b+12>>2],f=0<(b|0);a:do{if(f){for(var g=0,h=0;;){if(g=0>(l[d+(9*h|0)+8]|0)?g:g+2*(q[d+(9*h|0)+2]-q[d+(9*h|0)]+(q[d+(9*h|0)+3]-q[d+(9*h|0)+1])),h=h+1|0,(h|0)==(b|0)){var j=g;break a}}}else{j=0}}while(0);d=j/e}return d}function gu(b){return l[b+4>>2]}function hu(b,d){q[b+8>>2]=d}function iu(b){return q[b+8>>2]}function ju(b){return l[b+12>>2]}function ku(b,d,e,f){var g=a;a+=28;var h=g+8,j=b+102872|0;l[g>>2]=j;l[g+4>>2]=d;q[h+16>>2]=1;var k=l[e+4>>2];l[h>>2]=l[e>>2];l[h+4>>2]=k;var m=h+8|0,n=l[f+4>>2];l[m>>2]=l[f>>2];l[m+4>>2]=n;var p=j|0,u,r,w,x,y,A,C=a;a+=1056;var z=C+1036;A=h>>2;var D=l[A+1],E=(t[0]=l[A],M[0]),G=(t[0]=D,M[0]);y=(h+8|0)>>2;var H=l[y+1],F=(t[0]=l[y],M[0]),I=(t[0]=H,M[0]),J=F-E,L=I-G,O=J*J+L*L;0<O||P(N.q|0,204,N.Ke|0,N.Sf|0);var R=Fh(O);if(1.1920928955078125e-7>R){var T=J,S=L}else{var U=1/R,T=J*U,S=L*U}var W=-1*S,Q=0<W?W:-W,$=0<T?T:-T,ea=q[h+16>>2],sa=E+J*ea,Ba=G+L*ea,oa=E<sa?E:sa,ga=G<Ba?G:Ba,qa=E>sa?E:sa,la=G>Ba?G:Ba,Ca=C+4|0;x=(C|0)>>2;l[x]=Ca;w=(C+1028|0)>>2;r=(C+1032|0)>>2;l[r]=256;l[Ca>>2]=l[p>>2];l[w]=1;var ia=p+4|0,ya=z+8|0,ta=z+16|0,Ia=ea,na=oa,Z=ga,ba=qa,ca=la,ma=1;a:for(;;){for(var ka=ma;;){if(0>=(ka|0)){break a}var aa=ka-1|0;l[w]=aa;var ra=l[x],ha=l[ra+(aa<<2)>>2];if(-1==(ha|0)){var za=Ia,X=na,ua=Z,da=ba,fa=ca;break}var Aa=l[ia>>2];u=Aa>>2;var Pa=q[u+(9*ha|0)+2],pa=q[u+(9*ha|0)+3],cb=q[u+(9*ha|0)],Qa=q[u+(9*ha|0)+1];if(0<na-Pa|0<Z-pa|0<cb-ba|0<Qa-ca){za=Ia;X=na;ua=Z;da=ba;fa=ca;break}var Ta=W*(E-.5*(cb+Pa))+T*(G-.5*(Qa+pa));if(0<(0<Ta?Ta:-Ta)-(.5*Q*(Pa-cb)+.5*$*(pa-Qa))){za=Ia;X=na;ua=Z;da=ba;fa=ca;break}var $a=Aa+36*ha+24|0;if(-1==(l[$a>>2]|0)){var va=l[A+1];l[z>>2]=l[A];l[z+4>>2]=va;var Wa=l[y+1];l[ya>>2]=l[y];l[ya+4>>2]=Wa;q[ta>>2]=Ia;var fb,gb=g,Xa=z,Ua=ha,Va=Xa>>2,pb=a;a+=20;var nb=pb+12,La=l[gb>>2];4==(-1<(Ua|0)?(l[La+12>>2]|0)>(Ua|0)?5:4:4)&&P(N.q|0,153,N.S|0,N.o|0);var qb=l[(l[La+4>>2]+16>>2)+(9*Ua|0)],bb=l[qb+16>>2],Fa=l[bb+12>>2];if(K[l[l[Fa>>2]+20>>2]](Fa,pb,Xa,l[bb+8>>2]+12|0,l[qb+20>>2])){var Ma=q[pb+8>>2],wa=1-Ma,hb=q[Va+1]*wa+q[Va+3]*Ma;q[nb>>2]=q[Va]*wa+q[Va+2]*Ma;q[nb+4>>2]=hb;var Ya=l[gb+4>>2],Za=K[l[l[Ya>>2]+8>>2]](Ya,bb,nb,pb|0,Ma)}else{Za=q[Va+4]}a=pb;fb=Za;if(0==fb){break a}if(0>=fb){za=Ia;X=na;ua=Z;da=ba;fa=ca;break}var Da=E+J*fb,Na=G+L*fb,ib=E<Da?E:Da,ab=G<Na?G:Na,Ga=E>Da?E:Da,jb=G>Na?G:Na,za=fb,X=ib,ua=ab,da=Ga,fa=jb;break}if((aa|0)==(l[r]|0)){l[r]=aa<<1;var Ea=Ne(aa<<3);l[x]=Ea;var Oa=ra;Ch(Ea,Oa,l[w]<<2);(ra|0)!=(Ca|0)&&Dh(Oa)}l[((l[w]<<2)+l[x]|0)>>2]=l[$a>>2];var Ja=l[w]+1|0;l[w]=Ja;var db=Aa+36*ha+28|0;if((Ja|0)==(l[r]|0)){var xa=l[x];l[r]=Ja<<1;var Ra=Ne(Ja<<3);l[x]=Ra;var Ka=xa;Ch(Ra,Ka,l[w]<<2);(xa|0)!=(Ca|0)&&Dh(Ka)}l[((l[w]<<2)+l[x]|0)>>2]=l[db>>2];var tb=l[w]+1|0,ka=l[w]=tb}Ia=za;na=X;Z=ua;ba=da;ca=fa;ma=l[w]}var kb=l[x];(kb|0)!=(Ca|0)&&(Dh(kb),l[x]=0);a=C;a=g}function lu(b){0!=(b|0)&&(Ap(b),Ls(b))}function mu(b){0==c[nu]<<24>>24&&ou(nu);var b=b+102968|0,d=l[b+4>>2],e=pu;l[e>>2]=l[b>>2];l[e+4>>2]=d;return pu}function Nv(b){if(0!=(b|0)){K[l[l[b>>2]+4>>2]](b)}}function Lw(b,d,e){K[l[l[b>>2]+28>>2]](b,d,e)}function Mw(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function Nw(b,d,e,f,g){return K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function Tw(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function Uw(b){return K[l[l[b>>2]+12>>2]](b)}function Vw(b,d,e){return K[l[l[b>>2]+16>>2]](b,d,e)}function Ww(){var b,d=Wq(20);l[d>>2]=Xw+8|0;b=(d+4|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;return d}function Yw(b,d){K[l[l[b>>2]+28>>2]](b,d)}function Zw(b,d,e,f){K[l[l[b>>2]+8>>2]](b,d,e,f)}function $w(b,d,e,f,g){K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function ax(b,d,e,f){K[l[l[b>>2]+12>>2]](b,d,e,f)}function bx(b,d,e,f){K[l[l[b>>2]+16>>2]](b,d,e,f)}function cx(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function dx(b,d){return K[l[l[b>>2]+12>>2]](b,d)}function ex(b){var d=a;a+=8;0==c[fx]<<24>>24&&ou(fx);K[l[l[b>>2]>>2]](d,b);var b=l[d+4>>2],e=gx;l[e>>2]=l[d>>2];l[e+4>>2]=b;a=d;return gx}function hx(b){K[l[l[b>>2]+16>>2]](b)}function ix(b){var d=a;a+=8;0==c[jx]<<24>>24&&ou(jx);K[l[l[b>>2]+4>>2]](d,b);var b=l[d+4>>2],e=kx;l[e>>2]=l[d>>2];l[e+4>>2]=b;a=d;return kx}function lx(b,d){var e=a;a+=8;0==c[mx]<<24>>24&&ou(mx);K[l[l[b>>2]+8>>2]](e,b,d);var f=l[e+4>>2],g=nx;l[g>>2]=l[e>>2];l[g+4>>2]=f;a=e;return nx}function ox(b,d,e,f,g){return K[l[l[b>>2]+8>>2]](b,d,e,f,g)}function px(b){0!=(b|0)&&(Dh(l[b+4>>2]),Ls(b))}function qx(){var b,d,e=Wq(28);d=e>>2;l[d]=-1;l[d+3]=16;l[d+2]=0;var f=Ne(576);b=f>>2;l[d+1]=f;for(var g=b,h=g+144;g<h;g++){l[g]=0}for(g=0;;){h=g+1|0;l[(f+20>>2)+(9*g|0)]=h;l[(f+32>>2)+(9*g|0)]=-1;if(15<=(h|0)){break}g=h}l[b+140]=-1;l[b+143]=-1;l[d+4]=0;l[d+5]=0;l[d+6]=0;return e}function rx(b,d){4==(-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4)&&P(N.q|0,159,N.H|0,N.o|0);return l[b+4>>2]+36*d|0}function sx(b,d){4==(-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4)&&P(N.q|0,153,N.S|0,N.o|0);return l[(l[b+4>>2]+16>>2)+(9*d|0)]}function tx(b){var d=b+12|0,e=l[d>>2],f=0<(e|0);a:do{if(f){for(var g=b+4|0,h=0,j=0,k=l[g>>2],m=e;;){if(2<=(l[(k+32>>2)+(9*j|0)]|0)){var n=k+36*j+24|0,p=l[n>>2];-1==(p|0)?(P(N.c|0,686,N.Ka|0,N.Ya|0),p=l[n>>2],n=l[g>>2],m=l[d>>2]):n=k;k=l[(n+32>>2)+(9*l[(k+28>>2)+(9*j|0)]|0)]-l[(n+32>>2)+(9*p|0)]|0;k=0<(k|0)?k:-k|0;h=(h|0)>(k|0)?h:k;k=n}j=j+1|0;if((j|0)>=(m|0)){var u=h;break a}}}else{u=0}}while(0);return u}function ux(b,d,e){var f,g=hh(b);f=(b+4|0)>>2;var h=q[d+4>>2]-.10000000149011612,j=l[f]+36*g|0,k=(M[0]=q[d>>2]-.10000000149011612,t[0]),h=(M[0]=h,t[0])|0;l[(j|0)>>2]=0|k;l[(j+4|0)>>2]=h;k=q[d+12>>2]+.10000000149011612;j=l[f]+36*g+8|0;d=(M[0]=q[d+8>>2]+.10000000149011612,t[0]);k=(M[0]=k,t[0])|0;l[(j|0)>>2]=0|d;l[(j+4|0)>>2]=k;l[(l[f]+36*g+16|0)>>2]=e;l[(l[f]+36*g+32|0)>>2]=0;Bh(b,g);return g}function vx(){return Wq(1)}function wx(b){0!=(b|0)&&Ls(b|0)}function xx(b){if(0!=(b|0)){K[l[l[b>>2]+4>>2]](b)}}function yx(){var b=Wq(4);l[b>>2]=zx+8|0;return b}function Ax(b,d){K[l[l[b>>2]+12>>2]](b,d)}function Bx(b,d){K[l[l[b>>2]+8>>2]](b,d)}function Cx(b,d,e){K[l[l[b>>2]+16>>2]](b,d,e)}function Dx(b,d,e){K[l[l[b>>2]+20>>2]](b,d,e)}function Ex(b){if(0!=(b|0)){K[l[l[b>>2]+4>>2]](b)}}function Fx(b,d,e){var f=b+12|0;4==(0==(l[f>>2]|0)?0==(l[b+16>>2]|0)?5:4:4)&&P(N.F|0,48,N.da|0,N.Sa|0);1<(e|0)||P(N.F|0,49,N.da|0,N.Pb|0);var g=b+16|0;l[g>>2]=e;e=Ne(e<<3);l[f>>2]=e;Ch(e,d,l[g>>2]<<3);c[b+36|0]=0;c[b+37|0]=0}function Gx(b){return l[b+16>>2]}function Hx(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f;c[b+36|0]=1}function Ix(b,d){l[b+12>>2]=d}function Jx(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f;c[b+37|0]=1}function Kx(b,d){l[b+16>>2]=d}function Lx(b,d){q[b+8>>2]=d}function Mx(b){return q[b+8>>2]}function Nx(b,d){return(d<<3)+b+20|0}function Ox(b,d,e){b>>=2;l[b+37]=4;var f=-d,g=-e;q[b+5]=f;q[b+6]=g;q[b+7]=d;q[b+8]=g;q[b+9]=d;q[b+10]=e;q[b+11]=f;q[b+12]=e;q[b+21]=0;q[b+22]=-1;q[b+23]=1;q[b+24]=0;q[b+25]=0;q[b+26]=1;q[b+27]=-1;q[b+28]=0;q[b+3]=0;q[b+4]=0}function Px(b,d){var e=b+12|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function Qx(b,d){l[b+148>>2]=d}function Rx(b){return l[b+148>>2]}function Sx(b){return l[b+4>>2]}function Tx(b){return l[b+148>>2]}function Ux(b,d,e){var f=b+12|0,g=l[d+4>>2];l[f>>2]=l[d>>2];l[f+4>>2]=g;d=b+20|0;f=l[e+4>>2];l[d>>2]=l[e>>2];l[d+4>>2]=f;c[b+44|0]=0;c[b+45|0]=0}function Vx(b,d){q[b+8>>2]=d}function Wx(b){return q[b+8>>2]}function Xx(b){return l[b+4>>2]}function Yx(b){return l[b+12>>2]}function Zx(b,d){var e=b+4|0,f=l[e>>2];l[e>>2]=d?f|4:f&-5}function $x(b){return q[b+140>>2]}function ay(b){return q[b+136>>2]}function by(b){return 0!=(l[b+4>>2]&2|0)}function cy(b){return 0!=(l[b+4>>2]&4|0)}function dy(b){return l[b+52>>2]}function ey(b,d){q[b+136>>2]=d}function fy(b){return l[b+48>>2]}function gy(b){return l[b+56>>2]}function hy(b){return l[b+60>>2]}function iy(b,d){q[b+140>>2]=d}function jy(b){var d=q[l[b+48>>2]+20>>2],e=q[l[b+52>>2]+20>>2];q[b+140>>2]=d>e?d:e}function ky(b){return q[b+8>>2]}function ly(b,d){q[b+8>>2]=d}function my(b){return l[b+4>>2]}function ny(b){return q[b+56>>2]}function oy(b){return l[b+148>>2]}function py(b){return 0!=(i[b+4>>1]&4)<<16>>16}function qy(b,d){q[b+136>>2]=d}function ry(b,d){q[b+140>>2]=d}function sy(b,d){l[b+148>>2]=d}function ty(b){return q[b+72>>2]}function uy(b){return l[b+100>>2]}function vy(b,d,e){if(2==(l[b>>2]|0)){var f=b+4|0,g=i[f>>1];0==(g&2)<<16>>16&&(i[f>>1]=g|2,q[b+144>>2]=0);f=d|0;g=b+76|0;q[g>>2]+=q[f>>2];d=d+4|0;g=b+80|0;q[g>>2]+=q[d>>2];g=b+84|0;q[g>>2]+=(q[e>>2]-q[b+44>>2])*q[d>>2]-(q[e+4>>2]-q[b+48>>2])*q[f>>2]}}function wy(b,d,e){K[l[l[b>>2]+28>>2]](b,d,e)}function xy(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function yy(){var b,d=Wq(40);b=d>>2;l[b]=zy+8|0;l[b+1]=3;q[b+2]=.009999999776482582;l[b+3]=0;l[b+4]=0;c[d+36|0]=0;c[d+37|0]=0;return d}function Ay(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function By(b,d,e,f,g){return K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function Cy(b){return K[l[l[b>>2]+12>>2]](b)}function Dy(b,d,e){return K[l[l[b>>2]+16>>2]](b,d,e)}function Ey(b,d,e){var f;f=(b+12|0)>>2;4==(0==(l[f]|0)?0==(l[b+16>>2]|0)?5:4:4)&&P(N.F|0,34,N.ib|0,N.Sa|0);2<(e|0)||P(N.F|0,35,N.ib|0,N.Xb|0);var g=e+1|0,h=b+16|0;l[h>>2]=g;g=Ne(g<<3);l[f]=g;Ch(g,d,e<<3);d=l[f];e=(e<<3)+d|0;g=l[d+4>>2];l[(e|0)>>2]=l[d>>2];l[(e+4|0)>>2]=g;f=l[f];h=(l[h>>2]-2<<3)+f|0;e=b+20|0;d=l[h+4>>2];l[e>>2]=l[h>>2];l[e+4>>2]=d;h=f+8|0;f=b+28|0;e=l[h+4>>2];l[f>>2]=l[h>>2];l[f+4>>2]=e;c[b+36|0]=1;c[b+37|0]=1}function Fy(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function Gy(b){if(0!=(b|0)){var d=b+4|0,e=0<(l[d>>2]|0),f=b|0,g=l[f>>2];a:do{if(e){for(var h=0,j=g;;){if(Dh(l[j+(h<<3)+4>>2]),h=h+1|0,j=l[f>>2],(h|0)>=(l[d>>2]|0)){var k=j;break a}}}else{k=g}}while(0);Dh(k);Ls(b)}}function Hy(b){var d;d=(b+4|0)>>2;var e=0<(l[d]|0),f=b|0;a:do{if(e){for(var g=0;;){if(Dh(l[l[f>>2]+(g<<3)+4>>2]),g=g+1|0,(g|0)>=(l[d]|0)){break a}}}}while(0);l[d]=0;Oe(l[f>>2],l[b+8>>2]<<3);b=(b+12|0)>>2;for(d=b+14;b<d;b++){l[b]=0}}function EB(b,d,e){var f=0==(e|0);a:do{if(!f){var g=0<(e|0);do{if(g){if(640>=(e|0)){break}Dh(d);break a}P(N.e|0,164,N.f|0,N.Va|0)}while(0);var h=ed[rn+e|0],g=h&255;14>(h&255)||P(N.e|0,173,N.f|0,N.g|0);h=d;g=(g<<2)+b+12|0;l[d>>2]=l[g>>2];l[g>>2]=h}}while(0)}function gF(){var b,d=Wq(68);b=d>>2;l[b+2]=128;l[b+1]=0;var e=Ne(1024);l[b]=e;b=e>>2;for(e=b+256;b<e;b++){l[b]=0}b=(d+12|0)>>2;for(e=b+14;b<e;b++){l[b]=0}if(0==(c[xp]&1)<<24>>24){e=0;for(b=1;!(14>(e|0)||P(N.e|0,73,N.Ga|0,N.Ta|0),(b|0)>(l[sn+(e<<2)>>2]|0)&&(e=e+1|0),c[rn+b|0]=e&255,b=b+1|0,641==(b|0));){}c[xp]=1}return d}function hF(b){if(0!=(b|0)){K[l[l[b>>2]+4>>2]](b)}}function iF(b,d,e){K[l[l[b>>2]+28>>2]](b,d,e)}function jF(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function kF(b,d,e,f,g){return K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function lF(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function mF(b){return K[l[l[b>>2]+12>>2]](b)}function nF(b,d,e){return K[l[l[b>>2]+16>>2]](b,d,e)}function oF(){var b,d=Wq(152);b=d>>2;l[b]=pF+8|0;l[b+1]=2;q[b+2]=.009999999776482582;l[b+37]=0;q[b+3]=0;q[b+4]=0;return d}function qF(b){if(0!=(b|0)){K[l[l[b>>2]+4>>2]](b)}}function rF(b,d,e){K[l[l[b>>2]+28>>2]](b,d,e)}function sF(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function tF(b,d,e,f,g){return K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function uF(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function vF(b){return K[l[l[b>>2]+12>>2]](b)}function wF(b,d,e){return K[l[l[b>>2]+16>>2]](b,d,e)}function xF(){var b,d=Wq(48);b=d>>2;l[b]=yF+8|0;l[b+1]=1;q[b+2]=.009999999776482582;b=d+28|0;l[b>>2]=0;l[b+4>>2]=0;l[b+8>>2]=0;l[b+12>>2]=0;i[b+16>>1]=0;return d}function zF(b,d){var e=l[b+48>>2],f=l[b+52>>2];Gi(d,b+64|0,l[e+8>>2]+12|0,q[l[e+12>>2]+8>>2],l[f+8>>2]+12|0,q[l[f+12>>2]+8>>2])}function AF(b){var d=Fh(q[l[b+48>>2]+16>>2]*q[l[b+52>>2]+16>>2]);q[b+136>>2]=d}function BF(b,d,e,f){K[l[l[b>>2]>>2]](b,d,e,f)}function CF(b,d,e){K[l[l[b>>2]+28>>2]](b,d,e)}function DF(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function EF(b,d,e,f,g){return K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function FF(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function GF(b){return K[l[l[b>>2]+12>>2]](b)}function HF(b,d,e){return K[l[l[b>>2]+16>>2]](b,d,e)}function IF(b,d){0==c[JF]<<24>>24&&ou(JF);var e=q[d>>2]-q[b+12>>2],f=q[d+4>>2]-q[b+16>>2],g=q[b+24>>2],h=q[b+20>>2],j=(M[0]=g*e+h*f,t[0]),e=(M[0]=e*-h+g*f,t[0])|0,f=KF;l[f>>2]=0|j;l[f+4>>2]=e;return KF}function LF(b,d){if(0!=(l[b>>2]|0)){var e=q[d>>2],f=q[d+4>>2];0<e*e+f*f&&(e=b+4|0,f=i[e>>1],0==(f&2)<<16>>16&&(i[e>>1]=f|2,q[b+144>>2]=0));e=b+64|0;f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}}function MF(b){return l[b+108>>2]}function NF(b){return l[b+96>>2]}function OF(b,d){var e;e=(b+4|0)>>1;var f=i[e];if(d){i[e]=f|4}else{var g=f&-5;i[e]=g;0==(f&2)<<16>>16&&(i[e]=g|2,q[b+144>>2]=0)}}function PF(b){return q[b+116>>2]}function QF(b,d){if(0!=(l[b>>2]|0)){if(0<d*d){var e=b+4|0,f=i[e>>1];0==(f&2)<<16>>16&&(i[e>>1]=f|2,q[b+144>>2]=0)}q[b+72>>2]=d}}function RF(b,d){var e=b+116|0;q[d>>2]=q[e>>2];var f=b+28|0,g=q[f>>2],h=q[b+32>>2];q[d+12>>2]=q[b+124>>2]+q[e>>2]*(g*g+h*h);e=d+4|0;g=l[f+4>>2];l[e>>2]=l[f>>2];l[e+4>>2]=g}function SF(b,d){if(2==(l[b>>2]|0)){var e=b+4|0,f=i[e>>1];0==(f&2)<<16>>16&&(i[e>>1]=f|2,q[b+144>>2]=0);e=b+76|0;q[e>>2]+=q[d>>2];e=b+80|0;q[e>>2]+=q[d+4>>2]}}function TF(b,d){if(2==(l[b>>2]|0)){var e=b+4|0,f=i[e>>1];0==(f&2)<<16>>16&&(i[e>>1]=f|2,q[b+144>>2]=0);e=b+84|0;q[e>>2]+=d}}function UF(b){return 0!=(i[b+4>>1]&2)<<16>>16}function VF(b){return q[b+136>>2]}function WF(b,d,e){var f=b>>2;if(2==(l[f]|0)){var g=b+4|0,h=i[g>>1];0==(h&2)<<16>>16&&(i[g>>1]=h|2,q[f+36]=0);var h=q[f+30],g=d|0,d=d+4|0,j=q[d>>2]*h,k=b+64|0;q[k>>2]+=q[g>>2]*h;h=b+68|0;q[h>>2]+=j;b=b+72|0;q[b>>2]+=q[f+32]*((q[e>>2]-q[f+11])*q[d>>2]-(q[e+4>>2]-q[f+12])*q[g>>2])}}function XF(b){return 0!=(i[b+4>>1]&16)<<16>>16}function YF(b){return l[b+112>>2]}function ZF(b){return q[b+132>>2]}function $F(b){return 0!=(i[b+4>>1]&8)<<16>>16}function aG(b){return l[b+88>>2]}function bG(b,d){q[b+132>>2]=d}function cG(b,d){var e=b+4|0,f=i[e>>1];i[e>>1]=d?f|8:f&-9}function dG(b){return l[b>>2]}function eG(b){return q[b+140>>2]}function fG(b){var d=q[b+28>>2],e=q[b+32>>2];return q[b+124>>2]+q[b+116>>2]*(d*d+e*e)}function gG(b){return 0!=(i[b+4>>1]&32)<<16>>16}function hG(b,d){if(2==(l[b>>2]|0)){var e=b+4|0,f=i[e>>1];0==(f&2)<<16>>16&&(i[e>>1]=f|2,q[b+144>>2]=0);e=b+72|0;q[e>>2]+=q[b+128>>2]*d}}function iG(b){return l[b+102408>>2]}function jG(b,d){i[b+2>>1]=d}function kG(b,d){i[b>>1]=d}function lG(b){return i[b+4>>1]}function mG(b,d){i[b+4>>1]=d}function nG(b){return i[b+2>>1]}function oG(b){return i[b>>1]}function pG(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function qG(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function rG(b){return q[b+36>>2]}function sG(b,d){q[b+36>>2]=d}function tG(b){0==c[uG]<<24>>24&&ou(uG);var b=b+64|0,d=l[b+4>>2],e=vG;l[e>>2]=l[b>>2];l[e+4>>2]=d;return vG}function wG(b,d){var e=b>>2;0==c[xG]<<24>>24&&ou(xG);var f=q[e+18],g=q[e+17]+(q[d>>2]-q[e+11])*f,e=(M[0]=q[e+16]+(q[d+4>>2]-q[e+12])*-f,t[0]),g=(M[0]=g,t[0])|0,f=yG;l[f>>2]=0|e;l[f+4>>2]=g;return yG}function zG(b,d,e){var f=a;a+=28;i[f+22>>1]=1;i[f+24>>1]=-1;i[f+26>>1]=0;l[f+4>>2]=0;q[f+8>>2]=.20000000298023224;q[f+12>>2]=0;c[f+20|0]=0;l[(f|0)>>2]=d;q[(f+16|0)>>2]=e;b=cp(b,f);a=f;return b}function AG(b,d){0==c[BG]<<24>>24&&ou(BG);var e=q[b+24>>2],f=q[d>>2],g=q[b+20>>2],h=q[d+4>>2],j=(M[0]=e*f-g*h,t[0]),e=(M[0]=g*f+e*h,t[0])|0,f=CG;l[f>>2]=0|j;l[f+4>>2]=e;return CG}function DG(b,d){var e=b>>2;0==c[EG]<<24>>24&&ou(EG);var f=q[e+6],g=q[d>>2],h=q[e+5],j=q[d+4>>2],k=q[e+18],m=q[e+17]+(f*g-h*j+q[e+3]-q[e+11])*k,e=(M[0]=q[e+16]+(h*g+f*j+q[e+4]-q[e+12])*-k,t[0]),m=(M[0]=m,t[0])|0,f=FG;l[f>>2]=0|e;l[f+4>>2]=m;return FG}function GG(b,d){0==c[HG]<<24>>24&&ou(HG);var e=q[b+24>>2],f=q[d>>2],g=q[b+20>>2],h=q[d+4>>2],j=g*f+e*h+q[b+16>>2],e=(M[0]=e*f-g*h+q[b+12>>2],t[0]),j=(M[0]=j,t[0])|0,f=IG;l[f>>2]=0|e;l[f+4>>2]=j;return IG}function JG(b,d){var e;e=(b+4|0)>>1;var f=i[e];d?0==(f&2)<<16>>16&&(i[e]=f|2,q[b+144>>2]=0):(i[e]=f&-3,q[b+144>>2]=0,e=(b+64|0)>>2,l[e]=0,l[e+1]=0,l[e+2]=0,l[e+3]=0,l[e+4]=0,l[e+5]=0)}function KG(b,d){0==c[LG]<<24>>24&&ou(LG);var e=q[b+24>>2],f=q[d>>2],g=q[b+20>>2],h=q[d+4>>2],j=(M[0]=e*f+g*h,t[0]),e=(M[0]=f*-g+e*h,t[0])|0,f=MG;l[f>>2]=0|j;l[f+4>>2]=e;return MG}function NG(b,d){var e=b+4|0,f=i[e>>1];i[e>>1]=d?f|16:f&-17;vo(b)}function OG(b){0!=(b|0)&&(0!=(l[b+102400>>2]|0)&&P(N.n|0,32,N.Q|0,N.Ua|0),0!=(l[b+102796>>2]|0)&&P(N.n|0,33,N.Q|0,N.Xa|0),Ls(b|0))}function PG(){var b,d=Wq(102800);b=d>>2;l[b+25600]=0;l[b+25601]=0;l[b+25602]=0;l[b+25699]=0;return d}function QG(b,d){var e,f,g;g=(b+102796|0)>>2;f=l[g];if(32>(f|0)){var h=f}else{P(N.n|0,38,N.w|0,N.D|0),h=l[g]}f=(b+12*h+102412|0)>>2;l[(b+102416>>2)+(3*h|0)]=d;e=(b+102400|0)>>2;var j=l[e];102400<(j+d|0)?(e=Ne(d),l[f]=e,c[b+12*h+102420|0]=1):(l[f]=b+j|0,c[b+12*h+102420|0]=0,l[e]=l[e]+d|0);e=b+102404|0;h=l[e>>2]+d|0;l[e>>2]=h;e=b+102408|0;j=l[e>>2];l[e>>2]=(j|0)>(h|0)?j:h;l[g]=l[g]+1|0;return l[f]}function RG(b,d){K[l[l[b>>2]+8>>2]](b,d)}function SG(b){0!=(b|0)&&Ls(b)}function TG(){var b,d=Wq(6);b=d>>1;i[b]=1;i[b+1]=-1;i[b+2]=0;return d}function UG(b){0!=(b|0)&&Ls(b)}function VG(){var b,d=Wq(44);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;l[b]=9;b=(d+20|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;l[b+4]=0;l[b+5]=0;return d}function WG(b,d){q[b+40>>2]=d}function XG(b){return q[b+40>>2]}function YG(b,d,e,f){l[b+8>>2]=d;l[b+12>>2]=e;var g=f|0,h=q[g>>2]-q[d+12>>2],f=f+4|0,j=q[f>>2]-q[d+16>>2],k=q[d+24>>2],m=q[d+20>>2],d=b+20|0,n=(M[0]=k*h+m*j,t[0]),h=(M[0]=h*-m+k*j,t[0])|0;l[d>>2]=0|n;l[d+4>>2]=h;g=q[g>>2]-q[e+12>>2];f=q[f>>2]-q[e+16>>2];h=q[e+24>>2];e=q[e+20>>2];b=b+28|0;j=(M[0]=h*g+e*f,t[0]);e=(M[0]=g*-e+h*f,t[0])|0;l[b>>2]=0|j;l[b+4>>2]=e}function ZG(b){return q[b+28>>2]}function $G(b){return 0!=(c[b+37|0]&1)<<24>>24}function aH(b){return l[b>>2]}function bH(b){return 0!=(c[b+36|0]&1)<<24>>24}function cH(b,d){var e=b+4|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function dH(b,d){var e=b+16|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function eH(b){return 0!=(c[b+39|0]&1)<<24>>24}function fH(b){return l[b+44>>2]}function gH(b,d){q[b+32>>2]=d}function hH(b,d){c[b+38|0]=d&1}function iH(b,d){c[b+36|0]=d&1}function jH(b){return q[b+48>>2]}function kH(b,d){q[b+24>>2]=d}function lH(b,d){l[b+44>>2]=d}function mH(b,d){l[b>>2]=d}function nH(b,d){q[b+48>>2]=d}function oH(b){return q[b+32>>2]}function pH(b,d){c[b+39|0]=d&1}function qH(b,d){c[b+40|0]=d&1}function rH(b,d){q[b+12>>2]=d}function sH(b){return q[b+12>>2]}function tH(b){return q[b+24>>2]}function uH(b){return 0!=(c[b+40|0]&1)<<24>>24}function vH(b,d){q[b+28>>2]=d}function wH(b){return 0!=(c[b+38|0]&1)<<24>>24}function xH(b,d){c[b+37|0]=d&1}function yH(b,d){q[b>>2]=d}function zH(b,d,e){q[b>>2]=d;q[b+4>>2]=e}function AH(b){return q[b>>2]}function BH(b){return q[b+4>>2]}function CH(b,d){q[b+4>>2]=d}function DH(b){var d=q[b>>2];(!isNaN(d)&&!isNaN(0))&-Infinity<d&Infinity>d?(b=q[b+4>>2],b=(!isNaN(b)&&!isNaN(0))&-Infinity<b?Infinity>b:0):b=0;return b}function EH(b){var d=q[b>>2],b=q[b+4>>2];return d*d+b*b}function FH(b,d){var e=b|0;q[e>>2]+=q[d>>2];e=b+4|0;q[e>>2]+=q[d+4>>2]}function GH(b){q[b>>2]=0;q[b+4>>2]=0}function HH(b,d){var e=b|0;q[e>>2]*=d;e=b+4|0;q[e>>2]*=d}function IH(b,d){q[b+8>>2]=d}function JH(b,d,e,f){q[b>>2]=d;q[b+4>>2]=e;q[b+8>>2]=f}function KH(b){return q[b+8>>2]}function LH(b,d){var e=b|0;q[e>>2]+=q[d>>2];e=b+4|0;q[e>>2]+=q[d+4>>2];e=b+8|0;q[e>>2]+=q[d+8>>2]}function MH(b){q[b>>2]=0;q[b+4>>2]=0;q[b+8>>2]=0}function NH(b,d){var e=b|0;q[e>>2]*=d;e=b+4|0;q[e>>2]*=d;e=b+8|0;q[e>>2]*=d}function OH(b){return q[b+24>>2]}function PH(b,d){q[b+24>>2]=d}function QH(b){return l[b+16>>2]}function RH(b,d){var e,f=l[b+16>>2];e=f>>2;var g=l[b+20>>2],h=1<(g|0);a:do{if(h){for(var j=q[d+4>>2],k=q[d>>2],m=0,n=q[e]*k+q[e+1]*j,p=1;;){var u=q[(p<<3>>2)+e]*k+q[((p<<3)+4>>2)+e]*j,r=u>n,m=r?p:m,n=r?u:n,p=p+1|0;if((p|0)==(g|0)){var w=m;break a}}}else{w=0}}while(0);return(w<<3)+f|0}function SH(b){return l[b+20>>2]}function TH(b){return l[b+20>>2]}function UH(b,d){var e;e=l[b+16>>2]>>2;var f=l[b+20>>2],g=1<(f|0);a:do{if(g){for(var h=q[d+4>>2],j=q[d>>2],k=0,m=q[e]*j+q[e+1]*h,n=1;;){var p=q[(n<<3>>2)+e]*j+q[((n<<3)+4>>2)+e]*h,u=p>m,k=u?n:k,m=u?p:m,n=n+1|0;if((n|0)==(f|0)){var r=k;break a}}}else{r=0}}while(0);return r}function VH(b,d){l[b+16>>2]=d}function WH(b,d){l[b+20>>2]=d}function XH(b){return 0!=(c[b+20|0]&1)<<24>>24}function YH(b,d){l[b+4>>2]=d}function ZH(b,d){l[b>>2]=d}function $H(b){return q[b+16>>2]}function aI(b){return l[b>>2]}function bI(b,d){q[b+16>>2]=d}function cI(b,d){q[b+12>>2]=d}function dI(b){return q[b+12>>2]}function eI(b,d){c[b+20|0]=d&1}function fI(b){return q[b+8>>2]}function gI(b,d){q[b+8>>2]=d}function hI(b){return l[b+4>>2]}function iI(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function jI(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function kI(b){return q[b+68>>2]}function lI(b){return 0!=(c[b+60|0]&1)<<24>>24}function mI(b){return q[b+44>>2]}function nI(b,d){c[b+48|0]=d&1}function oI(b,d){q[b+68>>2]=d}function pI(b,d){q[b+56>>2]=d}function qI(){var b,d,e=Wq(52);d=e>>2;l[d+11]=0;b=(e+4|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;l[b+4]=0;l[b+5]=0;l[b+6]=0;l[b+7]=0;c[e+36|0]=1;c[e+37|0]=1;c[e+38|0]=0;c[e+39|0]=0;l[d]=0;c[e+40|0]=1;q[d+12]=1;return e}function rI(b){0!=(b|0)&&Ls(b)}function sI(b){var d=b|0,e=q[d>>2],b=b+4|0,f=q[b>>2],g=Fh(e*e+f*f);if(1.1920928955078125e-7>g){d=0}else{var h=1/g;q[d>>2]=e*h;q[b>>2]=f*h;d=g}return d}function tI(){return Wq(8)}function uI(b,d){var e=Wq(8);q[e>>2]=b;q[e+4>>2]=d;return e}function vI(b){0==c[wI]<<24>>24&&ou(wI);var d=q[b>>2],b=(M[0]=-q[b+4>>2],t[0]),d=(M[0]=d,t[0])|0,e=xI;l[e>>2]=0|b;l[e+4>>2]=d;return xI}function yI(b){var d=q[b>>2],b=q[b+4>>2];return Fh(d*d+b*b)}function zI(b){0!=(b|0)&&Ls(b)}function AI(b){0==c[BI]<<24>>24&&ou(BI);var d=-q[b+4>>2],b=(M[0]=-q[b>>2],t[0]),d=(M[0]=d,t[0])|0,e=CI;l[e>>2]=0|b;l[e+4>>2]=d;return CI}function DI(b){0!=(b|0)&&Ls(b)}function EI(){return Wq(12)}function FI(b,d,e){var f,g=Wq(12);f=g>>2;q[f]=b;q[f+1]=d;q[f+2]=e;return g}function GI(b){0==c[HI]<<24>>24&&ou(HI);var d=-q[b+4>>2],e=-q[b+8>>2];q[II>>2]=-q[b>>2];q[II+4>>2]=d;q[II+8>>2]=e;return II}function JI(){var b,d=Wq(28);b=d>>2;l[b+4]=0;l[b+5]=0;q[b+6]=0;return d}function KI(b){0!=(b|0)&&Ls(b)}function LI(b,d){4==(-1<(d|0)?(l[b+20>>2]|0)>(d|0)?5:4:4)&&P(N.i|0,103,N.h|0,N.j|0);return(d<<3)+l[b+16>>2]|0}function MI(b){0!=(b|0)&&Ls(b)}function NI(){var b=Wq(28);i[b+22>>1]=1;i[b+24>>1]=-1;i[b+26>>1]=0;l[b>>2]=0;l[b+4>>2]=0;q[b+8>>2]=.20000000298023224;q[b+12>>2]=0;q[b+16>>2]=0;c[b+20|0]=0;return b}function OI(b,d){var e,f;f=(b+22|0)>>1;e=d>>1;i[f]=i[e];i[f+1]=i[e+1];i[f+2]=i[e+2]}function PI(){var b,d,e=Wq(72);d=e>>2;l[d]=0;l[d+1]=0;l[d+2]=0;l[d+3]=0;c[e+16]=0;l[d]=2;b=(e+20|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;q[(e+36|0)>>2]=1;q[d+10]=0;q[d+11]=0;c[e+48|0]=0;q[d+13]=0;q[d+14]=0;c[e+60|0]=0;q[d+16]=0;q[d+17]=0;return e}function QI(b,d,e,f,g){var h=e>>2;l[b+8>>2]=d;l[b+12>>2]=e;var j=f|0,k=q[j>>2]-q[d+12>>2],m=f+4|0,n=q[m>>2]-q[d+16>>2],e=d+24|0,p=q[e>>2],f=d+20|0,u=q[f>>2],r=b+20|0,w=(M[0]=p*k+u*n,t[0]),k=(M[0]=k*-u+p*n,t[0])|0;l[r>>2]=0|w;l[r+4>>2]=k;j=q[j>>2]-q[h+3];r=q[m>>2]-q[h+4];w=q[h+6];n=q[h+5];m=b+28|0;k=(M[0]=w*j+n*r,t[0]);j=(M[0]=j*-n+w*r,t[0])|0;l[m>>2]=0|k;l[m+4>>2]=j;e=q[e>>2];j=q[g>>2];f=q[f>>2];k=q[g+4>>2];g=b+36|0;m=(M[0]=e*j+f*k,t[0]);f=(M[0]=j*-f+e*k,t[0])|0;l[g>>2]=0|m;l[g+4>>2]=f;q[b+44>>2]=q[h+14]-q[d+56>>2]}function RI(b,d){q[b+52>>2]=d}function SI(b){return q[b+56>>2]}function TI(b){return 0!=(c[b+48|0]&1)<<24>>24}function UI(b,d){q[b+44>>2]=d}function VI(b){return q[b+64>>2]}function WI(b,d){q[b+64>>2]=d}function XI(b,d){c[b+60|0]=d&1}function YI(b){return q[b+52>>2]}function ZI(b,d){var e=b+36|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function $I(b,d){q[b+4>>2]=d}function aJ(b){q[b>>2]=0;q[b+4>>2]=1}function bJ(b){return q[b+4>>2]}function cJ(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function dJ(b,d){q[b+52>>2]=d}function eJ(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function fJ(b){return q[b+56>>2]}function gJ(b,d){q[b+48>>2]=d}function hJ(b){return 0!=(c[b+44|0]&1)<<24>>24}function iJ(b){return q[b+48>>2]}function jJ(b){return q[b+60>>2]}function kJ(b,d){c[b+44|0]=d&1}function lJ(b,d){q[b+56>>2]=d}function mJ(b,d,e,f,g){l[b+8>>2]=d;l[b+12>>2]=e;var h=f|0,j=q[h>>2]-q[d+12>>2],k=f+4|0,m=q[k>>2]-q[d+16>>2],f=d+24|0,n=q[f>>2],d=d+20|0,p=q[d>>2],u=b+20|0,r=(M[0]=n*j+p*m,t[0]),j=(M[0]=j*-p+n*m,t[0])|0;l[u>>2]=0|r;l[u+4>>2]=j;h=q[h>>2]-q[e+12>>2];k=q[k>>2]-q[e+16>>2];j=q[e+24>>2];n=q[e+20>>2];e=b+28|0;m=(M[0]=j*h+n*k,t[0]);h=(M[0]=h*-n+j*k,t[0])|0;l[e>>2]=0|m;l[e+4>>2]=h;f=q[f>>2];e=q[g>>2];d=q[d>>2];g=q[g+4>>2];b=b+36|0;h=(M[0]=f*e+d*g,t[0]);g=(M[0]=e*-d+f*g,t[0])|0;l[b>>2]=0|h;l[b+4>>2]=g}function nJ(b,d){q[b+60>>2]=d}function oJ(b,d){var e=b+36|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function pJ(b){return q[b+52>>2]}function qJ(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function rJ(b){return q[b+44>>2]}function sJ(b,d){q[b+48>>2]=d}function tJ(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function uJ(b){return 0!=(c[b+40|0]&1)<<24>>24}function vJ(b,d){q[b+44>>2]=d}function wJ(b){return 0!=(c[b+52|0]&1)<<24>>24}function xJ(b,d){q[b+56>>2]=d}function yJ(b){return q[b+48>>2]}function zJ(b,d){q[b+36>>2]=d}function AJ(b,d){q[b+60>>2]=d}function BJ(b){return q[b+36>>2]}function CJ(b,d){c[b+40|0]=d&1}function DJ(b,d){c[b+52|0]=d&1}function EJ(b,d,e,f){var g=e>>2,h=d>>2;l[b+8>>2]=d;l[b+12>>2]=e;var d=f|0,e=q[d>>2]-q[h+3],f=f+4|0,j=q[f>>2]-q[h+4],k=q[h+6],m=q[h+5],n=b+20|0,p=(M[0]=k*e+m*j,t[0]),e=(M[0]=e*-m+k*j,t[0])|0;l[n>>2]=0|p;l[n+4>>2]=e;d=q[d>>2]-q[g+3];n=q[f>>2]-q[g+4];p=q[g+6];j=q[g+5];f=b+28|0;e=(M[0]=p*d+j*n,t[0]);d=(M[0]=d*-j+p*n,t[0])|0;l[f>>2]=0|e;l[f+4>>2]=d;q[b+36>>2]=q[g+14]-q[h+14]}function FJ(b){return q[b+60>>2]}function GJ(b){return q[b+56>>2]}function HJ(b,d){var e=b+36|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function IJ(b,d){var e=b+44|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function JJ(b){return q[b+60>>2]}function KJ(b){return q[b+56>>2]}function LJ(b){return q[b+52>>2]}function MJ(b,d){q[b+60>>2]=d}function NJ(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function OJ(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function PJ(b,d){q[b+56>>2]=d}function QJ(b,d){q[b+52>>2]=d}function RJ(b){return l[b+8>>2]}function SJ(b,d){l[b+4>>2]=d}function TJ(b,d){l[b+8>>2]=d}function UJ(b,d){l[b+12>>2]=d}function VJ(b){return l[b+12>>2]}function WJ(b,d){l[b>>2]=d}function XJ(b){return 0!=(c[b+16|0]&1)<<24>>24}function YJ(b){return l[b>>2]}function ZJ(b,d){c[b+16|0]=d&1}function $J(b){return l[b+4>>2]}function aK(b,d){var e=l[d+4>>2];l[b>>2]=l[d>>2];l[b+4>>2]=e}function bK(b,d){var e=b+8|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function cK(b){q[b>>2]=0;q[b+4>>2]=0;q[b+8>>2]=0;q[b+12>>2]=1}function dK(b){0!=(b|0)&&Ls(b)}function eK(b){0!=(b|0)&&Ls(b)}function fK(b,d){var e=mm(d);q[b>>2]=e;e=nm(d);q[b+4>>2]=e}function gK(b){return hK(q[b>>2],q[b+4>>2])}function iK(b){0==c[jK]<<24>>24&&ou(jK);var d=q[b+4>>2],b=(M[0]=-q[b>>2],t[0]),d=(M[0]=d,t[0])|0,e=kK;l[e>>2]=0|b;l[e+4>>2]=d;return kK}function lK(b){0==c[mK]<<24>>24&&ou(mK);var d=q[b>>2],b=(M[0]=q[b+4>>2],t[0]),d=(M[0]=d,t[0])|0,e=nK;l[e>>2]=0|b;l[e+4>>2]=d;return nK}function oK(){return Wq(8)}function pK(b){var d=Wq(8),e=mm(b);q[d>>2]=e;b=nm(b);q[d+4>>2]=b;return d}function qK(b){0!=(b|0)&&Ls(b)}function rK(){var b,d,e=Wq(64);d=e>>2;l[d]=0;l[d+1]=0;l[d+2]=0;l[d+3]=0;c[e+16]=0;l[d]=7;b=(e+20|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;q[(e+36|0)>>2]=1;q[d+10]=0;c[e+44|0]=0;q[d+12]=0;q[d+13]=0;q[d+14]=2;q[d+15]=.699999988079071;return e}function sK(b){0!=(b|0)&&Ls(b)}function tK(){var b,d,e=Wq(64);d=e>>2;l[d]=0;l[d+1]=0;l[d+2]=0;l[d+3]=0;c[e+16]=0;l[d]=1;var f=e+20|0;b=f>>2;q[d+11]=0;q[d+12]=0;q[d+15]=0;q[d+14]=0;c[e+52|0]=0;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;l[b+4]=0;c[f+20]=0;return e}function uK(b){0!=(b|0)&&Ls(b)}function vK(){var b,d=Wq(64);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;l[b]=4;q[b+5]=-1;q[b+6]=1;q[b+7]=1;q[b+8]=1;q[b+9]=-1;q[b+10]=0;q[b+11]=1;q[b+12]=0;q[b+13]=0;q[b+14]=0;q[b+15]=1;c[d+16|0]=1;return d}function wK(b){0!=(b|0)&&Ls(b)}function xK(){var b,d=Wq(20);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;return d}function yK(b){0!=(b|0)&&Ls(b)}function zK(b,d,e){var f=l[d+4>>2];l[b>>2]=l[d>>2];l[b+4>>2]=f;d=mm(e);q[b+8>>2]=d;e=nm(e);q[b+12>>2]=e}function AK(){return Wq(16)}function BK(b,d){var e=Wq(16),f=l[b+4>>2];l[e>>2]=l[b>>2];l[e+4>>2]=f;var f=e+8|0,g=l[d+4>>2];l[f>>2]=l[d>>2];l[f+4>>2]=g;return e}function CK(b,d){q[b+8>>2]=d}function DK(b,d,e,f){q[b>>2]=d;q[b+4>>2]=e;q[b+8>>2]=f}function EK(b){return q[b+8>>2]}function FK(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function GK(b){return q[b+40>>2]}function HK(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function IK(b,d){q[b+44>>2]=d}function JK(b,d){q[b+36>>2]=d}function KK(b){return q[b+36>>2]}function LK(b){return q[b+44>>2]}function MK(b,d){q[b+40>>2]=d}function NK(b,d,e,f){var g=e>>2,h=d>>2;l[b+8>>2]=d;l[b+12>>2]=e;var d=f|0,e=q[d>>2]-q[h+3],f=f+4|0,j=q[f>>2]-q[h+4],k=q[h+6],m=q[h+5],n=b+20|0,p=(M[0]=k*e+m*j,t[0]),e=(M[0]=e*-m+k*j,t[0])|0;l[n>>2]=0|p;l[n+4>>2]=e;d=q[d>>2]-q[g+3];n=q[f>>2]-q[g+4];p=q[g+6];j=q[g+5];f=b+28|0;e=(M[0]=p*d+j*n,t[0]);d=(M[0]=d*-j+p*n,t[0])|0;l[f>>2]=0|e;l[f+4>>2]=d;q[b+36>>2]=q[g+14]-q[h+14]}function OK(b){return q[b+32>>2]}function PK(b,d){q[b+36>>2]=d}function QK(b){return q[b+28>>2]}function RK(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function SK(b,d){q[b+28>>2]=d}function TK(b,d){q[b+32>>2]=d}function UK(b){return q[b+36>>2]}function VK(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function WK(b){return q[b+36>>2]}function XK(b){return q[b+40>>2]}function YK(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function ZK(b,d){q[b+44>>2]=d}function $K(b){return q[b+44>>2]}function aL(b,d){q[b+36>>2]=d}function bL(b,d){q[b+40>>2]=d}function cL(b,d){l[b+20>>2]=d}function dL(b,d){l[b+24>>2]=d}function eL(b,d){q[b+28>>2]=d}function fL(b){return l[b+20>>2]}function gL(b){return l[b+24>>2]}function hL(b){return q[b+28>>2]}function iL(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function jL(b){return q[b+36>>2]}function kL(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function lL(b,d){q[b+36>>2]=d}function mL(b){0!=(b|0)&&Ls(b)}function nL(){return Wq(12)}function oL(b,d,e){var f,g=Wq(12);f=g>>2;q[f]=b;q[f+1]=d;q[f+2]=e;return g}function pL(b){0!=(b|0)&&Ls(b)}function qL(){var b,d=Wq(48);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;l[b]=8;b=(d+20|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;l[b+4]=0;l[b+5]=0;l[b+6]=0;return d}function rL(b){0!=(b|0)&&Ls(b)}function sL(){var b,d=Wq(40);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;l[b]=5;q[b+5]=0;q[b+6]=0;q[b+7]=0;q[b+8]=5;q[b+9]=.699999988079071;return d}function tL(b){0!=(b|0)&&Ls(b)}function uL(){var b,d,e=Wq(48);d=e>>2;l[d]=0;l[d+1]=0;l[d+2]=0;l[d+3]=0;c[e+16]=0;l[d]=3;b=(e+20|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;q[(e+36|0)>>2]=1;q[d+10]=0;q[d+11]=0;return e}function vL(b,d,e,f,g){l[b+8>>2]=d;l[b+12>>2]=e;var h=f|0,j=q[h>>2]-q[d+12>>2],f=f+4|0,k=q[f>>2]-q[d+16>>2],m=q[d+24>>2],n=q[d+20>>2],d=b+20|0,p=(M[0]=m*j+n*k,t[0]),j=(M[0]=j*-n+m*k,t[0])|0;l[d>>2]=0|p;l[d+4>>2]=j;j=g|0;k=q[j>>2]-q[e+12>>2];g=g+4|0;m=q[g>>2]-q[e+16>>2];d=q[e+24>>2];n=q[e+20>>2];e=b+28|0;p=(M[0]=d*k+n*m,t[0]);k=(M[0]=k*-n+d*m,t[0])|0;l[e>>2]=0|p;l[e+4>>2]=k;h=q[j>>2]-q[h>>2];f=q[g>>2]-q[f>>2];h=Fh(h*h+f*f);q[b+36>>2]=h}function wL(b){0!=(b|0)&&Ls(b)}function xL(){var b,d=Wq(32);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;l[b]=6;l[b+5]=0;l[b+6]=0;q[b+7]=1;return d}function yL(b){0!=(b|0)&&Ls(b)}function zL(){var b,d=Wq(40);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;l[b]=10;q[b+5]=-1;q[b+6]=0;q[b+7]=1;q[b+8]=0;q[b+9]=0;return d}function Ne(b){var d,e,f,g,h,j,k,m,n,p,u,r,w,x,y,A,C,z,D,E=245>b>>>0;a:do{if(E){var G=11>b>>>0?16:b+11&-8,H=G>>>3,F=o[Y>>2],I=F>>>(H>>>0);if(0!=(I&3|0)){var J=(I&1^1)+H|0,L=J<<1,O=(L<<2)+Y+40|0,R=(L+2<<2)+Y+40|0,T=o[R>>2],S=T+8|0,U=o[S>>2];(O|0)==(U|0)?l[Y>>2]=F&(1<<J^-1):(U>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[R>>2]=U,l[U+12>>2]=O);var W=J<<3;l[T+4>>2]=W|3;var Q=T+(W|4)|0;l[Q>>2]|=1;var $=S;D=331}else{if(G>>>0>o[Y+8>>2]>>>0){if(0!=(I|0)){var ea=2<<H,sa=I<<H&(ea|-ea),Ba=(sa&-sa)-1|0,oa=Ba>>>12&16,ga=Ba>>>(oa>>>0),qa=ga>>>5&8,la=ga>>>(qa>>>0),Ca=la>>>2&4,ia=la>>>(Ca>>>0),ya=ia>>>1&2,ta=ia>>>(ya>>>0),Ia=ta>>>1&1,na=(qa|oa|Ca|ya|Ia)+(ta>>>(Ia>>>0))|0,Z=na<<1,ba=(Z<<2)+Y+40|0,ca=(Z+2<<2)+Y+40|0,ma=o[ca>>2],ka=ma+8|0,aa=o[ka>>2];(ba|0)==(aa|0)?l[Y>>2]=F&(1<<na^-1):(aa>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[ca>>2]=aa,l[aa+12>>2]=ba);var ra=na<<3,ha=ra-G|0;l[ma+4>>2]=G|3;var za=ma,X=za+G|0;l[za+(G|4)>>2]=ha|1;l[za+ra>>2]=ha;var ua=o[Y+8>>2];if(0!=(ua|0)){var da=l[Y+20>>2],fa=ua>>>2&1073741822,Aa=(fa<<2)+Y+40|0,Pa=o[Y>>2],pa=1<<(ua>>>3);if(0==(Pa&pa|0)){l[Y>>2]=Pa|pa;var cb=Aa,Qa=(fa+2<<2)+Y+40|0}else{var Ta=(fa+2<<2)+Y+40|0,$a=o[Ta>>2];$a>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));cb=$a;Qa=Ta}l[Qa>>2]=da;l[cb+12>>2]=da;l[(da+8|0)>>2]=cb;l[(da+12|0)>>2]=Aa}l[Y+8>>2]=ha;l[Y+20>>2]=X;$=ka;D=331}else{var va=l[Y+4>>2];if(0==(va|0)){mb=G,z=mb>>2,D=155}else{var Wa=(va&-va)-1|0,fb=Wa>>>12&16,gb=Wa>>>(fb>>>0),Xa=gb>>>5&8,Ua=gb>>>(Xa>>>0),Va=Ua>>>2&4,pb=Ua>>>(Va>>>0),nb=pb>>>1&2,La=pb>>>(nb>>>0),qb=La>>>1&1,bb=o[Y+((Xa|fb|Va|nb|qb)+(La>>>(qb>>>0))<<2)+304>>2],Fa=bb,Ma=bb;C=Ma>>2;for(var wa=(l[bb+4>>2]&-8)-G|0;;){var hb=l[Fa+16>>2];if(0==(hb|0)){var Ya=l[Fa+20>>2];if(0==(Ya|0)){break}var Za=Ya}else{Za=hb}var Da=(l[Za+4>>2]&-8)-G|0,Na=Da>>>0<wa>>>0,ib=Na?Da:wa,ab=Na?Za:Ma,Fa=Za,Ma=ab;C=Ma>>2;wa=ib}var Ga=Ma,jb=o[Y+16>>2],Ea=Ga>>>0<jb>>>0;do{if(!Ea){var Oa=Ga+G|0,Ja=Oa;if(Ga>>>0<Oa>>>0){var db=o[C+6],xa=o[C+3],Ra=(xa|0)==(Ma|0);do{if(Ra){var Ka=Ma+20|0,tb=l[Ka>>2];if(0==(tb|0)){var kb=Ma+16|0,ub=l[kb>>2];if(0==(ub|0)){var rb=0;A=rb>>2;break}var Bb=kb,lb=ub}else{Bb=Ka,lb=tb,D=39}for(;;){var yb=lb+20|0,xb=l[yb>>2];if(0!=(xb|0)){Bb=yb,lb=xb}else{var Ib=lb+16|0,wb=o[Ib>>2];if(0==(wb|0)){break}Bb=Ib;lb=wb}}Bb>>>0<jb>>>0&&(AL(),ja("Reached an unreachable!"));l[Bb>>2]=0;rb=lb}else{var vb=o[C+2];vb>>>0<jb>>>0&&(AL(),ja("Reached an unreachable!"));l[vb+12>>2]=xa;l[xa+8>>2]=vb;rb=xa}A=rb>>2}while(0);var zb=0==(db|0);b:do{if(!zb){var Eb=Ma+28|0,Cb=(l[Eb>>2]<<2)+Y+304|0,eb=(Ma|0)==(l[Cb>>2]|0);do{if(eb){l[Cb>>2]=rb;if(0!=(rb|0)){break}l[Y+4>>2]&=1<<l[Eb>>2]^-1;break b}db>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));var sb=db+16|0;(l[sb>>2]|0)==(Ma|0)?l[sb>>2]=rb:l[db+20>>2]=rb;if(0==(rb|0)){break b}}while(0);rb>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));l[A+6]=db;var ob=o[C+4];0!=(ob|0)&&(ob>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[A+4]=ob,l[ob+24>>2]=rb);var Db=o[C+5];0!=(Db|0)&&(Db>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[A+5]=Db,l[Db+24>>2]=rb)}}while(0);if(16>wa>>>0){var Jb=wa+G|0;l[C+1]=Jb|3;var Rb=Jb+(Ga+4)|0;l[Rb>>2]|=1}else{l[C+1]=G|3;l[Ga+(G|4)>>2]=wa|1;l[Ga+wa+G>>2]=wa;var Nb=o[Y+8>>2];if(0!=(Nb|0)){var Ob=o[Y+20>>2],Kb=Nb>>>2&1073741822,Pb=(Kb<<2)+Y+40|0,Mb=o[Y>>2],Yb=1<<(Nb>>>3);if(0==(Mb&Yb|0)){l[Y>>2]=Mb|Yb;var Zb=Pb,ec=(Kb+2<<2)+Y+40|0}else{var Ub=(Kb+2<<2)+Y+40|0,jc=o[Ub>>2];jc>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));Zb=jc;ec=Ub}l[ec>>2]=Ob;l[Zb+12>>2]=Ob;l[Ob+8>>2]=Zb;l[Ob+12>>2]=Pb}l[Y+8>>2]=wa;l[Y+20>>2]=Ja}var Qb=Ma+8|0;if(0==(Qb|0)){mb=G;z=mb>>2;D=155;break a}$=Qb;D=331;break a}}}while(0);AL();ja("Reached an unreachable!")}}}else{var mb=G;z=mb>>2;D=155}}}else{if(4294967231<b>>>0){mb=-1}else{var cc=b+11|0,Fb=cc&-8;y=Fb>>2;var gc=o[Y+4>>2];if(0!=(gc|0)){var vc=-Fb|0,pc=cc>>>8;if(0==(pc|0)){var qc=0}else{if(16777215<Fb>>>0){qc=31}else{var $c=(pc+1048320|0)>>>16&8,Ec=pc<<$c,sc=(Ec+520192|0)>>>16&4,kd=Ec<<sc,wd=(kd+245760|0)>>>16&2,Lc=14-(sc|$c|wd)+(kd<<wd>>>15)|0,qc=Fb>>>((Lc+7|0)>>>0)&1|Lc<<1}}var $b=o[Y+(qc<<2)+304>>2],ac=0==($b|0);b:do{if(ac){var oc=0,tc=vc,Nc=0}else{var ld=31==(qc|0)?0:25-(qc>>>1)|0,Wc=0,ad=vc,Xc=$b;x=Xc>>2;for(var Cc=Fb<<ld,fd=0;;){var md=l[x+1]&-8,nd=md-Fb|0;if(nd>>>0<ad>>>0){if((md|0)==(Fb|0)){oc=Xc;tc=nd;Nc=Xc;break b}var Oc=Xc,gd=nd}else{Oc=Wc,gd=ad}var od=o[x+5],pd=o[((Cc>>>31<<2)+16>>2)+x],Pd=0==(od|0)|(od|0)==(pd|0)?fd:od;if(0==(pd|0)){oc=Oc;tc=gd;Nc=Pd;break b}Wc=Oc;ad=gd;Xc=pd;x=Xc>>2;Cc<<=1;fd=Pd}}}while(0);if(0==(Nc|0)&0==(oc|0)){var Xd=2<<qc,qd=gc&(Xd|-Xd);if(0==(qd|0)){mb=Fb;z=mb>>2;D=155;break}var Qd=(qd&-qd)-1|0,Pc=Qd>>>12&16,Ic=Qd>>>(Pc>>>0),Jc=Ic>>>5&8,fc=Ic>>>(Jc>>>0),hd=fc>>>2&4,xd=fc>>>(hd>>>0),bd=xd>>>1&2,rd=xd>>>(bd>>>0),ye=rd>>>1&1,Yd=l[Y+((Jc|Pc|hd|bd|ye)+(rd>>>(ye>>>0))<<2)+304>>2]}else{Yd=Nc}var Tc=0==(Yd|0);b:do{if(Tc){var wc=tc,bc=oc;w=bc>>2}else{var Ed=Yd;r=Ed>>2;for(var xc=tc,Ac=oc;;){var Zd=(l[r+1]&-8)-Fb|0,$d=Zd>>>0<xc>>>0,cd=$d?Zd:xc,yc=$d?Ed:Ac,kc=o[r+4];if(0!=(kc|0)){Ed=kc}else{var Rd=o[r+5];if(0==(Rd|0)){wc=cd;bc=yc;w=bc>>2;break b}Ed=Rd}r=Ed>>2;xc=cd;Ac=yc}}}while(0);if(0!=(bc|0)&&wc>>>0<(l[Y+8>>2]-Fb|0)>>>0){var Fc=bc;u=Fc>>2;var Qc=o[Y+16>>2],Mc=Fc>>>0<Qc>>>0;do{if(!Mc){var ne=Fc+Fb|0,Sd=ne;if(Fc>>>0<ne>>>0){var Td=o[w+6],Ud=o[w+3],xf=(Ud|0)==(bc|0);do{if(xf){var Fd=bc+20|0,oe=l[Fd>>2];if(0==(oe|0)){var He=bc+16|0,ae=l[He>>2];if(0==(ae|0)){var Gc=0;p=Gc>>2;break}var dd=He,be=ae}else{dd=Fd,be=oe,D=103}for(;;){var pe=be+20|0,Uc=l[pe>>2];if(0!=(Uc|0)){dd=pe,be=Uc}else{var lc=be+16|0,Gd=o[lc>>2];if(0==(Gd|0)){break}dd=lc;be=Gd}}dd>>>0<Qc>>>0&&(AL(),ja("Reached an unreachable!"));l[dd>>2]=0;Gc=be}else{var Hd=o[w+2];Hd>>>0<Qc>>>0&&(AL(),ja("Reached an unreachable!"));l[Hd+12>>2]=Ud;l[Ud+8>>2]=Hd;Gc=Ud}p=Gc>>2}while(0);var Re=0==(Td|0);b:do{if(!Re){var Id=bc+28|0,Jd=(l[Id>>2]<<2)+Y+304|0,qe=(bc|0)==(l[Jd>>2]|0);do{if(qe){l[Jd>>2]=Gc;if(0!=(Gc|0)){break}l[Y+4>>2]&=1<<l[Id>>2]^-1;break b}Td>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));var re=Td+16|0;(l[re>>2]|0)==(bc|0)?l[re>>2]=Gc:l[Td+20>>2]=Gc;if(0==(Gc|0)){break b}}while(0);Gc>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));l[p+6]=Td;var Kd=o[w+4];0!=(Kd|0)&&(Kd>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[p+4]=Kd,l[Kd+24>>2]=Gc);var Se=o[w+5];0!=(Se|0)&&(Se>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[p+5]=Se,l[Se+24>>2]=Gc)}}while(0);var Rf=16>wc>>>0;b:do{if(Rf){var sd=wc+Fb|0;l[w+1]=sd|3;var Vc=sd+(Fc+4)|0;l[Vc>>2]|=1}else{if(l[w+1]=Fb|3,l[((Fb|4)>>2)+u]=wc|1,l[(wc>>2)+u+y]=wc,256>wc>>>0){var Te=wc>>>2&1073741822,Ue=(Te<<2)+Y+40|0,ce=o[Y>>2],Yc=1<<(wc>>>3);if(0==(ce&Yc|0)){l[Y>>2]=ce|Yc;var yd=Ue,$e=(Te+2<<2)+Y+40|0}else{var ze=(Te+2<<2)+Y+40|0,Zc=o[ze>>2];Zc>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));yd=Zc;$e=ze}l[$e>>2]=Sd;l[yd+12>>2]=Sd;l[y+(u+2)]=yd;l[y+(u+3)]=Ue}else{var Ld=ne,Md=wc>>>8;if(0==(Md|0)){var de=0}else{if(16777215<wc>>>0){de=31}else{var zd=(Md+1048320|0)>>>16&8,ee=Md<<zd,yf=(ee+520192|0)>>>16&4,af=ee<<yf,Ie=(af+245760|0)>>>16&2,zf=14-(yf|zd|Ie)+(af<<Ie>>>15)|0,de=wc>>>((zf+7|0)>>>0)&1|zf<<1}}var jf=(de<<2)+Y+304|0;l[y+(u+7)]=de;var bf=Fb+(Fc+16)|0;l[y+(u+5)]=0;l[bf>>2]=0;var Sf=l[Y+4>>2],kf=1<<de;if(0==(Sf&kf|0)){l[Y+4>>2]=Sf|kf,l[jf>>2]=Ld,l[y+(u+6)]=jf,l[y+(u+3)]=Ld,l[y+(u+2)]=Ld}else{for(var Ae=wc<<(31==(de|0)?0:25-(de>>>1)|0),Ad=l[jf>>2];;){if((l[Ad+4>>2]&-8|0)==(wc|0)){var Af=Ad+8|0,Tf=o[Af>>2],Fg=o[Y+16>>2],Gg=Ad>>>0<Fg>>>0;do{if(!Gg&&Tf>>>0>=Fg>>>0){l[Tf+12>>2]=Ld;l[Af>>2]=Ld;l[y+(u+2)]=Tf;l[y+(u+3)]=Ad;l[y+(u+6)]=0;break b}}while(0);AL();ja("Reached an unreachable!")}var ng=(Ae>>>31<<2)+Ad+16|0,og=o[ng>>2];if(0!=(og|0)){Ae<<=1,Ad=og}else{if(ng>>>0>=o[Y+16>>2]>>>0){l[ng>>2]=Ld;l[y+(u+6)]=Ad;l[y+(u+3)]=Ld;l[y+(u+2)]=Ld;break b}AL();ja("Reached an unreachable!")}}}}}}while(0);var pg=bc+8|0;if(0==(pg|0)){mb=Fb;z=mb>>2;D=155;break a}$=pg;D=331;break a}}}while(0);AL();ja("Reached an unreachable!")}}mb=Fb}z=mb>>2;D=155}}while(0);a:do{if(155==D){var Bf=o[Y+8>>2];if(mb>>>0>Bf>>>0){var Uf=o[Y+12>>2];if(mb>>>0<Uf>>>0){var Vf=Uf-mb|0;l[Y+12>>2]=Vf;var Hg=o[Y+24>>2],Ih=Hg;l[Y+24>>2]=Ih+mb|0;l[(Ih+4>>2)+z]=Vf|1;l[Hg+4>>2]=mb|3;$=Hg+8|0}else{if(0==(l[BL>>2]|0)&&0==(l[BL>>2]|0)){var Ig=CL();0==(Ig-1&Ig|0)?(l[BL+8>>2]=Ig,l[BL+4>>2]=Ig,l[BL+12>>2]=-1,l[BL+16>>2]=2097152,l[BL+20>>2]=0,l[Y+440>>2]=0,l[BL>>2]=Math.floor(Date.now()/1e3)&-16^1431655768):(AL(),ja("Reached an unreachable!"))}var Ej=0==(l[Y+440>>2]&4|0);b:do{if(Ej){var Ii=l[Y+24>>2],qg=0==(Ii|0);c:do{if(qg){D=174}else{for(var Jh=Ii,Wf=Y+444|0;;){var Kh=Wf|0,lf=o[Kh>>2];if(lf>>>0<=Jh>>>0){var rg=Wf+4|0;if((lf+l[rg>>2]|0)>>>0>Jh>>>0){break}}var ih=o[Wf+8>>2];if(0==(ih|0)){D=174;break c}Wf=ih}if(0==(Wf|0)){D=174}else{var Lh=l[BL+8>>2],Be=mb+47-l[Y+12>>2]+Lh&-Lh;if(2147483647>Be>>>0){var sg=DL(Be),se=(sg|0)==(l[Kh>>2]+l[rg>>2]|0),Jg=se?sg:-1,fe=se?Be:0,te=Be,ue=sg;D=181}else{var ge=0;D=189}}}}while(0);if(174==D){var mf=DL(0);if(-1==(mf|0)){ge=0,D=189}else{var Ji=l[BL+8>>2],Kg=Ji+(mb+47)&-Ji,tg=mf,jh=l[BL+4>>2],Mh=jh-1|0,ug=0==(Mh&tg|0)?Kg:Kg-tg+(Mh+tg&-jh)|0;if(2147483647>ug>>>0){var Nh=DL(ug),Oh=(Nh|0)==(mf|0),Lg=Oh?ug:0,Jg=Oh?mf:-1,fe=Lg,te=ug,ue=Nh;D=181}else{ge=0,D=189}}}c:do{if(181==D){var Mg=-te|0;if(-1!=(Jg|0)){var Hc=fe;n=Hc>>2;var uc=Jg;m=uc>>2;D=194;break b}var Ki=-1!=(ue|0)&2147483647>te>>>0;do{if(Ki){if(te>>>0<(mb+48|0)>>>0){var Ph=l[BL+8>>2],Ng=mb+47-te+Ph&-Ph;if(2147483647>Ng>>>0){if(-1==(DL(Ng)|0)){DL(Mg);ge=fe;break c}Og=Ng+te|0}else{Og=te}}else{var Og=te}}else{Og=te}}while(0);if(-1!=(ue|0)){Hc=Og;n=Hc>>2;uc=ue;m=uc>>2;D=194;break b}l[Y+440>>2]|=4;var Pg=fe;D=191;break b}}while(0);l[Y+440>>2]|=4;Pg=ge}else{Pg=0}D=191}while(0);if(191==D){var Li=l[BL+8>>2],Qh=Li+(mb+47)&-Li;if(2147483647>Qh>>>0){var Qg=DL(Qh),Rh=DL(0);if(-1!=(Rh|0)&-1!=(Qg|0)&Qg>>>0<Rh>>>0){var kh=Rh-Qg|0,Sh=kh>>>0>(mb+40|0)>>>0,Mi=Sh?kh:Pg,nf=Sh?Qg:-1;-1==(nf|0)?D=330:(Hc=Mi,n=Hc>>2,uc=nf,m=uc>>2,D=194)}else{D=330}}else{D=330}}do{if(194==D){var he=l[Y+432>>2]+Hc|0;l[Y+432>>2]=he;he>>>0>o[Y+436>>2]>>>0&&(l[Y+436>>2]=he);var Bd=o[Y+24>>2];k=Bd>>2;var cf=0==(Bd|0);b:do{if(cf){var vg=o[Y+16>>2];0==(vg|0)|uc>>>0<vg>>>0&&(l[Y+16>>2]=uc);l[Y+444>>2]=uc;l[Y+448>>2]=Hc;l[Y+456>>2]=0;l[Y+36>>2]=l[BL>>2];l[Y+32>>2]=-1;for(var Ce=0;;){var Cf=Ce<<1,td=(Cf<<2)+Y+40|0;l[Y+(Cf+3<<2)+40>>2]=td;l[Y+(Cf+2<<2)+40>>2]=td;var Rg=Ce+1|0;if(32==(Rg|0)){break}Ce=Rg}var Fj=uc+8|0,Th=0==(Fj&7|0)?0:-Fj&7,Ni=Hc-40-Th|0;l[Y+24>>2]=uc+Th|0;l[Y+12>>2]=Ni;l[(Th+4>>2)+m]=Ni|1;l[(Hc-36>>2)+m]=40;l[Y+28>>2]=l[BL+16>>2]}else{var wg=Y+444|0;for(j=wg>>2;0!=(wg|0);){var Uh=o[j],Vh=wg+4|0,Wh=o[Vh>>2];if((uc|0)==(Uh+Wh|0)){if(0!=(l[j+3]&8|0)){break}var Xh=Bd;if(!(Xh>>>0>=Uh>>>0&Xh>>>0<uc>>>0)){break}l[Vh>>2]=Wh+Hc|0;var Gj=l[Y+24>>2],Je=l[Y+12>>2]+Hc|0,Xf=Gj,Yf=Gj+8|0,Yh=0==(Yf&7|0)?0:-Yf&7,Sg=Je-Yh|0;l[Y+24>>2]=Xf+Yh|0;l[Y+12>>2]=Sg;l[(Yh+(Xf+4)|0)>>2]=Sg|1;l[(Je+(Xf+4)|0)>>2]=40;l[Y+28>>2]=l[BL+16>>2];break b}wg=l[j+2];j=wg>>2}uc>>>0<o[Y+16>>2]>>>0&&(l[Y+16>>2]=uc);for(var lh=uc+Hc|0,Df=Y+444|0;;){if(0==(Df|0)){D=293;break}var Zh=Df|0;if((l[Zh>>2]|0)==(lh|0)){D=218;break}Df=l[Df+8>>2]}do{if(218==D&&0==(l[Df+12>>2]&8|0)){l[Zh>>2]=uc;var Tg=Df+4|0;l[Tg>>2]=l[Tg>>2]+Hc|0;var $h=uc+8|0,xg=0==($h&7|0)?0:-$h&7,Oi=Hc+(uc+8)|0,df=0==(Oi&7|0)?0:-Oi&7;h=df>>2;var mh=uc+df+Hc|0,nh=mh,oh=xg+mb|0;g=oh>>2;var Zf=uc+oh|0,Ve=Zf,of=mh-(uc+xg)-mb|0;l[(xg+4>>2)+m]=mb|3;var Ug=(nh|0)==(l[Y+24>>2]|0);c:do{if(Ug){var ai=l[Y+12>>2]+of|0;l[Y+12>>2]=ai;l[Y+24>>2]=Ve;l[g+(m+1)]=ai|1}else{if((nh|0)==(l[Y+20>>2]|0)){var Vg=l[Y+8>>2]+of|0;l[Y+8>>2]=Vg;l[Y+20>>2]=Ve;l[g+(m+1)]=Vg|1;l[(uc+Vg+oh|0)>>2]=Vg}else{var Wg=Hc+4|0,We=o[(Wg>>2)+m+h];if(1==(We&3|0)){var Pi=We&-8,ef=We>>>3,Hj=256>We>>>0;d:do{if(Hj){var $f=o[((df|8)>>2)+m+n],Ef=o[h+(n+(m+3))];if(($f|0)==(Ef|0)){l[Y>>2]&=1<<ef^-1}else{var ph=((We>>>2&1073741822)<<2)+Y+40|0;D=($f|0)==(ph|0)?233:$f>>>0<o[Y+16>>2]>>>0?236:233;do{if(233==D&&!((Ef|0)!=(ph|0)&&Ef>>>0<o[Y+16>>2]>>>0)){l[$f+12>>2]=Ef;l[Ef+8>>2]=$f;break d}}while(0);AL();ja("Reached an unreachable!")}}else{var bi=mh,ff=o[((df|24)>>2)+m+n],pf=o[h+(n+(m+3))],qf=(pf|0)==(bi|0);do{if(qf){var yg=df|16,zg=uc+Wg+yg|0,Ff=l[zg>>2];if(0==(Ff|0)){var Xg=uc+yg+Hc|0,Yg=l[Xg>>2];if(0==(Yg|0)){var ie=0;f=ie>>2;break}var Gf=Xg,Hf=Yg}else{Gf=zg,Hf=Ff,D=243}for(;;){var qh=Hf+20|0,Qi=l[qh>>2];if(0!=(Qi|0)){Gf=qh,Hf=Qi}else{var Ri=Hf+16|0,Ij=o[Ri>>2];if(0==(Ij|0)){break}Gf=Ri;Hf=Ij}}Gf>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));l[Gf>>2]=0;ie=Hf}else{var ci=o[((df|8)>>2)+m+n];ci>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));l[ci+12>>2]=pf;l[pf+8>>2]=ci;ie=pf}f=ie>>2}while(0);if(0!=(ff|0)){var di=df+(Hc+(uc+28))|0,Pk=(l[di>>2]<<2)+Y+304|0,wn=(bi|0)==(l[Pk>>2]|0);do{if(wn){l[Pk>>2]=ie;if(0!=(ie|0)){break}l[Y+4>>2]&=1<<l[di>>2]^-1;break d}ff>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));var Jj=ff+16|0;(l[Jj>>2]|0)==(bi|0)?l[Jj>>2]=ie:l[ff+20>>2]=ie;if(0==(ie|0)){break d}}while(0);ie>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));l[f+6]=ff;var Kj=df|16,Si=o[(Kj>>2)+m+n];0!=(Si|0)&&(Si>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[f+4]=Si,l[Si+24>>2]=ie);var Ti=o[(Wg+Kj>>2)+m];0!=(Ti|0)&&(Ti>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[f+5]=Ti,l[Ti+24>>2]=ie)}}}while(0);var Qk=uc+(Pi|df)+Hc|0,Ke=Pi+of|0}else{Qk=nh,Ke=of}var Lj=Qk+4|0;l[Lj>>2]&=-2;l[g+(m+1)]=Ke|1;l[(Ke>>2)+m+g]=Ke;if(256>Ke>>>0){var ei=Ke>>>2&1073741822,Rk=(ei<<2)+Y+40|0,Ui=o[Y>>2],Sk=1<<(Ke>>>3);if(0==(Ui&Sk|0)){l[Y>>2]=Ui|Sk;var Vi=Rk,Mj=(ei+2<<2)+Y+40|0}else{var Nj=(ei+2<<2)+Y+40|0,Oj=o[Nj>>2];Oj>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));Vi=Oj;Mj=Nj}l[Mj>>2]=Ve;l[Vi+12>>2]=Ve;l[g+(m+2)]=Vi;l[g+(m+3)]=Rk}else{var ag=Zf,fi=Ke>>>8;if(0==(fi|0)){var If=0}else{if(16777215<Ke>>>0){If=31}else{var Wi=(fi+1048320|0)>>>16&8,Tk=fi<<Wi,Pj=(Tk+520192|0)>>>16&4,Uk=Tk<<Pj,Vk=(Uk+245760|0)>>>16&2,Xi=14-(Pj|Wi|Vk)+(Uk<<Vk>>>15)|0,If=Ke>>>((Xi+7|0)>>>0)&1|Xi<<1}}var gi=(If<<2)+Y+304|0;l[g+(m+7)]=If;l[g+(m+5)]=0;l[g+(m+4)]=0;var Qj=l[Y+4>>2],Rj=1<<If;if(0==(Qj&Rj|0)){l[Y+4>>2]=Qj|Rj,l[gi>>2]=ag,l[g+(m+6)]=gi,l[g+(m+3)]=ag,l[g+(m+2)]=ag}else{for(var Sj=Ke<<(31==(If|0)?0:25-(If>>>1)|0),Zg=l[gi>>2];;){if((l[Zg+4>>2]&-8|0)==(Ke|0)){var Wk=Zg+8|0,Yi=o[Wk>>2],Xk=o[Y+16>>2],Yk=Zg>>>0<Xk>>>0;do{if(!Yk&&Yi>>>0>=Xk>>>0){l[Yi+12>>2]=ag;l[Wk>>2]=ag;l[g+(m+2)]=Yi;l[g+(m+3)]=Zg;l[g+(m+6)]=0;break c}}while(0);AL();ja("Reached an unreachable!")}var Zi=(Sj>>>31<<2)+Zg+16|0,Tj=o[Zi>>2];if(0!=(Tj|0)){Sj<<=1,Zg=Tj}else{if(Zi>>>0>=o[Y+16>>2]>>>0){l[Zi>>2]=ag;l[g+(m+6)]=Zg;l[g+(m+3)]=ag;l[g+(m+2)]=ag;break c}AL();ja("Reached an unreachable!")}}}}}}}while(0);$=uc+(xg|8)|0;break a}}while(0);var hi=Bd,Zk=Y+444|0;for(e=Zk>>2;;){var $i=o[e];if($i>>>0<=hi>>>0){var $k=o[e+1];if(($i+$k|0)>>>0>hi>>>0){var aj=$i,ii=$k;break}}var al=o[e+2];if(0!=(al|0)){Zk=al,e=Zk>>2}else{aj=0;ii=4;break}}var bj=aj+ii|0,Uj=aj+(ii-39)|0,Vj=aj+(ii-47)+(0==(Uj&7|0)?0:-Uj&7)|0,ji=Vj>>>0<(Bd+16|0)>>>0?hi:Vj,om=ji+8|0;d=om>>2;var pm=om,bl=uc+8|0,bg=0==(bl&7|0)?0:-bl&7,ki=Hc-40-bg|0;l[Y+24>>2]=uc+bg|0;l[Y+12>>2]=ki;l[(bg+4>>2)+m]=ki|1;l[(Hc-36>>2)+m]=40;l[Y+28>>2]=l[BL+16>>2];l[ji+4>>2]=27;l[d]=l[Y+444>>2];l[d+1]=l[Y+448>>2];l[d+2]=l[Y+452>>2];l[d+3]=l[Y+456>>2];l[Y+444>>2]=uc;l[Y+448>>2]=Hc;l[Y+456>>2]=0;l[Y+452>>2]=pm;var cl=ji+28|0;l[cl>>2]=7;var qm=(ji+32|0)>>>0<bj>>>0;c:do{if(qm){for(var cj=cl;;){var Wj=cj+4|0;l[Wj>>2]=7;if((cj+8|0)>>>0>=bj>>>0){break c}cj=Wj}}}while(0);if((ji|0)!=(hi|0)){var Le=ji-Bd|0,dl=hi+Le|0,Xj=Le+(hi+4)|0;l[Xj>>2]&=-2;l[k+1]=Le|1;l[dl>>2]=Le;if(256>Le>>>0){var el=Le>>>2&1073741822,Yj=(el<<2)+Y+40|0,Jf=o[Y>>2],fl=1<<(Le>>>3);if(0==(Jf&fl|0)){l[Y>>2]=Jf|fl;var dj=Yj,Zj=(el+2<<2)+Y+40|0}else{var gl=(el+2<<2)+Y+40|0,rm=o[gl>>2];rm>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));dj=rm;Zj=gl}l[Zj>>2]=Bd;l[dj+12>>2]=Bd;l[k+2]=dj;l[k+3]=Yj}else{var ej=Bd,hl=Le>>>8;if(0==(hl|0)){var $g=0}else{if(16777215<Le>>>0){$g=31}else{var il=(hl+1048320|0)>>>16&8,jl=hl<<il,$j=(jl+520192|0)>>>16&4,ak=jl<<$j,kl=(ak+245760|0)>>>16&2,ll=14-($j|il|kl)+(ak<<kl>>>15)|0,$g=Le>>>((ll+7|0)>>>0)&1|ll<<1}}var ml=($g<<2)+Y+304|0;l[k+7]=$g;l[k+5]=0;l[k+4]=0;var rh=l[Y+4>>2],nl=1<<$g;if(0==(rh&nl|0)){l[Y+4>>2]=rh|nl,l[ml>>2]=ej,l[k+6]=ml,l[k+3]=Bd,l[k+2]=Bd}else{for(var li=Le<<(31==($g|0)?0:25-($g>>>1)|0),sh=l[ml>>2];;){if((l[sh+4>>2]&-8|0)==(Le|0)){var ah=sh+8|0,bk=o[ah>>2],ol=o[Y+16>>2],sm=sh>>>0<ol>>>0;do{if(!sm&&bk>>>0>=ol>>>0){l[bk+12>>2]=ej;l[ah>>2]=ej;l[k+2]=bk;l[k+3]=sh;l[k+6]=0;break b}}while(0);AL();ja("Reached an unreachable!")}var ck=(li>>>31<<2)+sh+16|0,fj=o[ck>>2];if(0!=(fj|0)){li<<=1,sh=fj}else{if(ck>>>0>=o[Y+16>>2]>>>0){l[ck>>2]=ej;l[k+6]=sh;l[k+3]=Bd;l[k+2]=Bd;break b}AL();ja("Reached an unreachable!")}}}}}}}while(0);var th=o[Y+12>>2];if(th>>>0>mb>>>0){var cg=th-mb|0;l[Y+12>>2]=cg;var dk=o[Y+24>>2],mi=dk;l[Y+24>>2]=mi+mb|0;l[(mi+4>>2)+z]=cg|1;l[dk+4>>2]=mb|3;$=dk+8|0;break a}}}while(0);l[EL>>2]=12;$=0}}else{var gj=Bf-mb|0,bh=o[Y+20>>2];if(15<gj>>>0){var ek=bh;l[Y+20>>2]=ek+mb|0;l[Y+8>>2]=gj;l[(ek+4>>2)+z]=gj|1;l[ek+Bf>>2]=gj;l[bh+4>>2]=mb|3}else{l[Y+8>>2]=0;l[Y+20>>2]=0;l[bh+4>>2]=Bf|3;var hj=Bf+(bh+4)|0;l[hj>>2]|=1}$=bh+8|0}}}while(0);return $}Module._malloc=Ne;function Dh(b){var d,e,f,g,h,j,k=b>>2,m,n=0==(b|0);a:do{if(!n){var p=b-8|0,u=p,r=o[Y+16>>2],w=p>>>0<r>>>0;b:do{if(!w){var x=o[b-4>>2],y=x&3;if(1!=(y|0)){var A=x&-8;j=A>>2;var C=b+(A-8)|0,z=C,D=0==(x&1|0);c:do{if(D){var E=o[p>>2];if(0==(y|0)){break a}var G=-8-E|0;h=G>>2;var H=b+G|0,F=H,I=E+A|0;if(H>>>0<r>>>0){break b}if((F|0)==(l[Y+20>>2]|0)){g=(b+(A-4)|0)>>2;if(3!=(l[g]&3|0)){var J=F;f=J>>2;var L=I;break}l[Y+8>>2]=I;l[g]&=-2;l[h+(k+1)]=I|1;l[C>>2]=I;break a}if(256>E>>>0){var O=o[h+(k+2)],R=o[h+(k+3)];if((O|0)==(R|0)){l[Y>>2]&=1<<(E>>>3)^-1,J=F,f=J>>2,L=I}else{var T=((E>>>2&1073741822)<<2)+Y+40|0,S=(O|0)!=(T|0)&O>>>0<r>>>0;do{if(!S&&(R|0)==(T|0)|R>>>0>=r>>>0){l[O+12>>2]=R;l[R+8>>2]=O;J=F;f=J>>2;L=I;break c}}while(0);AL();ja("Reached an unreachable!")}}else{var U=H,W=o[h+(k+6)],Q=o[h+(k+3)],$=(Q|0)==(U|0);do{if($){var ea=G+(b+20)|0,sa=l[ea>>2];if(0==(sa|0)){var Ba=G+(b+16)|0,oa=l[Ba>>2];if(0==(oa|0)){var ga=0;e=ga>>2;break}var qa=Ba,la=oa}else{qa=ea,la=sa,m=22}for(;;){var Ca=la+20|0,ia=l[Ca>>2];if(0!=(ia|0)){qa=Ca,la=ia}else{var ya=la+16|0,ta=o[ya>>2];if(0==(ta|0)){break}qa=ya;la=ta}}qa>>>0<r>>>0&&(AL(),ja("Reached an unreachable!"));l[qa>>2]=0;ga=la}else{var Ia=o[h+(k+2)];Ia>>>0<r>>>0&&(AL(),ja("Reached an unreachable!"));l[Ia+12>>2]=Q;l[Q+8>>2]=Ia;ga=Q}e=ga>>2}while(0);if(0!=(W|0)){var na=G+(b+28)|0,Z=(l[na>>2]<<2)+Y+304|0,ba=(U|0)==(l[Z>>2]|0);do{if(ba){l[Z>>2]=ga;if(0!=(ga|0)){break}l[Y+4>>2]&=1<<l[na>>2]^-1;J=F;f=J>>2;L=I;break c}W>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));var ca=W+16|0;(l[ca>>2]|0)==(U|0)?l[ca>>2]=ga:l[W+20>>2]=ga;if(0==(ga|0)){J=F;f=J>>2;L=I;break c}}while(0);ga>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));l[e+6]=W;var ma=o[h+(k+4)];0!=(ma|0)&&(ma>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[e+4]=ma,l[ma+24>>2]=ga);var ka=o[h+(k+5)];0!=(ka|0)&&(ka>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[e+5]=ka,l[ka+24>>2]=ga)}J=F;f=J>>2;L=I}}else{J=u,f=J>>2,L=A}}while(0);var aa=J;if(aa>>>0<C>>>0){var ra=b+(A-4)|0,ha=o[ra>>2];if(0!=(ha&1|0)){var za=0==(ha&2|0);do{if(za){if((z|0)==(l[Y+24>>2]|0)){var X=l[Y+12>>2]+L|0;l[Y+12>>2]=X;l[Y+24>>2]=J;l[f+1]=X|1;(J|0)==(l[Y+20>>2]|0)&&(l[Y+20>>2]=0,l[Y+8>>2]=0);if(X>>>0<=o[Y+28>>2]>>>0){break a}var ua=Ha,da=Ha;if(0==(l[BL>>2]|0)&&0==(l[BL>>2]|0)){var fa=CL();0==(fa-1&fa|0)?(l[BL+8>>2]=fa,l[BL+4>>2]=fa,l[BL+12>>2]=-1,l[BL+16>>2]=2097152,l[BL+20>>2]=0,l[Y+440>>2]=0,l[BL>>2]=Math.floor(Date.now()/1e3)&-16^1431655768):(AL(),ja("Reached an unreachable!"))}c:do{var Aa=o[Y+24>>2];if(0!=(Aa|0)){var Pa=o[Y+12>>2],pa=40<Pa>>>0;do{if(pa){for(var cb=o[BL+8>>2],Qa=(Math.floor(((-41+Pa+cb|0)>>>0)/(cb>>>0))-1)*cb|0,Ta=Aa,$a=Y+444|0,da=$a>>2;;){var va=o[da];if(va>>>0<=Ta>>>0&&(va+l[da+1]|0)>>>0>Ta>>>0){var Wa=$a;break}var fb=o[da+2];if(0==(fb|0)){Wa=0;break}$a=fb;da=$a>>2}if(0==(l[Wa+12>>2]&8|0)){var gb=DL(0),ua=(Wa+4|0)>>2;if((gb|0)==(l[Wa>>2]+l[ua]|0)){var Xa=DL(-(2147483646<Qa>>>0?-2147483648-cb|0:Qa)|0),Ua=DL(0);if(-1!=(Xa|0)&Ua>>>0<gb>>>0){var Va=gb-Ua|0;if((gb|0)!=(Ua|0)){l[ua]=l[ua]-Va|0;l[Y+432>>2]=l[Y+432>>2]-Va|0;var pb=l[Y+24>>2],nb=l[Y+12>>2]-Va|0,La=pb,qb=pb+8|0,bb=0==(qb&7|0)?0:-qb&7,Fa=nb-bb|0;l[Y+24>>2]=La+bb|0;l[Y+12>>2]=Fa;l[(bb+(La+4)|0)>>2]=Fa|1;l[(nb+(La+4)|0)>>2]=40;l[Y+28>>2]=l[BL+16>>2];break c}}}}}}while(0);o[Y+12>>2]>>>0>o[Y+28>>2]>>>0&&(l[Y+28>>2]=-1)}}while(0);break a}if((z|0)==(l[Y+20>>2]|0)){var Ma=l[Y+8>>2]+L|0;l[Y+8>>2]=Ma;l[Y+20>>2]=J;l[f+1]=Ma|1;l[(aa+Ma|0)>>2]=Ma;break a}var wa=(ha&-8)+L|0,hb=ha>>>3,Ya=256>ha>>>0;c:do{if(Ya){var Za=o[k+j],Da=o[((A|4)>>2)+k];if((Za|0)==(Da|0)){l[Y>>2]&=1<<hb^-1}else{var Na=((ha>>>2&1073741822)<<2)+Y+40|0;m=(Za|0)==(Na|0)?64:Za>>>0<o[Y+16>>2]>>>0?67:64;do{if(64==m&&!((Da|0)!=(Na|0)&&Da>>>0<o[Y+16>>2]>>>0)){l[Za+12>>2]=Da;l[Da+8>>2]=Za;break c}}while(0);AL();ja("Reached an unreachable!")}}else{var ib=C,ab=o[j+(k+4)],Ga=o[((A|4)>>2)+k],jb=(Ga|0)==(ib|0);do{if(jb){var Ea=A+(b+12)|0,Oa=l[Ea>>2];if(0==(Oa|0)){var Ja=A+(b+8)|0,db=l[Ja>>2];if(0==(db|0)){var xa=0;d=xa>>2;break}var Ra=Ja,Ka=db}else{Ra=Ea,Ka=Oa,m=74}for(;;){var tb=Ka+20|0,kb=l[tb>>2];if(0!=(kb|0)){Ra=tb,Ka=kb}else{var ub=Ka+16|0,rb=o[ub>>2];if(0==(rb|0)){break}Ra=ub;Ka=rb}}Ra>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));l[Ra>>2]=0;xa=Ka}else{var Bb=o[k+j];Bb>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));l[Bb+12>>2]=Ga;l[Ga+8>>2]=Bb;xa=Ga}d=xa>>2}while(0);if(0!=(ab|0)){var lb=A+(b+20)|0,yb=(l[lb>>2]<<2)+Y+304|0,xb=(ib|0)==(l[yb>>2]|0);do{if(xb){l[yb>>2]=xa;if(0!=(xa|0)){break}l[Y+4>>2]&=1<<l[lb>>2]^-1;break c}ab>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));var Ib=ab+16|0;(l[Ib>>2]|0)==(ib|0)?l[Ib>>2]=xa:l[ab+20>>2]=xa;if(0==(xa|0)){break c}}while(0);xa>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));l[d+6]=ab;var wb=o[j+(k+2)];0!=(wb|0)&&(wb>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[d+4]=wb,l[wb+24>>2]=xa);var vb=o[j+(k+3)];0!=(vb|0)&&(vb>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!")),l[d+5]=vb,l[vb+24>>2]=xa)}}}while(0);l[f+1]=wa|1;l[aa+wa>>2]=wa;if((J|0)!=(l[Y+20>>2]|0)){var zb=wa}else{l[Y+8>>2]=wa;break a}}else{l[ra>>2]=ha&-2,l[f+1]=L|1,zb=l[aa+L>>2]=L}}while(0);if(256>zb>>>0){var Eb=zb>>>2&1073741822,Cb=(Eb<<2)+Y+40|0,eb=o[Y>>2],sb=1<<(zb>>>3);if(0==(eb&sb|0)){l[Y>>2]=eb|sb;var ob=Cb,Db=(Eb+2<<2)+Y+40|0}else{var Jb=(Eb+2<<2)+Y+40|0,Rb=o[Jb>>2];Rb>>>0<o[Y+16>>2]>>>0&&(AL(),ja("Reached an unreachable!"));ob=Rb;Db=Jb}l[Db>>2]=J;l[ob+12>>2]=J;l[f+2]=ob;l[f+3]=Cb;break a}var Nb=J,Ob=zb>>>8;if(0==(Ob|0)){var Kb=0}else{if(16777215<zb>>>0){Kb=31}else{var Pb=(Ob+1048320|0)>>>16&8,Mb=Ob<<Pb,Yb=(Mb+520192|0)>>>16&4,Zb=Mb<<Yb,ec=(Zb+245760|0)>>>16&2,Ub=14-(Yb|Pb|ec)+(Zb<<ec>>>15)|0,Kb=zb>>>((Ub+7|0)>>>0)&1|Ub<<1}}var jc=(Kb<<2)+Y+304|0;l[f+7]=Kb;l[f+5]=0;l[f+4]=0;var Qb=l[Y+4>>2],mb=1<<Kb,cc=0==(Qb&mb|0);c:do{if(cc){l[Y+4>>2]=Qb|mb,l[jc>>2]=Nb,l[f+6]=jc,l[f+3]=J,l[f+2]=J}else{for(var Fb=zb<<(31==(Kb|0)?0:25-(Kb>>>1)|0),gc=l[jc>>2];;){if((l[gc+4>>2]&-8|0)==(zb|0)){var vc=gc+8|0,pc=o[vc>>2],qc=o[Y+16>>2],$c=gc>>>0<qc>>>0;do{if(!$c&&pc>>>0>=qc>>>0){l[pc+12>>2]=Nb;l[vc>>2]=Nb;l[f+2]=pc;l[f+3]=gc;l[f+6]=0;break c}}while(0);AL();ja("Reached an unreachable!")}var Ec=(Fb>>>31<<2)+gc+16|0,sc=o[Ec>>2];if(0!=(sc|0)){Fb<<=1,gc=sc}else{if(Ec>>>0>=o[Y+16>>2]>>>0){l[Ec>>2]=Nb;l[f+6]=gc;l[f+3]=J;l[f+2]=J;break c}AL();ja("Reached an unreachable!")}}}}while(0);var kd=l[Y+32>>2]-1|0;l[Y+32>>2]=kd;if(0!=(kd|0)){break a}for(var wd=Y+452|0;;){var Lc=l[wd>>2];if(0==(Lc|0)){break}wd=Lc+8|0}l[Y+32>>2]=-1;break a}}}}}while(0);AL();ja("Reached an unreachable!")}}while(0)}Module._free=Dh;function Ls(b){0!=(b|0)&&Dh(b)}function Wq(b){for(b=0==(b|0)?1:b;;){var d=Ne(b);if(0==(d|0)){d=(Nd=l[FL>>2],l[FL>>2]=Nd,Nd);if(0==(d|0)){var e;e=Ne(4);l[e>>2]=GL+8|0;var f=HL;if(!IL){try{l[JL>>2]=0}catch(g){}try{l[KL>>2]=1}catch(h){}try{l[LL>>2]=2}catch(j){}IL=Sa}Module.gc("Compiled code throwing an exception, "+[e,f,32]+", at "+Error().stack);l[ML>>2]=e;l[ML+4>>2]=f;l[ML+8>>2]=32;"uncaught_exception"in NL?NL.jc++:NL.jc=1;ja(e);ja("Reached an unreachable!")}K[d]()}else{return d}}return Ab}var un=Ab;function Ch(b,d,e){if(20<=e&&d%2==b%2){if(d%4==b%4){for(e=d+e;d%4;){c[b++]=c[d++]}for(var d=d>>2,b=b>>2,f=e>>2;d<f;){l[b++]=l[d++]}d<<=2;for(b<<=2;d<e;){c[b++]=c[d++]}}else{e=d+e;d%2&&(c[b++]=c[d++]);d>>=1;b>>=1;for(f=e>>1;d<f;){i[b++]=i[d++]}d<<=1;b<<=1;d<e&&(c[b++]=c[d++])}}else{for(;e--;){c[b++]=c[d++]}}}var Fh=Math.sqrt;function P(b,d,e,f){ja("Assertion failed: "+we(f)+", at: "+[we(b),d,we(e)])}function Oe(b,d){var e=0;if(20<=d){for(var f=b+d;b%4;){c[b++]=e}0>e&&(e+=256);for(var g=b>>2,h=f>>2,j=e|e<<8|e<<16|e<<24;g<h;){l[g++]=j}for(b=g<<2;b<f;){c[b++]=e}}else{for(;d--;){c[b++]=e}}}var mm=Math.sin,nm=Math.cos,Vp=Math.floor,OL=13,PL=9,QL=22,RL=5,SL=21,TL=6;function UL(b){EL||(EL=B([0],"i32",v));l[EL>>2]=b}var EL,VL=0,tn=0,WL=0,XL=2,ro=[Ab],YL=Sa;function ZL(b,d){if("string"!==typeof b){return Ab}d===Ha&&(d="/");b&&"/"==b[0]&&(d="");for(var e=(d+"/"+b).split("/").reverse(),f=[""];e.length;){var g=e.pop();""==g||"."==g||(".."==g?1<f.length&&f.pop():f.push(g))}return 1==f.length?"/":f.join("/")}function $L(b,d,e){var f={Mh:Gb,eb:Gb,error:0,name:Ab,path:Ab,object:Ab,dc:Gb,fc:Ab,ec:Ab},b=ZL(b);if("/"==b){f.Mh=Sa,f.eb=f.dc=Sa,f.name="/",f.path=f.fc="/",f.object=f.ec=aM}else{if(b!==Ab){for(var e=e||0,b=b.slice(1).split("/"),g=aM,h=[""];b.length;){1==b.length&&g.W&&(f.dc=Sa,f.fc=1==h.length?"/":h.join("/"),f.ec=g,f.name=b[0]);var j=b.shift();if(g.W){if(g.ic){if(!g.u.hasOwnProperty(j)){f.error=2;break}}else{f.error=OL;break}}else{f.error=20;break}g=g.u[j];if(g.link&&!(d&&0==b.length)){if(40<e){f.error=40;break}f=ZL(g.link,h.join("/"));f=$L([f].concat(b).join("/"),d,e+1);break}h.push(j);0==b.length&&(f.eb=Sa,f.path=h.join("/"),f.object=g)}}}return f}function bM(b){cM();b=$L(b,Ha);if(b.eb){return b.object}UL(b.error);return Ab}function dM(b,d,e,f,g){b||(b="/");"string"===typeof b&&(b=bM(b));b||(UL(OL),ja(Error("Parent path must exist.")));b.W||(UL(20),ja(Error("Parent must be a folder.")));!b.write&&!YL&&(UL(OL),ja(Error("Parent folder must be writeable.")));if(!d||"."==d||".."==d){UL(2),ja(Error("Name must not be empty."))}b.u.hasOwnProperty(d)&&(UL(17),ja(Error("Can't overwrite object.")));b.u[d]={ic:f===Ha?Sa:f,write:g===Ha?Gb:g,timestamp:Date.now(),Lh:XL++};for(var h in e){e.hasOwnProperty(h)&&(b.u[d][h]=e[h])}return b.u[d]}function eM(b,d,e,f){return dM(b,d,{W:Sa,P:Gb,u:{}},e,f)}function fM(b,d,e,f){b=bM(b);b===Ab&&ja(Error("Invalid parent."));for(d=d.split("/").reverse();d.length;){var g=d.pop();g&&(b.u.hasOwnProperty(g)||eM(b,g,e,f),b=b.u[g])}return b}function gM(b,d,e,f,g){e.W=Gb;return dM(b,d,e,f,g)}function hM(b,d,e,f,g){if("string"===typeof e){for(var h=Array(e.length),j=0,k=e.length;j<k;++j){h[j]=e.charCodeAt(j)}e=h}e={P:Gb,u:e.subarray?e.subarray(0):e};return gM(b,d,e,f,g)}function iM(b,d,e,f){!e&&!f&&ja(Error("A device must have at least one callback defined."));return gM(b,d,{P:Sa,input:e,X:f},Boolean(e),Boolean(f))}function cM(){aM||(aM={ic:Sa,write:Sa,W:Sa,P:Gb,timestamp:Date.now(),Lh:1,u:{}})}var jM,aM;function vn(b,d,e){var f=ro[b];if(f){if(f.Da){if(0>e){return UL(QL),-1}if(f.object.P){if(f.object.X){for(var g=0;g<e;g++){try{f.object.X(c[d+g])}catch(h){return UL(RL),-1}}f.object.timestamp=Date.now();return g}UL(TL);return-1}g=f.position;b=ro[b];if(!b||b.object.P){UL(PL),d=-1}else{if(b.Da){if(b.object.W){UL(SL),d=-1}else{if(0>e||0>g){UL(QL),d=-1}else{for(var j=b.object.u;j.length<g;){j.push(0)}for(var k=0;k<e;k++){j[g+k]=ed[d+k]}b.object.timestamp=Date.now();d=k}}}else{UL(OL),d=-1}}-1!=d&&(f.position+=d);return d}UL(OL);return-1}UL(PL);return-1}var hK=Math.atan2;function ou(b){c[b]||(c[b]=1)}function AL(){ja("abort() at "+Error().stack)}function CL(){switch(8){case 8:return Pe;case 54:case 56:case 21:case 61:case 63:case 22:case 67:case 23:case 24:case 25:case 26:case 27:case 69:case 28:case 101:case 70:case 71:case 29:case 30:case 199:case 75:case 76:case 32:case 43:case 44:case 80:case 46:case 47:case 45:case 48:case 49:case 42:case 82:case 33:case 7:case 108:case 109:case 107:case 112:case 119:case 121:return 200809;case 13:case 104:case 94:case 95:case 34:case 35:case 77:case 81:case 83:case 84:case 85:case 86:case 87:case 88:case 89:case 90:case 91:case 94:case 95:case 110:case 111:case 113:case 114:case 115:case 116:case 117:case 118:case 120:case 40:case 16:case 79:case 19:return-1;case 92:case 93:case 5:case 72:case 6:case 74:case 92:case 93:case 96:case 97:case 98:case 99:case 102:case 103:case 105:return 1;case 38:case 66:case 50:case 51:case 4:return 1024;case 15:case 64:case 41:return 32;case 55:case 37:case 17:return 2147483647;case 18:case 1:return 47839;case 59:case 57:return 99;case 68:case 58:return 2048;case 0:return 2097152;case 3:return 65536;case 14:return 32768;case 73:return 32767;case 39:return 16384;case 60:return 1e3;case 106:return 700;case 52:return 256;case 62:return 255;case 2:return 100;case 65:return 64;case 36:return 20;case 100:return 16;case 20:return 6;case 53:return 4}UL(QL);return-1}function DL(b){kM||(Rc=Rc+4095>>12<<12,kM=Sa);var d=Rc;0!=b&&Kc(b);return d}var kM;function NL(){return!!NL.jc}var IL,lM=Gb,mM,nM,oM,pM;vf.unshift({fb:(function(){if(!Module.noFSInit&&!jM){var b,d,e,f=(function(b){b===Ab||10===b?(d.Ea(d.buffer.join("")),d.buffer=[]):d.buffer.push(k.hc(b))});rc(!jM,"FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");jM=Sa;cM();b=b||Module.stdin;d=d||Module.stdout;e=e||Module.stderr;var g=Sa,h=Sa,j=Sa;b||(g=Gb,b=(function(){if(!b.cb||!b.cb.length){var d;"undefined"!=typeof window&&"function"==typeof window.prompt?(d=window.prompt("Input: "),d===Ab&&(d=String.fromCharCode(0))):"function"==typeof readline&&(d=readline());d||(d="");b.cb=hf(d+"\n",Sa)}return b.cb.shift()}));var k=new Bc;d||(h=Gb,d=f);d.Ea||(d.Ea=Module.print);d.buffer||(d.buffer=[]);e||(j=Gb,e=f);e.Ea||(e.Ea=Module.print);e.buffer||(e.buffer=[]);try{eM("/","tmp",Sa,Sa)}catch(m){}var f=eM("/","dev",Sa,Sa),n=iM(f,"stdin",b),p=iM(f,"stdout",Ab,d);e=iM(f,"stderr",Ab,e);iM(f,"tty",b,d);ro[1]={path:"/dev/stdin",object:n,position:0,bc:Sa,Da:Gb,ac:Gb,cc:!g,error:Gb,$b:Gb,kc:[]};ro[2]={path:"/dev/stdout",object:p,position:0,bc:Gb,Da:Sa,ac:Gb,cc:!h,error:Gb,$b:Gb,kc:[]};ro[3]={path:"/dev/stderr",object:e,position:0,bc:Gb,Da:Sa,ac:Gb,cc:!j,error:Gb,$b:Gb,kc:[]};VL=B([1],"void*",Ge);tn=B([2],"void*",Ge);WL=B([3],"void*",Ge);fM("/","dev/shm/tmp",Sa,Sa);for(g=ro.length;g<Math.max(VL,tn,WL)+4;g++){ro[g]=Ab}ro[VL]=ro[1];ro[tn]=ro[2];ro[WL]=ro[3];B([B([0,0,0,0,VL,0,0,0,tn,0,0,0,WL,0,0,0],"void*",v)],"void*",v)}})});wf.push({fb:(function(){YL=Gb})});Mf.push({fb:(function(){jM&&(ro[2]&&0<ro[2].object.X.buffer.length&&ro[2].object.X(10),ro[3]&&0<ro[3].object.X.buffer.length&&ro[3].object.X(10))})});Module.FS_createFolder=eM;Module.FS_createPath=fM;Module.FS_createDataFile=hM;Module.FS_createPreloadedFile=(function(b,d,e,f,g,h,j){function k(b){return{jpg:"image/jpeg",png:"image/png",bmp:"image/bmp",ogg:"audio/ogg",wav:"audio/wav",mp3:"audio/mpeg"}[b.substr(-3)]}function m(e){function k(e){hM(b,d,e,f,g);h&&h();Dg("cp "+p)}var m=Gb;Module.preloadPlugins.forEach((function(b){!m&&b.canHandle(p)&&(b.handle(e,p,k,(function(){j&&j();Dg("cp "+p)})),m=Sa)}));m||k(e)}if(!mM){mM=Sa;try{new Blob,nM=Sa}catch(n){nM=Gb,console.log("warning: no blob constructor, cannot create blobs with mimetypes")}oM="undefined"!=typeof MozBlobBuilder?MozBlobBuilder:"undefined"!=typeof WebKitBlobBuilder?WebKitBlobBuilder:!nM?console.log("warning: no BlobBuilder"):Ab;pM="undefined"!=typeof window?window.URL?window.URL:window.webkitURL:console.log("warning: cannot create object URLs");Module.preloadPlugins||(Module.preloadPlugins=[]);Module.preloadPlugins.push({canHandle:(function(b){return b.substr(-4)in{".jpg":1,".png":1,".bmp":1}}),handle:(function(b,d,e,f){var g=Ab;if(nM){try{g=new Blob([b],{type:k(d)})}catch(h){var j="Blob constructor present but fails: "+h+"; falling back to blob builder";zc||(zc={});zc[j]||(zc[j]=1,Module.gc(j))}}g||(g=new oM,g.append((new Uint8Array(b)).buffer),g=g.getBlob());var m=pM.createObjectURL(g),n=new Image;n.onload=(function(){rc(n.complete,"Image "+d+" could not be decoded");var f=document.createElement("canvas");f.width=n.width;f.height=n.height;f.getContext("2d").drawImage(n,0,0);Module.preloadedImages[d]=f;pM.revokeObjectURL(m);e&&e(b)});n.onerror=(function(){console.log("Image "+m+" could not be decoded");f&&f()});n.src=m})});Module.preloadPlugins.push({canHandle:(function(b){return b.substr(-4)in{".ogg":1,".wav":1,".mp3":1}}),handle:(function(b,d,e,f){function g(f){h||(h=Sa,Module.preloadedAudios[d]=f,e&&e(b))}var h=Gb;if(nM){var f=new Blob([b],{type:k(d)}),f=pM.createObjectURL(f),j=new Audio;j.addEventListener("canplaythrough",(function(){g(j)}),Gb);j.onerror=(function(){if(!h){console.log("warning: browser could not fully decode audio "+d+", trying slower base64 approach");for(var e="",f=0,k=0,m=0;m<b.length;m++){f=f<<8|b[m];for(k+=8;6<=k;){var n=f>>k-6&63,k=k-6,e=e+"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[n]}}2==k?(e+="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[(f&3)<<4],e+="=="):4==k&&(e+="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[(f&15)<<2],e+="=");j.src="data:audio/x-"+d.substr(-3)+";base64,"+e;g(j)}});j.src=f}else{Module.preloadedAudios[d]=new Audio,f&&f()}})})}for(var p,u=[b,d],r=u[0],w=1;w<u.length;w++){"/"!=r[r.length-1]&&(r+="/"),r+=u[w]}"/"==r[0]&&(r=r.substr(1));p=r;mg("cp "+p);if("string"==typeof e){var x=j,y=(function(){x?x():ja('Loading data file "'+e+'" failed.')}),A=new XMLHttpRequest;A.open("GET",e,Sa);A.responseType="arraybuffer";A.onload=(function(){if(200==A.status){var b=A.response;rc(b,'Loading data file "'+e+'" failed (no arrayBuffer).');b=new Uint8Array(b);m(b);Dg("al "+e)}else{y()}});A.onerror=y;A.send(Ab);mg("al "+e)}else{m(e)}});Module.FS_createLazyFile=(function(b,d,e,f,g){return gM(b,d,{P:Gb,url:e},f,g)});Module.FS_createLink=(function(b,d,e,f,g){return gM(b,d,{P:Gb,link:e},f,g)});Module.FS_createDevice=iM;UL(0);var ML=B(12,"void*",v);Module.requestFullScreen=(function(){function b(){}function d(){var b=Gb;if((document.webkitFullScreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.mozFullscreenElement||document.fullScreenElement||document.fullscreenElement)===e){e.Qh=e.requestPointerLock||e.mozRequestPointerLock||e.webkitRequestPointerLock,e.Qh(),b=Sa}if(Module.onFullScreen){Module.onFullScreen(b)}}var e=Module.canvas;document.addEventListener("fullscreenchange",d,Gb);document.addEventListener("mozfullscreenchange",d,Gb);document.addEventListener("webkitfullscreenchange",d,Gb);document.addEventListener("pointerlockchange",b,Gb);document.addEventListener("mozpointerlockchange",b,Gb);document.addEventListener("webkitpointerlockchange",b,Gb);e.Ph=e.requestFullScreen||e.mozRequestFullScreen||(e.webkitRequestFullScreen?(function(){e.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT)}):Ab);e.Ph()});Module.requestAnimationFrame=(function(b){window.requestAnimationFrame||(window.requestAnimationFrame=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||window.msRequestAnimationFrame||window.oRequestAnimationFrame||window.setTimeout);window.requestAnimationFrame(b)});Module.pauseMainLoop=Hb();Module.resumeMainLoop=(function(){lM&&(lM=Gb,Ab())});Module.Kh=(function(b){function d(){for(var b=0;3>b;b++){f.push(0)}}var e=b.length+1,f=[B(hf("/bin/this.program"),"i8",v)];d();for(var g=0;g<e-1;g+=1){f.push(B(hf(b[g]),"i8",v)),d()}f.push(0);f=B(f,"i32",v);return _main(e,f,0)});var Cj,zk,Lk,Up,Yp,Zp,Wp,Xp,zy,qM,rM,Xw,sM,yF,tM,pF,uM,sn,rn,xp,vM,wM,Dj,vf=vf.concat([]),yp,zp,zx,xM,yM,zM,AM,BM,CM,DM,EM,FM,GM,op,np,HM,IM,JM,KM,LM,MM,NM,OM,PM,Fp,QM,RM,Np,SM,cq,TM,Ep,dq,UM,eq,VM,gq,WM,Ip,XM,Op,YM,Mp,ZM,hq,$M,pu,nu,gx,fx,kx,jx,nx,mx,KF,JF,vG,uG,yG,xG,CG,BG,FG,EG,IG,HG,MG,LG,xI,wI,CI,BI,II,HI,kK,jK,nK,mK,aN,bN,cN,dN,eN,fN,KL,gN,hN,iN,jN,kN,lN,mN,nN,oN,pN,qN,rN,sN,tN,uN,vN,wN,xN,yN,zN,AN,BN,CN,DN,EN,FN,GN,HN,IN,JN,KN,LN,MN,NN,ON,PN,QN,RN,SN,TN,UN,VN,WN,XN,YN,ZN,$N,aO,bO,cO,dO,eO,fO,gO,hO,iO,jO,kO,lO,mO,nO,oO,pO,qO,rO,sO,tO,uO,vO,LL,wO,xO,yO,JL,zO,AO,Y,BL,FL,GL,BO,HL,CO;N.Pe=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,67,111,108,108,105,100,101,69,100,103,101,46,99,112,112,0],"i8",v);N.je=B([118,111,105,100,32,98,50,67,111,108,108,105,100,101,69,100,103,101,65,110,100,67,105,114,99,108,101,40,98,50,77,97,110,105,102,111,108,100,32,42,44,32,99,111,110,115,116,32,98,50,69,100,103,101,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,99,111,110,115,116,32,98,50,67,105,114,99,108,101,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,41,0],"i8",v);N.Qe=B([100,101,110,32,62,32,48,46,48,102,0],"i8",v);N.Ib=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,67,111,108,108,105,100,101,80,111,108,121,103,111,110,46,99,112,112,0],"i8",v);N.le=B([118,111,105,100,32,98,50,70,105,110,100,73,110,99,105,100,101,110,116,69,100,103,101,40,98,50,67,108,105,112,86,101,114,116,101,120,32,42,44,32,99,111,110,115,116,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,44,32,99,111,110,115,116,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,41,0],"i8",v);N.Eb=B([48,32,60,61,32,101,100,103,101,49,32,38,38,32,101,100,103,101,49,32,60,32,112,111,108,121,49,45,62,109,95,118,101,114,116,101,120,67,111,117,110,116,0],"i8",v);N.ke=B([102,108,111,97,116,51,50,32,98,50,69,100,103,101,83,101,112,97,114,97,116,105,111,110,40,99,111,110,115,116,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,44,32,99,111,110,115,116,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,41,0],"i8",v);Cj=B(4,"i32",v);zk=B(4,"i32",v);Lk=B(4,"i32",v);N.s=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,68,105,115,116,97,110,99,101,46,99,112,112,0],"i8",v);N.ob=B([118,111,105,100,32,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,58,58,83,101,116,40,99,111,110,115,116,32,98,50,83,104,97,112,101,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.Gf=B([48,32,60,61,32,105,110,100,101,120,32,38,38,32,105,110,100,101,120,32,60,32,99,104,97,105,110,45,62,109,95,99,111,117,110,116,0],"i8",v);N.he=B([118,111,105,100,32,98,50,68,105,115,116,97,110,99,101,40,98,50,68,105,115,116,97,110,99,101,79,117,116,112,117,116,32,42,44,32,98,50,83,105,109,112,108,101,120,67,97,99,104,101,32,42,44,32,99,111,110,115,116,32,98,50,68,105,115,116,97,110,99,101,73,110,112,117,116,32,42,41,0],"i8",v);N.Ma=B([102,108,111,97,116,51,50,32,98,50,83,105,109,112,108,101,120,58,58,71,101,116,77,101,116,114,105,99,40,41,32,99,111,110,115,116,0],"i8",v);N.zb=B([118,111,105,100,32,98,50,83,105,109,112,108,101,120,58,58,71,101,116,87,105,116,110,101,115,115,80,111,105,110,116,115,40,98,50,86,101,99,50,32,42,44,32,98,50,86,101,99,50,32,42,41,32,99,111,110,115,116,0],"i8",v);N.i=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,68,105,115,116,97,110,99,101,46,104,0],"i8",v);N.h=B([99,111,110,115,116,32,98,50,86,101,99,50,32,38,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,58,58,71,101,116,86,101,114,116,101,120,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.j=B([48,32,60,61,32,105,110,100,101,120,32,38,38,32,105,110,100,101,120,32,60,32,109,95,99,111,117,110,116,0],"i8",v);N.Oe=B([98,50,86,101,99,50,32,98,50,83,105,109,112,108,101,120,58,58,71,101,116,83,101,97,114,99,104,68,105,114,101,99,116,105,111,110,40,41,32,99,111,110,115,116,0],"i8",v);N.oa=B([98,50,86,101,99,50,32,98,50,83,105,109,112,108,101,120,58,58,71,101,116,67,108,111,115,101,115,116,80,111,105,110,116,40,41,32,99,111,110,115,116,0],"i8",v);N.Fe=B([118,111,105,100,32,98,50,83,105,109,112,108,101,120,58,58,82,101,97,100,67,97,99,104,101,40,99,111,110,115,116,32,98,50,83,105,109,112,108,101,120,67,97,99,104,101,32,42,44,32,99,111,110,115,116,32,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,99,111,110,115,116,32,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,41,0],"i8",v);N.gh=B([99,97,99,104,101,45,62,99,111,117,110,116,32,60,61,32,51,0],"i8",v);N.c=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,68,121,110,97,109,105,99,84,114,101,101,46,99,112,112,0],"i8",v);N.ne=B([105,110,116,51,50,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,65,108,108,111,99,97,116,101,78,111,100,101,40,41,0],"i8",v);N.cf=B([109,95,110,111,100,101,67,111,117,110,116,32,61,61,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.G=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,70,114,101,101,78,111,100,101,40,105,110,116,51,50,41,0],"i8",v);N.Z=B([48,32,60,61,32,110,111,100,101,73,100,32,38,38,32,110,111,100,101,73,100,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Ba=B([48,32,60,32,109,95,110,111,100,101,67,111,117,110,116,0],"i8",v);N.kb=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,68,101,115,116,114,111,121,80,114,111,120,121,40,105,110,116,51,50,41,0],"i8",v);N.Tb=B([109,95,110,111,100,101,115,91,112,114,111,120,121,73,100,93,46,73,115,76,101,97,102,40,41,0],"i8",v);N.lb=B([98,111,111,108,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,77,111,118,101,80,114,111,120,121,40,105,110,116,51,50,44,32,99,111,110,115,116,32,98,50,65,65,66,66,32,38,44,32,99,111,110,115,116,32,98,50,86,101,99,50,32,38,41,0],"i8",v);N.jb=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,73,110,115,101,114,116,76,101,97,102,40,105,110,116,51,50,41,0],"i8",v);N.ph=B([99,104,105,108,100,49,32,33,61,32,40,45,49,41,0],"i8",v);N.uh=B([99,104,105,108,100,50,32,33,61,32,40,45,49,41,0],"i8",v);N.v=B([105,110,116,51,50,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,66,97,108,97,110,99,101,40,105,110,116,51,50,41,0],"i8",v);N.xh=B([105,65,32,33,61,32,40,45,49,41,0],"i8",v);N.Dh=B([48,32,60,61,32,105,66,32,38,38,32,105,66,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Re=B([48,32,60,61,32,105,67,32,38,38,32,105,67,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Xe=B([48,32,60,61,32,105,70,32,38,38,32,105,70,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.ff=B([48,32,60,61,32,105,71,32,38,38,32,105,71,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.of=B([109,95,110,111,100,101,115,91,67,45,62,112,97,114,101,110,116,93,46,99,104,105,108,100,50,32,61,61,32,105,65,0],"i8",v);N.tf=B([48,32,60,61,32,105,68,32,38,38,32,105,68,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.wf=B([48,32,60,61,32,105,69,32,38,38,32,105,69,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Cf=B([109,95,110,111,100,101,115,91,66,45,62,112,97,114,101,110,116,93,46,99,104,105,108,100,50,32,61,61,32,105,65,0],"i8",v);N.Je=B([105,110,116,51,50,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,67,111,109,112,117,116,101,72,101,105,103,104,116,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.N=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,86,97,108,105,100,97,116,101,83,116,114,117,99,116,117,114,101,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.Jf=B([109,95,110,111,100,101,115,91,105,110,100,101,120,93,46,112,97,114,101,110,116,32,61,61,32,40,45,49,41,0],"i8",v);N.Hb=B([99,104,105,108,100,50,32,61,61,32,40,45,49,41,0],"i8",v);N.Jb=B([110,111,100,101,45,62,104,101,105,103,104,116,32,61,61,32,48,0],"i8",v);N.Kb=B([48,32,60,61,32,99,104,105,108,100,49,32,38,38,32,99,104,105,108,100,49,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Lb=B([48,32,60,61,32,99,104,105,108,100,50,32,38,38,32,99,104,105,108,100,50,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.ag=B([109,95,110,111,100,101,115,91,99,104,105,108,100,49,93,46,112,97,114,101,110,116,32,61,61,32,105,110,100,101,120,0],"i8",v);N.hg=B([109,95,110,111,100,101,115,91,99,104,105,108,100,50,93,46,112,97,114,101,110,116,32,61,61,32,105,110,100,101,120,0],"i8",v);N.M=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,86,97,108,105,100,97,116,101,77,101,116,114,105,99,115,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.kg=B([110,111,100,101,45,62,104,101,105,103,104,116,32,61,61,32,104,101,105,103,104,116,0],"i8",v);N.og=B([97,97,98,98,46,108,111,119,101,114,66,111,117,110,100,32,61,61,32,110,111,100,101,45,62,97,97,98,98,46,108,111,119,101,114,66,111,117,110,100,0],"i8",v);N.sg=B([97,97,98,98,46,117,112,112,101,114,66,111,117,110,100,32,61,61,32,110,111,100,101,45,62,97,97,98,98,46,117,112,112,101,114,66,111,117,110,100,0],"i8",v);N.La=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,86,97,108,105,100,97,116,101,40,41,32,99,111,110,115,116,0],"i8",v);N.zg=B([48,32,60,61,32,102,114,101,101,73,110,100,101,120,32,38,38,32,102,114,101,101,73,110,100,101,120,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Ag=B([71,101,116,72,101,105,103,104,116,40,41,32,61,61,32,67,111,109,112,117,116,101,72,101,105,103,104,116,40,41,0],"i8",v);N.Cg=B([109,95,110,111,100,101,67,111,117,110,116,32,43,32,102,114,101,101,67,111,117,110,116,32,61,61,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Ka=B([105,110,116,51,50,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,71,101,116,77,97,120,66,97,108,97,110,99,101,40,41,32,99,111,110,115,116,0],"i8",v);N.Ya=B([110,111,100,101,45,62,73,115,76,101,97,102,40,41,32,61,61,32,102,97,108,115,101,0],"i8",v);Up=B(4,"i32",v);Yp=B(4,"i32",v);Zp=B(4,"i32",v);Wp=B(4,"i32",v);Xp=B(4,"i32",v);N.Ca=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,84,105,109,101,79,102,73,109,112,97,99,116,46,99,112,112,0],"i8",v);N.ie=B([118,111,105,100,32,98,50,84,105,109,101,79,102,73,109,112,97,99,116,40,98,50,84,79,73,79,117,116,112,117,116,32,42,44,32,99,111,110,115,116,32,98,50,84,79,73,73,110,112,117,116,32,42,41,0],"i8",v);N.rf=B([116,97,114,103,101,116,32,62,32,116,111,108,101,114,97,110,99,101,0],"i8",v);N.Ne=B([102,108,111,97,116,51,50,32,98,50,83,101,112,97,114,97,116,105,111,110,70,117,110,99,116,105,111,110,58,58,69,118,97,108,117,97,116,101,40,105,110,116,51,50,44,32,105,110,116,51,50,44,32,102,108,111,97,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.Me=B([102,108,111,97,116,51,50,32,98,50,83,101,112,97,114,97,116,105,111,110,70,117,110,99,116,105,111,110,58,58,70,105,110,100,77,105,110,83,101,112,97,114,97,116,105,111,110,40,105,110,116,51,50,32,42,44,32,105,110,116,51,50,32,42,44,32,102,108,111,97,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.se=B([102,108,111,97,116,51,50,32,98,50,83,101,112,97,114,97,116,105,111,110,70,117,110,99,116,105,111,110,58,58,73,110,105,116,105,97,108,105,122,101,40,99,111,110,115,116,32,98,50,83,105,109,112,108,101,120,67,97,99,104,101,32,42,44,32,99,111,110,115,116,32,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,32,42,44,32,99,111,110,115,116,32,98,50,83,119,101,101,112,32,38,44,32,99,111,110,115,116,32,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,32,42,44,32,99,111,110,115,116,32,98,50,83,119,101,101,112,32,38,44,32,102,108,111,97,116,51,50,41,0],"i8",v);N.kh=B([48,32,60,32,99,111,117,110,116,32,38,38,32,99,111,117,110,116,32,60,32,51,0],"i8",v);zy=B([0,0,0,0,0,0,0,0,34,0,0,0,36,0,0,0,38,0,0,0,40,0,0,0,42,0,0,0,44,0,0,0,46,0,0,0,48,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.F=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,83,104,97,112,101,115,47,98,50,67,104,97,105,110,83,104,97,112,101,46,99,112,112,0],"i8",v);N.ib=B([118,111,105,100,32,98,50,67,104,97,105,110,83,104,97,112,101,58,58,67,114,101,97,116,101,76,111,111,112,40,99,111,110,115,116,32,98,50,86,101,99,50,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.Sa=B([109,95,118,101,114,116,105,99,101,115,32,61,61,32,95,95,110,117,108,108,32,38,38,32,109,95,99,111,117,110,116,32,61,61,32,48,0],"i8",v);N.da=B([118,111,105,100,32,98,50,67,104,97,105,110,83,104,97,112,101,58,58,67,114,101,97,116,101,67,104,97,105,110,40,99,111,110,115,116,32,98,50,86,101,99,50,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.Pb=B([99,111,117,110,116,32,62,61,32,50,0],"i8",v);N.He=B([118,111,105,100,32,98,50,67,104,97,105,110,83,104,97,112,101,58,58,71,101,116,67,104,105,108,100,69,100,103,101,40,98,50,69,100,103,101,83,104,97,112,101,32,42,44,32,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.ah=B([48,32,60,61,32,105,110,100,101,120,32,38,38,32,105,110,100,101,120,32,60,32,109,95,99,111,117,110,116,32,45,32,49,0],"i8",v);N.Ie=B([118,105,114,116,117,97,108,32,98,111,111,108,32,98,50,67,104,97,105,110,83,104,97,112,101,58,58,82,97,121,67,97,115,116,40,98,50,82,97,121,67,97,115,116,79,117,116,112,117,116,32,42,44,32,99,111,110,115,116,32,98,50,82,97,121,67,97,115,116,73,110,112,117,116,32,38,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.Ub=B([99,104,105,108,100,73,110,100,101,120,32,60,32,109,95,99,111,117,110,116,0],"i8",v);N.Ge=B([118,105,114,116,117,97,108,32,118,111,105,100,32,98,50,67,104,97,105,110,83,104,97,112,101,58,58,67,111,109,112,117,116,101,65,65,66,66,40,98,50,65,65,66,66,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.pc=B([49,50,98,50,67,104,97,105,110,83,104,97,112,101,0],"i8",v);N.Kc=B([55,98,50,83,104,97,112,101,0],"i8",v);qM=B(8,"*",v);rM=B(12,"*",v);Xw=B([0,0,0,0,0,0,0,0,50,0,0,0,52,0,0,0,54,0,0,0,56,0,0,0,58,0,0,0,60,0,0,0,62,0,0,0,64,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.sc=B([49,51,98,50,67,105,114,99,108,101,83,104,97,112,101,0],"i8",v);sM=B(12,"*",v);yF=B([0,0,0,0,0,0,0,0,66,0,0,0,68,0,0,0,70,0,0,0,72,0,0,0,74,0,0,0,76,0,0,0,78,0,0,0,80,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.lc=B([49,49,98,50,69,100,103,101,83,104,97,112,101,0],"i8",v);tM=B(12,"*",v);N.O=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,83,104,97,112,101,115,47,98,50,80,111,108,121,103,111,110,83,104,97,112,101,46,99,112,112,0],"i8",v);N.mb=B([118,111,105,100,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,58,58,83,101,116,40,99,111,110,115,116,32,98,50,86,101,99,50,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.zf=B([51,32,60,61,32,99,111,117,110,116,32,38,38,32,99,111,117,110,116,32,60,61,32,56,0],"i8",v);N.ng=B([101,100,103,101,46,76,101,110,103,116,104,83,113,117,97,114,101,100,40,41,32,62,32,49,46,49,57,50,48,57,50,57,48,69,45,48,55,70,32,42,32,49,46,49,57,50,48,57,50,57,48,69,45,48,55,70,0],"i8",v);N.Le=B([118,105,114,116,117,97,108,32,98,111,111,108,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,58,58,82,97,121,67,97,115,116,40,98,50,82,97,121,67,97,115,116,79,117,116,112,117,116,32,42,44,32,99,111,110,115,116,32,98,50,82,97,121,67,97,115,116,73,110,112,117,116,32,38,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.Rg=B([48,46,48,102,32,60,61,32,108,111,119,101,114,32,38,38,32,108,111,119,101,114,32,60,61,32,105,110,112,117,116,46,109,97,120,70,114,97,99,116,105,111,110,0],"i8",v);N.yb=B([118,105,114,116,117,97,108,32,118,111,105,100,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,58,58,67,111,109,112,117,116,101,77,97,115,115,40,98,50,77,97,115,115,68,97,116,97,32,42,44,32,102,108,111,97,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.bh=B([109,95,118,101,114,116,101,120,67,111,117,110,116,32,62,61,32,51,0],"i8",v);N.Vb=B([97,114,101,97,32,62,32,49,46,49,57,50,48,57,50,57,48,69,45,48,55,70,0],"i8",v);pF=B([0,0,0,0,0,0,0,0,82,0,0,0,84,0,0,0,86,0,0,0,88,0,0,0,90,0,0,0,92,0,0,0,94,0,0,0,96,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.uc=B([49,52,98,50,80,111,108,121,103,111,110,83,104,97,112,101,0],"i8",v);uM=B(12,"*",v);N.gb=B([98,50,86,101,99,50,32,67,111,109,112,117,116,101,67,101,110,116,114,111,105,100,40,99,111,110,115,116,32,98,50,86,101,99,50,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.Xb=B([99,111,117,110,116,32,62,61,32,51,0],"i8",v);sn=B([16,0,0,0,32,0,0,0,64,0,0,0,96,0,0,0,128,0,0,0,160,0,0,0,192,0,0,0,224,0,0,0,256,0,0,0,320,0,0,0,384,0,0,0,448,0,0,0,512,0,0,0,640,0,0,0],["i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0],v);rn=B(641,"i8",v);xp=B(4,"i8",v);N.e=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,109,109,111,110,47,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,46,99,112,112,0],"i8",v);N.Ga=B([98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,58,58,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,40,41,0],"i8",v);N.Ta=B([106,32,60,32,98,50,95,98,108,111,99,107,83,105,122,101,115,0],"i8",v);N.Fa=B([118,111,105,100,32,42,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,58,58,65,108,108,111,99,97,116,101,40,105,110,116,51,50,41,0],"i8",v);N.Va=B([48,32,60,32,115,105,122,101,0],"i8",v);N.g=B([48,32,60,61,32,105,110,100,101,120,32,38,38,32,105,110,100,101,120,32,60,32,98,50,95,98,108,111,99,107,83,105,122,101,115,0],"i8",v);N.dh=B([98,108,111,99,107,67,111,117,110,116,32,42,32,98,108,111,99,107,83,105,122,101,32,60,61,32,98,50,95,99,104,117,110,107,83,105,122,101,0],"i8",v);N.f=B([118,111,105,100,32,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,58,58,70,114,101,101,40,118,111,105,100,32,42,44,32,105,110,116,51,50,41,0],"i8",v);vM=B([0,0,0,0,0,0,0,0,98,0,0,0,100,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Ic=B([54,98,50,68,114,97,119,0],"i8",v);wM=B(8,"*",v);Dj=B(8,"float",v);B([2,0,0,0,2,0,0,0,1,0,0,0],["i32",0,0,0,"i32",0,0,0,"i32",0,0,0],v);N.n=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,109,109,111,110,47,98,50,83,116,97,99,107,65,108,108,111,99,97,116,111,114,46,99,112,112,0],"i8",v);N.Q=B([98,50,83,116,97,99,107,65,108,108,111,99,97,116,111,114,58,58,126,98,50,83,116,97,99,107,65,108,108,111,99,97,116,111,114,40,41,0],"i8",v);N.Ua=B([109,95,105,110,100,101,120,32,61,61,32,48,0],"i8",v);N.Xa=B([109,95,101,110,116,114,121,67,111,117,110,116,32,61,61,32,48,0],"i8",v);N.w=B([118,111,105,100,32,42,98,50,83,116,97,99,107,65,108,108,111,99,97,116,111,114,58,58,65,108,108,111,99,97,116,101,40,105,110,116,51,50,41,0],"i8",v);N.D=B([109,95,101,110,116,114,121,67,111,117,110,116,32,60,32,98,50,95,109,97,120,83,116,97,99,107,69,110,116,114,105,101,115,0],"i8",v);N.pb=B([118,111,105,100,32,98,50,83,116,97,99,107,65,108,108,111,99,97,116,111,114,58,58,70,114,101,101,40,118,111,105,100,32,42,41,0],"i8",v);N.eh=B([109,95,101,110,116,114,121,67,111,117,110,116,32,62,32,48,0],"i8",v);N.lh=B([112,32,61,61,32,101,110,116,114,121,45,62,100,97,116,97,0],"i8",v);N.k=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,98,50,66,111,100,121,46,99,112,112,0],"i8",v);N.R=B([98,50,66,111,100,121,58,58,98,50,66,111,100,121,40,99,111,110,115,116,32,98,50,66,111,100,121,68,101,102,32,42,44,32,98,50,87,111,114,108,100,32,42,41,0],"i8",v);N.Kf=B([98,100,45,62,112,111,115,105,116,105,111,110,46,73,115,86,97,108,105,100,40,41,0],"i8",v);N.vg=B([98,100,45,62,108,105,110,101,97,114,86,101,108,111,99,105,116,121,46,73,115,86,97,108,105,100,40,41,0],"i8",v);N.Sg=B([98,50,73,115,86,97,108,105,100,40,98,100,45,62,97,110,103,108,101,41,0],"i8",v);N.fh=B([98,50,73,115,86,97,108,105,100,40,98,100,45,62,97,110,103,117,108,97,114,86,101,108,111,99,105,116,121,41,0],"i8",v);N.mh=B([98,50,73,115,86,97,108,105,100,40,98,100,45,62,97,110,103,117,108,97,114,68,97,109,112,105,110,103,41,32,38,38,32,98,100,45,62,97,110,103,117,108,97,114,68,97,109,112,105,110,103,32,62,61,32,48,46,48,102,0],"i8",v);N.th=B([98,50,73,115,86,97,108,105,100,40,98,100,45,62,108,105,110,101,97,114,68,97,109,112,105,110,103,41,32,38,38,32,98,100,45,62,108,105,110,101,97,114,68,97,109,112,105,110,103,32,62,61,32,48,46,48,102,0],"i8",v);N.we=B([118,111,105,100,32,98,50,66,111,100,121,58,58,83,101,116,84,121,112,101,40,98,50,66,111,100,121,84,121,112,101,41,0],"i8",v);N.V=B([109,95,119,111,114,108,100,45,62,73,115,76,111,99,107,101,100,40,41,32,61,61,32,102,97,108,115,101,0],"i8",v);N.ve=B([98,50,70,105,120,116,117,114,101,32,42,98,50,66,111,100,121,58,58,67,114,101,97,116,101,70,105,120,116,117,114,101,40,99,111,110,115,116,32,98,50,70,105,120,116,117,114,101,68,101,102,32,42,41,0],"i8",v);N.ma=B([118,111,105,100,32,98,50,66,111,100,121,58,58,68,101,115,116,114,111,121,70,105,120,116,117,114,101,40,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.Ch=B([102,105,120,116,117,114,101,45,62,109,95,98,111,100,121,32,61,61,32,116,104,105,115,0],"i8",v);N.Ih=B([109,95,102,105,120,116,117,114,101,67,111,117,110,116,32,62,32,48,0],"i8",v);N.We=B([102,111,117,110,100,0],"i8",v);N.rb=B([118,111,105,100,32,98,50,66,111,100,121,58,58,82,101,115,101,116,77,97,115,115,68,97,116,97,40,41,0],"i8",v);N.ef=B([109,95,116,121,112,101,32,61,61,32,98,50,95,100,121,110,97,109,105,99,66,111,100,121,0],"i8",v);N.Db=B([109,95,73,32,62,32,48,46,48,102,0],"i8",v);N.qb=B([118,111,105,100,32,98,50,66,111,100,121,58,58,83,101,116,77,97,115,115,68,97,116,97,40,99,111,110,115,116,32,98,50,77,97,115,115,68,97,116,97,32,42,41,0],"i8",v);N.ue=B([118,111,105,100,32,98,50,66,111,100,121,58,58,83,101,116,84,114,97,110,115,102,111,114,109,40,99,111,110,115,116,32,98,50,86,101,99,50,32,38,44,32,102,108,111,97,116,51,50,41,0],"i8",v);N.xe=B([118,111,105,100,32,98,50,66,111,100,121,58,58,83,101,116,65,99,116,105,118,101,40,98,111,111,108,41,0],"i8",v);N.vf=B([32,32,98,50,66,111,100,121,68,101,102,32,98,100,59,10,0],"i8",v);N.Bf=B([32,32,98,100,46,116,121,112,101,32,61,32,98,50,66,111,100,121,84,121,112,101,40,37,100,41,59,10,0],"i8",v);N.Ff=B([32,32,98,100,46,112,111,115,105,116,105,111,110,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Lf=B([32,32,98,100,46,97,110,103,108,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Of=B([32,32,98,100,46,108,105,110,101,97,114,86,101,108,111,99,105,116,121,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Qf=B([32,32,98,100,46,97,110,103,117,108,97,114,86,101,108,111,99,105,116,121,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Tf=B([32,32,98,100,46,108,105,110,101,97,114,68,97,109,112,105,110,103,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Xf=B([32,32,98,100,46,97,110,103,117,108,97,114,68,97,109,112,105,110,103,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Yf=B([32,32,98,100,46,97,108,108,111,119,83,108,101,101,112,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.cg=B([32,32,98,100,46,97,119,97,107,101,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.ig=B([32,32,98,100,46,102,105,120,101,100,82,111,116,97,116,105,111,110,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.lg=B([32,32,98,100,46,98,117,108,108,101,116,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.pg=B([32,32,98,100,46,97,99,116,105,118,101,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.tg=B([32,32,98,100,46,103,114,97,118,105,116,121,83,99,97,108,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.xg=B([32,32,98,111,100,105,101,115,91,37,100,93,32,61,32,109,95,119,111,114,108,100,45,62,67,114,101,97,116,101,66,111,100,121,40,38,98,100,41,59,10,0],"i8",v);N.Dg=B([32,32,123,10,0],"i8",v);N.Fg=B([32,32,125,10,0],"i8",v);yp=B(4,"*",v);zp=B(4,"*",v);N.S=B([118,111,105,100,32,42,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,71,101,116,85,115,101,114,68,97,116,97,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.o=B([48,32,60,61,32,112,114,111,120,121,73,100,32,38,38,32,112,114,111,120,121,73,100,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.H=B([99,111,110,115,116,32,98,50,65,65,66,66,32,38,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,71,101,116,70,97,116,65,65,66,66,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);zx=B([0,0,0,0,0,0,0,0,104,0,0,0,106,0,0,0,108,0,0,0,110,0,0,0,112,0,0,0,114,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Cc=B([49,55,98,50,67,111,110,116,97,99,116,76,105,115,116,101,110,101,114,0],"i8",v);xM=B(8,"*",v);N.Pa=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,98,50,70,105,120,116,117,114,101,46,99,112,112,0],"i8",v);N.xb=B([118,111,105,100,32,98,50,70,105,120,116,117,114,101,58,58,68,101,115,116,114,111,121,40,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,32,42,41,0],"i8",v);N.Ab=B([109,95,112,114,111,120,121,67,111,117,110,116,32,61,61,32,48,0],"i8",v);N.Ee=B([118,111,105,100,32,98,50,70,105,120,116,117,114,101,58,58,67,114,101,97,116,101,80,114,111,120,105,101,115,40,98,50,66,114,111,97,100,80,104,97,115,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,41,0],"i8",v);N.Gg=B([32,32,32,32,98,50,70,105,120,116,117,114,101,68,101,102,32,102,100,59,10,0],"i8",v);N.Vg=B([32,32,32,32,102,100,46,102,114,105,99,116,105,111,110,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.hh=B([32,32,32,32,102,100,46,114,101,115,116,105,116,117,116,105,111,110,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.nh=B([32,32,32,32,102,100,46,100,101,110,115,105,116,121,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.vh=B([32,32,32,32,102,100,46,105,115,83,101,110,115,111,114,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.yh=B([32,32,32,32,102,100,46,102,105,108,116,101,114,46,99,97,116,101,103,111,114,121,66,105,116,115,32,61,32,117,105,110,116,49,54,40,37,100,41,59,10,0],"i8",v);N.Eh=B([32,32,32,32,102,100,46,102,105,108,116,101,114,46,109,97,115,107,66,105,116,115,32,61,32,117,105,110,116,49,54,40,37,100,41,59,10,0],"i8",v);N.Se=B([32,32,32,32,102,100,46,102,105,108,116,101,114,46,103,114,111,117,112,73,110,100,101,120,32,61,32,105,110,116,49,54,40,37,100,41,59,10,0],"i8",v);N.Ye=B([32,32,32,32,98,50,67,105,114,99,108,101,83,104,97,112,101,32,115,104,97,112,101,59,10,0],"i8",v);N.Bb=B([32,32,32,32,115,104,97,112,101,46,109,95,114,97,100,105,117,115,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.nf=B([32,32,32,32,115,104,97,112,101,46,109,95,112,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.sf=B([32,32,32,32,98,50,69,100,103,101,83,104,97,112,101,32,115,104,97,112,101,59,10,0],"i8",v);N.xf=B([32,32,32,32,115,104,97,112,101,46,109,95,118,101,114,116,101,120,48,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Df=B([32,32,32,32,115,104,97,112,101,46,109,95,118,101,114,116,101,120,49,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Hf=B([32,32,32,32,115,104,97,112,101,46,109,95,118,101,114,116,101,120,50,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Mf=B([32,32,32,32,115,104,97,112,101,46,109,95,118,101,114,116,101,120,51,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Pf=B([32,32,32,32,115,104,97,112,101,46,109,95,104,97,115,86,101,114,116,101,120,48,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.Rf=B([32,32,32,32,115,104,97,112,101,46,109,95,104,97,115,86,101,114,116,101,120,51,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.Uf=B([32,32,32,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,32,115,104,97,112,101,59,10,0],"i8",v);N.Mb=B([32,32,32,32,98,50,86,101,99,50,32,118,115,91,37,100,93,59,10,0],"i8",v);N.Nb=B([32,32,32,32,118,115,91,37,100,93,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.jg=B([32,32,32,32,115,104,97,112,101,46,83,101,116,40,118,115,44,32,37,100,41,59,10,0],"i8",v);N.mg=B([32,32,32,32,98,50,67,104,97,105,110,83,104,97,112,101,32,115,104,97,112,101,59,10,0],"i8",v);N.qg=B([32,32,32,32,115,104,97,112,101,46,67,114,101,97,116,101,67,104,97,105,110,40,118,115,44,32,37,100,41,59,10,0],"i8",v);N.ug=B([32,32,32,32,115,104,97,112,101,46,109,95,112,114,101,118,86,101,114,116,101,120,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.yg=B([32,32,32,32,115,104,97,112,101,46,109,95,110,101,120,116,86,101,114,116,101,120,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Bg=B([32,32,32,32,115,104,97,112,101,46,109,95,104,97,115,80,114,101,118,86,101,114,116,101,120,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.Eg=B([32,32,32,32,115,104,97,112,101,46,109,95,104,97,115,78,101,120,116,86,101,114,116,101,120,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.Za=B([10,0],"i8",v);N.Ig=B([32,32,32,32,102,100,46,115,104,97,112,101,32,61,32,38,115,104,97,112,101,59,10,0],"i8",v);N.Mg=B([32,32,32,32,98,111,100,105,101,115,91,37,100,93,45,62,67,114,101,97,116,101,70,105,120,116,117,114,101,40,38,102,100,41,59,10,0],"i8",v);N.Gb=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,98,50,73,115,108,97,110,100,46,99,112,112,0],"i8",v);N.vb=B([118,111,105,100,32,98,50,73,115,108,97,110,100,58,58,83,111,108,118,101,84,79,73,40,99,111,110,115,116,32,98,50,84,105,109,101,83,116,101,112,32,38,44,32,105,110,116,51,50,44,32,105,110,116,51,50,41,0],"i8",v);N.df=B([116,111,105,73,110,100,101,120,65,32,60,32,109,95,98,111,100,121,67,111,117,110,116,0],"i8",v);N.Vf=B([116,111,105,73,110,100,101,120,66,32,60,32,109,95,98,111,100,121,67,111,117,110,116,0],"i8",v);N.t=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,98,50,87,111,114,108,100,46,99,112,112,0],"i8",v);N.Ae=B([98,50,66,111,100,121,32,42,98,50,87,111,114,108,100,58,58,67,114,101,97,116,101,66,111,100,121,40,99,111,110,115,116,32,98,50,66,111,100,121,68,101,102,32,42,41,0],"i8",v);N.pa=B([73,115,76,111,99,107,101,100,40,41,32,61,61,32,102,97,108,115,101,0],"i8",v);N.sb=B([118,111,105,100,32,98,50,87,111,114,108,100,58,58,68,101,115,116,114,111,121,66,111,100,121,40,98,50,66,111,100,121,32,42,41,0],"i8",v);N.Wf=B([109,95,98,111,100,121,67,111,117,110,116,32,62,32,48,0],"i8",v);N.Be=B([98,50,74,111,105,110,116,32,42,98,50,87,111,114,108,100,58,58,67,114,101,97,116,101,74,111,105,110,116,40,99,111,110,115,116,32,98,50,74,111,105,110,116,68,101,102,32,42,41,0],"i8",v);N.tb=B([118,111,105,100,32,98,50,87,111,114,108,100,58,58,68,101,115,116,114,111,121,74,111,105,110,116,40,98,50,74,111,105,110,116,32,42,41,0],"i8",v);N.Hg=B([109,95,106,111,105,110,116,67,111,117,110,116,32,62,32,48,0],"i8",v);N.Ha=B([118,111,105,100,32,98,50,87,111,114,108,100,58,58,83,111,108,118,101,40,99,111,110,115,116,32,98,50,84,105,109,101,83,116,101,112,32,38,41,0],"i8",v);N.Xg=B([98,45,62,73,115,65,99,116,105,118,101,40,41,32,61,61,32,116,114,117,101,0],"i8",v);N.Sb=B([115,116,97,99,107,67,111,117,110,116,32,60,32,115,116,97,99,107,83,105,122,101,0],"i8",v);N.ub=B([118,111,105,100,32,98,50,87,111,114,108,100,58,58,83,111,108,118,101,84,79,73,40,99,111,110,115,116,32,98,50,84,105,109,101,83,116,101,112,32,38,41,0],"i8",v);N.oh=B([116,121,112,101,65,32,61,61,32,98,50,95,100,121,110,97,109,105,99,66,111,100,121,32,124,124,32,116,121,112,101,66,32,61,61,32,98,50,95,100,121,110,97,109,105,99,66,111,100,121,0],"i8",v);N.U=B([97,108,112,104,97,48,32,60,32,49,46,48,102,0],"i8",v);N.Ce=B([118,111,105,100,32,98,50,87,111,114,108,100,58,58,68,114,97,119,83,104,97,112,101,40,98,50,70,105,120,116,117,114,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,99,111,110,115,116,32,98,50,67,111,108,111,114,32,38,41,0],"i8",v);N.zh=B([118,101,114,116,101,120,67,111,117,110,116,32,60,61,32,56,0],"i8",v);N.Fh=B([98,50,86,101,99,50,32,103,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Te=B([109,95,119,111,114,108,100,45,62,83,101,116,71,114,97,118,105,116,121,40,103,41,59,10,0],"i8",v);N.Ze=B([98,50,66,111,100,121,42,42,32,98,111,100,105,101,115,32,61,32,40,98,50,66,111,100,121,42,42,41,98,50,65,108,108,111,99,40,37,100,32,42,32,115,105,122,101,111,102,40,98,50,66,111,100,121,42,41,41,59,10,0],"i8",v);N.hf=B([98,50,74,111,105,110,116,42,42,32,106,111,105,110,116,115,32,61,32,40,98,50,74,111,105,110,116,42,42,41,98,50,65,108,108,111,99,40,37,100,32,42,32,115,105,122,101,111,102,40,98,50,74,111,105,110,116,42,41,41,59,10,0],"i8",v);N.Qa=B([123,10,0],"i8",v);N.Ra=B([125,10,0],"i8",v);N.yf=B([98,50,70,114,101,101,40,106,111,105,110,116,115,41,59,10,0],"i8",v);N.Ef=B([98,50,70,114,101,101,40,98,111,100,105,101,115,41,59,10,0],"i8",v);N.If=B([106,111,105,110,116,115,32,61,32,78,85,76,76,59,10,0],"i8",v);N.Nf=B([98,111,100,105,101,115,32,61,32,78,85,76,76,59,10,0],"i8",v);N.q=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,68,121,110,97,109,105,99,84,114,101,101,46,104,0],"i8",v);N.Ke=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,82,97,121,67,97,115,116,40,84,32,42,44,32,99,111,110,115,116,32,98,50,82,97,121,67,97,115,116,73,110,112,117,116,32,38,41,32,99,111,110,115,116,32,91,84,32,61,32,98,50,87,111,114,108,100,82,97,121,67,97,115,116,87,114,97,112,112,101,114,93,0],"i8",v);N.Sf=B([114,46,76,101,110,103,116,104,83,113,117,97,114,101,100,40,41,32,62,32,48,46,48,102,0],"i8",v);N.ba=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,109,109,111,110,47,98,50,77,97,116,104,46,104,0],"i8",v);N.Y=B([118,111,105,100,32,98,50,83,119,101,101,112,58,58,65,100,118,97,110,99,101,40,102,108,111,97,116,51,50,41,0],"i8",v);N.J=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,98,50,73,115,108,97,110,100,46,104,0],"i8",v);N.De=B([118,111,105,100,32,98,50,73,115,108,97,110,100,58,58,65,100,100,40,98,50,74,111,105,110,116,32,42,41,0],"i8",v);N.rg=B([109,95,106,111,105,110,116,67,111,117,110,116,32,60,32,109,95,106,111,105,110,116,67,97,112,97,99,105,116,121,0],"i8",v);N.Ia=B([118,111,105,100,32,98,50,73,115,108,97,110,100,58,58,65,100,100,40,98,50,67,111,110,116,97,99,116,32,42,41,0],"i8",v);N.Wa=B([109,95,99,111,110,116,97,99,116,67,111,117,110,116,32,60,32,109,95,99,111,110,116,97,99,116,67,97,112,97,99,105,116,121,0],"i8",v);N.na=B([118,111,105,100,32,98,50,73,115,108,97,110,100,58,58,65,100,100,40,98,50,66,111,100,121,32,42,41,0],"i8",v);N.Aa=B([109,95,98,111,100,121,67,111,117,110,116,32,60,32,109,95,98,111,100,121,67,97,112,97,99,105,116,121,0],"i8",v);yM=B([0,0,0,0,0,0,0,0,116,0,0,0,118,0,0,0,120,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.wc=B([49,53,98,50,67,111,110,116,97,99,116,70,105,108,116,101,114,0],"i8",v);zM=B(8,"*",v);AM=B([0,0,0,0,0,0,0,0,122,0,0,0,124,0,0,0,126,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.ta=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,67,104,97,105,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.ia=B([98,50,67,104,97,105,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,58,58,98,50,67,104,97,105,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,44,32,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.Ec=B([50,51,98,50,67,104,97,105,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,0],"i8",v);N.Lc=B([57,98,50,67,111,110,116,97,99,116,0],"i8",v);BM=B(8,"*",v);CM=B(12,"*",v);DM=B([0,0,0,0,0,0,0,0,128,0,0,0,130,0,0,0,132,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.ua=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,67,104,97,105,110,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.ka=B([98,50,67,104,97,105,110,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,58,58,98,50,67,104,97,105,110,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,44,32,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.qa=B([109,95,102,105,120,116,117,114,101,65,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,99,104,97,105,110,0],"i8",v);N.Gc=B([50,52,98,50,67,104,97,105,110,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,0],"i8",v);EM=B(12,"*",v);FM=B([0,0,0,0,0,0,0,0,134,0,0,0,136,0,0,0,138,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.va=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,67,105,114,99,108,101,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.fa=B([98,50,67,105,114,99,108,101,67,111,110,116,97,99,116,58,58,98,50,67,105,114,99,108,101,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.Cb=B([109,95,102,105,120,116,117,114,101,65,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,99,105,114,99,108,101,0],"i8",v);N.vc=B([49,53,98,50,67,105,114,99,108,101,67,111,110,116,97,99,116,0],"i8",v);GM=B(12,"*",v);op=B(192,["*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0],v);np=B(4,"i8",v);N.$=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.Xh=B([115,116,97,116,105,99,32,118,111,105,100,32,98,50,67,111,110,116,97,99,116,58,58,65,100,100,84,121,112,101,40,98,50,67,111,110,116,97,99,116,67,114,101,97,116,101,70,99,110,32,42,44,32,98,50,67,111,110,116,97,99,116,68,101,115,116,114,111,121,70,99,110,32,42,44,32,98,50,83,104,97,112,101,58,58,84,121,112,101,44,32,98,50,83,104,97,112,101,58,58,84,121,112,101,41,0],"i8",v);N.gf=B([48,32,60,61,32,116,121,112,101,49,32,38,38,32,116,121,112,101,49,32,60,32,98,50,83,104,97,112,101,58,58,101,95,116,121,112,101,67,111,117,110,116,0],"i8",v);N.Zf=B([48,32,60,61,32,116,121,112,101,50,32,38,38,32,116,121,112,101,50,32,60,32,98,50,83,104,97,112,101,58,58,101,95,116,121,112,101,67,111,117,110,116,0],"i8",v);N.wb=B([115,116,97,116,105,99,32,98,50,67,111,110,116,97,99,116,32,42,98,50,67,111,110,116,97,99,116,58,58,67,114,101,97,116,101,40,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,44,32,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,44,32,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,32,42,41,0],"i8",v);N.Ja=B([115,116,97,116,105,99,32,118,111,105,100,32,98,50,67,111,110,116,97,99,116,58,58,68,101,115,116,114,111,121,40,98,50,67,111,110,116,97,99,116,32,42,44,32,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,32,42,41,0],"i8",v);N.Jg=B([115,95,105,110,105,116,105,97,108,105,122,101,100,32,61,61,32,116,114,117,101,0],"i8",v);N.Rb=B([48,32,60,61,32,116,121,112,101,65,32,38,38,32,116,121,112,101,66,32,60,32,98,50,83,104,97,112,101,58,58,101,95,116,121,112,101,67,111,117,110,116,0],"i8",v);HM=B([0,0,0,0,0,0,0,0,102,0,0,0,140,0,0,0,142,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.aa=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,46,99,112,112,0],"i8",v);N.qe=B([98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,58,58,98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,40,98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,68,101,102,32,42,41,0],"i8",v);N.jf=B([112,111,105,110,116,67,111,117,110,116,32,62,32,48,0],"i8",v);N.pe=B([118,111,105,100,32,98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,58,58,73,110,105,116,105,97,108,105,122,101,86,101,108,111,99,105,116,121,67,111,110,115,116,114,97,105,110,116,115,40,41,0],"i8",v);N.$f=B([109,97,110,105,102,111,108,100,45,62,112,111,105,110,116,67,111,117,110,116,32,62,32,48,0],"i8",v);N.nb=B([118,111,105,100,32,98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,58,58,83,111,108,118,101,86,101,108,111,99,105,116,121,67,111,110,115,116,114,97,105,110,116,115,40,41,0],"i8",v);N.Kg=B([112,111,105,110,116,67,111,117,110,116,32,61,61,32,49,32,124,124,32,112,111,105,110,116,67,111,117,110,116,32,61,61,32,50,0],"i8",v);N.Yg=B([97,46,120,32,62,61,32,48,46,48,102,32,38,38,32,97,46,121,32,62,61,32,48,46,48,102,0],"i8",v);N.te=B([118,111,105,100,32,98,50,80,111,115,105,116,105,111,110,83,111,108,118,101,114,77,97,110,105,102,111,108,100,58,58,73,110,105,116,105,97,108,105,122,101,40,98,50,67,111,110,116,97,99,116,80,111,115,105,116,105,111,110,67,111,110,115,116,114,97,105,110,116,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,41,0],"i8",v);N.ih=B([112,99,45,62,112,111,105,110,116,67,111,117,110,116,32,62,32,48,0],"i8",v);IM=B([0,0,0,0,0,0,0,0,144,0,0,0,146,0,0,0,148,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.wa=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,69,100,103,101,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.ha=B([98,50,69,100,103,101,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,58,58,98,50,69,100,103,101,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.Dc=B([50,50,98,50,69,100,103,101,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,0],"i8",v);JM=B(12,"*",v);KM=B([0,0,0,0,0,0,0,0,150,0,0,0,152,0,0,0,154,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.xa=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,69,100,103,101,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.ja=B([98,50,69,100,103,101,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,58,58,98,50,69,100,103,101,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.ra=B([109,95,102,105,120,116,117,114,101,65,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,101,100,103,101,0],"i8",v);N.Fc=B([50,51,98,50,69,100,103,101,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,0],"i8",v);LM=B(12,"*",v);MM=B([0,0,0,0,0,0,0,0,156,0,0,0,158,0,0,0,160,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.ya=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,80,111,108,121,103,111,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.la=B([98,50,80,111,108,121,103,111,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,58,58,98,50,80,111,108,121,103,111,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.I=B([109,95,102,105,120,116,117,114,101,66,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,99,105,114,99,108,101,0],"i8",v);N.Hc=B([50,53,98,50,80,111,108,121,103,111,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,0],"i8",v);NM=B(12,"*",v);OM=B([0,0,0,0,0,0,0,0,162,0,0,0,164,0,0,0,166,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.za=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,80,111,108,121,103,111,110,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.ga=B([98,50,80,111,108,121,103,111,110,67,111,110,116,97,99,116,58,58,98,50,80,111,108,121,103,111,110,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.sa=B([109,95,102,105,120,116,117,114,101,65,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,112,111,108,121,103,111,110,0],"i8",v);N.T=B([109,95,102,105,120,116,117,114,101,66,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,112,111,108,121,103,111,110,0],"i8",v);N.Ac=B([49,54,98,50,80,111,108,121,103,111,110,67,111,110,116,97,99,116,0],"i8",v);PM=B(12,"*",v);Fp=B([0,0,0,0,0,0,0,0,168,0,0,0,170,0,0,0,172,0,0,0,174,0,0,0,176,0,0,0,178,0,0,0,180,0,0,0,182,0,0,0,184,0,0,0,186,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.wg=B([32,32,98,50,68,105,115,116,97,110,99,101,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.qh=B([32,32,106,100,46,108,101,110,103,116,104,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.xc=B([49,53,98,50,68,105,115,116,97,110,99,101,74,111,105,110,116,0],"i8",v);N.Jc=B([55,98,50,74,111,105,110,116,0],"i8",v);QM=B(8,"*",v);RM=B(12,"*",v);Np=B([0,0,0,0,0,0,0,0,188,0,0,0,190,0,0,0,192,0,0,0,194,0,0,0,196,0,0,0,198,0,0,0,200,0,0,0,202,0,0,0,204,0,0,0,206,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.di=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,70,114,105,99,116,105,111,110,74,111,105,110,116,46,99,112,112,0],"i8",v);N.Sh=B([118,111,105,100,32,98,50,70,114,105,99,116,105,111,110,74,111,105,110,116,58,58,83,101,116,77,97,120,70,111,114,99,101,40,102,108,111,97,116,51,50,41,0],"i8",v);N.Yh=B([98,50,73,115,86,97,108,105,100,40,102,111,114,99,101,41,32,38,38,32,102,111,114,99,101,32,62,61,32,48,46,48,102,0],"i8",v);N.Th=B([118,111,105,100,32,98,50,70,114,105,99,116,105,111,110,74,111,105,110,116,58,58,83,101,116,77,97,120,84,111,114,113,117,101,40,102,108,111,97,116,51,50,41,0],"i8",v);N.bi=B([98,50,73,115,86,97,108,105,100,40,116,111,114,113,117,101,41,32,38,38,32,116,111,114,113,117,101,32,62,61,32,48,46,48,102,0],"i8",v);N.Lg=B([32,32,98,50,70,114,105,99,116,105,111,110,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.Gh=B([32,32,106,100,46,109,97,120,70,111,114,99,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Ue=B([32,32,106,100,46,109,97,120,84,111,114,113,117,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.yc=B([49,53,98,50,70,114,105,99,116,105,111,110,74,111,105,110,116,0],"i8",v);SM=B(12,"*",v);cq=B([0,0,0,0,0,0,0,0,208,0,0,0,210,0,0,0,212,0,0,0,214,0,0,0,216,0,0,0,218,0,0,0,220,0,0,0,222,0,0,0,224,0,0,0,226,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Ob=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,71,101,97,114,74,111,105,110,116,46,99,112,112,0],"i8",v);N.hb=B([98,50,71,101,97,114,74,111,105,110,116,58,58,98,50,71,101,97,114,74,111,105,110,116,40,99,111,110,115,116,32,98,50,71,101,97,114,74,111,105,110,116,68,101,102,32,42,41,0],"i8",v);N.mf=B([109,95,116,121,112,101,65,32,61,61,32,101,95,114,101,118,111,108,117,116,101,74,111,105,110,116,32,124,124,32,109,95,116,121,112,101,65,32,61,61,32,101,95,112,114,105,115,109,97,116,105,99,74,111,105,110,116,0],"i8",v);N.bg=B([109,95,116,121,112,101,66,32,61,61,32,101,95,114,101,118,111,108,117,116,101,74,111,105,110,116,32,124,124,32,109,95,116,121,112,101,66,32,61,61,32,101,95,112,114,105,115,109,97,116,105,99,74,111,105,110,116,0],"i8",v);N.Rh=B([118,111,105,100,32,98,50,71,101,97,114,74,111,105,110,116,58,58,83,101,116,82,97,116,105,111,40,102,108,111,97,116,51,50,41,0],"i8",v);N.ei=B([98,50,73,115,86,97,108,105,100,40,114,97,116,105,111,41,0],"i8",v);N.Zg=B([32,32,98,50,71,101,97,114,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.Ah=B([32,32,106,100,46,106,111,105,110,116,49,32,61,32,106,111,105,110,116,115,91,37,100,93,59,10,0],"i8",v);N.Hh=B([32,32,106,100,46,106,111,105,110,116,50,32,61,32,106,111,105,110,116,115,91,37,100,93,59,10,0],"i8",v);N.mc=B([49,49,98,50,71,101,97,114,74,111,105,110,116,0],"i8",v);TM=B(12,"*",v);N.m=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,74,111,105,110,116,46,99,112,112,0],"i8",v);N.ye=B([115,116,97,116,105,99,32,98,50,74,111,105,110,116,32,42,98,50,74,111,105,110,116,58,58,67,114,101,97,116,101,40,99,111,110,115,116,32,98,50,74,111,105,110,116,68,101,102,32,42,44,32,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,32,42,41,0],"i8",v);N.l=B([102,97,108,115,101,0],"i8",v);N.ze=B([115,116,97,116,105,99,32,118,111,105,100,32,98,50,74,111,105,110,116,58,58,68,101,115,116,114,111,121,40,98,50,74,111,105,110,116,32,42,44,32,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,32,42,41,0],"i8",v);Ep=B([0,0,0,0,0,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0,228,0,0,0,230,0,0,0,232,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.p=B([98,50,74,111,105,110,116,58,58,98,50,74,111,105,110,116,40,99,111,110,115,116,32,98,50,74,111,105,110,116,68,101,102,32,42,41,0],"i8",v);N.r=B([100,101,102,45,62,98,111,100,121,65,32,33,61,32,100,101,102,45,62,98,111,100,121,66,0],"i8",v);N.Ng=B([47,47,32,68,117,109,112,32,105,115,32,110,111,116,32,115,117,112,112,111,114,116,101,100,32,102,111,114,32,116,104,105,115,32,106,111,105,110,116,32,116,121,112,101,46,10,0],"i8",v);dq=B([0,0,0,0,0,0,0,0,234,0,0,0,236,0,0,0,238,0,0,0,240,0,0,0,242,0,0,0,244,0,0,0,246,0,0,0,248,0,0,0,250,0,0,0,252,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.ca=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,77,111,117,115,101,74,111,105,110,116,46,99,112,112,0],"i8",v);N.ea=B([98,50,77,111,117,115,101,74,111,105,110,116,58,58,98,50,77,111,117,115,101,74,111,105,110,116,40,99,111,110,115,116,32,98,50,77,111,117,115,101,74,111,105,110,116,68,101,102,32,42,41,0],"i8",v);N.pf=B([100,101,102,45,62,116,97,114,103,101,116,46,73,115,86,97,108,105,100,40,41,0],"i8",v);N.dg=B([98,50,73,115,86,97,108,105,100,40,100,101,102,45,62,109,97,120,70,111,114,99,101,41,32,38,38,32,100,101,102,45,62,109,97,120,70,111,114,99,101,32,62,61,32,48,46,48,102,0],"i8",v);N.Og=B([98,50,73,115,86,97,108,105,100,40,100,101,102,45,62,102,114,101,113,117,101,110,99,121,72,122,41,32,38,38,32,100,101,102,45,62,102,114,101,113,117,101,110,99,121,72,122,32,62,61,32,48,46,48,102,0],"i8",v);N.$g=B([98,50,73,115,86,97,108,105,100,40,100,101,102,45,62,100,97,109,112,105,110,103,82,97,116,105,111,41,32,38,38,32,100,101,102,45,62,100,97,109,112,105,110,103,82,97,116,105,111,32,62,61,32,48,46,48,102,0],"i8",v);N.me=B([118,105,114,116,117,97,108,32,118,111,105,100,32,98,50,77,111,117,115,101,74,111,105,110,116,58,58,73,110,105,116,86,101,108,111,99,105,116,121,67,111,110,115,116,114,97,105,110,116,115,40,99,111,110,115,116,32,98,50,83,111,108,118,101,114,68,97,116,97,32,38,41,0],"i8",v);N.jh=B([100,32,43,32,104,32,42,32,107,32,62,32,49,46,49,57,50,48,57,50,57,48,69,45,48,55,70,0],"i8",v);N.qc=B([49,50,98,50,77,111,117,115,101,74,111,105,110,116,0],"i8",v);UM=B(12,"*",v);N.rh=B([77,111,117,115,101,32,106,111,105,110,116,32,100,117,109,112,105,110,103,32,105,115,32,110,111,116,32,115,117,112,112,111,114,116,101,100,46,10,0],"i8",v);eq=B([0,0,0,0,0,0,0,0,254,0,0,0,256,0,0,0,258,0,0,0,260,0,0,0,262,0,0,0,264,0,0,0,266,0,0,0,268,0,0,0,270,0,0,0,272,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.fi=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,80,114,105,115,109,97,116,105,99,74,111,105,110,116,46,99,112,112,0],"i8",v);N.Vh=B([118,111,105,100,32,98,50,80,114,105,115,109,97,116,105,99,74,111,105,110,116,58,58,83,101,116,76,105,109,105,116,115,40,102,108,111,97,116,51,50,44,32,102,108,111,97,116,51,50,41,0],"i8",v);N.eg=B([32,32,98,50,80,114,105,115,109,97,116,105,99,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.$e=B([32,32,106,100,46,108,111,119,101,114,84,114,97,110,115,108,97,116,105,111,110,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.kf=B([32,32,106,100,46,117,112,112,101,114,84,114,97,110,115,108,97,116,105,111,110,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Af=B([32,32,106,100,46,109,97,120,77,111,116,111,114,70,111,114,99,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Bc=B([49,54,98,50,80,114,105,115,109,97,116,105,99,74,111,105,110,116,0],"i8",v);VM=B(12,"*",v);N.Qb=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,80,117,108,108,101,121,74,111,105,110,116,46,99,112,112,0],"i8",v);N.re=B([118,111,105,100,32,98,50,80,117,108,108,101,121,74,111,105,110,116,68,101,102,58,58,73,110,105,116,105,97,108,105,122,101,40,98,50,66,111,100,121,32,42,44,32,98,50,66,111,100,121,32,42,44,32,99,111,110,115,116,32,98,50,86,101,99,50,32,38,44,32,99,111,110,115,116,32,98,50,86,101,99,50,32,38,44,32,99,111,110,115,116,32,98,50,86,101,99,50,32,38,44,32,99,111,110,115,116,32,98,50,86,101,99,50,32,38,44,32,102,108,111,97,116,51,50,41,0],"i8",v);N.qf=B([114,97,116,105,111,32,62,32,49,46,49,57,50,48,57,50,57,48,69,45,48,55,70,0],"i8",v);gq=B([0,0,0,0,0,0,0,0,274,0,0,0,276,0,0,0,278,0,0,0,280,0,0,0,282,0,0,0,284,0,0,0,286,0,0,0,288,0,0,0,290,0,0,0,292,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.oe=B([98,50,80,117,108,108,101,121,74,111,105,110,116,58,58,98,50,80,117,108,108,101,121,74,111,105,110,116,40,99,111,110,115,116,32,98,50,80,117,108,108,101,121,74,111,105,110,116,68,101,102,32,42,41,0],"i8",v);N.fg=B([100,101,102,45,62,114,97,116,105,111,32,33,61,32,48,46,48,102,0],"i8",v);N.Pg=B([32,32,98,50,80,117,108,108,101,121,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.wh=B([32,32,106,100,46,103,114,111,117,110,100,65,110,99,104,111,114,65,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Bh=B([32,32,106,100,46,103,114,111,117,110,100,65,110,99,104,111,114,66,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.af=B([32,32,106,100,46,108,101,110,103,116,104,65,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.lf=B([32,32,106,100,46,108,101,110,103,116,104,66,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Fb=B([32,32,106,100,46,114,97,116,105,111,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.tc=B([49,51,98,50,80,117,108,108,101,121,74,111,105,110,116,0],"i8",v);WM=B(12,"*",v);Ip=B([0,0,0,0,0,0,0,0,294,0,0,0,296,0,0,0,298,0,0,0,300,0,0,0,302,0,0,0,304,0,0,0,306,0,0,0,308,0,0,0,310,0,0,0,312,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.hi=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,82,101,118,111,108,117,116,101,74,111,105,110,116,46,99,112,112,0],"i8",v);N.Uh=B([118,111,105,100,32,98,50,82,101,118,111,108,117,116,101,74,111,105,110,116,58,58,83,101,116,76,105,109,105,116,115,40,102,108,111,97,116,51,50,44,32,102,108,111,97,116,51,50,41,0],"i8",v);N.$h=B([108,111,119,101,114,32,60,61,32,117,112,112,101,114,0],"i8",v);N.gg=B([32,32,98,50,82,101,118,111,108,117,116,101,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.Yb=B([32,32,106,100,46,101,110,97,98,108,101,76,105,109,105,116,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.Ve=B([32,32,106,100,46,108,111,119,101,114,65,110,103,108,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.bf=B([32,32,106,100,46,117,112,112,101,114,65,110,103,108,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.zc=B([49,53,98,50,82,101,118,111,108,117,116,101,74,111,105,110,116,0],"i8",v);XM=B(12,"*",v);Op=B([0,0,0,0,0,0,0,0,314,0,0,0,316,0,0,0,318,0,0,0,320,0,0,0,322,0,0,0,324,0,0,0,326,0,0,0,328,0,0,0,330,0,0,0,332,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Tg=B([32,32,98,50,82,111,112,101,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.sh=B([32,32,106,100,46,109,97,120,76,101,110,103,116,104,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.nc=B([49,49,98,50,82,111,112,101,74,111,105,110,116,0],"i8",v);YM=B(12,"*",v);Mp=B([0,0,0,0,0,0,0,0,334,0,0,0,336,0,0,0,338,0,0,0,340,0,0,0,342,0,0,0,344,0,0,0,346,0,0,0,348,0,0,0,350,0,0,0,352,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Ug=B([32,32,98,50,87,101,108,100,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.$a=B([32,32,106,100,46,114,101,102,101,114,101,110,99,101,65,110,103,108,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.oc=B([49,49,98,50,87,101,108,100,74,111,105,110,116,0],"i8",v);ZM=B(12,"*",v);hq=B([0,0,0,0,0,0,0,0,354,0,0,0,356,0,0,0,358,0,0,0,360,0,0,0,362,0,0,0,364,0,0,0,366,0,0,0,368,0,0,0,370,0,0,0,372,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Wg=B([32,32,98,50,87,104,101,101,108,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.A=B([32,32,106,100,46,98,111,100,121,65,32,61,32,98,111,100,105,101,115,91,37,100,93,59,10,0],"i8",v);N.B=B([32,32,106,100,46,98,111,100,121,66,32,61,32,98,111,100,105,101,115,91,37,100,93,59,10,0],"i8",v);N.C=B([32,32,106,100,46,99,111,108,108,105,100,101,67,111,110,110,101,99,116,101,100,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.K=B([32,32,106,100,46,108,111,99,97,108,65,110,99,104,111,114,65,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.L=B([32,32,106,100,46,108,111,99,97,108,65,110,99,104,111,114,66,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Wb=B([32,32,106,100,46,108,111,99,97,108,65,120,105,115,65,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.ab=B([32,32,106,100,46,101,110,97,98,108,101,77,111,116,111,114,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.bb=B([32,32,106,100,46,109,111,116,111,114,83,112,101,101,100,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Zb=B([32,32,106,100,46,109,97,120,77,111,116,111,114,84,111,114,113,117,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Na=B([32,32,106,100,46,102,114,101,113,117,101,110,99,121,72,122,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Oa=B([32,32,106,100,46,100,97,109,112,105,110,103,82,97,116,105,111,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.z=B([32,32,106,111,105,110,116,115,91,37,100,93,32,61,32,109,95,119,111,114,108,100,45,62,67,114,101,97,116,101,74,111,105,110,116,40,38,106,100,41,59,10,0],"i8",v);N.rc=B([49,50,98,50,87,104,101,101,108,74,111,105,110,116,0],"i8",v);$M=B(12,"*",v);N.ii=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,82,111,112,101,47,98,50,82,111,112,101,46,99,112,112,0],"i8",v);N.Wh=B([118,111,105,100,32,98,50,82,111,112,101,58,58,73,110,105,116,105,97,108,105,122,101,40,99,111,110,115,116,32,98,50,82,111,112,101,68,101,102,32,42,41,0],"i8",v);N.ai=B([100,101,102,45,62,99,111,117,110,116,32,62,61,32,51,0],"i8",v);pu=B(8,"float",v);nu=B(8,["i64",0,0,0,"i32",0,0,0],v);gx=B(8,"float",v);fx=B(8,["i64",0,0,0,"i32",0,0,0],v);kx=B(8,"float",v);jx=B(8,["i64",0,0,0,"i32",0,0,0],v);nx=B(8,"float",v);mx=B(8,["i64",0,0,0,"i32",0,0,0],v);KF=B(8,"float",v);JF=B(8,["i64",0,0,0,"i32",0,0,0],v);vG=B(8,"float",v);uG=B(8,["i64",0,0,0,"i32",0,0,0],v);yG=B(8,"float",v);xG=B(8,["i64",0,0,0,"i32",0,0,0],v);CG=B(8,"float",v);BG=B(8,["i64",0,0,0,"i32",0,0,0],v);FG=B(8,"float",v);EG=B(8,["i64",0,0,0,"i32",0,0,0],v);IG=B(8,"float",v);HG=B(8,["i64",0,0,0,"i32",0,0,0],v);MG=B(8,"float",v);LG=B(8,["i64",0,0,0,"i32",0,0,0],v);xI=B(8,"float",v);wI=B(8,["i64",0,0,0,"i32",0,0,0],v);CI=B(8,"float",v);BI=B(8,["i64",0,0,0,"i32",0,0,0],v);II=B(12,"float",v);HI=B(8,["i64",0,0,0,"i32",0,0,0],v);kK=B(8,"float",v);jK=B(8,["i64",0,0,0,"i32",0,0,0],v);nK=B(8,"float",v);mK=B(8,["i64",0,0,0,"i32",0,0,0],v);B([374,0,0,0,376,0,0,0,378,0,0,0,380,0,0,0,382,0,0,0,384,0,0,0,386,0,0,0,388,0,0,0,390,0,0,0,392,0,0,0,394,0,0,0,396,0,0,0,398,0,0,0,400,0,0,0,402,0,0,0,404,0,0,0,406,0,0,0,408,0,0,0,410,0,0,0,412,0,0,0,414,0,0,0,416,0,0,0,418,0,0,0,420,0,0,0,422,0,0,0,424,0,0,0,426,0,0,0,428,0,0,0,430,0,0,0,432,0,0,0,434,0,0,0,436,0,0,0,438,0,0,0,440,0,0,0,442,0,0,0,444,0,0,0,446,0,0,0,448,0,0,0,450,0,0,0,452,0,0,0,454,0,0,0,456,0,0,0,458,0,0,0,460,0,0,0,462,0,0,0,464,0,0,0,466,0,0,0,468,0,0,0,470,0,0,0,472,0,0,0,474,0,0,0,476,0,0,0,478,0,0,0,480,0,0,0,482,0,0,0,484,0,0,0,486,0,0,0,488,0,0,0,490,0,0,0,492,0,0,0,494,0,0,0,496,0,0,0,498,0,0,0,500,0,0,0,502,0,0,0,504,0,0,0,506,0,0,0,508,0,0,0,510,0,0,0,512,0,0,0,514,0,0,0,516,0,0,0,518,0,0,0,520,0,0,0,522,0,0,0,524,0,0,0,526,0,0,0,528,0,0,0,530,0,0,0,532,0,0,0,534,0,0,0,536,0,0,0,538,0,0,0,540,0,0,0,542,0,0,0,544,0,0,0,546,0,0,0,548,0,0,0,550,0,0,0,552,0,0,0,554,0,0,0,556,0,0,0,558,0,0,0,560,0,0,0,562,0,0,0,564,0,0,0,566,0,0,0,568,0,0,0,570,0,0,0,572,0,0,0,574,0,0,0,576,0,0,0,578,0,0,0,580,0,0,0,582,0,0,0,584,0,0,0,586,0,0,0,588,0,0,0,590,0,0,0,592,0,0,0,594,0,0,0,596,0,0,0,598,0,0,0,600,0,0,0,602,0,0,0,604,0,0,0,606,0,0,0,608,0,0,0,610,0,0,0,612,0,0,0,614,0,0,0,616,0,0,0,618,0,0,0,620,0,0,0,622,0,0,0,624,0,0,0,626,0,0,0,628,0,0,0,630,0,0,0,632,0,0,0,634,0,0,0,636,0,0,0,638,0,0,0,640,0,0,0,642,0,0,0,644,0,0,0,646,0,0,0,648,0,0,0,650,0,0,0,652,0,0,0,654,0,0,0,656,0,0,0,658,0,0,0,660,0,0,0,662,0,0,0,664,0,0,0,666,0,0,0,668,0,0,0,670,0,0,0,672,0,0,0,674,0,0,0,676,0,0,0,678,0,0,0,680,0,0,0,682,0,0,0,684,0,0,0,686,0,0,0,688,0,0,0,690,0,0,0,692,0,0,0,694,0,0,0,696,0,0,0,698,0,0,0,700,0,0,0,702,0,0,0,704,0,0,0,706,0,0,0,708,0,0,0,710,0,0,0,712,0,0,0,714,0,0,0,716,0,0,0,718,0,0,0,720,0,0,0,722,0,0,0,724,0,0,0,726,0,0,0,728,0,0,0,730,0,0,0,732,0,0,0,734,0,0,0,736,0,0,0,738,0,0,0,740,0,0,0,742,0,0,0,744,0,0,0,746,0,0,0,748,0,0,0,750,0,0,0,752,0,0,0,754,0,0,0,756,0,0,0,758,0,0,0,760,0,0,0,762,0,0,0,764,0,0,0,766,0,0,0,768,0,0,0,770,0,0,0,772,0,0,0,774,0,0,0,776,0,0,0,778,0,0,0,780,0,0,0,782,0,0,0,784,0,0,0,786,0,0,0,788,0,0,0,790,0,0,0,792,0,0,0,794,0,0,0,796,0,0,0,798,0,0,0,800,0,0,0,802,0,0,0,804,0,0,0,806,0,0,0,808,0,0,0,810,0,0,0,812,0,0,0,814,0,0,0,816,0,0,0,818,0,0,0,820,0,0,0,822,0,0,0,824,0,0,0,826,0,0,0,828,0,0,0,830,0,0,0,832,0,0,0,834,0,0,0,836,0,0,0,838,0,0,0,840,0,0,0,842,0,0,0,844,0,0,0,846,0,0,0,848,0,0,0,850,0,0,0,852,0,0,0,854,0,0,0,856,0,0,0,858,0,0,0,860,0,0,0,862,0,0,0,864,0,0,0,866,0,0,0,868,0,0,0,870,0,0,0,872,0,0,0,874,0,0,0,876,0,0,0,878,0,0,0,880,0,0,0,882,0,0,0,884,0,0,0,886,0,0,0,888,0,0,0,890,0,0,0,892,0,0,0,894,0,0,0,896,0,0,0,898,0,0,0,900,0,0,0,902,0,0,0,904,0,0,0,906,0,0,0,908,0,0,0,910,0,0,0,912,0,0,0,914,0,0,0,916,0,0,0,918,0,0,0,920,0,0,0,922,0,0,0,924,0,0,0,926,0,0,0,928,0,0,0,930,0,0,0,932,0,0,0,934,0,0,0,936,0,0,0,938,0,0,0,940,0,0,0,942,0,0,0,944,0,0,0,946,0,0,0,948,0,0,0,950,0,0,0,952,0,0,0,954,0,0,0,956,0,0,0,958,0,0,0,960,0,0,0,962,0,0,0,964,0,0,0,966,0,0,0,968,0,0,0,970,0,0,0,972,0,0,0,974,0,0,0,976,0,0,0,978,0,0,0,980,0,0,0,982,0,0,0,984,0,0,0,986,0,0,0,988,0,0,0,990,0,0,0,992,0,0,0,994,0,0,0,996,0,0,0,998,0,0,0,1e3,0,0,0,1002,0,0,0,1004,0,0,0,1006,0,0,0,1008,0,0,0,1010,0,0,0,1012,0,0,0,1014,0,0,0,1016,0,0,0,1018,0,0,0,1020,0,0,0,1022,0,0,0,1024,0,0,0,1026,0,0,0,1028,0,0,0,1030,0,0,0,1032,0,0,0,1034,0,0,0,1036,0,0,0,1038,0,0,0,1040,0,0,0,1042,0,0,0,1044,0,0,0,1046,0,0,0,1048,0,0,0,1050,0,0,0,1052,0,0,0,1054,0,0,0,1056,0,0,0,1058,0,0,0,1060,0,0,0,1062,0,0,0,1064,0,0,0,1066,0,0,0,1068,0,0,0,1070,0,0,0,1072,0,0,0,1074,0,0,0,1076,0,0,0,1078,0,0,0,1080,0,0,0,1082,0,0,0,1084,0,0,0,1086,0,0,0,1088,0,0,0,1090,0,0,0,1092,0,0,0,1094,0,0,0,1096,0,0,0,1098,0,0,0,1100,0,0,0,1102,0,0,0,1104,0,0,0,1106,0,0,0,1108,0,0,0,1110,0,0,0,1112,0,0,0,1114,0,0,0,1116,0,0,0,1118,0,0,0,1120,0,0,0,1122,0,0,0,1124,0,0,0,1126,0,0,0,1128,0,0,0,1130,0,0,0,1132,0,0,0,1134,0,0,0,1136,0,0,0,1138,0,0,0,1140,0,0,0,1142,0,0,0,1144,0,0,0,1146,0,0,0,1148,0,0,0,1150,0,0,0,1152,0,0,0,1154,0,0,0,1156,0,0,0,1158,0,0,0,1160,0,0,0,1162,0,0,0,1164,0,0,0,1166,0,0,0,1168,0,0,0,1170,0,0,0,1172,0,0,0,1174,0,0,0,1176,0,0,0,1178,0,0,0,1180,0,0,0,1182,0,0,0,1184,0,0,0,1186,0,0,0,1188,0,0,0,1190,0,0,0,1192,0,0,0,1194,0,0,0,1196,0,0,0,1198,0,0,0,1200,0,0,0,1202,0,0,0,1204,0,0,0,1206,0,0,0,1208,0,0,0,1210,0,0,0,1212,0,0,0,1214,0,0,0,1216,0,0,0,1218,0,0,0,1220,0,0,0,1222,0,0,0,1224,0,0,0,1226,0,0,0,1228,0,0,0,1230,0,0,0,1232,0,0,0,1234,0,0,0,1236,0,0,0,1238,0,0,0,1240,0,0,0,1242,0,0,0,1244,0,0,0,1246,0,0,0,1248,0,0,0,1250,0,0,0,1252,0,0,0,1254,0,0,0,1256,0,0,0,1258,0,0,0,1260,0,0,0,1262,0,0,0,1264,0,0,0,1266,0,0,0,1268,0,0,0,1270,0,0,0,1272,0,0,0,1274,0,0,0,1276,0,0,0,1278,0,0,0,1280,0,0,0,1282,0,0,0,1284,0,0,0,1286,0,0,0,1288,0,0,0,1290,0,0,0,1292,0,0,0,1294,0,0,0,1296,0,0,0,1298,0,0,0,1300,0,0,0,1302,0,0,0,1304,0,0,0,1306,0,0,0,1308,0,0,0,1310,0,0,0,1312,0,0,0,1314,0,0,0,1316,0,0,0,1318,0,0,0,1320,0,0,0,1322,0,0,0,1324,0,0,0,1326,0,0,0,1328,0,0,0,1330,0,0,0,1332,0,0,0,1334,0,0,0,1336,0,0,0,1338,0,0,0,1340,0,0,0,1342,0,0,0,1344,0,0,0,1346,0,0,0,1348,0,0,0,1350,0,0,0,1352,0,0,0,1354,0,0,0,1356,0,0,0,1358,0,0,0,1360,0,0,0,1362,0,0,0,1364,0,0,0,1366,0,0,0,1368,0,0,0,1370,0,0,0,1372,0,0,0,1374,0,0,0,1376,0,0,0,1378,0,0,0,1380,0,0,0,1382,0,0,0,1384,0,0,0,1386,0,0,0,1388,0,0,0,1390,0,0,0,1392,0,0,0,1394,0,0,0,1396,0,0,0,1398,0,0,0,1400,0,0,0,1402,0,0,0,1404,0,0,0,1406,0,0,0,1408,0,0,0,1410,0,0,0,1412,0,0,0,1414,0,0,0,1416,0,0,0,1418,0,0,0,1420,0,0,0,1422,0,0,0,1424,0,0,0,1426,0,0,0,1428,0,0,0,1430,0,0,0,1432,0,0,0,1434,0,0,0,1436,0,0,0,1438,0,0,0,1440,0,0,0,1442,0,0,0,1444,0,0,0,1446,0,0,0,1448,0,0,0,1450,0,0,0,1452,0,0,0,1454,0,0,0,1456,0,0,0,1458,0,0,0,1460,0,0,0,1462,0,0,0,1464,0,0,0,1466,0,0,0,1468,0,0,0,1470,0,0,0,1472,0,0,0,1474,0,0,0,1476,0,0,0,1478,0,0,0,1480,0,0,0,1482,0,0,0,1484,0,0,0,1486,0,0,0,1488,0,0,0,1490,0,0,0,1492,0,0,0,1494,0,0,0,1496,0,0,0,1498,0,0,0,1500,0,0,0,1502,0,0,0,1504,0,0,0,1506,0,0,0,1508,0,0,0,1510,0,0,0,1512,0,0,0,1514,0,0,0,1516,0,0,0,1518,0,0,0,1520,0,0,0,1522,0,0,0,1524,0,0,0,1526,0,0,0,1528,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);N.Qc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);aN=B(12,"*",v);N.Sc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);bN=B(12,"*",v);N.$c=B([78,83,116,51,95,95,49,57,110,117,108,108,112,116,114,95,116,69,0],"i8",v);cN=B(8,"*",v);N.Uc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,57,95,95,112,111,105,110,116,101,114,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);N.Tc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,112,98,97,115,101,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);dN=B(12,"*",v);eN=B(12,"*",v);fN=B([0,0,0,0,0,0,0,0,1530,0,0,0,1532,0,0,0,102,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);KL=B([0,0,0,0,0,0,0,0,1530,0,0,0,1534,0,0,0,1536,0,0,0,1538,0,0,0,1540,0,0,0,1542,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);gN=B([0,0,0,0,0,0,0,0,1530,0,0,0,1544,0,0,0,1546,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);hN=B([0,0,0,0,0,0,0,0,1530,0,0,0,1548,0,0,0,1550,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Yc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,50,51,95,95,102,117,110,100,97,109,101,110,116,97,108,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);iN=B(12,"*",v);N.de=B([118,0],"i8",v);jN=B(8,"*",v);N.Ld=B([80,118,0],"i8",v);kN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ud=B([80,75,118,0],"i8",v);lN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Nc=B([68,110,0],"i8",v);mN=B(8,"*",v);N.bd=B([80,68,110,0],"i8",v);nN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ed=B([80,75,68,110,0],"i8",v);oN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Sd=B([98,0],"i8",v);pN=B(8,"*",v);N.zd=B([80,98,0],"i8",v);qN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.hd=B([80,75,98,0],"i8",v);rN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ee=B([119,0],"i8",v);sN=B(8,"*",v);N.Md=B([80,119,0],"i8",v);tN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.vd=B([80,75,119,0],"i8",v);uN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Td=B([99,0],"i8",v);vN=B(8,"*",v);N.Ad=B([80,99,0],"i8",v);wN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.jd=B([80,75,99,0],"i8",v);xN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Xd=B([104,0],"i8",v);yN=B(8,"*",v);N.Ed=B([80,104,0],"i8",v);zN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.nd=B([80,75,104,0],"i8",v);AN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Rd=B([97,0],"i8",v);BN=B(8,"*",v);N.yd=B([80,97,0],"i8",v);CN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.gd=B([80,75,97,0],"i8",v);DN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.be=B([115,0],"i8",v);EN=B(8,"*",v);N.Jd=B([80,115,0],"i8",v);FN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.sd=B([80,75,115,0],"i8",v);GN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ce=B([116,0],"i8",v);HN=B(8,"*",v);N.Kd=B([80,116,0],"i8",v);IN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.td=B([80,75,116,0],"i8",v);JN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Yd=B([105,0],"i8",v);KN=B(8,"*",v);N.Fd=B([80,105,0],"i8",v);LN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.od=B([80,75,105,0],"i8",v);MN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Zd=B([106,0],"i8",v);NN=B(8,"*",v);N.Gd=B([80,106,0],"i8",v);ON=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.pd=B([80,75,106,0],"i8",v);PN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.$d=B([108,0],"i8",v);QN=B(8,"*",v);N.Hd=B([80,108,0],"i8",v);RN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.qd=B([80,75,108,0],"i8",v);SN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ae=B([109,0],"i8",v);TN=B(8,"*",v);N.Id=B([80,109,0],"i8",v);UN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.rd=B([80,75,109,0],"i8",v);VN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.fe=B([120,0],"i8",v);WN=B(8,"*",v);N.Nd=B([80,120,0],"i8",v);XN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.wd=B([80,75,120,0],"i8",v);YN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ge=B([121,0],"i8",v);ZN=B(8,"*",v);N.Od=B([80,121,0],"i8",v);$N=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.xd=B([80,75,121,0],"i8",v);aO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Wd=B([102,0],"i8",v);bO=B(8,"*",v);N.Dd=B([80,102,0],"i8",v);cO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.md=B([80,75,102,0],"i8",v);dO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Ud=B([100,0],"i8",v);eO=B(8,"*",v);N.Bd=B([80,100,0],"i8",v);fO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.kd=B([80,75,100,0],"i8",v);gO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Vd=B([101,0],"i8",v);hO=B(8,"*",v);N.Cd=B([80,101,0],"i8",v);iO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ld=B([80,75,101,0],"i8",v);jO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Oc=B([68,115,0],"i8",v);kO=B(8,"*",v);N.cd=B([80,68,115,0],"i8",v);lO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.fd=B([80,75,68,115,0],"i8",v);mO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Mc=B([68,105,0],"i8",v);nO=B(8,"*",v);N.ad=B([80,68,105,0],"i8",v);oO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.dd=B([80,75,68,105,0],"i8",v);pO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);qO=B([0,0,0,0,0,0,0,0,1530,0,0,0,1552,0,0,0,1554,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Rc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,97,114,114,97,121,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);rO=B(12,"*",v);sO=B([0,0,0,0,0,0,0,0,1530,0,0,0,1556,0,0,0,1558,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Vc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,102,117,110,99,116,105,111,110,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);tO=B(12,"*",v);uO=B([0,0,0,0,0,0,0,0,1530,0,0,0,1560,0,0,0,1562,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Pc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,101,110,117,109,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);vO=B(12,"*",v);LL=B([0,0,0,0,0,0,0,0,1530,0,0,0,1564,0,0,0,1536,0,0,0,1566,0,0,0,1568,0,0,0,1570,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Wc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);wO=B(12,"*",v);xO=B([0,0,0,0,0,0,0,0,1530,0,0,0,1572,0,0,0,1536,0,0,0,1574,0,0,0,1576,0,0,0,1578,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Xc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,50,49,95,95,118,109,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);yO=B(12,"*",v);JL=B([0,0,0,0,0,0,0,0,1530,0,0,0,1580,0,0,0,1582,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);zO=B([0,0,0,0,0,0,0,0,1530,0,0,0,1584,0,0,0,1546,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Zc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,50,57,95,95,112,111,105,110,116,101,114,95,116,111,95,109,101,109,98,101,114,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);AO=B(12,"*",v);Y=B(468,["i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0,"i32",0,0,0],v);BL=B(24,"i32",v);N.gi=B([109,97,120,32,115,121,115,116,101,109,32,98,121,116,101,115,32,61,32,37,49,48,108,117,10,0],"i8",v);N.Zh=B([115,121,115,116,101,109,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0],"i8",v);N.ci=B([105,110,32,117,115,101,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0],"i8",v);B(1,"i8",v);FL=B(4,"void ()*",v);GL=B([0,0,0,0,0,0,0,0,32,0,0,0,1586,0,0,0,1588,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Qg=B([115,116,100,58,58,98,97,100,95,97,108,108,111,99,0],"i8",v);BO=B([0,0,0,0,0,0,0,0,32,0,0,0,1590,0,0,0,1592,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.uf=B([98,97,100,95,97,114,114,97,121,95,110,101,119,95,108,101,110,103,116,104,0],"i8",v);N.Qd=B([83,116,57,98,97,100,95,97,108,108,111,99,0],"i8",v);HL=B(12,"*",v);N.Pd=B([83,116,50,48,98,97,100,95,97,114,114,97,121,95,110,101,119,95,108,101,110,103,116,104,0],"i8",v);CO=B(12,"*",v);l[zy+4>>2]=rM;l[qM>>2]=KL+8|0;l[qM+4>>2]=N.Kc|0;l[rM>>2]=LL+8|0;l[rM+4>>2]=N.pc|0;l[rM+8>>2]=qM;l[Xw+4>>2]=sM;l[sM>>2]=LL+8|0;l[sM+4>>2]=N.sc|0;l[sM+8>>2]=qM;l[yF+4>>2]=tM;l[tM>>2]=LL+8|0;l[tM+4>>2]=N.lc|0;l[tM+8>>2]=qM;l[pF+4>>2]=uM;l[uM>>2]=LL+8|0;l[uM+4>>2]=N.uc|0;l[uM+8>>2]=qM;l[vM+4>>2]=wM;l[wM>>2]=KL+8|0;l[wM+4>>2]=N.Ic|0;l[yp>>2]=yM+8|0;l[zp>>2]=zx+8|0;l[zx+4>>2]=xM;l[xM>>2]=KL+8|0;l[xM+4>>2]=N.Cc|0;l[yM+4>>2]=zM;l[zM>>2]=KL+8|0;l[zM+4>>2]=N.wc|0;l[AM+4>>2]=CM;l[BM>>2]=KL+8|0;l[BM+4>>2]=N.Lc|0;l[CM>>2]=LL+8|0;l[CM+4>>2]=N.Ec|0;l[CM+8>>2]=BM;l[DM+4>>2]=EM;l[EM>>2]=LL+8|0;l[EM+4>>2]=N.Gc|0;l[EM+8>>2]=BM;l[FM+4>>2]=GM;l[GM>>2]=LL+8|0;l[GM+4>>2]=N.vc|0;l[GM+8>>2]=BM;l[HM+4>>2]=BM;l[IM+4>>2]=JM;l[JM>>2]=LL+8|0;l[JM+4>>2]=N.Dc|0;l[JM+8>>2]=BM;l[KM+4>>2]=LM;l[LM>>2]=LL+8|0;l[LM+4>>2]=N.Fc|0;l[LM+8>>2]=BM;l[MM+4>>2]=NM;l[NM>>2]=LL+8|0;l[NM+4>>2]=N.Hc|0;l[NM+8>>2]=BM;l[OM+4>>2]=PM;l[PM>>2]=LL+8|0;l[PM+4>>2]=N.Ac|0;l[PM+8>>2]=BM;l[Fp+4>>2]=RM;l[QM>>2]=KL+8|0;l[QM+4>>2]=N.Jc|0;l[RM>>2]=LL+8|0;l[RM+4>>2]=N.xc|0;l[RM+8>>2]=QM;l[Np+4>>2]=SM;l[SM>>2]=LL+8|0;l[SM+4>>2]=N.yc|0;l[SM+8>>2]=QM;l[cq+4>>2]=TM;l[TM>>2]=LL+8|0;l[TM+4>>2]=N.mc|0;l[TM+8>>2]=QM;l[Ep+4>>2]=QM;l[dq+4>>2]=UM;l[UM>>2]=LL+8|0;l[UM+4>>2]=N.qc|0;l[UM+8>>2]=QM;l[eq+4>>2]=VM;l[VM>>2]=LL+8|0;l[VM+4>>2]=N.Bc|0;l[VM+8>>2]=QM;l[gq+4>>2]=WM;l[WM>>2]=LL+8|0;l[WM+4>>2]=N.tc|0;l[WM+8>>2]=QM;l[Ip+4>>2]=XM;l[XM>>2]=LL+8|0;l[XM+4>>2]=N.zc|0;l[XM+8>>2]=QM;l[Op+4>>2]=YM;l[YM>>2]=LL+8|0;l[YM+4>>2]=N.nc|0;l[YM+8>>2]=QM;l[Mp+4>>2]=ZM;l[ZM>>2]=LL+8|0;l[ZM+4>>2]=N.oc|0;l[ZM+8>>2]=QM;l[hq+4>>2]=$M;l[$M>>2]=LL+8|0;l[$M+4>>2]=N.rc|0;l[$M+8>>2]=QM;l[aN>>2]=LL+8|0;l[aN+4>>2]=N.Qc|0;l[aN+8>>2]=Ha;l[bN>>2]=LL+8|0;l[bN+4>>2]=N.Sc|0;l[bN+8>>2]=aN;l[cN>>2]=KL+8|0;l[cN+4>>2]=N.$c|0;l[dN>>2]=LL+8|0;l[dN+4>>2]=N.Tc|0;l[dN+8>>2]=aN;l[eN>>2]=LL+8|0;l[eN+4>>2]=N.Uc|0;l[eN+8>>2]=dN;l[fN+4>>2]=aN;l[KL+4>>2]=bN;l[gN+4>>2]=dN;l[hN+4>>2]=iN;l[iN>>2]=LL+8|0;l[iN+4>>2]=N.Yc|0;l[iN+8>>2]=aN;l[jN>>2]=hN+8|0;l[jN+4>>2]=N.de|0;l[kN>>2]=JL+8|0;l[kN+4>>2]=N.Ld|0;l[kN+12>>2]=jN;l[lN>>2]=JL+8|0;l[lN+4>>2]=N.ud|0;l[lN+12>>2]=jN;l[mN>>2]=hN+8|0;l[mN+4>>2]=N.Nc|0;l[nN>>2]=JL+8|0;l[nN+4>>2]=N.bd|0;l[nN+12>>2]=mN;l[oN>>2]=JL+8|0;l[oN+4>>2]=N.ed|0;l[oN+12>>2]=mN;l[pN>>2]=hN+8|0;l[pN+4>>2]=N.Sd|0;l[qN>>2]=JL+8|0;l[qN+4>>2]=N.zd|0;l[qN+12>>2]=pN;l[rN>>2]=JL+8|0;l[rN+4>>2]=N.hd|0;l[rN+12>>2]=pN;l[sN>>2]=hN+8|0;l[sN+4>>2]=N.ee|0;l[tN>>2]=JL+8|0;l[tN+4>>2]=N.Md|0;l[tN+12>>2]=sN;l[uN>>2]=JL+8|0;l[uN+4>>2]=N.vd|0;l[uN+12>>2]=sN;l[vN>>2]=hN+8|0;l[vN+4>>2]=N.Td|0;l[wN>>2]=JL+8|0;l[wN+4>>2]=N.Ad|0;l[wN+12>>2]=vN;l[xN>>2]=JL+8|0;l[xN+4>>2]=N.jd|0;l[xN+12>>2]=vN;l[yN>>2]=hN+8|0;l[yN+4>>2]=N.Xd|0;l[zN>>2]=JL+8|0;l[zN+4>>2]=N.Ed|0;l[zN+12>>2]=yN;l[AN>>2]=JL+8|0;l[AN+4>>2]=N.nd|0;l[AN+12>>2]=yN;l[BN>>2]=hN+8|0;l[BN+4>>2]=N.Rd|0;l[CN>>2]=JL+8|0;l[CN+4>>2]=N.yd|0;l[CN+12>>2]=BN;l[DN>>2]=JL+8|0;l[DN+4>>2]=N.gd|0;l[DN+12>>2]=BN;l[EN>>2]=hN+8|0;l[EN+4>>2]=N.be|0;l[FN>>2]=JL+8|0;l[FN+4>>2]=N.Jd|0;l[FN+12>>2]=EN;l[GN>>2]=JL+8|0;l[GN+4>>2]=N.sd|0;l[GN+12>>2]=EN;l[HN>>2]=hN+8|0;l[HN+4>>2]=N.ce|0;l[IN>>2]=JL+8|0;l[IN+4>>2]=N.Kd|0;l[IN+12>>2]=HN;l[JN>>2]=JL+8|0;l[JN+4>>2]=N.td|0;l[JN+12>>2]=HN;l[KN>>2]=hN+8|0;l[KN+4>>2]=N.Yd|0;l[LN>>2]=JL+8|0;l[LN+4>>2]=N.Fd|0;l[LN+12>>2]=KN;l[MN>>2]=JL+8|0;l[MN+4>>2]=N.od|0;l[MN+12>>2]=KN;l[NN>>2]=hN+8|0;l[NN+4>>2]=N.Zd|0;l[ON>>2]=JL+8|0;l[ON+4>>2]=N.Gd|0;l[ON+12>>2]=NN;l[PN>>2]=JL+8|0;l[PN+4>>2]=N.pd|0;l[PN+12>>2]=NN;l[QN>>2]=hN+8|0;l[QN+4>>2]=N.$d|0;l[RN>>2]=JL+8|0;l[RN+4>>2]=N.Hd|0;l[RN+12>>2]=QN;l[SN>>2]=JL+8|0;l[SN+4>>2]=N.qd|0;l[SN+12>>2]=QN;l[TN>>2]=hN+8|0;l[TN+4>>2]=N.ae|0;l[UN>>2]=JL+8|0;l[UN+4>>2]=N.Id|0;l[UN+12>>2]=TN;l[VN>>2]=JL+8|0;l[VN+4>>2]=N.rd|0;l[VN+12>>2]=TN;l[WN>>2]=hN+8|0;l[WN+4>>2]=N.fe|0;l[XN>>2]=JL+8|0;l[XN+4>>2]=N.Nd|0;l[XN+12>>2]=WN;l[YN>>2]=JL+8|0;l[YN+4>>2]=N.wd|0;l[YN+12>>2]=WN;l[ZN>>2]=hN+8|0;l[ZN+4>>2]=N.ge|0;l[$N>>2]=JL+8|0;l[$N+4>>2]=N.Od|0;l[$N+12>>2]=ZN;l[aO>>2]=JL+8|0;l[aO+4>>2]=N.xd|0;l[aO+12>>2]=ZN;l[bO>>2]=hN+8|0;l[bO+4>>2]=N.Wd|0;l[cO>>2]=JL+8|0;l[cO+4>>2]=N.Dd|0;l[cO+12>>2]=bO;l[dO>>2]=JL+8|0;l[dO+4>>2]=N.md|0;l[dO+12>>2]=bO;l[eO>>2]=hN+8|0;l[eO+4>>2]=N.Ud|0;l[fO>>2]=JL+8|0;l[fO+4>>2]=N.Bd|0;l[fO+12>>2]=eO;l[gO>>2]=JL+8|0;l[gO+4>>2]=N.kd|0;l[gO+12>>2]=eO;l[hO>>2]=hN+8|0;l[hO+4>>2]=N.Vd|0;l[iO>>2]=JL+8|0;l[iO+4>>2]=N.Cd|0;l[iO+12>>2]=hO;l[jO>>2]=JL+8|0;l[jO+4>>2]=N.ld|0;l[jO+12>>2]=hO;l[kO>>2]=hN+8|0;l[kO+4>>2]=N.Oc|0;l[lO>>2]=JL+8|0;l[lO+4>>2]=N.cd|0;l[lO+12>>2]=kO;l[mO>>2]=JL+8|0;l[mO+4>>2]=N.fd|0;l[mO+12>>2]=kO;l[nO>>2]=hN+8|0;l[nO+4>>2]=N.Mc|0;l[oO>>2]=JL+8|0;l[oO+4>>2]=N.ad|0;l[oO+12>>2]=nO;l[pO>>2]=JL+8|0;l[pO+4>>2]=N.dd|0;l[pO+12>>2]=nO;l[qO+4>>2]=rO;l[rO>>2]=LL+8|0;l[rO+4>>2]=N.Rc|0;l[rO+8>>2]=aN;l[sO+4>>2]=tO;l[tO>>2]=LL+8|0;l[tO+4>>2]=N.Vc|0;l[tO+8>>2]=aN;l[uO+4>>2]=vO;l[vO>>2]=LL+8|0;l[vO+4>>2]=N.Pc|0;l[vO+8>>2]=aN;l[LL+4>>2]=wO;l[wO>>2]=LL+8|0;l[wO+4>>2]=N.Wc|0;l[wO+8>>2]=bN;l[xO+4>>2]=yO;l[yO>>2]=LL+8|0;l[yO+4>>2]=N.Xc|0;l[yO+8>>2]=bN;l[JL+4>>2]=eN;l[zO+4>>2]=AO;l[AO>>2]=LL+8|0;l[AO+4>>2]=N.Zc|0;l[AO+8>>2]=dN;l[GL+4>>2]=HL;l[BO+4>>2]=CO;l[HL>>2]=LL+8|0;l[HL+4>>2]=N.Qd|0;l[HL+8>>2]=Ha;l[CO>>2]=LL+8|0;l[CO+4>>2]=N.Pd|0;l[CO+8>>2]=HL;K=[0,0,(function(b,d){var e=l[b>>2],f=l[d>>2];return(e|0)<(f|0)?1:(e|0)!=(f|0)?0:(l[b+4>>2]|0)<(l[d+4>>2]|0)}),0,(function(b,d,e,f,g){d=qn(g,144);f=d>>2;if(0!=(d|0)){l[d>>2]=HM+8|0;l[f+1]=4;l[f+12]=b;var h=d+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var g=(d+8|0)>>2,j=g+10;g<j;g++){l[g]=0}g=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[f+34]=g;g=q[b+20>>2];j=q[e+20>>2];q[f+35]=g>j?g:j;l[d>>2]=FM+8|0;0==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.va|0,44,N.fa|0,N.Cb|0),b=l[h>>2]);0!=(l[l[b+12>>2]+4>>2]|0)&&P(N.va|0,45,N.fa|0,N.I|0);h=d}return h|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){d=qn(g,144);f=d>>2;if(0!=(d|0)){l[d>>2]=HM+8|0;l[f+1]=4;l[f+12]=b;var h=d+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var g=(d+8|0)>>2,j=g+10;g<j;g++){l[g]=0}g=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[f+34]=g;g=q[b+20>>2];j=q[e+20>>2];q[f+35]=g>j?g:j;l[d>>2]=MM+8|0;2==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.ya|0,41,N.la|0,N.sa|0),b=l[h>>2]);0!=(l[l[b+12>>2]+4>>2]|0)&&P(N.ya|0,42,N.la|0,N.I|0);h=d}return h|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){d=qn(g,144);f=d>>2;if(0!=(d|0)){l[d>>2]=HM+8|0;l[f+1]=4;l[f+12]=b;var h=d+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var g=(d+8|0)>>2,j=g+10;g<j;g++){l[g]=0}g=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[f+34]=g;g=q[b+20>>2];j=q[e+20>>2];q[f+35]=g>j?g:j;l[d>>2]=OM+8|0;2==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.za|0,44,N.ga|0,N.sa|0),b=l[h>>2]);2!=(l[l[b+12>>2]+4>>2]|0)&&P(N.za|0,45,N.ga|0,N.T|0);h=d}return h|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){d=qn(g,144);f=d>>2;if(0!=(d|0)){l[d>>2]=HM+8|0;l[f+1]=4;l[f+12]=b;var h=d+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var g=(d+8|0)>>2,j=g+10;g<j;g++){l[g]=0}g=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[f+34]=g;g=q[b+20>>2];j=q[e+20>>2];q[f+35]=g>j?g:j;l[d>>2]=IM+8|0;1==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.wa|0,41,N.ha|0,N.ra|0),b=l[h>>2]);0!=(l[l[b+12>>2]+4>>2]|0)&&P(N.wa|0,42,N.ha|0,N.I|0);h=d}return h|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){d=qn(g,144);f=d>>2;if(0!=(d|0)){l[d>>2]=HM+8|0;l[f+1]=4;l[f+12]=b;var h=d+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var g=(d+8|0)>>2,j=g+10;g<j;g++){l[g]=0}g=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[f+34]=g;g=q[b+20>>2];j=q[e+20>>2];q[f+35]=g>j?g:j;l[d>>2]=KM+8|0;1==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.xa|0,41,N.ja|0,N.ra|0),b=l[h>>2]);2!=(l[l[b+12>>2]+4>>2]|0)&&P(N.xa|0,42,N.ja|0,N.T|0);h=d}return h|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){var h,g=qn(g,144);h=g>>2;if(0==(g|0)){b=0}else{l[g>>2]=HM+8|0;l[h+1]=4;l[h+12]=b;var j=g+52|0;l[j>>2]=e;l[h+14]=d;l[h+15]=f;l[h+31]=0;l[h+32]=0;d=(g+8|0)>>2;for(f=d+10;d<f;d++){l[d]=0}d=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[h+34]=d;d=q[b+20>>2];f=q[e+20>>2];q[h+35]=d>f?d:f;l[g>>2]=AM+8|0;3==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.ta|0,43,N.ia|0,N.qa|0),b=l[j>>2]);0!=(l[l[b+12>>2]+4>>2]|0)&&P(N.ta|0,44,N.ia|0,N.I|0);b=g}return b|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){var h,g=qn(g,144);h=g>>2;if(0==(g|0)){b=0}else{l[g>>2]=HM+8|0;l[h+1]=4;l[h+12]=b;var j=g+52|0;l[j>>2]=e;l[h+14]=d;l[h+15]=f;l[h+31]=0;l[h+32]=0;d=(g+8|0)>>2;for(f=d+10;d<f;d++){l[d]=0}d=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[h+34]=d;d=q[b+20>>2];f=q[e+20>>2];q[h+35]=d>f?d:f;l[g>>2]=DM+8|0;3==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.ua|0,43,N.ka|0,N.qa|0),b=l[j>>2]);2!=(l[l[b+12>>2]+4>>2]|0)&&P(N.ua|0,44,N.ka|0,N.T|0);b=g}return b|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b){Ha(b|0)}),0,(function(b){l[b>>2]=zy+8|0;var d=b+12|0;Dh(l[d>>2]);l[d>>2]=0;l[b+16>>2]=0}),0,(function(b){l[b>>2]=zy+8|0;var d=b+12|0;Dh(l[d>>2]);l[d>>2]=0;l[b+16>>2]=0;Ls(b)}),0,(function(b,d){var e,f=qn(d,40);e=f>>2;0==(f|0)?e=0:(l[e]=zy+8|0,l[e+1]=3,q[e+2]=.009999999776482582,l[e+3]=0,l[e+4]=0,c[f+36|0]=0,c[f+37|0]=0,e=f);var f=l[b+12>>2],g=l[b+16>>2],h=e+12|0;6==(0==(l[h>>2]|0)?0==(l[e+16>>2]|0)?7:6:6)&&P(N.F|0,48,N.da|0,N.Sa|0);1<(g|0)||P(N.F|0,49,N.da|0,N.Pb|0);var j=e+16|0;l[j>>2]=g;g=Ne(g<<3);l[h>>2]=g;Ch(g,f,l[j>>2]<<3);f=e+36|0;c[f]=0;h=e+37|0;c[h]=0;var j=b+20|0,g=e+20|0,k=l[j+4>>2];l[g>>2]=l[j>>2];l[g+4>>2]=k;j=b+28|0;g=e+28|0;k=l[j+4>>2];l[g>>2]=l[j>>2];l[g+4>>2]=k;c[f]=c[b+36|0]&1;c[h]=c[b+37|0]&1;return e|0}),0,(function(b){return l[b+16>>2]-1|0}),0,Lb(0),0,(function(b,d,e,f,g){var h,j=a;a+=48;h=j>>2;var k=b+16|0,m=l[k>>2];(m|0)>(g|0)?k=m:(P(N.F|0,129,N.Ie|0,N.Ub|0),k=l[k>>2]);l[h]=yF+8|0;l[h+1]=1;q[h+2]=.009999999776482582;h=j+28|0;l[h>>2]=0;l[h+4>>2]=0;l[h+8>>2]=0;l[h+12>>2]=0;i[h+16>>1]=0;h=g+1|0;var b=l[b+12>>2],g=(g<<3)+b|0,m=j+12|0,n=l[g+4>>2];l[m>>2]=l[g>>2];l[m+4>>2]=n;k=(((h|0)==(k|0)?0:h)<<3)+b|0;g=j+20|0;b=l[k+4>>2];l[g>>2]=l[k>>2];l[g+4>>2]=b;d=Vm(j,d,e,f);a=j;return d}),0,(function(b,d,e,f){var g,h=b+16|0,j=l[h>>2];(j|0)>(f|0)?h=j:(P(N.F|0,148,N.Ge|0,N.Ub|0),h=l[h>>2]);j=f+1|0;j=(j|0)==(h|0)?0:j;g=l[b+12>>2]>>2;var b=q[e+12>>2],k=q[(f<<3>>2)+g],h=q[e+8>>2],m=q[((f<<3)+4>>2)+g],n=q[e>>2],f=b*k-h*m+n,p=q[e+4>>2],e=h*k+b*m+p,k=q[(j<<3>>2)+g];g=q[((j<<3)+4>>2)+g];j=b*k-h*g+n;b=h*k+b*g+p;h=(M[0]=f<j?f:j,t[0]);g=(M[0]=e<b?e:b,t[0])|0;l[d>>2]=0|h;l[d+4>>2]=g;d=d+8|0;f=(M[0]=f>j?f:j,t[0]);e=(M[0]=e>b?e:b,t[0])|0;l[d>>2]=0|f;l[d+4>>2]=e}),0,(function(b,d){var e;e=d>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f=qn(d,20);0==(f|0)?e=0:(l[f>>2]=Xw+8|0,e=(f+4|0)>>2,l[e]=0,l[e+1]=0,l[e+2]=0,l[e+3]=0,e=f);l[e+4>>2]=l[b+4>>2];q[e+8>>2]=q[b+8>>2];var f=b+12|0,g=e+12|0,h=l[f+4>>2];l[g>>2]=l[f>>2];l[g+4>>2]=h;return e|0}),0,Lb(1),0,(function(b,d,e){var f=q[d+12>>2],g=q[b+12>>2],h=q[d+8>>2],j=q[b+16>>2],k=q[e>>2]-(q[d>>2]+(f*g-h*j)),d=q[e+4>>2]-(q[d+4>>2]+h*g+f*j),b=q[b+8>>2];return k*k+d*d<=b*b}),0,(function(b,d,e,f){var g=e>>2,h=q[f+12>>2],j=q[b+12>>2],k=q[f+8>>2],m=q[b+16>>2],n=q[g],e=n-(q[f>>2]+(h*j-k*m)),p=q[g+1],f=p-(q[f+4>>2]+k*j+h*m),h=q[b+8>>2],b=q[g+2]-n,p=q[g+3]-p,j=e*b+f*p,n=b*b+p*p,h=j*j-n*(e*e+f*f-h*h);0>h|1.1920928955078125e-7>n?d=0:(h=Fh(h),h=j+h,j=-h,0<h?d=0:q[g+4]*n<j?d=0:(g=j/n,q[d+8>>2]=g,e+=b*g,g=f+p*g,f=(M[0]=e,t[0]),b=(M[0]=g,t[0])|0,l[d>>2]=0|f,l[d+4>>2]=b,f=Fh(e*e+g*g),1.1920928955078125e-7>f||(f=1/f,q[d>>2]=e*f,q[(d+4|0)>>2]=g*f),d=1));return d}),0,(function(b,d,e){var f=q[e+12>>2],g=q[b+12>>2],h=q[e+8>>2],j=q[b+16>>2],k=q[e>>2]+(f*g-h*j),e=q[e+4>>2]+h*g+f*j,b=b+8|0,f=q[b>>2];q[d>>2]=k-f;q[d+4>>2]=e-f;b=q[b>>2];q[d+8>>2]=k+b;q[d+12>>2]=e+b}),0,(function(b,d,e){var f=b+8|0,g=q[f>>2],e=3.1415927410125732*e*g*g;q[d>>2]=e;var g=b+12|0,h=d+4|0,j=l[g+4>>2];l[h>>2]=l[g>>2];l[h+4>>2]=j;f=q[f>>2];g=q[g>>2];b=q[b+16>>2];q[d+12>>2]=e*(.5*f*f+g*g+b*b)}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f=qn(d,48);e=f>>2;0==(f|0)?f=0:(l[e]=yF+8|0,l[e+1]=1,q[e+2]=.009999999776482582,e=f+28|0,l[e>>2]=0,l[e+4>>2]=0,l[e+8>>2]=0,l[e+12>>2]=0,i[e+16>>1]=0);l[f+4>>2]=l[b+4>>2];q[f+8>>2]=q[b+8>>2];e=b+12|0;var g=f+12|0,h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;e=b+20|0;g=f+20|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;e=b+28|0;g=f+28|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;e=b+36|0;g=f+36|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;c[f+44|0]=c[b+44|0]&1;c[f+45|0]=c[b+45|0]&1;return f|0}),0,Lb(1),0,Lb(0),0,Vm,0,(function(b,d,e){var f=b>>2,g=q[e+12>>2],h=q[f+3],j=q[e+8>>2],k=q[f+4],m=q[e>>2],b=g*h-j*k+m,n=q[e+4>>2],e=j*h+g*k+n,h=q[f+5],k=q[f+6],m=g*h-j*k+m,g=j*h+g*k+n,f=q[f+2],j=(M[0]=(b<m?b:m)-f,t[0]),n=(M[0]=(e<g?e:g)-f,t[0])|0;l[d>>2]=0|j;l[d+4>>2]=n;e=(e>g?e:g)+f;d=d+8|0;b=(M[0]=(b>m?b:m)+f,t[0]);m=(M[0]=e,t[0])|0;l[d>>2]=0|b;l[d+4>>2]=m}),0,(function(b,d){q[d>>2]=0;var e=.5*(q[b+16>>2]+q[b+24>>2]),f=d+4|0,g=(M[0]=.5*(q[b+12>>2]+q[b+20>>2]),t[0]),e=(M[0]=e,t[0])|0;l[f>>2]=0|g;l[f+4>>2]=e;q[d+12>>2]=0}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f=qn(d,152);e=f>>2;0==(f|0)?f=0:(l[e]=pF+8|0,l[e+1]=2,q[e+2]=.009999999776482582,l[e+37]=0,q[e+3]=0,q[e+4]=0);e=f>>2;l[e+1]=l[b+4>>2];q[e+2]=q[b+8>>2];var g=b+12|0,h=f+12|0,j=l[g+4>>2];l[h>>2]=l[g>>2];l[h+4>>2]=j;g=(b+20|0)>>2;h=(f+20|0)>>2;for(j=g+16;g<j;g++,h++){l[h]=l[g]}g=(b+84|0)>>2;h=(f+84|0)>>2;for(j=g+16;g<j;g++,h++){l[h]=l[g]}l[e+37]=l[b+148>>2];return f|0}),0,Lb(1),0,(function(b,d,e){for(var b=b>>2,f=q[e>>2]-q[d>>2],e=q[e+4>>2]-q[d+4>>2],g=q[d+12>>2],h=q[d+8>>2],d=g*f+h*e,f=f*-h+g*e,e=l[b+37],g=0;;){if((g|0)>=(e|0)){var j=1;break}if(0<q[((g<<3)+84>>2)+b]*(d-q[((g<<3)+20>>2)+b])+q[((g<<3)+88>>2)+b]*(f-q[((g<<3)+24>>2)+b])){j=0;break}g=g+1|0}return j}),0,(function(b,d,e,f){var g=e>>2,b=b>>2,h=q[f>>2],j=q[g]-h,k=q[f+4>>2],m=q[g+1]-k,e=f+12|0,n=q[e>>2],f=f+8|0,p=q[f>>2],u=n*j+p*m,r=-p,j=j*r+n*m,h=q[g+2]-h,m=q[g+3]-k,k=n*h+p*m-u,n=h*r+n*m-j,r=q[g+4],p=l[b+37],h=0,g=-1,m=r,w=0;a:for(;;){if((h|0)>=(p|0)){0>w|w>r&&P(N.O|0,249,N.Le|0,N.Rg|0);if(-1>=(g|0)){var x=0;break}q[d+8>>2]=w;x=q[e>>2];e=q[((g<<3)+84>>2)+b];f=q[f>>2];u=q[((g<<3)+88>>2)+b];b=f*e+x*u;x=(M[0]=x*e-f*u,t[0]);b=(M[0]=b,t[0])|0;l[d>>2]=0|x;l[d+4>>2]=b;x=1;break}var y=q[((h<<3)+84>>2)+b],A=q[((h<<3)+88>>2)+b],C=y*(q[((h<<3)+20>>2)+b]-u)+A*(q[((h<<3)+24>>2)+b]-j),y=y*k+A*n,A=0==y;b:do{if(A){if(0>C){x=0;break a}var z=g,D=m,E=w}else{z=0>y;do{if(z&&C<w*y){z=h;D=m;E=C/y;break b}}while(0);0<y?C<m*y?(z=g,D=C/y):(z=g,D=m):(z=g,D=m);E=w}}while(0);if(D<E){x=0;break}h=h+1|0;g=z;m=D;w=E}return x}),0,(function(b,d,e){var b=b>>2,f=q[e+12>>2],g=q[b+5],h=q[e+8>>2],j=q[b+6],k=q[e>>2],m=f*g-h*j+k,e=q[e+4>>2],g=h*g+f*j+e,j=l[b+37],n=1<(j|0);a:do{if(n){for(var p=g,u=m,r=g,w=m,x=1;;){var y=q[((x<<3)+20>>2)+b],A=q[((x<<3)+24>>2)+b],C=f*y-h*A+k,y=h*y+f*A+e,w=w<C?w:C,r=r<y?r:y,u=u>C?u:C,p=p>y?p:y,x=x+1|0;if((x|0)>=(j|0)){var z=p,D=u,E=r,G=w;break a}}}else{z=g,D=m,E=g,G=m}}while(0);b=q[b+2];G=(M[0]=G-b,t[0]);E=(M[0]=E-b,t[0])|0;l[d>>2]=0|G;l[d+4>>2]=E;d=d+8|0;D=(M[0]=D+b,t[0]);z=(M[0]=z+b,t[0])|0;l[d>>2]=0|D;l[d+4>>2]=z}),0,(function(b,d,e){var f;f=b+148|0;var g=l[f>>2];if(2<(g|0)){h=g,f=5}else{if(P(N.O|0,306,N.yb|0,N.bh|0),f=l[f>>2],0<(f|0)){var h=f;f=5}else{var j=d|0,k=q[j>>2]=0,m=0,n=0,p=0,u=0,r=0;f=12}}do{if(5==f){for(var w=g=f=0;;){var x=g+q[b+(w<<3)+20>>2],y=f+q[b+(w<<3)+24>>2],w=w+1|0;if((w|0)>=(h|0)){break}f=y;g=x}g=1/(h|0);f=x*g;for(var g=y*g,w=b+20|0,A=b+24|0,C=0,z=0,D=0,E=0,G=0;;){var H=q[b+(G<<3)+20>>2]-f,F=q[b+(G<<3)+24>>2]-g,G=G+1|0,I=(G|0)<(h|0);if(I){var J=(G<<3)+b+20|0,L=(G<<3)+b+24|0}else{J=w,L=A}var O=q[J>>2]-f,R=q[L>>2]-g,T=H*R-F*O,J=.5*T,L=D+J,S=.3333333432674408*J,J=z+(H+O)*S,S=C+(F+R)*S,H=E+.0833333358168602*T*(H*H+O*H+O*O+F*F+R*F+R*R);if(!I){break}C=S;z=J;D=L;E=H}w=L*e;A=d|0;q[A>>2]=w;if(1.1920928955078125e-7<L){var U=w,W=g,Q=f,$=H,ea=L,sa=J,Ba=S;f=13}else{k=g,m=f,n=H,p=L,u=J,r=S,j=A,f=12}}}while(0);12==f&&(P(N.O|0,352,N.yb|0,N.Vb|0),U=q[j>>2],W=k,Q=m,$=n,ea=p,sa=u,Ba=r);b=1/ea;sa*=b;Ba*=b;Q=sa+Q;W=Ba+W;b=d+4|0;h=(M[0]=Q,t[0]);k=(M[0]=W,t[0])|0;l[b>>2]=0|h;l[b+4>>2]=k;q[d+12>>2]=$*e+U*(Q*Q+W*W-(sa*sa+Ba*Ba))}),0,Hb(),0,(function(b){Ls(b)}),0,(function(){ja("Pure virtual function called!")}),0,Hb(),0,(function(b){Ls(b)}),0,Hb(),0,Hb(),0,Hb(),0,Hb(),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e){b=i[d+36>>1];return b<<16>>16!=i[e+36>>1]<<16>>16|0==b<<16>>16?0==(i[e+32>>1]&i[d+34>>1])<<16>>16?0:0!=(i[e+34>>1]&i[d+32>>1])<<16>>16:0<b<<16>>16}),0,(function(b,d,e,f){var g,h=a;a+=48;g=h>>2;var j=l[l[b+48>>2]+12>>2];l[g]=yF+8|0;l[g+1]=1;q[g+2]=.009999999776482582;g=h+28|0;l[g>>2]=0;l[g+4>>2]=0;l[g+8>>2]=0;l[g+12>>2]=0;i[g+16>>1]=0;Um(j,h,l[b+56>>2]);Eh(d,h,e,l[l[b+52>>2]+12>>2],f);a=h}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){var g,h=a;a+=300;var j=h+252;g=j>>2;var k=l[l[b+48>>2]+12>>2];l[g]=yF+8|0;l[g+1]=1;q[g+2]=.009999999776482582;g=j+28|0;l[g>>2]=0;l[g+4>>2]=0;l[g+8>>2]=0;l[g+12>>2]=0;i[g+16>>1]=0;Um(k,j,l[b+56>>2]);Gh(h,d,j,e,l[l[b+52>>2]+12>>2],f);a=h}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){var g=l[l[b+48>>2]+12>>2],h=l[l[b+52>>2]+12>>2],j=d+60|0;l[j>>2]=0;var k=g+12|0,m=q[e+12>>2],n=q[k>>2],p=q[e+8>>2],u=q[g+16>>2],b=h+12|0,r=q[f+12>>2],w=q[b>>2],x=q[f+8>>2],y=q[h+16>>2],A=r*w-x*y+q[f>>2]-(m*n-p*u+q[e>>2]),e=x*w+r*y+q[f+4>>2]-(p*n+m*u+q[e+4>>2]),g=q[g+8>>2]+q[h+8>>2];A*A+e*e>g*g||(l[d+56>>2]=0,g=d+48|0,A=l[k+4>>2],l[g>>2]=l[k>>2],l[g+4>>2]=A,q[d+40>>2]=0,q[d+44>>2]=0,l[j>>2]=1,j=l[b+4>>2],l[d>>2]=l[b>>2],l[d+4>>2]=j,l[d+16>>2]=0)}),0,Hb(),0,(function(b){Ls(b)}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){Eh(d,l[l[b+48>>2]+12>>2],e,l[l[b+52>>2]+12>>2],f)}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){var g=a;a+=252;Gh(g,d,l[l[b+48>>2]+12>>2],e,l[l[b+52>>2]+12>>2],f);a=g}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){var g=l[l[b+48>>2]+12>>2],h=l[l[b+52>>2]+12>>2],j,k=g>>2,m=d>>2;j=(d+60|0)>>2;l[j]=0;for(var n=h+12|0,p=q[f+12>>2],u=q[n>>2],r=q[f+8>>2],w=q[h+16>>2],x=p*u-r*w+q[f>>2]-q[e>>2],y=r*u+p*w+q[f+4>>2]-q[e+4>>2],A=q[e+12>>2],C=q[e+8>>2],z=A*x+C*y,D=x*-C+A*y,E=q[k+2]+q[h+8>>2],G=l[k+37],H=0,F=-3.4028234663852886e+38,I=0;;){if((H|0)<(G|0)){var J=q[((H<<3)+84>>2)+k]*(z-q[((H<<3)+20>>2)+k])+q[((H<<3)+88>>2)+k]*(D-q[((H<<3)+24>>2)+k]);if(J>E){break}var L=J>F,O=L?H:I,R=L?J:F,H=H+1|0,F=R,I=O}else{var T=I+1|0,S=(T|0)<(G|0)?T:0,U=(I<<3)+g+20|0,W=o[U>>2],Q=o[U+4>>2],$=(t[0]=W,M[0]),ea=(t[0]=Q,M[0]),sa=(S<<3)+g+20|0,Ba=o[sa>>2],oa=o[sa+4>>2],ga=(t[0]=Ba,M[0]),qa=(t[0]=oa,M[0]);if(1.1920928955078125e-7>F){l[j]=1;l[m+14]=1;var la=(I<<3)+g+84|0,Ca=d+40|0,ia=l[la+4>>2];l[Ca>>2]=l[la>>2];l[Ca+4>>2]=ia;var ya=.5*(ea+qa),ta=d+48|0,Ia=(M[0]=.5*($+ga),t[0]),na=(M[0]=ya,t[0])|0;l[ta>>2]=0|Ia;l[ta+4>>2]=na;var Z=n,ba=d,ca=l[Z+4>>2];l[ba>>2]=l[Z>>2];l[ba+4>>2]=ca;l[m+4]=0;break}var ma=z-$,ka=D-ea,aa=z-ga,ra=D-qa;if(0>=ma*(ga-$)+ka*(qa-ea)){var ha=ma*ma+ka*ka;if(ha>E*E){break}l[j]=1;l[m+14]=1;var za=d+40|0,X=za,ua=(M[0]=ma,t[0]),da=(M[0]=ka,t[0])|0,fa=X|0;l[fa>>2]=0|ua;var Aa=X+4|0;l[Aa>>2]=da;var Pa=Fh(ha);if(1.1920928955078125e-7<=Pa){var pa=d+44|0,cb=1/Pa;q[za>>2]=ma*cb;q[pa>>2]=ka*cb}var Qa=d+48|0,Ta=Qa|0;l[Ta>>2]=W;var $a=Qa+4|0;l[$a>>2]=Q;var va=n,Wa=d,fb=va|0,gb=va+4|0,Xa=l[gb>>2],Ua=Wa|0;l[Ua>>2]=l[fb>>2];var Va=Wa+4|0;l[Va>>2]=Xa;l[m+4]=0;break}if(0<aa*($-ga)+ra*(ea-qa)){var pb=.5*($+ga),nb=.5*(ea+qa),La=(I<<3)+g+84|0;if((z-pb)*q[La>>2]+(D-nb)*q[((I<<3)+88>>2)+k]>E){break}l[j]=1;l[m+14]=1;var qb=La,bb=d+40|0,Fa=l[qb+4>>2];l[bb>>2]=l[qb>>2];l[bb+4>>2]=Fa;var Ma=d+48|0,wa=(M[0]=pb,t[0]),hb=(M[0]=nb,t[0])|0;l[Ma>>2]=0|wa;l[Ma+4>>2]=hb;var Ya=n,Za=d,Da=l[Ya+4>>2];l[Za>>2]=l[Ya>>2];l[Za+4>>2]=Da;l[m+4]=0;break}var Na=aa*aa+ra*ra;if(Na>E*E){break}l[j]=1;l[m+14]=1;var ib=d+40|0,ab=ib,Ga=(M[0]=aa,t[0]),jb=(M[0]=ra,t[0]),Ea=0|Ga,Oa=jb|0,fa=ab|0;l[fa>>2]=Ea;Aa=ab+4|0;l[Aa>>2]=Oa;var Ja=Fh(Na);if(1.1920928955078125e-7<=Ja){var db=d+44|0,xa=1/Ja;q[ib>>2]=aa*xa;q[db>>2]=ra*xa}var Ra=d+48|0,Ta=Ra|0;l[Ta>>2]=Ba;$a=Ra+4|0;l[$a>>2]=oa;var Ka=n,tb=d,fb=Ka|0,kb=l[fb>>2],gb=Ka+4|0,ub=l[gb>>2],Ua=tb|0;l[Ua>>2]=kb;Va=tb+4|0;l[Va>>2]=ub;l[m+4]=0;break}}}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){var g=l[l[b+48>>2]+12>>2],h=l[l[b+52>>2]+12>>2],j,k,m,n,p,u,r,w,x,y,A,C,z,D,E=f>>2,G=e>>2,H=a;a+=80;var F,I=H+4,J=H+8,L=H+32;D=L>>2;var O=H+56;z=O>>2;var R=d+60|0;l[R>>2]=0;var T=q[g+8>>2]+q[h+8>>2];l[H>>2]=0;var S=Hh(H,g,e,h,f),U=S>T;do{if(!U){l[I>>2]=0;var W=Hh(I,h,f,g,e);if(W<=T){if(W>.9800000190734863*S+.0010000000474974513){var Q=q[E],$=q[E+1],ea=q[E+2],sa=q[E+3],Ba=q[G],oa=q[G+1],ga=q[G+2],qa=q[G+3],la=l[I>>2];l[d+56>>2]=2;var Ca=1,ia=la,ya=g;C=ya>>2;var ta=h;A=ta>>2;var Ia=Q,na=$,Z=ea,ba=sa,ca=Ba,ma=oa,ka=ga,aa=qa}else{var ra=q[G],ha=q[G+1],za=q[G+2],X=q[G+3],ua=q[E],da=q[E+1],fa=q[E+2],Aa=q[E+3],Pa=l[H>>2];l[d+56>>2]=1;Ca=0;ia=Pa;ya=h;C=ya>>2;ta=g;A=ta>>2;Ia=ra;na=ha;Z=za;ba=X;ca=ua;ma=da;ka=fa;aa=Aa}var pa=l[C+37];F=-1<(ia|0)?(l[A+37]|0)>(ia|0)?10:9:9;9==F&&P(N.Ib|0,151,N.le|0,N.Eb|0);var cb=q[((ia<<3)+84>>2)+A],Qa=q[((ia<<3)+88>>2)+A],Ta=ba*cb-Z*Qa,$a=Z*cb+ba*Qa,va=aa*Ta+ka*$a,Wa=-ka,fb=Ta*Wa+aa*$a,gb=0<(pa|0);a:do{if(gb){for(var Xa=0,Ua=3.4028234663852886e+38,Va=0;;){var pb=va*q[((Va<<3)+84>>2)+C]+fb*q[((Va<<3)+88>>2)+C],nb=pb<Ua,La=nb?Va:Xa,qb=nb?pb:Ua,bb=Va+1|0;if((bb|0)==(pa|0)){var Fa=La;break a}Xa=La;Ua=qb;Va=bb}}else{Fa=0}}while(0);var Ma=Fa+1|0,wa=(Ma|0)<(pa|0)?Ma:0,hb=q[((Fa<<3)+20>>2)+C],Ya=q[((Fa<<3)+24>>2)+C],Za=aa*hb-ka*Ya+ca,Da=ka*hb+aa*Ya+ma,Na=J,ib=(M[0]=Za,t[0]),ab=(M[0]=Da,t[0])|0;l[Na>>2]=0|ib;l[Na+4>>2]=ab;var Ga=ia&255,jb=J+8|0,Ea=jb;c[jb]=Ga;var Oa=Fa&255;c[Ea+1|0]=Oa;c[Ea+2|0]=1;c[Ea+3|0]=0;var Ja=J+12|0,db=q[((wa<<3)+20>>2)+C],xa=q[((wa<<3)+24>>2)+C],Ra=aa*db-ka*xa+ca,Ka=ka*db+aa*xa+ma,tb=Ja,kb=(M[0]=Ra,t[0]),ub=(M[0]=Ka,t[0])|0;l[tb>>2]=0|kb;l[tb+4>>2]=ub;var rb=J+20|0,Bb=rb;c[rb]=Ga;c[Bb+1|0]=wa&255;c[Bb+2|0]=1;c[Bb+3|0]=0;var lb=ia+1|0,yb=(lb|0)<(l[A+37]|0)?lb:0,xb=(ia<<3)+ta+20|0,Ib=l[xb+4>>2],wb=(t[0]=l[xb>>2],M[0]),vb=(t[0]=Ib,M[0]),zb=(yb<<3)+ta+20|0,Eb=l[zb+4>>2],Cb=(t[0]=l[zb>>2],M[0]),eb=(t[0]=Eb,M[0]),sb=Cb-wb,ob=eb-vb,Db=Fh(sb*sb+ob*ob);if(1.1920928955078125e-7>Db){var Jb=sb,Rb=ob}else{var Nb=1/Db,Jb=sb*Nb,Rb=ob*Nb}var Ob=.5*(wb+Cb),Kb=ba*Jb-Z*Rb,Pb=Z*Jb+ba*Rb,Mb=-1*Kb,Yb=ba*wb-Z*vb+Ia,Zb=Z*wb+ba*vb+na,ec=.5*(vb+eb),Ub=Pb*Yb+Mb*Zb,jc=T-(Kb*Yb+Pb*Zb),Qb=Kb*(ba*Cb-Z*eb+Ia)+Pb*(Z*Cb+ba*eb+na)+T,mb=-Kb,cc=-Pb,Fb=Za*mb+Da*cc-jc,gc=Ra*mb+Ka*cc-jc;if(0<Fb){var vc=0}else{y=L>>2,x=J>>2,l[y]=l[x],l[y+1]=l[x+1],l[y+2]=l[x+2],vc=1}if(0<gc){var pc=vc}else{w=(L+12*vc|0)>>2,r=Ja>>2,l[w]=l[r],l[w+1]=l[r+1],l[w+2]=l[r+2],pc=vc+1|0}if(0>Fb*gc){var qc=Fb/(Fb-gc),$c=Da+(Ka-Da)*qc,Ec=L+12*pc|0,sc=(M[0]=Za+(Ra-Za)*qc,t[0]),kd=(M[0]=$c,t[0]),wd=0|sc,Lc=kd|0,$b=Ec|0;u=$b>>2;l[u]=wd;var ac=Ec+4|0;p=ac>>2;l[p]=Lc;var oc=L+12*pc+8|0,tc=oc;c[oc]=Ga;c[tc+1|0]=Oa;c[tc+2|0]=0;c[tc+3|0]=1;var Nc=pc+1|0}else{Nc=pc}if(2<=(Nc|0)){var ld=q[D],Wc=q[D+1],ad=Kb*ld+Pb*Wc-Qb,Xc=L+12|0,Cc=q[Xc>>2],fd=q[D+4],md=Kb*Cc+Pb*fd-Qb;if(0<ad){var nd=0}else{n=O>>2,m=L>>2,l[n]=l[m],l[n+1]=l[m+1],l[n+2]=l[m+2],nd=1}if(0<md){var Oc=nd}else{k=(O+12*nd|0)>>2,j=Xc>>2,l[k]=l[j],l[k+1]=l[j+1],l[k+2]=l[j+2],Oc=nd+1|0}if(0>ad*md){var gd=ad/(ad-md),od=Wc+(fd-Wc)*gd,pd=O+12*Oc|0,Pd=(M[0]=ld+(Cc-ld)*gd,t[0]),Xd=(M[0]=od,t[0]),qd=0|Pd,Qd=Xd|0,$b=pd|0;u=$b>>2;l[u]=qd;ac=pd+4|0;p=ac>>2;l[p]=Qd;var Pc=O+12*Oc+8|0,Ic=Pc;c[Pc]=yb&255;c[Ic+1|0]=c[L+9|0];c[Ic+2|0]=0;c[Ic+3|0]=1;var Jc=Oc+1|0}else{Jc=Oc}if(2<=(Jc|0)){var fc=d+40|0,hd=(M[0]=Rb,t[0]),xd=(M[0]=-1*Jb,t[0])|0;l[fc>>2]=0|hd;l[fc+4>>2]=xd;var bd=d+48|0,rd=(M[0]=Ob,t[0]),ye=(M[0]=ec,t[0])|0;l[bd>>2]=0|rd;l[bd+4>>2]=ye;var Yd=q[z],Tc=q[z+1],wc=Pb*Yd+Mb*Tc-Ub>T;if(0==Ca<<24>>24){if(wc){var bc=0}else{var Ed=Yd-ca,xc=Tc-ma,Ac=Ed*Wa+aa*xc,Zd=d,$d=(M[0]=aa*Ed+ka*xc,t[0]),cd=(M[0]=Ac,t[0])|0,yc=Zd|0;l[yc>>2]=0|$d;var kc=Zd+4|0;l[kc>>2]=cd;l[d+16>>2]=l[z+2];bc=1}var Rd=q[z+3],Fc=q[z+4];if(Pb*Rd+Mb*Fc-Ub>T){var Qc=bc}else{var Mc=Rd-ca,ne=Fc-ma,Sd=Mc*Wa+aa*ne,Td=d+20*bc|0,Ud=(M[0]=aa*Mc+ka*ne,t[0]),xf=(M[0]=Sd,t[0])|0,$b=Td|0;u=$b>>2;l[u]=0|Ud;ac=Td+4|0;p=ac>>2;l[p]=xf;l[(d+16>>2)+(5*bc|0)]=l[z+5];Qc=bc+1|0}}else{if(wc){var Fd=0}else{var oe=Yd-ca,He=Tc-ma,ae=oe*Wa+aa*He,Gc=d,dd=(M[0]=aa*oe+ka*He,t[0]),be=(M[0]=ae,t[0])|0,yc=Gc|0;l[yc>>2]=0|dd;kc=Gc+4|0;l[kc>>2]=be;var pe=d+16|0,Uc=o[z+2];l[pe>>2]=Uc;var lc=Uc>>>24&255,Gd=Uc>>>16&255,Hd=Uc&255,Re=pe,Id=Re+1|0,Jd=Re+2|0,qe=Re+3|0;c[pe]=Uc>>>8&255;c[Id]=Hd;c[Jd]=lc;c[qe]=Gd;Fd=1}var re=q[z+3],Kd=q[z+4];if(Pb*re+Mb*Kd-Ub>T){Qc=Fd}else{var Se=re-ca,Rf=Kd-ma,sd=Se*Wa+aa*Rf,Vc=d+20*Fd|0,Te=(M[0]=aa*Se+ka*Rf,t[0]),Ue=(M[0]=sd,t[0])|0,$b=Vc|0;u=$b>>2;l[u]=0|Te;ac=Vc+4|0;p=ac>>2;l[p]=Ue;var ce=d+20*Fd+16|0,Yc=o[z+5];l[ce>>2]=Yc;var yd=Yc>>>24&255,$e=Yc>>>16&255,ze=Yc&255,Zc=ce,Ld=Zc+1|0,Md=Zc+2|0,de=Zc+3|0;c[ce]=Yc>>>8&255;c[Ld]=ze;c[Md]=yd;c[de]=$e;Qc=Fd+1|0}}l[R>>2]=Qc}}}}}while(0);a=H}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+80>>2],h=q[e+5],j=q[d+84>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+88>>2],h=q[e+5],j=q[d+92>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var e=q[d+100>>2]*e,f=q[d+120>>2]*e;q[b>>2]=q[d+116>>2]*e;q[b+4>>2]=f}),0,Lb(0),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.wg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+20];f=q[d+21];V(N.K|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+22];f=q[d+23];V(N.L|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+26];V(N.qh|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+17];V(N.Na|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+18];V(N.Oa|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j=b>>2,k=l[j+12];h=k>>2;var m=o[h+2],n=b+108|0;l[n>>2]=m;var p=l[j+13];g=p>>2;var u=l[g+2];f=(b+112|0)>>2;l[f]=u;var r=k+28|0,w=b+140|0,x=l[r>>2],y=l[r+4>>2];l[w>>2]=x;l[w+4>>2]=y;var A=p+28|0,C=b+148|0,z=l[A>>2],D=l[A+4>>2];l[C>>2]=z;l[C+4>>2]=D;var E=q[h+30];q[j+39]=E;var G=q[g+30];q[j+40]=G;var H=q[h+32];q[j+41]=H;var F=q[g+32];q[j+42]=F;var I=l[d+24>>2],J=I+12*m|0,L=l[J+4>>2],O=(t[0]=l[J>>2],M[0]),R=(t[0]=L,M[0]),T=q[(I+8>>2)+(3*m|0)];e=(d+28|0)>>2;var S=l[e],U=S+12*m|0,W=l[U+4>>2],Q=(t[0]=l[U>>2],M[0]),$=(t[0]=W,M[0]),ea=q[(S+8>>2)+(3*m|0)],sa=I+12*u|0,Ba=l[sa+4>>2],oa=(t[0]=l[sa>>2],M[0]),ga=(t[0]=Ba,M[0]),qa=q[(I+8>>2)+(3*u|0)],la=S+12*u|0,Ca=l[la+4>>2],ia=(t[0]=l[la>>2],M[0]),ya=(t[0]=Ca,M[0]),ta=q[(S+8>>2)+(3*u|0)],Ia=mm(T),na=nm(T),Z=mm(qa),ba=nm(qa),ca=b+124|0,ma=q[j+20],ka=(t[0]=x,M[0]),aa=ma-ka,ra=q[j+21],ha=(t[0]=y,M[0]),za=ra-ha,X=na*aa-Ia*za,ua=Ia*aa+na*za,da=(M[0]=X,t[0]),fa=(M[0]=ua,t[0])|0;l[ca>>2]=0|da;l[ca+4>>2]=fa;var Aa=b+132|0,Pa=q[j+22],pa=(t[0]=z,M[0]),cb=Pa-pa,Qa=q[j+23],Ta=(t[0]=D,M[0]),$a=Qa-Ta,va=ba*cb-Z*$a,Wa=Z*cb+ba*$a,fb=(M[0]=va,t[0]),gb=(M[0]=Wa,t[0])|0;l[Aa>>2]=0|fb;l[Aa+4>>2]=gb;var Xa=b+116|0,Ua=oa+va-O-X,Va=ga+Wa-R-ua,pb=(M[0]=Ua,t[0]),nb=(M[0]=Va,t[0])|0;l[Xa>>2]=0|pb;l[Xa+4>>2]=nb;var La=Xa|0,qb=b+120|0,bb=Fh(Ua*Ua+Va*Va);if(.004999999888241291<bb){var Fa=1/bb,Ma=Ua*Fa;q[La>>2]=Ma;var wa=Va*Fa,hb=Ma}else{hb=wa=q[La>>2]=0}q[qb>>2]=wa;var Ya=X*wa-ua*hb,Za=va*wa-Wa*hb,Da=E+H*Ya*Ya+G+F*Za*Za,Na=0!=Da?1/Da:0,ib=b+172|0;q[ib>>2]=Na;var ab=q[j+17];if(0<ab){var Ga=bb-q[j+26],jb=6.2831854820251465*ab,Ea=Na*jb*jb,Oa=q[d>>2],Ja=Oa*(2*Na*q[j+18]*jb+Oa*Ea),db=b+96|0;q[db>>2]=Ja;var xa=0!=Ja?1/Ja:0;q[db>>2]=xa;q[j+19]=Ga*Oa*Ea*xa;var Ra=Da+xa;q[ib>>2]=0!=Ra?1/Ra:0}else{q[j+24]=0,q[j+19]=0}if(0==(c[d+20|0]&1)<<24>>24){q[j+25]=0;var Ka=ta,tb=ea,kb=Q,ub=$,rb=ia,Bb=ya}else{var lb=b+100|0,yb=q[lb>>2]*q[d+8>>2];q[lb>>2]=yb;var xb=hb*yb,Ib=wa*yb,Ka=ta+F*(va*Ib-Wa*xb),tb=ea-H*(X*Ib-ua*xb),kb=Q-xb*E,ub=$-Ib*E,rb=ia+xb*G,Bb=ya+Ib*G}var wb=l[e]+12*m|0,vb=(M[0]=kb,t[0]),zb=(M[0]=ub,t[0])|0;l[(wb|0)>>2]=0|vb;l[(wb+4|0)>>2]=zb;q[(l[e]+8>>2)+(3*l[n>>2]|0)]=tb;var Eb=l[e]+12*l[f]|0,Cb=(M[0]=rb,t[0]),eb=(M[0]=Bb,t[0])|0;l[(Eb|0)>>2]=0|Cb;l[(Eb+4|0)>>2]=eb;q[(l[e]+8>>2)+(3*l[f]|0)]=Ka}),0,(function(b,d){var e,f,g=b>>2,h=b+108|0,j=l[h>>2];f=(d+28|0)>>2;var k=l[f],m=k+12*j|0;e=l[m+4>>2];var n=(t[0]=l[m>>2],M[0]),p=(t[0]=e,M[0]),u=q[(k+8>>2)+(3*j|0)];e=(b+112|0)>>2;var r=l[e],m=k+12*r|0,w=l[m+4>>2],m=(t[0]=l[m>>2],M[0]),w=(t[0]=w,M[0]),x=q[(k+8>>2)+(3*r|0)],y=q[g+32],A=q[g+31],C=q[g+34],z=q[g+33],k=q[g+29],r=q[g+30],D=b+100|0,E=q[D>>2],G=(k*(m+C*-x-(n+y*-u))+r*(w+z*x-(p+A*u))+q[g+19]+q[g+24]*E)*-q[g+43];q[D>>2]=E+G;k*=G;r*=G;G=q[g+39];y=u-q[g+41]*(A*r-y*k);u=q[g+40];g=x+q[g+42]*(z*r-C*k);j=l[f]+12*j|0;n=(M[0]=n-k*G,t[0]);p=(M[0]=p-r*G,t[0])|0;l[(j|0)>>2]=0|n;l[(j+4|0)>>2]=p;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=y;h=l[f]+12*l[e]|0;m=(M[0]=m+k*u,t[0]);w=(M[0]=w+r*u,t[0])|0;l[(h|0)>>2]=0|m;l[(h+4|0)>>2]=w;q[(l[f]+8>>2)+(3*l[e]|0)]=g}),0,(function(b,d){var e,f,g=b>>2;if(0<q[g+17]){f=1}else{var h=b+108|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+112|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),j=q[(j+8>>2)+(3*u|0)],x=mm(p),y=nm(p),A=mm(j),C=nm(j),z=q[g+20]-q[g+35],D=q[g+21]-q[g+36],u=y*z-x*D,y=x*z+y*D,z=q[g+22]-q[g+37],D=q[g+23]-q[g+38],x=C*z-A*D,A=A*z+C*D,z=r+x-n-u,C=w+A-m-y,E=Fh(z*z+C*C);1.1920928955078125e-7>E?(E=0,D=C):(D=1/E,z*=D,D*=C);C=E-q[g+26];C=.20000000298023224>C?C:.20000000298023224;C=-.20000000298023224>C?-.20000000298023224:C;E=C*-q[g+43];z*=E;D*=E;E=q[g+39];u=p-q[g+41]*(u*D-y*z);p=q[g+40];g=j+q[g+42]*(x*D-A*z);n=(M[0]=n-z*E,t[0]);m=(M[0]=m-D*E,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=u;h=l[f]+12*l[e]|0;k=(M[0]=r+z*p,t[0]);n=(M[0]=w+D*p,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=g;f=.004999999888241291>(0<C?C:-C)}return f}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+68>>2],h=q[e+5],j=q[d+72>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+76>>2],h=q[e+5],j=q[d+80>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+88>>2]*e;q[b>>2]=q[d+84>>2]*e;q[b+4>>2]=f}),0,(function(b,d){return q[b+92>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.Lg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+17];f=q[d+18];V(N.K|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+19];f=q[d+20];V(N.L|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+24];V(N.Gh|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+25];V(N.Ue|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h=b>>2,j=l[h+12];g=j>>2;var k=o[g+2],m=b+104|0;l[m>>2]=k;var n=l[h+13];e=n>>2;var p=l[e+2];f=(b+108|0)>>2;l[f]=p;var u=j+28|0,j=b+128|0,r=l[u>>2],w=l[u+4>>2];l[j>>2]=r;l[j+4>>2]=w;var j=n+28|0,n=b+136|0,x=l[j>>2],y=l[j+4>>2];l[n>>2]=x;l[n+4>>2]=y;j=q[g+30];q[h+36]=j;n=q[e+30];q[h+37]=n;g=q[g+32];q[h+38]=g;var A=q[e+32];q[h+39]=A;var C=l[d+24>>2],z=q[(C+8>>2)+(3*k|0)];e=(d+28|0)>>2;var D=l[e],u=D+12*k|0,E=l[u+4>>2],u=(t[0]=l[u>>2],M[0]),E=(t[0]=E,M[0]),G=q[(D+8>>2)+(3*k|0)],H=q[(C+8>>2)+(3*p|0)],C=D+12*p|0,F=l[C+4>>2],C=(t[0]=l[C>>2],M[0]),F=(t[0]=F,M[0]),p=q[(D+8>>2)+(3*p|0)],I=mm(z),J=nm(z),z=mm(H),H=nm(H),D=b+112|0,L=q[h+17],r=(t[0]=r,M[0]),r=L-r,L=q[h+18],w=(t[0]=w,M[0]),L=L-w,w=J*r-I*L,r=I*r+J*L,I=(M[0]=w,t[0]),J=(M[0]=r,t[0])|0;l[D>>2]=0|I;l[D+4>>2]=J;D=b+120|0;I=q[h+19];x=(t[0]=x,M[0]);x=I-x;I=q[h+20];y=(t[0]=y,M[0]);I-=y;y=H*x-z*I;x=z*x+H*I;z=(M[0]=y,t[0]);H=(M[0]=x,t[0])|0;l[D>>2]=0|z;l[D+4>>2]=H;D=j+n;z=D+g*r*r+A*x*x;I=A*y;H=w*-g*r-I*x;D=D+g*w*w+I*y;I=z*D-H*H;I=0!=I?1/I:I;H*=-I;q[h+40]=I*D;q[h+41]=H;q[h+42]=H;q[h+43]=I*z;z=g+A;q[h+44]=0<z?1/z:z;D=b+84|0;0==(c[d+20|0]&1)<<24>>24?(q[D>>2]=0,q[h+22]=0,q[h+23]=0,A=p,g=G,j=E,E=C,n=F):(H=d+8|0,z=q[H>>2],D|=0,h=q[D>>2]*z,q[D>>2]=h,D=b+88|0,z*=q[D>>2],q[D>>2]=z,D=b+92|0,H=q[D>>2]*q[H>>2],q[D>>2]=H,A=p+A*(y*z-x*h+H),g=G-g*(w*z-r*h+H),u-=h*j,j=E-z*j,E=C+h*n,n=F+z*n);k=l[e]+12*k|0;u=(M[0]=u,t[0]);j=(M[0]=j,t[0])|0;l[(k|0)>>2]=0|u;l[(k+4|0)>>2]=j;q[(l[e]+8>>2)+(3*l[m>>2]|0)]=g;m=l[e]+12*l[f]|0;k=(M[0]=E,t[0]);n=(M[0]=n,t[0])|0;l[(m|0)>>2]=0|k;l[(m+4|0)>>2]=n;q[(l[e]+8>>2)+(3*l[f]|0)]=A}),0,(function(b,d){var e,f,g,h,j=b>>2,k=b+104|0,m=l[k>>2];h=(d+28|0)>>2;var n=l[h],p=n+12*m|0;g=l[p+4>>2];var u=(t[0]=l[p>>2],M[0]),r=(t[0]=g,M[0]),w=q[(n+8>>2)+(3*m|0)];g=(b+108|0)>>2;var x=l[g],p=n+12*x|0,y=l[p+4>>2],p=(t[0]=l[p>>2],M[0]),y=(t[0]=y,M[0]),A=q[(n+8>>2)+(3*x|0)],C=q[j+36],x=q[j+37],z=q[j+38],n=q[j+39],D=q[d>>2],E=b+92|0,G=q[E>>2],H=D*q[j+25],F=G+(A-w)*-q[j+44],I=-H,H=F<H?F:H,I=H<I?I:H;q[E>>2]=I;var E=I-G,G=w-z*E,w=A+n*E,A=q[j+31],E=q[j+30],I=q[j+29],H=q[j+28],F=p+A*-w-u-I*-G,J=y+E*w-r-H*G;e=q[j+40]*F+q[j+42]*J;var L=q[j+41]*F+q[j+43]*J;f=b+84|0;J=l[f+4>>2];F=(t[0]=l[f>>2],M[0]);J=(t[0]=J,M[0]);f=(f|0)>>2;var O=F-e;q[f]=O;e=(b+88|0)>>2;L=q[e]-L;q[e]=L;j=D*q[j+24];D=O*O+L*L;D>j*j?(D=Fh(D),1.1920928955078125e-7>D||(D=1/D,O*=D,q[f]=O,L*=D,q[e]=L),D=O,D*=j,q[f]=D,j*=L,e=q[e]=j):(D=O,e=L);j=D-F;D=e-J;m=l[h]+12*m|0;u=(M[0]=u-j*C,t[0]);r=(M[0]=r-D*C,t[0])|0;l[(m|0)>>2]=0|u;l[(m+4|0)>>2]=r;q[(l[h]+8>>2)+(3*l[k>>2]|0)]=G-z*(H*D-I*j);k=l[h]+12*l[g]|0;p=(M[0]=p+j*x,t[0]);y=(M[0]=y+D*x,t[0])|0;l[(k|0)>>2]=0|p;l[(k+4|0)>>2]=y;q[(l[h]+8>>2)+(3*l[g]|0)]=w+n*(E*D-A*j)}),0,Lb(1),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+92>>2],h=q[e+5],j=q[d+96>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+100>>2],h=q[e+5],j=q[d+104>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+156>>2],g=q[d+244>>2]*f*e;q[b>>2]=q[d+240>>2]*f*e;q[b+4>>2]=g}),0,(function(b,d){return q[b+156>>2]*q[b+256>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2],h=l[l[d+17]+56>>2],j=l[l[d+18]+56>>2];V(N.Zg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));V(N.Ah|0,(s=a,a+=4,l[s>>2]=h,s));V(N.Hh|0,(s=a,a+=4,l[s>>2]=j,s));h=q[d+38];V(N.Fb|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j,k,m,n,p,u,r,w=b>>2,x=l[w+12];r=x>>2;var y=l[r+2],A=b+160|0;l[A>>2]=y;var C=l[w+13];u=C>>2;var z=l[u+2];p=(b+164|0)>>2;l[p]=z;var D=l[w+21];n=D>>2;var E=l[n+2];m=(b+168|0)>>2;l[m]=E;var G=l[w+22];k=G>>2;var H=l[k+2];j=(b+172|0)>>2;l[j]=H;var F=x+28|0,I=b+176|0,J=l[F>>2],L=l[F+4>>2];l[I>>2]=J;l[I+4>>2]=L;var O=C+28|0,R=b+184|0,T=l[O>>2],S=l[O+4>>2];l[R>>2]=T;l[R+4>>2]=S;var U=D+28|0,W=b+192|0,Q=l[U>>2],$=l[U+4>>2];l[W>>2]=Q;l[W+4>>2]=$;var ea=G+28|0,sa=b+200|0,Ba=l[ea>>2],oa=l[ea+4>>2];l[sa>>2]=Ba;l[sa+4>>2]=oa;var ga=q[r+30];q[w+52]=ga;var qa=q[u+30];q[w+53]=qa;var la=q[n+30];q[w+54]=la;var Ca=q[k+30];q[w+55]=Ca;var ia=q[r+32];q[w+56]=ia;var ya=q[u+32];q[w+57]=ya;var ta=q[n+32];q[w+58]=ta;var Ia=q[k+32];q[w+59]=Ia;h=l[d+24>>2]>>2;var na=q[h+(3*y|0)+2];g=(d+28|0)>>2;var Z=l[g];f=Z>>2;var ba=Z+12*y|0,ca=l[ba+4>>2],ma=(t[0]=l[ba>>2],M[0]),ka=(t[0]=ca,M[0]),aa=q[f+(3*y|0)+2],ra=q[h+(3*z|0)+2],ha=Z+12*z|0,za=l[ha+4>>2],X=(t[0]=l[ha>>2],M[0]),ua=(t[0]=za,M[0]),da=q[f+(3*z|0)+2],fa=q[h+(3*E|0)+2],Aa=Z+12*E|0,Pa=l[Aa+4>>2],pa=(t[0]=l[Aa>>2],M[0]),cb=(t[0]=Pa,M[0]),Qa=q[f+(3*E|0)+2],Ta=q[h+(3*H|0)+2],$a=Z+12*H|0,va=l[$a+4>>2],Wa=(t[0]=l[$a>>2],M[0]),fb=(t[0]=va,M[0]),gb=q[f+(3*H|0)+2],Xa=mm(na),Ua=nm(na),Va=mm(ra),pb=nm(ra),nb=mm(fa),La=nm(fa),qb=mm(Ta),bb=nm(Ta);e=(b+272|0)>>2;q[e]=0;var Fa=1==(l[w+19]|0),Ma=(t[0]=Ba,M[0]),wa=(t[0]=oa,M[0]),hb=(t[0]=T,M[0]),Ya=(t[0]=S,M[0]);if(Fa){q[w+60]=0;q[w+61]=0;q[w+64]=1;q[w+66]=1;var Za=ia+ta,Da=0,Na=0,ib=1,ab=1}else{var Ga=(t[0]=L,M[0]),jb=(t[0]=J,M[0]),Ea=(t[0]=$,M[0]),Oa=(t[0]=Q,M[0]),Ja=q[w+31],db=q[w+32],xa=La*Ja-nb*db,Ra=nb*Ja+La*db,Ka=q[w+27]-Oa,tb=q[w+28]-Ea,kb=La*Ka-nb*tb,ub=nb*Ka+La*tb,rb=q[w+23]-jb,Bb=q[w+24]-Ga,lb=Ua*rb-Xa*Bb,yb=Xa*rb+Ua*Bb,xb=b+240|0,Ib=(M[0]=xa,t[0]),wb=(M[0]=Ra,t[0])|0;l[xb>>2]=0|Ib;l[xb+4>>2]=wb;var vb=kb*Ra-ub*xa;q[w+66]=vb;var zb=lb*Ra-yb*xa;q[w+64]=zb;Za=la+ga+ta*vb*vb+ia*zb*zb;Da=xa;Na=Ra;ib=zb;ab=vb}var Eb=Za;q[e]=Eb;if(1==(l[w+20]|0)){q[w+62]=0;q[w+63]=0;var Cb=q[w+38];q[w+65]=Cb;q[w+67]=Cb;var eb=Cb*Cb*(ya+Ia),sb=0,ob=0,Db=Cb,Jb=Cb}else{var Rb=q[w+33],Nb=q[w+34],Ob=bb*Rb-qb*Nb,Kb=qb*Rb+bb*Nb,Pb=q[w+29]-Ma,Mb=q[w+30]-wa,Yb=bb*Pb-qb*Mb,Zb=qb*Pb+bb*Mb,ec=q[w+25]-hb,Ub=q[w+26]-Ya,jc=pb*ec-Va*Ub,Qb=Va*ec+pb*Ub,mb=q[w+38],cc=Ob*mb,Fb=Kb*mb,gc=b+248|0,vc=(M[0]=cc,t[0]),pc=(M[0]=Fb,t[0])|0;l[gc>>2]=0|vc;l[gc+4>>2]=pc;var qc=mb*(Yb*Kb-Zb*Ob);q[w+67]=qc;var $c=mb*(jc*Kb-Qb*Ob);q[w+65]=$c;eb=mb*mb*(Ca+qa)+Ia*qc*qc+ya*$c*$c;sb=cc;ob=Fb;Db=$c;Jb=qc}var Ec=Eb+eb;q[e]=Ec;q[e]=0<Ec?1/Ec:0;var sc=b+156|0;if(0==(c[d+20|0]&1)<<24>>24){q[sc>>2]=0;var kd=gb,wd=Qa,Lc=da,$b=aa,ac=ma,oc=ka,tc=X,Nc=ua,ld=pa,Wc=cb,ad=Wa,Xc=fb}else{var Cc=q[sc>>2],fd=ga*Cc,md=qa*Cc,nd=la*Cc,Oc=Ca*Cc,kd=gb-Ia*Cc*Jb,wd=Qa-ta*Cc*ab,Lc=da+ya*Cc*Db,$b=aa+ia*Cc*ib,ac=ma+Da*fd,oc=ka+Na*fd,tc=X+sb*md,Nc=ua+ob*md,ld=pa-Da*nd,Wc=cb-Na*nd,ad=Wa-sb*Oc,Xc=fb-ob*Oc}var gd=l[g]+12*y|0,od=(M[0]=ac,t[0]),pd=(M[0]=oc,t[0])|0;l[(gd|0)>>2]=0|od;l[(gd+4|0)>>2]=pd;q[(l[g]+8>>2)+(3*l[A>>2]|0)]=$b;var Pd=l[g]+12*l[p]|0,Xd=(M[0]=tc,t[0]),qd=(M[0]=Nc,t[0])|0;l[(Pd|0)>>2]=0|Xd;l[(Pd+4|0)>>2]=qd;q[(l[g]+8>>2)+(3*l[p]|0)]=Lc;var Qd=l[g]+12*l[m]|0,Pc=(M[0]=ld,t[0]),Ic=(M[0]=Wc,t[0])|0;l[(Qd|0)>>2]=0|Pc;l[(Qd+4|0)>>2]=Ic;q[(l[g]+8>>2)+(3*l[m]|0)]=wd;var Jc=l[g]+12*l[j]|0,fc=(M[0]=ad,t[0]),hd=(M[0]=Xc,t[0])|0;l[(Jc|0)>>2]=0|fc;l[(Jc+4|0)>>2]=hd;q[(l[g]+8>>2)+(3*l[j]|0)]=kd}),0,(function(b,d){var e,f,g,h,j,k=b>>2,m=b+160|0,n=l[m>>2];j=(d+28|0)>>2;var p=l[j];h=p>>2;f=p+12*n|0;e=l[f+4>>2];var u=(t[0]=l[f>>2],M[0]),r=(t[0]=e,M[0]),w=q[h+(3*n|0)+2];g=(b+164|0)>>2;e=l[g];var x=p+12*e|0;f=l[x+4>>2];var x=(t[0]=l[x>>2],M[0]),y=(t[0]=f,M[0]),A=q[h+(3*e|0)+2];f=(b+168|0)>>2;e=l[f];var C=p+12*e|0,z=l[C+4>>2],C=(t[0]=l[C>>2],M[0]),z=(t[0]=z,M[0]),D=q[h+(3*e|0)+2];e=(b+172|0)>>2;var E=l[e],p=p+12*E|0,G=l[p+4>>2],p=(t[0]=l[p>>2],M[0]),G=(t[0]=G,M[0]),H=q[h+(3*E|0)+2],F=q[k+60],I=q[k+61],E=q[k+62];h=q[k+63];var J=q[k+64],L=q[k+66],O=q[k+65],R=q[k+67],T=(F*(u-C)+I*(r-z)+E*(x-p)+h*(y-G)+(J*w-L*D)+(O*A-R*H))*-q[k+68],S=b+156|0;q[S>>2]+=T;var S=q[k+52]*T,U=w+q[k+56]*T*J,J=q[k+53]*T,O=A+q[k+57]*T*O,A=q[k+54]*T,D=D-q[k+58]*T*L,w=q[k+55]*T,k=H-q[k+59]*T*R,n=l[j]+12*n|0,u=(M[0]=u+F*S,t[0]),r=(M[0]=r+I*S,t[0])|0;l[(n|0)>>2]=0|u;l[(n+4|0)>>2]=r;q[(l[j]+8>>2)+(3*l[m>>2]|0)]=U;m=l[j]+12*l[g]|0;x=(M[0]=x+E*J,t[0]);y=(M[0]=y+h*J,t[0])|0;l[(m|0)>>2]=0|x;l[(m+4|0)>>2]=y;q[(l[j]+8>>2)+(3*l[g]|0)]=O;g=l[j]+12*l[f]|0;m=(M[0]=C-F*A,t[0]);x=(M[0]=z-I*A,t[0])|0;l[(g|0)>>2]=0|m;l[(g+4|0)>>2]=x;q[(l[j]+8>>2)+(3*l[f]|0)]=D;f=l[j]+12*l[e]|0;g=(M[0]=p-E*w,t[0]);m=(M[0]=G-h*w,t[0])|0;l[(f|0)>>2]=0|g;l[(f+4|0)>>2]=m;q[(l[j]+8>>2)+(3*l[e]|0)]=k}),0,(function(b,d){var e,f,g,h,j,k=b>>2,m=b+160|0,n=l[m>>2];j=(d+24|0)>>2;var p=l[j];h=p>>2;var u=p+12*n|0,r=l[u+4>>2],w=(t[0]=l[u>>2],M[0]),x=(t[0]=r,M[0]),y=q[h+(3*n|0)+2];g=(b+164|0)>>2;var A=l[g],C=p+12*A|0,z=l[C+4>>2],D=(t[0]=l[C>>2],M[0]),E=(t[0]=z,M[0]),G=q[h+(3*A|0)+2];f=(b+168|0)>>2;var H=l[f],F=p+12*H|0,I=l[F+4>>2],J=(t[0]=l[F>>2],M[0]),L=(t[0]=I,M[0]),O=q[h+(3*H|0)+2];e=(b+172|0)>>2;var R=l[e],T=p+12*R|0,S=l[T+4>>2],U=(t[0]=l[T>>2],M[0]),W=(t[0]=S,M[0]),Q=q[h+(3*R|0)+2],$=mm(y),ea=nm(y),sa=mm(G),Ba=nm(G),oa=mm(O),ga=nm(O),qa=mm(Q),la=nm(Q);if(1==(l[k+19]|0)){var Ca=q[k+56],ia=q[k+58],ya=Ca+ia,ta=y-O-q[k+35],Ia=1,na=1,Z=0,ba=0,ca=Ca,ma=ia}else{var ka=q[k+31],aa=q[k+32],ra=ga*ka-oa*aa,ha=oa*ka+ga*aa,za=q[k+27]-q[k+48],X=q[k+28]-q[k+49],ua=q[k+23]-q[k+44],da=q[k+24]-q[k+45],fa=ea*ua-$*da,Aa=$*ua+ea*da,Pa=(ga*za-oa*X)*ha-(oa*za+ga*X)*ra,pa=fa*ha-Aa*ra,cb=q[k+58],Qa=q[k+56],Ta=fa+(w-J),$a=Aa+(x-L),ya=q[k+54]+q[k+52]+cb*Pa*Pa+Qa*pa*pa,ta=(ga*Ta+oa*$a-za)*ka+(Ta*-oa+ga*$a-X)*aa,Ia=pa,na=Pa,Z=ra,ba=ha,ca=Qa,ma=cb}if(1==(l[k+20]|0)){var va=q[k+38],Wa=q[k+57],fb=q[k+59],gb=va*va*(Wa+fb),Xa=va,Ua=G-Q-q[k+36],Va=va,pb=0,nb=0,La=va,qb=Wa,bb=fb}else{var Fa=q[k+33],Ma=q[k+34],wa=la*Fa-qa*Ma,hb=qa*Fa+la*Ma,Ya=q[k+29]-q[k+50],Za=q[k+30]-q[k+51],Da=q[k+25]-q[k+46],Na=q[k+26]-q[k+47],ib=Ba*Da-sa*Na,ab=sa*Da+Ba*Na,Ga=q[k+38],jb=Ga*((la*Ya-qa*Za)*hb-(qa*Ya+la*Za)*wa),Ea=Ga*(ib*hb-ab*wa),Oa=q[k+59],Ja=q[k+57],db=ib+(D-U),xa=ab+(E-W),gb=Ga*Ga*(q[k+55]+q[k+53])+Oa*jb*jb+Ja*Ea*Ea,Xa=jb,Ua=(la*db+qa*xa-Ya)*Fa+(db*-qa+la*xa-Za)*Ma,Va=Ea,pb=wa*Ga,nb=hb*Ga,La=Ga,qb=Ja,bb=Oa}var Ra=ya+gb,Ka=0<Ra?-(ta+La*Ua-q[k+37])/Ra:0,tb=q[k+52]*Ka,kb=x+ba*tb,ub=y+ca*Ka*Ia,rb=q[k+53]*Ka,Bb=D+pb*rb,lb=E+nb*rb,yb=G+qb*Ka*Va,xb=q[k+54]*Ka,Ib=J-Z*xb,wb=L-ba*xb,vb=O-ma*Ka*na,zb=q[k+55]*Ka,Eb=U-pb*zb,Cb=W-nb*zb,eb=Q-bb*Ka*Xa,sb=(M[0]=w+Z*tb,t[0]),ob=(M[0]=kb,t[0])|0;l[(u|0)>>2]=0|sb;l[(u+4|0)>>2]=ob;q[(l[j]+8>>2)+(3*l[m>>2]|0)]=ub;var Db=l[j]+12*l[g]|0,Jb=(M[0]=Bb,t[0]),Rb=(M[0]=lb,t[0])|0;l[(Db|0)>>2]=0|Jb;l[(Db+4|0)>>2]=Rb;q[(l[j]+8>>2)+(3*l[g]|0)]=yb;var Nb=l[j]+12*l[f]|0,Ob=(M[0]=Ib,t[0]),Kb=(M[0]=wb,t[0])|0;l[(Nb|0)>>2]=0|Ob;l[(Nb+4|0)>>2]=Kb;q[(l[j]+8>>2)+(3*l[f]|0)]=vb;var Pb=l[j]+12*l[e]|0,Mb=(M[0]=Eb,t[0]),Yb=(M[0]=Cb,t[0])|0;l[(Pb|0)>>2]=0|Mb;l[(Pb+4|0)>>2]=Yb;q[(l[j]+8>>2)+(3*l[e]|0)]=eb;return 1}),0,(function(){var b=a;V(N.Ng|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));a=b}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e=d+76|0,f=l[e+4>>2];l[b>>2]=l[e>>2];l[b+4>>2]=f}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+68>>2],h=q[e+5],j=q[d+72>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+100>>2]*e;q[b>>2]=q[d+96>>2]*e;q[b+4>>2]=f}),0,Lb(0),0,(function(){var b=a;V(N.rh|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));a=b}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h=b>>2;e=l[h+13];g=e>>2;var j=l[g+2];f=(b+116|0)>>2;l[f]=j;var k=b+128|0;e=e+28|0;var m=l[e+4>>2];l[k>>2]=l[e>>2];l[k+4>>2]=m;var n=b+136|0;q[n>>2]=q[g+30];var p=b+140|0;q[p>>2]=q[g+32];e=l[d+24>>2];var u=e+12*j|0,m=l[u+4>>2],r=(t[0]=l[u>>2],M[0]),w=(t[0]=m,M[0]),x=q[(e+8>>2)+(3*j|0)];e=(d+28|0)>>2;var y=l[e],m=y+12*j|0,u=l[m+4>>2],m=(t[0]=l[m>>2],M[0]),u=(t[0]=u,M[0]),j=q[(y+8>>2)+(3*j|0)],y=mm(x),A=nm(x),C=q[g+29],z=6.2831854820251465*q[h+21],x=q[d>>2];g=x*C*z*z;C=2*C*q[h+22]*z+g;1.1920928955078125e-7<C||P(N.ca|0,125,N.me|0,N.jh|0);x*=C;x=0!=x?1/x:x;q[h+27]=x;g*=x;q[h+23]=g;C=q[h+17]-q[k>>2];z=q[h+18]-q[h+33];k=A*C-y*z;y=y*C+A*z;A=b+120|0;C=(M[0]=k,t[0]);z=(M[0]=y,t[0])|0;l[(A|0)>>2]=0|C;l[(A+4|0)>>2]=z;n=q[n>>2];p=q[p>>2];A=n+p*y*y+x;C=k*-p*y;x=n+p*k*k+x;z=A*x-C*C;z=0!=z?1/z:z;C*=-z;q[h+36]=z*x;q[h+37]=C;q[h+38]=C;q[h+39]=z*A;x=b+160|0;r=r+k-q[h+19];w=w+y-q[h+20];A=(M[0]=r,t[0]);C=(M[0]=w,t[0]);l[(x|0)>>2]=0|A;l[(x+4|0)>>2]=C|0;q[x>>2]=r*g;q[h+41]=w*g;r=.9800000190734863*j;j=b+96|0;0==(c[d+20|0]&1)<<24>>24?(q[j>>2]=0,q[h+25]=0,h=m):(w=q[d+8>>2],j|=0,h=q[j>>2]*w,q[j>>2]=h,j=b+100|0,w*=q[j>>2],q[j>>2]=w,r+=p*(k*w-y*h),h=m+h*n,u+=w*n);m=l[e]+12*l[f]|0;h=(M[0]=h,t[0]);u=(M[0]=u,t[0])|0;l[(m|0)>>2]=0|h;l[(m+4|0)>>2]=u;q[(l[e]+8>>2)+(3*l[f]|0)]=r}),0,(function(b,d){var e,f,g,h=b>>2,j=b+116|0,k=l[j>>2];g=(d+28|0)>>2;var m=l[g],n=m+12*k|0,p=l[n+4>>2],n=(t[0]=l[n>>2],M[0]),p=(t[0]=p,M[0]),m=q[(m+8>>2)+(3*k|0)],u=q[h+31],r=q[h+30],w=q[h+27],x=b+96|0;f=(x|0)>>2;var y=q[f];e=(b+100|0)>>2;var A=q[e],C=-(n+u*-m+q[h+40]+y*w),z=-(p+r*m+q[h+41]+A*w),w=q[h+36]*C+q[h+38]*z,z=q[h+37]*C+q[h+39]*z,C=l[x+4>>2],x=(t[0]=l[x>>2],M[0]),C=(t[0]=C,M[0]),y=y+w;q[f]=y;A+=z;q[e]=A;w=q[d>>2]*q[h+26];z=y*y+A*A;z>w*w?(z=Fh(z),w/=z,y*=w,q[f]=y,f=A*w,q[e]=f,e=y):(e=y,f=A);e-=x;f-=C;x=q[h+34];h=m+q[h+35]*(r*f-u*e);k=l[g]+12*k|0;n=(M[0]=n+e*x,t[0]);p=(M[0]=p+f*x,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=p;q[(l[g]+8>>2)+(3*l[j>>2]|0)]=h}),0,Lb(1),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+68>>2],h=q[e+5],j=q[d+72>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+76>>2],h=q[e+5],j=q[d+80>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var d=d>>2,f=q[d+26],g=q[d+29]+q[d+28],h=(q[d+49]*f+q[d+47]*g)*e;q[b>>2]=(q[d+48]*f+q[d+46]*g)*e;q[b+4>>2]=h}),0,(function(b,d){return q[b+108>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.eg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));f=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=f,s));f=q[d+17];g=q[d+18];V(N.K|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+19];g=q[d+20];V(N.L|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+21];g=q[d+22];V(N.Wb|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+25];V(N.$a|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=c[b+136|0]&1;V(N.Yb|0,(s=a,a+=4,l[s>>2]=f,s));f=q[d+30];V(N.$e|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=q[d+31];V(N.kf|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=c[b+137|0]&1;V(N.ab|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+33];V(N.bb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+32];V(N.Af|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j,k,m=b>>2,n=l[m+12];k=n>>2;var p=o[k+2],u=b+144|0;l[u>>2]=p;var r=l[m+13];j=r>>2;var w=l[j+2];h=(b+148|0)>>2;l[h]=w;var x=n+28|0,y=b+152|0,A=l[x>>2],C=l[x+4>>2];l[y>>2]=A;l[y+4>>2]=C;var z=r+28|0,D=b+160|0,E=l[z>>2],G=l[z+4>>2];l[D>>2]=E;l[D+4>>2]=G;var H=q[k+30];q[m+42]=H;var F=q[j+30];q[m+43]=F;var I=q[k+32];q[m+44]=I;var J=q[j+32];q[m+45]=J;var L=l[d+24>>2],O=L+12*p|0,R=l[O+4>>2],T=(t[0]=l[O>>2],M[0]),S=(t[0]=R,M[0]),U=q[(L+8>>2)+(3*p|0)];g=(d+28|0)>>2;var W=l[g],Q=W+12*p|0,$=l[Q+4>>2],ea=(t[0]=l[Q>>2],M[0]),sa=(t[0]=$,M[0]),Ba=q[(W+8>>2)+(3*p|0)],oa=L+12*w|0,ga=l[oa+4>>2],qa=(t[0]=l[oa>>2],M[0]),la=(t[0]=ga,M[0]),Ca=q[(L+8>>2)+(3*w|0)],ia=W+12*w|0,ya=l[ia+4>>2],ta=(t[0]=l[ia>>2],M[0]),Ia=(t[0]=ya,M[0]),na=q[(W+8>>2)+(3*w|0)],Z=mm(U),ba=nm(U),ca=mm(Ca),ma=nm(Ca),ka=q[m+17],aa=(t[0]=A,M[0]),ra=ka-aa,ha=q[m+18],za=(t[0]=C,M[0]),X=ha-za,ua=ba*ra-Z*X,da=Z*ra+ba*X,fa=q[m+19],Aa=(t[0]=E,M[0]),Pa=fa-Aa,pa=q[m+20],cb=(t[0]=G,M[0]),Qa=pa-cb,Ta=ma*Pa-ca*Qa,$a=ca*Pa+ma*Qa,va=qa-T+Ta-ua,Wa=la-S+$a-da,fb=q[m+21],gb=q[m+22],Xa=ba*fb-Z*gb,Ua=Z*fb+ba*gb,Va=b+184|0,pb=(M[0]=Xa,t[0]),nb=(M[0]=Ua,t[0])|0;l[Va>>2]=0|pb;l[Va+4>>2]=nb;var La=va+ua,qb=Wa+da,bb=La*Ua-qb*Xa;q[m+52]=bb;var Fa=Ta*Ua-$a*Xa;q[m+53]=Fa;var Ma=H+F,wa=I*bb,hb=J*Fa,Ya=Ma+wa*bb+hb*Fa;q[m+63]=0<Ya?1/Ya:Ya;var Za=q[m+23],Da=q[m+24],Na=ba*Za-Z*Da,ib=Z*Za+ba*Da,ab=b+192|0,Ga=(M[0]=Na,t[0]),jb=(M[0]=ib,t[0])|0;l[ab>>2]=0|Ga;l[ab+4>>2]=jb;var Ea=La*ib-qb*Na;q[m+50]=Ea;var Oa=Ta*ib-$a*Na;q[m+51]=Oa;var Ja=I*Ea,db=J*Oa,xa=Ja+db,Ra=Ja*bb+db*Fa,Ka=I+J,tb=0==Ka?1:Ka,kb=wa+hb;q[m+54]=Ma+Ja*Ea+db*Oa;q[m+55]=xa;q[m+56]=Ra;q[m+57]=xa;q[m+58]=tb;q[m+59]=kb;q[m+60]=Ra;q[m+61]=kb;q[m+62]=Ya;if(0==(c[b+136|0]&1)<<24>>24){l[m+35]=0,q[m+28]=0}else{var ub=Xa*va+Ua*Wa,rb=q[m+31],Bb=q[m+30],lb=rb-Bb;if(.009999999776482582>(0<lb?lb:-lb)){l[m+35]=3}else{if(ub>Bb){f=(b+140|0)>>2,ub<rb?(l[f]=0,q[m+28]=0):2!=(l[f]|0)&&(l[f]=2,q[m+28]=0)}else{var yb=b+140|0;1!=(l[yb>>2]|0)&&(l[yb>>2]=1,q[m+28]=0)}}}0==(c[b+137|0]&1)<<24>>24&&(q[m+29]=0);var xb=b+104|0;if(0==(c[d+20|0]&1)<<24>>24){e=xb>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;var Ib=na,wb=Ba,vb=ea,zb=sa,Eb=ta,Cb=Ia}else{var eb=d+8|0,sb=q[eb>>2],ob=xb|0,Db=q[ob>>2]*sb;q[ob>>2]=Db;var Jb=b+108|0,Rb=q[Jb>>2]*sb;q[Jb>>2]=Rb;var Nb=b+112|0,Ob=q[Nb>>2]*sb;q[Nb>>2]=Ob;var Kb=b+116|0,Pb=q[Kb>>2]*q[eb>>2];q[Kb>>2]=Pb;var Mb=Pb+Ob,Yb=Na*Db+Xa*Mb,Zb=ib*Db+Ua*Mb,Ib=na+J*(Db*Oa+Rb+Mb*Fa),wb=Ba-I*(Db*Ea+Rb+Mb*bb),vb=ea-Yb*H,zb=sa-Zb*H,Eb=ta+Yb*F,Cb=Ia+Zb*F}var ec=l[g]+12*p|0,Ub=(M[0]=vb,t[0]),jc=(M[0]=zb,t[0])|0;l[(ec|0)>>2]=0|Ub;l[(ec+4|0)>>2]=jc;q[(l[g]+8>>2)+(3*l[u>>2]|0)]=wb;var Qb=l[g]+12*l[h]|0,mb=(M[0]=Eb,t[0]),cc=(M[0]=Cb,t[0])|0;l[(Qb|0)>>2]=0|mb;l[(Qb+4|0)>>2]=cc;q[(l[g]+8>>2)+(3*l[h]|0)]=Ib}),0,(function(b,d){var e,f,g,h,j,k,m,n=b>>2,p=a;a+=24;var u,r=p+12;m=r>>2;k=(b+144|0)>>2;var w=o[k];j=(d+28|0)>>2;var x=l[j],y=x+12*w|0,A=l[y+4>>2],C=(t[0]=l[y>>2],M[0]),z=(t[0]=A,M[0]),D=q[(x+8>>2)+(3*w|0)];h=(b+148|0)>>2;var E=l[h],G=x+12*E|0,H=l[G+4>>2],F=(t[0]=l[G>>2],M[0]),I=(t[0]=H,M[0]),J=q[(x+8>>2)+(3*E|0)],L=q[n+42],O=q[n+43],R=q[n+44],T=q[n+45];if(0==(c[b+137|0]&1)<<24>>24){var S=J,U=D,W=C,Q=z,$=F,ea=I}else{if(3==(l[n+35]|0)){S=J,U=D,W=C,Q=z,$=F,ea=I}else{var sa=q[n+46],Ba=q[n+47],oa=q[n+53],ga=q[n+52],qa=b+116|0,la=q[qa>>2],Ca=q[d>>2]*q[n+32],ia=la+q[n+63]*(q[n+33]-(sa*(F-C)+Ba*(I-z)+oa*J-ga*D)),ya=-Ca,ta=ia<Ca?ia:Ca,Ia=ta<ya?ya:ta;q[qa>>2]=Ia;var na=Ia-la,Z=sa*na,ba=Ba*na,S=J+T*na*oa,U=D-R*na*ga,W=C-Z*L,Q=z-ba*L,$=F+Z*O,ea=I+ba*O}}var ca=$-W,ma=ea-Q,ka=b+192|0,aa=q[ka>>2],ra=b+196|0,ha=q[ra>>2],za=b+204|0,X=q[za>>2],ua=b+200|0,da=q[ua>>2],fa=aa*ca+ha*ma+X*S-da*U,Aa=S-U;if(0==(c[b+136|0]&1)<<24>>24){u=13}else{var Pa=b+140|0;if(0==(l[Pa>>2]|0)){u=13}else{var pa=b+184|0,cb=b+188|0,Qa=b+212|0,Ta=b+208|0;g=(b+104|0)>>2;var $a=q[g];f=(b+108|0)>>2;var va=q[f];e=(b+112|0)>>2;var Wa=q[e],fb=b+216|0,gb=-fa,Xa=-Aa,Ua=-(q[pa>>2]*ca+q[cb>>2]*ma+q[Qa>>2]*S-q[Ta>>2]*U);q[m]=gb;q[m+1]=Xa;q[m+2]=Ua;pn(p,fb,r);var Va=p|0;q[g]+=q[Va>>2];var pb=p+4|0;q[f]+=q[pb>>2];var nb=p+8|0,La=q[e]+q[nb>>2];q[e]=La;var qb=l[Pa>>2];if(1==(qb|0)){var bb=0<La?La:0,Fa=q[e]=bb}else{if(2==(qb|0)){var Ma=0>La?La:0,Fa=q[e]=Ma}else{Fa=La}}var wa=Fa-Wa,hb=gb-q[n+60]*wa,Ya=Xa-q[n+61]*wa,Za=q[fb>>2],Da=q[n+57],Na=q[n+55],ib=q[n+58],ab=Za*ib-Da*Na,Ga=0!=ab?1/ab:ab,jb=Ga*(ib*hb-Da*Ya)+$a,Ea=Ga*(Za*Ya-Na*hb)+va;q[g]=jb;q[f]=Ea;var Oa=jb-$a,Ja=Ea-va;q[Va>>2]=Oa;q[pb>>2]=Ja;q[nb>>2]=wa;var db=Oa*q[za>>2]+Ja+wa*q[Qa>>2],xa=Oa*q[ua>>2]+Ja+wa*q[Ta>>2],Ra=q[ka>>2]*Oa+q[pa>>2]*wa,Ka=q[ra>>2]*Oa+q[cb>>2]*wa,tb=l[k];u=16}}if(13==u){var kb=-fa,ub=-Aa,rb=q[n+54],Bb=q[n+57],lb=q[n+55],yb=q[n+58],xb=rb*yb-Bb*lb,Ib=0!=xb?1/xb:xb,wb=Ib*(yb*kb-Bb*ub),vb=Ib*(rb*ub-lb*kb),zb=b+104|0;q[zb>>2]+=wb;var Eb=b+108|0;q[Eb>>2]+=vb;db=wb*X+vb;xa=wb*da+vb;Ra=aa*wb;Ka=ha*wb;tb=w}var Cb=S+T*db,eb=U-R*xa,sb=Q-Ka*L,ob=$+Ra*O,Db=ea+Ka*O,Jb=l[j]+12*tb|0,Rb=(M[0]=W-Ra*L,t[0]),Nb=(M[0]=sb,t[0])|0;l[(Jb|0)>>2]=0|Rb;l[(Jb+4|0)>>2]=Nb;q[(l[j]+8>>2)+(3*l[k]|0)]=eb;var Ob=l[j]+12*l[h]|0,Kb=(M[0]=ob,t[0]),Pb=(M[0]=Db,t[0])|0;l[(Ob|0)>>2]=0|Kb;l[(Ob+4|0)>>2]=Pb;q[(l[j]+8>>2)+(3*l[h]|0)]=Cb;a=p}),0,(function(b,d){var e,f,g=b>>2,h=b+144|0,j=l[h>>2];f=(d+24|0)>>2;var k=l[f],m=k+12*j|0,n=l[m+4>>2],p=(t[0]=l[m>>2],M[0]),u=(t[0]=n,M[0]),r=q[(k+8>>2)+(3*j|0)];e=(b+148|0)>>2;var w=l[e],x=k+12*w|0,y=l[x+4>>2],A=(t[0]=l[x>>2],M[0]),C=(t[0]=y,M[0]),z=q[(k+8>>2)+(3*w|0)],D=mm(r),E=nm(r),G=mm(z),H=nm(z),F=q[g+42],I=q[g+43],J=q[g+44],L=q[g+45],O=q[g+17]-q[g+38],R=q[g+18]-q[g+39],T=E*O-D*R,S=D*O+E*R,U=q[g+19]-q[g+40],W=q[g+20]-q[g+41],Q=H*U-G*W,$=G*U+H*W,ea=A+Q-p-T,sa=C+$-u-S,Ba=q[g+21],oa=q[g+22],ga=E*Ba-D*oa,qa=D*Ba+E*oa,la=ea+T,Ca=sa+S,ia=la*qa-Ca*ga,ya=Q*qa-$*ga,ta=q[g+23],Ia=q[g+24],na=E*ta-D*Ia,Z=D*ta+E*Ia,ba=la*Z-Ca*na,ca=Q*Z-$*na,ma=na*ea+Z*sa,ka=z-r-q[g+25],aa=0<ma?ma:-ma,ra=0<ka?ka:-ka;if(0==(c[b+136|0]&1)<<24>>24){var ha=0,za=0,X=aa}else{var ua=ga*ea+qa*sa,da=q[g+31],fa=q[g+30],Aa=da-fa;if(.009999999776482582>(0<Aa?Aa:-Aa)){var Pa=.20000000298023224>ua?ua:.20000000298023224,pa=0<ua?ua:-ua,cb=aa>pa?aa:pa,ha=-.20000000298023224>Pa?-.20000000298023224:Pa,za=1,X=cb}else{if(ua>fa){if(ua<da){za=ha=0,X=aa}else{var Qa=ua-da,Ta=Qa-.004999999888241291,$a=.20000000298023224>Ta?Ta:.20000000298023224,va=aa>Qa?aa:Qa,ha=0>$a?0:$a,za=1,X=va}}else{var Wa=ua-fa+.004999999888241291,fb=0>Wa?Wa:0,gb=fa-ua,Xa=aa>gb?aa:gb,ha=-.20000000298023224>fb?-.20000000298023224:fb,za=1,X=Xa}}}var Ua=F+I,Va=J*ba,pb=L*ca,nb=Ua+Va*ba+pb*ca,La=Va+pb;if(za){var qb=Va*ia+pb*ya,bb=J+L,Fa=0==bb?1:bb,Ma=J*ia,wa=L*ya,hb=Ma+wa,Ya=Ua+Ma*ia+wa*ya,Za=-ma,Da=-ka,Na=-ha,ib=Fa*Ya-hb*hb,ab=hb*qb-La*Ya,Ga=La*hb-Fa*qb,jb=nb*ib+La*ab+qb*Ga,Ea=0!=jb?1/jb:jb,Oa=hb*Za,Ja=Ea*(ib*Za+ab*Da+Ga*Na),db=Ea*(nb*(Ya*Da-hb*Na)+La*(qb*Na-Ya*Za)+qb*(Oa-qb*Da)),xa=Ea*(nb*(Fa*Na-hb*Da)+La*(Oa-La*Na)+qb*(La*Da-Fa*Za))}else{var Ra=J+L,Ka=0==Ra?1:Ra,tb=-ma,kb=-ka,ub=nb*Ka-La*La,rb=0!=ub?1/ub:ub,Ja=rb*(Ka*tb-La*kb),db=rb*(nb*kb-La*tb),xa=0}var Bb=na*Ja+ga*xa,lb=Z*Ja+qa*xa,yb=u-lb*F,xb=r-J*(Ja*ba+db+xa*ia),Ib=A+Bb*I,wb=C+lb*I,vb=z+L*(Ja*ca+db+xa*ya),zb=(M[0]=p-Bb*F,t[0]),Eb=(M[0]=yb,t[0])|0;l[(m|0)>>2]=0|zb;l[(m+4|0)>>2]=Eb;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=xb;var Cb=l[f]+12*l[e]|0,eb=(M[0]=Ib,t[0]),sb=(M[0]=wb,t[0])|0;l[(Cb|0)>>2]=0|eb;l[(Cb+4|0)>>2]=sb;q[(l[f]+8>>2)+(3*l[e]|0)]=vb;return.004999999888241291<X?0:.03490658849477768>=ra}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+92>>2],h=q[e+5],j=q[d+96>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+100>>2],h=q[e+5],j=q[d+104>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+116>>2],g=q[d+140>>2]*f*e;q[b>>2]=q[d+136>>2]*f*e;q[b+4>>2]=g}),0,Lb(0),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.Pg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+17];f=q[d+18];V(N.wh|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+19];f=q[d+20];V(N.Bh|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+23];f=q[d+24];V(N.K|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+25];f=q[d+26];V(N.L|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+21];V(N.af|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+22];V(N.lf|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+28];V(N.Fb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j=b>>2,k=l[j+12];h=k>>2;var m=l[h+2],n=b+120|0;l[n>>2]=m;var p=l[j+13];g=p>>2;var u=l[g+2];f=(b+124|0)>>2;l[f]=u;var r=k+28|0,w=b+160|0,x=l[r>>2],y=l[r+4>>2];l[w>>2]=x;l[w+4>>2]=y;var A=p+28|0,C=b+168|0,z=l[A>>2],D=l[A+4>>2];l[C>>2]=z;l[C+4>>2]=D;var E=q[h+30];q[j+44]=E;var G=q[g+30];q[j+45]=G;var H=q[h+32];q[j+46]=H;var F=q[g+32];q[j+47]=F;var I=l[d+24>>2],J=I+12*m|0,L=l[J+4>>2],O=(t[0]=l[J>>2],M[0]),R=(t[0]=L,M[0]),T=q[(I+8>>2)+(3*m|0)];e=(d+28|0)>>2;var S=l[e],U=S+12*m|0,W=l[U+4>>2],Q=(t[0]=l[U>>2],M[0]),$=(t[0]=W,M[0]),ea=q[(S+8>>2)+(3*m|0)],sa=I+12*u|0,Ba=l[sa+4>>2],oa=(t[0]=l[sa>>2],M[0]),ga=(t[0]=Ba,M[0]),qa=q[(I+8>>2)+(3*u|0)],la=S+12*u|0,Ca=l[la+4>>2],ia=(t[0]=l[la>>2],M[0]),ya=(t[0]=Ca,M[0]),ta=q[(S+8>>2)+(3*u|0)],Ia=mm(T),na=nm(T),Z=mm(qa),ba=nm(qa),ca=b+144|0,ma=q[j+23],ka=(t[0]=x,M[0]),aa=ma-ka,ra=q[j+24],ha=(t[0]=y,M[0]),za=ra-ha,X=na*aa-Ia*za,ua=Ia*aa+na*za,da=(M[0]=X,t[0]),fa=(M[0]=ua,t[0])|0;l[ca>>2]=0|da;l[ca+4>>2]=fa;var Aa=b+152|0,Pa=q[j+25],pa=(t[0]=z,M[0]),cb=Pa-pa,Qa=q[j+26],Ta=(t[0]=D,M[0]),$a=Qa-Ta,va=ba*cb-Z*$a,Wa=Z*cb+ba*$a,fb=(M[0]=va,t[0]),gb=(M[0]=Wa,t[0])|0;l[Aa>>2]=0|fb;l[Aa+4>>2]=gb;var Xa=b+128|0,Ua=O+X-q[j+17],Va=R+ua-q[j+18],pb=(M[0]=Ua,t[0]),nb=(M[0]=Va,t[0])|0;l[Xa>>2]=0|pb;l[Xa+4>>2]=nb;var La=b+136|0,qb=oa+va-q[j+19],bb=ga+Wa-q[j+20],Fa=(M[0]=qb,t[0]),Ma=(M[0]=bb,t[0])|0;l[La>>2]=0|Fa;l[La+4>>2]=Ma;var wa=Xa|0,hb=b+132|0,Ya=Fh(Ua*Ua+Va*Va),Za=La|0,Da=b+140|0,Na=Fh(qb*qb+bb*bb);if(.04999999701976776<Ya){var ib=1/Ya,ab=Ua*ib;q[wa>>2]=ab;var Ga=Va*ib,jb=ab}else{jb=Ga=q[wa>>2]=0}q[hb>>2]=Ga;if(.04999999701976776<Na){var Ea=1/Na,Oa=qb*Ea;q[Za>>2]=Oa;var Ja=bb*Ea,db=Oa}else{db=Ja=q[Za>>2]=0}q[Da>>2]=Ja;var xa=X*Ga-ua*jb,Ra=va*Ja-Wa*db,Ka=q[j+28],tb=E+H*xa*xa+Ka*Ka*(G+F*Ra*Ra);q[j+48]=0<tb?1/tb:tb;if(0==(c[d+20|0]&1)<<24>>24){q[j+29]=0;var kb=ta,ub=ea,rb=Q,Bb=$,lb=ia,yb=ya}else{var xb=b+116|0,Ib=q[xb>>2]*q[d+8>>2];q[xb>>2]=Ib;var wb=-Ib,vb=jb*wb,zb=Ga*wb,Eb=Ib*-Ka,Cb=db*Eb,eb=Ja*Eb,kb=ta+F*(va*eb-Wa*Cb),ub=ea+H*(X*zb-ua*vb),rb=Q+vb*E,Bb=$+zb*E,lb=ia+Cb*G,yb=ya+eb*G}var sb=l[e]+12*m|0,ob=(M[0]=rb,t[0]),Db=(M[0]=Bb,t[0])|0;l[(sb|0)>>2]=0|ob;l[(sb+4|0)>>2]=Db;q[(l[e]+8>>2)+(3*l[n>>2]|0)]=ub;var Jb=l[e]+12*l[f]|0,Rb=(M[0]=lb,t[0]),Nb=(M[0]=yb,t[0])|0;l[(Jb|0)>>2]=0|Rb;l[(Jb+4|0)>>2]=Nb;q[(l[e]+8>>2)+(3*l[f]|0)]=kb}),0,(function(b,d){var e,f,g=b>>2,h=b+120|0,j=l[h>>2];f=(d+28|0)>>2;var k=l[f],m=k+12*j|0;e=l[m+4>>2];var n=(t[0]=l[m>>2],M[0]),p=(t[0]=e,M[0]),u=q[(k+8>>2)+(3*j|0)];e=(b+124|0)>>2;var r=l[e],m=k+12*r|0,w=l[m+4>>2],m=(t[0]=l[m>>2],M[0]),w=(t[0]=w,M[0]),k=q[(k+8>>2)+(3*r|0)],x=q[g+37],y=q[g+36],r=q[g+39],A=q[g+38],C=q[g+32],z=q[g+33],D=q[g+28],E=q[g+34],G=q[g+35],H=(-(C*(n+x*-u)+z*(p+y*u))-D*(E*(m+r*-k)+G*(w+A*k)))*-q[g+48],F=b+116|0;q[F>>2]+=H;F=-H;C*=F;z*=F;D=H*-D;E*=D;G*=D;D=q[g+44];x=u+q[g+46]*(y*z-x*C);u=q[g+45];g=k+q[g+47]*(A*G-r*E);j=l[f]+12*j|0;n=(M[0]=n+C*D,t[0]);p=(M[0]=p+z*D,t[0])|0;l[(j|0)>>2]=0|n;l[(j+4|0)>>2]=p;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=x;h=l[f]+12*l[e]|0;m=(M[0]=m+E*u,t[0]);w=(M[0]=w+G*u,t[0])|0;l[(h|0)>>2]=0|m;l[(h+4|0)>>2]=w;q[(l[f]+8>>2)+(3*l[e]|0)]=g}),0,(function(b,d){var e,f,g=b>>2,h=b+120|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+124|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),j=q[(j+8>>2)+(3*u|0)],x=mm(p),y=nm(p),A=mm(j),C=nm(j),z=q[g+23]-q[g+40],D=q[g+24]-q[g+41],u=y*z-x*D,y=x*z+y*D,z=q[g+25]-q[g+42],D=q[g+26]-q[g+43],x=C*z-A*D,A=A*z+C*D,E=n+u-q[g+17],D=m+y-q[g+18],z=r+x-q[g+19],C=w+A-q[g+20],G=Fh(E*E+D*D),H=Fh(z*z+C*C);if(.04999999701976776<G){var F=1/G,E=E*F,I=D*F}else{I=E=0}if(.04999999701976776<H){var D=1/H,J=z*D,L=C*D}else{L=J=0}var O=u*I-y*E,R=x*L-A*J,F=q[g+44],D=q[g+46],z=q[g+45],C=q[g+47],T=q[g+28],O=F+D*O*O+T*T*(z+C*R*R),g=q[g+27]-G-T*H,G=g*-(0<O?1/O:O),H=-G,E=E*H,I=I*H,G=G*-T,J=J*G,L=L*G,n=(M[0]=n+E*F,t[0]),m=(M[0]=m+I*F,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=p+D*(u*I-y*E);h=l[f]+12*l[e]|0;k=(M[0]=r+J*z,t[0]);n=(M[0]=w+L*z,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=j+C*(x*L-A*J);return.004999999888241291>(0<g?g:-g)}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+68>>2],h=q[e+5],j=q[d+72>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+76>>2],h=q[e+5],j=q[d+80>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+88>>2]*e;q[b>>2]=q[d+84>>2]*e;q[b+4>>2]=f}),0,(function(b,d){return q[b+92>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.gg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));f=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=f,s));f=q[d+17];g=q[d+18];V(N.K|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+19];g=q[d+20];V(N.L|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+29];V(N.$a|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=c[b+112|0]&1;V(N.Yb|0,(s=a,a+=4,l[s>>2]=f,s));f=q[d+30];V(N.Ve|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=q[d+31];V(N.bf|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=c[b+100|0]&1;V(N.ab|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+27];V(N.bb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+26];V(N.Zb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j,k,m=b>>2,n=l[m+12];k=n>>2;var p=o[k+2],u=b+128|0;l[u>>2]=p;var r=l[m+13];j=r>>2;var w=l[j+2];h=(b+132|0)>>2;l[h]=w;var x=n+28|0,y=b+152|0,A=l[x>>2],C=l[x+4>>2];l[y>>2]=A;l[y+4>>2]=C;var z=r+28|0,D=b+160|0,E=l[z>>2],G=l[z+4>>2];l[D>>2]=E;l[D+4>>2]=G;var H=q[k+30];q[m+42]=H;var F=q[j+30];q[m+43]=F;var I=q[k+32];q[m+44]=I;var J=q[j+32];q[m+45]=J;var L=l[d+24>>2],O=q[(L+8>>2)+(3*p|0)];g=(d+28|0)>>2;var R=l[g],T=R+12*p|0,S=l[T+4>>2],U=(t[0]=l[T>>2],M[0]),W=(t[0]=S,M[0]),Q=q[(R+8>>2)+(3*p|0)],$=q[(L+8>>2)+(3*w|0)],ea=R+12*w|0,sa=l[ea+4>>2],Ba=(t[0]=l[ea>>2],M[0]),oa=(t[0]=sa,M[0]),ga=q[(R+8>>2)+(3*w|0)],qa=mm(O),la=nm(O),Ca=mm($),ia=nm($),ya=b+136|0,ta=q[m+17],Ia=(t[0]=A,M[0]),na=ta-Ia,Z=q[m+18],ba=(t[0]=C,M[0]),ca=Z-ba,ma=la*na-qa*ca,ka=qa*na+la*ca,aa=(M[0]=ma,t[0]),ra=(M[0]=ka,t[0])|0;l[ya>>2]=0|aa;l[ya+4>>2]=ra;var ha=b+144|0,za=q[m+19],X=(t[0]=E,M[0]),ua=za-X,da=q[m+20],fa=(t[0]=G,M[0]),Aa=da-fa,Pa=ia*ua-Ca*Aa,pa=Ca*ua+ia*Aa,cb=(M[0]=Pa,t[0]),Qa=(M[0]=pa,t[0])|0;l[ha>>2]=0|cb;l[ha+4>>2]=Qa;var Ta=I+J,$a=0==Ta,va=H+F;q[m+46]=va+ka*ka*I+pa*pa*J;var Wa=-ka,fb=ma*Wa*I-pa*Pa*J;q[m+49]=fb;var gb=I*Wa-pa*J;q[m+52]=gb;q[m+47]=fb;q[m+50]=va+ma*ma*I+Pa*Pa*J;var Xa=ma*I+Pa*J;q[m+53]=Xa;q[m+48]=gb;q[m+51]=Xa;q[m+54]=Ta;q[m+55]=0<Ta?1/Ta:Ta;0==(c[b+100|0]&1)<<24>>24|$a&&(q[m+24]=0);if(0==(c[b+112|0]&1)<<24>>24|$a){l[m+56]=0}else{var Ua=$-O-q[m+29],Va=q[m+31],pb=q[m+30],nb=Va-pb;if(.06981317698955536>(0<nb?nb:-nb)){l[m+56]=3}else{if(Ua>pb){f=(b+224|0)>>2,Ua<Va?(l[f]=0,q[m+23]=0):(2!=(l[f]|0)&&(q[m+23]=0),l[f]=2)}else{var La=b+224|0;1!=(l[La>>2]|0)&&(q[m+23]=0);l[La>>2]=1}}}var qb=b+84|0;if(0==(c[d+20|0]&1)<<24>>24){e=qb>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;var bb=ga,Fa=Q,Ma=U,wa=W,hb=Ba,Ya=oa}else{var Za=d+8|0,Da=q[Za>>2],Na=qb|0,ib=q[Na>>2]*Da;q[Na>>2]=ib;var ab=b+88|0,Ga=q[ab>>2]*Da;q[ab>>2]=Ga;var jb=b+92|0,Ea=q[jb>>2]*Da;q[jb>>2]=Ea;var Oa=b+96|0,Ja=q[Oa>>2]*q[Za>>2];q[Oa>>2]=Ja;bb=ga+J*(Pa*Ga-pa*ib+Ja+Ea);Fa=Q-I*(ma*Ga-ka*ib+Ja+Ea);Ma=U-ib*H;wa=W-Ga*H;hb=Ba+ib*F;Ya=oa+Ga*F}var db=l[g]+12*p|0,xa=(M[0]=Ma,t[0]),Ra=(M[0]=wa,t[0])|0;l[(db|0)>>2]=0|xa;l[(db+4|0)>>2]=Ra;q[(l[g]+8>>2)+(3*l[u>>2]|0)]=Fa;var Ka=l[g]+12*l[h]|0,tb=(M[0]=hb,t[0]),kb=(M[0]=Ya,t[0])|0;l[(Ka|0)>>2]=0|tb;l[(Ka+4|0)>>2]=kb;q[(l[g]+8>>2)+(3*l[h]|0)]=bb}),0,(function(b,d){var e,f,g,h,j,k,m,n=b>>2,p=a;a+=24;var u;m=p>>2;var r=p+12;k=r>>2;j=(b+128|0)>>2;var w=o[j];h=(d+28|0)>>2;var x=l[h],y=x+12*w|0,A=l[y+4>>2],C=(t[0]=l[y>>2],M[0]),z=(t[0]=A,M[0]),D=q[(x+8>>2)+(3*w|0)];g=(b+132|0)>>2;var E=l[g],G=x+12*E|0,H=l[G+4>>2],F=(t[0]=l[G>>2],M[0]),I=(t[0]=H,M[0]),J=q[(x+8>>2)+(3*E|0)],L=q[n+42],O=q[n+43],R=q[n+44],T=q[n+45],S=0==R+T;if(0==(c[b+100|0]&1)<<24>>24){var U=J,W=D}else{if(3==(l[n+56]|0)|S){U=J,W=D}else{var Q=b+96|0,$=q[Q>>2],ea=q[d>>2]*q[n+26],sa=$+(J-D-q[n+27])*-q[n+55],Ba=-ea,oa=sa<ea?sa:ea,ga=oa<Ba?Ba:oa;q[Q>>2]=ga;var qa=ga-$,U=J+T*qa,W=D-R*qa}}if(0==(c[b+112|0]&1)<<24>>24){u=20}else{var la=b+224|0;if(0==(l[la>>2]|0)|S){u=20}else{var Ca=b+148|0,ia=b+144|0,ya=b+140|0,ta=b+136|0,Ia=F+q[Ca>>2]*-U-C-q[ya>>2]*-W,na=I+q[ia>>2]*U-z-q[ta>>2]*W;q[m]=Ia;q[m+1]=na;q[m+2]=U-W;var Z=b+184|0;pn(r,Z,p);var ba=q[k],ca=-ba,ma=q[k+1],ka=-ma,aa=q[k+2],ra=-aa,ha=l[la>>2];if(3==(ha|0)){var za=b+84|0;q[za>>2]-=ba;var X=b+88|0;q[X>>2]-=ma;var ua=b+92|0;q[ua>>2]-=aa;var da=ca,fa=ka,Aa=ra}else{if(1==(ha|0)){var Pa=b+84|0;f=(b+92|0)>>2;var pa=q[f],cb=pa-aa;if(0>cb){var Qa=q[n+52]*pa-Ia,Ta=q[n+53]*pa-na,$a=q[Z>>2],va=q[n+49],Wa=q[n+47],fb=q[n+50],gb=$a*fb-va*Wa,Xa=0!=gb?1/gb:gb,Ua=Xa*(fb*Qa-va*Ta),Va=Xa*($a*Ta-Wa*Qa),pb=-pa,nb=Pa|0;q[nb>>2]+=Ua;var La=b+88|0;q[La>>2]+=Va;q[f]=0;da=Ua;fa=Va;Aa=pb}else{var qb=Pa|0;q[qb>>2]-=ba;var bb=b+88|0;q[bb>>2]-=ma;q[f]=cb;da=ca;fa=ka;Aa=ra}}else{if(2==(ha|0)){var Fa=b+84|0;e=(b+92|0)>>2;var Ma=q[e],wa=Ma-aa;if(0<wa){var hb=q[n+52]*Ma-Ia,Ya=q[n+53]*Ma-na,Za=q[Z>>2],Da=q[n+49],Na=q[n+47],ib=q[n+50],ab=Za*ib-Da*Na,Ga=0!=ab?1/ab:ab,jb=Ga*(ib*hb-Da*Ya),Ea=Ga*(Za*Ya-Na*hb),Oa=-Ma,Ja=Fa|0;q[Ja>>2]+=jb;var db=b+88|0;q[db>>2]+=Ea;q[e]=0;da=jb;fa=Ea;Aa=Oa}else{var xa=Fa|0;q[xa>>2]-=ba;var Ra=b+88|0;q[Ra>>2]-=ma;q[e]=wa;da=ca;fa=ka;Aa=ra}}else{da=ca,fa=ka,Aa=ra}}}var Ka=q[ia>>2]*fa-q[Ca>>2]*da+Aa,tb=q[ta>>2]*fa-q[ya>>2]*da+Aa,kb=da,ub=fa,rb=l[j];u=23}}if(20==u){var Bb=q[n+37],lb=q[n+36],yb=q[n+35],xb=q[n+34],Ib=-(F+Bb*-U-C-yb*-W),wb=-(I+lb*U-z-xb*W),vb=q[n+46],zb=q[n+49],Eb=q[n+47],Cb=q[n+50],eb=vb*Cb-zb*Eb,sb=0!=eb?1/eb:eb,ob=sb*(Cb*Ib-zb*wb),Db=sb*(vb*wb-Eb*Ib),Jb=b+84|0;q[Jb>>2]+=ob;var Rb=b+88|0;q[Rb>>2]+=Db;Ka=lb*Db-Bb*ob;tb=xb*Db-yb*ob;kb=ob;ub=Db;rb=w}var Nb=z-ub*L,Ob=F+kb*O,Kb=I+ub*O,Pb=U+T*Ka,Mb=W-R*tb,Yb=l[h]+12*rb|0,Zb=(M[0]=C-kb*L,t[0]),ec=(M[0]=Nb,t[0])|0;l[(Yb|0)>>2]=0|Zb;l[(Yb+4|0)>>2]=ec;q[(l[h]+8>>2)+(3*l[j]|0)]=Mb;var Ub=l[h]+12*l[g]|0,jc=(M[0]=Ob,t[0]),Qb=(M[0]=Kb,t[0])|0;l[(Ub|0)>>2]=0|jc;l[(Ub+4|0)>>2]=Qb;q[(l[h]+8>>2)+(3*l[g]|0)]=Pb;a=p}),0,(function(b,d){var e,f,g=b>>2,h=b+128|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+132|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),u=q[(j+8>>2)+(3*u|0)],x=b+176|0,y=b+180|0;if(0==(c[b+112|0]&1)<<24>>24){j=p,p=u,u=0,x=q[x>>2],y=q[y>>2]}else{if(y=q[y>>2],x=q[x>>2],j=l[g+56],0==(j|0)|0==x+y){j=p,p=u,u=0}else{var A=u-p-q[g+29];if(3==(j|0)){var j=A-q[g+30],j=.13962635397911072>j?j:.13962635397911072,j=-.13962635397911072>j?-.13962635397911072:j,A=j*-q[g+55],C=0<j?j:-j}else{1==(j|0)?(j=A-q[g+30],A=j+.03490658849477768,A=0>A?A:0,A=(-.13962635397911072>A?-.13962635397911072:A)*-q[g+55],C=-j):2==(j|0)?(j=A-q[g+31],A=j-.03490658849477768,A=.13962635397911072>A?A:.13962635397911072,A=(0>A?0:A)*-q[g+55],C=j):C=A=0}j=p-x*A;p=u+y*A;u=C}}var C=mm(j),z=nm(j),D=mm(p),E=nm(p),G=q[g+17]-q[g+38],H=q[g+18]-q[g+39],A=z*G-C*H,z=C*G+z*H,G=q[g+19]-q[g+40],H=q[g+20]-q[g+41],C=E*G-D*H,D=D*G+E*H,F=r+C-n-A,I=w+D-m-z,E=Fh(F*F+I*I),G=q[g+42],g=q[g+43],H=G+g,J=H+x*z*z+y*D*D,L=y*C,O=A*-x*z-L*D,H=H+x*A*A+L*C,L=J*H-O*O,L=0!=L?1/L:L,H=-(L*(H*F-O*I)),F=-(L*(J*I-O*F)),n=(M[0]=n-G*H,t[0]),m=(M[0]=m-G*F,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=j-x*(A*F-z*H);h=l[f]+12*l[e]|0;k=(M[0]=r+g*H,t[0]);n=(M[0]=w+g*F,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=p+y*(C*F-D*H);return.004999999888241291<E?0:.03490658849477768>=u}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+68>>2],h=q[e+5],j=q[d+72>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+76>>2],h=q[e+5],j=q[d+80>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var e=q[d+92>>2]*e,f=q[d+108>>2]*e;q[b>>2]=q[d+104>>2]*e;q[b+4>>2]=f}),0,Lb(0),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.Tg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+17];f=q[d+18];V(N.K|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+19];f=q[d+20];V(N.L|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+21];V(N.sh|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j=b>>2,k=l[j+12];h=k>>2;var m=o[h+2],n=b+96|0;l[n>>2]=m;var p=l[j+13];g=p>>2;var u=l[g+2];f=(b+100|0)>>2;l[f]=u;var r=k+28|0,w=b+128|0,x=l[r>>2],y=l[r+4>>2];l[w>>2]=x;l[w+4>>2]=y;var A=p+28|0,C=b+136|0,z=l[A>>2],D=l[A+4>>2];l[C>>2]=z;l[C+4>>2]=D;var E=q[h+30];q[j+36]=E;var G=q[g+30];q[j+37]=G;var H=q[h+32];q[j+38]=H;var F=q[g+32];q[j+39]=F;var I=l[d+24>>2],J=I+12*m|0,L=l[J+4>>2],O=(t[0]=l[J>>2],M[0]),R=(t[0]=L,M[0]),T=q[(I+8>>2)+(3*m|0)];e=(d+28|0)>>2;var S=l[e],U=S+12*m|0,W=l[U+4>>2],Q=(t[0]=l[U>>2],M[0]),$=(t[0]=W,M[0]),ea=q[(S+8>>2)+(3*m|0)],sa=I+12*u|0,Ba=l[sa+4>>2],oa=(t[0]=l[sa>>2],M[0]),ga=(t[0]=Ba,M[0]),qa=q[(I+8>>2)+(3*u|0)],la=S+12*u|0,Ca=l[la+4>>2],ia=(t[0]=l[la>>2],M[0]),ya=(t[0]=Ca,M[0]),ta=q[(S+8>>2)+(3*u|0)],Ia=mm(T),na=nm(T),Z=mm(qa),ba=nm(qa),ca=b+112|0,ma=q[j+17],ka=(t[0]=x,M[0]),aa=ma-ka,ra=q[j+18],ha=(t[0]=y,M[0]),za=ra-ha,X=na*aa-Ia*za,ua=Ia*aa+na*za,da=(M[0]=X,t[0]),fa=(M[0]=ua,t[0])|0;l[ca>>2]=0|da;l[ca+4>>2]=fa;var Aa=b+120|0,Pa=q[j+19],pa=(t[0]=z,M[0]),cb=Pa-pa,Qa=q[j+20],Ta=(t[0]=D,M[0]),$a=Qa-Ta,va=ba*cb-Z*$a,Wa=Z*cb+ba*$a,fb=(M[0]=va,t[0]),gb=(M[0]=Wa,t[0])|0;l[Aa>>2]=0|fb;l[Aa+4>>2]=gb;var Xa=b+104|0,Ua=oa+va-O-X,Va=ga+Wa-R-ua,pb=(M[0]=Ua,t[0]),nb=(M[0]=Va,t[0])|0;l[Xa>>2]=0|pb;l[Xa+4>>2]=nb;var La=Xa|0,qb=b+108|0,bb=Fh(Ua*Ua+Va*Va);q[j+22]=bb;l[j+41]=0<bb-q[j+21]?2:0;if(.004999999888241291<bb){var Fa=1/bb,Ma=Ua*Fa;q[La>>2]=Ma;var wa=Va*Fa;q[qb>>2]=wa;var hb=X*wa-ua*Ma,Ya=va*wa-Wa*Ma,Za=E+H*hb*hb+G+F*Ya*Ya;q[j+40]=0!=Za?1/Za:0;if(0==(c[d+20|0]&1)<<24>>24){q[j+23]=0;var Da=ta,Na=ea,ib=Q,ab=$,Ga=ia,jb=ya}else{var Ea=b+92|0,Oa=q[Ea>>2]*q[d+8>>2];q[Ea>>2]=Oa;var Ja=Ma*Oa,db=wa*Oa,Da=ta+F*(va*db-Wa*Ja),Na=ea-H*(X*db-ua*Ja),ib=Q-Ja*E,ab=$-db*E,Ga=ia+Ja*G,jb=ya+db*G}var xa=l[e]+12*m|0,Ra=(M[0]=ib,t[0]),Ka=(M[0]=ab,t[0])|0;l[(xa|0)>>2]=0|Ra;l[(xa+4|0)>>2]=Ka;q[(l[e]+8>>2)+(3*l[n>>2]|0)]=Na;var tb=l[e]+12*l[f]|0,kb=(M[0]=Ga,t[0]),ub=(M[0]=jb,t[0])|0;l[(tb|0)>>2]=0|kb;l[(tb+4|0)>>2]=ub;q[(l[e]+8>>2)+(3*l[f]|0)]=Da}else{q[La>>2]=0,q[qb>>2]=0,q[j+40]=0,q[j+23]=0}}),0,(function(b,d){var e,f,g=b>>2,h=b+96|0,j=l[h>>2];f=(d+28|0)>>2;var k=l[f],m=k+12*j|0;e=l[m+4>>2];var n=(t[0]=l[m>>2],M[0]),p=(t[0]=e,M[0]),u=q[(k+8>>2)+(3*j|0)];e=(b+100|0)>>2;var r=l[e],m=k+12*r|0,w=l[m+4>>2],m=(t[0]=l[m>>2],M[0]),w=(t[0]=w,M[0]),k=q[(k+8>>2)+(3*r|0)],x=q[g+29],y=q[g+28],r=q[g+31],A=q[g+30],C=q[g+22]-q[g+21],z=q[g+26],D=q[g+27],E=z*(m+r*-k-(n+x*-u))+D*(w+A*k-(p+y*u)),G=b+92|0,H=q[G>>2],C=H+(0>C?E+q[d+4>>2]*C:E)*-q[g+40],C=0<C?0:C;q[G>>2]=C;G=C-H;z*=G;D*=G;G=q[g+36];x=u-q[g+38]*(y*D-x*z);u=q[g+37];g=k+q[g+39]*(A*D-r*z);j=l[f]+12*j|0;n=(M[0]=n-z*G,t[0]);p=(M[0]=p-D*G,t[0])|0;l[(j|0)>>2]=0|n;l[(j+4|0)>>2]=p;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=x;h=l[f]+12*l[e]|0;m=(M[0]=m+z*u,t[0]);w=(M[0]=w+D*u,t[0])|0;l[(h|0)>>2]=0|m;l[(h+4|0)>>2]=w;q[(l[f]+8>>2)+(3*l[e]|0)]=g}),0,(function(b,d){var e,f,g=b>>2,h=b+96|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+100|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),j=q[(j+8>>2)+(3*u|0)],x=mm(p),y=nm(p),A=mm(j),C=nm(j),z=q[g+17]-q[g+32],D=q[g+18]-q[g+33],u=y*z-x*D,y=x*z+y*D,z=q[g+19]-q[g+34],D=q[g+20]-q[g+35],x=C*z-A*D,z=A*z+C*D,D=r+x-n-u,C=w+z-m-y,A=Fh(D*D+C*C);if(1.1920928955078125e-7>A){var A=0,E=C}else{E=1/A,D*=E,E*=C}var C=b+84|0,G=A-q[C>>2],G=.20000000298023224>G?G:.20000000298023224,G=(0>G?0:G)*-q[g+40],D=D*G,E=E*G,G=q[g+36],u=p-q[g+38]*(u*E-y*D),p=q[g+37],g=j+q[g+39]*(x*E-z*D),n=(M[0]=n-D*G,t[0]),m=(M[0]=m-E*G,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=u;h=l[f]+12*l[e]|0;k=(M[0]=r+D*p,t[0]);n=(M[0]=w+E*p,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=g;return.004999999888241291>A-q[C>>2]}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+80>>2],h=q[e+5],j=q[d+84>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+88>>2],h=q[e+5],j=q[d+92>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+108>>2]*e;q[b>>2]=q[d+104>>2]*e;q[b+4>>2]=f}),0,(function(b,d){return q[b+112>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.Ug|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+20];f=q[d+21];V(N.K|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+22];f=q[d+23];V(N.L|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+24];V(N.$a|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+17];V(N.Na|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+18];V(N.Oa|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j,k=b>>2,m=l[k+12];j=m>>2;var n=o[j+2],p=b+116|0;l[p>>2]=n;var u=l[k+13];h=u>>2;var r=l[h+2];g=(b+120|0)>>2;l[g]=r;var w=m+28|0,x=b+140|0,y=l[w>>2],A=l[w+4>>2];l[x>>2]=y;l[x+4>>2]=A;var C=u+28|0,z=b+148|0,D=l[C>>2],E=l[C+4>>2];l[z>>2]=D;l[z+4>>2]=E;var G=q[j+30];q[k+39]=G;var H=q[h+30];q[k+40]=H;var F=q[j+32];q[k+41]=F;var I=q[h+32];q[k+42]=I;var J=l[d+24>>2],L=q[(J+8>>2)+(3*n|0)];f=(d+28|0)>>2;var O=l[f],R=O+12*n|0,T=l[R+4>>2],S=(t[0]=l[R>>2],M[0]),U=(t[0]=T,M[0]),W=q[(O+8>>2)+(3*n|0)],Q=q[(J+8>>2)+(3*r|0)],$=O+12*r|0,ea=l[$+4>>2],sa=(t[0]=l[$>>2],M[0]),Ba=(t[0]=ea,M[0]),oa=q[(O+8>>2)+(3*r|0)],ga=mm(L),qa=nm(L),la=mm(Q),Ca=nm(Q),ia=b+124|0,ya=q[k+20],ta=(t[0]=y,M[0]),Ia=ya-ta,na=q[k+21],Z=(t[0]=A,M[0]),ba=na-Z,ca=qa*Ia-ga*ba,ma=ga*Ia+qa*ba,ka=(M[0]=ca,t[0]),aa=(M[0]=ma,t[0])|0;l[ia>>2]=0|ka;l[ia+4>>2]=aa;var ra=b+132|0,ha=q[k+22],za=(t[0]=D,M[0]),X=ha-za,ua=q[k+23],da=(t[0]=E,M[0]),fa=ua-da,Aa=Ca*X-la*fa,Pa=la*X+Ca*fa,pa=(M[0]=Aa,t[0]),cb=(M[0]=Pa,t[0])|0;l[ra>>2]=0|pa;l[ra+4>>2]=cb;var Qa=G+H,Ta=Qa+ma*ma*F+Pa*Pa*I,$a=-ma,va=ca*$a*F-Pa*Aa*I,Wa=F*$a-Pa*I,fb=Qa+ca*ca*F+Aa*Aa*I,gb=ca*F+Aa*I,Xa=F+I,Ua=q[k+17],Va=b+172|0;if(0<Ua){var pb=Ta*fb-va*va,nb=0!=pb?1/pb:pb;q[Va>>2]=nb*fb;var La=va*-nb;q[k+46]=La;q[k+45]=0;q[k+44]=La;q[k+47]=nb*Ta;e=(b+192|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;var qb=0<Xa?1/Xa:0,bb=Q-L-q[k+24],Fa=6.2831854820251465*Ua,Ma=qb*Fa*Fa,wa=q[d>>2],hb=wa*(2*qb*q[k+18]*Fa+wa*Ma),Ya=b+100|0;q[Ya>>2]=hb;var Za=0!=hb?1/hb:0;q[Ya>>2]=Za;q[k+19]=bb*wa*Ma*Za;var Da=Xa+Za;q[k+51]=0!=Da?1/Da:0}else{var Na=fb*Xa-gb*gb,ib=gb*Wa-va*Xa,ab=va*gb-fb*Wa,Ga=Ta*Na+va*ib+Wa*ab,jb=0!=Ga?1/Ga:Ga;q[Va>>2]=jb*Na;var Ea=jb*ib;q[k+44]=Ea;var Oa=jb*ab;q[k+45]=Oa;q[k+46]=Ea;q[k+47]=jb*(Ta*Xa-Wa*Wa);var Ja=jb*(Wa*va-Ta*gb);q[k+48]=Ja;q[k+49]=Oa;q[k+50]=Ja;q[k+51]=jb*(Ta*fb-va*va);q[k+25]=0;q[k+19]=0}var db=b+104|0;if(0==(c[d+20|0]&1)<<24>>24){q[db>>2]=0;q[k+27]=0;q[k+28]=0;var xa=oa,Ra=W,Ka=S,tb=U,kb=sa,ub=Ba}else{var rb=q[d+8>>2],Bb=db|0,lb=q[Bb>>2]*rb;q[Bb>>2]=lb;var yb=b+108|0,xb=q[yb>>2]*rb;q[yb>>2]=xb;var Ib=b+112|0,wb=q[Ib>>2]*rb;q[Ib>>2]=wb;xa=oa+I*(Aa*xb-Pa*lb+wb);Ra=W-F*(ca*xb-ma*lb+wb);Ka=S-lb*G;tb=U-xb*G;kb=sa+lb*H;ub=Ba+xb*H}var vb=l[f]+12*n|0,zb=(M[0]=Ka,t[0]),Eb=(M[0]=tb,t[0])|0;l[(vb|0)>>2]=0|zb;l[(vb+4|0)>>2]=Eb;q[(l[f]+8>>2)+(3*l[p>>2]|0)]=Ra;var Cb=l[f]+12*l[g]|0,eb=(M[0]=kb,t[0]),sb=(M[0]=ub,t[0])|0;l[(Cb|0)>>2]=0|eb;l[(Cb+4|0)>>2]=sb;q[(l[f]+8>>2)+(3*l[g]|0)]=xa}),0,(function(b,d){var e,f,g=b>>2,h=b+116|0,j=l[h>>2];f=(d+28|0)>>2;var k=l[f],m=k+12*j|0;e=l[m+4>>2];var n=(t[0]=l[m>>2],M[0]),p=(t[0]=e,M[0]),u=q[(k+8>>2)+(3*j|0)];e=(b+120|0)>>2;var r=l[e],m=k+12*r|0,w=l[m+4>>2],m=(t[0]=l[m>>2],M[0]),w=(t[0]=w,M[0]),x=q[(k+8>>2)+(3*r|0)],r=q[g+39],k=q[g+40],y=q[g+41],A=q[g+42];if(0<q[g+17]){var C=b+112|0,z=q[C>>2],D=(x-u+q[g+19]+q[g+25]*z)*-q[g+51];q[C>>2]=z+D;var u=u-y*D,C=x+A*D,z=q[g+34],E=q[g+33],x=q[g+32],D=q[g+31],G=m+z*-C-n-x*-u,H=w+E*C-p-D*u,F=q[g+43]*G+q[g+46]*H,H=q[g+44]*G+q[g+47]*H,G=-F,g=-H,I=b+104|0;q[I>>2]-=F;F=b+108|0;q[F>>2]-=H;A=C+A*(E*g-z*G);y=u-y*(D*g-x*G);u=G}else{var z=q[g+34],E=q[g+33],D=q[g+32],C=q[g+31],H=m+z*-x-n-D*-u,I=w+E*x-p-C*u,J=x-u,G=q[g+43]*H+q[g+46]*I+q[g+49]*J,F=q[g+44]*H+q[g+47]*I+q[g+50]*J,I=q[g+45]*H+q[g+48]*I+q[g+51]*J,H=-G,g=-F,J=b+104|0;q[J>>2]-=G;G=b+108|0;q[G>>2]-=F;F=b+112|0;q[F>>2]-=I;A=x+A*(E*g-z*H-I);y=u-y*(C*g-D*H-I);u=H}j=l[f]+12*j|0;n=(M[0]=n-r*u,t[0]);p=(M[0]=p-r*g,t[0])|0;l[(j|0)>>2]=0|n;l[(j+4|0)>>2]=p;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=y;h=l[f]+12*l[e]|0;m=(M[0]=m+k*u,t[0]);w=(M[0]=w+k*g,t[0])|0;l[(h|0)>>2]=0|m;l[(h+4|0)>>2]=w;q[(l[f]+8>>2)+(3*l[e]|0)]=A}),0,(function(b,d){var e,f,g=b>>2,h=b+116|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+120|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),j=q[(j+8>>2)+(3*u|0)],x=mm(p),y=nm(p),A=mm(j),C=nm(j),z=q[g+39],D=q[g+40],E=q[g+41],u=q[g+42],G=q[g+20]-q[g+35],H=q[g+21]-q[g+36],F=y*G-x*H,y=x*G+y*H,G=q[g+22]-q[g+37],H=q[g+23]-q[g+38],x=C*G-A*H,A=A*G+C*H,H=z+D,C=H+y*y*E+A*A*u,I=-y,G=F*I*E-A*x*u,J=E*I-A*u,L=H+F*F*E+x*x*u,O=F*E+x*u,R=E+u,H=r+x-n-F,I=w+A-m-y;if(0<q[g+17]){g=Fh(H*H+I*I),J=C*L-G*G,O=0!=J?1/J:J,J=-(O*(L*H-G*I)),G=-(O*(C*I-G*H)),C=0,F=F*G-y*J,x=x*G-A*J,y=J}else{var T=j-p-q[g+24],g=Fh(H*H+I*I),S=L*R-O*O,U=O*J-G*R,W=G*O-L*J,Q=C*S+G*U+J*W,Q=0!=Q?1/Q:Q,$=H*O,L=Q*(C*(L*T-O*I)+G*($-G*T)+J*(G*I-L*H)),S=-(Q*(H*S+I*U+T*W)),G=-(Q*(C*(I*R-T*O)+G*(T*J-H*R)+J*($-I*J))),C=0<T?T:-T,F=F*G-y*S-L,x=x*G-A*S-L,y=S}A=G;n=(M[0]=n-z*y,t[0]);m=(M[0]=m-z*A,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=p-E*F;h=l[f]+12*l[e]|0;k=(M[0]=r+D*y,t[0]);n=(M[0]=w+D*A,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=j+u*x;return.004999999888241291<g?0:.03490658849477768>=C}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+76>>2],h=q[e+5],j=q[d+80>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+84>>2],h=q[e+5],j=q[d+88>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var d=d>>2,f=q[d+27],g=q[d+29],h=(q[d+46]*f+q[d+44]*g)*e;q[b>>2]=(q[d+45]*f+q[d+43]*g)*e;q[b+4>>2]=h}),0,(function(b,d){return q[b+112>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.Wg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));f=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=f,s));f=q[d+19];g=q[d+20];V(N.K|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+21];g=q[d+22];V(N.L|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+23];g=q[d+24];V(N.Wb|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=c[b+128|0]&1;V(N.ab|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+31];V(N.bb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+30];V(N.Zb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+17];V(N.Na|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+18];V(N.Oa|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j,k,m=b>>2,n=l[m+12];k=n>>2;var p=l[k+2],u=b+132|0;l[u>>2]=p;var r=l[m+13];j=r>>2;var w=l[j+2];h=(b+136|0)>>2;l[h]=w;var x=n+28|0,y=b+140|0,A=l[x>>2],C=l[x+4>>2];l[y>>2]=A;l[y+4>>2]=C;var z=r+28|0,D=b+148|0,E=l[z>>2],G=l[z+4>>2];l[D>>2]=E;l[D+4>>2]=G;var H=q[k+30];q[m+39]=H;var F=q[j+30];q[m+40]=F;var I=q[k+32];q[m+41]=I;var J=q[j+32];q[m+42]=J;var L=l[d+24>>2],O=L+12*p|0,R=l[O+4>>2],T=(t[0]=l[O>>2],M[0]),S=(t[0]=R,M[0]),U=q[(L+8>>2)+(3*p|0)];g=(d+28|0)>>2;var W=l[g],Q=W+12*p|0,$=l[Q+4>>2],ea=(t[0]=l[Q>>2],M[0]),sa=(t[0]=$,M[0]),Ba=q[(W+8>>2)+(3*p|0)],oa=L+12*w|0,ga=l[oa+4>>2],qa=(t[0]=l[oa>>2],M[0]),la=(t[0]=ga,M[0]),Ca=q[(L+8>>2)+(3*w|0)],ia=W+12*w|0,ya=l[ia+4>>2],ta=(t[0]=l[ia>>2],M[0]),Ia=(t[0]=ya,M[0]),na=q[(W+8>>2)+(3*w|0)],Z=mm(U),ba=nm(U),ca=mm(Ca),ma=nm(Ca),ka=q[m+19],aa=(t[0]=A,M[0]),ra=ka-aa,ha=q[m+20],za=(t[0]=C,M[0]),X=ha-za,ua=ba*ra-Z*X,da=Z*ra+ba*X,fa=q[m+21],Aa=(t[0]=E,M[0]),Pa=fa-Aa,pa=q[m+22],cb=(t[0]=G,M[0]),Qa=pa-cb,Ta=ma*Pa-ca*Qa,$a=ca*Pa+ma*Qa,va=qa+Ta-T-ua,Wa=la+$a-S-da,fb=q[m+25],gb=q[m+26],Xa=ba*fb-Z*gb,Ua=Z*fb+ba*gb,Va=b+180|0,pb=(M[0]=Xa,t[0]),nb=(M[0]=Ua,t[0])|0;l[Va>>2]=0|pb;l[Va+4>>2]=nb;var La=va+ua,qb=Wa+da,bb=La*Ua-qb*Xa;q[m+49]=bb;var Fa=Ta*Ua-$a*Xa;q[m+50]=Fa;var Ma=H+F,wa=Ma+I*bb*bb+J*Fa*Fa;q[m+51]=0<wa?1/wa:wa;f=(b+212|0)>>2;q[f]=0;var hb=b+216|0;q[hb>>2]=0;var Ya=b+220|0;q[Ya>>2]=0;var Za=q[m+17];if(0<Za){var Da=q[m+23],Na=q[m+24],ib=ba*Da-Z*Na,ab=Z*Da+ba*Na,Ga=b+172|0,jb=(M[0]=ib,t[0]),Ea=(M[0]=ab,t[0])|0;l[Ga>>2]=0|jb;l[Ga+4>>2]=Ea;var Oa=La*ab-qb*ib;q[m+47]=Oa;var Ja=Ta*ab-$a*ib;q[m+48]=Ja;var db=Ma+I*Oa*Oa+J*Ja*Ja;if(0<db){var xa=1/db;q[f]=xa;var Ra=va*ib+Wa*ab,Ka=6.2831854820251465*Za,tb=xa*Ka*Ka,kb=q[d>>2],ub=kb*(2*xa*q[m+18]*Ka+kb*tb),rb=0<ub?1/ub:ub;q[Ya>>2]=rb;q[hb>>2]=Ra*kb*tb*rb;var Bb=db+rb;q[f]=Bb;0<Bb&&(q[f]=1/Bb)}}else{q[m+29]=0}if(0==(c[b+128|0]&1)<<24>>24){q[m+52]=0,q[m+28]=0}else{var lb=I+J,yb=b+208|0;q[yb>>2]=lb;0<lb&&(q[yb>>2]=1/lb)}if(0==(c[d+20|0]&1)<<24>>24){q[m+27]=0;q[m+29]=0;q[m+28]=0;var xb=na,Ib=Ba,wb=ea,vb=sa,zb=ta,Eb=Ia}else{e=(d+8|0)>>2;var Cb=b+108|0,eb=q[Cb>>2]*q[e];q[Cb>>2]=eb;var sb=b+116|0,ob=q[sb>>2]*q[e];q[sb>>2]=ob;var Db=b+112|0,Jb=q[Db>>2]*q[e];q[Db>>2]=Jb;var Rb=Xa*eb+q[m+43]*ob,Nb=Ua*eb+q[m+44]*ob,xb=na+J*(eb*Fa+ob*q[m+48]+Jb),Ib=Ba-I*(eb*bb+ob*q[m+47]+Jb),wb=ea-Rb*H,vb=sa-Nb*H,zb=ta+Rb*F,Eb=Ia+Nb*F}var Ob=l[g]+12*p|0,Kb=(M[0]=wb,t[0]),Pb=(M[0]=vb,t[0])|0;l[(Ob|0)>>2]=0|Kb;l[(Ob+4|0)>>2]=Pb;q[(l[g]+8>>2)+(3*l[u>>2]|0)]=Ib;var Mb=l[g]+12*l[h]|0,Yb=(M[0]=zb,t[0]),Zb=(M[0]=Eb,t[0])|0;l[(Mb|0)>>2]=0|Yb;l[(Mb+4|0)>>2]=Zb;q[(l[g]+8>>2)+(3*l[h]|0)]=xb}),0,(function(b,d){var e,f,g=b>>2,h=q[g+39],j=q[g+40],k=q[g+41],m=q[g+42],n=b+132|0,p=l[n>>2];f=(d+28|0)>>2;var u=l[f],r=u+12*p|0;e=l[r+4>>2];var r=(t[0]=l[r>>2],M[0]),w=(t[0]=e,M[0]),x=q[(u+8>>2)+(3*p|0)];e=(b+136|0)>>2;var y=l[e],A=u+12*y|0,C=l[A+4>>2],A=(t[0]=l[A>>2],M[0]),C=(t[0]=C,M[0]),y=q[(u+8>>2)+(3*y|0)],z=q[g+43],D=q[g+44],E=q[g+48],u=q[g+47],G=b+116|0,H=q[G>>2],F=(z*(A-r)+D*(C-w)+E*y-u*x+q[g+54]+q[g+55]*H)*-q[g+53];q[G>>2]=H+F;z*=F;D*=F;r-=z*h;w-=D*h;u=x-k*F*u;x=A+z*j;A=C+D*j;C=y+m*F*E;y=b+112|0;E=q[y>>2];z=q[d>>2]*q[g+30];D=E+(C-u-q[g+31])*-q[g+52];F=-z;z=D<z?D:z;F=z<F?F:z;q[y>>2]=F;E=F-E;y=u-k*E;C+=m*E;F=q[g+45];z=q[g+46];u=q[g+50];E=q[g+49];g=(F*(x-r)+z*(A-w)+u*C-E*y)*-q[g+51];D=b+108|0;q[D>>2]+=g;F*=g;z*=g;p=l[f]+12*p|0;r=(M[0]=r-F*h,t[0]);h=(M[0]=w-z*h,t[0])|0;l[(p|0)>>2]=0|r;l[(p+4|0)>>2]=h;q[(l[f]+8>>2)+(3*l[n>>2]|0)]=y-k*g*E;k=l[f]+12*l[e]|0;n=(M[0]=x+F*j,t[0]);j=(M[0]=A+z*j,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=j;q[(l[f]+8>>2)+(3*l[e]|0)]=C+m*g*u}),0,(function(b,d){var e,f,g=b>>2,h=b+132|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+136|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),j=q[(j+8>>2)+(3*u|0)],x=mm(p),y=nm(p),A=mm(j),C=nm(j),u=q[g+19]-q[g+35],z=q[g+20]-q[g+36],D=y*u-x*z,z=x*u+y*z,E=q[g+21]-q[g+37],G=q[g+22]-q[g+38],u=C*E-A*G,A=A*E+C*G,E=r-n+u-D,G=w-m+A-z,H=q[g+25],F=q[g+26],C=y*H-x*F,x=x*H+y*F,y=E*C+G*x,I=q[g+39],F=q[g+40],J=q[g+41],L=q[g+49],H=q[g+42],g=q[g+50],g=I+F+J*L*L+H*g*g,g=0!=g?-y/g:0,O=C*g,L=x*g,n=(M[0]=n-O*I,t[0]),m=(M[0]=m-L*I,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=p-J*g*((E+D)*x-(G+z)*C);h=l[f]+12*l[e]|0;k=(M[0]=r+O*F,t[0]);n=(M[0]=w+L*F,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=j+H*g*(u*x-A*C);return.004999999888241291>=(0<y?y:-y)}),0,iq,0,jq,0,kq,0,Vq,0,(function(b,d,e){sp(b,d,e)}),0,lq,0,mq,0,(function(b){pp(b)}),0,nq,0,Xq,0,oq,0,Ks,0,Yq,0,(function(b){return b|0}),0,(function(b,d){fp(b,d)}),0,Ms,0,Zq,0,$q,0,ar,0,Ns,0,br,0,Os,0,cr,0,dr,0,er,0,is,0,js,0,ks,0,ls,0,Ps,0,ms,0,ns,0,Qs,0,os,0,Rs,0,Ss,0,(function(b){xo(b)}),0,(function(b,d){mp(b,d)}),0,(function(b){return b+32|0}),0,ps,0,qs,0,rs,0,ss,0,Ts,0,Us,0,Vs,0,ts,0,Ws,0,us,0,Xs,0,Ys,0,Zs,0,(function(b,d,e){return gh(b,d,e)}),0,$s,0,at,0,bt,0,vs,0,ws,0,xs,0,(function(b){return b+102996|0}),0,ct,0,ys,0,(function(b){return b+102872|0}),0,zs,0,(function(b){aq(b)}),0,As,0,Bs,0,Cs,0,Ds,0,Es,0,Fs,0,dt,0,Gs,0,Hs,0,(function(b,d){Cp(b,d)}),0,et,0,Is,0,(function(b,d,e,f){Pp(b,d,e,f)}),0,Js,0,ft,0,gt,0,(function(b,d){Bp(b,d)}),0,ht,0,(function(b,d){return Dp(b,d)}),0,it,0,ku,0,jt,0,kt,0,lt,0,lu,0,(function(b){bq(b)}),0,mt,0,mu,0,nt,0,ot,0,pt,0,Nv,0,qt,0,Lw,0,rt,0,st,0,(function(b){return b+12|0}),0,Mw,0,(function(b){return b+12|0}),0,Nw,0,Tw,0,Lb(1),0,Uw,0,Vw,0,Ww,0,Lb(0),0,tt,0,(function(b){return b+12|0}),0,ut,0,Yw,0,vt,0,Zw,0,$w,0,ax,0,bx,0,wt,0,cx,0,xt,0,yt,0,zt,0,At,0,dx,0,ex,0,$t,0,au,0,bu,0,cu,0,hx,0,ix,0,lx,0,du,0,ox,0,px,0,qx,0,rx,0,sx,0,tx,0,eu,0,fu,0,(function(b){km(b)}),0,ux,0,(function(b,d,e,f){return Rl(b,d,e,f)}),0,(function(b){jm(b)}),0,(function(b,d){Nk(b,d)}),0,vx,0,Hb(),0,wx,0,Lb(0),0,xx,0,yx,0,Ax,0,Bx,0,Cx,0,Dx,0,Ex,0,gu,0,Fx,0,hu,0,iu,0,ju,0,wy,0,xy,0,Gx,0,(function(b,d,e){Um(b,d,e)}),0,yy,0,Ay,0,By,0,Cy,0,Dy,0,Hx,0,Ey,0,Ix,0,Jx,0,Kx,0,Fy,0,Gy,0,Hy,0,EB,0,(function(b,d){return qn(b,d)}),0,gF,0,hF,0,(function(b,d,e){on(b,d,e)}),0,iF,0,Lx,0,Mx,0,jF,0,Nx,0,kF,0,Ox,0,(function(b,d,e,f,g){Wm(b,d,e,f,g)}),0,Px,0,lF,0,Qx,0,Rx,0,mF,0,nF,0,Sx,0,oF,0,Tx,0,(function(b){return b+12|0}),0,qF,0,Ux,0,rF,0,Vx,0,Wx,0,sF,0,Xx,0,tF,0,uF,0,vF,0,wF,0,xF,0,Yx,0,Zx,0,zF,0,$x,0,AF,0,ay,0,by,0,cy,0,dy,0,ey,0,fy,0,gy,0,hy,0,BF,0,iy,0,(function(b){return b+64|0}),0,jy,0,ky,0,CF,0,ly,0,DF,0,my,0,EF,0,FF,0,GF,0,HF,0,ny,0,oy,0,py,0,qy,0,(function(b,d){kp(b,d)}),0,ry,0,sy,0,ty,0,uy,0,vy,0,IF,0,LF,0,MF,0,tG,0,NF,0,OF,0,(function(b,d,e){ip(b,d,e)}),0,PF,0,QF,0,RF,0,wG,0,(function(b){vo(b)}),0,SF,0,TF,0,UF,0,(function(b,d){uo(b,d)}),0,(function(b,d){return cp(b,d)}),0,zG,0,(function(b,d){hp(b,d)}),0,(function(b){return b+12|0}),0,(function(b){return b+44|0}),0,VF,0,WF,0,XF,0,(function(b){return b+28|0}),0,AG,0,DG,0,YF,0,GG,0,JG,0,ZF,0,$F,0,aG,0,KG,0,bG,0,(function(b){lp(b)}),0,cG,0,dG,0,eG,0,(function(b,d){ep(b,d)}),0,fG,0,gG,0,NG,0,hG,0,(function(b){return b+12|0}),0,iG,0,OG,0,PG,0,QG,0,(function(b,d){so(b,d)}),0,RG,0,SG,0,jG,0,kG,0,lG,0,mG,0,nG,0,TG,0,oG,0,pG,0,UG,0,qG,0,rG,0,VG,0,(function(b){return b+20|0}),0,sG,0,(function(b){return b+28|0}),0,WG,0,XG,0,YG,0,ZG,0,$G,0,aH,0,bH,0,cH,0,dH,0,qI,0,eH,0,fH,0,gH,0,hH,0,iH,0,jH,0,kH,0,lH,0,(function(b){return b+4|0}),0,rI,0,mH,0,nH,0,oH,0,pH,0,qH,0,rH,0,sH,0,tH,0,(function(b){return b+16|0}),0,uH,0,vH,0,wH,0,xH,0,sI,0,yH,0,tI,0,uI,0,zH,0,AH,0,BH,0,CH,0,DH,0,vI,0,EH,0,FH,0,GH,0,yI,0,zI,0,HH,0,AI,0,DI,0,IH,0,JH,0,KH,0,LH,0,MH,0,EI,0,FI,0,NH,0,GI,0,OH,0,(function(b,d,e){Hi(b,d,e)}),0,JI,0,PH,0,KI,0,QH,0,RH,0,SH,0,TH,0,LI,0,UH,0,VH,0,WH,0,MI,0,XH,0,YH,0,ZH,0,$H,0,aI,0,NI,0,bI,0,cI,0,dI,0,eI,0,(function(b){return b+22|0}),0,fI,0,gI,0,hI,0,OI,0,iI,0,jI,0,kI,0,lI,0,mI,0,nI,0,oI,0,(function(b){return b+36|0}),0,pI,0,PI,0,QI,0,RI,0,SI,0,TI,0,UI,0,(function(b){return b+20|0}),0,(function(b){return b+28|0}),0,dK,0,VI,0,WI,0,XI,0,YI,0,ZI,0,eK,0,fK,0,gK,0,iK,0,lK,0,$I,0,aJ,0,oK,0,pK,0,bJ,0,cJ,0,dJ,0,(function(b){return b+36|0}),0,eJ,0,fJ,0,gJ,0,hJ,0,qK,0,(function(b){return b+20|0}),0,iJ,0,(function(b){return b+28|0}),0,jJ,0,kJ,0,lJ,0,mJ,0,nJ,0,rK,0,oJ,0,pJ,0,qJ,0,rJ,0,sJ,0,tJ,0,uJ,0,vJ,0,wJ,0,xJ,0,yJ,0,zJ,0,AJ,0,(function(b){return b+20|0}),0,BJ,0,(function(b){return b+28|0}),0,CJ,0,DJ,0,sK,0,tK,0,EJ,0,FJ,0,GJ,0,HJ,0,uK,0,IJ,0,JJ,0,KJ,0,LJ,0,(function(b){return b+36|0}),0,MJ,0,(function(b){return b+44|0}),0,(function(b){return b+28|0}),0,NJ,0,vK,0,OJ,0,(function(b,d,e,f,g,h,j,k){fq(b,d,e,f,g,h,j,k)}),0,PJ,0,QJ,0,(function(b){return b+20|0}),0,RJ,0,SJ,0,TJ,0,UJ,0,wK,0,VJ,0,WJ,0,XJ,0,YJ,0,ZJ,0,xK,0,$J,0,yK,0,zK,0,aK,0,bK,0,(function(b){return b|0}),0,(function(b){return b+8|0}),0,AK,0,BK,0,cK,0,mL,0,CK,0,DK,0,EK,0,nL,0,oL,0,FK,0,pL,0,GK,0,HK,0,IK,0,JK,0,(function(b){return b+20|0}),0,KK,0,(function(b){return b+28|0}),0,LK,0,MK,0,NK,0,qL,0,rL,0,OK,0,PK,0,sL,0,QK,0,RK,0,SK,0,(function(b){return b+20|0}),0,TK,0,UK,0,VK,0,WK,0,XK,0,YK,0,ZK,0,tL,0,(function(b){return b+20|0}),0,(function(b){return b+28|0}),0,$K,0,uL,0,aL,0,bL,0,vL,0,wL,0,cL,0,dL,0,eL,0,fL,0,gL,0,xL,0,hL,0,iL,0,yL,0,jL,0,kL,0,(function(b){return b+20|0}),0,(function(b){return b+28|0}),0,zL,0,lL,0,(function(b){Ha(b|0)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d,e){var f,g,h=a;a+=112;g=h>>2;var j=h+56;f=j>>2;var k=(b|0)==(d|0);do{if(k){var m=1}else{if(0==(d|0)){m=0}else{var n=d,p=l[d>>2],m=n+l[p-8>>2]|0,p=l[p-4>>2];l[g]=bN;l[g+1]=n;l[g+2]=aN;l[g+3]=-1;for(var n=h+16|0,u=h+20|0,r=h+24|0,w=h+28|0,x=h+32|0,y=h+40|0,A=(p|0)==(bN|0),C=n,z=C>>2,D=z+9;z<D;z++){l[z]=0}i[C+36>>1]=0;c[C+38]=0;if(A){l[g+12]=1,K[l[l[bN>>2]+12>>2]](bN,h,m,m,1),m=1==(l[r>>2]|0)?m:0}else{if(z=h+36|0,K[l[l[p>>2]+16>>2]](p,h,m,1),m=l[z>>2],0==(m|0)){if(1!=(l[y>>2]|0)){m=0;break}if(1!=(l[w>>2]|0)){m=0;break}m=1==(l[x>>2]|0)?l[u>>2]:0}else{if(1==(m|0)){if(1!=(l[r>>2]|0)){if(0!=(l[y>>2]|0)){m=0;break}if(1!=(l[w>>2]|0)){m=0;break}if(1!=(l[x>>2]|0)){m=0;break}}m=l[n>>2]}else{m=0;break}}}p=m;if(0==(m|0)){m=0}else{z=j>>2;for(D=z+14;z<D;z++){l[z]=0}l[f]=p;l[f+2]=b;l[f+3]=-1;l[f+12]=1;K[l[l[m>>2]+20>>2]](p,j,l[e>>2],1);1!=(l[f+6]|0)?m=0:(l[e>>2]=l[f+4],m=1)}}}}while(0);a=h;return m}),0,(function(b,d,e,f,g){var h=d>>2;(l[h+2]|0)==(b|0)&&(c[d+53|0]=1,(l[h+1]|0)==(f|0)&&(c[d+52|0]=1,b=d+16|0,f=l[b>>2],0==(f|0)?(l[b>>2]=e,l[h+6]=g,l[h+9]=1,1==(l[h+12]|0)&1==(g|0)&&(c[d+54|0]=1)):(f|0)==(e|0)?(e=d+24|0,b=l[e>>2],2==(b|0)?l[e>>2]=g:g=b,1==(l[h+12]|0)&1==(g|0)&&(c[d+54|0]=1)):(h=d+36|0,l[h>>2]=l[h>>2]+1|0,c[d+54|0]=1)))}),0,(function(b,d,e,f){var g=d>>2,h=(l[g+2]|0)==(b|0);a:do{if(h){if((l[g+1]|0)==(e|0)){var j=d+28|0;1!=(l[j>>2]|0)&&(l[j>>2]=f)}}else{if((l[g]|0)==(b|0)){j=(l[g+4]|0)==(e|0);do{if(!j){var k=d+20|0;if((l[k>>2]|0)!=(e|0)){l[g+8]=f;l[k>>2]=e;b=d+40|0;l[b>>2]=l[b>>2]+1|0;1==(l[g+9]|0)&&2==(l[g+6]|0)&&(c[d+54|0]=1);l[g+11]=4;break a}}}while(0);1==(f|0)&&(l[g+8]=1)}}}while(0)}),0,(function(b,d,e,f){if((l[d+8>>2]|0)==(b|0)){var b=d+16|0,g=l[b>>2];0==(g|0)?(l[b>>2]=e,l[d+24>>2]=f,l[d+36>>2]=1):(g|0)==(e|0)?(d=d+24|0,2==(l[d>>2]|0)&&(l[d>>2]=f)):(f=d+36|0,l[f>>2]=l[f>>2]+1|0,l[d+24>>2]=2,c[d+54|0]=1)}}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d){return(b|0)==(d|0)?1:(d|0)==(cN|0)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d){return(b|0)==(d|0)}),0,(function(b){Ha(b|0);Ls(b)}),0,Lb(0),0,(function(b){Ha(b|0);Ls(b)}),0,Lb(0),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d){return(b|0)==(d|0)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d,e,f,g){var h=d>>2;(b|0)==(l[h+2]|0)?(c[d+53|0]=1,(l[h+1]|0)==(f|0)&&(c[d+52|0]=1,f=d+16|0,b=l[f>>2],0==(b|0)?(l[f>>2]=e,l[h+6]=g,l[h+9]=1,1==(l[h+12]|0)&1==(g|0)&&(c[d+54|0]=1)):(b|0)==(e|0)?(e=d+24|0,f=l[e>>2],2==(f|0)?l[e>>2]=g:g=f,1==(l[h+12]|0)&1==(g|0)&&(c[d+54|0]=1)):(g=d+36|0,l[g>>2]=l[g>>2]+1|0,c[d+54|0]=1))):(h=l[b+8>>2],K[l[l[h>>2]+12>>2]](h,d,e,f,g))}),0,(function(b,d,e,f){var g=d>>2,h=b|0,j=(h|0)==(l[g+2]|0);a:do{if(j){if((l[g+1]|0)==(e|0)){var k=d+28|0;1!=(l[k>>2]|0)&&(l[k>>2]=f)}}else{if((h|0)==(l[g]|0)){var m=(l[g+4]|0)==(e|0);do{if(!m&&(k=d+20|0,(l[k>>2]|0)!=(e|0))){l[g+8]=f;f=(d+44|0)>>2;if(4==(l[f]|0)){break a}h=d+52|0;c[h]=0;j=d+53|0;c[j]=0;b=l[b+8>>2];K[l[l[b>>2]+12>>2]](b,d,e,e,1);if(0==(c[j]&1)<<24>>24){var n=0,b=14}else{0==(c[h]&1)<<24>>24?(n=1,b=14):b=18}b:do{if(14==b){l[k>>2]=e;b=d+40|0;l[b>>2]=l[b>>2]+1|0;h=1==(l[g+9]|0);do{if(h){if(2!=(l[g+6]|0)){b=17}else{c[d+54|0]=1;if(n){break b}b=19}}else{b=17}}while(0);if(!(17==b&&n)){l[f]=4;break a}}}while(0);l[f]=3;break a}}while(0);1==(f|0)&&(l[g+8]=1)}else{k=l[b+8>>2],K[l[l[k>>2]+16>>2]](k,d,e,f)}}}while(0)}),0,(function(b,d,e,f){if((b|0)==(l[d+8>>2]|0)){var b=d+16|0,g=l[b>>2];0==(g|0)?(l[b>>2]=e,l[d+24>>2]=f,l[d+36>>2]=1):(g|0)==(e|0)?(d=d+24|0,2==(l[d>>2]|0)&&(l[d>>2]=f)):(f=d+36|0,l[f>>2]=l[f>>2]+1|0,l[d+24>>2]=2,c[d+54|0]=1)}else{b=l[b+8>>2],K[l[l[b>>2]+20>>2]](b,d,e,f)}}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d,e,f,g){var h=d>>2,j=(b|0)==(l[h+2]|0);do{if(j){if(c[d+53|0]=1,(l[h+1]|0)==(f|0)){c[d+52|0]=1;var k=d+16|0,m=l[k>>2];0==(m|0)?(l[k>>2]=e,l[h+6]=g,l[h+9]=1,1==(l[h+12]|0)&1==(g|0)&&(c[d+54|0]=1)):(m|0)==(e|0)?(k=d+24|0,m=l[k>>2],k=2==(m|0)?l[k>>2]=g:m,1==(l[h+12]|0)&1==(k|0)&&(c[d+54|0]=1)):(k=d+36|0,l[k>>2]=l[k>>2]+1|0,c[d+54|0]=1)}}else{var k=d+52|0,m=c[k]&1,n=d+53|0,p=c[n]&1,u=l[b+12>>2],r=(u<<3)+b+16|0;c[k]=0;c[n]=0;var w=l[b+20>>2],x=w>>8,y=l[b+16>>2];K[l[l[y>>2]+12>>2]](y,d,e,f+(0==(w&1|0)?x:l[l[f>>2]+x>>2])|0,0!=(w&2|0)?g:2);u=1<(u|0);a:do{if(u){for(var w=b+8|0,x=d+24|0,y=d+54|0,A=f,C=b+24|0;;){if(0!=(c[y]&1)<<24>>24){break a}var z=0==(c[k]&1)<<24>>24;do{if(z){if(0!=(c[n]&1)<<24>>24&&0==(l[w>>2]&1|0)){break a}}else{if(1==(l[x>>2]|0)){break a}if(0==(l[w>>2]&2|0)){break a}}}while(0);c[k]=0;c[n]=0;var z=l[C+4>>2],D=z>>8,E=l[C>>2];K[l[l[E>>2]+12>>2]](E,d,e,f+(0==(z&1|0)?D:l[l[A>>2]+D>>2])|0,0!=(z&2|0)?g:2);C=C+8|0;if(C>>>0>=r>>>0){break a}}}}while(0);c[k]=m;c[n]=p}}while(0)}),0,(function(b,d,e,f){var g,h=d>>2,j=b>>2,k=b|0,m=(k|0)==(l[h+2]|0);a:do{if(m){if((l[h+1]|0)==(e|0)){var n=d+28|0;1!=(l[n>>2]|0)&&(l[n>>2]=f)}}else{if((k|0)==(l[h]|0)){var p=(l[h+4]|0)==(e|0);do{if(!p&&(n=d+20|0,(l[n>>2]|0)!=(e|0))){l[h+8]=f;f=(d+44|0)>>2;if(4==(l[f]|0)){break a}m=(l[j+3]<<3)+b+16|0;p=d+52|0;g=d+53|0;var j=d+54|0,u=b+8|0,k=d+24|0,r=e,b=b+16|0,w=0,x=0;b:for(;;){var y=b>>>0<m>>>0;do{if(y){c[p]=0;c[g]=0;var A=o[b+4>>2],y=A>>8,C=o[b>>2];K[l[l[C>>2]+12>>2]](C,d,e,e+(0==(A&1|0)?y:l[l[r>>2]+y>>2])|0,2-(A>>>1&1)|0);if(0!=(c[j]&1)<<24>>24){A=x;break}if(0!=(c[g]&1)<<24>>24){if(0==(c[p]&1)<<24>>24){if(0==(l[u>>2]&1|0)){A=1;break}}else{if(1==(l[k>>2]|0)){break b}if(0==(l[u>>2]&2|0)){break b}w=1}x=1}b=b+8|0;continue b}A=x}while(0);0==(w&1)<<24>>24&&(l[n>>2]=e,d=d+40|0,l[d>>2]=l[d>>2]+1|0,1==(l[h+9]|0)&&2==(l[k>>2]|0)&&(c[j]=1));if(0!=(A&1)<<24>>24){break}l[f]=4;break a}l[f]=3;break a}}while(0);1==(f|0)&&(l[h+8]=1)}else{if(g=l[j+3],n=(g<<3)+b+16|0,p=l[j+5],u=p>>8,r=l[j+4],K[l[l[r>>2]+16>>2]](r,d,e+(0==(p&1|0)?u:l[l[e>>2]+u>>2])|0,0!=(p&2|0)?f:2),p=b+24|0,1<(g|0)){u=o[j+2];r=0==(u&2|0);do{if(r&&(g=(d+36|0)>>2,1!=(l[g]|0))){if(0==(u&1|0)){w=d+54|0;x=e;for(A=p;;){if(0!=(c[w]&1)<<24>>24){break a}if(1==(l[g]|0)){break a}var y=o[A+4>>2],C=y>>8,z=l[A>>2];K[l[l[z>>2]+16>>2]](z,d,e+(0==(y&1|0)?C:l[l[x>>2]+C>>2])|0,0!=(y&2|0)?f:2);A=A+8|0;if(A>>>0>=n>>>0){break a}}}else{w=d+24|0;x=d+54|0;A=e;for(y=p;;){if(0!=(c[x]&1)<<24>>24){break a}if(1==(l[g]|0)&&1==(l[w>>2]|0)){break a}var C=l[y+4>>2],z=C>>8,D=l[y>>2];K[l[l[D>>2]+16>>2]](D,d,e+(0==(C&1|0)?z:l[l[A>>2]+z>>2])|0,0!=(C&2|0)?f:2);y=y+8|0;if(y>>>0>=n>>>0){break a}}}}}while(0);g=d+54|0;for(u=e;;){if(0!=(c[g]&1)<<24>>24){break a}r=l[p+4>>2];w=r>>8;x=l[p>>2];K[l[l[x>>2]+16>>2]](x,d,e+(0==(r&1|0)?w:l[l[u>>2]+w>>2])|0,0!=(r&2|0)?f:2);p=p+8|0;if(p>>>0>=n>>>0){break a}}}}}}while(0)}),0,(function(b,d,e,f){var g=(b|0)==(l[d+8>>2]|0);a:do{if(g){var h=d+16|0,j=l[h>>2];0==(j|0)?(l[h>>2]=e,l[d+24>>2]=f,l[d+36>>2]=1):(j|0)==(e|0)?(h=d+24|0,2==(l[h>>2]|0)&&(l[h>>2]=f)):(h=d+36|0,l[h>>2]=l[h>>2]+1|0,l[d+24>>2]=2,c[d+54|0]=1)}else{var j=l[b+12>>2],h=(j<<3)+b+16|0,k=l[b+20>>2],m=k>>8,n=l[b+16>>2];K[l[l[n>>2]+20>>2]](n,d,e+(0==(k&1|0)?m:l[l[e>>2]+m>>2])|0,0!=(k&2|0)?f:2);if(1<(j|0)){j=d+54|0;k=e;for(m=b+24|0;;){var n=l[m+4>>2],p=n>>8,u=l[m>>2];K[l[l[u>>2]+20>>2]](u,d,e+(0==(n&1|0)?p:l[l[k>>2]+p>>2])|0,0!=(n&2|0)?f:2);if(0!=(c[j]&1)<<24>>24){break a}m=m+8|0;if(m>>>0>=h>>>0){break a}}}}}while(0)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d,e){var f,g,h,j,k=a;a+=224;j=k>>2;var m=k+56;h=m>>2;var n=k+112;g=n>>2;var p=k+168;f=p>>2;l[e>>2]=l[l[e>>2]>>2];var u=(b|0)==(d|0)|(d|0)==(cN|0);do{if(u){var r=1}else{if(0==(d|0)){r=0}else{var r=d,w=l[d>>2],x=r+l[w-8>>2]|0,y=l[w-4>>2];l[g]=eN;l[g+1]=r;l[g+2]=aN;l[g+3]=-1;for(var A=n+16|0,C=n+20|0,z=n+24|0,D=n+28|0,E=n+32|0,G=n+40|0,H=(y|0)==(eN|0),F=A,r=F>>2,w=r+9;r<w;r++){l[r]=0}i[F+36>>1]=0;c[F+38]=0;if(H){l[g+12]=1,K[l[l[eN>>2]+12>>2]](eN,n,x,x,1),r=1==(l[z>>2]|0)?x:0}else{if(r=n+36|0,K[l[l[y>>2]+16>>2]](y,n,x,1),r=l[r>>2],0==(r|0)){if(1!=(l[G>>2]|0)){r=0;break}if(1!=(l[D>>2]|0)){r=0;break}r=1==(l[E>>2]|0)?l[C>>2]:0}else{if(1==(r|0)){if(1!=(l[z>>2]|0)){if(0!=(l[G>>2]|0)){r=0;break}if(1!=(l[D>>2]|0)){r=0;break}if(1!=(l[E>>2]|0)){r=0;break}}r=l[A>>2]}else{r=0;break}}}if(0==(r|0)){r=0}else{if(0!=(l[r+8>>2]&(l[b+8>>2]^-1)|0)){r=0}else{if(w=l[b+12>>2],y=r+12|0,(w|0)==(l[y>>2]|0)|(w|0)==(jN|0)){r=1}else{if(0==(w|0)){r=0}else{r=w;w=l[w>>2];x=r+l[w-8>>2]|0;A=l[w-4>>2];l[h]=bN;l[h+1]=r;l[h+2]=aN;l[h+3]=-1;for(var C=m+16|0,z=m+20|0,D=m+24|0,E=m+28|0,G=m+32|0,H=m+40|0,F=(A|0)==(bN|0),I=C,r=I>>2,w=r+9;r<w;r++){l[r]=0}i[I+36>>1]=0;c[I+38]=0;if(F){l[h+12]=1,K[l[l[bN>>2]+12>>2]](bN,m,x,x,1),r=1==(l[D>>2]|0)?x:0}else{if(r=m+36|0,K[l[l[A>>2]+16>>2]](A,m,x,1),r=l[r>>2],0==(r|0)){if(1!=(l[H>>2]|0)){r=0;break}if(1!=(l[E>>2]|0)){r=0;break}r=1==(l[G>>2]|0)?l[z>>2]:0}else{if(1==(r|0)){if(1!=(l[D>>2]|0)){if(0!=(l[H>>2]|0)){r=0;break}if(1!=(l[E>>2]|0)){r=0;break}if(1!=(l[G>>2]|0)){r=0;break}}r=l[C>>2]}else{r=0;break}}}x=r;if(0==(r|0)){r=0}else{if(w=l[y>>2],0==(w|0)){r=0}else{r=w;w=l[w>>2];y=r+l[w-8>>2]|0;A=l[w-4>>2];l[j]=bN;l[j+1]=r;l[j+2]=aN;l[j+3]=-1;C=k+16|0;z=k+20|0;D=k+24|0;E=k+28|0;G=k+32|0;H=k+40|0;F=(A|0)==(bN|0);I=C;r=I>>2;for(w=r+9;r<w;r++){l[r]=0}i[I+36>>1]=0;c[I+38]=0;if(F){l[j+12]=1,K[l[l[bN>>2]+12>>2]](bN,k,y,y,1),y=1==(l[D>>2]|0)?y:0}else{if(r=k+36|0,K[l[l[A>>2]+16>>2]](A,k,y,1),r=l[r>>2],0==(r|0)){if(1!=(l[H>>2]|0)){r=0;break}if(1!=(l[E>>2]|0)){r=0;break}y=1==(l[G>>2]|0)?l[z>>2]:0}else{if(1==(r|0)){if(1!=(l[D>>2]|0)){if(0!=(l[H>>2]|0)){r=0;break}if(1!=(l[E>>2]|0)){r=0;break}if(1!=(l[G>>2]|0)){r=0;break}}y=l[C>>2]}else{r=0;break}}}A=y;if(0==(y|0)){r=0}else{r=p>>2;for(w=r+14;r<w;r++){l[r]=0}l[f]=A;l[f+2]=x;l[f+3]=-1;l[f+12]=1;K[l[l[y>>2]+20>>2]](A,p,l[e>>2],1);1!=(l[f+6]|0)?r=0:(l[e>>2]=l[f+4],r=1)}}}}}}}}}}while(0);a=k;return r}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(){return N.Qg|0}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(){return N.uf|0}),0,fh,0,(function(b){Dh(l[b+32>>2]);Dh(l[b+44>>2]);Dh(l[b+4>>2])}),0,(function(b){var d,e=b>>2;l[e]=-1;d=(b+12|0)>>2;l[d]=16;l[e+2]=0;var f=Ne(576),b=(b+4|0)>>2;l[b]=f;Oe(f,36*l[d]|0);var f=l[d]-1|0,g=0<(f|0);a:do{if(g){for(var h=0;;){var j=h+1|0;l[(l[b]+36*h+20|0)>>2]=j;l[(l[b]+36*h+32|0)>>2]=-1;h=l[d]-1|0;if((j|0)>=(h|0)){var k=h;break a}h=j}}else{k=f}}while(0);l[(l[b]+36*k+20|0)>>2]=-1;l[(l[b]+36*(l[d]-1)+32|0)>>2]=-1;l[e+4]=0;l[e+5]=0;l[e+6]=0}),0,(function(b){Dh(l[b+4>>2])}),0,(function(b){var d=b+8|0;l[d>>2]=128;l[b+4>>2]=0;var e=Ne(1024);l[b>>2]=e;Oe(e,l[d>>2]<<3);b=(b+12|0)>>2;for(d=b+14;b<d;b++){l[b]=0}if(0==(c[xp]&1)<<24>>24){d=0;for(b=1;!(14>(d|0)||P(N.e|0,73,N.Ga|0,N.Ta|0),(b|0)>(l[sn+(d<<2)>>2]|0)&&(d=d+1|0),c[rn+b|0]=d&255,b=b+1|0,641==(b|0));){}c[xp]=1}}),0,(function(b){var d=b+4|0,e=0<(l[d>>2]|0),b=b|0,f=l[b>>2];a:do{if(e){for(var g=0,h=f;;){if(Dh(l[h+(g<<3)+4>>2]),g=g+1|0,h=l[b>>2],(g|0)>=(l[d>>2]|0)){var j=h;break a}}}else{j=f}}while(0);Dh(j)}),0,(function(b){l[b+102400>>2]=0;l[b+102404>>2]=0;l[b+102408>>2]=0;l[b+102796>>2]=0}),0,(function(b){0!=(l[b+102400>>2]|0)&&P(N.n|0,32,N.Q|0,N.Ua|0);0!=(l[b+102796>>2]|0)&&P(N.n|0,33,N.Q|0,N.Xa|0)}),0,Hb(),0,to,0,Hb(),0,(function(b){var d=b>>2;fh(b|0);l[d+15]=0;l[d+16]=0;l[d+17]=yp;l[d+18]=zp;l[d+19]=0}),0,(function(b){i[b+32>>1]=1;i[b+34>>1]=-1;i[b+36>>1]=0;l[b+40>>2]=0;l[b+24>>2]=0;l[b+28>>2]=0;b>>=2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0}),0,vp,0,(function(b){var d=b>>2,b=(b|0)>>2;so(l[b],l[d+5]);so(l[b],l[d+6]);so(l[b],l[d+4]);so(l[b],l[d+3]);so(l[b],l[d+2])}),0,wp,0,Ap,0,(function(b,d,e,f,g){var h=b>>2,j=b|0;l[j>>2]=HM+8|0;l[h+1]=4;l[h+12]=d;var k=b+52|0;l[k>>2]=f;l[h+14]=e;l[h+15]=g;l[h+31]=0;l[h+32]=0;b=(b+8|0)>>2;for(e=b+10;b<e;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[f+16>>2]);q[h+34]=b;b=q[d+20>>2];e=q[f+20>>2];q[h+35]=b>e?b:e;l[j>>2]=AM+8|0;3==(l[l[d+12>>2]+4>>2]|0)?d=f:(P(N.ta|0,43,N.ia|0,N.qa|0),d=l[k>>2]);0!=(l[l[d+12>>2]+4>>2]|0)&&P(N.ta|0,44,N.ia|0,N.I|0)}),0,(function(b,d,e,f,g){var h=b>>2,j=b|0;l[j>>2]=HM+8|0;l[h+1]=4;l[h+12]=d;var k=b+52|0;l[k>>2]=f;l[h+14]=e;l[h+15]=g;l[h+31]=0;l[h+32]=0;b=(b+8|0)>>2;for(e=b+10;b<e;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[f+16>>2]);q[h+34]=b;b=q[d+20>>2];e=q[f+20>>2];q[h+35]=b>e?b:e;l[j>>2]=DM+8|0;3==(l[l[d+12>>2]+4>>2]|0)?d=f:(P(N.ua|0,43,N.ka|0,N.qa|0),d=l[k>>2]);2!=(l[l[d+12>>2]+4>>2]|0)&&P(N.ua|0,44,N.ka|0,N.T|0)}),0,(function(b,d,e){var f=b>>2,g=b|0;l[g>>2]=HM+8|0;l[f+1]=4;l[f+12]=d;var h=b+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var b=(b+8|0)>>2,j=b+10;b<j;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[e+16>>2]);q[f+34]=b;b=q[d+20>>2];j=q[e+20>>2];q[f+35]=b>j?b:j;l[g>>2]=FM+8|0;0==(l[l[d+12>>2]+4>>2]|0)?d=e:(P(N.va|0,44,N.fa|0,N.Cb|0),d=l[h>>2]);0!=(l[l[d+12>>2]+4>>2]|0)&&P(N.va|0,45,N.fa|0,N.I|0)}),0,Qp,0,(function(b){var d=b+32|0;so(l[d>>2],l[b+40>>2]);so(l[d>>2],l[b+36>>2])}),0,(function(b,d,e){var f=b>>2,g=b|0;l[g>>2]=HM+8|0;l[f+1]=4;l[f+12]=d;var h=b+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var b=(b+8|0)>>2,j=b+10;b<j;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[e+16>>2]);q[f+34]=b;b=q[d+20>>2];j=q[e+20>>2];q[f+35]=b>j?b:j;l[g>>2]=IM+8|0;1==(l[l[d+12>>2]+4>>2]|0)?d=e:(P(N.wa|0,41,N.ha|0,N.ra|0),d=l[h>>2]);0!=(l[l[d+12>>2]+4>>2]|0)&&P(N.wa|0,42,N.ha|0,N.I|0)}),0,(function(b,d,e){var f=b>>2,g=b|0;l[g>>2]=HM+8|0;l[f+1]=4;l[f+12]=d;var h=b+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var b=(b+8|0)>>2,j=b+10;b<j;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[e+16>>2]);q[f+34]=b;b=q[d+20>>2];j=q[e+20>>2];q[f+35]=b>j?b:j;l[g>>2]=KM+8|0;1==(l[l[d+12>>2]+4>>2]|0)?d=e:(P(N.xa|0,41,N.ja|0,N.ra|0),d=l[h>>2]);2!=(l[l[d+12>>2]+4>>2]|0)&&P(N.xa|0,42,N.ja|0,N.T|0)}),0,(function(b,d,e){var f=b>>2,g=b|0;l[g>>2]=HM+8|0;l[f+1]=4;l[f+12]=d;var h=b+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var b=(b+8|0)>>2,j=b+10;b<j;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[e+16>>2]);q[f+34]=b;b=q[d+20>>2];j=q[e+20>>2];q[f+35]=b>j?b:j;l[g>>2]=MM+8|0;2==(l[l[d+12>>2]+4>>2]|0)?d=e:(P(N.ya|0,41,N.la|0,N.sa|0),d=l[h>>2]);0!=(l[l[d+12>>2]+4>>2]|0)&&P(N.ya|0,42,N.la|0,N.I|0)}),0,(function(b,d,e){var f=b>>2,g=b|0;l[g>>2]=HM+8|0;l[f+1]=4;l[f+12]=d;var h=b+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var b=(b+8|0)>>2,j=b+10;b<j;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[e+16>>2]);q[f+34]=b;b=q[d+20>>2];j=q[e+20>>2];q[f+35]=b>j?b:j;l[g>>2]=OM+8|0;2==(l[l[d+12>>2]+4>>2]|0)?d=e:(P(N.za|0,44,N.ga|0,N.sa|0),d=l[h>>2]);2!=(l[l[d+12>>2]+4>>2]|0)&&P(N.za|0,45,N.ga|0,N.T|0)}),0,(function(b,d){var e,f=d>>2,g=b>>2,h=b|0;l[h>>2]=Ep+8|0;e=d+8|0;var j=d+12|0;(l[e>>2]|0)==(l[j>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[g+1]=l[f];l[g+2]=0;l[g+3]=0;l[g+12]=l[e>>2];l[g+13]=l[j>>2];l[g+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[g+16]=l[f+1];e=(b+16|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0;l[h>>2]=Fp+8|0;h=b+88|0;e=d+20|0;var j=b+80|0,k=l[e+4>>2];l[j>>2]=l[e>>2];l[j+4>>2]=k;e=d+28|0;j=l[e+4>>2];l[h>>2]=l[e>>2];l[h+4>>2]=j;q[g+26]=q[f+9];q[g+17]=q[f+10];q[g+18]=q[f+11];q[g+25]=0;q[g+24]=0;q[g+19]=0}),0,(function(b,d){var e,f=b>>2,g=b|0;l[g>>2]=Ep+8|0;e=d+8|0;var h=d+12|0;(l[e>>2]|0)==(l[h>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[f+1]=l[d>>2];l[f+2]=0;l[f+3]=0;l[f+12]=l[e>>2];l[f+13]=l[h>>2];l[f+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[f+16]=l[d+4>>2];e=(b+16|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0;l[g>>2]=Np+8|0;g=b+76|0;e=d+20|0;var h=b+68|0,j=l[e+4>>2];l[h>>2]=l[e>>2];l[h+4>>2]=j;e=d+28|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;q[f+21]=0;q[f+22]=0;q[f+23]=0;q[f+24]=q[d+36>>2];q[f+25]=q[d+40>>2]}),0,Kp,0,Gp,0,Hp,0,Jp,0,(function(b,d){var e,f,g=d>>2,h=b>>2;e=b|0;l[e>>2]=Ep+8|0;f=d+8|0;var j=d+12|0;(l[f>>2]|0)==(l[j>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[h+1]=l[g];l[h+2]=0;l[h+3]=0;l[h+12]=l[f>>2];l[h+13]=l[j>>2];l[h+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[h+16]=l[g+1];f=(b+16|0)>>2;l[f]=0;l[f+1]=0;l[f+2]=0;l[f+3]=0;l[f+4]=0;l[f+5]=0;l[f+6]=0;l[f+7]=0;l[e>>2]=Ip+8|0;e=b+76|0;f=d+20|0;var j=b+68|0,k=l[f+4>>2];l[j>>2]=l[f>>2];l[j+4>>2]=k;f=d+28|0;j=l[f+4>>2];l[e>>2]=l[f>>2];l[e+4>>2]=j;q[h+29]=q[g+9];e=(b+84|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;q[h+30]=q[(d+44|0)>>2];q[h+31]=q[g+12];q[h+26]=q[g+15];q[h+27]=q[g+14];c[b+112|0]=c[d+40|0]&1;c[b+100|0]=c[d+52|0]&1;l[h+56]=0}),0,(function(b,d){var e,f=b>>2,g=b|0;l[g>>2]=Ep+8|0;e=d+8|0;var h=d+12|0;(l[e>>2]|0)==(l[h>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[f+1]=l[d>>2];l[f+2]=0;l[f+3]=0;l[f+12]=l[e>>2];l[f+13]=l[h>>2];l[f+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[f+16]=l[d+4>>2];e=(b+16|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0;l[g>>2]=Op+8|0;g=b+76|0;e=d+20|0;var h=b+68|0,j=l[e+4>>2];l[h>>2]=l[e>>2];l[h+4>>2]=j;e=d+28|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;q[f+21]=q[d+36>>2];q[f+40]=0;q[f+23]=0;l[f+41]=0;q[f+22]=0}),0,(function(b,d){var e,f=d>>2,g=b>>2,h=b|0;l[h>>2]=Ep+8|0;e=d+8|0;var j=d+12|0;(l[e>>2]|0)==(l[j>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[g+1]=l[f];l[g+2]=0;l[g+3]=0;l[g+12]=l[e>>2];l[g+13]=l[j>>2];l[g+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[g+16]=l[f+1];e=(b+16|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0;l[h>>2]=Mp+8|0;h=b+88|0;e=d+20|0;var j=b+80|0,k=l[e+4>>2];l[j>>2]=l[e>>2];l[j+4>>2]=k;e=d+28|0;j=l[e+4>>2];l[h>>2]=l[e>>2];l[h+4>>2]=j;q[g+24]=q[f+9];q[g+17]=q[f+10];q[g+18]=q[f+11];q[g+26]=0;q[g+27]=0;q[g+28]=0}),0,Lp,0,(function(b){for(var d=b>>2,e=d+9;d<e;d++){l[d]=0}q[(b+40|0)>>2]=1;q[b+44>>2]=.10000000149011612}),0,(function(b){b>>=2;Dh(l[b+1]);Dh(l[b+2]);Dh(l[b+3]);Dh(l[b+4]);Dh(l[b+5]);Dh(l[b+6])}),0,(function(b){l[b>>2]=GL+8|0}),0,(function(b){l[b>>2]=BO+8|0}),0];Module.FUNCTION_TABLE=K;function Eg(b){function d(){var d=0;lg=Sa;Module._main&&(uf(wf),d=Module.Kh(b),Module.noExitRuntime||uf(Mf));if(Module.postRun){for("function"==typeof Module.postRun&&(Module.postRun=[Module.postRun]);0<Module.postRun.length;){Module.postRun.pop()()}}return d}b=b||Module.arguments;if(Module.preRun){for("function"==typeof Module.preRun&&(Module.preRun=[Module.preRun]);0<Module.preRun.length;){if(Module.preRun.pop()(),0<Qf){return 0}}}return Module.setStatus?(Module.setStatus("Running..."),setTimeout((function(){setTimeout((function(){Module.setStatus("")}),1);d()}),1),0):d()}Module.run=Eg;if(Module.preInit){for("function"==typeof Module.preInit&&(Module.preInit=[Module.preInit]);0<Module.preInit.length;){Module.preInit.pop()()}}uf(vf);Module.noInitialRun&&mg();0==Qf&&Eg();var DO={};function EO(b,d){var e=d?d.prototype.b:DO,f=e[b];if(f){return f}d=d||Object;f=Object.create(d.prototype);f.a=b;f.d=d;return e[b]=f}Module.wrapPointer=EO;Module.castObject=(function(b,d){return EO(b.a,d)});Module.NULL=EO(0);Module.destroy=(function(b){b.__destroy__||ja("Error: Cannot destroy object. (Did you create it yourself?)");b.__destroy__();b.d!==Object?delete b.d.prototype.b[b.a]:delete DO[b.a]});Module.compare=(function(b,d){return b.a===d.a});Module.getPointer=(function(b){return b.a});Module.getClass=(function(b){return b.d});Module.customizeVTable=(function(b,d){for(var e=Fe(b.a,"void*"),f=0;Fe(e+nc*f,"void*");){f++}var g=Ne(f*nc);xe(b.a,g,"void*");for(var h,j=K.length,k=0;k<f;k++){var m=K.length;((function(b){K.push((function(){h=b}))}))(k);K.push(0);xe(g+nc*k,m,"void*")}var n=[{a:0}];d.forEach((function(d){for(;;){try{d.original.apply(b,n);break}catch(f){n.push(n[0])}}d.Nh=Fe(e+h*nc,"void*")}));K=K.slice(0,j);var p={};d.forEach((function(b){var d=K.length;K.push(b.replacement);K.push(0);p[b.Nh]=d}));for(k=0;k<f;k++){j=Fe(e+nc*k,"void*"),j in p&&(j=p[j]),xe(g+nc*k,j,"void*")}return b});FO.prototype.get_m_contactFilter=(function(){return EO(iq(this.a),Module.b2ContactFilter)});FO.prototype.get_m_contactCount=(function(){return jq(this.a)});FO.prototype.set_m_contactFilter=(function(b){kq(this.a,b.a)});function FO(){this.a=Vq();FO.prototype.b[this.a]=this;this.d=FO}FO.prototype.b={};Module.b2ContactManager=FO;FO.prototype.AddPair=(function(b,d){sp(this.a,b,d)});FO.prototype.set_m_allocator=(function(b){lq(this.a,b.a)});FO.prototype.set_m_contactCount=(function(b){mq(this.a,b)});FO.prototype.Collide=(function(){pp(this.a)});FO.prototype.set_m_contactList=(function(b){nq(this.a,b.a)});FO.prototype.FindNewContacts=(function(){Xq(this.a)});FO.prototype.get_m_contactListener=(function(){return EO(oq(this.a),Module.b2ContactListener)});FO.prototype.__destroy__=(function(){Ks(this.a)});FO.prototype.set_m_contactListener=(function(b){Yq(this.a,b.a)});FO.prototype.get_m_broadPhase=(function(){return EO(this.a|0,Module.b2BroadPhase)});FO.prototype.Destroy=(function(b){fp(this.a,b.a)});FO.prototype.set_m_broadPhase=(function(b){Ms(this.a,b.a)});FO.prototype.get_m_contactList=(function(){return EO(Zq(this.a),Module.b2Contact)});FO.prototype.get_m_allocator=(function(){return EO($q(this.a),Module.b2BlockAllocator)});GO.prototype.GetRestitution=(function(){return ar(this.a)});GO.prototype.SetFilterData=(function(b){Ns(this.a,b.a)});GO.prototype.SetFriction=(function(b){br(this.a,b)});function GO(){this.a=Os();GO.prototype.b[this.a]=this;this.d=GO}GO.prototype.b={};Module.b2Fixture=GO;GO.prototype.GetShape=(function(){return EO(cr(this.a),Module.b2Shape)});GO.prototype.SetRestitution=(function(b){dr(this.a,b)});GO.prototype.GetBody=(function(){return EO(er(this.a),Module.b2Body)});GO.prototype.GetNext=(function(){return EO(is(this.a),Module.b2Fixture)});GO.prototype.GetFriction=(function(){return js(this.a)});GO.prototype.GetUserData=(function(){return ks(this.a)});GO.prototype.SetDensity=(function(b){ls(this.a,b)});GO.prototype.GetMassData=(function(b){Ps(this.a,b.a)});GO.prototype.SetSensor=(function(b){ms(this.a,b)});GO.prototype.GetAABB=(function(b){return EO(ns(this.a,b),Module.b2AABB)});GO.prototype.TestPoint=(function(b){return Qs(this.a,b.a)});GO.prototype.SetUserData=(function(b){os(this.a,b)});GO.prototype.__destroy__=(function(){Rs(this.a)});GO.prototype.RayCast=(function(b,d,e){return Ss(this.a,b.a,d.a,e)});GO.prototype.Refilter=(function(){xo(this.a)});GO.prototype.Dump=(function(b){mp(this.a,b)});GO.prototype.GetFilterData=(function(){return EO(this.a+32|0,Module.b2Filter)});GO.prototype.IsSensor=(function(){return ps(this.a)});GO.prototype.GetType=(function(){return qs(this.a)});GO.prototype.GetDensity=(function(){return rs(this.a)});HO.prototype.GetTreeQuality=(function(){return ss(this.a)});HO.prototype.GetFatAABB=(function(b){return EO(Ts(this.a,b),Module.b2AABB)});HO.prototype.GetUserData=(function(b){return Us(this.a,b)});HO.prototype.__destroy__=(function(){Vs(this.a)});HO.prototype.GetTreeHeight=(function(){return ts(this.a)});function HO(){this.a=Ws();HO.prototype.b[this.a]=this;this.d=HO}HO.prototype.b={};Module.b2BroadPhase=HO;HO.prototype.GetProxyCount=(function(){return us(this.a)});HO.prototype.GetTreeBalance=(function(){return Xs(this.a)});HO.prototype.TestOverlap=(function(b,d){return Ys(this.a,b,d)});HO.prototype.TouchProxy=(function(b){Zs(this.a,b)});HO.prototype.CreateProxy=(function(b,d){return gh(this.a,b.a,d)});HO.prototype.MoveProxy=(function(b,d,e){$s(this.a,b,d.a,e.a)});HO.prototype.DestroyProxy=(function(b){at(this.a,b)});IO.prototype.QueryAABB=(function(b,d){bt(this.a,b.a,d.a)});IO.prototype.SetSubStepping=(function(b){vs(this.a,b)});IO.prototype.GetTreeQuality=(function(){return ws(this.a)});IO.prototype.GetTreeHeight=(function(){return xs(this.a)});IO.prototype.GetProfile=(function(){return EO(this.a+102996|0,Module.b2Profile)});IO.prototype.GetTreeBalance=(function(){return ct(this.a)});IO.prototype.GetSubStepping=(function(){return ys(this.a)});IO.prototype.GetContactManager=(function(){return EO(this.a+102872|0,Module.b2ContactManager)});IO.prototype.SetContactListener=(function(b){zs(this.a,b.a)});IO.prototype.DrawDebugData=(function(){aq(this.a)});IO.prototype.SetContinuousPhysics=(function(b){As(this.a,b)});IO.prototype.SetGravity=(function(b){Bs(this.a,b.a)});IO.prototype.GetBodyCount=(function(){return Cs(this.a)});IO.prototype.GetAutoClearForces=(function(){return Ds(this.a)});IO.prototype.GetContinuousPhysics=(function(){return Es(this.a)});IO.prototype.GetJointList=(function(){return EO(Fs(this.a),Module.b2Joint)});IO.prototype.CreateBody=(function(b){return EO(dt(this.a,b.a),Module.b2Body)});IO.prototype.GetBodyList=(function(){return EO(Gs(this.a),Module.b2Body)});IO.prototype.SetDestructionListener=(function(b){Hs(this.a,b.a)});IO.prototype.DestroyJoint=(function(b){Cp(this.a,b.a)});function IO(b){this.a=et(b.a);IO.prototype.b[this.a]=this;this.d=IO}IO.prototype.b={};Module.b2World=IO;IO.prototype.GetJointCount=(function(){return Is(this.a)});IO.prototype.Step=(function(b,d,e){Pp(this.a,b,d,e)});IO.prototype.ClearForces=(function(){Js(this.a)});IO.prototype.GetWarmStarting=(function(){return ft(this.a)});IO.prototype.SetAllowSleeping=(function(b){gt(this.a,b)});IO.prototype.DestroyBody=(function(b){Bp(this.a,b.a)});IO.prototype.GetAllowSleeping=(function(){return ht(this.a)});IO.prototype.CreateJoint=(function(b){return EO(Dp(this.a,b.a),Module.b2Joint)});IO.prototype.GetProxyCount=(function(){return it(this.a)});IO.prototype.RayCast=(function(b,d,e){ku(this.a,b.a,d.a,e.a)});IO.prototype.IsLocked=(function(){return jt(this.a)});IO.prototype.GetContactList=(function(){return EO(kt(this.a),Module.b2Contact)});IO.prototype.SetDebugDraw=(function(b){lt(this.a,b.a)});IO.prototype.__destroy__=(function(){lu(this.a)});IO.prototype.Dump=(function(){bq(this.a)});IO.prototype.SetAutoClearForces=(function(b){mt(this.a,b)});IO.prototype.GetGravity=(function(){return EO(mu(this.a),Module.b2Vec2)});IO.prototype.GetContactCount=(function(){return nt(this.a)});IO.prototype.SetWarmStarting=(function(b){ot(this.a,b)});IO.prototype.SetContactFilter=(function(b){pt(this.a,b.a)});JO.prototype.__destroy__=(function(){Nv(this.a)});JO.prototype.GetType=(function(){return qt(this.a)});JO.prototype.ComputeMass=(function(b,d){Lw(this.a,b.a,d)});JO.prototype.set_m_radius=(function(b){rt(this.a,b)});JO.prototype.get_m_radius=(function(){return st(this.a)});JO.prototype.GetVertex=(function(){return EO(this.a+12|0,Module.b2Vec2)});JO.prototype.Clone=(function(b){return EO(Mw(this.a,b.a),Module.b2Shape)});JO.prototype.GetSupportVertex=(function(){return EO(this.a+12|0,Module.b2Vec2)});JO.prototype.RayCast=(function(b,d,e,f){return Nw(this.a,b.a,d.a,e.a,f)});JO.prototype.ComputeAABB=(function(b,d,e){Tw(this.a,b.a,d.a,e)});JO.prototype.GetVertexCount=Lb(1);JO.prototype.GetChildCount=(function(){return Uw(this.a)});JO.prototype.TestPoint=(function(b,d){return Vw(this.a,b.a,d.a)});function JO(){this.a=Ww();JO.prototype.b[this.a]=this;this.d=JO}JO.prototype.b={};Module.b2CircleShape=JO;JO.prototype.GetSupport=Lb(0);JO.prototype.set_m_p=(function(b){tt(this.a,b.a)});JO.prototype.get_m_p=(function(){return EO(this.a+12|0,Module.b2Vec2)});function KO(){ja("b2Draw is abstract!")}KO.prototype.b={};Module.b2Draw=KO;KO.prototype.AppendFlags=(function(b){ut(this.a,b)});KO.prototype.DrawTransform=(function(b){Yw(this.a,b.a)});KO.prototype.ClearFlags=(function(b){vt(this.a,b)});KO.prototype.DrawPolygon=(function(b,d,e){Zw(this.a,b.a,d,e.a)});KO.prototype.DrawSolidCircle=(function(b,d,e,f){$w(this.a,b.a,d,e.a,f.a)});KO.prototype.DrawSolidPolygon=(function(b,d,e){ax(this.a,b.a,d,e.a)});KO.prototype.DrawCircle=(function(b,d,e){bx(this.a,b.a,d,e.a)});KO.prototype.SetFlags=(function(b){wt(this.a,b)});KO.prototype.DrawSegment=(function(b,d,e){cx(this.a,b.a,d.a,e.a)});KO.prototype.GetFlags=(function(){return xt(this.a)});function LO(){ja("b2Joint is abstract!")}LO.prototype.b={};Module.b2Joint=LO;LO.prototype.GetNext=(function(){return EO(yt(this.a),Module.b2Joint)});LO.prototype.GetBodyA=(function(){return EO(zt(this.a),Module.b2Body)});LO.prototype.GetBodyB=(function(){return EO(At(this.a),Module.b2Body)});LO.prototype.GetReactionTorque=(function(b){return dx(this.a,b)});LO.prototype.GetAnchorA=(function(){return EO(ex(this.a),Module.b2Vec2)});LO.prototype.GetUserData=(function(){return $t(this.a)});LO.prototype.GetType=(function(){return au(this.a)});LO.prototype.SetUserData=(function(b){bu(this.a,b)});LO.prototype.GetCollideConnected=(function(){return cu(this.a)});LO.prototype.Dump=(function(){hx(this.a)});LO.prototype.GetAnchorB=(function(){return EO(ix(this.a),Module.b2Vec2)});LO.prototype.GetReactionForce=(function(b){return EO(lx(this.a,b),Module.b2Vec2)});LO.prototype.IsActive=(function(){return du(this.a)});function MO(){ja("b2RayCastCallback is abstract!")}MO.prototype.b={};Module.b2RayCastCallback=MO;MO.prototype.ReportFixture=(function(b,d,e,f){return ox(this.a,b.a,d.a,e.a,f)});NO.prototype.__destroy__=(function(){px(this.a)});function NO(){this.a=qx();NO.prototype.b[this.a]=this;this.d=NO}NO.prototype.b={};Module.b2DynamicTree=NO;NO.prototype.GetFatAABB=(function(b){return EO(rx(this.a,b),Module.b2AABB)});NO.prototype.GetUserData=(function(b){return sx(this.a,b)});NO.prototype.GetMaxBalance=(function(){return tx(this.a)});NO.prototype.GetHeight=(function(){return eu(this.a)});NO.prototype.GetAreaRatio=(function(){return fu(this.a)});NO.prototype.RebuildBottomUp=(function(){km(this.a)});NO.prototype.CreateProxy=(function(b,d){return ux(this.a,b.a,d)});NO.prototype.MoveProxy=(function(b,d,e){return Rl(this.a,b,d.a,e.a)});NO.prototype.Validate=(function(){jm(this.a)});NO.prototype.DestroyProxy=(function(b){Nk(this.a,b)});function OO(){this.a=vx();OO.prototype.b[this.a]=this;this.d=OO}OO.prototype.b={};Module.b2Timer=OO;OO.prototype.Reset=Hb();OO.prototype.__destroy__=(function(){wx(this.a)});OO.prototype.GetMilliseconds=Lb(0);PO.prototype.__destroy__=(function(){xx(this.a)});function PO(){this.a=yx();PO.prototype.b[this.a]=this;this.d=PO}PO.prototype.b={};Module.b2ContactListener=PO;PO.prototype.EndContact=(function(b){Ax(this.a,b.a)});PO.prototype.BeginContact=(function(b){Bx(this.a,b.a)});PO.prototype.PreSolve=(function(b,d){Cx(this.a,b.a,d.a)});PO.prototype.PostSolve=(function(b,d){Dx(this.a,b.a,d.a)});QO.prototype.__destroy__=(function(){Ex(this.a)});QO.prototype.GetType=(function(){return gu(this.a)});QO.prototype.CreateChain=(function(b,d){Fx(this.a,b.a,d)});QO.prototype.set_m_radius=(function(b){hu(this.a,b)});QO.prototype.get_m_radius=(function(){return iu(this.a)});QO.prototype.get_m_vertices=(function(){return EO(ju(this.a),Module.b2Vec2)});QO.prototype.ComputeMass=(function(b,d){wy(this.a,b.a,d)});QO.prototype.Clone=(function(b){return EO(xy(this.a,b.a),Module.b2Shape)});QO.prototype.get_m_count=(function(){return Gx(this.a)});QO.prototype.GetChildEdge=(function(b,d){Um(this.a,b.a,d)});function QO(){this.a=yy();QO.prototype.b[this.a]=this;this.d=QO}QO.prototype.b={};Module.b2ChainShape=QO;QO.prototype.ComputeAABB=(function(b,d,e){Ay(this.a,b.a,d.a,e)});QO.prototype.RayCast=(function(b,d,e,f){return By(this.a,b.a,d.a,e.a,f)});QO.prototype.GetChildCount=(function(){return Cy(this.a)});QO.prototype.TestPoint=(function(b,d){return Dy(this.a,b.a,d.a)});QO.prototype.SetPrevVertex=(function(b){Hx(this.a,b.a)});QO.prototype.CreateLoop=(function(b,d){Ey(this.a,b.a,d)});QO.prototype.set_m_vertices=(function(b){Ix(this.a,b.a)});QO.prototype.SetNextVertex=(function(b){Jx(this.a,b.a)});QO.prototype.set_m_count=(function(b){Kx(this.a,b)});function RO(){ja("b2QueryCallback is abstract!")}RO.prototype.b={};Module.b2QueryCallback=RO;RO.prototype.ReportFixture=(function(b){return Fy(this.a,b.a)});SO.prototype.__destroy__=(function(){Gy(this.a)});SO.prototype.Clear=(function(){Hy(this.a)});SO.prototype.Free=(function(b,d){EB(this.a,b,d)});SO.prototype.Allocate=(function(b){return qn(this.a,b)});function SO(){this.a=gF();SO.prototype.b[this.a]=this;this.d=SO}SO.prototype.b={};Module.b2BlockAllocator=SO;TO.prototype.__destroy__=(function(){hF(this.a)});TO.prototype.Set=(function(b,d){on(this.a,b.a,d)});TO.prototype.ComputeMass=(function(b,d){iF(this.a,b.a,d)});TO.prototype.set_m_radius=(function(b){Lx(this.a,b)});TO.prototype.get_m_radius=(function(){return Mx(this.a)});TO.prototype.Clone=(function(b){return EO(jF(this.a,b.a),Module.b2Shape)});TO.prototype.GetVertex=(function(b){return EO(Nx(this.a,b),Module.b2Vec2)});TO.prototype.RayCast=(function(b,d,e,f){return kF(this.a,b.a,d.a,e.a,f)});TO.prototype.SetAsBox=(function(b,d,e,f){e===Ha?Ox(this.a,b,d):Wm(this.a,b,d,e.a,f)});TO.prototype.set_m_centroid=(function(b){Px(this.a,b.a)});TO.prototype.ComputeAABB=(function(b,d,e){lF(this.a,b.a,d.a,e)});TO.prototype.set_m_vertexCount=(function(b){Qx(this.a,b)});TO.prototype.GetVertexCount=(function(){return Rx(this.a)});TO.prototype.GetChildCount=(function(){return mF(this.a)});TO.prototype.TestPoint=(function(b,d){return nF(this.a,b.a,d.a)});TO.prototype.GetType=(function(){return Sx(this.a)});function TO(){this.a=oF();TO.prototype.b[this.a]=this;this.d=TO}TO.prototype.b={};Module.b2PolygonShape=TO;TO.prototype.get_m_vertexCount=(function(){return Tx(this.a)});TO.prototype.get_m_centroid=(function(){return EO(this.a+12|0,Module.b2Vec2)});UO.prototype.__destroy__=(function(){qF(this.a)});UO.prototype.Set=(function(b,d){Ux(this.a,b.a,d.a)});UO.prototype.ComputeMass=(function(b,d){rF(this.a,b.a,d)});UO.prototype.set_m_radius=(function(b){Vx(this.a,b)});UO.prototype.get_m_radius=(function(){return Wx(this.a)});UO.prototype.Clone=(function(b){return EO(sF(this.a,b.a),Module.b2Shape)});UO.prototype.GetType=(function(){return Xx(this.a)});UO.prototype.RayCast=(function(b,d,e,f){return tF(this.a,b.a,d.a,e.a,f)});UO.prototype.ComputeAABB=(function(b,d,e){uF(this.a,b.a,d.a,e)});UO.prototype.GetChildCount=(function(){return vF(this.a)});UO.prototype.TestPoint=(function(b,d){return wF(this.a,b.a,d.a)});function UO(){this.a=xF();UO.prototype.b[this.a]=this;this.d=UO}UO.prototype.b={};Module.b2EdgeShape=UO;function VO(){ja("b2Contact is abstract!")}VO.prototype.b={};Module.b2Contact=VO;VO.prototype.GetNext=(function(){return EO(Yx(this.a),Module.b2Contact)});VO.prototype.SetEnabled=(function(b){Zx(this.a,b)});VO.prototype.GetWorldManifold=(function(b){zF(this.a,b.a)});VO.prototype.GetRestitution=(function(){return $x(this.a)});VO.prototype.ResetFriction=(function(){AF(this.a)});VO.prototype.GetFriction=(function(){return ay(this.a)});VO.prototype.IsTouching=(function(){return by(this.a)});VO.prototype.IsEnabled=(function(){return cy(this.a)});VO.prototype.GetFixtureB=(function(){return EO(dy(this.a),Module.b2Fixture)});VO.prototype.SetFriction=(function(b){ey(this.a,b)});VO.prototype.GetFixtureA=(function(){return EO(fy(this.a),Module.b2Fixture)});VO.prototype.GetChildIndexA=(function(){return gy(this.a)});VO.prototype.GetChildIndexB=(function(){return hy(this.a)});VO.prototype.Evaluate=(function(b,d,e){BF(this.a,b.a,d.a,e.a)});VO.prototype.SetRestitution=(function(b){iy(this.a,b)});VO.prototype.GetManifold=(function(){return EO(this.a+64|0,Module.b2Manifold)});VO.prototype.ResetRestitution=(function(){jy(this.a)});function WO(){ja("b2Shape is abstract!")}WO.prototype.b={};Module.b2Shape=WO;WO.prototype.get_m_radius=(function(){return ky(this.a)});WO.prototype.ComputeMass=(function(b,d){CF(this.a,b.a,d)});WO.prototype.set_m_radius=(function(b){ly(this.a,b)});WO.prototype.Clone=(function(b){return EO(DF(this.a,b.a),Module.b2Shape)});WO.prototype.GetType=(function(){return my(this.a)});WO.prototype.RayCast=(function(b,d,e,f){return EF(this.a,b.a,d.a,e.a,f)});WO.prototype.ComputeAABB=(function(b,d,e){FF(this.a,b.a,d.a,e)});WO.prototype.GetChildCount=(function(){return GF(this.a)});WO.prototype.TestPoint=(function(b,d){return HF(this.a,b.a,d.a)});function XO(){ja("b2Body is abstract!")}XO.prototype.b={};Module.b2Body=XO;XO.prototype.GetAngle=(function(){return ny(this.a)});XO.prototype.GetUserData=(function(){return oy(this.a)});XO.prototype.IsSleepingAllowed=(function(){return py(this.a)});XO.prototype.SetAngularDamping=(function(b){qy(this.a,b)});XO.prototype.SetActive=(function(b){kp(this.a,b)});XO.prototype.SetGravityScale=(function(b){ry(this.a,b)});XO.prototype.SetUserData=(function(b){sy(this.a,b)});XO.prototype.GetAngularVelocity=(function(){return ty(this.a)});XO.prototype.GetFixtureList=(function(){return EO(uy(this.a),Module.b2Fixture)});XO.prototype.ApplyForce=(function(b,d){vy(this.a,b.a,d.a)});XO.prototype.GetLocalPoint=(function(b){return EO(IF(this.a,b.a),Module.b2Vec2)});XO.prototype.SetLinearVelocity=(function(b){LF(this.a,b.a)});XO.prototype.GetJointList=(function(){return EO(MF(this.a),Module.b2JointEdge)});XO.prototype.GetLinearVelocity=(function(){return EO(tG(this.a),Module.b2Vec2)});XO.prototype.GetNext=(function(){return EO(NF(this.a),Module.b2Body)});XO.prototype.SetSleepingAllowed=(function(b){OF(this.a,b)});XO.prototype.SetTransform=(function(b,d){ip(this.a,b.a,d)});XO.prototype.GetMass=(function(){return PF(this.a)});XO.prototype.SetAngularVelocity=(function(b){QF(this.a,b)});XO.prototype.GetMassData=(function(b){RF(this.a,b.a)});XO.prototype.GetLinearVelocityFromWorldPoint=(function(b){return EO(wG(this.a,b.a),Module.b2Vec2)});XO.prototype.ResetMassData=(function(){vo(this.a)});XO.prototype.ApplyForceToCenter=(function(b){SF(this.a,b.a)});XO.prototype.ApplyTorque=(function(b){TF(this.a,b)});XO.prototype.IsAwake=(function(){return UF(this.a)});XO.prototype.SetType=(function(b){uo(this.a,b)});XO.prototype.CreateFixture=(function(b,d){return d===Ha?EO(cp(this.a,b.a),Module.b2Fixture):EO(zG(this.a,b.a,d),Module.b2Fixture)});XO.prototype.SetMassData=(function(b){hp(this.a,b.a)});XO.prototype.GetTransform=(function(){return EO(this.a+12|0,Module.b2Transform)});XO.prototype.GetWorldCenter=(function(){return EO(this.a+44|0,Module.b2Vec2)});XO.prototype.GetAngularDamping=(function(){return VF(this.a)});XO.prototype.ApplyLinearImpulse=(function(b,d){WF(this.a,b.a,d.a)});XO.prototype.IsFixedRotation=(function(){return XF(this.a)});XO.prototype.GetLocalCenter=(function(){return EO(this.a+28|0,Module.b2Vec2)});XO.prototype.GetWorldVector=(function(b){return EO(AG(this.a,b.a),Module.b2Vec2)});XO.prototype.GetLinearVelocityFromLocalPoint=(function(b){return EO(DG(this.a,b.a),Module.b2Vec2)});XO.prototype.GetContactList=(function(){return EO(YF(this.a),Module.b2ContactEdge)});XO.prototype.GetWorldPoint=(function(b){return EO(GG(this.a,b.a),Module.b2Vec2)});XO.prototype.SetAwake=(function(b){JG(this.a,b)});XO.prototype.GetLinearDamping=(function(){return ZF(this.a)});XO.prototype.IsBullet=(function(){return $F(this.a)});XO.prototype.GetWorld=(function(){return EO(aG(this.a),Module.b2World)});XO.prototype.GetLocalVector=(function(b){return EO(KG(this.a,b.a),Module.b2Vec2)});XO.prototype.SetLinearDamping=(function(b){bG(this.a,b)});XO.prototype.Dump=(function(){lp(this.a)});XO.prototype.SetBullet=(function(b){cG(this.a,b)});XO.prototype.GetType=(function(){return dG(this.a)});XO.prototype.GetGravityScale=(function(){return eG(this.a)});XO.prototype.DestroyFixture=(function(b){ep(this.a,b.a)});XO.prototype.GetInertia=(function(){return fG(this.a)});XO.prototype.IsActive=(function(){return gG(this.a)});XO.prototype.SetFixedRotation=(function(b){NG(this.a,b)});XO.prototype.ApplyAngularImpulse=(function(b){hG(this.a,b)});XO.prototype.GetPosition=(function(){return EO(this.a+12|0,Module.b2Vec2)});YO.prototype.GetMaxAllocation=(function(){return iG(this.a)});YO.prototype.__destroy__=(function(){OG(this.a)});function YO(){this.a=PG();YO.prototype.b[this.a]=this;this.d=YO}YO.prototype.b={};Module.b2StackAllocator=YO;YO.prototype.Allocate=(function(b){return QG(this.a,b)});YO.prototype.Free=(function(b){so(this.a,b)});function ZO(){ja("b2DestructionListener is abstract!")}ZO.prototype.b={};Module.b2DestructionListener=ZO;ZO.prototype.SayGoodbye=(function(b){RG(this.a,b.a)});$O.prototype.__destroy__=(function(){SG(this.a)});$O.prototype.set_maskBits=(function(b){jG(this.a,b)});$O.prototype.set_categoryBits=(function(b){kG(this.a,b)});$O.prototype.get_groupIndex=(function(){return lG(this.a)});$O.prototype.set_groupIndex=(function(b){mG(this.a,b)});$O.prototype.get_maskBits=(function(){return nG(this.a)});function $O(){this.a=TG();$O.prototype.b[this.a]=this;this.d=$O}$O.prototype.b={};Module.b2Filter=$O;$O.prototype.get_categoryBits=(function(){return oG(this.a)});aP.prototype.set_localAnchorA=(function(b){pG(this.a,b.a)});aP.prototype.__destroy__=(function(){UG(this.a)});aP.prototype.set_localAnchorB=(function(b){qG(this.a,b.a)});aP.prototype.get_maxForce=(function(){return rG(this.a)});function aP(){this.a=VG();aP.prototype.b[this.a]=this;this.d=aP}aP.prototype.b={};Module.b2FrictionJointDef=aP;aP.prototype.get_localAnchorA=(function(){return EO(this.a+20|0,Module.b2Vec2)});aP.prototype.set_maxForce=(function(b){sG(this.a,b)});aP.prototype.get_localAnchorB=(function(){return EO(this.a+28|0,Module.b2Vec2)});aP.prototype.set_maxTorque=(function(b){WG(this.a,b)});aP.prototype.get_maxTorque=(function(){return XG(this.a)});aP.prototype.Initialize=(function(b,d,e){YG(this.a,b.a,d.a,e.a)});bP.prototype.get_linearDamping=(function(){return ZG(this.a)});bP.prototype.get_awake=(function(){return $G(this.a)});bP.prototype.get_type=(function(){return aH(this.a)});bP.prototype.get_allowSleep=(function(){return bH(this.a)});bP.prototype.set_position=(function(b){cH(this.a,b.a)});bP.prototype.set_linearVelocity=(function(b){dH(this.a,b.a)});function bP(){this.a=qI();bP.prototype.b[this.a]=this;this.d=bP}bP.prototype.b={};Module.b2BodyDef=bP;bP.prototype.get_bullet=(function(){return eH(this.a)});bP.prototype.get_userData=(function(){return fH(this.a)});bP.prototype.set_angularDamping=(function(b){gH(this.a,b)});bP.prototype.set_fixedRotation=(function(b){hH(this.a,b)});bP.prototype.set_allowSleep=(function(b){iH(this.a,b)});bP.prototype.get_gravityScale=(function(){return jH(this.a)});bP.prototype.set_angularVelocity=(function(b){kH(this.a,b)});bP.prototype.set_userData=(function(b){lH(this.a,b)});bP.prototype.get_position=(function(){return EO(this.a+4|0,Module.b2Vec2)});bP.prototype.__destroy__=(function(){rI(this.a)});bP.prototype.set_type=(function(b){mH(this.a,b)});bP.prototype.set_gravityScale=(function(b){nH(this.a,b)});bP.prototype.get_angularDamping=(function(){return oH(this.a)});bP.prototype.set_bullet=(function(b){pH(this.a,b)});bP.prototype.set_active=(function(b){qH(this.a,b)});bP.prototype.set_angle=(function(b){rH(this.a,b)});bP.prototype.get_angle=(function(){return sH(this.a)});bP.prototype.get_angularVelocity=(function(){return tH(this.a)});bP.prototype.get_linearVelocity=(function(){return EO(this.a+16|0,Module.b2Vec2)});bP.prototype.get_active=(function(){return uH(this.a)});bP.prototype.set_linearDamping=(function(b){vH(this.a,b)});bP.prototype.get_fixedRotation=(function(){return wH(this.a)});bP.prototype.set_awake=(function(b){xH(this.a,b)});cP.prototype.Normalize=(function(){return sI(this.a)});cP.prototype.set_x=(function(b){yH(this.a,b)});function cP(b,d){this.a=b===Ha?tI():uI(b,d);cP.prototype.b[this.a]=this;this.d=cP}cP.prototype.b={};Module.b2Vec2=cP;cP.prototype.Set=(function(b,d){zH(this.a,b,d)});cP.prototype.get_x=(function(){return AH(this.a)});cP.prototype.get_y=(function(){return BH(this.a)});cP.prototype.set_y=(function(b){CH(this.a,b)});cP.prototype.IsValid=(function(){return DH(this.a)});cP.prototype.Skew=(function(){return EO(vI(this.a),Module.b2Vec2)});cP.prototype.LengthSquared=(function(){return EH(this.a)});cP.prototype.op_add=(function(b){FH(this.a,b.a)});cP.prototype.SetZero=(function(){GH(this.a)});cP.prototype.Length=(function(){return yI(this.a)});cP.prototype.__destroy__=(function(){zI(this.a)});cP.prototype.op_mul=(function(b){HH(this.a,b)});cP.prototype.op_sub=(function(){return EO(AI(this.a),Module.b2Vec2)});dP.prototype.__destroy__=(function(){DI(this.a)});dP.prototype.set_z=(function(b){IH(this.a,b)});dP.prototype.Set=(function(b,d,e){JH(this.a,b,d,e)});dP.prototype.get_z=(function(){return KH(this.a)});dP.prototype.op_add=(function(b){LH(this.a,b.a)});dP.prototype.SetZero=(function(){MH(this.a)});function dP(b,d,e){this.a=b===Ha?EI():FI(b,d,e);dP.prototype.b[this.a]=this;this.d=dP}dP.prototype.b={};Module.b2Vec3=dP;dP.prototype.op_mul=(function(b){NH(this.a,b)});dP.prototype.op_sub=(function(){return EO(GI(this.a),Module.b2Vec3)});eP.prototype.get_m_radius=(function(){return OH(this.a)});eP.prototype.Set=(function(b,d){Hi(this.a,b.a,d)});function eP(){this.a=JI();eP.prototype.b[this.a]=this;this.d=eP}eP.prototype.b={};Module.b2DistanceProxy=eP;eP.prototype.set_m_radius=(function(b){PH(this.a,b)});eP.prototype.__destroy__=(function(){KI(this.a)});eP.prototype.get_m_vertices=(function(){return QH(this.a)});eP.prototype.GetSupportVertex=(function(b){return EO(RH(this.a,b.a),Module.b2Vec2)});eP.prototype.get_m_count=(function(){return SH(this.a)});eP.prototype.GetVertexCount=(function(){return TH(this.a)});eP.prototype.GetVertex=(function(b){return EO(LI(this.a,b),Module.b2Vec2)});eP.prototype.GetSupport=(function(b){return UH(this.a,b.a)});eP.prototype.set_m_vertices=(function(b){VH(this.a,b.a)});eP.prototype.set_m_count=(function(b){WH(this.a,b)});fP.prototype.__destroy__=(function(){MI(this.a)});fP.prototype.get_isSensor=(function(){return XH(this.a)});fP.prototype.set_userData=(function(b){YH(this.a,b)});fP.prototype.set_shape=(function(b){ZH(this.a,b.a)});fP.prototype.get_density=(function(){return $H(this.a)});fP.prototype.get_shape=(function(){return aI(this.a)});function fP(){this.a=NI();fP.prototype.b[this.a]=this;this.d=fP}fP.prototype.b={};Module.b2FixtureDef=fP;fP.prototype.set_density=(function(b){bI(this.a,b)});fP.prototype.set_restitution=(function(b){cI(this.a,b)});fP.prototype.get_restitution=(function(){return dI(this.a)});fP.prototype.set_isSensor=(function(b){eI(this.a,b)});fP.prototype.get_filter=(function(){return EO(this.a+22|0,Module.b2Filter)});fP.prototype.get_friction=(function(){return fI(this.a)});fP.prototype.set_friction=(function(b){gI(this.a,b)});fP.prototype.get_userData=(function(){return hI(this.a)});fP.prototype.set_filter=(function(b){OI(this.a,b.a)});gP.prototype.set_localAnchorA=(function(b){iI(this.a,b.a)});gP.prototype.set_localAnchorB=(function(b){jI(this.a,b.a)});gP.prototype.get_motorSpeed=(function(){return kI(this.a)});gP.prototype.get_enableMotor=(function(){return lI(this.a)});gP.prototype.get_referenceAngle=(function(){return mI(this.a)});gP.prototype.set_enableLimit=(function(b){nI(this.a,b)});gP.prototype.set_motorSpeed=(function(b){oI(this.a,b)});gP.prototype.get_localAxisA=(function(){return EO(this.a+36|0,Module.b2Vec2)});gP.prototype.set_upperTranslation=(function(b){pI(this.a,b)});function gP(){this.a=PI();gP.prototype.b[this.a]=this;this.d=gP}gP.prototype.b={};Module.b2PrismaticJointDef=gP;gP.prototype.Initialize=(function(b,d,e,f){QI(this.a,b.a,d.a,e.a,f.a)});gP.prototype.set_lowerTranslation=(function(b){RI(this.a,b)});gP.prototype.get_upperTranslation=(function(){return SI(this.a)});gP.prototype.get_enableLimit=(function(){return TI(this.a)});gP.prototype.set_referenceAngle=(function(b){UI(this.a,b)});gP.prototype.get_localAnchorA=(function(){return EO(this.a+20|0,Module.b2Vec2)});gP.prototype.get_localAnchorB=(function(){return EO(this.a+28|0,Module.b2Vec2)});gP.prototype.__destroy__=(function(){dK(this.a)});gP.prototype.get_maxMotorForce=(function(){return VI(this.a)});gP.prototype.set_maxMotorForce=(function(b){WI(this.a,b)});gP.prototype.set_enableMotor=(function(b){XI(this.a,b)});gP.prototype.get_lowerTranslation=(function(){return YI(this.a)});gP.prototype.set_localAxisA=(function(b){ZI(this.a,b.a)});hP.prototype.__destroy__=(function(){eK(this.a)});hP.prototype.Set=(function(b){fK(this.a,b)});hP.prototype.GetAngle=(function(){return gK(this.a)});hP.prototype.GetYAxis=(function(){return EO(iK(this.a),Module.b2Vec2)});hP.prototype.GetXAxis=(function(){return EO(lK(this.a),Module.b2Vec2)});hP.prototype.set_c=(function(b){$I(this.a,b)});hP.prototype.SetIdentity=(function(){aJ(this.a)});function hP(b){this.a=b===Ha?oK():pK(b);hP.prototype.b[this.a]=this;this.d=hP}hP.prototype.b={};Module.b2Rot=hP;hP.prototype.get_c=(function(){return bJ(this.a)});iP.prototype.set_localAnchorA=(function(b){cJ(this.a,b.a)});iP.prototype.set_motorSpeed=(function(b){dJ(this.a,b)});iP.prototype.get_localAxisA=(function(){return EO(this.a+36|0,Module.b2Vec2)});iP.prototype.set_localAnchorB=(function(b){eJ(this.a,b.a)});iP.prototype.get_frequencyHz=(function(){return fJ(this.a)});iP.prototype.set_maxMotorTorque=(function(b){gJ(this.a,b)});iP.prototype.get_enableMotor=(function(){return hJ(this.a)});iP.prototype.__destroy__=(function(){qK(this.a)});iP.prototype.get_localAnchorA=(function(){return EO(this.a+20|0,Module.b2Vec2)});iP.prototype.get_maxMotorTorque=(function(){return iJ(this.a)});iP.prototype.get_localAnchorB=(function(){return EO(this.a+28|0,Module.b2Vec2)});iP.prototype.get_dampingRatio=(function(){return jJ(this.a)});iP.prototype.set_enableMotor=(function(b){kJ(this.a,b)});iP.prototype.set_frequencyHz=(function(b){lJ(this.a,b)});iP.prototype.Initialize=(function(b,d,e,f){mJ(this.a,b.a,d.a,e.a,f.a)});iP.prototype.set_dampingRatio=(function(b){nJ(this.a,b)});function iP(){this.a=rK();iP.prototype.b[this.a]=this;this.d=iP}iP.prototype.b={};Module.b2WheelJointDef=iP;iP.prototype.set_localAxisA=(function(b){oJ(this.a,b.a)});iP.prototype.get_motorSpeed=(function(){return pJ(this.a)});jP.prototype.set_localAnchorA=(function(b){qJ(this.a,b.a)});jP.prototype.get_lowerAngle=(function(){return rJ(this.a)});jP.prototype.set_upperAngle=(function(b){sJ(this.a,b)});jP.prototype.set_localAnchorB=(function(b){tJ(this.a,b.a)});jP.prototype.get_enableLimit=(function(){return uJ(this.a)});jP.prototype.set_lowerAngle=(function(b){vJ(this.a,b)});jP.prototype.get_enableMotor=(function(){return wJ(this.a)});jP.prototype.set_motorSpeed=(function(b){xJ(this.a,b)});jP.prototype.get_upperAngle=(function(){return yJ(this.a)});jP.prototype.set_referenceAngle=(function(b){zJ(this.a,b)});jP.prototype.set_maxMotorTorque=(function(b){AJ(this.a,b)});jP.prototype.get_localAnchorA=(function(){return EO(this.a+20|0,Module.b2Vec2)});jP.prototype.get_referenceAngle=(function(){return BJ(this.a)});jP.prototype.get_localAnchorB=(function(){return EO(this.a+28|0,Module.b2Vec2)});jP.prototype.set_enableLimit=(function(b){CJ(this.a,b)});jP.prototype.set_enableMotor=(function(b){DJ(this.a,b)});jP.prototype.__destroy__=(function(){sK(this.a)});function jP(){this.a=tK();jP.prototype.b[this.a]=this;this.d=jP}jP.prototype.b={};Module.b2RevoluteJointDef=jP;jP.prototype.Initialize=(function(b,d,e){EJ(this.a,b.a,d.a,e.a)});jP.prototype.get_maxMotorTorque=(function(){return FJ(this.a)});jP.prototype.get_motorSpeed=(function(){return GJ(this.a)});kP.prototype.set_localAnchorA=(function(b){HJ(this.a,b.a)});kP.prototype.__destroy__=(function(){uK(this.a)});kP.prototype.set_localAnchorB=(function(b){IJ(this.a,b.a)});kP.prototype.get_ratio=(function(){return JJ(this.a)});kP.prototype.get_lengthB=(function(){return KJ(this.a)});kP.prototype.get_lengthA=(function(){return LJ(this.a)});kP.prototype.get_localAnchorA=(function(){return EO(this.a+36|0,Module.b2Vec2)});kP.prototype.set_ratio=(function(b){MJ(this.a,b)});kP.prototype.get_localAnchorB=(function(){return EO(this.a+44|0,Module.b2Vec2)});kP.prototype.get_groundAnchorB=(function(){return EO(this.a+28|0,Module.b2Vec2)});kP.prototype.set_groundAnchorB=(function(b){NJ(this.a,b.a)});function kP(){this.a=vK();kP.prototype.b[this.a]=this;this.d=kP}kP.prototype.b={};Module.b2PulleyJointDef=kP;kP.prototype.set_groundAnchorA=(function(b){OJ(this.a,b.a)});kP.prototype.Initialize=(function(b,d,e,f,g,h,j){fq(this.a,b.a,d.a,e.a,f.a,g.a,h.a,j)});kP.prototype.set_lengthB=(function(b){PJ(this.a,b)});kP.prototype.set_lengthA=(function(b){QJ(this.a,b)});kP.prototype.get_groundAnchorA=(function(){return EO(this.a+20|0,Module.b2Vec2)});lP.prototype.get_bodyA=(function(){return EO(RJ(this.a),Module.b2Body)});lP.prototype.set_userData=(function(b){SJ(this.a,b)});lP.prototype.set_bodyA=(function(b){TJ(this.a,b.a)});lP.prototype.set_bodyB=(function(b){UJ(this.a,b.a)});lP.prototype.__destroy__=(function(){wK(this.a)});lP.prototype.get_bodyB=(function(){return EO(VJ(this.a),Module.b2Body)});lP.prototype.set_type=(function(b){WJ(this.a,b)});lP.prototype.get_collideConnected=(function(){return XJ(this.a)});lP.prototype.get_type=(function(){return YJ(this.a)});lP.prototype.set_collideConnected=(function(b){ZJ(this.a,b)});function lP(){this.a=xK();lP.prototype.b[this.a]=this;this.d=lP}lP.prototype.b={};Module.b2JointDef=lP;lP.prototype.get_userData=(function(){return $J(this.a)});mP.prototype.__destroy__=(function(){yK(this.a)});mP.prototype.Set=(function(b,d){zK(this.a,b.a,d)});mP.prototype.set_p=(function(b){aK(this.a,b.a)});mP.prototype.set_q=(function(b){bK(this.a,b.a)});mP.prototype.get_p=(function(){return EO(this.a|0,Module.b2Vec2)});mP.prototype.get_q=(function(){return EO(this.a+8|0,Module.b2Rot)});function mP(b,d){this.a=b===Ha?AK():BK(b.a,d.a);mP.prototype.b[this.a]=this;this.d=mP}mP.prototype.b={};Module.b2Transform=mP;mP.prototype.SetIdentity=(function(){cK(this.a)});$S.prototype.__destroy__=(function(){mL(this.a)});$S.prototype.set_b=(function(b){CK(this.a,b)});$S.prototype.Set=(function(b,d,e){DK(this.a,b,d,e)});$S.prototype.get_b=(function(){return EK(this.a)});function $S(b,d,e){this.a=b===Ha?nL():oL(b,d,e);$S.prototype.b[this.a]=this;this.d=$S}$S.prototype.b={};Module.b2Color=$S;aT.prototype.set_localAnchorA=(function(b){FK(this.a,b.a)});aT.prototype.__destroy__=(function(){pL(this.a)});aT.prototype.get_frequencyHz=(function(){return GK(this.a)});aT.prototype.set_localAnchorB=(function(b){HK(this.a,b.a)});aT.prototype.set_dampingRatio=(function(b){IK(this.a,b)});aT.prototype.set_referenceAngle=(function(b){JK(this.a,b)});aT.prototype.get_localAnchorA=(function(){return EO(this.a+20|0,Module.b2Vec2)});aT.prototype.get_referenceAngle=(function(){return KK(this.a)});aT.prototype.get_localAnchorB=(function(){return EO(this.a+28|0,Module.b2Vec2)});aT.prototype.get_dampingRatio=(function(){return LK(this.a)});aT.prototype.set_frequencyHz=(function(b){MK(this.a,b)});aT.prototype.Initialize=(function(b,d,e){NK(this.a,b.a,d.a,e.a)});function aT(){this.a=qL();aT.prototype.b[this.a]=this;this.d=aT}aT.prototype.b={};Module.b2WeldJointDef=aT;bT.prototype.__destroy__=(function(){rL(this.a)});bT.prototype.get_frequencyHz=(function(){return OK(this.a)});bT.prototype.set_dampingRatio=(function(b){PK(this.a,b)});function bT(){this.a=sL();bT.prototype.b[this.a]=this;this.d=bT}bT.prototype.b={};Module.b2MouseJointDef=bT;bT.prototype.get_maxForce=(function(){return QK(this.a)});bT.prototype.set_target=(function(b){RK(this.a,b.a)});bT.prototype.set_maxForce=(function(b){SK(this.a,b)});bT.prototype.get_target=(function(){return EO(this.a+20|0,Module.b2Vec2)});bT.prototype.set_frequencyHz=(function(b){TK(this.a,b)});bT.prototype.get_dampingRatio=(function(){return UK(this.a)});cT.prototype.set_localAnchorA=(function(b){VK(this.a,b.a)});cT.prototype.get_length=(function(){return WK(this.a)});cT.prototype.get_frequencyHz=(function(){return XK(this.a)});cT.prototype.set_localAnchorB=(function(b){YK(this.a,b.a)});cT.prototype.set_dampingRatio=(function(b){ZK(this.a,b)});cT.prototype.__destroy__=(function(){tL(this.a)});cT.prototype.get_localAnchorA=(function(){return EO(this.a+20|0,Module.b2Vec2)});cT.prototype.get_localAnchorB=(function(){return EO(this.a+28|0,Module.b2Vec2)});cT.prototype.get_dampingRatio=(function(){return $K(this.a)});function cT(){this.a=uL();cT.prototype.b[this.a]=this;this.d=cT}cT.prototype.b={};Module.b2DistanceJointDef=cT;cT.prototype.set_length=(function(b){aL(this.a,b)});cT.prototype.set_frequencyHz=(function(b){bL(this.a,b)});cT.prototype.Initialize=(function(b,d,e,f){vL(this.a,b.a,d.a,e.a,f.a)});dT.prototype.__destroy__=(function(){wL(this.a)});dT.prototype.set_joint1=(function(b){cL(this.a,b.a)});dT.prototype.set_joint2=(function(b){dL(this.a,b.a)});dT.prototype.set_ratio=(function(b){eL(this.a,b)});dT.prototype.get_joint1=(function(){return EO(fL(this.a),Module.b2Joint)});dT.prototype.get_joint2=(function(){return EO(gL(this.a),Module.b2Joint)});function dT(){this.a=xL();dT.prototype.b[this.a]=this;this.d=dT}dT.prototype.b={};Module.b2GearJointDef=dT;dT.prototype.get_ratio=(function(){return hL(this.a)});eT.prototype.set_localAnchorA=(function(b){iL(this.a,b.a)});eT.prototype.__destroy__=(function(){yL(this.a)});eT.prototype.get_maxLength=(function(){return jL(this.a)});eT.prototype.set_localAnchorB=(function(b){kL(this.a,b.a)});eT.prototype.get_localAnchorA=(function(){return EO(this.a+20|0,Module.b2Vec2)});eT.prototype.get_localAnchorB=(function(){return EO(this.a+28|0,Module.b2Vec2)});function eT(){this.a=zL();eT.prototype.b[this.a]=this;this.d=eT}eT.prototype.b={};Module.b2RopeJointDef=eT;eT.prototype.set_maxLength=(function(b){lL(this.a,b)});this.Box2D=Module;Module.b2_staticBody=0;Module.b2_kinematicBody=1;Module.b2_dynamicBody=2
;
(function() {

  cc.module('cc.Core').defines(function() {
    var _requestAnimFrame;
    _requestAnimFrame = (function() {
      return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback, element) {
        return window.setTimeout(callback, 1000 / 60);
      };
    })();
    cc.requestAnimationFrame = function(callback, element) {
      return _requestAnimFrame(callback, element);
    };
    cc.onVisibilityChange = function(callback) {
      var hidden, visibilityChange,
        _this = this;
      if (document.hidden != null) {
        hidden = "hidden";
        visibilityChange = "visibilitychange";
      } else if (document.mozHidden != null) {
        hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
      } else if (document.msHidden != null) {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
      } else if (document.webkitHidden != null) {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
      }
      return document.addEventListener(visibilityChange, function() {
        return callback(document[hidden]);
      }, false);
    };
    cc.ZERO = 0.0000001;
    return cc.rand = function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
  });

}).call(this);
(function() {

  cc.module('cc.Image').defines(function() {
    return this.set(cc.Class.extend({
      init: function(path, onload) {
        this.data = new window.Image;
        this.data.onload = onload;
        return this.data.src = path;
      },
      draw: function(x, y) {},
      drawTile: function(x, y, tileN, tileSize) {}
    }));
  });

}).call(this);
(function() {

  cc.module('cc.physics.Entity').defines(function() {
    return this.set(cc.Class.extend({
      pos: {
        x: 0,
        y: 0,
        z: 0
      },
      width: 0,
      height: 0,
      v: {
        x: 0,
        y: 0
      },
      maxV: {
        x: 200,
        y: 100
      },
      a: {
        x: 0,
        y: 0
      },
      bounciness: 0,
      standing: false,
      friction: 0.5,
      density: 1.0,
      _knownByPhysicsServer: false,
      _events: [],
      facingLeft: true,
      _compressedPhysicsForNew: function() {
        var height, width, x, y;
        x = this.pos.x;
        y = this.pos.y;
        width = this.width;
        height = this.height;
        if (this.hitbox) {
          x += this.hitbox.offset.x;
          y += this.hitbox.offset.y;
          width = this.hitbox.width;
          height = this.hitbox.height;
        }
        return [x, y, this.v.x, this.v.y, this.a.x, this.a.y, width, height, this.category, this.mask, this.bounciness, this.friction, this.density, this.maxV.x, this.maxV.y];
      },
      compressedPhysics: function() {
        var ev;
        if (!this._knownByPhysicsServer) {
          this._knownByPhysicsServer = true;
          this._events = [];
          return this._compressedPhysicsForNew();
        } else {
          ev = this._events;
          this._events = [];
          return ev;
        }
      },
      uncompressPhysics: function(p) {
        this.pos.x = p[0], this.pos.y = p[1], this.v.x = p[2], this.v.y = p[3], this.standing = p[4];
        if (this.hitbox) {
          this.pos.x -= this.hitbox.offset.x;
          this.pos.y -= this.hitbox.offset.y;
        }
        this.update();
      },
      _detectFacing: function() {
        if ((this.facingLeft && this.v.x > 1) || (!this.facingLeft && this.v.x < -1)) {
          this.facingLeft = !this.facingLeft;
        }
      },
      setV: function(vx, vy) {
        this.v.x = vx;
        this.v.y = vy;
        this._detectFacing();
        this._events.push('v', this.v.x, this.v.y);
        return this._mark();
      },
      setPos: function(px, py) {
        this.pos.x = px;
        this.pos.y = py;
        if (this.hitbox) {
          px += this.hitbox.offset.x;
          py += this.hitbox.offset.y;
        }
        this._events.push('p', px, py);
        return this._mark();
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.Entity').parent('cc.physics.Entity').jClass({
    sprites: {},
    sprite: null,
    category: 1,
    mask: 1,
    init: function(game, x, y, settings) {
      this.game = game;
      this.pos.x = x;
      this.pos.y = y;
    },
    setSprite: function(name) {
      this.sprite = this.sprites[name];
      this.sprite.timer = this.game.syncTimer(this.sprite.frameLength);
      return this.sprite;
    },
    addSprite: function(name, frameLength, frames) {
      var sprite;
      this.sprites[name] = sprite = new cc.Sprite(this.spriteSheet, frameLength, frames);
      if (!this.sprite) {
        this.setSprite(name);
        if (this.width && this.height) {
          return;
        }
        if (!this.width) {
          this.width = sprite.sheet.tileWidth;
        }
        if (!this.height) {
          this.height = sprite.sheet.tileHeight;
        }
        if (this.hitbox) {
          if (!this.hitbox.offset) {
            this.hitbox.offset = {};
          }
          if (!(this.hitbox.offset.x != null)) {
            this.hitbox.offset.x = Math.ceil((this.width - this.hitbox.width) / 2);
          }
          if (!(this.hitbox.offset.y != null)) {
            this.hitbox.offset.y = Math.ceil((this.height - this.hitbox.height) / 2);
          }
        }
      }
      return sprite;
    },
    update: function() {
      if (!this.game.useWebWorker) {
        this._step(this.game.tick);
      }
      if (this.sprite) {
        this.sprite.update();
      }
    },
    _mark: function() {
      this.game._hasUpdates = true;
      return this.game._updates[this.id] = this;
    },
    draw: function() {
      this.game.renderer.setSize(this.width, this.height);
      this.game.renderer.selectSprite(this.sprite);
      this._detectFacing();
      this.game.renderer.drawEntity(this.pos.x, this.pos.y, this.pos.z, this.facingLeft);
    }
  });

}).call(this);
(function() {

  cc.module('cc.Surface').defines(function() {
    return this.set(cc.Class.extend({
      tile: null,
      init: function(game, sheet, tileIdx, x, y, width, height, friction, bounciness) {
        var nCols;
        this.game = game;
        this.sheet = sheet;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.friction = friction != null ? friction : 0;
        this.bounciness = bounciness != null ? bounciness : 0;
        nCols = this.sheet.imgWidth() / this.sheet.tileWidth;
        this.tile = vec2.createFrom(tileIdx % nCols, Math.floor(tileIdx / nCols));
        return this._tileRepeat = vec2.createFrom(this.width / this.sheet.tileWidth, this.height / this.sheet.tileHeight);
      },
      compressedPhysics: function() {
        return [this.x, this.y, this.width, this.height, this.friction, this.bounciness];
      },
      draw: function() {
        this.game.renderer.setSize(this.width, this.height);
        this.game.renderer.selectSprite(this);
        this.game.renderer.tileRepeat(this._tileRepeat);
        return this.game.renderer.drawSurface(this.x, this.y, this.z || 0);
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.Resources').requires('cc.Image').defines(function() {
    return this.set(cc.Class.extend({
      images: {},
      spriteSheets: {},
      audios: {},
      completeCallbacks: [],
      nToLoad: 0,
      nLoaded: 0,
      completeness: function() {
        if (0 === this.nToLoad) {
          return 1;
        } else {
          return this.nLoaded / this.nToLoad;
        }
      },
      _loaded: function() {
        var callback, completeness, _i, _len, _ref;
        ++this.nLoaded;
        completeness = this.completeness();
        _ref = this.completeCallbacks;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          callback = _ref[_i];
          callback(completeness);
        }
      },
      image: function(path) {
        var img,
          _this = this;
        img = this.images[path];
        if (img) {
          return img;
        }
        ++this.nToLoad;
        return img = this.images[path] = new cc.Image(path, function() {
          return _this._loaded();
        });
      },
      spriteSheet: function(path, width, height) {
        var spriteSheet,
          _this = this;
        spriteSheet = this.images[path];
        if (spriteSheet) {
          if (!(spriteSheet instanceof cc.SpriteSheet)) {
            throw "" + path + " is Image";
          }
          return spriteSheet;
        }
        ++this.nToLoad;
        return spriteSheet = this.spriteSheets[path] = this.images[path] = new cc.SpriteSheet(path, width, height, function() {
          return _this._loaded();
        });
      },
      onLoadStatusUpdate: function(callback) {
        callback(this.completeness());
        this.completeCallbacks.push(callback);
      },
      clearLoadStatusUpdates: function() {
        this.completeCallbacks.length = 0;
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.LoadingScreen').defines(function() {
    return this.set(cc.Class.extend({}));
  });

}).call(this);
(function() {

  cc.module('cc.Sprite').defines(function() {
    return this.set(cc.Class.extend({
      frames: null,
      timer: null,
      sheet: null,
      frame: 0,
      tile: null,
      init: function(sheet, frameLength, _frames) {
        var frame, nCols, _i, _len;
        this.sheet = sheet;
        this.frameLength = frameLength;
        nCols = this.sheet.imgWidth() / this.sheet.tileWidth;
        this.frames = [];
        for (_i = 0, _len = _frames.length; _i < _len; _i++) {
          frame = _frames[_i];
          this.frames.push(vec2.createFrom(frame % nCols, Math.floor(frame / nCols)));
        }
        return this.tile = this.frames[0];
      },
      update: function() {
        if (this.timer.expired()) {
          this.timer.reset();
          this.frame = (this.frame + 1) % this.frames.length;
          this.tile = this.frames[this.frame];
        }
      },
      rewind: function() {
        this.frame = 0;
        return this;
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.SpriteSheet').defines(function() {
    return this.set(cc.Class.extend({
      textureOffset: null,
      textureTileSize: null,
      init: function(path, tileWidth, tileHeight, onload, offset) {
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.offset = offset;
        return this.image = new cc.Image(path, onload);
      },
      imgWidth: function() {
        return this.image.data.width;
      },
      imgHeight: function() {
        return this.image.data.height;
      }
    }));
  });

}).call(this);
(function() {
  var __hasProp = {}.hasOwnProperty;

  cc.module('cc.Game').defines(function() {
    return this.set(cc.Class.extend({
      now: 0,
      tick: 1,
      entities: [],
      entitiesById: {},
      surfaces: [],
      surfacesById: {},
      _updates: {},
      _hasUpdates: false,
      maxTick: 0.05,
      gravity: {
        x: 0,
        y: 0
      },
      scale: 1,
      box2dScale: 30,
      _thingCount: 0,
      renderer: null,
      input: null,
      viewport: null,
      useWebWorker: true,
      backgroundColor: [0.0, 0.0, 0.0, 1.0],
      ticks: 0,
      skips: 0,
      updates: 0,
      width: 0,
      height: 0,
      init: function(resources, options) {
        var _this = this;
        this.resources = resources;
        this.physicsClient = new cc.physics.Client(this.box2dScale, function(data, tick) {
          var entity, id, uent;
          _this.tick = tick;
          _this.now += tick;
          for (id in data) {
            if (!__hasProp.call(data, id)) continue;
            uent = data[id];
            entity = _this.entitiesById[id];
            if (entity) {
              entity.uncompressPhysics(uent);
            }
          }
          return _this.update();
        });
        this.setOptions(options);
        return this.input = new cc.Input;
      },
      setOptions: function(options) {
        if (!options) {
          return;
        }
        if (options.scale) {
          this.scale = options.scale;
        }
        if (options.maxTick) {
          this.maxTick = options.maxTick;
        }
        if (options.width) {
          this.width = options.width;
        }
        if (options.height) {
          return this.height = options.height;
        }
      },
      syncTimer: function(expiresIn) {
        return new cc.SyncTimer(this, expiresIn);
      },
      timer: function(expiresIn) {
        return new cc.Timer(this, expiresIn);
      },
      setScale: function(scale) {
        this.scale = scale;
        this.viewport.setScreenDimensions(this.width / this.scale, this.height / this.scale);
        this.renderer.setScale(this.scale);
      },
      main: function(canvas, options) {
        var _this = this;
        this.setOptions(options);
        if (!(canvas.getContext != null)) {
          if (!(typeof canvas === "string")) {
            throw 'canvas argument must be Canvas object or selector';
          }
          if (canvas[0] === '#') {
            canvas = document.getElementById(canvas.slice(1));
          } else {
            canvas = document.getElementById(canvas);
          }
        }
        if (canvas.getContext == null) {
          throw "could not find canvas";
        }
        return this.resources.onLoadStatusUpdate(function(cmplt) {
          var c, mainLoop;
          if (cmplt < 1) {
            return;
          }
          if (!_this.width) {
            _this.width = canvas.width;
          }
          if (!_this.height) {
            _this.height = canvas.height;
          }
          _this.viewport = new cc.Viewport(_this.width, _this.height, _this.width, _this.height);
          try {
            _this.renderer = new cc.gl.Renderer(canvas, _this.resources, _this.width, _this.height, _this.viewport);
          } catch (e) {
            alert("sorry WebGL is not enabled/supported in your browser, please try Firefox or Chrome " + e.stack);
            return;
          }
          _this.setScale(_this.scale);
          c = _this.backgroundColor;
          _this.renderer.setBackgroundColor(c[0], c[1], c[2], c[3]);
          _this.input.enable();
          if (_this.booted) {
            _this.booted();
          }
          _this.physicsClient.run();
          _this.physicsClient.sendConfig({
            maxTick: _this.maxTick,
            gravity: _this.gravity
          });
          _this.physicsClient.sendUpdates(_this._updates);
          _this._updates = {};
          (mainLoop = function() {
            cc.requestAnimationFrame(mainLoop);
            return _this.draw();
          })();
        });
      },
      spawnEntity: function(type, x, y, settings) {
        var entity;
        this._hasUpdates = true;
        entity = new type(this, x, y, settings);
        entity.id = ++this._thingCount;
        this.entities.push(entity);
        return this.entitiesById[entity.id] = this._updates[entity.id] = entity;
      },
      addSurface: function(sheet, tileIdx, x, y, width, height, bounciness) {
        var surface;
        this._hasUpdates = true;
        surface = new cc.Surface(this, sheet, tileIdx, x, y, width, height, bounciness);
        surface.id = ++this._thingCount;
        this.surfaces.push(surface);
        return this.surfacesById[surface.id] = this._updates[surface.id] = surface;
      },
      update: function() {
        ++this.updates;
        if (this._hasUpdates) {
          this.physicsClient.sendUpdates(this._updates);
          this._hasUpdates = false;
          this._updates = {};
        }
        this.input.update();
      },
      draw: function() {
        var entity, surface, _i, _j, _len, _len1, _ref, _ref1;
        if (!this.tick) {
          ++this.skips;
        } else {
          this.physicsClient.signalPaint();
          ++this.ticks;
          this.renderer.clear();
          this.renderer.drawingEntities();
          _ref = this.entities;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            entity = _ref[_i];
            entity.draw();
          }
          this.renderer.drawingSurfaces();
          _ref1 = this.surfaces;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            surface = _ref1[_j];
            surface.draw();
          }
          this.tick = 0;
        }
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.Viewport').defines(function() {
    return this.set(cc.Class.extend({
      init: function(width, height, screenWidth, screenHeight, x, y) {
        this.width = width;
        this.height = height;
        this.x = x != null ? x : 0;
        this.y = y != null ? y : 0;
        this.setScreenDimensions(screenWidth, screenHeight);
      },
      setScreenDimensions: function(screenWidth, screenHeight) {
        this.maxX = this.width - screenWidth;
        this.maxY = this.height - screenHeight;
      },
      setWidth: function(width) {
        this.maxX += width - this.width;
        this.width = width;
      },
      setHeight: function(height) {
        this.maxX += height - this.width;
        this.height = height;
      },
      checkX: function() {
        if (this.x > this.maxX) {
          this.x = this.maxX;
        } else if (this.x < 0) {
          this.x = 0;
        }
      },
      checkY: function() {
        if (this.y > this.maxY) {
          this.y = this.maxY;
        } else if (this.y < 0) {
          this.y = 0;
        }
      },
      scrollTo: function(x, y) {
        this.x = x;
        this.y = y;
        this.checkX();
        this.checkY();
      },
      scroll: function(sx, sy) {
        this.x += sx;
        this.y += sy;
        this.checkX();
        this.checkY();
      },
      scrollUp: function(s) {
        this.y -= s;
        if (this.y < 0) {
          this.y = 0;
        }
      },
      scrollRight: function(s) {
        this.x += s;
        if (this.x > this.maxX) {
          this.x = this.maxX;
        }
      },
      scrollDown: function(s) {
        this.y += s;
        if (this.y > this.maxY) {
          this.y = this.maxY;
        }
      },
      scrollLeft: function(s) {
        this.x -= s;
        if (this.x < 0) {
          this.x = 0;
        }
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.Input').defines(function() {
    var char, i, idx, key, _i, _j, _ref, _ref1;
    key = cc.key = {
      backspace: 8,
      tab: 9,
      enter: 13,
      shift: 16,
      ctrl: 17,
      alt: 18,
      pause: 19,
      "break": 19,
      space: 32,
      pageup: 33,
      pagedown: 34,
      end: 35,
      home: 36,
      left: 37,
      up: 38,
      right: 39,
      down: 40,
      insert: 45,
      "delete": 46,
      multiply: 106,
      add: 107,
      substract: 109,
      divide: 111,
      f11: 122,
      f12: 123,
      fullstop: 190,
      period: 190,
      forwardslash: 191,
      slash: 191,
      backslash: 220
    };
    ({
      fallthrough: false
    });
    for (i = _i = _ref = 'A'.charCodeAt(0), _ref1 = 'Z'.charCodeAt(0); _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1; i = _ref <= _ref1 ? ++_i : --_i) {
      char = String.fromCharCode(i);
      key[char.toLowerCase()] = i;
    }
    for (i = _j = 0; _j <= 9; i = ++_j) {
      idx = '0'.charCodeAt(0) + i;
      char = i.toString();
      key[char] = idx;
      key['n' + char] = idx;
      key['numpad' + char] = i + 96;
      key['f' + char] = i + 112;
    }
    return this.set(cc.Class.extend({
      state: {},
      pressed: {},
      released: {},
      _bindings: {},
      enable: function() {
        var _this = this;
        window.addEventListener('keydown', function(e) {
          return _this.press(e, false);
        });
        window.addEventListener('keyup', function(e) {
          return _this.release(e, false);
        });
      },
      press: function(e) {
        var bind, code;
        code = e.keyCode;
        bind = this._bindings[code];
        if (bind && !this.state[bind]) {
          this.pressed[bind] = code;
          this.state[bind] = code;
        }
        if (!this.fallthrough) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      release: function(e) {
        var bind, code;
        code = e.keyCode;
        bind = this._bindings[code];
        if (bind) {
          delete this.pressed[bind];
          delete this.state[bind];
          this.released[bind] = code;
        }
      },
      update: function() {
        this.released = {};
        return this.pressed = {};
      },
      bind: function(key, state) {
        return this._bindings[key] = state;
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.SyncTimer').defines(function() {
    return this.set(cc.Class.extend({
      init: function(_game, duration, offset) {
        this._game = _game;
        this.duration = duration != null ? duration : 0;
        this.offset = offset != null ? offset : 0;
        if (this.duration) {
          this.reset();
        } else {
          this.pause();
        }
      },
      expired: function() {
        return this._game.now >= this.expires;
      },
      delta: function() {
        return this._game.now - this.expires;
      },
      setDuration: function(duration) {
        this.duration = duration;
        this.reset();
      },
      pause: function() {
        this.expires = Number.MAX_VALUE;
      },
      reset: function() {
        this.expires = Math.floor((this._game.now / this.duration) - this.offset) * this.duration + this.duration + this.offset;
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.Timer').parent('cc.SyncTimer').jClass({
    init: function(_game, duration) {
      this._game = _game;
      this.duration = duration;
      this.reset();
    },
    reset: function() {
      this.expires = this._game.now + this.duration;
    }
  });

}).call(this);
(function() {
  var __hasProp = {}.hasOwnProperty;

  cc.module('cc.gl.Renderer').defines(function() {
    return this.set(cc.Class.extend({
      init: function(canvas, resources, width, height, viewport) {
        var path, spriteSheet, _ref;
        this.viewport = viewport;
        this._getGlContext(canvas, width, height);
        this._activatedTextureId = -1;
        this._shdr = new cc.gl.SpriteShaderProgram;
        this._shdr.attachContext(this.gl);
        this._shdr.link();
        this.texAtlas = new cc.gl.TextureAtlas;
        _ref = resources.spriteSheets;
        for (path in _ref) {
          if (!__hasProp.call(_ref, path)) continue;
          spriteSheet = _ref[path];
          this.texAtlas.addSpriteSheet(spriteSheet);
        }
        this.texAtlas.loadToTextures(this.gl);
      },
      _getGlContext: function(canvas, width, height) {
        try {
          this.gl = canvas.getContext("experimental-webgl");
          this.gl.viewportWidth = canvas.width = width;
          this.gl.viewportHeight = canvas.height = height;
        } catch (e) {
          alert("could not initialise WebGL");
        }
      },
      setSize: function(width, height) {
        this._shdr.setSize(width, height);
      },
      setScale: function(scale) {
        this._shdr.perspectiveAndScale(90, scale);
      },
      setBackgroundColor: function(r, g, b, a) {
        this._shdr.clearColor(r, g, b, a);
        return this;
      },
      selectSprite: function(sprite) {
        var newTextureId;
        newTextureId = sprite.sheet.textureId;
        if (newTextureId !== this._activatedTextureId) {
          this._shdr.activateTexture(this.texAtlas.textures[newTextureId]);
          this._activatedTextureId = newTextureId;
        }
        this._shdr.selectTile(sprite.sheet.textureTileSize, sprite.tile, sprite.sheet.textureOffset);
        return this;
      },
      tileRepeat: function(r) {
        this._shdr.tileRepeat(r);
      },
      drawingEntities: function() {
        this._shdr.modeDynamicEntity();
      },
      drawingSurfaces: function() {
        this._shdr.modeSurfaceEntity();
      },
      drawEntity: function(x, y, z, flipX) {
        this._shdr.drawAt(x - this.viewport.x, y - this.viewport.y, z);
        this._shdr.flipX(flipX);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this._shdr.spriteVertices.numItems);
        return this;
      },
      drawSurface: function(x, y, z) {
        this._shdr.drawAt(x - this.viewport.x, y - this.viewport.y, z);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this._shdr.spriteVertices.numItems);
        return this;
      },
      clear: function() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        return this;
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.gl.TextureAtlas').defines(function() {
    return this.set(cc.Class.extend({
      init: function(width, height, maxTextures) {
        this.width = width != null ? width : 2048;
        this.height = height != null ? height : 2048;
        this.maxTextures = maxTextures != null ? maxTextures : 32;
        this._canvases = [];
        this._addTexture();
        return this.textures = [];
      },
      _addTexture: function() {
        this._canvas = document.createElement('canvas');
        this._canvas.width = this.width;
        this._canvas.height = this.height;
        this._canvas.rows = [
          {
            height: this.height,
            cells: [false]
          }
        ];
        this._canvas.colWidth = [this.width];
        return this._canvases.push(this._canvas);
      },
      _nRows: function() {
        return this._canvas.rows.length;
      },
      _nCols: function() {
        return this._canvas.colWidth.length;
      },
      _splitCell: function(rowIdx, colIdx, width, height) {
        var cell, colWidth, newRow, row, _i, _j, _len, _len1, _ref, _ref1;
        row = this._canvas.rows[rowIdx];
        if (height < row.height) {
          newRow = {
            height: row.height - height,
            cells: []
          };
          _ref = row.cells;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            cell = _ref[_i];
            newRow.cells.push(cell);
          }
          this._canvas.rows.splice(rowIdx + 1, 0, newRow);
          row.height = height;
        }
        colWidth = this._canvas.colWidth[colIdx];
        if (width < colWidth) {
          this._canvas.colWidth.splice(colIdx + 1, 0, colWidth - width);
          _ref1 = this._canvas.rows;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            row = _ref1[_j];
            row.cells.splice(colIdx + 1, 0, row.cells[colIdx]);
          }
          return this._canvas.colWidth[colIdx] = width;
        }
      },
      _searchCells: function(firstRow, rowIdx, colIdx, width, height) {
        var cellIdx, i, lastColIdx, lastRowIdx, row, _i, _j, _k, _l, _m, _ref, _ref1;
        for (lastColIdx = _i = colIdx, _ref = this._canvas.colWidth.length; colIdx <= _ref ? _i < _ref : _i > _ref; lastColIdx = colIdx <= _ref ? ++_i : --_i) {
          if (firstRow.cells[lastColIdx]) {
            return;
          }
          width -= this._canvas.colWidth[lastColIdx];
          if (width <= 0) {
            break;
          }
        }
        if (width > 0) {
          return;
        }
        for (lastRowIdx = _j = rowIdx, _ref1 = this._canvas.rows.length; rowIdx <= _ref1 ? _j < _ref1 : _j > _ref1; lastRowIdx = rowIdx <= _ref1 ? ++_j : --_j) {
          row = this._canvas.rows[lastRowIdx];
          for (cellIdx = _k = colIdx; colIdx <= lastColIdx ? _k <= lastColIdx : _k >= lastColIdx; cellIdx = colIdx <= lastColIdx ? ++_k : --_k) {
            if (row.cells[cellIdx]) {
              return;
            }
          }
          height -= row.height;
          if (height <= 0) {
            break;
          }
        }
        if (height > 0) {
          return;
        }
        this._splitCell(lastRowIdx, lastColIdx, width + this._canvas.colWidth[lastColIdx], height + this._canvas.rows[lastRowIdx].height);
        for (i = _l = rowIdx; rowIdx <= lastRowIdx ? _l <= lastRowIdx : _l >= lastRowIdx; i = rowIdx <= lastRowIdx ? ++_l : --_l) {
          row = this._canvas.rows[i];
          for (cellIdx = _m = colIdx; colIdx <= lastColIdx ? _m <= lastColIdx : _m >= lastColIdx; cellIdx = colIdx <= lastColIdx ? ++_m : --_m) {
            row.cells[cellIdx] = true;
          }
        }
        return true;
      },
      _getCell: function(width, height) {
        var colIdx, colWidth, row, rowIdx, x, y, _i, _j, _ref, _ref1;
        x = y = 0;
        for (rowIdx = _i = 0, _ref = this._canvas.rows.length; 0 <= _ref ? _i < _ref : _i > _ref; rowIdx = 0 <= _ref ? ++_i : --_i) {
          row = this._canvas.rows[rowIdx];
          for (colIdx = _j = 0, _ref1 = this._nCols(); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; colIdx = 0 <= _ref1 ? ++_j : --_j) {
            colWidth = this._canvas.colWidth[colIdx];
            if (this._searchCells(row, rowIdx, colIdx, width, height)) {
              return [x, y];
            }
            x += colWidth;
          }
          y += row.height;
          x = 0;
        }
        if (this._canvases.length >= this.maxTextures) {
          throw "Too many sprite maps for available texture space";
        }
        this._addTexture();
        return this._getCell(width, height);
      },
      addSpriteSheet: function(spriteSheet) {
        var img, x, y, _ref;
        img = spriteSheet.image.data;
        _ref = this._getCell(img.width, img.height), x = _ref[0], y = _ref[1];
        this._canvas.getContext('2d').drawImage(img, x, y);
        spriteSheet.textureId = this._canvases.length - 1;
        spriteSheet.textureOffset = vec2.createFrom(x / this.width, y / this.height);
        spriteSheet.textureTileSize = vec2.createFrom(spriteSheet.tileWidth / this.width, spriteSheet.tileHeight / this.height);
      },
      loadToTextures: function(gl) {
        var canvas, glTexture, textureId, _i, _ref;
        for (textureId = _i = 0, _ref = this._canvases.length; 0 <= _ref ? _i < _ref : _i > _ref; textureId = 0 <= _ref ? ++_i : --_i) {
          canvas = this._canvases[textureId];
          delete canvas.rows;
          delete canvas.colWidth;
          glTexture = gl.createTexture();
          this.textures.push(glTexture);
          glTexture.idx = textureId;
          glTexture.id = gl['TEXTURE' + textureId];
          gl.bindTexture(gl.TEXTURE_2D, glTexture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, textureId, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.bindTexture(gl.TEXTURE_2D, null);
        }
      }
    }));
  });

}).call(this);
(function() {
  var __slice = [].slice;

  cc.module('cc.gl.ShaderProgram').defines(function() {
    return this.set(cc.Class.extend({
      init: function() {
        this.u = {};
        this.a = {};
      },
      attachContext: function(gl) {
        this.gl = gl;
        this.prgrm = this.gl.createProgram();
      },
      _attachShader: function(shader, content) {
        this.gl.shaderSource(shader, content);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
          alert(this.gl.getShaderInfoLog(shader));
        } else {
          this.gl.attachShader(this.prgrm, shader);
        }
      },
      _attribVertices: function() {
        var name, names, _i, _len;
        names = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        for (_i = 0, _len = names.length; _i < _len; _i++) {
          name = names[_i];
          this.gl.enableVertexAttribArray(this.a[name] = this.gl.getAttribLocation(this.prgrm, name));
        }
      },
      _uniforms: function() {
        var name, names, _i, _len;
        names = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        for (_i = 0, _len = names.length; _i < _len; _i++) {
          name = names[_i];
          this.u[name] = this.gl.getUniformLocation(this.prgrm, name);
        }
      },
      link: function() {
        this.gl.linkProgram(this.prgrm);
        if (!this.gl.getProgramParameter(this.prgrm, this.gl.LINK_STATUS)) {
          alert("Could not initialise shaders");
        }
        return this.gl.useProgram(this.prgrm);
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.gl.SpriteShaderProgram').parent('cc.gl.ShaderProgram').jClass({
    gl: null,
    scale: 1,
    init: function() {
      this.parent();
      this.pMatrix = mat4.create();
      this.mvMatrix = mat4.create();
    },
    activateTexture: function(texture) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
      this.gl.vertexAttribPointer(this.a.textureCoord, this.textureBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
      this.gl.activeTexture(texture.id);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.uniform1i(this.u.sampler, texture.idx);
      return this;
    },
    setSize: function(width, height) {
      this.gl.uniform2f(this.u.size, width, height);
    },
    _attachSpriteFragmentShader: function() {
      var content, shader;
      content = "precision mediump float;\n\nvarying vec2 vTextureCoord;\nuniform int mode;\n\n// for mode 1\nuniform bool flipX;\n\n// for modes 1 and 2\nuniform sampler2D sampler;\nuniform vec2 tileSize;   // tile size in percentage of texture size\nuniform vec2 tileOffset; // index of tile e.g. (1,1) = (1 down, 1 right)\nuniform vec2 tileCoord;  // offset into texture of first pixel\n\n// for mode 2\nuniform vec2 tileRepeat;\n\n// for mode 3\nuniform vec4 color;\n\n// this converts the tile coordinate system to the gl coordinate system\n// First it flips the y-axis. Then it reverses the direction it scans\n// for the current pixel. It also has to add one to the y-offset to make\n// up for it being from the top left rather than the bottom right.\nvoid main(void) {\n  vec2 _tileOffset = vec2(tileOffset.s, tileOffset.t + 1.0);\n  vec2 _texCoord   = vec2(vTextureCoord.s, -vTextureCoord.t);\n\n  if (mode == 1) {\n    if (flipX) {\n      _texCoord.s = -_texCoord.s;\n      _tileOffset.s += 1.0;\n    }\n\n    gl_FragColor = texture2D(sampler,\n      vec2(1, -1) * (\n        (_texCoord * tileSize) + (tileSize * _tileOffset) + tileCoord));\n  }\n  else if (mode == 2) {\n    _texCoord.s = mod(_texCoord.s * tileRepeat.s, 1.0);\n    _texCoord.t = -mod(-_texCoord.t * tileRepeat.t, 1.0);\n\n    gl_FragColor = texture2D(sampler,\n      vec2(1, -1) * (\n        (_texCoord * tileSize) + (tileSize * _tileOffset) + tileCoord));\n  }\n  else if (mode == 3) {\n    gl_FragColor = color;\n  }\n}";
      shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
      return this._attachShader(shader, content);
    },
    _attachSpriteVertexShader: function() {
      var content, shader;
      content = "attribute vec3 vertexPosition;\nattribute vec2 textureCoord;\n\nuniform mat4 mvMatrix;\nuniform mat4 pMatrix;\nuniform vec3 position;\n\n// size of sprite/surface\nuniform vec2 size;\n\n// to project y onto x.. multiply position by this\n// const mat3 shear = mat3(1,0,0, 0,0,1, 0,-1,0);\n\nvarying vec2 vTextureCoord;\n\nvoid main(void) {\n  gl_Position = pMatrix * mvMatrix *\n    vec4(\n      vec3(size, 1.0) * vertexPosition +\n        vec3(position.x, -position.y - size.y, position.z),\n      1.0);\n  vTextureCoord = textureCoord;\n}";
      shader = this.gl.createShader(this.gl.VERTEX_SHADER);
      return this._attachShader(shader, content);
    },
    selectTile: function(tileSize, tileOffset, sheetOffset) {
      this.gl.uniform2fv(this.u.tileSize, tileSize);
      this.gl.uniform2fv(this.u.tileOffset, tileOffset);
      this.gl.uniform2fv(this.u.tileCoord, sheetOffset);
    },
    tileRepeat: function(r) {
      this.gl.uniform2fv(this.u.tileRepeat, r);
    },
    perspectiveAndScale: function(deg, scale) {
      var zDistance;
      this.scale = scale != null ? scale : 1;
      mat4.perspective(deg, this.gl.viewportWidth / this.gl.viewportHeight, 1.0, 300.0, this.pMatrix);
      this.gl.uniformMatrix4fv(this.u.pMatrix, false, this.pMatrix);
      zDistance = -this.gl.viewportHeight / (2 * this.scale);
      mat4.identity(this.mvMatrix);
      mat4.translate(this.mvMatrix, [-this.gl.viewportWidth / (2 * this.scale), -zDistance, zDistance]);
      this.gl.uniformMatrix4fv(this.u.mvMatrix, false, this.mvMatrix);
      return this;
    },
    drawAt: function(x, y, z) {
      if (z == null) {
        z = 0;
      }
      this.gl.uniform3f(this.u.position, x, y, z);
      return this;
    },
    flipX: function(flip) {
      this.gl.uniform1i(this.u.flipX, flip);
      return this;
    },
    clearColor: function(r, g, b, a) {
      this.gl.clearColor(r, g, b, a);
    },
    _glOptions: function() {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.gl.disable(this.gl.DEPTH_TEST);
      this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
    },
    modeDynamicEntity: function() {
      this.gl.uniform1i(this.u.mode, 1);
    },
    modeSurfaceEntity: function() {
      this.gl.uniform1i(this.u.mode, 2);
    },
    modeColor: function() {
      this.gl.uniform1i(this.u.mode, 3);
    },
    setColor: function(color) {
      return this.gl.uniform4fv(this.u.color, color);
    },
    link: function() {
      var textureCoords, vertices;
      this.textureBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
      textureCoords = [1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0];
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoords), this.gl.STATIC_DRAW);
      this.textureBuffer.itemSize = 2;
      this.textureBuffer.numItems = 4;
      this.spriteVertices = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.spriteVertices);
      vertices = [1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0];
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
      this.spriteVertices.itemSize = 3;
      this.spriteVertices.numItems = 4;
      this._attachSpriteFragmentShader();
      this._attachSpriteVertexShader();
      this.parent();
      this._attribVertices("vertexPosition", "textureCoord");
      this._uniforms("tileSize", "tileOffset", "tileCoord", "tileRepeat", "sampler", "pMatrix", "mvMatrix", "position", "size", "flipX", "mode", "color");
      this._glOptions();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.spriteVertices);
      this.gl.vertexAttribPointer(this.a.vertexPosition, this.spriteVertices.itemSize, this.gl.FLOAT, false, 0, 0);
      return this;
    }
  });

}).call(this);
(function() {

  cc.module('cc.physics.Box2dEntityEvents').defines(function() {
    return this.set(cc.Class.extend({
      v: function(entity, args, idx) {
        var m, s, v;
        s = entity.world.scale;
        v = entity._body.GetLinearVelocity();
        m = entity._body.GetMass();
        entity._body.ApplyLinearImpulse(new b2Vec2(m * (args[idx] / s - v.get_x()), m * (args[idx + 1] / s - v.get_y())), entity._body.GetWorldCenter());
        return 3;
      },
      p: function(entity, args, idx) {
        var s;
        s = entity.world.scale;
        entity._body.SetTransform(new b2Vec2(args[idx] / s + entity.width / 2, args[idx + 1] / s + entity.height / 2), entity._body.GetAngle());
        return 3;
      },
      f: function(entity, args, idx) {
        entity._fix.SetFriction(args[idx]);
        return 2;
      },
      update: function(entity, events) {
        var idx;
        idx = this[events[0]](entity, events, 1);
        while (idx < events.length) {
          idx = this[events[idx]](entity, args, idx + 1);
        }
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.physics.Box2dEntity').requires('cc.physics.Box2dEntityEvents').defines(function() {
    return this.set(cc.Class.extend({
      _evHandler: new cc.physics.Box2dEntityEvents,
      maxV: {
        x: 200,
        y: 100
      },
      groundTouches: 0,
      standing: false,
      groundContact: function() {
        if (++this.groundTouches === 1) {
          this.standing = true;
        }
      },
      groundLoseContact: function() {
        if (!--this.groundTouches) {
          this.standing = false;
        }
      },
      init: function(p, world) {
        var filter, fix, footFixt, ftHeight, ftShape, height, s, shape, width;
        this.world = world;
        this.world.entities.push(this);
        s = this.world.scale;
        this.width = p[6] / s;
        this.height = p[7] / s;
        this._fixDef = new b2FixtureDef;
        filter = new b2Filter;
        filter.set_categoryBits(p[8]);
        filter.set_maskBits(p[9]);
        this._fixDef.set_filter(filter);
        this._fixDef.set_restitution(p[10]);
        this._fixDef.set_friction(p[11]);
        this._fixDef.set_density(p[12]);
        this.maxV.x = p[13];
        this.maxV.y = p[14];
        this._bodyDef = new b2BodyDef;
        this._bodyDef.set_type(Box2D.b2_dynamicBody);
        width = this.width / 2;
        height = this.height / 2;
        this._bodyDef.set_position(new b2Vec2(p[0] / s + width, p[1] / s + height));
        this._bodyDef.set_linearVelocity(new b2Vec2(p[2] / s, p[3] / s));
        this.a = {
          x: p[4] / s,
          y: p[5] / s
        };
        this._bodyDef.set_fixedRotation(true);
        shape = new b2PolygonShape;
        shape.SetAsBox(width, height);
        this._fixDef.set_shape(shape);
        this._body = this.world.b2.CreateBody(this._bodyDef);
        fix = this._body.CreateFixture(this._fixDef);
        fix.entity = this;
        this._fix = fix;
        ftHeight = 1 / (s * 3 * 2);
        this._ftSensorDef = new b2FixtureDef;
        ftShape = new b2PolygonShape;
        ftShape.SetAsBox(width - ftHeight, ftHeight, new b2Vec2(0, height), 0.0);
        this._ftSensorDef.set_shape(ftShape);
        this._ftSensorDef.set_isSensor(true);
        footFixt = this._body.CreateFixture(this._ftSensorDef);
        footFixt.entity = this;
        footFixt.foot = true;
      },
      _step: function(tick) {},
      compressedPhysics: function() {
        var p, s, v;
        s = this.world.scale;
        v = this._body.GetLinearVelocity();
        p = this._body.GetPosition();
        return [(p.get_x() - this.width / 2) * s, (p.get_y() - this.height / 2) * s, v.get_x() * s, v.get_y() * s, this.standing];
      },
      uncompressPhysics: function(p) {
        this._evHandler.update(this, p);
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.physics.Box2dSurface').defines(function() {
    return this.set(cc.Class.extend({
      init: function(p, world) {
        var filter, s, shape;
        this.world = world;
        s = this.world.scale;
        this.width = p[2] / s;
        this.height = p[3] / s;
        this._fixDef = new b2FixtureDef;
        filter = new b2Filter;
        filter.set_categoryBits(0xffffffff);
        filter.set_maskBits(0xffffffff);
        this._fixDef.set_filter(filter);
        this._fixDef.set_friction(p[4]);
        this._fixDef.set_restitution(p[5]);
        this._bodyDef = new b2BodyDef;
        this._bodyDef.set_type(Box2D.b2_staticBody);
        this._bodyDef.set_position(new b2Vec2(p[0] / s + this.width / 2, p[1] / s + this.height / 2));
        shape = new b2PolygonShape;
        shape.SetAsBox(this.width / 2, this.height / 2);
        this._fixDef.set_shape(shape);
        this._body = this.world.b2.CreateBody(this._bodyDef);
        this._body.CreateFixture(this._fixDef);
      },
      _step: function(tick) {}
    }));
  });

}).call(this);
(function() {

  cc.module('cc.physics.Box2dWorld').defines(function() {
    return this.set(cc.Class.extend({
      scale: 30.0,
      entities: [],
      init: function() {
        var _listener,
          _this = this;
        this.b2 = new b2World(new b2Vec2(0, 0));
        _listener = new b2ContactListener;
        self.console = {
          log: function(v) {
            return self.postMessage({
              log: v
            });
          }
        };
        Box2D.customizeVTable(_listener, [
          {
            original: b2ContactListener.prototype.BeginContact,
            replacement: function(ths, contact) {
              var a, b, c;
              c = Box2D.wrapPointer(contact, Box2D.b2Contact);
              a = c.GetFixtureA();
              b = c.GetFixtureB();
              if (a.foot) {
                a.entity.groundContact();
              }
              if (b.foot) {
                b.entity.groundContact();
              }
            }
          }, {
            original: b2ContactListener.prototype.EndContact,
            replacement: function(ths, contact) {
              var a, b, c;
              c = Box2D.wrapPointer(contact, Box2D.b2Contact);
              a = c.GetFixtureA();
              b = c.GetFixtureB();
              if (a.foot) {
                a.entity.groundLoseContact();
              }
              if (b.foot) {
                b.entity.groundLoseContact();
              }
            }
          }
        ]);
        this.b2.SetContactListener(_listener);
      },
      setGravity: function(g) {
        this.b2.SetGravity(new b2Vec2(g.x, g.y));
      },
      update: function(tick) {
        var data, ent, _i, _len, _ref;
        this.b2.Step(tick, 4, 8);
        this.b2.ClearForces();
        data = {};
        _ref = this.entities;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          ent = _ref[_i];
          data[ent.id] = ent.compressedPhysics();
        }
        return data;
      }
    }));
  });

}).call(this);
(function() {
  var __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

  cc.module('cc.physics.Worker').defines(function() {
    return this.set(cc.Class.extend({
      entities: {},
      surfaces: {},
      enabled: true,
      maxTick: 0.05,
      now: 0,
      _clockUpdate: 0,
      tick: 0,
      _log: function() {
        var stuff;
        stuff = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        self.postMessage({
          log: stuff.join(' ')
        });
      },
      update: function() {
        var clock, data;
        if (!this.enabled) {
          return;
        }
        clock = new Date().getTime() / 1000;
        this.tick = clock - this._clockUpdate;
        if (this.tick > this.maxTick) {
          this.tick = this.maxTick;
        }
        this.now += this.tick;
        this._clockUpdate = clock;
        data = this.world.update(this.tick);
        self.postMessage({
          update: data,
          tick: this.tick
        });
      },
      init: function() {
        var _this = this;
        this.world = new cc.physics.Box2dWorld;
        this._clockUpdate = new Date().getTime() / 1000;
        self.onmessage = function(event) {
          return _this.onMessage(event.data);
        };
      },
      _isEntity: function(data) {
        return data.length === 15;
      },
      onMessage: function(data) {
        var entity, id, surface, updated, _ref;
        if (data.p) {
          this.update();
        } else if (data.u) {
          _ref = data.u;
          for (id in _ref) {
            if (!__hasProp.call(_ref, id)) continue;
            updated = _ref[id];
            entity = this.entities[id];
            if (entity) {
              entity.uncompressPhysics(updated);
            } else if (this._isEntity(updated)) {
              this.entities[id] = entity = new cc.physics.Box2dEntity(updated, this.world);
              entity.id = id;
            } else {
              this.surfaces[id] = surface = new cc.physics.Box2dSurface(updated, this.world);
              surface.id = id;
            }
          }
        } else if (data.enabled != null) {
          this.enabled = data.enabled;
          if (this.enabled) {
            this.update();
          }
        } else if (data.config != null) {
          if (data.config.maxTick) {
            this.maxTick = data.config.maxTick;
          }
          if (data.config.gravity) {
            this.world.setGravity(data.config.gravity);
          }
        }
      }
    }));
  });

}).call(this);
(function() {
  var __hasProp = {}.hasOwnProperty;

  cc.module('cc.physics.Client').defines(function() {
    return this.set(cc.Class.extend({
      init: function(pixelScale, _onUpdate) {
        var _this = this;
        this.pixelScale = pixelScale != null ? pixelScale : 30;
        this._onUpdate = _onUpdate;
        cc.onVisibilityChange(function(state) {
          return _this.worker.postMessage({
            enabled: !state
          });
        });
      },
      sendConfig: function(opts) {
        this.worker.postMessage({
          config: opts
        });
      },
      run: function() {
        var _this = this;
        this.worker = new Worker('cc/physics.js');
        this.worker.onmessage = function(event) {
          return _this._onMessage(event.data);
        };
        this.worker.onerror = function(event) {
          return _this._onError(event);
        };
      },
      sendUpdates: function(updates) {
        var data, id, update;
        data = {};
        for (id in updates) {
          if (!__hasProp.call(updates, id)) continue;
          update = updates[id];
          data[id] = update.compressedPhysics();
        }
        this.worker.postMessage({
          u: data
        });
      },
      signalPaint: function() {
        this.worker.postMessage({
          p: 1
        });
      },
      _onMessage: function(msg) {
        if (msg.log && console.log) {
          console.log("from worker:", msg.log);
        } else if (msg.update) {
          this._onUpdate(msg.update, msg.tick);
        }
      },
      _onError: function(event) {
        if (console.log) {
          console.log("worker error:", event.message);
        }
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.gamer').requires('cc.Core', 'cc.Image', 'cc.Entity', 'cc.Surface', 'cc.Resources', 'cc.LoadingScreen', 'cc.Sprite', 'cc.SpriteSheet', 'cc.Game', 'cc.Viewport', 'cc.Input', 'cc.SyncTimer', 'cc.Timer', 'cc.gl.Renderer', 'cc.gl.TextureAtlas', 'cc.gl.SpriteShaderProgram', 'cc.physics.Box2dEntity', 'cc.physics.Box2dSurface', 'cc.physics.Box2dWorld', 'cc.physics.Worker', 'cc.physics.Client').empty();

}).call(this);
