#!/usr/bin/env node
/* eslint-disable */
// 精确检查 ChecklistPanel UI 状态：setSummaryResult 是否真的被调用

const WebSocket = require('ws')
const BROWSER_WS = 'ws://127.0.0.1:9222/devtools/browser/74dc0fbe-fa5a-4fb3-8668-2d1e0ba0ce32'

class CDPClient {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.on('message', (data) => {
      const msg = JSON.parse(data)
      if (msg.id != null) {
        const p = this.pending.get(msg.id)
        if (p) {
          this.pending.delete(msg.id)
          if (msg.error) p.reject(new Error(msg.error.message))
          else p.resolve(msg.result)
        }
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
  await new Promise((r) => setTimeout(r, 1500))

  // 1. 检查 ChecklistPanel 的 React state - 通过 DOM 推断
  console.log('[test] 打开 ChecklistPanel')
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().includes('发布检查'))
      if (btn) btn.click()
    })()`,
    returnByValue: true,
  }, sessionId)
  await new Promise((r) => setTimeout(r, 1500))

  console.log('[test] 点击智能生成摘要')
  const t0 = Date.now()
  await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent||'').trim().includes('智能生成摘要'))
      if (btn) btn.click()
    })()`,
    returnByValue: true,
  }, sessionId)

  // 2. 持续观察 8s，每 500ms 检查 DOM
  for (let i = 0; i < 16; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const r = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        // 找智能摘要部分的所有 p 元素
        const ps = Array.from(document.querySelectorAll('p')).map(p => p.textContent?.trim()).filter(t => t && t.length < 500)
        // 找所有按钮
        const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
          text: (b.textContent || '').trim().slice(0, 40),
          disabled: b.disabled
        })).filter(b => b.text)
        return { ps, buttons }
      })()`,
      returnByValue: true,
    }, sessionId)
    const elapsed = Date.now() - t0
    console.log(`[t=${elapsed}ms] p=${JSON.stringify(r.result.value.ps).slice(0, 200)}`)
    console.log(`           buttons=${JSON.stringify(r.result.value.buttons).slice(0, 200)}`)
  }

  ws.close()
  process.exit(0)
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
