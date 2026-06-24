import { ActivityIndicator, Pressable, Text } from 'react-native';

type Variant = 'primary' | 'outline' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

const CONTAINER: Record<Variant, Record<Size, string>> = {
  primary: {
    sm: 'bg-blue-600 items-center rounded-lg px-3 py-1',
    md: 'bg-blue-600 items-center rounded-lg px-4 py-2',
    lg: 'bg-blue-600 items-center rounded-lg py-3',
  },
  outline: {
    sm: 'border border-blue-600 items-center rounded-lg px-3 py-1',
    md: 'border border-blue-600 items-center rounded-lg px-3 py-2',
    lg: 'border border-blue-600 items-center rounded-lg py-3',
  },
  secondary: {
    sm: 'bg-slate-200 dark:bg-slate-700 items-center rounded-lg px-3 py-1',
    md: 'bg-slate-200 dark:bg-slate-700 items-center rounded-lg px-4 py-2',
    lg: 'bg-slate-200 dark:bg-slate-700 items-center rounded-lg py-3',
  },
  ghost: {
    sm: 'items-center rounded-lg px-3 py-1',
    md: 'items-center rounded-lg px-4 py-2',
    lg: 'items-center rounded-lg py-3',
  },
  destructive: {
    sm: 'bg-red-600 items-center rounded-lg px-3 py-1',
    md: 'bg-red-600 items-center rounded-lg px-4 py-2',
    lg: 'bg-red-600 items-center rounded-lg py-3',
  },
};

const LABEL: Record<Variant, string> = {
  primary: 'text-white font-semibold',
  outline: 'text-blue-600 font-semibold',
  secondary: 'text-slate-900 dark:text-white font-semibold',
  ghost: 'text-slate-500 dark:text-slate-400 font-semibold',
  destructive: 'text-white font-semibold',
};

const LABEL_SIZE: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
};

export function Button({
  onPress,
  label,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  flex,
  className,
}: {
  onPress: () => void;
  label: string;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  flex?: boolean;
  className?: string;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={[
        CONTAINER[variant][size],
        flex ? 'flex-1' : '',
        isDisabled ? 'opacity-50' : 'active:opacity-70',
        className,
      ].filter(Boolean).join(' ')}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'destructive' ? 'white' : '#64748b'} />
      ) : (
        <Text className={`${LABEL[variant]} ${LABEL_SIZE[size]}`}>{label}</Text>
      )}
    </Pressable>
  );
}
