/**
 +-------------------------------------------------------------------
 * jQuery thinkbox - 弹出层插件 - http://zjzit.cn/thinkbox
 +-------------------------------------------------------------------
 * @version    1.0.0 beta2
 * @since      2013.05.10
 * @author     麦当苗儿 <zuojiazi.cn@gmail.com> <http://www.zjzit.cn>
 * @github     https://github.com/Aoiujz/thinkbox.git
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
        "close"       : "×",      // 关闭按钮显示文字，留空则不显示关闭按钮
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
        "button"      : false,     //工具栏按钮 false则不创建工具栏
        "style"       : "default", //弹出层样式
        "beforeShow"  : undefined, //显示前的回调方法
        "afterShow"   : undefined, //显示后的回调方法
        "afterHide"   : undefined, //隐藏后的回调方法
        "beforeUnload": undefined, //卸载前的回调方法
        "afterDrag"   : undefined  //拖动停止后的回调方法
    },
    
    /* 弹出层层叠高度 */
    zIndex = 2013,

    /* 页面创建了的弹出层列表 */
    list = {
        "length"  : 0,
        "current" : null,
        "del" : function(key){
            delete this[key];
            this.length--;
        },
        "get" : function(i){
            return (i != undefined) ? 
            this[this.current][i] : 
            this[this.current];
        },
        "push" : function(val, opt){
            this[val.key] = [val, opt];
            this.length++; return this;
        }
    },
    
    /* 弹出层容器 */
    wrapper = [
        "<div class=\"thinkbox\" style=\"position:absolute;width: auto\">",
            //使用表格，可以做到良好的宽高自适应，而且方便低版本浏览器做圆角样式
            "<table cellspacing=\"0\" cellpadding=\"0\" border=\"0\" style=\"width: auto\">", 
                "<tr>",
                    "<td class=\"thinkbox-top-left\"></td>",  //左上角
                    "<td class=\"thinkbox-top\"></td>",       //上边
                    "<td class=\"thinkbox-top-right\"></td>", //右上角
                "</tr>",
                "<tr>",
                    "<td class=\"thinkbox-left\"></td>",       //左边
                    "<td class=\"thinkbox-inner\">", //弹出层inner
						"<div class=\"thinkbox-body\"></div>", //弹出层body
                    "</td>",
                    "<td class=\"thinkbox-right\"></td>",      //右边
                "</tr>",
                "<tr>",
                    "<td class=\"thinkbox-bottom-left\"></td>",  //左下角
                    "<td class=\"thinkbox-bottom\"></td>",       //下边
                    "<td class=\"thinkbox-bottom-right\"></td>", //右下角
                "</tr>",
            "</table>",
        "</div>"].join(""),

    /* document和window对象分别对应的jQuery对象 */
    _doc = $(document), _win = $(window),

    /* IE浏览器对象 */
    msie = /(msie) ([\w.]+)/.exec(navigator.userAgent.toLowerCase()) || [];

