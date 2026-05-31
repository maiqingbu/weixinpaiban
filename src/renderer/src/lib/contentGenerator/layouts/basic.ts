import type { LayoutDef } from '../types';

/** L01-L08 基础布局定义 */
export const basicLayouts: LayoutDef[] = [
  {
    id: 'basic-hero',
    name: 'Hero 全屏沉浸',
    category: 'basic',
    description: '全宽大图 + 居中标题 + 首字下沉，适合品牌故事和产品发布',
    applicableTypes: ['productLaunch', 'brandStory', 'deepFeature', 'newsReport'],
    previewBg: '#f8fafc',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="120" rx="4" fill="#e2e8f0"/>
      <rect x="40" y="140" width="160" height="12" rx="2" fill="#1e293b"/>
      <rect x="60" y="160" width="120" height="6" rx="2" fill="#94a3b8"/>
      <rect x="20" y="190" width="200" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="20" y="200" width="200" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="20" y="210" width="180" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="20" y="230" width="200" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="20" y="240" width="200" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="20" y="250" width="160" height="4" rx="1" fill="#cbd5e1"/>
    </svg>`,
    htmlTemplate: `<section style="text-align:center;padding:0;margin-bottom:24px;">
  <img src="{{heroImage}}" style="width:100%;border-radius:8px;object-fit:cover;max-height:400px;" alt="{{title}}"/>
</section>
<h1 style="font-size:28px;font-weight:700;text-align:center;margin:24px 0 12px;color:#1a1a2e;">{{title}}</h1>
<p style="text-align:center;font-size:16px;color:#666;margin-bottom:32px;">{{subtitle}}</p>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px auto;width:60px;"/>
<section style="font-size:16px;line-height:2;color:#333;">
  <p style="text-indent:2em;"><span style="font-size:32px;font-weight:700;color:#1a1a2e;float:left;line-height:1;margin-right:8px;">{{firstChar}}</span>{{bodyStart}}</p>
  {{bodyContent}}
</section>`,
  },
  {
    id: 'basic-magazine',
    name: '杂志双栏',
    category: 'basic',
    description: '左右交替图文排版，优雅间距，适合行业分析和品牌故事',
    applicableTypes: ['deepFeature', 'brandStory', 'newsReport', 'dataReport'],
    previewBg: '#fafaf9',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="100" height="80" rx="4" fill="#e2e8f0"/>
      <rect x="120" y="10" width="110" height="4" rx="1" fill="#1e293b"/>
      <rect x="120" y="20" width="110" height="4" rx="1" fill="#94a3b8"/>
      <rect x="120" y="30" width="90" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="120" y="40" width="110" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="120" y="50" width="70" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="120" y="70" width="110" height="8" rx="2" fill="#1e293b"/>
      <rect x="10" y="110" width="110" height="4" rx="1" fill="#94a3b8"/>
      <rect x="10" y="120" width="110" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="10" y="130" width="90" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="130" y="100" width="100" height="80" rx="4" fill="#e2e8f0"/>
      <rect x="10" y="200" width="220" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="10" y="210" width="220" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="10" y="220" width="200" height="4" rx="1" fill="#cbd5e1"/>
    </svg>`,
    htmlTemplate: `<section style="margin-bottom:32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td width="48%" valign="top" style="padding-right:12px;">
        <img src="{{image1}}" style="width:100%;border-radius:8px;" alt=""/>
      </td>
      <td width="52%" valign="top" style="padding-left:12px;">
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">{{section1Title}}</h2>
        <p style="font-size:15px;line-height:1.8;color:#555;">{{section1Body}}</p>
      </td>
    </tr>
  </table>
</section>
<section style="margin-bottom:32px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td width="52%" valign="top" style="padding-right:12px;">
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">{{section2Title}}</h2>
        <p style="font-size:15px;line-height:1.8;color:#555;">{{section2Body}}</p>
      </td>
      <td width="48%" valign="top" style="padding-left:12px;">
        <img src="{{image2}}" style="width:100%;border-radius:8px;" alt=""/>
      </td>
    </tr>
  </table>
</section>`,
  },
  {
    id: 'basic-timeline',
    name: '时间线叙事',
    category: 'basic',
    description: '竖向时间轴 + 节点卡片，适合发展历程和年终盘点',
    applicableTypes: ['yearReview', 'deepFeature', 'brandStory', 'newsReport'],
    previewBg: '#f1f5f9',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <line x1="40" y1="20" x2="40" y2="300" stroke="#3b82f6" stroke-width="2" stroke-dasharray="4,4"/>
      <circle cx="40" cy="40" r="6" fill="#3b82f6"/>
      <rect x="60" y="28" width="160" height="24" rx="4" fill="#dbeafe"/>
      <rect x="60" y="34" width="100" height="4" rx="1" fill="#3b82f6"/>
      <rect x="60" y="42" width="80" height="3" rx="1" fill="#93c5fd"/>
      <circle cx="40" cy="110" r="6" fill="#3b82f6"/>
      <rect x="60" y="98" width="160" height="24" rx="4" fill="#dbeafe"/>
      <rect x="60" y="104" width="100" height="4" rx="1" fill="#3b82f6"/>
      <rect x="60" y="112" width="80" height="3" rx="1" fill="#93c5fd"/>
      <circle cx="40" cy="180" r="6" fill="#3b82f6"/>
      <rect x="60" y="168" width="160" height="24" rx="4" fill="#dbeafe"/>
      <rect x="60" y="174" width="100" height="4" rx="1" fill="#3b82f6"/>
      <circle cx="40" cy="250" r="6" fill="#93c5fd"/>
      <rect x="60" y="238" width="160" height="24" rx="4" fill="#dbeafe"/>
      <rect x="60" y="244" width="100" height="4" rx="1" fill="#3b82f6"/>
    </svg>`,
    htmlTemplate: `<h2 style="font-size:24px;font-weight:700;text-align:center;color:#1a1a2e;margin-bottom:32px;">{{title}}</h2>
{{timelineItems}}
<!-- 单个时间线节点模板 -->
<section class="timeline-item" style="position:relative;padding-left:32px;margin-bottom:32px;border-left:3px solid {{themeColor}};">
  <div style="position:absolute;left:-9px;top:0;width:15px;height:15px;border-radius:50%;background:{{themeColor}};border:3px solid #fff;box-shadow:0 0 0 2px {{themeColor}};"></div>
  <div style="font-size:13px;color:{{themeColor}};font-weight:600;margin-bottom:4px;">{{dateLabel}}</div>
  <h3 style="font-size:18px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">{{nodeTitle}}</h3>
  <p style="font-size:15px;line-height:1.7;color:#555;margin:0;">{{nodeBody}}</p>
</section>`,
  },
  {
    id: 'basic-feature-grid',
    name: '特性网格',
    category: 'basic',
    description: '2x3 图标网格 + 说明，适合产品功能和卖点展示',
    applicableTypes: ['productLaunch', 'activityPromo', 'tutorial', 'dataReport'],
    previewBg: '#f8fafc',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect x="60" y="10" width="120" height="10" rx="2" fill="#1e293b"/>
      <rect x="80" y="26" width="80" height="5" rx="1" fill="#94a3b8"/>
      <rect x="15" y="50" width="100" height="70" rx="6" fill="#f1f5f9" stroke="#e2e8f0"/>
      <circle cx="45" cy="70" r="10" fill="#dbeafe"/>
      <rect x="30" y="88" width="60" height="4" rx="1" fill="#64748b"/>
      <rect x="30" y="96" width="50" height="3" rx="1" fill="#94a3b8"/>
      <rect x="125" y="50" width="100" height="70" rx="6" fill="#f1f5f9" stroke="#e2e8f0"/>
      <circle cx="155" cy="70" r="10" fill="#dcfce7"/>
      <rect x="140" y="88" width="60" height="4" rx="1" fill="#64748b"/>
      <rect x="140" y="96" width="50" height="3" rx="1" fill="#94a3b8"/>
      <rect x="15" y="130" width="100" height="70" rx="6" fill="#f1f5f9" stroke="#e2e8f0"/>
      <circle cx="45" cy="150" r="10" fill="#fef3c7"/>
      <rect x="30" y="168" width="60" height="4" rx="1" fill="#64748b"/>
      <rect x="125" y="130" width="100" height="70" rx="6" fill="#f1f5f9" stroke="#e2e8f0"/>
      <circle cx="155" cy="150" r="10" fill="#fce7f3"/>
      <rect x="140" y="168" width="60" height="4" rx="1" fill="#64748b"/>
    </svg>`,
    htmlTemplate: `<h2 style="font-size:24px;font-weight:700;text-align:center;color:#1a1a2e;margin:8px 0 8px;">{{title}}</h2>
<p style="text-align:center;font-size:15px;color:#888;margin-bottom:28px;">{{subtitle}}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px;">
  <tr>
    <td width="33%" style="background:#f8fafc;border-radius:12px;padding:20px 16px;text-align:center;vertical-align:top;">
      <div style="font-size:28px;margin-bottom:8px;">{{icon1}}</div>
      <h3 style="font-size:16px;font-weight:600;color:#1a1a2e;margin:0 0 6px;">{{feature1Title}}</h3>
      <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">{{feature1Desc}}</p>
    </td>
    <td width="33%" style="background:#f8fafc;border-radius:12px;padding:20px 16px;text-align:center;vertical-align:top;">
      <div style="font-size:28px;margin-bottom:8px;">{{icon2}}</div>
      <h3 style="font-size:16px;font-weight:600;color:#1a1a2e;margin:0 0 6px;">{{feature2Title}}</h3>
      <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">{{feature2Desc}}</p>
    </td>
    <td width="33%" style="background:#f8fafc;border-radius:12px;padding:20px 16px;text-align:center;vertical-align:top;">
      <div style="font-size:28px;margin-bottom:8px;">{{icon3}}</div>
      <h3 style="font-size:16px;font-weight:600;color:#1a1a2e;margin:0 0 6px;">{{feature3Title}}</h3>
      <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">{{feature3Desc}}</p>
    </td>
  </tr>
  <tr>
    <td width="33%" style="background:#f8fafc;border-radius:12px;padding:20px 16px;text-align:center;vertical-align:top;">
      <div style="font-size:28px;margin-bottom:8px;">{{icon4}}</div>
      <h3 style="font-size:16px;font-weight:600;color:#1a1a2e;margin:0 0 6px;">{{feature4Title}}</h3>
      <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">{{feature4Desc}}</p>
    </td>
    <td width="33%" style="background:#f8fafc;border-radius:12px;padding:20px 16px;text-align:center;vertical-align:top;">
      <div style="font-size:28px;margin-bottom:8px;">{{icon5}}</div>
      <h3 style="font-size:16px;font-weight:600;color:#1a1a2e;margin:0 0 6px;">{{feature5Title}}</h3>
      <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">{{feature5Desc}}</p>
    </td>
    <td width="33%" style="background:#f8fafc;border-radius:12px;padding:20px 16px;text-align:center;vertical-align:top;">
      <div style="font-size:28px;margin-bottom:8px;">{{icon6}}</div>
      <h3 style="font-size:16px;font-weight:600;color:#1a1a2e;margin:0 0 6px;">{{feature6Title}}</h3>
      <p style="font-size:13px;color:#888;line-height:1.5;margin:0;">{{feature6Desc}}</p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'basic-data-dashboard',
    name: '数据仪表盘',
    category: 'basic',
    description: '大数字卡片 + 趋势区域，适合数据报告和财报速览',
    applicableTypes: ['dataReport', 'yearReview', 'newsReport', 'activityPromo'],
    previewBg: '#0f172a',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#0f172a" rx="4"/>
      <rect x="60" y="15" width="120" height="10" rx="2" fill="#f1f5f9"/>
      <rect x="15" y="40" width="100" height="50" rx="6" fill="#1e293b"/>
      <rect x="25" y="50" width="50" height="10" rx="2" fill="#38bdf8"/>
      <rect x="25" y="65" width="40" height="4" rx="1" fill="#64748b"/>
      <rect x="125" y="40" width="100" height="50" rx="6" fill="#1e293b"/>
      <rect x="135" y="50" width="50" height="10" rx="2" fill="#34d399"/>
      <rect x="135" y="65" width="40" height="4" rx="1" fill="#64748b"/>
      <rect x="15" y="100" width="100" height="50" rx="6" fill="#1e293b"/>
      <rect x="25" y="110" width="50" height="10" rx="2" fill="#fbbf24"/>
      <rect x="125" y="100" width="100" height="50" rx="6" fill="#1e293b"/>
      <rect x="135" y="110" width="50" height="10" rx="2" fill="#f472b6"/>
      <rect x="15" y="170" width="210" height="80" rx="6" fill="#1e293b"/>
      <polyline points="25,230 55,210 85,220 115,195 145,205 175,190 215,200" stroke="#38bdf8" fill="none" stroke-width="2"/>
      <rect x="60" y="270" width="120" height="5" rx="1" fill="#334155"/>
      <rect x="80" y="280" width="80" height="4" rx="1" fill="#475569"/>
    </svg>`,
    htmlTemplate: `<section style="background:{{bgColor}};padding:28px 20px;border-radius:12px;margin-bottom:24px;">
  <h2 style="font-size:22px;font-weight:700;text-align:center;color:{{titleColor}};margin:0 0 24px;">{{title}}</h2>
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px;">
    <tr>
      <td width="50%" style="background:{{cardBg}};border-radius:10px;padding:16px;">
        <div style="font-size:28px;font-weight:800;color:{{accent1}};">{{metric1Value}}</div>
        <div style="font-size:13px;color:{{labelColor}};margin-top:4px;">{{metric1Label}}</div>
        <div style="font-size:12px;color:{{accent1}};margin-top:2px;">{{metric1Trend}}</div>
      </td>
      <td width="50%" style="background:{{cardBg}};border-radius:10px;padding:16px;">
        <div style="font-size:28px;font-weight:800;color:{{accent2}};">{{metric2Value}}</div>
        <div style="font-size:13px;color:{{labelColor}};margin-top:4px;">{{metric2Label}}</div>
        <div style="font-size:12px;color:{{accent2}};margin-top:2px;">{{metric2Trend}}</div>
      </td>
    </tr>
    <tr>
      <td width="50%" style="background:{{cardBg}};border-radius:10px;padding:16px;">
        <div style="font-size:28px;font-weight:800;color:{{accent3}};">{{metric3Value}}</div>
        <div style="font-size:13px;color:{{labelColor}};margin-top:4px;">{{metric3Label}}</div>
        <div style="font-size:12px;color:{{accent3}};margin-top:2px;">{{metric3Trend}}</div>
      </td>
      <td width="50%" style="background:{{cardBg}};border-radius:10px;padding:16px;">
        <div style="font-size:28px;font-weight:800;color:{{accent4}};">{{metric4Value}}</div>
        <div style="font-size:13px;color:{{labelColor}};margin-top:4px;">{{metric4Label}}</div>
        <div style="font-size:12px;color:{{accent4}};margin-top:2px;">{{metric4Trend}}</div>
      </td>
    </tr>
  </table>
</section>
<section style="font-size:15px;line-height:1.8;color:#ccc;padding:0 4px;">
  {{analysisBody}}
</section>`,
  },
  {
    id: 'basic-quote-flow',
    name: '引用卡片流',
    category: 'basic',
    description: '大号引用块 + 来源署名，适合访谈对话和品牌故事',
    applicableTypes: ['interview', 'brandStory', 'deepFeature', 'tutorial'],
    previewBg: '#fafaf9',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="15" width="210" height="60" rx="8" fill="#fef3c7"/>
      <text x="30" y="35" font-size="20" fill="#d97706">"</text>
      <rect x="30" y="40" width="150" height="5" rx="1" fill="#92400e"/>
      <rect x="120" y="55" width="80" height="4" rx="1" fill="#b45309"/>
      <rect x="15" y="90" width="210" height="40" rx="4" fill="#f1f5f9"/>
      <rect x="25" y="100" width="190" height="4" rx="1" fill="#94a3b8"/>
      <rect x="25" y="108" width="170" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="15" y="145" width="210" height="60" rx="8" fill="#dbeafe"/>
      <text x="30" y="165" font-size="20" fill="#2563eb">"</text>
      <rect x="30" y="170" width="150" height="5" rx="1" fill="#1e40af"/>
      <rect x="120" y="185" width="80" height="4" rx="1" fill="#3b82f6"/>
      <rect x="15" y="220" width="210" height="40" rx="4" fill="#f1f5f9"/>
      <rect x="25" y="230" width="190" height="4" rx="1" fill="#94a3b8"/>
      <rect x="25" y="238" width="170" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="15" y="275" width="210" height="30" rx="8" fill="#dcfce7"/>
      <text x="30" y="295" font-size="20" fill="#16a34a">"</text>
      <rect x="30" y="282" width="120" height="5" rx="1" fill="#166534"/>
    </svg>`,
    htmlTemplate: `<section style="margin-bottom:32px;">
  <blockquote style="background:{{quoteBg}};border-left:4px solid {{themeColor}};border-radius:0 12px 12px 0;padding:20px 24px;margin:0 0 12px;">
    <p style="font-size:18px;line-height:1.6;color:#333;font-style:italic;margin:0;">"{{quoteText}}"</p>
    <p style="text-align:right;font-size:14px;color:#888;margin:12px 0 0;">—— {{quoteSource}}</p>
  </blockquote>
  <p style="font-size:15px;line-height:1.8;color:#555;padding:0 4px;">{{contextBody}}</p>
</section>`,
  },
  {
    id: 'basic-steps',
    name: '步骤指南',
    category: 'basic',
    description: '编号步骤 + 配图 + 说明，适合教程攻略和操作指南',
    applicableTypes: ['tutorial', 'activityPromo', 'productLaunch', 'dataReport'],
    previewBg: '#f8fafc',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect x="60" y="10" width="120" height="10" rx="2" fill="#1e293b"/>
      <circle cx="30" cy="50" r="14" fill="#3b82f6"/>
      <text x="30" y="55" font-size="14" fill="white" text-anchor="middle" font-weight="bold">1</text>
      <rect x="55" y="38" width="170" height="24" rx="4" fill="#f1f5f9"/>
      <rect x="65" y="44" width="100" height="5" rx="1" fill="#475569"/>
      <rect x="65" y="53" width="80" height="3" rx="1" fill="#94a3b8"/>
      <circle cx="30" cy="110" r="14" fill="#3b82f6"/>
      <text x="30" y="115" font-size="14" fill="white" text-anchor="middle" font-weight="bold">2</text>
      <rect x="55" y="98" width="170" height="24" rx="4" fill="#f1f5f9"/>
      <rect x="65" y="104" width="100" height="5" rx="1" fill="#475569"/>
      <rect x="65" y="113" width="80" height="3" rx="1" fill="#94a3b8"/>
      <circle cx="30" cy="170" r="14" fill="#3b82f6"/>
      <text x="30" y="175" font-size="14" fill="white" text-anchor="middle" font-weight="bold">3</text>
      <rect x="55" y="158" width="170" height="24" rx="4" fill="#f1f5f9"/>
      <rect x="65" y="164" width="100" height="5" rx="1" fill="#475569"/>
      <rect x="65" y="173" width="80" height="3" rx="1" fill="#94a3b8"/>
    </svg>`,
    htmlTemplate: `<h2 style="font-size:24px;font-weight:700;text-align:center;color:#1a1a2e;margin:8px 0 28px;">{{title}}</h2>
<section style="background:#f0f7ff;border-radius:12px;padding:20px;margin-bottom:16px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="40" valign="top">
      <div style="width:32px;height:32px;border-radius:50%;background:{{themeColor}};color:#fff;font-size:16px;font-weight:700;text-align:center;line-height:32px;">1</div>
    </td>
    <td valign="top" style="padding-left:12px;">
      <h3 style="font-size:17px;font-weight:600;color:#1a1a2e;margin:0 0 8px;">{{step1Title}}</h3>
      <p style="font-size:14px;line-height:1.7;color:#555;margin:0;">{{step1Body}}</p>
    </td>
  </tr></table>
</section>
<section style="background:#f0fdf4;border-radius:12px;padding:20px;margin-bottom:16px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="40" valign="top">
      <div style="width:32px;height:32px;border-radius:50%;background:{{themeColor}};color:#fff;font-size:16px;font-weight:700;text-align:center;line-height:32px;">2</div>
    </td>
    <td valign="top" style="padding-left:12px;">
      <h3 style="font-size:17px;font-weight:600;color:#1a1a2e;margin:0 0 8px;">{{step2Title}}</h3>
      <p style="font-size:14px;line-height:1.7;color:#555;margin:0;">{{step2Body}}</p>
    </td>
  </tr></table>
</section>
<section style="background:#fefce8;border-radius:12px;padding:20px;margin-bottom:16px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="40" valign="top">
      <div style="width:32px;height:32px;border-radius:50%;background:{{themeColor}};color:#fff;font-size:16px;font-weight:700;text-align:center;line-height:32px;">3</div>
    </td>
    <td valign="top" style="padding-left:12px;">
      <h3 style="font-size:17px;font-weight:600;color:#1a1a2e;margin:0 0 8px;">{{step3Title}}</h3>
      <p style="font-size:14px;line-height:1.7;color:#555;margin:0;">{{step3Body}}</p>
    </td>
  </tr></table>
</section>`,
  },
  {
    id: 'basic-cta',
    name: 'CTA 转化型',
    category: 'basic',
    description: '利益点 + 按钮 + 倒计时，适合活动推广和课程报名',
    applicableTypes: ['activityPromo', 'productLaunch', 'festival', 'yearReview'],
    previewBg: '#f8fafc',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect x="15" y="15" width="210" height="140" rx="10" fill="#eff6ff"/>
      <rect x="40" y="35" width="160" height="12" rx="3" fill="#1e40af"/>
      <rect x="60" y="55" width="120" height="6" rx="2" fill="#3b82f6"/>
      <rect x="65" y="80" width="110" height="28" rx="14" fill="#2563eb"/>
      <text x="120" y="99" font-size="12" fill="white" text-anchor="middle" font-weight="bold">立即参与 →</text>
      <rect x="60" y="120" width="120" height="8" rx="2" fill="#93c5fd"/>
      <rect x="15" y="175" width="210" height="130" rx="6" fill="#f1f5f9"/>
      <rect x="25" y="185" width="190" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="25" y="195" width="190" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="25" y="205" width="170" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="25" y="225" width="190" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="25" y="235" width="150" height="4" rx="1" fill="#cbd5e1"/>
    </svg>`,
    htmlTemplate: `<section style="background:{{ctaBg}};border-radius:16px;padding:32px 24px;text-align:center;margin-bottom:28px;">
  <h2 style="font-size:26px;font-weight:800;color:{{ctaTitleColor}};margin:0 0 12px;">{{ctaTitle}}</h2>
  <p style="font-size:16px;color:{{ctaSubColor}};margin:0 0 24px;">{{ctaSubtitle}}</p>
  <a href="{{ctaLink}}" style="display:inline-block;background:{{buttonBg}};color:#fff;font-size:16px;font-weight:600;padding:12px 40px;border-radius:24px;text-decoration:none;">{{buttonText}} →</a>
  <p style="font-size:13px;color:{{ctaNoteColor}};margin:16px 0 0;">{{countdown}}</p>
</section>
<section style="font-size:15px;line-height:1.8;color:#555;">
  {{bodyContent}}
</section>`,
  },
];
