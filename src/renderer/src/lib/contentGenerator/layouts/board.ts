import type { LayoutDef } from '../types';

/** L09-L12 板报布局 */
export const boardLayouts: LayoutDef[] = [
  {
    id: 'board-multi-headline',
    name: '多头条板报',
    category: 'board',
    description: '企业内刊/团队风采，多区块信息密集排版',
    applicableTypes: ['boardReport', 'newsReport', 'activityPromo', 'yearReview'],
    previewBg: '#f1f5f9',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#f1f5f9" rx="4"/>
      <rect x="10" y="10" width="220" height="60" rx="6" fill="#1e40af"/>
      <rect x="30" y="25" width="180" height="12" rx="3" fill="#fff"/>
      <rect x="60" y="42" width="120" height="6" rx="2" fill="#93c5fd"/>
      <rect x="10" y="80" width="105" height="70" rx="6" fill="#fff"/>
      <rect x="20" y="90" width="85" height="4" rx="1" fill="#1e293b"/>
      <rect x="20" y="98" width="85" height="3" rx="1" fill="#94a3b8"/>
      <rect x="20" y="105" width="70" height="3" rx="1" fill="#cbd5e1"/>
      <rect x="125" y="80" width="105" height="70" rx="6" fill="#fff"/>
      <rect x="135" y="90" width="85" height="4" rx="1" fill="#1e293b"/>
      <rect x="135" y="98" width="85" height="3" rx="1" fill="#94a3b8"/>
      <rect x="135" y="105" width="70" height="3" rx="1" fill="#cbd5e1"/>
      <rect x="10" y="160" width="70" height="50" rx="4" fill="#e2e8f0"/>
      <rect x="85" y="160" width="70" height="50" rx="4" fill="#e2e8f0"/>
      <rect x="160" y="160" width="70" height="50" rx="4" fill="#e2e8f0"/>
      <rect x="10" y="220" width="220" height="40" rx="6" fill="#1e40af" opacity="0.1"/>
      <rect x="20" y="230" width="200" height="4" rx="1" fill="#3b82f6"/>
      <rect x="20" y="238" width="180" height="3" rx="1" fill="#93c5fd"/>
      <rect x="10" y="270" width="220" height="40" rx="4" fill="#fff"/>
      <rect x="20" y="280" width="100" height="4" rx="1" fill="#475569"/>
      <rect x="20" y="290" width="200" height="3" rx="1" fill="#94a3b8"/>
    </svg>`,
    htmlTemplate: `<section style="background:{{headerBg}};padding:24px 20px;border-radius:12px;text-align:center;margin-bottom:20px;">
  <h1 style="font-size:24px;font-weight:800;color:#fff;margin:0 0 6px;">{{boardTitle}}</h1>
  <p style="font-size:14px;color:rgba(255,255,255,0.8);margin:0;">{{boardSubtitle}}</p>
</section>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px;margin-bottom:20px;">
  <tr>
    <td width="50%" style="background:#fff;border-radius:10px;padding:16px;vertical-align:top;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <h3 style="font-size:16px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">{{headline1Title}}</h3>
      <p style="font-size:14px;color:#666;line-height:1.6;margin:0;">{{headline1Body}}</p>
    </td>
    <td width="50%" style="background:#fff;border-radius:10px;padding:16px;vertical-align:top;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <h3 style="font-size:16px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">{{headline2Title}}</h3>
      <p style="font-size:14px;color:#666;line-height:1.6;margin:0;">{{headline2Body}}</p>
    </td>
  </tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px;margin-bottom:20px;">
  <tr>
    <td width="33%" style="text-align:center;">
      <img src="{{photo1}}" style="width:100%;border-radius:8px;" alt=""/>
      <p style="font-size:12px;color:#888;margin:6px 0 0;">{{photo1Caption}}</p>
    </td>
    <td width="33%" style="text-align:center;">
      <img src="{{photo2}}" style="width:100%;border-radius:8px;" alt=""/>
      <p style="font-size:12px;color:#888;margin:6px 0 0;">{{photo2Caption}}</p>
    </td>
    <td width="33%" style="text-align:center;">
      <img src="{{photo3}}" style="width:100%;border-radius:8px;" alt=""/>
      <p style="font-size:12px;color:#888;margin:6px 0 0;">{{photo3Caption}}</p>
    </td>
  </tr>
</table>
<section style="background:{{highlightBg}};border-radius:10px;padding:16px 20px;margin-bottom:20px;">
  <p style="font-size:15px;color:#333;line-height:1.7;margin:0;">{{highlightBody}}</p>
</section>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:12px;">
  <tr>
    <td style="background:#fff;border-radius:8px;padding:12px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <p style="font-size:14px;color:#555;margin:0;">{{announcementBody}}</p>
    </td>
  </tr>
</table>`,
  },
  {
    id: 'board-photo-wall',
    name: '照片墙板报',
    category: 'board',
    description: '活动回顾/团建风采，大量图片 + 简短文字说明',
    applicableTypes: ['boardReport', 'activityPromo', 'festival', 'yearReview'],
    previewBg: '#f8fafc',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#f8fafc" rx="4"/>
      <rect x="10" y="10" width="220" height="40" rx="6" fill="#fef3c7"/>
      <rect x="60" y="22" width="120" height="10" rx="2" fill="#d97706"/>
      <rect x="10" y="60" width="140" height="80" rx="6" fill="#e2e8f0"/>
      <rect x="160" y="60" width="70" height="37" rx="4" fill="#dbeafe"/>
      <rect x="160" y="103" width="70" height="37" rx="4" fill="#dcfce7"/>
      <rect x="10" y="150" width="70" height="60" rx="4" fill="#fce7f3"/>
      <rect x="90" y="150" width="150" height="60" rx="4" fill="#e2e8f0"/>
      <rect x="10" y="220" width="108" height="90" rx="6" fill="#e2e8f0"/>
      <rect x="128" y="220" width="102" height="42" rx="4" fill="#fef3c7"/>
      <rect x="128" y="268" width="102" height="42" rx="4" fill="#dbeafe"/>
    </svg>`,
    htmlTemplate: `<section style="background:{{bannerBg}};border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
  <h2 style="font-size:22px;font-weight:700;color:{{bannerTextColor}};margin:0;">{{title}}</h2>
</section>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px;margin-bottom:16px;">
  <tr>
    <td width="65%" rowspan="2" style="vertical-align:top;">
      <img src="{{mainPhoto}}" style="width:100%;border-radius:10px;display:block;" alt=""/>
    </td>
    <td width="35%" style="vertical-align:top;padding-left:4px;">
      <img src="{{sidePhoto1}}" style="width:100%;border-radius:8px;display:block;" alt=""/>
    </td>
  </tr>
  <tr>
    <td width="35%" style="vertical-align:top;padding-left:4px;padding-top:8px;">
      <img src="{{sidePhoto2}}" style="width:100%;border-radius:8px;display:block;" alt=""/>
    </td>
  </tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px;margin-bottom:16px;">
  <tr>
    <td width="33%"><img src="{{photo3}}" style="width:100%;border-radius:8px;" alt=""/></td>
    <td width="33%"><img src="{{photo4}}" style="width:100%;border-radius:8px;" alt=""/></td>
    <td width="33%"><img src="{{photo5}}" style="width:100%;border-radius:8px;" alt=""/></td>
  </tr>
</table>
<section style="background:#fff;border-radius:10px;padding:16px 20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
  <p style="font-size:15px;color:#555;line-height:1.8;margin:0;">{{descriptionBody}}</p>
</section>`,
  },
  {
    id: 'board-kanban',
    name: '看板式板报',
    category: 'board',
    description: '项目进展/里程碑，三列看板 + 卡片排列',
    applicableTypes: ['boardReport', 'yearReview', 'dataReport', 'deepFeature'],
    previewBg: '#f1f5f9',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#f1f5f9" rx="4"/>
      <rect x="10" y="10" width="220" height="10" rx="2" fill="#1e293b"/>
      <rect x="10" y="30" width="70" height="280" rx="6" fill="#dbeafe"/>
      <rect x="18" y="45" width="54" height="30" rx="4" fill="#fff"/>
      <rect x="18" y="82" width="54" height="30" rx="4" fill="#fff"/>
      <rect x="18" y="119" width="54" height="30" rx="4" fill="#fff"/>
      <rect x="85" y="30" width="70" height="280" rx="6" fill="#fef3c7"/>
      <rect x="93" y="45" width="54" height="30" rx="4" fill="#fff"/>
      <rect x="93" y="82" width="54" height="30" rx="4" fill="#fff"/>
      <rect x="160" y="30" width="70" height="280" rx="6" fill="#dcfce7"/>
      <rect x="168" y="45" width="54" height="30" rx="4" fill="#fff"/>
      <rect x="168" y="82" width="54" height="30" rx="4" fill="#fff"/>
      <rect x="168" y="119" width="54" height="30" rx="4" fill="#fff"/>
    </svg>`,
    htmlTemplate: `<h2 style="font-size:22px;font-weight:700;text-align:center;color:#1a1a2e;margin:0 0 20px;">{{title}}</h2>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:10px;">
  <tr>
    <td width="33%" valign="top" style="background:{{todoBg}};border-radius:10px;padding:14px;">
      <h3 style="font-size:15px;font-weight:700;color:{{todoTextColor}};margin:0 0 12px;text-align:center;">📋 待办</h3>
      {{todoCards}}
    </td>
    <td width="33%" valign="top" style="background:{{doingBg}};border-radius:10px;padding:14px;">
      <h3 style="font-size:15px;font-weight:700;color:{{doingTextColor}};margin:0 0 12px;text-align:center;">🔄 进行中</h3>
      {{doingCards}}
    </td>
    <td width="33%" valign="top" style="background:{{doneBg}};border-radius:10px;padding:14px;">
      <h3 style="font-size:15px;font-weight:700;color:{{doneTextColor}};margin:0 0 12px;text-align:center;">✅ 已完成</h3>
      {{doneCards}}
    </td>
  </tr>
</table>`,
  },
  {
    id: 'board-festival',
    name: '节日板报',
    category: 'board',
    description: '节日营销/热点借势，喜庆氛围 + 活动预告',
    applicableTypes: ['festival', 'activityPromo', 'boardReport', 'brandStory'],
    previewBg: '#fef2f2',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#fef2f2" rx="4"/>
      <rect x="10" y="10" width="220" height="80" rx="10" fill="#dc2626"/>
      <circle cx="50" cy="30" r="8" fill="#fbbf24"/>
      <circle cx="190" cy="30" r="6" fill="#fbbf24"/>
      <rect x="40" y="40" width="160" height="14" rx="3" fill="#fff"/>
      <rect x="60" y="60" width="120" height="6" rx="2" fill="#fca5a5"/>
      <rect x="10" y="100" width="105" height="60" rx="6" fill="#fff"/>
      <rect x="125" y="100" width="105" height="60" rx="6" fill="#fff"/>
      <rect x="10" y="170" width="220" height="50" rx="8" fill="#fff"/>
      <rect x="20" y="180" width="200" height="4" rx="1" fill="#fca5a5"/>
      <rect x="20" y="190" width="180" height="3" rx="1" fill="#fecaca"/>
      <rect x="10" y="230" width="220" height="80" rx="8" fill="#dc2626" opacity="0.1"/>
      <rect x="60" y="255" width="120" height="28" rx="14" fill="#dc2626"/>
      <text x="120" y="274" font-size="12" fill="#fff" text-anchor="middle" font-weight="bold">立即参与</text>
    </svg>`,
    htmlTemplate: `<section style="background:{{festivalBg}};padding:28px 20px;border-radius:16px;text-align:center;margin-bottom:24px;">
  <p style="font-size:40px;margin:0 0 8px;">{{festivalEmoji}}</p>
  <h1 style="font-size:26px;font-weight:800;color:{{festivalTitleColor}};margin:0 0 8px;">{{title}}</h1>
  <p style="font-size:15px;color:{{festivalSubColor}};margin:0;">{{subtitle}}</p>
</section>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:12px;margin-bottom:20px;">
  <tr>
    <td width="50%" style="background:#fff;border-radius:12px;padding:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <p style="font-size:28px;margin:0 0 8px;">{{event1Emoji}}</p>
      <h3 style="font-size:16px;font-weight:600;color:#333;margin:0 0 6px;">{{event1Title}}</h3>
      <p style="font-size:13px;color:#888;margin:0;">{{event1Desc}}</p>
    </td>
    <td width="50%" style="background:#fff;border-radius:12px;padding:16px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <p style="font-size:28px;margin:0 0 8px;">{{event2Emoji}}</p>
      <h3 style="font-size:16px;font-weight:600;color:#333;margin:0 0 6px;">{{event2Title}}</h3>
      <p style="font-size:13px;color:#888;margin:0;">{{event2Desc}}</p>
    </td>
  </tr>
</table>
<section style="text-align:center;margin-bottom:24px;">
  <p style="font-size:16px;color:#555;line-height:1.8;">{{bodyContent}}</p>
</section>
<section style="text-align:center;">
  <a href="{{ctaLink}}" style="display:inline-block;background:{{buttonBg}};color:#fff;font-size:16px;font-weight:600;padding:12px 40px;border-radius:24px;text-decoration:none;">{{buttonText}}</a>
</section>`,
  },
];
