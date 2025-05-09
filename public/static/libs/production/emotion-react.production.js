!(function (e, t) {
    "object" == typeof exports && "undefined" != typeof module
        ? t(exports, require("react"))
        : "function" == typeof define && define.amd
          ? define(["exports", "react"], t)
          : t(((e = "undefined" != typeof globalThis ? globalThis : e || self).emotionReact = {}), e.React);
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
    var a = (function () {
            function e(e) {
                var t = this;
                (this._insertTag = function (e) {
                    var r;
                    (r =
                        0 === t.tags.length
                            ? t.insertionPoint
                                ? t.insertionPoint.nextSibling
                                : t.prepend
                                  ? t.container.firstChild
                                  : t.before
                            : t.tags[t.tags.length - 1].nextSibling),
                        t.container.insertBefore(e, r),
                        t.tags.push(e);
                }),
                    (this.isSpeedy = void 0 === e.speedy || e.speedy),
                    (this.tags = []),
                    (this.ctr = 0),
                    (this.nonce = e.nonce),
                    (this.key = e.key),
                    (this.container = e.container),
                    (this.prepend = e.prepend),
                    (this.insertionPoint = e.insertionPoint),
                    (this.before = null);
            }
            var t = e.prototype;
            return (
                (t.hydrate = function (e) {
                    e.forEach(this._insertTag);
                }),
                (t.insert = function (e) {
                    this.ctr % (this.isSpeedy ? 65e3 : 1) == 0 &&
                        this._insertTag(
                            (function (e) {
                                var t = document.createElement("style");
                                return (
                                    t.setAttribute("data-emotion", e.key),
                                    void 0 !== e.nonce && t.setAttribute("nonce", e.nonce),
                                    t.appendChild(document.createTextNode("")),
                                    t.setAttribute("data-s", ""),
                                    t
                                );
                            })(this)
                        );
                    var t = this.tags[this.tags.length - 1];
                    if (this.isSpeedy) {
                        var r = (function (e) {
                            if (e.sheet) return e.sheet;
                            for (var t = 0; t < document.styleSheets.length; t++)
                                if (document.styleSheets[t].ownerNode === e) return document.styleSheets[t];
                        })(t);
                        try {
                            r.insertRule(e, r.cssRules.length);
                        } catch (e) {}
                    } else t.appendChild(document.createTextNode(e));
                    this.ctr++;
                }),
                (t.flush = function () {
                    this.tags.forEach(function (e) {
                        var t;
                        return null == (t = e.parentNode) ? void 0 : t.removeChild(e);
                    }),
                        (this.tags = []),
                        (this.ctr = 0);
                }),
                e
            );
        })(),
        o = "-ms-",
        s = "-moz-",
        c = "-webkit-",
        i = "comm",
        u = "rule",
        f = "decl",
        l = "@keyframes",
        p = Math.abs,
        d = String.fromCharCode,
        h = Object.assign;
    function y(e) {
        return e.trim();
    }
    function m(e, t, r) {
        return e.replace(t, r);
    }
    function v(e, t) {
        return e.indexOf(t);
    }
    function g(e, t) {
        return 0 | e.charCodeAt(t);
    }
    function b(e, t, r) {
        return e.slice(t, r);
    }
    function w(e) {
        return e.length;
    }
    function x(e) {
        return e.length;
    }
    function $(e, t) {
        return t.push(e), e;
    }
    var S = 1,
        C = 1,
        k = 0,
        O = 0,
        E = 0,
        _ = "";
    function A(e, t, r, n, a, o, s) {
        return {
            value: e,
            root: t,
            parent: r,
            type: n,
            props: a,
            children: o,
            line: S,
            column: C,
            length: s,
            return: "",
        };
    }
    function P(e, t) {
        return h(A("", null, null, "", null, null, 0), e, { length: -e.length }, t);
    }
    function j() {
        return (E = O > 0 ? g(_, --O) : 0), C--, 10 === E && ((C = 1), S--), E;
    }
    function T() {
        return (E = O < k ? g(_, O++) : 0), C++, 10 === E && ((C = 1), S++), E;
    }
    function N() {
        return g(_, O);
    }
    function M() {
        return O;
    }
    function R(e, t) {
        return b(_, e, t);
    }
    function z(e) {
        switch (e) {
            case 0:
            case 9:
            case 10:
            case 13:
            case 32:
                return 5;
            case 33:
            case 43:
            case 44:
            case 47:
            case 62:
            case 64:
            case 126:
            case 59:
            case 123:
            case 125:
                return 4;
            case 58:
                return 3;
            case 34:
            case 39:
            case 40:
            case 91:
                return 2;
            case 41:
            case 93:
                return 1;
        }
        return 0;
    }
    function F(e) {
        return (S = C = 1), (k = w((_ = e))), (O = 0), [];
    }
    function D(e) {
        return (_ = ""), e;
    }
    function I(e) {
        return y(R(O - 1, W(91 === e ? e + 2 : 40 === e ? e + 1 : e)));
    }
    function G(e) {
        for (; (E = N()) && E < 33; ) T();
        return z(e) > 2 || z(E) > 3 ? "" : " ";
    }
    function L(e, t) {
        for (; --t && T() && !(E < 48 || E > 102 || (E > 57 && E < 65) || (E > 70 && E < 97)); );
        return R(e, M() + (t < 6 && 32 == N() && 32 == T()));
    }
    function W(e) {
        for (; T(); )
            switch (E) {
                case e:
                    return O;
                case 34:
                case 39:
                    34 !== e && 39 !== e && W(E);
                    break;
                case 40:
                    41 === e && W(e);
                    break;
                case 92:
                    T();
            }
        return O;
    }
    function q(e, t) {
        for (; T() && e + E !== 57 && (e + E !== 84 || 47 !== N()); );
        return "/*" + R(t, O - 1) + "*" + d(47 === e ? e : T());
    }
    function H(e) {
        for (; !z(N()); ) T();
        return R(e, O);
    }
    function J(e) {
        return D(X("", null, null, null, [""], (e = F(e)), 0, [0], e));
    }
    function X(e, t, r, n, a, o, s, c, i) {
        for (var u = 0, f = 0, l = s, p = 0, h = 0, y = 0, b = 1, x = 1, S = 1, C = 0, k = "", O = a, E = o, _ = n, A = k; x; )
            switch (((y = C), (C = T()))) {
                case 40:
                    if (108 != y && 58 == g(A, l - 1)) {
                        -1 != v((A += m(I(C), "&", "&\f")), "&\f") && (S = -1);
                        break;
                    }
                case 34:
                case 39:
                case 91:
                    A += I(C);
                    break;
                case 9:
                case 10:
                case 13:
                case 32:
                    A += G(y);
                    break;
                case 92:
                    A += L(M() - 1, 7);
                    continue;
                case 47:
                    switch (N()) {
                        case 42:
                        case 47:
                            $(U(q(T(), M()), t, r), i);
                            break;
                        default:
                            A += "/";
                    }
                    break;
                case 123 * b:
                    c[u++] = w(A) * S;
                case 125 * b:
                case 59:
                case 0:
                    switch (C) {
                        case 0:
                        case 125:
                            x = 0;
                        case 59 + f:
                            -1 == S && (A = m(A, /\f/g, "")),
                                h > 0 && w(A) - l && $(h > 32 ? V(A + ";", n, r, l - 1) : V(m(A, " ", "") + ";", n, r, l - 2), i);
                            break;
                        case 59:
                            A += ";";
                        default:
                            if (($((_ = B(A, t, r, u, f, a, c, k, (O = []), (E = []), l)), o), 123 === C))
                                if (0 === f) X(A, t, _, _, O, o, l, c, E);
                                else
                                    switch (99 === p && 110 === g(A, 3) ? 100 : p) {
                                        case 100:
                                        case 108:
                                        case 109:
                                        case 115:
                                            X(e, _, _, n && $(B(e, _, _, 0, 0, a, c, k, a, (O = []), l), E), a, E, l, c, n ? O : E);
                                            break;
                                        default:
                                            X(A, _, _, _, [""], E, 0, c, E);
                                    }
                    }
                    (u = f = h = 0), (b = S = 1), (k = A = ""), (l = s);
                    break;
                case 58:
                    (l = 1 + w(A)), (h = y);
                default:
                    if (b < 1)
                        if (123 == C) --b;
                        else if (125 == C && 0 == b++ && 125 == j()) continue;
                    switch (((A += d(C)), C * b)) {
                        case 38:
                            S = f > 0 ? 1 : ((A += "\f"), -1);
                            break;
                        case 44:
                            (c[u++] = (w(A) - 1) * S), (S = 1);
                            break;
                        case 64:
                            45 === N() && (A += I(T())), (p = N()), (f = l = w((k = A += H(M())))), C++;
                            break;
                        case 45:
                            45 === y && 2 == w(A) && (b = 0);
                    }
            }
        return o;
    }
    function B(e, t, r, n, a, o, s, c, i, f, l) {
        for (var d = a - 1, h = 0 === a ? o : [""], v = x(h), g = 0, w = 0, $ = 0; g < n; ++g)
            for (var S = 0, C = b(e, d + 1, (d = p((w = s[g])))), k = e; S < v; ++S)
                (k = y(w > 0 ? h[S] + " " + C : m(C, /&\f/g, h[S]))) && (i[$++] = k);
        return A(e, t, r, 0 === a ? u : c, i, f, l);
    }
    function U(e, t, r) {
        return A(e, t, r, i, d(E), b(e, 2, -2), 0);
    }
    function V(e, t, r, n) {
        return A(e, t, r, f, b(e, 0, n), b(e, n + 1, -1), n);
    }
    function Y(e, t) {
        for (var r = "", n = x(e), a = 0; a < n; a++) r += t(e[a], a, e, t) || "";
        return r;
    }
    function Z(e, t, r, n) {
        switch (e.type) {
            case "@layer":
                if (e.children.length) break;
            case "@import":
            case f:
                return (e.return = e.return || e.value);
            case i:
                return "";
            case l:
                return (e.return = e.value + "{" + Y(e.children, n) + "}");
            case u:
                e.value = e.props.join(",");
        }
        return w((r = Y(e.children, n))) ? (e.return = e.value + "{" + r + "}") : "";
    }
    var K = function (e) {
        var t = new WeakMap();
        return function (r) {
            if (t.has(r)) return t.get(r);
            var n = e(r);
            return t.set(r, n), n;
        };
    };
    function Q(e) {
        var t = Object.create(null);
        return function (r) {
            return void 0 === t[r] && (t[r] = e(r)), t[r];
        };
    }
    var ee = function (e, t, r) {
            for (var n = 0, a = 0; (n = a), (a = N()), 38 === n && 12 === a && (t[r] = 1), !z(a); ) T();
            return R(e, O);
        },
        te = function (e, t) {
            return D(
                (function (e, t) {
                    var r = -1,
                        n = 44;
                    do {
                        switch (z(n)) {
                            case 0:
                                38 === n && 12 === N() && (t[r] = 1), (e[r] += ee(O - 1, t, r));
                                break;
                            case 2:
                                e[r] += I(n);
                                break;
                            case 4:
                                if (44 === n) {
                                    (e[++r] = 58 === N() ? "&\f" : ""), (t[r] = e[r].length);
                                    break;
                                }
                            default:
                                e[r] += d(n);
                        }
                    } while ((n = T()));
                    return e;
                })(F(e), t)
            );
        },
        re = new WeakMap(),
        ne = function (e) {
            if ("rule" === e.type && e.parent && !(e.length < 1)) {
                for (var t = e.value, r = e.parent, n = e.column === r.column && e.line === r.line; "rule" !== r.type; )
                    if (!(r = r.parent)) return;
                if ((1 !== e.props.length || 58 === t.charCodeAt(0) || re.get(r)) && !n) {
                    re.set(e, !0);
                    for (var a = [], o = te(t, a), s = r.props, c = 0, i = 0; c < o.length; c++)
                        for (var u = 0; u < s.length; u++, i++) e.props[i] = a[c] ? o[c].replace(/&\f/g, s[u]) : s[u] + " " + o[c];
                }
            }
        },
        ae = function (e) {
            if ("decl" === e.type) {
                var t = e.value;
                108 === t.charCodeAt(0) && 98 === t.charCodeAt(2) && ((e.return = ""), (e.value = ""));
            }
        };
    function oe(e, t) {
        switch (
            (function (e, t) {
                return 45 ^ g(e, 0) ? (((((((t << 2) ^ g(e, 0)) << 2) ^ g(e, 1)) << 2) ^ g(e, 2)) << 2) ^ g(e, 3) : 0;
            })(e, t)
        ) {
            case 5103:
                return c + "print-" + e + e;
            case 5737:
            case 4201:
            case 3177:
            case 3433:
            case 1641:
            case 4457:
            case 2921:
            case 5572:
            case 6356:
            case 5844:
            case 3191:
            case 6645:
            case 3005:
            case 6391:
            case 5879:
            case 5623:
            case 6135:
            case 4599:
            case 4855:
            case 4215:
            case 6389:
            case 5109:
            case 5365:
            case 5621:
            case 3829:
                return c + e + e;
            case 5349:
            case 4246:
            case 4810:
            case 6968:
            case 2756:
                return c + e + s + e + o + e + e;
            case 6828:
            case 4268:
                return c + e + o + e + e;
            case 6165:
                return c + e + o + "flex-" + e + e;
            case 5187:
                return c + e + m(e, /(\w+).+(:[^]+)/, c + "box-$1$2" + o + "flex-$1$2") + e;
            case 5443:
                return c + e + o + "flex-item-" + m(e, /flex-|-self/, "") + e;
            case 4675:
                return c + e + o + "flex-line-pack" + m(e, /align-content|flex-|-self/, "") + e;
            case 5548:
                return c + e + o + m(e, "shrink", "negative") + e;
            case 5292:
                return c + e + o + m(e, "basis", "preferred-size") + e;
            case 6060:
                return c + "box-" + m(e, "-grow", "") + c + e + o + m(e, "grow", "positive") + e;
            case 4554:
                return c + m(e, /([^-])(transform)/g, "$1" + c + "$2") + e;
            case 6187:
                return m(m(m(e, /(zoom-|grab)/, c + "$1"), /(image-set)/, c + "$1"), e, "") + e;
            case 5495:
            case 3959:
                return m(e, /(image-set\([^]*)/, c + "$1$`$1");
            case 4968:
                return m(m(e, /(.+:)(flex-)?(.*)/, c + "box-pack:$3" + o + "flex-pack:$3"), /s.+-b[^;]+/, "justify") + c + e + e;
            case 4095:
            case 3583:
            case 4068:
            case 2532:
                return m(e, /(.+)-inline(.+)/, c + "$1$2") + e;
            case 8116:
            case 7059:
            case 5753:
            case 5535:
            case 5445:
            case 5701:
            case 4933:
            case 4677:
            case 5533:
            case 5789:
            case 5021:
            case 4765:
                if (w(e) - 1 - t > 6)
                    switch (g(e, t + 1)) {
                        case 109:
                            if (45 !== g(e, t + 4)) break;
                        case 102:
                            return m(e, /(.+:)(.+)-([^]+)/, "$1" + c + "$2-$3$1" + s + (108 == g(e, t + 3) ? "$3" : "$2-$3")) + e;
                        case 115:
                            return ~v(e, "stretch") ? oe(m(e, "stretch", "fill-available"), t) + e : e;
                    }
                break;
            case 4949:
                if (115 !== g(e, t + 1)) break;
            case 6444:
                switch (g(e, w(e) - 3 - (~v(e, "!important") && 10))) {
                    case 107:
                        return m(e, ":", ":" + c) + e;
                    case 101:
                        return (
                            m(
                                e,
                                /(.+:)([^;!]+)(;|!.+)?/,
                                "$1" + c + (45 === g(e, 14) ? "inline-" : "") + "box$3$1" + c + "$2$3$1" + o + "$2box$3"
                            ) + e
                        );
                }
                break;
            case 5936:
                switch (g(e, t + 11)) {
                    case 114:
                        return c + e + o + m(e, /[svh]\w+-[tblr]{2}/, "tb") + e;
                    case 108:
                        return c + e + o + m(e, /[svh]\w+-[tblr]{2}/, "tb-rl") + e;
                    case 45:
                        return c + e + o + m(e, /[svh]\w+-[tblr]{2}/, "lr") + e;
                }
                return c + e + o + e + e;
        }
        return e;
    }
    var se = [
            function (e, t, r, n) {
                if (e.length > -1 && !e.return)
                    switch (e.type) {
                        case f:
                            e.return = oe(e.value, e.length);
                            break;
                        case l:
                            return Y([P(e, { value: m(e.value, "@", "@" + c) })], n);
                        case u:
                            if (e.length)
                                return (function (e, t) {
                                    return e.map(t).join("");
                                })(e.props, function (t) {
                                    switch (
                                        (function (e, t) {
                                            return (e = t.exec(e)) ? e[0] : e;
                                        })(t, /(::plac\w+|:read-\w+)/)
                                    ) {
                                        case ":read-only":
                                        case ":read-write":
                                            return Y([P(e, { props: [m(t, /:(read-\w+)/, ":" + s + "$1")] })], n);
                                        case "::placeholder":
                                            return Y(
                                                [
                                                    P(e, { props: [m(t, /:(plac\w+)/, ":" + c + "input-$1")] }),
                                                    P(e, { props: [m(t, /:(plac\w+)/, ":" + s + "$1")] }),
                                                    P(e, { props: [m(t, /:(plac\w+)/, o + "input-$1")] }),
                                                ],
                                                n
                                            );
                                    }
                                    return "";
                                });
                    }
            },
        ],
        ce = function (e) {
            var t = e.key;
            if ("css" === t) {
                var r = document.querySelectorAll("style[data-emotion]:not([data-s])");
                Array.prototype.forEach.call(r, function (e) {
                    -1 !== e.getAttribute("data-emotion").indexOf(" ") && (document.head.appendChild(e), e.setAttribute("data-s", ""));
                });
            }
            var n,
                o,
                s = e.stylisPlugins || se,
                c = {},
                i = [];
            (n = e.container || document.head),
                Array.prototype.forEach.call(document.querySelectorAll('style[data-emotion^="' + t + ' "]'), function (e) {
                    for (var t = e.getAttribute("data-emotion").split(" "), r = 1; r < t.length; r++) c[t[r]] = !0;
                    i.push(e);
                });
            var u,
                f,
                l = [
                    Z,
                    ((f = function (e) {
                        u.insert(e);
                    }),
                    function (e) {
                        e.root || ((e = e.return) && f(e));
                    }),
                ],
                p = (function (e) {
                    var t = x(e);
                    return function (r, n, a, o) {
                        for (var s = "", c = 0; c < t; c++) s += e[c](r, n, a, o) || "";
                        return s;
                    };
                })([ne, ae].concat(s, l));
            o = function (e, t, r, n) {
                (u = r), Y(J(e ? e + "{" + t.styles + "}" : t.styles), p), n && (d.inserted[t.name] = !0);
            };
            var d = {
                key: t,
                sheet: new a({
                    key: t,
                    container: n,
                    nonce: e.nonce,
                    speedy: e.speedy,
                    prepend: e.prepend,
                    insertionPoint: e.insertionPoint,
                }),
                nonce: e.nonce,
                inserted: c,
                registered: {},
                insert: o,
            };
            return d.sheet.hydrate(i), d;
        },
        ie = n.createContext("undefined" != typeof HTMLElement ? ce({ key: "css" }) : null),
        ue = ie.Provider,
        fe = function (e) {
            return t.forwardRef(function (r, n) {
                var a = t.useContext(ie);
                return e(r, a, n);
            });
        };
    function le() {
        return (
            (le = Object.assign
                ? Object.assign.bind()
                : function (e) {
                      for (var t = 1; t < arguments.length; t++) {
                          var r = arguments[t];
                          for (var n in r) Object.prototype.hasOwnProperty.call(r, n) && (e[n] = r[n]);
                      }
                      return e;
                  }),
            le.apply(this, arguments)
        );
    }
    function pe(e, t, r) {
        return (
            e(
                (r = {
                    path: t,
                    exports: {},
                    require: function (e, t) {
                        return (function () {
                            throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs");
                        })(null == t && r.path);
                    },
                }),
                r.exports
            ),
            r.exports
        );
    }
    var de = pe(function (e, t) {
        Object.defineProperty(t, "__esModule", { value: !0 });
        var r = "function" == typeof Symbol && Symbol.for,
            n = r ? Symbol.for("react.element") : 60103,
            a = r ? Symbol.for("react.portal") : 60106,
            o = r ? Symbol.for("react.fragment") : 60107,
            s = r ? Symbol.for("react.strict_mode") : 60108,
            c = r ? Symbol.for("react.profiler") : 60114,
            i = r ? Symbol.for("react.provider") : 60109,
            u = r ? Symbol.for("react.context") : 60110,
            f = r ? Symbol.for("react.async_mode") : 60111,
            l = r ? Symbol.for("react.concurrent_mode") : 60111,
            p = r ? Symbol.for("react.forward_ref") : 60112,
            d = r ? Symbol.for("react.suspense") : 60113,
            h = r ? Symbol.for("react.suspense_list") : 60120,
            y = r ? Symbol.for("react.memo") : 60115,
            m = r ? Symbol.for("react.lazy") : 60116,
            v = r ? Symbol.for("react.fundamental") : 60117,
            g = r ? Symbol.for("react.responder") : 60118,
            b = r ? Symbol.for("react.scope") : 60119;
        function w(e) {
            if ("object" == typeof e && null !== e) {
                var t = e.$$typeof;
                switch (t) {
                    case n:
                        switch ((e = e.type)) {
                            case f:
                            case l:
                            case o:
                            case c:
                            case s:
                            case d:
                                return e;
                            default:
                                switch ((e = e && e.$$typeof)) {
                                    case u:
                                    case p:
                                    case m:
                                    case y:
                                    case i:
                                        return e;
                                    default:
                                        return t;
                                }
                        }
                    case a:
                        return t;
                }
            }
        }
        function x(e) {
            return w(e) === l;
        }
        (t.typeOf = w),
            (t.AsyncMode = f),
            (t.ConcurrentMode = l),
            (t.ContextConsumer = u),
            (t.ContextProvider = i),
            (t.Element = n),
            (t.ForwardRef = p),
            (t.Fragment = o),
            (t.Lazy = m),
            (t.Memo = y),
            (t.Portal = a),
            (t.Profiler = c),
            (t.StrictMode = s),
            (t.Suspense = d),
            (t.isValidElementType = function (e) {
                return (
                    "string" == typeof e ||
                    "function" == typeof e ||
                    e === o ||
                    e === l ||
                    e === c ||
                    e === s ||
                    e === d ||
                    e === h ||
                    ("object" == typeof e &&
                        null !== e &&
                        (e.$$typeof === m ||
                            e.$$typeof === y ||
                            e.$$typeof === i ||
                            e.$$typeof === u ||
                            e.$$typeof === p ||
                            e.$$typeof === v ||
                            e.$$typeof === g ||
                            e.$$typeof === b))
                );
            }),
            (t.isAsyncMode = function (e) {
                return x(e) || w(e) === f;
            }),
            (t.isConcurrentMode = x),
            (t.isContextConsumer = function (e) {
                return w(e) === u;
            }),
            (t.isContextProvider = function (e) {
                return w(e) === i;
            }),
            (t.isElement = function (e) {
                return "object" == typeof e && null !== e && e.$$typeof === n;
            }),
            (t.isForwardRef = function (e) {
                return w(e) === p;
            }),
            (t.isFragment = function (e) {
                return w(e) === o;
            }),
            (t.isLazy = function (e) {
                return w(e) === m;
            }),
            (t.isMemo = function (e) {
                return w(e) === y;
            }),
            (t.isPortal = function (e) {
                return w(e) === a;
            }),
            (t.isProfiler = function (e) {
                return w(e) === c;
            }),
            (t.isStrictMode = function (e) {
                return w(e) === s;
            }),
            (t.isSuspense = function (e) {
                return w(e) === d;
            });
    });
    pe(function (e, t) {});
    var he = pe(function (e) {
            e.exports = de;
        }),
        ye = {
            childContextTypes: !0,
            contextType: !0,
            contextTypes: !0,
            defaultProps: !0,
            displayName: !0,
            getDefaultProps: !0,
            getDerivedStateFromError: !0,
            getDerivedStateFromProps: !0,
            mixins: !0,
            propTypes: !0,
            type: !0,
        },
        me = { name: !0, length: !0, prototype: !0, caller: !0, callee: !0, arguments: !0, arity: !0 },
        ve = { $$typeof: !0, compare: !0, defaultProps: !0, displayName: !0, propTypes: !0, type: !0 },
        ge = {};
    function be(e) {
        return he.isMemo(e) ? ve : ge[e.$$typeof] || ye;
    }
    ge[he.ForwardRef] = { $$typeof: !0, render: !0, defaultProps: !0, displayName: !0, propTypes: !0 };
    var we = Object.defineProperty,
        xe = Object.getOwnPropertyNames,
        $e = Object.getOwnPropertySymbols,
        Se = Object.getOwnPropertyDescriptor,
        Ce = Object.getPrototypeOf,
        ke = Object.prototype;
    var Oe = function e(t, r, n) {
            if ("string" != typeof r) {
                if (ke) {
                    var a = Ce(r);
                    a && a !== ke && e(t, a, n);
                }
                var o = xe(r);
                $e && (o = o.concat($e(r)));
                for (var s = be(t), c = be(r), i = 0; i < o.length; ++i) {
                    var u = o[i];
                    if (!(me[u] || (n && n[u]) || (c && c[u]) || (s && s[u]))) {
                        var f = Se(r, u);
                        try {
                            we(t, u, f);
                        } catch (e) {}
                    }
                }
            }
            return t;
        },
        Ee = Oe,
        _e = n.createContext({}),
        Ae = K(function (e) {
            return K(function (t) {
                return (function (e, t) {
                    return "function" == typeof t ? t(e) : le({}, e, t);
                })(e, t);
            });
        });
    function Pe(e, t, r) {
        var n = "";
        return (
            r.split(" ").forEach(function (r) {
                void 0 !== e[r] ? t.push(e[r] + ";") : r && (n += r + " ");
            }),
            n
        );
    }
    var je = function (e, t, r) {
            var n = e.key + "-" + t.name;
            !1 === r && void 0 === e.registered[n] && (e.registered[n] = t.styles);
        },
        Te = function (e, t, r) {
            je(e, t, r);
            var n = e.key + "-" + t.name;
            if (void 0 === e.inserted[t.name]) {
                var a = t;
                do {
                    e.insert(t === a ? "." + n : "", a, e.sheet, !0), (a = a.next);
                } while (void 0 !== a);
            }
        },
        Ne = {}.hasOwnProperty;
    var Me = {
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
        },
        Re = !1,
        ze = /[A-Z]|^ms/g,
        Fe = /_EMO_([^_]+?)_([^]*?)_EMO_/g,
        De = function (e) {
            return 45 === e.charCodeAt(1);
        },
        Ie = function (e) {
            return null != e && "boolean" != typeof e;
        },
        Ge = Q(function (e) {
            return De(e) ? e : e.replace(ze, "-$&").toLowerCase();
        }),
        Le = function (e, t) {
            switch (e) {
                case "animation":
                case "animationName":
                    if ("string" == typeof t)
                        return t.replace(Fe, function (e, t, r) {
                            return (He = { name: t, styles: r, next: He }), t;
                        });
            }
            return 1 === Me[e] || De(e) || "number" != typeof t || 0 === t ? t : t + "px";
        },
        We =
            "Component selectors can only be used in conjunction with @emotion/babel-plugin, the swc Emotion plugin, or another Emotion-aware compiler transform.";
    function qe(e, t, r) {
        if (null == r) return "";
        var n = r;
        if (void 0 !== n.__emotion_styles) return n;
        switch (typeof r) {
            case "boolean":
                return "";
            case "object":
                var a = r;
                if (1 === a.anim) return (He = { name: a.name, styles: a.styles, next: He }), a.name;
                var o = r;
                if (void 0 !== o.styles) {
                    var s = o.next;
                    if (void 0 !== s) for (; void 0 !== s; ) (He = { name: s.name, styles: s.styles, next: He }), (s = s.next);
                    return o.styles + ";";
                }
                return (function (e, t, r) {
                    var n = "";
                    if (Array.isArray(r)) for (var a = 0; a < r.length; a++) n += qe(e, t, r[a]) + ";";
                    else
                        for (var o in r) {
                            var s = r[o];
                            if ("object" != typeof s) {
                                var c = s;
                                null != t && void 0 !== t[c] ? (n += o + "{" + t[c] + "}") : Ie(c) && (n += Ge(o) + ":" + Le(o, c) + ";");
                            } else {
                                if ("NO_COMPONENT_SELECTOR" === o && Re) throw new Error(We);
                                if (!Array.isArray(s) || "string" != typeof s[0] || (null != t && void 0 !== t[s[0]])) {
                                    var i = qe(e, t, s);
                                    switch (o) {
                                        case "animation":
                                        case "animationName":
                                            n += Ge(o) + ":" + i + ";";
                                            break;
                                        default:
                                            n += o + "{" + i + "}";
                                    }
                                } else for (var u = 0; u < s.length; u++) Ie(s[u]) && (n += Ge(o) + ":" + Le(o, s[u]) + ";");
                            }
                        }
                    return n;
                })(e, t, r);
            case "function":
                if (void 0 !== e) {
                    var c = He,
                        i = r(e);
                    return (He = c), qe(e, t, i);
                }
        }
        var u = r;
        if (null == t) return u;
        var f = t[u];
        return void 0 !== f ? f : u;
    }
    var He,
        Je = /label:\s*([^\s;{]+)\s*(;|$)/g;
    function Xe(e, t, r) {
        if (1 === e.length && "object" == typeof e[0] && null !== e[0] && void 0 !== e[0].styles) return e[0];
        var n = !0,
            a = "";
        He = void 0;
        var o = e[0];
        null == o || void 0 === o.raw ? ((n = !1), (a += qe(r, t, o))) : (a += o[0]);
        for (var s = 1; s < e.length; s++) {
            if (((a += qe(r, t, e[s])), n)) a += o[s];
        }
        Je.lastIndex = 0;
        for (var c, i = ""; null !== (c = Je.exec(a)); ) i += "-" + c[1];
        var u =
            (function (e) {
                for (var t, r = 0, n = 0, a = e.length; a >= 4; ++n, a -= 4)
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
                switch (a) {
                    case 3:
                        r ^= (255 & e.charCodeAt(n + 2)) << 16;
                    case 2:
                        r ^= (255 & e.charCodeAt(n + 1)) << 8;
                    case 1:
                        r = 1540483477 * (65535 & (r ^= 255 & e.charCodeAt(n))) + ((59797 * (r >>> 16)) << 16);
                }
                return (((r = 1540483477 * (65535 & (r ^= r >>> 13)) + ((59797 * (r >>> 16)) << 16)) ^ (r >>> 15)) >>> 0).toString(36);
            })(a) + i;
        return { name: u, styles: a, next: He };
    }
    var Be,
        Ue,
        Ve = !!n.useInsertionEffect && n.useInsertionEffect,
        Ye =
            Ve ||
            function (e) {
                return e();
            },
        Ze = Ve || n.useLayoutEffect,
        Ke = "__EMOTION_TYPE_PLEASE_DO_NOT_USE__",
        Qe = function (e) {
            var t = e.cache,
                r = e.serialized,
                n = e.isStringTag;
            return (
                je(t, r, n),
                Ye(function () {
                    return Te(t, r, n);
                }),
                null
            );
        },
        et = fe(function (e, t, r) {
            var a = e.css;
            "string" == typeof a && void 0 !== t.registered[a] && (a = t.registered[a]);
            var o = e[Ke],
                s = [a],
                c = "";
            "string" == typeof e.className ? (c = Pe(t.registered, s, e.className)) : null != e.className && (c = e.className + " ");
            var i = Xe(s, void 0, n.useContext(_e));
            c += t.key + "-" + i.name;
            var u = {};
            for (var f in e) Ne.call(e, f) && "css" !== f && f !== Ke && (u[f] = e[f]);
            return (
                (u.className = c),
                r && (u.ref = r),
                n.createElement(
                    n.Fragment,
                    null,
                    n.createElement(Qe, { cache: t, serialized: i, isStringTag: "string" == typeof o }),
                    n.createElement(o, u)
                )
            );
        });
    (e.jsx = function (e, t) {
        var r = arguments;
        if (null == t || !Ne.call(t, "css")) return n.createElement.apply(void 0, r);
        var a = r.length,
            o = new Array(a);
        (o[0] = et),
            (o[1] = (function (e, t) {
                var r = {};
                for (var n in t) Ne.call(t, n) && (r[n] = t[n]);
                return (r[Ke] = e), r;
            })(e, t));
        for (var s = 2; s < a; s++) o[s] = r[s];
        return n.createElement.apply(null, o);
    }),
        (Be = e.jsx || (e.jsx = {})),
        Ue || (Ue = Be.JSX || (Be.JSX = {}));
    var tt = fe(function (e, t) {
        var r = Xe([e.styles], void 0, n.useContext(_e)),
            a = n.useRef();
        return (
            Ze(
                function () {
                    var e = t.key + "-global",
                        n = new t.sheet.constructor({
                            key: e,
                            nonce: t.sheet.nonce,
                            container: t.sheet.container,
                            speedy: t.sheet.isSpeedy,
                        }),
                        o = !1,
                        s = document.querySelector('style[data-emotion="' + e + " " + r.name + '"]');
                    return (
                        t.sheet.tags.length && (n.before = t.sheet.tags[0]),
                        null !== s && ((o = !0), s.setAttribute("data-emotion", e), n.hydrate([s])),
                        (a.current = [n, o]),
                        function () {
                            n.flush();
                        }
                    );
                },
                [t]
            ),
            Ze(
                function () {
                    var e = a.current,
                        n = e[0];
                    if (e[1]) e[1] = !1;
                    else {
                        if ((void 0 !== r.next && Te(t, r.next, !0), n.tags.length)) {
                            var o = n.tags[n.tags.length - 1].nextElementSibling;
                            (n.before = o), n.flush();
                        }
                        t.insert("", r, n, !1);
                    }
                },
                [t, r.name]
            ),
            null
        );
    });
    function rt() {
        for (var e = arguments.length, t = new Array(e), r = 0; r < e; r++) t[r] = arguments[r];
        return Xe(t);
    }
    var nt = function e(t) {
        for (var r = t.length, n = 0, a = ""; n < r; n++) {
            var o = t[n];
            if (null != o) {
                var s = void 0;
                switch (typeof o) {
                    case "boolean":
                        break;
                    case "object":
                        if (Array.isArray(o)) s = e(o);
                        else for (var c in ((s = ""), o)) o[c] && c && (s && (s += " "), (s += c));
                        break;
                    default:
                        s = o;
                }
                s && (a && (a += " "), (a += s));
            }
        }
        return a;
    };
    var at = function (e) {
            var t = e.cache,
                r = e.serializedArr;
            return (
                Ye(function () {
                    for (var e = 0; e < r.length; e++) Te(t, r[e], !1);
                }),
                null
            );
        },
        ot = fe(function (e, t) {
            var r = [],
                a = function () {
                    for (var e = arguments.length, n = new Array(e), a = 0; a < e; a++) n[a] = arguments[a];
                    var o = Xe(n, t.registered);
                    return r.push(o), je(t, o, !1), t.key + "-" + o.name;
                },
                o = {
                    css: a,
                    cx: function () {
                        for (var e = arguments.length, r = new Array(e), n = 0; n < e; n++) r[n] = arguments[n];
                        return (function (e, t, r) {
                            var n = [],
                                a = Pe(e, n, r);
                            return n.length < 2 ? r : a + t(n);
                        })(t.registered, a, nt(r));
                    },
                    theme: n.useContext(_e),
                },
                s = e.children(o);
            return !0, n.createElement(n.Fragment, null, n.createElement(at, { cache: t, serializedArr: r }), s);
        });
    (e.CacheProvider = ue),
        (e.ClassNames = ot),
        (e.Global = tt),
        (e.ThemeContext = _e),
        (e.ThemeProvider = function (e) {
            var t = n.useContext(_e);
            return e.theme !== t && (t = Ae(t)(e.theme)), n.createElement(_e.Provider, { value: t }, e.children);
        }),
        (e.__unsafe_useEmotionCache = function () {
            return t.useContext(ie);
        }),
        (e.createElement = e.jsx),
        (e.css = rt),
        (e.keyframes = function () {
            var e = rt.apply(void 0, arguments),
                t = "animation-" + e.name;
            return {
                name: t,
                styles: "@keyframes " + t + "{" + e.styles + "}",
                anim: 1,
                toString: function () {
                    return "_EMO_" + this.name + "_" + this.styles + "_EMO_";
                },
            };
        }),
        (e.useTheme = function () {
            return n.useContext(_e);
        }),
        (e.withEmotionCache = fe),
        (e.withTheme = function (e) {
            var t = e.displayName || e.name || "Component",
                r = n.forwardRef(function (t, r) {
                    var a = n.useContext(_e);
                    return n.createElement(e, le({ theme: a, ref: r }, t));
                });
            return (r.displayName = "WithTheme(" + t + ")"), Ee(r, e);
        }),
        Object.defineProperty(e, "__esModule", { value: !0 });
});
//# sourceMappingURL=emotion-react.umd.min.js.map
