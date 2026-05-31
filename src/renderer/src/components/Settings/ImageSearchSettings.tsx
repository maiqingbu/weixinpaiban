import { useState, useEffect } from 'react'
import { ExternalLink, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

function ImageSearchSettings(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadKey()
  }, [])

  const loadKey = async () => {
    try {
      const { apiKey } = await window.api.imageSearchGetPexelsKey()
      if (apiKey) {
        setApiKey(apiKey)
        setHasKey(true)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    try {
      await window.api.imageSearchSetPexelsKey(apiKey.trim())
      setHasKey(true)
      toast({ title: 'Pexels 密钥已保存' })
    } catch {
      toast({ title: '保存失败', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await window.api.imageSearchDeletePexelsKey()
      setApiKey('')
      setHasKey(false)
      toast({ title: '已删除' })
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    }
  }

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded" />

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">配图搜索</h2>

      {/* Pexels API */}
      <div className="rounded-lg border border-border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-medium">
            <span className="inline-block h-4 w-1 rounded-full bg-green-500" />
            Pexels
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground"
            onClick={() => window.open('https://www.pexels.com/api/', '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
            文档
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          Pexels 提供高质量免费图片，支持中文搜索，配图速度极快（无需加载网页）。
          注册即可免费获取密钥，每月 200 次请求。
          {!hasKey && ' 未配置时将使用百度/搜狗/360 搜索。'}
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-xs text-muted-foreground">
            密钥
          </label>
          <div className="flex items-center gap-2">
            <Input
              className="h-8 text-sm flex-1"
              type="password"
              placeholder="输入 Pexels 密钥..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={saving || !apiKey.trim()}
            onClick={handleSave}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {hasKey ? '更新' : '保存'}
          </Button>
          {hasKey && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-red-600 hover:text-red-700"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
              删除
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export { ImageSearchSettings }