/* 调整弹出层zIndex */
function toTop(){
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
function fire(event, data){
    if($.isFunction(event))
        return event.call(this, data);
}

/* 删除options中不必要的参数 */
function del(keys, options){
    if($.isArray(keys)){ //删除多个
        for(i in keys){
            _(keys[i]);
        }
    } else { //删除一个
        _(keys);
    }
    //从options中删除一个指定的元素
    function _(key){
        if(key in options) delete options[key];
    }
}

/* 禁止选中文字 */
function unselect(){
    var element = $("body")[0];
    element.onselectstart = function() {return false}; //ie
    element.unselectable = "on"; // ie
    element.style.MozUserSelect = "none"; // firefox
    element.style.WebkitUserSelect = "none"; // chrome
}

/* 允许选中文字 */
function onselect(){
    var element = $("body")[0];
    element.onselectstart = function() {return true}; //ie
    element.unselectable = "off"; // ie
    element.style.MozUserSelect = ""; // firefox
    element.style.WebkitUserSelect = ""; // chrome
}

//加载指定的CSS文件
function includeCss(css, onload){
    var path = __FILE__.slice(0, __FILE__.lastIndexOf("/"));
    if($("link[href='" + path + css + "']").length){
        fire(onload);
        return;
    };

    //加载CSS文件
    $("<link/>")
        .load(function(){fire(onload)})
        .attr({
            "href" : path + css,
            "type" : "text/css", 
            "rel"  : "stylesheet"
        }).appendTo("head");
}

/* 设置为当前选中的弹出层对象 */
function setCurrent(){
    list.current = this.key;
    toTop.call(this.box);
}

/* 卸载弹出层容器 */
function unload(){
    var options = list[this.key][1];
    fire.call(this, options.beforeUnload); //卸载前的回调方法
    this.box.remove();
    this.modal.remove();
    _win.off(".thinkbox-" + this.key);
    list.del(this.key);
    options.dataEle && $(options.dataEle).removeData("thinkbox");
}

/* 安装模态背景 */
function setupModal(){
    var self = this, options = list[this.key][1];

    //存在隐藏的遮罩层则直接显示
    if(this.modal){
        this.modal.show();
        return;
    }

    //解决IE通过 $(documemt).width()获取到的宽度含有滚动条宽度的BUG
    if(msie[0]){
        _doc.width  = function(){return document.documentElement.scrollWidth};
        _doc.height = function(){return document.documentElement.scrollHeight};
    }

    this.modal = $("<div class=\"thinkbox-modal-blackout-" + options.style + "\"></div>")
        .css({
            "zIndex"   : zIndex++, 
            "width"    : _doc.width(), 
            "height"   : _doc.height(),
            "position" : "absolute",
            "left"     : 0,
            "top"      : 0
        })
        .click(function(event){
            options.modalClose && list.current && list.get(0).hide();
            event.stopPropagation();
        })
        .mousedown(function(event){event.stopPropagation()})
        .appendTo($("body"));

    //窗口大小改变时改变背景大小
    _win.on("resize.thinkbox-" + this.key, function() {
        self.modal.hide().css({"width" : _doc.width(), "height" : _doc.height()}).show();
    });
}

/* 安装标题栏 */
function setupTitleBar() {
    var options = list[this.key][1];
        title = $("<div class=\"thinkbox-title\"></div>");
    if (options.drag) {
        title.addClass("thinkbox-draging");
        drag.call(this, title);
    }
    $(".thinkbox-inner", this.box).prepend(title);
    this.setTitle(options.title);
}

/* 拖动弹出层 */
function drag(title){
    var draging = null, options = list[this.key][1], box = this.box, self = this;
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
        unselect(); //禁止选中文字
        draging = [event.pageX - offset.left, event.pageY - offset.top];
    }).mouseup(function() {
        draging = null;
        onselect(); //允许选中文字
        fire.call(self, options.afterDrag); //拖动后的回调函数
    });
}

/* 安装工具栏 */
function setupToolsBar() {
    var options = list[this.key][1], self = this, options = list[this.key][1],
        tools = $("<div class=\"thinkbox-tools\"><span class=\"thinkbox-status\"></span></div>");
    for(key in options.button){
        switch(key){
            case "ok":
                _(key, options.button[key], function(){
                    self.hide(true);
                });
                break;
            case "submit":
                _(key, options.button[key], function(){
                    self.box.find("form").submit();
                });
                break;
            default:
                _("cancel", options.button[key], function(){
                    self.hide(false);
                });
        }
    }
    this.box.find(".thinkbox-inner").append(tools);

    function _(key, title, fun){
        var button = $("<button class=\"thinkbox-button-" + key + "\"></button>")
            .html(title)
            .click(function(){fun()})
            .appendTo(tools);
    }
}

