(function () {
  var t = function () {
    "use strict";
    function t() {}
    function e(t) {
      return t();
    }
    function n() {
      return Object.create(null);
    }
    function r(t) {
      t.forEach(e);
    }
    function o(t) {
      return typeof t == "function";
    }
    function a(t, e) {
      if (t == t) {
        return t !== e || (t && typeof t == "object") || typeof t == "function";
      } else {
        return e == e;
      }
    }
    function s(t, e) {
      t.appendChild(e);
    }
    function i(t, e, n) {
      t.insertBefore(e, n || null);
    }
    function removeEl(t) {
      t.parentNode.removeChild(t);
    }
    function createEl(t) {
      return document.createElement(t);
    }
    function d(t) {
      return document.createTextNode(t);
    }
    function space() {
      return d(" ");
    }
    function f() {
      return d("");
    }
    function p(t, e, n, r) {
      t.addEventListener(e, n, r);
      return () => t.removeEventListener(e, n, r);
    }
    function setAttr(t, e, n) {
      if (n == null) {
        t.removeAttribute(e);
      } else if (t.getAttribute(e) !== n) {
        t.setAttribute(e, n);
      }
    }
    function g(t, e) {
      e = "" + e;
      if (t.wholeText !== e) {
        t.data = e;
      }
    }
    function h(t, e) {
      t.value = e == null ? "" : e;
    }
    function setClass(el, e, n) {
      el.classList[n ? "add" : "remove"](e);
    }
    function b(t) {
      $ = t;
    }
    function x() {
      if (!$) {
        throw new Error("Function called outside component initialization");
      }
      return $;
    }
    function k(t) {
      x().$$.on_mount.push(t);
    }
    function v(t, e) {
      x().$$.context.set(t, e);
    }
    function _(t) {
      return x().$$.context.get(t);
    }
    function E(t) {
      S.push(t);
    }
    function O() {
      if (!R) {
        R = true;
        do {
          for (let t = 0; t < w.length; t += 1) {
            const e = w[t];
            b(e);
            M(e.$$);
          }
          b(null);
          for (w.length = 0; C.length; ) {
            C.pop()();
          }
          for (let t = 0; t < S.length; t += 1) {
            const e = S[t];
            if (!A.has(e)) {
              A.add(e);
              e();
            }
          }
          S.length = 0;
        } while (w.length);
        while (I.length) {
          I.pop()();
        }
        L = false;
        R = false;
        A.clear();
      }
    }
    function M(t) {
      if (t.fragment !== null) {
        t.update();
        r(t.before_update);
        const e = t.dirty;
        t.dirty = [-1];
        if (t.fragment) {
          t.fragment.p(t.ctx, e);
        }
        t.after_update.forEach(E);
      }
    }
    function j() {
      q = { r: 0, c: [], p: q };
    }
    function U() {
      if (!q.r) {
        r(q.c);
      }
      q = q.p;
    }
    function z(t, e) {
      if (t && t.i) {
        T.delete(t);
        t.i(e);
      }
    }
    function P(t, e, n, r) {
      if (t && t.o) {
        if (T.has(t)) {
          return;
        }
        T.add(t);
        q.c.push(() => {
          T.delete(t);
          if (r) {
            if (n) {
              t.d(1);
            }
            r();
          }
        });
        t.o(e);
      }
    }
    function F(t, e) {
      P(t, 1, 1, () => {
        e.delete(t.key);
      });
    }
    function D(t, e, n, r, o, a, s, i, c, l, d, u) {
      function k(t) {
        z(t, 1);
        t.m(i, d);
        s.set(t.key, t);
        d = t.first;
        p--;
      }
      let f = t.length;
      let p = a.length;
      let m = f;
      const g = {};
      while (m--) {
        g[t[m].key] = m;
      }
      const h = [];
      const y = new Map();
      const $ = new Map();
      for (m = p; m--; ) {
        const t = u(o, a, m);
        const i = n(t);
        let c = s.get(i);
        if (c) {
          if (r) {
            c.p(t, e);
          }
        } else {
          c = l(i, t);
          c.c();
        }
        y.set(i, (h[m] = c));
        if (i in g) {
          $.set(i, Math.abs(m - g[i]));
        }
      }
      const b = new Set();
      const x = new Set();
      while (f && p) {
        const e = h[p - 1];
        const n = t[f - 1];
        const r = e.key;
        const o = n.key;
        if (e === n) {
          d = e.first;
          f--;
          p--;
        } else if (y.has(o)) {
          if (!s.has(r) || b.has(r)) {
            k(e);
          } else if (x.has(o)) {
            f--;
          } else if ($.get(r) > $.get(o)) {
            x.add(r);
            k(e);
          } else {
            b.add(o);
            f--;
          }
        } else {
          c(n, s);
          f--;
        }
      }
      while (f--) {
        const e = t[f];
        if (!y.has(e.key)) {
          c(e, s);
        }
      }
      while (p) {
        k(h[p - 1]);
      }
      return h;
    }
    function H(t) {
      if (t) {
        t.c();
      }
    }
    function J(t, n, a, s) {
      const { fragment: i, on_mount: c, on_destroy: l, after_update: d } = t.$$;
      if (i) {
        i.m(n, a);
      }
      if (!s) {
        E(() => {
          const n = c.map(e).filter(o);
          if (l) {
            l.push(...n);
          } else {
            r(n);
          }
          t.$$.on_mount = [];
        });
      }
      d.forEach(E);
    }
    function B(t, e) {
      const n = t.$$;
      if (n.fragment !== null) {
        r(n.on_destroy);
        if (n.fragment) {
          n.fragment.d(e);
        }
        n.on_destroy = n.fragment = null;
        n.ctx = [];
      }
    }
    function Y(t, e) {
      if (t.$$.dirty[0] === -1) {
        w.push(t);
        if (!L) {
          L = true;
          N.then(O);
        }
        t.$$.dirty.fill(0);
      }
      t.$$.dirty[(e / 31) | 0] |= 1 << e % 31;
    }
    function G(e, o, a, s, i, l, d = [-1]) {
      const u = $;
      b(e);
      const f = (e.$$ = {
        fragment: null,
        ctx: null,
        props: l,
        update: t,
        not_equal: i,
        bound: n(),
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(u ? u.$$.context : o.context || []),
        callbacks: n(),
        dirty: d,
        skip_bound: false,
      });
      let p = false;
      f.ctx = a
        ? a(e, o.props || {}, (t, n, ...r) => {
            const o = r.length ? r[0] : n;
            if (f.ctx && i(f.ctx[t], (f.ctx[t] = o))) {
              if (!f.skip_bound && f.bound[t]) {
                f.bound[t](o);
              }
              if (p) {
                Y(e, t);
              }
            }
            return n;
          })
        : [];
      f.update();
      p = true;
      r(f.before_update);
      f.fragment = !!s && s(f.ctx);
      if (o.target) {
        if (o.hydrate) {
          m = o.target;
          const t = Array.from(m.childNodes);
          if (f.fragment) {
            f.fragment.l(t);
          }
          t.forEach(removeEl);
        } else if (f.fragment) {
          f.fragment.c();
        }
        if (o.intro) {
          z(e.$$.fragment);
        }
        J(e, o.target, o.anchor, o.customElement);
        O();
      }
      var m;
      b(u);
    }
    function translation(t) {
      const e = window.CUSDIS_LOCALE || V;
      const n = e[t] || V[t];
      if (!e[t]) {
        console.warn(
          "[cusdis]",
          "translation of language key",
          `'${t}'`,
          "is missing.",
        );
      }
      return n;
    }
    function X(e) {
      let n;
      let o;
      let a;
      let f;
      let $;
      let b;
      let x;
      let k;
      let v;
      let _;
      let w;
      let C;
      let S;
      let I;
      let N;
      let L;
      let E;
      let R;
      let A;
      let O;
      let M;
      let T;
      let q =
        (e[3] ? translation("sending") : translation("post_comment")) + "";
      return {
        c() {
          n = createEl("div");
          o = createEl("div");
          a = createEl("div");
          f = createEl("label");
          f.textContent = `${translation("nickname")}`;
          $ = space();
          b = createEl("input");
          x = space();
          k = createEl("div");
          v = createEl("label");
          v.textContent = `${translation("email")}`;
          _ = space();
          w = createEl("input");
          C = space();
          S = createEl("div");
          I = createEl("label");
          I.textContent = `${translation("reply_placeholder")}`;
          N = space();
          L = createEl("textarea");
          E = space();
          R = createEl("div");
          A = createEl("button");
          O = d(q);
          setAttr(f, "class", "mb-2 block dark:text-gray-200");
          setAttr(f, "for", "nickname");
          setAttr(b, "name", "nickname");
          setAttr(
            b,
            "class",
            "w-full p-2 border border-gray-200 bg-transparent dark:text-gray-100 dark:outline-none",
          );
          setAttr(b, "type", "text");
          setAttr(b, "title", translation("nickname"));
          setAttr(a, "class", "px-1");
          setAttr(v, "class", "mb-2 block dark:text-gray-200");
          setAttr(v, "for", "email");
          setAttr(w, "name", "email");
          setAttr(
            w,
            "class",
            "w-full p-2 border border-gray-200 bg-transparent  dark:text-gray-100 dark:outline-none",
          );
          setAttr(w, "type", "email");
          setAttr(w, "title", translation("email"));
          setAttr(k, "class", "px-1");
          setAttr(o, "class", "grid grid-cols-2 gap-4");
          setAttr(I, "class", "mb-2 block dark:text-gray-200");
          setAttr(I, "for", "reply_content");
          setAttr(L, "name", "reply_content");
          setAttr(
            L,
            "class",
            "w-full p-2 border border-gray-200 h-24 bg-transparent dark:text-gray-100 dark:outline-none",
          );
          setAttr(L, "title", translation("reply_placeholder"));
          setAttr(S, "class", "px-1");
          setAttr(
            A,
            "class",
            "text-sm bg-gray-200 p-2 px-4 font-bold dark:bg-transparent dark:border dark:border-gray-100",
          );
          setClass(A, "cusdis-disabled", e[3]);
          setAttr(R, "class", "px-1");
          setAttr(n, "class", "details-form grid grid-cols-1 gap-4");
        },
        m(t, r) {
          i(t, n, r);
          s(n, o);
          s(o, a);
          s(a, f);
          s(a, $);
          s(a, b);
          h(b, e[1]);
          s(o, x);
          s(o, k);
          s(k, v);
          s(k, _);
          s(k, w);
          h(w, e[2]);
          s(n, C);
          s(n, S);
          s(S, I);
          s(S, N);
          s(S, L);
          h(L, e[0]);
          s(n, E);
          s(n, R);
          s(R, A);
          s(A, O);
          if (!M) {
            T = [
              p(b, "input", e[7]),
              p(w, "input", e[8]),
              p(L, "input", e[9]),
              p(A, "click", e[4]),
            ];
            M = true;
          }
        },
        p(t, [e]) {
          if (2 & e && b.value !== t[1]) {
            h(b, t[1]);
          }
          if (4 & e && w.value !== t[2]) {
            h(w, t[2]);
          }
          if (1 & e) {
            h(L, t[0]);
          }
          if (
            8 & e &&
            q !==
              (q =
                (t[3] ? translation("sending") : translation("post_comment")) +
                "")
          ) {
            g(O, q);
          }
          if (8 & e) {
            setClass(A, "cusdis-disabled", t[3]);
          }
        },
        i: t,
        o: t,
        d(t) {
          if (t) {
            removeEl(n);
          }
          M = false;
          r(T);
        },
      };
    }
    function Z(t, e, n) {
      let { parentId: r } = e;
      let o = "";
      let a = "";
      let s = "";
      let i = false;
      let { onSuccess: c } = e;
      const l = _("api");
      const d = _("setMessage");
      const { appId: u, pageId: f, pageUrl: p, pageTitle: m } = _("attrs");
      const g = _("refresh");
      t.$$set = (t) => {
        if ("parentId" in t) {
          n(5, (r = t.parentId));
        }
        if ("onSuccess" in t) {
          n(6, (c = t.onSuccess));
        }
      };
      return [
        o,
        a,
        s,
        i,
        async function () {
          if (o) {
            if (a) {
              try {
                n(3, (i = true));
                await l.post("/api/open/comments", {
                  appId: u,
                  pageId: f,
                  content: o,
                  nickname: a,
                  email: s,
                  parentId: r,
                  pageUrl: p,
                  pageTitle: m,
                });
                await g();
                n(0, (o = ""));
                n(1, (a = ""));
                n(2, (s = ""));
                if (c) {
                  c();
                }
                d(translation("comment_has_been_sent"));
              } finally {
                n(3, (i = false));
              }
            } else {
              alert(translation("nickname_is_required"));
            }
          } else {
            alert(translation("content_is_required"));
          }
        },
        r,
        c,
        function () {
          a = this.value;
          n(1, a);
        },
        function () {
          s = this.value;
          n(2, s);
        },
        function () {
          o = this.value;
          n(0, o);
        },
      ];
    }
    function et(t, e, n) {
      const r = t.slice();
      r[6] = e[n];
      return r;
    }
    function nt(e) {
      let n;
      let r;
      return {
        c() {
          n = createEl("div");
          r = createEl("span");
          r.textContent = `${translation("mod_badge")}`;
          setAttr(
            n,
            "class",
            "mr-2 dark:bg-gray-500 bg-gray-200 text-xs py-0.5 px-1 rounded dark:text-gray-100",
          );
        },
        m(t, e) {
          i(t, n, e);
          s(n, r);
        },
        p: t,
        d(t) {
          if (t) {
            removeEl(n);
          }
        },
      };
    }
    function rt(t) {
      let e;
      let n;
      let r = [];
      let o = new Map();
      let a = t[1].replies.data;
      const s = (t) => t[6].id;
      for (let i = 0; i < a.length; i += 1) {
        let e = et(t, a, i);
        let n = s(e);
        o.set(n, (r[i] = ot(n, e)));
      }
      return {
        c() {
          for (let t = 0; t < r.length; t += 1) {
            r[t].c();
          }
          e = f();
        },
        m(t, o) {
          for (let e = 0; e < r.length; e += 1) {
            r[e].m(t, o);
          }
          i(t, e, o);
          n = true;
        },
        p(t, n) {
          if (2 & n) {
            a = t[1].replies.data;
            j();
            r = D(r, n, s, 1, t, a, o, e.parentNode, F, ot, e, et);
            U();
          }
        },
        i(t) {
          if (!n) {
            for (let t = 0; t < a.length; t += 1) {
              z(r[t]);
            }
            n = true;
          }
        },
        o(t) {
          for (let e = 0; e < r.length; e += 1) {
            P(r[e]);
          }
          n = false;
        },
        d(t) {
          for (let e = 0; e < r.length; e += 1) {
            r[e].d(t);
          }
          if (t) {
            removeEl(e);
          }
        },
      };
    }
    function ot(t, e) {
      let n;
      let r;
      let o;
      r = new ct({ props: { isChild: true, comment: e[6] } });
      return {
        key: t,
        first: null,
        c() {
          n = f();
          H(r.$$.fragment);
          this.first = n;
        },
        m(t, e) {
          i(t, n, e);
          J(r, t, e);
          o = true;
        },
        p(t, n) {
          e = t;
          const o = {};
          if (2 & n) {
            o.comment = e[6];
          }
          r.$set(o);
        },
        i(t) {
          if (!o) {
            z(r.$$.fragment, t);
            o = true;
          }
        },
        o(t) {
          P(r.$$.fragment, t);
          o = false;
        },
        d(t) {
          if (t) {
            removeEl(n);
          }
          B(r, t);
        },
      };
    }
    function at(t) {
      let e;
      let n;
      let r;
      n = new tt({ props: { parentId: t[1].id, onSuccess: t[5] } });
      return {
        c() {
          e = createEl("div");
          H(n.$$.fragment);
          setAttr(
            e,
            "class",
            "comment-reply-box mt-4 pl-4 border-l-2 border-gray-200",
          );
        },
        m(t, o) {
          i(t, e, o);
          J(n, e, null);
          r = true;
        },
        p(t, e) {
          const r = {};
          if (2 & e) {
            r.parentId = t[1].id;
          }
          if (1 & e) {
            r.onSuccess = t[5];
          }
          n.$set(r);
        },
        i(t) {
          if (!r) {
            z(n.$$.fragment, t);
            r = true;
          }
        },
        o(t) {
          P(n.$$.fragment, t);
          r = false;
        },
        d(t) {
          if (t) {
            removeEl(e);
          }
          B(n);
        },
      };
    }
    function st(t) {
      let e;
      let n;
      let r;
      let o;
      let a;
      let f;
      let h;
      let $;
      let b;
      let x;
      let k;
      let v;
      let _;
      let w;
      let C;
      let S;
      let I;
      let N;
      let L =
        (t[1].moderator && t[1].moderator.displayName
          ? t[1].moderator.displayName
          : t[1].by_nickname) + "";
      let E = t[1].parsedCreatedAt + "";
      let R = t[1].parsedContent + "";
      let A = t[1].moderatorId && nt();
      let O = t[1].replies.data.length > 0 && rt(t);
      let M = t[0] && at(t);
      return {
        c() {
          e = createEl("div");
          n = createEl("div");
          r = createEl("div");
          o = d(L);
          a = space();
          if (A) {
            A.c();
          }
          f = space();
          h = createEl("div");
          $ = d(E);
          b = space();
          x = createEl("div");
          k = space();
          if (O) {
            O.c();
          }
          v = space();
          _ = createEl("div");
          w = createEl("button");
          w.textContent = `${translation("reply_btn")}`;
          C = space();
          if (M) {
            M.c();
          }
          setAttr(r, "class", "mr-2 font-medium dark:text-gray-100");
          setAttr(n, "class", "flex items-center");
          setAttr(h, "class", "text-gray-500 text-sm dark:text-gray-400");
          setAttr(x, "class", "my-2");
          setAttr(
            w,
            "class",
            "font-medium text-sm text-gray-500 dark:bg-transparent dark:text-gray-100",
          );
          setAttr(w, "type", "button");
          setAttr(e, "class", "comment my-4");
          setClass(e, "pl-4", t[2]);
          setClass(e, "border-l-2", t[2]);
          setClass(e, "border-color-gray-200", t[2]);
          setClass(e, "cusdis-indicator", t[3]);
        },
        m(c, l) {
          i(c, e, l);
          s(e, n);
          s(n, r);
          s(r, o);
          s(n, a);
          if (A) {
            A.m(n, null);
          }
          s(e, f);
          s(e, h);
          s(h, $);
          s(e, b);
          s(e, x);
          x.innerHTML = R;
          s(e, k);
          if (O) {
            O.m(e, null);
          }
          s(e, v);
          s(e, _);
          s(_, w);
          s(e, C);
          if (M) {
            M.m(e, null);
          }
          S = true;
          if (!I) {
            N = p(w, "click", t[4]);
            I = true;
          }
        },
        p(t, [r]) {
          if (
            (!S || 2 & r) &&
            L !==
              (L =
                (t[1].moderator && t[1].moderator.displayName
                  ? t[1].moderator.displayName
                  : t[1].by_nickname) + "")
          ) {
            g(o, L);
          }
          if (t[1].moderatorId) {
            if (A) {
              A.p(t, r);
            } else {
              A = nt();
              A.c();
              A.m(n, null);
            }
          } else if (A) {
            A.d(1);
            A = null;
          }
          if ((!S || 2 & r) && E !== (E = t[1].parsedCreatedAt + "")) {
            g($, E);
          }
          if ((!S || 2 & r) && R !== (R = t[1].parsedContent + "")) {
            x.innerHTML = R;
          }
          if (t[1].replies.data.length > 0) {
            if (O) {
              O.p(t, r);
              if (2 & r) {
                z(O, 1);
              }
            } else {
              O = rt(t);
              O.c();
              z(O, 1);
              O.m(e, v);
            }
          } else if (O) {
            j();
            P(O, 1, 1, () => {
              O = null;
            });
            U();
          }
          if (t[0]) {
            if (M) {
              M.p(t, r);
              if (1 & r) {
                z(M, 1);
              }
            } else {
              M = at(t);
              M.c();
              z(M, 1);
              M.m(e, null);
            }
          } else if (M) {
            j();
            P(M, 1, 1, () => {
              M = null;
            });
            U();
          }
          if (4 & r) {
            setClass(e, "pl-4", t[2]);
          }
          if (4 & r) {
            setClass(e, "border-l-2", t[2]);
          }
          if (4 & r) {
            setClass(e, "border-color-gray-200", t[2]);
          }
        },
        i(t) {
          if (!S) {
            z(O);
            z(M);
            S = true;
          }
        },
        o(t) {
          P(O);
          P(M);
          S = false;
        },
        d(t) {
          if (t) {
            removeEl(e);
          }
          if (A) {
            A.d();
          }
          if (O) {
            O.d();
          }
          if (M) {
            M.d();
          }
          I = false;
          N();
        },
      };
    }
    function it(t, e, n) {
      let { comment: r } = e;
      let { showReplyForm: o = false } = e;
      let { isChild: a = false } = e;
      const { showIndicator: s } = _("attrs");
      t.$$set = (t) => {
        if ("comment" in t) {
          n(1, (r = t.comment));
        }
        if ("showReplyForm" in t) {
          n(0, (o = t.showReplyForm));
        }
        if ("isChild" in t) {
          n(2, (a = t.isChild));
        }
      };
      return [
        o,
        r,
        a,
        s,
        (t) => {
          n(0, (o = !o));
        },
        () => {
          n(0, (o = false));
        },
      ];
    }
    function lt(t, e, n) {
      const r = t.slice();
      r[12] = e[n];
      r[14] = n;
      return r;
    }
    function dt(t, e, n) {
      const r = t.slice();
      r[15] = e[n];
      return r;
    }
    function ut(t) {
      function S(t, e) {
        if (t[3]) {
          return 0;
        } else {
          return 1;
        }
      }
      let innerDiv;
      let n;
      let r;
      let o;
      let spacer;
      let d;
      let f;
      let p;
      let g;
      let h;
      let $;
      let b;
      let x;
      let a;
      let v;
      let _ = t[4] && ft(t);
      r = new tt({});
      const w = [mt, pt];
      const C = [];
      p = S(t);
      g = C[p] = w[p](t);
      return {
        c() {
          innerDiv = createEl("div");
          if (_) {
            _.c();
          }
          n = space();
          H(r.$$.fragment);
          o = space();
          spacer = createEl("div");
          d = space();
          f = createEl("div");
          g.c();
          h = space();
          $ = createEl("div");
          b = space();
          x = createEl("div");
          // a = createEl("a");
          // a.textContent = `${translation("powered_by")}`;
          setAttr(spacer, "class", "my-8");
          setAttr(f, "class", "mt-4 px-1");
          setAttr($, "class", "my-8");
          // setAttr(a, "class", "underline ");
          // setAttr(a, "href", "https://cusdis.com");
          setAttr(
            x,
            "class",
            "text-center text-gray-500 dark:text-gray-100 text-xs",
          );
          setClass(innerDiv, "dark", t[1] === "dark");
        },
        m(t, c) {
          i(t, innerDiv, c);
          if (_) {
            _.m(innerDiv, null);
          }
          s(innerDiv, n);
          J(r, innerDiv, null);
          s(innerDiv, o);
          s(innerDiv, spacer);
          s(innerDiv, d);
          s(innerDiv, f);
          C[p].m(f, null);
          s(innerDiv, h);
          s(innerDiv, $);
          s(innerDiv, b);
          s(innerDiv, x);
          // s(x, a);
          v = true;
        },
        p(t, r) {
          if (t[4]) {
            if (_) {
              _.p(t, r);
            } else {
              _ = ft(t);
              _.c();
              _.m(innerDiv, n);
            }
          } else if (_) {
            _.d(1);
            _ = null;
          }
          let o = p;
          p = S(t);
          if (p === o) {
            C[p].p(t, r);
          } else {
            j();
            P(C[o], 1, 1, () => {
              C[o] = null;
            });
            U();
            g = C[p];
            if (g) {
              g.p(t, r);
            } else {
              g = C[p] = w[p](t);
              g.c();
            }
            z(g, 1);
            g.m(f, null);
          }
          if (2 & r) {
            setClass(innerDiv, "dark", t[1] === "dark");
          }
        },
        i(t) {
          if (!v) {
            z(r.$$.fragment, t);
            z(g);
            v = true;
          }
        },
        o(t) {
          P(r.$$.fragment, t);
          P(g);
          v = false;
        },
        d(t) {
          if (t) {
            removeEl(innerDiv);
          }
          if (_) {
            _.d();
          }
          B(r);
          C[p].d();
        },
      };
    }
    function ft(t) {
      let e;
      let n;
      return {
        c() {
          e = createEl("div");
          n = d(t[4]);
          setAttr(e, "class", "p-2 mb-4 bg-blue-500 text-white");
        },
        m(t, r) {
          i(t, e, r);
          s(e, n);
        },
        p(t, e) {
          if (16 & e) {
            g(n, t[4]);
          }
        },
        d(t) {
          if (t) {
            removeEl(e);
          }
        },
      };
    }
    function pt(t) {
      let e;
      let n;
      let r;
      let o = [];
      let a = new Map();
      let s = t[0].data;
      const l = (t) => t[15].id;
      for (let i = 0; i < s.length; i += 1) {
        let e = dt(t, s, i);
        let n = l(e);
        a.set(n, (o[i] = gt(n, e)));
      }
      let d = t[0].pageCount > 1 && ht(t);
      return {
        c() {
          for (let t = 0; t < o.length; t += 1) {
            o[t].c();
          }
          e = space();
          if (d) {
            d.c();
          }
          n = f();
        },
        m(t, a) {
          for (let e = 0; e < o.length; e += 1) {
            o[e].m(t, a);
          }
          i(t, e, a);
          if (d) {
            d.m(t, a);
          }
          i(t, n, a);
          r = true;
        },
        p(t, r) {
          if (1 & r) {
            s = t[0].data;
            j();
            o = D(o, r, l, 1, t, s, a, e.parentNode, F, gt, e, dt);
            U();
          }
          if (t[0].pageCount > 1) {
            if (d) {
              d.p(t, r);
            } else {
              d = ht(t);
              d.c();
              d.m(n.parentNode, n);
            }
          } else if (d) {
            d.d(1);
            d = null;
          }
        },
        i(t) {
          if (!r) {
            for (let t = 0; t < s.length; t += 1) {
              z(o[t]);
            }
            r = true;
          }
        },
        o(t) {
          for (let e = 0; e < o.length; e += 1) {
            P(o[e]);
          }
          r = false;
        },
        d(t) {
          for (let e = 0; e < o.length; e += 1) {
            o[e].d(t);
          }
          if (t) {
            removeEl(e);
          }
          if (d) {
            d.d(t);
          }
          if (t) {
            removeEl(n);
          }
        },
      };
    }
    function mt(e) {
      let n;
      return {
        c() {
          n = createEl("div");
          n.textContent = `${translation("loading")}...`;
          setAttr(n, "class", "text-gray-900 dark:text-gray-100");
          n.style =
            "position: absolute; bottom: 0; text-align: center; width: 100%; font-size: 0.875rem; opacity: 0.5";
        },
        m(t, e) {
          i(t, n, e);
        },
        p: t,
        i: t,
        o: t,
        d(t) {
          if (t) {
            removeEl(n);
          }
        },
      };
    }
    function gt(t, e) {
      let n;
      let r;
      let o;
      r = new ct({ props: { comment: e[15], firstFloor: true } });
      return {
        key: t,
        first: null,
        c() {
          n = f();
          H(r.$$.fragment);
          this.first = n;
        },
        m(t, e) {
          i(t, n, e);
          J(r, t, e);
          o = true;
        },
        p(t, n) {
          e = t;
          const o = {};
          if (1 & n) {
            o.comment = e[15];
          }
          r.$set(o);
        },
        i(t) {
          if (!o) {
            z(r.$$.fragment, t);
            o = true;
          }
        },
        o(t) {
          P(r.$$.fragment, t);
          o = false;
        },
        d(t) {
          if (t) {
            removeEl(n);
          }
          B(r, t);
        },
      };
    }
    function ht(t) {
      let e;
      let n = Array(t[0].pageCount);
      let r = [];
      for (let o = 0; o < n.length; o += 1) {
        r[o] = yt(lt(t, n, o));
      }
      return {
        c() {
          e = createEl("div");
          for (let t = 0; t < r.length; t += 1) {
            r[t].c();
          }
        },
        m(t, n) {
          i(t, e, n);
          for (let o = 0; o < r.length; o += 1) {
            r[o].m(e, null);
          }
        },
        p(t, o) {
          if (69 & o) {
            let a;
            n = Array(t[0].pageCount);
            for (a = 0; a < n.length; a += 1) {
              const s = lt(t, n, a);
              if (r[a]) {
                r[a].p(s, o);
              } else {
                r[a] = yt(s);
                r[a].c();
                r[a].m(e, null);
              }
            }
            r.length = n.length;
          }
        },
        d(t) {
          if (t) {
            removeEl(e);
          }
          (function (t, e) {
            for (let n = 0; n < t.length; n += 1) {
              if (t[n]) {
                t[n].d(e);
              }
            }
          })(r, t);
        },
      };
    }
    function yt(t) {
      function u(...e) {
        return t[8](t[14], ...e);
      }
      let e;
      let n;
      let r;
      let o;
      let a = t[14] + 1 + "";
      return {
        c() {
          e = createEl("button");
          n = d(a);
          setAttr(e, "class", "px-2 py-1 text-sm mr-2 dark:text-gray-200");
          setClass(e, "underline", t[2] === t[14] + 1);
        },
        m(t, a) {
          i(t, e, a);
          s(e, n);
          if (!r) {
            o = p(e, "click", u);
            r = true;
          }
        },
        p(n, r) {
          t = n;
          if (4 & r) {
            setClass(e, "underline", t[2] === t[14] + 1);
          }
        },
        d(t) {
          if (t) {
            removeEl(e);
          }
          r = false;
          o();
        },
      };
    }
    function $t(t) {
      let e;
      let n;
      let r = !t[5] && ut(t);
      return {
        c() {
          if (r) {
            r.c();
          }
          e = f();
        },
        m(t, o) {
          if (r) {
            r.m(t, o);
          }
          i(t, e, o);
          n = true;
        },
        p(t, [n]) {
          if (t[5]) {
            if (r) {
              j();
              P(r, 1, 1, () => {
                r = null;
              });
              U();
            }
          } else if (r) {
            r.p(t, n);
            if (32 & n) {
              z(r, 1);
            }
          } else {
            r = ut(t);
            r.c();
            z(r, 1);
            r.m(e.parentNode, e);
          }
        },
        i(t) {
          if (!n) {
            z(r);
            n = true;
          }
        },
        o(t) {
          P(r);
          n = false;
        },
        d(t) {
          if (r) {
            r.d(t);
          }
          if (t) {
            removeEl(e);
          }
        },
      };
    }
    function bt(t, e, n) {
      async function u(t = 1) {
        n(3, (i = true));
        try {
          const e = await d.get("/api/open/comments", {
            headers: { "x-timezone-offset": -new Date().getTimezoneOffset() },
            params: { page: t, appId: o.appId, pageId: o.pageId },
          });
          n(0, (a = e.data.data));
        } catch (e) {
          n(5, (r = e));
        } finally {
          n(3, (i = false));
        }
      }
      function f(t) {
        n(2, (s = t));
        u(t);
      }
      let r;
      let { attrs: o } = e;
      let { commentsResult: a } = e;
      let s = 1;
      let i = true;
      let c = "";
      let l = o.theme || "light";
      const d = Q.create({ baseURL: o.host });
      k(() => {
        function t(t) {
          try {
            const e = JSON.parse(t.data);
            if (e.from === "cusdis") {
              switch (e.event) {
                case "setTheme":
                  n(1, (l = e.data));
              }
            }
          } catch (e) {}
        }
        window.addEventListener("message", t);
        return () => {
          window.removeEventListener("message", t);
        };
      });
      v("api", d);
      v("attrs", o);
      v("refresh", u);
      v("setMessage", function (t) {
        n(4, (c = t));
      });
      k(() => {
        u();
      });
      t.$$set = (t) => {
        if ("attrs" in t) {
          n(7, (o = t.attrs));
        }
        if ("commentsResult" in t) {
          n(0, (a = t.commentsResult));
        }
      };
      t.$$.update = () => {
        if (2 & t.$$.dirty) {
          document.documentElement.dataset.colorScheme = l;
          document.documentElement.style.setProperty("color-scheme", l);
        }
      };
      return [a, l, s, i, c, r, f, o, (t, e) => f(t + 1)];
    }
    function _t(t, e = {}) {
      xt.postMessage(JSON.stringify({ from: "cusdis", event: t, data: e }));
    }
    function wt() {
      _t("resize", document.documentElement.offsetHeight);
    }
    let $;
    const w = [];
    const C = [];
    const S = [];
    const I = [];
    const N = Promise.resolve();
    let L = false;
    let R = false;
    const A = new Set();
    const T = new Set();
    let q;
    class K {
      $destroy() {
        B(this, 1);
        this.$destroy = t;
      }
      $on(t, e) {
        const n = this.$$.callbacks[t] || (this.$$.callbacks[t] = []);
        n.push(e);
        return () => {
          const t = n.indexOf(e);
          if (t !== -1) {
            n.splice(t, 1);
          }
        };
      }
      $set(t) {
        var e;
        if (this.$$set) {
          e = t;
          if (Object.keys(e).length !== 0) {
            this.$$.skip_bound = true;
            this.$$set(t);
            this.$$.skip_bound = false;
          }
        }
      }
    }
    var Q = (function t(e) {
      function n(t, e, r) {
        var o;
        var a = {};
        if (Array.isArray(t)) {
          return t.concat(e);
        }
        for (o in t) {
          a[r ? o.toLowerCase() : o] = t[o];
        }
        for (o in e) {
          var s = r ? o.toLowerCase() : o;
          var i = e[o];
          a[s] =
            s in a && typeof i == "object" ? n(a[s], i, s === "headers") : i;
        }
        return a;
      }
      function r(t, r, o, a) {
        if (typeof t != "string") {
          t = (r = t).url;
        }
        var s = { config: r };
        var i = n(e, r);
        var c = {};
        var l = a || i.data;
        (i.transformRequest || []).map(function (t) {
          l = t(l, i.headers) || l;
        });
        if (l && typeof l == "object" && typeof l.append != "function") {
          l = JSON.stringify(l);
          c["content-type"] = "application/json";
        }
        var d =
          typeof document != "undefined" &&
          document.cookie.match(
            RegExp("(^|; )" + i.xsrfCookieName + "=([^;]*)"),
          );
        if (d) {
          c[i.xsrfHeaderName] = d[2];
        }
        if (i.auth) {
          c.authorization = i.auth;
        }
        if (i.baseURL) {
          t = t.replace(/^(?!.*\/\/)\/?(.*)$/, i.baseURL + "/$1");
        }
        if (i.params) {
          var u = ~t.indexOf("?") ? "&" : "?";
          t +=
            u +
            (i.paramsSerializer
              ? i.paramsSerializer(i.params)
              : new URLSearchParams(i.params));
        }
        return (i.fetch || fetch)(t, {
          method: o || i.method,
          body: l,
          headers: n(i.headers, c, true),
          credentials: i.withCredentials ? "include" : "same-origin",
        }).then(function (t) {
          for (var e in t) {
            if (typeof t[e] != "function") {
              s[e] = t[e];
            }
          }
          var n = i.validateStatus ? i.validateStatus(t.status) : t.ok;
          if (i.responseType == "stream") {
            s.data = t.body;
            return s;
          } else {
            return t[i.responseType || "text"]()
              .then(function (t) {
                s.data = t;
                s.data = JSON.parse(t);
              })
              .catch(Object)
              .then(function () {
                if (n) {
                  return s;
                } else {
                  return Promise.reject(s);
                }
              });
          }
        });
      }
      e = e || {};
      r.request = r;
      r.get = function (t, e) {
        return r(t, e, "get");
      };
      r.delete = function (t, e) {
        return r(t, e, "delete");
      };
      r.head = function (t, e) {
        return r(t, e, "head");
      };
      r.options = function (t, e) {
        return r(t, e, "options");
      };
      r.post = function (t, e, n) {
        return r(t, n, "post", e);
      };
      r.put = function (t, e, n) {
        return r(t, n, "put", e);
      };
      r.patch = function (t, e, n) {
        return r(t, n, "patch", e);
      };
      r.all = Promise.all.bind(Promise);
      r.spread = function (t) {
        return function (e) {
          return t.apply(this, e);
        };
      };
      r.CancelToken =
        typeof AbortController == "function" ? AbortController : Object;
      r.defaults = e;
      r.create = t;
      return r;
    })();
    var V = {
      post_comment: "Comment",
      loading: "Loading",
      email: "Email (optional)",
      nickname: "Nickname",
      reply_placeholder: "Reply...",
      reply_btn: "Reply",
      sending: "sending...",
      mod_badge: "Author",
      content_is_required: "Content is required",
      nickname_is_required: "Nickname is required",
      comment_has_been_sent:
        "Your comment has been sent. Please wait for approval.",
    };
    class tt extends K {
      constructor(t) {
        super();
        G(this, t, Z, X, a, { parentId: 5, onSuccess: 6 });
      }
    }
    class ct extends K {
      constructor(t) {
        super();
        G(this, t, it, st, a, { comment: 1, showReplyForm: 0, isChild: 2 });
      }
    }
    window.CUSDIS = {};
    const xt = window.parent;
    const kt = document.querySelector("#root");
    const vt = window.__DATA__;
    new (class extends K {
      constructor(t) {
        super();
        G(this, t, bt, $t, a, { attrs: 7, commentsResult: 0 });
      }
    })({ target: kt, props: { attrs: vt } });
    _t("onload");
    wt();
    new MutationObserver(() => {
      wt();
    }).observe(kt, { childList: true, subtree: true });
  };
  if (typeof define == "function" && define.amd) {
    define(t);
  } else {
    t();
  }
})();
