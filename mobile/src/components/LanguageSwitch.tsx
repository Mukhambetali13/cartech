import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useLanguageStore, type Language } from '../i18n';
import { colors } from '../theme';

const options: { value: Language; label: string }[] = [
  { value: 'kk', label: 'Қазақша' },
  { value: 'ru', label: 'Русский' },
];

/** Переключатель языка: названия языков всегда на самих языках. */
export function LanguageSwitch({ style }: { style?: StyleProp<ViewStyle> }) {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  return (
    <View
      accessibilityRole="radiogroup"
      style={[
        { flexDirection: 'row', backgroundColor: colors.border, borderRadius: 10, padding: 3, gap: 3 },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === language;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => void setLanguage(option.value)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 8,
              backgroundColor: selected ? colors.surface : 'transparent',
            }}
          >
            <Text style={{ fontWeight: selected ? '800' : '600', color: selected ? colors.text : colors.secondaryText }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
