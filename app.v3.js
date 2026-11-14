/**
 * saadamil.com - Official Client Application Script (v3.1 Production)
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
    name: 'استشارة قانونية ودراسة ملف للمغتربين',
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
let formState = 'editing'; // 'editing' | 'preparing_file' | 'ready' | 'submitting' | 'success' | 'error'
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

  // If user changed plan while receipt was attached, invalidate receipt to require re-confirmation
  if (options.userSwitched && receiptValid) {
    clearPreview();
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
const step1Details = document.querySelector('#step-1-details');
const step2Payment = document.querySelector('#step-2-payment');
const step1Error = document.querySelector('#step-1-error');
const finalSubmitBtn = document.querySelector('#final-submit-btn');
const submitBtnText = document.querySelector('#submit-btn-text');
const previewWrap = document.querySelector('#preview-wrap');
const preview = document.querySelector('#preview');
const receipt = document.querySelector('#receipt');
const receiptStatus = document.querySelector('#receipt-status');

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

function clearPreview() {
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
  if (receipt) receipt.value = '';
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
  clearPreview();
  currentDraftRequestId = generateRequestId();
  formState = 'editing';

  // 2. Set plan atomically
  setPlan(planId);

  // 3. Set service context
  currentServiceTitle = serviceTitle;
  currentServiceId = serviceId || (serviceTitle ? slugify(serviceTitle) : 'general-consult');

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

  // 5. Update summary placeholder
  const summaryInput = document.querySelector('#field-summary');
  if (summaryInput) {
    if (currentServiceTitle) {
      summaryInput.placeholder = 'بخصوص ' + currentServiceTitle + '... اكتب فكرة موجزة عما تطلبه أو وقائع قضيتك.';
    } else {
      summaryInput.placeholder = 'اكتب فكرة عامة وموجزة عن المشكلة أو السؤال القانوني...';
    }
  }

  // 6. Reset UI feedback
  const cs = document.querySelector('#copy-status'); if (cs) cs.textContent = '';
  const ho = document.querySelector('#handoff'); if (ho) ho.hidden = true;
  if (step1Error) { step1Error.hidden = true; step1Error.textContent = ''; }

  if (dialog && !dialog.open) {
    previousFocus = document.activeElement;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  }
}

function slugify(text) {
  return String(text || '').replace(/[^\u0621-\u064Aa-zA-Z0-9]/g, '-').replace(/-+/g, '-').substring(0, 40);
}

// -----------------------------------------------------------------------------
// 4. CANONICAL CATEGORY MAPPING (Covers All 120 Lawsuits & 9 Hero Cards)
// -----------------------------------------------------------------------------
function mapTopicToSelectValue(topic = '', category = '') {
  const cat = String(category || '').toLowerCase().trim();
  const t = normalizeArabicText(topic);

  // 1. Direct Category Match
  if (cat === 'labor' || cat.includes('work') || cat.includes('employment')) {
    return 'قضايا العمل والضمان الاجتماعي والوظيفة العامة';
  }
  if (cat === 'compensation' || cat.includes('damage') || cat.includes('tort')) {
    return 'قضايا التعويضات والمسؤولية المدنية والنزاعات المالية';
  }
  if (cat === 'admin' || cat === 'administrative' || cat.includes('integrity') || cat.includes('governance')) {
    return 'القضاء الإداري ومحكمة قضاء الموظفين والنزاهة';
  }
  if (cat === 'execution' || cat.includes('debt')) {
    return 'قضايا التعويضات والمسؤولية المدنية والنزاعات المالية';
  }
  if (cat === 'military') {
    return 'القضاء الجنائي والتحقيق والجنح';
  }
  if (cat === 'residency') {
    return 'قضايا العمل والضمان الاجتماعي والوظيفة العامة';
  }
  if (cat === 'cassation') {
    return 'استشارة قانونية عامة / لستُ متأكداً من التكييف';
  }
  if (cat === 'cybercrime' || cat.includes('cyber') || cat.includes('tech')) {
    return 'الجرائم الإلكترونية ومكافحة الابتزاز';
  }
  if (cat === 'family' || cat.includes('personal-status')) {
    return 'قضايا الأحوال الشخصية والأسرة';
  }
  if (cat === 'real-estate' || cat === 'civil' || cat.includes('property')) {
    return 'قضايا العقارات وإزالة الشيوع والتركات';
  }
  if (cat === 'corporate' || cat.includes('commercial') || cat.includes('business') || cat.includes('company')) {
    return 'الشركات والاستثمار والعقود التجارية';
  }
  if (cat === 'criminal' || cat.includes('penal')) {
    return 'القضاء الجنائي والتحقيق والجنح';
  }
  if (cat === 'diaspora' || cat.includes('expat') || cat.includes('intl')) {
    return 'خدمات المغتربين والوكالات القنصلية';
  }
  if (cat === 'general') {
    return 'استشارة قانونية عامة / لستُ متأكداً من التكييف';
  }

  // 2. Keyword Match on Topic Text
  if (t.includes('عمل') || t.includes('ضمان') || t.includes('عمال') || t.includes('فصل تعسفي') || t.includes('اجور') || t.includes('مكافاه نهايه الخدمه')) {
    return 'قضايا العمل والضمان الاجتماعي والوظيفة العامة';
  }
  if (t.includes('تعويض') || t.includes('مسؤوليه تقصيريه') || t.includes('ضرر') || t.includes('حادث') || t.includes('صك') || t.includes('كمبياله') || t.includes('سفتجه') || t.includes('حجز تنفيذي') || t.includes('دين')) {
    return 'قضايا التعويضات والمسؤولية المدنية والنزاعات المالية';
  }
  if (t.includes('نزاهه') || t.includes('قضاء موظفين') || t.includes('اداريه') || t.includes('انضباط') || t.includes('عقوبه') || t.includes('ترفيع') || t.includes('علاوه')) {
    return 'القضاء الإداري ومحكمة قضاء الموظفين والنزاهة';
  }
  if (t.includes('الكترون') || t.includes('ابتزاز') || t.includes('تزييف') || t.includes('رقمي') || t.includes('cyber') || t.includes('صوت') || t.includes('تهديد')) {
    return 'الجرائم الإلكترونية ومكافحة الابتزاز';
  }
  if (t.includes('احوال') || t.includes('اسره') || t.includes('طلاق') || t.includes('زواج') || t.includes('حضانه') || t.includes('نفقه') || t.includes('مهر') || t.includes('جعفري') || t.includes('قسام') || t.includes('تفريق') || t.includes('خلع')) {
    return 'قضايا الأحوال الشخصية والأسرة';
  }
  if (t.includes('عقار') || t.includes('شيوع') || t.includes('اراضي') || t.includes('طابو') || t.includes('تخليه') || t.includes('ايجار') || t.includes('ماجور') || t.includes('1198') || t.includes('ملكيه') || t.includes('فرز') || t.includes('قسمه')) {
    return 'قضايا العقارات وإزالة الشيوع والتركات';
  }
  if (t.includes('شرك') || t.includes('استثمار') || t.includes('تجاري') || t.includes('مناقص') || t.includes('عقد تجاري') || t.includes('تحكيم')) {
    return 'الشركات والاستثمار والعقود التجارية';
  }
  if (t.includes('جنائ') || t.includes('كفال') || t.includes('تحقيق') || t.includes('جنح') || t.includes('جنايات') || t.includes('شرطه') || t.includes('موقوف') || t.includes('حبس') || t.includes('قتل') || t.includes('مخدرات') || t.includes('دكه') || t.includes('دگه') || t.includes('عشائري')) {
    return 'القضاء الجنائي والتحقيق والجنح';
  }
  if (t.includes('مغترب') || t.includes('مهجر') || t.includes('قنصل') || t.includes('سفار') || t.includes('diaspora') || t.includes('خارج')) {
    return 'خدمات المغتربين والوكالات القنصلية';
  }

  // 3. Fallback
  return 'استشارة قانونية عامة / لستُ متأكداً من التكييف';
}

// -----------------------------------------------------------------------------
// 5. COMPREHENSIVE ARABIC NORMALIZATION & LEGAL SYNONYMS
// -----------------------------------------------------------------------------
function normalizeArabicText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u064B-\u065F]/g, '') // remove diacritics
    .replace(/[إأآا]/g, 'ا')          // normalize Alef
    .replace(/ة/g, 'ه')               // normalize Ta Marbuta
    .replace(/ى/g, 'ي')               // normalize Alef Maqsura
    .replace(/گ/g, 'ك')               // normalize Kurdish/Persian Gaf to Kaf
    .replace(/[^\u0621-\u064A0-9a-zA-Z\s]/g, ' ') // sanitize
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const legalSynonymsMap = {
  'شيك': ['صك', 'كمبياله', 'سفتجه', 'سند سحب'],
  'صك': ['شيك', 'كمبياله', 'سفتجه', 'سند'],
  'ايجار': ['تخليه', 'ماجور', 'بدل ايجار', 'عقد ايجار', 'استئجار'],
  'تخليه': ['ايجار', 'ماجور', 'غصب', 'شاغل'],
  'شيوع': ['ازاله شيوع', 'قسمه', 'فرز', 'شركاء', 'قسمه قضائيه'],
  'فرز': ['ازاله شيوع', 'شيوع', 'قسمه', 'طابو'],
  'طلاق': ['تفريق', 'خلع', 'مخالعه', 'انفصال', 'نفقه', 'حضانه'],
  'تفريق': ['طلاق', 'خلع', 'نفقه', 'حضانه', 'هجر', 'ضرر'],
  'حضانه': ['ضم صغير', 'مشاهده', 'نفقه صغار', 'ولايه'],
  'نفقه': ['نفقه زوجه', 'نفقه صغار', 'ماضيه', 'مستمره'],
  'ابتزاز': ['جرائم الكترونيه', 'تهديد', 'تشهير', 'حساب وهمي', 'سب وقذف'],
  'عمل': ['ضمان اجتماعي', 'فصل تعسفي', 'اجور عمال', 'عقد عمل', 'مكافاه'],
  'كفاله': ['كفالات', 'اخلاء سبيل', 'افراج', 'حبس', 'قبض'],
  'كفالات': ['كفاله', 'اخلاء سبيل', 'افراج', 'تأمين كفالات'],
  'دكه': ['دگه', 'دكه عشائريه', 'دگه عشائريه', 'عشائريه', 'قصد ارهابي'],
  'دگه': ['دكه', 'دكه عشائريه', 'دگه عشائريه', 'عشائريه'],
  'ترفيع': ['علاوه', 'احتساب خدمه', 'تثبيت عقود', 'خدمه وظيفيه']
};

function getExpandedQueryTerms(query) {
  const normQuery = normalizeArabicText(query);
  const words = normQuery.split(' ').filter(w => w.length > 0);
  const allTerms = [];

  words.forEach(word => {
    allTerms.push(word);
    if (word.startsWith('ال') && word.length > 3) {
      allTerms.push(word.substring(2));
    }
    const bareWord = word.startsWith('ال') ? word.substring(2) : word;
    if (legalSynonymsMap[bareWord]) {
      legalSynonymsMap[bareWord].forEach(syn => allTerms.push(syn));
    }
  });

  return Array.from(new Set(allTerms));
}

// -----------------------------------------------------------------------------
// 6. STRICT PHONE VALIDATION (Unified between Preview and Server)
// -----------------------------------------------------------------------------
function normalizeAndValidatePhone(raw) {
  if (!raw) return { valid: false, error: 'يرجى إدخال رقم الهاتف للتواصل.' };

  const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  const persianDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  let str = String(raw).trim();
  for (let i = 0; i < 10; i++) {
    str = str.split(arabicDigits[i]).join(String(i));
    str = str.split(persianDigits[i]).join(String(i));
  }

  let cleaned = str.replace(/[\s\-\(\)\.]/g, '');
  let digitsOnly = cleaned.replace(/^\+/, '');

  if (!/^\d+$/.test(digitsOnly)) {
    return { valid: false, error: 'رقم الهاتف يجب أن يحتوي على أرقام فقط.' };
  }

  // Reject identical or dummy sequences
  let firstChar = digitsOnly.charAt(0);
  let allSame = true;
  for (let i = 1; i < digitsOnly.length; i++) {
    if (digitsOnly.charAt(i) !== firstChar) { allSame = false; break; }
  }
  if (allSame) {
    return { valid: false, error: 'يرجى إدخال رقم هاتف حقيقي وفعال (تم رفض الأرقام المتكررة الوهمية).' };
  }
  if (/(.)\1{5,}/.test(digitsOnly)) {
    return { valid: false, error: 'يرجى إدخال رقم هاتف صحيح (الرقم يحتوي على أرقام متكررة وهمية).' };
  }
  if (/^(?:012345678|123456789|987654321)/.test(digitsOnly)) {
    return { valid: false, error: 'يرجى إدخال رقم هاتف حقيقي للتواصل.' };
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
      error: 'رقم الهاتف يبدأ برمز العراق (+964) لكنه غير مكتمل أو غير صحيح. يرجى إدخال 11 رقماً تبدأ بـ 07 (مثال: 07801222119 أو +9647801222119).'
    };
  }

  // General International (non-Iraqi)
  if (/^(?:\+|00)(?!964)[1-9]\d{8,14}$/.test(cleaned)) {
    let intlNorm = cleaned.startsWith('00') ? '+' + cleaned.substring(2) : cleaned;
    return { valid: true, normalized: intlNorm, isIraqi: false };
  }

  return {
    valid: false,
    error: 'يرجى إدخال رقم هاتف صحيح: داخل العراق (11 رقماً يبدأ بـ 07، مثال: 07801222119)، أو رقم دولي يبدأ بمفتاح الدولة (+).'
  };
}

// -----------------------------------------------------------------------------
// 7. STEP 1 TO STEP 2 TRANSITION (Data Validation & Letterhead Population)
// -----------------------------------------------------------------------------
function showStep2() {
  const nameInput = document.querySelector('#field-name');
  const phoneInput = document.querySelector('#field-phone');
  const locInput = document.querySelector('#field-location');
  const topicInput = document.querySelector('#topic');
  const summaryInput = document.querySelector('#field-summary');
  const titleRadio = document.querySelector('input[name="title_prefix"]:checked');

  const nameVal = nameInput ? nameInput.value.trim() : '';
  const phoneVal = phoneInput ? phoneInput.value.trim() : '';
  const locVal = locInput ? locInput.value.trim() : '';
  const topicVal = topicInput ? topicInput.value.trim() : '';
  const summaryVal = summaryInput ? summaryInput.value.trim() : '';
  const titlePrefix = titleRadio ? titleRadio.value : 'السيد';

  if (!nameVal || !phoneVal || !topicVal) {
    if (step1Error) {
      step1Error.hidden = false;
      step1Error.textContent = 'يرجى إكمال الحقول الأساسية (الاسم، الهاتف، وموضوع القضية) للمتابعة إلى الخطوة التالية.';
    }
    if (!nameVal && nameInput) nameInput.focus();
    else if (!phoneVal && phoneInput) phoneInput.focus();
    else if (!topicVal && topicInput) topicInput.focus();
    return;
  }

  const phoneCheck = normalizeAndValidatePhone(phoneVal);
  if (!phoneCheck.valid) {
    if (step1Error) {
      step1Error.hidden = false;
      step1Error.textContent = phoneCheck.error;
    }
    if (phoneInput) phoneInput.focus();
    return;
  }

  currentCleanPhone = phoneCheck.normalized;
  if (phoneInput) phoneInput.value = currentCleanPhone;
  if (step1Error) step1Error.hidden = true;

  // Populate Official Letterhead Paper Docket
  const docDate = document.querySelector('#doc-date');
  const docId = document.querySelector('#doc-id');
  const docCatVal = document.querySelector('#doc-cat-val');
  const docServiceRow = document.querySelector('#doc-service-row');
  const docServiceVal = document.querySelector('#doc-service-val');
  const docClientInfo = document.querySelector('#doc-client-info');
  const docFactsVal = document.querySelector('#doc-facts-val');

  if (docDate) docDate.textContent = getArabicDate();
  if (docId) docId.textContent = "TEMP-" + Math.floor(1000 + Math.random() * 9000);

  if (docClientInfo) {
    let clientStr = titlePrefix + ' ' + nameVal + ' • هاتف: ' + currentCleanPhone;
    if (locVal) clientStr += ' • سكن: ' + locVal;
    docClientInfo.textContent = clientStr;
  }

  if (docCatVal) docCatVal.textContent = topicVal;
  if (docServiceRow && docServiceVal) {
    if (currentServiceTitle) {
      docServiceRow.style.display = 'block';
      docServiceVal.textContent = currentServiceTitle;
    } else {
      docServiceRow.style.display = 'none';
    }
  }

  if (docFactsVal) {
    docFactsVal.textContent = summaryVal || 'لم يُدرج ملخص تفصيلي؛ سيتم بحث الوقائع في جلسة الاستشارة المباشرة مع المحامي.';
  }

  const deadlineInput = document.querySelector('#field-deadline');
  const deadlineVal = deadlineInput ? deadlineInput.value.trim() : '';
  const docDeadlineRow = document.querySelector('#doc-deadline-row');
  const docDeadlineVal = document.querySelector('#doc-deadline-val');
  if (docDeadlineRow && docDeadlineVal) {
    if (deadlineVal) {
      docDeadlineRow.style.display = 'flex';
      docDeadlineVal.textContent = deadlineVal;
    } else {
      docDeadlineRow.style.display = 'none';
    }
  }

  const oppNameVal = (document.querySelector('#field-opponent-name') || {}).value || '';
  const oppPhoneVal = (document.querySelector('#field-opponent-phone') || {}).value || '';
  const oppLocVal = (document.querySelector('#field-opponent-loc') || {}).value || '';
  const docOpponentInfo = document.querySelector('#doc-opponent-info');
  if (docOpponentInfo) {
    let oppStr = oppNameVal ? oppNameVal : 'غير محدد في هذا الطلب';
    if (oppPhoneVal) oppStr += ' • هاتف: ' + oppPhoneVal;
    if (oppLocVal) oppStr += ' (' + oppLocVal + ')';
    docOpponentInfo.textContent = oppStr;
  }

  // Switch steps cleanly (siblings, never nested)
  if (step1Details && step2Payment) {
    step1Details.hidden = true;
    step2Payment.hidden = false;
    updateReceiptLock(receiptValid);
    const docPaper = document.querySelector('#official-doc');
    if (docPaper) docPaper.focus();
  }
}

// -----------------------------------------------------------------------------
// 8. FILE INTEGRITY VERIFICATION (Image & PDF Magic Bytes Check)
// -----------------------------------------------------------------------------
if (receipt) {
  receipt.addEventListener('change', async () => {
    const file = receipt.files[0];
    clearPreview();
    if (!file) return;

    if (file.size === 0) {
      if (receiptStatus) receiptStatus.textContent = 'الملف المرفق فارغ (حجمه صفر بايت). يرجى اختيار إشعار تحويل صالح.';
      updateReceiptLock(false);
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      if (receiptStatus) receiptStatus.textContent = 'حجم الملف أكبر من 8 ميغابايت. يرجى إرفاق إشعار أصغر حجماً.';
      updateReceiptLock(false);
      return;
    }

    const isPdf = (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);

    if (!isPdf && !isImage) {
      if (receiptStatus) receiptStatus.textContent = 'يرجى اختيار صورة بصيغة (JPG/PNG/WebP) أو ملف PDF لإشعار التحويل.';
      updateReceiptLock(false);
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

      // Magic bytes verification
      if (isPdf) {
        // PDF DataURL format: data:application/pdf;base64,JVBERi0...
        const base64Part = fileData.split(',')[1] || '';
        if (!base64Part.startsWith('JVBERi0')) { // JVBERi0 is base64 for %PDF-
          throw new Error('الملف المرفق لا يطابق بنية مستندات PDF الصالحة.');
        }
        if (preview) preview.style.display = 'none';
        if (pdfBox) {
          pdfBox.style.display = 'block';
          if (pdfName) pdfName.textContent = file.name;
          if (pdfSize) pdfSize.textContent = (file.size / 1024).toFixed(1) + ' كيلوبايت (مستند PDF رسمي)';
        }
      } else {
        // Image Decode Verification
        if (pdfBox) pdfBox.style.display = 'none';
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = previewUrl;
        await img.decode(); // Ensures image is not corrupt
        if (preview) {
          preview.src = previewUrl;
          preview.style.display = 'block';
        }
      }

      if (thisVersion !== imageVersion) return;

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
      clearPreview();
    }
  });
}

const removeReceiptBtn = document.querySelector('#remove-receipt');
if (removeReceiptBtn) removeReceiptBtn.addEventListener('click', clearPreview);

// -----------------------------------------------------------------------------
// 9. SUBMISSION STATE MACHINE & IDEMPOTENT HANDOFF (Safe Timeout & textContent)
// -----------------------------------------------------------------------------
const briefForm = document.querySelector('#brief');
if (briefForm) {
  briefForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (formState === 'submitting' || formState === 'success') {
      return; // Prevent duplicate execution
    }

    if (!receiptValid || !receiptBase64) {
      alert('يرجى إرفاق صورة إشعار أو وصل التحويل أولاً لتأكيد طلبك وتحديد موعد الاستشارة.');
      return;
    }

    formState = 'submitting';
    if (finalSubmitBtn) finalSubmitBtn.disabled = true;
    if (submitBtnText) submitBtnText.textContent = '⏳ جارٍ حفظ وتأكيد الطلب في السجل الرسمي...';

    const f = new FormData(briefForm);
    const titlePrefix = f.get('title_prefix') || 'السيد';
    const name = String(f.get('name') || '').trim();
    const loc = String(f.get('location') || '').trim();
    const topic = String(f.get('topic') || '').trim();
    const summary = String(f.get('summary') || '').trim();
    const deadlineVal = (document.querySelector('#field-deadline') || {}).value || '';
    const prefContact = f.get('pref_contact') || 'رسالة واتساب أولاً';
    const prefTime = f.get('pref_time') || 'أي وقت مناسب خلال ساعات الدوام';
    const safeDiscreet = f.get('safe_discreet') ? 'نعم (تواصل محايد وسري)' : 'لا مانع';

    const payload = {
      requestId: currentDraftRequestId,
      date: getArabicDate(),
      titlePrefix: titlePrefix,
      name: name,
      phone: currentCleanPhone,
      prefContact: prefContact,
      prefTime: prefTime,
      safeDiscreet: safeDiscreet,
      deadline: deadlineVal,
      location: loc,
      topic: topic,
      category: f.get('category') || '',
      serviceTitle: currentServiceTitle,
      serviceId: currentServiceId,
      planId: currentPlan.id,
      receiptBase64: receiptBase64
    };

    // 25-Second Timeout Controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const response = await fetch('api/submit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const resData = await response.json();

      if (!response.ok || resData.status !== 'success') {
        throw new Error(resData.message || 'تعذر حفظ الطلب في الخادم');
      }

      formState = 'success';
      const assignedDocketId = resData.docketId || 'IQ-SA-CONFIRMED';

      // Secure DOM construction via textContent
      const handoff = document.querySelector('#handoff');
      if (handoff) {
        handoff.hidden = false;
        handoff.innerHTML = ''; // reset

        const card = document.createElement('div');
        card.style.cssText = 'background:#edf7ed; border:1px solid #4caf50; border-radius:8px; padding:18px; margin-top:14px; text-align:right;';

        const headTitle = document.createElement('div');
        headTitle.style.cssText = 'font-weight:700; color:#2e7d32; font-size:15px; margin-bottom:8px;';
        headTitle.textContent = '✅ تم تسجيل طلبك وتوثيق الإضبارة برقم: ';

        const codeEl = document.createElement('code');
        codeEl.dir = 'ltr';
        codeEl.style.cssText = 'background:#fff; padding:3px 8px; border-radius:4px; border:1px solid #c8e6c9; font-weight:700; margin-right:6px;';
        codeEl.textContent = assignedDocketId;
        headTitle.appendChild(codeEl);
        card.appendChild(headTitle);

        const descP = document.createElement('p');
        descP.style.cssText = 'margin:0 0 12px 0; font-size:12.5px; color:#1e392a; line-height:1.8;';
        descP.textContent = 'وصل طلبك وإشعار التحويل بنجاح إلى السجل الإداري للمكتب. نتواصل معك لتأكيد الموعد عبر (' + prefContact + ') في الوقت المحدد (' + prefTime + '). مدة الساعتين هي لتأكيد الاستلام والترتيب وليست موعد انعقاد الجلسة.';
        card.appendChild(descP);

        // WhatsApp confirmation button
        const waText = [
          'طلب استشارة قانونية — مكتب المحامي سعد أميل',
          'رقم الطلب: ' + assignedDocketId,
          'الاسم: ' + titlePrefix + ' ' + name,
          'الخدمة: ' + (currentServiceTitle || topic),
          'تم إرفاق إشعار التحويل بنجاح، بانتظار التواصل لتأكيد الموعد.'
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
      if (finalSubmitBtn) finalSubmitBtn.disabled = false;
      if (submitBtnText) submitBtnText.textContent = `إعادة محاولة الإرسال (${currentPlan.formattedFee}) ←`;

      let errMsg = err.name === 'AbortError' 
        ? 'تعذر الاتصال بالخادم لتأكيد النتيجة خلال المهلة (25 ثانية). بياناتك ومرفقك محفوظة؛ اضغط إعادة المحاولة.'
        : (err.message || 'حدث خطأ في الاتصال. يمكنك إعادة المحاولة الآن.');
      alert(errMsg);
    }
  });
}

// -----------------------------------------------------------------------------
// 10. EVENT DELEGATION & ACTION HANDLERS (Zero Duplicate Listeners)
// -----------------------------------------------------------------------------
document.addEventListener('click', (e) => {
  // 1. Payment Tabs
  const tabIq = e.target.closest('#pay-tab-iq');
  const tabIntl = e.target.closest('#pay-tab-intl');
  if (tabIq) {
    setPlan('iraq', { userSwitched: true });
    return;
  }
  if (tabIntl) {
    setPlan('international', { userSwitched: true });
    return;
  }

  // 2. Step Navigation
  if (e.target.closest('#go-to-step-2')) {
    e.preventDefault();
    showStep2();
    return;
  }
  if (e.target.closest('#back-to-step-1')) {
    e.preventDefault();
    resetToStep1();
    return;
  }
  if (e.target.closest('#close-modal')) {
    dialog.close();
    return;
  }

  // 3. Consultation Opening Buttons (Action Buttons Only!)
  const btn = e.target.closest('button[data-topic], button[data-category], a[data-topic], .lawsuit-chip, .open-consult-modal, .pillar-card .button, .hero-cta-btn');
  if (!btn) return;

  // Exclude tab navigation, search pills, or structural section wrappers
  if (btn.classList.contains('dir-filter-pill') || btn.classList.contains('guide-tabs-btn') || btn.getAttribute('role') === 'tab' || btn.classList.contains('dir-category-block')) {
    return;
  }

  e.preventDefault();
  const rawTopic = btn.dataset.topic || (btn.classList.contains('lawsuit-chip') ? btn.textContent.trim() : '');
  const rawCat = btn.dataset.category || '';
  const explicitPlan = btn.dataset.plan || ((rawCat === 'diaspora' || rawTopic.includes('مغترب')) ? 'international' : 'iraq');

  openConsultationModal({
    planId: explicitPlan,
    category: rawCat,
    serviceTitle: rawTopic,
    serviceId: btn.dataset.serviceId || ''
  });
});

// Modal close handler
if (dialog) {
  dialog.addEventListener('click', e => {
    const r = dialog.getBoundingClientRect();
    if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) {
      dialog.close();
    }
  });

  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
    clearPreview();
    resetToStep1();
    if (previousFocus) previousFocus.focus();
  });
}

// -----------------------------------------------------------------------------
// 11. JUDICIAL DIRECTORY (120 Lawsuits) LIVE SEARCH & FALLBACK
// -----------------------------------------------------------------------------
(function initJudicialDirectory() {
  const searchInput = document.querySelector('#dir-search-input');
  const searchCount = document.querySelector('#dir-search-count');
  const filterPills = document.querySelectorAll('.dir-filter-pill');
  const categoryBlocks = document.querySelectorAll('.dir-category-block');
  const emptyState = document.querySelector('#dir-empty-state');
  const lawsuitChips = document.querySelectorAll('.lawsuit-chip');

  if (!searchInput || !lawsuitChips.length) return;

  let activeCategory = 'all';

  function applyFilter() {
    const rawQuery = (searchInput.value || '').trim();
    const queryTerms = getExpandedQueryTerms(rawQuery);
    let visibleTotal = 0;

    categoryBlocks.forEach(block => {
      const blockCat = block.dataset.category;
      const matchesCat = (activeCategory === 'all' || activeCategory === blockCat);
      let visibleInBlock = 0;

      const chips = block.querySelectorAll('.lawsuit-chip');
      chips.forEach(chip => {
        const chipNorm = normalizeArabicText(chip.textContent);
        const catNorm = normalizeArabicText(blockCat || '');

        let matchesQuery = true;
        if (queryTerms.length > 0) {
          const userWords = normalizeArabicText(rawQuery).split(' ').filter(w => w.length > 0);
          matchesQuery = userWords.every(uWord => {
            const strippedU = (uWord.startsWith('ال') && uWord.length > 3) ? uWord.substring(2) : uWord;
            const matchesDirect = chipNorm.includes(uWord) || chipNorm.includes(strippedU) || catNorm.includes(uWord);
            if (matchesDirect) return true;
            const syns = legalSynonymsMap[strippedU] || legalSynonymsMap[uWord] || [];
            return syns.some(s => chipNorm.includes(s));
          });
        }

        if (matchesCat && matchesQuery) {
          chip.style.display = 'inline-flex';
          visibleInBlock++;
          visibleTotal++;
        } else {
          chip.style.display = 'none';
        }
      });

      block.style.display = (visibleInBlock > 0) ? 'block' : 'none';
    });

    if (searchCount) {
      searchCount.textContent = `(${visibleTotal} دعوى)`;
    }

    if (emptyState) {
      if (visibleTotal === 0) {
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

  const emptyConsultBtn = document.querySelector('#dir-empty-consult-btn');
  if (emptyConsultBtn) {
    emptyConsultBtn.addEventListener('click', () => {
      openConsultationModal({
        planId: 'iraq',
        category: 'general',
        serviceTitle: 'استشارة عامة بخصوص: ' + (searchInput.value.trim() || 'مسألة قضائية')
      });
    });
  }
})();

// -----------------------------------------------------------------------------
// 12. FORENSIC HASHER (Local SHA-256 Utility)
// -----------------------------------------------------------------------------
const forensicInput = document.querySelector('#forensic-file-input');
const forensicOutput = document.querySelector('#forensic-hash-output');
const forensicHashVal = document.querySelector('#forensic-hash-val');
const copyHashBtn = document.querySelector('#copy-hash-btn');

if (forensicInput) {
  forensicInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (forensicOutput) forensicOutput.style.display = 'block';
    if (forensicHashVal) forensicHashVal.textContent = '⏳ جارٍ حساب بصمة الملف محلياً...';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
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
    if (text && !text.includes('⏳')) {
      navigator.clipboard.writeText(text).then(() => {
        copyHashBtn.textContent = 'تم النسخ ✓';
        setTimeout(() => copyHashBtn.textContent = 'نسخ البصمة', 2000);
      });
    }
  });
}

// -----------------------------------------------------------------------------
// 13. ARTICLE READER & CONSULTATION INTEGRATION
// -----------------------------------------------------------------------------
function initArticlesModule() {
  const container = document.getElementById('live-articles-grid');
  const readerModal = document.getElementById('article-reader-modal');
  const closeBtn = document.getElementById('close-art-reader-modal');
  const consultBtn = document.getElementById('art-reader-consult-btn');
  const titleEl = document.getElementById('art-reader-title');
  const catEl = document.getElementById('art-reader-cat');
  const metaEl = document.getElementById('art-reader-meta');
  const contentEl = document.getElementById('art-reader-content');

  if (!container) return;
  let currentArticleTitle = '';
  let currentArticleCategory = '';

  async function loadArticles() {
    let articles = [];
    try {
      const resp = await fetch('data/articles.json');
      if (resp.ok) articles = await resp.json();
    } catch (e) {}

    if (!articles.length) return;

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
// 14. QUERY PARAMETER DEEP-LINKING (?consult=1&category=...)
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

// -----------------------------------------------------------------------------
// 15. PERSONAL STATUS COMPARATOR (Calibrated Procedural Guidance)
// -----------------------------------------------------------------------------
(function initComparator() {
  const dateSelect = document.querySelector('#comp-date');
  const issueSelect = document.querySelector('#comp-issue');
  const resultContainer = document.querySelector('#comp-result');

  if (!dateSelect || !issueSelect || !resultContainer) return;

  const compData = {
    custody: {
      title: 'نزاعات الحضانة ومشاهدة واصطحاب الأطفال',
      law1959: 'تستمر حضانة الأم للولد حتى إتمام سن العاشرة، وللمحكمة تمديدها حتى الخامسة عشرة إذا ثبتت مصلحة المحضون وفق المادة (57) من قانون الأحوال الشخصية رقم 188 لسنة 1959 المعدل.',
      jaafari: 'في الفقه الجعفري، حضانة الصبي للأب بعد إتمام السنتين وحضانة الأنثى للأب بعد سن السبع سنوات بحسب المبنى الفقهي، مع مراعاة مصلحة الصغير وحق صلة الرحم والرعاية.',
      checklist: 'المستندات الواجب تدقيقها: حجة الولادة الرسمية، عقد الزواج المسجل، وثائق تثبت صلاحية الحاضن وأمانته وأهليته الأخلاقية والصحية، وبيان محل سكن المحضون.'
    },
    divorce: {
      title: 'دعاوى التفريق والطلاق القضائي والخلع',
      law1959: 'يشترط القانون إيقاع الطلاق بحكم المحكمة أو تصديق الطلاق الخارجي لدى قاضي الأحوال الشخصية، ويتيح التفريق القضائي للضرر، الشقاق، الهجر، أو الحبس وفق المواد (34 إلى 46).',
      jaafari: 'يشترط الفقه الجعفري لصحة الطلاق صيغة خاصة وحضور شاهدين عدلين وسماع الصيغة في مجلس واحد، وفي حال تعذر الشروط يلزم سلوك طريق التفريق القضائي عبر الحاكم الشرعي.',
      checklist: 'المستندات الواجب تدقيقها: عقد الزواج الرسمي، إثبات وقوع الضرر أو محاضر الشرطة والشهود، إشعارات الإنذار العدلي بالهجر، وحجج تصديق الطلاق إن وجدت.'
    },
    alimony: {
      title: 'النفقة الزوجية ونفقة الأطفال والسكنى',
      law1959: 'تجب النفقة للزوجة على زوجها بالعقد الصحيح ولو كانت موسرة، وتُقدر بنفقة المثل بحسب يسر الزوج وعسره، وتكون ديناً ممتازاً مقدماً على سائر الديون وفق المادة (23 وما بعدها).',
      jaafari: 'النفقة واجبة مع تمكين الزوجة الكامل، وتسقط بالنشوز المثبت شرعاً وقضاءً، وتشمل المأكل والملبس والمسكن اللائق بالمعروف.',
      checklist: 'المستندات الواجب تدقيقها: كشف راتب الزوج أو إثبات دخله التجاري والأملاك، شهادة الشهود على يسره، وصولات نفقات العلاج والدراسة للأطفال.'
    },
    inheritance: {
      title: 'التركات والقسامات الشرعية والوصية الواجبة',
      law1959: 'تطبق المادة (74) الخاصة بالوصية الواجبة لأولاد الابن أو البنت المتوفى قبل مورثه بمقدار حصة أبيهم لو كان حياً بحدود ثلث التركة.',
      jaafari: 'يقسم الميراث وفق الطبقات الفقهية (الطبقة الأولى: الأبوان والأولاد؛ الثانية: الأجداد والإخوة؛ الثالثة: الأعمام والأخوال)، ولا تشمل أحكام الوصية الواجبة إلا بوجود وصية منشأة صراحة.',
      checklist: 'المستندات الواجب تدقيقها: القسام الشرعي، شهادة الوفاة، صورة السجل المدني للورثة، وسندات التسجيل العقاري للأموال المخلفة.'
    }
  };

  function renderComparator() {
    const issueKey = issueSelect.value || 'custody';
    const item = compData[issueKey] || compData.custody;

    resultContainer.innerHTML = `
      <div class="comp-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:14px; margin-bottom:14px;">
        <div class="comp-col" style="background:#fff; border:1px solid #d5dfd1; border-radius:6px; padding:14px;">
          <h4 style="color:var(--brand); margin:0 0 8px 0; font-size:13px;">⚖️ نصوص قانون الأحوال الشخصية 1959 النافذ:</h4>
          <p style="font-size:12px; line-height:1.7; color:#334155; margin:0;">${item.law1959}</p>
        </div>
        <div class="comp-col jaafari" style="background:#faf8f1; border:1px solid #d4af37; border-radius:6px; padding:14px;">
          <h4 style="color:#854d0e; margin:0 0 8px 0; font-size:13px;">📜 أحكام الفقه الجعفري المقارن:</h4>
          <p style="font-size:12px; line-height:1.7; color:#334155; margin:0;">${item.jaafari}</p>
        </div>
      </div>
      <div class="comp-alert" style="background:#f1f5f9; border-right:3px solid var(--brand); padding:10px 14px; border-radius:0 6px 6px 0; font-size:12px; color:#1e293b; margin-bottom:12px; line-height:1.6;">
        📋 <strong>عناصر ومستندات يلزم التحقق منها قضائياً:</strong> ${item.checklist}
      </div>
      <div style="font-size:11px; color:#64748b; margin-bottom:12px; line-height:1.5;">
        ⚠️ <em>تنبيه إجرائي: هذا العرض استرشادي لبيان الفروق النصية، ولا يُعد فتوى أو استشارة نهائية؛ إذ يتوقف التكييف القضائي على فحص وثيقة العقد والمستندات الثبوتية لكل واقعة مستقلة.</em>
      </div>
      <div class="comp-cta" style="text-align:center;">
        <button class="button small" type="button" id="comp-book-btn" data-topic="أحوال شخصية — ${item.title}" data-category="family" style="padding:8px 18px; font-size:12.5px;">
          طلب دراسة ملف واستشارة في مسألة: ${item.title} ←
        </button>
      </div>
    `;

    const bookBtn = resultContainer.querySelector('#comp-book-btn');
    if (bookBtn) {
      bookBtn.addEventListener('click', () => {
        openConsultationModal({
          planId: 'iraq',
          category: 'family',
          serviceTitle: bookBtn.dataset.topic
        });
      });
    }
  }

  dateSelect.addEventListener('change', renderComparator);
  issueSelect.addEventListener('change', renderComparator);
  renderComparator();
})();
