// Shared React UI components for Vaultic
export { tokens, lightColors, darkColors } from './styles/design-tokens';
export type { ThemeColors } from './styles/design-tokens';
export { ThemeProvider, useTheme } from './styles/theme-provider';
export type { ThemeMode } from './styles/theme-provider';
export { I18nProvider, useI18n } from './styles/i18n-provider';
export type { Language } from './styles/i18n-provider';

// Existing components
export { Button } from './components/button';
export type { ButtonProps } from './components/button';
export { Input } from './components/input';
export type { InputProps } from './components/input';

// Layout primitives
export { Stack, HStack, VStack } from './components/stack';
export type { StackProps, HStackProps, VStackProps } from './components/stack';
export { Divider } from './components/divider';
export type { DividerProps } from './components/divider';

// Card & Section
export { Card } from './components/card';
export type { CardProps } from './components/card';
export { SectionHeader } from './components/section-header';
export type { SectionHeaderProps } from './components/section-header';
export { Badge } from './components/badge';
export type { BadgeProps } from './components/badge';

// Form components
export { Checkbox } from './components/checkbox';
export type { CheckboxProps } from './components/checkbox';
export { Select } from './components/select';
export type { SelectProps, SelectOption } from './components/select';
export { Textarea } from './components/textarea';
export type { TextareaProps } from './components/textarea';
export { IconButton } from './components/icon-button';
export type { IconButtonProps } from './components/icon-button';

// Interactive components
export { ToggleGroup } from './components/toggle-group';
export type { ToggleGroupProps, ToggleGroupOption } from './components/toggle-group';
export { PillGroup } from './components/pill-group';
export type { PillGroupProps, PillGroupOption } from './components/pill-group';
export { Modal } from './components/modal';
export type { ModalProps } from './components/modal';
