import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Sparkles, Target, Crown } from 'lucide-react-native';

import Button from '@/components/Button';
import Card from '@/components/Card';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/hooks/auth-store';
import { GlowAnalysisResult } from '@/lib/ai-service';

interface CoachingSuggestionProps {
  analysisResult: GlowAnalysisResult;
  onClose: () => void;
}

export default function CoachingSuggestion({ analysisResult, onClose }: CoachingSuggestionProps) {
  const { checkPremiumAccess, isPremium } = useAuth();
  const [thirtyDayGoal, setThirtyDayGoal] = useState('');
  const [showGoalInput, setShowGoalInput] = useState(false);

  const suggestions = [
    `Improve your glow score from ${analysisResult.glowScore} to 90+`,
    'Enhance skin hydration and brightness',
    'Develop a consistent skincare routine',
    'Achieve more even skin tone',
  ];

  const handleStartCoaching = () => {
    if (!checkPremiumAccess('Personalized Coaching Plans')) {
      return;
    }
    
    if (!showGoalInput) {
      setShowGoalInput(true);
      return;
    }
    
    if (!thirtyDayGoal.trim()) {
      Alert.alert('Goal Required', 'Please enter your 30-day beauty goal to continue.');
      return;
    }
    
    // Navigate to coaching with the goal
    router.push({
      pathname: '/(tabs)/coaching',
      params: { 
        autoGenerate: 'true',
        goal: thirtyDayGoal,
        glowScore: analysisResult.glowScore.toString()
      }
    });
    onClose();
  };

  return (
    <Card style={styles.container} gradient>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Sparkles size={24} color={COLORS.primary} />
          <Text style={styles.title}>Ready for Your Glow Up?</Text>
        </View>
        {isPremium && (
          <View style={styles.premiumBadge}>
            <Crown size={16} color={COLORS.gold} />
            <Text style={styles.premiumText}>Premium</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.subtitle}>
        Based on your analysis, here&apos;s what you can achieve in the next 30 days:
      </Text>
      
      <View style={styles.suggestionsContainer}>
        {suggestions.map((suggestion, index) => (
          <View key={index} style={styles.suggestionItem}>
            <Target size={16} color={COLORS.primary} />
            <Text style={styles.suggestionText}>{suggestion}</Text>
          </View>
        ))}
      </View>
      
      {!showGoalInput ? (
        <View style={styles.buttonContainer}>
          <Button
            title="Start My 30-Day Plan"
            onPress={handleStartCoaching}
            style={styles.startButton}
            leftIcon={<Sparkles size={18} color={COLORS.white} style={{ marginRight: 8 }} />}
          />
          <Button
            title="Maybe Later"
            variant="outline"
            onPress={onClose}
            style={styles.laterButton}
          />
        </View>
      ) : (
        <View style={styles.goalInputContainer}>
          <Text style={styles.goalLabel}>What&apos;s your main goal for the next 30 days?</Text>
          <TextInput
            style={styles.goalInput}
            placeholder="e.g., Get glowing skin for my wedding, Clear up acne, Build confidence..."
            placeholderTextColor={COLORS.textLight}
            value={thirtyDayGoal}
            onChangeText={setThirtyDayGoal}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={styles.goalButtonContainer}>
            <Button
              title="Create My Plan"
              onPress={handleStartCoaching}
              style={styles.createButton}
              disabled={!thirtyDayGoal.trim()}
            />
            <Button
              title="Back"
              variant="outline"
              onPress={() => setShowGoalInput(false)}
              style={styles.backButton}
            />
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginLeft: 8,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gold,
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    lineHeight: 22,
    marginBottom: 16,
  },
  suggestionsContainer: {
    marginBottom: 20,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  suggestionText: {
    fontSize: 15,
    color: COLORS.textDark,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
  },
  startButton: {
    width: '100%',
  },
  laterButton: {
    width: '100%',
  },
  goalInputContainer: {
    marginTop: 8,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  goalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
    minHeight: 80,
    marginBottom: 16,
  },
  goalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  createButton: {
    flex: 1,
  },
  backButton: {
    flex: 1,
  },
});

export { CoachingSuggestion };