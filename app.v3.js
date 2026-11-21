/**
 * saadamil.com - Official Client Application Script (v3.3 Master Production Release)
 * Master Client Journey, Atomic Plan Synchronization, Legal Integrity & Search Engine
 * Attorney Saad Firas Amil (Iraqi Bar Association ID: 188572 - Category A)
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
let currentCategoryId = '';
let currentCleanPhone = '';
let currentDraftRequestId = generateRequestId();
let formState = 'editing'; // 'editing' | 'preparing_file' | 'submitting' | 'success' | 'error'
let isFormDirty = false;
let receiptValid = false;
let receiptBase64 = '';
let imageVersion = 0;
let previewUrl = '';
let previousFocus = null;

function stripInvisibleChars(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu, '')
    .trim();
}

function countReadableChars(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u0640\u064B-\u065F\u0670\s\u00A0]/gu, '');
  const matches = cleaned.match(/[\p{L}\p{N}]/gu);
  return matches ? matches.length : 0;
}

function hasGenuineLetters(str) {
  if (!str) return false;
  const cleaned = String(str).replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\u0640\u064B-\u065F\u0670]/gu, '');
  return /\p{L}/u.test(cleaned);
}

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
  const previousPlanId = currentPlan ? currentPlan.id : null;
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

  // Update hidden plan input
  const planInput = document.querySelector('#field-plan');
  if (planInput) planInput.value = currentPlan.id;

  // Invalidate receipt whenever currency/plan changes
  if (previousPlanId && previousPlanId !== targetId) {
    if (receiptValid || receiptBase64 || (receipt && receipt.files && receipt.files.length > 0)) {
      clearPreview(true);
      const receiptStatus = document.querySelector('#receipt-status');
      if (receiptStatus) {
        receiptStatus.textContent = 'تم تبديل خطة السداد؛ يرجى إرفاق إشعار التحويل المطابق للخطة الجديدة (' + currentPlan.formattedFee + ').';
      }
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
  briefForm.addEventListener('input', () => { isFormDirty = true; });
  briefForm.addEventListener('change', () => { isFormDirty = true; });
}

// Intercept Escape key on modal when submitting, and restore scroll on any close
let savedOverflow = '';
if (dialog) {
  dialog.addEventListener('cancel', (e) => {
    if (formState === 'submitting') {
      e.preventDefault();
    }
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = savedOverflow || '';
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
  });
}

function resetToStep1() {
  if (step1Details && step2Payment) {
    step1Details.hidden = false;
    step1Details.style.display = 'block';
    step2Payment.hidden = true;
    step2Payment.style.display = 'none';
  }
  if (step1Error) {
    step1Error.hidden = true;
    step1Error.textContent = '';
  }
  if (briefForm) {
    briefForm.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute('aria-invalid'));
  }
}

function hasActiveDraft() {
  if (formState === 'success') return false;
  if (isFormDirty) return true;
  const nameVal = stripInvisibleChars(document.querySelector('#field-name')?.value || '');
  const phoneVal = stripInvisibleChars(document.querySelector('#field-phone')?.value || '');
  const locVal = stripInvisibleChars(document.querySelector('#field-location')?.value || '');
  const summaryVal = stripInvisibleChars(document.querySelector('#field-summary')?.value || '');
  const deadlineVal = stripInvisibleChars(document.querySelector('#field-deadline')?.value || '');
  const oppNameVal = stripInvisibleChars(document.querySelector('#field-opponent-name')?.value || '');
  const oppPhoneVal = stripInvisibleChars(document.querySelector('#field-opponent-phone')?.value || '');
  const oppLocVal = stripInvisibleChars(document.querySelector('#field-opponent-loc')?.value || '');

  const prefTime = document.querySelector('#field-pref-time')?.value;
  const isTimeModified = Boolean(prefTime && !prefTime.includes('أي وقت مناسب'));

  const prefContact = document.querySelector('#field-pref-contact')?.value;
  const isContactModified = Boolean(prefContact && !prefContact.includes('واتساب'));

  const safeDiscreet = document.querySelector('#field-safe-discreet');
  const isDiscreetModified = Boolean(safeDiscreet && !safeDiscreet.checked);

  const mrsRadio = document.querySelector('input[name="title_prefix"][value="السيدة"]');
  const isPrefixModified = Boolean(mrsRadio && mrsRadio.checked);

  const topicVal = document.querySelector('#topic')?.value || '';
  const isTopicSelected = Boolean(topicVal);

  const hasFile = receipt && receipt.files && receipt.files.length > 0;
  return Boolean(nameVal || phoneVal || locVal || summaryVal || deadlineVal || oppNameVal || oppPhoneVal || oppLocVal || isTimeModified || isContactModified || isDiscreetModified || isPrefixModified || isTopicSelected || hasFile || receiptValid || receiptBase64);
}

function startNewDraft() {
  isFormDirty = false;
  formState = 'editing';
  currentDraftRequestId = generateRequestId();
  hideDraftConflictBanner();

  // Remove previous submission success card if present
  const existingSuccess = document.querySelector('.submission-success-card');
  if (existingSuccess) existingSuccess.remove();
  const handoff = document.querySelector('#handoff');
  if (handoff) {
    handoff.hidden = true;
    handoff.innerHTML = '';
  }

  // Reset brief form fields
  if (briefForm) briefForm.reset();
  const prefTimeEl = document.querySelector('#field-pref-time');
  if (prefTimeEl) prefTimeEl.selectedIndex = 0;
  const prefContactEl = document.querySelector('#field-pref-contact');
  if (prefContactEl) prefContactEl.selectedIndex = 0;
  const safeDiscreetEl = document.querySelector('#field-safe-discreet');
  if (safeDiscreetEl) safeDiscreetEl.checked = true;
  const mrRadio = document.querySelector('input[name="title_prefix"][value="السيد"]');
  if (mrRadio) mrRadio.checked = true;
  const topicDropdown = document.querySelector('#topic');
  if (topicDropdown) topicDropdown.selectedIndex = 0;

  // Clear current service / category
  currentServiceTitle = '';
  currentServiceId = '';
  currentCategoryId = '';
  const sIdInput = document.querySelector('#field-service-id');
  if (sIdInput) sIdInput.value = '';
  const cInput = document.querySelector('#field-category');
  if (cInput) cInput.value = '';

  // Reset steps
  resetToStep1();

  // Clear preview and receipt input
  clearPreview(true);

  // Reset submit button state
  if (finalSubmitBtn) {
    finalSubmitBtn.disabled = true;
    finalSubmitBtn.classList.remove('loading', 'unlocked');
    finalSubmitBtn.classList.add('locked');
  }
  if (submitBtnText) {
    submitBtnText.textContent = 'إرسال طلب الاستشارة وتأكيد التحويل ←';
  }

  // Re-enable back and remove buttons
  const backBtn = document.querySelector('#back-to-step-1, #go-to-step-1');
  if (backBtn) backBtn.disabled = false;
  if (removeReceiptBtn) removeReceiptBtn.disabled = false;

  // Re-enable payment switchers
  const payTabs = document.querySelectorAll('#step-2-payment .pay-tab, #step-2-payment [data-plan], .open-consult-modal');
  payTabs.forEach(t => t.disabled = false);

  if (receiptStatus) receiptStatus.textContent = '';
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function showDraftConflictBanner(newService, oldService, onNewDraftChosen) {
  let banner = document.querySelector('#draft-conflict-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'draft-conflict-banner';
    banner.style.cssText = 'background:#fffbeb; border:1px solid #fcd34d; border-radius:8px; padding:12px 14px; margin-bottom:16px;';
    const formHeading = document.querySelector('#step-1-details .form-heading');
    if (formHeading && formHeading.parentNode) {
      formHeading.parentNode.insertBefore(banner, formHeading.nextSibling);
    } else if (step1Details && typeof step1Details.insertBefore === 'function') {
      step1Details.insertBefore(banner, step1Details.firstChild);
    } else if (step1Details && typeof step1Details.appendChild === 'function') {
      step1Details.appendChild(banner);
    }
  }
  banner.hidden = false;
  banner.style.display = 'block';
  banner.innerHTML = `
    <div style="font-weight:700; color:#92400e; font-size:13px; margin-bottom:4px;">
      ⚠️ أنت تنقر الآن على خدمة: <strong>${escapeHtml(newService)}</strong>
    </div>
    <p style="font-size:12px; color:#78350f; line-height:1.6; margin:0 0 10px 0;">
      لديك مسودة سابقة محفوظة لقضية: <strong>${escapeHtml(oldService)}</strong>. هل ترغب في بدء طلب جديد لهذه الخدمة، أم استكمال المسودة السابقة؟
    </p>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      <button type="button" id="btn-conflict-new-request" class="button" style="background:#d97706; color:#fff; font-size:12px; padding:6px 12px; border-radius:4px; border:none; cursor:pointer; font-weight:700;">
        بدء طلب جديد لهذه الخدمة ↺
      </button>
      <button type="button" id="btn-conflict-keep-draft" class="button" style="background:#f3f4f6; color:#374151; font-size:12px; padding:6px 12px; border-radius:4px; border:1px solid #d1d5db; cursor:pointer;">
        استكمال المسودة السابقة
      </button>
    </div>
  `;
  const newBtn = banner.querySelector ? banner.querySelector('#btn-conflict-new-request') : null;
  if (newBtn) {
    newBtn.onclick = () => {
      hideDraftConflictBanner();
      if (typeof onNewDraftChosen === 'function') onNewDraftChosen();
    };
  }
  const keepBtn = banner.querySelector ? banner.querySelector('#btn-conflict-keep-draft') : null;
  if (keepBtn) {
    keepBtn.onclick = () => {
      hideDraftConflictBanner();
    };
  }
}

function hideDraftConflictBanner() {
  const banner = document.querySelector('#draft-conflict-banner');
  if (banner) {
    banner.hidden = true;
    banner.style.display = 'none';
  }
}

function applyServiceContext(serviceTitle, serviceId, categoryId, planId, customSummary) {
  currentServiceTitle = serviceTitle;
  currentServiceId = serviceId;
  currentCategoryId = categoryId;
  setPlan(planId);

  const serviceIdInput = document.querySelector('#field-service-id');
  if (serviceIdInput) serviceIdInput.value = currentServiceId;
  const categoryInput = document.querySelector('#field-category');
  if (categoryInput) categoryInput.value = currentCategoryId;
  const planInput = document.querySelector('#field-plan');
  if (planInput) planInput.value = currentPlan.id;

  const topicDropdown = document.querySelector('#topic');
  if (topicDropdown) {
    const matchedVal = mapTopicToSelectValue(serviceTitle, categoryId);
    if (matchedVal) topicDropdown.value = matchedVal;
  }

  const summaryInput = document.querySelector('#field-summary');
  if (summaryInput) {
    if (customSummary && !summaryInput.value.trim()) summaryInput.value = customSummary;
    if (currentServiceTitle) {
      summaryInput.placeholder = 'بخصوص ' + currentServiceTitle + '... اكتب فكرة موجزة عما تطلبه أو وقائع قضيتك.';
    }
  }
}

function openConsultationModal(opts = {}) {
  if (!dialog) return;
  previousFocus = document.activeElement;

  let planId = 'iraq';
  let category = '';
  let categoryId = '';
  let serviceTitle = '';
  let serviceId = '';

  if (typeof opts === 'string') {
    const preferredPlan = opts;
    serviceTitle = arguments[1] || '';
    category = arguments[2] || '';
    categoryId = category;
    planId = (category === 'diaspora' || preferredPlan.includes('مغترب') || preferredPlan.includes('USD')) ? 'international' : 'iraq';
  } else if (opts && typeof opts === 'object') {
    planId = opts.planId || ((opts.categoryId === 'diaspora' || opts.category === 'diaspora' || opts.plan === 'international') ? 'international' : 'iraq');
    categoryId = opts.categoryId || opts.category || '';
    category = opts.category || opts.categoryId || '';
    serviceTitle = opts.serviceTitle || opts.topic || '';
    serviceId = opts.serviceId || '';
  }

  const hasDraft = hasActiveDraft();

  // 1. Reset state cleanly only if previously submitted or no active draft
  if (formState === 'success' || !hasDraft) {
    startNewDraft();
  } else {
    // Ensure modal opens on Step 1 with preserved draft inputs
    resetToStep1();
  }

  // Determine if this is a general/resume opening
  const isResumeAction = Boolean(opts.isResume || opts.action === 'resume-consultation');
  const isGenericOpen = Boolean(
    isResumeAction ||
    (!serviceId && (!serviceTitle || normalizeArabicText(serviceTitle).includes('احجز استشار') || normalizeArabicText(serviceTitle).includes('طلب استشار') || normalizeArabicText(serviceTitle).includes('افتح ملف استشارتك')) && !categoryId)
  );

  const effectiveCurrentTitle = currentServiceTitle || document.querySelector('#topic')?.value || '';
  const hasDifferentService = (!isGenericOpen && hasDraft && serviceTitle && effectiveCurrentTitle && normalizeArabicText(serviceTitle) !== normalizeArabicText(effectiveCurrentTitle));

  if (hasDifferentService) {
    // Show conflict prompt and FREEZE draft - do not touch existing inputs or summary!
    showDraftConflictBanner(serviceTitle, effectiveCurrentTitle, () => {
      startNewDraft();
      applyServiceContext(serviceTitle, serviceId, categoryId, planId, opts.customSummary);
    });
  } else {
    hideDraftConflictBanner();

    if (hasDraft && isGenericOpen) {
      // Resuming active draft: preserve existing plan, service, category, inputs, receipt intact!
    } else {
      if (!isGenericOpen && serviceTitle) {
        applyServiceContext(serviceTitle, serviceId, categoryId, planId, opts.customSummary);
      } else {
        setPlan(planId);
      }
    }

    // 4. Populate hidden inputs for backend tracking
    const serviceIdInput = document.querySelector('#field-service-id');
    if (serviceIdInput) serviceIdInput.value = currentServiceId;
    const categoryInput = document.querySelector('#field-category');
    if (categoryInput) categoryInput.value = currentCategoryId;
    const planInput = document.querySelector('#field-plan');
    if (planInput) planInput.value = currentPlan.id;

    // 5. Update Category Select
    const topicDropdown = document.querySelector('#topic');
    if (topicDropdown) {
      if (!hasDraft || (!isGenericOpen && currentServiceTitle)) {
        const matchedVal = mapTopicToSelectValue(currentServiceTitle, currentCategoryId || category);
        if (matchedVal) {
          topicDropdown.value = matchedVal;
        } else if (!hasDraft) {
          topicDropdown.selectedIndex = 0;
        }
      }
    }

    // 6. Update summary placeholder & initial query (NEVER overwrite existing user facts!)
    const summaryInput = document.querySelector('#field-summary');
    if (summaryInput) {
      if (opts.customSummary && !hasDraft && !summaryInput.value.trim()) {
        summaryInput.value = opts.customSummary;
      }
      if (currentServiceTitle) {
        summaryInput.placeholder = 'بخصوص ' + currentServiceTitle + '... اكتب فكرة موجزة عما تطلبه أو وقائع قضيتك.';
      } else {
        summaryInput.placeholder = 'اكتب فكرة عامة وموجزة عن المشكلة أو السؤال القانوني...';
      }
    }
  }

  // 7. Pre-fill date
  const docDate = document.querySelector('#doc-date');
  if (docDate) docDate.textContent = getArabicDate();

  // 8. Show Modal
  savedOverflow = document.body.style.overflow;
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
// 4. CANONICAL CATEGORY MAPPING (Strict Category Hierarchy & Safe Word Matching)
// -----------------------------------------------------------------------------
const CANONICAL_CATEGORIES = {
  'family': 'قضايا الأحوال الشخصية والأسرة',
  'real-estate': 'قضايا العقارات وإزالة الشيوع والتركات',
  'civil': 'قضايا العقارات وإزالة الشيوع والتركات',
  'cybercrime': 'الجرائم الإلكترونية ومكافحة الابتزاز',
  'labor': 'قضايا العمل والضمان الاجتماعي والوظيفة العامة',
  'corporate': 'الشركات والاستثمار والعقود التجارية',
  'compensation': 'قضايا التعويضات والمسؤولية المدنية والنزاعات المالية',
  'execution': 'قضايا التعويضات والمسؤولية المدنية والنزاعات المالية',
  'criminal': 'القضاء الجنائي والتحقيق والجنح',
  'military': 'القضاء الجنائي والتحقيق والجنح',
  'cassation': 'استشارة قانونية عامة / لستُ متأكداً من التكييف',
  'admin': 'القضاء الإداري ومحكمة قضاء الموظفين والنزاهة',
  'administrative': 'القضاء الإداري ومحكمة قضاء الموظفين والنزاهة',
  'diaspora': 'خدمات المغتربين والوكالات القنصلية',
  'general': 'استشارة قانونية عامة / لستُ متأكداً من التكييف'
};

function reverseMapTopicToCategoryId(topicVal) {
  if (!topicVal) return 'general';
  const norm = normalizeArabicText(topicVal);
  if (norm.includes('عقار') || norm.includes('شيوع') || norm.includes('تركات')) return 'real-estate';
  if (norm.includes('اسره') || norm.includes('احوال') || norm.includes('طلاق') || norm.includes('زواج')) return 'family';
  if (norm.includes('الكتروني') || norm.includes('ابتزاز') || norm.includes('ادله رقميه')) return 'cybercrime';
  if (norm.includes('عمل') || norm.includes('عمال') || norm.includes('ضمان')) return 'labor';
  if (norm.includes('شركات') || norm.includes('استثمار') || norm.includes('تجاري')) return 'corporate';
  if (norm.includes('تعويض') || norm.includes('مسؤوليه') || norm.includes('تنفيذ') || norm.includes('ديون') || norm.includes('مالي')) return 'compensation';
  if (norm.includes('جنائي') || norm.includes('تحقيق') || norm.includes('كفال') || norm.includes('جنح')) return 'criminal';
  if (norm.includes('اداري') || norm.includes('موظفين') || norm.includes('نزاهه')) return 'administrative';
  if (norm.includes('مغترب') || norm.includes('قنصلي') || norm.includes('جاليه')) return 'diaspora';
  return 'general';
}

// Synchronize manual #topic dropdown changes with hidden #field-category & reset mismatched service
const topicDropdownEl = document.querySelector('#topic');
if (topicDropdownEl) {
  topicDropdownEl.addEventListener('change', () => {
    const selectedTopic = topicDropdownEl.value;
    const catId = reverseMapTopicToCategoryId(selectedTopic);
    currentCategoryId = catId;
    const catInput = document.querySelector('#field-category');
    if (catInput) catInput.value = catId;

    currentServiceId = '';
    currentServiceTitle = selectedTopic;
    const sIdInput = document.querySelector('#field-service-id');
    if (sIdInput) sIdInput.value = '';
    const sTitleInput = document.querySelector('#field-service-title');
    if (sTitleInput) sTitleInput.value = '';

    const banner = document.querySelector('#service-context-banner');
    if (banner) banner.hidden = true;
  });
}

function mapTopicToSelectValue(topic = '', category = '') {
  const cat = String(category || '').toLowerCase().trim();
  const c = normalizeArabicText(category);
  const t = normalizeArabicText(topic);

  // ---------------------------------------------------------------------------
  // PRIORITY 1: Explicit Category Takes 100% Precedence (Zero False Traps!)
  // ---------------------------------------------------------------------------
  if (cat && CANONICAL_CATEGORIES[cat]) {
    return CANONICAL_CATEGORIES[cat];
  }

  // Check Arabic category strings
  if (c) {
    if (c.includes('اسره') || c.includes('احوال شخصيه') || c.includes('زواج') || c.includes('طلاق')) {
      return 'قضايا الأحوال الشخصية والأسرة';
    }
    if (c.includes('عقار') || c.includes('شيوع') || c.includes('تركات') || c.includes('طابو')) {
      return 'قضايا العقارات وإزالة الشيوع والتركات';
    }
    if (c.includes('الكتروني') || c.includes('ابتزاز') || c.includes('ادله رقميه') || c.includes('سايبر')) {
      return 'الجرائم الإلكترونية ومكافحة الابتزاز';
    }
    if (c.includes('عمل') || c.includes('عمال') || c.includes('ضمان اجتماعي')) {
      return 'قضايا العمل والضمان الاجتماعي والوظيفة العامة';
    }
    if (c.includes('شركات') || c.includes('استثمار') || c.includes('تجاري') || c.includes('تحكيم')) {
      return 'الشركات والاستثمار والعقود التجارية';
    }
    if (c.includes('تعويض') || c.includes('مسؤوليه') || c.includes('تنفيذ') || c.includes('ديون') || c.includes('سندات')) {
      return 'قضايا التعويضات والمسؤولية المدنية والنزاعات المالية';
    }
    if (c.includes('جنائي') || c.includes('تحقيق') || c.includes('جنح') || c.includes('جنايات') || c.includes('عسكري')) {
      return 'القضاء الجنائي والتحقيق والجنح';
    }
    if (c.includes('اداري') || c.includes('موظفين') || c.includes('نزاهه') || c.includes('اقامه') || c.includes('تسفير')) {
      return 'القضاء الإداري ومحكمة قضاء الموظفين والنزاهة';
    }
    if (c.includes('مغترب') || c.includes('قنصلي') || c.includes('جاليه') || c.includes('دوليه')) {
      return 'خدمات المغتربين والوكالات القنصلية';
    }
  }

  // ---------------------------------------------------------------------------
  // PRIORITY 2: Distinctive Keyword Matching (Whole-Word Safe Fallback)
  // ---------------------------------------------------------------------------
  if (!t) return '';

  // 1. Family / Personal Status (Checked before debts so 'الوالدين' is NEVER trapped by 'دين')
  if (t.includes('نفقه') || t.includes('والدين') || t.includes('اقارب') || t.includes('طلاق') || t.includes('تفريق') || t.includes('زواج') || t.includes('حضانه') || t.includes('محضون') || t.includes('مشاهده') || t.includes('اصطحاب') || t.includes('مهر') || t.includes('قسام شرعي') || t.includes('حصر ارث') || t.includes('نشوز') || t.includes('خلع') || t.includes('مدونه 2025') || t.includes('نسب')) {
    return 'قضايا الأحوال الشخصية والأسرة';
  }

  // 2. Torts, Medical Malpractice, Accidents & Debt (Safe Word Boundary Check!)
  if (t.includes('خطا طبي') || t.includes('اخطاء طبيه') || t.includes('حادث سير') || t.includes('حوادث السير') || t.includes('فعل ضار') || t.includes('توقيف كيدي') || t.includes('حبس تعسفي') || t.includes('تعويض عن') || t.includes('مطالبه بالتعويض') || t.includes('تامين')) {
    return 'قضايا التعويضات والمسؤولية المدنية والنزاعات المالية';
  }
  const hasDebtWord = /(?:^|\s)(?:سندات|كمبيالات|دفاتر تجاريه|سفتجه|سند دين|شيك مرتجع|صك بدون رصيد|مطالبه بالديون|ديون|دين)(?:\s|$)/.test(t);
  if (hasDebtWord || t.includes('حجز احتياطي')) {
    return 'قضايا التعويضات والمسؤولية المدنية والنزاعات المالية';
  }

  // 3. Administrative & Employee
  if (t.includes('تسفير') || t.includes('ابعاد') || t.includes('اقامه الاجانب') || t.includes('جوازات') || t.includes('سحب اليد') || t.includes('قضاء موظفين') || t.includes('مجلس انضباط') || t.includes('نزاهه') || t.includes('ترفيع') || t.includes('علاوه') || t.includes('قرار اداري')) {
    return 'القضاء الإداري ومحكمة قضاء الموظفين والنزاهة';
  }

  // 4. Labor & Employment
  if (t.includes('فصل تعسفي') || t.includes('عقد عمل') || t.includes('عقود العمل') || t.includes('ضمان اجتماعي') || t.includes('مكافاه نهايه الخدمه') || t.includes('اجور عمال') || t.includes('نزاع عمالي')) {
    return 'قضايا العمل والضمان الاجتماعي والوظيفة العامة';
  }

  // 5. Real Estate & Shuyuu
  if (t.includes('شيوع') || t.includes('عقار') || t.includes('منع معارضه') || t.includes('تثبيت ملكيه') || t.includes('1198') || t.includes('ابطال تسجيل عقاري') || t.includes('طابو') || t.includes('اخلاء ماجور') || t.includes('تخليه') || t.includes('بدلات ايجار') || t.includes('شفعه') || t.includes('حيازه') || t.includes('اراضي زراعيه') || t.includes('لزامه') || t.includes('اجر المثل')) {
    return 'قضايا العقارات وإزالة الشيوع والتركات';
  }

  // 6. Cybercrime
  if (t.includes('ابتزاز') || t.includes('الكتروني') || t.includes('تزييف') || t.includes('ديب فيك') || t.includes('تسجيل صوتي') || t.includes('دليل رقمي') || t.includes('سب وقذف الكتروني') || t.includes('اختراق')) {
    return 'الجرائم الإلكترونية ومكافحة الابتزاز';
  }

  // 7. Corporate
  if (t.includes('تصفيه شركات') || t.includes('تاسيس شركات') || t.includes('عقد تجاري') || t.includes('علامه فارقه') || t.includes('تحكيم تجاري') || t.includes('مقاولات') || t.includes('استثمار')) {
    return 'الشركات والاستثمار والعقود التجارية';
  }

  // 8. Criminal
  if (t.includes('قتل') || t.includes('كفاله') || t.includes('مخدرات') || t.includes('دكه') || t.includes('دگه') || t.includes('رشوه') || t.includes('تزوير') || t.includes('قوى الامن') || t.includes('محكمه عسكريه') || t.includes('تحقيق جنائي') || t.includes('جنح') || t.includes('جنايات')) {
    return 'القضاء الجنائي والتحقيق والجنح';
  }

  // 9. Expat (Only if not family child custody travel dispute!)
  if (t.includes('وكاله قنصليه') || t.includes('صحه صدور') || t.includes('مغتربين') || t.includes('الجاليه') || (t.includes('خارج العراق') && !t.includes('محضون') && !t.includes('حضانه'))) {
    return 'خدمات المغتربين والوكالات القنصلية';
  }

  if (t.includes('استشاره عامه') || t.includes('لست متاكد') || cat === 'general') {
    return 'استشارة قانونية عامة / لستُ متأكداً من التكييف';
  }

  return '';
}

// -----------------------------------------------------------------------------
// 5. COMPREHENSIVE ARABIC NORMALIZATION & TOKENIZATION
// -----------------------------------------------------------------------------
function normalizeArabicText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/gu, ' ')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Remove tashkeel/diacritics & tatweel
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu, '') // Remove invisible & directional marks
    .replace(/[أإآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/گ/g, 'ك')
    .replace(/چ/g, 'ج')
    .replace(/پ/g, 'ب')
    .replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)])
    .replace(/[۰-۹]/g, d => '0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)])
    .toLowerCase()
    .trim();
}

const CONVERSATIONAL_STOPWORDS = new Set([
  'عندي', 'لدي', 'اريد', 'مشكل', 'مشكله', 'مشكلتي', 'بخصوص', 'صار', 'صارت', 'اكو', 'شلون', 'شنو', 'اريدها', 'اريده', 'دعواي', 'قضيتي'
]);

/**
 * Extracts normalized stem words, automatically stripping leading 'ال' for robust matching
 * Filters out conversational prefixes/fillers when substantive query tokens exist
 */
