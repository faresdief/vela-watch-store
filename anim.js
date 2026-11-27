/* VELA motion layer */
(function () {
  "use strict";
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && matchMedia("(hover:hover) and (pointer:fine)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  document.documentElement.classList.add("js");

  /* scroll progress + header state + hero parallax */
  var bar = document.createElement("div"); bar.className = "scroll-bar"; document.body.appendChild(bar);
  var hdr = $("#header"), watch = $(".hero-watch"), ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, scrollY / h) : 0) + ")";
      if (hdr) hdr.classList.toggle("scrolled", scrollY > 20);
      if (watch && !RM && scrollY < innerHeight * 1.2) watch.style.setProperty("--py", (scrollY * -0.06) + "px");
      ticking = false;
    });
  }
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* scroll reveal */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }) : null;
  function reveal(el, i, cls) {
    if (!el || el.classList.contains("rv")) return;
    el.classList.add("rv"); if (cls) el.classList.add(cls);
    el.style.setProperty("--i", i || 0);
    if (io) io.observe(el); else el.classList.add("in");
  }
  function group(sel, cls, perRow) {
    $$(sel).forEach(function (el, i) { reveal(el, perRow ? i % perRow : i, cls); });
  }
  group(".trust-item", "", 4);
  group(".section-head");
  group(".chips");
  group(".review", "", 3);
  group(".story-copy"); group(".story-visual", "from-side");
  group(".faq-head"); group(".faq-list details", "", 5);
  group(".cta-inner", "zoom");
  group(".footer-col", "", 3); group(".footer-brand");

  /* product grid: stagger on filter change, silent on re-render */
  var grid = $("#productGrid"), lastKey = null, seenIds = {};
  function gridKey() { var a = $(".chip.active"); return (a ? a.textContent : "") + "|" + ($("#searchInput") ? "" : ""); }
  function markCards() {
    var key = gridKey(), changed = key !== lastKey; lastKey = key;
    $$(".card", grid).forEach(function (c, i) {
      if (c.classList.contains("rv")) return;
      var id = (c.querySelector("[data-view]") || {}).dataset ? c.querySelector("[data-view]").dataset.view : "c" + i;
      if (!changed && seenIds[id]) { c.classList.add("rv", "seen"); return; }
      seenIds[id] = 1;
      c.classList.add("rv"); c.style.setProperty("--i", i % 4);
      if (changed && lastKey !== null && grid.dataset.ready) { c.classList.add("in"); c.style.setProperty("--i", Math.min(i, 8)); }
      else if (io) io.observe(c); else c.classList.add("in");
    });
    grid.dataset.ready = "1";
  }
  if (grid) { markCards(); new MutationObserver(markCards).observe(grid, { childList: true }); }

  /* stagger index + "fresh" state for drawers and modals */
  function indexKids(root, sel) { $$(sel, root).forEach(function (el, i) { el.style.setProperty("--k", i); }); }
  function fresh(el) {
    el.classList.remove("fresh"); void el.offsetWidth; el.classList.add("fresh");
    clearTimeout(el._ft); el._ft = setTimeout(function () { el.classList.remove("fresh"); }, 1500);
  }
  function prep(el) {
    indexKids(el, ".drawer-body>*"); indexKids(el, ".pd-info>*"); indexKids(el, ".pd-thumbs img");
    indexKids(el, "#checkoutBody>*"); indexKids(el, "#checkoutBody form>*");
  }
  $$(".drawer,.modal").forEach(function (el) {
    var was = el.classList.contains("open");
    new MutationObserver(function () {
      var now = el.classList.contains("open");
      if (now && !was) { prep(el); fresh(el); }
      was = now;
    }).observe(el, { attributes: true, attributeFilter: ["class"] });
  });
  var cb = $("#checkoutBody");
  if (cb) new MutationObserver(function () {
    var m = $("#checkoutModal"); if (m.classList.contains("open")) { prep(m); fresh(m); }
  }).observe(cb, { childList: true });
  var pdet = $("#productDetail");
  if (pdet) new MutationObserver(function () { prep($("#productModal")); }).observe(pdet, { childList: true });
  var sres = $("#searchResults");
  if (sres) new MutationObserver(function () { indexKids(sres, ".sr-item"); }).observe(sres, { childList: true });

  /* product modal main image swap */
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-thumb]");
    if (t) { var m = $("#pdMain"); if (m) { m.classList.remove("swap"); void m.offsetWidth; m.classList.add("swap"); } }
  });

  /* badge bump when counts change */
  ["#cartCount", "#wishCount", "#ordersCount"].forEach(function (s) {
    var el = $(s); if (!el) return;
    new MutationObserver(function () {
      el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });

  if (RM) return;

  /* ripple */
  document.addEventListener("pointerdown", function (e) {
    var b = e.target.closest && e.target.closest(".btn");
    if (!b) return;
    var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height);
    var d = document.createElement("span"); d.className = "ripple";
    d.style.cssText = "width:" + s + "px;height:" + s + "px;left:" + (e.clientX - r.left - s / 2) + "px;top:" + (e.clientY - r.top - s / 2) + "px";
    b.appendChild(d); setTimeout(function () { d.remove(); }, 700);
  });

  /* fly to cart */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-add],#pdAdd");
    var cart = $("#cartBtn");
    if (!a || !cart || !a.animate) return;
    var s = a.getBoundingClientRect(), c = cart.getBoundingClientRect();
    var dot = document.createElement("div"); dot.className = "fly-dot"; document.body.appendChild(dot);
    var x0 = s.left + s.width / 2 - 8, y0 = s.top + s.height / 2 - 8, x1 = c.left + c.width / 2 - 8, y1 = c.top + c.height / 2 - 8;
    var an = dot.animate([
      { transform: "translate(" + x0 + "px," + y0 + "px) scale(1.4)", opacity: 1 },
      { transform: "translate(" + ((x0 + x1) / 2) + "px," + (Math.min(y0, y1) - 80) + "px) scale(1)", opacity: 1, offset: .5 },
      { transform: "translate(" + x1 + "px," + y1 + "px) scale(.3)", opacity: .2 }
    ], { duration: 750, easing: "cubic-bezier(.5,0,.3,1)" });
    an.onfinish = function () { dot.remove(); };
  }, true);

  /* card tilt (desktop pointer only) */
  if (fine && grid) {
    var raf = 0;
    grid.addEventListener("pointermove", function (e) {
      var c = e.target.closest(".card"); if (!c) return;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0; var r = c.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.setProperty("--ry", (-x * 9).toFixed(2) + "deg"); c.style.setProperty("--rx", (y * 9).toFixed(2) + "deg");
        c.classList.add("tilt");
      });
    });
    grid.addEventListener("pointerout", function (e) {
      var c = e.target.closest(".card"); if (c && !c.contains(e.relatedTarget)) c.classList.remove("tilt");
    });
    var stage = $(".hero-stage");
    if (stage && watch) stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      watch.style.setProperty("--px", (((e.clientX - r.left) / r.width - .5) * -16).toFixed(1) + "px");
    });
  }

  /* stat count-up (Arabic digits kept) */
  var AR = "٠١٢٣٤٥٦٧٨٩";
  function toAr(n) { return String(n).replace(/\d/g, function (d) { return AR[d]; }); }
  $$(".hero-stats strong").forEach(function (el) {
    var txt = el.textContent, m = txt.match(/[٠-٩]+/);
    if (!m) return;
    var target = parseInt(m[0].replace(/[٠-٩]/g, function (d) { return AR.indexOf(d); }), 10), t0;
    if (!target || /\./.test(txt)) return;
    var pre = txt.slice(0, m.index), post = txt.slice(m.index + m[0].length);
    function step(ts) {
      if (!t0) t0 = ts; var p = Math.min(1, (ts - t0) / 1400), v = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = pre + toAr(v) + post; if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = pre + toAr(0) + post;
    setTimeout(function () { requestAnimationFrame(step); }, 1500);
  });
})();
