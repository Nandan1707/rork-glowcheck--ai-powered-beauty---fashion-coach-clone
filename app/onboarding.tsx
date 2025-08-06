import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Animated, useWindowDimensions, Image } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

import Button from '@/components/Button';
import { COLORS } from '@/constants/colors';

const slides = [
  {
    id: '1',
    title: 'Your glow journey\nbegins today',
    description: 'Unlock your full potential with personalized\nbeauty and style guidance.',
    image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=400&auto=format&fit=crop&ixlib=rb-4.0.3',
  },
  {
    id: '2',
    title: 'AI-Powered\nBeauty Analysis',
    description: 'Get personalized insights about your skin\nand receive expert recommendations.',
    image: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?q=80&w=400&auto=format&fit=crop&ixlib=rb-4.0.3',
  },
  {
    id: '3',
    title: 'Style & Outfit\nGuidance',
    description: 'Discover colors and styles that\ncomplement your unique features.',
    image: 'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?q=80&w=400&auto=format&fit=crop&ixlib=rb-4.0.3',
  },
];

interface SlideProps {
  item: typeof slides[0];
  width: number;
}

const OnboardingSlideComponent: React.FC<SlideProps> = ({ item, width }) => {
  return (
    <View style={[styles.slide, { width }]}>
      <View style={styles.illustrationContainer}>
        <View style={styles.illustrationCircle}>
          <Image 
            source={{ uri: item.image }}
            style={styles.illustration}
          />
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );
};

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    setCurrentIndex(viewableItems[0]?.index || 0);
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = (index: number) => {
    if (slidesRef.current) {
      slidesRef.current.scrollToIndex({ index });
    }
  };

  const nextSlide = () => {
    console.log('Next button pressed, currentIndex:', currentIndex);
    if (currentIndex < slides.length - 1) {
      scrollTo(currentIndex + 1);
    } else {
      router.replace('/auth/login');
    }
  };

  const skipToLogin = () => {
    console.log('Skip button pressed');
    router.replace('/auth/login');
  };

  return (
    <LinearGradient
      colors={['#F8F4F9', '#FFFFFF']}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <View style={styles.flatListContainer}>
        <FlatList
          data={slides}
          renderItem={({ item }) => <OnboardingSlideComponent item={item} width={width} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false }
          )}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
          scrollEventThrottle={32}
          testID="onboarding-flatlist"
        />
      </View>

      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index.toString()}
              style={[
                styles.dot,
                { width: dotWidth, opacity },
                { backgroundColor: COLORS.primary },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.footer}>
        {currentIndex === slides.length - 1 ? (
          <View style={styles.finalButtonContainer}>
            <Button
              title="Sign Up"
              onPress={() => router.push('/auth/register')}
              style={styles.primaryButton}
              testID="signup-button"
            />
            <Button
              title="Continue with Google"
              variant="outline"
              onPress={() => console.log('Google sign in')}
              style={styles.secondaryButton}
              testID="google-button"
            />
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <Button
              title="Skip"
              variant="text"
              onPress={skipToLogin}
              style={styles.skipButton}
              testID="skip-button"
            />
            <Button
              title="Next"
              onPress={nextSlide}
              style={styles.nextButton}
              testID="next-button"
            />
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatListContainer: {
    flex: 1,
  },
  slide: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 80,
    alignItems: 'center',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  illustrationCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#F4E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  illustration: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 38,
  },
  description: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: 50,
    paddingTop: 20,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  skipButton: {
    flex: 1,
    marginRight: 12,
    minHeight: 48,
  },
  nextButton: {
    flex: 2,
    marginLeft: 12,
    minHeight: 48,
  },
  finalButtonContainer: {
    gap: 16,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 25,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 25,
    borderColor: COLORS.border,
  },
  termsText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  termsLink: {
    color: COLORS.primary,
    fontWeight: '500',
  },
});