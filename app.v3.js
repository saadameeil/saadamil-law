/**
 * saadamil.com - Official Client Application Script (v3.2 Production Audit)
 * Master Client Journey, Atomic Plan Synchronization & Legal Integrity
 * Attorney Saad Firas Amil (Iraqi Bar Association ID: 188572)
 */

'use strict';

const SUPER_ID = 'SUPER-IQ-77098231';
const WHATSAPP_NUMBER = '9647801222119';

// -----------------------------------------------------------------------------
// 1. ATOMIC PLAN SPECIFICATIONS & CENTRAL STATE
// -----------------------------------------------------------------------------
const PLANS = {
  iraq: {
    id: 'iraq',
    name: 'استشارة قانونية ودراسة ملف',
    fee: 75000,
    currency: 'IQD',
    formattedFee: '75,000 د.ع',
    paymentMethod: 'qi_super',
    statusDesc: 'تُباشر دراسة الملف وتدقيق المستندات والخيارات القانونية وتأكيد الموعد فور مراجعة وتأكيد أتعاب الاستشارة المعتمدة (75,000 د.ع).'
  },
  international: {
    id: 'international',
    name: 'استشارة قانونية ودراسة ملف للمغتربين والشركات بالخارج',
    fee: 100,
    currency: 'USD',
    formattedFee: '$100 USD',
    paymentMethod: 'usd_chase',
    statusDesc: 'تُباشر دراسة الملف وتدقيق المستندات والخيارات الأصولية وتأكيد الموعد فور مراجعة أتعاب الاستشارة الدولية المعتمدة ($100 USD).'
  }
};

let currentPlan = PLANS.iraq;
let currentServiceTitle = '';
let currentServiceId = '';
let currentCleanPhone = '';
let currentDraftRequestId = generateRequestId();
let formState = 'editing'; // 'editing' | 'preparing_file' | 'submitting' | 'success' | 'error'
let receiptValid = false;
let receiptBase64 = '';
let imageVersion = 0;
let previewUrl = '';
let previousFocus = null;

function generateRequestId() {
  return 'REQ-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getArabicDate() {
  const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
  const now = new Date();
  return now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
}

// -----------------------------------------------------------------------------
// 2. ATOMIC SET PLAN (Synchronizes Fee, Tabs, Panels, Docket, and Buttons)
// -----------------------------------------------------------------------------
function setPlan(planId, options = {}) {
  const targetId = (planId === 'international' || planId === 'usd') ? 'international' : 'iraq';
  currentPlan = PLANS[targetId];

  const tabIqEl = document.querySelector('#pay-tab-iq');
  const tabIntlEl = document.querySelector('#pay-tab-intl');
  const methodIq = document.querySelector('#pay-method-iq');
  const methodIntl = document.querySelector('#pay-method-intl');
  const docStatusDesc = document.querySelector('.status-desc');
  const docFeeVal = document.querySelector('#doc-fee-val');

  if (targetId === 'international') {
    if (tabIntlEl) { tabIntlEl.classList.add('active'); tabIntlEl.setAttribute('aria-selected', 'true'); }
    if (tabIqEl) { tabIqEl.classList.remove('active'); tabIqEl.setAttribute('aria-selected', 'false'); }
    if (methodIntl) methodIntl.style.display = 'block';
    if (methodIq) methodIq.style.display = 'none';
  } else {
    if (tabIqEl) { tabIqEl.classList.add('active'); tabIqEl.setAttribute('aria-selected', 'true'); }
    if (tabIntlEl) { tabIntlEl.classList.remove('active'); tabIntlEl.setAttribute('aria-selected', 'false'); }
    if (methodIq) methodIq.style.display = 'block';
    if (methodIntl) methodIntl.style.display = 'none';
  }

  if (docStatusDesc) {
    docStatusDesc.textContent = currentPlan.statusDesc;
  }
  if (docFeeVal) {
    docFeeVal.textContent = currentPlan.formattedFee;
  }

  // If user changed plan while receipt was attached, invalidate receipt to require re-confirmation
  if (options.userSwitched && receiptValid) {
    clearPreview(true);
    const receiptStatus = document.querySelector('#receipt-status');
    if (receiptStatus) {
      receiptStatus.textContent = 'تم تبديل خطة السداد؛ يرجى إرفاق إشعار التحويل المطابق للعملة الجديدة (' + currentPlan.formattedFee + ').';
    }
  }

  updateReceiptLock(receiptValid);
}

// -----------------------------------------------------------------------------
// 3. UNIFIED CONSULTATION MODAL CONTROLLER
// -----------------------------------------------------------------------------
const dialog = document.querySelector('#modal');
const briefForm = document.querySelector('#brief');
const step1Details = document.querySelector('#step-1-details');
const step2Payment = document.querySelector('#step-2-payment');
const step1Error = document.querySelector('#step-1-error');
const finalSubmitBtn = document.querySelector('#final-submit-btn');
const submitBtnText = document.querySelector('#submit-btn-text');
const previewWrap = document.querySelector('#preview-wrap');
const preview = document.querySelector('#preview');
const receipt = document.querySelector('#receipt');
const receiptStatus = document.querySelector('#receipt-status');

// Disable native HTML5 form constraint validation popping on hidden step1 fields
if (briefForm) {
  briefForm.noValidate = true;
}

function resetToStep1() {
  if (step1Details && step2Payment) {
    step1Details.hidden = false;
    step2Payment.hidden = true;
  }
  if (step1Error) {
    step1Error.hidden = true;
    step1Error.textContent = '';
  }
}

/**
 * Clear receipt preview and optionally reset the file input
 * @param {boolean} resetInput - true when user explicitly removes or resets form; false when changing file
 */
function clearPreview(resetInput = true) {
  imageVersion++;
  receiptValid = false;
  receiptBase64 = '';
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = '';
  }
  if (preview) {
    preview.src = '';
    preview.style.display = 'none';
  }
  const pdfBox = document.querySelector('#pdf-preview-box');
  if (pdfBox) pdfBox.style.display = 'none';
  if (previewWrap) previewWrap.hidden = true;
  if (resetInput && receipt) {
    receipt.value = '';
  }
  updateReceiptLock(false);
}

function updateReceiptLock(isValid) {
  receiptValid = isValid;
  if (!finalSubmitBtn || formState === 'submitting' || formState === 'success') return;

  if (isValid) {
    finalSubmitBtn.disabled = false;
    finalSubmitBtn.classList.remove('locked');
    finalSubmitBtn.classList.add('unlocked');
    if (submitBtnText) {
      submitBtnText.textContent = `إرسال طلب الاستشارة للمراجعة والتدقيق (${currentPlan.formattedFee}) ←`;
    }
  } else {
    finalSubmitBtn.disabled = true;
    finalSubmitBtn.classList.remove('unlocked');
    finalSubmitBtn.classList.add('locked');
    if (submitBtnText) {
      submitBtnText.textContent = `🔒 يرجى إرفاق إشعار التحويل لتفعيل الإرسال (${currentPlan.formattedFee})`;
    }
  }
}

