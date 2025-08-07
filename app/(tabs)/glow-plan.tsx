import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { CheckCircle, Circle, Droplets, Moon, Dumbbell, Apple, Heart, Plus, Edit3, Bell, Trophy, Flame } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Button from '@/components/Button';
import Card from '@/components/Card';
import ProgressBar from '@/components/ProgressBar';
import Input from '@/components/Input';
import Colors from '@/constants/colors';
import { useAuth } from '@/hooks/auth-store';
import { GlowUpPlan, GlowUpDayTask, GlowUpProgress } from '@/types';
import { aiService } from '@/lib/ai-service';
import { logger } from '@/lib/logger';

interface DayTaskWithProduct extends GlowUpDayTask {
  showProductInput?: boolean;
}

export default function GlowUpPlanScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  
  const [plan, setPlan] = useState<GlowUpPlan | null>(null);
  const [tasks, setTasks] = useState<DayTaskWithProduct[]>([]);
  const [progress, setProgress] = useState<GlowUpProgress | null>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [productInput, setProductInput] = useState('');
  const [notificationPermission, setNotificationPermission] = useState<boolean>(false);

  // Initialize plan from params or load existing
  useEffect(() => {
    initializePlan();
    checkNotificationPermission();
  }, []);

  const checkNotificationPermission = async () => {
    try {
      // Notifications have limited support in Expo Go SDK 53
      if (Platform.OS === 'web') {
        setNotificationPermission(false);
        return;
      }
      
      const { status } = await Notifications.getPermissionsAsync();
      setNotificationPermission(status === 'granted');
    } catch (error) {
      logger.warn('Failed to check notification permission', error as Error);
      setNotificationPermission(false);
    }
  };

  const requestNotificationPermission = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert(
          'Notifications Not Available',
          'Push notifications are not supported in the web version. Use the mobile app for notification reminders!'
        );
        return;
      }
      
      // Show info about Expo Go limitations
      Alert.alert(
        'Notification Reminder',
        'Due to Expo Go limitations in SDK 53, push notifications have limited functionality. For full notification support, consider using a development build.\n\nWould you still like to enable local notifications?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Enable', 
            onPress: async () => {
              try {
                const { status } = await Notifications.requestPermissionsAsync();
                setNotificationPermission(status === 'granted');
                
                if (status === 'granted') {
                  await scheduleNotifications();
                  Alert.alert('Notifications Enabled', 'Local notifications have been set up. Note: functionality may be limited in Expo Go.');
                } else {
                  Alert.alert('Permission Denied', 'Notification permission was not granted.');
                }
              } catch (error) {
                logger.error('Failed to request notification permission', error as Error);
                Alert.alert('Error', 'Failed to set up notifications. This feature has limited support in Expo Go.');
              }
            }
          }
        ]
      );
    } catch (error) {
      logger.error('Failed to request notification permission', error as Error);
      Alert.alert('Error', 'Failed to set up notifications. This feature has limited support in Expo Go.');
    }
  };

  const scheduleNotifications = async () => {
    try {
      if (Platform.OS === 'web') {
        logger.warn('Notifications not supported on web platform');
        return;
      }
      
      // Cancel existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Schedule daily notifications for 30 days
      // Note: This has limited functionality in Expo Go SDK 53
      for (let day = 1; day <= 30; day++) {
        const notificationDate = new Date();
        notificationDate.setDate(notificationDate.getDate() + day - 1);
        notificationDate.setHours(21, 30, 0, 0); // 9:30 PM
        
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Don't forget your glow-up routine! ✨",
              body: `Day ${day} of your 30-day plan is waiting for you!`,
              data: { day, planId: plan?.id },
            },
            trigger: {
              type: 'date' as const,
              date: notificationDate,
            },
          });
        } catch (scheduleError) {
          logger.warn(`Failed to schedule notification for day ${day}`, scheduleError as Error);
          // Continue with other notifications even if one fails
        }
      }
      
      logger.info('Attempted to schedule 30 daily notifications (limited support in Expo Go)');
    } catch (error) {
      logger.error('Failed to schedule notifications', error as Error);
    }
  };

  const initializePlan = async () => {
    try {
      setLoading(true);
      
      // Check if we have params to create a new plan
      if (params.goal && params.glowScore) {
        await createNewPlan(params.goal as string, parseInt(params.glowScore as string));
      } else {
        // Load existing plan
        await loadExistingPlan();
      }
    } catch (error) {
      logger.error('Failed to initialize plan', error as Error);
      Alert.alert('Error', 'Failed to load your glow-up plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createNewPlan = async (goal: string, glowScore: number) => {
    try {
      logger.info('Creating new glow-up plan', { goal, glowScore });
      
      // Generate AI coaching plan
      await aiService.generateCoachingPlan(goal, glowScore);
      
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 30);
      
      const newPlan: GlowUpPlan = {
        id: `glow-plan-${Date.now()}`,
        user_id: user?.id || 'anonymous',
        goal,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        created_at: new Date().toISOString(),
        analysis_data: params.analysisData ? JSON.parse(params.analysisData as string) : undefined,
        progress: {
          completed_days: 0,
          total_days: 30,
          completion_percentage: 0,
        },
      };
      
      // Convert AI tasks to our format
      const planTasks: GlowUpDayTask[] = [];
      
      for (let day = 1; day <= 30; day++) {
        const dayTasks = generateDayTasks(day, newPlan.id, goal, glowScore, newPlan.analysis_data);
        planTasks.push(...dayTasks);
      }
      
      // Save to storage
      await AsyncStorage.setItem(`glow-plan-${newPlan.id}`, JSON.stringify(newPlan));
      await AsyncStorage.setItem(`glow-tasks-${newPlan.id}`, JSON.stringify(planTasks));
      await AsyncStorage.setItem('current-glow-plan', newPlan.id);
      
      setPlan(newPlan);
      setTasks(planTasks);
      
      // Initialize progress
      const initialProgress: GlowUpProgress = {
        plan_id: newPlan.id,
        user_id: user?.id || 'anonymous',
        current_day: 1,
        completed_tasks: 0,
        total_tasks: planTasks.length,
        streak_days: 0,
        last_activity_date: new Date().toISOString(),
        weekly_progress: Array.from({ length: 5 }, (_, i) => ({
          week: i + 1,
          completed_days: 0,
          total_days: 7,
        })),
      };
      
      setProgress(initialProgress);
      await AsyncStorage.setItem(`glow-progress-${newPlan.id}`, JSON.stringify(initialProgress));
      
      logger.info('New glow-up plan created successfully');
    } catch (error) {
      logger.error('Failed to create new plan', error as Error);
      throw error;
    }
  };

  const generateDayTasks = (day: number, planId: string, goal: string, glowScore: number, analysisData?: any): GlowUpDayTask[] => {
    const taskDate = new Date();
    taskDate.setDate(taskDate.getDate() + day - 1);
    
    const baseTasks: Omit<GlowUpDayTask, 'id'>[] = [
      {
        plan_id: planId,
        user_id: user?.id || 'anonymous',
        day,
        date: taskDate.toISOString(),
        title: 'Morning Skincare Routine',
        description: 'Complete your morning skincare routine',
        type: 'skincare',
        product_suggestion: getSkincareRecommendation('morning', analysisData),
        completed: false,
      },
      {
        plan_id: planId,
        user_id: user?.id || 'anonymous',
        day,
        date: taskDate.toISOString(),
        title: 'Hydration Goal',
        description: 'Drink 8-10 glasses of water throughout the day',
        type: 'hydration',
        completed: false,
      },
      {
        plan_id: planId,
        user_id: user?.id || 'anonymous',
        day,
        date: taskDate.toISOString(),
        title: 'Evening Skincare',
        description: 'Complete your evening skincare routine',
        type: 'skincare',
        product_suggestion: getSkincareRecommendation('evening', analysisData),
        completed: false,
      },
    ];
    
    // Add weekly special tasks
    if (day % 7 === 0) {
      baseTasks.push({
        plan_id: planId,
        user_id: user?.id || 'anonymous',
        day,
        date: taskDate.toISOString(),
        title: 'Weekly Face Mask',
        description: 'Apply a hydrating or purifying face mask',
        type: 'skincare',
        product_suggestion: 'Hydrating sheet mask or clay mask',
        completed: false,
      });
    }
    
    // Add exercise every 3 days
    if (day % 3 === 0) {
      baseTasks.push({
        plan_id: planId,
        user_id: user?.id || 'anonymous',
        day,
        date: taskDate.toISOString(),
        title: 'Light Exercise',
        description: '20-30 minutes of light exercise to boost circulation',
        type: 'exercise',
        completed: false,
      });
    }
    
    return baseTasks.map(task => ({
      ...task,
      id: `task-${planId}-${day}-${Math.random().toString(36).substr(2, 9)}`,
    }));
  };

  const getSkincareRecommendation = (timeOfDay: 'morning' | 'evening', analysisData?: any): string => {
    if (!analysisData) {
      return timeOfDay === 'morning' 
        ? 'Gentle cleanser + Vitamin C serum + Moisturizer + SPF 30+'
        : 'Double cleanse + Retinol serum + Night moisturizer';
    }
    
    const { skinType, hydration, brightness } = analysisData;
    
    if (timeOfDay === 'morning') {
      let recommendation = 'Gentle cleanser + ';
      
      if (brightness < 70) {
        recommendation += 'Vitamin C serum + ';
      }
      
      if (hydration < 70) {
        recommendation += 'Hyaluronic acid serum + ';
      }
      
      recommendation += 'Moisturizer + SPF 30+';
      return recommendation;
    } else {
      let recommendation = 'Double cleanse + ';
      
      if (skinType === 'Oily') {
        recommendation += 'Salicylic acid toner + ';
      }
      
      recommendation += 'Retinol serum (2x/week) + Night moisturizer';
      return recommendation;
    }
  };

  const loadExistingPlan = async () => {
    try {
      const currentPlanId = await AsyncStorage.getItem('current-glow-plan');
      if (!currentPlanId) {
        // No existing plan, redirect to create one
        router.replace('/(tabs)/glow-analysis');
        return;
      }
      
      const planData = await AsyncStorage.getItem(`glow-plan-${currentPlanId}`);
      const tasksData = await AsyncStorage.getItem(`glow-tasks-${currentPlanId}`);
      const progressData = await AsyncStorage.getItem(`glow-progress-${currentPlanId}`);
      
      if (planData && tasksData) {
        const loadedPlan = JSON.parse(planData);
        const loadedTasks = JSON.parse(tasksData);
        const loadedProgress = progressData ? JSON.parse(progressData) : null;
        
        setPlan(loadedPlan);
        setTasks(loadedTasks);
        setProgress(loadedProgress);
        
        // Calculate current day
        const startDate = new Date(loadedPlan.start_date);
        const today = new Date();
        const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        setCurrentDay(Math.max(1, Math.min(30, daysDiff)));
      }
    } catch (error) {
      logger.error('Failed to load existing plan', error as Error);
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    try {
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, completed: !task.completed };
        }
        return task;
      });
      
      setTasks(updatedTasks);
      
      // Update progress
      if (progress && plan) {
        const completedTasks = updatedTasks.filter(t => t.completed).length;
        const completedDays = new Set(updatedTasks.filter(t => t.completed).map(t => t.day)).size;
        
        const updatedProgress: GlowUpProgress = {
          ...progress,
          completed_tasks: completedTasks,
          current_day: currentDay,
          last_activity_date: new Date().toISOString(),
        };
        
        // Update plan progress
        const updatedPlan: GlowUpPlan = {
          ...plan,
          progress: {
            completed_days: completedDays,
            total_days: 30,
            completion_percentage: Math.round((completedDays / 30) * 100),
          },
        };
        
        setProgress(updatedProgress);
        setPlan(updatedPlan);
        
        // Save to storage
        await AsyncStorage.setItem(`glow-tasks-${plan.id}`, JSON.stringify(updatedTasks));
        await AsyncStorage.setItem(`glow-progress-${plan.id}`, JSON.stringify(updatedProgress));
        await AsyncStorage.setItem(`glow-plan-${plan.id}`, JSON.stringify(updatedPlan));
      }
    } catch (error) {
      logger.error('Failed to toggle task completion', error as Error);
    }
  };

  const updateUserProduct = async (taskId: string, product: string) => {
    try {
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, user_product: product, showProductInput: false };
        }
        return task;
      });
      
      setTasks(updatedTasks);
      setEditingProduct(null);
      setProductInput('');
      
      if (plan) {
        await AsyncStorage.setItem(`glow-tasks-${plan.id}`, JSON.stringify(updatedTasks));
      }
    } catch (error) {
      logger.error('Failed to update user product', error as Error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadExistingPlan();
    setRefreshing(false);
  }, []);

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'skincare': return <Heart size={20} color={Colors.light.tint} />;
      case 'hydration': return <Droplets size={20} color={Colors.info} />;
      case 'sleep': return <Moon size={20} color={Colors.secondary} />;
      case 'exercise': return <Dumbbell size={20} color={Colors.success} />;
      case 'nutrition': return <Apple size={20} color={Colors.warning} />;
      default: return <Circle size={20} color={Colors.light.tabIconDefault} />;
    }
  };

  const getCurrentDayTasks = () => {
    return tasks.filter(task => task.day === currentDay);
  };

  const getStreakDays = () => {
    if (!tasks.length) return 0;
    
    let streak = 0;
    
    for (let i = currentDay; i >= 1; i--) {
      const dayTasks = tasks.filter(task => task.day === i);
      const completedTasks = dayTasks.filter(task => task.completed);
      
      if (completedTasks.length === dayTasks.length && dayTasks.length > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} style={{ marginBottom: 20 }} />
        <Text style={styles.loadingText}>Setting up your 30-day glow-up plan...</Text>
        <Text style={styles.loadingSubtext}>Analyzing your skin data...</Text>
        <Text style={styles.loadingSubtext}>Finding the perfect products for your glow-up journey.</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No glow-up plan found</Text>
        <Button
          title="Create New Plan"
          onPress={() => router.replace('/(tabs)/glow-analysis')}
          style={styles.errorButton}
        />
      </View>
    );
  }

  const currentDayTasks = getCurrentDayTasks();
  const completedTasks = currentDayTasks.filter(task => task.completed).length;
  const streakDays = getStreakDays();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Stack.Screen 
        options={{ 
          title: '30-Day Glow-Up Plan',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerRight: () => (
            <TouchableOpacity onPress={() => {
              if (!notificationPermission) {
                requestNotificationPermission();
              } else {
                Alert.alert(
                  'Notifications Status', 
                  Platform.OS === 'web' 
                    ? 'Notifications are not supported in the web version. Use the mobile app for notification reminders!' 
                    : 'Daily reminders are enabled! Note: functionality may be limited in Expo Go.'
                );
              }
            }}>
              <Bell size={24} color={notificationPermission ? Colors.light.tint : Colors.light.tabIconDefault} />
            </TouchableOpacity>
          ),
        }} 
      />

      {/* Progress Header */}
      <Card style={styles.progressCard} gradient>
        <View style={styles.progressHeader}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressTitle}>Day {currentDay} of 30</Text>
            <Text style={styles.progressSubtitle}>{plan.goal}</Text>
          </View>
          <View style={styles.streakContainer}>
            <Flame size={24} color={Colors.warning} />
            <Text style={styles.streakText}>{streakDays}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>
        
        <View style={styles.progressBarContainer}>
          <ProgressBar 
            progress={plan.progress.completion_percentage} 
            height={12}
            showPercentage
            style={styles.progressBar}
          />
          <Text style={styles.progressText}>
            You have completed {plan.progress.completed_days} of 30 days ✅
          </Text>
        </View>
      </Card>

      {/* Day Navigation */}
      <Card style={styles.dayNavCard}>
        <View style={styles.dayNavHeader}>
          <Text style={styles.dayNavTitle}>Select Day</Text>
          <TouchableOpacity onPress={() => setCurrentDay(Math.min(30, Math.floor((new Date().getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1))}>
            <Text style={styles.todayButton}>Today</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayNavScroll}>
          {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
            const dayTasks = tasks.filter(task => task.day === day);
            const dayCompleted = dayTasks.length > 0 && dayTasks.every(task => task.completed);
            const isCurrentDay = day === currentDay;
            const isToday = day === Math.floor((new Date().getTime() - new Date(plan.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;
            
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayButton,
                  isCurrentDay && styles.dayButtonActive,
                  dayCompleted && styles.dayButtonCompleted,
                  isToday && styles.dayButtonToday,
                ]}
                onPress={() => setCurrentDay(day)}
              >
                <Text style={[
                  styles.dayButtonText,
                  isCurrentDay && styles.dayButtonTextActive,
                  dayCompleted && styles.dayButtonTextCompleted,
                ]}>
                  {day}
                </Text>
                {dayCompleted && (
                  <CheckCircle size={12} color={Colors.white} style={styles.dayCompletedIcon} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Card>

      {/* Daily Tasks */}
      <Card style={styles.tasksCard}>
        <View style={styles.tasksHeader}>
          <Text style={styles.tasksTitle}>Day {currentDay} Tasks</Text>
          <View style={styles.tasksProgress}>
            <Text style={styles.tasksProgressText}>
              {completedTasks}/{currentDayTasks.length} completed
            </Text>
            <Trophy size={16} color={completedTasks === currentDayTasks.length && currentDayTasks.length > 0 ? Colors.gold : Colors.light.tabIconDefault} />
          </View>
        </View>
        
        {currentDayTasks.map(task => (
          <View key={task.id} style={styles.taskItem}>
            <TouchableOpacity
              style={styles.taskCheckbox}
              onPress={() => toggleTaskCompletion(task.id)}
            >
              {task.completed ? (
                <CheckCircle size={24} color={Colors.success} />
              ) : (
                <Circle size={24} color={Colors.light.tabIconDefault} />
              )}
            </TouchableOpacity>
            
            <View style={styles.taskContent}>
              <View style={styles.taskHeader}>
                {getTaskIcon(task.type)}
                <Text style={[
                  styles.taskTitle,
                  task.completed && styles.taskTitleCompleted,
                ]}>
                  {task.title}
                </Text>
              </View>
              
              <Text style={[
                styles.taskDescription,
                task.completed && styles.taskDescriptionCompleted,
              ]}>
                {task.description}
              </Text>
              
              {task.product_suggestion && (
                <View style={styles.productSection}>
                  <Text style={styles.productLabel}>Suggested Product:</Text>
                  <Text style={styles.productSuggestion}>{task.product_suggestion}</Text>
                  
                  {task.user_product ? (
                    <View style={styles.userProductContainer}>
                      <Text style={styles.userProductLabel}>Your Product:</Text>
                      <View style={styles.userProductRow}>
                        <Text style={styles.userProduct}>{task.user_product}</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingProduct(task.id);
                            setProductInput(task.user_product || '');
                          }}
                        >
                          <Edit3 size={16} color={Colors.light.tint} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addProductButton}
                      onPress={() => {
                        setEditingProduct(task.id);
                        setProductInput('');
                      }}
                    >
                      <Plus size={16} color={Colors.light.tint} />
                      <Text style={styles.addProductText}>Add your product</Text>
                    </TouchableOpacity>
                  )}
                  
                  {editingProduct === task.id && (
                    <View style={styles.productInputContainer}>
                      <Input
                        value={productInput}
                        onChangeText={setProductInput}
                        placeholder="Enter your product name"
                        style={styles.productInput}
                      />
                      <View style={styles.productInputButtons}>
                        <Button
                          title="Save"
                          onPress={() => updateUserProduct(task.id, productInput)}
                          style={styles.productSaveButton}
                          disabled={!productInput.trim()}
                        />
                        <Button
                          title="Cancel"
                          variant="outline"
                          onPress={() => {
                            setEditingProduct(null);
                            setProductInput('');
                          }}
                          style={styles.productCancelButton}
                        />
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
        
        {currentDayTasks.length === 0 && (
          <View style={styles.noTasksContainer}>
            <Text style={styles.noTasksText}>No tasks for this day</Text>
          </View>
        )}
      </Card>

      {/* Weekly Progress */}
      {progress && (
        <Card style={styles.weeklyProgressCard}>
          <Text style={styles.weeklyProgressTitle}>Weekly Progress</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {progress.weekly_progress.map(week => (
              <View key={week.week} style={styles.weekItem}>
                <Text style={styles.weekLabel}>Week {week.week}</Text>
                <View style={styles.weekProgressContainer}>
                  <ProgressBar 
                    progress={(week.completed_days / week.total_days) * 100}
                    height={8}
                    style={styles.weekProgressBar}
                  />
                  <Text style={styles.weekProgressText}>
                    {week.completed_days}/{week.total_days}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title="View Progress Photos"
          variant="outline"
          onPress={() => {
            // TODO: Implement progress photos feature
            Alert.alert('Coming Soon', 'Progress photos feature will be available soon!');
          }}
          style={styles.actionButton}
        />
        
        <Button
          title="Share Progress"
          variant="outline"
          onPress={() => {
            // TODO: Implement share feature
            Alert.alert('Coming Soon', 'Share progress feature will be available soon!');
          }}
          style={styles.actionButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
    minHeight: 400,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.textDark,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: Colors.textDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorButton: {
    width: '100%',
  },
  progressCard: {
    margin: 20,
    marginTop: 16,
    padding: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textDark,
    marginBottom: 4,
  },
  progressSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    lineHeight: 22,
  },
  streakContainer: {
    alignItems: 'center',
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  streakText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.warning,
    marginTop: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: Colors.warning,
    marginTop: 2,
  },
  progressBarContainer: {
    marginTop: 10,
  },
  progressBar: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  dayNavCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
  },
  dayNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dayNavTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
  },
  todayButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  dayNavScroll: {
    flexDirection: 'row',
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    position: 'relative',
  },
  dayButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayButtonCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  dayButtonToday: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textDark,
  },
  dayButtonTextActive: {
    color: Colors.white,
  },
  dayButtonTextCompleted: {
    color: Colors.white,
  },
  dayCompletedIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  tasksCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tasksTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textDark,
  },
  tasksProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tasksProgressText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  taskCheckbox: {
    marginRight: 16,
    marginTop: 2,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textDark,
    marginLeft: 8,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textLight,
  },
  taskDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  taskDescriptionCompleted: {
    textDecorationLine: 'line-through',
  },
  productSection: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  productLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  productSuggestion: {
    fontSize: 14,
    color: Colors.textDark,
    marginBottom: 8,
  },
  userProductContainer: {
    marginTop: 8,
  },
  userProductLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  userProductRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userProduct: {
    fontSize: 14,
    color: Colors.textDark,
    fontWeight: '500',
    flex: 1,
  },
  addProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addProductText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
  productInputContainer: {
    marginTop: 12,
  },
  productInput: {
    marginBottom: 12,
  },
  productInputButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  productSaveButton: {
    flex: 1,
  },
  productCancelButton: {
    flex: 1,
  },
  noTasksContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noTasksText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  weeklyProgressCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
  },
  weeklyProgressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textDark,
    marginBottom: 16,
  },
  weekItem: {
    marginRight: 20,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textDark,
    marginBottom: 8,
  },
  weekProgressContainer: {
    alignItems: 'center',
  },
  weekProgressBar: {
    width: 60,
    marginBottom: 4,
  },
  weekProgressText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});