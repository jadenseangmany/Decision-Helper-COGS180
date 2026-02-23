import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withTiming,
} from 'react-native-reanimated';

interface ResultCardProps {
    recommendation: string;
    reasoning: string;
}

export function ResultCard({ recommendation, reasoning }: ResultCardProps) {
    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);
    const reasoningOpacity = useSharedValue(0);

    useEffect(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 100 });
        opacity.value = withTiming(1, { duration: 500 });
        reasoningOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    }, []);

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const reasoningStyle = useAnimatedStyle(() => ({
        opacity: reasoningOpacity.value,
    }));

    return (
        <Animated.View style={[styles.card, cardStyle]}>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>🎯 Our Pick</Text>
            </View>
            <Text style={styles.recommendation}>{recommendation}</Text>
            <View style={styles.divider} />
            <Animated.View style={reasoningStyle}>
                <Text style={styles.reasoningLabel}>Here's why:</Text>
                <Text style={styles.reasoning}>{reasoning}</Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 28,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.1)',
    },
    badge: {
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 6,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#7C3AED',
        letterSpacing: 0.5,
    },
    recommendation: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1a1a2e',
        lineHeight: 40,
    },
    divider: {
        height: 2,
        backgroundColor: 'rgba(124, 58, 237, 0.12)',
        borderRadius: 1,
        marginVertical: 20,
    },
    reasoningLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#7C3AED',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    reasoning: {
        fontSize: 16,
        color: '#4b5563',
        lineHeight: 24,
        fontWeight: '400',
    },
});
