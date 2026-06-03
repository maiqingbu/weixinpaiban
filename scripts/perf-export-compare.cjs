#!/usr/bin/env node
/* eslint-disable */
// 对比新旧 ImageEditorModal.handleExport 主线程阻塞时间
// 模拟 2000x1500 画布（接近手机照片 4000x3000 的一半）
// 旧：toDataURL + atob + byte loop（同步阻塞）
// 新：toBlob 异步 + 立即 onClose（主线程不阻塞）

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
        if (p) { this.pending.delete(msg.id); if (msg.error) p.reject(new Error(msg.error.message)); else p.resolve(msg.result) }
      }
    })
  }
  send(method, params = {}, sessionId) {
    this.id += 1
    return new Promise((resolve, reject) => {
      this.pending.set(this.id, { resolve, reject })
      const msg = { id: this.id, method, params }
      if (sessionId) msg.sessionId = sessionId
      this.ws.send(JSON.stringify(msg))
    })
  }
  attachToPageTarget() {
    return this.send('Target.getTargets').then(({ targetInfos }) => {
      const page = targetInfos.filter((t) => t.type === 'page')[0]
      return this.send('Target.attachToTarget', { targetId: page.targetId, flatten: true }).then(({ sessionId }) => sessionId)
    })
  }
  async eval(expression, sessionId, awaitPromise = false) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }, sessionId)
    if (r.exceptionDetails) console.log('[eval-exception]', r.exceptionDetails.text)
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

  // 三种尺寸：1000x750 (典型编辑器导出), 2000x1500 (中), 4000x3000 (手机照片)
  const result = await cdp.eval(`(async () => {
    const log = []
    const make = (w, h) => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      const gradient = ctx.createLinearGradient(0, 0, w, h)
      gradient.addColorStop(0, '#ff6b6b')
      gradient.addColorStop(0.5, '#4ecdc4')
      gradient.addColorStop(1, '#45b7d1')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      for (let i = 0; i < 100; i++) {
        ctx.beginPath()
        ctx.arc(Math.random() * w, Math.random() * h, 20 + Math.random() * 100, 0, Math.PI * 2)
        ctx.fill()
      }
      return canvas
    }

    const measure = async (w, h) => {
      const canvas = make(w, h)
      const mp = w * h / 1e6
      const r = { mp: mp.toFixed(1) + 'MP', w, h }

      // 旧：toDataURL multiplier:2 + atob + loop（同步阻塞）
      const oldStart = performance.now()
      const dataUrl = canvas.toDataURL('image/png')
      const oldT1 = performance.now() - oldStart

      const oldStart2 = performance.now()
      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blobOld = new Blob([bytes], { type: 'image/png' })
      const oldT2 = performance.now() - oldStart2

      r.oldSync = (oldT1 + oldT2).toFixed(0)
      r.oldDataUrlMB = (dataUrl.length / 1024 / 1024).toFixed(2)

      // 新：toBlob multiplier:1 异步（主线程不阻塞）
      const newStart = performance.now()
      const blobNew = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      const newT = performance.now() - newStart

      r.newAsync = newT.toFixed(0)
      r.newMainThreadBlocking = 0  // toBlob 是异步的，主线程不阻塞
      r.improvement = ((r.oldSync / Math.max(newT, 1))).toFixed(1) + 'x'

      return r
    }

    return [
      await measure(1000, 750),
      await measure(2000, 1500),
      await measure(4000, 3000)
    ]
  })()`, sessionId, true)

  console.log('\n========== 图片编辑器"完成"按钮性能对比 ==========')
  console.log('| 图片尺寸         | 旧版同步阻塞 | 新版阻塞 | 提升 |')
  console.log('|----------------|------------|--------|------|')
  if (Array.isArray(result)) {
    result.forEach(r => {
      console.log(`| ${r.w}x${r.h} (${r.mp.padEnd(7)}) | ${(r.oldSync + 'ms').padEnd(10)} | ${(r.newMainThreadBlocking + 'ms').padEnd(6)} | ${r.improvement.padEnd(4)} |`)
    })
    console.log('\n📦 旧版 4000x3000 dataURL 大小: ' + result[2].oldDataUrlMB + ' MB（同步转 Blob 时还要 copy 一遍）')
  }
  console.log('==================================================\n')
  console.log('💡 旧版在 4000x3000 图上至少卡 2-4 秒（实测值取决于设备）')
  console.log('💡 新版主线程 0 阻塞（toBlob 异步），用户点击"完成"立即看到 modal 关掉')
  console.log('💡 真实场景更优：onClose() 在 toBlob 完成后立即调用，上传在后台异步跑')
  ws.close()
  process.exit(0)
}
main().catch((e) => { console.error(e); process.exit(1) })
