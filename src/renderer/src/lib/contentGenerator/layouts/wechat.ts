import type { LayoutDef } from '../types';

/** 微信公众号专用布局 */
export const wechatLayouts: LayoutDef[] = [
  {
    id: 'wechat-standard',
    name: '公众号标准文章',
    category: 'basic',
    description: '标准微信公众号文章排版：标题 + 导语 + 正文 + 小标题 + 结尾，适合大多数公众号日常发文',
    applicableTypes: ['newsReport', 'deepFeature', 'brandStory', 'tutorial', 'dataReport', 'interview', 'yearReview', 'productLaunch', 'activityPromo', 'festival', 'boardReport', 'posterDesign'],
    previewBg: '#ffffff',
    thumbnail: `<svg viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg">
      <rect width="240" height="320" fill="#ffffff" rx="4"/>
      <rect x="20" y="20" width="200" height="14" rx="2" fill="#1a1a2e"/>
      <rect x="60" y="40" width="120" height="6" rx="1" fill="#999"/>
      <line x1="100" y1="56" x2="140" y2="56" stroke="#e5e5e5" stroke-width="1"/>
      <rect x="20" y="68" width="200" height="80" rx="4" fill="#f5f5f5"/>
      <rect x="30" y="78" width="180" height="4" rx="1" fill="#666"/>
      <rect x="30" y="88" width="160" height="4" rx="1" fill="#999"/>
      <rect x="30" y="98" width="180" height="4" rx="1" fill="#999"/>
      <rect x="30" y="108" width="140" height="4" rx="1" fill="#999"/>
      <rect x="30" y="118" width="170" height="4" rx="1" fill="#999"/>
      <rect x="30" y="128" width="100" height="4" rx="1" fill="#999"/>
      <rect x="20" y="164" width="200" height="4" rx="1" fill="#ccc"/>
      <rect x="20" y="174" width="200" height="4" rx="1" fill="#ccc"/>
      <rect x="20" y="184" width="180" height="4" rx="1" fill="#ccc"/>
      <rect x="20" y="194" width="200" height="4" rx="1" fill="#ccc"/>
      <rect x="20" y="204" width="160" height="4" rx="1" fill="#ccc"/>
      <rect x="20" y="220" width="120" height="10" rx="2" fill="#1a1a2e"/>
      <rect x="20" y="240" width="200" height="4" rx="1" fill="#ccc"/>
      <rect x="20" y="250" width="200" height="4" rx="1" fill="#ccc"/>
      <rect x="20" y="260" width="180" height="4" rx="1" fill="#ccc"/>
      <rect x="20" y="270" width="200" height="4" rx="1" fill="#ccc"/>
      <rect x="70" y="290" width="100" height="20" rx="10" fill="#07c160"/>
    </svg>`,
    htmlTemplate: `<section style="text-align:center;padding:0 0 20px;">
  <h1 style="font-size:24px;font-weight:700;color:#1a1a2e;line-height:1.4;margin:0 0 12px;letter-spacing:1px;">{{title}}</h1>
  <p style="font-size:14px;color:#999;margin:0;">{{authorInfo}}</p>
  <div style="width:40px;height:2px;background:#07c160;margin:16px auto 0;border-radius:1px;"></div>
</section>

<section style="margin-bottom:24px;">
  <p style="font-size:15px;color:#666;line-height:2;background:#f8f8f8;padding:16px 20px;border-radius:8px;border-left:3px solid #07c160;margin:0;">{{leadText}}</p>
</section>

<section style="margin-bottom:24px;">
  <img src="{{heroImage}}" style="width:100%;border-radius:8px;display:block;" alt="{{title}}"/>
</section>

<section style="font-size:16px;line-height:2;color:#333;margin-bottom:28px;">
  <p style="text-indent:2em;margin:0 0 16px;">{{bodyPara1}}</p>
  <p style="text-indent:2em;margin:0 0 16px;">{{bodyPara2}}</p>
</section>

<section style="margin-bottom:28px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="width:4px;background:#07c160;border-radius:2px;"></td>
      <td style="padding-left:12px;">
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">{{section1Title}}</h2>
      </td>
    </tr>
  </table>
  <p style="font-size:16px;line-height:2;color:#333;text-indent:2em;margin:0 0 12px;">{{section1Body}}</p>
</section>

<section style="margin-bottom:28px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="width:4px;background:#07c160;border-radius:2px;"></td>
      <td style="padding-left:12px;">
        <h2 style="font-size:20px;font-weight:700;color:#1a1a2e;margin:0 0 12px;">{{section2Title}}</h2>
      </td>
    </tr>
  </table>
  <p style="font-size:16px;line-height:2;color:#333;text-indent:2em;margin:0 0 12px;">{{section2Body}}</p>
</section>

<section style="background:#f0f7ff;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
  <p style="font-size:16px;line-height:1.8;color:#333;margin:0;font-style:italic;">"{{highlightQuote}}"</p>
  <p style="text-align:right;font-size:14px;color:#999;margin:8px 0 0;">—— {{quoteSource}}</p>
</section>

<section style="font-size:16px;line-height:2;color:#333;margin-bottom:28px;">
  <p style="text-indent:2em;margin:0 0 16px;">{{bodyPara3}}</p>
  <p style="text-indent:2em;margin:0;">{{bodyPara4}}</p>
</section>

<section style="text-align:center;padding:24px 0;border-top:1px solid #eee;border-bottom:1px solid #eee;margin-bottom:20px;">
  <p style="font-size:14px;color:#999;margin:0 0 8px;">— END —</p>
  <p style="font-size:13px;color:#aaa;margin:0;">{{footerText}}</p>
</section>`,
  },
];
