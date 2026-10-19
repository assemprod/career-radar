export type Vacancy = {
  id: string;
  source: 'hh.kz';
  title: string;
  employer: string;
  city: string;
  url: string;
  publishedAt: string;
  salary: { from: number | null; to: number | null; currency: string; gross: boolean | null } | null;
  experience: string;
  schedule: string;
  workFormat?: 'remote' | 'hybrid' | 'office' | 'unknown';
  snippet: string;
};

export type ScoredVacancy = Vacancy & {
  score: number;
  reasons: string[];
  gaps: string[];
};

const containsAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

// A transparent heuristic relevance index, NOT a probability of being hired.
// Scores use only visible source fields (title/snippet, experience, schedule).
export function scoreVacancy(job: Vacancy): ScoredVacancy {
  const name = job.title.toLowerCase();
  const content = `${name} ${job.snippet.toLowerCase()}`;
  let score = 24;
  const reasons: string[] = [];
  const gaps: string[] = [];

  if (containsAny(name, ['project manager', 'project coordinator', 'координатор проектов', 'it project', 'менеджер проектов', 'руководитель проектов'])) {
    score += 29; reasons.push('Профильная роль: управление и координация IT-проектов');
  } else if (containsAny(name, ['product manager', 'product owner', 'продукт', 'менеджер продукта'])) {
    score += 24; reasons.push('Подходит направлению Product Management');
  } else if (containsAny(name, ['business analyst', 'бизнес-аналитик', 'системный аналитик', 'business analysis'])) {
    score += 21; reasons.push('Релевантно опыту работы с требованиями');
  } else if (containsAny(name, ['внедрен', 'implementation', 'координатор it', 'автоматизац', 'digital transformation'])) {
    score += 26; reasons.push('Подходит опыту внедрения информационных систем');
  } else if (containsAny(name, ['automation', 'ai', 'no-code', 'low-code'])) {
    score += 16; reasons.push('Связано с AI / автоматизацией и собственными проектами');
  }

  if (containsAny(content, ['jira', 'таск-трек', 'постановк', 'управление задач'])) {
    score += 12; reasons.push('Jira / постановка задач — практический опыт');
  }
  if (containsAny(content, ['требован', 'requirements', 'заказчик', 'stakeholder', 'бизнес-процесс'])) {
    score += 10; reasons.push('Взаимодействие с заказчиками и требованиями');
  }
  if (containsAny(content, ['внедрен', 'информационн', 'it систем', 'цифровизац', 'integration'])) {
    score += 8; reasons.push('Опыт внедрения IT-систем');
  }
  if (containsAny(content, ['тестир', 'qa ', 'качество', 'quality assurance'])) {
    score += 6; reasons.push('QA и работа с тестировщиками');
  }
  if (containsAny(name, ['junior', 'младший', 'начинающ'])) {
    score += 7; reasons.push('Подходящий уровень Junior');
  }
  if (containsAny(name, ['senior', 'lead', 'head of', 'директор', 'начальник', 'руководитель направления'])) {
    score -= 26; gaps.push('Возможно требуется уровень Senior / Lead');
  }
  if (containsAny(job.experience.toLowerCase(), ['более 6', 'от 6', 'more than 6', 'от 3 до 6', 'between3and6'])) {
    score -= 18; gaps.push('Проверь требования к стажу');
  }
  if (containsAny(content, ['scrum master', 'scrum-мастер', 'ведение спринтов', 'управление backlog', 'product backlog'])) {
    gaps.push('Потребуется подтвердить практику Scrum / Backlog');
  }
  if (containsAny(content, ['банковск', 'финтех', 'fintech', 'banking'])) {
    gaps.push('Банковская экспертиза — дополнительный вопрос');
  }
  return { ...job, score: Math.max(0, Math.min(99, score)), reasons: reasons.slice(0, 3), gaps: gaps.slice(0, 2) };
}

export function formatSalary(s: Vacancy['salary']) {
  if (!s || (s.from == null && s.to == null)) return 'Зарплата не указана';
  const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
  const cur = s.currency === 'KZT' ? '₸' : s.currency;
  const suffix = s.gross === true ? ' · до вычета налогов' : '';
  if (s.from && s.to) return `${fmt(s.from)}–${fmt(s.to)} ${cur}${suffix}`;
  if (s.from) return `от ${fmt(s.from)} ${cur}${suffix}`;
  return `до ${fmt(s.to!)} ${cur}${suffix}`;
}