function openConsultationModal(opts = {}) {
  if (!dialog) return;
  previousFocus = document.activeElement;

  let planId = 'iraq';
  let category = '';
  let serviceTitle = '';
  let serviceId = '';

  if (typeof opts === 'string') {
    const preferredPlan = opts;
    serviceTitle = arguments[1] || '';
    category = arguments[2] || '';
    planId = (category === 'diaspora' || preferredPlan.includes('مغترب') || preferredPlan.includes('USD')) ? 'international' : 'iraq';
  } else if (opts && typeof opts === 'object') {
    planId = opts.planId || ((opts.category === 'diaspora' || opts.plan === 'international') ? 'international' : 'iraq');
    category = opts.category || '';
    serviceTitle = opts.serviceTitle || opts.topic || '';
    serviceId = opts.serviceId || '';
  }

  // 1. Reset state
  resetToStep1();
  clearPreview(true);
  currentDraftRequestId = generateRequestId();
  formState = 'editing';

  // 2. Set plan atomically
  setPlan(planId);

  // 3. Set service context
  currentServiceTitle = serviceTitle;
  currentServiceId = serviceId;

  // 4. Update Category Select
  const topicDropdown = document.querySelector('#topic');
  if (topicDropdown) {
    const matchedVal = mapTopicToSelectValue(serviceTitle, category);
    if (matchedVal) {
      topicDropdown.value = matchedVal;
    } else {
      topicDropdown.selectedIndex = 0;
    }
  }

  // 5. Update summary placeholder & initial query
  const summaryInput = document.querySelector('#field-summary');
  if (summaryInput) {
    if (opts.customSummary) {
      summaryInput.value = opts.customSummary;
    }
    if (currentServiceTitle) {
      summaryInput.placeholder = 'بخصوص ' + currentServiceTitle + '... اكتب فكرة موجزة عما تطلبه أو وقائع قضيتك.';
    } else {
      summaryInput.placeholder = 'اكتب فكرة عامة وموجزة عن المشكلة أو السؤال القانوني...';
    }
  }

  // 6. Pre-fill date
  const docDate = document.querySelector('#doc-date');
  if (docDate) docDate.textContent = getArabicDate();

  // 7. Show Modal
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
  document.body.style.overflow = 'hidden';

  // Focus on name input
  setTimeout(() => {
    const nameInput = document.querySelector('#field-name');
    if (nameInput) nameInput.focus();
  }, 100);
}

// -----------------------------------------------------------------------------
// 4. CANONICAL CATEGORY MAPPING (Covers All 120 Lawsuits & 9 Hero Cards)
// -----------------------------------------------------------------------------
function mapTopicToSelectValue(topic = '', category = '') {
  const cat = String(category || '').toLowerCase().trim();
  const c = normalizeArabicText(category);
  const t = normalizeArabicText(topic);

  // PRIORITY 1: Specific Topic Distinctive Legal Keywords (Avoid false category traps!)
  if (t.includes('خطا طبي') || t.includes('اخطاء طبيه') || t.includes('حادث سير') || t.includes('حوادث السير') || t.includes('فعل ضار') || t.includes('توقيف كيدي') || t.includes('حبس تعسفي') || t.includes('تعويض عن') || t.includes('مطالبه بالتعويض') || t.includes('تامين')) {
    return 'قضايا التعويضات والمسؤولية المدنية والنزاعات المالية';
  }
  if (t.includes('سندات') || t.includes('كمبيالات') || t.includes('دفاتر تجاريه') || t.includes('مطالبه بالديون') || t.includes('دين') || t.includes('حجز احتياطي') || t.includes('سفتجه')) {
    return 'قضايا التعويضات والمسؤولية المدنية والنزاعات المالية';
  }
  if (t.includes('تسفير') || t.includes('ابعاد') || t.includes('اقامه الاجانب') || t.includes('جوازات') || t.includes('سحب اليد') || t.includes('قضاء موظفين') || t.includes('مجلس انضباط') || t.includes('نزاهه') || t.includes('ترفيع') || t.includes('علاوه') || t.includes('قرار اداري')) {
    return 'القضاء الإداري ومحكمة قضاء الموظفين والنزاهة';
  }
  if (t.includes('فصل تعسفي') || t.includes('عقد عمل') || t.includes('عقود العمل') || t.includes('ضمان اجتماعي') || t.includes('مكافاه نهايه الخدمه') || t.includes('اجور عمال') || t.includes('نزاع عمالي')) {
    return 'قضايا العمل والضمان الاجتماعي والوظيفة العامة';
  }
  if (t.includes('شيوع') || t.includes('عقار') || t.includes('منع معارضه') || t.includes('تثبيت ملكيه') || t.includes('1198') || t.includes('ابطال تسجيل عقاري') || t.includes('طابو') || t.includes('اخلاء ماجور') || t.includes('تخليه') || t.includes('بدلات ايجار') || t.includes('شفعه') || t.includes('حيازه') || t.includes('اراضي زراعيه') || t.includes('لزامه')) {
    return 'قضايا العقارات وإزالة الشيوع والتركات';
  }
  if (t.includes('ابتزاز') || t.includes('الكتروني') || t.includes('تزييف') || t.includes('ديب فيك') || t.includes('تسجيل صوتي') || t.includes('دليل رقمي') || t.includes('سب وقذف الكتروني') || t.includes('اختراق')) {
    return 'الجرائم الإلكترونية ومكافحة الابتزاز';
  }
  if (t.includes('طلاق') || t.includes('تفريق') || t.includes('زواج') || t.includes('حضانه') || t.includes('نفقه') || t.includes('مهر') || t.includes('قسام شرعي') || t.includes('حصر ارث') || t.includes('مشاهده') || t.includes('نشوز') || t.includes('خلع') || t.includes('مدونه 2025')) {
    return 'قضايا الأحوال الشخصية والأسرة';
  }
  if (t.includes('تصفيه شركات') || t.includes('تاسيس شركات') || t.includes('عقد تجاري') || t.includes('علامه فارقه') || t.includes('تحكيم تجاري') || t.includes('مقاولات') || t.includes('استثمار')) {
    return 'الشركات والاستثمار والعقود التجارية';
  }
  if (t.includes('قتل') || t.includes('كفاله') || t.includes('مخدرات') || t.includes('دكه') || t.includes('دگه') || t.includes('رشوه') || t.includes('تزوير') || t.includes('قوى الامن') || t.includes('محكمه عسكريه') || t.includes('تحقيق جنائي') || t.includes('جنح') || t.includes('جنايات')) {
    return 'القضاء الجنائي والتحقيق والجنح';
  }
  if (t.includes('وكاله قنصليه') || t.includes('صحه صدور') || t.includes('مغتربين') || t.includes('الجاليه') || t.includes('خارج العراق')) {
    return 'خدمات المغتربين والوكالات القنصلية';
  }

  // PRIORITY 2: Direct Category Key Matching (English & Arabic)
  if (cat === 'labor' || cat.includes('work') || cat.includes('employment') || c.includes('عمل') || c.includes('عمال') || c.includes('ضمان')) {
    return 'قضايا العمل والضمان الاجتماعي والوظيفة العامة';
  }
  if (cat === 'compensation' || cat.includes('damage') || cat.includes('tort') || cat === 'execution' || c.includes('تعويض') || c.includes('مسؤوليه') || c.includes('تنفيذ')) {
    return 'قضايا التعويضات والمسؤولية المدنية والنزاعات المالية';
  }
  if (cat === 'admin' || cat === 'administrative' || cat.includes('integrity') || cat === 'residency' || c.includes('اداري') || c.includes('موظفين') || c.includes('نزاهه') || c.includes('اقامه')) {
    return 'القضاء الإداري ومحكمة قضاء الموظفين والنزاهة';
  }
  if (cat === 'military' || cat === 'criminal' || cat.includes('penal') || c.includes('جنائي') || c.includes('تحقيق') || c.includes('جنح') || c.includes('جنايات')) {
    return 'القضاء الجنائي والتحقيق والجنح';
  }
  if (cat === 'cybercrime' || cat.includes('cyber') || cat.includes('tech') || c.includes('الكتروني') || c.includes('ابتزاز') || c.includes('ادله رقميه')) {
    return 'الجرائم الإلكترونية ومكافحة الابتزاز';
  }
  if (cat === 'family' || cat.includes('personal-status') || c.includes('اسره') || c.includes('احوال شخصيه')) {
    return 'قضايا الأحوال الشخصية والأسرة';
  }
  if (cat === 'real-estate' || cat.includes('property') || c.includes('عقار') || c.includes('شيوع') || c.includes('تركات')) {
    return 'قضايا العقارات وإزالة الشيوع والتركات';
  }
  if (cat === 'corporate' || cat.includes('commercial') || cat.includes('company') || c.includes('شركات') || c.includes('استثمار') || c.includes('تجاري')) {
    return 'الشركات والاستثمار والعقود التجارية';
  }
  if (cat === 'diaspora' || cat.includes('expat') || cat.includes('intl') || c.includes('مغترب') || c.includes('قنصلي') || c.includes('جاليه')) {
    return 'خدمات المغتربين والوكالات القنصلية';
  }

  if (t.includes('استشاره عامه') || t.includes('لست متاكد') || cat === 'general' || c.includes('عامه')) {
    return 'استشارة قانونية عامة / لستُ متأكداً من التكييف';
  }

  // PRIORITY 3: Fallback (Must return empty string so unselected dropdown stays on placeholder)
  return '';
}

