'use client';

import dynamic from 'next/dynamic';

const ChatWidget = dynamic(() => import('./Chatbot/ChatWidget'), { ssr: false });

export default function ChatbotLoader() {
    return <ChatWidget />;
}
