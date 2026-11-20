import {defaultWarehouseSettings,validateWarehouseSettings} from './warehouse-settings.mjs';
export const defaultSettings = {
  warehouse: defaultWarehouseSettings,
  phone: '0879 089 789',
  salesPhone: '0879 089 789',
  email: 'cs2hangkelogistics@gmail.com',
  marketingEmail: 'marketing.gkelogistics@gmail.com',
  office: 'Phuong Liet Ward, Phuong Liet, Hanoi, Vietnam',
  statistics: {processing: '1–6H', monthlyOrders: '100,000+', support: '24/7', clients: '300+', integration: 'API'},
  content: {
    en: {
      heroTitle: 'GKE Logistics International Company Limited',
      heroDescription: 'GKE Logistics International Company Limited provides cross-border e-commerce logistics solutions, connecting Vietnamese businesses with two strategic markets: the United States and the United Kingdom.',
      introduction: 'GKE specializes in providing cross-border logistics solutions for businesses, manufacturers, fulfillment centers, and e-commerce sellers.',
      vision: 'To become a leading logistics partner from Vietnam to the world, setting new benchmarks for reliability, transparency, and performance in cross-border e-commerce logistics.',
      mission: 'To deliver efficient, transparent, and scalable logistics solutions, enabling our clients to expand globally while maintaining operational excellence.',
      philosophy: 'REAL SERVICE – Practical, accountable logistics solutions measured by operational performance and real execution capability.'
    },
    vi: {
      heroTitle: 'Công ty TNHH Quốc tế GKE Logistics',
      heroDescription: 'GKE Logistics cung cấp giải pháp logistics thương mại điện tử xuyên biên giới, kết nối doanh nghiệp Việt Nam với hai thị trường chiến lược: Hoa Kỳ và Vương quốc Anh.',
      introduction: 'GKE cung cấp giải pháp logistics xuyên biên giới cho doanh nghiệp, nhà sản xuất, trung tâm hoàn tất đơn hàng và nhà bán hàng thương mại điện tử.',
      vision: 'Trở thành đối tác logistics hàng đầu kết nối Việt Nam với thế giới, thiết lập chuẩn mực về độ tin cậy, tính minh bạch và hiệu quả vận hành.',
      mission: 'Cung cấp giải pháp logistics hiệu quả, minh bạch và có khả năng mở rộng, giúp khách hàng phát triển trên thị trường toàn cầu.',
      philosophy: 'DỊCH VỤ THỰC CHẤT – Giải pháp logistics thiết thực và có trách nhiệm, được đo bằng hiệu quả vận hành và năng lực thực thi.'
    },
    zh: {
      heroTitle: 'GKE 国际物流有限公司',
      heroDescription: 'GKE 国际物流提供跨境电商物流解决方案，连接越南企业与美国、英国两大战略市场。',
      introduction: 'GKE 专注于为企业、制造商、履约中心和电商卖家提供跨境物流解决方案。',
      vision: '成为连接越南与全球市场的领先物流合作伙伴，树立可靠、透明和高效的跨境物流标准。',
      mission: '提供高效、透明且可扩展的物流解决方案，帮助客户拓展全球市场并保持卓越运营。',
      philosophy: '务实服务 – 以实际运营表现和执行能力衡量的专业、负责的物流解决方案。'
    }
  }
};

export function validateSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const clean = structuredClone(defaultSettings);
  const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v) ? v.trim() : null;
  for (const key of ['phone','salesPhone','email','marketingEmail','office']) {
    const v = text(value[key], key === 'office' ? 300 : 160);
    if (!v) return null;
    clean[key] = v;
  }
  if (![clean.phone,clean.salesPhone].every(v => /^\+?[\d ()-]{7,30}$/.test(v))) return null;
  if (![clean.email,clean.marketingEmail].every(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) return null;
  for (const key of Object.keys(clean.statistics)) {
    const v = text(value.statistics?.[key], 32);
    if (!v) return null;
    clean.statistics[key] = v;
  }
  for (const locale of ['en','vi','zh']) {
    for (const key of Object.keys(clean.content[locale])) {
      const v = text(value.content?.[locale]?.[key], key === 'heroTitle' ? 180 : 2400);
      if (!v) return null;
      clean.content[locale][key] = v;
    }
  }
  clean.warehouse = validateWarehouseSettings(value.warehouse ?? defaultWarehouseSettings);
  if (!clean.warehouse) return null;
  return clean;
}
