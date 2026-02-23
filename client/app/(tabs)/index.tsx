import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { SliderQuestion } from '@/components/SliderQuestion';
import { ResultCard } from '@/components/ResultCard';



// On web/Vercel, use relative URLs. For native dev, point to local server.
const API_BASE = Platform.select({
  web: '',
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
});

type Step = 'input' | 'loading-questions' | 'questions' | 'loading-result' | 'result';

interface Question {
  id: string;
  text: string;
  lowLabel: string;
  highLabel: string;
}

export default function DecisionScreen() {
  const [step, setStep] = useState<Step>('input');
  const [userQuestion, setUserQuestion] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ recommendation: string; reasoning: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Pulse animation for loading dots
  const dotScale = useSharedValue(1);
  useEffect(() => {
    if (step === 'loading-questions' || step === 'loading-result') {
      dotScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        true
      );
    }
  }, [step]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
  }));

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleSubmitQuestion = async () => {
    if (!userQuestion.trim()) return;
    setError(null);
    setStep('loading-questions');

    try {
      const res = await fetch(`${API_BASE}/api/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion }),
      });
      if (!res.ok) throw new Error('Server error');
      const data: Question[] = await res.json();
      setQuestions(data);
      // Initialize answers at 5 (midpoint)
      const initial: Record<string, number> = {};
      data.forEach((q) => (initial[q.id] = 5));
      setAnswers(initial);
      setStep('questions');
    } catch (e) {
      setError('Could not generate questions. Make sure the server is running.');
      setStep('input');
    }
  };

  const handleGetAnswer = async () => {
    setError(null);
    setStep('loading-result');

    const answerPayload = questions.map((q) => ({
      questionText: q.text,
      value: answers[q.id],
    }));

    try {
      const res = await fetch(`${API_BASE}/api/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion, answers: answerPayload }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setResult(data);
      setStep('result');
    } catch (e) {
      setError('Could not get a decision. Make sure the server is running.');
      setStep('questions');
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setUserQuestion('');
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setError(null);
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const renderInput = () => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.inputSection}>
      <View style={styles.heroSection}>
        <Text style={styles.emoji}>🤔</Text>
        <Text style={styles.title}>This or That?</Text>
        <Text style={styles.subtitle}>
          Can't decide? Let AI help you weigh the options.
        </Text>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.inputLabel}>What are you deciding between?</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Tacos or burritos"
          placeholderTextColor="#9ca3af"
          value={userQuestion}
          onChangeText={setUserQuestion}
          onSubmitEditing={handleSubmitQuestion}
          returnKeyType="go"
          autoFocus
          multiline={false}
        />
        <TouchableOpacity
          style={[styles.submitButton, !userQuestion.trim() && styles.submitButtonDisabled]}
          onPress={handleSubmitQuestion}
          disabled={!userQuestion.trim()}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>Help me decide ✨</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderLoading = (message: string) => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.loadingSection}>
      <Animated.View style={[styles.loadingDot, dotStyle]}>
        <Text style={styles.loadingEmoji}>
          {step === 'loading-questions' ? '💭' : '⚖️'}
        </Text>
      </Animated.View>
      <Text style={styles.loadingText}>{message}</Text>
      <ActivityIndicator size="small" color="#7C3AED" style={{ marginTop: 16 }} />
    </Animated.View>
  );

  const renderQuestions = () => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.questionsSection}>
      <View style={styles.questionsHeader}>
        <Text style={styles.questionsTitle}>Answer a few questions</Text>
        <Text style={styles.questionsSubtitle}>
          Slide to rate — we'll use your answers to help decide!
        </Text>
      </View>

      <View style={styles.questionBadge}>
        <Text style={styles.questionBadgeText}>
          Deciding: {userQuestion}
        </Text>
      </View>

      {questions.map((q, index) => (
        <Animated.View key={q.id} entering={FadeInUp.delay(index * 100).duration(400)}>
          <SliderQuestion
            text={q.text}
            lowLabel={q.lowLabel}
            highLabel={q.highLabel}
            value={answers[q.id]}
            onValueChange={(val) =>
              setAnswers((prev) => ({ ...prev, [q.id]: Math.round(val) }))
            }
          />
        </Animated.View>
      ))}

      <TouchableOpacity
        style={styles.decideButton}
        onPress={handleGetAnswer}
        activeOpacity={0.8}
      >
        <Text style={styles.decideButtonText}>Get my answer 🎯</Text>
      </TouchableOpacity>

      {error && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderResult = () => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.resultSection}>
      <Text style={styles.resultTitle}>We've got your answer!</Text>
      {result && (
        <ResultCard
          recommendation={result.recommendation}
          reasoning={result.reasoning}
        />
      )}
      <TouchableOpacity
        style={styles.startOverButton}
        onPress={handleStartOver}
        activeOpacity={0.8}
      >
        <Text style={styles.startOverButtonText}>Decide something else 🔄</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'input' && renderInput()}
          {step === 'loading-questions' && renderLoading('Crafting the perfect questions for you...')}
          {step === 'questions' && renderQuestions()}
          {step === 'loading-result' && renderLoading('Weighing your answers...')}
          {step === 'result' && renderResult()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9ff',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Input step
  inputSection: {
    flex: 1,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.08)',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  textInput: {
    fontSize: 18,
    color: '#1a1a2e',
    borderWidth: 2,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.03)',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#c4b5fd',
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // Loading step
  loadingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    marginBottom: 20,
  },
  loadingEmoji: {
    fontSize: 56,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4b5563',
    textAlign: 'center',
  },

  // Questions step
  questionsSection: {
    paddingBottom: 20,
  },
  questionsHeader: {
    marginBottom: 20,
  },
  questionsTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: -0.3,
  },
  questionsSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 21,
  },
  questionBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
  },
  questionBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  decideButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  decideButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // Result step
  resultSection: {
    flex: 1,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 24,
  },
  startOverButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  startOverButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 0.3,
  },

  // Error
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
});
