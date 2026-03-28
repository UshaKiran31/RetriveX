import React from 'react'
import ReactMarkdown from 'react-markdown'

export function MessageBubble({ role, content, isStreaming }) {
  const isUser = role === 'user';
  
  return (
    <div className={`msgRow ${isUser ? 'msgRowRight' : 'msgRowLeft'}`}>
      <div className={`msgContainer ${isUser ? 'msgUser' : 'msgAssistant'}`}>
        {!isUser && (
          <div className="msgAvatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
          </div>
        )}
        <div className="msgContentWrapper">
          <div className="msgContent">
            {role === 'assistant' ? (
              <ReactMarkdown
                components={{
                  table: ({ node, ...props }) => (
                    <div className="markdownTableWrapper">
                      <table className="markdownTable" {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => (
                    <th className="markdownTh" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="markdownTd" {...props} />
                  ),
                  code: ({ node, inline, ...props }) => inline
                    ? <code className="markdownCodeInline" {...props} />
                    : <pre className="markdownCodeBlock"><code {...props} /></pre>,
                  p: ({ node, ...props }) => <p className="markdownP" {...props} />,
                }}
              >
                {content}
              </ReactMarkdown>
            ) : (
              content
            )}
          </div>
          {isStreaming && (
            <span className="typingDots">
              <span />
              <span />
              <span />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

