import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import type { Editor } from '@tiptap/react'

interface MiniprogramCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: Editor | null
  editAttrs?: Record<string, string>
  onUpdateAttrs?: (attrs: Record<string, string>) => void
}

export function MiniprogramCardDialog({ open, onOpenChange, editor, editAttrs, onUpdateAttrs }: MiniprogramCardDialogProps): React.JSX.Element {
  const [coverUrl, setCoverUrl] = useState(editAttrs?.coverUrl || '')
  const [title, setTitle] = useState(editAttrs?.title || '')
  const [description, setDescription] = useState(editAttrs?.description || '')
  const [appid, setAppid] = useState(editAttrs?.appid || '')
  const [path, setPath] = useState(editAttrs?.path || '')
  const [displayStyle, setDisplayStyle] = useState<'card' | 'text'>(editAttrs?.displayStyle as 'card' | 'text' || 'card')
  const { toast } = useToast()

  const isEditing = !!editAttrs

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ title: '请输入小程序名称', variant: 'destructive' })
      return
    }

    const attrs = {
      coverUrl: coverUrl.trim(),
      title: title.trim(),
      description: description.trim() || '小程序描述',
      appid: appid.trim(),
      path: path.trim(),
      displayStyle,
    }

    if (isEditing && onUpdateAttrs) {
      onUpdateAttrs(attrs)
    } else if (editor) {
      editor.commands.insertMiniprogramCard(attrs)
    }

    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    if (!isEditing) {
      setCoverUrl('')
      setTitle('')
      setDescription('')
      setAppid('')
      setPath('')
      setDisplayStyle('card')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑小程序卡片' : '插入小程序卡片'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info banner */}
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            这是一个视觉占位卡片。复制到公众号后，需要在公众号后台编辑器中重新关联真实小程序。
          </div>

          {/* Cover URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">卡片图 URL</label>
            <Input
              placeholder="粘贴图片 URL"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">小程序名称 *</label>
            <Input
              placeholder="小程序名称"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">描述</label>
            <Input
              placeholder="小程序描述"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* AppID */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">小程序 ID</label>
            <Input
              placeholder="如 wx1234567890abcdef"
              value={appid}
              onChange={(e) => setAppid(e.target.value)}
            />
          </div>

          {/* Path */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">跳转路径</label>
            <Input
              placeholder="如 pages/index/index"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
          </div>

          {/* Display style */}
          <div className="space-y-2">
            <label className="text-sm font-medium">展示形式</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={displayStyle === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayStyle('card')}
              >
                大图卡片
              </Button>
              <Button
                type="button"
                variant={displayStyle === 'text' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDisplayStyle('text')}
              >
                文字链接
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={handleSubmit}>{isEditing ? '保存' : '插入'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