/* 安装关闭按钮 */
function setupCloseBtn(){
    var options = list[this.key][1], self = this;
    $("<div/>").addClass("thinkbox-close").html(options.close)
        .click(function(event){
            self.hide();
            event.stopPropagation();
        })
        .mousedown(function(event){
            event.stopPropagation();
        })
        .appendTo($(".thinkbox-" + (options.title ? "title" : "inner"), this.box));
}

/**
 * 构造方法，用于实例化一个新的弹出层对象
 +----------------------------------------------------------
 * element 弹出层内容元素
 * options 弹出层选项
 +----------------------------------------------------------
 */
ThinkBox = function(element, options){
    //初始化变量
    var self = this, options, box, blw;
    //合并配置选项
    options  = $.extend({}, defaults, options || {});
    this.key = zIndex; //给当前弹出层指定编号

    //加载CSS文件，完成后创建弹出层
    includeCss("/skin/" + options.style + "/style.css", function(){
        //创建弹出层容器
        self.box = box = $(wrapper)
            .addClass("thinkbox-" + options.style)
            .data("thinkbox", self);

        //缓存弹出层，防止弹出多个
        options.dataEle && $(options.dataEle).data("thinkbox", self);

        //记录弹出层列表
        list.push(self, options);
        
        //给box绑定事件
        //鼠标按下记录当前弹出层对象
        box.mousedown(function(event){
                setCurrent.call(self);
                event.stopPropagation();
            })
            //鼠标点击阻止事件冒泡
           .click(function(event){
                event.stopPropagation();
            });
        
        options.title !== null && setupTitleBar.call(self); // 安装标题栏
        options.button && setupToolsBar.call(self);// 安装工具栏
        options.close && setupCloseBtn.call(self); // 安装关闭按钮
        box.css("display", "none").appendTo("body"); //放入body

        //左边添加空DIV防止拖动出浏览器时左边不显示
        blw = $(".thinkbox-left", box).width();
        blw && $(".thinkbox-left", box).append($("<div/>").css("width", blw));
        
        //设置弹出层fixed属性
        options.fixed && (
            msie[0] && msie[1] < 7 ?
            options.fixed = false : box.css("position", "fixed")
        );

        self.setContent(element || "<div></div>"); //设置内容

        //窗口大小改变后重设位置
        options.resize && _win.resize(function(){self.resetLocate()});

        options.display && self.show(); //显示弹出层
    });
    
}; //END ThinkBox

/**
 * 注册ThinkBox开放API接口
 */
