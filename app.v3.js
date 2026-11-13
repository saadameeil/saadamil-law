'use strict';

// Verified office contact and payment info
const WHATSAPP_NUMBER = '9647801222119';
const SUPER_ID = 'SUPER-IQ-77098231';
const QI_SHORTLINK = 'https://m.banqi.qi.iq/shortlink/web/csb/exgy7vng';
const QI_APP_SCHEME = 'qicardwallet://qicard/deeplink.htm?action=native&pageId=shortLink&usecase=restore&source=DEEP_LINK&url=' + encodeURIComponent(QI_SHORTLINK);

const money = value => value > 0 ? (new Intl.NumberFormat('ar-IQ').format(value) + ' د.ع') : 'يُحدد بحسب طبيعة الطلب';
const dialog = document.querySelector('#modal');
const receipt = document.querySelector('#receipt');
const preview = document.querySelector('#preview');
const previewWrap = document.querySelector('#preview-wrap');
const finalSubmitBtn = document.querySelector('#final-submit-btn');
const submitBtnText = document.querySelector('#submit-btn-text');
const receiptStatus = document.querySelector('#receipt-status');

// Stepper Elements
const step1Details = document.querySelector('#step-1-details');
const step2Payment = document.querySelector('#step-2-payment');
const step1Error = document.querySelector('#step-1-error');
const goToStep2Btn = document.querySelector('#go-to-step-2');
const backToStep1Btn = document.querySelector('#back-to-step-1');
const printDocBtn = document.querySelector('#print-doc-btn');

// Official Document Fields
const docDate = document.querySelector('#doc-date');
const docId = document.querySelector('#doc-id');
const docClientInfo = document.querySelector('#doc-client-info');
const docOpponentInfo = document.querySelector('#doc-opponent-info');
const docTopicVal = document.querySelector('#doc-topic-val');
const docFactsVal = document.querySelector('#doc-facts-val');
const docStatusDesc = document.querySelector('.status-desc');

let previewUrl = '';
let receiptValid = false;
let receiptBase64 = '';
let imageVersion = 0;
let previousFocus;
let selectedTopic = '';
let generatedDocketId = 'IQ-SA-' + Math.floor(10000 + Math.random() * 90000);

// Active consultation plan & currency state
let currentPlan = {
  name: 'استشارة قانونية ودراسة ملف',
  fee: 75000,
  currency: 'IQD',
  formattedFee: '75,000 د.ع',
  paymentMethod: 'qi_super'
};

function getArabicDate() {
  const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
  const now = new Date();
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return day + ' ' + month + ' ' + year;
}

