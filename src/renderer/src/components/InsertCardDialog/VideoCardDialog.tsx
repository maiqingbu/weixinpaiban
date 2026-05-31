import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Editor } from '@tiptap/react'

interface VideoCardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editor: Editor | null
  /** If provided, editing an existing card instead of inserting new one */
  editAttrs?: Record<string, string>
  onUpdateAttrs?: (attrs: Record<string, string>) => void
}

export function VideoCardDialog({ open, onOpenChange, editor, editAttrs, onUpdateAttrs }: VideoCardDialogProps): React.JSX.Element {
  const [coverUrl, setCoverUrl] = useState(editAttrs?.coverUrl || '')
  const [title, setTitle] = useState(editAttrs?.title || '')
  const [account, setAccount] = useState(editAttrs?.account || '')
  const [duration, setDuration] = useState(editAttrs?.duration || '')
  const [finderUserName, setFinderUserName] = useState(editAttrs?.finderUserName || '')
  const [feedId, setFeedId] = useState(editAttrs?.feedId || '')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const { toast } = useToast()

  const isEditing = !!editAttrs

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ title: '请输入视频标题', variant: 'destructive' })
      return
    }

    const attrs = {
      coverUrl: coverUrl.trim(),
      title: title.trim(),
      account: account.trim() || '@视频号',
      duration: duration.trim() || '00:30',
      finderUserName: finderUserName.trim(),
      feedId: feedId.trim(),
    }

    if (isEditing && onUpdateAttrs) {
      onUpdateAttrs(attrs)
    } else if (editor) {
      editor.commands.insertVideoCard(attrs)
    }

    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    if (!isEditing) {
      setCoverUrl('')
      setTitle('')
      setAccount('')
      setDuration('')
      setFinderUserName('')
      setFeedId('')
      setShowAdvanced(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? '编辑视频号卡片' : '插入视频号卡片'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info banner */}
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
            这是一个视觉占位卡片。复制到公众号后，需要在公众号后台编辑器中点击该卡片，重新选择真实视频号视频进行关联。
          </div>

          {/* Cover URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">封面图 URL</label>
            <Input
              placeholder="粘贴图片 URL 或上传到图床"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">视频标题 *</label>
            <Input
              placeholder="视频号视频"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">视频号账号</label>
            <Input
              placeholder="@视频号"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">时长</label>
            <Input
              placeholder="00:30"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>

          {/* Advanced options */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              高级选项
            </button>
            {showAdvanced && (
              <div className="mt-2 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">视频号 ID</label>
                  <Input
                    placeholder="如 wxid_xxxx"
                    value={finderUserName}
                    onChange={(e) => setFinderUserName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">视频信息 ID</label>
                  <Input
                    placeholder="视频信息 ID"
                    value={feedId}
                    onChange={(e) => setFeedId(e.target.value)}
                  />
                </div>
              </div>
            )}
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
