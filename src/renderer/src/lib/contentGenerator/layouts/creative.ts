import type { LayoutDef } from '../types';

/** L17-L20 创意布局 */
export const creativeLayouts: LayoutDef[] = [
  {
    id: 'creative-journal',
    name: '旅行日志',
    category: 'creative',
    description: '手账风格，日期标注 + 地点标签 + 图片穿插',
    applicableTypes: ['brandStory', 'deepFeature', 'tutorial', 'festival'],
    previewBg: '#fefce8',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#fefce8" rx="4"/>
      <line x1="40" y1="0" x2="40" y2="320" stroke="#fde68a" stroke-width="1"/>
      <rect x="50" y="15" width="60" height="8" rx="2" fill="#d97706"/>
      <rect x="50" y="30" width="170" height="4" rx="1" fill="#92400e"/>
      <rect x="50" y="38" width="170" height="4" rx="1" fill="#a16207"/>
      <rect x="50" y="46" width="150" height="4" rx="1" fill="#ca8a04"/>
      <rect x="50" y="60" width="160" height="60" rx="6" fill="#e2e8f0"/>
      <rect x="50" y="130" width="40" height="6" rx="2" fill="#059669"/>
      <rect x="50" y="142" width="170" height="4" rx="1" fill="#92400e"/>
      <rect x="50" y="150" width="170" height="4" rx="1" fill="#a16207"/>
      <rect x="50" y="158" width="140" height="4" rx="1" fill="#ca8a04"/>
      <rect x="50" y="175" width="80" height="6" rx="2" fill="#2563eb"/>
      <rect x="50" y="187" width="170" height="4" rx="1" fill="#92400e"/>
      <rect x="50" y="195" width="170" height="4" rx="1" fill="#a16207"/>
      <rect x="50" y="210" width="160" height="60" rx="6" fill="#e2e8f0"/>
      <rect x="50" y="280" width="40" height="6" rx="2" fill="#dc2626"/>
      <rect x="50" y="292" width="170" height="4" rx="1" fill="#92400e"/>
      <rect x="50" y="300" width="150" height="4" rx="1" fill="#a16207"/>
    </svg>`,
    htmlTemplate: `<section style="background:{{journalBg}};padding:28px 24px;border-radius:16px;border-left:4px solid {{accentColor}};">
  <h2 style="font-size:22px;font-weight:700;color:{{titleColor}};margin:0 0 24px;">{{title}}</h2>
  <section style="margin-bottom:24px;">
    <div style="font-size:13px;color:{{dateColor}};font-weight:600;margin-bottom:4px;">📅 {{date1}}</div>
    <div style="font-size:12px;color:{{locationColor}};margin-bottom:8px;">📍 {{location1}}</div>
    <p style="font-size:15px;line-height:1.8;color:#555;margin:0 0 12px;">{{entry1Body}}</p>
    <img src="{{entry1Image}}" style="width:100%;border-radius:10px;" alt=""/>
  </section>
  <section style="margin-bottom:24px;">
    <div style="font-size:13px;color:{{dateColor}};font-weight:600;margin-bottom:4px;">📅 {{date2}}</div>
    <div style="font-size:12px;color:{{locationColor}};margin-bottom:8px;">📍 {{location2}}</div>
    <p style="font-size:15px;line-height:1.8;color:#555;margin:0;">{{entry2Body}}</p>
  </section>
  <section>
    <div style="font-size:13px;color:{{dateColor}};font-weight:600;margin-bottom:4px;">📅 {{date3}}</div>
    <div style="font-size:12px;color:{{locationColor}};margin-bottom:8px;">📍 {{location3}}</div>
    <p style="font-size:15px;line-height:1.8;color:#555;margin:0 0 12px;">{{entry3Body}}</p>
    <img src="{{entry3Image}}" style="width:100%;border-radius:10px;" alt=""/>
  </section>
</section>`,
  },
  {
    id: 'creative-dialogue',
    name: '对话气泡',
    category: 'creative',
    description: '微信/短信对话风格，适合教程和趣味科普',
    applicableTypes: ['tutorial', 'interview', 'deepFeature', 'brandStory'],
    previewBg: '#ededed',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#ededed" rx="4"/>
      <rect x="15" y="15" width="120" height="30" rx="15" fill="#95ec69"/>
      <rect x="25" y="25" width="80" height="4" rx="1" fill="#333"/>
      <rect x="105" y="60" width="120" height="30" rx="15" fill="#fff"/>
      <rect x="115" y="70" width="80" height="4" rx="1" fill="#333"/>
      <rect x="15" y="105" width="140" height="30" rx="15" fill="#95ec69"/>
      <rect x="25" y="115" width="100" height="4" rx="1" fill="#333"/>
      <rect x="85" y="150" width="140" height="30" rx="15" fill="#fff"/>
      <rect x="95" y="160" width="100" height="4" rx="1" fill="#333"/>
      <rect x="15" y="195" width="160" height="30" rx="15" fill="#95ec69"/>
      <rect x="25" y="205" width="120" height="4" rx="1" fill="#333"/>
      <rect x="65" y="240" width="160" height="40" rx="15" fill="#fff"/>
      <rect x="75" y="250" width="120" height="4" rx="1" fill="#333"/>
      <rect x="75" y="260" width="100" height="4" rx="1" fill="#94a3b8"/>
    </svg>`,
    htmlTemplate: `<section style="background:{{chatBg}};padding:24px 16px;border-radius:16px;">
  <h2 style="font-size:20px;font-weight:700;text-align:center;color:#333;margin:0 0 20px;">{{title}}</h2>
  {{dialogueItems}}
  <!-- 单条对话模板（AI 会重复生成多条） -->
  <!-- 左侧气泡（对方） -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
    <tr>
      <td width="40" valign="top"><div style="width:32px;height:32px;border-radius:50%;background:{{avatarBg}};text-align:center;line-height:32px;font-size:14px;">{{leftAvatar}}</div></td>
      <td valign="top" style="padding-left:8px;">
        <div style="display:inline-block;background:{{leftBubbleBg}};border-radius:16px;padding:10px 16px;max-width:75%;">
          <p style="font-size:15px;line-height:1.6;color:#333;margin:0;">{{leftText}}</p>
        </div>
      </td>
    </tr>
  </table>
  <!-- 右侧气泡（我方） -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
    <tr>
      <td valign="top" style="text-align:right;padding-right:8px;">
        <div style="display:inline-block;background:{{rightBubbleBg}};border-radius:16px;padding:10px 16px;max-width:75%;text-align:left;">
          <p style="font-size:15px;line-height:1.6;color:#333;margin:0;">{{rightText}}</p>
        </div>
      </td>
      <td width="40" valign="top"><div style="width:32px;height:32px;border-radius:50%;background:{{rightAvatarBg}};text-align:center;line-height:32px;font-size:14px;">{{rightAvatar}}</div></td>
    </tr>
  </table>
</section>`,
  },
  {
    id: 'creative-info-long',
    name: '信息长图',
    category: 'creative',
    description: '连续信息流，模块化分区，适合深度科普和行业报告',
    applicableTypes: ['tutorial', 'deepFeature', 'dataReport', 'brandStory'],
    previewBg: '#f8fafc',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#f8fafc" rx="4"/>
      <rect x="10" y="10" width="220" height="50" rx="8" fill="#1e293b"/>
      <rect x="30" y="25" width="180" height="10" rx="2" fill="#fff"/>
      <rect x="60" y="40" width="120" height="5" rx="1" fill="#94a3b8"/>
      <rect x="10" y="70" width="220" height="4" rx="1" fill="#e2e8f0"/>
      <rect x="10" y="84" width="220" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="10" y="94" width="220" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="10" y="104" width="180" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="10" y="120" width="220" height="50" rx="6" fill="#dbeafe"/>
      <rect x="20" y="130" width="100" height="6" rx="2" fill="#2563eb"/>
      <rect x="20" y="142" width="200" height="4" rx="1" fill="#3b82f6"/>
      <rect x="10" y="180" width="220" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="10" y="190" width="220" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="10" y="200" width="200" height="4" rx="1" fill="#cbd5e1"/>
      <rect x="10" y="220" width="220" height="50" rx="6" fill="#dcfce7"/>
      <rect x="20" y="230" width="100" height="6" rx="2" fill="#16a34a"/>
      <rect x="20" y="242" width="200" height="4" rx="1" fill="#22c55e"/>
      <rect x="10" y="280" width="220" height="30" rx="6" fill="#f1f5f9"/>
      <rect x="20" y="288" width="200" height="4" rx="1" fill="#94a3b8"/>
    </svg>`,
    htmlTemplate: `<section style="background:{{headerBg}};padding:28px 24px;border-radius:16px;text-align:center;margin-bottom:24px;">
  <h1 style="font-size:26px;font-weight:800;color:{{headerTextColor}};margin:0 0 8px;">{{title}}</h1>
  <p style="font-size:14px;color:{{headerSubColor}};margin:0;">{{subtitle}}</p>
</section>
{{infoSections}}
<!-- 单个信息模块模板 -->
<section style="margin-bottom:20px;">
  <section style="background:{{sectionBg}};border-radius:12px;padding:20px;">
    <h2 style="font-size:18px;font-weight:700;color:{{sectionTitleColor}};margin:0 0 12px;">{{sectionIcon}} {{sectionTitle}}</h2>
    <p style="font-size:15px;line-height:1.8;color:#555;margin:0;">{{sectionBody}}</p>
  </section>
</section>
<section style="background:#f1f5f9;border-radius:12px;padding:16px 20px;margin-top:24px;">
  <p style="font-size:13px;color:#888;text-align:center;margin:0;">{{footerNote}}</p>
</section>`,
  },
  {
    id: 'creative-magazine-cover',
    name: '杂志封面',
    category: 'creative',
    description: '大图封面 + 期号 + 目录导读，适合文化类和品牌刊物',
    applicableTypes: ['brandStory', 'deepFeature', 'interview', 'activityPromo'],
    previewBg: '#0f172a',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#0f172a" rx="4"/>
      <rect x="10" y="10" width="220" height="180" rx="8" fill="#312e81"/>
      <rect x="20" y="20" width="50" height="6" rx="1" fill="#fbbf24"/>
      <rect x="20" y="30" width="80" height="12" rx="3" fill="#fff"/>
      <rect x="20" y="155" width="160" height="14" rx="3" fill="#fff"/>
      <rect x="20" y="173" width="120" height="6" rx="2" fill="#a5b4fc"/>
      <rect x="10" y="200" width="220" height="4" rx="1" fill="#334155"/>
      <rect x="10" y="214" width="220" height="20" rx="4" fill="#1e293b"/>
      <rect x="20" y="219" width="100" height="4" rx="1" fill="#f1f5f9"/>
      <rect x="20" y="226" width="180" height="3" rx="1" fill="#64748b"/>
      <rect x="10" y="240" width="220" height="20" rx="4" fill="#1e293b"/>
      <rect x="20" y="245" width="100" height="4" rx="1" fill="#f1f5f9"/>
      <rect x="20" y="252" width="180" height="3" rx="1" fill="#64748b"/>
      <rect x="10" y="266" width="220" height="20" rx="4" fill="#1e293b"/>
      <rect x="20" y="271" width="100" height="4" rx="1" fill="#f1f5f9"/>
      <rect x="20" y="278" width="180" height="3" rx="1" fill="#64748b"/>
      <rect x="60" y="300" width="120" height="10" rx="2" fill="#334155"/>
    </svg>`,
    htmlTemplate: `<section style="background:{{coverBg}};border-radius:16px;overflow:hidden;">
  <section style="position:relative;">
    <img src="{{coverImage}}" style="width:100%;display:block;max-height:400px;object-fit:cover;" alt=""/>
    <div style="position:absolute;top:20px;left:20px;">
      <span style="background:{{issueBadgeBg}};color:{{issueBadgeColor}};font-size:12px;font-weight:600;padding:4px 12px;border-radius:12px;">{{issueNumber}}</span>
    </div>
    <div style="position:absolute;bottom:0;left:0;right:0;padding:24px 20px;background:linear-gradient(transparent,rgba(0,0,0,0.7));">
      <h1 style="font-size:26px;font-weight:800;color:#fff;margin:0 0 8px;">{{title}}</h1>
      <p style="font-size:15px;color:rgba(255,255,255,0.8);margin:0;">{{subtitle}}</p>
    </div>
  </section>
  <section style="padding:20px;">
    <p style="font-size:13px;color:{{tocLabelColor}};font-weight:600;margin:0 0 12px;">📖 本期导读</p>
    {{tocItems}}
    <!-- 目录项模板 -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
      <tr>
        <td width="24" valign="top" style="font-size:14px;color:{{tocNumColor}};font-weight:700;">{{tocNum}}</td>
        <td valign="top">
          <p style="font-size:15px;color:{{tocTextColor}};margin:0;font-weight:600;">{{tocTitle}}</p>
          <p style="font-size:13px;color:{{tocDescColor}};margin:2px 0 0;">{{tocDesc}}</p>
        </td>
      </tr>
    </table>
  </section>
</section>`,
  },
];
