import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
  SharedValue,
} from 'react-native-reanimated';
import { Colors, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing } from '../src/theme/spacing';
import { CyberBackground } from '../src/components/CyberBackground';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { screenHeight, screenWidth } from '../src/utils/dimensions';
import { tapLight, notifyError } from '../src/utils/haptics';
import { BlurView } from 'expo-blur';

const ACCENT = '#00E5FF'; // Cyberpunk Cyan
const ACCENT_ALT = '#B300FF'; // Cyberpunk Purple
const GRAVITY = 1.2;
const JUMP_VELOCITY = -18;
const DINO_SIZE = 56;
const OBSTACLE_WIDTH = 30;
const BASE_SPEED = 5;
const ROAD_HEIGHT = 80;

const DinoBackground = ({ bgProgress, gameDistance }: { bgProgress: SharedValue<number>, gameDistance: SharedValue<number> }) => {
    const bgStyle = useAnimatedStyle(() => {
        const color = interpolateColor(
            bgProgress.value,
            [0, 1],
            ['#120B21', '#06040A'] // Deep prehistoric night sky
        );
        return { backgroundColor: color };
    });
    
    // Parallax layers
    const skyStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -((gameDistance.value * 0.02) % screenWidth) }]
    }));

    const cloudStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -((gameDistance.value * 0.08) % screenWidth) }]
    }));

    const mountainStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -((gameDistance.value * 0.15) % screenWidth) }]
    }));
    
    return (
        <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
            {/* Layer 1: Moon & Stars (Slowest) */}
            <Animated.View style={[StyleSheet.absoluteFill, skyStyle, { flexDirection: 'row', width: screenWidth * 2 }]}>
                {[0, 1].map(i => (
                    <View key={i} style={{ width: screenWidth, height: '100%' }}>
                        {/* Moon */}
                        {i === 0 && (
                            <View style={{ position: 'absolute', top: '12%', right: '20%' }}>
                                <View style={[styles.pixel, { width: 30, height: 30, backgroundColor: '#E2E8F0', borderRadius: 15, ...elegantShadow(0.8, 15, 0, '#E2E8F0') }]} />
                                {/* Moon Craters */}
                                <View style={[styles.pixel, { width: 6, height: 6, backgroundColor: '#CBD5E1', top: 6, left: 6, borderRadius: 3 }]} />
                                <View style={[styles.pixel, { width: 4, height: 4, backgroundColor: '#94A3B8', top: 18, left: 12, borderRadius: 2 }]} />
                                <View style={[styles.pixel, { width: 8, height: 5, backgroundColor: '#CBD5E1', top: 12, left: 20, borderRadius: 3 }]} />
                            </View>
                        )}
                        {/* Stars */}
                        <View style={[styles.star, { top: '10%', left: '15%', opacity: 0.8 }]} />
                        <View style={[styles.star, { top: '22%', left: '35%', opacity: 0.4, transform: [{ scale: 1.5 }] }]} />
                        <View style={[styles.star, { top: '8%', left: '60%', opacity: 0.9 }]} />
                        <View style={[styles.star, { top: '28%', left: '80%', opacity: 0.3 }]} />
                        <View style={[styles.star, { top: '18%', left: '90%', opacity: 0.7, transform: [{ scale: 1.2 }] }]} />
                        <View style={[styles.star, { top: '35%', left: '20%', opacity: 0.5 }]} />
                        <View style={[styles.star, { top: '45%', left: '70%', opacity: 0.6 }]} />
                    </View>
                ))}
            </Animated.View>

            {/* Layer 2: Clouds */}
            <Animated.View style={[{ position: 'absolute', top: '25%', height: 100, flexDirection: 'row', width: screenWidth * 2 }, cloudStyle]}>
                {[0, 1].map(i => (
                    <View key={i} style={{ width: screenWidth, height: '100%', flexDirection: 'row' }}>
                        <View style={{ position: 'absolute', top: 10, left: 40, opacity: 0.15 }}>
                            <View style={[styles.pixel, { width: 40, height: 10, backgroundColor: '#FFFFFF', borderRadius: 5 }]} />
                            <View style={[styles.pixel, { width: 30, height: 12, top: -6, left: 5, backgroundColor: '#FFFFFF', borderRadius: 6 }]} />
                        </View>
                        <View style={{ position: 'absolute', top: 40, left: 200, opacity: 0.1 }}>
                            <View style={[styles.pixel, { width: 60, height: 14, backgroundColor: '#FFFFFF', borderRadius: 7 }]} />
                            <View style={[styles.pixel, { width: 40, height: 16, top: -8, left: 10, backgroundColor: '#FFFFFF', borderRadius: 8 }]} />
                        </View>
                        <View style={{ position: 'absolute', top: 20, left: screenWidth - 100, opacity: 0.12 }}>
                            <View style={[styles.pixel, { width: 50, height: 12, backgroundColor: '#FFFFFF', borderRadius: 6 }]} />
                        </View>
                    </View>
                ))}
            </Animated.View>

            {/* Layer 3: Silhouette Mountains (Medium) */}
            <Animated.View style={[{ position: 'absolute', bottom: ROAD_HEIGHT, height: 150, flexDirection: 'row', width: screenWidth * 2 }, mountainStyle]}>
                {[0, 1].map(i => (
                    <View key={i} style={{ width: screenWidth, height: '100%', flexDirection: 'row', alignItems: 'flex-end' }}>
                        {/* Mountain 1 */}
                        <View style={{ width: 0, height: 0, borderLeftWidth: 60, borderRightWidth: 60, borderBottomWidth: 100, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#0F081C', marginLeft: -20 }} />
                        {/* Mountain 2 */}
                        <View style={{ width: 0, height: 0, borderLeftWidth: 80, borderRightWidth: 80, borderBottomWidth: 140, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#160C29', marginLeft: -40 }} />
                        {/* Mountain 3 */}
                        <View style={{ width: 0, height: 0, borderLeftWidth: 50, borderRightWidth: 50, borderBottomWidth: 80, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#0B0515', marginLeft: -30 }} />
                        {/* Mountain 4 */}
                        <View style={{ width: 0, height: 0, borderLeftWidth: 90, borderRightWidth: 90, borderBottomWidth: 120, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#120A21', marginLeft: -20 }} />
                    </View>
                ))}
            </Animated.View>
            
            {/* Dark Horizon Gradient (Hides rough edges) */}
            <View style={{ position: 'absolute', bottom: ROAD_HEIGHT, width: '100%', height: 40, backgroundColor: '#090410', opacity: 0.8 }} />
        </Animated.View>
    );
};

const CyberRoad = ({ gameDistance }: { gameDistance: SharedValue<number> }) => {
    // Road moves at exact 1.0 speed
    const roadStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: -(gameDistance.value % 100) }]
    }));

    return (
        <View style={[styles.roadContainer, { backgroundColor: '#1C1525' }]}>
            {/* Top crust of the dirt */}
            <View style={{ width: '100%', height: 4, backgroundColor: '#2D1B36', position: 'absolute', top: 0, zIndex: 2 }} />
            <View style={{ width: '100%', height: 2, backgroundColor: '#3B2447', position: 'absolute', top: 4, zIndex: 2 }} />

            <Animated.View style={[{ width: screenWidth + 100, height: '100%', flexDirection: 'row' }, roadStyle]}>
                {Array.from({ length: Math.ceil(screenWidth / 100) + 2 }).map((_, i) => (
                    <View key={i} style={[styles.roadSegment, { backgroundColor: 'transparent', borderColor: 'transparent' }]}>
                        {/* Scattered Pebbles & Dirt details */}
                        <View style={[styles.pixel, { width: 4, height: 2, backgroundColor: '#3B2447', top: 12, left: 10 }]} />
                        <View style={[styles.pixel, { width: 2, height: 2, backgroundColor: '#4C2F5C', top: 25, left: 40 }]} />
                        <View style={[styles.pixel, { width: 6, height: 3, backgroundColor: '#251630', top: 18, left: 70 }]} />
                        <View style={[styles.pixel, { width: 3, height: 2, backgroundColor: '#3B2447', top: 35, left: 20 }]} />
                        
                        {/* Patches of dead grass */}
                        <View style={{ position: 'absolute', top: -2, left: 30, flexDirection: 'row', alignItems: 'flex-end' }}>
                            <View style={[styles.pixel, { width: 2, height: 6, backgroundColor: '#5D4037' }]} />
                            <View style={[styles.pixel, { width: 2, height: 4, backgroundColor: '#4E342E', marginLeft: 1 }]} />
                        </View>
                        <View style={{ position: 'absolute', top: -2, left: 80, flexDirection: 'row', alignItems: 'flex-end' }}>
                            <View style={[styles.pixel, { width: 2, height: 5, backgroundColor: '#4E342E', transform: [{ rotate: '-10deg' }] }]} />
                            <View style={[styles.pixel, { width: 2, height: 7, backgroundColor: '#5D4037', marginLeft: 1 }]} />
                            <View style={[styles.pixel, { width: 2, height: 3, backgroundColor: '#3E2723', marginLeft: 1 }]} />
                        </View>
                    </View>
                ))}
            </Animated.View>
            <View style={[styles.roadBottomGradient, { backgroundColor: '#090410', opacity: 0.9 }]} />
        </View>
    );
};

const PremiumRex = ({ isDucking, runFrame, yOffset, score }: { isDucking: boolean, runFrame: number, yOffset: number, score: number }) => {
    // Realistic T-Rex Color Palette
    const skin = '#8B5A2B';     // Warm brown/bronze
    const darkSkin = '#5C3A21'; // Deep shadow brown
    const belly = '#CD853F';    // Lighter tan belly
    const eye = '#FFD700';      // Piercing yellow reptilian eye
    const teeth = '#F8F8FF';    // Off-white teeth
    const spikes = '#8B0000';   // Dark red back spikes

    const bob = yOffset === 0 && !isDucking ? (runFrame === 0 ? 0 : 2) : 0;
    const isAirborne = yOffset < -5;
    const isBlinking = score > 0 && score % 200 < 10; // Blink occasionally
    
    if (isDucking) {
        return (
            <View style={{ width: DINO_SIZE + 15, height: DINO_SIZE / 2, top: DINO_SIZE / 2, transform: [{ translateY: bob }] }}>
                {/* Slim, elongated ducking body */}
                <View style={[styles.pixel, { width: 45, height: 16, top: 8, left: 5, backgroundColor: skin, borderRadius: 8, ...elegantShadow(0.6, 8, 0, darkSkin) }]} />
                <View style={[styles.pixel, { width: 35, height: 8, top: 18, left: 10, backgroundColor: belly, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }]} />
                
                {/* Extended Head */}
                <View style={[styles.pixel, { width: 22, height: 12, top: 4, left: 40, backgroundColor: skin, borderTopRightRadius: 8, borderBottomRightRadius: 4 }]} />
                {/* Snout Details */}
                <View style={[styles.pixel, { width: 14, height: 6, top: 16, left: 45, backgroundColor: skin, borderBottomRightRadius: 6 }]} />
                <View style={[styles.pixel, { width: 2, height: 2, top: 6, left: 58, backgroundColor: darkSkin }]} />
                {/* Teeth */}
                <View style={[styles.pixel, { width: 2, height: 3, top: 14, left: 48, backgroundColor: teeth }]} />
                <View style={[styles.pixel, { width: 2, height: 3, top: 14, left: 54, backgroundColor: teeth }]} />
                
                {/* Eye */}
                {!isBlinking && (
                    <View style={[styles.pixel, { width: 4, height: 3, top: 6, left: 50, backgroundColor: eye }]} />
                )}
                {/* Brow */}
                <View style={[styles.pixel, { width: 8, height: 3, top: 3, left: 46, backgroundColor: darkSkin, transform: [{ rotate: '15deg' }] }]} />
                
                {/* Tail stretched out */}
                <View style={[styles.pixel, { width: 25, height: 10, top: 6, left: -15, backgroundColor: skin, borderTopLeftRadius: 10, borderBottomLeftRadius: 4, transform: [{ rotate: '-10deg' }] }]} />
                <View style={[styles.pixel, { width: 15, height: 6, top: 4, left: -25, backgroundColor: skin, borderTopLeftRadius: 10, transform: [{ rotate: '-15deg' }] }]} />
                
                {/* Spikes */}
                <View style={[styles.pixel, { width: 4, height: 5, top: 3, left: 10, backgroundColor: spikes, borderTopLeftRadius: 2 }]} />
                <View style={[styles.pixel, { width: 5, height: 6, top: 2, left: 18, backgroundColor: spikes, borderTopLeftRadius: 2 }]} />
                <View style={[styles.pixel, { width: 4, height: 5, top: 4, left: 26, backgroundColor: spikes, borderTopLeftRadius: 2 }]} />
            </View>
        );
    }

    return (
        <View style={{ width: DINO_SIZE + 10, height: DINO_SIZE, transform: [{ translateY: bob }] }}>
            {/* ── HEAD ── */}
            <View style={[styles.pixel, { width: 24, height: 18, top: -2, left: 30, backgroundColor: skin, borderTopRightRadius: 10, borderTopLeftRadius: 6 }]} />
            <View style={[styles.pixel, { width: 14, height: 12, top: 0, left: 44, backgroundColor: skin, borderTopRightRadius: 8 }]} />
            {/* Jaw / Snout */}
            <View style={[styles.pixel, { width: 20, height: 8, top: 16, left: 36, backgroundColor: skin, borderBottomRightRadius: 6 }]} />
            {/* Mouth Gap */}
            <View style={[styles.pixel, { width: 16, height: 3, top: 15, left: 38, backgroundColor: '#1A0B2E' }]} />
            {/* Teeth */}
            <View style={[styles.pixel, { width: 2, height: 4, top: 14, left: 40, backgroundColor: teeth }]} />
            <View style={[styles.pixel, { width: 2, height: 5, top: 13, left: 45, backgroundColor: teeth }]} />
            <View style={[styles.pixel, { width: 2, height: 4, top: 14, left: 50, backgroundColor: teeth }]} />
            <View style={[styles.pixel, { width: 2, height: 3, top: 18, left: 42, backgroundColor: teeth }]} />
            <View style={[styles.pixel, { width: 2, height: 4, top: 18, left: 47, backgroundColor: teeth }]} />
            
            {/* Eye & Brow */}
            <View style={[styles.pixel, { width: 10, height: 4, top: 2, left: 36, backgroundColor: darkSkin, transform: [{ rotate: '15deg' }] }]} />
            {!isBlinking && (
                <View style={[styles.pixel, { width: 4, height: 4, top: 6, left: 40, backgroundColor: eye, borderRadius: 2 }]} />
            )}
            {!isBlinking && (
                <View style={[styles.pixel, { width: 2, height: 4, top: 6, left: 42, backgroundColor: '#000' }]} />
            )}
            {/* Nostril */}
            <View style={[styles.pixel, { width: 2, height: 3, top: 6, left: 54, backgroundColor: darkSkin }]} />

            {/* ── NECK & BODY ── */}
            {/* Neck transition */}
            <View style={[styles.pixel, { width: 18, height: 14, top: 14, left: 22, backgroundColor: skin }]} />
            {/* Main Torso */}
            <View style={[styles.pixel, { width: 28, height: 26, top: 20, left: 14, backgroundColor: skin, borderRadius: 8, ...elegantShadow(0.4, 10, 0, darkSkin) }]} />
            {/* Belly highlight */}
            <View style={[styles.pixel, { width: 18, height: 16, top: 26, left: 22, backgroundColor: belly, borderBottomRightRadius: 8 }]} />
            
            {/* Tiny Arm */}
            <View style={[styles.pixel, { width: 12, height: 4, top: 32, left: 40, backgroundColor: skin, borderBottomRightRadius: 3 }]} />
            <View style={[styles.pixel, { width: 8, height: 4, top: 35, left: 44, backgroundColor: skin, transform: [{ rotate: '30deg' }] }]} />
            {/* Claws */}
            <View style={[styles.pixel, { width: 2, height: 3, top: 38, left: 48, backgroundColor: darkSkin }]} />
            <View style={[styles.pixel, { width: 2, height: 3, top: 37, left: 51, backgroundColor: darkSkin }]} />

            {/* ── TAIL ── */}
            {/* Base */}
            <View style={[styles.pixel, { width: 18, height: 16, top: 22, left: 0, backgroundColor: skin, borderTopLeftRadius: 10, borderBottomLeftRadius: 6 }]} />
            {/* Mid */}
            <View style={[styles.pixel, { width: 12, height: 10, top: 16, left: -8, backgroundColor: skin, borderTopLeftRadius: 8, transform: [{ rotate: isAirborne ? '15deg' : '0deg' }] }]} />
            {/* Tip */}
            <View style={[styles.pixel, { width: 10, height: 6, top: 10, left: -16, backgroundColor: skin, borderTopLeftRadius: 6, transform: [{ rotate: isAirborne ? '25deg' : '0deg' }] }]} />

            {/* ── SPIKES ── */}
            <View style={[styles.pixel, { width: 4, height: 6, top: 15, left: 18, backgroundColor: spikes, borderTopLeftRadius: 3 }]} />
            <View style={[styles.pixel, { width: 5, height: 8, top: 12, left: 24, backgroundColor: spikes, borderTopLeftRadius: 3 }]} />
            <View style={[styles.pixel, { width: 4, height: 7, top: 13, left: 30, backgroundColor: spikes, borderTopLeftRadius: 3 }]} />

            {/* ── LEGS ── */}
            {/* Left Leg (Background) */}
            <View style={[styles.pixel, { 
                width: 10, height: 16, top: 40, left: 16, backgroundColor: darkSkin, 
                borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
                transform: [{ translateY: isAirborne ? -8 : (runFrame === 0 ? 0 : -6) }]
            }]} />
            <View style={[styles.pixel, { 
                width: 14, height: 4, top: 52, left: 14, backgroundColor: darkSkin, borderBottomRightRadius: 4,
                transform: [{ translateY: isAirborne ? -8 : (runFrame === 0 ? 0 : -6) }]
            }]} />

            {/* Right Leg (Foreground) */}
            <View style={[styles.pixel, { 
                width: 12, height: 18, top: 40, left: 26, backgroundColor: skin, 
                borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
                transform: [{ translateY: isAirborne ? -12 : (runFrame === 1 ? 0 : -6) }]
            }]} />
            {/* Calf muscle */}
            <View style={[styles.pixel, { 
                width: 6, height: 10, top: 42, left: 32, backgroundColor: skin, borderRadius: 2,
                transform: [{ translateY: isAirborne ? -12 : (runFrame === 1 ? 0 : -6) }]
            }]} />
            {/* Foot */}
            <View style={[styles.pixel, { 
                width: 16, height: 5, top: 53, left: 24, backgroundColor: skin, borderBottomRightRadius: 4,
                transform: [{ translateY: isAirborne ? -12 : (runFrame === 1 ? 0 : -6) }]
            }]} />
            {/* Toe Claws */}
            <View style={[styles.pixel, { 
                width: 2, height: 3, top: 56, left: 32, backgroundColor: darkSkin,
                transform: [{ translateY: isAirborne ? -12 : (runFrame === 1 ? 0 : -6) }]
            }]} />
            <View style={[styles.pixel, { 
                width: 2, height: 3, top: 56, left: 36, backgroundColor: darkSkin,
                transform: [{ translateY: isAirborne ? -12 : (runFrame === 1 ? 0 : -6) }]
            }]} />

            {/* Dust Particles when running */}
            {!isAirborne && runFrame === 1 && !isDucking && (
                <View style={{ position: 'absolute', top: 52, left: -10 }}>
                    <View style={[styles.pixel, { width: 3, height: 3, backgroundColor: '#78716C', top: 0, left: 0 }]} />
                    <View style={[styles.pixel, { width: 2, height: 2, backgroundColor: '#A8A29E', top: -4, left: -4 }]} />
                    <View style={[styles.pixel, { width: 4, height: 2, backgroundColor: '#78716C', top: 2, left: -8 }]} />
                </View>
            )}
        </View>
    );
};

const PremiumObstacle = ({ type }: { type: number }) => {
    // 1: Rock, 2: Dead Tree, 3: Cactus, 4: Skull
    if (type === 1) {
        // Rock Formation
        return (
            <View style={{ width: OBSTACLE_WIDTH * 1.2, height: 30, alignItems: 'flex-end', justifyContent: 'center', flexDirection: 'row' }}>
                <View style={[styles.pixel, { width: 34, height: 22, backgroundColor: '#475569', bottom: 0, borderRadius: 6, ...elegantShadow(0.6, 8, 0, '#0F172A') }]} />
                <View style={[styles.pixel, { width: 14, height: 12, backgroundColor: '#94A3B8', top: 4, left: 6, borderRadius: 3 }]} />
                <View style={[styles.pixel, { width: 18, height: 16, backgroundColor: '#334155', bottom: 0, left: 24, borderTopRightRadius: 6 }]} />
                <View style={[styles.pixel, { width: 10, height: 10, backgroundColor: '#1E293B', bottom: 0, left: -4, borderTopLeftRadius: 4 }]} />
            </View>
        );
    }
    
    if (type === 2) {
        // Dead Tree
        return (
            <View style={{ width: OBSTACLE_WIDTH * 1.5, height: 60, alignItems: 'center' }}>
                <View style={[styles.pixel, { width: 12, height: 60, backgroundColor: '#3E2723', bottom: 0, borderRadius: 4, ...elegantShadow(0.8, 10, 0, '#1B0000') }]} />
                <View style={[styles.pixel, { width: 16, height: 4, backgroundColor: '#4E342E', bottom: 30, left: -10, transform: [{ rotate: '-20deg' }] }]} />
                <View style={[styles.pixel, { width: 20, height: 4, backgroundColor: '#4E342E', bottom: 45, right: -12, transform: [{ rotate: '25deg' }] }]} />
                <View style={[styles.pixel, { width: 6, height: 4, backgroundColor: '#5D4037', bottom: 34, left: -14, transform: [{ rotate: '-45deg' }] }]} />
            </View>
        );
    }

    if (type === 4) {
        // Dinosaur Skull
        return (
            <View style={{ width: OBSTACLE_WIDTH * 1.4, height: 35, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 }}>
                <View style={[styles.pixel, { width: 32, height: 24, backgroundColor: '#F1F5F9', borderRadius: 10, ...elegantShadow(0.5, 6, 0, '#94A3B8') }]} />
                <View style={[styles.pixel, { width: 18, height: 10, backgroundColor: '#F1F5F9', bottom: -2, right: -12, borderBottomRightRadius: 6 }]} />
                {/* Eye Socket */}
                <View style={[styles.pixel, { width: 10, height: 8, backgroundColor: '#090410', top: 8, left: 12, borderRadius: 4 }]} />
                {/* Nose Cavity */}
                <View style={[styles.pixel, { width: 4, height: 4, backgroundColor: '#090410', top: 12, right: -6, borderRadius: 2 }]} />
                {/* Teeth */}
                <View style={[styles.pixel, { width: 2, height: 4, backgroundColor: '#CBD5E1', bottom: -6, right: -4 }]} />
                <View style={[styles.pixel, { width: 2, height: 4, backgroundColor: '#CBD5E1', bottom: -6, right: -8 }]} />
            </View>
        );
    }
    
    // 3: Single Tall Cactus
    return (
        <View style={{ width: OBSTACLE_WIDTH, height: 50, alignItems: 'center' }}>
            <View style={[styles.pixel, { width: 16, height: 50, backgroundColor: '#166534', bottom: 0, borderRadius: 6, ...elegantShadow(0.6, 8, 0, '#064E3B') }]} />
            <View style={[styles.pixel, { width: 6, height: 50, backgroundColor: '#22C55E', bottom: 0, left: 2, borderRadius: 4 }]} />
            
            <View style={[styles.pixel, { width: 12, height: 24, backgroundColor: '#166534', bottom: 16, left: -10, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }]} />
            <View style={[styles.pixel, { width: 4, height: 20, backgroundColor: '#22C55E', bottom: 18, left: -8, borderRadius: 2 }]} />
            
            <View style={[styles.pixel, { width: 10, height: 18, backgroundColor: '#166534', bottom: 24, right: -8, borderTopRightRadius: 6, borderBottomRightRadius: 6 }]} />
        </View>
    );
};


export default function DinoJump() {
  const [dinoY, setDinoY] = useState(0); // 0 is ground
  const [velocity, setVelocity] = useState(0);
  const [isDucking, setIsDucking] = useState(false);
  const [obstacles, setObstacles] = useState<{x: number, type: number, y: number}[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [runFrame, setRunFrame] = useState(0);

  const dinoYRef = useRef(dinoY);
  const velocityRef = useRef(velocity);
  const obstaclesRef = useRef(obstacles);
  const gameOverRef = useRef(gameOver);
  const gameStartedRef = useRef(gameStarted);
  const isPausedRef = useRef(isPaused);
  const isDuckingRef = useRef(isDucking);
  const gameLoopRef = useRef<number | null>(null);
  const scoreRef = useRef(score);
  
  const bgProgress = useSharedValue(0);
  const gameDistance = useSharedValue(0);

  useEffect(() => {
    dinoYRef.current = dinoY;
    velocityRef.current = velocity;
    obstaclesRef.current = obstacles;
    gameOverRef.current = gameOver;
    gameStartedRef.current = gameStarted;
    isPausedRef.current = isPaused;
    isDuckingRef.current = isDucking;
    scoreRef.current = score;
  }, [dinoY, velocity, obstacles, gameOver, gameStarted, isPaused, isDucking, score]);

  useEffect(() => {
    AsyncStorage.getItem('dino_hs').then(v => v && setHighScore(parseInt(v)));
  }, []);

  const jump = () => {
    if (gameOverRef.current) return;
    if (isPausedRef.current) {
        setIsPaused(false);
        return;
    }
    if (!gameStartedRef.current) {
        setGameStarted(true);
        setScore(0);
        gameDistance.value = 0;
    }
    // Prevent double jumps strictly by checking if perfectly grounded
    if (dinoYRef.current === 0) {
        tapLight();
        setVelocity(JUMP_VELOCITY);
    }
  };

  const duck = (isDown: boolean) => {
      if (gameOverRef.current || !gameStartedRef.current) return;
      setIsDucking(isDown);
      if (isDown && dinoYRef.current < 0) {
          // Fast fall if mid-air
          setVelocity(v => v + 8);
      }
  };

  const spawnObstacle = () => {
      const rand = Math.random();
      // 1: Rock, 2: Dead Tree, 3: Cactus, 4: Skull
      const type = rand > 0.8 ? 4 : rand > 0.5 ? 2 : rand > 0.3 ? 1 : 3;
      return { x: screenWidth, type, y: 0 };
  };

  const gameLoop = () => {
    if (gameOverRef.current || !gameStartedRef.current || isPausedRef.current) {
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        return;
    }

    // Physics Update
    let newY = dinoYRef.current + velocityRef.current;
    let newVel = velocityRef.current + GRAVITY;

    if (newY >= 0) { // Hit ground (0 is ground, negative is up)
        newY = 0;
        newVel = 0;
    }
    setDinoY(newY);
    setVelocity(newVel);

    // Difficulty scaling
    const currentSpeed = BASE_SPEED + (scoreRef.current / 500) * 2;
    
    // Update SharedValue for smooth 60fps parallax background / road
    gameDistance.value += currentSpeed;

    // Obstacles
    let currObs = [...obstaclesRef.current];
    let collision = false;
    
    // Refined Hitbox
    const dinoHitbox = {
        left: 50 + 6, // Padding added for leniency
        right: 50 + DINO_SIZE - 6,
        top: newY - (isDuckingRef.current ? DINO_SIZE/2 : DINO_SIZE) + 6,
        bottom: newY - 4
    };

    for (let i = 0; i < currObs.length; i++) {
        currObs[i].x -= currentSpeed;
        
        const obsWidth = currObs[i].type === 2 ? OBSTACLE_WIDTH * 1.5 : (currObs[i].type === 4 ? OBSTACLE_WIDTH * 1.4 : (currObs[i].type === 1 ? OBSTACLE_WIDTH * 1.2 : OBSTACLE_WIDTH));
        const obsHeight = currObs[i].type === 2 ? 60 : (currObs[i].type === 3 ? 50 : (currObs[i].type === 4 ? 35 : 30));
        
        const obsHitbox = {
            left: currObs[i].x + 4,
            right: currObs[i].x + obsWidth - 4,
            top: -currObs[i].y - obsHeight + 4,
            bottom: -currObs[i].y
        };

        // AABB Collision (Y is negative going up)
        if (
            dinoHitbox.right > obsHitbox.left &&
            dinoHitbox.left < obsHitbox.right &&
            dinoHitbox.bottom > obsHitbox.top &&
            dinoHitbox.top < obsHitbox.bottom
        ) {
            collision = true;
            break;
        }
    }

    if (collision) {
        handleGameOver();
        return;
    }

    // Remove offscreen
    if (currObs.length > 0 && currObs[0].x < -100) {
        currObs.shift();
    }

    // Spawn new
    if (currObs.length === 0 || (screenWidth - currObs[currObs.length - 1].x > Math.random() * 200 + 350)) {
        if (Math.random() > 0.02) {
            currObs.push(spawnObstacle());
        }
    }
    
    setObstacles(currObs);
    
    // Score & Day/Night Cycle
    setScore(s => {
        const next = s + 1;
        const cycle = (next % 2000) / 1000;
        bgProgress.value = withTiming(cycle > 1 ? 2 - cycle : cycle, { duration: 100 });
        
        // Leg animation runs slightly faster as speed increases
        if (next % Math.max(3, Math.floor(8 - currentSpeed * 0.2)) === 0) {
            setRunFrame(f => (f === 0 ? 1 : 0));
        }
        return next;
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
    if (gameStarted && !gameOver && !isPaused) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameStarted, gameOver, isPaused]);

  const handleGameOver = () => {
    setGameOver(true);
    setGameStarted(false);
    notifyError();
    if (scoreRef.current > highScore) {
      setHighScore(scoreRef.current);
      AsyncStorage.setItem('dino_hs', scoreRef.current.toString());
    }
  };

  const restart = () => {
    setDinoY(0);
    setVelocity(0);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    setIsPaused(false);
    setIsDucking(false);
    bgProgress.value = 0;
    gameDistance.value = 0;
  };

  // Single, authoritative keyboard handler.
  // Uses capture phase (true) so it fires BEFORE React Native Modal / any element can intercept.
  // Reads all game state from refs so there are zero stale-closure issues.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const key = e.key;
      const isGameKey = [' ', 'ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S', 'Enter'].includes(key);
      if (!isGameKey) return;

      // Prevent default (scrolling, button clicks from Enter, etc.)
      e.preventDefault();
      // Stop the event reaching modal buttons or other listeners
      e.stopPropagation();

      if (key === 'Enter') {
        if (gameOverRef.current) {
          // GAME OVER → RESTART & PLAY
          restart();
        } else if (!gameStartedRef.current) {
          // NOT STARTED → START
          setGameStarted(true);
          setScore(0);
          gameDistance.value = 0;
          tapLight();
        } else {
          // RUNNING → PAUSE / PAUSED → RESUME
          setIsPaused(p => !p);
        }
        return;
      }

      if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') {
        if (gameOverRef.current) return;
        if (isPausedRef.current) { setIsPaused(false); return; }
        if (!gameStartedRef.current) {
          setGameStarted(true);
          setScore(0);
          gameDistance.value = 0;
        }
        if (dinoYRef.current === 0) {
          tapLight();
          setVelocity(JUMP_VELOCITY);
        }
        return;
      }

      if (key === 'ArrowDown' || key === 's' || key === 'S') {
        if (gameOverRef.current || !gameStartedRef.current || isPausedRef.current) return;
        setIsDucking(true);
        if (dinoYRef.current < 0) setVelocity(v => v + 8);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setIsDucking(false);
      }
    };

    // capture: true fires BEFORE any element's bubble-phase handler
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps intentional — state is read via refs

  return (
    <TouchableWithoutFeedback onPress={jump}>
        <View style={styles.root}>
        <CyberBackground scrollOffset={gameDistance} />
        
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            
            <GameHeader
                title="CYBER RUN"
                score={score}
                highScore={highScore}
                accentColor={ACCENT}
                onBack={() => { setGameOver(true); router.replace('/'); }}
            />

            {!gameStarted && !gameOver && (
                <View style={[StyleSheet.absoluteFill, styles.startOverlay]}>
                    <Text style={styles.startTitle}>🦖 DINO RUN</Text>
                    <Text style={styles.startPrompt}>PRESS ENTER TO START</Text>
                    <Text style={styles.startSub}>or tap the screen</Text>
                    <View style={styles.startHints}>
                        <Text style={styles.hintText}>⬆ Space / Up Arrow — Jump</Text>
                        <Text style={styles.hintText}>⬇ Down Arrow — Duck</Text>
                        <Text style={styles.hintText}>⏸ Enter — Pause / Resume</Text>
                    </View>
                </View>
            )}
            
            {isPaused && (
                <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 100 }]}>
                    <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.pausedOverlay}>
                        <Text style={styles.pausedTitle}>PAUSED</Text>
                        <Text style={styles.pausedSub}>Press P or Enter to resume</Text>
                    </View>
                </View>
            )}

            <View style={styles.gameArea}>
                {/* Dino */}
                <View style={[styles.dinoWrapper, { transform: [{ translateY: dinoY }] }]}>
                    <PremiumRex isDucking={isDucking} runFrame={runFrame} yOffset={dinoY} score={score} />
                </View>

                {/* Obstacles */}
                {obstacles.map((obs, i) => (
                    <View key={i} style={[styles.obsWrapper, { left: obs.x, bottom: obs.y + ROAD_HEIGHT }]}>
                        <PremiumObstacle type={obs.type} />
                    </View>
                ))}

                {/* Ground */}
                <CyberRoad gameDistance={gameDistance} />

                {isPaused && (
                    <View style={[styles.pausedOverlay, { backgroundColor: 'rgba(11,7,21,0.8)' }]}>
                        <Text style={styles.pausedTitle}>PAUSED</Text>
                        <Text style={styles.pausedSub}>Press ENTER or SPACE to resume</Text>
                    </View>
                )}
            </View>

            <GameOverModal
                visible={gameOver}
                title="SYSTEM FAILURE"
                score={score}
                highScore={highScore}
                isNewHighScore={score >= highScore && score > 0}
                accentColor={ACCENT}
                onRestart={restart}
                onHome={() => router.replace('/')}
            />
        </SafeAreaView>
        </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1 },
  gameArea: {
      flex: 1,
      justifyContent: 'flex-end',
  },
  dinoWrapper: {
      position: 'absolute',
      left: 50,
      bottom: ROAD_HEIGHT,
      zIndex: 10,
  },
  pixel: {
      position: 'absolute',
  },
  obsWrapper: {
      position: 'absolute',
      zIndex: 5,
  },
  pausedOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 20,
  },
  pausedTitle: {
      fontFamily: Fonts.heading,
      fontSize: FontSize['3xl'],
      color: ACCENT,
      letterSpacing: 4,
      marginBottom: Spacing[2],
  },
  pausedSub: {
      fontFamily: Fonts.body,
      fontSize: FontSize.sm,
      color: Colors.text.muted,
  },
  
  // Cyber Background Elements
  star: {
      position: 'absolute',
      width: 2,
      height: 2,
      backgroundColor: '#FFFFFF',
      borderRadius: 1,
      opacity: 0.8,
  },
  building: {
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      borderWidth: 1,
      borderColor: 'rgba(0, 229, 255, 0.1)',
      borderBottomWidth: 0,
  },
  
  // Cyber Road
  roadContainer: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: ROAD_HEIGHT,
      backgroundColor: '#0F081C',
      zIndex: 2,
  },
  roadTopEdge: {
      position: 'absolute',
      top: 0,
      width: '100%',
      height: 3,
      backgroundColor: ACCENT,
      ...elegantShadow(0.8, 10, 0, ACCENT),
      zIndex: 3,
  },
  roadBottomGradient: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: 40,
      backgroundColor: 'rgba(0,0,0,0.8)',
      zIndex: 4,
  },
  roadSegment: {
      width: 100,
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
  },
  laneMarking: {
      width: 40,
      height: 4,
      backgroundColor: 'rgba(0, 229, 255, 0.3)',
      borderRadius: 2,
  },
  roadGridLine: {
      position: 'absolute',
      right: 0,
      width: 1,
      height: '100%',
      backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  
  // Neon Spike
  neonSpikeBase: {
      position: 'absolute',
      bottom: 0,
      width: 24,
      height: 8,
      backgroundColor: '#2D3748',
      borderRadius: 2,
  },
  neonSpikeTip: {
      position: 'absolute',
      bottom: 8,
      width: 0,
      height: 0,
      borderLeftWidth: 8,
      borderRightWidth: 8,
      borderBottomWidth: 32,
      borderStyle: 'solid',
      backgroundColor: 'transparent',
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderBottomColor: '#1A202C',
  },
  neonSpikeCore: {
      position: 'absolute',
      bottom: 8,
      width: 4,
      height: 24,
      backgroundColor: '#EF4444',
      borderRadius: 2,
      ...elegantShadow(1, 8, 0, '#EF4444'),
  },
  
  // End of duplicate styles

  // Start Screen
  startOverlay: {
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      backgroundColor: 'rgba(9, 4, 16, 0.75)',
  },
  startTitle: {
      fontSize: 36,
      fontWeight: '900',
      color: '#00E5FF',
      letterSpacing: 6,
      textShadowColor: '#00E5FF',
      textShadowRadius: 20,
      marginBottom: 16,
  },
  startPrompt: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#FFFFFF',
      letterSpacing: 3,
      textShadowColor: '#B300FF',
      textShadowRadius: 12,
      borderWidth: 2,
      borderColor: 'rgba(0, 229, 255, 0.5)',
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: 'rgba(0, 229, 255, 0.08)',
      marginBottom: 10,
  },
  startSub: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.5)',
      marginBottom: 32,
  },
  startHints: {
      gap: 8,
      alignItems: 'center',
  },
  hintText: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.55)',
      letterSpacing: 1,
  },
});
