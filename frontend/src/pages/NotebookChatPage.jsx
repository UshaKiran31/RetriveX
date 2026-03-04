import React, { useState } from 'react'

export function NotebookChatPage() {
    // Placeholder for now
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I have analyzed your documents. Ask me anything about them.' }
    ])
    const [input, setInput] = useState('')

    const sendMessage = () => {
        if (!input.trim()) return
        setMessages(prev => [...prev, { role: 'user', content: input }])
        setInput('')
        
        // Simulate response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm still learning to answer questions based on your files. Stay tuned!" }])
        }, 1000)
    }

    return (
        <div className="chatLayout">
            <aside className="chatSidebar">
                <div className="sidebarHeader">
                    <a href="#/notebooks" className="backBtn">← Back</a>
                </div>
                <div className="sourcesList">
                    <h3>Sources</h3>
                    <div className="sourceItem">File 1.pdf</div>
                    <div className="sourceItem">File 2.docx</div>
                </div>
            </aside>
            <main className="chatMain">
                <div className="chatMessages">
                    {messages.map((msg, i) => (
                        <div key={i} className={`message ${msg.role}`}>
                            <div className="messageContent">{msg.content}</div>
                        </div>
                    ))}
                </div>
                <div className="chatInputArea">
                    <div className="chatInputWrapper">
                        <input 
                            className="chatInput"
                            type="text" 
                            placeholder="Ask a question..." 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        />
                        <button className="sendBtn" onClick={sendMessage}>→</button>
                    </div>
                    <div className="chatDisclaimer">
                        NotebookLM can be inaccurate; please double-check its responses.
                    </div>
                </div>
            </main>
        </div>
    )
}
