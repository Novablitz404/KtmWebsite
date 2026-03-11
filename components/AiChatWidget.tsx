'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react'

type Message = {
    role: 'user' | 'assistant'
    content: string
}

export default function AiChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [showGreeting, setShowGreeting] = useState(true)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    useEffect(() => {
        scrollToBottom()
    }, [messages, scrollToBottom])

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

    // Hide greeting when chat opens or after 10 seconds
    useEffect(() => {
        if (isOpen) setShowGreeting(false)
    }, [isOpen])

    useEffect(() => {
        const timer = setTimeout(() => setShowGreeting(false), 10000)
        return () => clearTimeout(timer)
    }, [])

    async function handleSend() {
        if (!input.trim() || isLoading) return

        const userMessage: Message = { role: 'user', content: input.trim() }
        const newMessages = [...messages, userMessage]
        setMessages(newMessages)
        setInput('')
        setIsLoading(true)

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: newMessages }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Failed to get response')
            }

            // Stream the response
            const reader = res.body?.getReader()
            const decoder = new TextDecoder()
            let assistantContent = ''

            setMessages(prev => [...prev, { role: 'assistant', content: '' }])

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    const text = decoder.decode(value, { stream: true })
                    assistantContent += text
                    setMessages(prev => {
                        const updated = [...prev]
                        updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                        return updated
                    })
                }
            }
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I couldn\'t process that. Please try again.'
            }])
        } finally {
            setIsLoading(false)
        }
    }

    // Simple markdown: bold, newlines, numbered lists
    function renderContent(text: string) {
        if (!text) return null
        const lines = text.split('\n')
        return lines.map((line, i) => {
            // Bold
            const parts = line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j}>{part.slice(2, -2)}</strong>
                }
                return part
            })
            return (
                <span key={i}>
                    {parts}
                    {i < lines.length - 1 && <br />}
                </span>
            )
        })
    }

    const QUICK_PROMPTS = [
        'What is WOTF Philippines?',
        'How many clubs are affiliated?',
        'What events does WOTF organize?',
    ]

    return (
        <>
            {/* Chat Window */}
            {isOpen && (
                <div
                    className="fixed bottom-20 right-4 sm:right-6 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
                    style={{ height: 'min(520px, calc(100vh - 120px))' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                <Sparkles size={16} className="text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-sm leading-tight">HANA</p>
                                <p className="text-xs text-red-100">Your WOTF Platform Assistant</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                        {messages.length === 0 && (
                            <div className="text-center py-6">
                                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center">
                                    <Bot size={24} className="text-red-600" />
                                </div>
                                <p className="font-semibold text-gray-800 text-sm">Hi! I&apos;m HANA, your platform assistant.</p>
                                <p className="text-xs text-gray-500 mt-1 mb-4">Ask me how to use any feature.</p>
                                <div className="space-y-2">
                                    {QUICK_PROMPTS.map(prompt => (
                                        <button
                                            key={prompt}
                                            onClick={() => { setInput(prompt); }}
                                            className="block w-full text-left px-3 py-2 text-xs bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-gray-600"
                                        >
                                            💬 {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center shrink-0 mt-0.5">
                                        <Bot size={12} className="text-red-600" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-red-600 text-white rounded-br-sm'
                                    : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm shadow-sm'
                                    }`}>
                                    {msg.role === 'assistant' ? renderContent(msg.content) : msg.content}
                                    {msg.role === 'assistant' && msg.content === '' && isLoading && (
                                        <span className="flex items-center gap-1.5 text-gray-400">
                                            <Loader2 size={12} className="animate-spin" />
                                            Thinking...
                                        </span>
                                    )}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                                        <User size={12} className="text-gray-600" />
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="shrink-0 p-3 border-t border-gray-100 bg-white">
                        <form
                            onSubmit={e => { e.preventDefault(); handleSend(); }}
                            className="flex items-center gap-2"
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder="Ask a question..."
                                disabled={isLoading}
                                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 bg-gray-50"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Greeting Bubble */}
            {showGreeting && !isOpen && (
                <div className="fixed bottom-[72px] right-4 sm:right-6 z-[9999] animate-[fadeInUp_0.3s_ease-out]">
                    <div className="relative bg-white rounded-xl shadow-lg border border-gray-200 px-4 py-3 max-w-[260px]">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowGreeting(false) }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition-colors border border-gray-200"
                        >
                            <X size={10} />
                        </button>
                        <p className="text-sm text-gray-800">
                            <span className="font-bold text-red-600">Hi! I&apos;m HANA</span> 👋
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Your WOTF AI Assistant. Ask me anything!</p>
                        {/* Tail */}
                        <div className="absolute -bottom-[6px] right-6 w-3 h-3 bg-white border-b border-r border-gray-200 rotate-45" />
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-4 right-4 sm:right-6 z-[9999] w-12 h-12 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all hover:scale-105 flex items-center justify-center"
            >
                {isOpen ? (
                    <X size={22} />
                ) : (
                    <MessageCircle size={22} />
                )}
            </button>
        </>
    )
}