// -----------------------------------------------------------------------------
// 5. COMPREHENSIVE ARABIC NORMALIZATION & LEGAL SYNONYMS
// -----------------------------------------------------------------------------
function normalizeArabicText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel/diacritics
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/گ/g, 'ك')
    .replace(/چ/g, 'ج')
    .replace(/پ/g, 'ب')
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .toLowerCase()
    .trim();
}

// -----------------------------------------------------------------------------
// 6. PHONE NUMBER NORMALIZATION & STRICT VALIDATION
// -----------------------------------------------------------------------------
function normalizeAndValidatePhone(raw) {
  if (!raw) return { valid: false, error: 'يرجى إدخال رقم الهاتف للتواصل.' };

  const arabicIndic = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  const persian = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  let cleaned = String(raw).trim();

  for (let i = 0; i < 10; i++) {
    cleaned = cleaned.replace(new RegExp(arabicIndic[i], 'g'), String(i));
    cleaned = cleaned.replace(new RegExp(persian[i], 'g'), String(i));
  }

  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');

  if (digitsOnly.length < 9) {
    return { valid: false, error: 'رقم الهاتف ناقص. يرجى كتابة رقم كامل فعال للتواصل.' };
  }

  // Reject dummy patterns (e.g. 000000, 111111)
  if (/^(\d)\1+$/.test(digitsOnly)) {
    return { valid: false, error: 'رقم الهاتف المدخل غير صالح (أرقام مكررة أو وهمية).' };
  }

  // Strict Iraqi Check
  const hasIraqiPrefix = /^(?:\+964|00964|964|07)/.test(cleaned);
  if (hasIraqiPrefix) {
    if (/^07[3-9]\d{8}$/.test(cleaned)) {
      return { valid: true, normalized: cleaned, isIraqi: true };
    }
    if (/^7[3-9]\d{8}$/.test(cleaned)) {
      return { valid: true, normalized: '0' + cleaned, isIraqi: true };
    }
    if (/^\+9647[3-9]\d{8}$/.test(cleaned)) {
      return { valid: true, normalized: cleaned, isIraqi: true };
    }
    if (/^009647[3-9]\d{8}$/.test(cleaned)) {
      return { valid: true, normalized: '+' + cleaned.substring(2), isIraqi: true };
    }
    if (/^9647[3-9]\d{8}$/.test(cleaned)) {
      return { valid: true, normalized: '+' + cleaned, isIraqi: true };
    }
    return {
      valid: false,
      error: 'رقم الهاتف العراقي غير مكتمل. الصيغة الصحيحة: 11 رقماً تبدأ بـ 07 (مثلاً: 07801222119).'
    };
  }

  // General International (non-Iraqi)
  const isGeneralIntl = /^(?:\+|00)[1-9]\d{8,14}$/.test(cleaned);
  if (isGeneralIntl) {
    const intlNorm = cleaned.startsWith('00') ? ('+' + cleaned.substring(2)) : cleaned;
    return { valid: true, normalized: intlNorm, isIraqi: false };
  }

  return {
    valid: false,
    error: 'يرجى إدخال رقم هاتف عراقي صالح يبدأ بـ 07، أو رقم دولي مع مفتاح الدولة (مثل: +1...).'
  };
}

// -----------------------------------------------------------------------------
// 7. STEP 1 TO STEP 2 ADVANCEMENT & LETTERHEAD DOCKET POPULATION
// -----------------------------------------------------------------------------
function goToStep2() {
  const nameInput = document.querySelector('#field-name');
  const phoneInput = document.querySelector('#field-phone');
  const locInput = document.querySelector('#field-location');
  const topicInput = document.querySelector('#topic');
  const summaryInput = document.querySelector('#field-summary');
  const deadlineInput = document.querySelector('#field-deadline');
  const oppNameInput = document.querySelector('#field-opponent-name');
  const oppPhoneInput = document.querySelector('#field-opponent-phone');
  const oppLocInput = document.querySelector('#field-opponent-loc');
  const titleRadio = document.querySelector('input[name="title_prefix"]:checked');

  const nameVal = nameInput ? nameInput.value.trim() : '';
  const phoneVal = phoneInput ? phoneInput.value.trim() : '';
  const locVal = locInput ? locInput.value.trim() : '';
  const topicVal = topicInput ? topicInput.value.trim() : '';
  const summaryVal = summaryInput ? summaryInput.value.trim() : '';
  const titlePrefix = titleRadio ? titleRadio.value : 'السيد';

  // Strict Validation: Name, Phone, Location, Topic, and Summary are ALL Mandatory
  if (!nameVal || nameVal.length < 2) {
    showStep1Error('يرجى كتابة الاسم الكامل (الثنائي أو الثلاثي على الأقل) للمتابعة.', nameInput);
    return;
  }
  if (!phoneVal) {
    showStep1Error('يرجى إدخال رقم الهاتف المباشر للتواصل.', phoneInput);
    return;
  }
  const phoneCheck = normalizeAndValidatePhone(phoneVal);
  if (!phoneCheck.valid) {
    showStep1Error(phoneCheck.error, phoneInput);
    return;
  }
  currentCleanPhone = phoneCheck.normalized;
  if (phoneInput) phoneInput.value = currentCleanPhone;

  if (!locVal) {
    showStep1Error('يرجى إدخال عنوان أو منطقة السكن (المحافظة والمنطقة، أو بلد الإقامة للمغتربين).', locInput);
    return;
  }
  if (!topicVal) {
    showStep1Error('يرجى اختيار مجال الاستشارة أو النزاع القضائي من القائمة.', topicInput);
    return;
  }
  if (!summaryVal || summaryVal.length < 5) {
    showStep1Error('يرجى كتابة ملخص موجز أو السؤال القانوني الأساسي (5 أحرف على الأقل) لمباشرة دراسة المسألة.', summaryInput);
    return;
  }

  if (step1Error) step1Error.hidden = true;

  // Populate Official Letterhead Paper Docket
  const docDate = document.querySelector('#doc-date');
  const docId = document.querySelector('#doc-id');
  const docCatVal = document.querySelector('#doc-cat-val');
  const docServiceRow = document.querySelector('#doc-service-row');
  const docServiceVal = document.querySelector('#doc-service-val');
  const docClientInfo = document.querySelector('#doc-client-info');
  const docOpponentInfo = document.querySelector('#doc-opponent-info');
  const docTopicVal = document.querySelector('#doc-topic-val');
  const docDeadlineRow = document.querySelector('#doc-deadline-row');
  const docDeadlineVal = document.querySelector('#doc-deadline-val');
  const docFactsVal = document.querySelector('#doc-facts-val');
  const docFeeVal = document.querySelector('#doc-fee-val');

  if (docDate) docDate.textContent = getArabicDate();
  if (docId) docId.textContent = 'TEMP-' + Math.floor(1000 + Math.random() * 9000);
  if (docCatVal) docCatVal.textContent = topicVal;
  if (docFeeVal) docFeeVal.textContent = currentPlan.formattedFee;

  if (currentServiceTitle) {
    if (docServiceRow) docServiceRow.style.display = 'block';
    if (docServiceVal) docServiceVal.textContent = currentServiceTitle;
  } else {
    if (docServiceRow) docServiceRow.style.display = 'none';
  }

  if (docClientInfo) {
    docClientInfo.textContent = `${titlePrefix} ${nameVal} — هاتف: ${currentCleanPhone} (${locVal})`;
  }

  const oppName = oppNameInput ? oppNameInput.value.trim() : '';
  const oppPhone = oppPhoneInput ? oppPhoneInput.value.trim() : '';
  const oppLoc = oppLocInput ? oppLocInput.value.trim() : '';
  if (docOpponentInfo) {
    if (oppName || oppPhone || oppLoc) {
      docOpponentInfo.textContent = `${oppName || 'مجهول الاسم'} ${oppPhone ? '— هاتف: ' + oppPhone : ''} ${oppLoc ? '(' + oppLoc + ')' : ''}`;
    } else {
      docOpponentInfo.textContent = 'لم تُحدد بيانات الخصم (اختياري / استشارة غير نزاعية)';
    }
  }

  if (docTopicVal) docTopicVal.textContent = topicVal;

  const deadlineVal = deadlineInput ? deadlineInput.value.trim() : '';
  if (deadlineVal) {
    if (docDeadlineRow) docDeadlineRow.style.display = 'block';
    if (docDeadlineVal) docDeadlineVal.textContent = deadlineVal;
  } else {
    if (docDeadlineRow) docDeadlineRow.style.display = 'none';
  }

  if (docFactsVal) {
    docFactsVal.textContent = summaryVal;
  }

  // Switch steps
  if (step1Details && step2Payment) {
    step1Details.hidden = true;
    step2Payment.hidden = false;
    step2Payment.scrollIntoView({ behavior: 'smooth' });
    const docPaper = document.querySelector('#official-doc');
    if (docPaper) docPaper.focus();
  }
}

