#!/usr/bin/env node
/* eslint-disable */
// 复现用户报告的"闪一下"bug
// 慢镜头：监听 Sheet open 状态变化、检查 summaryGenerating/summaryResult 状态

const WebSocket = require('ws')
const BROWSER_WS = 'ws://127.0.0.1:9222/devtools/browser/74dc0fbe-fa5a-4fb3-8668-2d1e0ba0ce32'

class CDPClient {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    this.events = []
    ws.on('message', (data) => {
      const msg = JSON.parse(data)
      if (msg.id != null) {
        const p = this.pending.get(msg.id)
        if (p) {
          this.pending.delete(msg.id)
          if (msg.error) p.reject(new Error(msg.error.message))
          else p.resolve(msg.result)
        }
      } else {
        this.events.push(msg)
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
      return this.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
        .then(({ sessionId }) => sessionId)
    })
  }
}

async function main() {
  const ws = new WebSocket(BROWSER_WS)
  await new Promise((r, j) => { ws.once('open', r); ws.once('error', j) })
  const cdp = new CDPClient(ws)
  const sessionId = await cdp.attachToPageTarget()
  await cdp.send('Runtime.enable', {}, sessionId)
  await cdp.send('Page.enable', {}, sessionId)
  await new Promise((r) => setTimeout(r, 1500))

  console.log('[test] Step 1: 打开 ChecklistPanel (发布检查)')
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().includes('发布检查'))
      if (btn) { btn.click(); return true }
      return false
    })()`,
    returnByValue: true,
  }, sessionId)

  await new Promise((r) => setTimeout(r, 1500))

  // 1. 检查 sheet 是否打开
  const check1 = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const sheet = document.querySelector('[data-state="open"]') || document.querySelector('[role="dialog"]')
      return { hasSheet: !!sheet, sheetRole: sheet?.getAttribute('role') || null }
    })()`,
    returnByValue: true,
  }, sessionId)
  console.log('[test] Sheet 状态:', JSON.stringify(check1.result.value))

  console.log('[test] Step 2: 点击"智能生成摘要"按钮')
  const beforeClick = Date.now()
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().includes('智能生成摘要'))
      if (btn) { btn.click(); return true }
      return false
    })()`,
    returnByValue: true,
  }, sessionId)

  // 2. 立刻每 200ms 检查 summaryGenerating / summaryResult
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 200))
    const state = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const sheet = document.querySelector('[role="dialog"]')
        // 找智能摘要部分
        const summaryText = Array.from(document.querySelectorAll('p')).find(p => {
          const text = (p.textContent || '').trim()
          return text.includes('生成失败') || text.includes('AI') || text.includes('Error') || text.includes('正在生成')
        })
        return {
          hasSheet: !!sheet,
          sheetVisible: sheet ? (sheet.offsetWidth > 0) : false,
          summaryText: summaryText ? summaryText.textContent.trim() : null,
          t: ${Date.now() - beforeClick}
        }
      })()`,
      returnByValue: true,
    }, sessionId)
    console.log(`[test] t=${i*200}ms:`, JSON.stringify(state.result.value))
  }

  // 3. 收集所有 pageerror / console.error
  const errors = cdp.events
    .filter((e) => e.method === 'Runtime.exceptionThrown' || e.method === 'Runtime.consoleAPICalled')
    .filter((e) => e.params.type === 'error' || e.params.type === 'warning' || e.method === 'Runtime.exceptionThrown')
  console.log('\n[test] 错误/警告总数:', errors.length)
  errors.forEach((e) => {
    if (e.method === 'Runtime.consoleAPICalled') {
      const text = e.params.args.map((a) => a.value ?? a.description ?? '').join(' ')
      console.log(`  [${e.params.type}]`, text.slice(0, 200))
    } else {
      const ex = e.params.exceptionDetails
      console.log('  [pageerror]', ex.text, ex.exception?.description?.slice(0, 200) || '')
    }
  })

  // 4. 最终 sheet 状态
  await new Promise((r) => setTimeout(r, 2000))
  const final = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const sheet = document.querySelector('[role="dialog"]')
      return { hasSheet: !!sheet, sheetVisible: sheet ? sheet.offsetWidth > 0 : false }
    })()`,
    returnByValue: true,
  }, sessionId)
  console.log('\n[test] 最终 Sheet 状态:', JSON.stringify(final.result.value))

  ws.close()
  process.exit(0)
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
