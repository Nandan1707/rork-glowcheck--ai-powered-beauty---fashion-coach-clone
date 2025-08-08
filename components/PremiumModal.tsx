import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Crown, Check, Sparkles, Zap, Shield } from 'lucide-react-native';

import Button from '@/components/Button';
import { COLORS } from '@/constants/colors';
import { useSubscription } from '@/hooks/subscription-store';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}



export default function PremiumModal({ visible, onClose, onSuccess }: PremiumModalProps) {
  const { startFreeTrial, isLoading, error, clearError } = useSubscription();
  
  const handleUpgrade = async () => {
    try {
      clearError();
      await startFreeTrial('premium_monthly');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Upgrade failed:', err);
      Alert.alert(
        'Upgrade Failed',
        'There was an issue starting your free trial. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  React.useEffect(() => {
    if (error) {
      Alert.alert(
        'Error',
        error,
        [{ text: 'OK', onPress: clearError }]
      );
    }
  }, [error, clearError]);
  const features = [
    {
      icon: <Sparkles size={20} color={COLORS.gold} />,
      title: 'Personalized AI Plans',
      description: 'Get custom 30-day beauty coaching plans tailored to your skin type and goals'
    },
    {
      icon: <Zap size={20} color={COLORS.gold} />,
      title: 'Advanced Analysis',
      description: 'Detailed skin analysis with professional-grade AI recommendations'
    },
    {
      icon: <Shield size={20} color={COLORS.gold} />,
      title: 'Unlimited Access',
      description: 'Create unlimited plans, track progress, and get ongoing support'
    },
    {
      icon: <Crown size={20} color={COLORS.gold} />,
      title: 'Premium Features',
      description: 'Access to all current and future premium features and updates'
    }
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <View style={styles.crownContainer}>
              <Crown size={48} color={COLORS.gold} />
            </View>
            <Text style={styles.title}>Unlock Your Personalized Plan</Text>
            <Text style={styles.subtitle}>
              Subscribe to premium to access your full 30-day routine.
            </Text>
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>What you&apos;ll get:</Text>
            
            {features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  {feature.icon}
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
                <Check size={20} color={COLORS.success} />
              </View>
            ))}
          </View>

          <View style={styles.pricingSection}>
            <View style={styles.pricingCard}>
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingTitle}>Premium Monthly</Text>
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Most Popular</Text>
                </View>
              </View>
              <View style={styles.pricingPrice}>
                <Text style={styles.priceAmount}>$9.99</Text>
                <Text style={styles.pricePeriod}>/month</Text>
              </View>
              <Text style={styles.pricingDescription}>
                Full access to all premium features
              </Text>
            </View>
          </View>

          <View style={styles.guaranteeSection}>
            <Shield size={20} color={COLORS.success} />
            <Text style={styles.guaranteeText}>
              7-day free trial • Cancel anytime • No commitment
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={isLoading ? 'Starting Trial...' : 'Start Free Trial'}
            onPress={handleUpgrade}
            disabled={isLoading}
            isLoading={isLoading}
            style={styles.upgradeButton}
            leftIcon={<Crown size={18} color={COLORS.white} />}
            testID="upgrade-to-premium-button"
          />
          
          <TouchableOpacity onPress={onClose} style={styles.laterButton}>
            <Text style={styles.laterButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.border + '30',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  crownContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.gold + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  featuresSection: {
    marginVertical: 30,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gold + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
    marginRight: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  pricingSection: {
    marginBottom: 20,
  },
  pricingCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  pricingHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  popularBadge: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  pricingPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  pricePeriod: {
    fontSize: 16,
    color: COLORS.white + 'CC',
    marginLeft: 4,
  },
  pricingDescription: {
    fontSize: 14,
    color: COLORS.white + 'CC',
    textAlign: 'center',
  },
  guaranteeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.success + '10',
    borderRadius: 12,
    marginBottom: 20,
  },
  guaranteeText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
    marginLeft: 8,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  upgradeButton: {
    width: '100%',
    marginBottom: 16,
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  laterButtonText: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
  },
});