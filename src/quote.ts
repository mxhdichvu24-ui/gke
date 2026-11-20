import {chinese} from './quote-zh';
const page = document.querySelector<HTMLElement>('#quote')!;
const vi = page.dataset.locale === 'vi';
const zh = page.dataset.locale === 'zh';
const t = (en: string, vietnamese: string) => zh ? (chinese[en] || en) : vi ? vietnamese : en;
const number = new Intl.NumberFormat(zh ? 'zh-CN' : vi ? 'vi-VN' : 'en', {maximumFractionDigits: 3});
const keys = ['weight', 'length', 'width', 'height'] as const;
type PackageValues = Record<typeof keys[number], string>;
type QuoteInput = PackageValues & {route: string, service: string};
type Price = {name: string, total: number, days: string, charges: {shipping: number, handling: number}};
type Estimate = {
  status: 'estimated' | 'request_required' | 'unsupported';
  reason?: string;
  demo?: boolean;
  currency: string;
  actualKg: number;
  volumeKg: number;
  billableKg: number;
  services: Price[];
};

const estimateForm = document.querySelector<HTMLFormElement>('#estimate-form')!;
const quoteForm = document.querySelector<HTMLFormElement>('#consultation-form')!;
const estimateButton = estimateForm.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const quoteButton = quoteForm.querySelector<HTMLButtonElement>('button[type="submit"]')!;
const estimateStatus = document.querySelector('#estimate-status')!;
const quoteStatus = document.querySelector('#consultation-status')!;
const results = document.querySelector<HTMLElement>('#estimate-results')!;
const consultation = document.querySelector<HTMLDetailsElement>('#consultation')!;
const contact = document.querySelector<HTMLAnchorElement>('#consultation-contact')!;
const packageList = document.querySelector<HTMLElement>('#packages')!;
const packageTemplate = packageList.querySelector<HTMLFieldSetElement>('[data-package]')!.cloneNode(true) as HTMLFieldSetElement;
const route = estimateForm.elements.namedItem('route') as HTMLSelectElement;
const service = estimateForm.elements.namedItem('service') as HTMLSelectElement;

function fields(container: ParentNode) {
  return Object.fromEntries(keys.map(key => [key, container.querySelector<HTMLInputElement>(`input[name="${key}"]`)!])) as Record<typeof keys[number], HTMLInputElement>;
}

function values(container: ParentNode): PackageValues {
  return Object.fromEntries(Object.entries(fields(container)).map(([key, input]) => [key, input.value.trim()])) as PackageValues;
}

function estimateInput(): QuoteInput {
  return {...values(estimateForm), route: route.value, service: service.value};
}

function persist() {
  try {
    sessionStorage.setItem('gke:estimate', JSON.stringify(estimateInput()));
  } catch {
    // Inputs remain usable when browser storage is unavailable.
  }
}

function filterServices() {
  const options = Array.from(service.options);
  for (const option of options) {
    const allowed = !option.dataset.route || option.dataset.route === route.value;
    option.hidden = !allowed;
    option.disabled = !allowed;
  }
  for (const group of service.querySelectorAll('optgroup')) {
    group.hidden = !Array.from(group.querySelectorAll('option')).some(option => !option.hidden);
  }
  if (service.selectedOptions[0]?.disabled || service.selectedIndex < 0) service.value = '';
}

function restore() {
  let saved: Partial<QuoteInput> = {};
  try {
    saved = JSON.parse(sessionStorage.getItem('gke:estimate') || '{}') || {};
  } catch {
    // Invalid or unavailable storage can be ignored.
  }
  const current = new URLSearchParams(location.search);
  route.value = (current.get('route') || saved.route) === 'UK' ? 'UK' : 'US';
  service.value = current.get('service') || (current.has('route') ? '' : saved.service || '');
  for (const key of keys) {
    if (typeof saved[key] === 'string') fields(estimateForm)[key].value = saved[key];
  }
  filterServices();
}

