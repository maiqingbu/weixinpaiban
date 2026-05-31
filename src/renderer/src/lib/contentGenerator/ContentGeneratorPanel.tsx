import { useState, useCallback } from 'react';
import { industries } from './industries';
import { contentTypes } from './contentTypes';
import { allLayouts, getLayoutsForType } from './layouts';
import type { ContentGenConfig, Industry, ContentType, LayoutDef, GenMode } from './types';
import { TONE_OPTIONS, LENGTH_OPTIONS, AUDIENCE_OPTIONS } from './types';

type Step = 'industry' | 'type' | 'layout' | 'generate';

interface Props {
  onGenerate: (config: ContentGenConfig) => void;
  onClose: () => void;
}

/** 行业 icon → emoji 映射 */
const ICON_EMOJI: Record<string, string> = {
  Cpu: '💻', TrendingUp: '📈', Heart: '❤️', GraduationCap: '🎓',
  UtensilsCrossed: '🍽️', Plane: '✈️', ShoppingBag: '🛍️', Home: '🏠',
  Car: '🚗', Baby: '👶', Dumbbell: '💪', Briefcase: '💼',
  Scale: '⚖️', Palette: '🎨', Sparkles: '✨', Building2: '🏛️',
};

export function ContentGeneratorPanel({ onGenerate, onClose }: Props) {
  const [step, setStep] = useState<Step>('industry');
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);
  const [selectedLayout, setSelectedLayout] = useState<LayoutDef | null>(null);
  const [genMode, setGenMode] = useState<GenMode>('structured');
  const [prompt, setPrompt] = useState('');
  // 结构化字段
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [audience, setAudience] = useState('general');
  const [extras, setExtras] = useState({
    dataChart: false, ctaButton: false, quoteCard: false,
    heroImage: true, footerGuide: true, authorSignature: false,
  });
  const [enableWebSearch, setEnableWebSearch] = useState(false);

  const handleIndustrySelect = useCallback((industry: Industry) => {
    setSelectedIndustry(industry);
    setSelectedType(null);
    setSelectedLayout(null);
    setStep('type');
  }, []);

  const handleTypeSelect = useCallback((type: ContentType) => {
    setSelectedType(type);
    setSelectedLayout(null);
    setStep('layout');
  }, []);

  const handleLayoutSelect = useCallback((layout: LayoutDef) => {
    setSelectedLayout(layout);
    setStep('generate');
  }, []);

  const handleGenerate = useCallback(() => {
    if (!selectedIndustry || !selectedType || !selectedLayout) return;
    onGenerate({
      industry: selectedIndustry,
      contentType: selectedType,
      layout: selectedLayout,
      mode: genMode,
      prompt,
      topic: topic || undefined,
      keywords: keywords ? keywords.split(/[,，、\s]+/).filter(Boolean) : undefined,
      tone,
      length,
      audience,
      enableWebSearch,
      extras,
    });
  }, [selectedIndustry, selectedType, selectedLayout, genMode, prompt, topic, keywords, tone, length, audience, extras, onGenerate]);

  // 根据当前步骤过滤推荐布局
  const recommendedLayouts = selectedType
    ? getLayoutsForType(selectedType.id)
    : allLayouts;

  const stepLabels = ['选择行业', '选择类型', '选择布局', '生成配置'];
  const stepIndex = { industry: 0, type: 1, layout: 2, generate: 3 }[step];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, width: 900, maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>✨ 智能内容生成</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999', padding: 4 }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '12px 24px', display: 'flex', gap: 8, borderBottom: '1px solid #f0f0f0' }}>
          {stepLabels.map((label, i) => (
            <div key={label} style={{
              flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 8,
              background: i === stepIndex ? '#eff6ff' : i < stepIndex ? '#f0fdf4' : '#f8fafc',
              color: i === stepIndex ? '#2563eb' : i < stepIndex ? '#16a34a' : '#94a3b8',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            }}>
              {i < stepIndex ? '✓' : i + 1}. {label}
            </div>
          ))}
        </div>

        {/* Breadcrumb */}
        {(selectedIndustry || selectedType) && (
          <div style={{ padding: '8px 24px', fontSize: 13, color: '#888', display: 'flex', gap: 4, alignItems: 'center' }}>
            {selectedIndustry && (
              <>
                <span style={{ color: selectedIndustry.color, fontWeight: 600 }}>{selectedIndustry.name}</span>
                {selectedType && <span> → </span>}
              </>
            )}
            {selectedType && <span style={{ fontWeight: 600 }}>{selectedType.name}</span>}
            {selectedLayout && <span> → <span style={{ fontWeight: 600 }}>{selectedLayout.name}</span></span>}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {/* Step 1: Industry */}
          {step === 'industry' && (
            <div>
              <p style={{ margin: '0 0 16px', fontSize: 15, color: '#555' }}>选择内容所属行业，我们将为您推荐最适合的排版方案。</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {industries.map(ind => (
                  <div
                    key={ind.id}
                    onClick={() => handleIndustrySelect(ind)}
                    style={{
                      padding: 16, borderRadius: 12, border: '2px solid #e5e7eb', cursor: 'pointer',
                      transition: 'all 0.15s', textAlign: 'center',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = ind.color; e.currentTarget.style.background = ind.color + '08'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 6 }}>
                      {ICON_EMOJI[ind.icon] || '📌'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{ind.name}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{ind.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Content Type */}
          {step === 'type' && (
            <div>
              <p style={{ margin: '0 0 16px', fontSize: 15, color: '#555' }}>
                选择内容类型，AI 将针对不同类型调整写作策略。
              </p>
              {selectedIndustry && (
                <div style={{ marginBottom: 16, padding: '10px 16px', background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
                  💡 推荐类型已根据「{selectedIndustry.name}」行业高亮显示
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {contentTypes.map(type => {
                  const isRecommended = selectedIndustry?.recommendedTypes.includes(type.id);
                  return (
                    <div
                      key={type.id}
                      onClick={() => handleTypeSelect(type)}
                      style={{
                        padding: 16, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                        border: `2px solid ${isRecommended ? '#fbbf24' : '#e5e7eb'}`,
                        background: isRecommended ? '#fffbeb' : '#fff',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = isRecommended ? '#fbbf24' : '#e5e7eb'; e.currentTarget.style.background = isRecommended ? '#fffbeb' : '#fff'; }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
                        {type.name}
                        {isRecommended && <span style={{ fontSize: 11, color: '#d97706', marginLeft: 6 }}>⭐ 推荐</span>}
                      </div>
                      <div style={{ fontSize: 13, color: '#888', marginBottom: 6 }}>{type.description}</div>
                      <div style={{ fontSize: 12, color: '#2563eb' }}>AI 关注：{type.aiFocus}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Layout */}
          {step === 'layout' && (
            <div>
              <p style={{ margin: '0 0 16px', fontSize: 15, color: '#555' }}>
                选择排版布局，推荐布局已置顶高亮。
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {recommendedLayouts.map(layout => {
                  const isRecommended = selectedType?.recommendedLayouts.includes(layout.id);
                  return (
                    <div
                      key={layout.id}
                      onClick={() => handleLayoutSelect(layout)}
                      style={{
                        padding: 12, borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
                        border: `2px solid ${isRecommended ? '#3b82f6' : '#e5e7eb'}`,
                        background: isRecommended ? '#eff6ff' : '#fff',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = isRecommended ? '#3b82f6' : '#e5e7eb'; e.currentTarget.style.transform = 'none'; }}
                    >
                      <div style={{ background: layout.previewBg || '#f8fafc', borderRadius: 8, padding: 8, marginBottom: 8, textAlign: 'center' }}>
                        <div dangerouslySetInnerHTML={{ __html: layout.thumbnail }} style={{ width: '100%', maxWidth: 180, margin: '0 auto' }} />
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>
                        {layout.name}
                        {isRecommended && <span style={{ fontSize: 10, color: '#2563eb', marginLeft: 4 }}>⭐</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>{layout.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 4: Generate */}
          {step === 'generate' && selectedLayout && (
            <div>
              <div style={{ display: 'flex', gap: 24 }}>
                {/* Left: preview */}
                <div style={{ width: 260, flexShrink: 0 }}>
                  <div style={{ background: selectedLayout.previewBg || '#f8fafc', borderRadius: 12, padding: 16, textAlign: 'center', marginBottom: 12 }}>
                    <div dangerouslySetInnerHTML={{ __html: selectedLayout.thumbnail }} style={{ maxWidth: 200, margin: '0 auto' }} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>{selectedLayout.name}</div>
                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{selectedLayout.description}</div>
                </div>

                {/* Right: config */}
                <div style={{ flex: 1, maxHeight: 420, overflow: 'auto' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px' }}>生成配置</h3>

                  {/* Mode toggle */}
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>生成模式</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['structured', 'freeform'] as GenMode[]).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setGenMode(mode)}
                          style={{
                            padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            border: genMode === mode ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                            background: genMode === mode ? '#eff6ff' : '#fff',
                            color: genMode === mode ? '#2563eb' : '#666',
                          }}
                        >
                          {mode === 'structured' ? '📋 结构化填写' : '✍️ 自由描述'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {genMode === 'structured' ? (
                    /* ===== 结构化表单 ===== */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* 主题 */}
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>文章主题 *</label>
                        <input
                          value={topic}
                          onChange={e => setTopic(e.target.value)}
                          placeholder="如：华为 Mate 70 新品发布"
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* 关键词 */}
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>关键词</label>
                        <input
                          value={keywords}
                          onChange={e => setKeywords(e.target.value)}
                          placeholder="用逗号分隔，如：长续航, 健康监测, 999元"
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>

                      {/* 语气 + 篇幅 同行 */}
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>写作风格</label>
                          <select
                            value={tone}
                            onChange={e => setTone(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fff' }}
                          >
                            {TONE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>目标篇幅</label>
                          <select
                            value={length}
                            onChange={e => setLength(e.target.value as 'short' | 'medium' | 'long')}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fff' }}
                          >
                            {LENGTH_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label} - {l.description}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* 受众 */}
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>目标受众</label>
                        <select
                          value={audience}
                          onChange={e => setAudience(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, outline: 'none', background: '#fff' }}
                        >
                          {AUDIENCE_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                      </div>

                      {/* 附加元素 */}
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>附加元素</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {[
                            { key: 'heroImage' as const, label: '🖼️ 首图Banner' },
                            { key: 'dataChart' as const, label: '📊 数据图表' },
                            { key: 'ctaButton' as const, label: '🔘 行动按钮' },
                            { key: 'quoteCard' as const, label: '💬 引言卡片' },
                            { key: 'footerGuide' as const, label: '📌 文末引导' },
                            { key: 'authorSignature' as const, label: '✍️ 作者署名' },
                          ].map(item => (
                            <label
                              key={item.key}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6,
                                border: extras[item.key] ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                                background: extras[item.key] ? '#eff6ff' : '#fff',
                                fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={extras[item.key]}
                                onChange={e => setExtras(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                style={{ display: 'none' }}
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* 补充说明 */}
                      <div>
                        <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>补充说明（可选）</label>
                        <textarea
                          value={prompt}
                          onChange={e => setPrompt(e.target.value)}
                          placeholder="如：重点突出性价比，突出与竞品的差异化..."
                          style={{ width: '100%', minHeight: 60, padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, lineHeight: 1.5, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  ) : (
                    /* ===== 自由描述模式 ===== */
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>内容描述</label>
                      <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="如：我要发布一款智能手表新品，主打健康监测和长续航，售价999元，面向年轻白领..."
                        style={{ width: '100%', minHeight: 140, padding: 12, borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => {
              if (step === 'type') setStep('industry');
              else if (step === 'layout') setStep('type');
              else if (step === 'generate') setStep('layout');
            }}
            style={{
              padding: '8px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
              border: '1px solid #e5e7eb', background: '#fff', color: '#555',
              visibility: step === 'industry' ? 'hidden' : 'visible',
            }}
          >
            ← 上一步
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <label
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8,
                border: enableWebSearch ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                background: enableWebSearch ? '#eff6ff' : '#fff',
                fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <input
                type="checkbox"
                checked={enableWebSearch}
                onChange={e => setEnableWebSearch(e.target.checked)}
                style={{ display: 'none' }}
              />
              🌐 联网搜索
            </label>
            <button
              onClick={onClose}
              style={{ padding: '8px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer', border: '1px solid #e5e7eb', background: '#fff', color: '#555' }}
            >
              取消
            </button>
            {step === 'generate' && (
              <button
                onClick={handleGenerate}
                style={{
                  padding: '8px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  border: 'none', background: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff',
                }}
              >
                ✨ 生成内容
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
