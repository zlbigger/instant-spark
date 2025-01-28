// 微博点赞事件监听器
let lastLikedWeiboId = null;

// 监听点赞按钮的点击事件
function setupLikeButtonObserver() {
    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                // 微博的点赞按钮有多种可能的选择器
                const likeButtons = document.querySelectorAll([
                    'button[title="赞"]',
                    '.woo-like-main',
                    '[data-mark="like"]',
                    '.praise',
                    '.woo-box-flex [title="赞"]'
                ].join(','));
                
                likeButtons.forEach(button => {
                    if (!button.hasAttribute('flomo-listener')) {
                        button.setAttribute('flomo-listener', 'true');
                        button.addEventListener('click', handleLikeClick);
                        console.log('Added click listener to like button:', button);
                    }
                });
            }
        });
    });

    // 开始观察
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });

    console.log('Weibo observer started');
}

// 处理点赞事件
async function handleLikeClick(event) {
    console.log('Like button clicked');
    const weiboCard = findWeiboCard(event.target);
    if (!weiboCard) {
        console.log('No weibo card found');
        return;
    }

    // 获取微博ID
    const weiboId = getWeiboId(weiboCard);
    if (!weiboId || weiboId === lastLikedWeiboId) {
        console.log('Invalid weibo ID or duplicate:', weiboId);
        return;
    }
    
    lastLikedWeiboId = weiboId;

    // 获取微博内容
    const weiboContent = {
        text: getWeiboText(weiboCard),
        author: getWeiboAuthor(weiboCard),
        link: getWeiboLink(weiboId),
        timestamp: getWeiboTimestamp(weiboCard)
    };

    console.log('Weibo content:', weiboContent);

    // 格式化内容
    const formattedContent = formatWeiboForFlomo(weiboContent);
    
    // 发送消息给 background script
    chrome.runtime.sendMessage({
        action: 'sendToFlomo',
        content: formattedContent,
        source: 'Weibo'
    });

    console.log('Sent to Flomo:', formattedContent);
}

// 查找微博卡片元素
function findWeiboCard(element) {
    return element.closest([
        '.woo-box-flex',
        '.wb-item',
        'article',
        '.Feed_body_3R0rO',
        '.card-wrap'
    ].join(','));
}

// 获取微博ID
function getWeiboId(weiboCard) {
    // 尝试从多个可能的位置获取微博ID
    const midElement = weiboCard.querySelector('[mid], [data-mid], [mrid]');
    if (midElement) {
        return midElement.getAttribute('mid') || 
               midElement.getAttribute('data-mid') ||
               midElement.getAttribute('mrid');
    }
    
    // 从链接中提取
    const link = weiboCard.querySelector('a[href*="/detail/"], a[href*="weibo.com"][href*="detail"]');
    if (link) {
        const match = link.href.match(/\/(\d+)(?:\?|$)/);
        return match ? match[1] : null;
    }
    
    return null;
}

// 获取微博文本
function getWeiboText(weiboCard) {
    // 尝试多个可能的选择器
    const textSelectors = [
        '.woo-box-item-flex .detail_wbtext_4CRf9',
        '.wb-text',
        '[node-type="feed_list_content"]',
        '.content',
        '.text',
        '[lang]'
    ];
    
    for (const selector of textSelectors) {
        const element = weiboCard.querySelector(selector);
        if (element) {
            return element.textContent.trim();
        }
    }
    
    return '';
}

// 获取作者信息
function getWeiboAuthor(weiboCard) {
    // 尝试多个可能的选择器
    const authorSelectors = [
        '.woo-box-flex .head_name_24eEB',
        '.wb-name',
        '[node-type="feed_list_userName"]',
        '.username',
        'a[href*="/u/"]'
    ];
    
    for (const selector of authorSelectors) {
        const element = weiboCard.querySelector(selector);
        if (element) {
            return element.textContent.trim();
        }
    }
    
    return '';
}

// 获取微博链接
function getWeiboLink(weiboId) {
    return `https://weibo.com/detail/${weiboId}`;
}

// 获取时间戳
function getWeiboTimestamp(weiboCard) {
    const timeSelectors = [
        'a[href*="/detail/"] time',
        '.from a[date]',
        '.time',
        '.timestamp'
    ];

    for (const selector of timeSelectors) {
        const timeElement = weiboCard.querySelector(selector);
        if (timeElement) {
            return timeElement.getAttribute('datetime') || 
                   timeElement.getAttribute('date') || 
                   timeElement.textContent.trim();
        }
    }
    return '';
}

// 格式化微博内容
function formatWeiboForFlomo(weibo) {
    return `来自微博的收藏\n\n${weibo.text}\n\n作者：${weibo.author}\n时间：${weibo.timestamp}\n链接：${weibo.link}\n\n#weibo收藏`;
}

// 初始化
function init() {
    console.log('Weibo content script initialized');
    setupLikeButtonObserver();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
