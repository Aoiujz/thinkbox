/**
 +-------------------------------------------------------------------
 * jQuery ThinkBox - 弹出层插件 - http://zjzit.cn/thinkbox
 +-------------------------------------------------------------------
 * @version    1.0.0 beta
 * @since      2012.08.20
 * @author     麦当苗儿 <zuojiazi.cn@vip.qq.com>
 * @github     https://github.com/Aoiujz/ThinkBox.git
 +-------------------------------------------------------------------
 */
(function($){
	/* 弹出框默认选项 */
	var defaults = {
		'title'       : null,     // 弹出框标题
		'fixed'       : true,     // 是否使用固定定位(fixed)而不是绝对定位(absolute)，固定定位的对话框不受浏览器滚动条影响。IE6不支持固定定位，其永远表现为绝对定位。
		'center'      : true,     // 对话框是否屏幕中心显示
		'x'           : 0,        // 对话框 x 坐标。 当 center 属性为 true 时此属性无效
		'y'           : 0,        // 对话框 y 坐标。 当 center 属性为 true 时此属性无效
		'modal'       : false,    // 对话框是否设置为模态。设置为 true 将显示遮罩背景，禁止其他事件触发
		'modalClose'  : true,     // 点击模态背景是否关闭弹出框
		'resize'      : true,     // 是否在窗口大小改变时重新定位弹出框位置
		'unload'      : false,    // 隐藏后是否卸载
		'close'       : '[关闭]',  // 关闭按钮显示文字，留空则不显示关闭按钮
		'escHide'     : true,     // 按ESC是否关闭弹出框
		'delayClose'  : 0,        // 延时自动关闭弹出框 0表示不自动关闭
		'drag'        : true,     // 点击标题框是否允许拖动
		'display'     : true,     // 是否在创建后立即显示
		'width'       : '',       // 弹出框内容区域宽度   空表示自适应
		'height'      : '',       // 弹出框内容区域高度   空表示自适应
		'dataEle'     : '',       // 弹出框缓存元素，设置此属性的弹出框只允许同时存在一个
		'locate'      : ['left', 'top'],       //弹出框位置属性
		'show'        : ['fadeIn', 'normal'],  //显示效果
		'hide'        : ['fadeOut', 'normal'], //关闭效果
		'button'      : [], //工具栏按钮
		'style'       : 'default', // 弹出框样式
		'beforeShow'  : undefined, //显示前的回调方法
		'afterShow'   : undefined, //显示后的回调方法
		'afterHide'   : undefined, //隐藏后的回调方法
		'beforeUnload': undefined, //卸载前的回调方法
		'afterDrag'   : undefined  //拖动停止后的回调方法
	};
	
	/* 弹出框层叠高度 */
	var zIndex = 2012;
	
	/* 当前选中的弹出框对象 */
	var current = null;
	
	/* 弹出框容器 */
	var wrapper = [	'<div class="ThinkBox-wrapper">', //弹出框外层容器
						'<table cellspacing="0" cellpadding="0" border="0">', //使用表格，可以做到良好的宽高自适应，而且方便做圆角样式
					   		'<tr>',
					   			'<td class="box-top-left"></td>',  //左上角
								'<td class="box-top"></td>',       //上边
								'<td class="box-top-right"></td>', //右上角
							'</tr>',
							'<tr>',
								'<td class="box-left"></td>',       //左边
								'<td class="ThinkBox-inner"></td>', //弹出框inner
								'<td class="box-right"></td>',      //右边
							'</tr>',
							'<tr>',
								'<td class="box-bottom-left"></td>',  //左下角
								'<td class="box-bottom"></td>',       //下边
								'<td class="box-bottom-right"></td>', //右下角
							'</tr>',
						'</table>',
					'</div>'].join('');
	
	/* 弹出框标题栏 */
	var titleBar = ['<tr class="ThinkBox-title">',
						'<td class="box-title-left"></td>',       //标题栏左边
						'<td class="ThinkBox-title-inner"></td>', //标题栏inner
						'<td class="box-title-right"></td>',      //标题栏右边
					'</tr>'].join('');
	
	/* 弹出框按钮工具栏 */		
	var toolsBar = ['<tr class="ThinkBox-tools">',
						'<td class="box-tools-left"></td>',       //工具栏左边
						'<td class="ThinkBox-tools-inner"></td>', //工具栏inner
						'<td class="box-tools-right"></td>',      //工具栏右边
					'</tr>'].join('');
	
	/**
	 * 构造方法，用于实例化一个新的弹出框对象
	 +----------------------------------------------------------
	 * element 弹出框内容元素
	 * options 弹出框选项
	 +----------------------------------------------------------
	 */
	var ThinkBox = function(element, options){
		var self = this, visible = false, modal = null;
		var options = $.extend({}, defaults, options || {});
		var box = $(wrapper).addClass('ThinkBox-' + options.style).data('ThinkBox', this); //创建弹出框容器
		options.dataEle && $(options.dataEle).data('ThinkBox', this); //缓存弹出框，防止弹出多个
		
		//给box绑定事件
		box.hover(function(){_fire.call(self, options.mouseover)},function(){_fire.call(self, options.mouseout)})
		   .mousedown(function(event){_setCurrent();event.stopPropagation()})
		   .click(function(event){event.stopPropagation()});
		
		_setContent(element || '<div></div>'); //设置内容
		options.title !== null && _setupTitleBar(); // 安装标题栏
		options.button.length && _setupToolsBar();
		options.close && _setupCloseBtn(); // 安装关闭按钮
		box.css('display', 'none').appendTo('body'); //放入body

		var left = box.find('.box-left');
		left.append($('<div></div>').css('width', left.width())); //左边添加空DIV防止拖动出浏览器时左边不显示
		
		//隐藏弹出框
		this.hide = _hide;
		
		//显示弹出框
		this.show = _show;
		
		//如果当前显示则隐藏，如果当前隐藏则显示
		this.toggle = function(){visible ? self.hide() : self.show()};
		
		// 获取弹出框内容对象
		this.getContent = function(){return $('.ThinkBox-content', box)};
		
		//动态添加内容
		this.setContent = function(content){
			_setContent(content);
			_setLocate(); //设置弹出框显示位置
			return self;
		};
		
		//获取内容区域的尺寸
		this.getSize = _getSize;
		
		//动态改变弹出层内容区域的大小
		this.setSize = function(width, height){
			$('.ThinkBox-inner', box).css({'width' : width, 'height' : height})	
		};
		
		//设置弹出框fixed属性
		options.fixed && ($.browser.msie && $.browser.version < 7 ? options.fixed = false : box.addClass('fixed'));
		_setLocate(); //设置弹出框显示位置
		options.resize && $(window).resize(function(){_setLocate()});
		
		// 按ESC键关闭弹出框
		self.escHide = options.escHide;
		
		//显示弹出框
		options.display && _show();
		
		/* 显示弹出框 */
		function _show() {
			if(visible) return self;
			// 安装模态背景
			options.modal && _setupModal();
			
			_fire.call(self, options.beforeShow); //调用显示之前回调函数
			
			switch(options.show[0]){
				case 'slideDown':
					box.stop(true, true).slideDown(options.show[1], _);
					break;
				case 'fadeIn':
					box.stop(true, true).fadeIn(options.show[1], _);
					break;
				default:
					box.show(options.show[1], _);
			}
			
			visible = true;
			_setCurrent();
			return self;
			
			function _(){
				options.delayClose && $.isNumeric(options.delayClose) && setTimeout(_hide, options.delayClose);
				_fire.call(self, options.afterShow);
			}
		};

		/* 隐藏弹出框 */
		function _hide() {
			if(!visible) return self;
			modal && modal.fadeOut('normal',function(){$(this).remove();modal = null});
			
			switch(options.hide[0]){
				case 'slideUp':
					box.stop(true, true).slideUp(options.show[1], _);
					break;
				case 'fadeOut':
					box.stop(true, true).fadeOut(options.show[1], _);
					break;
				default:
					box.hide(options.show[1], _);
			}
			return self;
			
			function _() {
				visible = false;
				_fire.call(self, options.afterHide); //隐藏后的回调方法
				options.unload && _unload();
			}
		}
		
		/* 安装标题栏 */
		function _setupTitleBar() {
			var bar   = $(titleBar);
			var title = $('.ThinkBox-title-inner', bar).html('<span>' + options.title + '</span>');
			if (options.drag) {
				title.addClass('dragging');
				title[0].onselectstart = function() {return false}; //禁止选中文字
				title[0].unselectable = 'on'; // 禁止获取焦点
				title[0].style.MozUserSelect = 'none'; // 禁止火狐选中文字
				_drag(title);
			}
			$('tr', box).first().after(bar);
		}
		
		/* 安装工具栏 */
		function _setupToolsBar() {
			var bar     = $(toolsBar);
			var tools   = $('.ThinkBox-tools-inner', bar);
			var button  = null;
			$.each(options.button, function(k, v){
				button = $('<input/>')
					.attr('type', 'button')
					.addClass(v[0])
					.val(v[1])
					.click(function(){_fire.call(self, v[2])})
					.appendTo(tools);
			})
			$('tr', box).last().before(bar);
		}
		
		/* 安装关闭按钮 */
		function _setupCloseBtn(){
			$('<a class="ThinkBox-close">' + options.close + '</a>')
				.click(function(event){self.hide();event.stopPropagation()})
				.mousedown(function(event){event.stopPropagation()})
				.appendTo($('.ThinkBox-inner', box));
		}
		
		/* 安装模态背景 */
		function _setupModal(){
			modal = $('<div class="ThinkBox-modal-blackout"></div>')
						.addClass('ThinkBox-modal-blackout-' + options.style)
						.css({
							'zIndex' : zIndex++, 
							'width'  : $(document).width(), 
							'height' : $(document).height()
						})
						.click(function(event){
							options.modalClose && current && current.hide();
							event.stopPropagation();
						})
						.mousedown(function(event){event.stopPropagation()})
						.appendTo($('body'));
			$(window).resize(function() {
				modal.css({'width'  : '', 'height' : ''});
				modal.css({'width'  : $(document).width(), 'height' : $(document).height()});
			});
		}
		
		/* 设置弹出框容器中的内容 */
		function _setContent(content) {
			var content = $('<div/>')
						.addClass('ThinkBox-content')
						.append($(content).clone(true, true).show());
			$('.ThinkBox-content', box).remove(); // 卸载原容器中的内容
			$('.ThinkBox-inner', box)
				.css({'width' : options.width, 'height' : options.height}) // 设置弹出框内容的宽和高
				.append(content); // 添加新内容
		}
		
		/* 设置弹出框初始位置 */
		function _setLocate(){
			options.center ? 
			_moveToCenter() : 
			_moveTo(
				$.isNumeric(options.x) ? options.x : ($.isFunction(options.x) ? options.x.call(options.dataEle) : 0), 
				$.isNumeric(options.y) ? options.y : ($.isFunction(options.y) ? options.y.call(options.dataEle) : 0)
			);
		}
		
		/* 拖动弹出框 */
		function _drag(title){
			var draging = null;
			$(document).mousemove(function(event){
				draging && box.css({left: event.pageX - draging[0], top: event.pageY - draging[1]});
			});
			title.mousedown(function(event) {
				var offset = box.offset();
				if(options.fixed){
					offset.left -= $(window).scrollLeft();
					offset.top -= $(window).scrollTop();
				}
				draging = [event.pageX - offset.left, event.pageY - offset.top];
			}).mouseup(function() {
				draging = null;
				_fire.call(self, options.afterDrag); //拖动后的回调函数
			});
		}
		
		/* 移动弹出框到屏幕中心 */
		function _moveToCenter() {
			var s = _getSize(),
				v = viewport(),
				o = box.hasClass('fixed') ? [0, 0] : [v.left, v.top],
				x = o[0] + v.width / 2,
				y = o[1] + v.height / 2;
			_moveTo(x - s[0] / 2, y - s[1] / 2);
		}
		
		/* 移动弹出框到指定的坐标 */
		function _moveTo(x, y) {
			$.isNumeric(x) && (options.locate[0] == 'left' ? box.css({'left' : x}) : box.css({'right' : x}));
			$.isNumeric(y) && (options.locate[1] == 'top' ? box.css({'top' : y}) : box.css({'bottom' : y}));
		}
		
		/* 获取弹出框的尺寸 */
		function _getSize(){
			if(visible)
				return [box.width(), box.height()];
			else {
				box.css({'visibility': 'hidden', 'display': 'block'});
				var size = [box.width(), box.height()];
				box.css('display', 'none').css('visibility', 'visible');
				return size;
			}
		}
		
		/* 卸载弹出框容器 */
		function _unload(){
			_fire.call(self, options.beforeUnload); //卸载前的回调方法
			box.remove();
			options.dataEle && $(options.dataEle).removeData('ThinkBox');
		}
		
		/* 设置为当前选中的弹出框对象 */
		function _setCurrent(){
			current = self;
			_toTop.call(box);
		}
		
	}; //END ThinkBox
	
	/* 调整Z轴到最上层 */
	function _toTop(){
		this.css({'zIndex': zIndex++});
	}

	/* 获取屏幕可视区域的大小和位置 */
	function viewport(){
		var w = $(window);
		return $.extend(
			{'width' : w.width(), 'height' : w.height()},
			{'left' : w.scrollLeft(), 'top' : w.scrollTop()}
		);	
	}
	
	/* 调用回调函数 */
	function _fire(event){
		$.isFunction(event) && event.call(this);
	}
	
	/* 删除options中不必要的参数 */
	function _delOptions(opt, options){
		$.each(opt, function() {
			if (this in options) delete options[this];
		});	
	}
	
	$(document)
		.mousedown(function(){current = null})
		.keypress(function(event){current && current.escHide && event.keyCode == 27 && current.hide()});
	
	/**
	 * 创建一个新的弹出框对象
	 +----------------------------------------------------------
	 * element 弹出框内容元素
	 * options 弹出框选项
	 +----------------------------------------------------------
	 */
	$.ThinkBox = function(element, options){
		if($.isPlainObject(options) && options.dataEle){
			var data = $(options.dataEle).data('ThinkBox');
			if(data) return options.display === false ? data : data.show();
		}
		return new ThinkBox(element, options);
	}
	
	/**
	 +----------------------------------------------------------
	 * 扩展弹出框方法
	 +----------------------------------------------------------
	 */
	$.extend($.ThinkBox, {
		// 以一个URL加载内容并以ThinBox对话框的形式展现
		load : function(url, opt){
			var options = {'type' : 'GET', 'dataType' : 'text', 'cache' : false, 'parseData':undefined},self;
			$.extend(options, opt || {});
			var parseData = options.parseData;
			var ajax = {
				'type'    : options.type,
				'dataType': options.dataType,
				'cache'   : options.cache,
				'success' : function(data) {
					$.isFunction(parseData) && (data = parseData.call(options.dataEle, data));
					//设置内容并显示弹出框
					self.setContent(data);
				}
			};
			
			//删除ThinkBox不需要的参数
			_delOptions(['type', 'cache', 'dataType', 'parseData'], options);
			
			self = $.ThinkBox('<div class="ThinkBox-load-loading">加载中...</div>', options);
			if(!self.getContent().children().is('.ThinkBox-load-loading')) return self; //防止发起多次不必要的请求
			
			$.ajax(url, ajax);
			return self;
		},
		
		// 弹出一个iframe
		'iframe' : function(url, opt){
			var options = {'width' : 500, 'height' : 400, 'scrolling' : 'no'};
			$.extend(options, opt || {});
			var html = '<iframe src="' + url + '" width="' + options.width + '" height="' + options.height + '" frameborder="0" scrolling="' + options.scrolling + '"></iframe>';
			delete options.width, delete options.height, delete options.scrolling; //删除不必要的信息
			return $.ThinkBox(html, options);
		},
		
		// 提示框 可以配合ThinkPHP的ajaxReturn
		'tips' : function(msg, type, opt){
			switch(type){
				case 0: type = 'error'; break;
				case 1: type = 'success'; break;
			}
			var html = '<div class="ThinkBox-tips ThinkBox-' + type + '">' + msg + '</div>';
			var options = {'modal' : false, 'escHide' : false, 'unload' : true, 'close' : false, 'delayClose' : 1000};
			$.extend(options, opt || {});
			return $.ThinkBox(html, options)	;
		},
	
		// 成功提示框
		'success' : function(msg, opt){
			return this.tips(msg, 'success', opt);
		},
	
		// 错误提示框
		'error' : function(msg, opt){
			return this.tips(msg, 'error', opt);
		},
		
		// 数据加载
		'loading' : function(msg, opt){
			var options = {'modal' : true, 'modalClose' : false, 'delayClose' : 0};
			$.extend(options, opt || {});
			return this.tips(msg, 'loading', options);
		},
		
		//消息框
		'msg' : function(msg, opt){
			var html = '<div class="ThinkBox-msg">' + msg + '</div>';
			var options = {
				'drag' : false, 'escHide' : false, 'delayClose' : 0, 'center':false, 'title' : '消息',
				'x' : 0, 'y' : 0, 'locate' : ['right', 'bottom'], 'show' : ['slideDown', 'slow'], 'hide' : ['slideUp', 'slow']
			};
			$.extend(options, opt || {});
			return $.ThinkBox(html, options);
		},
		
		//提示框
		'alert' : function(msg, opt){
			var options = {'title' : '提示', 'modal' : false, 'modalClose' : false, 'unload' : false},
				button = ['ok', '确定', undefined];
			$.extend(options, opt || {});
			(typeof options.okValue != 'undefined') && (button[1] = options.okValue);
			$.isFunction(options.okClick) && (button[2] = options.okClick);
			
			//删除ThinkBox不需要的参数
			_delOptions(['okValue', 'okClick'], options);
			
			options.button = [button];
			var html = $('<div/>').addClass('alert').html(msg);
			return $.ThinkBox(html, options);
		}, 
		
		//确认框
		'confirm' : function(msg, opt){
			var options = {'title' : '确认', 'modal' : false, 'modalClose' : false},
				button = [['ok', '确定', undefined],['cancel', '取消', undefined]];
			$.extend(options, opt || {});
			(typeof options.okValue != 'undefined') && (button[0][1] = options.okValue);
			(typeof options.cancelValue != 'undefined') && (button[1][1] = options.cancelValue);
			$.isFunction(options.okClick) && (button[0][2] = options.okClick);
			$.isFunction(options.cancelClick) && (button[1][2] = options.cancelClick);

			//删除ThinkBox不需要的参数
			_delOptions(['okValue', 'okClick', 'cancelValue', 'cancelClick'], options);

			options.button = button;
			var html = $('<div/>').addClass('confirm').html(msg);
			return $.ThinkBox(html, options);
		},
		
		//弹出框内部获取弹出框对象
		'get' : function(selector){
			return $(selector).parents('.ThinkBox-wrapper').data('ThinkBox');
		}
	});
	
	$.fn.ThinkBox = function(opt){
		if(opt == 'get') return $(this).data('ThinkBox');
		return this.each(function(){
			var self = $(this);
			switch(opt){
				case 'show':
					var box = self.data('ThinkBox');
					box && box.show();
					break;
				case 'hide':
					var box = self.data('ThinkBox');
					box && box.hide();
					break;
				case 'toggle':
					var box = self.data('ThinkBox');
					box && box.toggle();
					break;
				default:
					var options = {'dataEle' : this, 'fixed' : false, 'center': false, 'modal' : false, 'drag' : false};
					opt = $.isPlainObject(opt) ? opt : {};
					$.extend(options, {
						'x' : function(){return $(this).offset().left}, 
						'y' : function(){return $(this).offset().top + $(this).outerHeight()}
					}, opt);
					if(options.event){
						var event = options.event;
						delete options.event;
						if(event == 'hover'){
							var outClose = options.boxOutClose || false, delayShow = options.delayShow || 0, timeout1 = null, timeout2 = null;
							_delOptions(['boxOutClose', 'delayShow'], options);
							options.mouseover = function(){if(timeout2){clearTimeout(timeout2);timeout2 = null}};
							options.mouseout  = function(){this.hide()};
							self.hover(
								function(){timeout1 = timeout1 || setTimeout(function(){_.call(self, options)}, delayShow)},
								function(){
									if(timeout1){clearTimeout(timeout1); timeout1 = null}
									outClose ? timeout2 = timeout2 || setTimeout(function(){timeout2 = null; self.ThinkBox('hide')}, 50) : self.ThinkBox('hide');
								}
							);
						} else {
							self.bind(event, function(){
								_.call(self, options);
								return false;
							});
						}
					} else {
						_.call(self, options);
					}
			}
		});
		
		function _(options){
			var href = this.attr('think-href') || this.attr('href');
			if(href.substr(0, 1) == '#'){
				$.ThinkBox(href, options);
			} else if(href.substr(0, 7) == 'http://' || href.substr(0, 8) == 'https://'){
				$.ThinkBox.iframe(href, options);
			} else {
				$.ThinkBox.load(href, options);
			}
		}
	}
})(jQuery);