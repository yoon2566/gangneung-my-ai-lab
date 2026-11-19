import html from './index.html';

const MODEL = 'anthropic/claude-haiku-5.5';
const MAX_TURNS = 12;        // 한 번에 보내는 대화 수
const MAX_CHARS = 2000;      // 메시지 하나의 최대 글자 수
const PER_MINUTE = 8;        // 같은 접속자 1분당 요청 수 (인스턴스 단위 간이 제한)
const hits = new Map();

const SECURITY = {'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...SECURITY}});

function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 60000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > PER_MINUTE;
}

function systemPrompt(lesson) {
  return [
    '너는 강원도 강릉 주민을 위한 AI 교육 실습 도우미 "마이AI랩"이다.',
    '학습자는 AI를 처음 쓰는 어르신, 소상공인, 직장인 등 다양하다.',
    '쉬운 우리말로, 짧은 문장과 번호 목록을 써서 바로 따라 할 수 있게 답한다. 어려운 영어 용어는 쉬운 말로 풀어 쓴다.',
    '마크다운 기호(#, **, 표)는 쓰지 말고 일반 글로 쓴다.',
    '개인정보(주민번호, 계좌, 전화번호 등)를 입력하지 않도록 필요하면 부드럽게 알려준다.',
    '모르는 사실이나 실제 금액·법령·일정은 지어내지 말고 확인이 필요하다고 말한다.',
    '답변은 600자 안팎으로 하고, 마지막에 "직접 해보기:"로 시작하는 한 줄 과제를 붙인다.',
    lesson ? `지금 수업: ${lesson.title}\n수업 소개: ${lesson.intro}\n오늘의 결과물: ${lesson.output}` : ''
  ].join('\n');
}

async function chat(request, env) {
  if (!env.OPENROUTER_API_KEY) return json({error:'AI 연결이 아직 설정되지 않았어요.'}, 503);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (limited(ip)) return json({error:'잠시 후 다시 시도해 주세요. (1분에 8번까지)'}, 429);
  let body;
  try { body = await request.json(); } catch { return json({error:'요청 형식이 올바르지 않아요.'}, 400); }
  const clip = (s, n) => String(s || '').slice(0, n);
  const lesson = body.lesson ? {title:clip(body.lesson.title, 100), intro:clip(body.lesson.intro, 400), output:clip(body.lesson.output, 200)} : null;
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_TURNS)
    .map(m => ({role:m.role, content:clip(m.text, MAX_CHARS)}));
  if (!messages.length || messages[messages.length - 1].role !== 'user') return json({error:'질문을 입력해 주세요.'}, 400);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method:'POST',
    headers:{'Authorization':`Bearer ${env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','HTTP-Referer':new URL(request.url).origin,'X-Title':'My AI Lab Gangneung'},
    body:JSON.stringify({model:MODEL, max_tokens:1500, temperature:0.5, reasoning:{enabled:false}, messages:[{role:'system', content:systemPrompt(lesson)}, ...messages]})
  });
  if (!res.ok) {
    const status = res.status === 402 ? 402 : 502;
    return json({error: status === 402 ? '체험용 AI 사용 한도를 모두 썼어요.' : 'AI 응답을 받지 못했어요.'}, status);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) return json({error:'AI 응답이 비어 있어요.'}, 502);
  const cut = data.choices[0].finish_reason === 'length' ? '\n\n(답변이 길어 여기서 끊겼어요. "이어서 써줘"라고 보내 보세요.)' : '';
  return json({text:text + cut, model:MODEL});
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/chat') {
      if (request.method !== 'POST') return json({error:'Method not allowed'}, 405);
      try { return await chat(request, env); } catch { return json({error:'일시적인 오류가 났어요.'}, 500); }
    }
    if (path !== '/' && path !== '/index.html') return new Response('Not found', {status:404});
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
    return new Response(request.method === 'HEAD' ? null : html, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache',...SECURITY}});
  }
};
