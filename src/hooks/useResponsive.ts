import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'phone' | 'tablet' | 'wide';

/**
 * Hook reativo de layout. Substitui Dimensions.get('window') (que é lido 1x e
 * não reage a rotação/resize/redimensionamento da janela web).
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isPhone = width < 600;
  const isTablet = width >= 600 && width < 1024;
  const isWide = width >= 1024;

  const bp: Breakpoint = isWide ? 'wide' : isTablet ? 'tablet' : 'phone';

  // colunas padrão para grids de cards
  const columns = isWide ? 4 : isTablet ? 3 : 2;

  // largura máxima de conteúdo centralizado em telas largas
  const contentMaxWidth = isWide ? 1100 : isTablet ? 760 : width;

  // quantas abas cabem na barra inferior antes de cair no "Mais"
  const maxTabs = isWide ? 7 : isTablet ? 6 : 4;

  return { width, height, bp, isPhone, isTablet, isWide, columns, contentMaxWidth, maxTabs };
}
