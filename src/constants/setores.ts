import type { IconName } from '../components/ui/Icon';

/** Setor/segmento de cliente → ícone semântico. Compartilhado entre as telas de networking. */
export const SETOR_ICON: Record<string, IconName> = {
  'E-commerce': 'ecommerce',
  'Saúde': 'saude',
  'Moda': 'moda',
  'Construção Civil': 'construcao',
  'Automotivo': 'automotivo',
  'Alimentação': 'alimentacao',
  'Educação': 'educacao',
  'Tecnologia': 'tecnologia',
  'Beleza': 'beleza',
  'Fitness': 'fitness',
  'Imobiliário': 'imobiliario',
  'Jurídico': 'juridico',
  'Financeiro': 'financeiro',
};

export const setorIcon = (setor?: string | null): IconName =>
  (setor && SETOR_ICON[setor]) || 'networking';