function tokenizeArabicQuery(text) {
  if (!text) return [];
  const preprocessed = String(text)
    .replace(/[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+/gu, ' ')
    .replace(/[«»""“”‘’'`?!؟*.,;:؛،/\\()\[\]{}—–\-_+<>@#$%^&~|…]+/gu, ' ');
  const normalized = normalizeArabicText(preprocessed);
  const rawWords = normalized.split(/\s+/).filter(w => w.length >= 2);
  const tokens = rawWords.map(w => {
    let word = w;
    // Strip leading definite article if word length >= 4
    if (word.startsWith('ال') && word.length >= 4) {
      word = word.substring(2);
    }
    // Strip trailing taa-marbuta / haa if word length >= 4 (e.g. كفاله -> كفال)
    if (word.endsWith('ه') && word.length >= 4) {
      word = word.substring(0, word.length - 1);
    }
    return word;
  });

  const substantiveTokens = tokens.filter(t => !CONVERSATIONAL_STOPWORDS.has(t));
  return substantiveTokens.length > 0 ? substantiveTokens : tokens;
}

// -----------------------------------------------------------------------------
// 6. PHONE VALIDATION & DIGIT NORMALIZATION
// -----------------------------------------------------------------------------
function normalizeAndValidatePhone(input) {
  if (!input) {
    return { valid: false, error: 'يرجى إدخال رقم الهاتف للتواصل.' };
  }

  let cleaned = normalizeArabicText(input).replace(/[\s\-\(\)\.]/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');

  if (digitsOnly.length < 8) {
    return { valid: false, error: 'رقم الهاتف قصير جداً وغير مكتمل.' };
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

  const nameVal = stripInvisibleChars(nameInput ? nameInput.value : '');
  const phoneVal = stripInvisibleChars(phoneInput ? phoneInput.value : '');
  const locVal = stripInvisibleChars(locInput ? locInput.value : '');
  const topicVal = stripInvisibleChars(topicInput ? topicInput.value : '');
  const summaryVal = stripInvisibleChars(summaryInput ? summaryInput.value : '');
  const titlePrefix = titleRadio ? titleRadio.value : 'السيد';

  // Strict Validation: Name, Phone, Location, Topic, and Summary are ALL Mandatory
  if (!nameVal || countReadableChars(nameVal) < 2 || !hasGenuineLetters(nameVal)) {
    showStep1Error('يرجى كتابة الاسم الكامل بالحروف للمتابعة (الاسم الثنائي أو الثلاثي على الأقل).', nameInput);
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

  if (!locVal || countReadableChars(locVal) < 2 || !hasGenuineLetters(locVal)) {
    showStep1Error('يرجى إدخال عنوان أو منطقة السكن (المحافظة والمنطقة، أو بلد الإقامة للمغتربين).', locInput);
    return;
  }
  if (!topicVal) {
    showStep1Error('يرجى اختيار مجال الاستشارة أو النزاع القضائي من القائمة.', topicInput);
    return;
  }
  if (!summaryVal || countReadableChars(summaryVal) < 10 || !hasGenuineLetters(summaryVal)) {
    showStep1Error('يرجى كتابة ملخص موجز أو السؤال القانوني الأساسي (10 أحرف مقروءة على الأقل تتضمن حروفاً) لمباشرة دراسة المسألة.', summaryInput);
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
  if (docId) docId.textContent = currentDraftRequestId;
  if (docCatVal) docCatVal.textContent = currentPlan.name;

  if (docServiceRow && docServiceVal) {
    if (currentServiceTitle) {
      docServiceRow.style.display = 'table-row';
      docServiceVal.textContent = currentServiceTitle;
    } else {
      docServiceRow.style.display = 'none';
    }
  }

  if (docClientInfo) {
    docClientInfo.textContent = `${titlePrefix} ${nameVal} (${currentCleanPhone}) — ${locVal}`;
  }

  if (docOpponentInfo) {
    const oppName = oppNameInput ? oppNameInput.value.trim() : '';
    const oppPhone = oppPhoneInput ? oppPhoneInput.value.trim() : '';
    const oppLoc = oppLocInput ? oppLocInput.value.trim() : '';
    if (oppName) {
      docOpponentInfo.textContent = `${oppName} ${oppPhone ? '(' + oppPhone + ')' : ''} ${oppLoc ? '— ' + oppLoc : ''}`;
    } else {
      docOpponentInfo.textContent = 'لم يُحدد (أو غير قابل للتطبيق في هذا النوع من الاستشارات)';
    }
  }

  if (docTopicVal) docTopicVal.textContent = topicVal;

  const deadlineVal = deadlineInput ? deadlineInput.value.trim() : '';
  if (docDeadlineRow && docDeadlineVal) {
    if (deadlineVal) {
      docDeadlineRow.style.display = 'table-row';
      docDeadlineVal.textContent = deadlineVal;
    } else {
      docDeadlineRow.style.display = 'none';
    }
  }

  if (docFactsVal) docFactsVal.textContent = summaryVal;
  if (docFeeVal) docFeeVal.textContent = currentPlan.formattedFee;

  // Transition Step 1 -> Step 2
  if (step1Details) {
    step1Details.hidden = true;
    step1Details.style.display = 'none';
  }
  if (step2Payment) {
    step2Payment.hidden = false;
    step2Payment.style.display = 'block';
  }

  // Scroll modal to top
  if (dialog) dialog.scrollTop = 0;
}

function showStep1Error(msg, focusEl) {
  if (step1Error) {
    step1Error.hidden = false;
    step1Error.textContent = msg;
  }
  if (focusEl && typeof focusEl.focus === 'function') {
    focusEl.focus();
  }
}

// -----------------------------------------------------------------------------
// 7.5. STANDALONE PDF STRUCTURAL PARSER & DEFLATE ENGINE (ISO 32000-1 Compliant)
// -----------------------------------------------------------------------------
function inflateRaw(data, bufsize) {
  let bitBuf = 0, bitLen = 0, pos = 0;
  function getBit() {
    if (bitLen === 0) {
      if (pos >= data.length) return 0;
      bitBuf = data[pos++];
      bitLen = 8;
    }
    const bit = bitBuf & 1;
    bitBuf >>= 1;
    bitLen--;
    return bit;
  }
  function getBits(n) {
    let res = 0;
    for (let i = 0; i < n; i++) res |= (getBit() << i);
    return res;
  }

  function buildTree(lengths) {
    const maxLen = Math.max(...lengths);
    const bl_count = new Uint32Array(maxLen + 1);
    for (let l of lengths) if (l > 0) bl_count[l]++;
    const next_code = new Uint32Array(maxLen + 1);
    let code = 0;
    for (let bits = 1; bits <= maxLen; bits++) {
      code = (code + bl_count[bits - 1]) << 1;
      next_code[bits] = code;
    }
    const tree = {};
    for (let i = 0; i < lengths.length; i++) {
      const len = lengths[i];
      if (len !== 0) {
        let c = next_code[len]++;
        let rev = 0;
        for (let j = 0; j < len; j++) rev = (rev << 1) | ((c >> j) & 1);
        tree[`${len}:${rev}`] = i;
      }
    }
    return { tree, maxLen };
  }

  function decodeSymbol(h) {
    let code = 0;
    for (let len = 1; len <= h.maxLen; len++) {
      code |= (getBit() << (len - 1));
      const key = `${len}:${code}`;
      if (key in h.tree) return h.tree[key];
    }
    throw new Error('Invalid Huffman symbol');
  }

  const fixedLitLengths = new Uint8Array(288);
  for (let i = 0; i <= 143; i++) fixedLitLengths[i] = 8;
  for (let i = 144; i <= 255; i++) fixedLitLengths[i] = 9;
  for (let i = 256; i <= 279; i++) fixedLitLengths[i] = 7;
  for (let i = 280; i <= 287; i++) fixedLitLengths[i] = 8;
  const fixedLitTree = buildTree(fixedLitLengths);

  const fixedDistLengths = new Uint8Array(30);
  fixedDistLengths.fill(5);
  const fixedDistTree = buildTree(fixedDistLengths);

  const lengthBases = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
  const lengthExtraBits = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
  const distBases = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
  const distExtraBits = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
  const codeOrder = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

  let out = new Uint8Array(bufsize || 65536);
  let outPos = 0;
  function ensureCapacity(needed) {
    if (outPos + needed > out.length) {
      const next = new Uint8Array(Math.max(out.length * 2, outPos + needed));
      next.set(out);
      out = next;
    }
  }

  let bfinal = 0;
  while (!bfinal) {
    bfinal = getBit();
    const btype = getBits(2);
    if (btype === 0) {
      bitBuf = 0; bitLen = 0;
      const len = data[pos] | (data[pos + 1] << 8);
      pos += 4;
      ensureCapacity(len);
      out.set(data.subarray(pos, pos + len), outPos);
      pos += len;
      outPos += len;
    } else if (btype === 1 || btype === 2) {
      let litTree, distTree;
      if (btype === 1) {
        litTree = fixedLitTree;
        distTree = fixedDistTree;
      } else {
        const hlit = getBits(5) + 257;
        const hdist = getBits(5) + 1;
        const hclen = getBits(4) + 4;
        const codeLengths = new Uint8Array(19);
        for (let i = 0; i < hclen; i++) codeLengths[codeOrder[i]] = getBits(3);
        const codeTree = buildTree(codeLengths);
        const litLengths = new Uint8Array(hlit + hdist);
        let i = 0;
        while (i < hlit + hdist) {
          const sym = decodeSymbol(codeTree);
          if (sym < 16) {
            litLengths[i++] = sym;
          } else if (sym === 16) {
            let repeat = getBits(2) + 3;
            const prev = litLengths[i - 1];
            while (repeat--) litLengths[i++] = prev;
          } else if (sym === 17) {
            let repeat = getBits(3) + 3;
            while (repeat--) litLengths[i++] = 0;
          } else if (sym === 18) {
            let repeat = getBits(7) + 11;
            while (repeat--) litLengths[i++] = 0;
          }
        }
        litTree = buildTree(litLengths.subarray(0, hlit));
        distTree = buildTree(litLengths.subarray(hlit));
      }

      while (true) {
        const sym = decodeSymbol(litTree);
        if (sym < 256) {
          ensureCapacity(1);
          out[outPos++] = sym;
        } else if (sym === 256) {
          break;
        } else {
          const lenIdx = sym - 257;
          const matchLen = lengthBases[lenIdx] + getBits(lengthExtraBits[lenIdx]);
          const distSym = decodeSymbol(distTree);
          const matchDist = distBases[distSym] + getBits(distExtraBits[distSym]);
          ensureCapacity(matchLen);
          for (let m = 0; m < matchLen; m++) {
            out[outPos] = out[outPos - matchDist];
            outPos++;
          }
        }
      }
    } else {
      throw new Error('Unsupported block type ' + btype);
    }
  }
  return out.subarray(0, outPos);
}

function zlibDecompress(bytes) {
  if (bytes[0] === 0x78) {
    return inflateRaw(bytes.subarray(2, bytes.length - 4));
  }
  return inflateRaw(bytes);
}

function parseAndValidatePdf(binaryStr, fileSize) {
  if (fileSize < 128) {
    throw new Error('ملف PDF المرفق صغير جداً أو غير مكتمل.');
  }

  // 1. Header check
  const headerIdx = binaryStr.indexOf('%PDF-');
  if (headerIdx === -1 || headerIdx > 1024) {
    throw new Error('الملف المرفق لا يطابق بنية مستندات PDF الصالحة.');
  }

  // 2. Locate startxref in tail
  const tail = binaryStr.slice(-4096);
  const startXrefMatch = tail.match(/startxref[\s\r\n]+(\d+)[\s\r\n]+%%EOF/i);
  if (!startXrefMatch) {
    throw new Error('ملف PDF المرفق غير مكتمل أو تالف (غياب علامة الفهرسة startxref أو نهاية المستند).');
  }

  const xrefOffset = parseInt(startXrefMatch[1], 10);
  if (isNaN(xrefOffset) || xrefOffset <= 0 || xrefOffset >= fileSize) {
    throw new Error('ملف PDF المرفق تالف (مؤشر جدول الفهرسة startxref غير صالح).');
  }

  // 3. Inspect xref table or XRef stream
  const targetSlice = binaryStr.slice(Math.max(0, xrefOffset - 16), Math.min(binaryStr.length, xrefOffset + 256));
  const isXrefTable = /\bxref[\s\r\n]+\d+[\s\r\n]+\d+/i.test(targetSlice);
  const isXrefStream = /\b\d+\s+\d+\s+obj[\s\S]{0,128}\/Type\s*\/XRef\b/i.test(targetSlice);

  if (!isXrefTable && !isXrefStream) {
    throw new Error('ملف PDF المرفق تالف (جدول الفهرسة startxref غير صالح أو تالف).');
  }

  // 4. Check for Document Catalog (/Root) and Encryption
  let trailerSection = '';
  if (isXrefTable) {
    const trailerIdx = binaryStr.indexOf('trailer', xrefOffset);
    if (trailerIdx === -1) {
      throw new Error('ملف PDF المرفق تالف (غياب قاموس المقطورة trailer في جدول الفهرسة).');
    }
    trailerSection = binaryStr.slice(trailerIdx, trailerIdx + 1024);
  } else {
    trailerSection = targetSlice;
  }

  if (/\/Encrypt\b/i.test(trailerSection)) {
    throw new Error('ملف PDF المرفق مشفر أو محمي بكلمة مرور. يرجى إرفاق إشعار تحويل غير مشفر.');
  }

  if (!/\/Root\s+\d+\s+\d+\s+R/i.test(trailerSection) && !/\/Root\b/i.test(trailerSection)) {
    throw new Error('ملف PDF المرفق تالف (غياب مرجع الفهرس الرئيسي /Root للمستند).');
  }

  // 5. Verify Pages (/Type /Page or /Pages)
  let hasPages = /(?:\/Type\s*\/Page\b|\/Type\s*\/Pages\b|\/Pages\s+\d+\s+\d+\s+R)/i.test(binaryStr);

  if (!hasPages) {
    // Search and decompress Object Streams (/ObjStm)
    let p = 0;
    while (!hasPages && p < binaryStr.length) {
      const streamIdx = binaryStr.indexOf('stream', p);
      if (streamIdx === -1) break;
      const dictEnd = binaryStr.lastIndexOf('>>', streamIdx);
      if (dictEnd !== -1 && dictEnd < streamIdx) {
        const dictStart = binaryStr.lastIndexOf('<<', dictEnd);
        if (dictStart !== -1) {
          const dict = binaryStr.slice(dictStart, dictEnd + 2);
          if (/\/Type\s*\/ObjStm\b/i.test(dict) || /\/Filter\s*\/FlateDecode\b/i.test(dict)) {
            let dataStart = streamIdx + 6;
            if (binaryStr[dataStart] === '\r' && binaryStr[dataStart + 1] === '\n') dataStart += 2;
            else if (binaryStr[dataStart] === '\n' || binaryStr[dataStart] === '\r') dataStart += 1;
            const endStreamIdx = binaryStr.indexOf('endstream', dataStart);
            if (endStreamIdx !== -1) {
              let dataEnd = endStreamIdx;
              if (binaryStr[dataEnd - 1] === '\n') dataEnd--;
              if (binaryStr[dataEnd - 1] === '\r') dataEnd--;
              const rawStream = binaryStr.slice(dataStart, dataEnd);
              try {
                const streamBytes = new Uint8Array(rawStream.length);
                for (let b = 0; b < rawStream.length; b++) streamBytes[b] = rawStream.charCodeAt(b);
                const decompressed = zlibDecompress(streamBytes);
                let decompText = '';
                for (let d = 0; d < decompressed.length; d++) decompText += String.fromCharCode(decompressed[d]);
                if (/(?:\/Type\s*\/Page\b|\/Type\s*\/Pages\b|\/Pages\b)/i.test(decompText)) {
                  hasPages = true;
                  break;
                }
              } catch(decErr) {
                // Ignore corrupt stream and continue
              }
            }
          }
        }
      }
      p = streamIdx + 6;
    }
  }

  if (!hasPages) {
    throw new Error('ملف PDF المرفق غير صالح (لا يحتوي على صفحات أو شجرة صفحات معتمدة).');
  }

  return { valid: true };
}

// -----------------------------------------------------------------------------
// 8. FILE INTEGRITY VERIFICATION (Strict Image Decode & PDF Magic Bytes)
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

    if (!file.size || file.size < 128) {
      if (receiptStatus) receiptStatus.textContent = 'حجم الملف المرفق صغير جداً أو غير مكتمل (أقل من 128 بايت). يرجى اختيار إشعار تحويل صالح.';
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

      // Magic bytes & structure verification
      if (isPdf) {
        const base64Part = fileData.split(',')[1] || '';
        if (!base64Part.startsWith('JVBERi0')) { // JVBERi0 is base64 for %PDF-
          throw new Error('الملف المرفق لا يطابق بنية مستندات PDF الصالحة.');
        }

        let decodedStr = '';
        try {
          if (typeof atob === 'function') {
            decodedStr = atob(base64Part);
          } else if (typeof Buffer !== 'undefined') {
            decodedStr = Buffer.from(base64Part, 'base64').toString('binary');
          }
        } catch (decErr) {
          decodedStr = '';
        }

        // Run full ISO 32000-1 Structural PDF Parser & Object Stream Decompressor
        parseAndValidatePdf(decodedStr, file.size);

        if (preview) preview.style.display = 'none';
        if (pdfBox) {
          pdfBox.style.display = 'block';
          if (pdfName) pdfName.textContent = file.name;
          if (pdfSize) pdfSize.textContent = (file.size / 1024).toFixed(1) + ' كيلوبايت (ملف PDF)';
        }
      } else {
        // Strict Image Decode Verification (Rejects corrupted images & fake JPGs)
        if (pdfBox) pdfBox.style.display = 'none';
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = previewUrl;

        try {
          await img.decode();
        } catch (decodeErr) {
          throw new Error('تعذر فك ومعالجة الصورة المرفقة. الملف تالف أو ليس صورة صالحة.');
        }

        if (!img.naturalWidth || !img.naturalHeight) {
          throw new Error('الصورة المرفقة تالفة أو غير صالحة للعرض.');
        }

        if (preview) {
          preview.src = previewUrl;
          preview.style.display = 'block';
        }
      }

      if (thisVersion !== imageVersion) return;
      if (uploadPlanId !== currentPlan.id) {
        clearPreview(true);
        if (receiptStatus) {
          receiptStatus.textContent = 'تم تبديل خطة السداد أثناء تجهيز الملف. يرجى إرفاق إشعار يطابق الخطة المختارة (' + currentPlan.formattedFee + ').';
        }
        return;
      }

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
      if (receiptStatus) receiptStatus.textContent = err.message || 'تعذر فك وتجهيز الملف المرفق. يرجى اختيار ملف صالح.';
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
const VETTED_BUSINESS_PATTERNS = [
  /رقم الهاتف/u,
  /يرجى إدخال اسم/u,
  /عنوان أو منطقة السكن/u,
  /ملخص/u,
  /إرفاق (?:إشعار|صورة|ملف)/u,
  /إشعار أو وصل التحويل/u,
  /تنسيق ترميز الملف/u,
  /الملف المرفق فارغ أو تالف/u,
  /حجم الملف/u,
  /ملف PDF المرفق/u,
  /بنية الملف المرفق لا تطابق/u,
  /استغرقت الاستجابة وقتاً أطول/u,
  /تعذر تسجيل الطلب في السجل الإداري/u
];

function sanitizeServerError(rawMsg) {
  if (typeof rawMsg !== 'string' || !rawMsg.trim()) {
    return 'تعذر تسجيل الطلب في السجل الإداري للمكتب حالياً بسبب ضغط مؤقت في الاتصال. بياناتك وإشعار التحويل محفوظة؛ يرجى النقر لإعادة المحاولة أو التواصل المباشر عبر واتساب المكتب.';
  }
  const clean = rawMsg.trim();

  // Reject technical leak indicators, code symbols, or leaked English identifiers
  if (/[_\[\]{}\$\\/]|undefined|array key|stack|trace|sql|pdo|database|syntax|table|column|query|connect|exception|fatal|server error|php|warning|notice|internal|failed to fetch|networkerror/i.test(clean)) {
    return 'تعذر تسجيل الطلب في السجل الإداري للمكتب حالياً بسبب ضغط مؤقت في الاتصال. بياناتك وإشعار التحويل محفوظة؛ يرجى النقر لإعادة المحاولة أو التواصل المباشر عبر واتساب المكتب.';
  }

  // Whitelist check: Must match at least one approved vetted business pattern
  const isApproved = VETTED_BUSINESS_PATTERNS.some(re => re.test(clean));
  if (!isApproved) {
    return 'تعذر تسجيل الطلب في السجل الإداري للمكتب حالياً بسبب ضغط مؤقت في الاتصال. بياناتك وإشعار التحويل محفوظة؛ يرجى النقر لإعادة المحاولة أو التواصل المباشر عبر واتساب المكتب.';
  }

  return clean;
}

if (briefForm) {
  briefForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (formState === 'submitting' || formState === 'success') return;

    if (!receiptValid || !receiptBase64) {
      if (receiptStatus) {
        receiptStatus.textContent = 'يرجى إرفاق صورة أو ملف PDF لإشعار التحويل البنكي لتأكيد الإرسال.';
      }
      return;
    }

    formState = 'submitting';
    const submissionRequestId = currentDraftRequestId;

    if (finalSubmitBtn) {
      finalSubmitBtn.disabled = true;
      finalSubmitBtn.classList.add('loading');
    }
    if (submitBtnText) {
      submitBtnText.textContent = '⏳ جارٍ قيد وتوثيق الطلب بالسجل الإداري...';
    }

    const backToStep1Btn = document.querySelector('#back-to-step-1, #go-to-step-1');
    if (backToStep1Btn) backToStep1Btn.disabled = true;
    if (removeReceiptBtn) removeReceiptBtn.disabled = true;

    // Lock payment switchers during submission
    const paySwitchers = document.querySelectorAll('#step-2-payment .pay-tab, #step-2-payment [data-plan]');
    paySwitchers.forEach(t => t.disabled = true);

    const f = new FormData(briefForm);
    const payload = {
      requestId: submissionRequestId,
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
      category: currentCategoryId || f.get('category') || '',
      serviceTitle: currentServiceTitle,
      serviceId: currentServiceId || f.get('service_id') || '',
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

      let resData = null;
      try {
        resData = await response.json();
      } catch (jsonErr) {
        resData = null;
      }
      clearTimeout(timeoutId);

      // Verify request id matches current attempt
      if (submissionRequestId !== currentDraftRequestId) return;

      if (!response.ok || !resData || typeof resData !== 'object' || resData.status !== 'success') {
        const rawMsg = (resData && typeof resData === 'object' && typeof resData.message === 'string')
          ? resData.message
          : '';
        const errorMsg = sanitizeServerError(rawMsg);
        throw new Error(errorMsg);
      }

      formState = 'success';
      const serverDocket = (resData && typeof resData.docketId === 'string' && resData.docketId.trim() && !resData.docketId.includes('قيد')) ? resData.docketId.trim() : null;
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

        if (serverDocket) {
          const labelSpan = document.createElement('span');
          labelSpan.textContent = 'رقم إضبارة الاستشارة المعتمد: ';
          docketP.appendChild(labelSpan);

          const strongEl = document.createElement('strong');
          strongEl.dir = 'ltr';
          strongEl.style.cssText = 'font-family:monospace; font-size:15px; color:#14532d; background:#dcfce7; padding:3px 8px; border-radius:4px;';
          strongEl.textContent = serverDocket;
          docketP.appendChild(strongEl);
        } else {
          const statusBadge = document.createElement('div');
          statusBadge.style.cssText = 'background:#fef3c7; color:#92400e; padding:6px 12px; border-radius:6px; font-weight:700; font-size:13px; margin:0 auto 10px; max-width:440px;';
          statusBadge.textContent = 'حالة الطلب: تم استلام البيانات وإشعار التحويل وقيد المراجعة الإدارية لإصدار رقم الإضبارة المعتمد';
          docketP.appendChild(statusBadge);
        }

        docketP.appendChild(document.createElement('br'));
        const timeNotice = document.createElement('span');
        timeNotice.innerHTML = 'تم استلام إشعار السداد ووقائع الطلب. نبدأ معالجة طلبك خلال <strong>ساعتَي عمل</strong>، ونتواصل فقط بالطريقة وخلال الفترة الآمنة التي اخترتها (السبت إلى الخميس: 9:00 ص – 6:00 م بتوقيت بغداد، والطلبات خارج الدوام والعطل تُباشر في أول ساعة عمل تالية).';
        docketP.appendChild(timeNotice);
        card.appendChild(docketP);

        // Strict Neutral WhatsApp Message: ONLY Client Name and Docket ID or Status
        const waLines = [
          'مرحباً مكتب المحامي سعد أميل،',
          'أرغب بتأكيد حجز استشارة قانونية.'
        ];
        if (serverDocket) {
          waLines.push('رقم الطلب: ' + serverDocket);
        } else {
          waLines.push('حالة الطلب: تم إرسال البيانات وإشعار التحويل عبر الموقع');
        }
        waLines.push('الاسم: ' + payload.name);
        waLines.push('تم إرسال الطلب وإرفاق إشعار التحويل عبر الموقع، بانتظار التواصل لتأكيد الموعد.');

        const waText = waLines.join('\n');

        const waLink = document.createElement('a');
        waLink.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(waText);
        waLink.target = '_blank';
        waLink.rel = 'noopener noreferrer';
        waLink.className = 'button';
        waLink.style.cssText = 'background:#25d366; color:#fff; display:inline-block; font-weight:700; padding:12px 24px; border-radius:6px; text-decoration:none; margin-top:8px;';
        waLink.textContent = '💬 تأكيد الموعد عبر واتساب المكتب المباشر ←';
        card.appendChild(waLink);

        handoff.appendChild(card);
      }

      if (finalSubmitBtn) {
        finalSubmitBtn.disabled = true;
        finalSubmitBtn.classList.remove('loading', 'unlocked');
        finalSubmitBtn.classList.add('locked');
      }
      if (submitBtnText) {
        submitBtnText.textContent = '✓ تم إرسال وتوثيق الطلب بنجاح';
      }

      const backToStep1Btn = document.querySelector('#back-to-step-1, #go-to-step-1');
      if (backToStep1Btn) backToStep1Btn.disabled = false;
      if (removeReceiptBtn) removeReceiptBtn.disabled = false;
      const paySwitchers = document.querySelectorAll('#step-2-payment .pay-tab, #step-2-payment [data-plan]');
      paySwitchers.forEach(t => t.disabled = false);

    } catch (err) {
      clearTimeout(timeoutId);
      if (submissionRequestId !== currentDraftRequestId) return;

      formState = 'editing';
      if (finalSubmitBtn) {
        finalSubmitBtn.disabled = false;
        finalSubmitBtn.classList.remove('loading');
      }
      const backToStep1Btn = document.querySelector('#back-to-step-1, #go-to-step-1');
      if (backToStep1Btn) backToStep1Btn.disabled = false;
      if (removeReceiptBtn) removeReceiptBtn.disabled = false;
      const paySwitchers = document.querySelectorAll('#step-2-payment .pay-tab, #step-2-payment [data-plan]');
      paySwitchers.forEach(t => t.disabled = false);

      updateReceiptLock(receiptValid);

      const isAbort = (err.name === 'AbortError');
      let friendlyError = sanitizeServerError(err.message || '');
      if (isAbort) {
        friendlyError = 'استغرقت الاستجابة وقتاً أطول من المعتاد (25 ثانية). بياناتك وإشعار التحويل محفوظة؛ يرجى النقر مرة أخرى لإعادة الإرسال أو مراسلة المكتب عبر واتساب.';
      }

      if (receiptStatus) {
        receiptStatus.textContent = friendlyError;
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

  // 2. Modal Close Button
  if (e.target.closest('#close-modal')) {
    e.preventDefault();
    if (formState === 'submitting') return;
    if (dialog) dialog.close();
    return;
  }

  // 2b. Start New Draft Button
  if (e.target.closest('#btn-start-new-draft')) {
    e.preventDefault();
    if (formState === 'submitting') return;
    startNewDraft();
    return;
  }

  // 3. Step Navigation Buttons
  if (e.target.closest('#go-to-step-2')) {
    e.preventDefault();
    goToStep2();
    return;
  }
  if (e.target.closest('#back-to-step-1, #go-to-step-1')) {
    e.preventDefault();
    if (formState === 'submitting') return;
    resetToStep1();
    return;
  }

  // 4. Print Docket Button
  if (e.target.closest('#print-doc-btn')) {
    e.preventDefault();
    window.print();
    return;
  }

  // 5. Mobile Menu Toggle
  if (e.target.closest('.menu-toggle')) {
    e.preventDefault();
    const nav = document.querySelector('#nav');
    const toggleBtn = e.target.closest('.menu-toggle');
    if (nav) {
      const isOpen = nav.classList.toggle('open');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      }
    }
    return;
  }

  // 6. Empty Search State Button -> Opens consult with pre-filled search term
  if (e.target.closest('#dir-empty-consult-btn')) {
    e.preventDefault();
    const searchInput = document.querySelector('#dir-search-input');
    const q = searchInput ? searchInput.value.trim() : '';
    openConsultationModal({
      planId: 'iraq',
      serviceTitle: q ? ('بحث: ' + q) : 'استشارة قانونية في مسألة قضائية',
      customSummary: q ? ('الموضوع المطلوب بحثه: ' + q) : ''
    });
    return;
  }

  // 7. General Consultation Opening Buttons (Action Buttons Only!)
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

  // Exclude tab navigation, search pills, structural wrappers, or comparator button (handled locally)
  if (
    btn.id === 'comp-book-btn' ||
    btn.classList.contains('dir-filter-pill') ||
    btn.getAttribute('role') === 'tab' ||
    btn.classList.contains('dir-category-block')
  ) {
    return;
  }

  e.preventDefault();
  const isResume = Boolean(
    btn.dataset.action === 'resume-consultation' ||
    btn.classList.contains('header-cta') ||
    btn.classList.contains('hero-main-btn') ||
    btn.classList.contains('mobile-consult')
  );

  const rawTopic = btn.dataset.topic || (btn.querySelector('.chip-name') ? btn.querySelector('.chip-name').textContent.trim() : btn.textContent.trim());
  const rawCat = btn.dataset.categoryId || btn.dataset.category || '';
  const serviceId = btn.dataset.serviceId || '';

  // Diaspora primary button is general expat consult -> sets diaspora category without forcing real estate
  let explicitPlan = 'iraq';
  if (btn.classList.contains('diaspora-primary-btn') || btn.classList.contains('diaspora-btn') || rawCat === 'diaspora' || rawTopic.includes('مغترب')) {
    explicitPlan = 'international';
  } else if (btn.dataset.plan === 'international' || btn.dataset.plan === 'usd') {
    explicitPlan = 'international';
  }

  openConsultationModal({
    isResume: isResume,
    planId: explicitPlan,
    categoryId: isResume ? '' : rawCat,
    category: isResume ? '' : rawCat,
    serviceTitle: isResume ? '' : rawTopic,
    serviceId: isResume ? '' : serviceId
  });
});

// Close modal when clicking outside modal body
if (dialog) {
  dialog.addEventListener('click', (e) => {
    if (formState === 'submitting') return;
    if (e.target === dialog) {
      dialog.close();
    }
  });
}

// -----------------------------------------------------------------------------
// 11. COPY TEXT UTILITY (Bank Super ID & Forensic Hash Buttons)
// -----------------------------------------------------------------------------
function copyTextToClipboard(text, btnElement, successMsg = 'تم النسخ بنجاح ✅') {
  if (!text) return;
  const originalText = btnElement ? btnElement.textContent : '';

  function showSuccess() {
    if (btnElement) {
      btnElement.textContent = successMsg;
      btnElement.classList.add('copied');
      setTimeout(() => {
        btnElement.textContent = originalText;
        btnElement.classList.remove('copied');
      }, 2500);
    }
  }

  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(text).then(showSuccess).catch(() => {
      fallbackCopy(text, showSuccess);
    });
  } else {
    fallbackCopy(text, showSuccess);
  }
}

function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    if (cb) cb();
  } catch (err) {}
  document.body.removeChild(ta);
}

// Wire Copy Buttons
const copyIdBtn = document.querySelector('#copy-id');
if (copyIdBtn) {
  copyIdBtn.addEventListener('click', () => {
    copyTextToClipboard(SUPER_ID, copyIdBtn, 'تم نسخ المعرّف ✅');
  });
}

const copyChaseAccBtn = document.querySelector('#copy-chase-acc');
if (copyChaseAccBtn) {
  copyChaseAccBtn.addEventListener('click', () => {
    copyTextToClipboard('2839104829', copyChaseAccBtn, 'تم نسخ رقم الحساب ✅');
  });
}

const copyChaseRoutBtn = document.querySelector('#copy-chase-rout');
if (copyChaseRoutBtn) {
  copyChaseRoutBtn.addEventListener('click', () => {
    copyTextToClipboard('021000021', copyChaseRoutBtn, 'تم نسخ Routing Number ✅');
  });
}

const copyChaseSwiftBtn = document.querySelector('#copy-chase-swift');
if (copyChaseSwiftBtn) {
  copyChaseSwiftBtn.addEventListener('click', () => {
    copyTextToClipboard('CHASUS33', copyChaseSwiftBtn, 'تم نسخ SWIFT/BIC ✅');
  });
}

// -----------------------------------------------------------------------------
// 12. TAB PANELS ACCESSIBILITY (Keyboard Arrows & Proper ARIA)
// -----------------------------------------------------------------------------
function initAccessibleTabs(tablistSelector) {
  const tablist = document.querySelector(tablistSelector);
  if (!tablist) return;

  const tabs = tablist.querySelectorAll('[role="tab"]');
  tabs.forEach((tab, index) => {
    tab.addEventListener('keydown', (e) => {
      let targetIndex = index;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        targetIndex = (index + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        targetIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        targetIndex = 0;
      } else if (e.key === 'End') {
        targetIndex = tabs.length - 1;
      } else {
        return;
      }
      e.preventDefault();
      tabs[targetIndex].focus();
      tabs[targetIndex].click();
    });
  });
}

// -----------------------------------------------------------------------------
// 13. GUIDE SECTION TABS SWITCHING
// -----------------------------------------------------------------------------
(function initGuideTabs() {
  const tabs = document.querySelectorAll('.guide-tabs button[role="tab"], .guide-tab');
  const panels = document.querySelectorAll('.guide-content [role="tabpanel"], .guide-panel');
  if (!tabs.length || !panels.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('aria-controls') || tab.dataset.panel;
      tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');

      panels.forEach(p => {
        if (p.id === targetId) {
          p.classList.add('active');
          p.hidden = false;
        } else {
          p.classList.remove('active');
          p.hidden = true;
        }
      });
    });
  });
})();

// Decoupled independent accessible tablist initializations
initAccessibleTabs('.guide-tabs');
initAccessibleTabs('.payment-tabs-bar');
initAccessibleTabs('.pay-tabs');

// -----------------------------------------------------------------------------
// 14. 120 LAWSUITS DIRECTORY FILTERING & TOKENIZED SEARCH ENGINE
// -----------------------------------------------------------------------------
(function initDirectory() {
  const searchInput = document.querySelector('#dir-search-input');
  const filterPills = document.querySelectorAll('.dir-filter-pill');
  const catBlocks = document.querySelectorAll('.dir-category-block');
  const emptyState = document.querySelector('#dir-empty-state');
  const countDisplay = document.querySelector('#dir-search-count, #dir-count-num');

  if (!searchInput || !catBlocks.length) return;

  let activeCategory = 'all';

  function applyFilter() {
    const rawQuery = searchInput.value.trim();
    const queryTokens = tokenizeArabicQuery(rawQuery);
    let visibleCount = 0;

    catBlocks.forEach(block => {
      const blockCat = block.dataset.category;
      const catMatches = (activeCategory === 'all' || activeCategory === blockCat);
      const chips = block.querySelectorAll('.lawsuit-chip');
      let blockVisibleChips = 0;

      chips.forEach(chip => {
        let matchesQuery = false;

        if (!queryTokens.length) {
          matchesQuery = true;
        } else {
          const chipText = normalizeArabicText(chip.textContent);
          const chipTopic = normalizeArabicText(chip.dataset.topic || '');
          const combined = chipText + ' ' + chipTopic;

          // Every token in query must match!
          matchesQuery = queryTokens.every(token => {
            if (combined.includes(token)) return true;

            // Iraqi legal synonym expansions (Domain-specific & semantically isolated)
            if ((token === 'شيك' || token === 'صك' || token === 'سفتجه' || token === 'كمبيال') &&
                (combined.includes('صك') || combined.includes('شيك') || combined.includes('سفتجه') || combined.includes('كمبيال') || combined.includes('سند'))) {
              return true;
            }
            if ((token === 'دكه' || token === 'دگه' || token === 'عشائر') &&
                (combined.includes('دكه') || combined.includes('دگه') || combined.includes('عشائر') || combined.includes('405'))) {
              return true;
            }
            if (token === 'كفال' || token === 'كفاله') {
              // Exclude banking check stopping
              if (combined.includes('صرف') || combined.includes('صك')) return false;
              if (combined.includes('كفال') || combined.includes('اخلاء سبيل') || combined.includes('افراج') || combined.includes('سراح') || (combined.includes('توقيف') && !combined.includes('صرف'))) {
                return true;
              }
            }
            if ((token === 'ايجار' || token === 'ماجور' || token === 'تخليه') &&
                (combined.includes('ايجار') || combined.includes('ماجور') || combined.includes('تخليه') || combined.includes('اخلاء'))) {
              return true;
            }
            if ((token === 'طلاق' || token === 'تفريق' || token === 'خلع') &&
                (combined.includes('طلاق') || combined.includes('تفريق') || combined.includes('خلع') || combined.includes('مباراه'))) {
              return true;
            }
            if ((token === 'حضانه' || token === 'محضون' || token === 'مشاهده') &&
                (combined.includes('حضانه') || combined.includes('محضون') || combined.includes('مشاهده') || combined.includes('اصطحاب') || combined.includes('استرداد'))) {
              return true;
            }
            // "فصل" is strictly employment/labor termination
            if (token === 'فصل' &&
                (combined.includes('فصل') || combined.includes('عقد عمل') || combined.includes('انهاء عقد') || combined.includes('انهاء عقود'))) {
              return true;
            }
            if (token === 'تعسفي' && combined.includes('تعسفي')) {
              return true;
            }
            // "ترفيع" is strictly civil service career progression
            if ((token === 'ترفيع' || token === 'علاوه') &&
                (combined.includes('ترفيع') || combined.includes('علاوه') || combined.includes('سنوات الخدمه') || combined.includes('درجه وظيفيه'))) {
              return true;
            }
            if (token === 'شيوع' && (combined.includes('شيوع') || combined.includes('فرز') || combined.includes('ازاله شيوع'))) {
              return true;
            }
            if (token === 'نفقه' && combined.includes('نفقه')) {
              return true;
            }
            return false;
          });
        }

        if (catMatches && matchesQuery) {
          chip.style.display = '';
          blockVisibleChips++;
          visibleCount++;
        } else {
          chip.style.display = 'none';
        }
      });

      // Priority ranking: Re-order chips inside block so direct keyword matches appear first
      if (rawQuery && blockVisibleChips > 0) {
        const sortedChips = Array.from(chips);
        const normRaw = normalizeArabicText(rawQuery);
        sortedChips.sort((a, b) => {
          const aText = normalizeArabicText(a.dataset.topic || a.textContent);
          const bText = normalizeArabicText(b.dataset.topic || b.textContent);

          // Direct token inclusion priority (literal word in title > indirect synonym expansion)
          const aDirect = queryTokens.length && queryTokens.every(t => aText.includes(t)) ? 2 : (queryTokens.some(t => aText.includes(t)) ? 1 : 0);
          const bDirect = queryTokens.length && queryTokens.every(t => bText.includes(t)) ? 2 : (queryTokens.some(t => bText.includes(t)) ? 1 : 0);
          if (bDirect !== aDirect) return bDirect - aDirect;

          const aExact = aText.includes(normRaw) ? 1 : 0;
          const bExact = bText.includes(normRaw) ? 1 : 0;
          return bExact - aExact;
        });
        sortedChips.forEach(c => c.parentNode.appendChild(c));
      }

      if (blockVisibleChips > 0) {
        block.style.display = '';
      } else {
        block.style.display = 'none';
      }
    });

    // Update Counter with correct Arabic plural forms
    if (countDisplay) {
      let label = `${visibleCount} دعوى متاحة`;
      if (visibleCount === 0) {
        label = '0 دعوى مطابقة';
      } else if (visibleCount === 1) {
        label = 'دعوى واحدة مطابقة';
      } else if (visibleCount === 2) {
        label = 'دعوتان متطابقتان';
      } else if (visibleCount <= 10) {
        label = `${visibleCount} دعاوى متاحة`;
      } else if (visibleCount === 120 && !rawQuery && activeCategory === 'all') {
        label = '120 دعوى متاحة';
      }
      countDisplay.textContent = label;
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
      filterPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-pressed', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-pressed', 'true');
      activeCategory = pill.dataset.filter || 'all';
      applyFilter();
    });
  });
})();

