/**
 +-------------------------------------------------------------------
 * jQuery ThinkBox - 弹出层插件 - http://zjzit.cn/thinkbox
 +-------------------------------------------------------------------
 * @version    1.0.0 beta
 * @since      2013.02.05
 * @author     麦当苗儿 <zuojiazi.cn@gmail.com>
 * @github     https://github.com/Aoiujz/ThinkBox.git
 +-------------------------------------------------------------------
 */
(function($){
var
    /* 当前脚本文件名 */
    __FILE__ = $("script").last().attr("src"),
    
    /* 弹出层对象 */
    ThinkBox,

    /* 弹出层默认选项 */
    defaults = {
        "title"       : null,     // 弹出层标题
        "fixed"       : true,     // 是否使用固定定位(fixed)而不是绝对定位(absolute)，IE6不支持。
        "center"      : true,     // 弹出层是否屏幕中心显示
        "clone"       : true,     // 是否对弹出层内容克隆
        "x"           : 0,        // 弹出层 x 坐标。 当 center 属性为 true 时此属性无效
        "y"           : 0,        // 弹出层 y 坐标。 当 center 属性为 true 时此属性无效
        "modal"       : true,     // 弹出层是否设置为模态。设置为 true 将显示遮罩背景
        "modalClose"  : true,     // 点击模态背景是否关闭弹出层
        "resize"      : true,     // 是否在窗口大小改变时重新定位弹出层位置
        "unload"      : false,    // 隐藏后是否卸载
        "close"       : "×", // 关闭按钮显示文字，留空则不显示关闭按钮
        "escHide"     : true,     // 按ESC是否关闭弹出层
        "delayClose"  : 0,        // 延时自动关闭弹出层 0表示不自动关闭
        "drag"        : false,    // 点击标题框是否允许拖动
        "display"     : true,     // 是否在创建后立即显示
        "width"       : "",       // 弹出层内容区域宽度   空表示自适应
        "height"      : "",       // 弹出层内容区域高度   空表示自适应
        "dataEle"     : "",       // 弹出层绑定到的元素，设置此属性的弹出层只允许同时存在一个
        "locate"      : ["left", "top"],       //弹出层位置属性
        "show"        : ["fadeIn", "normal"],  //显示效果
        "hide"        : ["fadeOut", "normal"], //关闭效果
        "button"      : [],        //工具栏按钮
        "style"       : "default", //弹出层样式
        "titleChange" : undefined, //分组标题切换后的回调方法
        "beforeShow"  : undefined, //显示前的回调方法
        "afterShow"   : undefined, //显示后的回调方法
        "afterHide"   : undefined, //隐藏后的回调方法
        "beforeUnload": undefined, //卸载前的回调方法
        "afterDrag"   : undefined  //拖动停止后的回调方法
    },
    
    /* 弹出层层叠高度 */
    zIndex = 2013,
    
    /* 当前选中的弹出层对象 */
    current = null,
    
    /* 弹出层容器 */
    wrapper = [
        "<div class=\"ThinkBox-wrapper\" style=\"position:absolute;width: auto\">",
            //使用表格，可以做到良好的宽高自适应，而且方便低版本浏览器做圆角样式
            "<table cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"width: auto\">", 
                "<tr>",
                    "<td class=\"box-top-left\"></td>",  //左上角
                    "<td class=\"box-top\"></td>",       //上边
                    "<td class=\"box-top-right\"></td>", //右上角
                "</tr>",
                "<tr>",
                    "<td class=\"box-left\"></td>",       //左边
                    "<td>",
                        "<div class=\"ThinkBox-header\"></div>", //弹出层header
                        "<div class=\"ThinkBox-inner\"></div>", //弹出层body
                        "<div class=\"ThinkBox-footer\"></div>", //弹出层footer
                    "</td>", //弹出层inner
                    "<td class=\"box-right\"></td>",      //右边
                "</tr>",
                "<tr>",
                    "<td class=\"box-bottom-left\"></td>",  //左下角
                    "<td class=\"box-bottom\"></td>",       //下边
                    "<td class=\"box-bottom-right\"></td>", //右下角
                "</tr>",
            "</table>",
        "</div>"].join(""),

    /* document和window对象分别对应的jQuery对象 */
    _doc = $(document), _win = $(window),

    /* IE浏览器对象 */
    msie = /(msie) ([\w.]+)/.exec(navigator.userAgent.toLowerCase()) || [];
    
/**
 * 构造方法，用于实例化一个新的弹出层对象
 +----------------------------------------------------------
 * element 弹出层内容元素
 * options 弹出层选项
 +----------------------------------------------------------
 */
ThinkBox = function(element, options){
    //初始化变量
    var self = this, visible = false, modal = null, options, box;
    //合并配置选项
    options = $.extend({}, defaults, options || {});

    //加载CSS文件，完成后创建弹出层
    includeCss("/skin/" + options.style + "/style.css", function(){
        //创建弹出层容器
        box = $(wrapper).addClass("ThinkBox-" + options.style).data("ThinkBox", self);
        //缓存弹出层，防止弹出多个
        options.dataEle && $(options.dataEle).data("ThinkBox", self);
        
        //给box绑定事件
        box.hover(
                function(){_fire.call(self, options.mouseover)},
                function(){_fire.call(self, options.mouseout)})
           .mousedown(function(event){_setCurrent(); event.stopPropagation()})
           .click(function(event){event.stopPropagation()});
        
        _setContent(element || "<div></div>"); //设置内容
        options.title !== null && _setupTitleBar(); // 安装标题栏
        options.button.length && _setupToolsBar();// 安装工具栏
        options.close && _setupCloseBtn(); // 安装关闭按钮
        box.css("display", "none").appendTo("body"); //放入body

        //左边添加空DIV防止拖动出浏览器时左边不显示
        $(".box-left", box).append($("<div/>").css("width", $(".box-left", box).width()));
        
        /* 弹出层开放API接口 */
        self.hide = _hide; //隐藏弹出层
        self.show = _show; //显示弹出层
        //如果当前显示则隐藏，如果当前隐藏则显示
        self.toggle     = function(){visible ? self.hide() : self.show()};
        self.getContent = function(){return $(".ThinkBox-content", box)}; // 获取弹出层内容对象
        self.setContent = function(content){ //动态添加内容
            _setContent(content);
            _setLocate(); //设置弹出层显示位置
            return self;
        };
        self.setTitle = _setTitle; //动态设置标题
        self.getSize  = _getSize;  //获取弹出层的尺寸
        self.setSize  = function(width, height){ //动态改变弹出层内容区域的大小
            $(".ThinkBox-inner", box).css({"width" : width, "height" : height});
        };
        
        //设置弹出层fixed属性
        options.fixed && (
            msie[0] && msie[1] < 7 ?
            options.fixed = false : box.css("position", "fixed")
        );

        _setLocate(); //设置弹出层显示位置
        options.resize && _win.resize(function(){_setLocate()}); //窗口大小改变后重设位置
        
        self.escHide = options.escHide; // 按ESC键关闭弹出层
        options.display && _show(); //显示弹出层
    });
    
    /* 显示弹出层 */
    function _show() {
        if(visible) return self;
        options.modal && _setupModal(); // 安装模态背景
        _fire.call(self, options.beforeShow); //调用显示之前回调函数
        //显示效果
        switch(options.show[0]){
            case "slideDown":
                box.stop(true, true).slideDown(options.show[1], _);
                break;
            case "fadeIn":
                box.stop(true, true).fadeIn(options.show[1], _);
                break;
            default:
                box.show(options.show[1], _);
        }
        
        visible = true;
        _setCurrent();
        return self;
        
        function _(){
            options.delayClose && 
            $.isNumeric(options.delayClose) && 
            setTimeout(_hide, options.delayClose);
            _fire.call(self, options.afterShow);
        }
    };

    /* 隐藏弹出层 */
    function _hide() {
        if(!visible) return self;
        modal && modal.fadeOut("normal", function(){$(this).remove();modal = null});
        //影藏效果
        switch(options.hide[0]){
            case "slideUp":
                box.stop(true, true).slideUp(options.hide[1], _);
                break;
            case "fadeOut":
                box.stop(true, true).fadeOut(options.hide[1], _);
                break;
            default:
                box.hide(options.hide[1], _);
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
        var title = $("<div class=\"ThinkBox-title\"></div>");
        if (options.drag) {
            title.addClass("ThinkBox-draging");
            _drag(title);
        }
        $(".ThinkBox-header", box).append(title);
        _setTitle(options.title);
    }

    /* 设置标题 */
    function _setTitle(content){
        var title = $(".ThinkBox-title", box).empty();
        if($.isArray(title) || $.isPlainObject(title)){
            for(key in title){
                $("<span>" + title[key] + "</span>").data("key", key)
                    .click(function(event){
                        var _this = $(this);
                        if(!_this.hasClass("selected")){
                            title.find("span.selected").removeClass("selected");
                            _this.addClass("selected");
                            _fire.call(_this, options.titleChange);
                        }
                    })
                    .mousedown(function(event){event.stopPropagation()})
                    .mouseup(function(event){event.stopPropagation()})
                    .appendTo(title);
            }
        } else {
            title.append("<span>" + content + "</span>");
        }
    }
    
    /* 安装工具栏 */
    function _setupToolsBar() {
        var tools = $("<div class=\"ThinkBox-tools\"></div>");
        for(key in options.button){
            button = $("<span/>").addClass("ThinkBox-button " + options.button[key][0])
                .html(options.button[key][1])
                .click(function(){_fire.call(self, options.button[key][2])})
                .hover(function(){
                    $(this).addClass("hover")},
                    function(){$(this).removeClass("hover")})
                .appendTo(tools);
        }
        $(".ThinkBox-footer", box).append(tools);
    }
    
    /* 安装关闭按钮 */
    function _setupCloseBtn(){
        $("<span/>").addClass("ThinkBox-close").html(options.close)
            .click(function(event){self.hide();event.stopPropagation()})
            .mousedown(function(event){event.stopPropagation()})
            .appendTo($(".ThinkBox-header", box));
    }
    
    /* 安装模态背景 */
    function _setupModal(){
        if(msie[0]){ //解决IE通过 $(documemt).width()获取到的宽度含有滚动条宽度的BUG
            _doc.width  = function(){return document.documentElement.scrollWidth};
            _doc.height = function(){return document.documentElement.scrollHeight};
        }
        modal = $("<div class=\"ThinkBox-modal-blackout\"></div>")
            .addClass("ThinkBox-modal-blackout-" + options.style)
            .css({
                "zIndex"   : zIndex++, 
                "width"    : _doc.width(), 
                "height"   : _doc.height(),
                "position" : "absolute",
                "left"     : 0,
                "top"      : 0
            })
            .click(function(event){
                options.modalClose && current && current.hide();
                event.stopPropagation();
            })
            .mousedown(function(event){event.stopPropagation()})
            .appendTo($("body"));
        //窗口大小改变时改变背景大小
        _win.resize(function() {
            modal && 
            modal.css({"width"  : "", "height" : ""})
                 .css({"width"  : _doc.width(), "height" : _doc.height()});
        });
    }
    
    /* 设置弹出层容器中的内容 */
    function _setContent(content) {
        var content = $("<div/>")
            .addClass("ThinkBox-content")
            .append((options.clone ? $(content).clone(true, true) : $(content)).show());
        $(".ThinkBox-content", box).remove(); // 卸载原容器中的内容
        $(".ThinkBox-inner", box)
            .css({"width" : options.width, "height" : options.height}) //设置弹出层内容的宽和高
            .append(content); // 添加新内容
    }
    
    /* 设置弹出层位置 */
    function _setLocate(){
        options.center ? 
        _moveToCenter() :
        _moveTo(
            $.isNumeric(options.x) ? 
                options.x : 
                ($.isFunction(options.x) ? options.x.call($(options.dataEle)) : 0), 
            $.isNumeric(options.y) ? 
                options.y : 
                ($.isFunction(options.y) ? options.y.call($(options.dataEle)) : 0)
        );
    }
    
    /* 拖动弹出层 */
    function _drag(title){
        var draging = null;
        _doc.mousemove(function(event){
            draging && 
            box.css({left: event.pageX - draging[0], top: event.pageY - draging[1]});
        });
        title.mousedown(function(event) {
            var offset = box.offset();
            if(options.fixed){
                offset.left -= _win.scrollLeft();
                offset.top -= _win.scrollTop();
            }
            _unselect(box[0]); //禁止选中文字
            draging = [event.pageX - offset.left, event.pageY - offset.top];
        }).mouseup(function() {
            draging = null;
            _onselect(box[0]); //允许选中文字
            _fire.call(self, options.afterDrag); //拖动后的回调函数
        });
    }
    
    /* 移动弹出层到屏幕中心 */
    function _moveToCenter() {
        var size     = _getSize(),
            view     = viewport(),
            overflow = box.css("position") == "fixed" ? [0, 0] : [view.left, view.top],
            x        = overflow[0] + view.width / 2,
            y        = overflow[1] + view.height / 2;
        _moveTo(x - size[0] / 2, y - size[1] / 2);
    }
    
    /* 移动弹出层到指定的坐标 */
    function _moveTo(x, y) {
        $.isNumeric(x) && 
            (options.locate[0] == "left" ? box.css({"left" : x}) : box.css({"right" : x}));
        $.isNumeric(y) && 
            (options.locate[1] == "top" ? box.css({"top" : y}) : box.css({"bottom" : y}));
    }
    
    /* 获取弹出层的尺寸 */
    function _getSize(){
        var size = [0, 0];
        if(visible) //获取显示的弹出层尺寸
            size = [box.width(), box.height()];
        else { //获取隐藏的弹出层尺寸
            box.css({"visibility" : "hidden", "display" : "block"});
            var size = [box.width(), box.height()];
            box.css("display", "none").css("visibility", "visible");
        }
        return size;
    }
    
    /* 卸载弹出层容器 */
    function _unload(){
        _fire.call(self, options.beforeUnload); //卸载前的回调方法
        box.remove();
        options.dataEle && $(options.dataEle).removeData("ThinkBox");
    }
    
    /* 设置为当前选中的弹出层对象 */
    function _setCurrent(){
        current = self;
        _toTop.call(box);
    }
    
}; //END ThinkBox

/* 调整弹出层Z轴到最上层 */
function _toTop(){
    this.css({"zIndex": zIndex++});
}

/* 获取屏幕可视区域的大小和位置 */
function viewport(){
    return {
        "width"  : _win.width(),
        "height" : _win.height(),
        "left"   : _win.scrollLeft(),
        "top"    : _win.scrollTop()
    };    
}

/* 调用回调函数 */
function _fire(event){
    $.isFunction(event) && event.call(this);
}

/* 删除options中不必要的参数 */
function _del(opt, options){
    $.each(opt, function() {
        if (this in options) delete options[this];
    });    
}

/* 禁止选中文字 */
function _unselect(element){
    element.onselectstart = function() {return false}; //ie
    element.unselectable = "on"; // ie
    element.style.MozUserSelect = "none"; // firefox
    element.style.WebkitUserSelect = "none"; // chrome
}

/* 允许选中文字 */
function _onselect(element){
    element.onselectstart = function() {return true}; //ie
    element.unselectable = "off"; // ie
    element.style.MozUserSelect = "auto"; // firefox
    element.style.WebkitUserSelect = "auto"; // chrome
}

//加载指定的CSS文件
function includeCss(css, onload){
    var path = __FILE__.slice(0, __FILE__.lastIndexOf("/"));
    if($("link[href='" + path + css + "']").length){
        _fire(onload);
        return;
    };

    //加载CSS文件
    $("<link/>")
        .load(function(){_fire(onload)})
        .attr({
            "href" : path + css,
            "type" : "text/css", 
            "rel"  : "stylesheet"
        }).appendTo("head");
}

/* 按ESC关闭弹出层 */
_doc.mousedown(function(){current = null}).keypress(function(event){
    current && current.escHide && event.keyCode == 27 && current.hide();
});

/**
 * 创建一个新的弹出层对象
 +----------------------------------------------------------
 * element 弹出层内容元素
 * options 弹出层选项
 +----------------------------------------------------------
 */
$.ThinkBox = function(element, options){
    if($.isPlainObject(options) && options.dataEle){
        var data = $(options.dataEle).data("ThinkBox");
        if(data) return options.display === false ? data : data.show();
    }
    return new ThinkBox(element, options);
}

/**
 +----------------------------------------------------------
 * 弹出层内置扩展
 +----------------------------------------------------------
 */
$.extend($.ThinkBox, {
    // 以一个URL加载内容并以ThinBox弹出层的形式展现
    "load" : function(url, opt){
        var options = {
            "clone"     : false,
            "loading"   : "加载中...",
            "type"      : "GET",
            "dataType"  : "text",
            "cache"     : false,
            "parseData" : undefined,
            "onload"    : undefined
        }, self, ajax, parseData, onload, loading, url = url.split(/\s+/);
        $.extend(options, opt || {}); //合并配置项
        //保存一些参数
        parseData = options.parseData;
        onload    = options.onload;
        loading   = options.loading;
        //组装AJAX请求参数
        ajax = {
            "data"     : options.data,
            "type"     : options.type,
            "dataType" : options.dataType,
            "cache"    : options.cache,
            "success"  : function(data) {
                url[1] && (data = $(data).find(url[1]));
                $.isFunction(parseData) && (data = parseData.call(options.dataEle, data));
                self.setContent(data); //设置内容并显示弹出层
                _fire.call(self, onload); //调用onload回调函数
                loading || self.show(); //没有loading状态则直接显示弹出层
            }
        };
        
        //删除ThinkBox不需要的参数
        _del(["data", "type", "cache", "dataType", "parseData", "onload", "loading"], options);
        
        self = loading ? //显示loading信息
            $.ThinkBox("<div class=\"ThinkBox-load-loading\">" + loading + "</div>", options) : 
            $.ThinkBox("<div/>", $.extend({}, options, {"display" : false}));
        
        $.ajax(url[0], ajax);
        return self;
    },
    
    // 弹出一个iframe
    "iframe" : function(url, opt){
        var options = {
            "width"     : 500,
            "height"    : 400,
            "scrolling" : "no",
            "onload"    : undefined
        }, self, iframe, onload;
        $.extend(options, opt || {}); //合并配置项
        onload = options.onload; //设置加载完成后的回调方法
        //创建iframe
        iframe = $("<iframe/>").attr({
            "width"       : options.width,
            "height"      : options.height,
            "frameborder" : 0,
            "scrolling"   : options.scrolling,
            "src"         : url})
            .load(function(){_fire.call(self, onload)});
        _del(["width", "height", "scrolling", "onload"], options);//删除不必要的信息
        self = $.ThinkBox(iframe, options);
        return self;
    },
    
    // 提示框 可以配合ThinkPHP的ajaxReturn
    "tips" : function(msg, type, opt){
        var options = {
            "modalClose" : false,
            "escHide"    : false,
            "unload"     : true,
            "close"      : false,
            "delayClose" : 1000
        }, html;
        
        //数字type转换为字符串type
        switch(type){
            case 0: type = "error"; break;
            case 1: type = "success"; break;
        }
        html = "<div class=\"ThinkBox-tips ThinkBox-" + type + "\">" + msg + "</div>";
        $.extend(options, opt || {});
        return $.ThinkBox(html, options)    ;
    },

    // 成功提示框
    "success" : function(msg, opt){
        return this.tips(msg, "success", opt);
    },

    // 错误提示框
    "error" : function(msg, opt){
        return this.tips(msg, "error", opt);
    },
    
    // 数据加载
    "loading" : function(msg, opt){
        var options = opt || {};
        options.delayClose = 0;
        return this.tips(msg, "loading", options);
    },
    
    //消息框
    "msg" : function(msg, opt){
        var options = {
            "drag"       : false,
            "escHide"    : false,
            "delayClose" : 0,
            "center"     : false,
            "title"      : "消息",
            "x"          : 0,
            "y"          : 0,
            "locate"     : ["right", "bottom"],
            "show"       : ["slideDown", "slow"], 
            "hide"       : ["slideUp", "slow"]
        }, html;
        $.extend(options, opt || {});
        html = $("<div/>").addClass("ThinkBox-msg").html(msg);
        return $.ThinkBox(html, options);
    },
    
    //提示框
    "alert" : function(msg, opt){
        var options = {
            "title"      : "提示",
            "modal"      : false,
            "modalClose" : false,
            "unload"     : false
        }, button = ["ok", "确定", undefined];
        $.extend(options, opt || {});
        (typeof options.okVal != "undefined") && (button[1] = options.okVal);
        $.isFunction(options.ok) && (button[2] = options.ok);
        
        //删除ThinkBox不需要的参数
        _del(["okVal", "ok"], options);
        
        options.button = [button];
        var html = $("<div/>").addClass("ThinkBox-alert").html(msg);
        return $.ThinkBox(html, options);
    }, 
    
    //确认框
    "confirm" : function(msg, opt){
        var options = {"title" : "确认", "modal" : false, "modalClose" : false},
            button  = [["ok", "确定", undefined],["cancel", "取消", undefined]];
        $.extend(options, opt || {});
        (typeof options.okVal != "undefined") && (button[0][1] = options.okVal);
        (typeof options.cancelVal != "undefined") && (button[1][1] = options.cancelVal);
        $.isFunction(options.ok) && (button[0][2] = options.ok);
        $.isFunction(options.cancel) && (button[1][2] = options.cancel);

        //删除ThinkBox不需要的参数
        _del(["okVal", "ok", "cancelVal", "cancel"], options);

        options.button = button;
        var html = $("<div/>").addClass("ThinkBox-confirm").html(msg);
        return $.ThinkBox(html, options);
    },
    
    //弹出层内部获取弹出层对象
    "get" : function(selector){
        //TODO:通过弹窗内部元素找
        return $(selector).closest(".ThinkBox-wrapper").data("ThinkBox");
    }
});

$.fn.ThinkBox = function(opt){
    if(opt == "get") return $(this).data("ThinkBox");
    return this.each(function(){
        var self = $(this), box = self.data("ThinkBox"), options, event,
            delayClose, delayShow, timeout1, timeout2;
        switch(opt){
            case "show":
                box && box.show();
                break;
            case "hide":
                box && box.hide();
                break;
            case "toggle":
                box && box.toggle();
                break;
            default:
                options = {
                    "title" : self.attr("title"),
                    "dataEle" : this,
                    "fixed" : false, 
                    "center": false,
                    "modal" : false,
                    "drag" : false
                };
                opt = $.isPlainObject(opt) ? opt : {};
                $.extend(options, {
                    "x" : function(){return $(this).offset().left}, 
                    "y" : function(){return $(this).offset().top + $(this).outerHeight()}
                }, opt);
                if(options.event){
                    event = options.event;
                    delete options.event;
                    if(event == "hover"){
                        //初始化变量
                        delayClose  = options.boxOutClose || false;
                        delayShow   = options.delayShow || 0;
                        timeout1    = null;
                        timeout2    = null;

                        _del(["boxOutClose", "delayShow"], options);
                        options.mouseover = function(){
                            if(timeout2){
                                clearTimeout(timeout2);
                                timeout2 = null
                            }
                        };
                        options.mouseout = function(){this.hide()};
                        self.hover(
                            function(){
                                timeout1 = timeout1 || 
                                setTimeout(function(){
                                    _.call(self, options)
                                }, delayShow)
                            },
                            function(){
                                if(timeout1){
                                    clearTimeout(timeout1);
                                    timeout1 = null
                                }
                                delayClose ? 
                                timeout2 = timeout2 || 
                                setTimeout(function(){
                                        timeout2 = null;
                                        self.ThinkBox("hide")
                                }, 50) :
                                self.ThinkBox("hide");
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
        var href = this.attr("think-href") || this.attr("href");
        if(href.substr(0, 1) == "#"){
            $.ThinkBox(href, options);
        } else if(href.substr(0, 7) == "http://" || href.substr(0, 8) == "https://"){
            $.ThinkBox.iframe(href, options);
        } else {
            $.ThinkBox.load(href, options);
        }
    }
}

})(jQuery);