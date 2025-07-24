import { showTermsPopup } from './utils/termsPopup.js';

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
                </div>
                <div class="edit-panel-follow-accounts" style="margin-top:8px;">
                    <div>
                        <span class="edit-panel-follow-links">
                            <a href="https://open.spotify.com/artist/0BezPR1Hn38i8qShQKunSD" target="_blank" rel="noopener">Spotify</a> |
                            <a href="https://music.apple.com/us/artist/周深/1154054707" target="_blank" rel="noopener">Apple Music</a> |
                            <a href="https://music.youtube.com/channel/UC3xSH5DJZ0or5Tie0q0NFig?si=YGneJO1tmK-M7lZy" target="_blank" rel="noopener">YouTube Music</a>
                        </span>
                    </div>
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

    // Close panel when clicking outside
    document.addEventListener('click', (e) => {
        if (editPanel.classList.contains('active') && 
            !editPanel.contains(e.target) && 
            !editBtn.contains(e.target)) {
            closeEditPanel();
        }
    });
} 