// -----------------------------------------------------------------------------
// 15. FORENSIC HASHER (Local SHA-256 Utility with Correct Trigger & Result IDs)
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
// 16. LEGAL ARTICLES MODULE (Loads from api/articles.php with Safe Close & Focus)
// -----------------------------------------------------------------------------
function initArticlesModule() {
  const container = document.querySelector('#live-articles-grid, #articles-container');
  const readerModal = document.querySelector('#article-reader-modal');
  if (!container) return;

  const titleEl = document.querySelector('#art-reader-title');
  const catEl = document.querySelector('#art-reader-cat');
  const metaEl = document.querySelector('#art-reader-meta');
  const contentEl = document.querySelector('#art-reader-content');
  const closeBtn = document.querySelector('#close-art-reader-modal, #close-art-reader');
  const consultBtn = document.querySelector('#art-reader-consult-btn');

  let currentArticleTitle = '';
  let currentArticleCategory = '';
  let lastFocusedArticleBtn = null;

  function closeArticleReader() {
    if (readerModal) {
      if (typeof readerModal.close === 'function') {
        readerModal.close();
      } else {
        readerModal.removeAttribute('open');
      }
    }
    document.body.style.overflow = '';
    if (lastFocusedArticleBtn && typeof lastFocusedArticleBtn.focus === 'function') {
      lastFocusedArticleBtn.focus();
    }
  }

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
      content: 'يواجه العراقيون المقيمون في الولايات المتحدة، كندا، بريطانيا، والدول الأوروبية تحديات جسيمة في إدارة أملاكهم ومتابعة تركاتهم في بغداد والمحافظات.\n\nالخطوة الأولى تبدأ من صياغة وكالة عامة أو خاصة لدى القنصلية العراقية في بلد الإقامة، تليها مطابقة صحة الصدور الإلكترونية عبر وزارة الخارجية في بغداد.\n\nيوفر مكتبنا تمثيلاً قضائياً رفيع المستوى بإشراف شخصي وتقارير مصورة موثقة لجميع مراحل الدعوى وتجنيب المغترب مشقة السفر، مع إمكانية سداد أتعاب الاستشارة لحساب بنكي أمريكي رسمي (ACH / Wire Transfer).'
    },
    {
      id: 'art-3',
      title: 'إثبات الأدلة الرقمية وسلسلة الحيازة في قضايا الابتزاز الإلكتروني',
      category: 'الجرائم المعلوماتية',
      date: '2026-11-09',
      excerpt: 'كيفية توثيق بصمة التشفير الجنائية (SHA-256) للتسجيلات الصوتية ومحادثات الابتزاز كأداة مقارنة وتدقيق فني أمام قاضي التحقيق.',
      content: 'مع تطور أدوات التزييف العميق واستنساخ الأصوات بالذكاء الاصطناعي، باتت المحاكم الجنائية ومحاكم التحقيق في العراق تتطلب تدقيقاً علمياً صارماً للأدلة الرقمية.\n\nوفقاً لقانون أصول المحاكمات الجزائية رقم 23 لسنة 1971 وقانون الإثبات العراقي رقم 107 لسنة 1979 المعدل، يُستعان ببصمات التجزئة الرقمية المشفرة لمقارنة سلامة المستندات والتسجيلات وضمان عدم التلاعب بها.\n\nيوفر مكتبنا فحصاً فنياً محلياً للتسجيلات واستخراج بصمات التجزئة المشفرة (SHA-256) لتعزيز طلبات الاستكتاب والمضاهاة الفنية أمام الجهات التحقيقية المختصة.'
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
        lastFocusedArticleBtn = btn;
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

  if (closeBtn) {
    closeBtn.addEventListener('click', closeArticleReader);
  }

  if (readerModal) {
    readerModal.addEventListener('click', (e) => {
      if (e.target === readerModal) closeArticleReader();
    });
    readerModal.addEventListener('cancel', (e) => {
      closeArticleReader();
    });
  }

  if (consultBtn && readerModal) {
    consultBtn.addEventListener('click', () => {
      const artTitle = currentArticleTitle;
      const artCat = currentArticleCategory;
      closeArticleReader();
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
// 17. QUERY PARAMETER DEEP-LINKING (?consult=1&category=...)
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
// 18. PERSONAL STATUS COMPARATOR MODULE (2025 Amendments Analysis)
// -----------------------------------------------------------------------------
(function initComparator() {
  const dateSelect = document.querySelector('#comp-date, #comp-date-select');
  const issueSelect = document.querySelector('#comp-issue, #comp-issue-select');
  const resultContainer = document.querySelector('#comp-result, #comparator-result');
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

  resultContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('#comp-book-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const issueKey = issueSelect.value || 'custody';
    const item = DB[issueKey] || DB.custody;
    openConsultationModal({
      planId: 'iraq',
      category: 'family',
      categoryId: 'family',
      serviceTitle: 'استشارة مقارن الأحوال الشخصية: ' + item.title,
      serviceId: 'comp-personal-status-' + issueKey,
      customSummary: 'استشارة قانونية في ضوء أحكام المذهب الجعفري وقانون 188 المعدل بخصوص: ' + item.title
    });
  });

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
