#!/usr/bin/env node
/* eslint-disable */
// 完整端到端验证"闪一下"bug 修复
// 1. 创建 article（让 ChecklistPanel 不 early return）
// 2. 触发发布检查弹窗
// 3. 点"智能生成摘要"
// 4. 观察 UI 状态（关键！不能卡在"正在生成..."）

const WebSocket = require('ws')

const BROWSER_WS = process.env.BROWSER_WS || 'ws://127.0.0.1:9222/devtools/browser/888099d2-a869-4e2f-9439-3e05905f4437'

class CDPClient {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.sessions = new Map()
    this.consoleMessages = []
    this.pageErrors = []
    ws.on('message', (data) => {
      const msg = JSON.parse(data)
      if (msg.id != null) {
        const p = this.pending.get(msg.id)
        if (p) {
          this.pending.delete(msg.id)
          if (msg.error) p.reject(new Error(msg.error.message))
          else p.resolve(msg.result)
        }
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
        this.consoleMessages.push({ type: msg.params.type, text })
        if (msg.params.type === 'error' || text.includes('providerId') || text.includes('ValidationError')) {
          console.log(`[console.${msg.params.type}]`, text.slice(0, 200))
        }
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const ex = msg.params.exceptionDetails
        const errText = ex.text + ': ' + (ex.exception?.description || ex.exception?.value || '')
        this.pageErrors.push(errText)
        console.log('[pageerror]', errText.slice(0, 300))
      }
    })
  }

  send(method, params = {}, sessionId) {
    this.id += 1
    const id = this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      const msg = { id, method, params }
      if (sessionId) msg.sessionId = sessionId
      this.ws.send(JSON.stringify(msg))
    })
  }

  attachToPageTarget() {
    return this.send('Target.getTargets').then(({ targetInfos }) => {
      const pages = targetInfos.filter((t) => t.type === 'page')
      console.log('[cdp] page targets:', pages.map(p => p.url))
      const page = pages[0]
      if (!page) throw new Error('no page target found')
      return this.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
        .then(({ sessionId }) => {
          this.sessions.set('main', sessionId)
          return sessionId
        })
    })
  }

  async eval(expression, sessionId, awaitPromise = false) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    }, sessionId)
    if (r.exceptionDetails) {
      console.log('[eval-exception]', r.exceptionDetails.text, r.exceptionDetails.exception?.description?.slice(0, 200))
    }
    return r.result?.value
  }
}

