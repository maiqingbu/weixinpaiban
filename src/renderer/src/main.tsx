import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useAppStore } from './store/useAppStore'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// dev-only 测试钩子：把 zustand store 挂到 window，方便 ws 自动化测试
// （e.g. 设置 currentArticleId / editorContent / 编辑器实例）。
// 生产构建不会引入这段（vite 会 dead-code-eliminate 整个分支）。
if (import.meta.env.DEV) {
  ;(window as unknown as { __APP_STORE__: typeof useAppStore }).__APP_STORE__ = useAppStore
}
