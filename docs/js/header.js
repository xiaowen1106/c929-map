// Edit Panel functionality
export function getEditPanelHTML() {
    return `
        <div class="edit-panel-header-flex" style="display:flex;align-items:flex-start;gap:18px;">
            <div class="edit-panel-logo">
                <img src="img/ShenMi.World.logo.png" alt="ShenMi.World" />
            </div>
            <div class="edit-panel-follow">
                <div class="edit-panel-follow-header-row" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <b style="font-size:1.5em;">Follow 周深：</b>
                    <div class="edit-panel-follow-icons">
                        <a href="https://open.spotify.com/artist/0BezPR1Hn38i8qShQKunSD" target="_blank" rel="noopener"><img src="img/Spotify_Circle.png" alt="Spotify" style="height:28px;vertical-align:middle;" /></a>
                        <a href="https://music.youtube.com/channel/UC3xSH5DJZ0or5Tie0q0NFig?si=YGneJO1tmK-M7lZy" target="_blank" rel="noopener"><img src="img/YtbMusic_Circle.png" alt="YouTube Music" style="height:28px;vertical-align:middle;" /></a>
                        <a href="https://music.apple.com/us/artist/周深/1154054707" target="_blank" rel="noopener"><img src="img/AppleMusic_Circle.png" alt="Apple Music" style="height:28px;vertical-align:middle;" /></a>
                    </div>
                </div>
                <div class="edit-panel-follow-accounts" style="margin-top:8px;">
                    <div><b>@卡布叻_周深</b>
                        <span class="edit-panel-follow-links">
                            <a href="https://weibo.com/u/1736988591" target="_blank" rel="noopener">微博</a> |
                            <a href="https://space.bilibili.com/3404595" target="_blank" rel="noopener">Bilibili</a> |
                            <a href="https://v.douyin.com/MvrWuag/" target="_blank" rel="noopener">抖音</a>
                        </span>
                    </div>
                    <div><b>@周深工作室</b>
                        <span class="edit-panel-follow-links">
                            <a href="https://weibo.com/u/7478855230" target="_blank" rel="noopener">微博</a> |
                            <a href="https://space.bilibili.com/3546694058773380" target="_blank" rel="noopener">Bilibili</a> |
                            <a href="https://v.douyin.com/i5LfLDjw/" target="_blank" rel="noopener">抖音</a> |
                            <a href="https://www.xiaohongshu.com/user/profile/66361b46000000000700682d" target="_blank" rel="noopener">小红书</a>
                        </span>
                    </div>
                    <div><b>@ZhouShen Official</b>
                        <span class="edit-panel-follow-links">
                            <a href="https://www.youtube.com/@ZhouShenOfficial" target="_blank" rel="noopener">YouTube</a>
                        </span>
                    </div>
                    <div><b>@周嫑嫑</b>
                        <span class="edit-panel-follow-links">
                            <a href="https://www.xiaohongshu.com/user/profile/647b05de000000001c02b951" target="_blank" rel="noopener">小红书</a>
                        </span>
                    </div>
                </div>
            </div>
        </div>
        <div class="edit-panel-flex">
            <div class="edit-panel-main">
                <div class="edit-panel-title">
                    想在深米地图上留下你的追深足迹吗？<br>
                    <span class="edit-panel-desc">请填写以下问卷(Google Survey)，后台会定期审核并更新，记得常回来看看～</span>
                </div>
                <div class="edit-panel-btn-row">
                    <a href="https://forms.gle/GUhoeGEupuCa6GQy5" target="_blank" rel="noopener" class="edit-panel-btn">
                        <span class="edit-panel-btn-icon-label">
                            <svg width="20" height="20" fill="none" stroke="#223D71" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z"/></svg>
                            填写留言
                        </span>
                    </a>
                    <a href="mailto:beimeihaimi@gmail.com" target="_blank" rel="noopener" class="edit-panel-btn">
                        <span class="edit-panel-btn-icon-label">
                            <svg width="20" height="20" fill="none" stroke="#223D71" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="m22 5-10 7L2 5"/></svg>
                            联系我们
                        </span>
                    </a>
                    <a href="#" id="terms-btn" class="edit-panel-btn">
                        <span class="edit-panel-btn-icon-label">
                            <svg width="20" height="20" fill="none" stroke="#223D71" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>
                            服务条款
                        </span>
                    </a>
                </div>
            </div>
        </div>
        <div class="edit-panel-social">
            联系我们 @周深北美海米站 @CharlieZhouShenNAFanClub<br/>
            <span>
                <a href="https://www.youtube.com/@CharlieZhouShenNAFanClub" target="_blank" rel="noopener">YouTube</a> |
                <a href="https://www.instagram.com/zhoushennorthamericafanclub/" target="_blank" rel="noopener">Instagram</a> |
                <a href="https://www.facebook.com/groups/1703230447178848" target="_blank" rel="noopener">Facebook</a> |
                <a href="https://www.tiktok.com/@zhoushennafanclub" target="_blank" rel="noopener">TikTok</a> |
                <a href="https://open.spotify.com/user/313l2r4noj3fz2m2ttc6xn4zbrza" target="_blank" rel="noopener">Spotify</a>
                <br/><a href="https://www.weibo.com/u/7862847950" target="_blank" rel="noopener">微博</a> |
                <a href="https://www.xiaohongshu.com/user/profile/67840662000000000801b10d" target="_blank" rel="noopener">小红书</a> |
                <a href="https://space.bilibili.com/16746810" target="_blank" rel="noopener">Bilibili</a>
            </span>
        </div>
    `;
}