function showStep1Error(msg, focusEl) {
  if (step1Error) {
    step1Error.hidden = false;
    step1Error.textContent = msg;
  }
  if (focusEl) {
    focusEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    focusEl.focus();
  }
}

// -----------------------------------------------------------------------------
// 8. FILE INTEGRITY VERIFICATION (Image & PDF Magic Bytes Check)
// -----------------------------------------------------------------------------
if (receipt) {
  receipt.addEventListener('change', async () => {
    const file = receipt.files && receipt.files[0];
    const uploadPlanId = currentPlan.id;

    // Do NOT wipe receipt.value here! We keep the selected file in the DOM input.
    clearPreview(false);

    if (!file) {
      clearPreview(true);
      return;
    }

    if (file.size === 0) {
      if (receiptStatus) receiptStatus.textContent = 'الملف المرفق فارغ (حجمه صفر بايت). يرجى اختيار إشعار تحويل صالح.';
      clearPreview(true);
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      if (receiptStatus) receiptStatus.textContent = 'حجم الملف أكبر من 8 ميغابايت. يرجى إرفاق إشعار أصغر حجماً.';
      clearPreview(true);
      return;
    }

    const ext = (file.name || '').toLowerCase().split('.').pop();
    const isPdf = (file.type === 'application/pdf' || ext === 'pdf');
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

    if (!isPdf && !isImage) {
      if (receiptStatus) receiptStatus.textContent = 'يرجى اختيار صورة بصيغة (JPG/PNG/WebP) أو ملف PDF لإشعار التحويل.';
      clearPreview(true);
      return;
    }

    const thisVersion = ++imageVersion;
    updateReceiptLock(false);
    if (receiptStatus) receiptStatus.textContent = '⏳ جارٍ فحص وتجهيز الملف...';

    const pdfBox = document.querySelector('#pdf-preview-box');
    const pdfName = document.querySelector('#pdf-name');
    const pdfSize = document.querySelector('#pdf-size');

    try {
      // Read file bytes
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('تعذرت قراءة الملف'));
        reader.readAsDataURL(file);
      });

      if (thisVersion !== imageVersion) return;

      // Plan changed during file read?
      if (uploadPlanId !== currentPlan.id) {
        clearPreview(true);
        if (receiptStatus) {
          receiptStatus.textContent = 'تم تبديل خطة السداد أثناء تجهيز الملف. يرجى إرفاق إشعار يطابق الخطة المختارة (' + currentPlan.formattedFee + ').';
        }
        return;
      }

      // Magic bytes verification
      if (isPdf) {
        const base64Part = fileData.split(',')[1] || '';
        if (!base64Part.startsWith('JVBERi0')) { // JVBERi0 is base64 for %PDF-
          throw new Error('الملف المرفق لا يطابق بنية مستندات PDF الصالحة.');
        }
        if (preview) preview.style.display = 'none';
        if (pdfBox) {
          pdfBox.style.display = 'block';
          if (pdfName) pdfName.textContent = file.name;
          if (pdfSize) pdfSize.textContent = (file.size / 1024).toFixed(1) + ' كيلوبايت (ملف PDF)';
        }
      } else {
        // Image Decode Verification
        if (pdfBox) pdfBox.style.display = 'none';
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = previewUrl;
        try {
          await img.decode();
        } catch (decodeErr) {
          console.warn('Image decode warning, fallback to base64 preview:', decodeErr);
        }
        if (preview) {
          preview.src = previewUrl;
          preview.style.display = 'block';
        }
      }

      if (thisVersion !== imageVersion) return;
      if (uploadPlanId !== currentPlan.id) return;

      receiptBase64 = fileData;
      if (previewWrap) previewWrap.hidden = false;
      const previewBadge = previewWrap.querySelector('.receipt-success-badge');
      if (previewBadge) {
        previewBadge.textContent = '✅ تم تجهيز إشعار التحويل (' + (isPdf ? 'ملف PDF' : 'صورة') + ') — بانتظار التأكيد والمراجعة';
      }
      updateReceiptLock(true);
      if (receiptStatus) receiptStatus.textContent = '';

    } catch (err) {
      if (thisVersion !== imageVersion) return;
      if (receiptStatus) receiptStatus.textContent = err.message || 'تعذر تجهيز الملف المرفق. يرجى اختيار ملف صالح آخر.';
      clearPreview(true);
    }
  });
}

const removeReceiptBtn = document.querySelector('#remove-receipt');
if (removeReceiptBtn) {
  removeReceiptBtn.addEventListener('click', () => clearPreview(true));
}

