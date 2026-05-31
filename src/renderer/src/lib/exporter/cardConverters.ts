function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function convertVideoCards(html: string): string {
  return html.replace(
    /<section[^>]*data-video-card[^>]*>[\s\S]*?<\/section>/g,
    (match) => {
      const finderUserName = match.match(/data-finder-username="([^"]*)"/)?.[1] || ''
      const feedId = match.match(/data-feed-id="([^"]*)"/)?.[1] || ''
      const title = match.match(/data-title="([^"]*)"/)?.[1] || '视频号视频'
      const account = match.match(/data-account="([^"]*)"/)?.[1] || '@视频号'

      return [
        '<section data-video-card-placeholder',
        finderUserName ? ` data-finder-username="${escapeHtml(finderUserName)}"` : '',
        feedId ? ` data-feed-id="${escapeHtml(feedId)}"` : '',
        ` data-title="${escapeHtml(title)}"`,
        ` data-account="${escapeHtml(account)}"`,
        ' style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:1.5em 0;background:#fafafa;">',
        '<section style="position:relative;padding-bottom:56.25%;background:#f3f4f6;">',
        '<section style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;border-radius:50%;background:rgba(0,0,0,0.5);text-align:center;line-height:48px;color:#fff;">▶</section>',
        '</section>',
        '<section style="padding:12px 14px;">',
        `<p style="font-size:14px;font-weight:500;color:#1f2937;margin:0 0 4px;line-height:1.4;">${escapeHtml(title)}</p>`,
        `<p style="font-size:12px;color:#9ca3af;margin:0;">${escapeHtml(account)} · 在公众号后台关联视频</p>`,
        '</section>',
        '</section>',
      ].join('')
    }
  )
}

export function convertMiniprogramCards(html: string): string {
  return html.replace(
    /<section[^>]*data-miniprogram-card[^>]*>[\s\S]*?<\/section>/g,
    (match) => {
      const appid = match.match(/data-appid="([^"]*)"/)?.[1] || ''
      const path = match.match(/data-path="([^"]*)"/)?.[1] || ''
      const title = match.match(/data-title="([^"]*)"/)?.[1] || '小程序'
      const displayStyle = match.match(/data-display-style="([^"]*)"/)?.[1] || 'card'

      if (displayStyle === 'text') {
        return [
          '<section data-miniprogram-card-placeholder',
          appid ? ` data-appid="${escapeHtml(appid)}"` : '',
          path ? ` data-path="${escapeHtml(path)}"` : '',
          ' style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin:1em 0;background:#fafafa;">',
          '<p style="font-size:14px;color:#1f2937;margin:0;">📱 ' + escapeHtml(title) + '</p>',
          '<p style="font-size:12px;color:#9ca3af;margin:4px 0 0;">小程序 · 在公众号后台关联</p>',
          '</section>',
        ].join('')
      }

      return [
        '<section data-miniprogram-card-placeholder',
        appid ? ` data-appid="${escapeHtml(appid)}"` : '',
        path ? ` data-path="${escapeHtml(path)}"` : '',
        ' style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:1.5em 0;background:#fafafa;">',
        '<section style="position:relative;padding-bottom:80%;background:#f3f4f6;">',
        '</section>',
        '<section style="padding:12px 14px;">',
        '<p style="font-size:14px;font-weight:500;color:#1f2937;margin:0 0 2px;">📱 ' + escapeHtml(title) + '</p>',
        '<p style="font-size:12px;color:#9ca3af;margin:0;">小程序 · 在公众号后台关联</p>',
        '</section>',
        '</section>',
      ].join('')
    }
  )
}

export function convertEmbedCards(html: string): string {
  return convertMiniprogramCards(convertVideoCards(html))
}
