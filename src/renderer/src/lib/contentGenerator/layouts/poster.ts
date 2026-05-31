import type { LayoutDef } from '../types';

/** L13-L16 海报布局 */
export const posterLayouts: LayoutDef[] = [
  {
    id: 'poster-activity',
    name: '活动海报-竖版',
    category: 'poster',
    description: '竖版海报，视觉冲击力强，适合活动宣传和品牌曝光',
    applicableTypes: ['activityPromo', 'festival', 'posterDesign', 'productLaunch'],
    previewBg: '#1e1b4b',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#1e1b4b" rx="4"/>
      <rect x="20" y="20" width="200" height="160" rx="8" fill="#312e81"/>
      <circle cx="120" cy="100" r="40" fill="#4f46e5" opacity="0.6"/>
      <rect x="40" y="200" width="160" height="14" rx="3" fill="#fff"/>
      <rect x="60" y="220" width="120" height="6" rx="2" fill="#a5b4fc"/>
      <rect x="30" y="245" width="180" height="8" rx="2" fill="#818cf8"/>
      <rect x="70" y="270" width="100" height="28" rx="14" fill="#fbbf24"/>
      <text x="120" y="289" font-size="11" fill="#1e1b4b" text-anchor="middle" font-weight="bold">立即报名</text>
      <rect x="60" y="310" width="120" height="4" rx="1" fill="#6366f1"/>
    </svg>`,
    htmlTemplate: `<section style="background:{{posterBg}};padding:32px 24px;border-radius:16px;text-align:center;">
  <section style="margin-bottom:24px;">
    <img src="{{posterImage}}" style="width:100%;border-radius:12px;" alt=""/>
  </section>
  <h1 style="font-size:28px;font-weight:800;color:{{posterTitleColor}};margin:0 0 12px;">{{title}}</h1>
  <p style="font-size:16px;color:{{posterSubColor}};margin:0 0 24px;">{{subtitle}}</p>
  <p style="font-size:14px;color:{{posterInfoColor}};margin:0 0 8px;">{{eventTime}}</p>
  <p style="font-size:14px;color:{{posterInfoColor}};margin:0 0 24px;">{{eventLocation}}</p>
  <a href="{{ctaLink}}" style="display:inline-block;background:{{buttonBg}};color:{{buttonTextColor}};font-size:16px;font-weight:700;padding:12px 40px;border-radius:28px;text-decoration:none;">{{buttonText}}</a>
  <p style="font-size:13px;color:{{posterNoteColor}};margin:16px 0 0;">{{note}}</p>
</section>`,
  },
  {
    id: 'poster-product',
    name: '产品海报-卖点型',
    category: 'poster',
    description: '产品图 + 核心卖点 + 价格/购买方式',
    applicableTypes: ['productLaunch', 'activityPromo', 'ecommerce' as any, 'posterDesign'],
    previewBg: '#f8fafc',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#f8fafc" rx="4"/>
      <rect x="20" y="15" width="200" height="140" rx="10" fill="#e2e8f0"/>
      <circle cx="120" cy="85" r="35" fill="#cbd5e1"/>
      <rect x="30" y="170" width="180" height="12" rx="3" fill="#1e293b"/>
      <rect x="50" y="188" width="140" height="6" rx="2" fill="#94a3b8"/>
      <rect x="20" y="210" width="60" height="24" rx="12" fill="#059669"/>
      <text x="50" y="226" font-size="10" fill="#fff" text-anchor="middle" font-weight="bold">卖点1</text>
      <rect x="90" y="210" width="60" height="24" rx="12" fill="#2563eb"/>
      <text x="120" y="226" font-size="10" fill="#fff" text-anchor="middle" font-weight="bold">卖点2</text>
      <rect x="160" y="210" width="60" height="24" rx="12" fill="#d97706"/>
      <text x="190" y="226" font-size="10" fill="#fff" text-anchor="middle" font-weight="bold">卖点3</text>
      <rect x="40" y="250" width="160" height="10" rx="2" fill="#dc2626"/>
      <rect x="60" y="280" width="120" height="28" rx="14" fill="#1e293b"/>
      <text x="120" y="299" font-size="11" fill="#fff" text-anchor="middle" font-weight="bold">立即购买</text>
    </svg>`,
    htmlTemplate: `<section style="background:#fff;padding:32px 24px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
  <section style="text-align:center;margin-bottom:24px;">
    <img src="{{productImage}}" style="max-width:100%;border-radius:12px;" alt=""/>
  </section>
  <h1 style="font-size:26px;font-weight:800;color:#1a1a2e;text-align:center;margin:0 0 8px;">{{title}}</h1>
  <p style="font-size:15px;color:#888;text-align:center;margin:0 0 24px;">{{subtitle}}</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px;margin-bottom:24px;">
    <tr>
      <td width="33%" style="background:{{tag1Bg}};border-radius:20px;padding:10px;text-align:center;">
        <span style="font-size:13px;font-weight:600;color:{{tag1Color}};">{{sellingPoint1}}</span>
      </td>
      <td width="33%" style="background:{{tag2Bg}};border-radius:20px;padding:10px;text-align:center;">
        <span style="font-size:13px;font-weight:600;color:{{tag2Color}};">{{sellingPoint2}}</span>
      </td>
      <td width="33%" style="background:{{tag3Bg}};border-radius:20px;padding:10px;text-align:center;">
        <span style="font-size:13px;font-weight:600;color:{{tag3Color}};">{{sellingPoint3}}</span>
      </td>
    </tr>
  </table>
  <section style="text-align:center;margin-bottom:20px;">
    <span style="font-size:28px;font-weight:800;color:#dc2626;">{{price}}</span>
    <span style="font-size:14px;color:#999;text-decoration:line-through;margin-left:8px;">{{originalPrice}}</span>
  </section>
  <section style="text-align:center;">
    <a href="{{buyLink}}" style="display:inline-block;background:{{buttonBg}};color:#fff;font-size:16px;font-weight:700;padding:12px 48px;border-radius:28px;text-decoration:none;">{{buttonText}}</a>
  </section>
</section>`,
  },
  {
    id: 'poster-data',
    name: '数据海报-信息图',
    category: 'poster',
    description: '数据可视化 + 关键结论，适合行业报告和数据发布',
    applicableTypes: ['dataReport', 'yearReview', 'deepFeature', 'posterDesign'],
    previewBg: '#0f172a',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#0f172a" rx="4"/>
      <rect x="20" y="15" width="200" height="12" rx="3" fill="#f1f5f9"/>
      <rect x="60" y="33" width="120" height="6" rx="2" fill="#64748b"/>
      <rect x="20" y="55" width="95" height="50" rx="6" fill="#1e293b"/>
      <rect x="30" y="65" width="50" height="10" rx="2" fill="#38bdf8"/>
      <rect x="30" y="80" width="40" height="4" rx="1" fill="#64748b"/>
      <rect x="125" y="55" width="95" height="50" rx="6" fill="#1e293b"/>
      <rect x="135" y="65" width="50" height="10" rx="2" fill="#34d399"/>
      <rect x="135" y="80" width="40" height="4" rx="1" fill="#64748b"/>
      <rect x="20" y="120" width="200" height="80" rx="8" fill="#1e293b"/>
      <polyline points="30,185 60,170 90,175 120,155 150,165 180,145 210,155" stroke="#38bdf8" fill="none" stroke-width="2"/>
      <rect x="20" y="215" width="95" height="30" rx="4" fill="#312e81"/>
      <rect x="125" y="215" width="95" height="30" rx="4" fill="#312e81"/>
      <rect x="50" y="265" width="140" height="4" rx="1" fill="#334155"/>
      <rect x="70" y="275" width="100" height="3" rx="1" fill="#475569"/>
    </svg>`,
    htmlTemplate: `<section style="background:{{posterBg}};padding:32px 24px;border-radius:16px;">
  <h2 style="font-size:22px;font-weight:700;text-align:center;color:{{titleColor}};margin:0 0 6px;">{{title}}</h2>
  <p style="text-align:center;font-size:14px;color:{{subtitleColor}};margin:0 0 24px;">{{subtitle}}</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:10px;margin-bottom:20px;">
    <tr>
      <td width="50%" style="background:{{cardBg}};border-radius:10px;padding:16px;">
        <div style="font-size:32px;font-weight:800;color:{{accent1}};">{{metric1}}</div>
        <div style="font-size:13px;color:{{labelColor}};margin-top:4px;">{{metric1Label}}</div>
      </td>
      <td width="50%" style="background:{{cardBg}};border-radius:10px;padding:16px;">
        <div style="font-size:32px;font-weight:800;color:{{accent2}};">{{metric2}}</div>
        <div style="font-size:13px;color:{{labelColor}};margin-top:4px;">{{metric2Label}}</div>
      </td>
    </tr>
  </table>
  <section style="background:{{chartBg}};border-radius:10px;padding:16px;margin-bottom:20px;">
    <p style="font-size:15px;color:{{textColor}};line-height:1.8;margin:0;">{{analysisBody}}</p>
  </section>
  <p style="text-align:center;font-size:12px;color:{{footerColor}};">{{source}}</p>
</section>`,
  },
  {
    id: 'poster-people',
    name: '人物海报-专访型',
    category: 'poster',
    description: '人物照片 + 金句 + 简介，适合人物专访和品牌代言',
    applicableTypes: ['interview', 'brandStory', 'deepFeature', 'posterDesign'],
    previewBg: '#fafaf9',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#fafaf9" rx="4"/>
      <rect x="20" y="15" width="200" height="160" rx="12" fill="#e2e8f0"/>
      <circle cx="120" cy="80" r="35" fill="#cbd5e1"/>
      <rect x="20" y="190" width="200" height="60" rx="8" fill="#1e293b" opacity="0.05"/>
      <text x="35" y="210" font-size="16" fill="#475569" font-style="italic">"</text>
      <rect x="40" y="200" width="160" height="5" rx="1" fill="#334155"/>
      <rect x="40" y="210" width="140" height="4" rx="1" fill="#64748b"/>
      <rect x="40" y="218" width="120" height="4" rx="1" fill="#94a3b8"/>
      <rect x="40" y="240" width="80" height="4" rx="1" fill="#94a3b8"/>
      <rect x="20" y="270" width="200" height="4" rx="1" fill="#94a3b8"/>
      <rect x="20" y="280" width="200" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="20" y="290" width="180" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="20" y="305" width="120" height="5" rx="1" fill="#1e293b"/>
    </svg>`,
    htmlTemplate: `<section style="text-align:center;padding:0;">
  <section style="margin-bottom:24px;">
    <img src="{{portrait}}" style="width:100%;border-radius:16px;max-height:400px;object-fit:cover;" alt=""/>
  </section>
  <blockquote style="background:{{quoteBg}};border-radius:12px;padding:24px;margin:0 0 20px;position:relative;">
    <p style="font-size:20px;line-height:1.6;color:#333;font-style:italic;margin:0;">"{{quoteText}}"</p>
  </blockquote>
  <h2 style="font-size:22px;font-weight:700;color:#1a1a2e;margin:0 0 4px;">{{name}}</h2>
  <p style="font-size:14px;color:#888;margin:0 0 20px;">{{title}}</p>
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:20px auto;width:60px;"/>
  <section style="text-align:left;font-size:15px;line-height:1.8;color:#555;">
    {{bioBody}}
  </section>
</section>`,
  },
];
