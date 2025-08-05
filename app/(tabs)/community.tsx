import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { Heart, MessageCircle, Share2, Lock } from 'lucide-react-native';

import Button from '@/components/Button';
import Card from '@/components/Card';
import { COLORS } from '@/constants/colors';

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState('trending');

  // Mock data for community posts
  const posts = [
    {
      id: '1',
      user: {
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=500&auto=format&fit=crop',
      },
      image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=500&auto=format&fit=crop',
      caption: 'Day 15 of my glow journey! Already seeing improvements in my skin texture. #GlowCheck #SkinCareRoutine',
      likes: 124,
      comments: 18,
      timestamp: '2h ago',
    },
    {
      id: '2',
      user: {
        name: 'Emily Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=500&auto=format&fit=crop',
      },
      image: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?q=80&w=500&auto=format&fit=crop',
      caption: 'Just got my outfit analysis for my job interview tomorrow! Feeling confident with these color combinations. #OutfitCheck',
      likes: 89,
      comments: 7,
      timestamp: '5h ago',
    },
    {
      id: '3',
      user: {
        name: 'Jessica Lee',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=500&auto=format&fit=crop',
      },
      image: 'https://images.unsplash.com/photo-1589710751893-f9a6770ad71b?q=80&w=500&auto=format&fit=crop',
      caption: 'Completed my 30-day glow challenge! Swipe to see the before and after. The coaching plan really works! #GlowTransformation',
      likes: 256,
      comments: 42,
      timestamp: '1d ago',
    },
  ];

  const renderPost = ({ item }: { item: typeof posts[0] }) => (
    <Card style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image source={{ uri: item.user.avatar }} style={styles.userAvatar} />
        <View style={styles.postHeaderInfo}>
          <Text style={styles.userName}>{item.user.name}</Text>
          <Text style={styles.postTime}>{item.timestamp}</Text>
        </View>
      </View>
      
      <Image source={{ uri: item.image }} style={styles.postImage} />
      
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Heart size={24} color={COLORS.textLight} />
          <Text style={styles.actionCount}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <MessageCircle size={24} color={COLORS.textLight} />
          <Text style={styles.actionCount}>{item.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Share2 size={24} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.postCaption}>{item.caption}</Text>
      
      <TouchableOpacity style={styles.viewCommentsButton}>
        <Text style={styles.viewCommentsText}>
          View all {item.comments} comments
        </Text>
      </TouchableOpacity>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Community',
        }} 
      />

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
          onPress={() => setActiveTab('trending')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'trending' && styles.activeTabText,
            ]}
          >
            Trending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.activeTab]}
          onPress={() => setActiveTab('following')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'following' && styles.activeTabText,
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'challenges' && styles.activeTab]}
          onPress={() => setActiveTab('challenges')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'challenges' && styles.activeTabText,
            ]}
          >
            Challenges
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.postsList}
        ListHeaderComponent={
          <Card style={styles.premiumCard}>
            <View style={styles.premiumContent}>
              <Lock size={24} color={COLORS.accent} style={styles.premiumIcon} />
              <View style={styles.premiumTextContainer}>
                <Text style={styles.premiumTitle}>Unlock Community Features</Text>
                <Text style={styles.premiumDescription}>
                  Upgrade to premium to post, comment, and interact with the community.
                </Text>
              </View>
            </View>
            <Button
              title="Upgrade to Premium"
              variant="secondary"
              style={styles.premiumButton}
              onPress={() => console.log('Upgrade to Premium pressed')}
            />
          </Card>
        }
      />

      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity style={styles.floatingButton}>
          <Text style={styles.floatingButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  postsList: {
    padding: 16,
  },
  premiumCard: {
    marginBottom: 16,
    padding: 16,
  },
  premiumContent: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  premiumIcon: {
    marginRight: 16,
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  premiumDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  premiumButton: {
    width: '100%',
  },
  postCard: {
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postHeaderInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  postTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  postActions: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionCount: {
    fontSize: 14,
    color: COLORS.textLight,
    marginLeft: 6,
  },
  postCaption: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    padding: 16,
    paddingTop: 0,
  },
  viewCommentsButton: {
    padding: 16,
    paddingTop: 0,
  },
  viewCommentsText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: 'bold',
  },
});