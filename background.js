// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sendToFlomo',
    title: '💡同步到 flomo',
    contexts: ['selection', 'image', 'link']
  });
});

// 显示通知
async function showNotification(title, message, type = 'success') {
  const iconPath = type === 'success' ? 'images/icon128.png' : 'images/icon-error.png';
  const prefix = type === 'success' ? '✅ ' : '❌ ';
  
  try {
    await chrome.notifications.clear('flomoNotification');
    await chrome.notifications.create('flomoNotification', {
      type: 'basic',
      iconUrl: iconPath,
      title: prefix + title,
      message: message,
      silent: false,
      priority: 2
    });
  } catch (error) {
    console.error('通知创建失败:', error);
  }
}

// 发送内容到 flomo
async function sendToFlomo(content, source) {
  console.log('开始发送内容到 flomo:', { content, source });
  
  try {
    const result = await chrome.storage.sync.get(['flomoWebhook']);
    console.log('获取到 webhook:', result);
    
    if (!result.flomoWebhook) {
      console.error('未设置 webhook');
      await showNotification(
        '请设置 Webhook',
        '请先在扩展设置中配置 flomo webhook 地址',
        'error'
      );
      return false;
    }

    const response = await fetch(result.flomoWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content
      })
    });

    console.log('收到响应:', response);
    
    if (response.ok) {
      await showNotification(
        '同步成功',
        '内容已成功保存到 flomo'
      );
      return true;
    } else {
      throw new Error('响应状态码: ' + response.status);
    }
  } catch (error) {
    console.error('发送失败:', error);
    await showNotification(
      '同步失败',
      '请检查网络连接和 webhook 地址是否正确',
      'error'
    );
    return false;
  }
}

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  
  if (request.action === 'sendToFlomo') {
    // 立即发送响应，表示消息已收到
    sendResponse({ received: true });
    
    // 异步处理发送操作
    sendToFlomo(request.content, request.source)
      .then(success => {
        console.log('发送结果:', success);
      })
      .catch(error => {
        console.error('发送出错:', error);
      });
    
    // 返回 true 表示会异步发送响应
    return true;
  }
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log('右键菜单点击:', info);
  let content = '';
  if (info.selectionText) {
    content = info.selectionText;
  } else if (info.linkUrl) {
    content = info.linkUrl;
  } else if (info.srcUrl) {
    content = info.srcUrl;
  }

  if (content) {
    await sendToFlomo(content, tab.url);
  }
});
