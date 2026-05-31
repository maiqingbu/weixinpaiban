/**
 * 内容生成 AI 对接层
 * 连接 ContentGenConfig → promptBuilder → AI client
 */
import { createAIComplete } from '../ai/client';
import { buildContentGenPrompt } from './promptBuilder';
import type { ContentGenConfig } from './types';

export interface GenerateContentOptions {
  config: ContentGenConfig;
  providerId: string;
  enableWebSearch?: boolean;
  onChunk?: (text: string) => void;
  onStatus?: (status: string) => void;
  signal?: AbortSignal;
}

export interface GenerateContentResult {
  requestId: string;
  promise: Promise<string>;
  cancel: () => void;
}

/**
 * 联网搜索相关内容
 */
async function searchWeb(topic: string, keywords?: string[]): Promise<string> {
  const query = [topic, ...(keywords || [])].filter(Boolean).join(' ')
  if (!query.trim()) return ''

  try {
    const resp = await window.api.tavilySearch(query, 5)
    if (resp.error || !resp.results?.length) return ''

    const lines = resp.results.map((r, i) =>
      `[${i + 1}] ${r.title}\n来源: ${r.url}\n摘要: ${r.content}`
    )
    return lines.join('\n\n')
  } catch {
    return ''
  }
}

/**
 * 调用 AI 生成公众号内容
 */
export function generateContent(opts: GenerateContentOptions): GenerateContentResult {
  const { config, providerId, enableWebSearch, onChunk, onStatus, signal } = opts;

  const requestId = crypto.randomUUID()
  let cancelFn: (() => void) | null = null

  const promise = (async () => {
    // 联网搜索
    let searchContext = ''
    if (enableWebSearch) {
      onStatus?.('正在联网搜索相关资料…')
      searchContext = await searchWeb(config.topic || '', config.keywords)
    }

    onStatus?.('正在生成内容…')
    const { system, user } = buildContentGenPrompt(config, searchContext);

    const lengthTokenMap: Record<string, number> = { short: 4096, medium: 8192, long: 16384 };
    const maxTokens = (config.length ? lengthTokenMap[config.length] : undefined) || 8192;

    const aiComplete = createAIComplete();
    const result = aiComplete(
      providerId,
      {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
        maxTokens,
        stream: true,
        signal,
      },
      onChunk,
    );

    cancelFn = result.cancel
    return result.promise
  })()

  return {
    requestId,
    promise,
    cancel: () => cancelFn?.(),
  };
}

/**
 * 从 AI 输出中提取纯 HTML 内容
 */
export function extractHtml(rawOutput: string): string {
  const codeBlockMatch = rawOutput.match(/```html\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const sectionMatch = rawOutput.match(/(<section[\s\S]*<\/section>)/i);
  if (sectionMatch) {
    return sectionMatch[1];
  }

  const divMatch = rawOutput.match(/(<div[\s\S]*<\/div>)/i);
  if (divMatch) {
    return divMatch[1];
  }

  if (/<[a-z][\s\S]*>/i.test(rawOutput)) {
    return rawOutput;
  }

  return rawOutput
    .split(/\n\n+/)
    .map(p => `<p style="margin-bottom:16px;line-height:1.8;">${p.trim()}</p>`)
    .join('\n');
}

/**
 * 替换 HTML 模板中的占位内容
 */
export function applyLayoutTemplate(htmlContent: string, layoutHtmlTemplate: string): string {
  if (layoutHtmlTemplate.includes('{{content}}')) {
    return layoutHtmlTemplate.replace('{{content}}', htmlContent);
  }
  return htmlContent;
}

/**
 * 智能提取并应用布局模板
 */
export function extractAndApplyLayout(rawOutput: string, layoutHtmlTemplate?: string): string {
  if (layoutHtmlTemplate) {
    let cleaned = rawOutput.trim()
    const codeBlockMatch = cleaned.match(/```(?:html)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim()
    }
    const firstTag = cleaned.indexOf('<')
    const lastTag = cleaned.lastIndexOf('>')
    if (firstTag !== -1 && lastTag > firstTag) {
      cleaned = cleaned.substring(firstTag, lastTag + 1)
    }
    return cleaned
  }
  return extractHtml(rawOutput)
}
