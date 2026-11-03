'use strict';
// Verified office contact and payment info
const WHATSAPP_NUMBER = '9647801222119';
const SUPER_ID = 'SUPER-IQ-77098231';
const LAWYER_PIN = '188572'; // Iraqi Bar ID as secret access code
const QI_SHORTLINK = 'https://m.banqi.qi.iq/shortlink/web/csb/exgy7vng';
const QI_APP_SCHEME = 'qicardwallet://qicard/deeplink.htm?action=native&pageId=shortLink&usecase=restore&source=DEEP_LINK&url=' + encodeURIComponent(QI_SHORTLINK);

const money = value => value > 0 ? (new Intl.NumberFormat('ar-IQ').format(value) + ' د.ع') : 'يُحدد بحسب طبيعة الطلب';
const dialog = document.querySelector('#modal');
const receipt = document.querySelector('#receipt');
const preview = document.querySelector('#preview');
const previewWrap = document.querySelector('#preview-wrap');
const finalSubmitBtn = document.querySelector('#final-submit-btn');
const submitBtnText = document.querySelector('#submit-btn-text');

let previewUrl = '';
let receiptValid = false;
let receiptBase64 = '';
let imageVersion = 0;
let previousFocus;
let selectedTopic = '';
let selectedPlan = {name:'استشارة كتابية متكاملة مع العريضة', price:75000};
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

function getArabicDate() {
  const months = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
  const now = new Date();
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  return day + ' ' + month + ' ' + year;
}

let generatedDocketId = 'IQ-SA-' + Math.floor(10000 + Math.random() * 90000);

// Mandatory Receipt Lock Handler
function updateReceiptLock(isValid) {
  receiptValid = isValid;
  if (!finalSubmitBtn) return;
  
  if (isValid) {
    finalSubmitBtn.disabled = false;
    finalSubmitBtn.classList.remove('locked');
    finalSubmitBtn.classList.add('unlocked');
    if (submitBtnText) submitBtnText.textContent = '🟢 تم تأكيد الوصل بنجاح ── إرسال الكتاب والملف للمحامي سعد أميل 📨';
  } else {
    finalSubmitBtn.disabled = true;
    finalSubmitBtn.classList.remove('unlocked');
    finalSubmitBtn.classList.add('locked');
    if (submitBtnText) submitBtnText.textContent = '🔒 يرجى إرفاق وصل التحويل لتفعيل الإرسال (75,000 د.ع)';
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
      step1Error.textContent = 'يرجى إكمال الحقول الأساسية (الاسم، الهاتف، منطقة السكن، موضوع القضية، والشرح) لإصدار كتابك الرسمي.';
    }
    if (!nameVal && nameInput) nameInput.focus();
    else if (!phoneVal && phoneInput) phoneInput.focus();
    else if (!locVal && locInput) locInput.focus();
    else if (!topicVal && topicInput) topicInput.focus();
    else if (!summaryVal && summaryInput) summaryInput.focus();
    return;
  }

  if (phoneVal.length < 9) {
    if (step1Error) {
      step1Error.hidden = false;
      step1Error.textContent = 'يرجى كتابة رقم هاتف صحيح ليتسنى للأستاذ سعد أميل الاتصال بك هاتفياً.';
    }
    if (phoneInput) phoneInput.focus();
    return;
  }

  if (step1Error) step1Error.hidden = true;

  // Populate Official Letterhead Document
  if (docDate) docDate.textContent = getArabicDate();
  if (docId) docId.textContent = generatedDocketId;
  
  if (docClientInfo) {
    docClientInfo.textContent = titlePrefix + ' ' + nameVal + ' • هاتف: ' + phoneVal + ' • سكن: ' + locVal;
  }
  
  if (docOpponentInfo) {
    let oppStr = oppNameVal || 'مجهول الهوية / غير محدد';
    if (oppPhoneVal) oppStr += ' • هاتف: ' + oppPhoneVal;
    if (oppLocVal) oppStr += ' (' + oppLocVal + ')';
    docOpponentInfo.textContent = oppStr;
  }

  if (docTopicVal) docTopicVal.textContent = topicVal;
  if (docFactsVal) docFactsVal.textContent = summaryVal;

  // Transition view & lock check
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
  preview.removeAttribute('src');
  previewWrap.hidden = true;
  if(resetInput && receipt) receipt.value = '';
  if(receiptStatus) receiptStatus.textContent = '';
}

