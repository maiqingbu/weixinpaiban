#!/usr/bin/env node
/* eslint-disable */
// 用 ws 直连 Electron DevTools 协议，自动点 AI 摘要按钮并捕获 console 错误。
// 找已知的 DevTools WS endpoint：ws://127.0.0.1:9222/devtools/browser/<id>

const WebSocket = require('ws')

const BROWSER_WS = process.env.BROWSER_WS || 'ws://127.0.0.1:9222/devtools/browser/74dc0fbe-fa5a-4fb3-8668-2d1e0ba0ce32'

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
        console.log(`[console.${msg.params.type}]`, text)
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const ex = msg.params.exceptionDetails
        this.pageErrors.push(ex.text + ': ' + (ex.exception?.description || ex.exception?.value || ''))
        console.log('[pageerror]', ex.text, ex.exception?.description || ex.exception?.value)
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
      const page = targetInfos.find((t) => t.type === 'page')
      if (!page) throw new Error('no page target found')
      return this.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
        .then(({ sessionId }) => {
          this.sessions.set('main', sessionId)
          return sessionId
        })
    })
  }
}

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

  // 启用 Runtime / Page
  await cdp.send('Runtime.enable', {}, sessionId)
  await cdp.send('Page.enable', {}, sessionId)

  // 等待 vite 热连接
  await new Promise((r) => setTimeout(r, 1500))

  // 1. 调 aiListConfigured
  const ipcList = await cdp.send('Runtime.evaluate', {
    expression: `window.api && window.api.aiListConfigured ? window.api.aiListConfigured() : null`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId)
  console.log('[test] aiListConfigured:', JSON.stringify(ipcList.result.value))

  // 2. 找 AIAssistant 按钮
  const findButton = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      return buttons.map(b => ({
        text: (b.textContent || '').trim().slice(0, 80),
        title: b.title,
        aria: b.getAttribute('aria-label'),
        visible: b.offsetWidth > 0 && b.offsetHeight > 0
      })).filter(b => b.visible && (b.text || b.title || b.aria))
    })()`,
    returnByValue: true,
  }, sessionId)
  console.log('[test] visible buttons:')
  ;(findButton.result.value || []).forEach((b) => console.log('  -', JSON.stringify(b)))

  // 找"智能"按钮
  const aiAssistantClick = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const target = buttons.find(b => {
        const text = (b.textContent || '').trim()
        return text.includes('AI 助手') || text.includes('AI助手') || text.includes('智能') || b.title?.includes('AI')
      })
      if (target) {
        target.click()
        return { clicked: true, text: target.textContent.trim() }
      }
      return { clicked: false }
    })()`,
    returnByValue: true,
  }, sessionId)
  console.log('[test] AI 助手 click:', JSON.stringify(aiAssistantClick.result.value))

  // 等待 AIAssistant 打开
  await new Promise((r) => setTimeout(r, 1500))

  // 3. 找"智能生成摘要"按钮
  const summaryClick = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const target = buttons.find(b => {
        const text = (b.textContent || '').trim()
        return text.includes('智能生成摘要') || text.includes('智能摘要') || text.includes('生成摘要')
      })
      if (target) {
        target.click()
        return { clicked: true, text: target.textContent.trim() }
      }
      return { clicked: false, allTexts: buttons.map(b => (b.textContent||'').trim()).filter(t => t.includes('摘要') || t.includes('智能')) }
    })()`,
    returnByValue: true,
  }, sessionId)
  console.log('[test] 智能摘要 click:', JSON.stringify(summaryClick.result.value))

  // 等待 AI 响应
  await new Promise((r) => setTimeout(r, 5000))

  // 4. 找发布检查弹窗（侧边栏 / 工具栏）
  const checklistClick = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const target = buttons.find(b => {
        const text = (b.textContent || '').trim()
        return text.includes('发布检查')
      })
      if (target) {
        target.click()
        return { clicked: true, text: target.textContent.trim() }
      }
      return { clicked: false }
    })()`,
    returnByValue: true,
  }, sessionId)
  console.log('[test] 发布检查 click:', JSON.stringify(checklistClick.result.value))

  await new Promise((r) => setTimeout(r, 2000))

  // 5. 在发布检查弹窗里找"智能生成摘要"
  const checklistSummary = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const target = buttons.find(b => {
        const text = (b.textContent || '').trim()
        return text.includes('智能生成摘要') || text.includes('智能摘要') || text.includes('生成摘要')
      })
      if (target) {
        target.click()
        return { clicked: true, text: target.textContent.trim() }
      }
      return { clicked: false, allTexts: buttons.map(b => (b.textContent||'').trim()).filter(t => t.includes('摘要')) }
    })()`,
    returnByValue: true,
  }, sessionId)
  console.log('[test] 发布检查 智能摘要 click:', JSON.stringify(checklistSummary.result.value))

  await new Promise((r) => setTimeout(r, 5000))

  console.log('\n========== TEST SUMMARY ==========')
  console.log('console messages:', cdp.consoleMessages.length)
  console.log('page errors:', cdp.pageErrors.length)
  const providerIdErrors = cdp.consoleMessages.filter((m) => m.text.includes('providerId'))
  if (providerIdErrors.length > 0) {
    console.log('❌ providerId errors found:')
    providerIdErrors.forEach((m) => console.log('  -', m.text))
  } else {
    console.log('✅ No providerId errors')
  }
  if (cdp.pageErrors.length > 0) {
    console.log('Page errors:')
    cdp.pageErrors.forEach((e) => console.log('  -', e))
  }
  console.log('==================================')

  ws.close()
  process.exit(0)
}

main().catch((err) => {
  console.error('[test] FATAL:', err)
  process.exit(1)
})
