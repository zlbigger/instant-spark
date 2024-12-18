document.addEventListener('DOMContentLoaded', function() {
  const webhookInput = document.getElementById('webhook');
  const saveButton = document.getElementById('save');
  const statusDiv = document.getElementById('status');
  let isSaving = false; // 防止重复提交

  // 显示状态信息
  function showStatus(message, type = 'success') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // 成功时自动关闭弹窗
    if (type === 'success') {
      setTimeout(() => {
        window.close();
      }, 1500);
    } else {
      setTimeout(() => {
        statusDiv.className = 'status';
      }, 3000);
    }
  }

  // 设置按钮状态
  function setButtonState(isLoading) {
    isSaving = isLoading;
    saveButton.disabled = isLoading;
    saveButton.textContent = isLoading ? '保存中...' : '保存设置';
    saveButton.className = `save-btn ${isLoading ? 'loading' : ''}`;
  }

  // 加载保存的 webhook
  chrome.storage.sync.get(['flomoWebhook'], function(result) {
    if (result.flomoWebhook) {
      webhookInput.value = result.flomoWebhook;
    }
  });

  // 测试 webhook 是否有效
  async function testWebhook(webhook) {
    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: '测试消息 - 来自 Instant Spark'
        })
      });
      return response.ok;
    } catch (error) {
      console.error('测试 webhook 失败:', error);
      return false;
    }
  }

  // 保存 webhook
  saveButton.addEventListener('click', async function() {
    if (isSaving) return; // 防止重复点击

    const webhook = webhookInput.value.trim();
    
    if (!webhook) {
      showStatus('请输入 webhook 地址', 'error');
      return;
    }

    if (!webhook.startsWith('https://flomoapp.com/iwh/')) {
      showStatus('请输入正确的 flomo webhook 地址', 'error');
      return;
    }

    setButtonState(true);

    // 测试 webhook 是否有效
    const isValid = await testWebhook(webhook);
    if (!isValid) {
      setButtonState(false);
      showStatus('webhook 地址无效，请检查后重试', 'error');
      return;
    }

    chrome.storage.sync.set({
      flomoWebhook: webhook
    }, function() {
      showStatus('✅ 设置已保存');
      setButtonState(false);
    });
  });

  // 添加输入验证
  webhookInput.addEventListener('input', function() {
    const webhook = this.value.trim();
    if (webhook && !webhook.startsWith('https://flomoapp.com/iwh/')) {
      this.style.borderColor = '#f44336';
      saveButton.disabled = true;
    } else {
      this.style.borderColor = webhook ? '#4a90e2' : '#ddd';
      saveButton.disabled = false;
    }
  });

  // 添加快捷键支持
  webhookInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !saveButton.disabled && !isSaving) {
      saveButton.click();
    }
  });
});
