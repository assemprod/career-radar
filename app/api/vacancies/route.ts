import { NextRequest, NextResponse } from 'next/server';
import { REGION_AREAS, ROLE_QUERIES, type RegionId, type RoleId } from '@/lib/profile';
import type { Vacancy } from '@/lib/jobs';

export const runtime = 'nodejs';

const isRole = (v: string): v is RoleId => Object.prototype.hasOwnProperty.call(ROLE_QUERIES, v);
const isRegion = (v: string): v is RegionId => Object.prototype.hasOwnProperty.call(REGION_AREAS, v);

type HHResult = {
  found?: number;
  items?: Array<{
    id: string; name: string; alternate_url: string;
    employer?: { name?: string }; area?: { name?: string }; published_at?: string;
    salary?: { from?: number | null; to?: number | null; currency?: string; gross?: boolean | null } | null;
    salary_range?: { from?: number | null; to?: number | null; currency?: string; gross?: boolean | null } | null;
    experience?: { name?: string }; schedule?: { name?: string };
    work_format?: Array<{ id?: string; name?: string }>;
    snippet?: { requirement?: string | null; responsibility?: string | null };
  }>;
};

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 650);
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const roleRaw = params.get('role') ?? 'all';
  const regionRaw = params.get('region') ?? 'all';
  if (!isRole(roleRaw) || !isRegion(regionRaw)) {
    return NextResponse.json({ error: 'Неизвестные фильтры поиска.' }, { status: 400 });
  }

  const keyword = (params.get('q') || '').trim().slice(0, 90);
  // Search by name; user input is surrounded by quotes to limit query operators.
  const safeKeyword = keyword.replace(/["()!:]/g, ' ').replace(/\s+/g, ' ').trim();
  const text = safeKeyword ? safeKeyword : ROLE_QUERIES[roleRaw];
  const query = new URLSearchParams({
    text,
    host: 'hh.kz',
    area: REGION_AREAS[regionRaw],
    per_page: '60',
    page: '0',
    order_by: 'publication_time',
    period: '30',
  });
  const apiUrl = `https://api.hh.ru/vacancies?${query.toString()}`;
  const token = process.env.HH_OAUTH_TOKEN?.trim();
  const contact = process.env.HH_API_CONTACT?.trim() || 'developer@example.com';
  try {
    const res = await fetch(apiUrl, {
      headers: {
        'HH-User-Agent': `CareerRadar/0.1 (${contact})`,
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(12000),
    });
    if (res.status === 403 || res.status === 401) {
      return NextResponse.json({
        source: 'hh.kz', items: [], found: 0, status: 'auth_required',
        error: 'HeadHunter запросил авторизацию или капчу. Добавь действующий OAuth-токен hh.kz в HH_OAUTH_TOKEN и проверь права приложения.',
      }, { status: 200 });
    }
    if (!res.ok) {
      return NextResponse.json({ source: 'hh.kz', items: [], found: 0, status: 'unavailable', error: `HeadHunter временно недоступен (HTTP ${res.status}).` }, { status: 200 });
    }
    const body = await res.json() as HHResult;
    const items: Vacancy[] = (body.items ?? []).map((v) => {
      const s = v.salary_range || v.salary || null;
      const formats = (v.work_format || []).map(f => `${f.id || ''} ${f.name || ''}`).join(' ').toLowerCase();
      const workFormat: NonNullable<Vacancy['workFormat']> =
        /(remote|удал[её]н|дистанцион)/i.test(formats) ? 'remote'
        : /(hybrid|гибрид|смешанн)/i.test(formats) ? 'hybrid'
        : /(on_site|office|офис|на месте)/i.test(formats) ? 'office' : 'unknown';
      return {
        id: `hh-${v.id}`, source: 'hh.kz', title: v.name || 'Без названия',
        employer: v.employer?.name || 'Работодатель не указан',
        city: v.area?.name || 'Не указан', url: v.alternate_url || `https://hh.kz/vacancy/${v.id}`,
        publishedAt: v.published_at || '',
        salary: s ? { from: s.from ?? null, to: s.to ?? null, currency: s.currency || 'KZT', gross: s.gross ?? null } : null,
        experience: v.experience?.name || '', schedule: v.schedule?.name || '', workFormat,
        snippet: stripTags(`${v.snippet?.requirement || ''} ${v.snippet?.responsibility || ''}`),
      };
    });
    return NextResponse.json({ source: 'hh.kz', status: 'ok', found: body.found ?? items.length, items, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ source: 'hh.kz', status: 'unavailable', items: [], found: 0, error: 'Не получилось связаться с HH API. Проверь сеть и настройки подключения.' });
  }
}
