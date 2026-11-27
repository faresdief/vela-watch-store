/* VELA upgrade layer: theme, deep links, compare, order tracking, a11y, perf. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var money = function (n) { return Number(n).toLocaleString("en-US") + " ج.م"; };
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var shop = function () { return (typeof SHOP !== "undefined" ? SHOP : { products: [], freeShipOver: 2500 }); };
  var byId = function (id) { return shop().products.filter(function (p) { return p.id === id; })[0]; };
  var toast = function (m) {
    var t = $("#toast"); if (!t) return;
    t.textContent = m; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2400);
  };
  var BASE = location.pathname;
  var baseTitle = document.title;

  /* ================= theme ================= */
  function applyTheme(t, animate) {
    var go = function () {
      if (t === "dark") document.documentElement.setAttribute("data-theme", "dark");
      else document.documentElement.removeAttribute("data-theme");
      var m = $('meta[name="theme-color"]');
      if (m) m.setAttribute("content", t === "dark" ? "#0D1824" : "#0B1C2C");
      $$(".theme-btn").forEach(function (b) { b.setAttribute("aria-pressed", t === "dark" ? "true" : "false"); b.setAttribute("aria-label", t === "dark" ? "الوضع الفاتح" : "الوضع الداكن"); });
    };
    if (animate && !RM && document.startViewTransition) document.startViewTransition(go);
    else go();
  }
  function curTheme() { return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function toggleTheme() {
    var n = curTheme() === "dark" ? "light" : "dark";
    try { localStorage.setItem("vela_theme", n); } catch (e) {}
    applyTheme(n, true);
  }
  applyTheme(curTheme(), false);
  $$("[data-action=theme]").forEach(function (b) { b.addEventListener("click", toggleTheme); });

  /* ================= product modal: compare button ================= */
  function productFromModal() {
    var h = $("#productDetail h2");
    if (!h) return null;
    var nm = h.textContent.trim();
    return shop().products.filter(function (p) { return p.name === nm; })[0] || null;
  }
  function onProductModal() {
    var open = $("#productModal").classList.contains("open");
    var p = open ? productFromModal() : null;
    if (p) injectModalTools(p);
  }
  function injectModalTools(p) {
    var buy = $(".pd-buy");
    if (!buy || $(".pd-tools")) return;
    var box = document.createElement("div");
    box.className = "pd-tools";
    box.innerHTML = '<button type="button" class="cmp-inline' + (cmp.indexOf(p.id) > -1 ? " on" : "") + '" id="pdCmp" aria-pressed="' + (cmp.indexOf(p.id) > -1) + '">قارن مع ساعة تانية</button>';
    buy.parentNode.insertBefore(box, buy.nextSibling);
    $("#pdCmp").onclick = function () {
      toggleCmp(p.id);
      var on = cmp.indexOf(p.id) > -1;
      this.classList.toggle("on", on); this.setAttribute("aria-pressed", on);
    };
  }

  /* ================= compare ================= */
  var cmp = (LS.get("vela_cmp", []) || []).filter(byId);
  var MAXC = 3;
  function toggleCmp(id) {
    var i = cmp.indexOf(id);
    if (i > -1) cmp.splice(i, 1);
    else {
      if (cmp.length >= MAXC) { toast("تقدر تقارن لحد " + MAXC + " ساعات"); return; }
      cmp.push(id);
    }
    LS.set("vela_cmp", cmp);
    syncCmp();
  }
  function syncCmp() {
    $$(".cmp-btn").forEach(function (b) {
      var on = cmp.indexOf(b.dataset.cmp) > -1;
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", on);
    });
    var tray = $("#cmpTray");
    if (!tray) return;
    tray.classList.toggle("show", cmp.length > 0);
    tray.setAttribute("aria-hidden", cmp.length ? "false" : "true");
    if ("inert" in tray) tray.inert = !cmp.length;
    $("#cmpThumbs").innerHTML = cmp.map(function (id) {
      var p = byId(id);
      return '<button type="button" data-cmp-rm="' + id + '" aria-label="شيل ' + p.name + ' من المقارنة" title="' + p.name + '"><img src="' + p.images[0].replace(/w=\d+/, "w=120") + '" alt="" width="40" height="40"></button>';
    }).join("");
    $("#cmpLabel").textContent = cmp.length + " / " + MAXC + " للمقارنة";
    $("#cmpGo").disabled = cmp.length < 2;
  }
  function openCompare() {
    if (cmp.length < 2) { toast("اختار ساعتين على الأقل"); return; }
    var ps = cmp.map(byId);
    var labels = [];
    ps.forEach(function (p) { p.specs.forEach(function (s) { if (labels.indexOf(s[0]) < 0) labels.push(s[0]); }); });
    var minP = Math.min.apply(null, ps.map(function (p) { return p.price; }));
    var maxR = Math.max.apply(null, ps.map(function (p) { return p.rating; }));
    var row = function (label, fn) { return "<tr><td>" + label + "</td>" + ps.map(function (p) { return "<td>" + fn(p) + "</td>"; }).join("") + "</tr>"; };
    var html = '<div class="cmp-body"><h2 id="cmpTitle">قارن الساعات</h2><p class="muted" style="font-size:13.5px">الأفضل في السعر والتقييم عليه ★</p>' +
      '<div class="cmp-wrap"><table class="cmp-table"><thead><tr><th><span class="sr-only">المواصفة</span></th>' +
      ps.map(function (p) { return '<th scope="col"><img src="' + p.images[0].replace(/w=\d+/, "w=240") + '" alt="' + p.name + '" width="84" height="104"><div class="nm">' + p.name + '</div><button type="button" data-cmp-rm="' + p.id + '">شيل</button></th>'; }).join("") +
      "</tr></thead><tbody>" +
      row("السعر", function (p) { return '<span class="' + (p.price === minP ? "win" : "") + '">' + money(p.price) + "</span>"; }) +
      row("التقييم", function (p) { return '<span class="' + (p.rating === maxR ? "win" : "") + '">' + p.rating + " (" + p.reviews + ")</span>"; }) +
      row("القسم", function (p) { return p.cat; }) +
      row("الألوان", function (p) { return p.colors.join("، "); }) +
      labels.map(function (l) {
        return row(l, function (p) { var s = p.specs.filter(function (x) { return x[0] === l; })[0]; return s ? s[1] : "—"; });
      }).join("") +
      row("", function (p) { return '<button type="button" class="btn btn-primary" data-add="' + p.id + '">أضف للسلة</button>'; }) +
      "</tbody></table></div></div>";
    $("#cmpBody").innerHTML = html;
    $("#overlay").hidden = false;
    $("#cmpModal").classList.add("open");
    $("#cmpModal").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    var b = t.closest && t.closest("[data-cmp]");
    if (b) { e.preventDefault(); e.stopPropagation(); toggleCmp(b.dataset.cmp); return; }
    var rm = t.closest && t.closest("[data-cmp-rm]");
    if (rm) {
      var i = cmp.indexOf(rm.dataset.cmpRm); if (i > -1) cmp.splice(i, 1);
      LS.set("vela_cmp", cmp); syncCmp();
      if ($("#cmpModal").classList.contains("open")) { if (cmp.length > 1) openCompare(); else { var c = $('[data-close="cmpModal"]'); if (c) c.click(); } }
      return;
    }
    if (t.closest && t.closest("#cmpGo")) { openCompare(); return; }
    if (t.closest && t.closest("#cmpClear")) { cmp = []; LS.set("vela_cmp", cmp); syncCmp(); return; }
  }, true);

  /* ================= grid decoration: compare btn, sort, image sizes ================= */
  var sortKey = "default";
  var decorating = false;
  function sortCards() {
    var grid = $("#productGrid");
    var cards = $$(".card[data-id]", grid);
    if (sortKey !== "default") {
      var val = function (c) { var p = byId(c.dataset.id); return p ? p : { price: 0, rating: 0 }; };
      var sorted = cards.slice().sort(function (a, b) {
        var x = val(a), y = val(b);
        if (sortKey === "price-asc") return x.price - y.price;
        if (sortKey === "price-desc") return y.price - x.price;
        if (sortKey === "rating") return y.rating - x.rating || y.reviews - x.reviews;
        return 0;
      });
      var changed = sorted.some(function (c, i) { return c !== cards[i]; });
      if (changed) sorted.forEach(function (c) { grid.appendChild(c); });
    }
  }
  function decorateGrid() {
    if (decorating) return;
    decorating = true;
    $$("#productGrid .card[data-id]").forEach(function (card, idx) {
      var id = card.dataset.id, p = byId(id);
      var media = $(".card-media", card);
      if (media && !$(".cmp-btn", media)) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "cmp-btn"; b.dataset.cmp = id;
        b.setAttribute("aria-pressed", cmp.indexOf(id) > -1);
        if (p) b.setAttribute("aria-label", "قارن " + p.name);
        b.innerHTML = "<i></i>قارن";
        if (cmp.indexOf(id) > -1) b.classList.add("on");
        media.appendChild(b);
      }
      var w = $(".wish-btn", card);
      if (w && p) { w.setAttribute("aria-label", "أضف " + p.name + " للمفضلة"); w.setAttribute("aria-pressed", w.classList.contains("on")); }
      var img = $(".card-media img", card);
      if (img && !img.dataset.opt) {
        img.dataset.opt = "1";
        var src = img.getAttribute("src") || "";
        if (src.indexOf("images.unsplash.com") > -1 && /w=\d+/.test(src)) {
          var mk = function (w) { return src.replace(/w=\d+/, "w=" + w); };
          img.setAttribute("srcset", mk(360) + " 360w, " + mk(560) + " 560w, " + mk(900) + " 900w");
          img.setAttribute("sizes", "(max-width:640px) 92vw, (max-width:980px) 45vw, 290px");
          img.setAttribute("src", mk(560));
        }
        img.setAttribute("width", "560"); img.setAttribute("height", "700");
        img.setAttribute("decoding", "async");
        if (idx < 2) { img.setAttribute("loading", "eager"); img.setAttribute("fetchpriority", "low"); }
      }
    });
    sortCards();
    var n = $$("#productGrid .card[data-id]").length;
    var rc = $("#resultCount");
    if (rc) rc.textContent = n + " ساعة";
    decorating = false;
  }
  var grid = $("#productGrid");
  if (grid) {
    new MutationObserver(decorateGrid).observe(grid, { childList: true });
  }
  var sel = $("#sortSel");
  if (sel) sel.addEventListener("change", function () { sortKey = sel.value; decorateGrid(); });

  /* ================= cart: free-shipping meter ================= */
  var foot = $("#cartFoot"), sub = $("#subTotal");
  if (foot && sub) {
    var meter = document.createElement("div");
    meter.className = "ship-meter"; meter.setAttribute("aria-live", "polite");
    meter.innerHTML = '<div id="shipMsg"></div><div class="ship-track"><span></span></div>';
    foot.insertBefore(meter, foot.firstChild);
    var upd = function () {
      var v = parseInt((sub.textContent || "").replace(/[^\d]/g, ""), 10) || 0;
      var lim = shop().freeShipOver || 2500;
      var left = lim - v;
      meter.classList.toggle("full", left <= 0);
      $("#shipMsg").innerHTML = left <= 0 ? "🎉 <b>الشحن عليك مجاني</b> على الأوردر ده" : "فاضل <b>" + money(left) + "</b> وتاخد شحن مجاني";
      $(".ship-track span", meter).style.width = Math.min(100, Math.round(v / lim * 100)) + "%";
    };
    new MutationObserver(upd).observe(sub, { childList: true, characterData: true, subtree: true });
    upd();
  }

  /* ================= a11y: focus management ================= */
  var panels = $$(".drawer,.modal,#searchOverlay");
  var lastFocus = null;
  function isOpen(el) { return el.id === "searchOverlay" ? !el.hidden : el.classList.contains("open"); }
  function syncPanels() {
    panels.forEach(function (el) {
      var open = isOpen(el);
      if ("inert" in el) el.inert = !open;
      if (open && !el._wasOpen) {
        el._wasOpen = true;
        lastFocus = document.activeElement;
        if (el.id !== "searchOverlay") {
          setTimeout(function () { var f = $(".close,[data-close],button,input,a[href]", el); if (f) f.focus({ preventScroll: true }); }, 80);
          el.setAttribute("role", el.getAttribute("role") || "dialog");
          el.setAttribute("aria-modal", "true");
        }
      } else if (!open && el._wasOpen) {
        el._wasOpen = false;
        if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
      }
    });
  }
  var mo = new MutationObserver(function () { syncPanels(); var pm = $("#productModal"); if (pm && pm._lastOpen !== isOpen(pm)) { pm._lastOpen = isOpen(pm); onProductModal(); } });
  panels.forEach(function (el) { mo.observe(el, { attributes: true, attributeFilter: ["class", "hidden", "aria-hidden"] }); });
  syncPanels();
  $("#productModal")._lastOpen = isOpen($("#productModal"));
  if ($("#productModal")._lastOpen) onProductModal();
  var pdet = $("#productDetail");
  if (pdet) new MutationObserver(function () { if (isOpen($("#productModal"))) onProductModal(); }).observe(pdet, { childList: true });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      var open = panels.filter(isOpen).pop();
      if (!open) return;
      var f = $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])', open).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "") && !panels.some(isOpen)) {
      e.preventDefault(); var sb = $("#searchBtn"); if (sb) sb.click();
    }
  });

  var burger = $("#burger"), nav = $("#mainNav");
  if (burger && nav) {
    burger.setAttribute("aria-controls", "mainNav");
    burger.setAttribute("aria-expanded", "false");
    new MutationObserver(function () { burger.setAttribute("aria-expanded", nav.classList.contains("open")); }).observe(nav, { attributes: true, attributeFilter: ["class"] });
  }
  $$(".nav-tools [data-act]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (nav) nav.classList.remove("open");
      var a = b.dataset.act;
      if (a === "search") $("#searchBtn").click();
      if (a === "orders") $("#ordersBtn").click();
      if (a === "theme") toggleTheme();
    });
  });

  /* ================= back to top ================= */
  var tt = $("#toTop");
  if (tt) {
    var tick = false;
    addEventListener("scroll", function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () { tt.classList.toggle("show", scrollY > 900); tick = false; });
    }, { passive: true });
    tt.addEventListener("click", function () { scrollTo({ top: 0, behavior: RM ? "auto" : "smooth" }); });
  }

  /* ================= misc perf / pwa ================= */
  $$("img:not([loading]):not(.hero-watch)").forEach(function (i) { i.loading = "lazy"; i.decoding = "async"; });
  syncCmp();
  decorateGrid();
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
})();
