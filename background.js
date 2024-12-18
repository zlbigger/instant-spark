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
  const options = {
    type: 'basic',
    iconUrl: 'images/icon128.png',
    title: title,
    message: message,
    silent: false
  };

  try {
    await chrome.notifications.create('flomoNotification', options);
    // 3秒后自动关闭通知
    setTimeout(() => {
      chrome.notifications.clear('flomoNotification');
    }, 3000);
  } catch (error) {
    console.error('通知创建失败:', error);
  }
}

// 发送内容到 flomo
async function sendToFlomo(content, source) {
  try {
    const result = await chrome.storage.sync.get(['flomoWebhook']);
    
    if (!result.flomoWebhook) {
      await showNotification('Instant Spark', '请先设置 flomo webhook 地址', 'error');
      return;
    }

    const response = await fetch(result.flomoWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content + '\n来源：' + source
      })
    });

    if (response.ok) {
      await showNotification('Instant Spark', '已成功发送到 flomo');
    } else {
      throw new Error('发送失败');
    }
  } catch (error) {
    console.error('发送失败:', error);
    await showNotification('Instant Spark', '发送失败，请检查网络和 webhook 地址', 'error');
  }
}

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let content = '';

  if (info.selectionText) {
    content = info.selectionText;
  } else if (info.mediaType === 'image') {
    content = `![image](${info.srcUrl})`;
  } else if (info.linkUrl) {
    content = info.linkUrl;
  }

  if (content) {
    await sendToFlomo(content, tab.url);
  }
});
