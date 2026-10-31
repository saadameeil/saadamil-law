/**
 * المكتب القضائي - سعد أميل (Saad Amil)
 * محرك معالجة الاستشارات التنفيذية وسداد تطبيق سوبر
 */

const LAWYER_WHATSAPP = "9647700000000"; // رقم الواتساب المعتمد للمحامي

const bookingState = {
    clientName: "",
    clientPhone: "",
    clientLocation: "",
    caseType: "",
    caseDetails: "",
    planPrice: 25000,
    planTitle: "استشارة إجرائية مكتوبة",
    receiptUploaded: false
};

// Selection of Consultation Tier
function selectPricing(element, price, title) {
    document.querySelectorAll('.tier-card').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    const radio = element.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;

    bookingState.planPrice = price;
    bookingState.planTitle = title;
}

// Form Submit -> Modal
function handleConsultationSubmit(e) {
    e.preventDefault();

    bookingState.clientName = document.getElementById('clientName').value.trim();
    bookingState.clientPhone = document.getElementById('clientPhone').value.trim();
    bookingState.clientLocation = document.getElementById('clientLocation').value.trim();
    bookingState.caseType = document.getElementById('caseType').value;
    bookingState.caseDetails = document.getElementById('caseDetails').value.trim();

    document.getElementById('summaryClientName').innerText = bookingState.clientName;
    document.getElementById('summaryPlanName').innerText = bookingState.planTitle;
    document.getElementById('summaryAmount').innerText = bookingState.planPrice.toLocaleString('ar-IQ') + " د.ع";

    document.getElementById('superModal').classList.add('active');
}

function closeSuperModal() {
    document.getElementById('superModal').classList.remove('active');
}

// Copy Super ID
function copySuperAccount() {
    const acc = document.getElementById('superAccNumber').innerText;
    navigator.clipboard.writeText(acc).then(() => {
        showToast("تم نسخ معرف سوبر بنجاح");
    }).catch(() => {
        showToast("المعرف: " + acc);
    });
}

// Receipt Upload Preview
function handleReceiptSelected(event) {
    const file = event.target.files[0];
    if (file) {
        bookingState.receiptUploaded = true;
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('receiptPreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById('uploadText').innerText = `المستند المرفق: ${file.name}`;
        };
        reader.readAsDataURL(file);
        showToast("تم إرفاق إشعار التحويل");
    }
}

// Dispatch to WhatsApp
function finishAndSendWhatsApp() {
    const textMsg = `طلب استشارة قضائية
المحامي سعد أميل (Saad Amil)
-----------------------------------
المستشير: ${bookingState.clientName}
رقم الهاتف: ${bookingState.clientPhone}
المحافظة / المحكمة: ${bookingState.clientLocation || 'غير محدد'}
نوع النزاع: ${bookingState.caseType}
نوع الاستشارة: ${bookingState.planTitle} (${bookingState.planPrice.toLocaleString('ar-IQ')} د.ع)
-----------------------------------
موجز الوقائع:
${bookingState.caseDetails}
-----------------------------------
حالة السداد: تم التحويل عبر تطبيق سوبر (Super App)، ومرفق إشعار التحويل.`;

    const encodedText = encodeURIComponent(textMsg);
    const waUrl = `https://wa.me/${LAWYER_WHATSAPP}?text=${encodedText}`;

    showToast("جاري توجيهك إلى واتساب المحامي سعد أميل...");
    
    setTimeout(() => {
        window.open(waUrl, '_blank');
        closeSuperModal();
    }, 1000);
}

// Toast
function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2800);
}
