import React from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions, ImageSourcePropType } from 'react-native';

import { COLORS } from '@/constants/colors';

interface OnboardingSlideProps {
  title: string;
  description: string;
  image: ImageSourcePropType;
  testID?: string;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({
  title,
  description,
  image,
  testID,
}) => {
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.container, { width }]} testID={testID}>
      <Image
        source={image}
        style={[styles.image, { width: width * 0.8 }]}
        resizeMode="contain"
      />
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    height: 300,
    marginBottom: 30,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
});

export default OnboardingSlide;