import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Shirt, Target, ChevronRight } from 'lucide-react-native';

import { useAuth } from '@/hooks/auth-store';
import { COLORS } from '@/constants/colors';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const dailyTips = [
    {
      id: '1',
      quote: 'Beauty begins the moment you decide to be yourself.',
      author: 'Coco Chanel'
    },
    {
      id: '2', 
      quote: 'The best foundation you can wear is glowing healthy skin.',
      author: 'Unknown'
    }
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hi, {user?.name || 'Olivia'}!</Text>
          <Text style={styles.subtitle}>Let&apos;s get glowing.</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.notificationBadge}>
            <View style={styles.notificationDot} />
          </View>
        </View>
      </View>

      {/* Start Glow Scan Card */}
      <TouchableOpacity 
        style={styles.glowScanCard}
        onPress={() => router.push('/glow-analysis')}
      >
        <View style={styles.glowScanContent}>
          <Text style={styles.glowScanTitle}>Start Glow Scan</Text>
          <Text style={styles.glowScanSubtitle}>AI facial analysis for{"\n"}personalized tips.</Text>
          <ChevronRight size={24} color={COLORS.white} style={styles.glowScanArrow} />
        </View>
      </TouchableOpacity>

      {/* Action Cards */}
      <View style={styles.actionCardsContainer}>
        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/outfit-analysis')}
        >
          <View style={styles.actionCardIcon}>
            <Shirt size={24} color={COLORS.primary} />
          </View>
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardTitle}>Rate My Outfit</Text>
            <Text style={styles.actionCardSubtitle}>Get instant feedback on{"\n"}your style.</Text>
          </View>
          <ChevronRight size={20} color={COLORS.textLight} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionCard}
          onPress={() => router.push('/coaching')}
        >
          <View style={styles.actionCardIcon}>
            <Target size={24} color={COLORS.primary} />
          </View>
          <View style={styles.actionCardContent}>
            <Text style={styles.actionCardTitle}>Coaching Plan</Text>
            <Text style={styles.actionCardSubtitle}>Continue your glow-up{"\n"}journey.</Text>
          </View>
          <ChevronRight size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Daily Tips */}
      <View style={styles.dailyTipsSection}>
        <Text style={styles.dailyTipsTitle}>Daily Tips</Text>
        <View style={styles.tipsContainer}>
          {dailyTips.map((tip, index) => (
            <View key={tip.id} style={[styles.tipCard, index === 1 && styles.tipCardSecond]}>
              <Text style={styles.tipQuote}>&apos;{tip.quote}&apos;</Text>
              <Text style={styles.tipAuthor}>- {tip.author}</Text>
            </View>
          ))}
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  headerRight: {
    position: 'relative',
  },
  notificationBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8D5F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
  },
  glowScanCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#C8A5E8',
    borderRadius: 20,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  glowScanContent: {
    position: 'relative',
    zIndex: 1,
  },
  glowScanTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 8,
  },
  glowScanSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  glowScanArrow: {
    position: 'absolute',
    right: 0,
    top: 12,
  },
  actionCardsContainer: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFE8F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionCardContent: {
    flex: 1,
  },
  actionCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  dailyTipsSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  dailyTipsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 20,
  },
  tipsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tipCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginRight: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tipCardSecond: {
    marginRight: 0,
    marginLeft: 12,
  },
  tipQuote: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  tipAuthor: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '500',
  },
});