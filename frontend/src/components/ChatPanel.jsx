import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Copy, Check, User, Bot, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import SourceCard from './SourceCard';
import ChatTable from './ChatTable';
import { extractTableFromContent } from '../utils/tableParser';

const ChatPanel = ({ 
  chatHistory, 
  onSendMessage, 
  onSummarize, 
  isThinking, 
  currentDocumentId 
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [isImproving, setIsImproving] = useState(false);

  // Check if user is at bottom of chat
  const checkIfAtBottom = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const threshold = 100; // Consider "at bottom" if within 100px
    setIsUserAtBottom(scrollHeight - scrollTop - clientHeight < threshold);
  };

  // Auto-scroll only if user is at bottom
  const scrollToBottom = () => {
    if (isUserAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Update scroll position on chat history changes
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isUserAtBottom]);

  // Monitor scroll position
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkIfAtBottom);
    checkIfAtBottom(); // Initial check

    return () => {
      container.removeEventListener('scroll', checkIfAtBottom);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isThinking && currentDocumentId) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleSummarize = () => {
    if (!isThinking && currentDocumentId) {
      onSummarize();
    }
  };

  const handleImproveText = async () => {
    if (!input.trim() || isImproving || isThinking) return;

    setIsImproving(true);
    try {
      // Call API to improve the text using Gemini
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_BASE_URL}/api/ask/improve-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ text: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to improve text');
      }

      const data = await response.json();
      if (data.improvedText) {
        setInput(data.improvedText);
      }
    } catch (error) {
      console.error('Error improving text:', error);
      // Fallback: Simple text improvement
      const improved = improveTextLocally(input);
      setInput(improved);
    } finally {
      setIsImproving(false);
    }
  };

  // Local fallback text improvement function
  const improveTextLocally = (text) => {
    if (!text.trim()) return text;
    
    // Capitalize first letter
    let improved = text.trim();
    improved = improved.charAt(0).toUpperCase() + improved.slice(1);
    
    // Ensure it ends with proper punctuation if it's a question
    if (improved.toLowerCase().includes('what') || 
        improved.toLowerCase().includes('how') || 
        improved.toLowerCase().includes('why') || 
        improved.toLowerCase().includes('when') || 
        improved.toLowerCase().includes('where') || 
        improved.toLowerCase().includes('who') ||
        improved.toLowerCase().includes('can you') ||
        improved.toLowerCase().includes('could you')) {
      if (!improved.endsWith('?') && !improved.endsWith('.')) {
        improved += '?';
      }
    } else if (!improved.endsWith('.') && !improved.endsWith('?') && !improved.endsWith('!')) {
      improved += '.';
    }
    
    return improved;
  };

  const handleCopyMessage = async (message, messageId) => {
    try {
      let textToCopy = '';

      // If message has table data, format it as a markdown table
      if (message.answer_type === 'table' && message.table) {
        const table = message.table;
        const title = table.title || 'Table';
        const columns = table.columns || [];
        const rows = table.rows || [];

        // Build markdown table
        textToCopy = `${title}\n\n`;
        
        if (columns.length > 0 && rows.length > 0) {
          // Add header row
          textToCopy += '| ' + columns.join(' | ') + ' |\n';
          // Add separator row
          textToCopy += '| ' + columns.map(() => '---').join(' | ') + ' |\n';
          // Add data rows
          rows.forEach(row => {
            textToCopy += '| ' + row.join(' | ') + ' |\n';
          });
        }

        // Add any additional text content
        if (message.content && message.content.trim()) {
          textToCopy += '\n' + message.content;
        }
      } else {
        // Regular text content
        textToCopy = message.content || '';
      }

      if (!textToCopy.trim()) {
        return; // Nothing to copy
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(textToCopy);
      
      // Show feedback
      setCopiedMessageId(messageId);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
      // Fallback for older browsers
      let textToCopy = '';
      if (message.answer_type === 'table' && message.table) {
        const table = message.table;
        const title = table.title || 'Table';
        const columns = table.columns || [];
        const rows = table.rows || [];
        textToCopy = `${title}\n\n`;
        if (columns.length > 0 && rows.length > 0) {
          textToCopy += '| ' + columns.join(' | ') + ' |\n';
          textToCopy += '| ' + columns.map(() => '---').join(' | ') + ' |\n';
          rows.forEach(row => {
            textToCopy += '| ' + row.join(' | ') + ' |\n';
          });
        }
        if (message.content && message.content.trim()) {
          textToCopy += '\n' + message.content;
        }
      } else {
        textToCopy = message.content || '';
      }
      
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedMessageId(messageId);
        setTimeout(() => {
          setCopiedMessageId(null);
        }, 2000);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent"
      >
        {chatHistory.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
                <MessageSquare className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Welcome to LexRay</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Upload a document to start asking questions and get intelligent insights
              </p>
            </div>
          </div>
        ) : (
          chatHistory.map((message, index) => {
            // Use message.id if available, otherwise fall back to index
            // Add safety checks to prevent crashes
            if (!message) return null;
            const messageKey = message.id !== undefined ? message.id : `msg-${index}`;
            const isStreaming = message.isStreaming === true;
            const hasContent = message.content && message.content.trim().length > 0;
            const hasTable = message.answer_type === 'table' && message.table;
            const hasAnyContent = hasContent || hasTable;
            const showAnalyzing = isStreaming && !hasAnyContent;
            
            // Determine message role (case-insensitive check)
            const messageRole = message.role?.toLowerCase() || 'user';
            const isUserMessage = messageRole === 'user';
            const isAiMessage = messageRole === 'ai';

            const isCopied = copiedMessageId === (message.id || messageKey);

            return (
              <div
                key={messageKey}
                className={`flex items-start gap-3 ${isUserMessage ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isUserMessage 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md'
                }`}>
                  {isUserMessage ? (
                    <User size={16} />
                  ) : (
                    <Bot size={16} />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`relative max-w-[75%] rounded-2xl px-5 py-3.5 transition-all duration-200 group shadow-sm ${
                  isUserMessage
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                }`}>
                  {/* Copy button for AI messages */}
                  {isAiMessage && hasAnyContent && !isStreaming && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyMessage(message, messageKey);
                      }}
                      className="absolute -top-1 -right-1 p-1.5 rounded-full bg-white shadow-md hover:bg-slate-50 transition-all text-slate-500 hover:text-indigo-600 opacity-0 group-hover:opacity-100"
                      title={isCopied ? 'Copied!' : 'Copy message'}
                      aria-label="Copy message"
                    >
                      {isCopied ? (
                        <Check size={14} className="text-green-600" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  )}
                  {isAiMessage ? (
                    // AI message rendering
                    <div className="prose prose-sm max-w-none prose-slate">
                      {showAnalyzing ? (
                        // Show "Analyzing..." until first chunk arrives
                        <div className="flex items-center gap-2.5 text-slate-600">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                          <span className="text-sm font-medium">Analyzing document...</span>
                        </div>
                      ) : !hasAnyContent && !isStreaming ? (
                        // Empty response fallback
                        <div className="text-slate-500 italic text-sm flex items-center gap-2">
                          <span>⚠️</span>
                          <span>AI returned an empty response. Please try asking your question again.</span>
                        </div>
                      ) : (
                        // Check if response is a table
                        message.answer_type === 'table' && message.table ? (
                          <>
                            <ChatTable
                              title={message.table.title}
                              columns={message.table.columns}
                              rows={message.table.rows}
                            />
                            {/* Fallback text if provided */}
                            {message.answer && (
                              <div className="mt-4">
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => (
                                      <p className="mb-2 last:mb-0">{children}</p>
                                    ),
                                  }}
                                >
                                  {message.answer}
                                </ReactMarkdown>
                              </div>
                            )}
                            {/* Blinking cursor while streaming */}
                            {isStreaming && hasContent && (
                              <span className="inline-block w-0.5 h-4 bg-slate-600 ml-1 animate-blink align-middle">
                                |
                              </span>
                            )}
                          </>
                        ) : (
                          (() => {
                            // Try to extract markdown table from content
                            const content = message.content || '';
                            const { table: extractedTable, remainingContent } = extractTableFromContent(content);

                            if (extractedTable) {
                              return (
                                <>
                                  {/* Render extracted table */}
                                  <ChatTable
                                    columns={extractedTable.columns}
                                    rows={extractedTable.rows}
                                  />
                                  {/* Render remaining content (text before/after table) */}
                                  {remainingContent && (
                                    <div className="mt-4">
                                      <ReactMarkdown
                                        components={{
                                          p: ({ children }) => (
                                            <p className="mb-2 last:mb-0">{children}</p>
                                          ),
                                          strong: ({ children }) => (
                                            <strong className="font-semibold">{children}</strong>
                                          ),
                                          ul: ({ children }) => (
                                            <ul className="list-disc list-inside mb-2 space-y-1">
                                              {children}
                                            </ul>
                                          ),
                                          ol: ({ children }) => (
                                            <ol className="list-decimal list-inside mb-2 space-y-1">
                                              {children}
                                            </ol>
                                          ),
                                        }}
                                      >
                                        {remainingContent}
                                      </ReactMarkdown>
                                    </div>
                                  )}
                                  {/* Blinking cursor while streaming */}
                                  {isStreaming && hasContent && (
                                    <span className="inline-block w-0.5 h-4 bg-slate-600 ml-1 animate-blink align-middle">
                                      |
                                    </span>
                                  )}
                                </>
                              );
                            }

                            // Default: Show content with markdown rendering
                            const displayContent = content;//|| 'No response generated.';
                            return (
                              <>
                                {displayContent && (
                                  <ReactMarkdown
                                    components={{
                                      p: ({ children }) => (
                                        <p className="mb-3 last:mb-0 text-slate-700 leading-relaxed">{children}</p>
                                      ),
                                      strong: ({ children }) => (
                                        <strong className="font-semibold text-slate-900">{children}</strong>
                                      ),
                                      ul: ({ children }) => (
                                        <ul className="list-disc list-outside mb-3 space-y-1.5 ml-4 text-slate-700">
                                          {children}
                                        </ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="list-decimal list-outside mb-3 space-y-1.5 ml-4 text-slate-700">
                                          {children}
                                        </ol>
                                      ),
                                      table: ({ children }) => (
                                        <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 shadow-sm">
                                          <table className="min-w-full divide-y divide-slate-200">
                                            {children}
                                          </table>
                                        </div>
                                      ),
                                      th: ({ children }) => (
                                        <th className="px-4 py-3 bg-slate-50 font-semibold text-left text-slate-900 text-sm">
                                          {children}
                                        </th>
                                      ),
                                      td: ({ children }) => (
                                        <td className="px-4 py-3 text-slate-700 text-sm border-t border-slate-100">
                                          {children}
                                        </td>
                                      ),
                                      code: ({ children }) => (
                                        <code className="px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded text-sm font-mono">
                                          {children}
                                        </code>
                                      ),
                                      pre: ({ children }) => (
                                        <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto my-3 text-sm font-mono">
                                          {children}
                                        </pre>
                                      ),
                                      blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-slate-600 my-3">
                                          {children}
                                        </blockquote>
                                      ),
                                    }}
                                  >
                                    {displayContent}
                                  </ReactMarkdown>
                                )}
                                {/* Blinking cursor while streaming */}
                                {isStreaming && hasContent && (
                                  <span className="inline-block w-0.5 h-4 bg-slate-600 ml-1 animate-blink align-middle">
                                    |
                                  </span>
                                )}
                              </>
                            );
                          })()
                        )
                      )}
                      {/* Sources/chunks hidden per user request */}
                      {/* {message.sources && (
                        <SourceCard sources={message.sources} />
                      )} */}
                    </div>
                  ) : (
                    // User message or any other non-AI message - always display content
                    <p className="whitespace-pre-wrap text-white leading-relaxed">
                      {message.content || ''}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="border-t border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg">
        <div className="p-4">
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  currentDocumentId
                    ? 'Ask a question about the document...'
                    : 'Upload a document first...'
                }
                disabled={!currentDocumentId || isThinking}
                className="w-full px-4 py-3 pr-20 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400 transition-all shadow-sm"
              />
              {/* Multicolor Star Icon for improving text */}
              {input.trim() && !isThinking && (
                <button
                  type="button"
                  onClick={handleImproveText}
                  disabled={isImproving}
                  className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  title="Improve your question"
                >
                  {isImproving ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <div className="relative">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="star-blink">
                        <defs>
                          <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="50%" stopColor="#ec4899" />
                            <stop offset="100%" stopColor="#9333ea" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                          fill="none"
                          stroke="url(#starGradient)"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              )}
              {isThinking && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSummarize}
              disabled={!currentDocumentId || isThinking}
              className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-xl hover:from-indigo-100 hover:to-purple-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm border border-indigo-100"
              title="Summarize document"
            >
              <Sparkles size={18} />
              <span className="hidden sm:inline text-sm font-medium">Summarize</span>
            </button>
            <button
              type="submit"
              disabled={!input.trim() || !currentDocumentId || isThinking}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md hover:shadow-lg font-medium"
            >
              <Send size={18} />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;