// Plan buttons (Open Modal in Step 1)
document.querySelectorAll('[data-plan]').forEach(button => {
  button.addEventListener('click', () => {
    previousFocus = button;
    selectedPlan = {
      name: button.dataset.plan || 'استشارة كتابية متكاملة مع العريضة',
      price: Number(button.dataset.price) || 75000
    };
    
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

// Receipt File Upload & Preview + Mandatory Lock Unlock
if (receipt) {
  receipt.addEventListener('change', async () => {
    const file = receipt.files[0];
    clearPreview(false);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      receiptStatus.textContent = 'اختر صورة بصيغة JPG أو PNG أو WebP.';
      updateReceiptLock(false);
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      receiptStatus.textContent = 'حجم الصورة أكبر من ٨ ميغابايت. اختر صورة أصغر.';
      updateReceiptLock(false);
      return;
    }
    const version = imageVersion;
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;

    // Read base64 for lawyer's inbox storage
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
      updateReceiptLock(true);
      if (receiptStatus) receiptStatus.textContent = '';
    } catch {
      URL.revokeObjectURL(url);
      if (version === imageVersion) {
        receiptStatus.textContent = 'تعذر فتح الصورة. يرجى اختيار صورة أخرى.';
        updateReceiptLock(false);
      }
    }
  });
}

const removeReceiptBtn = document.querySelector('#remove-receipt');
if (removeReceiptBtn) removeReceiptBtn.addEventListener('click', clearPreview);

// Save submission into Lawyer Inbox
function saveToLawyerInbox(submission) {
  try {
    const existing = JSON.parse(localStorage.getItem('saad_amil_consultations') || '[]');
    existing.unshift(submission);
    localStorage.setItem('saad_amil_consultations', JSON.stringify(existing));
  } catch(e) {
    console.error('Inbox save note:', e);
  }

  // Central Server Synchronization for Lawyer Admin Portal
  try {
    fetch('api/submit.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission)
    }).catch(err => console.log('Server sync background:', err));
  } catch(err) {}
}

// Form Submit: Final Step (ONLY ALLOWED WITH VALID RECEIPT)
const briefForm = document.querySelector('#brief');
if (briefForm) {
  briefForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!receiptValid) {
      alert('يرجى إرفاق صورة إشعار أو وصل التحويل أولاً لتفعيل الكتاب الرسمي وإرساله إلى المحامي سعد أميل.');
      return;
    }

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

    // 1. Save directly into Lawyer's Private Inbox
    const submissionData = {
      docketId: generatedDocketId,
      date: getArabicDate(),
      timestamp: new Date().toISOString(),
      titlePrefix: titlePrefix,
      name: name,
      phone: phone,
      location: loc,
      topic: topic,
      opponentName: oppName,
      opponentPhone: oppPhone,
      opponentLocation: oppLoc,
      summary: summary,
      receiptImage: receiptBase64 || previewUrl,
      fee: 75000
    };
    saveToLawyerInbox(submissionData);

    // 2. Prepare structured WhatsApp message for the Lawyer
    let oppSummary = oppName || 'غير محدد';
    if (oppPhone) oppSummary += ' • هاتف: ' + oppPhone;
    if (oppLoc) oppSummary += ' (' + oppLoc + ')';

    const message = [
      '📜 كتاب قيد استشارة قضائية — مكتب المحامي سعد أميل',
      'رقم الإضبارة: ' + generatedDocketId + ' | التاريخ: ' + getArabicDate(),
      '════════════════════════════',
      '👤 المستشير: ' + titlePrefix + ' ' + name,
      '📞 الهاتف: ' + phone,
      '📍 منطقة السكن: ' + loc,
      '⚖️ موضوع القضية: ' + topic,
      '────────────────────────────',
      '🎯 المشكو منه (الخصم): ' + oppSummary,
      '────────────────────────────',
      '📋 وقائع وتفاصيل المشكلة القضائية:',
      summary,
      '════════════════════════════',
      '💳 وصل الدفع (سوبر / كي كارد): تم سداد 75,000 د.ع بنجاح ومرفق إشعار التحويل.',
      '════════════════════════════',
      'بانتظار مراجعة الأوراق وتدقيق الثغرات وصياغة العريضة والاتصال الهاتفي من قبل الأستاذ سعد أميل.'
    ].join('\n');

    const url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
    const fallbackLink = document.querySelector('#whatsapp-fallback');
    if (fallbackLink) fallbackLink.href = url;
    const handoff = document.querySelector('#handoff');
    if (handoff) handoff.hidden = false;

    window.open(url, '_blank', 'noopener,noreferrer');
  });
}

