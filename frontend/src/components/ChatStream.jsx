import { useEffect, useRef } from 'react';
import { getToken } from '../services/api';

const parseSseBlock = (block) => {
  const lines = block.split(/\r?\n/);
  let eventType = 'message';
  const dataLines = [];

  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      eventType = line.slice('event:'.length).trim() || 'message';
      return;
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
    }
  });

  return {
    eventType,
    data: dataLines.join('\n').trim(),
  };
};

const inFlightStreamIds = new Set();

const ChatStream = ({
  request,
  onToken,
  onChatId,
  onCitations,
  onWebSources,
  onUsage,
  onComplete,
  onError,
  onDone,
}) => {
  const startedRef = useRef(false);
  const handlersRef = useRef({
    onToken,
    onChatId,
    onCitations,
    onWebSources,
    onUsage,
    onComplete,
    onError,
    onDone,
  });

  useEffect(() => {
    handlersRef.current = {
      onToken,
      onChatId,
      onCitations,
      onWebSources,
      onUsage,
      onComplete,
      onError,
      onDone,
    };
  }, [onToken, onChatId, onCitations, onWebSources, onUsage, onComplete, onError, onDone]);

  useEffect(() => {
    if (!request?.question) {
      return undefined;
    }

    if (request?.id && inFlightStreamIds.has(request.id)) {
      return undefined;
    }
    if (startedRef.current) {
      return undefined;
    }
    startedRef.current = true;
    if (request?.id) {
      inFlightStreamIds.add(request.id);
    }

    const controller = new AbortController();
    let stopped = false;
    let terminalEventReceived = false;
    let meaningfulDataReceived = false;

    const isInactive = () => stopped || controller.signal.aborted;
    const safeError = (error) => {
      if (isInactive()) {
        return;
      }
      handlersRef.current.onError?.(error instanceof Error ? error : new Error('Streaming failed'));
    };

    const run = async () => {
      const token = getToken();
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const params = new URLSearchParams({
        question: request.question,
        ...(request.documentId ? { documentId: request.documentId } : {}),
        ...(request.chatId ? { chatId: request.chatId } : {}),
        ...(request.intent ? { intent: request.intent } : {}),
        ...(request.model ? { model: request.model } : {}),
        ...(request.thinkingMode ? { thinkingMode: 'true' } : {}),
        ...(request.webMode ? { webMode: 'true' } : {}),
        ...(request.projectId ? { projectId: request.projectId } : {}),
      });

      try {
        const response = await fetch(`${baseUrl}/api/chat/stream?${params.toString()}`, {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          let details = `HTTP ${response.status}`;
          try {
            const body = await response.json();
            details = body.error || body.message || details;
          } catch {
            details = response.statusText || details;
          }
          throw new Error(details);
        }

        if (!response.body) {
          throw new Error('Streaming not supported in this browser');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() ?? '';

          for (const block of blocks) {
            if (!block.trim() || block.startsWith(':')) {
              continue;
            }

            const { eventType, data } = parseSseBlock(block);
            if (!data && eventType !== 'done') {
              continue;
            }

            if (eventType === 'message') {
              meaningfulDataReceived = true;
              if (isInactive()) {
                return;
              }
              handlersRef.current.onToken?.(data);
              continue;
            }

            if (eventType === 'chatId') {
              try {
                const parsed = JSON.parse(data);
                meaningfulDataReceived = true;
                if (isInactive()) {
                  return;
                }
                handlersRef.current.onChatId?.(parsed.chatId || parsed.id);
              } catch (error) {
                safeError(error);
              }
              continue;
            }

            if (eventType === 'webSources') {
              try {
                const parsed = JSON.parse(data);
                meaningfulDataReceived = true;
                if (isInactive()) {
                  return;
                }
                handlersRef.current.onWebSources?.(parsed.webSources || []);
              } catch (error) {
                safeError(error);
              }
              continue;
            }

            if (eventType === 'usage') {
              try {
                const parsed = JSON.parse(data);
                if (isInactive()) {
                  return;
                }
                handlersRef.current.onUsage?.(parsed);
              } catch (error) {
                safeError(error);
              }
              continue;
            }

            if (eventType === 'citations') {
              try {
                const parsed = JSON.parse(data);
                meaningfulDataReceived = true;
                if (isInactive()) {
                  return;
                }
                handlersRef.current.onCitations?.(parsed);
              } catch (error) {
                safeError(error);
              }
              continue;
            }

            if (eventType === 'complete') {
              try {
                const parsed = JSON.parse(data);
                terminalEventReceived = true;
                meaningfulDataReceived = true;
                if (isInactive()) {
                  return;
                }
                handlersRef.current.onComplete?.(parsed);
              } catch (error) {
                safeError(error);
              }
              continue;
            }

            if (eventType === 'error') {
              terminalEventReceived = true;
              try {
                const parsed = JSON.parse(data);
                safeError(new Error(parsed.error || parsed.message || 'Streaming failed'));
              } catch (error) {
                safeError(error instanceof Error ? error : new Error('Streaming failed'));
              }
              return;
            }

            if (eventType === 'done') {
              terminalEventReceived = true;
              if (isInactive()) {
                return;
              }
              handlersRef.current.onDone?.();
              return;
            }
          }
        }

        if (!isInactive() && !terminalEventReceived) {
          handlersRef.current.onDone?.();
        }
      } catch (error) {
        if (controller.signal.aborted || stopped || error?.name === 'AbortError') {
          return;
        }

        // Ignore transient teardown issues once the stream has already started producing data.
        if (meaningfulDataReceived) {
          return;
        }

        safeError(error);
      }
    };

    run().finally(() => {
      if (request?.id) inFlightStreamIds.delete(request.id);
    });

    return () => {
      stopped = true;
      controller.abort();
      if (request?.id) inFlightStreamIds.delete(request.id);
    };
  }, [request]);

  return null;
};

export default ChatStream;
