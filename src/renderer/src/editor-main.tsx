import './assets/main.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import EditorWindow from './EditorWindow'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EditorWindow />
  </StrictMode>
)
