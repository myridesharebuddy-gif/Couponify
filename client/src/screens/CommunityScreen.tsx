import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import SectionTitle from '../components/SectionTitle';
import { useTheme, Theme } from '../theme';
import { scaleFont } from '../theme/fontScale';
import { fetchStoreSuggestions, voteStoreSuggestion } from '../services/api';
import { useDeviceHash } from '../utils/deviceHash';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background
    },
    content: {
      padding: 16,
      paddingBottom: 40
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12
    },
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    sortLabel: {
      color: theme.subtext,
      fontFamily: theme.typography.body,
      fontSize: scaleFont(12),
      marginRight: 12
    },
    sortActive: {
      color: theme.accent,
      fontFamily: theme.typography.bodySemiBold
    },
    card: {
      marginBottom: 12,
      padding: 16,
      borderRadius: 16,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    cardTitle: {
      color: theme.text,
      fontSize: scaleFont(16),
      fontFamily: theme.typography.heading
    },
    votes: {
      color: theme.accent,
      fontFamily: theme.typography.bodySemiBold
    },
    metaRow: {
      marginTop: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8
    },
    metaText: {
      color: theme.subtext,
      fontFamily: theme.typography.body,
      fontSize: scaleFont(12)
    },
    actions: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    actionButton: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 8
    },
    actionText: {
      color: theme.text,
      fontFamily: theme.typography.bodySemiBold,
      fontSize: scaleFont(12)
    },
    dateText: {
      color: theme.subtext,
      fontFamily: theme.typography.body,
      fontSize: scaleFont(11)
    },
    empty: {
      marginTop: 12,
      alignItems: 'center'
    },
    emptyText: {
      color: theme.muted,
      fontFamily: theme.typography.body
    },
    hint: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      color: theme.subtext,
      fontFamily: theme.typography.body,
      fontSize: scaleFont(12)
    }
  });

const CommunityScreen = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const deviceHash = useDeviceHash();
  const [sortOrder, setSortOrder] = useState<'votes' | 'newest'>('votes');

  const { data: pending = [], isLoading: pendingLoading } = useQuery(
    ['store-suggestions', 'pending', sortOrder],
    () => fetchStoreSuggestions({ status: 'pending', sort: sortOrder }),
    {
      keepPreviousData: true
    }
  );

  const { data: approved = [], isLoading: approvedLoading } = useQuery(
    ['store-suggestions', 'approved'],
    () => fetchStoreSuggestions({ status: 'approved', sort: 'newest' }),
    {
      staleTime: 5 * 60 * 1000
    }
  );

  const voteMutation = useMutation(
    ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      if (!deviceHash) {
        throw new Error('Device identifier is still loading');
      }
      return voteStoreSuggestion(id, direction, deviceHash);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['store-suggestions']);
      }
    }
  );

  const handleVote = (id: string, direction: 'up' | 'down') => {
    if (voteMutation.isLoading) return;
    voteMutation.mutate({ id, direction });
  };

  const renderSuggestion = (item: typeof pending[number]) => (
    <View key={item.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.votes}>{item.votes} votes</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>{item.domain}</Text>
        {item.keyword ? <Text style={styles.metaText}>Keyword: {item.keyword}</Text> : null}
      </View>
      <View style={styles.actions}>
        <View style={{ flexDirection: 'row' }}>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleVote(item.id, 'up')}
            disabled={!deviceHash || voteMutation.isLoading}
          >
            <Text style={styles.actionText}>Upvote</Text>
          </Pressable>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleVote(item.id, 'down')}
            disabled={!deviceHash || voteMutation.isLoading}
          >
            <Text style={styles.actionText}>Downvote</Text>
          </Pressable>
        </View>
        <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Community" />
      {!deviceHash ? <Text style={styles.hint}>Preparing device settings…</Text> : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <SectionTitle>Pending suggestions</SectionTitle>
          <View style={styles.sortRow}>
            <Pressable onPress={() => setSortOrder('votes')}>
              <Text style={[styles.sortLabel, sortOrder === 'votes' && styles.sortActive]}>Votes</Text>
            </Pressable>
            <Pressable onPress={() => setSortOrder('newest')}>
              <Text style={[styles.sortLabel, sortOrder === 'newest' && styles.sortActive]}>Newest</Text>
            </Pressable>
          </View>
        </View>
        {pendingLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : pending.length ? (
          pending.map(renderSuggestion)
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending suggestions right now.</Text>
          </View>
        )}
        <View style={styles.sectionHeader}>
          <SectionTitle>Approved recently</SectionTitle>
        </View>
        {approvedLoading ? (
          <ActivityIndicator color={theme.accent} />
        ) : approved.length ? (
          approved.slice(0, 10).map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.metaText}>{item.domain}</Text>
              <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Approved suggestions will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default CommunityScreen;
