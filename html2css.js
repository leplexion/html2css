/*
    修自: 
        http://www.linwu.name/HtmlConvertToCss/
        https://github.com/worklinwu/HtmlConvertToCss
    
    -- 虚荣的倒影 Leplexion 2022-07-05
*/
(function(){
    window.html2css = function (html) {
        var options = {
            0: "<",
            1: "d",
            2: "i",
            3: "v",
            4: ">",
            5: "<",
            6: "/",
            7: "d",
            8: "i",
            9: "v",
            10: ">",
            arr_ignore_class: ['^\\.f-', '^\\.j-', 'clearfix'],
            arr_no_extend_class : ['ui-box', 'ui-tab'],
            arr_status_class : ['show', 'hide', 'hidden', 'cur', 'current', 'open', 'close', 'active'],
            arr_top_level_class: ['^\\.m-'],
            child_style: false,
            is_analysis_id: false,
            less_style: false,
        }
        var result_json_arr = [];
        var result_css = [];

        html = html.replace(/src=['|"].*['|"]/ig, "").replace(/<!--.*-->/ig, "");
        if (!html.trim()) { throw '初步解析得到空字串'; }
        var dom = $("<div class='__temp__'>" + html + "</div>");
        convertHtmlToArr(dom, '', result_json_arr);
        analysisArr(options, result_json_arr, result_css);
        // console.log('11111', result_css);
        filterResult(options, result_css);
        result_css = arrUnique(result_css); // 去重

        var result = '';
        if (options.less_style) {
            // 输出为 less 风格样式
            var lessStyleObj = getLessStyleObj(result_css);
            result = getLessStyleCss(lessStyleObj, 0);
        } else if (options.child_style) {
            for (var m = 0; m < result_css.length; m++) {
                if (result_css[m].trim() != "") {
                    result = result + (result_css[m].split(" ").join(" > ")) + " { } \r\n";
                }
            }
        } else {
            for (var k = 0; k < result_css.length; k++) {
                if (result_css[k].trim() != "") {
                    result = result + result_css[k] + " { } \r\n";
                }
            }
        }
        return result;
    };

    function getLessStyleCss(lessStyleObj, deep) {
        var result = "";
        var tempStr;
        // 添加当前值
        //_this.result_json_arr.push(result);
        // 判断是否有子元素
        if (getObjCount(lessStyleObj) > 0) {
            // 递归, 解析子元素
            for (var key in lessStyleObj) {
                if (lessStyleObj.hasOwnProperty(key)) {
                    result += outputSpace(deep * 4) + key + " { ";
                    tempStr = getLessStyleCss(lessStyleObj[key], deep + 1);
                    result += tempStr ? "\r\n" + tempStr : "";
                    result += tempStr ? outputSpace(deep * 4) + "}\r\n" : "}\r\n";
                }
            }
        }
        return result;
    }
    
    function outputSpace(num) {
        var result = "";
        for (var i = 0; i < num; i++) {
            result += " ";
        }
        return result;
    }
    
    function getObjCount(obj) {
        if (obj.prototype.hasOwnProperty('__count__')) {
            return this.__count__;
        } else {
            var count = 0;
            for (var i in obj) if (obj.hasOwnProperty(i)) {
                count++;
            }
            return count;
        }
    }
    
    function getLessStyleObj(result_css) {
        var resultObj = {};
        for (var i = 0; i < result_css.length; i++) {
            if (result_css[i].trim() == "") {
                continue;
            }
            var selectors = result_css[i].trim().split(" "); // 打散
            var _templessStyleObj = resultObj;
            for (var j = 0; j < selectors.length; j++) {
                if (!_templessStyleObj[selectors[j]]) {
                    _templessStyleObj[selectors[j]] = {};
                }
                _templessStyleObj = _templessStyleObj[selectors[j]];
            }
        }
        return resultObj;
    }
    
    function arrUnique(result_css) {
        var ret = [];
        var hash = {};
    
        for (var i = 0; i < result_css.length; i++) {
            var item = result_css[i];
            var key = typeof(item) + item;
            if (hash[key] !== 1) {
                ret.push(item);
                hash[key] = 1
            }
        }
        return ret; 
    }
    
    function filterResult(options, result_css) {
        var _cur_css;
        var _cur_arr;
        var _cur_arr_last;
        for (var i = 0; i < result_css.length; i++) {
            _cur_css = result_css[i];
            _cur_arr = _cur_css.replace(/\.__temp__/ig, "").trim().split(/\s+/);
            _cur_arr_last = _cur_arr[_cur_arr.length - 1];
            // 过滤固定标签
            if (_cur_arr_last == "br") {
                result_css.splice(i, 1);
                i--;
                continue;
            }
            // 过滤忽略的样式
            if (inArrayByRegExp(_cur_arr[_cur_arr.length - 1], options.arr_ignore_class)) {
                result_css.splice(i, 1);
                i--;
                continue;
            }
            // 过滤顶级样式前面的继承链 (例如,  .m-xx 是顶级 class,  那么就把它前面的样式都去掉)
            for (var j = _cur_arr.length - 1; j >= 0; j--) {
                //console.log(_cur_arr[j] + ":" + inArrayByRegExp(_cur_arr[j], options.arr_top_level_class));
                if (inArrayByRegExp(_cur_arr[j], options.arr_top_level_class)) {
                    _cur_arr.splice(0, j);
                    break;
                }
            }
            // 过滤不继承的样式 (忽略样式也是不继承样式)
            for (var k = 0; k < _cur_arr.length;) {
                if (inArrayByRegExp(_cur_arr[k], options.arr_no_extend_class) || inArrayByRegExp(_cur_arr[k], options.arr_ignore_class) && k != _cur_arr.length - 1) {
                    _cur_arr.splice(k, 1);
                } else {
                    k++;
                }
            }
            result_css[i] = _cur_arr.join(" ");
        }
    }
    
    function analysisArr(options, result_json_arr, result_css) {
        for (var i = 0; i < result_json_arr.length; i++) {
            var cur_json = result_json_arr[i]; // 当前节点
            var cur_json_extend = cur_json.extend ? (cur_json.extend + " ") : ""; // 当前节点继承的节点
            var class_arr = cur_json.class ? cur_json.class.split(/\s+/) : []; // 当前节点的 class
            // 按 ID > class > tagName 的顺序解析
            // 是否解析ID
            if (options.is_analysis_id) {
                // 过滤不需要处理的 id
                if (cur_json.id && cur_json.id != "" && !$.inArray(cur_json.id.substr(0, 2), ["j_", "j-", "js"]) > -1) {
                    result_css.push("#" + cur_json.id);
                }
            }
            // 生成class规则  (如果包含忽略的元素, 用标签来继承)
            if (cur_json.class && cur_json.class.trim() != "" && !inArrayByRegExp(cur_json.class.split(/\s+/)[0],options.arr_ignore_class)) {
                for (var j = 0; j < class_arr.length; j++) {
                    // 解析class , 状态样式
                    if ($.inArray(class_arr[j],options.arr_status_class) > -1 && class_arr.length > 1) {
                        result_css.push(cur_json_extend + " ." + class_arr[0] + "." + class_arr[j]);
                    } else {
                        result_css.push(cur_json_extend + "." + class_arr[j]);
                    }
                }
            } else {
                // 标签名
                result_css.push(cur_json_extend + cur_json.tagName);
            }
            // 如果是a标签
            if (cur_json.tagName == "a") {
                if (class_arr[0] && class_arr[0] != "" && !inArrayByRegExp(class_arr[0],options.arr_ignore_class) > -1) {
                    result_css.push(cur_json_extend + "." + class_arr[0] + ":hover");
                } else {
                    result_css.push(cur_json_extend + cur_json.tagName + ":hover");
                }
            }
        }
    }
    
    function inArrayByRegExp(val, regExpArr) {
        var result = false;
        for (var i = 0; i < regExpArr.length; i++) {
            if ((new RegExp(regExpArr[i])).test(val)) {
                result = true;
                break;
            }
        }
        return result;
    }
    
    function convertHtmlToArr(dom, dom_ext, result_json_arr) {
        var result = {};
        dom_ext = (dom_ext && dom_ext != ".__temp__") ? dom_ext : "";
        result.id = dom.attr("id");
        result.class = dom.attr("class"); // 可能包含多个class
        result.tagName = dom[0].tagName.toLowerCase();
        result.extend = dom_ext;
        result_json_arr.push(result);
    
        // 判断是否有子元素
        var $children = dom.children();
        if ($children.length > 0) {
            // 判断是用class来继承还是用tagname来继承
            if (result.class && result.class != "") {
                dom_ext = (dom_ext + " ." + result.class.split(/\s+/)[0]).trim();
            } else {
                dom_ext = (dom_ext + " " + result.tagName).trim();
            }
            // 递归, 解析子元素
            for (var i = 0; i < $children.length; i++) {
                convertHtmlToArr($children.eq(i), dom_ext, result_json_arr);
            }
        }
    }
})(window)