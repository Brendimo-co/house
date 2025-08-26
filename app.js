(function () {
  // Sadə ID seçici qısayolu
  const $ = (id) => document.getElementById(id);

  // Formdakı bütün elementlərə rahat giriş üçün obyekt
  const f = {
    name: $("name"),
    unit: $("unit"),
    qty: $("qty"),
    unitPrice: $("unitPrice"),
    total: $("total"),
    lockBtn: $("lockBtn"),
    discountAZN: $("discountAZN"),
    payable: $("payable"),
    receipt: $("receipt"),
    notes: $("notes"),
    form: $("costForm"),
    submitBtn: $("submitBtn"),
    resetBtn: $("resetBtn"),
    toast: $("toast"),
    warn: $("warn")
  };

  let totalLocked = true; // 🔒 Kilidli rejim - avtomatik hesablama aktivdir

  // Məbləği 2 rəqəmli formata çevirir
  function money(n) {
    if (isNaN(n) || n === null) return "";
    return Number(n).toFixed(2);
  }

  // Str-dan ədədə çevirmə
  function num(v) {
    return parseFloat(v) || 0;
  }

  // Xəbərdarlıq mesajı göstər
  function setWarn(msg = "") {
    f.warn.textContent = msg || "";
  }

  // Toast mesajı (yuxarıda görünən status mesajı)
  function toast(msg, ok) {
    f.toast.className = "toast " + (ok === true ? "ok" : ok === false ? "err" : "");
    f.toast.textContent = msg || "";
  }

  // Total sahəsini avtomatik hesablama (qty × unitPrice)
  function calcTotalAuto() {
    return num(f.qty.value) * num(f.unitPrice.value);
  }

  // Cəm və ödənişi yenidən hesabla
  function recalc() {
    if (totalLocked) {
      const t = calcTotalAuto();
      f.total.value = money(Math.max(0, t));
    }
    const tval = num(f.total.value);
    let disc = num(f.discountAZN.value);
    if (disc > tval) {
      disc = tval;
      f.discountAZN.value = money(disc);
      setWarn("Endirim cəmdən çox ola bilməz; avtomatik düzəldildi.");
    } else {
      setWarn("");
    }
    const pay = Math.max(0, tval - disc);
    f.payable.value = money(pay);
  }

  // Canlı dəyişiklik üçün hadisələr
  ["qty", "unitPrice", "discountAZN", "total"].forEach(id => {
    $(id).addEventListener("input", () => {
      if (id === "total" && totalLocked) return; // total kilidliykən dəyişməyə icazə vermə
      recalc();
    });
  });

  // Cəm sahəsinin kilidini açıb-bağlama
  f.lockBtn.addEventListener("click", () => {
    totalLocked = !totalLocked;
    f.lockBtn.setAttribute("aria-pressed", (!totalLocked).toString());
    f.lockBtn.textContent = totalLocked ? "🔒" : "🔓";
    f.lockBtn.setAttribute("aria-label", totalLocked ? "Cəm qiymət kilidli" : "Cəm qiymət açıq");
    if (totalLocked) {
      f.total.classList.remove("invalid");
      recalc();
    }
  });

  // Formun sıfırlanması
  f.resetBtn.addEventListener("click", () => {
    f.form.reset();
    totalLocked = true;
    f.lockBtn.setAttribute("aria-pressed", "true");
    f.lockBtn.textContent = "🔒";
    toast(""); setWarn("");
    recalc();
  });

  // Şəkli base64 formatına çevir (Google Drive-a yükləmək üçün)
  async function fileToBase64(file) {
    if (!file) return null;
    const maxBytes = 8 * 1024 * 1024; // 8MB
    if (file.size > maxBytes) throw new Error("Şəkil 8MB-dan böyükdür.");
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  // Form doğrulaması
  function validate() {
    let ok = true;
    [f.name, f.unit, f.qty, f.unitPrice].forEach(el => {
      if (!el.value || (el.type === "number" && num(el.value) < 0)) {
        el.classList.add("invalid"); ok = false;
      } else {
        el.classList.remove("invalid");
      }
    });
    if (!totalLocked && num(f.total.value) < 0) {
      f.total.classList.add("invalid"); ok = false;
    } else {
      f.total.classList.remove("invalid");
    }
    return ok;
  }

  // Form göndərilməsi
  f.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    toast(""); setWarn("");

    if (!GAS_ENDPOINT || GAS_ENDPOINT.includes("XXXXXXXX")) {
      toast("Server URL (GAS_ENDPOINT) düzgün deyil. config.js faylını yeniləyin.", false);
      return;
    }

    if (!validate()) {
      toast("Zəhmət olmasa tələb olunan sahələri düzgün doldurun.", false);
      return;
    }

    try {
      f.submitBtn.disabled = true;

      const payload = {
        secret: SHARED_SECRET,
        userEmail: USER_EMAIL || "",
        project: "",
        name: f.name.value.trim(),
        unit: f.unit.value.trim(),
        qty: num(f.qty.value),
        unitPrice: num(f.unitPrice.value),
        total: num(f.total.value),
        totalMode: totalLocked ? "auto" : "manual",
        discountAZN: num(f.discountAZN.value),
        payable: Math.max(0, num(f.total.value) - num(f.discountAZN.value)),
        notes: f.notes.value.trim() || "",
        receiptBase64: null,
        receiptName: null,
        clientVersion: CLIENT_VERSION
      };

      if (f.receipt.files && f.receipt.files[0]) {
        payload.receiptBase64 = await fileToBase64(f.receipt.files[0]);
        payload.receiptName = f.receipt.files[0].name || "receipt.jpg";
      }

      // 🔥 CORS Bypass edilmiş fetch:
      const res = await fetch(GAS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8" // <-- vacib dəyişiklik
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Server xətası: " + res.status);

      const data = await res.json();
      if (data?.ok || data?.status === 'success') {
        toast("Yadda saxlandı ✔", true);
        f.form.reset();
        totalLocked = true;
        f.lockBtn.setAttribute("aria-pressed", "true");
        f.lockBtn.textContent = "🔒";
        recalc();
      } else {
        throw new Error(data?.message || "Naməlum xəta");
      }
    } catch (err) {
      toast(err.message || "Şəbəkə xətası. CORS və deployment ayarlarını yoxlayın.", false);
    } finally {
      f.submitBtn.disabled = false;
    }
  });

  recalc();
})();
