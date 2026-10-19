'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDownUp, ArrowRight, BadgeCheck, Bell, Bookmark, BriefcaseBusiness, Check,
  ChevronDown, CircleAlert, Clock3, Compass, ExternalLink, Filter, Gauge, Globe2,
  GraduationCap, Heart, Info, MapPin, RefreshCcw, Search, ShieldCheck, SlidersHorizontal,
  Sparkles, Target, TrendingUp, X
} from 'lucide-react';
import { formatSalary, scoreVacancy, type ScoredVacancy, type Vacancy } from '@/lib/jobs';
import { PROFILE, REGION_LABELS, ROLE_LABELS, type RegionId, type RoleId } from '@/lib/profile';
import { assessRelocationSalary, DEFAULT_RELOCATION_MIN_NET_KZT, moneyKzt, type RelocationSalaryAssessment } from '@/lib/salary';

type SourceStatus = 'idle' | 'loading' | 'ok' | 'auth_required' | 'unavailable';
type SortMode = 'match' | 'date';
type SalaryBucket = 'eligible' | 'review' | 'all';
type AssessedVacancy = ScoredVacancy & { salaryFit: RelocationSalaryAssessment };

function formatDate(date: string) {
  if (!date) return 'Дата неизвестна';
  const dt = new Date(date);
  if (Number.isNaN(dt.getTime())) return 'Дата неизвестна';
  const diff = Math.floor((Date.now() - dt.getTime()) / 86_400_000);
  if (diff <= 0) return 'Сегодня';
  if (diff === 1) return 'Вчера';
  if (diff < 7) return `${diff} дн. назад`;
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(dt);
}

function SalaryLabel({ vacancy }: { vacancy: Vacancy }) {
  return <span className={vacancy.salary ? 'font-semibold text-ink' : 'text-muted'}>{formatSalary(vacancy.salary)}</span>;
}

function MatchBar({ score }: { score: number }) {
  const tone = score >= 75 ? 'bg-teal' : score >= 55 ? 'bg-amber-500' : 'bg-slate-400';
  return <div className="flex min-w-[100px] items-center gap-2.5">
    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e6eeec]"><div className={`h-full rounded-full ${tone}`} style={{ width: `${score}%` }} /></div>
    <span className="font-bold tabular-nums text-ink">{score}<span className="font-normal text-muted">/99</span></span>
  </div>;
}

