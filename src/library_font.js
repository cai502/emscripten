var LibraryA2OFont = {
    $A2OFont__deps: ["malloc"],
    $A2OFont__postset: "A2OFont.init();",
    $A2OFont: {
        elements: {
        },
        init: function() {
            // elements for metrics
            var baseline = document.createElement("div");
            baseline.style.display = "inline-block";
            baseline.style.width = "1px";
            baseline.style.height = "0px";
            baseline.style.verticalAlign = "baseline";
            var textSpan = document.createElement("span");
            var container = document.createElement("div");
            container.appendChild(baseline);
            container.appendChild(textSpan);
            A2OFont.elements.textSpan = textSpan;
            A2OFont.elements.baseline = baseline;
            A2OFont.elements.container = container;
            
            // canvas for rendering
            A2OFont.elements.canvas = document.createElement("canvas");
        },
        getTextMetrics: function(fontName, pointSize, text) {
            var textSpan = A2OFont.elements.textSpan;
            var baseline = A2OFont.elements.baseline;
            var continer = A2OFont.elements.container;
            var fontAttr = A2OFont.fontNameToCssFontAttribute(fontName);
            textSpan.innerHTML = text;
            textSpan.style.fontStyle = fontAttr[0];
            textSpan.style.fontWeight = fontAttr[1];
            textSpan.style.fontFamily = fontAttr[2];
            textSpan.style.fontSize = pointSize + "px";

            document.body.appendChild(continer);
            var height = Math.ceil(textSpan.offsetHeight)+1;
            var width = Math.ceil(textSpan.offsetWidth);
            var ascent = baseline.offsetTop - textSpan.offsetTop;
            var descent = height - ascent;
            document.body.removeChild(continer);
            return {"height":height, "width":width, "ascent":ascent, "descent":descent};
        },
        fontNameToCssFontAttribute: function(fontName) {
            // 0: style, 1: wight, 2: family
            if(fontName == "Arial") {
                return ["normal", "normal", "Arial"];
            } else if(fontName == "ArialBold") {
                return ["normal", "bold", "Arial"];
            } else {
                return ["normal", "normal", "fontName"];
            }
        },
        transformPoint: function(a,b,c,d,x,y) {
            return {"x":a*x+c*y, "y":b*x+d*y};
        },
        transformRect: function(a,b,c,d,x,y,w,h) {
            var p = [
                A2OFont.transformPoint(a,b,c,d,x  ,y  ),
                A2OFont.transformPoint(a,b,c,d,x  ,y+h),
                A2OFont.transformPoint(a,b,c,d,x+w,y  ),
                A2OFont.transformPoint(a,b,c,d,x+w,y+h)
            ];
            var minx = Math.min(p[0].x, p[1].x, p[2].x, p[3].x);
            var miny = Math.min(p[0].y, p[1].y, p[2].y, p[3].y);
            var maxx = Math.max(p[0].x, p[1].x, p[2].x, p[3].x);
            var maxy = Math.max(p[0].y, p[1].y, p[2].y, p[3].y);
            return {
                "origin":{
                    "x":Math.floor(minx),
                    "y":Math.floor(miny)
                },
                "size":{
                    "width":Math.ceil(maxx-minx),
                    "height":Math.ceil(maxy-miny)
                }
            };
        }
    },
    a2o_renderFontToBitmapBuffer: function(font, pointSize, str, a, b, c, d, width, height, left, top) {
        var text = Pointer_stringify(str);
        var fontName = Pointer_stringify(font);
        var canvas = A2OFont.elements.canvas;

        var metrics = A2OFont.getTextMetrics(fontName, pointSize, text);
        var rect = A2OFont.transformRect(a, b, c, d, 0, 0, metrics.width, metrics.height);
        var w = rect.size.width|0;
        var h = rect.size.height|0;
        canvas.width = w;
        canvas.height = h;

        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "rgb(255,255,255)";
        var fontAttr = A2OFont.fontNameToCssFontAttribute(fontName);
        ctx.font = fontAttr[0] + " normal " + fontAttr[1] + " "+pointSize+"px '"+fontAttr[2]+"'";
        ctx.translate(-rect.origin.x, -rect.origin.y);
        ctx.transform(a, b, c, d, 0, 0);
        ctx.fillText(text, 0, metrics.ascent);
        var imageData = ctx.getImageData(0, 0, w, h);
        var data = imageData.data; // assume Uint8ClampedArray
        var dataLength = w*h;
        var ret = _malloc(dataLength);
        for(var i = 0; i < dataLength; i++) {
            HEAPU8[ret + i] = data[i*4+3]; // canvas subpixel rendering is applied to alpha component
        }
        var zero = A2OFont.transformPoint(a, b, c, d, 0, metrics.ascent);
        {{{ makeSetValue('width', 0, 'w', 'i32') }}};
        {{{ makeSetValue('height', 0, 'h', 'i32') }}};
        {{{ makeSetValue('left', 0, 'zero.x-rect.origin.x', 'i32') }}};
        {{{ makeSetValue('top', 0, 'zero.y-rect.origin.y', 'i32') }}};
        return ret;
    },
    a2o_getFontMetrics: function(font, pointSize, ascent, descent, capHeight, xHeight) {
        var fontName = Pointer_stringify(font);
        var metrics1 = A2OFont.getTextMetrics(fontName, pointSize, "fg");
        var metrics2 = A2OFont.getTextMetrics(fontName, pointSize, "H");
        var metrics3 = A2OFont.getTextMetrics(fontName, pointSize, "x");
        {{{ makeSetValue('ascent', 0, 'metrics1.ascent', 'i32') }}};
        {{{ makeSetValue('descent', 0, 'metrics1.descent', 'i32') }}};
        {{{ makeSetValue('capHeight', 0, 'metrics2.ascent', 'i32') }}};
        {{{ makeSetValue('xHeight', 0, 'metrics3.ascent', 'i32') }}};
    },
    a2o_getTextWidth: function(font, pointSize, str) {
        var text = Pointer_stringify(str);
        var fontName = Pointer_stringify(font);
        var metrics = A2OFont.getTextMetrics(fontName, pointSize, text);
        return metrics.width;
    },
    a2o_suggestLineBreak: function(font, pointSize, str, start, width) {

        var text = Pointer_stringify(str);
        var fontName = Pointer_stringify(font);
        for(var i = start; i < text.length; i++) { // TODO consider word boundary
            var metrics = A2OFont.getTextMetrics(fontName, pointSize, text.substring(start, i+1));
            if(text.charAt(i) == "\n") return i + 1 - start;
            if(metrics.width > width) return i - start;
        }
        return text.length - start;
    }
};

autoAddDeps(LibraryA2OFont, '$A2OFont');
mergeInto(LibraryManager.library, LibraryA2OFont);
