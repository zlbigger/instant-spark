// 创建发送按钮
function createSendButton() {
  const button = document.createElement('button');
  button.id = 'instant-spark-button';
  button.innerHTML = '';
  button.style.cssText = `
    position: absolute;
    z-index: 999999;
    background: white;
    border: none;
    font-size: 20px;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    display: none;
    transition: all 0.2s ease;
  `;
  
  button.onmouseover = () => {
    button.style.transform = 'scale(1.1)';
  };
  
  button.onmouseout = () => {
    button.style.transform = 'scale(1)';
  };
  
  document.body.appendChild(button);
  return button;
}

// 显示成功提示
function showSuccessToast() {
  const toast = document.createElement('div');
  toast.innerHTML = '';
  toast.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    z-index: 999999;
    animation: fadeInOut 1.5s ease forwards;
  `;
  
  // 添加动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -40%); }
      20% { opacity: 1; transform: translate(-50%, -50%); }
      80% { opacity: 1; transform: translate(-50%, -50%); }
      100% { opacity: 0; transform: translate(-50%, -60%); }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
    style.remove();
  }, 1500);
}

// 显示提示信息
function showToast(message, type = 'success') {
  const toast = document.getElementById('instant-spark-toast');
  if (toast) {
    toast.textContent = message;
    toast.className = `instant-spark-toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }
}

// 显示浮动按钮
function showFloatingButton(x, y) {
  const button = document.getElementById('instant-spark-button');
  if (button) {
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    button.style.display = 'block';
  }
}

// 隐藏浮动按钮
function hideFloatingButton() {
  const button = document.getElementById('instant-spark-button');
  if (button) {
    button.style.display = 'none';
  }
}

// 获取选中的内容
function getSelectedContent() {
  const selection = window.getSelection();
  const container = document.createElement('div');
  
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    const fragment = range.cloneContents();
    container.appendChild(fragment);
  }

  // 处理图片链接
  const images = container.getElementsByTagName('img');
  for (let img of images) {
    const src = img.getAttribute('src');
    if (src) {
      // 确保图片链接是完整的 URL
      let fixedSrc = src;
      // 如果是相对路径，转换为绝对路径
      if (!src.startsWith('http://') && !src.startsWith('https://')) {
        const a = document.createElement('a');
        a.href = src;
        fixedSrc = a.href;
      }
      // 移除域名中的 zlbigger.com 部分
      fixedSrc = fixedSrc.replace(/\/zlbigger\.com/, '');
      
      // 更新 HTML 中的图片标记为 Markdown 格式
      const imgMarkdown = `![](${fixedSrc})`;
      const textNode = document.createTextNode(imgMarkdown);
      img.parentNode.replaceChild(textNode, img);
    }
  }

  return {
    text: container.innerText.trim(),
    html: container.innerHTML
  };
}

// 发送内容到 flomo
async function sendToFlomo(content) {
  try {
    const result = await chrome.storage.sync.get(['flomoWebhook']);
    
    if (!result.flomoWebhook) {
      showToast('请先设置 flomo webhook 地址', 'error');
      return;
    }

    const source = `\n来源：${window.location.href}`;
    
    const response = await fetch(result.flomoWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content + source
      })
    });

    if (response.ok) {
      showSuccessToast();
      showToast('已成功发送到 flomo');
      const button = document.getElementById('instant-spark-button');
      if (button) {
        button.classList.add('success');
        setTimeout(() => {
          button.classList.remove('success');
          hideFloatingButton();
        }, 1000);
      }
    } else {
      throw new Error('发送失败');
    }
  } catch (error) {
    console.error('发送失败:', error);
    showToast('发送失败，请检查网络和 webhook 地址', 'error');
  }
}

// 监听选中文本事件
document.addEventListener('mouseup', (e) => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    const button = document.getElementById('instant-spark-button');
    if (button) {
      const selectedContent = getSelectedContent();
      button.onclick = () => sendToFlomo(selectedContent.text);
    }
    // 在选中文本的右上方显示按钮
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    showFloatingButton(rect.right + scrollX + 5, rect.top + scrollY - 30);
  } else {
    hideFloatingButton();
  }
});

// 点击其他地方时隐藏按钮
document.addEventListener('mousedown', (e) => {
  const button = document.getElementById('instant-spark-button');
  if (button && e.target !== button) {
    hideFloatingButton();
  }
});

// 初始化
function createUI() {
  createSendButton();
  // 创建提示框
  const toast = document.createElement('div');
  toast.id = 'instant-spark-toast';
  toast.style.display = 'none';
  document.body.appendChild(toast);
}
createUI();