// Receipt Lock & Button Status Handler
function updateReceiptLock(isValid) {
  receiptValid = isValid;
  if (!finalSubmitBtn) return;
  
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

function showStep2() {
  const nameInput = document.querySelector('#field-name');
  const phoneInput = document.querySelector('#field-phone');
  const locInput = document.querySelector('#field-location');
  const topicInput = document.querySelector('#topic');
  const summaryInput = document.querySelector('#field-summary');
  const oppNameInput = document.querySelector('#field-opponent-name');
  const oppPhoneInput = document.querySelector('#field-opponent-phone');
  const oppLocInput = document.querySelector('#field-opponent-loc');
  const titleRadio = document.querySelector('input[name="title_prefix"]:checked');

  const titlePrefix = titleRadio ? titleRadio.value : 'السيد';
  const nameVal = nameInput ? nameInput.value.trim() : '';
  const phoneVal = phoneInput ? phoneInput.value.trim() : '';
  const locVal = locInput ? locInput.value.trim() : '';
  const topicVal = topicInput ? topicInput.value.trim() : '';
  const summaryVal = summaryInput ? summaryInput.value.trim() : '';
  const oppNameVal = oppNameInput ? oppNameInput.value.trim() : '';
  const oppPhoneVal = oppPhoneInput ? oppPhoneInput.value.trim() : '';
  const oppLocVal = oppLocInput ? oppLocInput.value.trim() : '';

  if (!nameVal || !phoneVal || !locVal || !topicVal || !summaryVal) {
    if (step1Error) {
      step1Error.hidden = false;
      step1Error.textContent = 'يرجى إكمال الحقول الأساسية (الاسم، الهاتف، منطقة السكن، موضوع القضية، والشرح الموجز) لإصدار الكتاب الرسمي.';
    }
    if (!nameVal && nameInput) nameInput.focus();
    else if (!phoneVal && phoneInput) phoneInput.focus();
    else if (!locVal && locInput) locInput.focus();
    else if (!topicVal && topicInput) topicInput.focus();
    else if (!summaryVal && summaryInput) summaryInput.focus();
    return;
  }

  if (phoneVal.length < 8) {
    if (step1Error) {
      step1Error.hidden = false;
      step1Error.textContent = 'يرجى كتابة رقم هاتف صحيح ليتسنى للمكتب الاتصال بك هاتفياً وتحديد الموعد.';
    }
    if (phoneInput) phoneInput.focus();
    return;
  }

  if (step1Error) step1Error.hidden = true;

  // Populate Official Letterhead Document safely using textContent
  if (docDate) docDate.textContent = getArabicDate();
  if (docId) docId.textContent = generatedDocketId;
  
  if (docClientInfo) {
    docClientInfo.textContent = titlePrefix + ' ' + nameVal + ' • هاتف: ' + phoneVal + ' • سكن: ' + locVal;
  }
  
  if (docOpponentInfo) {
    let oppStr = oppNameVal || 'غير محدد في هذا الطلب';
    if (oppPhoneVal) oppStr += ' • هاتف: ' + oppPhoneVal;
    if (oppLocVal) oppStr += ' (' + oppLocVal + ')';
    docOpponentInfo.textContent = oppStr;
  }

  if (docTopicVal) docTopicVal.textContent = topicVal;
  if (docFactsVal) docFactsVal.textContent = summaryVal;

  if (docStatusDesc) {
    if (currentPlan.currency === 'USD') {
      docStatusDesc.textContent = 'تُباشر دراسة الملف وتدقيق المستندات والخيارات الأصولية والاتصال المباشر بالموكل فور مراجعة أتعاب الاستشارة الدولية المعتمدة ($100 USD).';
    } else {
      docStatusDesc.textContent = 'تُباشر دراسة الملف وتدقيق المستندات والخيارات القانونية والاتصال الهاتفي بالموكل فور مراجعة وتأكيد أتعاب الاستشارة المعتمدة (٧٥٬٠٠٠ د.ع).';
    }
  }

  // Transition view & update lock
  updateReceiptLock(receiptValid);
  step1Details.hidden = true;
  step2Payment.hidden = false;
  dialog.scrollTop = 0;
}

function showStep1() {
  step2Payment.hidden = true;
  step1Details.hidden = false;
  dialog.scrollTop = 0;
}

if (goToStep2Btn) goToStep2Btn.addEventListener('click', showStep2);
if (backToStep1Btn) backToStep1Btn.addEventListener('click', showStep1);

// Print Official Letterhead
if (printDocBtn) {
  printDocBtn.addEventListener('click', () => {
    window.print();
  });
}

function clearPreview(resetInput=true){
  imageVersion++;
  if(previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = '';
  receiptBase64 = '';
  updateReceiptLock(false);
  if (preview) preview.removeAttribute('src');
  if (previewWrap) previewWrap.hidden = true;
  if(resetInput && receipt) receipt.value = '';
  if(receiptStatus) receiptStatus.textContent = '';
}

// Plan buttons (Open Modal in Step 1)
document.querySelectorAll('[data-plan]').forEach(button => {
  button.addEventListener('click', () => {
    previousFocus = button;
    const isDiaspora = (button.dataset.plan || '').includes('مغترب') || (button.dataset.plan || '').includes('خارج');
    if (isDiaspora) {
      currentPlan = {
        name: 'استشارة قانونية ودراسة ملف للمغتربين',
        fee: 100,
        currency: 'USD',
        formattedFee: '$100 USD',
        paymentMethod: 'usd_chase'
      };
    } else {
      currentPlan = {
        name: 'استشارة قانونية ودراسة ملف',
        fee: 75000,
        currency: 'IQD',
        formattedFee: '75,000 د.ع',
        paymentMethod: 'qi_super'
      };
    }
    
    if (selectedTopic) {
      const topicDropdown = document.querySelector('#topic');
      if (topicDropdown) topicDropdown.value = selectedTopic;
    }
    
    resetToStep1();
    const cs = document.querySelector('#copy-status'); if (cs) cs.textContent = '';
    const ho = document.querySelector('#handoff'); if (ho) ho.hidden = true;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  });
});

// Modal close handlers
const closeBtn = document.querySelector('#close-modal');
if (closeBtn) closeBtn.addEventListener('click', () => dialog.close());

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
  previousFocus?.focus();
});