ThinkBox.prototype = {
    /* 显示弹出层 */
    "show" : function(){
        var self = this, options = list[this.key][1], box = this.box;
        if(box.is(":visible")) return this;
        options.modal && setupModal.call(this); // 安装模态背景
        fire.call(this, options.beforeShow); //调用显示之前回调函数
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
        
        setCurrent.call(this);
        return this;
        
        function _(){
            options.delayClose && 
            $.isNumeric(options.delayClose) && 
            setTimeout(function(){
                self.hide();
            }, options.delayClose);
            //调用显示后的回调方法
            fire.call(self, options.afterShow);
        }
    },

    /* 关闭弹出层 data 为传递给关闭后回调函数的额外数据 */
    "hide" : function(data){
        var self = this, box = this.box, options = list[this.key][1];
        if(!box.is(":visible")) return this;

        //隐藏遮罩层
        this.modal && this.modal.fadeOut();
        
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
        return this;
        
        function _() {
            fire.call(self, options.afterHide, data); //隐藏后的回调方法
            options.unload && unload.call(self);
        }
    },

    /* 显示或隐藏弹出层 */
    "toggle" : function(){
        return this.box.is(":visible") ? self.hide() : self.show();
    },

    /* 在弹出层内容中查找 */
    "find" : function(selector){
        var content = $(".thinkbox-body", this.box);
        return selector ? $(selector, content) : content.children();
    },

    /* 获取弹出层内容html */
    "getContent" : function(){
        return $(".thinkbox-body", this.box).html()
    },

    /* 设置弹出层内容 */
    "setContent" : function(content){ //设置弹出层内容
        var options = list[this.key][1];
            content = (options.clone ? $(content).clone(true, true) : $(content)).show();
        $(".thinkbox-body", this.box).empty() // 清空原容器中的内容
            .css({"width" : options.width, "height" : options.height}) //设置弹出层内容的宽和高
            .append(content); // 添加新内容
        this.resetLocate(); //设置弹出层显示位置
        return this;
    },

    /* 设置弹出层内容区域大小 */
    "setSize" : function(width, height){
        $(".thinkbox-body", this.box).css({"width" : width, "height" : height});
        return this;
    },

    /* 移动弹出层到屏幕中间 */
    "moveToCenter" : function() {
        var size     = this.getSize(),
            view     = viewport(),
            overflow = this.box.css("position") == "fixed" ? [0, 0] : [view.left, view.top],
            x        = overflow[0] + view.width / 2,
            y        = overflow[1] + view.height / 2;
        this.moveTo(x - size[0] / 2, y - size[1] / 2);
    },

    /* 移动弹出层到指定坐标 */
    "moveTo" : function (x, y) {
        var box = this.box, options = list[this.key][1];
        $.isNumeric(x) && 
            (options.locate[0] == "left" ? box.css({"left" : x}) : box.css({"right" : x}));
        $.isNumeric(y) && 
            (options.locate[1] == "top" ? box.css({"top" : y}) : box.css({"bottom" : y}));
    },

    /* 获取弹出层尺寸 */
    "getSize" : function (){
        var size = [0, 0], box = this.box;
        if(box.is(":visible")) //获取显示的弹出层尺寸
            size = [box.width(), box.height()];
        else { //获取隐藏的弹出层尺寸
            box.css({"visibility" : "hidden", "display" : "block"});
            var size = [box.width(), box.height()];
            box.css("display", "none").css("visibility", "visible");
        }
        return size;
    },

    /* 设置弹出层标题 */
    "setTitle" : function(title){
        $(".thinkbox-title", this.box).empty().append("<span>" + title + "</span>");
        return this;
    },

    /* 重置弹出层位置 */
    "resetLocate" : function(){
        var options = list[this.key][1];
        options.center ? 
        this.moveToCenter() :
        this.moveTo(
            $.isNumeric(options.x) ? 
                options.x : 
                ($.isFunction(options.x) ? options.x.call($(options.dataEle)) : 0), 
            $.isNumeric(options.y) ? 
                options.y : 
                ($.isFunction(options.y) ? options.y.call($(options.dataEle)) : 0)
        );
    },

    /* 设置状态栏数据 */
    "setStarts" : function(html, classname){
        var classname = classname ? "thinkbox-status-" + classname : "";
        $(".thinkbox-status", this.box).addClass(classname).html(html);
    }
}

/* 按ESC关闭弹出层 */
_doc.mousedown(function(){list.current = null}).keydown(function(event){
    list.current && list.get(1).escHide && event.keyCode == 27 && list.get(0).hide();
});

/**
 * 创建一个新的弹出层对象
 +----------------------------------------------------------
 * element 弹出层内容元素
 * options 弹出层选项
 +----------------------------------------------------------
 */
$.thinkbox = function(element, options){
    if($.isPlainObject(options) && options.dataEle){
        var data = $(options.dataEle).data("thinkbox");
        if(data) return options.display === false ? data : data.show();
    }
    return new ThinkBox(element, options);
}

/**
 +----------------------------------------------------------
 * 弹出层内置扩展
 +----------------------------------------------------------
 */
