var LibraryA2OFont = {
    $A2OFont__deps: ["malloc"],
    $A2OFont__postset: "A2OFont.init();",
    $A2OFont: {
        init: function() {
        },
        getTextMetrics: function(fontName, pointSize, text) {
            var span = document.createElement("span");
            span.innerText = text;
            span.style.fontFamily = fontName;
            span.style.fontSize = pointSize + "px";
            var base = document.createElement("div");
            base.style.display = "inline-block";
            base.style.width = "1px";
            base.style.height = "0px";
            base.style.verticalAlign = "baseline";
            var div = document.createElement("div");
            div.appendChild(base);
            div.appendChild(span);

            document.body.appendChild(div);
            var height = Math.ceil(span.offsetHeight);
            var width = Math.ceil(span.offsetWidth);
            var ascent = base.offsetTop - span.offsetTop;
            var descent = height - ascent;
            document.body.removeChild(div);
            return {"height":height, "width":width, "ascent":ascent, "descent":descent};
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
        var canvas = document.createElement("canvas");

        var metrics = A2OFont.getTextMetrics(fontName, pointSize, text);
        var rect = A2OFont.transformRect(a,b,c,d, 0, -metrics.ascent, metrics.width, metrics.height);
        var w = rect.size.width|0;
        var h = rect.size.height|0;
        canvas.width = w;
        canvas.height = h;

        var ctx = canvas.getContext("2d");
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.font = pointSize+"px '"+fontName+"'";
        ctx.transform(a, b, c, d, 0, 0);
        ctx.fillText(text, rect.origin.x, rect.origin.y);
        var imageData = ctx.getImageData(0, 0, w, h);
        var data = imageData.data; // assume Uint8ClampedArray
        var dataLength = w*h;
        var ret = _malloc(dataLength);
        for(var i = 0; i < dataLength; i++) {
            HEAPU8[ret + i] = data[i*4+3]; // canvas subpixel rendering is applied to alpha component
        }
        {{{ makeSetValue('width', 0, 'w', 'i32') }}};
        {{{ makeSetValue('height', 0, 'h', 'i32') }}};
        {{{ makeSetValue('left', 0, '-rect.origin.x', 'i32') }}};
        {{{ makeSetValue('top', 0, '-rect.origin.y', 'i32') }}};
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
    }
};

autoAddDeps(LibraryA2OFont, '$A2OFont');
mergeInto(LibraryManager.library, LibraryA2OFont);
