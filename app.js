/**
 * المكتب القضائي - سعد أميل (Saad Amil)
 * محرك التبديل الحي بين الخيارات البصرية الثلاثة ونظام سداد سوبر
 */

const LAWYER_WHATSAPP = "9647700000000"; // رقم الواتساب الرسمي

const bookingState = {
    clientName: "مستشير",
    clientPhone: "",
    clientLocation: "العراق",
    caseType: "استشارة إجرائية عامة",
    caseDetails: "",
    planPrice: 25000,
    planTitle: "استشارة إجرائية سريعة",
    receiptUploaded: false
};

// ==========================================================================
// 1. نظام التبديل الفوري بين أنماط التصميم (Live Style Switcher)
// ==========================================================================
function setDesignMode(mode) {
    // Hide all views
    document.getElementById('viewStationery').style.display = 'none';
    document.getElementById('viewCard').style.display = 'none';
    document.getElementById('viewConcierge').style.display = 'none';

    // Remove active button class
    document.getElementById('btnModeStationery').classList.remove('active');
    document.getElementById('btnModeCard').classList.remove('active');
    document.getElementById('btnModeConcierge').classList.remove('active');

    if (mode === 'stationery') {
        document.getElementById('viewStationery').style.display = 'block';
        document.getElementById('btnModeStationery').classList.add('active');
        document.body.style.backgroundColor = '#fcfbf9';
    } else if (mode === 'concierge') {
        document.getElementById('viewConcierge').style.display = 'flex';
        document.getElementById('btnModeConcierge').classList.add('active');
        document.body.style.backgroundColor = '#0f1218';
    } else {
        // Default: Card Mode
        document.getElementById('viewCard').style.display = 'flex';
        document.getElementById('btnModeCard').classList.add('active');
        document.body.style.backgroundColor = '#0d0f14';
    }

    localStorage.setItem('saad_amil_preferred_style', mode);
}

// Restore saved style on load (default to Card)
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('saad_amil_preferred_style') || 'card';
    setDesignMode(saved);

    // Live year display
    const yrEl = document.getElementById('liveDateDisplay');
    if (yrEl) yrEl.innerText = new Date().getFullYear();
});


// ==========================================================================
// 2. منطق الخيار 2 (البطاقة الحصرية - شاشة واحدة)
// ==========================================================================
function openDirectSuperModal(serviceName) {
    bookingState.planTitle = serviceName || "استشارة سريعة مع سعد أميل";
    bookingState.planPrice = 25000;
    bookingState.clientName = "طلب استشارة فورية";

    updateModalSummary();
    document.getElementById('superModal').classList.add('active');
}


// ==========================================================================
// 3. منطق الخيار 1 (الورقة الرسمية البيضاء الفاخرة)
// ==========================================================================
function handleStationerySubmit(e) {
    e.preventDefault();
    bookingState.clientName = document.getElementById('stName').value.trim();
    bookingState.clientPhone = document.getElementById('stPhone').value.trim();
    bookingState.clientLocation = document.getElementById('stCourt').value.trim() || "العراق";
    bookingState.caseDetails = document.getElementById('stDetails').value.trim();
    bookingState.planTitle = "استشارة قضائية أصولية (محرر ورقي)";
    bookingState.planPrice = 25000;

    updateModalSummary();
    document.getElementById('superModal').classList.add('active');
}


// ==========================================================================
// 4. منطق الخيار 3 (الكونسيرج التفاعلي المباشر)
// ==========================================================================
function selectConciergeType(btn, typeName) {
    document.querySelectorAll('.chip-choice').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    bookingState.caseType = typeName;
}

function submitConcierge() {
    const name = document.getElementById('cName').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    const details = document.getElementById('cText').value.trim();

    if (!name || !phone) {
        showToast("يرجى كتابة الاسم ورقم الواتساب أولاً");
        return;
    }

    bookingState.clientName = name;
    bookingState.clientPhone = phone;
    bookingState.caseDetails = details || "استشارة تفاعلية مباشرة";
    bookingState.planTitle = `استشارة (${bookingState.caseType})`;
    bookingState.planPrice = 25000;

    updateModalSummary();
    document.getElementById('superModal').classList.add('active');
}


// ==========================================================================
// 5. محرك نافذة الدفع المشتركة لتطبيق سوبر (Super App Modal)
// ==========================================================================
function updateModalSummary() {
    document.getElementById('summaryClientName').innerText = bookingState.clientName || "-";
    document.getElementById('summaryPlanName').innerText = bookingState.planTitle;
    document.getElementById('summaryAmount').innerText = bookingState.planPrice.toLocaleString('ar-IQ') + " د.ع";
}

function closeSuperModal() {
    document.getElementById('superModal').classList.remove('active');
}

function copySuperAccount() {
    const acc = document.getElementById('superAccNumber').innerText;
    navigator.clipboard.writeText(acc).then(() => {
        showToast("تم نسخ معرف سوبر بنجاح");
    }).catch(() => {
        showToast("المعرف: " + acc);
    });
}

function handleReceiptSelected(event) {
    const file = event.target.files[0];
    if (file) {
        bookingState.receiptUploaded = true;
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('receiptPreview');
            preview.src = e.target.result;
            preview.style.display = 'block';
            document.getElementById('uploadText').innerText = `وصل التحويل: ${file.name}`;
        };
        reader.readAsDataURL(file);
        showToast("تم إرفاق إشعار التحويل");
    }
}

function finishAndSendWhatsApp() {
    const textMsg = `طلب استشارة قضائية
المحامي سعد أميل (Saad Amil)
-----------------------------------
المستشير: ${bookingState.clientName}
رقم الهاتف: ${bookingState.clientPhone || 'غير مسجل'}
المحافظة / المحكمة: ${bookingState.clientLocation}
تصنيف النزاع: ${bookingState.caseType}
الأتعاب: ${bookingState.planPrice.toLocaleString('ar-IQ')} د.ع
-----------------------------------
موجز الاستفسار:
${bookingState.caseDetails || 'مراجعة وقائع الدعوى وتدقيق الخيارات'}
-----------------------------------
حالة السداد: تم التحويل عبر تطبيق سوبر (Super App)، ومرفق إشعار التحويل.`;

    const encodedText = encodeURIComponent(textMsg);
    const waUrl = `https://wa.me/${LAWYER_WHATSAPP}?text=${encodedText}`;

    showToast("جاري نقلك للواتساب...");
    
    setTimeout(() => {
        window.open(waUrl, '_blank');
        closeSuperModal();
    }, 800);
}

function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerText = msg;
    toast.style.display = 'block';
    setTimeout(() => {
        toast.style.display = 'none';
    }, 2800);
}
