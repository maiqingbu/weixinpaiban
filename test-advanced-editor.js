const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 监听控制台日志
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[EditorPane]') || text.includes('[GrapesEditorDialog]')) {
      console.log('Console:', text);
    }
  });

  try {
    // 1. 打开应用
    console.log('1. 打开应用...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // 2. 检查页面状态
    console.log('2. 检查页面状态...');
    const pageTitle = await page.title();
    console.log('页面标题:', pageTitle);

    // 3. 查找文章列表
    console.log('3. 查找文章列表...');
    const sidebar = page.locator('text=文章列表').first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✓ 侧边栏可见');
    }

    // 4. 选择第一篇文章
    console.log('4. 选择文章...');
    const firstArticle = page.locator('[class*="cursor-pointer"]').first();
    if (await firstArticle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstArticle.click();
      await page.waitForTimeout(2000);
      console.log('✓ 已点击文章');
    } else {
      console.log('✗ 未找到文章');
    }

    // 5. 查找高级编辑器按钮
    console.log('5. 查找高级编辑器按钮...');
    const advancedBtn = page.locator('button:has-text("高级编辑器")');
    const btnVisible = await advancedBtn.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('高级编辑器按钮可见:', btnVisible);

    if (btnVisible) {
      // 6. 点击高级编辑器按钮
      console.log('6. 点击高级编辑器按钮...');
      await advancedBtn.click({ force: true });
      await page.waitForTimeout(3000);

      // 7. 检查是否有弹窗出现
      console.log('7. 检查弹窗...');
      const dialogs = await page.locator('[class*="fixed"][class*="z-50"]').all();
      console.log(`找到 ${dialogs.length} 个弹窗元素`);

      // 检查是否有 GrapesJS 编辑器
      const grapesEditor = page.locator('.gjs-editor');
      const grapesVisible = await grapesEditor.isVisible({ timeout: 5000 }).catch(() => false);
      console.log('GrapesJS 编辑器可见:', grapesVisible);

      if (grapesVisible) {
        console.log('✓ 高级编辑器已打开');

        // 8. 测试组件面板
        console.log('8. 测试组件面板...');
        const blocks = await page.locator('.gjs-block').all();
        console.log(`找到 ${blocks.length} 个组件块`);

        // 9. 测试样式面板
        console.log('9. 测试样式面板...');
        const styleSectors = await page.locator('.gjs-sm-sector').all();
        console.log(`找到 ${styleSectors.length} 个样式区域`);

        // 10. 测试工具栏
        console.log('10. 测试工具栏...');
        const undoBtn = page.locator('button:has-text("撤销")');
        const redoBtn = page.locator('button:has-text("重做")');
        const saveBtn = page.locator('button:has-text("保存到文章")');
        const closeBtn = page.locator('button:has-text("关闭")');

        console.log('撤销按钮:', await undoBtn.isVisible().catch(() => false));
        console.log('重做按钮:', await redoBtn.isVisible().catch(() => false));
        console.log('保存按钮:', await saveBtn.isVisible().catch(() => false));
        console.log('关闭按钮:', await closeBtn.isVisible().catch(() => false));

        // 11. 测试保存功能
        console.log('11. 测试保存功能...');
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await page.waitForTimeout(1500);
          const savedBtn = page.locator('button:has-text("已保存")');
          console.log('保存成功:', await savedBtn.isVisible({ timeout: 2000 }).catch(() => false));
        }

        // 12. 测试关闭功能
        console.log('12. 测试关闭功能...');
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
          await page.waitForTimeout(1500);
          console.log('✓ 已关闭高级编辑器');
        }

        console.log('\n✓ 所有测试完成！');
      } else {
        console.log('✗ 高级编辑器未打开');

        // 截图帮助调试
        await page.screenshot({ path: '/Users/mac/Desktop/test-debug.png' });
        console.log('已保存调试截图到 ~/Desktop/test-debug.png');
      }
    }

  } catch (error) {
    console.error('测试出错:', error.message);
    await page.screenshot({ path: '/Users/mac/Desktop/test-error.png' });
  } finally {
    await browser.close();
  }
})();
