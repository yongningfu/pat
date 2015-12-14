(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["View"] = factory();
	else
		root["View"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var compile = __webpack_require__(1)
	var config = __webpack_require__(4)
	var Event = __webpack_require__(18)

	var _ = __webpack_require__(2)

	//合并数据
	var _mergeOptions = function(options){
	  //todo  各种特殊属性的合并
	  return _.assign({},config.defaultOptions,options)
	}

	/**
	 * 构造函数
	 * @param {object} options 初始化参数
	 */
	var View = function (options) {

	  options = _mergeOptions(options)

	  //需要绑定的节点，必须
	  this.$el = _.query(options.el)
	  this.$data = options.data
	  this.template = options.template
	  //保存根view,没有的话就是自己
	  this.$rootView = options.rootView ? options.rootView : this
	  //是否需要编译当前根节点（就是当前$el），默认为true。
	  this.__rootCompile = options.rootCompile === false ? false : true
	  //是否替换整个dom,默认为true
	  this.__replace = options.replace
	  //所有观察对象
	  this.__watchers = {}
	  //所有过滤器
	  this.__filters = options.filters || []
	  //初始化
	  this._init()
	}

	//增加事件机制
	//_.extend(View,Event)

	//初始化
	View.prototype._init = function() {

	  if (this.template) {
	    //如果有模板，需要先放到页面上去（这里后面也可以放到documentFragmment 或者  virtual dom）
	    this.$el.innerHTML = this.template
	  }

	  this.$compile(this.$el)


	}


	View.prototype.$compile = function(el) {
	  compile.parse(el,this)
	}



	//开始脏检测，在digest上面再封装一层，可以检测如果当前已有进行中的就延迟执行
	// View.prototype.$apply = function(fn) {
	//   // if (this._isDigesting) {
	//   //   //延迟
	//   // }else{
	//   // }
	//   fn.call(this)
	//   _.each(this.__watchers,function(watcher){
	//     watcher.check()
	//   })
	// }

	//开始脏检测
	View.prototype.$digest = function() {

	  if (View._isDigesting) {
	    setTimeout(_.bind(arguments.callee,this),0)
	    return
	  }

	  View._isDigesting = true

	  _.each(this.__watchers,function(watcher){
	    watcher.check()
	  })

	  View._isDigesting = false

	}

	//摧毁
	View.prototype.$destroy = function() {
	  _.each(this.__watchers,function(watcher){
	    //通知watch销毁，watch会负责销毁对应的directive
	    watcher.destroy()
	  })
	  //直接清空节点，这样是不是不好，考虑过恢复现场，但是貌似细节太多，处理不过来，先直接清空吧
	  if (this.__replace) {
	    this.$el.innerHTML = ''
	  }

	  this.$el = null
	  this.$data = null
	  this.$rootView = null
	  this.__rootCompile = null
	  this.__replace = null
	  this.__watchers = null
	  this.__filters = null
	}


	/**
	 * 用来设置基本配置
	 * @return {[type]} [description]
	 */
	View.config = function(options){
	  _.assign(config,options)
	}

	View._isDigesting = false


	module.exports = View

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(2)
	var Directive = __webpack_require__(8)
	var Watcher = __webpack_require__(17)
	var parser = __webpack_require__(9)
	var parseDirective = parser.parseDirective
	var parseText = parser.parseText
	var parseExpression = parser.parseExpression
	var config = __webpack_require__(4)

	/**
	 * 绑定directive
	 * @param  {[type]} describe 描述信息
	 * @return {[type]}          [description]
	 *
	 *
	 * eg.
	 *
	 *{
	 *  view:xx,
	 *  expression:xx,
	 *  directive:xx,
	 *  el:xx,
	 *  html:xx,
	 *  oneTime:xx
	 *}
	 *
	 */
	function _bindDir(describe) {
	  var dirInstance, watcher, view

	  view = describe.view
	  dirInstance = Directive.create(describe)


	  //先去watch池子里找,value可以作为key
	  watcher = view.__watchers[describe.value]

	  if (watcher) {
	    //使用老的，如果不是一次性的，就不需要加入对应的指令池
	    if (!describe.oneTime) {
	      watcher.__directives.push(dirInstance)
	    }

	  }else{
	    //新建一个watch
	    watcher = new Watcher(view.$data, describe.expression)
	    watcher.__view = view
	    //看是不是一次性的，新的watch需要加入view的watch池子
	    if (!describe.oneTime) {
	      watcher.__directives.push(dirInstance)
	      view.__watchers[describe.value] = watcher
	    }
	  }

	  dirInstance.__watcher = watcher
	  //执行绑定
	  dirInstance.bind(describe.args)
	  //首次自动调用update
	  dirInstance.update(watcher.getValue())

	  return dirInstance
	}

	//解析属性，解析出directive，这个只针对element
	function _compileDirective(el, view) {
	  var attrs, describe, skipChildren, childNodes

	  //以下几种情况下，不需要编译当前节点
	  //1. 不是element节点
	  //2. 如果el已经被编译过了，就不需要重复编译了
	  //3. view标识 不需要编译自己的root element的情况
	  if ((_.isElement(el) && el.nodeType === 1) && !el.hasCompiled && (view.__rootCompile || el != view.$el)) {

	    el.hasCompiled = true

	    attrs = _.toArray(el.attributes)
	    _.each(attrs, function(attr) {

	      //不是directive就返回
	      if (!Directive.isDirective(attr)) return

	      describe = parseDirective(attr)
	      describe.view = view
	      describe.el = el


	      //如果不是debug模式，可以把属性删除了.插值的不用管，只需要去掉指令定义
	      if (!config.debug && !describe.isInterpolationRegx && el && el.removeAttribute) {
	        el.removeAttribute(describe.name)
	      }

	      dirInstance = _bindDir(describe)


	      //对于有block的directive,需要跳过子节点的解析
	      if (dirInstance.block) {
	        skipChildren = true
	      }
	      //todo 两个以上的block类型directive需要报错
	    })
	  }

	  //有block的情况需要跳过子节点的编译，比如if,for,bind
	  if (!skipChildren && el.hasChildNodes()) {
	    childNodes = _.toArray(el.childNodes)
	    _.each(childNodes, function(child) {
	      exports.parse(child, view)
	    })
	  }
	}


	//解析text情况会很复杂，会支持多个插值，并且多个插值里面都有expression
	function _compileTextNode(el, view) {
	  var tokens, token, text, expObj, placeholder

	  tokens = parseText(el.data)

	  if (!(tokens.length === 1 && tokens[0].type === parser.TextTemplateParserTypes.text)) {

	    placeholder = _.createAnchor('text-place-holder')
	    _.replace(el, placeholder)

	    for (_i = 0, _len = tokens.length; _i < _len; _i++) {
	      token = tokens[_i];
	      text = document.createTextNode(token.value)

	      _.before(text, placeholder)
	      //是插值需要特殊处理，绑定directive
	      if (token.type === parser.TextTemplateParserTypes.binding) {
	        _bindDir({
	          name:'',
	          value:token.value,
	          view: view,
	          expression: parseExpression(token.value),
	          oneTime: token.oneTime,
	          html:token.html,
	          directive: 'textTemplate',
	          el: text
	        })
	      }
	    }
	  }

	}


	exports.parse = function(el, view) {

	  if (!_.isElement(el)) return

	  //对于文本节点采用比较特殊的处理
	  if (el.nodeType == 3) {
	    _compileTextNode(el, view)
	    return
	  }
	  //编译普通节点
	  _compileDirective(el, view)

	}

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 工具类
	 */


	var _ = {}
	var dom = __webpack_require__(3)
	var lang = __webpack_require__(5)
	var log = __webpack_require__(6)

	var assign = lang.assign
	//mix in
	assign(_,lang)
	assign(_,dom)
	assign(_,log)
	_.Class = __webpack_require__(7)


	module.exports = _





/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	

	var config = __webpack_require__(4)
	var _ = __webpack_require__(5)

	exports.query = function (id) {

	  if (_.isElement(id)) {
	    return id
	  }

	  if (_.isString(id)) {
	    return document.getElementById(id.replace(/^#/,''))
	  }

	}


	/**
	 * Create an "anchor" for performing dom insertion/removals.
	 * This is used in a number of scenarios:
	 * - fragment instance
	 * - v-html
	 * - v-if
	 * - v-for
	 * - component
	 *
	 * @param {String} content
	 * @param {Boolean} persist - IE trashes empty textNodes on
	 *                            cloneNode(true), so in certain
	 *                            cases the anchor needs to be
	 *                            non-empty to be persisted in
	 *                            templates.
	 * @return {Comment|Text}
	 */

	exports.createAnchor = function (content, persist) {
	  var anchor = config.debug
	    ? document.createComment(content)
	    : document.createTextNode(persist ? ' ' : '')
	  //anchor.__vue_anchor = true
	  return anchor
	}



	/**
	 * Insert el before target
	 *
	 * @param {Element} el
	 * @param {Element} target
	 */

	exports.before = function (el, target) {
	  target.parentNode.insertBefore(el, target)
	}

	/**
	 * Insert el after target
	 *
	 * @param {Element} el
	 * @param {Element} target
	 */

	exports.after = function (el, target) {
	  if (target.nextSibling) {
	    exports.before(el, target.nextSibling)
	  } else {
	    target.parentNode.appendChild(el)
	  }
	}

	/**
	 * Remove el from DOM
	 *
	 * @param {Element} el
	 */

	exports.remove = function (el) {
	  el.parentNode.removeChild(el)
	}

	/**
	 * Prepend el to target
	 *
	 * @param {Element} el
	 * @param {Element} target
	 */

	exports.prepend = function (el, target) {
	  if (target.firstChild) {
	    exports.before(el, target.firstChild)
	  } else {
	    target.appendChild(el)
	  }
	}

	/**
	 * Replace target with el
	 *
	 * @param {Element} target
	 * @param {Element} el
	 */

	exports.replace = function (target, el) {
	  var parent = target.parentNode
	  if (parent) {
	    parent.replaceChild(el, target)
	  }
	}

	/**
	 * Get and remove an attribute from a node.
	 *
	 * @param {Node} node
	 * @param {String} attr
	 */

	exports.attr = function (node, attr) {
	  var val = node.getAttribute(attr)
	  if (val !== null) {
	    node.removeAttribute(attr)
	  }
	  return val
	}



	/**
	 * Get and remove an attribute from a node.
	 *
	 * @param {Node} node
	 * @param {String} attr
	 */

	exports.clone = function (node) {
	  return node.cloneNode(true)
	}

/***/ },
/* 4 */
/***/ function(module, exports) {

	



	exports.defaultOptions = {
	  el:'',
	  template:'',
	  //是否整个替换掉el节点，默认为true
	  replace:true,
	}


	exports.defaultLog = function(msg) {
	  console.log(msg)
	}


	exports.prefix = 'sk'
	exports.delimiters = ['{{','}}']
	exports.unsafeDelimiters = ['{{{','}}}']

	exports.debug = false

/***/ },
/* 5 */
/***/ function(module, exports) {

	
	function _mix(s, p) {
	  for (var key in p) {
	    if (p.hasOwnProperty(key)) {
	      s[key] = p[key]
	    }
	  }
	}
	/**
	 * Simple bind, faster than native
	 *
	 * @param {Function} fn
	 * @param {Object} ctx
	 * @return {Function}
	 */

	exports.bind = function (fn, ctx) {
	  return function (a) {
	    var l = arguments.length
	    return l
	      ? l > 1
	        ? fn.apply(ctx, arguments)
	        : fn.call(ctx, a)
	      : fn.call(ctx)
	  }
	}

	exports.htmlspecialchars = function(str) {

	  if (!exports.isString(str)) return str

	  str = str.replace(/&/g, '&amp;')
	  str = str.replace(/</g, '&lt;')
	  str = str.replace(/>/g, '&gt;')
	  str = str.replace(/"/g, '&quot;')
	  str = str.replace(/'/g, '&#039;')
	  return str
	}

	exports.trim=function(str){
	  return str.replace(/(^\s*)|(\s*$)/g, '')
	}

	exports.toArray = function(arg) {
	  return Array.prototype.slice.call(arg) || []
	}

	exports.isArray = function(unknow) {
	  return Object.prototype.toString.call(unknow) === '[object Array]'
	}

	exports.isObject = function( unknow ) {
	  return typeof unknow === "function" || ( typeof unknow === "object" && unknow != null )
	}

	exports.isElement = function(unknow){
	  return unknow && typeof unknow === 'object' && unknow.nodeType && typeof unknow.nodeName === 'string'
	}

	exports.isString = function(unknow){
	  return (Object.prototype.toString.call(unknow) === '[object String]')
	}

	exports.each = function(enumerable, iterator) {

	  if (exports.isArray(enumerable)) {
	    for (var i = 0, len = enumerable.length; i < len; i++) {
	      iterator(enumerable[i], i)
	    }
	  } else if (exports.isObject(enumerable)) {
	    for (var key in enumerable) {
	      iterator(enumerable[key], key)
	    }
	  }

	}


	/**
	 * Mix properties into target object.
	 *
	 * @param {Object} target
	 * @param {Object} from
	 */
	exports.assign = function() {

	  if (arguments.length < 2) return

	  var args = exports.toArray(arguments)
	  var target = args.shift()

	  var source
	  while (source = args.shift()) {
	    _mix(target, source)
	  }

	  return target
	}


	exports.hasKey = function(object,key){
	  for (var _key in object) {
	    if (object.hasOwnProperty(_key) && _key == key) return true
	  }

	  return false
	}



	//辅组函数，获取数组里某个元素的索引 index
	exports.indexOf = function(array,key){
	  if (array === null) return -1
	  var i = 0, length = array.length
	  for (; i < length; i++) if (array[i] === item) return i
	  return -1
	}

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	
	var config = __webpack_require__(4)
	var hasConsole = typeof console !== 'undefined'

	if (true) {

	  //daily环境 debug模式下才会打出日志，包括各种信息。如脏检测时间
	  exports.log = function(msg) {
	    if (hasConsole && config.debug) {
	      console.log('[info]: ' + msg)
	    }
	  }

	  //daily环境下会报出错误
	  exports.warn = function(msg,e) {
	    if (hasConsole && console.error) {
	      console.error('[error]: ' + msg)
	      console.error((e || new Error('Warning Stack Trace')).stack)
	    }
	  }

	}else{
	  exports.log = exports.warn = function(){}
	}

/***/ },
/* 7 */
/***/ function(module, exports) {

	var Class = (function() {

	  function _mix(s, p) {
	    for (var key in p) {
	      if (p.hasOwnProperty(key)) {
	        s[key] = p[key]
	      }
	    }
	  }

	  var _extend = function() {
	    //开关 用来使生成原型时,不调用真正的构成流程init
	    this.initPrototype = true
	    var prototype = new this()
	    this.initPrototype = false

	    var items = Array.prototype.slice.call(arguments) || []
	    var item

	    //支持混入多个属性，并且支持{}也支持 Function
	    while (item = items.shift()) {
	      _mix(prototype, item.prototype || item)
	    }
	    var SubClass = function() {
	      if (!SubClass.initPrototype && this.init) {
	        this.init.apply(this, arguments) //调用init真正的构造函数
	      }
	    }

	    // 赋值原型链，完成继承
	    SubClass.prototype = prototype

	    // 改变constructor引用
	    SubClass.prototype.constructor = SubClass

	    // 为子类也添加extend方法
	    SubClass.extend = _extend

	    return SubClass
	  }
	    //超级父类
	  var Class = function() {}
	    //为超级父类添加extend方法
	  Class.extend = _extend

	  return Class
	})()



	module.exports = Class

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	

	var _ = __webpack_require__(2)
	var Class = _.Class
	var parser = __webpack_require__(9)

	DIR_REGX = parser.DIR_REGX
	INTERPOLATION_REGX = parser.INTERPOLATION_REGX

	//基础指令定义
	var directives = {
	  'bind':__webpack_require__(11),
	  'model':__webpack_require__(12),
	  'if':__webpack_require__(13),
	  'unless':__webpack_require__(14),
	  'for':__webpack_require__(15),
	  'textTemplate':__webpack_require__(16)
	}


	uid = 0

	var Directive = Class.extend({
	  init:function(describe){
	    this.__watcher = null
	    this.describe = describe
	    this.el = describe.el
	    this.view = describe.view
	    this.uid = uid++
	  },
	  //是否需要更新
	  shoudUpdate:function(last,current){
	    return (!last || (last && last != current))
	  },
	  destroy:function() {

	    this.unbind()

	    this.__watcher = null
	    this.describe = null
	    this.el = null
	    this.view = null
	    this.uid = null

	  }
	})


	var publicDirectives = {}
	_.each(directives,function(directive,key){
	  //继承出新的directive对象
	  publicDirectives[key] = Directive.extend(directives[key])
	})


	module.exports = {
	  publics:publicDirectives,
	  create:function(describe){
	    var dirFn = publicDirectives[describe.directive]
	    return new dirFn(describe)
	  },
	  isDirective:function(attr){

	    var name,value,match

	    name = attr.name
	    value = attr.value

	    if (INTERPOLATION_REGX.test(value)) return true

	    match = name.match(DIR_REGX)
	    if (match && match[1] && _.hasKey(directives,match[1].split(':')[0])) return true

	    return false
	  },
	  //新建一个directive定义
	  directive:function(key,options) {
	    this.publicDirectives[key] = Directive.extend(options)
	  }
	}

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var config = __webpack_require__(4)
	var _ = __webpack_require__(2)
	var expParser = __webpack_require__(10)

	var prefix = config.prefix

	var delimiters = config.delimiters

	var regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g

	function escapeRegex(str) {
	  return str.replace(regexEscapeRE, '\\$&')
	}

	var dirRegx = new RegExp('^' + prefix + '-([^=]+)')
	var argRegx = /:(.*)$/

	var expressionRegx = /([^|]+)\|?([\sA-Za-z$_]*)/


	var open = escapeRegex(config.delimiters[0])
	var close = escapeRegex(config.delimiters[1])
	var unsafeOpen = escapeRegex(config.unsafeDelimiters[0])
	var unsafeClose = escapeRegex(config.unsafeDelimiters[1])

	var tagRE = new RegExp(
	  unsafeOpen + '(.+?)' + unsafeClose + '|' +
	  open + '(.+?)' + close,
	  'g'
	)

	var htmlRE = new RegExp(
	  '^' + unsafeOpen + '.*' + unsafeClose + '$'
	)

	var interpolationRegx = new RegExp(
	  unsafeOpen + '(.+?)' + unsafeClose + '|' +
	  open + '(.+?)' + close
	)


	//解析指令
	/**
	 * 解析指令，这里分两种情况
	 * 1. 普通属性上的插值指令  id="J_{{name}}"
	 * 2. 指令属性   sk-for="xxx"
	 *
	 * @param  {Attr} attr 属性对象
	 * @return 指令描述
	 *
	 * @example
	 *
	 * sk-bind='test.text'
	 *
	 * {
	 *   expression:'@test.text',
	 *   directive:'bind',
	 *   name:'sk-bind',
	 *   value:'test.text',
	 *   args:[]
	 *
	 * }
	 */
	exports.parseDirective = function(attr) {
	  var name = attr.name
	  var value = attr.value
	  var match, args, tokens, oneTime, html,directive,obj


	  oneTime = html = false
	  //value里面有插值的情况下，就认为是插值属性节点，普通指令不支持插值写法
	  if (interpolationRegx.test(value)) {

	    tokens = exports.parseText(value)
	    //只要有一个是不转义的，所有的都不转义
	    //只要有一个不是onetime，就整体都是要监听变更
	    //是否用按位取 逻辑快点？ todo
	    for (var i = 0; i < tokens.length; i++) {
	      if (tokens[i].html) {
	        html = true
	        break
	      }
	    }

	    for (var i = 0; i < tokens.length; i++) {
	      if (!tokens[i].oneTime) {
	        oneTime = false
	        break
	      }else{
	        oneTime = true
	      }
	    }

	    return {
	      name: name,
	      value: value,
	      directive: 'bind',
	      args: [name],
	      oneTime:oneTime,
	      html:html,
	      expression: exports.token2expression(tokens),
	      isInterpolationRegx:true //标识一下是插值
	    }
	    //todo 判断如果这个时候还能找到指令需要报错
	  }

	  //普通指令解析
	  //普通指令全部转义
	  //普通指令全部不是onetime
	  directive = name.match(dirRegx)[1]

	  if (argRegx.test(directive)) {
	    obj = directive.split(':')
	    directive = obj[0]
	    args = obj[1] ? obj[1].split('|') : []
	  }

	  return {
	    name: name,
	    value: value,
	    directive: directive,
	    args: args || [],
	    oneTime:false,
	    html:false,
	    expression: exports.parseExpression(value)
	  }
	}

	/**
	 * 解析表达式,不需要支持太复杂的表达式
	 * @param  {[type]} attr [description]
	 * @return {string}
	 *
	 * @example
	 *
	 *   hello + 1 + "hello" | test
	 *
	 * @return
	 *
	 *   _that.applyFilter('_scope.hello + 1 + "hello"',test),
	 *
	 */
	exports.parseExpression = function(text) {

	  //要不要放开expression?? 还需要思考，可能带来比较多的问题
	  //只支持很简单的逻辑符，加减等，不支持＝，--，++，

	  // if (/(--)|(++)|(=[^=]?)/.test(text)) {
	  //   //todo 给出错误提示
	  // }

	  var match = text.match(expressionRegx)
	  var expression = _.trim(match[1])
	  var filterName = _.trim(match[2])
	  var body
	  body = expParser.compileExpFns(expression)

	  if (filterName) {
	    body = '_that.applyFilter(' + body + ',"' + filterName + '")'
	  }

	  return body
	}


	TextTemplateParserTypes = {
	  text: 0,
	  binding: 1
	}


	/**
	 * 用来解析一段文本，找出普通文本和 插值
	 * @param  {text} text 一段文本
	 * @return {array}    返回一个数组
	 */
	exports.parseText = function(text) {

	  text = text.replace(/\n/g, '')

	  //匹配不到插值说明是普通的，直接返回
	  if (!tagRE.test(text)) {
	    return [{
	      type: TextTemplateParserTypes.text,
	      value: text
	    }]
	  }

	  var tokens = []
	  var lastIndex = tagRE.lastIndex = 0
	  var match, index, html, value, first, oneTime
	  while (match = tagRE.exec(text)) {
	    index = match.index
	      // push text token
	    if (index > lastIndex) {
	      tokens.push({
	        type: TextTemplateParserTypes.text,
	        value: text.slice(lastIndex, index)
	      })
	    }
	    // tag token
	    html = htmlRE.test(match[0])
	    value = html ? match[1] : match[2]
	    first = value.charCodeAt(0)
	    oneTime = first === 42 // *
	    value = oneTime ? value.slice(1) : value
	    tokens.push({
	      type: TextTemplateParserTypes.binding,
	      value: _.trim(value),
	      html: html,
	      oneTime: oneTime
	    })
	    lastIndex = index + match[0].length
	  }
	  if (lastIndex < text.length) {
	    tokens.push({
	      type: TextTemplateParserTypes.text,
	      value: text.slice(lastIndex)
	    })
	  }

	  return tokens;
	}

	/**
	 * 用来将上面生成的token合成一个expression
	 * @return {[type]} [description]
	 */
	exports.token2expression = function(tokens) {
	  var mergedExpression = ''

	  _.each(tokens, function(token) {
	    mergedExpression += exports.parseExpression(token.value)
	  })

	  return mergedExpression
	}

	exports.INTERPOLATION_REGX = interpolationRegx
	exports.DIR_REGX = dirRegx
	exports.TextTemplateParserTypes = TextTemplateParserTypes

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(2)

	var allowedKeywords =
	  'Math,Date,this,true,false,null,undefined,Infinity,NaN,' +
	  'isNaN,isFinite,decodeURI,decodeURIComponent,encodeURI,' +
	  'encodeURIComponent,parseInt,parseFloat'
	var allowedKeywordsRE =
	  new RegExp('^(' + allowedKeywords.replace(/,/g, '\\b|') + '\\b)')

	// keywords that don't make sense inside expressions
	var improperKeywords =
	  'break,case,class,catch,const,continue,debugger,default,' +
	  'delete,do,else,export,extends,finally,for,function,if,' +
	  'import,in,instanceof,let,return,super,switch,throw,try,' +
	  'var,while,with,yield,enum,await,implements,package,' +
	  'proctected,static,interface,private,public'
	var improperKeywordsRE =
	  new RegExp('^(' + improperKeywords.replace(/,/g, '\\b|') + '\\b)')

	var wsRE = /\s/g
	var newlineRE = /\n/g
	var saveRE = /[\{,]\s*[\w\$_]+\s*:|('[^']*'|"[^"]*")|new |typeof |void /g
	var restoreRE = /"(\d+)"/g
	var pathTestRE = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\]|\[\d+\]|\[[A-Za-z_$][\w$]*\])*$/
	var pathReplaceRE = /[^\w$\.]([A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\])*)/g
	var booleanLiteralRE = /^(true|false)$/

	/**
	 * Save / Rewrite / Restore
	 *
	 * When rewriting paths found in an expression, it is
	 * possible for the same letter sequences to be found in
	 * strings and Object literal property keys. Therefore we
	 * remove and store these parts in a temporary array, and
	 * restore them after the path rewrite.
	 */

	var saved = []

	/**
	 * Save replacer
	 *
	 * The save regex can match two possible cases:
	 * 1. An opening object literal
	 * 2. A string
	 * If matched as a plain string, we need to escape its
	 * newlines, since the string needs to be preserved when
	 * generating the function body.
	 *
	 * @param {String} str
	 * @param {String} isString - str if matched as a string
	 * @return {String} - placeholder with index
	 */

	function save (str, isString) {
	  var i = saved.length
	  saved[i] = isString
	    ? str.replace(newlineRE, '\\n')
	    : str
	  return '"' + i + '"'
	}

	/**
	 * Path rewrite replacer
	 *
	 * @param {String} raw
	 * @return {String}
	 */

	function rewrite (raw) {
	  var c = raw.charAt(0)
	  var path = raw.slice(1)
	  if (allowedKeywordsRE.test(path)) {
	    return raw
	  } else {
	    path = path.indexOf('"') > -1
	      ? path.replace(restoreRE, restore)
	      : path
	    return c + '_scope.' + path
	  }
	}

	/**
	 * Restore replacer
	 *
	 * @param {String} str
	 * @param {String} i - matched save index
	 * @return {String}
	 */

	function restore (str, i) {
	  return saved[i]
	}

	/**
	 * Rewrite an expression, prefixing all path accessors with
	 * `scope.` and generate getter/setter functions.
	 *
	 * @param {String} exp
	 * @param {Boolean} needSet
	 * @return {Function}
	 */

	exports.compileExpFns =function(exp, needSet) {
	  if (improperKeywordsRE.test(exp)) {
	    // process.env.NODE_ENV !== 'production' && _.warn(
	    //   'Avoid using reserved keywords in expression: ' + exp
	    // )
	  }
	  // reset state
	  saved.length = 0
	  // save strings and object literal keys
	  var body = exp
	    .replace(saveRE, save)
	    .replace(wsRE, '')
	  // rewrite all paths
	  // pad 1 space here becaue the regex matches 1 extra char
	  body = (' ' + body)
	    .replace(pathReplaceRE, rewrite)
	    .replace(restoreRE, restore)

	  return body
	}


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * bind用来处理属性，不用来处理textnode
	 * 支持参数
	 */

	var _ = __webpack_require__(2)

	module.exports = {
	  priority: 3000,
	  bind:function(args) {

	  },
	  update:function(value){
	    var args,name,skipHtmlEscape
	    args = this.describe.args || []
	    name = args[0]

	    if (!name) {
	      //todo 报错 找不到需要修改的属性
	    }

	    //默认情况下都是转义的，但是可以使用{{{}}}跳过
	    skipHtmlEscape = this.describe.html
	    value = skipHtmlEscape ? value : _.htmlspecialchars(value)

	    this.el.setAttribute(name,value)

	  },
	  unbind:function(){
	    var args,id
	    args = this.describe.args || []
	    id = args[0]
	    //如果是插值
	    // if (this.describe.isInterpolationRegx) {
	    //   //设置为原始值
	    //   this.el && this.el.setAttribute(id,describe.value)
	    // }else{//否则是bind指令,需要把指令写回去
	    // }

	  }
	}

/***/ },
/* 12 */
/***/ function(module, exports) {

	Util = {
	  bindEvent: (function() {
	    if ('addEventListener' in window) {
	      return function(el, event, handler) {
	        return el.addEventListener(event, handler, false);
	      };
	    }
	    return function(el, event, handler) {
	      return el.attachEvent('on' + event, handler);
	    };
	  })(),
	  unbindEvent: (function() {
	    if ('removeEventListener' in window) {
	      return function(el, event, handler) {
	        return el.removeEventListener(event, handler, false);
	      };
	    }
	    return function(el, event, handler) {
	      return el.detachEvent('on' + event, handler);
	    };
	  })(),
	  getInputValue: function(el) {
	    var o, _i, _len, _results;
	    if (el.type === 'checkbox') {
	      return el.checked;
	    } else if (el.type === 'select-multiple') {
	      _results = [];
	      for (_i = 0, _len = el.length; _i < _len; _i++) {
	        o = el[_i];
	        if (o.selected) {
	          _results.push(o.value);
	        }
	      }
	      return _results;
	    } else {
	      return el.value;
	    }
	  }
	};


	module.exports = {
	  priority: 3000,
	  bind:function(options) {
	    //添加事件监听
	    var self = this
	    Util.bindEvent(self.el, 'blur', function() {
	      var val = Util.getInputValue(self.el)
	      var key = self.describe.value

	      self.setValue(key, val)
	      self.view.$digest()
	    })
	  },
	  setValue: function(key, val) {
	    return new Function('$scope', 'return $scope.' + key + '="' + val + '"')(this.view.$data)
	  },
	  update: function(value) {
	    this.el.value = value
	  },
	  unbind: function() {
	    Util.unbindEvent(this.el, 'blur')

	  }
	}

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	
	var _ = __webpack_require__(2)



	/**
	 * if 指令，这是一个block会产生自己的scope,自己的view
	 * @type {Object}
	 */
	module.exports = {
	  block:true,
	  priority: 3000,
	  shoudUpdate:function(last,current){
	    //if 任何时候都是需要更新的，哪怕两次的值一样，也是需要更新的，因为你要考虑子view的更新
	    return true
	  },
	  bind:function(options) {
	    this.bound = false
	    this.placeholder = _.createAnchor('if-statement')
	    //_.before(this.placeholder,this.el)
	    _.replace(this.el,this.placeholder)
	  },
	  update:function(value){
	    //if 不能使用watch的简单的对比值，而是看结果是true还是false
	    //为true并且 上一次是是销毁不是绑定
	    if (!!value && this.bound == false) {
	      //生成新的view

	      this.childView = new this.view.constructor({
	        el:this.el,
	        data:this.view.$data,
	        rootCompile:false,
	        rootView:this.view.$rootView
	      })

	      _.before(this.el,this.placeholder)
	      this.bound = true
	    }

	    if (!value && this.bound == true){
	      _.remove(this.el)
	      //this.childView && this.childView.$destroy();
	      this.bound = false
	    }
	    //子view开始脏检测
	    this.childView && this.childView.$digest()
	  },
	  unbind:function(){
	    this.childView && this.childView.$destroy()
	    //如果不在dom上了，需要恢复原样
	    //!this.bound && _.before(this.el,this.placeholder)
	    //_.remove(this.placeholder)
	  }
	}

/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	
	var _ = __webpack_require__(2)

	var _if = __webpack_require__(13)

	/**
	 * unless 指令
	 * @type {Object}
	 */
	module.exports = _.assign({},_if,{
	  update:function(value){
	    return _if.update.call(this,!value)
	  }
	})

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	

	var _ = __webpack_require__(2)
	var parser = __webpack_require__(9)
	var parseExpression = parser.parseExpression

	//差异更新的几种类型
	var UPATE_TYPES = {
	  MOVE_EXISTING: 1,
	  REMOVE_NODE: 2,
	  INSERT_MARKUP: 3
	}



	module.exports = {
	  block: true,
	  priority: 3000,
	  shoudUpdate: function(last, current) {
	    //for 任何时候都是需要更新的，哪怕两次的值一样，也是需要更新的，因为你要考虑子view的更新
	    return true
	  },
	  bind: function(options) {
	    // support "item in items" syntax
	    // for 语句比较特殊，不使用系统生成的expression
	    var inMatch = this.describe.value.match(/(.*) in (.*)/)
	    if (inMatch) {
	      var itMatch = inMatch[1].match(/\((.*),(.*)\)/)
	      if (itMatch) {
	        this.iterator = itMatch[1].trim()
	        this.alias = itMatch[2].trim()
	      } else {
	        this.alias = inMatch[1].trim()
	      }
	      //修改观察者对应的expression
	      this.__watcher.expression = parseExpression(inMatch[2])
	    }

	    if (!this.alias) {
	      // process.env.NODE_ENV !== 'production' && _.warn(
	      //   'Alias is required in v-for.'
	      // )
	      // return
	    }

	    this.start = _.createAnchor('v-for-start')
	    this.end = _.createAnchor('v-for-end')
	    _.replace(this.el, this.end)
	    _.before(this.start, this.end)

	    this.oldViewMap = {}

	  },
	  _generateNewChildren: function(lists) {

	    var newViewMap = {}
	    var oldViewMap = this.oldViewMap
	    var self = this
	    var data

	    _.each(lists, function(item, index) {

	      if (oldViewMap[index] && oldViewMap[index].$data[self.alias] === item) {
	        newViewMap[index] = oldViewMap[index]
	        //发现可以复用，就直接更新view就行
	        //当然要注意重新赋值,因为如果上一级数据变化了，这里才能知道改变
	        _.assign(oldViewMap[index].$data,self.view.$data)
	        oldViewMap[index].$digest()
	      } else {
	        //否则需要新建新的view
	        data = {}
	        data[self.alias] = item
	        _.assign(data,self.view.$data)

	        if(self.iterator) data[self.iterator] = index

	        newViewMap[index] = new self.view.constructor({
	          el: _.clone(self.el),
	          data: data,
	          rootCompile:false,
	          rootView:self.view.$rootView
	        })
	      }

	    })

	    return newViewMap

	  },
	  _diff: function() {

	    var nextIndex = 0 //代表到达的新的节点的index
	    var lastIndex = 0;//代表访问的最后一次的老的集合的位置
	    var prevChild, nextChild
	    var oldViewMap = this.oldViewMap
	    var newViewMap = this.newViewMap

	    var diffQueue = this.diffQueue = []

	    for (name in newViewMap) {

	      if (!newViewMap.hasOwnProperty(name)) {
	        continue
	      }

	      prevChild = oldViewMap && oldViewMap[name];
	      nextChild = newViewMap[name];

	      //相同的话，说明是使用的同一个view,所以我们需要做移动的操作
	      if (prevChild === nextChild) {
	        //添加差异对象，类型：MOVE_EXISTING
	        prevChild._mountIndex < lastIndex && diffQueue.push({
	          name:name,
	          type: UPATE_TYPES.MOVE_EXISTING,
	          fromIndex: prevChild._mountIndex,
	          toIndex: nextIndex
	        })
	      } else {//如果不相同，说明是新增加的节点
	        //但是如果老的还存在，我们需要把它删除。
	        //这种情况好像没有
	        if (prevChild) {

	          lastIndex = Math.max(prevChild._mountIndex, lastIndex)
	          //添加差异对象，类型：REMOVE_NODE
	          diffQueue.push({
	            name:name,
	            type: UPATE_TYPES.REMOVE_NODE,
	            fromIndex: prevChild._mountIndex,
	            toIndex: null
	          })
	          prevChild.$destroy()
	        }

	        //新增加的节点，也组装差异对象放到队列里
	        //添加差异对象，类型：INSERT_MARKUP
	        diffQueue.push({
	          name:name,
	          type: UPATE_TYPES.INSERT_MARKUP,
	          fromIndex: null,
	          toIndex: nextIndex,
	          markup: nextChild.$el //新增的节点，多一个此属性，表示新节点的dom内容
	        })
	      }

	      //更新mount的index
	      nextChild._mountIndex = nextIndex;
	      nextIndex++;
	    }

	    //对于老的节点里有，新的节点里没有的那些，也全都删除掉
	    for (name in oldViewMap) {
	      if (oldViewMap.hasOwnProperty(name) && !(newViewMap && newViewMap.hasOwnProperty(name))) {
	        //添加差异对象，类型：REMOVE_NODE
	        diffQueue.push({
	          name:name,
	          type: UPATE_TYPES.REMOVE_NODE,
	          fromIndex: prevChild._mountIndex,
	          toIndex: null
	        })
	        prevChild.$destroy()
	      }
	    }

	  },
	  _patch:function(){
	    var update, updatedIndex, updatedChild;
	    var initialChildren = {}
	    var deleteChildren = []
	    var updates = this.diffQueue
	    for (var i = 0; i < updates.length; i++) {
	      update = updates[i];
	      if (update.type === UPATE_TYPES.MOVE_EXISTING || update.type === UPATE_TYPES.REMOVE_NODE) {

	        updatedChild = this.oldViewMap[update.name]
	        initialChildren[update.name] = updatedChild.$el
	        //所有需要修改的节点先删除,对于move的，后面再重新插入到正确的位置即可
	        deleteChildren.push(updatedChild)
	      }
	    }
	    //删除所有需要先删除的
	    _.each(deleteChildren, function(child) {
	      _.remove(child.$el)
	        //child.$destroy()
	    })

	    //再遍历一次，这次处理新增的节点，还有修改的节点这里也要重新插入
	    for (var k = 0; k < updates.length; k++) {
	      update = updates[k];
	      switch (update.type) {
	        case UPATE_TYPES.INSERT_MARKUP:
	          this._insertChildAt(update.markup, update.toIndex);
	          break;
	        case UPATE_TYPES.MOVE_EXISTING:
	          this._insertChildAt(initialChildren[update.name], update.toIndex);
	          break;
	        case UPATE_TYPES.REMOVE_NODE:
	          // 什么都不需要做，因为上面已经帮忙删除掉了
	          break;
	      }
	    }

	  },
	  //用于把一个node插入到指定位置，通过之前的占位节点去找
	  _insertChildAt:function(element,toIndex){
	    var start = this.start
	    var end = this.end

	    var index = -1
	    var node = start

	    while(node && node !== end){

	      node = node.nextSibling
	      //不是element就跳过
	      if (!(_.isElement(node) && node.nodeType==1)) continue

	      index ++
	      if (toIndex == index) {
	        _.after(element,node)
	        return
	      }

	    }

	    //证明没找到，不够？那就直接放到最后了
	    if (toIndex > index) {
	      _.before(element,end)
	    }
	  },
	  update: function(lists) {
	    //策略，先删除以前的，再使用最新的，找出最小差异更新
	    //参考reactjs的差异算法
	    this.newViewMap = this._generateNewChildren(lists)

	    this._diff()
	    this._patch()

	    this.oldViewMap = this.newViewMap

	  },
	  unbind: function() {
	    _.each(this.newViewMap,function(view){
	      view.$destroy()
	    })
	    //恢复现场，好像觉得没必要？
	    //_.before(this.el,this.end)
	    //循环的el会由子view销毁掉
	    //_.remove(this.start)
	    //_.remove(this.end)
	  }
	}

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * 这是非常特殊的一个directive，用来处理文本节点的插值
	 */


	var _ = __webpack_require__(2)



	module.exports = {
	  priority: 3000,
	  bind:function(options) {
	  },
	  update:function(value){
	    //默认情况下都是转义的，但是可以使用{{{}}}跳过
	    var skipHtmlEscape = this.describe.html
	    this.el.data = skipHtmlEscape ? value : _.htmlspecialchars(value)
	  },
	  unbind:function(){
	  }
	}

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	
	var _ = __webpack_require__(2)


	//观察者
	function Watcher (scope,expression,callback) {
	  this.last = null
	  this.current = null
	  this.__directives = []
	  this.__view = null
	  this.expression = expression
	  this.callback = callback
	  this.scope = scope
	}

	Watcher.prototype.applyFilter = function(value,filterName){

	  if (!filterName) return value

	  //应该从root view拿
	  var filter = this.__view.__filters[filterName]
	  if (filter) {
	    return filter.call(this.__view,value,this.scope)
	  }
	  return value
	}

	Watcher.prototype.getValue = function(){
	  //todo 取值很容易出错，需要给出错误提示
	  return new Function('_scope','_that', 'return ' + this.expression)(this.scope,this)
	}

	Watcher.prototype.check = function() {
	  this.current = this.getValue()
	  //使用directive自己的判断要不要更新
	  if (this._check(this.last,this.current)) {
	    this.callback && this.callback()
	  }
	  this.last = this.current
	}


	Watcher.prototype._check = function(last,current) {
	  var hasUpdated = false
	  _.each(this.__directives,function(dir){
	    if (dir.shoudUpdate(last,current)) {
	      dir.update(current)
	      hasUpdated = true
	    }
	  })

	  return hasUpdated
	}

	Watcher.prototype.destroy = function() {
	  //通知所有的directive销毁
	  _.each(this.__directives,function(dir){
	    dir.destroy()
	  })

	}


	module.exports = Watcher

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(2)

	module.exports = _.Class.extend({
	  //添加监听
	  on: function(key, listener) {
	    //this.__events存储所有的处理函数
	    if (!this.__events) {
	      this.__events = {}
	    }
	    if (!this.__events[key]) {
	      this.__events[key] = []
	    }
	    if (_.indexOf(this.__events, listener) === -1 && typeof listener === 'function') {
	      this.__events[key].push(listener)
	    }

	    return this
	  },
	  //触发一个事件，也就是通知
	  fire: function(key) {

	    if (!this.__events || !this.__events[key]) return

	    var args = Array.prototype.slice.call(arguments, 1) || []

	    var listeners = this.__events[key]
	    var i = 0
	    var l = listeners.length

	    for (i; i < l; i++) {
	      listeners[i].apply(this, args)
	    }

	    return this
	  },
	  //取消监听
	  off: function(key, listener) {

	    if (!key && !listener) {
	      this.__events = {}
	    }
	    //不传监听函数，就去掉当前key下面的所有的监听函数
	    if (key && !listener) {
	      delete this.__events[key]
	    }

	    if (key && listener) {
	      var listeners = this.__events[key]
	      var index = _.indexOf(listeners, listener)

	      (index > -1) && listeners.splice(index, 1)
	    }
	    return this;
	  }

	})

/***/ }
/******/ ])
});
;