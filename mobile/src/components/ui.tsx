import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { colors } from '../theme';

export function Page({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const safeTop = { paddingTop: styles.pageContent.paddingTop + insets.top };

  if (!scroll) {
    return (
      <View style={styles.page}>
        <View style={[styles.pageContent, safeTop, { flex: 1 }]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.pageContent, safeTop]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function SectionCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AuthCard({ title, subtitle, children }: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.authCard}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>🔧</Text>
      </View>
      <Text style={styles.authTitle}>{title}</Text>
      <Text style={styles.authSubtitle}>{subtitle}</Text>
      <View style={styles.authForm}>{children}</View>
    </View>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function EmptyState({ message, actionLabel, onAction }: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🚘</Text>
      <Text style={styles.emptyText}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ChipSelect<T extends string>({ options, value, onChange, allowEmpty = false }: {
  options: { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T | null) => void;
  allowEmpty?: boolean;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(selected && allowEmpty ? null : option.value)}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  const t = useT();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ marginBottom: 14, alignSelf: 'flex-start' }}>
      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 17 }}>{t('common.back')}</Text>
    </Pressable>
  );
}

/** Заголовок шага формы с крупным номером: «1 Что случилось?» */
export function StepTitle({ step, title }: { step: number; title: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{step}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );
}

/** Большая цветная кнопка-карточка для главного действия экрана. */
export function BigAction({ icon, title, text, color, onPress }: {
  icon: string;
  title: string;
  text: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.bigAction, { backgroundColor: color, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.bigActionIcon}>
        <Text style={styles.bigActionEmoji}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.bigActionTitle}>{title}</Text>
        <Text style={styles.bigActionText}>{text}</Text>
      </View>
      <Text style={styles.bigActionArrow}>›</Text>
    </Pressable>
  );
}

/** Плитка «иконка + подпись» для второстепенных разделов. */
export function Tile({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.accentBackground }]}
    >
      <Text style={styles.tileEmoji}>{icon}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 20, paddingTop: 20, paddingBottom: 32 },
  keyboardPage: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 20 },
  authScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 },
  authCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    shadowColor: '#14202e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoText: { fontSize: 34 },
  authTitle: { color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' },
  authSubtitle: { color: colors.secondaryText, fontSize: 16, textAlign: 'center', marginTop: 7, lineHeight: 22 },
  authForm: { marginTop: 24 },
  field: { marginBottom: 16 },
  fieldLabel: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  input: {
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 17,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  disabledButton: { opacity: 0.45 },
  error: {
    color: colors.error,
    backgroundColor: colors.errorBackground,
    borderRadius: 12,
    padding: 13,
    marginBottom: 12,
    fontSize: 15,
    lineHeight: 21,
  },
  authFooter: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' },
  mutedText: { color: colors.secondaryText, fontSize: 15, lineHeight: 22 },
  link: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  brandCaption: { textAlign: 'center', color: colors.muted, fontSize: 14, fontWeight: '600', marginTop: 18 },
  roleRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 13,
    padding: 4,
    marginBottom: 18,
  },
  roleButton: { flex: 1, minHeight: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roleButtonActive: { backgroundColor: colors.surface, elevation: 2 },
  roleText: { color: colors.secondaryText, fontSize: 15, fontWeight: '700' },
  roleTextActive: { color: colors.primary },
  pageTitle: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: 6 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 26, marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28, marginBottom: 12 },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  stepTitle: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '800' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
  },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: { fontSize: 22 },
  bigAction: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 18,
    minHeight: 112,
    gap: 14,
  },
  bigActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigActionEmoji: { fontSize: 30 },
  bigActionTitle: { color: '#fff', fontSize: 21, fontWeight: '800' },
  bigActionText: { color: 'rgba(255,255,255,0.92)', fontSize: 15, lineHeight: 21, marginTop: 4 },
  bigActionArrow: { color: '#fff', fontSize: 28, fontWeight: '700' },
  tileRow: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    minHeight: 116,
    justifyContent: 'space-between',
  },
  tileEmoji: { fontSize: 32 },
  tileLabel: { color: colors.text, fontSize: 17, fontWeight: '800', marginTop: 10 },
  sosButton: {
    minHeight: 60,
    borderRadius: 16,
    backgroundColor: colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 20,
  },
  sosButtonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sosServiceCard: { padding: 16, borderWidth: 2 },
  sosServiceCardSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.accentBackground },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 13, height: 13, borderRadius: 7, backgroundColor: colors.primary },
  listCard: { marginBottom: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 9 },
  cardTitle: { color: colors.text, fontSize: 17, lineHeight: 23, fontWeight: '800', flex: 1 },
  badge: {
    overflow: 'hidden',
    color: colors.primaryDark,
    backgroundColor: colors.accentBackground,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: '700',
  },
  cardDescription: { color: colors.secondaryText, fontSize: 15, lineHeight: 21, marginTop: 7 },
  price: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 12 },
  emptyList: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, minHeight: 220 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.secondaryText, textAlign: 'center', fontSize: 16, lineHeight: 23 },
  secondaryButton: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 14,
    justifyContent: 'center',
  },
  secondaryButtonText: { color: colors.primary, fontWeight: '800', fontSize: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  chipTextSelected: { color: '#fff' },
  textArea: { minHeight: 96, textAlignVertical: 'top', paddingTop: 14 },
  rowGap: { flexDirection: 'row', gap: 10 },
});