function parcelIsValid(container: ParentNode) {
  let valid = true;
  for (const [name, input] of Object.entries(fields(container))) {
    const text = input.value.trim().replace(',', '.');
    const pattern = name === 'weight' ? /^\d{1,5}(?:\.\d{1,3})?$/ : /^\d{1,5}(?:\.\d{1,2})?$/;
    const number = Number(text);
    const allowed = pattern.test(text) && number > 0 && number <= 1000;
    if (allowed) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
    valid = valid && allowed;
  }
  return valid;
}

function markError(form: HTMLFormElement, status: Element, message: string) {
  status.textContent = message;
  form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}

function copyParcel() {
  const first = packageList.querySelector<HTMLElement>('[data-package]')!;
  const existing = fields(first);
  const current = values(estimateForm);
  for (const key of keys) {
    if (!existing[key].value) existing[key].value = current[key];
  }
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function display(data: Estimate) {
  if (data.status !== 'estimated') {
    estimateStatus.textContent = data.reason === 'manual_service'
      ? t('This service requires a personal quote.', 'Gói này cần báo giá riêng.')
      : t('GKE’s official tariff is pending. Request a confirmed quote below.', 'Đang chờ bảng cước chính thức của GKE. Vui lòng gửi yêu cầu tư vấn bên dưới.');
    return;
  }

  const money = new Intl.NumberFormat(zh ? 'zh-CN' : vi ? 'vi-VN' : 'en', {style:'currency', currency:data.currency, currencyDisplay:'code'});
  const kilograms = (value: number) => `${number.format(value)} kg`;
  if (data.demo) results.append(element('p', t('Demo rate', 'Giá mô phỏng'), 'gke-demo'));
  results.append(element('p', [
    t('Actual', 'Cân thực') + ' ' + kilograms(data.actualKg),
    t('Volumetric', 'Cân thể tích') + ' ' + kilograms(data.volumeKg),
    t('Billable', 'Cân tính cước') + ' ' + kilograms(data.billableKg),
  ].join(' · ')));
  const grid = element('div', '', 'gke-service-grid');
  for (const row of data.services) {
    const article = element('article', '', 'gke-panel');
    article.append(
      element('h3', row.name),
      element('strong', money.format(row.total), 'gke-price'),
      element('p', t('Shipping and handling included', 'Đã gồm cước và phí xử lý')),
      element('p', money.format(row.charges.shipping) + ' + ' + money.format(row.charges.handling)),
      element('p', t(row.days + ' business days (published time)', row.days + ' ngày làm việc (thời gian công bố)')),
    );
    grid.append(article);
  }
  results.append(grid);
  results.hidden = false;
  estimateStatus.textContent = t('Estimated prices updated.', 'Đã cập nhật giá ước tính.');
}

restore();
let calculation = 0;
let estimatePending = false;
function editEstimate() {
  calculation++;
  estimateButton.disabled = false;
  filterServices();
  persist();
  if (!results.hidden || estimatePending) {
    estimateStatus.textContent = t('Inputs changed. Calculate again for an updated estimate.', 'Số liệu đã đổi. Hãy tính lại để cập nhật cước.');
  }
  estimatePending = false;
  results.hidden = true;
  results.replaceChildren();
}
estimateForm.addEventListener('input', editEstimate);
estimateForm.addEventListener('change', editEstimate);
consultation.addEventListener('toggle', () => {
  if (consultation.open) copyParcel();
});
if (location.hash === '#consultation') consultation.open = true;

estimateForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  results.hidden = true;
  results.replaceChildren();
  if (!parcelIsValid(estimateForm)) {
    markError(estimateForm, estimateStatus, t('Enter a valid weight and all three dimensions.', 'Nhập cân nặng và đủ ba kích thước hợp lệ.'));
    return;
  }
  const version = ++calculation;
  estimateButton.disabled = estimatePending = true;
  estimateStatus.textContent = t('Calculating…', 'Đang tính cước…');
  persist();
  try {
    const response = await fetch('/api/shipping-estimates', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify(estimateInput()), signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error();
    const estimate: Estimate = await response.json();
    if (version === calculation) {
      display(estimate);
      copyParcel();
    }
  } catch {
    if (version === calculation) estimateStatus.textContent = t('The estimate could not be calculated. Please try again.', 'Chưa tính được cước. Vui lòng thử lại.');
  } finally {
    if (version === calculation) estimateButton.disabled = estimatePending = false;
  }
});