// ==========================================================
// LAWYER'S PRIVATE INBOX LOGIC
// ==========================================================
const openInboxLink = document.querySelector('#open-lawyer-inbox');
const inboxModal = document.querySelector('#inbox-modal');
const closeInboxBtn = document.querySelector('#close-inbox-modal');
const inboxList = document.querySelector('#inbox-list');
const inboxCounter = document.querySelector('#inbox-counter');
const clearInboxBtn = document.querySelector('#clear-inbox-btn');

function renderInbox() {
  if (!inboxList || !inboxCounter) return;
  const submissions = JSON.parse(localStorage.getItem('saad_amil_consultations') || '[]');
  inboxCounter.textContent = 'المعاملات الواردة: ' + submissions.length + ' ملف';

  if (submissions.length === 0) {
    inboxList.innerHTML = '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px;">لا توجد طلبات استشارة واردة حالياً.</div>';
    return;
  }

  inboxList.innerHTML = submissions.map((sub, i) => `
    <article class="inbox-card">
      <div class="inbox-card-top">
        <span class="docket-badge">${sub.docketId}</span>
        <span class="inbox-date">${sub.date}</span>
        <span class="inbox-paid-badge">✅ تم السداد (75,000 د.ع)</span>
      </div>
      <div class="inbox-card-body">
        <div class="inbox-row"><strong>المستشير:</strong> <span>${sub.titlePrefix} ${sub.name}</span></div>
        <div class="inbox-row"><strong>الهاتف:</strong> <span dir="ltr">${sub.phone}</span> • <strong>السكن:</strong> <span>${sub.location}</span></div>
        <div class="inbox-row"><strong>موضوع النزاع:</strong> <span>${sub.topic}</span></div>
        <div class="inbox-row"><strong>الخصم:</strong> <span>${sub.opponentName || 'غير محدد'} ${sub.opponentPhone ? ' • هاتف: ' + sub.opponentPhone : ''} ${sub.opponentLocation ? ' (' + sub.opponentLocation + ')' : ''}</span></div>
        <div class="inbox-facts"><strong>الوقائع:</strong><p>${sub.summary}</p></div>
        ${sub.receiptImage ? `
          <div class="inbox-receipt-thumb">
            <strong>صورة وصل التحويل المرفق:</strong>
            <a href="${sub.receiptImage}" target="_blank" title="اضغط لتكبير الوصل">
              <img src="${sub.receiptImage}" alt="وصل تحويل ${sub.name}" style="max-height:120px;border-radius:4px;border:1px solid #c9cebe;margin-top:6px;display:block;">
            </a>
          </div>
        ` : ''}
      </div>
      <div class="inbox-actions">
        <a href="tel:${sub.phone}" class="inbox-btn call-btn">اتصال هاتفي 📞</a>
        <a href="https://wa.me/${sub.phone.replace(/^0/, '964')}?text=${encodeURIComponent('أهلاً ' + sub.titlePrefix + ' ' + sub.name + '، معك المحامي سعد أميل بخصوص استشارتك المسجلة برقم ' + sub.docketId)}" target="_blank" class="inbox-btn wa-btn">فتح واتساب الموكل 💬</a>
      </div>
    </article>
  `).join('');
}

