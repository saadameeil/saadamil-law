/**
 * المنصة الرقمية الرسمية - المحامي سعد أميل (Saad Amil)
 * محرك حجز الاستشارات والدفع عبر تطبيق سوبر وإرسال الواتساب
 */

// Lawyer's WhatsApp Number (Can be customized)
const LAWYER_WHATSAPP = "9647700000000"; // Replace with lawyer's actual number

// State
const bookingState = {
    clientName: "",
    clientPhone: "",
    clientLocation: "",
    caseType: "",
    caseDetails: "",
    planPrice: 25000,
    planTitle: "استشارة إجرائية مكتوبة ومفصلة",
    receiptUploaded: false
};

// Select Pricing Plan
function selectPricing(element, price, title) {
    document.querySelectorAll('.pricing-card').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    element.querySelector('input[type="radio"]').checked = true;

    bookingState.planPrice = price;
    bookingState.planTitle = title;
}

// Handle Form Submit -> Open Super App Payment Modal
function handleConsultationSubmit(e) {
    e.preventDefault();

    bookingState.clientName = document.getElementById('clientName').value.trim();
    bookingState.clientPhone = document.getElementById('clientPhone').value.trim();
    bookingState.clientLocation = document.getElementById('clientLocation').value.trim();
    bookingState.caseType = document.getElementById('caseType').value;
    bookingState.caseDetails = document.getElementById('caseDetails').value.trim();

    // Populate modal
    document.getElementById('summaryClientName').innerText = bookingState.clientName;
    document.getElementById('summaryPlanName').innerText = bookingState.planTitle;
    document.getElementById('summaryAmount').innerText = bookingState.planPrice.toLocaleString('ar-IQ') + " د.ع";

    // Show modal
    document.getElementById('superModal').classList.add('active');
}

// Close Modal
function closeSuperModal() {
    document.getElementById('superModal').classList.remove('active');
}

// Copy Super Account Number
function copySuperAccount() {
    const acc = document.getElementById('superAccNumber').innerText;
    navigator.clipboard.writeText(acc).then(() => {
        showToast("تم نسخ رقم حساب سوبر بنجاح! 📋");
    }).catch(() => {
        showToast("يرجى نسخ الرقم يدوياً: " + acc);
    });
}

// Handle Receipt Selected
function handleReceiptSelected(event) {
    const file = event.target.files[0];
    if (file) {
        bookingState.receiptUploaded = true;
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('receiptPreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById('uploadText').innerText = `تم اختيار الوصل: ${file.name}`;
        };
        reader.readAsDataURL(file);
        showToast("تم إرفاق إشعار التحويل بنجاح ✓");
    }
}

// Finish & Redirect to WhatsApp
function finishAndSendWhatsApp() {
    const textMsg = `*طلب استشارة قانونية فورية* ⚖️
*المحامي سعد أميل (Saad Amil)*
-----------------------------------
*المستشير:* ${bookingState.clientName}
*رقم الهاتف:* ${bookingState.clientPhone}
*المحافظة / المحكمة:* ${bookingState.clientLocation || 'غير محدد'}
*نوع القضية:* ${bookingState.caseType}
*نوع الاستشارة:* ${bookingState.planTitle} (${bookingState.planPrice.toLocaleString('ar-IQ')} د.ع)
-----------------------------------
*موجز الوقائع والاستفسار:*
${bookingState.caseDetails}
-----------------------------------
💳 *حالة الدفع:* تم تحويل المبلغ عبر تطبيق سوبر (Super App)، ومرفق صورة إشعار التحويل هنا.`;

    const encodedText = encodeURIComponent(textMsg);
    const waUrl = `https://wa.me/${LAWYER_WHATSAPP}?text=${encodedText}`;

    showToast("جاري توجيهك إلى واتساب المحامي سعد أميل... 🚀");
    
    setTimeout(() => {
        window.open(waUrl, '_blank');
        closeSuperModal();
    }, 1200);
}

// Toast helper
function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}