document.querySelector('#add-package')?.addEventListener('click', () => {
  if (packageList.children.length >= 12) return;
  const item = packageTemplate.cloneNode(true) as HTMLFieldSetElement;
  item.querySelector('legend')!.textContent = t('Package type ', 'Loại kiện ') + (packageList.children.length + 1);
  const remove = element('button', t('Remove package type', 'Xóa loại kiện'), 'gke-secondary');
  remove.type = 'button';
  remove.addEventListener('click', () => {
    item.remove();
    const legends = packageList.querySelectorAll('legend');
    legends.forEach((legend, index) => legend.textContent = t('Package type ', 'Loại kiện ') + (index + 1));
    document.querySelector<HTMLElement>('#add-package')?.focus();
  });
  item.append(remove);
  packageList.append(item);
  fields(item).weight.focus();
});

let lastSubmission = '';
let submissionKey = '';
quoteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (quoteButton.disabled) return;
  const form = new FormData(quoteForm);
  const phone = String(form.get('phone') || '').trim().replace(/[\s()-]/g, '');
  const packageNodes = Array.from(packageList.querySelectorAll<HTMLElement>('[data-package]'));
  const validParcels = packageNodes.map(parcelIsValid).every(Boolean);
  const packages = packageNodes.map(node => {
    const input = node.querySelector<HTMLInputElement>('[name="count"]')!;
    const count = input.valueAsNumber;
    if (Number.isInteger(count) && count >= 1 && count <= 1000) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid','true');
    return {...values(node), count};
  });
  const phoneField = quoteForm.querySelector<HTMLInputElement>('[name="phone"]')!;
  const phoneValid = /^(?:0|\+84)\d{9}$/.test(phone);
  const consent = form.has('consent');
  const consentInput = quoteForm.querySelector('[name="consent"]')!;
  if (phoneValid) phoneField.removeAttribute('aria-invalid');
  else phoneField.setAttribute('aria-invalid','true');
  if (consent) consentInput.removeAttribute('aria-invalid');
  else consentInput.setAttribute('aria-invalid','true');
  if (!validParcels || quoteForm.querySelector('[aria-invalid="true"]')) {
    markError(quoteForm, quoteStatus, t('Check the package details, phone number and consent box.', 'Kiểm tra số đo, số lượng kiện, số điện thoại và ô đồng ý.'));
    return;
  }

  const payload = {locale:page.dataset.locale, type: form.get('type'), phone, route: route.value, service: service.value, packages, consent};
  const signature = JSON.stringify(payload);
  if (signature !== lastSubmission) submissionKey = crypto.randomUUID();
  lastSubmission = signature;
  quoteButton.disabled = true;
  contact.hidden = true;
  quoteStatus.textContent = t('Sending…', 'Đang gửi…');
  try {
    const response = await fetch('/api/quote-requests', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({...payload, key: submissionKey}), signal: AbortSignal.timeout(12000),
    });
    const data = await response.json();
    if (response.ok && data.reference) {
      quoteStatus.textContent = t('Quote request received. Reference ', 'Đã nhận yêu cầu báo giá. Mã tham chiếu ') + data.reference;
      phoneField.value = '';
      lastSubmission = '';
    } else if (response.status === 503) {
      quoteStatus.textContent = t('Online request intake is unavailable. Please contact GKE directly.', 'Chưa thể nhận yêu cầu trực tuyến. Vui lòng liên hệ GKE trực tiếp.');
      contact.hidden = false;
    } else if (response.status === 429) {
      quoteStatus.textContent = t('Too many requests. Please try again later.', 'Đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.');
    } else throw new Error();
  } catch {
    quoteStatus.textContent = t('Your request could not be confirmed. Please try again.', 'Chưa xác nhận được yêu cầu. Vui lòng thử lại.');
  } finally {
    quoteButton.disabled = false;
  }
});