if (openInboxLink) {
  openInboxLink.addEventListener('click', e => {
    e.preventDefault();
    const pin = prompt('أدخل الرمز السري لمكتب المحامي سعد أميل:');
    if (pin === LAWYER_PIN) {
      renderInbox();
      inboxModal.showModal();
    } else if (pin !== null) {
      alert('الرمز السري غير صحيح.');
    }
  });
}

if (closeInboxBtn) closeInboxBtn.addEventListener('click', () => inboxModal.close());
if (clearInboxBtn) {
  clearInboxBtn.addEventListener('click', () => {
    if (confirm('هل أنت متأكد من مسح جميع المعاملات من هذا المتصفح؟')) {
      localStorage.removeItem('saad_amil_consultations');
      renderInbox();
    }
  });
}

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
      jaafari: 'حق صلة الرحم ورعاية الأب مكفول شرعاً، وتمنع الأم من حرمان الأب أو تغييب الأطفال عنه، مع استصدار قرارات المشاهدة والاصطحاب العاجلة.',
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

// Event Delegation: Connect all topic buttons (static & dynamic: help items, insights, comparator, digital forensics, guide)
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


// ==========================================
// Judicial Directory (120 Lawsuits) Live Search & Filter
// ==========================================
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
    let visibleCount = 0;

    categoryBlocks.forEach(block => {
      const blockCat = block.dataset.category;
      const catMatches = (activeCategory === 'all' || activeCategory === blockCat);
      let catVisibleChips = 0;

      const chips = block.querySelectorAll('.lawsuit-chip');
      chips.forEach(chip => {
        const text = (chip.textContent || '').toLowerCase();
        const matchesQuery = !query || text.includes(query);

        if (catMatches && matchesQuery) {
          chip.style.display = '';
          catVisibleChips++;
          visibleCount++;
        } else {
          chip.style.display = 'none';
        }
      });

      if (catMatches && catVisibleChips > 0) {
        block.style.display = '';
      } else {
        block.style.display = 'none';
      }
    });

    if (searchCount) {
      if (query) {
        searchCount.textContent = `تم العثور على ${visibleCount} دعوى`;
      } else if (activeCategory !== 'all') {
        searchCount.textContent = `${visibleCount} دعوى في هذا الاختصاص`;
      } else {
        searchCount.textContent = '120 دعوى متاحة';
      }
    }

    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
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
    } else if (tabIntl && methodIq && methodIntl) {
      tabIntlEl.classList.add('active');
      tabIqEl.classList.remove('active');
      methodIntl.style.display = 'block';
      methodIq.style.display = 'none';
    }
  });
})();