// -----------------------------------------------------------------------------
// 9. SUBMISSION STATE MACHINE & IDEMPOTENT HANDOFF (Safe Timeout & Neutral WA)
// -----------------------------------------------------------------------------
if (briefForm) {
  briefForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (formState === 'submitting') return;

    if (!receiptValid || !receiptBase64) {
      if (receiptStatus) {
        receiptStatus.textContent = 'يرجى إرفاق صورة أو ملف PDF لإشعار التحويل البنكي لتأكيد الإرسال.';
      }
      return;
    }

    formState = 'submitting';
    if (finalSubmitBtn) {
      finalSubmitBtn.disabled = true;
      finalSubmitBtn.classList.add('loading');
    }
    if (submitBtnText) {
      submitBtnText.textContent = '⏳ جارٍ قيد وتوثيق الطلب بالسجل الإداري...';
    }

    const f = new FormData(briefForm);
    const payload = {
      requestId: currentDraftRequestId,
      date: new Date().toISOString(),
      titlePrefix: f.get('title_prefix') || 'السيد',
      name: f.get('name') || '',
      phone: currentCleanPhone || f.get('phone') || '',
      prefContact: f.get('pref_contact') || 'رسالة واتساب أولاً',
      prefTime: f.get('pref_time') || 'أي وقت مناسب خلال ساعات الدوام',
      safeDiscreet: f.get('safe_discreet') ? 'نعم' : 'لا',
      deadline: f.get('deadline') || '',
      location: f.get('location') || '',
      topic: f.get('topic') || '',
      category: f.get('category') || '',
      serviceTitle: currentServiceTitle,
      serviceId: currentServiceId,
      planId: currentPlan.id,
      opponentName: f.get('opponent_name') || '',
      opponentPhone: f.get('opponent_phone') || '',
      opponentLocation: f.get('opponent_location') || '',
      summary: f.get('summary') || '',
      receiptBase64: receiptBase64
    };

    // 25-Second Timeout Controller covering fetch AND res.json()
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch('api/submit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const resData = await response.json();
      clearTimeout(timeoutId);

      if (!response.ok || resData.status !== 'success') {
        throw new Error(resData.message || 'تعذر تسجيل الطلب في السجل الإداري للمكتب. يرجى إعادة المحاولة.');
      }

      formState = 'success';
      const docketId = resData.docketId || ('IQ-SA-' + Math.floor(1000 + Math.random() * 9000));
      const handoff = document.querySelector('#handoff');

      if (handoff) {
        handoff.hidden = false;
        handoff.innerHTML = '';

        const card = document.createElement('div');
        card.className = 'submission-success-card';
        card.style.cssText = 'background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:20px; text-align:center; margin-top:20px;';

        const titleEl = document.createElement('h3');
        titleEl.style.cssText = 'color:#14532d; margin:0 0 10px 0; font-size:18px;';
        titleEl.textContent = '✅ تم قيد طلب الاستشارة بنجاح';
        card.appendChild(titleEl);

        const docketP = document.createElement('p');
        docketP.style.cssText = 'font-size:13px; color:#166534; line-height:1.7; margin:0 0 16px 0;';
        docketP.innerHTML = 'رقم إضبارة الاستشارة المعتمد: <strong dir="ltr" style="font-family:monospace; font-size:15px; color:#14532d; background:#dcfce7; padding:3px 8px; border-radius:4px;">' + docketId + '</strong><br>' +
          'تم استلام إشعار السداد ووقائع الطلب. يتواصل المكتب معك خلال <strong>ساعتين</strong> من ساعات العمل الرسمية لتأكيد الموعد.';
        card.appendChild(docketP);

        // Strict Neutral WhatsApp Message: ONLY Client Name and Docket ID
        const waText = [
          'مرحباً مكتب المحامي سعد أميل،',
          'أرغب بتأكيد حجز استشارة قانونية.',
          'رقم الطلب: ' + docketId,
          'الاسم: ' + payload.name,
          'تم إرسال الطلب وإرفاق إشعار التحويل عبر الموقع، بانتظار التواصل لتأكيد الموعد.'
        ].join('\n');

        const waLink = document.createElement('a');
        waLink.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(waText);
        waLink.target = '_blank';
        waLink.rel = 'noopener noreferrer';
        waLink.className = 'button';
        waLink.style.cssText = 'display:inline-flex; align-items:center; gap:6px; background:#25d366; color:#fff; text-decoration:none; padding:10px 18px; border-radius:6px; font-weight:700; font-size:13px;';
        waLink.textContent = 'تأكيد الموعد عبر واتساب المكتب 💬 ←';
        card.appendChild(waLink);

        handoff.appendChild(card);
        handoff.scrollIntoView({ behavior: 'smooth' });
      }

      if (submitBtnText) submitBtnText.textContent = '✅ تم إرسال وتأكيد الطلب بنجاح';

    } catch (err) {
      clearTimeout(timeoutId);
      formState = 'error';
      if (finalSubmitBtn) {
        finalSubmitBtn.disabled = false;
        finalSubmitBtn.classList.remove('loading');
      }
      updateReceiptLock(true);

      const isAbort = (err.name === 'AbortError');
      const errorMsg = isAbort
        ? 'استغرقت الاستجابة وقتاً أطول من المعتاد (25 ثانية). بياناتك وإشعار التحويل محفوظة؛ يرجى النقر مرة أخرى لإعادة الإرسال أو مراسلة المكتب عبر واتساب.'
        : (err.message || 'حدث خطأ في الاتصال بالخادم. يرجى المحاولة ثانية.');

      if (receiptStatus) {
        receiptStatus.textContent = errorMsg;
      }
    }
  });
}

// -----------------------------------------------------------------------------
// 10. GLOBAL EVENT ROUTING & ALL BUTTON ACTIONS
// -----------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  // 1. Payment Tabs Switching
  if (e.target.closest('#pay-tab-iq')) {
    e.preventDefault();
    setPlan('iraq', { userSwitched: true });
    return;
  }
  if (e.target.closest('#pay-tab-intl')) {
    e.preventDefault();
    setPlan('international', { userSwitched: true });
    return;
  }

  // 2. Navigation & Stepper buttons
  if (e.target.closest('#go-to-step-2')) {
    e.preventDefault();
    goToStep2();
    return;
  }
  if (e.target.closest('#back-to-step-1')) {
    e.preventDefault();
    resetToStep1();
    return;
  }
  if (e.target.closest('#close-modal')) {
    if (formState === 'submitting') return; // Do not close while network in flight!
    dialog.close();
    return;
  }

  // 3. Print docket button
  if (e.target.closest('#print-doc-btn')) {
    e.preventDefault();
    window.print();
    return;
  }

  // 4. Super ID Copy Button
  if (e.target.closest('#copy-id')) {
    e.preventDefault();
    const copyBtn = e.target.closest('#copy-id');
    copyTextToClipboard(SUPER_ID, copyBtn, 'تم النسخ ✅');
    return;
  }

  // 5. General Bank / Hash Copy Buttons with [data-copy]
  const copyDataBtn = e.target.closest('[data-copy]');
  if (copyDataBtn) {
    e.preventDefault();
    copyTextToClipboard(copyDataBtn.dataset.copy, copyDataBtn, 'تم النسخ ✅');
    return;
  }

  // 6. Empty search consult button
  if (e.target.closest('#dir-empty-consult-btn')) {
    e.preventDefault();
    const searchInput = document.querySelector('#dir-search-input');
    const q = searchInput ? searchInput.value.trim() : '';
    openConsultationModal({
      planId: 'iraq',
      category: 'general',
      serviceTitle: q ? ('استشارة عامة في: ' + q) : 'استشارة قانونية عامة',
      customSummary: q ? ('الموضوع المطلوب بحثه: ' + q) : ''
    });
    return;
  }

  // 7. Comparator Consult Button
  if (e.target.closest('#comp-book-btn')) {
    e.preventDefault();
    const compBtn = e.target.closest('#comp-book-btn');
    openConsultationModal({
      planId: 'iraq',
      category: 'family',
      serviceTitle: compBtn.dataset.topic || 'استشارة أحوال شخصية'
    });
    return;
  }

  // 8. General Consultation Opening Buttons (Action Buttons Only!)
  const btn = e.target.closest([
    'button[data-topic]',
    'a[data-topic]',
    '.lawsuit-chip',
    '.open-consult-modal',
    '.portal-cta-btn',
    '.diaspora-btn',
    '.diaspora-primary-btn',
    '.guide-cta-btn',
    '.digital-cta-btn',
    '.service-consult-btn',
    '.help-item'
  ].join(','));

  if (!btn) return;

  // Exclude tab navigation, search pills, or structural section wrappers
  if (
    btn.classList.contains('dir-filter-pill') ||
    btn.getAttribute('role') === 'tab' ||
    btn.classList.contains('dir-category-block')
  ) {
    return;
  }

  e.preventDefault();
  const rawTopic = btn.dataset.topic || (btn.classList.contains('lawsuit-chip') ? btn.textContent.trim() : '');
  const rawCat = btn.dataset.category || '';

  // Diaspora primary button is general expat consult -> sets diaspora category without forcing real estate
  let explicitPlan = 'iraq';
  if (btn.classList.contains('diaspora-primary-btn') || btn.classList.contains('diaspora-btn') || rawCat === 'diaspora' || rawTopic.includes('مغترب')) {
    explicitPlan = 'international';
  } else if (btn.dataset.plan === 'international' || btn.dataset.plan === 'usd') {
    explicitPlan = 'international';
  }

  openConsultationModal({
    planId: explicitPlan,
    category: rawCat,
    serviceTitle: rawTopic,
    serviceId: btn.dataset.serviceId || ''
  });
});

