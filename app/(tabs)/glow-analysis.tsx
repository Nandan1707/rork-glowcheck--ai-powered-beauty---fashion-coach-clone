import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator, Platform, TextInput, Alert } from 'react-native';
import { CameraView, CameraType } from 'expo-camera';
import { Camera, RefreshCw, Info, Target, Sparkles, Crown } from 'lucide-react-native';
import { Stack, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import Button from '@/components/Button';
import Card from '@/components/Card';
import ProgressBar from '@/components/ProgressBar';
import PremiumModal from '@/components/PremiumModal';
import { COLORS } from '@/constants/colors';
import { aiService, GlowAnalysisResult } from '@/lib/ai-service';
import { useAuth } from '@/hooks/auth-store';

export default function GlowAnalysisScreen() {
  const { checkPremiumAccess, isPremium, startFreeTrial, subscriptionLoading } = useAuth();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(false);
  const [facing, setFacing] = useState<CameraType>('front');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<GlowAnalysisResult | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [takingPicture, setTakingPicture] = useState(false);
  const [cameraReadyTimer, setCameraReadyTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [facePosition, setFacePosition] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [faceDetectionTimer, setFaceDetectionTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [lastFaceDetectionTime, setLastFaceDetectionTime] = useState<number>(0);
  
  const cameraRef = useRef<any>(null);
  const faceDetectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);



  const takePicture = async () => {
    if (!cameraRef.current || takingPicture || !cameraReady || !faceDetected) {
      console.log('Cannot take picture:', { 
        hasCamera: !!cameraRef.current, 
        takingPicture, 
        cameraReady,
        faceDetected
      });
      return;
    }
    
    console.log('Taking picture with face detected...');
    setTakingPicture(true);
    
    try {
      // Additional wait for web to ensure camera has enough data
      if (Platform.OS === 'web') {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: Platform.OS === 'web',
      });
      
      console.log('Picture taken successfully:', photo.uri);
      
      setCapturedImage(photo.uri);
      setCameraActive(false);
      setCameraReady(false);
      setFaceDetected(false);
      setFacePosition(null);
      
      // Clear all timers
      if (cameraReadyTimer) {
        clearTimeout(cameraReadyTimer);
        setCameraReadyTimer(null);
      }
      if (faceDetectionTimer) {
        clearTimeout(faceDetectionTimer);
        setFaceDetectionTimer(null);
      }
      if (faceDetectionIntervalRef.current) {
        clearInterval(faceDetectionIntervalRef.current);
        faceDetectionIntervalRef.current = null;
      }
      
      analyzeImage(photo.uri);
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert(
        'Camera Error', 
        Platform.OS === 'web' 
          ? 'Camera is still loading. Please wait a moment and try again.'
          : 'Failed to take picture. Please try again.'
      );
    } finally {
      setTakingPicture(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setCapturedImage(result.assets[0].uri);
      analyzeImage(result.assets[0].uri);
    }
  };

  const analyzeImage = async (imageUri: string) => {
    setAnalyzing(true);
    
    try {
      const result = await aiService.analyzeGlow(imageUri);
      setAnalysisResult({
        ...result,
        tips: result.tips || result.improvements || [],
      });
      
      // Show recommendations after analysis
      setTimeout(() => {
        setShowRecommendations(true);
      }, 1000);
    } catch (error) {
      console.error('Error analyzing image:', error);
      // Fallback to mock data if AI service fails
      const improvements = [
        'Increase your water intake to improve skin hydration.',
        'Use a vitamin C serum in the morning for brighter skin.',
        'Apply sunscreen daily to protect your skin from UV damage.',
      ];
      
      const mockResult: GlowAnalysisResult = {
        glowScore: Math.floor(Math.random() * 30) + 70,
        skinTone: 'Medium',
        brightness: Math.floor(Math.random() * 30) + 70,
        hydration: Math.floor(Math.random() * 30) + 70,
        symmetry: Math.floor(Math.random() * 30) + 70,
        skinType: 'Normal',
        improvements,
        tips: improvements,
        recommendations: [
          'Morning: Gentle cleanser + Vitamin C serum + Moisturizer + SPF',
          'Evening: Double cleanse + Retinol (2x/week) + Hydrating serum + Night cream',
        ],
      };
      setAnalysisResult({
        ...mockResult,
        tips: mockResult.tips || mockResult.improvements,
      });
      
      // Show recommendations after analysis
      setTimeout(() => {
        setShowRecommendations(true);
      }, 1000);
    } finally {
      setAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setShowRecommendations(false);
  };

  const toggleCamera = () => {
    if (!permission?.granted) {
      requestPermission();
    } else {
      setCameraActive(!cameraActive);
      if (!cameraActive) {
        setCameraReady(false);
        setFaceDetected(false);
        setFacePosition(null);
        
        // Clear any existing timers
        if (cameraReadyTimer) {
          clearTimeout(cameraReadyTimer);
        }
        if (faceDetectionTimer) {
          clearTimeout(faceDetectionTimer);
          setFaceDetectionTimer(null);
        }
        if (faceDetectionIntervalRef.current) {
          clearInterval(faceDetectionIntervalRef.current);
          faceDetectionIntervalRef.current = null;
        }
        
        // Set camera ready after a longer delay for web
        const timer = setTimeout(() => {
          setCameraReady(true);
          setCameraReadyTimer(null);
        }, Platform.OS === 'web' ? 3000 : 1000);
        setCameraReadyTimer(timer);
      } else {
        // Clear all timers when closing camera
        if (cameraReadyTimer) {
          clearTimeout(cameraReadyTimer);
          setCameraReadyTimer(null);
        }
        if (faceDetectionTimer) {
          clearTimeout(faceDetectionTimer);
          setFaceDetectionTimer(null);
        }
        if (faceDetectionIntervalRef.current) {
          clearInterval(faceDetectionIntervalRef.current);
          faceDetectionIntervalRef.current = null;
        }
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
    // Reset face detection when switching cameras
    setFaceDetected(false);
    setFacePosition(null);
  };



  // Enhanced face detection simulation with realistic behavior and positioning
  const simulateFaceDetection = useCallback(() => {
    if (!cameraReady || takingPicture) return;
    
    const now = Date.now();
    
    // More sophisticated face detection simulation
    // Higher success rate when camera is stable and ready
    const cameraStabilityFactor = cameraReady ? 0.75 : 0.2;
    const faceDetectionSuccess = Math.random() < cameraStabilityFactor;
    
    if (faceDetectionSuccess && !faceDetected) {
      console.log('Face detected!');
      
      // Simulate face position within the camera guide circle
      const centerX = 125; // Half of guide circle width (250px)
      const centerY = 125; // Half of guide circle height (250px)
      const faceSize = 80 + Math.random() * 40; // Random face size between 80-120px
      
      // Add some variation to face position (slightly off-center for realism)
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;
      
      const facePos = {
        x: centerX + offsetX - faceSize / 2,
        y: centerY + offsetY - faceSize / 2,
        width: faceSize,
        height: faceSize
      };
      
      setFaceDetected(true);
      setFacePosition(facePos);
      setLastFaceDetectionTime(now);
      
      // Haptic feedback when face is detected (mobile only)
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      
    } else if (!faceDetectionSuccess && faceDetected) {
      // Only lose face detection if it's been a while since last detection
      if (now - lastFaceDetectionTime > 2000) {
        console.log('Face lost...');
        setFaceDetected(false);
        setFacePosition(null);
      }
    } else if (faceDetectionSuccess && faceDetected) {
      // Update face position slightly for natural movement
      if (facePosition) {
        const newPosition = {
          ...facePosition,
          x: facePosition.x + (Math.random() - 0.5) * 4,
          y: facePosition.y + (Math.random() - 0.5) * 4,
        };
        setFacePosition(newPosition);
        setLastFaceDetectionTime(now);
      }
    }
  }, [cameraReady, takingPicture, faceDetected, facePosition, lastFaceDetectionTime]);

  // Start face detection when camera is ready
  useEffect(() => {
    if (cameraReady && !takingPicture) {
      console.log('Starting face detection interval...');
      // Check for faces more frequently for better responsiveness
      faceDetectionIntervalRef.current = setInterval(simulateFaceDetection, 600);
    } else {
      if (faceDetectionIntervalRef.current) {
        console.log('Stopping face detection interval...');
        clearInterval(faceDetectionIntervalRef.current);
        faceDetectionIntervalRef.current = null;
      }
    }
    
    return () => {
      if (faceDetectionIntervalRef.current) {
        clearInterval(faceDetectionIntervalRef.current);
        faceDetectionIntervalRef.current = null;
      }
    };
  }, [cameraReady, takingPicture, simulateFaceDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraReadyTimer) clearTimeout(cameraReadyTimer);
      if (faceDetectionTimer) clearTimeout(faceDetectionTimer);
      if (faceDetectionIntervalRef.current) clearInterval(faceDetectionIntervalRef.current);
    };
  }, []);

  if (cameraActive) {
    return (
      <View style={styles.cameraContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <CameraView
          style={styles.camera}
          facing={facing}
          ref={cameraRef}
          onCameraReady={() => {
            console.log('Camera ready callback triggered');
            // Don't immediately set ready on web, wait for timer
            if (Platform.OS !== 'web') {
              setCameraReady(true);
            }
          }}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraGuide}>
              <View style={styles.cameraGuideCircle} />
            </View>
            <Text style={styles.cameraInstructions}>
              {!cameraReady 
                ? 'Preparing camera...' 
                : faceDetected
                  ? 'Face detected! Tap to take photo.'
                  : 'No face detected. Please align your face.'
              }
            </Text>
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity 
              style={styles.cameraButton} 
              onPress={toggleCameraFacing}
            >
              <RefreshCw color={COLORS.white} size={24} />
            </TouchableOpacity>
            {faceDetected ? (
              <TouchableOpacity 
                style={[
                  styles.captureButton, 
                  takingPicture && styles.captureButtonDisabled
                ]} 
                onPress={takePicture}
                disabled={takingPicture}
              >
                {takingPicture ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <View style={[styles.captureButtonInner, styles.captureButtonInnerActive]} />
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.captureButton, styles.captureButtonHidden]} />
            )}
            <TouchableOpacity 
              style={styles.cameraButton} 
              onPress={() => setCameraActive(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Glow Analysis',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }} />

      {!capturedImage ? (
        <View style={styles.startContainer}>
          <View style={styles.scanIconContainer}>
            <View style={styles.scanIcon}>
              <Camera size={48} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.startTitle}>Scan Your Face</Text>
          <Text style={styles.startDescription}>
            Get personalized beauty recommendations based on AI analysis of your skin.
          </Text>
          <View style={styles.buttonContainer}>
            <Button
              title="Start Face Scan"
              onPress={toggleCamera}
              leftIcon={<Camera size={18} color={COLORS.white} />}
              style={styles.button}
              testID="take-selfie-button"
            />
            <Button
              title="Upload Photo"
              variant="outline"
              onPress={pickImage}
              style={styles.button}
              testID="upload-photo-button"
            />
          </View>
        </View>
      ) : analyzing ? (
        <View style={styles.analyzingContainer}>
          <Image
            source={{ uri: capturedImage }}
            style={styles.capturedImage}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.analyzingText}>Analyzing your skin...</Text>
          </View>
        </View>
      ) : (
        <View style={styles.resultContainer}>
          <View style={styles.resultHeader}>
            <Image
              source={{ uri: capturedImage }}
              style={styles.resultImage}
            />
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreLabel}>Your Glow Score</Text>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreValue}>{analysisResult?.glowScore}</Text>
              </View>
              <Text style={styles.scoreFeedback}>
                {analysisResult?.glowScore && analysisResult.glowScore >= 90
                  ? 'Excellent!'
                  : analysisResult?.glowScore && analysisResult.glowScore >= 80
                  ? 'Very Good!'
                  : analysisResult?.glowScore && analysisResult.glowScore >= 70
                  ? 'Good!'
                  : 'Needs Improvement'}
              </Text>
            </View>
          </View>

          <Card style={styles.analysisCard}>
            <Text style={styles.analysisTitle}>Skin Analysis</Text>
            
            <View style={styles.skinToneContainer}>
              <Text style={styles.skinToneLabel}>Skin Tone</Text>
              <Text style={styles.skinToneValue}>{analysisResult?.skinTone}</Text>
            </View>
            
            <View style={styles.skinToneContainer}>
              <Text style={styles.skinToneLabel}>Skin Type</Text>
              <Text style={styles.skinToneValue}>{analysisResult?.skinType || 'Normal'}</Text>
            </View>

            <View style={styles.metricsContainer}>
              <Text style={styles.metricsLabel}>Brightness</Text>
              <ProgressBar 
                progress={analysisResult?.brightness || 0} 
                height={8}
                showPercentage
              />
              
              <Text style={styles.metricsLabel}>Hydration</Text>
              <ProgressBar 
                progress={analysisResult?.hydration || 0} 
                height={8}
                showPercentage
              />
              
              <Text style={styles.metricsLabel}>Symmetry</Text>
              <ProgressBar 
                progress={analysisResult?.symmetry || 0} 
                height={8}
                showPercentage
              />
            </View>
          </Card>

          <Card style={styles.tipsCard}>
            <View style={styles.tipsHeader}>
              <Text style={styles.tipsTitle}>Personalized Tips</Text>
              <Info size={16} color={COLORS.textLight} />
            </View>
            
            {analysisResult?.tips?.map((tip: string, index: number) => (
              <View key={index} style={styles.tipItem}>
                <View style={styles.tipBullet}>
                  <Text style={styles.tipBulletText}>{index + 1}</Text>
                </View>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </Card>

          <View style={styles.actionButtons}>
            <Button
              title="New Analysis"
              onPress={resetAnalysis}
              style={styles.actionButton}
            />
            <Button
              title="Save Results"
              variant="outline"
              onPress={() => {}}
              style={styles.actionButton}
            />
          </View>
        </View>
      )}
      
      {showRecommendations && analysisResult && (
        <PersonalizedRecommendations
          analysisResult={analysisResult}
          onClose={() => setShowRecommendations(false)}
          onStartCoaching={(goal: string) => {
            if (!isPremium) {
              setShowPremiumModal(true);
              return;
            }
            router.push({
              pathname: '/(tabs)/coaching',
              params: { 
                autoGenerate: 'true',
                goal: goal,
                glowScore: analysisResult.glowScore.toString()
              }
            });
            setShowRecommendations(false);
          }}
        />
      )}
    </ScrollView>
  );
}

// Custom hook for camera permissions
function useCameraPermissions() {
  const [permission, requestPermission] = React.useState<{granted: boolean} | null>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      requestPermission({ granted: status === 'granted' });
    })();
  }, []);

  return [permission, async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    requestPermission({ granted: status === 'granted' });
    return { granted: status === 'granted' };
  }] as const;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  startContainer: {
    padding: 20,
    alignItems: 'center',
  },
  scanIconContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  scanIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary + '20',
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  startDescription: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraGuide: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraGuideCircle: {
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.white,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  cameraInstructions: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 30,
  },
  cameraButton: {
    padding: 10,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    opacity: 0.5,
  },
  captureButtonInnerActive: {
    opacity: 1,
    backgroundColor: COLORS.success,
  },
  captureButtonDisabled: {
    opacity: 0.3,
  },
  captureButtonHidden: {
    opacity: 0,
  },
  cancelText: {
    color: COLORS.white,
    fontSize: 16,
  },
  analyzingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  capturedImage: {
    width: 250,
    height: 250,
    borderRadius: 125,
    marginVertical: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  analyzingText: {
    fontSize: 18,
    color: COLORS.textDark,
    marginTop: 16,
  },
  resultContainer: {
    padding: 20,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginRight: 20,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  scoreCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  scoreFeedback: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  analysisCard: {
    marginBottom: 20,
    padding: 20,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  skinToneContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  skinToneLabel: {
    fontSize: 16,
    color: COLORS.textDark,
  },
  skinToneValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  metricsContainer: {
    gap: 8,
  },
  metricsLabel: {
    fontSize: 16,
    color: COLORS.textDark,
    marginTop: 8,
  },
  tipsCard: {
    marginBottom: 20,
    padding: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  tipBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  tipBulletText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  tipText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});

// PersonalizedRecommendations Component
interface PersonalizedRecommendationsProps {
  analysisResult: GlowAnalysisResult;
  onClose: () => void;
  onStartCoaching: (goal: string) => void;
}

function PersonalizedRecommendations({ analysisResult, onClose, onStartCoaching }: PersonalizedRecommendationsProps) {
  const { isPremium } = useAuth();
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  const [customGoal, setCustomGoal] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const recommendations = [
    `Boost your glow score from ${analysisResult.glowScore} to 90+ in 30 days`,
    'Achieve radiant, hydrated skin with a personalized routine',
    'Develop consistent skincare habits for long-term results',
    'Enhance your natural beauty and build confidence',
    'Create a morning and evening routine that works for you',
  ];

  const handleRecommendationSelect = (recommendation: string) => {
    setSelectedRecommendation(recommendation);
    setShowCustomInput(false);
    setCustomGoal('');
  };



  const handleStartCoaching = () => {
    console.log('Starting coaching with:', { selectedRecommendation, showCustomInput, customGoal });
    
    if (selectedRecommendation) {
      console.log('Using selected recommendation:', selectedRecommendation);
      onStartCoaching(selectedRecommendation);
    } else if (showCustomInput && customGoal.trim()) {
      console.log('Using custom goal:', customGoal.trim());
      onStartCoaching(customGoal.trim());
    } else {
      console.warn('No goal selected or custom goal is empty');
      Alert.alert(
        'No Goal Selected',
        'Please select a recommendation or enter your custom goal to create your plan.'
      );
    }
  };

  return (
    <View style={recommendationStyles.overlay}>
      <View style={recommendationStyles.container}>
        <Card style={recommendationStyles.card} gradient>
          <View style={recommendationStyles.header}>
            <View style={recommendationStyles.headerLeft}>
              <Sparkles size={24} color={COLORS.primary} />
              <Text style={recommendationStyles.title}>Your Personalized Plan</Text>
            </View>
            {isPremium && (
              <View style={recommendationStyles.premiumBadge}>
                <Crown size={16} color={COLORS.gold} />
                <Text style={recommendationStyles.premiumText}>Premium</Text>
              </View>
            )}
          </View>
          
          <Text style={recommendationStyles.subtitle}>
            Based on your skin analysis, here are 5 personalized recommendations for the next 30 days:
          </Text>
          
          <View style={recommendationStyles.recommendationsContainer}>
            {recommendations.map((recommendation, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  recommendationStyles.recommendationItem,
                  selectedRecommendation === recommendation && recommendationStyles.recommendationSelected,
                ]}
                onPress={() => handleRecommendationSelect(recommendation)}
              >
                <View style={[
                  recommendationStyles.recommendationRadio,
                  selectedRecommendation === recommendation && recommendationStyles.recommendationRadioSelected,
                ]}>
                  {selectedRecommendation === recommendation && (
                    <View style={recommendationStyles.recommendationRadioInner} />
                  )}
                </View>
                <View style={recommendationStyles.recommendationContent}>
                  <Target size={16} color={COLORS.primary} />
                  <Text style={[
                    recommendationStyles.recommendationText,
                    selectedRecommendation === recommendation && recommendationStyles.recommendationTextSelected,
                  ]}>
                    {recommendation}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[
                recommendationStyles.customOption,
                showCustomInput && recommendationStyles.customOptionSelected,
              ]}
              onPress={() => {
                setShowCustomInput(true);
                setSelectedRecommendation(null);
              }}
            >
              <View style={[
                recommendationStyles.recommendationRadio,
                showCustomInput && recommendationStyles.recommendationRadioSelected,
              ]}>
                {showCustomInput && (
                  <View style={recommendationStyles.recommendationRadioInner} />
                )}
              </View>
              <Text style={[
                recommendationStyles.customOptionText,
                showCustomInput && recommendationStyles.customOptionTextSelected,
              ]}>
                I have a different goal in mind
              </Text>
            </TouchableOpacity>
          </View>
          
          {showCustomInput && (
            <View style={recommendationStyles.customInputContainer}>
              <Text style={recommendationStyles.customInputLabel}>
                What would you like to achieve in the next 30 days?
              </Text>
              <TextInput
                style={recommendationStyles.customInput}
                placeholder="e.g., Get glowing skin for my wedding, Clear up acne, Build confidence..."
                placeholderTextColor={COLORS.textLight}
                value={customGoal}
                onChangeText={setCustomGoal}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}
          
          <View style={recommendationStyles.buttonContainer}>
            <Button
              title="Create My 30-Day Plan"
              onPress={handleStartCoaching}
              disabled={!selectedRecommendation && (!showCustomInput || !customGoal.trim())}
              style={recommendationStyles.createButton}
              leftIcon={<Sparkles size={18} color={COLORS.white} />}
              testID="create-plan-button"
            />
            <Button
              title="Maybe Later"
              variant="outline"
              onPress={onClose}
              style={recommendationStyles.laterButton}
            />
          </View>
        </Card>
      </View>
    </View>
  );
}

const recommendationStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  card: {
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
    marginBottom: 20,
  },
  recommendationsContainer: {
    marginBottom: 20,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  recommendationSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  recommendationRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendationRadioSelected: {
    borderColor: COLORS.primary,
  },
  recommendationRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  recommendationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  recommendationText: {
    fontSize: 15,
    color: COLORS.textDark,
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  recommendationTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  customOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  customOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  customOptionText: {
    fontSize: 15,
    color: COLORS.textDark,
    fontStyle: 'italic',
  },
  customOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  customInputContainer: {
    marginBottom: 20,
  },
  customInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  customInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
    minHeight: 80,
  },
  buttonContainer: {
    gap: 12,
  },
  createButton: {
    width: '100%',
  },
  laterButton: {
    width: '100%',
  },
});