// Forensic Evidence Hasher (Client-side SHA-256 for Evidence Chain of Custody)
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

    triggerBtn.textContent = 'جاري الفحص الجنائي واستخراج البصمة...';
    triggerBtn.disabled = true;

    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      hashValEl.textContent = hashHex;
      const sizeKb = (file.size / 1024).toFixed(1);
      const dateStr = new Date().toLocaleString('ar-IQ');
      metaEl.textContent = `الملف: ${file.name} (${sizeKb} KB) • تاريخ الفحص: ${dateStr}`;
      resultBox.style.display = 'block';
      triggerBtn.textContent = 'اختيار ملف آخر للفحص الجنائي 🔍';
      triggerBtn.disabled = false;
    } catch (err) {
      alert('تعذر استخراج البصمة للملف: ' + err.message);
      triggerBtn.textContent = 'اختيار ملف للفحص الجنائي 🔍';
      triggerBtn.disabled = false;
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const hash = hashValEl.textContent;
      if (hash) {
        navigator.clipboard.writeText(hash).then(() => {
          copyBtn.textContent = 'تم النسخ بنجاح ✓';
          setTimeout(() => copyBtn.textContent = 'نسخ البصمة الجنائية', 2500);
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
          content: 'دعوى إزالة الشيوع في القانون المدني العراقي رقم 40 لسنة 1951 تُعد من أهم الدعاوى العقارية لحسم النزاعات بين الشركاء والورثة.\n\nتُقام الدعوى أمام محكمة البداءة المختصة موقعياً بمحل العقار. يتم ندب خبير قضائي لتقدير إمكانية القسمة العينية؛ فإذا تعذرت القسمة، تصدر المحكمة قراراً ببيع العقار بالمزاد العلني وتوزيع بدلات البيع على الشركاء كلٌّ بحسب حصته الشرعية أو التعاقدية.\n\nينصح المحامي سعد فراس أميل دائماً بوضع إشارة عدم التصرف في دائرة التسجيل العقاري فور قيد الدعوى لمنع تهريب الحصص أو التلاعب بالملكية.',
          views: 184
        },
        {
          id: 'art-2',
          title: 'درع الحماية القانونية لعقارات المغتربين العراقيين في أمريكا وأوروبا',
          category: 'شؤون المغتربين',
          date: '2026-11-01',
          excerpt: 'الإجراءات الأصولية لتصديق الوكالات القنصلية وحسم صحة الصدور الإلكترونية وحماية أراضي وعقارات المهاجرين من تزوير مكاتب الدلالية.',
          content: 'يواجه العراقيون المقيمون في الولايات المتحدة، كندا، بريطانيا، والدول الأوروبية تحديات جسيمة في إدارة أملاكهم ومتابعة تركاتهم في بغداد والمحافظات.\n\nالخطوة الأولى تبدأ من صياغة وكالة عامة أو خاصة لدى القنصلية العراقية في بلد الإقامة، تليها مطابقة صحة الصدور الإلكترونية عبر وزارة الخارجية في بغداد.\n\nيوفر مكتبنا تمثيلاً قضائياً رفيع المستوى بإشراف شخصي وتقارير مصورة موثقة لجميع مراحل الدعوى دون حاجة المغترب للسفر، مع إمكانية سداد أتعاب الاستشارة لحساب بنكي أمريكي رسمي (Zelle / ACH).',
          views: 329
        },
        {
          id: 'art-3',
          title: 'إثبات الأدلة الرقمية وسلسلة الحيازة في قضايا الابتزاز الإلكتروني',
          category: 'الجرائم المعلوماتية',
          date: '2026-10-29',
          excerpt: 'كيفية توثيق بصمة التشفير الجنائية (SHA-256) للتسجيلات الصوتية ومحادثات الابتزاز لقبولها كدليل قطعي أمام قاضي التحقيق.',
          content: 'مع تطور أدوات التزييف العميق واستنساخ الأصوات بالذكاء الاصطناعي، باتت المحاكم الجنائية ومحاكم التحقيق في العراق تتطلب تدقيقاً علمياً صارماً للأدلة الرقمية.\n\nوفقاً لقانون أصول المحاكمات الجزائية رقم 23 لسنة 1971 وقانون الإثبات العراقي رقم 107 لسنة 1979 المعدل، لا يُقبل الدليل الإلكتروني إلا إذا حوفظ على سلسلة حيازته (Chain of Custody) من لحظة استخراجه.\n\nيوفر مكتبنا بالتعاون مع خبرتنا في Gold Stone Intelligence فحصاً جنائياً محلياً للتسجيلات واستخراج بصمات التجزئة المشفرة لقطع الطريق على الخصم في ادعاء الفبركة.',
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
      card.innerHTML = `
        <div>
          <span class="art-cat">${art.category}</span>
          <h3>${art.title}</h3>
          <p>${art.excerpt}</p>
        </div>
        <div class="article-pub-footer">
          <span>📅 ${art.date}</span>
          <button class="article-read-btn" data-art-id="${art.id}">قراءة التحليل الكامل ←</button>
        </div>
      `;
      const btn = card.querySelector('.article-read-btn');
      btn.addEventListener('click', () => openArticle(art));
      container.appendChild(card);
    });
  }

  function openArticle(art) {
    if (!readerModal) return;
    titleEl.textContent = art.title;
    catEl.textContent = art.category;
    metaEl.textContent = `بقلم المحامي سعد فراس أميل • تاريخ النشر: ${art.date} • قيد نقابة: 188572`;
    contentEl.textContent = art.content;
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
        const topicInput = document.getElementById('consult-topic') || document.querySelector('input[name="topic"]');
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
