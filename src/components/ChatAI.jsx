import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function ChatAI({ currentTemp, currentHum, isDarkMode, tempStatus }) {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Halo! Saya asisten AI untuk dashboard ruangan es krim. Saya bisa membantu Anda memahami kondisi ruangan saat ini. Ada yang ingin ditanyakan?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getRoomContext = () => {
        return `
Informasi Ruangan Saat Ini:
- Suhu: ${currentTemp}°C (Status: ${tempStatus})
- Kelembaban: ${currentHum}%
- Kondisi: ${currentTemp < 28 ? 'Dingin Optimal' : currentTemp <= 33 ? 'Sedang - Perlu Perhatian' : 'Panas - Bahaya!'}
- Rekomendasi Suhu Ideal untuk Es Krim: -18°C hingga -23°C

Anda adalah asisten AI untuk dashboard monitoring ruangan penyimpanan es krim. Bantu user memahami kondisi ruangan dan berikan saran jika diperlukan. Jawab dalam bahasa Indonesia yang ramah dan profesional.
        `.trim();
    };

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        const userInput = input;
        setInput('');
        setIsLoading(true);

        try {
            if (!genAI) {
                throw new Error('VITE_GEMINI_API_KEY belum diset di environment.');
            }

            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

            // Build full conversation context
            const conversationHistory = messages
                .filter(msg => msg.role !== 'system')
                .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
                .join('\n\n');

            // Create comprehensive prompt with context
            const fullPrompt = `${getRoomContext()}

${conversationHistory ? 'Riwayat Percakapan:\n' + conversationHistory + '\n\n' : ''}User: ${userInput}

Jawab pertanyaan user dengan ramah dan informatif dalam bahasa Indonesia.`;

            console.log('Sending prompt to Gemini:', fullPrompt);

            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();

            console.log('Gemini response:', text);

            setMessages(prev => [...prev, { role: 'assistant', content: text }]);
        } catch (error) {
            console.error('Error calling Gemini AI:', error);
            console.error('Error details:', error.message, error.stack);

            let errorMessage = 'Maaf, terjadi kesalahan saat memproses permintaan Anda.';

            if (error.message?.includes('API key')) {
                errorMessage = 'Maaf, ada masalah dengan API key. Silakan periksa konfigurasi.';
            } else if (error.message?.includes('quota')) {
                errorMessage = 'Maaf, quota API sudah habis. Silakan coba lagi nanti.';
            } else if (error.message?.includes('SAFETY')) {
                errorMessage = 'Maaf, pertanyaan Anda tidak dapat diproses karena filter keamanan. Silakan coba pertanyaan lain.';
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMessage + ' Error: ' + (error.message || 'Unknown error')
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const themeClasses = isDarkMode
        ? {
            card: 'bg-slate-800/80 backdrop-blur-md border-slate-700',
            header: 'bg-slate-900/50 text-white border-slate-700',
            messageUser: 'bg-blue-600 text-white',
            messageAI: 'bg-slate-700/80 text-slate-100',
            input: 'bg-slate-700 border-slate-600 text-white placeholder-slate-400',
            button: 'bg-blue-600 hover:bg-blue-700 text-white',
            text: 'text-slate-300'
        }
        : {
            card: 'bg-white backdrop-blur-md border-slate-200 shadow-lg',
            header: 'bg-slate-50 text-slate-800 border-slate-200',
            messageUser: 'bg-blue-500 text-white',
            messageAI: 'bg-slate-100 text-slate-800',
            input: 'bg-white border-slate-300 text-slate-800 placeholder-slate-400',
            button: 'bg-blue-500 hover:bg-blue-600 text-white',
            text: 'text-slate-600'
        };

    return (
        <div className={`${themeClasses.card} border rounded-2xl overflow-hidden`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${themeClasses.header}`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                        <MessageSquare size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">AI Assistant</h2>
                        <p className={`text-xs ${themeClasses.text}`}>
                            Suhu: {currentTemp}°C | Kelembaban: {currentHum}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="overflow-y-auto p-6 space-y-4" style={{ height: '400px' }}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user' ? themeClasses.messageUser : themeClasses.messageAI
                                } shadow-md`}
                        >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className={`px-4 py-3 rounded-2xl ${themeClasses.messageAI} shadow-md flex items-center gap-2`}>
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm">Mengetik...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`border-t px-6 py-4 ${themeClasses.header}`}>
                <div className="flex gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Tanyakan tentang kondisi ruangan..."
                        className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 ${themeClasses.input}`}
                        disabled={isLoading}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className={`px-6 py-3 rounded-xl font-semibold transition-all ${themeClasses.button} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                    >
                        {isLoading ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : (
                            <Send size={20} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
