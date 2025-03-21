!(function (e, t) {
    "object" == typeof exports && "undefined" != typeof module
        ? (module.exports = t(require("@emotion/react"), require("react")))
        : "function" == typeof define && define.amd
          ? define(["@emotion/react", "react"], t)
          : ((e = "undefined" != typeof globalThis ? globalThis : e || self).emotionStyled = t(e.emotionReact, e.React));
})(this, function (e, t) {
    "use strict";
    function r(e) {
        if (e && e.__esModule) return e;
        var t = Object.create(null);
        return (
            e &&
                Object.keys(e).forEach(function (r) {
                    if ("default" !== r) {
                        var n = Object.getOwnPropertyDescriptor(e, r);
                        Object.defineProperty(
                            t,
                            r,
                            n.get
                                ? n
                                : {
                                      enumerable: !0,
                                      get: function () {
                                          return e[r];
                                      },
                                  }
                        );
                    }
                }),
            (t.default = e),
            Object.freeze(t)
        );
    }
    var n = r(t);
    function i() {
        return (
            (i = Object.assign
                ? Object.assign.bind()
                : function (e) {
                      for (var t = 1; t < arguments.length; t++) {
                          var r = arguments[t];
                          for (var n in r) Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
                      }
                      return e;
                  }),
            i.apply(this, arguments)
        );
    }
    var o = {
        animationIterationCount: 1,
        aspectRatio: 1,
        borderImageOutset: 1,
        borderImageSlice: 1,
        borderImageWidth: 1,
        boxFlex: 1,
        boxFlexGroup: 1,
        boxOrdinalGroup: 1,
        columnCount: 1,
        columns: 1,
        flex: 1,
        flexGrow: 1,
        flexPositive: 1,
        flexShrink: 1,
        flexNegative: 1,
        flexOrder: 1,
        gridRow: 1,
        gridRowEnd: 1,
        gridRowSpan: 1,
        gridRowStart: 1,
        gridColumn: 1,
        gridColumnEnd: 1,
        gridColumnSpan: 1,
        gridColumnStart: 1,
        msGridRow: 1,
        msGridRowSpan: 1,
        msGridColumn: 1,
        msGridColumnSpan: 1,
        fontWeight: 1,
        lineHeight: 1,
        opacity: 1,
        order: 1,
        orphans: 1,
        scale: 1,
        tabSize: 1,
        widows: 1,
        zIndex: 1,
        zoom: 1,
        WebkitLineClamp: 1,
        fillOpacity: 1,
        floodOpacity: 1,
        stopOpacity: 1,
        strokeDasharray: 1,
        strokeDashoffset: 1,
        strokeMiterlimit: 1,
        strokeOpacity: 1,
        strokeWidth: 1,
    };
    function a(e) {
        var t = Object.create(null);
        return function (r) {
            return void 0 === t[r] && (t[r] = e(r)), t[r];
        };
    }
    var l = !1,
        s = /[A-Z]|^ms/g,
        c = /_EMO_([^_]+?)_([^]*?)_EMO_/g,
        d = function (e) {
            return 45 === e.charCodeAt(1);
        },
        u = function (e) {
            return null != e && "boolean" != typeof e;
        },
        p = a(function (e) {
            return d(e) ? e : e.replace(s, "-$&").toLowerCase();
        }),
        f = function (e, t) {
            switch (e) {
                case "animation":
                case "animationName":
                    if ("string" == typeof t)
                        return t.replace(c, function (e, t, r) {
                            return (g = { name: t, styles: r, next: g }), t;
                        });
            }
            return 1 === o[e] || d(e) || "number" != typeof t || 0 === t ? t : t + "px";
        },
        m =
            "Component selectors can only be used in conjunction with @emotion/babel-plugin, the swc Emotion plugin, or another Emotion-aware compiler transform.";
    function h(e, t, r) {
        if (null == r) return "";
        var n = r;
        if (void 0 !== n.__emotion_styles) return n;
        switch (typeof r) {
            case "boolean":
                return "";
            case "object":
                var i = r;
                if (1 === i.anim) return (g = { name: i.name, styles: i.styles, next: g }), i.name;
                var o = r;
                if (void 0 !== o.styles) {
                    var a = o.next;
                    if (void 0 !== a) for (; void 0 !== a; ) (g = { name: a.name, styles: a.styles, next: g }), (a = a.next);
                    return o.styles + ";";
                }
                return (function (e, t, r) {
                    var n = "";
                    if (Array.isArray(r)) for (var i = 0; i < r.length; i++) n += h(e, t, r[i]) + ";";
                    else
                        for (var o in r) {
                            var a = r[o];
                            if ("object" != typeof a) {
                                var s = a;
                                null != t && void 0 !== t[s] ? (n += o + "{" + t[s] + "}") : u(s) && (n += p(o) + ":" + f(o, s) + ";");
                            } else {
                                if ("NO_COMPONENT_SELECTOR" === o && l) throw new Error(m);
                                if (!Array.isArray(a) || "string" != typeof a[0] || (null != t && void 0 !== t[a[0]])) {
                                    var c = h(e, t, a);
                                    switch (o) {
                                        case "animation":
                                        case "animationName":
                                            n += p(o) + ":" + c + ";";
                                            break;
                                        default:
                                            n += o + "{" + c + "}";
                                    }
                                } else for (var d = 0; d < a.length; d++) u(a[d]) && (n += p(o) + ":" + f(o, a[d]) + ";");
                            }
                        }
                    return n;
                })(e, t, r);
            case "function":
                if (void 0 !== e) {
                    var s = g,
                        c = r(e);
                    return (g = s), h(e, t, c);
                }
        }
        var d = r;
        if (null == t) return d;
        var y = t[d];
        return void 0 !== y ? y : d;
    }
    var g,
        y = /label:\s*([^\s;{]+)\s*(;|$)/g;
    var v =
        (!!n.useInsertionEffect && n.useInsertionEffect) ||
        function (e) {
            return e();
        };
    var b = function (e, t, r) {
            var n = e.key + "-" + t.name;
            !1 === r && void 0 === e.registered[n] && (e.registered[n] = t.styles);
        },
        k =
            /^((children|dangerouslySetInnerHTML|key|ref|autoFocus|defaultValue|defaultChecked|innerHTML|suppressContentEditableWarning|suppressHydrationWarning|valueLink|abbr|accept|acceptCharset|accessKey|action|allow|allowUserMedia|allowPaymentRequest|allowFullScreen|allowTransparency|alt|async|autoComplete|autoPlay|capture|cellPadding|cellSpacing|challenge|charSet|checked|cite|classID|className|cols|colSpan|content|contentEditable|contextMenu|controls|controlsList|coords|crossOrigin|data|dateTime|decoding|default|defer|dir|disabled|disablePictureInPicture|disableRemotePlayback|download|draggable|encType|enterKeyHint|fetchpriority|fetchPriority|form|formAction|formEncType|formMethod|formNoValidate|formTarget|frameBorder|headers|height|hidden|high|href|hrefLang|htmlFor|httpEquiv|id|inputMode|integrity|is|keyParams|keyType|kind|label|lang|list|loading|loop|low|marginHeight|marginWidth|max|maxLength|media|mediaGroup|method|min|minLength|multiple|muted|name|nonce|noValidate|open|optimum|pattern|placeholder|playsInline|poster|preload|profile|radioGroup|readOnly|referrerPolicy|rel|required|reversed|role|rows|rowSpan|sandbox|scope|scoped|scrolling|seamless|selected|shape|size|sizes|slot|span|spellCheck|src|srcDoc|srcLang|srcSet|start|step|style|summary|tabIndex|target|title|translate|type|useMap|value|width|wmode|wrap|about|datatype|inlist|prefix|property|resource|typeof|vocab|autoCapitalize|autoCorrect|autoSave|color|incremental|fallback|inert|itemProp|itemScope|itemType|itemID|itemRef|on|option|results|security|unselectable|accentHeight|accumulate|additive|alignmentBaseline|allowReorder|alphabetic|amplitude|arabicForm|ascent|attributeName|attributeType|autoReverse|azimuth|baseFrequency|baselineShift|baseProfile|bbox|begin|bias|by|calcMode|capHeight|clip|clipPathUnits|clipPath|clipRule|colorInterpolation|colorInterpolationFilters|colorProfile|colorRendering|contentScriptType|contentStyleType|cursor|cx|cy|d|decelerate|descent|diffuseConstant|direction|display|divisor|dominantBaseline|dur|dx|dy|edgeMode|elevation|enableBackground|end|exponent|externalResourcesRequired|fill|fillOpacity|fillRule|filter|filterRes|filterUnits|floodColor|floodOpacity|focusable|fontFamily|fontSize|fontSizeAdjust|fontStretch|fontStyle|fontVariant|fontWeight|format|from|fr|fx|fy|g1|g2|glyphName|glyphOrientationHorizontal|glyphOrientationVertical|glyphRef|gradientTransform|gradientUnits|hanging|horizAdvX|horizOriginX|ideographic|imageRendering|in|in2|intercept|k|k1|k2|k3|k4|kernelMatrix|kernelUnitLength|kerning|keyPoints|keySplines|keyTimes|lengthAdjust|letterSpacing|lightingColor|limitingConeAngle|local|markerEnd|markerMid|markerStart|markerHeight|markerUnits|markerWidth|mask|maskContentUnits|maskUnits|mathematical|mode|numOctaves|offset|opacity|operator|order|orient|orientation|origin|overflow|overlinePosition|overlineThickness|panose1|paintOrder|pathLength|patternContentUnits|patternTransform|patternUnits|pointerEvents|points|pointsAtX|pointsAtY|pointsAtZ|preserveAlpha|preserveAspectRatio|primitiveUnits|r|radius|refX|refY|renderingIntent|repeatCount|repeatDur|requiredExtensions|requiredFeatures|restart|result|rotate|rx|ry|scale|seed|shapeRendering|slope|spacing|specularConstant|specularExponent|speed|spreadMethod|startOffset|stdDeviation|stemh|stemv|stitchTiles|stopColor|stopOpacity|strikethroughPosition|strikethroughThickness|string|stroke|strokeDasharray|strokeDashoffset|strokeLinecap|strokeLinejoin|strokeMiterlimit|strokeOpacity|strokeWidth|surfaceScale|systemLanguage|tableValues|targetX|targetY|textAnchor|textDecoration|textRendering|textLength|to|transform|u1|u2|underlinePosition|underlineThickness|unicode|unicodeBidi|unicodeRange|unitsPerEm|vAlphabetic|vHanging|vIdeographic|vMathematical|values|vectorEffect|version|vertAdvY|vertOriginX|vertOriginY|viewBox|viewTarget|visibility|widths|wordSpacing|writingMode|x|xHeight|x1|x2|xChannelSelector|xlinkActuate|xlinkArcrole|xlinkHref|xlinkRole|xlinkShow|xlinkTitle|xlinkType|xmlBase|xmlns|xmlnsXlink|xmlLang|xmlSpace|y|y1|y2|yChannelSelector|z|zoomAndPan|for|class|autofocus)|(([Dd][Aa][Tt][Aa]|[Aa][Rr][Ii][Aa]|x)-.*))$/,
        x = a(function (e) {
            return k.test(e) || (111 === e.charCodeAt(0) && 110 === e.charCodeAt(1) && e.charCodeAt(2) < 91);
        }),
        w = function (e) {
            return "theme" !== e;
        },
        C = function (e) {
            return "string" == typeof e && e.charCodeAt(0) > 96 ? x : w;
        },
        _ = function (e, t, r) {
            var n;
            if (t) {
                var i = t.shouldForwardProp;
                n =
                    e.__emotion_forwardProp && i
                        ? function (t) {
                              return e.__emotion_forwardProp(t) && i(t);
                          }
                        : i;
            }
            return "function" != typeof n && r && (n = e.__emotion_forwardProp), n;
        },
        S = function (e) {
            var t = e.cache,
                r = e.serialized,
                n = e.isStringTag;
            return (
                b(t, r, n),
                v(function () {
                    return (function (e, t, r) {
                        b(e, t, r);
                        var n = e.key + "-" + t.name;
                        if (void 0 === e.inserted[t.name]) {
                            var i = t;
                            do {
                                e.insert(t === i ? "." + n : "", i, e.sheet, !0), (i = i.next);
                            } while (void 0 !== i);
                        }
                    })(t, r, n);
                }),
                null
            );
        },
        O = function t(r, o) {
            var a,
                l,
                s = r.__emotion_real === r,
                c = (s && r.__emotion_base) || r;
            void 0 !== o && ((a = o.label), (l = o.target));
            var d = _(r, o, s),
                u = d || C(c),
                p = !u("as");
            return function () {
                var f = arguments,
                    m = s && void 0 !== r.__emotion_styles ? r.__emotion_styles.slice(0) : [];
                if ((void 0 !== a && m.push("label:" + a + ";"), null == f[0] || void 0 === f[0].raw)) m.push.apply(m, f);
                else {
                    var v = f[0];
                    m.push(v[0]);
                    for (var b = f.length, k = 1; k < b; k++) m.push(f[k], v[k]);
                }
                var x = e.withEmotionCache(function (t, r, i) {
                    var o,
                        a,
                        s,
                        f,
                        v = (p && t.as) || c,
                        b = "",
                        k = [],
                        x = t;
                    if (null == t.theme) {
                        for (var w in ((x = {}), t)) x[w] = t[w];
                        x.theme = n.useContext(e.ThemeContext);
                    }
                    "string" == typeof t.className
                        ? ((o = r.registered),
                          (a = k),
                          (s = t.className),
                          (f = ""),
                          s.split(" ").forEach(function (e) {
                              void 0 !== o[e] ? a.push(o[e] + ";") : e && (f += e + " ");
                          }),
                          (b = f))
                        : null != t.className && (b = t.className + " ");
                    var _ = (function (e, t, r) {
                        if (1 === e.length && "object" == typeof e[0] && null !== e[0] && void 0 !== e[0].styles) return e[0];
                        var n = !0,
                            i = "";
                        g = void 0;
                        var o = e[0];
                        null == o || void 0 === o.raw ? ((n = !1), (i += h(r, t, o))) : (i += o[0]);
                        for (var a = 1; a < e.length; a++) (i += h(r, t, e[a])), n && (i += o[a]);
                        y.lastIndex = 0;
                        for (var l, s = ""; null !== (l = y.exec(i)); ) s += "-" + l[1];
                        var c =
                            (function (e) {
                                for (var t, r = 0, n = 0, i = e.length; i >= 4; ++n, i -= 4)
                                    (t =
                                        1540483477 *
                                            (65535 &
                                                (t =
                                                    (255 & e.charCodeAt(n)) |
                                                    ((255 & e.charCodeAt(++n)) << 8) |
                                                    ((255 & e.charCodeAt(++n)) << 16) |
                                                    ((255 & e.charCodeAt(++n)) << 24))) +
                                        ((59797 * (t >>> 16)) << 16)),
                                        (r =
                                            (1540483477 * (65535 & (t ^= t >>> 24)) + ((59797 * (t >>> 16)) << 16)) ^
                                            (1540483477 * (65535 & r) + ((59797 * (r >>> 16)) << 16)));
                                switch (i) {
                                    case 3:
                                        r ^= (255 & e.charCodeAt(n + 2)) << 16;
                                    case 2:
                                        r ^= (255 & e.charCodeAt(n + 1)) << 8;
                                    case 1:
                                        r = 1540483477 * (65535 & (r ^= 255 & e.charCodeAt(n))) + ((59797 * (r >>> 16)) << 16);
                                }
                                return (
                                    ((r = 1540483477 * (65535 & (r ^= r >>> 13)) + ((59797 * (r >>> 16)) << 16)) ^ (r >>> 15)) >>>
                                    0
                                ).toString(36);
                            })(i) + s;
                        return { name: c, styles: i, next: g };
                    })(m.concat(k), r.registered, x);
                    (b += r.key + "-" + _.name), void 0 !== l && (b += " " + l);
                    var O = p && void 0 === d ? C(v) : u,
                        A = {};
                    for (var P in t) (p && "as" === P) || (O(P) && (A[P] = t[P]));
                    return (
                        (A.className = b),
                        i && (A.ref = i),
                        n.createElement(
                            n.Fragment,
                            null,
                            n.createElement(S, { cache: r, serialized: _, isStringTag: "string" == typeof v }),
                            n.createElement(v, A)
                        )
                    );
                });
                return (
                    (x.displayName =
                        void 0 !== a ? a : "Styled(" + ("string" == typeof c ? c : c.displayName || c.name || "Component") + ")"),
                    (x.defaultProps = r.defaultProps),
                    (x.__emotion_real = x),
                    (x.__emotion_base = c),
                    (x.__emotion_styles = m),
                    (x.__emotion_forwardProp = d),
                    Object.defineProperty(x, "toString", {
                        value: function () {
                            return "." + l;
                        },
                    }),
                    (x.withComponent = function (e, r) {
                        return t(e, i({}, o, r, { shouldForwardProp: _(x, r, !0) })).apply(void 0, m);
                    }),
                    x
                );
            };
        }.bind(null);
    return (
        [
            "a",
            "abbr",
            "address",
            "area",
            "article",
            "aside",
            "audio",
            "b",
            "base",
            "bdi",
            "bdo",
            "big",
            "blockquote",
            "body",
            "br",
            "button",
            "canvas",
            "caption",
            "cite",
            "code",
            "col",
            "colgroup",
            "data",
            "datalist",
            "dd",
            "del",
            "details",
            "dfn",
            "dialog",
            "div",
            "dl",
            "dt",
            "em",
            "embed",
            "fieldset",
            "figcaption",
            "figure",
            "footer",
            "form",
            "h1",
            "h2",
            "h3",
            "h4",
            "h5",
            "h6",
            "head",
            "header",
            "hgroup",
            "hr",
            "html",
            "i",
            "iframe",
            "img",
            "input",
            "ins",
            "kbd",
            "keygen",
            "label",
            "legend",
            "li",
            "link",
            "main",
            "map",
            "mark",
            "marquee",
            "menu",
            "menuitem",
            "meta",
            "meter",
            "nav",
            "noscript",
            "object",
            "ol",
            "optgroup",
            "option",
            "output",
            "p",
            "param",
            "picture",
            "pre",
            "progress",
            "q",
            "rp",
            "rt",
            "ruby",
            "s",
            "samp",
            "script",
            "section",
            "select",
            "small",
            "source",
            "span",
            "strong",
            "style",
            "sub",
            "summary",
            "sup",
            "table",
            "tbody",
            "td",
            "textarea",
            "tfoot",
            "th",
            "thead",
            "time",
            "title",
            "tr",
            "track",
            "u",
            "ul",
            "var",
            "video",
            "wbr",
            "circle",
            "clipPath",
            "defs",
            "ellipse",
            "foreignObject",
            "g",
            "image",
            "line",
            "linearGradient",
            "mask",
            "path",
            "pattern",
            "polygon",
            "polyline",
            "radialGradient",
            "rect",
            "stop",
            "svg",
            "text",
            "tspan",
        ].forEach(function (e) {
            O[e] = O(e);
        }),
        O
    );
});
//# sourceMappingURL=emotion-styled.umd.min.js.map
