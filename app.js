(function () {
  const $ = (id) => document.getElementById(id);
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
    form: document.getElementById("costForm"),
    submitBtn: $("submitBtn"),
    resetBtn: $("resetBtn"),
    toast: $("toast"),
    warn: $("warn"),
    ver: $("ver")
  };

  if (f.ver) f.ver.textContent = (typeof CLIENT_VERSION !== "undefined" ? CLIENT_VERSION : "");

  let totalLocked = true; // 🔒 default

  const num = (v) => parseFloat(v) || 0;
  const money = (n) => (isNaN(n) || n === null) ? "" : Number(n).toFixed(2);
  const setWarn = (msg="") => f.warn.textContent = msg || "";
  const toast = (msg, ok) => {
    f.toast.className = "toast " + (ok===true ? "ok" : ok===false ? "err" : "");
    f.toast.textContent = msg || "";
  };

  function calcTotalAuto(){ return num(f.qty.value) * num(f.unitPrice.value); }

  function recalc(){
    if (totalLocked){
      f.total.value = money(Math.max(0, calcTotalAuto()));
    }
    let t = num(f.total.value);
    let d = num(f.discountAZN.value);
    if (d > t){ d = t; f.discountAZN.value = money(d); setWarn("Endirim cəmdən çox ola bilməz; avtomatik düzəldildi."); }
    else setWarn("");
    f.payable.value = money(Math.max(0, t - d));
  }

  // Inputs → recalc
  ["qty","unitPrice","discountAZN","total"].forEach(id=>{
    $(id).addEventListener("input", () => {
      if (id === "total" && totalLocked) return; // ignore manual edits while locked
      recalc();
    });
  });

  // Lock/unlock
  f.lockBtn.addEventListener("click", () => {
    totalLocked = !totalLocked;
    f.lockBtn.setAttribute("aria-pressed", (!totalLocked).toString());
    f.lockBtn.textContent = totalLocked ? "🔒" : "🔓";
    f.lockBtn.setAttribute("aria-label", totalLocked ? "Cəm qiymət kilidli" : "Cəm qiymət açıq");
    if (totalLocked) { f.total.classList.remove("invalid"); recalc(); }
  });

  f.resetBtn.addEventListener("click", () => {
    f.form.reset();
    totalLocked = true;
    f.lockBtn.setAttribute("aria-pressed", "true");
    f.lockBtn.textContent = "🔒";
    toast(""); setWarn("");
    recalc();
  });

  // ---- Image compression (mobile-friendly & fast uploads)
  async function compressImage(file, maxW = 1600, maxH = 1600, quality = 0.8){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const cw = Math.round(img.width * ratio), ch = Math.round(img.height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, cw, ch);
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error("Şəkli sıxmaq alınmadı."));
          const out = new File([blob], (file.name || "receipt").replace(/\.(\w+)$/,".jpg"), { type: "image/jpeg" });
          resolve(out);
        }, "image/jpeg", quality);
      };
      img.onerror = () => reject(new Error("Şəkil yüklənmədi."));
      const reader = new FileReader();
      reader.onload = e => { img.src = e.target.result; };
      reader.onerror = () => reject(new Error("Şəkil oxunmadı."));
      reader.readAsDataURL(file);
    });
  }

  async function fileToBase64(file) {
    if (!file) return null;
    const compressed = await compressImage(file, 1600, 1600, 0.8);
    const maxBytes = 8 * 1024 * 1024; // 8MB guard
    if (compressed.size > maxBytes) throw new Error("Şəkil 8MB-dan böyükdür.");
    const buf = await compressed.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function validate(){
    let ok = true;
    [f.name, f.unit, f.qty, f.unitPrice].forEach(el=>{
      if (!el.value || (el.type==="number" && num(el.value) < 0)){
        el.classList.add("invalid"); ok = false;
      } else {
        el.classList.remove("invalid");
      }
    });
    if (!totalLocked && num(f.total.value) < 0){ f.total.classList.add("invalid"); ok = false; }
    else f.total.classList.remove("invalid");
    return ok;
  }

  f.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    toast(""); setWarn("");

    if (!GAS_ENDPOINT || GAS_ENDPOINT.includes("XXXXXXXX")) {
      toast("Server URL (GAS_ENDPOINT) düzgün deyil. config.js faylını yeniləyin.", false);
      return;
    }
    if (!validate()){
      toast("Zəhmət olmasa tələb olunan sahələri düzgün doldurun.", false);
      return;
    }

    try {
      f.submitBtn.disabled = true;

      const payload = {
        secret: SHARED_SECRET,
        userEmail: (typeof USER_EMAIL !== "undefined" ? USER_EMAIL : "") || "",
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
        clientVersion: (typeof CLIENT_VERSION !== "undefined" ? CLIENT_VERSION : "cost-v2")
      };

      if (f.receipt.files && f.receipt.files[0]){
        payload.receiptBase64 = await fileToBase64(f.receipt.files[0]);
        payload.receiptName = f.receipt.files[0].name || "receipt.jpg";
      }

      const res = await fetch(GAS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Server xətası: " + res.status);
      const data = await res.json();
      if (data?.ok){
        toast("Yadda saxlandı ✔", true);
        f.form.reset();
        totalLocked = true;
        f.lockBtn.setAttribute("aria-pressed","true");
        f.lockBtn.textContent = "🔒";
        recalc();
      } else {
        throw new Error(data?.error || "Naməlum xəta");
      }
    } catch (err) {
      toast(err.message || "Şəbəkə xətası. CORS və deployment ayarlarını yoxlayın.", false);
    } finally {
      f.submitBtn.disabled = false;
    }
  });

  // First paint
  recalc();
})();