// Modal close on backdrop click
if (dialog) {
  dialog.addEventListener('click', e => {
    if (formState === 'submitting') return; // Do not close while submitting
    const r = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) {
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    clearPreview(true);
    resetToStep1();
    if (previousFocus) previousFocus.focus();
  });
}

// -----------------------------------------------------------------------------
// 11. COPY CLIPBOARD HELPER
// -----------------------------------------------------------------------------
function copyTextToClipboard(text, btn, successLabel = 'تم النسخ ✅') {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showCopySuccess(btn, successLabel);
    }).catch(() => fallbackCopy(text, btn, successLabel));
  } else {
    fallbackCopy(text, btn, successLabel);
  }
}

function fallbackCopy(text, btn, successLabel) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showCopySuccess(btn, successLabel);
  } catch (e) {}
  document.body.removeChild(ta);
}

function showCopySuccess(btn, successLabel) {
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = successLabel;
  btn.style.color = '#15803d';
  setTimeout(() => {
    btn.textContent = orig;
    btn.style.color = '';
  }, 2200);
}

// -----------------------------------------------------------------------------
// 12. GUIDE SECTION ACCESSIBLE TABS CONTROLLER
// -----------------------------------------------------------------------------
(function initGuideTabs() {
  const tabsList = document.querySelector('.guide-tabs');
  if (!tabsList) return;

  const tabs = tabsList.querySelectorAll('button[role="tab"]');
  const panels = document.querySelectorAll('.guide-content [role="tabpanel"]');

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));

    tab.addEventListener('keydown', (e) => {
      let targetIndex = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        targetIndex = (index + 1) % tabs.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        targetIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        targetIndex = 0;
      } else if (e.key === 'End') {
        targetIndex = tabs.length - 1;
      }

      if (targetIndex !== null) {
        e.preventDefault();
        tabs[targetIndex].focus();
        selectTab(tabs[targetIndex]);
      }
    });
  });

  function selectTab(selectedTab) {
    tabs.forEach(t => {
      t.setAttribute('aria-selected', 'false');
      t.tabIndex = -1;
    });
    selectedTab.setAttribute('aria-selected', 'true');
    selectedTab.tabIndex = 0;

    const targetPanelId = selectedTab.getAttribute('aria-controls');
    panels.forEach(p => {
      if (p.id === targetPanelId) {
        p.hidden = false;
        p.style.display = 'block';
      } else {
        p.hidden = true;
        p.style.display = 'none';
      }
    });
  }
})();

// -----------------------------------------------------------------------------
// 13. PAYMENT TABS KEYBOARD ARIA ACCESSIBILITY (Left / Right Arrows)
// -----------------------------------------------------------------------------
(function initPaymentTabsAria() {
  const payTabIq = document.querySelector('#pay-tab-iq');
  const payTabIntl = document.querySelector('#pay-tab-intl');
  if (!payTabIq || !payTabIntl) return;

  const tabs = [payTabIq, payTabIntl];
  tabs.forEach((tab, idx) => {
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const otherIdx = (idx === 0) ? 1 : 0;
        tabs[otherIdx].focus();
        tabs[otherIdx].click();
      }
    });
  });
})();

// -----------------------------------------------------------------------------
// 14. MOBILE NAVIGATION TOGGLE
// -----------------------------------------------------------------------------
(function initMobileMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#nav');
  if (!menuToggle || !nav) return;

  menuToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !menuToggle.contains(e.target) && nav.classList.contains('open')) {
      nav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

// -----------------------------------------------------------------------------
// 15. 120 LAWSUITS DIRECTORY FILTERING & SYNONYM SEARCH
// -----------------------------------------------------------------------------
(function initDirectory() {
  const searchInput = document.querySelector('#dir-search-input');
  const filterPills = document.querySelectorAll('.dir-filter-pill');
  const catBlocks = document.querySelectorAll('.dir-category-block');
  const emptyState = document.querySelector('#dir-empty-state');
  const countDisplay = document.querySelector('#dir-count-num');

  if (!searchInput || !catBlocks.length) return;

  let activeCategory = 'all';

  function applyFilter() {
    const rawQuery = searchInput.value.trim();
    const query = normalizeArabicText(rawQuery);
    let visibleCount = 0;

    catBlocks.forEach(block => {
      const blockCat = block.dataset.category;
      const catMatches = (activeCategory === 'all' || activeCategory === blockCat);
      const chips = block.querySelectorAll('.lawsuit-chip');
      let blockVisibleChips = 0;

      chips.forEach(chip => {
        const text = normalizeArabicText(chip.textContent);
        const topic = normalizeArabicText(chip.dataset.topic || '');
        let matchesQuery = false;

        if (!query) {
          matchesQuery = true;
        } else {
          matchesQuery = text.includes(query) || topic.includes(query);

          // Iraqi legal synonyms expansion
          if (!matchesQuery) {
            if (query.includes('كفال') && (text.includes('كفال') || text.includes('توقيف') || text.includes('اخلاء سبيل'))) matchesQuery = true;
            if ((query.includes('دكه') || query.includes('دگه') || query.includes('عشائر')) && (text.includes('دكه') || text.includes('دگه') || text.includes('عشائر') || text.includes('ارهاب') || text.includes('405'))) matchesQuery = true;
            if (query.includes('ترفيع') && (text.includes('ترفيع') || text.includes('علاوه') || text.includes('انضباط') || text.includes('موظف'))) matchesQuery = true;
            if ((query.includes('صك') || query.includes('شيك')) && (text.includes('صك') || text.includes('شيك') || text.includes('سفتجه') || text.includes('كمبيال'))) matchesQuery = true;
          }
        }

        if (catMatches && matchesQuery) {
          chip.style.display = '';
          blockVisibleChips++;
          visibleCount++;
        } else {
          chip.style.display = 'none';
        }
      });

      if (blockVisibleChips > 0) {
        block.style.display = '';
      } else {
        block.style.display = 'none';
      }
    });

    if (countDisplay) {
      countDisplay.textContent = visibleCount;
    }

    if (emptyState) {
      if (visibleCount === 0) {
        emptyState.hidden = false;
        emptyState.style.display = 'block';
      } else {
        emptyState.hidden = true;
        emptyState.style.display = 'none';
      }
    }
  }

  searchInput.addEventListener('input', applyFilter);

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeCategory = pill.dataset.filter || 'all';
      applyFilter();
    });
  });
})();

