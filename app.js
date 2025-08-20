(function () {
  const el = (id) => document.getElementById(id);
  const name = el("name");
  const unit = el("unit");
  const qty = el("qty");
  const unitPrice = el("unitPrice");
  const total = el("total");
  const discountPct = el("discountPct");
  const discounted = el("discounted");
  const receipt = el("receipt");
  const notes = el("notes");
  const toast = el("toast");
  const form = document.getElementById("costForm");
  const submitBtn = el("submitBtn");
  const resetBtn = el("resetBtn");

  function money(n) {
    if (isNaN(n) || n === null) return "";
    return Number(n).toFixed(2);
  }

  function recalc() {
    const q = parseFloat(qty.value) || 0;
    const p = parseFloat(unitPrice.value) || 0;
    const t = q * p;
    total.value = money(t);

    const d = parseFloat(discountPct.value) || 0;
    const disc = d > 0 ? t * (1 - d / 100) : t;
    discounted.value = money(disc);
  }

  qty.addEventListener("input", recalc);
  unitPrice.addEventListener("input", recalc);
  discountPct.addEventListener("input", recalc);

  resetBtn.addEventListener("click", () => {
    form.reset();
    recalc();
    toast.className = "toast";
    toast.textContent = "";
  });

  async function fileToBase64(file) {
    if (!file) return null;
    const maxBytes = 8 * 1024 * 1024; // 8MB guard
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

  function notify(msg, ok=false) {
    toast.className = "toast " + (ok ? "ok" : "err");
    toast.textContent = msg;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    toast.className = "toast";
    toast.textContent = "";

    if (!name.value.trim() || !unit.value.trim()) {
      notify("Zəhmət olmasa bütün tələb olunan sahələri doldurun.");
      return;
    }

    try {
      submitBtn.disabled = true;

      const payload = {
        secret: SHARED_SECRET,
        name: name.value.trim(),
        unit: unit.value.trim(),
        qty: parseFloat(qty.value) || 0,
        unitPrice: parseFloat(unitPrice.value) || 0,
        total: parseFloat(total.value) || 0,
        discountPct: parseFloat(discountPct.value) || 0,
        discounted: parseFloat(discounted.value) || 0,
        notes: notes.value.trim() || "",
        receipt: null,           // base64 string
        receiptName: null        // original filename
      };

      if (receipt.files && receipt.files[0]) {
        payload.receipt = await fileToBase64(receipt.files[0]);
        payload.receiptName = receipt.files[0].name || "receipt.jpg";
      }

      const res = await fetch(GAS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Server xətası: " + res.status);
      const data = await res.json();

      if (data?.ok) {
        notify("Yadda saxlandı ✔", true);
        form.reset();
        recalc();
      } else {
        throw new Error(data?.error || "Naməlum xəta");
      }
    } catch (err) {
      notify(err.message || "Xəta baş verdi.");
    } finally {
      submitBtn.disabled = false;
    }
  });

  // initial
  recalc();
})();