// Copy Super ID
const copyBtn = document.querySelector('#copy-id');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    try {
      await navigator.clipboard.writeText(SUPER_ID);
      status.textContent = 'تم نسخ معرّف سوبر بنجاح.';
    } catch {
      const superElem = document.querySelector('#super-id');
      const range = document.createRange();
      range.selectNodeContents(superElem);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = 'تم تحديد المعرّف. انسخه يدوياً.';
    }
  });
}

// Receipt File Upload & Preview
if (receipt) {
  receipt.addEventListener('change', async () => {
    const file = receipt.files[0];
    clearPreview(false);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      receiptStatus.textContent = 'يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.';
      updateReceiptLock(false);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      receiptStatus.textContent = 'حجم الصورة أكبر من 8 ميغابايت. يرجى اختيار صورة أصغر.';
      updateReceiptLock(false);
      return;
    }
    const version = imageVersion;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;

    // Read base64 for secure transmission to server
    const reader = new FileReader();
    reader.onload = e => { receiptBase64 = e.target.result; };
    reader.readAsDataURL(file);

    try {
      await image.decode();
      if (version !== imageVersion) {
        URL.revokeObjectURL(url);
        return;
      }
      previewUrl = url;
      preview.src = url;
      previewWrap.hidden = false;
      const previewBadge = previewWrap.querySelector('.receipt-success-badge');
      if (previewBadge) {
        previewBadge.textContent = 'تم إرفاق صورة الإشعار — بانتظار التحقق والمراجعة';
      }
      updateReceiptLock(true);
      if (receiptStatus) receiptStatus.textContent = '';
    } catch {
      URL.revokeObjectURL(url);
      if (version === imageVersion) {
        receiptStatus.textContent = 'تعذر فتح الصورة. يرجى اختيار صورة واضحة أخرى.';
        updateReceiptLock(false);
      }
    }
  });
}

const removeReceiptBtn = document.querySelector('#remove-receipt');
if (removeReceiptBtn) removeReceiptBtn.addEventListener('click', clearPreview);

// Form Submit: Final Step
const briefForm = document.querySelector('#brief');
if (briefForm) {
  briefForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!receiptValid) {
      alert('يرجى إرفاق صورة إشعار أو وصل التحويل أولاً لتأكيد طلبك وتحديد موعد الاستشارة.');
      return;
    }

    // Prevent duplicate clicks
    finalSubmitBtn.disabled = true;
    if (submitBtnText) submitBtnText.textContent = '⏳ جارٍ حفظ وتأكيد الطلب في السجل الرسمي...';

    const f = new FormData(briefForm);
    const titlePrefix = f.get('title_prefix') || 'السيد';
    const name = String(f.get('name') || '').trim();
    const phone = String(f.get('phone') || '').trim();
    const loc = String(f.get('location') || '').trim();
    const topic = String(f.get('topic') || '').trim();
    const oppName = String(f.get('opponent_name') || '').trim();
    const oppPhone = String(f.get('opponent_phone') || '').trim();
    const oppLoc = String(f.get('opponent_location') || '').trim();
    const summary = String(f.get('summary') || '').trim();

    const payload = {
      docketId: generatedDocketId,
      date: getArabicDate(),
      timestamp: new Date().toISOString(),
      titlePrefix: titlePrefix,
      name: name,
      phone: phone,
      location: loc,
      topic: topic,
      planName: currentPlan.name,
      fee: currentPlan.fee,
      currency: currentPlan.currency,
      paymentMethod: currentPlan.paymentMethod,
      opponentName: oppName,
      opponentPhone: oppPhone,
      opponentLocation: oppLoc,
      summary: summary,
      receiptBase64: receiptBase64
    };

    try {
      const response = await fetch('api/submit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok || resData.status !== 'success') {
        throw new Error(resData.message || 'تعذر حفظ الطلب في الخادم');
      }

      const assignedDocketId = resData.docketId || generatedDocketId;

      // Concise, privacy-preserving WhatsApp message
      const waMessage = [
        'طلب استشارة قانونية ودراسة ملف — مكتب المحامي سعد أميل',
        'رقم الإضبارة: ' + assignedDocketId,
        'المستشير: ' + titlePrefix + ' ' + name,
        'الهاتف: ' + phone,
        'المنطقة: ' + loc,
        'موضوع الاستشارة: ' + topic,
        'الخدمة والأتعاب: ' + currentPlan.name + ' (' + currentPlan.formattedFee + ')',
        'حالة الإشعار: تم إرفاق صورة إشعار التحويل في النظام',
        'يرجى مراجعة الطلب وتأكيد موعد جلسة الاستشارة المباشرة.'
      ].join('\n');

      const waUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(waMessage);

      // Update handoff area
      const handoff = document.querySelector('#handoff');
      if (handoff) {
        handoff.hidden = false;
        handoff.innerHTML = `
          <div style="background:#edf7ed;border:1px solid #4caf50;border-radius:8px;padding:16px;margin-top:14px;text-align:right;">
            <div style="font-weight:700;color:#2e7d32;font-size:15px;margin-bottom:6px;">✅ تم تسجيل طلبك وحفظ الإضبارة برقم: <code dir="ltr" style="background:#fff;padding:2px 6px;border-radius:4px;border:1px solid #c8e6c9;">${assignedDocketId}</code></div>
            <p style="margin:0 0 12px 0;font-size:12.5px;color:#1e392a;line-height:1.7;">
              وصل طلبك وصورة الإشعار بنجاح إلى السجل الإداري للمكتب. سنراجع التحويل لتأكيد الموعد والتواصل معك هاتفياً لمباشرة دراسة ملفك.
            </p>
            <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="button" style="display:inline-flex;align-items:center;gap:6px;background:#25d366;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:700;font-size:13px;">
              تأكيد الموعد عبر واتساب المكتب 💬 ←
            </a>
          </div>
        `;
      }

      if (submitBtnText) submitBtnText.textContent = '✅ تم إرسال الطلب وحفظ الإضبارة بنجاح';
      window.open(waUrl, '_blank', 'noopener,noreferrer');

    } catch (err) {
      console.error('Submission error:', err);
      alert('ملاحظة: ' + (err.message || 'تعذر الاتصال بالخادم لحفظ الطلب. يرجى التحقق من اتصالك والمحاولة مجدداً.'));
      finalSubmitBtn.disabled = false;
      if (submitBtnText) {
        submitBtnText.textContent = `إعادة محاولة إرسال الطلب (${currentPlan.formattedFee}) ←`;
      }
    }
  });
}

