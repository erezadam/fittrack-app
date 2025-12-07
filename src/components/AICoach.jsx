import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/aiService';
import { storageService } from '../services/storageService';

export default function AICoach({ onClose, onStartWorkout }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [exercises, setExercises] = useState([]);
    const [lastWorkout, setLastWorkout] = useState(null);
    const messagesEndRef = useRef(null);

    // Conversation state to track the flow
    const [conversationState, setConversationState] = useState({
        phase: 'assessment', // assessment, interview_scope, interview_goal, planning, review
        inputs: {}
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const loadData = async () => {
        const exList = await storageService.getExercises();
        setExercises(exList);
        const last = await storageService.getLastWorkout();
        setLastWorkout(last);

        // Initial Silent Assessment
        handleAIInteraction('start', last, exList);
    };

    const handleAIInteraction = async (userInput, history, exerciseList) => {
        setLoading(true);

        // Prepare context based on state
        const context = {
            lastWorkout: history || lastWorkout,
            currentState: conversationState,
            userMessage: userInput
        };

        const response = await aiService.generateWorkoutPlan(context, conversationState.inputs, exerciseList || exercises);

        setLoading(false);

        if (response.message) {
            setMessages(prev => [...prev, { sender: 'ai', text: response.message }]);
        }

        if (response.plan) {
            // If a plan is returned, we might be in review or done
            // For now, just show the plan summary in the message
        }
    };

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Update state inputs based on simple heuristics or let AI handle it?
        // Ideally, we send the conversation history or the latest input to the AI.
        // For this MVP, we'll just send the latest input and let the AI (via the prompt) figure out the state.
        // We update the conversationState locally if needed, but the AI service is stateless in this simple implementation
        // unless we pass the full history. 
        // Let's pass the accumulated inputs.

        handleAIInteraction(input);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(5px)' }}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-md h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🤖</span>
                        <div>
                            <h2 className="font-bold text-lg">Apex Coach</h2>
                            <p className="text-xs opacity-80">AI Personal Trainer</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-1 w-8 h-8 flex items-center justify-center">
                        ✕
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.sender === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm'
                                }`}>
                                <div className="whitespace-pre-wrap">{msg.text}</div>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-gray-700 p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type your answer..."
                            className="flex-1 p-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || loading}
                            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            ➤
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
