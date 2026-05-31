import { useState, useEffect, useCallback } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { ExternalLink, Star, Plus, Copy, Trash2, MoreHorizontal, Edit2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ReadMoreLink {
  id: string
  name: string
  url: string
  description: string
  is_default: number
  use_count: number
}

interface EditableLink {
  id?: string
  name?: string
  url?: string
  description?: string
  isDefault?: boolean
}

interface ReadMoreSettingsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function isValidUrl(url: string): boolean {
  return /^https?:\/\//.test(url) || /^mp\.weixin\.qq\.com/.test(url)
}

export function ReadMoreSettings({ open, onOpenChange }: ReadMoreSettingsProps): React.JSX.Element {
  const [links, setLinks] = useState<ReadMoreLink[]>([])
  const [url, setUrl] = useState('')
  const [text, setText] = useState('阅读原文')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<EditableLink | null>(null)
  const { toast } = useToast()

  const articles = useAppStore((s) => s.articles)
  const currentArticleId = useAppStore((s) => s.currentArticleId)
  const article = articles.find((a) => a.id === currentArticleId) ?? null

  const loadLinks = useCallback(async () => {
    const list = await window.api?.readMoreList?.()
    if (list) setLinks(list)
  }, [])

  useEffect(() => {
    if (open) {
      loadLinks()
      if (article) {
        setUrl(article.read_more_url || '')
        setText(article.read_more_text || '阅读原文')
      }
    }
  }, [open, article, loadLinks])

  const updateArticleStore = useAppStore((s) => s.updateArticle)

  const handleSave = async () => {
    if (!article) return
    if (url.trim() && !isValidUrl(url.trim())) {
      toast({ title: 'URL 格式不正确，需要以 https:// 或 http:// 开头', variant: 'destructive' })
      return
    }
    await window.api?.articleUpdate?.(article.id, {
      read_more_url: url.trim(),
      read_more_text: text.trim() || '阅读原文',
    })
    updateArticleStore(article.id, { read_more_url: url.trim(), read_more_text: text.trim() || '阅读原文' })
    toast({ title: '已保存' })
  }

  const handleClear = async () => {
    if (!article) return
    setUrl('')
    setText('阅读原文')
    await window.api?.articleUpdate?.(article.id, {
      read_more_url: '',
      read_more_text: '阅读原文',
    })
    updateArticleStore(article.id, { read_more_url: '', read_more_text: '阅读原文' })
    toast({ title: '已清除' })
  }

  const handleUseLink = async (link: ReadMoreLink) => {
    setUrl(link.url)
    setText('阅读原文')
    await window.api?.readMoreIncrementUse?.(link.id)
    if (article) {
      await window.api?.articleUpdate?.(article.id, {
        read_more_url: link.url,
        read_more_text: '阅读原文',
      })
      updateArticleStore(article.id, { read_more_url: link.url, read_more_text: '阅读原文' })
    }
    toast({ title: '已应用链接' })
  }

  const handleCopyUrl = async (linkUrl: string) => {
    await navigator.clipboard.writeText(linkUrl)
    toast({ title: '已复制 URL' })
  }

  const handleDeleteLink = async (id: string) => {
    await window.api?.readMoreDelete?.(id)
    setLinks((prev) => prev.filter((l) => l.id !== id))
    toast({ title: '已删除' })
  }

  const handleSetDefault = async (id: string) => {
    const link = links.find((l) => l.id === id)
    if (!link) return
    await window.api?.readMoreSave?.({
      id,
      name: link.name,
      url: link.url,
      description: link.description,
      isDefault: true,
    })
    loadLinks()
    toast({ title: '已设为默认' })
  }

  const handleSaveLink = async () => {
    if (!editingLink) return
    if (!editingLink.name?.trim()) {
      toast({ title: '请输入链接名称', variant: 'destructive' })
      return
    }
    if (!editingLink.url?.trim() || !isValidUrl(editingLink.url.trim())) {
      toast({ title: '请输入有效的 URL（以 https:// 开头）', variant: 'destructive' })
      return
    }
    await window.api?.readMoreSave?.({
      id: editingLink.id,
      name: editingLink.name.trim(),
      url: editingLink.url.trim(),
      description: editingLink.description?.trim() || '',
      isDefault: editingLink.isDefault,
    })
    setEditDialogOpen(false)
    setEditingLink(null)
    loadLinks()
    toast({ title: editingLink.id ? '已更新' : '已添加' })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[420px] max-w-full overflow-y-auto p-0 sm:max-w-[420px]">
          <SheetHeader className="sticky top-0 z-10 border-b border-border bg-background px-5 py-4">
            <SheetTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              阅读原文
            </SheetTitle>
          </SheetHeader>

          <div className="p-5 space-y-5">
            {/* Current article */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                当前文章的阅读原文
              </h4>
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">链接 URL</label>
                  <Input
                    placeholder="https://example.com/blog/..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">显示文字</label>
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-xs" onClick={handleClear}>清除</Button>
                  <Button size="sm" className="text-xs" onClick={handleSave}>保存</Button>
                </div>
              </div>
            </div>

            {/* Link library */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  从链接库选择
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setEditingLink({ name: '', url: '', description: '', isDefault: false })
                    setEditDialogOpen(true)
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  添加
                </Button>
              </div>

              {links.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">暂无链接</p>
              )}

              <div className="space-y-2">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {link.is_default === 1 && (
                            <Star className="h-3 w-3 text-yellow-500 shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">{link.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{link.url}</p>
                        <p className="text-xs text-muted-foreground mt-1">用过 {link.use_count} 次</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleUseLink(link)}
                        >
                          使用
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingLink({ id: link.id, name: link.name, url: link.url, description: link.description, isDefault: link.is_default === 1 })
                              setEditDialogOpen(true)
                            }}>
                              <Edit2 className="mr-2 h-3.5 w-3.5" /> 编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSetDefault(link.id)}>
                              <Star className="mr-2 h-3.5 w-3.5" /> 设为默认
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyUrl(link.url)}>
                              <Copy className="mr-2 h-3.5 w-3.5" /> 复制 URL
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteLink(link.id)}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" /> 删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hint */}
            <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800">
              复制到公众号后，请到公众号后台的"原文链接"输入框填入此链接。
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add/Edit link dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(o) => { if (!o) setEditingLink(null); setEditDialogOpen(o) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingLink?.id ? '编辑链接' : '添加常用链接'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">名称 *</label>
              <Input
                placeholder="我的博客首页"
                value={editingLink?.name || ''}
                onChange={(e) => setEditingLink((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">URL *</label>
              <Input
                placeholder="https://"
                value={editingLink?.url || ''}
                onChange={(e) => setEditingLink((prev) => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">备注</label>
              <Input
                placeholder="可选"
                value={editingLink?.description || ''}
                onChange={(e) => setEditingLink((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editingLink?.isDefault === true}
                onChange={(e) => setEditingLink((prev) => ({ ...prev, isDefault: e.target.checked }))}
              />
              设为默认（新文章自动使用此链接）
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditDialogOpen(false); setEditingLink(null) }}>取消</Button>
              <Button size="sm" onClick={handleSaveLink}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
