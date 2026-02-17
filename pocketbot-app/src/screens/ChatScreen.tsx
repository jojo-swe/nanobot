import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useConnection } from '../context/ConnectionContext';
import {
  ChatMessage,
  ConnectionState,
  connect,
  disconnect,
  sendMessage,
} from '../services/chat';

export default function ChatScreen() {
  const { conn } = useConnection();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [state, setState] = useState<ConnectionState>('disconnected');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!conn.url) return;
    connect(conn, {
      onStateChange: setState,
      onMessage: (msg) => {
        setMessages((prev) => [...prev, msg]);
      },
      onTyping: setTyping,
      onError: (err) => {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: `⚠️ ${err}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      },
      onSessionId: () => {},
    });
    return () => disconnect();
  }, [conn.url, conn.token]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const userMsg = sendMessage(text);
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
  }, [input]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, typing]);

  const stateColor =
    state === 'connected'
      ? colors.success
      : state === 'connecting'
        ? colors.warning
        : colors.error;

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user';
      return (
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          {!isUser && <Text style={styles.avatar}>🤖</Text>}
          <View
            style={[
              styles.bubbleContent,
              isUser ? styles.bubbleContentUser : styles.bubbleContentAssistant,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser && { color: colors.white },
              ]}
              selectable
            >
              {item.content}
            </Text>
          </View>
        </View>
      );
    },
    [],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Connection status bar */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: stateColor }]} />
        <Text style={styles.statusText}>{state}</Text>
      </View>

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤖</Text>
          <Text style={styles.emptyTitle}>Welcome to pocketbot</Text>
          <Text style={styles.emptySubtitle}>
            Type a message below to start chatting.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={scrollToEnd}
        />
      )}

      {/* Typing indicator */}
      {typing && (
        <View style={styles.typingRow}>
          <Text style={styles.typingText}>pocketbot is thinking…</Text>
        </View>
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type your message…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={4000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!input.trim() || state !== 'connected') && styles.sendDisabled,
          ]}
          onPress={handleSend}
          disabled={!input.trim() || state !== 'connected'}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  list: { padding: spacing.lg, paddingBottom: spacing.xl },
  bubble: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  bubbleUser: { justifyContent: 'flex-end' },
  bubbleAssistant: { justifyContent: 'flex-start' },
  avatar: { fontSize: 20, marginRight: spacing.sm, marginTop: 2 },
  bubbleContent: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bubbleContentUser: {
    backgroundColor: colors.pocket[600],
    borderBottomRightRadius: radius.sm,
  },
  bubbleContentAssistant: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: radius.sm,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  typingRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  typingText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    color: colors.textPrimary,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    marginLeft: spacing.sm,
    backgroundColor: colors.pocket[500],
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
