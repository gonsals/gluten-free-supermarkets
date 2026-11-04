import { useState, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { Action } from './ui';

/** Keep drafts and selections mounted while hiding secondary controls. */
export function Disclosure({
  title,
  accessibilityLabel,
  compact = false,
  children,
}: PropsWithChildren<{ title: string; accessibilityLabel?: string; compact?: boolean }>) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={{ gap: compact ? 4 : 16 }}>
      <Action
        title={title}
        accessibilityLabel={accessibilityLabel}
        secondary
        quiet={compact}
        expanded={expanded}
        icon={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
        onPress={() => setExpanded((value) => !value)}
      />
      <View
        style={{ display: expanded ? 'flex' : 'none', gap: 16 }}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
      >
        {children}
      </View>
    </View>
  );
}
