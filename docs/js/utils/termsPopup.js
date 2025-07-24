// Terms of Service Popup functionality
export function showTermsPopup() {
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
    title.textContent = 'ShenMi.World 服务条款 / Terms of Service';
    title.style.cssText = `
        margin: 0 0 20px 0;
        color: #333;
        font-size: 1.5em;
        padding-right: 40px;
    `;

    // Create toggle container
    const toggleContainer = document.createElement('div');
    toggleContainer.style.cssText = `
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    // Create toggle button
    const languageToggle = document.createElement('button');
    languageToggle.innerHTML = '<span style="color: white;">中文</span> / <span style="color: #ccc;">English</span>';
    languageToggle.style.cssText = `
        padding: 8px 16px;
        border: 2px solid #223D71;
        background: #223D71;
        color: white;
        cursor: pointer;
        font-size: 14px;
        border-radius: 20px;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
    `;

    // Create content containers
    const chineseContent = document.createElement('div');
    chineseContent.id = 'chinese-content';
    chineseContent.innerHTML = `
        <p style="margin-bottom: 15px;">欢迎访问ShenMi.World。当您使用本网站浏览或提交所在城市、留言内容、演唱会或团建活动记录时，即表示您已阅读、理解并同意以下服务条款：</p>
        
        <h3 style="margin: 20px 0 10px 0;">1. 信息收集范围</h3>
        <p style="margin-bottom: 8px;">我们收集的内容包括但不限于：</p>
        <ul style="margin: 0 0 12px 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">您自愿填写的所在城市</li>
            <li style="margin-bottom: 6px;">您的留言内容</li>
            <li style="margin-bottom: 6px;">您参与演唱会的记录及感想</li>
            <li style="margin-bottom: 6px;">您参与团建活动的记录及影像</li>
        </ul>
        <p style="margin: 0;">所有信息均为用户自愿提交，您有权选择不提供其中某些信息。</p>
        
        <h3 style="margin: 20px 0 10px 0;">2. 信息使用方式</h3>
        <p style="margin-bottom: 8px;">您提交的内容可能会用于以下用途：</p>
        <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">在网站上公开展示，展示个人的足迹与互动</li>
            <li style="margin-bottom: 6px;">统计或可视化展示用户的分布及参与情况</li>
            <li style="margin-bottom: 6px;">用于编辑、整理或呈现特定专题内容（如演唱会地图、团建回顾）</li>
        </ul>
        
        <h3 style="margin: 20px 0 10px 0;">3. 城市坐标与隐私保护</h3>
        <p style="margin-bottom: 8px;">为了提升数据展示效果，并最大程度保护您的隐私，我们会基于您提交的城市信息，随机生成该城市中心20公里范围内的一个坐标点作为地图标识。此坐标不代表您的真实位置。</p>
        <p style="margin: 0;">如展示的坐标与您的实际住址雷同，纯属巧合，请您理解并知悉我们并不会获取或储存您的精确地址信息。</p>
        
        <h3 style="margin: 20px 0 10px 0;">4. 内容规范</h3>
        <p style="margin-bottom: 8px;">请确保提交的内容真实、友善、文明，不得包含以下内容：</p>
        <ul style="margin: 0 0 12px 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">诽谤、骚扰或攻击他人的言论</li>
            <li style="margin-bottom: 6px;">涉及政治敏感、违法信息</li>
            <li style="margin-bottom: 6px;">他人未经授权的个人隐私（如姓名、照片、联系方式等）</li>
        </ul>
        <p style="margin: 0;">我们保留对不当内容进行删除、屏蔽的权利，情节严重者将限制其使用权限，以及自行负担法律责任。</p>
        
        <h3 style="margin: 20px 0 10px 0;">5. 个人信息与责任说明</h3>
        <p style="margin-bottom: 8px;">请勿提交敏感个人信息。例如：身份证号、联系方式、家庭住址等敏感个人信息。ShenMi.World 对于已提交信息不负任何责任和义务。</p>
        <p style="margin: 0;">我们不会将您提供的信息用于营利用途，也不会为营利目的而出售给任何第三方。</p>
        
        <h3 style="margin: 20px 0 10px 0;">6. 联系我们</h3>
        <p style="margin-bottom: 8px;">如有任何问题或建议，请联系我们: <a href="mailto:beimeihaimi@gmail.com" style="color: #223D71; text-decoration: none;">beimeihaimi@gmail.com</a></p>
        
        <h3 style="margin: 20px 0 10px 0;">7. 内容授权</h3>
        <p style="margin: 0;">您提交的留言和活动记录即视为您授权本网站在不改变原意的前提下进行展示、编辑、归档或引用。内容版权仍归您本人所有，但您同意授权我们以非商业形式使用。</p>
        
        <h3 style="margin: 20px 0 10px 0;">8. 项目开源与社区共识</h3>
        <p style="margin: 0;">本网站为开源项目，其代码及部分内容已公开发布。我们倡导友好、包容、协作的社区氛围，使用或参与本项目即表示您同意遵守相关开源许可证、尊重他人劳动成果，并遵循开源社区公约。</p>

        <h3 style="margin: 20px 0 10px 0;">9. 版权声明</h3>
        <p style="margin: 0;">本站所有文字、图像、资讯和视频未经允许，禁止二改二传。版权所有，保留所有权利。</p>
        
        <h3 style="margin: 20px 0 10px 0;">10. 条款更新</h3>
        <p style="margin: 0;">我们可能不定期更新本服务条款，并在网站上公示最新版本。您继续使用本网站，即表示接受更新后的内容。</p>
    `;
    chineseContent.style.cssText = `
        line-height: 1.4;
        color: #333;
        display: block;
    `;

    const englishContent = document.createElement('div');
    englishContent.id = 'english-content';
    englishContent.innerHTML = `
        <p style="margin-bottom: 15px;">Welcome to ShenMi.World. By using this website to browse or submit your city, messages, concert experiences, or fan gathering activities, you acknowledge that you have read, understood, and agreed to the following terms of service:</p>
        
        <h3 style="margin: 20px 0 10px 0;">1. Information Collection Scope</h3>
        <p style="margin-bottom: 8px;">The content we collect includes but is not limited to:</p>
        <ul style="margin: 0 0 12px 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">Your voluntarily submitted city of residence</li>
            <li style="margin-bottom: 6px;">Your message content</li>
            <li style="margin-bottom: 6px;">Your concert attendance records and reflections</li>
            <li style="margin-bottom: 6px;">Your fan gathering activity records and images</li>
        </ul>
        <p style="margin: 0;">All information is voluntarily submitted by users, and you have the right to choose not to provide certain information.</p>
        
        <h3 style="margin: 20px 0 10px 0;">2. Information Usage</h3>
        <p style="margin-bottom: 8px;">Your submitted content may be used for the following purposes:</p>
        <ul style="margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">Public display on the website to showcase individual footprints and interactions</li>
            <li style="margin-bottom: 6px;">Statistical or visual representation of user distribution and participation</li>
            <li style="margin-bottom: 6px;">For editing, organizing, or presenting specific thematic content (such as concert maps, gathering retrospectives)</li>
        </ul>
        
        <h3 style="margin: 20px 0 10px 0;">3. City Coordinates and Privacy Protection</h3>
        <p style="margin-bottom: 8px;">To enhance data presentation and maximize your privacy protection, we generate a random coordinate point within 20 kilometers of the city center based on your submitted city information as a map identifier. This coordinate does not represent your actual location.</p>
        <p style="margin: 0;">If the displayed coordinate happens to be similar to your actual address, it is purely coincidental. Please understand that we do not obtain or store your precise address information.</p>
        
        <h3 style="margin: 20px 0 10px 0;">4. Content Guidelines</h3>
        <p style="margin-bottom: 8px;">Please ensure that submitted content is truthful, friendly, and civilized. The following content is prohibited:</p>
        <ul style="margin: 0 0 12px 0; padding-left: 20px;">
            <li style="margin-bottom: 6px;">Defamatory, harassing, or attacking remarks against others</li>
            <li style="margin-bottom: 6px;">Politically sensitive or illegal information</li>
            <li style="margin-bottom: 6px;">Unauthorized personal privacy of others (such as names, photos, contact information, etc.)</li>
        </ul>
        <p style="margin: 0;">We reserve the right to delete or block inappropriate content. Serious violations may result in restricted usage privileges and legal responsibility.</p>
        
        <h3 style="margin: 20px 0 10px 0;">5. Personal Information and Liability</h3>
        <p style="margin-bottom: 8px;">Please do not submit sensitive personal information such as ID numbers, contact information, or home addresses, etc. ShenMi.World does not assume any responsibility or liability for the submitted information.</p>
        <p style="margin: 0;">We will not use your provided information for profit purposes, nor will we sell it for profit to any third parties.</p>
        
        <h3 style="margin: 20px 0 10px 0;">6. Contact Us</h3>
        <p style="margin-bottom: 8px;">If you have any questions or suggestions, please contact us: <a href="mailto:beimeihaimi@gmail.com" style="color: #223D71; text-decoration: none;">beimeihaimi@gmail.com</a></p>
        
        <h3 style="margin: 20px 0 10px 0;">7. Content Authorization</h3>
        <p style="margin: 0;">Your submitted messages and activity records are considered as your authorization for this website to display, edit, archive, or reference them without changing the original meaning. The copyright of the content remains yours, but you agree to authorize us to use it in non-commercial forms.</p>
        
        <h3 style="margin: 20px 0 10px 0;">8. Open Source Project and Community Consensus</h3>
        <p style="margin: 0;">This website is an open-source project, and its code and some content have been publicly released. We advocate for a friendly, inclusive, and collaborative community atmosphere. Using or participating in this project indicates your agreement to comply with relevant open-source licenses, respect others' work, and follow open-source community conventions.</p>

        <h3 style="margin: 20px 0 10px 0;">9. All Rights Reserved</h3>
        <p style="margin: 0;">All rights reserved. Re-posting, re-editing is prohibited.</p>
        
        <h3 style="margin: 20px 0 10px 0;">10. Terms Updates</h3>
        <p style="margin: 0;">We may update these terms of service from time to time and will post the latest version on the website. Your continued use of this website indicates acceptance of the updated content.</p>
    `;
    englishContent.style.cssText = `
        line-height: 1.4;
        color: #333;
        display: none;
    `;

    // Toggle functionality
    let isChinese = true;
    
    function toggleLanguage() {
        isChinese = !isChinese;
        if (isChinese) {
            languageToggle.innerHTML = '<span style="color: white;">中文</span> / <span style="color: #ccc;">English</span>';
            languageToggle.style.background = '#223D71';
            chineseContent.style.display = 'block';
            englishContent.style.display = 'none';
        } else {
            languageToggle.innerHTML = '<span style="color: #ccc;">中文</span> / <span style="color: white;">English</span>';
            languageToggle.style.background = '#223D71';
            englishContent.style.display = 'block';
            chineseContent.style.display = 'none';
        }
    }

    languageToggle.onclick = toggleLanguage;

    // Assemble the popup
    toggleContainer.appendChild(languageToggle);
    
    content.appendChild(closeBtn);
    content.appendChild(title);
    content.appendChild(toggleContainer);
    content.appendChild(chineseContent);
    content.appendChild(englishContent);
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