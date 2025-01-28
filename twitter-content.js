// 监听 Twitter 点赞事件
console.log('Twitter 内容脚本开始加载');

// 检查元素是否是点赞按钮
function isLikeButton(element) {
    console.log('检查元素:', {
        tagName: element.tagName,
        classes: element.className,
        parentTagName: element.parentElement?.tagName
    });

    // 如果是 SVG 或 path，向上查找按钮
    if (element.tagName === 'svg' || element.tagName === 'path' || element.tagName === 'g') {
        const button = element.closest('[role="button"]');
        if (button) {
            console.log('从SVG找到按钮:', button);
            // 检查是否在点赞按钮容器内
            const likeContainer = button.closest('[data-testid="like"]');
            if (likeContainer) {
                console.log('确认是点赞按钮');
                return likeContainer;
            }
        }
    }

    // 直接检查是否是点赞按钮容器
    if (element.matches('[data-testid="like"]')) {
        console.log('直接找到点赞按钮容器');
        return element;
    }

    return null;
}

// 检查是否已点赞
function isLiked(button) {
    // 1. 检查按钮状态
    const ariaPressed = button.getAttribute('aria-pressed');
    const ariaLabel = button.getAttribute('aria-label');
    console.log('按钮状态:', { ariaPressed, ariaLabel });

    if (ariaPressed === 'true' || ariaLabel?.includes('已')) {
        console.log('通过属性确认已点赞');
        return true;
    }

    // 2. 检查 SVG 路径
    const path = button.querySelector('path');
    if (path) {
        const d = path.getAttribute('d') || '';
        console.log('SVG路径:', d);
        if (d.includes('M20.884')) {
            console.log('通过SVG路径确认已点赞');
            return true;
        }
    }

    // 3. 检查SVG类名
    const svg = button.querySelector('svg');
    if (svg) {
        const classes = Array.from(svg.classList);
        console.log('SVG类名:', classes);
        // 检查是否有红色相关的类名
        if (classes.some(c => c.includes('r-1xvli5t'))) {
            console.log('通过SVG类名确认已点赞');
            return true;
        }
    }

    return false;
}

// 处理点赞事件
async function handleLikeClick(event) {
    try {
        console.log('点击事件触发:', {
            targetTag: event.target.tagName,
            targetClass: event.target.className,
            parentTag: event.target.parentElement?.tagName
        });

        // 等待点赞状态更新
        await new Promise(resolve => setTimeout(resolve, 200));

        // 从点击位置向上查找点赞按钮
        let target = event.target;
        let button = null;
        let depth = 0;

        // 遍历父元素直到找到点赞按钮或到达文档根节点
        while (target && target !== document.body && depth < 10) {
            console.log(`检查第 ${depth} 层元素:`, {
                tag: target.tagName,
                dataTestId: target.getAttribute('data-testid'),
                role: target.getAttribute('role')
            });

            button = isLikeButton(target);
            if (button) {
                console.log('找到点赞按钮');
                break;
            }
            target = target.parentElement;
            depth++;
        }

        if (!button) {
            console.log('未找到点赞按钮，可能点击了其他元素');
            return;
        }

        // 检查点赞状态
        if (!isLiked(button)) {
            console.log('这是取消点赞操作，不同步');
            return;
        }

        console.log('检测到点赞操作，开始处理');

        // 获取推文容器
        const tweet = button.closest('article[data-testid="tweet"]') || 
                     button.closest('article[role="article"]');
        
        if (!tweet) {
            console.log('找不到推文容器');
            return;
        }

        // 获取推文内容
        const content = {
            text: '',
            author: '',
            link: '',
            timestamp: ''
        };

        // 获取文本内容
        const tweetTextElement = tweet.querySelector('[data-testid="tweetText"]');
        if (tweetTextElement) {
            content.text = tweetTextElement.textContent.trim();
        }

        // 获取作者信息
        const userNameElement = tweet.querySelector('[data-testid="User-Name"]');
        if (userNameElement) {
            const nameLinks = userNameElement.querySelectorAll('a[role="link"]');
            content.author = Array.from(nameLinks)
                .map(link => link.textContent.trim())
                .filter(text => text)
                .join(' ');
        }

        // 获取链接
        const statusLink = tweet.querySelector('a[href*="/status/"]');
        if (statusLink) {
            content.link = statusLink.href;
        }

        // 获取时间
        const timeElement = tweet.querySelector('time');
        if (timeElement) {
            content.timestamp = timeElement.dateTime;
        }

        console.log('收集到推文内容:', content);

        // 格式化内容
        const formattedContent = `来自 Twitter 的点赞\n\n${content.text}\n\n作者：${content.author}\n时间：${content.timestamp}\n链接：${content.link}\n\n#twitter收藏`;

        // 发送到 Flomo
        console.log('准备发送到 Flomo');
        chrome.runtime.sendMessage({
            action: 'sendToFlomo',
            content: formattedContent,
            source: 'Twitter'
        }, response => {
            if (chrome.runtime.lastError) {
                console.error('发送失败:', chrome.runtime.lastError);
            } else {
                console.log('发送成功:', response);
            }
        });

    } catch (error) {
        console.error('处理点赞事件时出错:', error);
    }
}