async function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function main() {
  console.log('[test] connecting to', BROWSER_WS)
  const ws = new WebSocket(BROWSER_WS)
  await new Promise((resolve, reject) => {
    ws.once('open', resolve)
    ws.once('error', reject)
  })
  console.log('[test] connected')

  const cdp = new CDPClient(ws)
  const sessionId = await cdp.attachToPageTarget()
  console.log('[test] attached, sessionId:', sessionId)

  await cdp.send('Runtime.enable', {}, sessionId)
  await cdp.send('Page.enable', {}, sessionId)

  await sleep(2000)

  // 0. 刷新页面确保 main.tsx 改动（window.__APP_STORE__）生效
  await cdp.send('Page.reload', {}, sessionId)
  await sleep(3000)

  // 1. 调 aiListConfigured
  const providers = await cdp.eval(`window.api?.aiListConfigured ? window.api.aiListConfigured() : 'NO_API'`, sessionId, true)
  console.log('[test] aiListConfigured:', JSON.stringify(providers))

  // 2. 创建 article
  const newArticle = await cdp.eval(`window.api?.articleCreate ? window.api.articleCreate() : 'NO_API'`, sessionId, true)
  console.log('[test] articleCreate:', JSON.stringify(newArticle)?.slice(0, 200))

  // 等 store 更新
  await sleep(1500)

  // 3. 通过动态 import 拿到 zustand store，注入 currentArticleId
  const articleId = newArticle?.id
  if (articleId) {
    const longContent = '<p>' + '这是一段测试文章内容。'.repeat(30) + '</p>'
    const updateResult = await cdp.eval(`window.api?.articleUpdate ? window.api.articleUpdate(${articleId}, { content: ${JSON.stringify(longContent)} }) : 'NO_API'`, sessionId, true)
    console.log('[test] articleUpdate:', JSON.stringify(updateResult)?.slice(0, 200))

    // 动态 import store，setState
    const setResult = await cdp.eval(`(async () => {
      try {
        if (window.__APP_STORE__) {
          const useAppStore = window.__APP_STORE__
          const list = window.api?.articleList ? await window.api.articleList() : []
          const isArray = Array.isArray(list)
          const existing = useAppStore.getState().articles
          const existingIsArray = Array.isArray(existing)
          const finalArticles = isArray ? list : (existingIsArray ? existing : [])
          useAppStore.setState({ articles: finalArticles, currentArticleId: ${articleId}, currentArticleTitle: '', editorContent: ${JSON.stringify(longContent)} })
          const after = useAppStore.getState()
          return { ok: true, currentId: after.currentArticleId, articlesCount: after.articles.length, articlesIsArray: Array.isArray(after.articles), hasEditor: !!after.editorInstance, listIsArray: isArray, listLen: list?.length, listType: typeof list }
        }
        return { ok: false, error: 'window.__APP_STORE__ not exposed' }
      } catch (e) {
        return { ok: false, error: e?.message || String(e), stack: e?.stack?.slice(0, 300) }
      }
    })()`, sessionId, true)
    console.log('[test] store setState:', JSON.stringify(setResult))
  }

  await sleep(1000)

  // 4. 找发布检查按钮
  const checklistClick = await cdp.eval(`(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const t = buttons.find(b => (b.textContent || '').includes('发布检查') || b.title?.includes('发布检查'))
    if (t) { t.click(); return { clicked: true, text: t.textContent.trim() } }
    return { clicked: false, allTexts: buttons.map(b => (b.textContent||'').trim()).slice(0, 20) }
  })()`, sessionId)
  console.log('[test] 发布检查 click:', JSON.stringify(checklistClick))

  await sleep(2000)

  // 5. 在弹窗里点"智能生成摘要"
  const summaryClick = await cdp.eval(`(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const t = buttons.find(b => {
      const text = (b.textContent || '').trim()
      return text.includes('智能生成摘要') || text.includes('智能摘要')
    })
    if (t) { t.click(); return { clicked: true, text: t.textContent.trim() } }
    return { clicked: false, allTexts: buttons.map(b => (b.textContent||'').trim()).filter(t => t.includes('摘要') || t.includes('智能')) }
  })()`, sessionId)
  console.log('[test] 智能摘要 click:', JSON.stringify(summaryClick))

  // 6. 观察 UI 状态 8s（关键验证点）
  let loadingStuck = false
  let lastState = null
  for (let i = 0; i < 16; i++) {
    await sleep(500)
    const state = await cdp.eval(`(() => {
      const card = Array.from(document.querySelectorAll('div')).find(d => {
        const text = d.textContent || ''
        return (text.includes('智能摘要') || text.includes('生成中')) && d.querySelector('p')
      })
      if (!card) return { found: false }
      const ps = Array.from(card.querySelectorAll('p')).map(p => p.textContent)
      const hasLoader = !!card.querySelector('.animate-spin')
      return { found: true, paragraphs: ps, hasLoader, fullText: (card.textContent || '').slice(0, 200) }
    })()`, sessionId)
    const t = (i * 0.5).toFixed(1)
    console.log(`[t=${t}s]`, JSON.stringify(state))
    lastState = state
    // 如果有段落且不是"正在生成..."，OK
    if (state.found && !state.hasLoader && state.paragraphs.some(p => p && !p.includes('正在生成'))) {
      console.log(`[test] ✅ UI 已脱离 loading`)
      break
    }
    // 如果已经显示错误信息
    if (state.found && state.paragraphs.some(p => p && (p.includes('失败') || p.includes('错误') || p.includes('超时') || p.includes('PROVIDER')))) {
      console.log(`[test] ✅ UI 显示错误信息`)
      break
    }
  }

  // 最终状态
  const finalState = await cdp.eval(`(() => {
    const card = Array.from(document.querySelectorAll('div')).find(d => {
      const text = d.textContent || ''
      return (text.includes('智能摘要') || text.includes('生成中')) && d.querySelector('p')
    })
    if (!card) return { found: false }
    return {
      found: true,
      cardText: (card.textContent || '').slice(0, 200),
      hasLoader: !!card.querySelector('.animate-spin')
    }
  })()`, sessionId)
  console.log('[test] 最终 UI 状态:', JSON.stringify(finalState, null, 2))

  console.log('\n========== SUMMARY ==========')
  console.log('console messages:', cdp.consoleMessages.length)
  console.log('page errors:', cdp.pageErrors.length)
  const providerIdErrors = cdp.consoleMessages.filter((m) => m.text.includes('providerId') || m.text.includes('ValidationError'))
  if (providerIdErrors.length > 0) {
    console.log('❌ providerId / ValidationError 错误:')
    providerIdErrors.forEach((m) => console.log('  -', m.text.slice(0, 200)))
  } else {
    console.log('✅ 无 providerId 校验错误')
  }
  if (cdp.pageErrors.length > 0) {
    console.log('Page errors:')
    cdp.pageErrors.forEach((e) => console.log('  -', e.slice(0, 200)))
  }
  if (finalState.found && finalState.hasLoader) {
    console.log('❌ UI 仍卡在 loading（"闪一下"bug 没修）')
  } else if (finalState.found && finalState.cardText) {
    console.log('✅ UI 已脱离 loading')
    console.log('   内容:', finalState.cardText.slice(0, 100))
  } else {
    console.log('⚠️ UI 卡片没找到（可能 article 没创建成功）')
  }
  console.log('==============================')

  ws.close()
  process.exit(0)
}

main().catch((err) => {
  console.error('[test] FATAL:', err)
  process.exit(1)
})
