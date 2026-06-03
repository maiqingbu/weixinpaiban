#!/usr/bin/env node
/* eslint-disable */
// 性能诊断：图片编辑器"完成"按钮到底卡在哪一步
// 1. 启动 ImageEditorModal（用一张大图）
// 2. 模拟 handleExport 各步并计时
// 3. 输出每步耗时

const WebSocket = require('ws')
const BROWSER_WS = 'ws://127.0.0.1:9222/devtools/browser/888099d2-a869-4e2f-9439-3e05905f4437'

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
      const pages = targetInfos.filter((t) => t.type === 'page')
      console.log('[cdp] page targets:', pages.map(p => p.url))
      const page = pages[0]
      return this.send('Target.attachToTarget', { targetId: page.targetId, flatten: true })
        .then(({ sessionId }) => sessionId)
    })
  }
  async eval(expression, sessionId, awaitPromise = false) {
    const r = await this.send('Runtime.evaluate', {
      expression, awaitPromise, returnByValue: true,
    }, sessionId)
    if (r.exceptionDetails) {
      console.log('[eval-exception]', r.exceptionDetails.text, r.exceptionDetails.exception?.description?.slice(0, 300))
    }
    return r.result?.value
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const ws = new WebSocket(BROWSER_WS)
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject) })
  const cdp = new CDPClient(ws)
  const sessionId = await cdp.attachToPageTarget()
  await cdp.send('Runtime.enable', {}, sessionId)
  await sleep(2000)

  // 注入一个大型图片 dataURL（模拟 2000x1500 的 PNG）
  const result = await cdp.eval(`(async () => {
    const log = []
    const t = (label) => { log.push({ label, t: performance.now() }); return performance.now() }

    try {
      t('start')

      // 模拟编辑器准备：先 createImageBitmap 加载图片
      const canvas = document.createElement('canvas')
      canvas.width = 2000
      canvas.height = 1500
      const ctx = canvas.getContext('2d')

      // 画一张渐变图（避免读外部图片）
      const gradient = ctx.createLinearGradient(0, 0, 2000, 1500)
      gradient.addColorStop(0, '#ff0000')
      gradient.addColorStop(0.5, '#00ff00')
      gradient.addColorStop(1, '#0000ff')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 2000, 1500)
      // 加点装饰
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      for (let i = 0; i < 50; i++) {
        ctx.beginPath()
        ctx.arc(Math.random() * 2000, Math.random() * 1500, 30 + Math.random() * 100, 0, Math.PI * 2)
        ctx.fill()
      }
      t('canvas ready')

      // ── 步骤1: canvas.toDataURL({multiplier: 2}) ──
      // 模拟 fabric.js 内部：toDataURL 在主线程同步执行
      const startT = performance.now()
      const dataUrl = canvas.toDataURL('image/png')
      const step1T = performance.now() - startT
      t('toDataURL done')

      const dataUrlSize = dataUrl.length
      const head = dataUrl.slice(0, 50)
      const base64 = dataUrl.split(',')[1]

      // ── 步骤2: atob + 同步 byte 循环 ──
      const startT2 = performance.now()
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'image/png' })
      const step2T = performance.now() - startT2
      t('atob+loop done')

      // ── 步骤3: 异步方案 toBlob 性能 ──
      const startT3 = performance.now()
      const blobAsync = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1))
      const step3T = performance.now() - startT3
      t('toBlob done')

      // ── 步骤4: fetch(dataUrl).then(r => r.blob()) ──
      const startT4 = performance.now()
      const blobFromDataUrl = await fetch(dataUrl).then(r => r.blob())
      const step4T = performance.now() - startT4
      t('fetch done')

      // ── 步骤5: 模拟把大 dataUrl 灌进 ProseMirror ──
      // 真实场景：tr.setNodeMarkup(pos, undefined, { src: newUrl })
      // ProseMirror 必须重新解析 src，整篇文档重渲染
      // 用 TextEncoder 模拟一下序列化开销
      const startT5 = performance.now()
      const html = '<img src="' + dataUrl + '" />'
      // 模拟 ProseMirror 的 doc dispatch：构造一个大的 transaction
      const dummy = document.createElement('div')
      dummy.innerHTML = html
      // 强制 layout
      const w = dummy.offsetWidth
      const step5T = performance.now() - startT5
      t('insert done')

      return {
        dataUrlSize,
        dataUrlSizeMB: (dataUrlSize / 1024 / 1024).toFixed(2),
        base64Len: base64.length,
        step1T: step1T.toFixed(0),
        step2T: step2T.toFixed(0),
        step3T: step3T.toFixed(0),
        step4T: step4T.toFixed(0),
        step5T: step5T.toFixed(0),
        totalSync: (step1T + step2T + step5T).toFixed(0),
        head: head.slice(0, 50),
        canvas: { w: 2000, h: 1500 }
      }
    } catch (e) {
      return { error: e.message, stack: e.stack?.slice(0, 500) }
    }
  })()`, sessionId, true)

  console.log('\n========== 性能测量（2000x1500 PNG，主线程） ==========')
  console.log(JSON.stringify(result, null, 2))
  console.log('========================================================\n')
  if (result.dataUrlSizeMB) {
    const m = parseFloat(result.dataUrlSizeMB)
    console.log(`📊 总结：编辑一张 ${m}MB 的图，` +
      `旧实现同步总耗时 ${result.totalSync}ms（toDataURL ${result.step1T} + atob循环 ${result.step2T} + 灌入编辑器 ${result.step5T}）`)
    console.log(`💡 异步方案可降到 toBlob ${result.step3T}ms（主线程不再阻塞）`)
  }
  ws.close()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
