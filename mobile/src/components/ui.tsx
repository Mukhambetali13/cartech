import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';

export function Page({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  if (!scroll) {
    return (
      <View style={styles.page}>
        <View style={[styles.pageContent, { flex: 1 }]}>{children}</View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
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
      <Text style={styles.logo}>🚗</Text>
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

export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  pageContent: { padding: 20, paddingTop: 24, paddingBottom: 28 },
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
  logo: { fontSize: 34, textAlign: 'center', marginBottom: 12 },
  authTitle: { color: colors.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  authSubtitle: { color: colors.secondaryText, fontSize: 14, textAlign: 'center', marginTop: 7 },
  authForm: { marginTop: 24 },
  field: { marginBottom: 16 },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 7 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 13,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.55 },
  error: {
    color: colors.error,
    backgroundColor: colors.errorBackground,
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
    fontSize: 13,
  },
  authFooter: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' },
  mutedText: { color: colors.secondaryText, fontSize: 14, lineHeight: 21 },
  link: { color: colors.primaryDark, fontSize: 14, fontWeight: '700' },
  brandCaption: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 18 },
  roleRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 13,
    padding: 4,
    marginBottom: 18,
  },
  roleButton: { flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  roleButtonActive: { backgroundColor: colors.surface, elevation: 1 },
  roleText: { color: colors.secondaryText, fontSize: 12, fontWeight: '600' },
  roleTextActive: { color: colors.primaryDark },
  eyebrow: { color: colors.primaryDark, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 7 },
  pageTitle: { color: colors.text, fontSize: 27, fontWeight: '800', marginBottom: 5 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    padding: 16,
  },
  homeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  logoutButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  logoutText: { color: colors.secondaryText, fontSize: 13, fontWeight: '600' },
  heroCard: { marginTop: 22, padding: 20, backgroundColor: colors.accentBackground, borderColor: '#f8d7c7' },
  heroIcon: { fontSize: 28, marginBottom: 10 },
  heroTitle: { color: colors.text, fontSize: 21, fontWeight: '800' },
  heroDescription: { color: colors.secondaryText, fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 14 },
  sosButton: {
    minHeight: 52,
    borderRadius: 13,
    backgroundColor: '#d92d20',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sosButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  sosServiceCard: { padding: 14 },
  sosServiceCardSelected: { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.accentBackground },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  shortcutGrid: { gap: 10 },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 15,
  },
  shortcutIcon: { fontSize: 22, marginRight: 12 },
  shortcutLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  shortcutArrow: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  listCard: { marginBottom: 11 },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 9 },
  cardTitle: { color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '700', flex: 1 },
  badge: {
    overflow: 'hidden',
    color: colors.primaryDark,
    backgroundColor: colors.accentBackground,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '700',
  },
  cardDescription: { color: colors.secondaryText, fontSize: 13, lineHeight: 19, marginTop: 7 },
  price: { color: colors.primaryDark, fontSize: 15, fontWeight: '800', marginTop: 11 },
  emptyList: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, minHeight: 220 },
  emptyIcon: { fontSize: 34, marginBottom: 10 },
  emptyText: { color: colors.secondaryText, textAlign: 'center', fontSize: 14, lineHeight: 21 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
  },
  secondaryButtonText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
});