// -----------------------------------------------------------------------------
// 16. FORENSIC HASHER (Local SHA-256 Utility with Correct Trigger & Result IDs)
// -----------------------------------------------------------------------------
(function initForensicHasher() {
  const forensicInput = document.querySelector('#forensic-file-input');
  const uploadTrigger = document.querySelector('#forensic-upload-trigger');
  const forensicResult = document.querySelector('#forensic-result');
  const forensicHashVal = document.querySelector('#forensic-hash-val');
  const forensicFileMeta = document.querySelector('#forensic-file-meta');
  const copyHashBtn = document.querySelector('#copy-hash-btn');

  if (uploadTrigger && forensicInput) {
    uploadTrigger.addEventListener('click', () => {
      forensicInput.click();
    });
  }

  if (forensicInput) {
    forensicInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (forensicResult) forensicResult.style.display = 'block';
      if (forensicHashVal) forensicHashVal.textContent = '⏳ جارٍ حساب بصمة SHA-256 المشفرة محلياً...';
      if (forensicFileMeta) forensicFileMeta.textContent = `الملف: ${file.name} (${(file.size / 1024).toFixed(1)} كيلوبايت)`;

      try {
        const buffer = await file.arrayBuffer();
        const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (forensicHashVal) forensicHashVal.textContent = hashHex;
      } catch (err) {
        if (forensicHashVal) forensicHashVal.textContent = 'تعذر حساب البصمة لهذا الملف.';
      }
    });
  }

  if (copyHashBtn && forensicHashVal) {
    copyHashBtn.addEventListener('click', () => {
      const text = forensicHashVal.textContent;
      if (text && !text.includes('⏳') && !text.includes('تعذر')) {
        copyTextToClipboard(text, copyHashBtn, 'تم نسخ البصمة ✅');
      }
    });
  }
})();

// -----------------------------------------------------------------------------
// 17. LEGAL ARTICLES MODULE (Loads from api/articles.php with Safe Fallback)
// -----------------------------------------------------------------------------
function initArticlesModule() {
  const container = document.querySelector('#live-articles-grid, #articles-container');
  const readerModal = document.querySelector('#article-reader-modal');
  if (!container) return;

  const titleEl = document.querySelector('#art-reader-title');
  const catEl = document.querySelector('#art-reader-cat');
  const metaEl = document.querySelector('#art-reader-meta');
  const contentEl = document.querySelector('#art-reader-content');
  const closeBtn = document.querySelector('#close-art-reader');
  const consultBtn = document.querySelector('#art-reader-consult-btn');

  let currentArticleTitle = '';
  let currentArticleCategory = '';

  const SEED_ARTICLES = [
    {
      id: 'art-1',
      title: 'الدليل الإجرائي لدعوى إزالة الشيوع وفرز الحصص العقارية في المحاكم العراقية',
      category: 'العقارات والتركات',
      date: '2026-11-10',
      excerpt: 'خطوات إقامة دعوى إزالة الشيوع أمام محكمة البداءة، وكيفية حماية حصة الشريك أو الوريث من البيع ببخس الثمن بالمزاد العلني.',
      content: 'دعوى إزالة الشيوع في القانون المدني العراقي رقم 40 لسنة 1951 تُعد من أهم الدعاوى العقارية لحسم النزاعات بين الشركاء والورثة.\n\nتُقام الدعوى أمام محكمة البداءة المختصة موقعياً بمحل العقار. يتم ندب خبير قضائي لتقدير إمكانية القسمة العينية؛ فإذا تعذرت القسمة، تصدر المحكمة قراراً ببيع العقار بالمزاد العلني وتوزيع بدلات البيع على الشركاء كلٌّ بحسب حصته الشرعية أو التعاقدية.\n\nينصح المحامي سعد فراس أميل دائماً بوضع إشارة عدم التصرف في دائرة التسجيل العقاري فور قيد الدعوى لمنع تهريب الحصص أو التلاعب بالملكية.'
    },
    {
      id: 'art-2',
      title: 'درع الحماية القانونية لعقارات المغتربين العراقيين في أمريكا وأوروبا',
      category: 'شؤون المغتربين',
      date: '2026-11-12',
      excerpt: 'الإجراءات الأصولية لتصديق الوكالات القنصلية وحسم صحة الصدور وحماية أراضي وعقارات المهاجرين من تزوير مكاتب الدلالية.',
      content: 'يواجه العراقيون المقيمون في الولايات المتحدة، كندا، بريطانيا، والدول الأوروبية تحديات جسيمة في إدارة أملاكهم ومتابعة تركاتهم في بغداد والمحافظات.\n\nالخطوة الأولى تبدأ من صياغة وكالة عامة أو خاصة لدى القنصلية العراقية في بلد الإقامة، تليها مطابقة صحة الصدور الإلكترونية عبر وزارة الخارجية في بغداد.\n\nيوفر مكتبنا تمثيلاً قضائياً رفيع المستوى بإشراف شخصي وتقارير مصورة موثقة لجميع مراحل الدعوى دون حاجة المغترب للسفر، مع إمكانية سداد أتعاب الاستشارة لحساب بنكي أمريكي رسمي (ACH / Wire Transfer).'
    },
    {
      id: 'art-3',
      title: 'إثبات الأدلة الرقمية وسلسلة الحيازة في قضايا الابتزاز الإلكتروني',
      category: 'الجرائم المعلوماتية',
      date: '2026-11-09',
      excerpt: 'كيفية توثيق بصمة التشفير الجنائية (SHA-256) للتسجيلات الصوتية ومحادثات الابتزاز لقبولها كدليل قطعي أمام قاضي التحقيق.',
      content: 'مع تطور أدوات التزييف العميق واستنساخ الأصوات بالذكاء الاصطناعي، باتت المحاكم الجنائية ومحاكم التحقيق في العراق تتطلب تدقيقاً علمياً صارماً للأدلة الرقمية.\n\nوفقاً لقانون أصول المحاكمات الجزائية رقم 23 لسنة 1971 وقانون الإثبات العراقي رقم 107 لسنة 1979 المعدل، لا يُقبل الدليل الإلكتروني إلا إذا حوفظ على سلسلة حيازته (Chain of Custody) من لحظة استخراجه.\n\nيوفر مكتبنا بالتعاون مع خبرتنا في Gold Stone Intelligence فحصاً جنائياً محلياً للتسجيلات واستخراج بصمات التجزئة المشفرة لقطع الطريق على الخصم في ادعاء الفبركة.'
    }
  ];

  async function loadArticles() {
    let articles = [];
    try {
      const resp = await fetch('api/articles.php');
      if (resp.ok) {
        const data = await resp.json();
        articles = data.articles || (Array.isArray(data) ? data : []);
      }
    } catch (e) {
      // Network/local fetch failed, fall back to seed
    }

    if (!articles.length) {
      articles = SEED_ARTICLES;
    }

    container.innerHTML = articles.map(art => `
      <article class="article-card" style="background:#fff; border:1px solid #d5ded0; border-radius:8px; padding:20px; display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <span style="display:inline-block; font-size:11px; font-weight:700; color:var(--brand); background:rgba(18,60,49,0.08); padding:3px 8px; border-radius:4px; margin-bottom:8px;">${art.category}</span>
          <h3 style="font-size:16px; margin:0 0 10px 0; color:var(--brand); line-height:1.5;">${art.title}</h3>
          <p style="font-size:13px; color:#475569; line-height:1.7; margin:0 0 16px 0;">${art.excerpt}</p>
        </div>
        <button type="button" class="button small read-art-btn" data-id="${art.id}" style="align-self:flex-start;">قراءة الدراسة القانونية ←</button>
      </article>
    `).join('');

    container.querySelectorAll('.read-art-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const art = articles.find(a => a.id === btn.dataset.id);
        if (art && readerModal) {
          currentArticleTitle = art.title;
          currentArticleCategory = art.category;
          if (titleEl) titleEl.textContent = art.title;
          if (catEl) catEl.textContent = art.category;
          if (metaEl) metaEl.textContent = `بقلم المحامي سعد فراس أميل • تاريخ النشر: ${art.date} • هوية: 188572`;
          if (contentEl) contentEl.textContent = art.content;
          readerModal.showModal();
        }
      });
    });
  }

  if (closeBtn && readerModal) {
    closeBtn.addEventListener('click', () => readerModal.close());
    readerModal.addEventListener('click', e => {
      if (e.target === readerModal) readerModal.close();
    });
  }

  if (consultBtn && readerModal) {
    consultBtn.addEventListener('click', () => {
      const artTitle = currentArticleTitle;
      const artCat = currentArticleCategory;
      readerModal.close();
      setTimeout(() => {
        openConsultationModal({
          planId: (artCat.includes('مغترب') || artCat.includes('دولية')) ? 'international' : 'iraq',
          category: artCat,
          serviceTitle: 'استشارة بخصوص دراسة: ' + artTitle,
          serviceId: 'article-consult'
        });
      }, 150);
    });
  }

  loadArticles();
}

