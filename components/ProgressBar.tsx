import React from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, GRADIENTS } from '@/constants/colors';

interface ProgressBarProps {
  progress: number; // 0 to 100
  height?: number;
  label?: string;
  showPercentage?: boolean;
  style?: ViewStyle;
  testID?: string;
  color?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 8,
  label,
  showPercentage = false,
  style,
  testID,
  color,
}) => {
  // Ensure progress is between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <View style={[styles.container, style]} testID={testID}>
      {(label || showPercentage) && (
        <View style={styles.labelContainer}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercentage && <Text style={styles.percentage}>{clampedProgress}%</Text>}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <LinearGradient
          colors={color ? [color, color] : GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.progress,
            { width: `${clampedProgress}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  percentage: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  track: {
    width: '100%',
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
  },
});

export default ProgressBar;