// Payment Tabs Toggle (Iraq vs Expatriates US Bank)
(function initPaymentTabs() {
  document.addEventListener('click', (e) => {
    const tabIq = e.target.closest('#pay-tab-iq');
    const tabIntl = e.target.closest('#pay-tab-intl');
    const methodIq = document.querySelector('#pay-method-iq');
    const methodIntl = document.querySelector('#pay-method-intl');
    const tabIqEl = document.querySelector('#pay-tab-iq');
    const tabIntlEl = document.querySelector('#pay-tab-intl');

    if (tabIq && methodIq && methodIntl) {
      tabIqEl.classList.add('active');
      tabIntlEl.classList.remove('active');
      methodIq.style.display = 'block';
      methodIntl.style.display = 'none';

      currentPlan = {
        name: 'استشارة قانونية ودراسة ملف',
        fee: 75000,
        currency: 'IQD',
        formattedFee: '75,000 د.ع',
        paymentMethod: 'qi_super'
      };

      if (docStatusDesc) {
        docStatusDesc.textContent = 'تُباشر دراسة الملف وتدقيق المستندات والخيارات القانونية والاتصال الهاتفي بالموكل فور مراجعة وتأكيد أتعاب الاستشارة المعتمدة (٧٥٬٠٠٠ د.ع).';
      }
      updateReceiptLock(receiptValid);

    } else if (tabIntl && methodIq && methodIntl) {
      tabIntlEl.classList.add('active');
      tabIqEl.classList.remove('active');
      methodIntl.style.display = 'block';
      methodIq.style.display = 'none';

      currentPlan = {
        name: 'استشارة قانونية ودراسة ملف للمغتربين',
        fee: 100,
        currency: 'USD',
        formattedFee: '$100 USD',
        paymentMethod: 'usd_chase'
      };

      if (docStatusDesc) {
        docStatusDesc.textContent = 'تُباشر دراسة الملف وتدقيق المستندات والخيارات الأصولية والاتصال المباشر بالموكل فور مراجعة أتعاب الاستشارة الدولية المعتمدة ($100 USD).';
      }
      updateReceiptLock(receiptValid);
    }
  });
})();

// Direct App Launcher for Qi / Super App
document.addEventListener('click', (e) => {
  const target = e.target.closest('#app-pay-btn, .quick-app-btn');
  if (!target) return;
  
  e.preventDefault();
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  if (isAndroid) {
    window.location.href = QI_APP_SCHEME;
    setTimeout(() => {
      window.location.href = QI_SHORTLINK;
    }, 1200);
  } else if (isIOS) {
    window.location.href = QI_SHORTLINK;
  } else {
    window.open(QI_SHORTLINK, '_blank', 'noopener,noreferrer');
  }
});

