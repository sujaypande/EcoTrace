'use client'
import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from 'react'
import { Send, Loader2, MessageCircle, HelpCircle } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type ChatApiResponse = {
  role?: 'assistant'
  content?: string
  message?: string
  error?: string
}

const suggestedQuestions = [
  'What is e-waste?',
  'How do I earn rewards?',
  'What waste types are accepted?',
  'How does the platform work?'
]

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Welcome to EcoTrace Assistant! I can help with waste collection, rewards, recycling services, pickup scheduling, and transparent waste tracking. What would you like to know?",
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    const userMessage: Message = { role: 'user', content: input.trim() }
    const currentMessages = [...messages, userMessage]
    setMessages(currentMessages)
    setInput('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: currentMessages,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = (await response.json()) as ChatApiResponse
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content || data.message || 'Sorry, I could not process your request.',
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleSuggestedQuestionClick = (
    e: MouseEvent<HTMLButtonElement>,
    question: string
  ) => {
    e.preventDefault()
    setInput(question)
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <MessageCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">EcoTrace Assistant</h1>
            <p className="text-sm text-gray-600">Your smart e-waste guidance companion</p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="max-w-4xl mx-auto w-full">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
              <div className={`max-w-2xl rounded-lg p-4 ${
                msg.role === 'user' 
                  ? 'bg-green-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow'
              }`}>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white text-gray-800 border border-gray-200 rounded-lg p-4 rounded-bl-none shadow">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="max-w-4xl mx-auto w-full px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {suggestedQuestions.map((question, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleSuggestedQuestionClick(e, question)}
                className="p-3 text-left text-sm bg-white border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition text-gray-700 flex items-start gap-2"
              >
                <HelpCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask EcoTrace about e-waste collection, recycling, or tracking..."
              className="flex-grow px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Powered by EcoTrace</p>
        </form>
      </div>
    </div>
  )
}
