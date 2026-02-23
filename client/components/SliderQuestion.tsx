import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface SliderQuestionProps {
    text: string;
    lowLabel: string;
    highLabel: string;
    value: number;
    onValueChange: (value: number) => void;
}

export function SliderQuestion({
    text,
    lowLabel,
    highLabel,
    value,
    onValueChange,
}: SliderQuestionProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.questionText}>{text}</Text>
            <View style={styles.sliderRow}>
                <Text style={styles.label}>{lowLabel}</Text>
                <View style={styles.sliderWrapper}>
                    <Slider
                        style={styles.slider}
                        minimumValue={1}
                        maximumValue={10}
                        step={1}
                        value={value}
                        onValueChange={onValueChange}
                        minimumTrackTintColor="#7C3AED"
                        maximumTrackTintColor="rgba(124, 58, 237, 0.2)"
                        thumbTintColor="#7C3AED"
                    />
                </View>
                <Text style={styles.label}>{highLabel}</Text>
            </View>
            <View style={styles.valueBadge}>
                <Text style={styles.valueText}>{value}</Text>
                <Text style={styles.valueSuffix}>/10</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(124, 58, 237, 0.06)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(124, 58, 237, 0.12)',
    },
    questionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a2e',
        marginBottom: 16,
        lineHeight: 22,
    },
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    label: {
        fontSize: 12,
        color: '#6b7280',
        width: 60,
        textAlign: 'center',
        fontWeight: '500',
    },
    sliderWrapper: {
        flex: 1,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    valueBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginTop: 8,
    },
    valueText: {
        fontSize: 28,
        fontWeight: '800',
        color: '#7C3AED',
    },
    valueSuffix: {
        fontSize: 14,
        fontWeight: '600',
        color: '#a78bfa',
        marginLeft: 2,
    },
});
