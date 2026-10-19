export type RoleId = 'all' | 'project' | 'product' | 'analyst' | 'implementation' | 'automation';
export type RegionId = 'all' | 'almaty' | 'astana' | 'atyrau';

// HH supports Boolean search queries including OR and NAME:field qualifiers.
// Search multiple roles in one request to avoid needless API calls.
export const ROLE_QUERIES: Record<RoleId, string> = {
  all: 'NAME:("project manager" OR "менеджер проектов" OR "координатор проектов" OR "product manager" OR "product owner" OR "бизнес аналитик" OR "business analyst" OR "системный аналитик" OR "специалист по внедрению" OR "автоматизация процессов")',
  project: 'NAME:("project manager" OR "менеджер проектов" OR "координатор проектов" OR "руководитель IT-проектов")',
  product: 'NAME:("product manager" OR "product owner" OR "продуктовый менеджер" OR "менеджер продукта")',
  analyst: 'NAME:("business analyst" OR "бизнес-аналитик" OR "системный аналитик" OR "аналитик бизнес процессов")',
  implementation: 'NAME:("внедрение" OR "implementation" OR "IT coordinator" OR "координатор IT" OR "digital transformation")',
  automation: 'NAME:("AI automation" OR "автоматизация процессов" OR "no-code" OR "low-code" OR "AI specialist")',
};

export const ROLE_LABELS: Record<RoleId, string> = {
  all: 'Все направления', project: 'IT Project / Coordinator', product: 'Product / PO',
  analyst: 'Business / System Analyst', implementation: 'Внедрение IT-систем', automation: 'AI / Automation',
};
export const REGION_LABELS: Record<RegionId, string> = {
  all: 'Весь Казахстан', almaty: 'Алматы', astana: 'Астана', atyrau: 'Атырау',
};
export const REGION_AREAS: Record<RegionId, string> = {
  all: '40', almaty: '160', astana: '159', atyrau: '153',
};
export const PROFILE = {
  relocation: { city: 'Кульсары', minimumNetKzt: 600_000, negotiableAfterInterview: true },
  firstName: 'Асем',
  summary: 'IT Project Coordinator · Product Management · QA · AI-assisted development',
  verified: ['IT coordination · 2+ года', 'Jira · задачи для Dev и QA', 'Информационные системы · 1 + 4 подсистемы', 'Обучение 30+ пользователей', 'Сбор требований · периодически'],
  learned: ['Product Discovery', 'CustDev / CJM / JTBD', 'RICE / ICE', 'Agile / Scrum', 'Product Backlog'],
  differentiators: ['ProductBee: курс окончен + второй грант на Middle', 'Vibe coding · Next.js / React / TypeScript', 'Интеграции API · 2GIS'],
};
