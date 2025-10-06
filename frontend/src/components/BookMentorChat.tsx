//C:\Users\mohsi\Projects\learn-ease-fyp\frontend\src\components\BookMentorChat.tsx
"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { chatWithBook, ChatMessage } from "@/services/aiService";
import ReactMarkdown from "react-markdown";

const UserIcon = () => (
  <div className="w-8 h-8 rounded-full bg-orange-500 flex-shrink-0 flex items-center justify-center">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
      <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
    </svg>
  </div>
);

const MentorIcon = () => (
  <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-orange-400">
      <path d="M11.7 2.042a.75.75 0 01.6 0l5.25 2.499a.75.75 0 01.45.693v5.01c0 3.393-2.06 6.54-5.22 7.918a.75.75 0 01-.56 0c-3.16-1.378-5.22-4.525-5.22-7.918v-5.01a.75.75 0 01.45-.693l5.25-2.499z" />
      <path fillRule="evenodd" d="M12 7.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM12.75 15a.75.75 0 00-1.5 0v.008c0 .09.024.177.069.256l.02.034a1.282 1.282 0 00.228.296.83a.83 0 00.31.18c.11.03.226.046.343.046a1.125 1.125 0 001.125-1.125v-.007a.75.75 0 00-.75-.75h-.008z" clipRule="evenodd" />
    </svg>
  </div>
);

const SpinnerIcon = ({ className = "h-5 w-5 text-white" }: { className?: string }) => ( <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);

interface BookMentorChatProps {
    bookId: string;
    ChatIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>; // Use the icon from the parent
}

export const BookMentorChat: React.FC<BookMentorChatProps> = ({ bookId, ChatIcon }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const newUserMessage: ChatMessage = { sender: 'user', text: userInput };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput("");
        setIsLoading(true);
        setError(null);

        try {
            const response = await chatWithBook(bookId, userInput);
            const newAiMessage: ChatMessage = {
                sender: 'ai',
                text: response.answer,
                sources: response.sources,
            };
            setMessages(prev => [...prev, newAiMessage]);
        } catch (err: any) {
            setError(err.message || "Failed to get a response from the mentor.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl shadow-md p-4 border border-slate-200 dark:border-slate-700 flex flex-col h-[calc(100vh-4rem)] max-h-[50rem]">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-3 pb-3 border-b border-slate-300 dark:border-slate-700 flex items-center gap-2">
                <ChatIcon className="w-6 h-6 text-orange-500" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                    Book Mentor
                </span>
            </h3>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-3">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                        {msg.sender === 'ai' && <MentorIcon />}
                        <div className={`max-w-[85%] rounded-lg p-3 ${msg.sender === 'user' ? 'bg-orange-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                            </div>
                            {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                                <details className="mt-2">
                                    <summary className="text-xs cursor-pointer text-slate-500 dark:text-slate-400">Sources</summary>
                                    <div className="mt-1 space-y-2 border-t border-slate-300 dark:border-slate-600 pt-2">
                                        {msg.sources.map((source, i) => (
                                            <p key={i} className="text-xs text-slate-500 dark:text-slate-400 border-l-2 border-orange-400 pl-2 italic">
                                                "{source.slice(0, 100)}..."
                                            </p>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                        {msg.sender === 'user' && <UserIcon />}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-start gap-3">
                        <MentorIcon />
                        <div className="max-w-[85%] rounded-lg p-3 bg-slate-200 dark:bg-slate-700 flex items-center">
                            <SpinnerIcon className="w-5 h-5 text-orange-500" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {error && <p className="text-red-500 text-sm mb-2 px-1">{error}</p>}

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-300 dark:border-slate-700 pt-3">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask a question..."
                    className="flex-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="bg-orange-500 text-white rounded-lg p-2 hover:bg-orange-600 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
                    disabled={isLoading || !userInput.trim()}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                </button>
            </form>
        </div>
    );
};