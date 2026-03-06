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
import { Ionicons } from '@expo/vector-icons';



// For local dev, point to the Express server. On Vercel, use relative URLs.
const API_BASE = Platform.select({
  web: '',
  android: '',
  default: '',
});

type Step = 'input' | 'loading-questions' | 'questions' | 'loading-reflections' | 'reflections' | 'loading-result' | 'result' | 'survey' | 'thank-you';

interface Question {
  id: string;
  text: string;
  lowLabel: string;
  highLabel: string;
}

interface ReflectionQuestion {
  id: string;
  text: string;
}

const HELPFUL_OPTIONS = [
  { value: 'did_not_help', label: 'Did not help' },
  { value: 'scale_questions', label: 'Scale questions' },
  { value: 'reflection_questions', label: 'Reflection questions' },
  { value: 'both', label: 'Both' },
] as const;

export default function DecisionScreen() {
  const [step, setStep] = useState<Step>('input');
  const [userQuestion, setUserQuestion] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reflectionQuestions, setReflectionQuestions] = useState<ReflectionQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ recommendation: string; reasoning: string; alternativeOption?: string; alternativePerspective?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Hidden timer
  const timerStartRef = useRef<number>(0);
  const decisionTimeMsRef = useRef<number>(0);

  // Survey state
  const [surveyHelpful, setSurveyHelpful] = useState<string>('');
  const [surveyChangedThinking, setSurveyChangedThinking] = useState(0);
  const [surveyAffectedSpeed, setSurveyAffectedSpeed] = useState(0);
  const [surveyEasierToThink, setSurveyEasierToThink] = useState(0);
  const [surveyMoreThoughtful, setSurveyMoreThoughtful] = useState(0);
  const [surveyAgree, setSurveyAgree] = useState(0);
  const [surveyConfidence, setSurveyConfidence] = useState(5);
  const [surveyDifficulty, setSurveyDifficulty] = useState(5);
  const [surveyFeedback, setSurveyFeedback] = useState('');
  const [surveySubmitting, setSurveySubmitting] = useState(false);

  // Pulse animation for loading dots
  const dotScale = useSharedValue(1);
  useEffect(() => {
    if (step === 'loading-questions' || step === 'loading-reflections' || step === 'loading-result') {
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

    // Start the hidden timer
    timerStartRef.current = Date.now();

    try {
      const res = await fetch(`${API_BASE}/api/generate-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion }),
      });
      if (!res.ok) throw new Error('Server error');
      const data: { questions: Question[] } = await res.json();
      setQuestions(data.questions);
      // Initialize answers at 5 (midpoint)
      const initial: Record<string, number> = {};
      data.questions.forEach((q) => (initial[q.id] = 5));
      setAnswers(initial);
      setStep('questions');
    } catch (e) {
      setError('Could not generate questions. Make sure the server is running.');
      setStep('input');
    }
  };

  const handleGenerateReflections = async () => {
    setError(null);
    setStep('loading-reflections');

    const answerPayload = questions.map((q) => ({
      questionText: q.text,
      value: answers[q.id],
    }));

    try {
      const res = await fetch(`${API_BASE}/api/generate-reflections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion, answers: answerPayload }),
      });
      if (!res.ok) throw new Error('Server error');
      const data: { reflectionQuestions: ReflectionQuestion[] } = await res.json();
      setReflectionQuestions(data.reflectionQuestions || []);
      const initialRefs: Record<string, string> = {};
      (data.reflectionQuestions || []).forEach((q) => (initialRefs[q.id] = ''));
      setReflectionAnswers(initialRefs);
      setStep('reflections');
    } catch (e) {
      setError('Could not generate reflection questions. Make sure the server is running.');
      setStep('questions');
    }
  };

  const handleGetAnswer = async () => {
    setError(null);
    setStep('loading-result');

    const answerPayload = questions.map((q) => ({
      questionText: q.text,
      value: answers[q.id],
    }));

    const reflectionAnswerPayload = reflectionQuestions.map((q) => ({
      questionText: q.text,
      answerText: reflectionAnswers[q.id] || '',
    }));

    try {
      const res = await fetch(`${API_BASE}/api/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion, answers: answerPayload, reflectionAnswers: reflectionAnswerPayload }),
      });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setResult(data);

      // Stop the hidden timer
      decisionTimeMsRef.current = Date.now() - timerStartRef.current;

      setStep('result');
    } catch (e) {
      setError('Could not get a decision. Make sure the server is running.');
      setStep('reflections');
    }
  };

  const handleGoToSurvey = () => {
    setStep('survey');
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const isSurveyComplete = () => {
    return (
      surveyHelpful !== '' &&
      surveyChangedThinking > 0 &&
      surveyAffectedSpeed > 0 &&
      surveyEasierToThink > 0 &&
      surveyMoreThoughtful > 0 &&
      surveyAgree > 0
    );
  };

  const handleSubmitSurvey = async () => {
    if (!isSurveyComplete()) return;
    setSurveySubmitting(true);
    setError(null);

    const sliderAnswers = questions.map((q) => ({
      questionText: q.text,
      value: answers[q.id],
    }));

    const reflectionAnswerPayload = reflectionQuestions.map((q) => ({
      questionText: q.text,
      answerText: reflectionAnswers[q.id] || '',
    }));

    try {
      const res = await fetch(`${API_BASE}/api/submit-survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userQuestion,
          recommendation: result?.recommendation || '',
          decisionTimeMs: decisionTimeMsRef.current,
          helpfulPart: surveyHelpful,
          changedThinking: surveyChangedThinking,
          affectedSpeed: surveyAffectedSpeed,
          easierToThink: surveyEasierToThink,
          moreThoughtful: surveyMoreThoughtful,
          agreeWithDecision: surveyAgree,
          confidence: surveyConfidence,
          dilemmaDifficulty: surveyDifficulty,
          additionalFeedback: surveyFeedback,
          sliderAnswers,
          reflectionAnswers: reflectionAnswerPayload,
        }),
      });
      if (!res.ok) throw new Error('Server error');
      setStep('thank-you');
    } catch (e) {
      setError('Could not submit survey. Please try again.');
    } finally {
      setSurveySubmitting(false);
    }
  };

  const handleStartOver = () => {
    setStep('input');
    setUserQuestion('');
    setQuestions([]);
    setReflectionQuestions([]);
    setAnswers({});
    setReflectionAnswers({});
    setResult(null);
    setError(null);
    timerStartRef.current = 0;
    decisionTimeMsRef.current = 0;
    setSurveyHelpful('');
    setSurveyChangedThinking(0);
    setSurveyAffectedSpeed(0);
    setSurveyEasierToThink(0);
    setSurveyMoreThoughtful(0);
    setSurveyAgree(0);
    setSurveyConfidence(5);
    setSurveyDifficulty(5);
    setSurveyFeedback('');
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const renderInput = () => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.inputSection}>
      <View style={styles.heroSection}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="help-circle-outline" size={64} color="#7C3AED" />
        </View>
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
          <View style={styles.buttonContent}>
            <Ionicons name="sparkles" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.submitButtonText}>Help me decide</Text>
          </View>
        </TouchableOpacity>
      </View>

      {error && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderLoading = (message: string, iconName: keyof typeof Ionicons.glyphMap) => (
    <Animated.View entering={FadeIn.duration(400)} style={styles.loadingSection}>
      <Animated.View style={[styles.loadingDot, dotStyle]}>
        <Ionicons name={iconName} size={56} color="#7C3AED" />
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
        onPress={handleGenerateReflections}
        activeOpacity={0.8}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="compass-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.decideButtonText}>Get my answer</Text>
        </View>
      </TouchableOpacity>

      {error && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderReflections = () => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.questionsSection}>
      <View style={styles.questionsHeader}>
        <Text style={styles.questionsTitle}>Almost there!</Text>
        <Text style={styles.questionsSubtitle}>
          We need a little more information before we can get your decision. Take a moment to reflect on these questions.
        </Text>
      </View>

      <View style={styles.questionBadge}>
        <Text style={styles.questionBadgeText}>
          Deciding: {userQuestion}
        </Text>
      </View>

      {reflectionQuestions.map((q, index) => (
        <Animated.View key={q.id} entering={FadeInUp.delay(index * 150).duration(400)}>
          <View style={styles.reflectionCard}>
            <Text style={styles.reflectionQuestionText}>{q.text}</Text>
            <TextInput
              style={styles.reflectionInput}
              placeholder="Your thoughts..."
              placeholderTextColor="#9ca3af"
              value={reflectionAnswers[q.id]}
              onChangeText={(val) => setReflectionAnswers((prev) => ({ ...prev, [q.id]: val }))}
              multiline
              numberOfLines={4}
            />
          </View>
        </Animated.View>
      ))}

      <TouchableOpacity
        style={styles.decideButton}
        onPress={handleGetAnswer}
        activeOpacity={0.8}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="sparkles" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.decideButtonText}>Get my decision</Text>
        </View>
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
          alternativeOption={result.alternativeOption}
          alternativePerspective={result.alternativePerspective}
        />
      )}
      <TouchableOpacity
        style={styles.decideButton}
        onPress={handleGoToSurvey}
        activeOpacity={0.8}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="chatbox-ellipses-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.decideButtonText}>Continue to feedback</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  // ─── Likert scale component ──────────────────────────────────────────────────

  const renderLikert = (
    label: string,
    labels: string[],
    value: number,
    onChange: (v: number) => void,
    index: number,
  ) => (
    <Animated.View key={label} entering={FadeInUp.delay(index * 80).duration(400)}>
      <View style={styles.surveyCard}>
        <Text style={styles.surveyQuestionText}>{label}</Text>
        <View style={styles.likertRow}>
          {labels.map((l, i) => {
            const v = i + 1;
            const selected = value === v;
            return (
              <TouchableOpacity
                key={v}
                style={[styles.likertOption, selected && styles.likertOptionSelected]}
                onPress={() => onChange(v)}
                activeOpacity={0.7}
              >
                <Text style={[styles.likertNumber, selected && styles.likertNumberSelected]}>{v}</Text>
                <Text style={[styles.likertLabel, selected && styles.likertLabelSelected]}>{l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );

  const renderSurvey = () => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.questionsSection}>
      <View style={styles.questionsHeader}>
        <Text style={styles.questionsTitle}>Share your feedback</Text>
        <Text style={styles.questionsSubtitle}>
          Help us improve this tool by answering a few quick questions.
        </Text>
      </View>

      {/* Which part helped most — select */}
      <Animated.View entering={FadeInUp.delay(0).duration(400)}>
        <View style={styles.surveyCard}>
          <Text style={styles.surveyQuestionText}>
            Which part of the tool helped you most when making decisions?
          </Text>
          <View style={styles.helpfulRow}>
            {HELPFUL_OPTIONS.map((opt) => {
              const selected = surveyHelpful === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.helpfulOption, selected && styles.helpfulOptionSelected]}
                  onPress={() => setSurveyHelpful(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.helpfulOptionText, selected && styles.helpfulOptionTextSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {/* Likert questions */}
      {renderLikert('Did the tool change how you thought about the decision?',
        ['Not at all', 'Slightly', 'Quite a bit', 'Completely'],
        surveyChangedThinking, setSurveyChangedThinking, 1)}
      {renderLikert('Did the tool affect how quickly you made your decision?',
        ['Much slower', 'Slower', 'Faster', 'Much faster'],
        surveyAffectedSpeed, setSurveyAffectedSpeed, 2)}
      {renderLikert('Did the tool make it easier to think through your options?',
        ['Much harder', 'Harder', 'Easier', 'Much easier'],
        surveyEasierToThink, setSurveyEasierToThink, 3)}
      {renderLikert('Did the tool encourage you to think more thoughtfully about your option choices?',
        ['Not at all', 'Slightly', 'Quite a bit', 'Very much'],
        surveyMoreThoughtful, setSurveyMoreThoughtful, 4)}
      {renderLikert('Do you agree with the generated decision?',
        ['Strongly disagree', 'Disagree', 'Agree', 'Strongly agree'],
        surveyAgree, setSurveyAgree, 5)}

      {/* Confidence slider */}
      <Animated.View entering={FadeInUp.delay(480).duration(400)}>
        <SliderQuestion
          text="How confident are you in your decision?"
          lowLabel="Not at all"
          highLabel="Extremely"
          value={surveyConfidence}
          onValueChange={(val) => setSurveyConfidence(Math.round(val))}
        />
      </Animated.View>

      {/* Difficulty slider */}
      <Animated.View entering={FadeInUp.delay(520).duration(400)}>
        <SliderQuestion
          text="How difficult was it to make this decision?"
          lowLabel="Very easy"
          highLabel="Very difficult"
          value={surveyDifficulty}
          onValueChange={(val) => setSurveyDifficulty(Math.round(val))}
        />
      </Animated.View>

      {/* Optional feedback */}
      <Animated.View entering={FadeInUp.delay(600).duration(400)}>
        <View style={styles.surveyCard}>
          <Text style={styles.surveyQuestionText}>
            What could make the tool more helpful? (optional)
          </Text>
          <TextInput
            style={styles.reflectionInput}
            placeholder="Any additional thoughts..."
            placeholderTextColor="#9ca3af"
            value={surveyFeedback}
            onChangeText={setSurveyFeedback}
            multiline
            numberOfLines={4}
          />
        </View>
      </Animated.View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.decideButton, (!isSurveyComplete() || surveySubmitting) && styles.submitButtonDisabled]}
        onPress={handleSubmitSurvey}
        disabled={!isSurveyComplete() || surveySubmitting}
        activeOpacity={0.8}
      >
        {surveySubmitting ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <View style={styles.buttonContent}>
            <Ionicons name="send-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.decideButtonText}>Submit feedback</Text>
          </View>
        )}
      </TouchableOpacity>

      {error && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderThankYou = () => (
    <Animated.View entering={FadeInDown.duration(500)} style={styles.loadingSection}>
      <Ionicons name="checkmark-circle" size={72} color="#7C3AED" style={{ marginBottom: 20 }} />
      <Text style={styles.questionsTitle}>Thank you!</Text>
      <Text style={[styles.questionsSubtitle, { textAlign: 'center', marginTop: 8 }]}>
        Your feedback helps us improve the decision-making experience.
      </Text>
      <TouchableOpacity
        style={[styles.startOverButton, { marginTop: 32 }]}
        onPress={handleStartOver}
        activeOpacity={0.8}
      >
        <Text style={styles.startOverButtonText}>Decide something else</Text>
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
          {step === 'loading-questions' && renderLoading('Crafting the perfect questions for you...', 'chatbubble-ellipses-outline')}
          {step === 'questions' && renderQuestions()}
          {step === 'loading-reflections' && renderLoading('We need a little more information before we can get your decision...', 'eye-outline')}
          {step === 'reflections' && renderReflections()}
          {step === 'loading-result' && renderLoading('Weighing your answers...', 'scale-outline')}
          {step === 'result' && renderResult()}
          {step === 'survey' && renderSurvey()}
          {step === 'thank-you' && renderThankYou()}
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
  heroIconWrap: {
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
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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

  reflectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.08)',
  },
  reflectionQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    lineHeight: 22,
  },
  reflectionInput: {
    fontSize: 16,
    color: '#1a1a2e',
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.02)',
    minHeight: 100,
    textAlignVertical: 'top',
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

  // Survey step
  surveyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.08)',
  },
  surveyQuestionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 14,
    lineHeight: 22,
  },
  likertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  likertOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.1)',
    backgroundColor: 'rgba(124, 58, 237, 0.02)',
  },
  likertOptionSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  likertNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 4,
  },
  likertNumberSelected: {
    color: '#ffffff',
  },
  likertLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9ca3af',
    textAlign: 'center',
  },
  likertLabelSelected: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  helpfulRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  helpfulOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    backgroundColor: 'rgba(124, 58, 237, 0.02)',
  },
  helpfulOptionSelected: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  helpfulOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7C3AED',
  },
  helpfulOptionTextSelected: {
    color: '#ffffff',
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