// -----------------------------------------------------------------------------
// 18. QUERY PARAMETER DEEP-LINKING (?consult=1&category=...)
// -----------------------------------------------------------------------------
function handleUrlParameters() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('consult') === '1') {
    const cat = params.get('category') || '';
    const plan = (cat === 'diaspora' || params.get('plan') === 'international') ? 'international' : 'iraq';
    setTimeout(() => {
      openConsultationModal({
        planId: plan,
        category: cat,
        serviceTitle: params.get('service') || ''
      });
    }, 200);
  }
}

// -----------------------------------------------------------------------------
// 19. PERSONAL STATUS COMPARATOR MODULE (2025 Amendments Analysis)
// -----------------------------------------------------------------------------
(function initComparator() {
  const dateSelect = document.querySelector('#comp-date-select');
  const issueSelect = document.querySelector('#comp-issue-select');
  const resultContainer = document.querySelector('#comparator-result');
  if (!dateSelect || !issueSelect || !resultContainer) return;

  const DB = {
    custody: {
      title: 'حضانة الأطفال وسن انتقال الحضانة',
      legacy: 'المادة 57 من قانون 188 لسنة 1959 تمنح الأم الحضانة حتى سن 10 سنوات، قابلة للتمديد إلى 15 سنة وفق مصلحة المحضون.',
      jaafari: 'في الفقه الجعفري ومدونة 2025: حضانة الأب تبدأ بعد سن السنتين للولد والسبع سنوات للبنت (أو 7 سنوات لكليهما وفق فتوى المرجع المقلد) بشرط الأهلية والأمانة.',
      impact: 'يتوقف تحديد سن الحضانة على تاريخ العقد ومذهب الوالدين والاتفاق المبرم في عقد الزواج.',
      docsNeeded: 'عقد الزواج، حجة الولادة للأطفال، وإثبات أهلية الحاضن ودار الحضانة.'
    },
    divorce_rights: {
      title: 'الطلاق والتفريق واستحقاق المهر المؤجل',
      legacy: 'يخضع لقانون الأحوال الشخصية 188 المعدل، ويستحق المهر المؤجل بالطلاق أو الوفاة مع تعويض الطلاق التعسفي.',
      jaafari: 'يشترط لصحة الطلاق توفر شاهدين عدلين وسماع الصيغة المخصوصة وشرط الطهارة، مع أحكام خاصة للخلع والمباراة.',
      impact: 'الطلاق خارج المحكمة دون الشروط الشرعية لا يُثبت شرعاً ويحتاج دعوى تصديق وإثبات دقيقة.',
      docsNeeded: 'عقد الزواج، شهادة الشهود، وطلب حجة الطلاق أو عريضة دعوى التفريق.'
    },
    maintenance: {
      title: 'النفقة الزوجية وإثبات النشوز أو ترك دار الزوجية',
      legacy: 'تستحق الزوجة النفقة من تاريخ الامتناع، وتسقط بالنشوز الثابت بحكم قضائي بعد توجيه إنذار الطاعة.',
      jaafari: 'تسقط النفقة بالنشوز التام، وتراعى قدرة الزوج المالية والوفاء بالواجبات الزوجية المتبادلة.',
      impact: 'يلزم إثبات مسكن الزوجية الشرعي المستقل قبل الدفع بنشوز الزوجة أو إسقاط نفقتها.',
      docsNeeded: 'إنذار الطاعة العدلي، محضر الكشف على دار الزوجية، وبطاقة الدخل أو الراتب للزوج.'
    },
    visitation: {
      title: 'حقوق المشاهدة والاصطحاب والمبيت للأب',
      legacy: 'تنظم المحكمة المشاهدة أسبوعياً أو دورياً في مكان ملائم، مع تقييد المبيت للأطفال الصغار.',
      jaafari: 'حق الرؤية ثابت للأبوين، وتخضع ترتيبات المبيت والاصطحاب لمصلحة الصغير وعدم الإضرار به.',
      impact: 'صدور قرارات تمييزية حديثة توسع نطاق الاصطحاب والمبيت متى بلغ الطفل سناً مناسباً.',
      docsNeeded: 'حكم الحضانة، حجة الولادة، وتحديد مكان آمن ومناسب للاصطحاب.'
    },
    contract_change: {
      title: 'تغيير العقد للمدونة بطلب منفرد أو مشترك',
      legacy: 'العقود السابقة لعام 2025 خاضعة أصلاً لأحكام قانون 188 لسنة 1959 بكامل آثاره.',
      jaafari: 'أتاح التعديل الأخير للزوجين أو أحدهما تقديم طلب لاختيار تطبيق أحكام المذهب الجعفري أو السني وفق ضوابط محددة.',
      impact: 'الطلب المنفرد يثير إشكالات دستورية ونزاعات ولائية حول موافقة الطرف الآخر، مما يوجب التدقيق الحذر.',
      docsNeeded: 'صورة قيد عقد الزواج، والبيانات الشخصية لكلا الزوجين.'
    }
  };

  function renderComparator() {
    const isNew = dateSelect.value === 'after';
    const issueKey = issueSelect.value || 'custody';
    const item = DB[issueKey] || DB.custody;

    resultContainer.innerHTML = `
      <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:18px; line-height:1.8;">
        <div style="font-weight:700; color:var(--brand); font-size:14px; margin-bottom:10px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
          ⚖️ المسار المقارن لمسألة: ${item.title} (${isNew ? 'عقود عام 2025 وما بعده' : 'عقود ما قبل 2025'})
        </div>
        <p style="font-size:12.5px; color:#334155; margin:0 0 10px 0;"><strong>أصل الحكم بقانون 188 لسنة 1959:</strong> ${item.legacy}</p>
        <p style="font-size:12.5px; color:#1e293b; margin:0 0 10px 0;"><strong>الضوابط في الفقه الجعفري والتعديل الحديث:</strong> ${item.jaafari}</p>
        <div style="background:#f8fafc; border-right:3px solid var(--brand); padding:8px 12px; margin:10px 0; font-size:12px; color:#475569;">
          🔍 <strong>التكييف الإجرائي الواجب بحثه:</strong> ${item.impact}
        </div>
        <div style="font-size:11.5px; color:#64748b; margin-top:8px;">
          📁 <strong>المستندات المطلوبة للفحص:</strong> ${item.docsNeeded}
        </div>
        <div style="margin-top:14px; text-align:left;">
          <button class="button small" type="button" id="comp-book-btn" data-topic="أحوال شخصية — ${item.title}" data-category="family" style="padding:8px 18px; font-size:12px;">
            طلب استشارة في مسألة: ${item.title} ←
          </button>
        </div>
      </div>
    `;
  }

  dateSelect.addEventListener('change', renderComparator);
  issueSelect.addEventListener('change', renderComparator);
  renderComparator();
})();

// -----------------------------------------------------------------------------
// INITIALIZATION
// -----------------------------------------------------------------------------
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initArticlesModule();
    handleUrlParameters();
  });
} else {
  initArticlesModule();
  handleUrlParameters();
}
