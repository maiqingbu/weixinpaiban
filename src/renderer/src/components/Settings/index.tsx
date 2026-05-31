import { useState } from 'react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { AISettings } from './AISettings'
import { ImageHostSettings } from './ImageHostSettings'
import { ImageSearchSettings } from './ImageSearchSettings'
import { SearchSettings } from './SearchSettings'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SECTIONS = [
  { id: 'ai', label: '大模型配置' },
  { id: 'search', label: '联网搜索' },
  { id: 'image', label: '图床配置' },
  { id: 'imgsearch', label: '配图搜索' },
]

function SettingsDialog({ open, onOpenChange }: SettingsDialogProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState('ai')

  const handleClose = (isOpen: boolean) => {
    onOpenChange(isOpen)
    if (!isOpen) {
      window.dispatchEvent(new Event('settings-closed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex h-[85vh] max-w-[90vw] sm:max-w-[90vw] gap-0 overflow-hidden p-0">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r border-border bg-muted/30 p-4">
          <h2 className="mb-3 px-2 text-sm font-semibold">设置</h2>
          <nav className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer ${
                  activeSection === section.id
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'ai' && <AISettings />}
          {activeSection === 'search' && <SearchSettings />}
          {activeSection === 'image' && <ImageHostSettings />}
          {activeSection === 'imgsearch' && <ImageSearchSettings />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { SettingsDialog }
