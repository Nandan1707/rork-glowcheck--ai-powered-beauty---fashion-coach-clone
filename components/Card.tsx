import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, GRADIENTS } from '@/constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: boolean;
  elevation?: number;
  testID?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  gradient = false,
  elevation = 2,
  testID,
}) => {
  if (gradient) {
    return (
      <View
        style={[
          styles.container,
          { shadowOpacity: 0.1, elevation },
          style,
        ]}
        testID={testID}
      >
        <LinearGradient
          colors={GRADIENTS.card}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {children}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: COLORS.white, shadowOpacity: 0.1, elevation },
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  gradient: {
    padding: 16,
    width: '100%',
    height: '100%',
  },
});

export default Card;