// ============================================
// NISAR DIGITAL SERVICES - COMPLETE APP.JS
// ============================================

// IMPORTANT: Confirm this is your exact Render backend URL.
const API_BASE = 'https://nisar-digital-services-api.onrender.com';

const states = [
  'All India', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
  'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const $ = id => document.getElementById(id);

let all = [];
let categories = [];
let active = 'All';

function apiUrl(path) {
  return API_BASE.replace(/\/$/, '') + path;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

// Service-specific official destinations.
// IMPORTANT: match the service NAME first, never the broad category name.
// The catalogue has 2,496 entries but does not contain a verified URL per entry.
// Unknown/state-specific services go to the official government directory rather
// than being sent to an unrelated portal.
function getOfficialServiceUrl(serviceName, category, selectedState) {
  const name = String(serviceName || '').toLowerCase().replace(/\s+/g, ' ').trim();

  // Identity services — keep each service separate.
  if (/\b(aadhaar|aadhar|uidai)\b/.test(name)) return 'https://myaadhaar.uidai.gov.in/';
  if (/\b(pan|e-pan)\b/.test(name) && !/pan.?aadhaar|aadhaar.?pan/.test(name)) {
    return 'https://tinpan.proteantech.in/services/pan/pan-index';
  }
  if (/\b(voter|elector|epic)\b/.test(name)) return 'https://voters.eci.gov.in/';
  if (/passport/.test(name)) return 'https://www.passportindia.gov.in/psp/';

  // Transport services.
  if (/driving licence|driving license|learner.?licen[cs]e|sarathi/.test(name)) return 'https://sarathi.parivahan.gov.in/';
  if (/\brc\b|vehicle registration|vehicle fitness|vehicle tax|permit information|parivahan/.test(name)) return 'https://parivahan.gov.in/';
  if (/challan|traffic fine|e.?challan/.test(name)) return 'https://echallan.parivahan.gov.in/';

  // Central government service portals.
  if (/digilocker|digital locker/.test(name)) return 'https://www.digilocker.gov.in/';
  if (/pm.?kisan|kisan samman/.test(name)) return 'https://pmkisan.gov.in/';
  if (/epfo|provident fund|uan|pf claim/.test(name)) return 'https://unifiedportal-mem.epfindia.gov.in/';
  if (/e.?shram|unorganised worker/.test(name)) return 'https://register.eshram.gov.in/';
  if (/ayushman|pm.?jay/.test(name)) return 'https://beneficiary.nha.gov.in/';
  if (/abha|health id/.test(name)) return 'https://abha.abdm.gov.in/';
  if (/scholarship|national scholarship/.test(name)) return 'https://scholarships.gov.in/';
  if (/\bgst\b|goods and services tax/.test(name)) return 'https://www.gst.gov.in/';
  if (/udyam|msme/.test(name)) return 'https://udyamregistration.gov.in/';
  if (/ration|nfsa|food security|one nation one ration/.test(name)) return 'https://nfsa.gov.in/';
  if (/birth certificate|death certificate|civil registration/.test(name)) return 'https://crsorgi.gov.in/';
  if (/mgnrega|nrega|job card/.test(name)) return 'https://nrega.nic.in/';
  if (/consumer complaint|consumer helpline/.test(name)) return 'https://consumerhelpline.gov.in/';
  if (/rti online|right to information/.test(name)) return 'https://rtionline.gov.in/';
  if (/public grievance|cpgrams/.test(name)) return 'https://pgportal.gov.in/';
  if (/cybercrime|cyber crime/.test(name)) return 'https://cybercrime.gov.in/';
  if (/income tax|itr filing|income.?tax return|tax return/.test(name)) return 'https://www.incometax.gov.in/iec/foportal/';
  if (/nta|neet|jee|entrance exam/.test(name)) return 'https://www.nta.ac.in/';
  if (/employment|job seeker|national career service/.test(name)) return 'https://www.ncs.gov.in/';
  if (/fssai|food safety|foscos/.test(name)) return 'https://foscos.fssai.gov.in/';
  if (/trademark|intellectual property/.test(name)) return 'https://ipindia.gov.in/';
  if (/startup india/.test(name)) return 'https://www.startupindia.gov.in/';
  if (/ge.?m seller|government e marketplace/.test(name)) return 'https://gem.gov.in/';
  if (/india post|post office/.test(name)) return 'https://www.indiapost.gov.in/';
  if (/railway|pnr/.test(name)) return 'https://www.indianrail.gov.in/';

  // State-specific services: do not guess a department URL from the category.
  // Open the official National Government Services directory for safe discovery.
  return 'https://services.india.gov.in/';
}

// ============================================
// LOAD STATES
// ============================================

if ($('state')) {
  $('state').innerHTML = states.map(s =>
    `<option value="${esc(s)}">${esc(s)}</option>`
  ).join('');
}

if ($('partnerState')) {
  $('partnerState').innerHTML = states
    .filter(s => s !== 'All India')
    .map(s => `<option value="${esc(s)}">${esc(s)}</option>`)
    .join('');
}

// ============================================
// LOAD SERVICES FROM RENDER BACKEND
// ============================================

async function load() {
  const count = $('count');
  const servicesBox = $('services');

  try {
    if (count) count.textContent = 'Loading services...';

    const response = await fetch(apiUrl('/api/services'));

    if (!response.ok) {
      throw new Error('Backend response error: ' + response.status);
    }

    const data = await response.json();

    // Backend may return {total: 2496, services: [...]}
    all = Array.isArray(data) ? data : data.services;

    if (!Array.isArray(all)) {
      throw new Error('Services data format is incorrect.');
    }

    // Build categories from the loaded services.
    categories = [...new Set(
      all.map(s => s.category).filter(Boolean)
    )].map(name => ({ name }));

    renderFilters();
    render();

  } catch (error) {
    console.error('Service loading error:', error);

    if (count) {
      count.textContent =
        'Services could not load. Please check the Render API connection.';
    }

    if (servicesBox) {
      servicesBox.innerHTML =
        '<p>Unable to load services. Please try again later.</p>';
    }
  }
}

// ============================================
// CATEGORY FILTERS
// ============================================

function renderFilters() {
  const box = $('filters');
  if (!box) return;

  const names = ['All', ...categories.map(c => c.name)];

  box.innerHTML = names.map(name => `
    <button
      type="button"
      class="filter ${name === active ? 'active' : ''}"
      data-cat="${esc(name)}">
      ${esc(name)}
    </button>
  `).join('');

  box.querySelectorAll('[data-cat]').forEach(button => {
    button.addEventListener('click', () => {
      active = button.dataset.cat;
      renderFilters();
      render();
    });
  });
}

// ============================================
// SEARCH AND DISPLAY SERVICES
// ============================================

function render() {
  const search = $('search');
  const stateSelect = $('state');
  const servicesBox = $('services');
  const count = $('count');

  if (!servicesBox) return;

  const q = search ? search.value.trim().toLowerCase() : '';
  const selectedState = stateSelect
    ? stateSelect.value
    : 'All India';

  const list = all.filter(service => {
    const categoryMatch =
      active === 'All' || service.category === active;

    const searchMatch =
      !q ||
      (service.name + ' ' + service.category)
        .toLowerCase()
        .includes(q);

    return categoryMatch && searchMatch;
  });

  if (count) {
    count.textContent =
      `Showing ${list.length.toLocaleString()} of ` +
      `${all.length.toLocaleString()} services • ${selectedState}`;
  }

  servicesBox.innerHTML = list.slice(0, 120).map(service => `
    <div class="service">
      <span>${esc(service.icon || '📄')}</span>

      <div>
        <b>${esc(service.name)}</b>
        <small>
          ${esc(service.category || '')} •
          ${esc(service.scope || 'All India / State Specific')}
        </small>
      </div>

      <button
        type="button"
        class="primary apply"
        data-id="${esc(service.id)}">
        Apply Now
      </button>
    </div>
  `).join('') || '<p>No matching service found.</p>';

  servicesBox.querySelectorAll('.apply').forEach(button => {
    button.addEventListener('click', () => {
      openApply(button.dataset.id);
    });
  });

  if (list.length > 120 && count) {
    count.textContent += ' • First 120 shown. Search to narrow results.';
  }
}

// ============================================
// SERVICE APPLY FORM
// ============================================

function openApply(id) {
  const service = all.find(item => String(item.id) === String(id));

  if (!service) return;

  if (!$('applyDialog') || !$('applyForm')) {
    alert('Application form is not available on this page.');
    return;
  }

  $('applyName').textContent = service.name;
  $('applyCategory').textContent =
    service.category + ' • ' + ($('state')?.value || 'All India');

  $('applyForm').dataset.id = service.id;
  $('applyForm').dataset.category = service.category || '';
  $('applyForm').dataset.officialUrl = getOfficialServiceUrl(service.name, service.category, $('state')?.value || 'All India');

  if ($('formMessage')) $('formMessage').textContent = '';
  if ($('governmentFee')) $('governmentFee').value = '0';

  updateTotal();
  $('applyDialog').showModal();
}

if ($('search')) {
  $('search').addEventListener('input', render);
}

if ($('state')) {
  $('state').addEventListener('change', render);
}

if ($('close')) {
  $('close').addEventListener('click', () => {
    $('applyDialog')?.close();
  });
}

// ============================================
// FEE CALCULATION
// Government Fee + NISAR Service Charge ₹50
// ============================================

function updateTotal() {
  const governmentFee = Math.max(
    0,
    Number($('governmentFee')?.value) || 0
  );

  const total = governmentFee + 50;

  if ($('totalFee')) {
    $('totalFee').textContent =
      '₹' + total.toLocaleString('en-IN');
  }
}

if ($('governmentFee')) {
  $('governmentFee').addEventListener('input', updateTotal);
}

// ============================================
// PRINT FEE SLIP
// ============================================

if ($('printSlip')) {
  $('printSlip').addEventListener('click', () => {
    const form = $('applyForm');
    if (!form) return;

    const data = Object.fromEntries(new FormData(form));
    const governmentFee = Math.max(
      0,
      Number(data.governmentFee) || 0
    );

    const total = governmentFee + 50;
    const win = window.open('', '_blank');

    if (!win) {
      alert('Please allow pop-ups to print the fee slip.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NISAR Fee Slip</title>
        <style>
          body { font-family: Arial; padding: 25px; }
          h1, h2 { color: #123b70; }
          hr { margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>NISAR DIGITAL SERVICES</h1>
        <h2>Service Fee Slip</h2>
        <hr>
        <p><b>Service:</b> ${esc($('applyName')?.textContent)}</p>
        <p><b>Customer:</b> ${esc(data.name)}</p>
        <p><b>Mobile:</b> ${esc(data.mobile)}</p>
        <p><b>Government Fee:</b> ₹${governmentFee}</p>
        <p><b>NISAR Service Charge:</b> ₹50</p>
        <h2>Total: ₹${total}</h2>
        <hr>
        <p>Fee estimate only. This printed slip does not collect payment.</p>
        <p>Government application submission must be completed through an authorized channel.</p>
      </body>
      </html>
    `);

    win.document.close();
    win.print();
  });
}

// ============================================
// SUBMIT SERVICE REQUEST
// ============================================

if ($('applyForm')) {
  $('applyForm').addEventListener('submit', async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    data.governmentFee = Math.max(
      0,
      Number(data.governmentFee) || 0
    );

    data.nisarCharge = 50;
    data.totalFee = data.governmentFee + 50;
    data.serviceId = form.dataset.id;
    data.serviceName = $('applyName')?.textContent || '';
    data.category = form.dataset.category || '';
    data.state = $('state')?.value || '';

    if ($('formMessage')) {
      $('formMessage').textContent = 'Submitting request...';
    }

    try {
      const response = await fetch(
        apiUrl('/api/service-requests'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Request could not be submitted.');
      }

      if ($('formMessage')) {
        const officialUrl = form.dataset.officialUrl || 'https://services.india.gov.in/';
        $('formMessage').textContent =
          'Your service request is saved. Reference: ' +
          (result.reference || 'Received') +
          '. Continue on the official government portal to complete the application.';
        const link = document.createElement('a');
        link.href = officialUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'primary';
        link.textContent = 'Continue to Official Government Website';
        link.style.display = 'inline-block';
        link.style.marginTop = '10px';
        $('formMessage').appendChild(document.createElement('br'));
        $('formMessage').appendChild(link);
      }

      form.reset();

    } catch (error) {
      console.error(error);

      if ($('formMessage')) {
        $('formMessage').textContent =
          error.message + ' Please contact 9346551871.';
      }
    }
  });
}

// ============================================
// LANGUAGE SUPPORT
// ============================================

const translations = {
  hi: [
    'सरकारी और डिजिटल सेवाएँ',
    'NISAR के माध्यम से आवेदन करें',
    'अपना राज्य चुनें, सेवा खोजें और ऑनलाइन सेवा अनुरोध भेजें।',
    'आवेदन के लिए सेवा खोजें'
  ],
  te: [
    'ప్రభుత్వ మరియు డిజిటల్ సేవలు',
    'NISAR ద్వారా దరఖాస్తు చేయండి',
    'మీ రాష్ట్రాన్ని ఎంచుకుని సేవను వెతికి ఆన్‌లైన్ అభ్యర్థన పంపండి.',
    'దరఖాస్తు చేయడానికి సేవను కనుగొనండి'
  ],
  ur: [
    'سرکاری اور ڈیجیٹل خدمات',
    'NISAR کے ذریعے درخواست دیں',
    'اپنی ریاست منتخب کریں، سروس تلاش کریں اور درخواست جمع کریں۔',
    'درخواست دینے کے لیے سروس تلاش کریں'
  ],
  ml: [
    'സർക്കാർ, ഡിജിറ്റൽ സേവനങ്ങൾ',
    'NISAR വഴി അപേക്ഷിക്കുക',
    'സംസ്ഥാനം തിരഞ്ഞെടുത്ത് സേവനം കണ്ടെത്തി അപേക്ഷ സമർപ്പിക്കുക.',
    'അപേക്ഷിക്കാൻ സേവനം കണ്ടെത്തുക'
  ],
  ta: [
    'அரசு மற்றும் டிஜிட்டல் சேவைகள்',
    'NISAR மூலம் விண்ணப்பிக்கவும்',
    'மாநிலத்தைத் தேர்ந்தெடுத்து சேவையைத் தேடி கோரிக்கையை அனுப்பவும்.',
    'விண்ணப்பிக்க சேவையைத் தேடுங்கள்'
  ],
  kn: [
    'ಸರ್ಕಾರಿ ಮತ್ತು ಡಿಜಿಟಲ್ ಸೇವೆಗಳು',
    'NISAR ಮೂಲಕ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ',
    'ರಾಜ್ಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ, ಸೇವೆಯನ್ನು ಹುಡುಕಿ ಮತ್ತು ವಿನಂತಿ ಸಲ್ಲಿಸಿ.',
    'ಅರ್ಜಿಸಲು ಸೇವೆಯನ್ನು ಹುಡುಕಿ'
  ],
  mr: [
    'सरकारी आणि डिजिटल सेवा',
    'NISAR द्वारे अर्ज करा',
    'राज्य निवडा, सेवा शोधा आणि विनंती पाठवा.',
    'अर्जासाठी सेवा शोधा'
  ],
  bn: [
    'সরকারি ও ডিজিটাল পরিষেবা',
    'NISAR-এর মাধ্যমে আবেদন করুন',
    'রাজ্য বেছে পরিষেবা খুঁজে অনুরোধ জমা দিন।',
    'আবেদনের জন্য পরিষেবা খুঁজুন'
  ],
  pa: [
    'ਸਰਕਾਰੀ ਅਤੇ ਡਿਜੀਟਲ ਸੇਵਾਵਾਂ',
    'NISAR ਰਾਹੀਂ ਅਰਜ਼ੀ ਦਿਓ',
    'ਆਪਣਾ ਰਾਜ ਚੁਣੋ, ਸੇਵਾ ਲੱਭੋ ਅਤੇ ਬੇਨਤੀ ਭੇਜੋ।',
    'ਅਰਜ਼ੀ ਲਈ ਸੇਵਾ ਲੱਭੋ'
  ]
};

if ($('language')) {
  $('language').addEventListener('change', () => {
    const translation = translations[$('language').value];

    if (!translation) return;

    if ($('heroTitle')) {
      $('heroTitle').innerHTML =
        esc(translation[0]) +
        '<br><em>' + esc(translation[1]) + '</em>';
    }

    if ($('heroText')) {
      $('heroText').textContent = translation[2];
    }

    if ($('browseTitle')) {
      $('browseTitle').textContent = translation[3];
    }
  });
}

// ============================================
// RETAILER / DISTRIBUTOR REGISTRATION
// ============================================

document.querySelectorAll('[data-open-partner]').forEach(button => {
  button.addEventListener('click', () => {
    const role = button.dataset.openPartner;

    if (!$('partnerRegisterDialog')) return;

    if ($('partnerRole')) {
      $('partnerRole').value = role;
    }

    if ($('partnerRegisterTitle')) {
      $('partnerRegisterTitle').textContent =
        role + ' Application Form';
    }

    if ($('partnerRegisterMessage')) {
      $('partnerRegisterMessage').textContent = '';
    }

    $('partnerRegisterDialog').showModal();
  });
});

if ($('closePartnerRegister')) {
  $('closePartnerRegister').addEventListener('click', () => {
    $('partnerRegisterDialog')?.close();
  });
}

if ($('partnerRegisterForm')) {
  $('partnerRegisterForm').addEventListener('submit', async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    if ($('partnerRegisterMessage')) {
      $('partnerRegisterMessage').textContent =
        'Submitting registration...';
    }

    try {
      const response = await fetch(
        apiUrl('/api/partner-registrations'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed.');
      }

      if ($('partnerRegisterMessage')) {
        $('partnerRegisterMessage').textContent =
          'Application submitted. Reference: ' +
          (result.reference || 'Received') +
          '. Status: Pending review.';
      }

      form.reset();

    } catch (error) {
      console.error(error);

      if ($('partnerRegisterMessage')) {
        $('partnerRegisterMessage').textContent =
          error.message + ' Please contact 9346551871.';
      }
    }
  });
}

// ============================================
// START APPLICATION
// ============================================

load();
