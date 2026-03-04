import React from 'react'

export function MessageBubble({ role, content, isStreaming }) {
  return (
    <div className={`msgRow ${role === 'user' ? 'msgRowRight' : 'msgRowLeft'}`}>
      <div className={`msgBubble ${role === 'user' ? 'msgUser' : 'msgAssistant'}`}>
        <div className="msgContent">{content}</div>
        {isStreaming && (
          <span className="typingDots">
            <span />
            <span />
            <span />
          </span>
        )}
      </div>
    </div>
  )
}