function JobCard({ job, saved, onSave }: { job: AssessedVacancy; saved: boolean; onSave: () => void }) {
  const { salaryFit } = job;
  const payClass = salaryFit.status === 'meets' ? 'bg-[#e7f5ef] text-[#14725e]'
    : salaryFit.status === 'below' ? 'bg-[#fff0ee] text-[#b14e46]'
    : 'bg-[#fff6e7] text-[#9a691b]';
  const payLabel = salaryFit.status === 'meets' ? (salaryFit.isApproximation ? 'Предварительно подходит' : 'По зарплате подходит')
    : salaryFit.status === 'potential' ? 'Доход уточнить'
    : salaryFit.status === 'below' ? 'Ниже порога' : 'Зарплата неизвестна';
  const [expanded, setExpanded] = useState(false);
  return <article className="card appear overflow-hidden px-5 py-5 sm:px-6 sm:py-6">
    <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-[#e6eeec] bg-[#f6f9f7] text-lg font-bold text-teal">
        {job.employer.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="pill bg-[#e7f3f0] text-[#0d7d71]">hh.kz</span>
          {job.score >= 75 && <span className="pill bg-[#f1f8e9] text-[#507a31]"><Sparkles size={12}/> Высокое совпадение</span>}
          {salaryFit.needsRelocation && salaryFit.status !== 'not_applicable' && <span className={`pill ${payClass}`}>{payLabel}</span>}
        </div>
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="group mt-1 inline-flex max-w-full items-center gap-2 text-lg font-bold leading-snug text-ink hover:text-teal">
          <span>{job.title}</span><ExternalLink size={15} className="shrink-0 opacity-0 transition group-hover:opacity-100"/>
        </a>
        <div className="mt-1 text-sm font-medium text-[#596e7b]">{job.employer}</div>
      </div>
      <div className="ml-auto flex items-center gap-2 sm:ml-0">
        <button onClick={onSave} aria-label={saved ? 'Удалить из избранного' : 'Сохранить вакансию'} title={saved ? 'Удалить из избранного' : 'В избранное'}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${saved ? 'border-[#cde5dd] bg-[#e9f7f2] text-teal' : 'border-line bg-white text-[#81939c] hover:text-teal'}`}>
          <Bookmark size={19} fill={saved ? 'currentColor' : 'none'}/>
        </button>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
      <span className="flex items-center gap-1.5 text-[#637782]"><MapPin size={15}/>{job.city}</span>
      <span className="flex items-center gap-1.5"><BriefcaseBusiness size={15} className="text-[#82929b]"/><SalaryLabel vacancy={job}/></span>
      <span className="flex items-center gap-1.5 text-[#637782]"><Clock3 size={15}/>{formatDate(job.publishedAt)}</span>
      {job.experience && <span className="rounded-md bg-[#f6f8f8] px-2 py-1 text-xs text-[#5b6b75]">{job.experience}</span>}
    </div>
    {salaryFit.needsRelocation && salaryFit.status !== 'not_applicable' && <p className="mt-2 text-xs leading-relaxed text-[#72858a]">
      <span className="font-semibold">При переезде:</span> {salaryFit.message}
      {salaryFit.estimatedNetFrom !== null && <> · на руки {salaryFit.isApproximation ? '≈ ' : ''}{salaryFit.estimatedNetTo !== null ? `${moneyKzt(salaryFit.estimatedNetFrom)}–${moneyKzt(salaryFit.estimatedNetTo)}` : `от ${moneyKzt(salaryFit.estimatedNetFrom)}`}</>}
      {salaryFit.estimatedNetFrom === null && salaryFit.estimatedNetTo !== null && <> · до {salaryFit.isApproximation ? '≈ ' : ''}{moneyKzt(salaryFit.estimatedNetTo)} на руки</>}
    </p>}
    {job.snippet && <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-[#687b86]">{job.snippet}</p>}
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold uppercase tracking-wider text-muted">Релевантность</span>
        <MatchBar score={job.score}/>
        <span className="text-[#91a0a7]">Предварительная оценка</span>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setExpanded(!expanded)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:text-[#075e57]">
          Почему подходит <ChevronDown size={15} className={`transition ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <a className="btn btn-teal !px-3.5 !py-2" href={job.url} target="_blank" rel="noopener noreferrer">Вакансия <ArrowRight size={15}/></a>
      </div>
    </div>
    {expanded && <div className="mt-4 grid gap-4 rounded-xl border border-[#e4eeec] bg-[#f7faf9] p-4 sm:grid-cols-2">
      <div><div className="mb-2 text-xs font-bold uppercase tracking-wider text-teal">Совпадения</div>
        {(job.reasons.length ? job.reasons : ['Вакансия входит в выбранное направление поиска']).map((r) => <div key={r} className="mb-2 flex items-start gap-2 text-sm text-[#45616c]"><Check size={15} className="mt-0.5 shrink-0 text-teal"/>{r}</div>)}</div>
      <div><div className="mb-2 text-xs font-bold uppercase tracking-wider text-[#9b7136]">Стоит проверить</div>
        {(job.gaps.length ? job.gaps : ['Требования и обязанности на странице работодателя']).map((r) => <div key={r} className="mb-2 flex items-start gap-2 text-sm text-[#6f6a61]"><Info size={15} className="mt-0.5 shrink-0 text-amber-600"/>{r}</div>)}</div>
      <p className="text-xs leading-relaxed text-muted sm:col-span-2">Баллы рассчитываются по названию и краткому описанию HH. Они показывают ориентировочное совпадение навыков, а не вероятность трудоустройства.</p>
    </div>}
  </article>;
}

export default function HomePage() {
  const [role, setRole] = useState<RoleId>('all');
  const [region, setRegion] = useState<RegionId>('all');
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState({ role: 'all' as RoleId, region: 'all' as RegionId, q: '' });
  const [status, setStatus] = useState<SourceStatus>('idle');
  const [items, setItems] = useState<Vacancy[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [hideSenior, setHideSenior] = useState(true);
  const [sort, setSort] = useState<SortMode>('match');
  const [minSalary, setMinSalary] = useState(String(DEFAULT_RELOCATION_MIN_NET_KZT));
  const [applyRelocationMin, setApplyRelocationMin] = useState(true);
  const [salaryBucket, setSalaryBucket] = useState<SalaryBucket>('eligible');
  const [prefsReady, setPrefsReady] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedJobs, setSavedJobs] = useState<Vacancy[]>([]);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('career-radar-saved-ids') || '[]');
      const jobs = JSON.parse(localStorage.getItem('career-radar-saved-jobs') || '[]');
      if (Array.isArray(ids)) setSavedIds(ids.filter((v): v is string => typeof v === 'string'));
      if (Array.isArray(jobs)) setSavedJobs(jobs.filter((v): v is Vacancy => v && typeof v.id === 'string' && v.source === 'hh.kz'));
      const savedPrefs = JSON.parse(localStorage.getItem('career-radar-relocation-preferences') || 'null');
      if (savedPrefs && typeof savedPrefs === 'object') {
        if (Number.isFinite(savedPrefs.minimumNetKzt) && savedPrefs.minimumNetKzt >= 0) setMinSalary(String(savedPrefs.minimumNetKzt));
        if (typeof savedPrefs.enabled === 'boolean') setApplyRelocationMin(savedPrefs.enabled);
      }
    } catch { /* Corrupted browser data, use personal defaults. */ }
    setPrefsReady(true);
  }, []);

  useEffect(() => {
    if (!prefsReady) return;
    try {
      localStorage.setItem('career-radar-relocation-preferences', JSON.stringify({
        minimumNetKzt: Math.max(0, Number(minSalary) || 0), enabled: applyRelocationMin,
      }));
    } catch { /* Browser storage might be disabled. */ }
  }, [prefsReady, minSalary, applyRelocationMin]);

  const load = useCallback(async (s: typeof search, signal: AbortSignal) => {
    setStatus('loading'); setError('');
    try {
      const p = new URLSearchParams({ role: s.role, region: s.region, q: s.q });
      const response = await fetch(`/api/vacancies?${p}`, { signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Ошибка поиска.');
      if (signal.aborted) return;
      setItems(Array.isArray(body.items) ? body.items : []);
      setTotal(typeof body.found === 'number' ? body.found : 0);
      setStatus(body.status === 'ok' || body.status === 'auth_required' || body.status === 'unavailable' ? body.status : 'unavailable');
      setError(body.error || '');
    } catch (e) {
      if (signal.aborted) return;
      setItems([]); setStatus('unavailable'); setError(e instanceof Error ? e.message : 'Ошибка запроса к источнику.');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(search, controller.signal);
    return () => controller.abort();
  }, [load, search]);

  const assessed = useMemo(() => {
    const all = savedOnly ? [...savedJobs] : [...items];
    const unique = Array.from(new Map(all.map(v => [v.id, v])).values());
    const target = Math.max(0, Number(minSalary) || 0);
    return unique.map(scoreVacancy).filter(j => {
      if (hideSenior && /(senior|head of|chief |ведущий руководитель|начальник отдела|директор|team lead)/i.test(j.title)) return false;
      if (remoteOnly && !(j.workFormat === 'remote' || /(удал[её]н|remote|дистанц)/i.test(j.schedule))) return false;
      if (salaryOnly && (!j.salary || (j.salary.from === null && j.salary.to === null))) return false;
      return true;
    }).map(j => ({ ...j, salaryFit: assessRelocationSalary(j, target, applyRelocationMin) }));
  }, [items, savedJobs, savedOnly, hideSenior, remoteOnly, salaryOnly, minSalary, applyRelocationMin]);

  const salaryCounts = useMemo(() => ({
    eligible: assessed.filter(j => j.salaryFit.status === 'meets' || j.salaryFit.status === 'not_applicable').length,
    review: assessed.filter(j => j.salaryFit.status === 'potential' || j.salaryFit.status === 'unknown').length,
    all: assessed.length,
  }), [assessed]);

  const shown = useMemo(() => assessed.filter(j => {
    if (salaryBucket === 'eligible') return j.salaryFit.status === 'meets' || j.salaryFit.status === 'not_applicable';
    if (salaryBucket === 'review') return j.salaryFit.status === 'potential' || j.salaryFit.status === 'unknown';
    return true;
  }).sort((a, b) => sort === 'match' ? b.score - a.score : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()), [assessed, salaryBucket, sort]);

  function toggleSaved(job: Vacancy) {
    const nextSaved = savedIds.includes(job.id) ? savedIds.filter(id => id !== job.id) : [...savedIds, job.id];
    const nextJobs = savedIds.includes(job.id) ? savedJobs.filter(j => j.id !== job.id) : [...savedJobs.filter(j => j.id !== job.id), job];
    setSavedIds(nextSaved); setSavedJobs(nextJobs);
    try {
      localStorage.setItem('career-radar-saved-ids', JSON.stringify(nextSaved));
      localStorage.setItem('career-radar-saved-jobs', JSON.stringify(nextJobs));
    } catch { /* Browser storage may be unavailable. */ }
  }

  const runSearch = (e?: FormEvent) => { e?.preventDefault(); setSavedOnly(false); setSearch({ role, region, q: draft.trim() }); };
  const refreshing = () => setSearch(s => ({ ...s }));
  const hhLink = `https://hh.kz/search/vacancy?${new URLSearchParams({ text: draft.trim() || 'project manager', area: '40' })}`;
  const samrukLink = `https://qsamruk.kz/vacancy?s=${encodeURIComponent(draft.trim() || 'project')}`;

  return <div className="min-h-screen">
    <header className="sticky top-0 z-30 border-b border-[#e6eeea] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <a href="#top" className="inline-flex items-center gap-3 text-xl font-black tracking-tight text-ink">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-white"><Compass size={21}/></span>
          Career<span className="-ml-2 text-teal">Radar</span><span className="ml-0.5 self-start rounded bg-[#dff5ec] px-1.5 py-0.5 text-[9px] font-black tracking-wider text-teal">MVP</span>
        </a>
        <div className="flex items-center gap-2 sm:gap-4">
          <a href="#sources" className="hidden text-sm font-medium text-[#617783] hover:text-teal sm:inline">Источники</a>
          <button onClick={() => setShowProfile(v => !v)} className="btn btn-outline !py-2"><CircleAlert size={16} className="text-teal"/> <span className="hidden sm:inline">Мой профиль</span><span className="sm:hidden">Профиль</span></button>
        </div>
      </div>
    </header>

    <main id="top" className="mx-auto max-w-[1280px] px-5 pb-20 pt-9 lg:px-8 lg:pt-11">
      <section className="relative overflow-hidden rounded-[28px] bg-[#103e45] px-6 py-9 text-white shadow-card sm:px-10 sm:py-12">
        <div aria-hidden className="absolute -right-20 -top-28 h-80 w-80 rounded-full border-[52px] border-white/[.055]" />
        <div aria-hidden className="absolute -bottom-44 right-20 h-80 w-80 rounded-full border-[50px] border-white/[.05]" />
        <div className="relative grid items-end gap-8 lg:grid-cols-[1.3fr_.7fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#84b8af]/40 bg-[#ffffff0e] px-3 py-1.5 text-xs font-semibold tracking-wide text-[#a7e7d6]"><Sparkles size={14}/> Умный подбор под твой опыт</div>
            <h1 className="max-w-[700px] text-[35px] font-extrabold leading-[1.12] tracking-tight sm:text-[48px]">Работа, которая подходит <span className="text-[#9de9d6]">именно тебе.</span></h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#bfd5d7] sm:text-base">Не трать время на сотни объявлений. Сравнивай требования вакансий с опытом в IT, Jira, продуктовой работе и внедрении систем.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs text-[#d2e8e5]"><BadgeCheck size={15} className="text-[#8edbc9]"/> 2+ года IT</span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs text-[#d2e8e5]"><GraduationCap size={15} className="text-[#8edbc9]"/> ProductBee · 2 гранта</span>
              <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs text-[#d2e8e5]"><ShieldCheck size={15} className="text-[#8edbc9]"/> Официальные источники</span>
            </div>
          </div>
          <div className="relative rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-2 text-sm text-[#bcd9d4]"><span>Карьерный фокус</span><Target size={20} className="text-[#a2e9d9]"/></div>
            <div className="text-2xl font-bold">IT → Product</div>
            <div className="my-4 h-1.5 overflow-hidden rounded-full bg-[#ffffff28]"><div className="h-full w-[69%] rounded-full bg-[#a6eedb]"/></div>
            <div className="text-xs leading-6 text-[#c8dcd9]">Project Management · Business Analysis · Product Ownership</div>
            <div className="mt-4 border-t border-white/15 pt-4 text-xs text-[#aed9d2]">Матчинг объясняет совпадения и пробелы, но не гарантирует оффер.</div>
          </div>
        </div>
      </section>

      {showProfile && <section id="profile" className="card appear mt-6 p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Профиль: {PROFILE.firstName}</h2><button aria-label="Закрыть профиль" onClick={() => setShowProfile(false)}><X size={19}/></button></div>
        <p className="mb-4 text-sm text-muted">{PROFILE.summary}</p>
        <div className="grid gap-5 md:grid-cols-3">
          <div><h3 className="mb-2 text-sm font-bold text-ink">Опыт</h3>{PROFILE.verified.map(s=><div key={s} className="mb-2 flex items-start gap-2 text-sm text-[#53707a]"><Check size={15} className="mt-0.5 shrink-0 text-teal"/>{s}</div>)}</div>
          <div><h3 className="mb-2 text-sm font-bold text-ink">Изучено</h3>{PROFILE.learned.map(s=><div key={s} className="mb-2 flex items-start gap-2 text-sm text-[#53707a]"><GraduationCap size={15} className="mt-0.5 shrink-0 text-[#7c91a2]"/>{s}</div>)}</div>
          <div><h3 className="mb-2 text-sm font-bold text-ink">Дополнительные преимущества</h3>{PROFILE.differentiators.map(s=><div key={s} className="mb-2 flex items-start gap-2 text-sm text-[#53707a]"><Sparkles size={15} className="mt-0.5 shrink-0 text-teal"/>{s}</div>)}</div>
        </div>
        <p className="mt-4 border-t border-line pt-4 text-xs text-muted">Минимум при переезде: {moneyKzt(Math.max(0, Number(minSalary) || 0))} на руки в месяц. Условие действует для других городов, если удалённый формат не подтверждён. Переезд обсуждается после интервью и подходящего оффера.</p>
        <p className="mt-2 text-xs text-muted">Профиль зафиксирован в исходном коде и не отправляется в HeadHunter. В API уходит только поисковый запрос и выбранный регион.</p>
      </section>}

      <section className="card mt-7 p-5 sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-bold"><Search size={20} className="text-teal"/> Найти вакансии</h2><span className="hidden rounded-full bg-[#e6f5ef] px-3 py-1 text-xs font-semibold text-teal sm:inline">Казахстан · IT & Product</span></div>
        <form onSubmit={runSearch} className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-end">
          <label className="block"><span className="mb-2 block text-xs font-semibold text-[#647887]">Ключевые слова (необязательно)</span><div className="relative"><Search size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-[#82949c]"/><input aria-label="Поисковый запрос" className="field !pl-10" placeholder="Например: Jira, Project Manager" value={draft} onChange={e => setDraft(e.target.value)} maxLength={90}/></div></label>
          <label className="block"><span className="mb-2 block text-xs font-semibold text-[#647887]">Направление</span><select className="field" value={role} onChange={e => setRole(e.target.value as RoleId)}>{Object.entries(ROLE_LABELS).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label className="block"><span className="mb-2 block text-xs font-semibold text-[#647887]">Город</span><select className="field" value={region} onChange={e => setRegion(e.target.value as RegionId)}>{Object.entries(REGION_LABELS).map(([id,label]) => <option key={id} value={id}>{label}</option>)}</select></label>
          <button className="btn btn-teal h-[46px] !px-6" type="submit" disabled={status === 'loading'}><Search size={17}/> {status === 'loading' ? 'Поиск...' : 'Искать'}</button>
        </form>
      </section>

      <section id="sources" className="mt-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-bold uppercase tracking-[.12em] text-[#6f868b]">Источники вакансий</h2><span className="text-xs text-muted">Автоматическая загрузка: только HH API</span></div>
        <div className="flex flex-wrap gap-2">
          <span className="source border-[#abd7ce] bg-[#edf8f5] !text-teal"><span className="h-2 w-2 rounded-full bg-teal"/> HH.kz · API</span>
          <a href={samrukLink} target="_blank" rel="noopener noreferrer" className="source">QSamruk · открыть поиск <ExternalLink size={13}/></a>
          <a href="https://enbek.kz/ru" target="_blank" rel="noopener noreferrer" className="source">Enbek · открыть каталог <ExternalLink size={13}/></a>
          <a href={hhLink} target="_blank" rel="noopener noreferrer" className="source">Открыть HH в браузере <ExternalLink size={13}/></a>
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[265px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[90px] lg:self-start">
          <div className="card p-5">
            <div className="mb-5 flex items-center gap-2 font-bold"><SlidersHorizontal size={18} className="text-teal"/> Дополнительные фильтры</div>
            <div className="mb-4 rounded-xl border border-[#d5e8e1] bg-[#f1faf6] p-3">
              <div className="text-xs font-bold text-[#286b5c]">Личный минимум при переезде</div>
              <div className="mt-1 text-xs text-[#5a7d72]">В месяц, на руки (net), ₸</div>
              <input aria-label="Минимальная зарплата при переезде на руки" type="number" min="0" max="20000000" step="50000" value={minSalary} onChange={e=>setMinSalary(e.target.value)} className="field mt-2" />
              <p className="mt-2 text-[11px] leading-relaxed text-[#5e7973]">В других городах без подтверждённой удалёнки · предложение о переезде обсуждается после собеседования.</p>
            </div>
            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm font-semibold text-[#286b5c]"><input type="checkbox" checked={applyRelocationMin} onChange={e=>setApplyRelocationMin(e.target.checked)} className="mt-1 accent-[#0e887c]"/> Проверять доход при переезде</label>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#536976]"><input type="checkbox" checked={salaryOnly} onChange={e=>setSalaryOnly(e.target.checked)} className="mt-1 accent-[#0e887c]"/> Только с указанной зарплатой</label>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#536976]"><input type="checkbox" checked={remoteOnly} onChange={e=>setRemoteOnly(e.target.checked)} className="mt-1 accent-[#0e887c]"/> Только удалённая работа</label>
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[#536976]"><input type="checkbox" checked={hideSenior} onChange={e=>setHideSenior(e.target.checked)} className="mt-1 accent-[#0e887c]"/> Скрывать Senior / Head</label>
            </div>
            <button type="button" onClick={() => {setSalaryOnly(false);setRemoteOnly(false);setHideSenior(true);setMinSalary(String(DEFAULT_RELOCATION_MIN_NET_KZT));setApplyRelocationMin(true);setSalaryBucket('eligible');}} className="mt-5 text-xs font-semibold text-teal hover:underline">Сбросить фильтры</button>
          </div>
          <div className="mt-4 rounded-2xl border border-[#d8e9e3] bg-[#eff8f4] p-5">
            <div className="flex items-center gap-2 font-bold text-[#0f6259]"><Gauge size={17}/> Как работает рейтинг</div>
            <p className="mt-2 text-sm leading-relaxed text-[#57746d]">Баллы за подходящую роль, Jira, требования, IT-внедрения и QA. Штрафы за позиции Senior и высокий требуемый стаж.</p>
            <div className="mt-3 text-xs font-medium text-[#47776c]">Рейтинг — эвристика, а не ML-прогноз найма.</div>
            <p className="mt-3 text-xs leading-5 text-[#57746d]">Для зарплаты gross используем ориентировочный расчёт net по правилам РК 2026 с базовым вычетом 30 МРП. Финальную сумму нужно подтвердить у HR. Вакансии с неизвестной зарплатой выделяются отдельно, а не признаются автоматически неподходящими.</p>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2"><h2 className="text-xl font-extrabold text-ink">Подборка вакансий</h2><span className="pill bg-[#e5f1ee] text-teal">{shown.length}</span></div>
              <p className="mt-1 text-xs text-muted">{status === 'ok' ? `HeadHunter нашёл ${total} по запросу · показано до 60 результатов, затем применены фильтры` : 'Сначала загружаем официальную выдачу HeadHunter'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setSavedOnly(v => !v)} className={`btn !px-3 !py-2 ${savedOnly ? 'btn-teal' : 'btn-outline'}`}><Bookmark size={15}/> Избранное {savedIds.length > 0 ? savedIds.length : ''}</button>
              <button title="Обновить поиск" onClick={refreshing} className="btn btn-outline !px-2.5 !py-2" disabled={status === 'loading'}><RefreshCcw size={16} className={status === 'loading' ? 'animate-spin' : ''}/></button>
              <label className="relative"><span className="sr-only">Сортировка</span><select value={sort} onChange={e=>setSort(e.target.value as SortMode)} className="field !py-2 !pr-7"><option value="match">По совпадению</option><option value="date">По дате</option></select></label>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Статус по зарплате при переезде">
            <button type="button" onClick={() => setSalaryBucket('eligible')} aria-pressed={salaryBucket === 'eligible'} className={`btn !px-3 !py-2 ${salaryBucket === 'eligible' ? 'btn-teal' : 'btn-outline'}`}>Подходят ({salaryCounts.eligible})</button>
            <button type="button" onClick={() => setSalaryBucket('review')} aria-pressed={salaryBucket === 'review'} className={`btn !px-3 !py-2 ${salaryBucket === 'review' ? 'btn-teal' : 'btn-outline'}`}>Уточнить условия ({salaryCounts.review})</button>
            <button type="button" onClick={() => setSalaryBucket('all')} aria-pressed={salaryBucket === 'all'} className={`btn !px-3 !py-2 ${salaryBucket === 'all' ? 'btn-teal' : 'btn-outline'}`}>Все ({salaryCounts.all})</button>
          </div>
          <p className="mb-4 text-xs leading-5 text-muted">Порог {moneyKzt(Math.max(0, Number(minSalary) || 0))} net применяется только при предполагаемом переезде. Вакансии без зарплаты и диапазоны без гарантированного минимума — во вкладке «Уточнить условия». Ниже порога — только во вкладке «Все».</p>

          {status === 'loading' && !savedOnly && <div className="card flex min-h-[260px] flex-col items-center justify-center p-10 text-center"><RefreshCcw className="mb-4 animate-spin text-teal" size={28}/><h3 className="font-bold">Ищем подходящие вакансии…</h3><p className="mt-1 text-sm text-muted">Проверяем выдачу HeadHunter</p></div>}

          {(status === 'auth_required' || status === 'unavailable') && !savedOnly && <div className="mb-4 rounded-2xl border border-[#f5debb] bg-[#fffbf3] p-5"><div className="flex items-center gap-2 font-bold text-[#8b651e]"><CircleAlert size={19}/> Источник временно недоступен</div><p className="mt-2 text-sm leading-relaxed text-[#856c3e]">{error}</p><div className="mt-3 flex flex-wrap gap-3"><a className="inline-flex items-center gap-1.5 text-sm font-bold text-[#987024] underline" href={hhLink} target="_blank" rel="noopener noreferrer">Искать напрямую на HH.kz <ExternalLink size={14}/></a><a className="inline-flex items-center gap-1.5 text-sm font-bold text-[#987024] underline" href="https://dev.hh.kz/" target="_blank" rel="noopener noreferrer">Настроить API <ExternalLink size={14}/></a></div></div>}

          {status !== 'loading' || savedOnly ? <div className="space-y-3.5">
            {shown.map(j => <JobCard key={j.id} job={j} saved={savedIds.includes(j.id)} onSave={() => toggleSaved(j)}/>)}
            {shown.length === 0 && (status === 'ok' || savedOnly) && <div className="card flex min-h-[230px] flex-col items-center justify-center p-7 text-center"><Search size={26} className="mb-3 text-[#9ab6b1]"/><h3 className="font-bold">{savedOnly ? 'Избранных вакансий пока нет' : 'По выбранным фильтрам вакансии не найдены'}</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted">{savedOnly ? 'Добавляй интересные предложения в избранное, чтобы вернуться к ним позже.' : salaryBucket === 'eligible' ? 'Вакансии с неполной информацией о зарплате посмотри во вкладке «Уточнить условия»; можно также ослабить фильтры.' : 'Попробуй выбрать отдельное направление или другой регион.'}</p></div>}
          </div> : null}
        </section>
      </div>
      <footer className="mt-14 border-t border-line pt-7 text-xs leading-6 text-[#8a9b9b]"><div className="flex flex-wrap items-start justify-between gap-4"><p>Career Radar MVP · Персональный инструмент поиска, не связан с HeadHunter, QSamruk или Enbek.</p><p>Источники данных и ссылки указаны у каждой вакансии. Автооткликов нет.</p></div></footer>
    </main>
  </div>;
}