$.extend($.thinkbox, {
    /**
     * 设置弹出层默认参数
     * @param  {string} name  配置名称
     * @param  {string} value 配置的值
     */
    "defaults" : function(name, value){
        if($.isPlainObject(name)){
            $.extend(defaults, name);
        } else {
            defaults[name] = value;
        }
    },

    // 以一个URL加载内容并以ThinBox弹出层的形式展现
    "load" : function(url, opt){
        var options = {
            "clone"     : false,
            "loading"   : "加载中...",
            "type"      : "GET",
            "dataType"  : "text",
            "cache"     : false,
            "onload"    : undefined
        }, self, ajax, onload, loading, url = url.split(/\s+/);
        $.extend(options, opt || {}); //合并配置项

        //保存一些参数
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
                if($.isFunction(onload))
                    data = fire.call(self, onload, data); //调用onload回调函数
                self.setContent(data); //设置内容并显示弹出层
                loading || self.show(); //没有loading状态则直接显示弹出层
            }
        };
        
        //删除ThinkBox不需要的参数
        del(["data", "type", "cache", "dataType", "onload", "loading"], options);
        
        self = loading ? 
            //显示loading信息
            $.thinkbox("<div class=\"thinkbox-load-loading\">" + loading + "</div>", options) : 
            //不显示loading信息则创建后不显示弹出层
            $.thinkbox("<div/>", $.extend({}, options, {"display" : false}));
        
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
            .load(function(){fire.call(self, onload)});
        del(["width", "height", "scrolling", "onload"], options);//删除不必要的信息
        self = $.thinkbox(iframe, options);
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
        html = "<div class=\"thinkbox-tips thinkbox-tips-" + type + "\">" + msg + "</div>";
        $.extend(options, opt || {});
        return $.thinkbox(html, options);
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
        html = $("<div/>").addClass("thinkbox-msg").html(msg);
        return $.thinkbox(html, options);
    },
    
    //提示框
    "alert" : function(msg, opt){
        var options = {
            "title"      : "提示",
            "modal"      : false,
            "modalClose" : false,
            "unload"     : false
        }, button = {"ok" : "确定"};
        $.extend(options, opt || {});
        options.ok && (button.ok = options.ok);

        //删除ThinkBox不需要的参数
        del("ok", options);
        
        options.button = button;
        var html = $("<div/>").addClass("thinkbox-alert").html(msg);
        return $.thinkbox(html, options);
    }, 
    
    //确认框
    "confirm" : function(msg, opt){
        var options = {"title" : "确认", "modal" : false, "modalClose" : false},
            button  = {"ok" : "确定", "cancel" : "取消"};
        $.extend(options, opt || {});
        options.ok && (button.ok = options.ok);
        options.cancel && (button.cancel = options.cancel);

        //删除ThinkBox不需要的参数
        del(["ok", "cancel"], options);

        options.button = button;
        var html = $("<div/>").addClass("thinkbox-confirm").html(msg);
        return $.thinkbox(html, options);
    },
    
    //弹出层内部获取弹出层对象
    "get" : function(selector){
        //TODO:通过弹窗内部元素找
        return $(selector).closest(".thinkbox").data("thinkbox");
    }
});

$.fn.thinkbox = function(opt){
    if(opt == "get") return $(this).data("thinkbox");
    return this.each(function(){
        var self = $(this), box = self.data("thinkbox"), options, event;
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
                    "title"   : self.attr("title"),
                    "dataEle" : this,
                    "fixed"   : false, 
                    "center"  : false,
                    "modal"   : false,
                    "drag"    : false
                };
                opt = $.isPlainObject(opt) ? opt : {};
                $.extend(options, {
                    "x" : function(){return $(this).offset().left}, 
                    "y" : function(){return $(this).offset().top + $(this).outerHeight()}
                }, opt);
                if(options.event){
                    self.on(event, function(){
                        _.call(self, options);
                        return false;
                    });
                } else {
                    _.call(self, options);
                }
        }
    });
    
    function _(options){
        var href = this.data("href") || this.attr("href");
        if(href.substr(0, 1) == "#"){
            $.thinkbox(href, options);
        } else if(href.substr(0, 7) == "http://" || href.substr(0, 8) == "https://"){
            $.thinkbox.iframe(href, options);
        } else {
            $.thinkbox.load(href, options);
        }
    }
}

})(jQuery);