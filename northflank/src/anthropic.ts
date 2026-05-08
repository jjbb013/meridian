/**
 * Anthropic API ↔ OpenAI API 协议转换
 * 支持 /v1/messages 和 /v1/models
 */

import { Request, Response } from 'express';
import { getNextKey, recordUsage, getSetting } from './keyManager';

const UPSTREAM_BASE = 'https://api.kimi.com/coding';
const ANTHROPIC_VERSION = '2023-06-01';

// Map any Anthropic model name to Kimi's model
const MODEL_MAP: Record<string, string> = {
  'claude-3-5-sonnet-20241022': 'kimi-for-coding',
  'claude-3-5-sonnet-latest': 'kimi-for-coding',
  'claude-3-opus-20240229': 'kimi-for-coding',
  'claude-3-haiku-20240307': 'kimi-for-coding',
  'claude-3-sonnet-20240229': 'kimi-for-coding',
};

function mapModel(name: string): string {
  return MODEL_MAP[name] || 'kimi-for-coding';
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string }>;
}

function convertMessages(msgs: AnthropicMessage[]): Array<{ role: string; content: string }> {
  return msgs.map(m => ({
    role: m.role,
    content: typeof m.content === 'string' ? m.content : m.content.map(c => c.text).join(''),
  }));
}

function toAnthropicContent(text: string): Array<{ type: 'text'; text: string }> {
  return [{ type: 'text', text }];
}

export async function handleAnthropicMessages(req: Request, res: Response): Promise<void> {
  const keyRecord = getNextKey();
  if (!keyRecord) {
    res.status(503).json({ type: 'error', error: { type: 'overloaded_error', message: 'No API keys configured' } });
    return;
  }

  const body = req.body;
  const isStreaming = body.stream === true;
  const model = mapModel(body.model);

  const openaiBody: Record<string, unknown> = {
    model,
    messages: convertMessages(body.messages),
    stream: isStreaming,
  };
  if (body.max_tokens) openaiBody.max_tokens = body.max_tokens;
  if (body.temperature !== undefined) openaiBody.temperature = body.temperature;
  if (body.top_p !== undefined) openaiBody.top_p = body.top_p;

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('Host', 'api.kimi.com');
  headers.set('User-Agent', getSetting('user_agent') || 'claude-code/1.0');
  headers.set('Authorization', `Bearer ${keyRecord.key}`);

  const start = Date.now();
  let success = false;
  let statusCode = 0;

  try {
    const upstreamRes = await fetch(`${UPSTREAM_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(openaiBody),
    });

    statusCode = upstreamRes.status;
    success = upstreamRes.ok;
    const latency = Date.now() - start;
    recordUsage(keyRecord.id, success, statusCode, latency, success ? undefined : `HTTP ${statusCode}`);

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      res.status(upstreamRes.status).json({
        type: 'error',
        error: { type: 'api_error', message: errText },
      });
      return;
    }

    if (isStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Proxy-Service', 'meridian');
      res.flushHeaders?.();

      const reader = upstreamRes.body?.getReader();
      if (!reader) {
        res.end();
        return;
      }

      let buffer = '';
      const id = 'msg_' + Math.random().toString(36).slice(2, 14);

      // Send message_start
      res.write(`event: message_start\ndata: ${JSON.stringify({
        type: 'message_start',
        message: { id, type: 'message', role: 'assistant', content: [], model: body.model, stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } },
      })}\n\n`);

      // Send content_block_start
      res.write(`event: content_block_start\ndata: ${JSON.stringify({
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' },
      })}\n\n`);

      let inputTokens = 0;
      let outputTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += new TextDecoder().decode(value);
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;
          try {
            const chunk = JSON.parse(jsonStr);
            const delta = chunk.choices?.[0]?.delta;
            if (delta?.content) {
              res.write(`event: content_block_delta\ndata: ${JSON.stringify({
                type: 'content_block_delta',
                index: 0,
                delta: { type: 'text_delta', text: delta.content },
              })}\n\n`);
            }
            if (delta?.role) {
              // role event, ignore
            }
            if (chunk.usage) {
              inputTokens = chunk.usage.prompt_tokens || inputTokens;
              outputTokens = chunk.usage.completion_tokens || outputTokens;
            }
          } catch {
            // ignore malformed JSON
          }
        }
      }

      // Send content_block_stop
      res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}\n\n`);

      // Send message_delta with usage
      res.write(`event: message_delta\ndata: ${JSON.stringify({
        type: 'message_delta',
        delta: { stop_reason: 'end_turn', stop_sequence: null },
        usage: { output_tokens: outputTokens },
      })}\n\n`);

      // Send message_stop
      res.write(`event: message_stop\ndata: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
      res.end();
    } else {
      const upstreamJson = await upstreamRes.json();
      const text = upstreamJson.choices?.[0]?.message?.content || '';
      const promptTokens = upstreamJson.usage?.prompt_tokens || 0;
      const completionTokens = upstreamJson.usage?.completion_tokens || 0;

      res.json({
        id: upstreamJson.id || 'msg_' + Math.random().toString(36).slice(2, 14),
        type: 'message',
        role: 'assistant',
        model: body.model,
        content: toAnthropicContent(text),
        stop_reason: upstreamJson.choices?.[0]?.finish_reason === 'stop' ? 'end_turn' : null,
        stop_sequence: null,
        usage: {
          input_tokens: promptTokens,
          output_tokens: completionTokens,
        },
      });
    }
  } catch (err) {
    const latency = Date.now() - start;
    const msg = err instanceof Error ? err.message : 'Unknown error';
    recordUsage(keyRecord.id, false, 0, latency, msg);
    res.status(502).json({ type: 'error', error: { type: 'api_error', message: msg } });
  }
}

export async function handleAnthropicModels(_req: Request, res: Response): Promise<void> {
  res.json({
    data: [
      {
        type: 'model',
        id: 'claude-3-5-sonnet-20241022',
        display_name: 'Claude 3.5 Sonnet',
        created_at: '2024-10-22T00:00:00Z',
      },
      {
        type: 'model',
        id: 'claude-3-5-sonnet-latest',
        display_name: 'Claude 3.5 Sonnet (latest)',
        created_at: '2024-10-22T00:00:00Z',
      },
    ],
    has_more: false,
    first_id: 'claude-3-5-sonnet-20241022',
    last_id: 'claude-3-5-sonnet-latest',
  });
}
