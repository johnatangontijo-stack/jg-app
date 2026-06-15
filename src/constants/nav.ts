import type { IconName } from '../components/ui/Icon';

// ── Roles ────────────────────────────────────────────────────────────────────
export type Role =
  | 'admin' | 'gerencia' | 'head' | 'financeiro'
  | 'social_media' | 'trafego' | 'ia' | 'sites'
  | 'cliente';

// Roles operacionais (antigo "colaborador")
export const ROLES_OPERACIONAL: Role[] = ['social_media', 'trafego', 'ia', 'sites'];

export function can(role: Role | undefined, allowed: Role[]): boolean {
  if (!role) return false;
  return allowed.includes(role);
}

// ── Item de navegação ────────────────────────────────────────────────────────
export interface NavItem {
  name: string;   // nome do screen no expo-router (segmento do arquivo)
  route: string;  // caminho completo para router.push
  title: string;
  icon: IconName;
  roles?: Role[]; // undefined = todos os papéis veem
}

const OPS = ROLES_OPERACIONAL;

// ── Menu da equipe interna (ordem = prioridade na barra) ─────────────────────
export const INTERNO_MENU: NavItem[] = [
  { name: 'dashboard',       route: '/(interno)/dashboard',     title: 'Dashboard',  icon: 'dashboard' },
  { name: 'clientes/index',  route: '/(interno)/clientes',      title: 'Clientes',   icon: 'clientes',   roles: ['admin', 'gerencia', 'head', ...OPS] },
  { name: 'demandas',        route: '/(interno)/demandas',      title: 'Demandas',   icon: 'demandas',   roles: ['admin', 'gerencia', 'head', ...OPS] },
  { name: 'agenda',          route: '/(interno)/agenda',        title: 'Agenda',     icon: 'agenda' },
  { name: 'gravacoes/index', route: '/(interno)/gravacoes',     title: 'Gravações',  icon: 'gravacoes',  roles: ['admin', 'gerencia', 'head', ...OPS] },
  { name: 'nps',             route: '/(interno)/nps',           title: 'NPS',        icon: 'nps' },
  { name: 'aprovacoes',      route: '/(interno)/aprovacoes',    title: 'Aprovações', icon: 'aprovacoes', roles: ['admin', 'gerencia', 'head', 'social_media'] },
  { name: 'metas',           route: '/(interno)/metas',         title: 'Metas',      icon: 'metas',      roles: ['admin', 'gerencia', 'head', ...OPS] },
  { name: 'feedbacks',       route: '/(interno)/feedbacks',     title: 'Feedbacks',  icon: 'feedbacks',  roles: ['admin', 'gerencia', 'head', 'financeiro'] },
  { name: 'financeiro',      route: '/(interno)/financeiro',    title: 'Financeiro', icon: 'financeiro', roles: ['admin', 'financeiro'] },
  { name: 'networking',      route: '/(interno)/networking',    title: 'Networking', icon: 'networking', roles: ['admin', 'gerencia', 'head'] },
  { name: 'equipe/index',    route: '/(interno)/equipe',        title: 'Equipe',     icon: 'equipe',     roles: ['admin', 'gerencia'] },
];

// ── Menu do cliente ──────────────────────────────────────────────────────────
export const CLIENTE_MENU: NavItem[] = [
  { name: 'index',       route: '/(cliente)',            title: 'Início',     icon: 'inicio' },
  { name: 'trafego',     route: '/(cliente)/trafego',    title: 'Tráfego',    icon: 'trafego' },
  { name: 'producoes',   route: '/(cliente)/producoes',  title: 'Produções',  icon: 'producoes' },
  { name: 'aprovacoes',  route: '/(cliente)/aprovacoes', title: 'Aprovações', icon: 'aprovacoes' },
  { name: 'metas',       route: '/(cliente)/metas',      title: 'Metas',      icon: 'metas' },
  { name: 'networking',  route: '/(cliente)/networking', title: 'Networking', icon: 'networking' },
  { name: 'marca',       route: '/(cliente)/marca',      title: 'Marca',      icon: 'marca' },
  { name: 'agenda',      route: '/(cliente)/agenda',     title: 'Agenda',     icon: 'agenda' },
  { name: 'nps',         route: '/(cliente)/nps',        title: 'NPS',        icon: 'nps' },
  { name: 'feedback',    route: '/(cliente)/feedback',   title: 'Feedback',   icon: 'feedbacks' },
  { name: 'whatsapp',    route: '/(cliente)/whatsapp',   title: 'WhatsApp',   icon: 'whatsapp' },
];

// ── Split em abas principais + secundárias (vão pro "Mais") ──────────────────
export function splitNav(menu: NavItem[], role: Role | undefined, maxTabs: number) {
  const visible = menu.filter((i) => !i.roles || can(role, i.roles));
  // reserva 1 slot para a aba "Mais" quando houver overflow
  const cut = visible.length > maxTabs ? maxTabs - 1 : maxTabs;
  return {
    visible,
    primary: visible.slice(0, cut),
    secondary: visible.slice(cut),
  };
}
