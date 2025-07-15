import { useCallback, useRef, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: Date;
}

interface UseChatOptions {
  onResponse?: (response: Response) => void;
  onFinish?: () => void;
  onError?: (error: Error) => void;
  onToolCall?: (tool: any) => void;
  useGeminiOnly?: boolean;
}

interface UseChatReturn {
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  stop: () => void;
  setMessages: (messages: Message[]) => void;
  setInput: (input: string) => void;
  reload: () => void;
  addToolResult: (result: any) => void;
  append: (message: Message) => void;
}

export function useCustomChat(options: UseChatOptions = {}): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 handleSubmit called with input:', input, 'isLoading:', isLoading);
    
    if (!input.trim() || isLoading) {
      console.log('🚀 handleSubmit aborted - no input or loading');
      return;
    }

    console.log('🚀 Starting chat submission with input:', input);
    console.log('🚀 Current messages state:', messages);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      createdAt: new Date(),
    };

    const newMessages = [...messages, userMessage];
    console.log('📝 Adding user message, total messages:', newMessages.length);
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      console.log('🌐 Making API call to /api/chat');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          useGeminiOnly: options.useGeminiOnly || false,
        }),
        signal: abortControllerRef.current.signal,
      });

      console.log('📡 API Response status:', response.status);
      console.log('📡 API Response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      options.onResponse?.(response);

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      console.log('📖 Starting to read stream...');
      const decoder = new TextDecoder();
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      };

      // Add the assistant message to the state
      const messagesWithAssistant = [...newMessages, assistantMessage];
      console.log('🤖 Added assistant message, total messages:', messagesWithAssistant.length);
      setMessages(messagesWithAssistant);

      let buffer = '';
      let chunkCount = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('✅ Stream reading completed');
          break;
        }

        chunkCount++;
        const chunk = decoder.decode(value, { stream: true });
        console.log(`📦 Received chunk ${chunkCount}:`, chunk);
        
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          console.log('🔍 Processing line:', line);
          
          if (line.startsWith('0:')) {
            try {
              const jsonData = line.substring(2);
              console.log('📊 Parsing JSON:', jsonData);
              const data = JSON.parse(jsonData);
              
              if (data.type === 'text-delta') {
                assistantMessage.content += data.textDelta;
                console.log('💬 Received text delta:', data.textDelta);
                console.log('📝 Updated assistant message content:', assistantMessage.content);
                
                // Update the messages state with the new content
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    // Create a new message object to trigger re-render
                    const updatedMessage = {
                      ...lastMessage,
                      content: assistantMessage.content
                    };
                    newMessages[newMessages.length - 1] = updatedMessage;
                    console.log('🔄 Updated last message content:', updatedMessage.content);
                  }
                  return newMessages;
                });
              } else if (data.type === 'finish') {
                console.log('🏁 Received finish event');
                setIsLoading(false);
                options.onFinish?.();
                
                // Ensure final message is properly set with a new object
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    const finalMessage = {
                      ...lastMessage,
                      content: assistantMessage.content
                    };
                    newMessages[newMessages.length - 1] = finalMessage;
                    console.log('🔄 Final message content:', finalMessage.content);
                  }
                  console.log('🏁 Final messages state:', newMessages);
                  return newMessages;
                });
                break;
              }
            } catch (error) {
              console.error('❌ Error parsing streaming data:', error);
              console.error('❌ Line that caused error:', line);
            }
          } else {
            console.log('⚠️ Unexpected line format:', line);
          }
        }
      }

    } catch (error) {
      console.error('❌ Chat submission error:', error);
      setIsLoading(false);
      if (error instanceof Error && error.name !== 'AbortError') {
        options.onError?.(error);
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [input, messages, isLoading, options]);

  const setInputValue = useCallback((value: string) => {
    setInput(value);
  }, []);

  const reload = useCallback(() => {
    // Implement reload logic if needed
  }, []);

  const addToolResult = useCallback((result: any) => {
    // Implement tool result logic if needed
  }, []);

  const append = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    setMessages,
    setInput: setInputValue,
    reload,
    addToolResult,
    append,
  };
}
