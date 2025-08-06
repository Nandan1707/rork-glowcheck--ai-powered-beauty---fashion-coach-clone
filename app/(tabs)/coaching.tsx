import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Target, CheckCircle, Circle, Calendar, Trophy, Sparkles, Crown } from 'lucide-react-native';

import Button from '@/components/Button';
import Card from '@/components/Card';
import ProgressBar from '@/components/ProgressBar';
import PremiumModal from '@/components/PremiumModal';
import { COLORS } from '@/constants/colors';
import { aiService, CoachingPlan, DailyTask } from '@/lib/ai-service';
import { useAuth } from '@/hooks/auth-store';

export default function CoachingScreen() {
  const { isPremium, startFreeTrial, subscriptionLoading } = useAuth();
  const params = useLocalSearchParams();
  const [currentPlan, setCurrentPlan] = useState<CoachingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState('');
  const [showGoalSelection, setShowGoalSelection] = useState(true);
  const [todaysTasks, setTodaysTasks] = useState<DailyTask[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const goals = [
    'Improve skin hydration and glow',
    'Reduce acne and blemishes',
    'Anti-aging and wrinkle prevention',
    'Even out skin tone',
    'Develop a consistent skincare routine',
    'Boost overall confidence and beauty',
  ];

  // Handle auto-generation from glow analysis
  useEffect(() => {
    if (params.autoGenerate === 'true' && params.goal && params.glowScore) {
      if (!isPremium) {
        setShowPremiumModal(true);
        return;
      }
      
      setSelectedGoal(params.goal as string);
      const autoGeneratePlan = async () => {
        const planGoal = params.goal as string;
        const glowScore = parseInt(params.glowScore as string);
        
        setLoading(true);
        try {
          const plan = await aiService.generateCoachingPlan(planGoal, glowScore);
          setCurrentPlan(plan);
          setShowGoalSelection(false);
        } catch (error) {
          console.error('Error generating coaching plan:', error);
          Alert.alert('Error', 'Failed to generate coaching plan. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      
      autoGeneratePlan();
    }
  }, [params, isPremium]);

  useEffect(() => {
    if (currentPlan) {
      const today = new Date();
      const planStartDate = new Date(); // In production, store actual start date
      const daysDiff = Math.floor((today.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const actualDay = Math.min(Math.max(daysDiff, 1), 30);
      
      setCurrentDay(actualDay);
      const tasksForToday = currentPlan.dailyTasks.filter(task => task.day === actualDay);
      setTodaysTasks(tasksForToday);
    }
  }, [currentPlan]);

  const generatePlan = async (goal?: string, glowScore?: number) => {
    const planGoal = goal || selectedGoal;
    console.log('Generating plan with goal:', planGoal);
    console.log('isPremium:', isPremium);
    console.log('showPremiumModal:', showPremiumModal);
    
    if (!planGoal) {
      Alert.alert('No Goal Selected', 'Please select a goal before creating your plan.');
      return;
    }
    
    if (!isPremium) {
      console.log('User is not premium, showing premium modal');
      setShowPremiumModal(true);
      return;
    }
    
    setLoading(true);
    try {
      console.log('Calling AI service to generate plan...');
      const plan = await aiService.generateCoachingPlan(planGoal, glowScore || 75);
      console.log('Plan generated successfully:', plan);
      setCurrentPlan(plan);
      setShowGoalSelection(false);
      
      // Show success message
      Alert.alert(
        'Plan Created! 🎉',
        'Your personalized 30-day coaching plan has been created successfully. Start your journey today!',
        [{ text: 'Let\'s Go!', style: 'default' }]
      );
    } catch (error) {
      console.error('Error generating coaching plan:', error);
      Alert.alert(
        'Error Creating Plan',
        'Failed to generate coaching plan. Please check your connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => generatePlan(goal, glowScore) }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = (taskId: string) => {
    if (!currentPlan) return;
    
    const updatedTasks = currentPlan.dailyTasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    
    setCurrentPlan({ ...currentPlan, dailyTasks: updatedTasks });
    setTodaysTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const getCompletionRate = () => {
    if (!currentPlan) return 0;
    const completedTasks = currentPlan.dailyTasks.filter(task => task.completed).length;
    return Math.round((completedTasks / currentPlan.dailyTasks.length) * 100);
  };

  const getTodayCompletionRate = () => {
    if (todaysTasks.length === 0) return 0;
    const completedToday = todaysTasks.filter(task => task.completed).length;
    return Math.round((completedToday / todaysTasks.length) * 100);
  };

  const resetPlan = () => {
    setCurrentPlan(null);
    setShowGoalSelection(true);
    setSelectedGoal('');
    setTodaysTasks([]);
  };

  const handleUpgrade = async () => {
    const result = await startFreeTrial();
    
    if (result.success) {
      Alert.alert(
        'Free Trial Started! 🎉',
        'Welcome to Premium! You now have 7 days of free access to all premium features.',
        [{ text: 'Get Started', style: 'default' }]
      );
      
      // If there was a selected goal, generate the plan after upgrade
      if (selectedGoal) {
        setTimeout(() => generatePlan(), 500);
      }
    } else {
      Alert.alert('Error', result.error || 'Failed to start free trial. Please try again.');
    }
  };

  const renderTask = ({ item }: { item: DailyTask }) => (
    <TouchableOpacity
      style={[styles.taskItem, item.completed && styles.taskCompleted]}
      onPress={() => toggleTaskCompletion(item.id)}
    >
      <View style={styles.taskIcon}>
        {item.completed ? (
          <CheckCircle size={24} color={COLORS.success} />
        ) : (
          <Circle size={24} color={COLORS.textLight} />
        )}
      </View>
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, item.completed && styles.taskTitleCompleted]}>
          {item.title}
        </Text>
        <Text style={[styles.taskDescription, item.completed && styles.taskDescriptionCompleted]}>
          {item.description}
        </Text>
        <View style={styles.taskMeta}>
          <Text style={styles.taskType}>{item.type.toUpperCase()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (showGoalSelection) {
    return (
      <ScrollView style={styles.container}>
        <Stack.Screen options={{ title: 'Beauty Coaching' }} />
        
        <View style={styles.goalSelectionContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.titleContainer}>
              <Sparkles size={32} color={COLORS.primary} />
              <Text style={styles.title}>Your Beauty Journey</Text>
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Crown size={16} color={COLORS.gold} />
                  <Text style={styles.premiumText}>Premium</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>
              Choose your goal and get a personalized 30-day coaching plan
            </Text>
          </View>

          <Card style={styles.goalCard}>
            <Text style={styles.goalCardTitle}>What&apos;s your main goal?</Text>
            
            {goals.map((goal, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.goalOption,
                  selectedGoal === goal && styles.goalOptionSelected,
                ]}
                onPress={() => setSelectedGoal(goal)}
              >
                <View style={[
                  styles.goalRadio,
                  selectedGoal === goal && styles.goalRadioSelected,
                ]}>
                  {selectedGoal === goal && <View style={styles.goalRadioInner} />}
                </View>
                <Text style={[
                  styles.goalText,
                  selectedGoal === goal && styles.goalTextSelected,
                ]}>
                  {goal}
                </Text>
              </TouchableOpacity>
            ))}
          </Card>

          <Button
            title={loading ? 'Generating Plan...' : 'Create My Plan'}
            onPress={() => {
              console.log('Create My Plan button pressed');
              console.log('selectedGoal:', selectedGoal);
              generatePlan();
            }}
            disabled={!selectedGoal || loading}
            isLoading={loading}
            style={styles.generateButton}
            leftIcon={<Target size={18} color={COLORS.white} />}
            testID="create-my-plan-button"
          />
        </View>

        <PremiumModal
          visible={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          onUpgrade={handleUpgrade}
          isLoading={subscriptionLoading}
          onSuccess={() => {
            setShowPremiumModal(false);
            if (selectedGoal) {
              setTimeout(() => generatePlan(), 500);
            }
          }}
        />
      </ScrollView>
    );
  }

  if (!currentPlan) return null;

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'My Coaching Plan',
          headerRight: () => (
            <TouchableOpacity onPress={resetPlan} style={styles.resetButton}>
              <Text style={styles.resetButtonText}>New Plan</Text>
            </TouchableOpacity>
          ),
        }} 
      />

      <View style={styles.planContainer}>
        <Card style={styles.progressCard} gradient>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Day {currentDay} of 30</Text>
              <Text style={styles.progressGoal}>{currentPlan.goal}</Text>
            </View>
            <View style={styles.progressStats}>
              <Text style={styles.progressPercentage}>{getCompletionRate()}%</Text>
              <Text style={styles.progressLabel}>Complete</Text>
            </View>
          </View>
          <ProgressBar 
            progress={getCompletionRate()} 
            height={8}
            style={styles.progressBar}
          />
        </Card>

        <Card style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <View style={styles.todayTitleContainer}>
              <Calendar size={20} color={COLORS.primary} />
              <Text style={styles.todayTitle}>Today&apos;s Tasks</Text>
            </View>
            <View style={styles.todayProgress}>
              <Text style={styles.todayProgressText}>
                {todaysTasks.filter(t => t.completed).length}/{todaysTasks.length}
              </Text>
            </View>
          </View>
          
          <ProgressBar 
            progress={getTodayCompletionRate()} 
            height={6}
            style={styles.todayProgressBar}
          />

          <FlatList
            data={todaysTasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            style={styles.tasksList}
          />
        </Card>

        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Trophy size={20} color={COLORS.secondary} />
            <Text style={styles.tipsTitle}>Pro Tips</Text>
          </View>
          
          {currentPlan.tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <View style={styles.tipBullet}>
                <Text style={styles.tipBulletText}>{index + 1}</Text>
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Expected Results</Text>
          
          {currentPlan.expectedResults.map((result, index) => (
            <View key={index} style={styles.resultItem}>
              <CheckCircle size={16} color={COLORS.success} />
              <Text style={styles.resultText}>{result}</Text>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  goalSelectionContainer: {
    padding: 20,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  goalCard: {
    marginBottom: 30,
    padding: 20,
  },
  goalCardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 20,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  goalOptionSelected: {
    backgroundColor: COLORS.primary + '10',
  },
  goalRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalRadioSelected: {
    borderColor: COLORS.primary,
  },
  goalRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  goalText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textDark,
  },
  goalTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  generateButton: {
    width: '100%',
  },
  resetButton: {
    marginRight: 16,
  },
  resetButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  planContainer: {
    padding: 20,
  },
  progressCard: {
    marginBottom: 20,
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  progressGoal: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  progressStats: {
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  progressBar: {
    marginTop: 8,
  },
  todayCard: {
    marginBottom: 20,
    padding: 20,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginLeft: 8,
  },
  todayProgress: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  todayProgressBar: {
    marginBottom: 16,
  },
  tasksList: {
    maxHeight: 300,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskCompleted: {
    backgroundColor: COLORS.success + '10',
    borderColor: COLORS.success + '30',
  },
  taskIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textLight,
  },
  taskDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 8,
  },
  taskDescriptionCompleted: {
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    flexDirection: 'row',
  },
  taskType: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tipsCard: {
    marginBottom: 20,
    padding: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginLeft: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  tipBulletText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  resultsCard: {
    marginBottom: 30,
    padding: 20,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 12,
    lineHeight: 20,
  },
});