// Show terms of service popup function
function showTermsPopup() {
    // Remove existing popup if any
    const existingPopup = document.getElementById('terms-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    const popup = document.createElement('div');
    popup.id = 'terms-popup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 800px;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 15px;
        right: 20px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.backgroundColor = '#f0f0f0';
    closeBtn.onmouseout = () => closeBtn.style.backgroundColor = 'transparent';
    closeBtn.onclick = () => popup.remove();

    const title = document.createElement('h2');
    title.textContent = 'shenmi.world 服务条款';
    title.style.cssText = `
        margin: 0 0 20px 0;
        color: #333;
        font-size: 1.5em;
        padding-right: 40px;
    `;

    const termsText = document.createElement('div');
    termsText.innerHTML = `
        <p style="margin-bottom: 20px;">欢迎访问shenmi.world。当您使用本网站浏览或提交所在城市、留言内容、演唱会或团建活动记录时，即表示您已阅读、理解并同意以下服务条款：</p>
        
        <h3 style="margin: 25px 0 15px 0;">1. 信息收集范围</h3>
        <p style="margin-bottom: 10px;">我们收集的内容包括但不限于：</p>
        <ul style="margin: 0 0 15px 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">您自愿填写的所在城市</li>
            <li style="margin-bottom: 8px;">您的留言内容</li>
            <li style="margin-bottom: 8px;">您参与演唱会的记录及感想</li>
            <li style="margin-bottom: 8px;">您参与团建活动的记录及影像</li>
        </ul>
        <p style="margin: 0;">所有信息均为用户自愿提交，您有权选择不提供其中某些信息。</p>
        
        <h3 style="margin: 25px 0 15px 0;">2. 信息使用方式</h3>
        <p style="margin-bottom: 10px;">您提交的内容可能会用于以下用途：</p>
        <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">在网站上公开展示，展示个人的足迹与互动</li>
            <li style="margin-bottom: 8px;">统计或可视化展示用户的分布及参与情况</li>
            <li style="margin-bottom: 8px;">用于编辑、整理或呈现特定专题内容（如演唱会地图、团建回顾）</li>
        </ul>
        
        <h3 style="margin: 25px 0 15px 0;">3. 城市坐标与隐私保护</h3>
        <p style="margin-bottom: 10px;">为了提升数据展示效果，并最大程度保护您的隐私，我们会基于您提交的城市信息，随机生成该城市中心20公里范围内的一个坐标点作为地图标识。此坐标不代表您的真实位置。</p>
        <p style="margin: 0;">如展示的坐标与您的实际住址雷同，纯属巧合，请您理解并知悉我们并不会获取或储存您的精确地址信息。</p>
        
        <h3 style="margin: 25px 0 15px 0;">4. 内容规范</h3>
        <p style="margin-bottom: 10px;">请确保提交的内容真实、友善、文明，不得包含以下内容：</p>
        <ul style="margin: 0 0 15px 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">诽谤、骚扰或攻击他人的言论</li>
            <li style="margin-bottom: 8px;">涉及政治敏感、违法信息</li>
            <li style="margin-bottom: 8px;">他人未经授权的个人隐私（如姓名、照片、联系方式等）</li>
        </ul>
        <p style="margin: 0;">我们保留对不当内容进行删除、屏蔽的权利，情节严重者将限制其使用权限，以及自行负担法律责任。</p>
        
        <h3 style="margin: 25px 0 15px 0;">5. 个人信息与责任说明</h3>
        <p style="margin-bottom: 10px;">请勿提交身份证号、联系方式、家庭住址等敏感个人信息。如您主动提交此类信息，shenmi.world 不对此承担任何责任。</p>
        <p style="margin: 0;">我们不会将您提供的信息用于商业用途，也不会出售或提供给任何第三方。</p>
        
        <h3 style="margin: 25px 0 15px 0;">6. 内容授权</h3>
        <p style="margin: 0;">您提交的留言和活动记录即视为您授权本网站在不改变原意的前提下进行展示、编辑、归档或引用。内容版权仍归您本人所有，但您同意授权我们以非商业形式使用。</p>
        
        <h3 style="margin: 25px 0 15px 0;">7. 项目开源与社区共识</h3>
        <p style="margin: 0;">本网站为开源项目，其代码及部分内容已公开发布。我们倡导友好、包容、协作的社区氛围，使用或参与本项目即表示您同意遵守相关开源许可证、尊重他人劳动成果，并遵循开源社区公约。</p>

        <h3 style="margin: 25px 0 15px 0;">8. 条款更新</h3>
        <p style="margin: 0;">我们可能不定期更新本服务条款，并在网站上公示最新版本。您继续使用本网站，即表示接受更新后的内容。</p>
    `;
    termsText.style.cssText = `
        line-height: 1.6;
        color: #333;
    `;

    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(termsText);
    popup.appendChild(content);
    document.body.appendChild(popup);

    // Close on background click
    popup.onclick = (e) => {
        if (e.target === popup) {
            popup.remove();
        }
    };

    // Close on ESC key
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            popup.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// Show a quick message (toast) function
function showShareToast(msg) {
    let toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.position = 'fixed';
    toast.style.top = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(34,86,209,0.97)';
    toast.style.color = '#fff';
    toast.style.padding = '10px 24px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '1rem';
    toast.style.zIndex = 9999;
    toast.style.boxShadow = '0 2px 8px rgba(34,86,209,0.15)';
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 1800);
}

// Enhance initializeEditPanel to add terms button logic
export function initializeEditPanel() {
    const editBtn = document.getElementById('edit-btn');
    const editPanel = document.getElementById('edit-panel');
    const editPanelContent = editPanel.querySelector('.edit-panel-content');

    function toggleEditPanel() {
        if (editPanel.classList.contains('active')) {
            closeEditPanel();
        } else {
            openEditPanel();
        }
    }

    function openEditPanel() {
        editPanelContent.innerHTML = getEditPanelHTML();
        editPanel.classList.add('active');
        editBtn.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Add terms button logic after panel is rendered
        const termsBtn = document.getElementById('terms-btn');
        if (termsBtn) {
            termsBtn.onclick = function(e) {
                e.preventDefault();
                showTermsPopup();
            };
        }
    }

    function closeEditPanel() {
        editPanel.classList.remove('active');
        editBtn.classList.remove('active');
        document.body.style.overflow = '';
    }

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleEditPanel();
    });

    // Optional: ESC to close
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editPanel.classList.contains('active')) {
            closeEditPanel();
        }
    });
} 