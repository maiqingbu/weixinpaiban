import { useState, useEffect } from 'react'
import { Check, Loader2, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

function SearchSettings(): React.JSX.Element {
  const [tavilyKey, setTavilyKey] = useState('')
  const [hasTavilyKey, setHasTavilyKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadTavily()
  }, [])

  const loadTavily = async () => {
    try {
      const key = await window.api.tavilyGetKey()
      if (key) {
        setTavilyKey(key)
        setHasTavilyKey(true)
      }
    } catch {
      // ignore
    }
  }

  const handleSave = async () => {
    if (!tavilyKey.trim()) return
    setSaving(true)
    try {
      await window.api.tavilySetKey(tavilyKey.trim())
      setHasTavilyKey(true)
      toast({ title: 'Tavily 密钥已保存' })
    } catch {
      toast({ title: '保存失败', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await window.api.tavilyDeleteKey()
      setTavilyKey('')
      setHasTavilyKey(false)
      toast({ title: '已删除' })
    } catch {
      toast({ title: '删除失败', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">联网搜索</h2>

      <div className="rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <span className="inline-block h-4 w-1 rounded-full bg-blue-500" />
              Tavily 联网搜索
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              内容生成时自动联网搜索最新资料，注入 AI 上下文，提升文章时效性和准确性
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground shrink-0"
            onClick={() => window.open('https://tavily.com/', '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
            官网
          </Button>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">API Key</label>
          <Input
            className="h-8 text-sm"
            type="password"
            placeholder="输入 Tavily API Key..."
            value={tavilyKey}
            onChange={(e) => setTavilyKey(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            注册 tavily.com 即可获取免费 API Key，每月 1000 次搜索
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasTavilyKey && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3.5 w-3.5" />
              已配置
            </span>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={saving || !tavilyKey.trim()}
            onClick={handleSave}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {hasTavilyKey ? '更新' : '保存'}
          </Button>
          {hasTavilyKey && (
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

export { SearchSettings }
