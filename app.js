/* ================= VELA store — app ================= */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const money = n => n.toLocaleString("en-US") + " ج.م";
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  const GOVS = {
    "القاهرة": 50, "الجيزة": 50,
    "الإسكندرية": 70, "القليوبية": 70, "الشرقية": 70, "الدقهلية": 70, "الغربية": 70,
    "المنوفية": 70, "البحيرة": 70, "كفر الشيخ": 70, "دمياط": 70, "بورسعيد": 70,
    "الإسماعيلية": 70, "السويس": 70,
    "الفيوم": 85, "بني سويف": 85, "المنيا": 85, "أسيوط": 85, "سوهاج": 85,
    "قنا": 85, "الأقصر": 85, "أسوان": 85, "البحر الأحمر": 85, "مطروح": 85,
    "شمال سيناء": 85, "جنوب سيناء": 85, "الوادي الجديد": 85
  };

  let state = {
    cart: LS.get("vela_cart", []),
    wish: LS.get("vela_wish", []),
    orders: LS.get("vela_orders", []),
    coupon: LS.get("vela_coupon", null),
    cat: "الكل",
    q: ""
  };

  const P = () => SHOP.products;
  const byId = id => P().find(p => p.id === id);

  function save() {
    LS.set("vela_cart", state.cart);
    LS.set("vela_wish", state.wish);
    LS.set("vela_orders", state.orders);
    LS.set("vela_coupon", state.coupon);
  }

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------- totals ---------- */
  function subtotal() {
    return state.cart.reduce((s, it) => {
      const p = byId(it.id);
      return s + (p ? p.price * it.qty : 0);
    }, 0);
  }
  function discount() {
    if (!state.coupon) return 0;
    const rate = SHOP.coupons[state.coupon] || 0;
    return Math.round(subtotal() * rate);
  }
  function shipping(gov) {
    const sub = subtotal();
    if (!sub) return 0;
    if (sub >= SHOP.freeShipOver) return 0;
    if (!gov) return SHOP.shipCairo;
    return GOVS[gov] != null ? GOVS[gov] : SHOP.shipOther;
  }
  function grand(gov) {
    return Math.max(0, subtotal() - discount() + shipping(gov));
  }
  function cartQty() {
    return state.cart.reduce((s, it) => s + it.qty, 0);
  }

  /* ---------- counters ---------- */
  function syncCounters() {
    $("#cartCount").textContent = cartQty();
    const wc = $("#wishCount");
    wc.textContent = state.wish.length;
    wc.hidden = !state.wish.length;
    const oc = $("#ordersCount");
    oc.textContent = state.orders.length;
    oc.hidden = !state.orders.length;
  }

  /* ---------- product grid ---------- */
  function stars(r) {
    const full = Math.round(r);
    return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
  }

  function cardHTML(p) {
    const off = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    const wished = state.wish.includes(p.id);
    return `
      <article class="card" data-id="${p.id}">
        <div class="card-media">
          <img src="${p.images[0]}" alt="${p.name}" loading="lazy">
          ${p.badge ? `<span class="card-badge ${p.badge === "خصم" ? "sale" : ""}">${p.badge}</span>` : (off ? `<span class="card-badge sale">-${off}%</span>` : "")}
          <button class="wish-btn ${wished ? "on" : ""}" data-wish="${p.id}" aria-label="أضف للمفضلة">
            <svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-7-9.5A4 4 0 0 1 12 7a4 4 0 0 1 7 3.5C19 15.4 12 20 12 20z"/></svg>
          </button>
        </div>
        <div class="card-body">
          <span class="card-cat">${p.line}</span>
          <h3>${p.name}</h3>
          <p class="short">${p.short}</p>
          <div class="card-rating"><span class="stars">${stars(p.rating)}</span> ${p.rating} · ${p.reviews} تقييم</div>
          <div class="price-row">
            <span class="price">${money(p.price)}</span>
            ${p.oldPrice ? `<span class="old">${money(p.oldPrice)}</span>` : ""}
          </div>
          <div class="card-actions">
            <button class="btn btn-dark" data-add="${p.id}">أضف للسلة</button>
            <button class="btn btn-outline" data-view="${p.id}">تفاصيل</button>
          </div>
        </div>
      </article>`;
  }

  function renderGrid() {
    const list = P().filter(p =>
      (state.cat === "الكل" || p.cat === state.cat) &&
      (!state.q || (p.name + " " + p.line + " " + p.cat + " " + p.short + " " + p.colors.join(" ")).toLowerCase().includes(state.q.toLowerCase()))
    );
    $("#productGrid").innerHTML = list.map(cardHTML).join("");
    $("#gridEmpty").hidden = list.length > 0;
  }

  function renderChips() {
    $("#chips").innerHTML = SHOP.categories.map(c =>
      `<button class="chip ${c === state.cat ? "active" : ""}" data-cat="${c}">${c}</button>`
    ).join("");
  }

  /* ---------- cart ---------- */
  function addToCart(id, color, qty) {
    const p = byId(id);
    if (!p) return;
    color = color || p.colors[0];
    qty = qty || 1;
    const found = state.cart.find(it => it.id === id && it.color === color);
    if (found) found.qty += qty;
    else state.cart.push({ id, color, qty });
    save(); syncCounters(); renderCart();
    toast("تمت الإضافة للسلة ✓");
  }

  function renderCart() {
    const box = $("#cartItems");
    if (!state.cart.length) {
      box.innerHTML = `<div class="empty-state">السلة فاضية.<br>اختار ساعة من المجموعة وابدأ أوردرك.</div>`;
      $("#cartFoot").style.display = "none";
      return;
    }
    $("#cartFoot").style.display = "block";
    box.innerHTML = state.cart.map((it, i) => {
      const p = byId(it.id);
      if (!p) return "";
      return `
        <div class="cart-item">
          <img src="${p.images[0]}" alt="${p.name}">
          <div>
            <h4>${p.name}</h4>
            <div class="meta">${it.color}</div>
            <div class="p">${money(p.price * it.qty)}</div>
            <button class="remove" data-remove="${i}">حذف</button>
          </div>
          <div class="qty">
            <button data-dec="${i}" aria-label="أقل">−</button>
            <span>${it.qty}</span>
            <button data-inc="${i}" aria-label="أكتر">+</button>
          </div>
        </div>`;
    }).join("");
    $("#subTotal").textContent = money(subtotal());
    $("#shipFee").textContent = shipping() ? money(shipping()) : (subtotal() >= SHOP.freeShipOver ? "مجاني" : money(SHOP.shipCairo));
    const d = discount();
    $("#discountRow").hidden = !d;
    if (d) $("#discountVal").textContent = "− " + money(d);
    $("#grandTotal").textContent = money(grand());
  }

  /* ---------- wishlist ---------- */
  function toggleWish(id) {
    const i = state.wish.indexOf(id);
    if (i > -1) state.wish.splice(i, 1);
    else state.wish.push(id);
    save(); syncCounters(); renderGrid(); renderWish();
    toast(i > -1 ? "اتشالت من المفضلة" : "اتضافت للمفضلة ♥");
  }

  function renderWish() {
    const box = $("#wishList");
    if (!state.wish.length) {
      box.innerHTML = `<div class="empty-state">مفيش ساعات في المفضلة لسه.</div>`;
      return;
    }
    box.innerHTML = state.wish.map(id => {
      const p = byId(id);
      if (!p) return "";
      return `
        <div class="cart-item">
          <img src="${p.images[0]}" alt="${p.name}">
          <div>
            <h4>${p.name}</h4>
            <div class="meta">${p.cat}</div>
            <div class="p">${money(p.price)}</div>
            <button class="remove" data-unwish="${id}">حذف</button>
          </div>
          <button class="btn btn-dark" data-add="${id}" style="padding:9px 12px;border-radius:10px;font-size:12px">أضف</button>
        </div>`;
    }).join("");
  }

  /* ---------- product modal ---------- */
  let modalColor = null;
  function openProduct(id) {
    const p = byId(id);
    if (!p) return;
    modalColor = p.colors[0];
    $("#productDetail").innerHTML = `
      <div class="product-detail">
        <div>
          <div class="pd-gallery"><img id="pdMain" src="${p.images[0]}" alt="${p.name}"></div>
          <div class="pd-thumbs">
            ${p.images.map((src, i) => `<img src="${src}" data-thumb="${i}" class="${i === 0 ? "active" : ""}" alt="">`).join("")}
          </div>
        </div>
        <div class="pd-info">
          <span class="card-cat">${p.line}</span>
          <h2>${p.name}</h2>
          <div class="card-rating"><span class="stars">${stars(p.rating)}</span> ${p.rating} · ${p.reviews} تقييم</div>
          <div class="price-row"><span class="price">${money(p.price)}</span>${p.oldPrice ? `<span class="old">${money(p.oldPrice)}</span>` : ""}</div>
          <p class="desc">${p.desc}</p>
          <div class="pd-colors" id="pdColors">
            ${p.colors.map((c, i) => `<button data-color="${c}" class="${i === 0 ? "active" : ""}">${c}</button>`).join("")}
          </div>
          <div class="pd-specs">
            ${p.specs.map(s => `<div><span>${s[0]}</span><span>${s[1]}</span></div>`).join("")}
          </div>
          <div class="pd-buy">
            <div class="qty" style="border-color:rgba(11,28,44,.2)">
              <button id="pdDec" aria-label="أقل">−</button>
              <span id="pdQty">1</span>
              <button id="pdInc" aria-label="أكتر">+</button>
            </div>
            <button class="btn btn-primary" id="pdAdd">أضف للسلة</button>
          </div>
          <div class="pd-note">🚚 شحن لكل المحافظات · دفع عند الاستلام · ضمان سنة</div>
        </div>
      </div>`;

    let qty = 1;
    $("#pdInc").onclick = () => { qty++; $("#pdQty").textContent = qty; };
    $("#pdDec").onclick = () => { if (qty > 1) qty--; $("#pdQty").textContent = qty; };
    $("#pdAdd").onclick = () => { addToCart(p.id, modalColor, qty); closeAll(); openDrawer("cartDrawer"); };
    $$("#pdColors button").forEach(b => b.onclick = () => {
      modalColor = b.dataset.color;
      $$("#pdColors button").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
    $$(".pd-thumbs img").forEach(t => t.onclick = () => {
      $("#pdMain").src = p.images[+t.dataset.thumb];
      $$(".pd-thumbs img").forEach(x => x.classList.remove("active"));
      t.classList.add("active");
    });
    openModal("productModal");
  }

  /* ---------- drawers / modals ---------- */
  function openDrawer(id) {
    $("#overlay").hidden = false;
    $("#" + id).classList.add("open");
    $("#" + id).setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (id === "cartDrawer") renderCart();
    if (id === "wishDrawer") renderWish();
    if (id === "ordersDrawer") renderOrders();
  }
  function openModal(id) {
    $("#overlay").hidden = false;
    $("#" + id).classList.add("open");
    $("#" + id).setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeAll() {
    $$(".drawer").forEach(d => { d.classList.remove("open"); d.setAttribute("aria-hidden", "true"); });
    $$(".modal").forEach(m => { m.classList.remove("open"); m.setAttribute("aria-hidden", "true"); });
    $("#overlay").hidden = true;
    document.body.style.overflow = "";
  }

  /* ---------- checkout ---------- */
  let chosenGov = "القاهرة";
  let payMethod = "كاش عند الاستلام";

  function openCheckout() {
    if (!state.cart.length) { toast("السلة فاضية"); return; }
    chosenGov = "القاهرة";
    $("#checkoutBody").innerHTML = `
      <div class="checkout-body">
        <h2>بيانات الأوردر</h2>
        <p class="muted" style="font-size:13.5px">اكتب بياناتك وهنبعت الأوردر على واتساب لتأكيده معاك.</p>
        <form id="checkoutForm" novalidate>
          <div class="checkout-grid">
            <div class="field">
              <label for="cName">الاسم بالكامل *</label>
              <input id="cName" name="name" autocomplete="name" placeholder="مثال: أحمد محمود">
              <span class="err" id="eName"></span>
            </div>
            <div class="field">
              <label for="cPhone">رقم الموبايل *</label>
              <input id="cPhone" name="phone" inputmode="tel" autocomplete="tel" placeholder="01xxxxxxxxx">
              <span class="err" id="ePhone"></span>
            </div>
            <div class="field">
              <label for="cGov">المحافظة *</label>
              <select id="cGov" name="gov">
                ${Object.keys(GOVS).map(g => `<option value="${g}">${g}</option>`).join("")}
              </select>
              <span class="err"></span>
            </div>
            <div class="field">
              <label for="cArea">المنطقة / الحي</label>
              <input id="cArea" name="area" placeholder="مثال: مدينة نصر - عباس العقاد">
              <span class="err"></span>
            </div>
            <div class="field full">
              <label for="cAddr">العنوان بالتفصيل *</label>
              <input id="cAddr" name="addr" autocomplete="street-address" placeholder="اسم الشارع، رقم العمارة، الدور، الشقة">
              <span class="err" id="eAddr"></span>
            </div>
            <div class="field full">
              <label>طريقة الدفع</label>
              <div class="pay-options" id="payOptions">
                <label class="pay-opt active"><input type="radio" name="pay" value="كاش عند الاستلام" checked> كاش عند الاستلام (الأكثر طلباً)</label>
                <label class="pay-opt"><input type="radio" name="pay" value="تحويل إنستاباي"> تحويل إنستاباي / فودافون كاش (هيبعتلك البيانات على واتساب)</label>
              </div>
            </div>
            <div class="field full">
              <label for="cNote">ملاحظات (اختياري)</label>
              <textarea id="cNote" name="note" placeholder="وقت مناسب للتوصيل، مقاس السوار، تغليف هدية…"></textarea>
            </div>
          </div>
          <div class="order-recap" id="recap"></div>
          <div class="checkout-actions">
            <button type="submit" class="btn btn-wa">
              <svg viewBox="0 0 24 24"><path d="M4 20l1.2-4A8 8 0 1 1 8 18.8z"/><path d="M9 10.5c0 3 2.5 5 5 5 .8 0 1.4-.6 1.4-1.2l-1.7-.9-.9.9c-1-.4-1.9-1.3-2.3-2.3l.9-.9-.9-1.7c-.6 0-1.5.5-1.5 1.1z"/></svg>
              تأكيد الأوردر على واتساب
            </button>
          </div>
          <p class="fineprint">بالضغط على تأكيد، هيتفتح واتساب برسالة فيها تفاصيل الأوردر — ابعت الرسالة وهنرد عليك نأكد الشحن.</p>
        </form>
      </div>`;

    const refreshRecap = () => {
      $("#recap").innerHTML = `
        <h4>ملخص الأوردر</h4>
        ${state.cart.map(it => {
          const p = byId(it.id);
          return `<div class="recap-line"><span>${p.name} · ${it.color} × ${it.qty}</span><b>${money(p.price * it.qty)}</b></div>`;
        }).join("")}
        <div class="recap-line"><span>المجموع الفرعي</span><b>${money(subtotal())}</b></div>
        ${discount() ? `<div class="recap-line"><span>خصم (${state.coupon})</span><b>− ${money(discount())}</b></div>` : ""}
        <div class="recap-line"><span>الشحن (${chosenGov})</span><b>${shipping(chosenGov) ? money(shipping(chosenGov)) : "مجاني"}</b></div>
        <div class="recap-line t"><span>الإجمالي</span><b>${money(grand(chosenGov))}</b></div>`;
    };
    refreshRecap();

    $("#cGov").onchange = e => { chosenGov = e.target.value; refreshRecap(); };
    $$("#payOptions .pay-opt").forEach(opt => opt.onclick = () => {
      $$("#payOptions .pay-opt").forEach(o => o.classList.remove("active"));
      opt.classList.add("active");
      payMethod = opt.querySelector("input").value;
    });

    $("#checkoutForm").onsubmit = e => {
      e.preventDefault();
      const name = $("#cName").value.trim();
      const phone = $("#cPhone").value.replace(/\s|-/g, "");
      const addr = $("#cAddr").value.trim();
      const area = $("#cArea").value.trim();
      const note = $("#cNote").value.trim();
      let ok = true;
      $("#eName").textContent = ""; $("#ePhone").textContent = ""; $("#eAddr").textContent = "";
      if (name.length < 3) { $("#eName").textContent = "اكتب اسمك بالكامل"; ok = false; }
      if (!/^01[0125][0-9]{8}$/.test(phone)) { $("#ePhone").textContent = "رقم مصري غير صحيح (01xxxxxxxxx)"; ok = false; }
      if (addr.length < 8) { $("#eAddr").textContent = "اكتب العنوان بالتفصيل"; ok = false; }
      if (!ok) return;

      const no = "VELA-" + String(Date.now()).slice(-6);
      const lines = state.cart.map((it, i) => {
        const p = byId(it.id);
        return `${i + 1}) ${p.name} — ${it.color} — عدد ${it.qty} — ${money(p.price * it.qty)}`;
      });
      const msg = [
        "طلب جديد من موقع ڤيلا 🕐",
        "رقم الطلب: " + no,
        "———————————",
        ...lines,
        "———————————",
        "المجموع الفرعي: " + money(subtotal()),
        discount() ? "الخصم (" + state.coupon + "): − " + money(discount()) : null,
        "الشحن (" + chosenGov + "): " + (shipping(chosenGov) ? money(shipping(chosenGov)) : "مجاني"),
        "الإجمالي: " + money(grand(chosenGov)),
        "———————————",
        "الاسم: " + name,
        "الموبايل: " + phone,
        "المحافظة: " + chosenGov,
        area ? "المنطقة: " + area : null,
        "العنوان: " + addr,
        "الدفع: " + payMethod,
        note ? "ملاحظات: " + note : null
      ].filter(Boolean).join("\n");

      const order = {
        no, ts: Date.now(), name, phone, gov: chosenGov, area, addr, note,
        pay: payMethod, items: state.cart.map(it => ({ id: it.id, color: it.color, qty: it.qty })),
        subtotal: subtotal(), discount: discount(), shipping: shipping(chosenGov), total: grand(chosenGov)
      };
      state.orders.unshift(order);
      state.cart = [];
      state.coupon = null;
      save(); syncCounters(); renderCart(); renderGrid();

      const url = "https://wa.me/" + SHOP.whatsapp + "?text=" + encodeURIComponent(msg);
      window.open(url, "_blank");

      $("#checkoutBody").innerHTML = `
        <div class="success">
          <div class="tick">✓</div>
          <h2>الأوردر جاهز يا ${name.split(" ")[0]}</h2>
          <p>فتحنا لك واتساب برسالة فيها تفاصيل الأوردر — دوس <b>إرسال</b> وهنأكد معاك الشحن في أسرع وقت.</p>
          <div class="order-no">${no}</div>
          <p style="font-size:12.5px">لو واتساب مفتحش، اضغط هنا:</p>
          <a class="btn btn-wa" href="${url}" target="_blank" rel="noopener" style="margin-top:10px">افتح واتساب تاني</a>
          <div><button class="btn btn-outline" id="successClose" style="margin-top:14px">تمام، أكمل التسوق</button></div>
        </div>`;
      $("#successClose").onclick = closeAll;
    };

    openModal("checkoutModal");
  }

  /* ---------- orders ---------- */
  function renderOrders() {
    const box = $("#ordersList");
    if (!state.orders.length) {
      box.innerHTML = `<div class="empty-state">مفيش أوردرات لسه.<br>أول ما تعمل أوردر هيظهر هنا برقمه.</div>`;
      return;
    }
    box.innerHTML = state.orders.map(o => {
      const d = new Date(o.ts);
      const when = d.toLocaleDateString("ar-EG", { day: "numeric", month: "long" }) + " · " + d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
      const names = o.items.map(it => { const p = byId(it.id); return p ? p.name + " × " + it.qty : ""; }).filter(Boolean).join("، ");
      return `
        <div class="order-card">
          <div class="top"><span class="no">${o.no}</span><span class="st">في انتظار التأكيد</span></div>
          <div class="items">${names}</div>
          <div class="items">${when} · ${o.gov}</div>
          <div class="tot">${money(o.total)}</div>
        </div>`;
    }).join("");
  }

  /* ---------- search ---------- */
  function openSearch() {
    $("#searchOverlay").hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#searchInput").focus(), 60);
    renderSearch("");
  }
  function closeSearch() {
    $("#searchOverlay").hidden = true;
    document.body.style.overflow = "";
  }
  function renderSearch(q) {
    const list = P().filter(p => !q || (p.name + " " + p.line + " " + p.cat + " " + p.colors.join(" ")).toLowerCase().includes(q.toLowerCase()));
    $("#searchResults").innerHTML = list.length
      ? list.map(p => `
        <div class="sr-item" data-view="${p.id}">
          <img src="${p.images[0]}" alt="">
          <div><strong>${p.name}</strong><span>${p.cat} · ${money(p.price)}</span></div>
        </div>`).join("")
      : `<p style="color:rgba(244,241,234,.6)">مفيش نتايج للكلمة دي.</p>`;
  }

  /* ---------- global click handling ---------- */
  document.addEventListener("click", e => {
    const t = e.target;
    const add = t.closest("[data-add]");
    const view = t.closest("[data-view]");
    const wish = t.closest("[data-wish]");
    const chip = t.closest("[data-cat]");
    const close = t.closest("[data-close]");

    if (add) { e.preventDefault(); addToCart(add.dataset.add); return; }
    if (view) { e.preventDefault(); closeSearch(); openProduct(view.dataset.view); return; }
    if (wish) { e.preventDefault(); toggleWish(wish.dataset.wish); return; }
    if (chip) {
      e.preventDefault();
      state.cat = chip.dataset.cat;
      renderChips(); renderGrid();
      if (chip.closest(".site-footer")) { location.hash = "#shop"; }
      return;
    }
    if (close) { e.preventDefault(); closeAll(); return; }

    const inc = t.closest("[data-inc]"), dec = t.closest("[data-dec]"), rem = t.closest("[data-remove]"), unw = t.closest("[data-unwish]");
    if (inc) { state.cart[+inc.dataset.inc].qty++; save(); syncCounters(); renderCart(); return; }
    if (dec) {
      const i = +dec.dataset.dec;
      state.cart[i].qty--;
      if (state.cart[i].qty <= 0) state.cart.splice(i, 1);
      save(); syncCounters(); renderCart(); return;
    }
    if (rem) { state.cart.splice(+rem.dataset.remove, 1); save(); syncCounters(); renderCart(); return; }
    if (unw) { toggleWish(unw.dataset.unwish); return; }
  });

  /* ---------- wiring ---------- */
  function init() {
    renderChips();
    renderGrid();
    renderCart();
    renderWish();
    syncCounters();
    $("#year").textContent = new Date().getFullYear();

    $("#cartBtn").onclick = () => openDrawer("cartDrawer");
    $("#wishBtn").onclick = () => openDrawer("wishDrawer");
    $("#ordersBtn").onclick = () => openDrawer("ordersDrawer");
    $("#overlay").onclick = closeAll;
    $("#toCheckout").onclick = () => { closeAll(); openCheckout(); };
    $("#searchBtn").onclick = openSearch;
    $("#searchClose").onclick = closeSearch;
    $("#searchInput").addEventListener("input", e => renderSearch(e.target.value));
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { closeAll(); if (!$("#searchOverlay").hidden) closeSearch(); }
    });
    $("#burger").onclick = () => $("#mainNav").classList.toggle("open");
    $$("#mainNav a").forEach(a => a.onclick = () => $("#mainNav").classList.remove("open"));

    $("#couponBtn").onclick = () => {
      const code = $("#couponInput").value.trim().toUpperCase();
      if (SHOP.coupons[code]) {
        state.coupon = code;
        save(); renderCart();
        toast("الكود اتطبق: خصم " + Math.round(SHOP.coupons[code] * 100) + "%");
      } else {
        toast("الكود مش صحيح");
      }
    };

    /* deep link: ?p=orion opens a product */
    const m = new URLSearchParams(location.search).get("p");
    if (m && byId(m)) openProduct(m);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
