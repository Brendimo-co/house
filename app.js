// app.js
async function resizeImage(file, maxWidth = 1600) {
  return new Promise((res, rej) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(blob);
      }, file.type, 0.8);
    };
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('costForm');
  const toggleBtn = document.getElementById('toggleTotal');
  const totalInput = form.elements['total'];
  const qtyInput = form.elements['qty'];
  const unitPriceInput = form.elements['unitPrice'];
  const discountInput = form.elements['discount'];
  const payableInput = form.elements['payable'];

  let manualTotal = false;
  toggleBtn.addEventListener('click', () => {
    manualTotal = !manualTotal;
    totalInput.readOnly = !manualTotal;
    toggleBtn.textContent = manualTotal ? '🔓' : '🔒';
  });

  function updateTotals() {
    const qty = parseFloat(qtyInput.value) || 0;
    const unitPrice = parseFloat(unitPriceInput.value) || 0;
    let total = manualTotal ? (parseFloat(totalInput.value) || 0) : qty * unitPrice;
    totalInput.value = total.toFixed(2);
    const discount = parseFloat(discountInput.value) || 0;
    const payable = total - (total * discount / 100);
    payableInput.value = payable.toFixed(2);
  }

  [qtyInput, unitPriceInput, discountInput, totalInput].forEach(inp => {
    inp.addEventListener('input', updateTotals);
  });

  async function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Clear previous warnings
    form.querySelectorAll('.warning').forEach(w => w.textContent = '');
    let valid = true;
    Array.from(form.elements).forEach(el => {
      if (el.required && !el.value) {
        el.nextElementSibling.textContent = 'Bu sahə tələb olunur';
        valid = false;
      }
    });
    if (!valid) return;

    const data = {
      sharedSecret: CONFIG.sharedSecret,
      name: form.elements['name'].value,
      unit: form.elements['unit'].value,
      qty: form.elements['qty'].value,
      unitPrice: form.elements['unitPrice'].value,
      total: form.elements['total'].value,
      discount: form.elements['discount'].value,
      payable: form.elements['payable'].value,
      notes: form.elements['notes'].value,
      version: form.elements['version'].value
    };

    const file = form.elements['receipt'].files[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        form.elements['receipt'].nextElementSibling.textContent = 'Fayl çox böyük (8 MB‑dan çox)';
        return;
      }
      try {
        const dataUrl = await resizeImage(file, 1600);
        const [base64Header, b64] = dataUrl.split(',');
        data.receipt = {
          filename: file.name,
          mimeType: file.type,
          base64: dataUrl
        };
      } catch (err) {
        form.elements['receipt'].nextElementSibling.textContent = 'Şəkil işlənmədi';
        return;
      }
    }

    try {
      const resp = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await resp.json();
      if (result.status === 'success') {
        form.reset();
        manualTotal = false;
        totalInput.readOnly = true;
        toggleBtn.textContent = '🔒';
        updateTotals();
        showToast('Uğurla göndərildi!');
      } else {
        showToast('Xəta: ' + result.message);
      }
    } catch (err) {
      showToast('Şəbəkə xətası');
    }
  });
});
