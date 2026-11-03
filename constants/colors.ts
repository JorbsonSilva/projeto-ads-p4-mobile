/**
 * @file colors.ts
 * @description Ponte de retrocompatibilidade para o Design System do Orienta 2.0 [ORI-000].
 * Reexporta a paleta unificada de cores definida em `constants/theme.ts`,
 * evitando duplicação de tokens e garantindo uma fonte de verdade única.
 */

import { Theme } from './theme';

export const Colors = Theme.colors;

export default Colors;