// Standard Navigation & Tabs logic
const tabs = [...document.querySelectorAll('[role=tab]')];
const phoneLayout = matchMedia('(max-width: 740px)');
const tablist = document.querySelector('[role=tablist]');
function syncTabOrientation() {
  if (tablist) tablist.setAttribute('aria-orientation', phoneLayout.matches ? 'horizontal' : 'vertical');
}
syncTabOrientation();
phoneLayout.addEventListener('change', syncTabOrientation);

function activateTab(tab, focus=false) {
  tabs.forEach(t => {
    const active = t === tab;
    t.setAttribute('aria-selected', String(active));
    t.tabIndex = active ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls'));
    if (panel) panel.hidden = !active;
  });
  if (focus) tab.focus();
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', e => {
    let next = index;
    if ((!phoneLayout.matches && e.key === 'ArrowDown') || (phoneLayout.matches && e.key === 'ArrowLeft')) next = (index + 1) % tabs.length;
    else if ((!phoneLayout.matches && e.key === 'ArrowUp') || (phoneLayout.matches && e.key === 'ArrowRight')) next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else return;
    e.preventDefault();
    activateTab(tabs[next], true);
  });
});

const nav = document.querySelector('#nav');
const toggle = document.querySelector('.menu-toggle');
function closeNav() {
  if (nav && toggle) {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'فتح القائمة');
  }
}
if (toggle) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
  });
}
if (nav) nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && nav && nav.classList.contains('open')) {
    closeNav();
    toggle.focus();
  }
});
const yearElem = document.querySelector('#year');
if (yearElem) yearElem.textContent = new Date().getFullYear();
phoneLayout.addEventListener('change', closeNav);
document.addEventListener('click', event => {
  if (nav && nav.classList.contains('open') && !nav.contains(event.target) && !toggle.contains(event.target)) closeNav();
});

