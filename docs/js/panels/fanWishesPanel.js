export const fanWishesPanel = (properties) => {
    // Sort all messages by timestamp in descending order (newest first)
    const allMessages = window.fanWishesData || [];
    const sortedMessages = [...allMessages].sort((a, b) => 
        new Date(b.properties.timestamp) - new Date(a.properties.timestamp)
    );

    // Highlight the selected message
    const isSelected = (msg) => 
        msg.properties.timestamp === properties.timestamp && 
        msg.properties.fan_name === properties.fan_name;

    // Generate the message thread HTML
    const messageThread = sortedMessages.map(message => `
        <div class="message-card ${isSelected(message) ? 'selected' : ''}" 
             data-timestamp="${message.properties.timestamp}"
             data-fan-name="${message.properties.fan_name || 'Anonymous'}"
             onclick="selectFanWish(this)">
            <div class="message-header">
                <div class="user-info">
                    <span class="emoji">👤</span>
                    <strong>${message.properties.fan_name || 'Anonymous'}</strong>
                </div>
                <span class="message-date">${new Date(message.properties.timestamp).toLocaleDateString()}</span>
            </div>
            <div class="message-location">
                <span class="emoji">📍</span>
                ${message.properties.city}, ${message.properties.country}
            </div>
            <div class="message-content">${message.properties.message}</div>
        </div>
    `).join('');

    return {
        header: `
            <div class="panel-header">
                <h2>💌 Fan Wishes</h2>
            </div>
            <p class="thread-info">${sortedMessages.length} messages</p>
        `,
        info: `
            <div class="message-thread">
                ${messageThread}
            </div>
        `,
        styles: `
            <style>
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 10px;
                }

                .message-thread {
                    max-height: calc(100vh - 200px);
                    overflow-y: auto;
                    padding: 15px;
                }

                .message-card {
                    background: white;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 20px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border: 2px solid transparent;
                }

                .message-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }

                .message-card.selected {
                    border-color: #2196f3;
                    background: #e3f2fd;
                }

                .message-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .emoji {
                    font-size: 1.2em;
                }

                .message-date {
                    color: #666;
                    font-size: 0.9em;
                }

                .message-location {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #666;
                    font-size: 0.95em;
                    margin-bottom: 12px;
                }

                .message-content {
                    line-height: 1.6;
                    color: #333;
                    font-size: 1.05em;
                }

                .thread-info {
                    color: #666;
                    text-align: center;
                    margin: 5px 0 15px;
                    font-size: 0.9em;
                }
            </style>
        `
    };
}; 