// 添加点赞按钮的点击监听
function addLikeButtonListeners() {
    console.log('开始添加点赞监听器');
    
    // 查找所有可能的点赞按钮
    const articles = document.querySelectorAll('article');
    console.log('找到文章数量:', articles.length);
    
    articles.forEach((article, index) => {
        const likeButton = article.querySelector('[data-testid="like"]');
        console.log(`文章 ${index + 1} 的点赞按钮:`, likeButton ? '找到' : '未找到');
        
        if (likeButton && !likeButton.hasAttribute('flomo-listener')) {
            likeButton.setAttribute('flomo-listener', 'true');
            
            // 使用 MutationObserver 监听点赞状态变化
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    console.log('属性变化:', {
                        type: mutation.type,
                        attributeName: mutation.attributeName,
                        oldValue: mutation.oldValue,
                        newValue: mutation.target.getAttribute(mutation.attributeName)
                    });

                    if (mutation.type === 'attributes' && 
                        (mutation.attributeName === 'aria-pressed' || 
                         mutation.attributeName === 'aria-label')) {
                        
                        console.log('检查点赞状态');
                        const liked = isLiked(likeButton);
                        console.log('点赞状态:', liked);

                        if (liked) {
                            console.log('检测到点赞，准备同步');
                            handleLikeClick({ target: likeButton });
                            // 监听到点赞后就停止观察
                            observer.disconnect();
                            console.log('观察器已断开');
                        }
                    }
                });
            });

            // 配置观察器
            observer.observe(likeButton, {
                attributes: true,
                attributeFilter: ['aria-pressed', 'aria-label'],
                attributeOldValue: true
            });

            console.log('添加点赞监听器到按钮，当前状态:', {
                'aria-pressed': likeButton.getAttribute('aria-pressed'),
                'aria-label': likeButton.getAttribute('aria-label')
            });
        }
    });
}

// 监听页面变化
const observer = new MutationObserver((mutations) => {
    let shouldAddListeners = false;
    
    for (const mutation of mutations) {
        // 检查新添加的节点
        if (mutation.addedNodes.length) {
            const hasNewArticle = Array.from(mutation.addedNodes).some(node => 
                node.nodeType === 1 && (
                    node.matches('article') || 
                    node.querySelector('article')
                )
            );
            if (hasNewArticle) {
                console.log('检测到新文章添加');
                shouldAddListeners = true;
                break;
            }
        }
        
        // 检查属性变化
        if (mutation.type === 'attributes') {
            const target = mutation.target;
            if (target.matches('[data-testid="like"]') || 
                target.matches('svg') || 
                target.matches('path')) {
                console.log('检测到相关属性变化:', mutation.attributeName);
                shouldAddListeners = true;
                break;
            }
        }
    }

    if (shouldAddListeners) {
        addLikeButtonListeners();
    }
});

// 开始监听
function startMonitoring() {
    // 先处理现有的按钮
    addLikeButtonListeners();

    // 设置观察器
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-label', 'aria-pressed', 'd', 'class']
    });

    console.log('开始监听页面变化');
}

// 初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMonitoring);
} else {
    startMonitoring();
}

// 页面可见性变化时重新检查
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log('页面变为可见，重新检查监听器');
        addLikeButtonListeners();
    }
});