// Personal Status Comparator Logic
(function(){
  const dateSelect = document.querySelector('#comp-date');
  const issueSelect = document.querySelector('#comp-issue');
  const resultContainer = document.querySelector('#comp-result');
  
  if(!dateSelect || !issueSelect || !resultContainer) return;
  
  const data = {
    custody: {
      law1959: 'الحضانة حق أصيل للأم ما دامت أهلاً لها، وتستمر للأم حتى بلوغ المحضون سن العاشرة، ويجوز للقاضي تمديدها حتى الخامسة عشرة إذا ثبتت مصلحة المحضون.',
      jaafari: 'تنتقل الحضانة للأب عند سن السابعة (وفي بعض الآراء للأولاد عند سن السنتين في حالات الفطام)، ما لم يُشترط خلاف ذلك صراحة في العقد أو تثبت عدم أهلية الأب.',
      alert: '⚠️ تنبيه إجرائي: في حال نشوء نزاع على الحضانة، المعيار القضائي الأعلى لدى محكمة التمييز هو «مصلحة المحضون الفضلى» وسلامة بيئته النفسية والصحية، ويجب المبادرة فوراً بطلب التدابير الوقتية لمنع سلب الطفل بالقوة.'
    },
    contract_change: {
      law1959: 'العقود المبرمة قبل نفاذ التعديل خاضعة لأحكام قانون 1959 أصالةً، ولا يجوز تعديل أثرها أو تحويلها بطلب انفرادي من أحد الزوجين دون إقرار ورضا صريح من الطرف الآخر.',
      jaafari: 'في حال استصدر الزوج أمراً ولائياً بتحويل العقد إلى أحكام المدونة، فإن القانون يتيح للزوجة التظلم أمام نفس القاضي خلال 3 أيام من تاريخ التبليغ لإلغاء الأمر الولائي لعيب انعدام الخصومة.',
      alert: '⚠️ تنبيه حاسم للزوجات: عند تبلغكِ بأي قرار ولائي بتغيير عقد الزواج، لا تتجاوزي مدة الـ 3 أيام القانونية لتقديم التظلم، لأن فوات الميعاد يجعله باتاً ويسقط حقكِ الإجرائي في الطعن السريع!'
    },
    divorce_rights: {
      law1959: 'الطلاق التعسفي يوجب تعويضاً مالياً للزوجة (نفقة متعة تصل لعدة سنوات)، ويستحق المهر المؤجل بالكامل، مع إمكانية التفريق القضائي للضرر واستحكام الخلاف بنفقة كاملة.',
      jaafari: 'الطلاق بيد الزوج ويشترط صيغة شرعية محددة وحضور شاهدين عدلين معاً، وشروط استحقاق التعويض المالي تختلف وتستند للحقوق المالية الثابتة بالعقد حصراً.',
      alert: '⚠️ تنبيه إجرائي: استحقاق مؤخر الصداق يختلف بحسب صيغة العقد (المطالبة والميسرة أو أقرب الأجلين). التحرك المبكر عبر مديرية التنفيذ يتيح إلقاء الحجز الاحتياطي على أموال الزوج قبل تهريبها.'
    },
    maintenance: {
      law1959: 'النفقة الزوجية واجبة من تاريخ العقد الصحيح وتستمر ما لم يصدر حكم قطعي بالنشوز. ترك دار الزوجية بسبب مشروع (كالضرر أو عدم تهيئة دار شرعية صالحة) لا يسقط النفقة.',
      jaafari: 'تسقط النفقة بمجرد الامتناع عن التمكين التام دون عذر شرعي، ويشترط لإسقاطها إثبات الاستعداد التام للإنفاق وتهيئة السكن الشرعي المستقل الذي يليق بحال الزوجين.',
      alert: '⚠️ توجيه قانوني: قبل رفع دعوى النشوز أو المطالبة بالنفقة، يجب توثيق إرسال الإنذار العدلي والمشاهدة الرسمية للدار لتجنب رد الدعوى من قبل محكمة الأحوال الشخصية.'
    },
    visitation: {
      law1959: 'حق المشاهدة مكفول للأب غير الحاضن أسبوعياً أو دورياً في أماكن مخصصة للمشاهدة، ويجوز طلب الاصطحاب والمبيت عند بلوغ سن معينة.',
      jaafari: 'حق صصلة الرحم ورعاية الأب مكفول شرعاً، وتمنع الأم من حرمان الأب أو تغييب الأطفال عنه، مع استصدار قرارات المشاهدة والاصطحاب العاجلة.',
      alert: '⚠️ تنبيه للآباء: حرمانك من أطفالك مخالف للقانون؛ استصدار قرار قضائي بالمشاهدة والاصطحاب يتم بإجراءات سريعة أمام قاضي الأحوال الشخصية مع إمكانية فرض غرامات تنفيذية عند الامتناع.'
    }
  };
  
  function updateComparator(){
    const dateVal = dateSelect.value;
    const issueVal = issueSelect.value;
    const item = data[issueVal] || data.custody;
    
    resultContainer.innerHTML = `
      <div class="comp-grid">
        <div class="comp-col">
          <h4>⚖️ المركز بموجب قانون 1959 النافذ:</h4>
          <p>${item.law1959}</p>
        </div>
        <div class="comp-col jaafari">
          <h4>📜 المركز بموجب أحكام الفقه الجعفري:</h4>
          <p>${item.jaafari}</p>
        </div>
      </div>
      <div class="comp-alert">${item.alert}</div>
      <div class="comp-cta">
        <button class="button" type="button" id="comp-book-btn" data-topic="أحوال شخصية وطلاق ونفقة وحضانة (وفق الفقه الجعفري والقانون)">طلب استشارة عاجلة في هذه المسألة ↖</button>
      </div>
    `;
  }
  
  dateSelect.addEventListener('change', updateComparator);
  issueSelect.addEventListener('change', updateComparator);
  updateComparator();
})();

// Event Delegation: Connect all topic buttons
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-topic]');
  if (!btn) return;
  const topic = btn.dataset.topic;
  const topicDropdown = document.querySelector('#topic');
  if (topicDropdown && topic) {
    let matched = false;
    for (let i = 0; i < topicDropdown.options.length; i++) {
      const optText = topicDropdown.options[i].text.trim();
      const optVal = topicDropdown.options[i].value.trim();
      if (optText === topic || optVal === topic || optText.includes(topic) || topic.includes(optText)) {
        topicDropdown.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched && topicDropdown.options.length > 1) {
      topicDropdown.selectedIndex = 1;
    }
  }
  document.querySelector('.portal-cta-btn, [data-plan]')?.click();
});

// Judicial Directory (120 Lawsuits) Live Search & Filter
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
    const query = (searchInput.value || '').trim().toLowerCase();
    let visibleTotal = 0;

    categoryBlocks.forEach(block => {
      const blockCat = block.dataset.category;
      const matchesCat = (activeCategory === 'all' || activeCategory === blockCat);
      let visibleInBlock = 0;

      const chips = block.querySelectorAll('.lawsuit-chip');
      chips.forEach(chip => {
        const text = chip.textContent.toLowerCase();
        const matchesQuery = (!query || text.includes(query));

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
      emptyState.style.display = (visibleTotal === 0) ? 'block' : 'none';
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

// Forensic Evidence Hasher (Client-side SHA-256 for Evidence Integrity)
(function() {
  const triggerBtn = document.getElementById('forensic-upload-trigger');
  const fileInput = document.getElementById('forensic-file-input');
  const resultBox = document.getElementById('forensic-result');
  const hashValEl = document.getElementById('forensic-hash-val');
  const metaEl = document.getElementById('forensic-file-meta');
  const copyBtn = document.getElementById('copy-hash-btn');

  if (!triggerBtn || !fileInput) return;

  triggerBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    triggerBtn.textContent = 'جارٍ فحص الملف وحساب البصمة الرقمية...';
    triggerBtn.disabled = true;

    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (hashValEl) hashValEl.textContent = hashHex;
      const sizeKb = (file.size / 1024).toFixed(1);
      const dateStr = new Date().toLocaleString('ar-IQ');
      if (metaEl) {
        metaEl.textContent = `الملف: ${file.name} (${sizeKb} KB) • تاريخ الفحص: ${dateStr}`;
      }
      if (resultBox) resultBox.style.display = 'block';
      triggerBtn.textContent = 'اختيار ملف آخر لحساب البصمة 🔍';
      triggerBtn.disabled = false;
    } catch (err) {
      alert('تعذر استخراج البصمة للملف: ' + err.message);
      triggerBtn.textContent = 'اختيار ملف لحساب البصمة 🔍';
      triggerBtn.disabled = false;
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const hash = hashValEl ? hashValEl.textContent : '';
      if (hash) {
        navigator.clipboard.writeText(hash).then(() => {
          copyBtn.textContent = 'تم النسخ بنجاح ✓';
          setTimeout(() => copyBtn.textContent = 'نسخ البصمة الرقمية', 2500);
        });
      }
    });
  }
})();

// Dynamic Legal Articles Loader & Modal Handler
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

  let currentTopicForConsult = '';

  async function loadArticles() {
    let articles = [];
    try {
      const resp = await fetch('api/articles.php');
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'success' && data.articles) articles = data.articles;
      }
    } catch (e) {}

    if (!articles.length) {
      try {
        const resp2 = await fetch('data/articles.json');
        if (resp2.ok) articles = await resp2.json();
      } catch (e) {}
    }

    if (!articles.length) {
      articles = [
        {
          id: 'art-1',
          title: 'الدليل الإجرائي لدعوى إزالة الشيوع وفرز الحصص العقارية في المحاكم العراقية',
          category: 'العقارات والتركات',
          date: '2026-11-03',
          excerpt: 'خطوات إقامة دعوى إزالة الشيوع أمام محكمة البداءة المختصة، وكيفية حماية حصة الشريك أو الوريث من البيع ببخس الثمن بالمزاد العلني.',
          content: 'دعوى إزالة الشيوع في القانون المدني العراقي رقم 40 لسنة 1951 تُعد من أهم الدعاوى العقارية لحسم النزاعات بين الشركاء والورثة.\n\nتُقام الدعوى أمام محكمة البداءة المختصة موقعياً بمحل العقار. يتم ندب خبير قضائي لتقدير إمكانية القسمة العينية؛ فإذا تعذرت القسمة، تصدر المحكمة قراراً ببيع العقار بالمزاد العلني وتوزيع بدلات البيع على الشركاء كلٌّ بحسب حصته الشرعية أو التعاقدية.\n\nيوضح المكتب أهمية وضع إشارة عدم التصرف في دائرة التسجيل العقاري فور قيد الدعوى لمنع التصرف بالحصص أو الإضرار بحقوق الشركاء.',
          views: 184
        },
        {
          id: 'art-2',
          title: 'درع الحماية القانونية لعقارات المغتربين العراقيين في الخارج',
          category: 'شؤون المغتربين',
          date: '2026-11-01',
          excerpt: 'الإجراءات الأصولية لتصديق الوكالات القنصلية وحسم صحة الصدور الإلكترونية وحماية أملاك المهاجرين في بغداد والمحافظات.',
          content: 'يواجه العراقيون المقيمون في الولايات المتحدة، كندا، بريطانيا، والدول الأوروبية تحديات في إدارة أملاكهم ومتابعة تركاتهم في بغداد والمحافظات.\n\nالخطوة الأولى تبدأ من تنظيم وكالة عامة أو خاصة لدى القنصلية العراقية في بلد الإقامة، تليها مطابقة صحة الصدور الإلكترونية عبر وزارة الخارجية في بغداد.\n\nيوفر مكتبنا تمثيلاً قضائياً دقيقاً ومتابعة مستمرة وتقارير دورية للموكل مع إمكانية سداد أتعاب الاستشارة لحساب بنكي أمريكي رسمي مباشر لدى JPMorgan Chase.',
          views: 329
        },
        {
          id: 'art-3',
          title: 'التدقيق الفني لسلسلة حيازة الأدلة الرقمية في قضايا الابتزاز والجرائم الإلكترونية',
          category: 'الجرائم المعلوماتية',
          date: '2026-10-29',
          excerpt: 'كيفية فحص التسجيلات ومحادثات الابتزاز وحفظ سلامة الملفات الفنية لتقديمها أصولياً أمام قاضي التحقيق المختص.',
          content: 'مع تطور أدوات التزييف الرقمي واستنساخ الأصوات، باتت المحاكم الجنائية ومحاكم التحقيق في العراق تتطلب تدقيقاً فنياً صارماً للأدلة الرقمية.\n\nوفقاً لقانون أصول المحاكمات الجزائية رقم 23 لسنة 1971 وقانون الإثبات العراقي رقم 107 لسنة 1979 المعدل، تكتسب الأدلة الإلكترونية قوتها الإجرائية عندما يتم توثيق سلامتها وعدم التلاعب بها منذ لحظة استخراجها.\n\nيوفر مكتبنا فحصاً فنياً لسلامة الملفات وحساب بصمات التجزئة الرقمية المشفرة (SHA-256) لدعم الموقف الإجرائي وإغلاق منافذ الطعن بالفبركة أمام المحكمة.',
          views: 412
        }
      ];
    }

    renderArticles(articles);
  }

  function renderArticles(list) {
    container.innerHTML = '';
    list.forEach(art => {
      const card = document.createElement('article');
      card.className = 'article-pub-card';
      
      const divTop = document.createElement('div');
      const catSpan = document.createElement('span');
      catSpan.className = 'art-cat';
      catSpan.textContent = art.category;
      const h3 = document.createElement('h3');
      h3.textContent = art.title;
      const p = document.createElement('p');
      p.textContent = art.excerpt;
      divTop.appendChild(catSpan);
      divTop.appendChild(h3);
      divTop.appendChild(p);

      const divFooter = document.createElement('div');
      divFooter.className = 'article-pub-footer';
      const dateSpan = document.createElement('span');
      dateSpan.textContent = '📅 ' + art.date;
      const readBtn = document.createElement('button');
      readBtn.className = 'article-read-btn';
      readBtn.textContent = 'قراءة التحليل الكامل ←';
      readBtn.addEventListener('click', () => openArticle(art));
      divFooter.appendChild(dateSpan);
      divFooter.appendChild(readBtn);

      card.appendChild(divTop);
      card.appendChild(divFooter);
      container.appendChild(card);
    });
  }

  function openArticle(art) {
    if (!readerModal) return;
    if (titleEl) titleEl.textContent = art.title;
    if (catEl) catEl.textContent = art.category;
    if (metaEl) metaEl.textContent = `بقلم المحامي سعد فراس أميل • تاريخ النشر: ${art.date} • قيد نقابة: 188572`;
    if (contentEl) contentEl.textContent = art.content;
    currentTopicForConsult = art.title;
    readerModal.showModal();
  }

  if (closeBtn && readerModal) {
    closeBtn.addEventListener('click', () => readerModal.close());
    readerModal.addEventListener('click', (e) => {
      if (e.target === readerModal) readerModal.close();
    });
  }

  if (consultBtn && readerModal) {
    consultBtn.addEventListener('click', () => {
      readerModal.close();
      const consultSection = document.getElementById('consult');
      if (consultSection) {
        consultSection.scrollIntoView({ behavior: 'smooth' });
        const topicInput = document.getElementById('consult-topic') || document.querySelector('input[name="topic"]') || document.querySelector('#topic');
        if (topicInput) topicInput.value = 'استشارة بخصوص: ' + currentTopicForConsult;
      }
    });
  }

  loadArticles();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initArticlesModule);
} else {
  initArticlesModule();
}