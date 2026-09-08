import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableWithoutFeedback, Dimensions, TouchableOpacity, PanResponder, Image, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import { Colors, elegantShadow } from '../src/theme/colors';
import { Fonts, FontSize } from '../src/theme/typography';
import { Spacing, Radius } from '../src/theme/spacing';
import { GameHeader } from '../src/components/GameHeader';
import { GameOverModal } from '../src/components/GameOverModal';
import { CyberBackground } from '../src/components/CyberBackground';
import { tapLight, notifyError } from '../src/utils/haptics';

const ACCENT = '#00E5FF'; // Cyberpunk Cyan
const ACCENT_ALT = '#B300FF'; // Cyberpunk Purple
const GRAVITY = 0.85;
const JUMP_VELOCITY = -15.5;
const DINO_SIZE = 56;
const OBSTACLE_WIDTH = 30;
const BASE_SPEED = 5.5;
const ROAD_HEIGHT = 80;
const MAX_SPEED = 14;
const MIN_OBSTACLE_GAP = 200;
const SPEED_RAMP = 1.2;

// DinoBackground removed — CyberBackground is used instead

const DinoGround = React.memo(({ gameDistance, windowWidth }: { gameDistance: SharedValue<number>, windowWidth: number }) => {
    const roadStyle = useAnimatedStyle(() => {
        return { transform: [{ translateX: -(gameDistance.value % 100) }] };
    });

    return (
        <View style={[styles.roadContainer, { backgroundColor: 'transparent' }]}>
            <View style={{ width: '100%', height: 3, backgroundColor: '#4A2D5C', position: 'absolute', top: 0, zIndex: 3 }} />
            <View style={{ width: '100%', height: 2, backgroundColor: '#3B2447', position: 'absolute', top: 3, zIndex: 3 }} />
            <View style={{ width: '100%', height: 1, backgroundColor: '#2D1B36', position: 'absolute', top: 5, zIndex: 3 }} />

            <Animated.View style={[{ width: windowWidth + 200, height: '100%', flexDirection: 'row' }, roadStyle]}>
                {Array.from({ length: Math.ceil(windowWidth / 100) + 3 }).map((_, i) => (
                    <View key={i} style={[styles.roadSegment, { backgroundColor: 'transparent', borderColor: 'transparent' }]}>
                        <View style={[styles.pixel, { width: 100, height: 8, backgroundColor: '#211430', top: 8, left: 0 }]} />
                        <View style={[styles.pixel, { width: 100, height: 10, backgroundColor: '#1A0F26', top: 16, left: 0 }]} />

                        <View style={[styles.pixel, { width: 4, height: 3, backgroundColor: '#3B2447', top: 10, left: 8 }]} />
                        <View style={[styles.pixel, { width: 3, height: 2, backgroundColor: '#4C2F5C', top: 22, left: 35 }]} />
                        <View style={[styles.pixel, { width: 5, height: 3, backgroundColor: '#251630', top: 15, left: 60 }]} />
                        <View style={[styles.pixel, { width: 3, height: 3, backgroundColor: '#3B2447', top: 30, left: 18 }]} />
                        <View style={[styles.pixel, { width: 2, height: 2, backgroundColor: '#4C2F5C', top: 28, left: 75 }]} />
                        <View style={[styles.pixel, { width: 6, height: 2, backgroundColor: '#2D1B36', top: 40, left: 50 }]} />
                        <View style={[styles.pixel, { width: 4, height: 2, backgroundColor: '#332040', top: 50, left: 25 }]} />
                        
                        <View style={{ position: 'absolute', top: -3, left: 15, flexDirection: 'row', alignItems: 'flex-end' }}>
                            <View style={[styles.pixel, { width: 2, height: 7, backgroundColor: '#5D4037' }]} />
                            <View style={[styles.pixel, { width: 2, height: 5, backgroundColor: '#4E342E', marginLeft: 1 }]} />
                            <View style={[styles.pixel, { width: 2, height: 3, backgroundColor: '#3E2723', marginLeft: 1 }]} />
                        </View>
                        <View style={{ position: 'absolute', top: -2, left: 55, flexDirection: 'row', alignItems: 'flex-end' }}>
                            <View style={[styles.pixel, { width: 2, height: 4, backgroundColor: '#4E342E', transform: [{ rotate: '-8deg' }] }]} />
                            <View style={[styles.pixel, { width: 2, height: 8, backgroundColor: '#5D4037', marginLeft: 1 }]} />
                        </View>
                        <View style={{ position: 'absolute', top: -2, left: 85, flexDirection: 'row', alignItems: 'flex-end' }}>
                            <View style={[styles.pixel, { width: 2, height: 5, backgroundColor: '#5D4037', transform: [{ rotate: '6deg' }] }]} />
                            <View style={[styles.pixel, { width: 2, height: 3, backgroundColor: '#3E2723', marginLeft: 1 }]} />
                        </View>

                        {i % 3 === 0 && (
                            <View style={[styles.pixel, { width: 10, height: 3, backgroundColor: '#2A1D38', top: 38, left: 45, borderRadius: 1, transform: [{ rotate: '20deg' }] }]} />
                        )}
                        {i % 4 === 1 && (
                            <View style={[styles.pixel, { width: 8, height: 3, backgroundColor: '#332040', top: 45, left: 20, borderRadius: 1, transform: [{ rotate: '-15deg' }] }]} />
                        )}
                    </View>
                ))}
            </Animated.View>
            <View style={[styles.roadBottomGradient, { backgroundColor: '#090410', opacity: 0.9 }]} />
        </View>
    );
});

const PremiumRex = React.memo(({ isDuckingSV, runFrameSV, yOffsetSV, score }: any) => {
    const skin     = '#5B8C3A'; const skinMid  = '#4A7230'; const skinDark = '#35521F';
    const belly    = '#A8C878'; const eye      = '#FFE033'; const pupil    = '#000000';
    const claw     = '#C8A050'; const spineCol = '#2D6B1A';

    const standingStyle = useAnimatedStyle(() => {
        const y = yOffsetSV.value;
        const airborne = y < -4;
        const landing = !airborne && y > -6 && y < -0.5;
        const frame = runFrameSV.value % 4;
        const bob = airborne ? 0 : (frame === 1 || frame === 3 ? -2 : 0);
        const scaleY = landing ? 1.08 : (y < -60 ? 0.92 : 1);
        const scaleX = landing ? 0.95 : (y < -60 ? 1.06 : 1);
        const duckVisual = isDuckingSV.value === 1 && Math.abs(y) < 0.5;
        return {
            opacity: duckVisual ? 0 : 1,
            position: 'absolute',
            bottom: 0,          // Feet pinned to floor of container
            width: 70, height: 64,
            transform: [{ translateY: bob }, { scaleX: scaleX * 0.8 }, { scaleY: scaleY * 0.8 }]
        };
    });

    const duckingStyle = useAnimatedStyle(() => {
        const y = yOffsetSV.value;
        const frame = runFrameSV.value % 4;
        const bob = (frame === 1 || frame === 3 ? -1 : 0);
        const duckVisual = isDuckingSV.value === 1 && Math.abs(y) < 0.5;
        return {
            opacity: duckVisual ? 1 : 0,
            position: 'absolute',
            bottom: 0,          // Feet firmly on the ground
            width: 58, height: 26,  // Explicit size, no scale transform
            transform: [{ translateY: bob }]
        };
    });

    const tail1 = useAnimatedStyle(() => {
        const frame = runFrameSV.value % 4;
        const sway = (yOffsetSV.value < -4) ? 20 : (frame === 0 || frame === 1 ? -8 : 8);
        return { transform: [{ rotate: `${sway * 0.5}deg` }] };
    });
    const tail2 = useAnimatedStyle(() => {
        const frame = runFrameSV.value % 4;
        const sway = (yOffsetSV.value < -4) ? 20 : (frame === 0 || frame === 1 ? -8 : 8);
        return { transform: [{ rotate: `${sway}deg` }] };
    });
    const tail3 = useAnimatedStyle(() => {
        const frame = runFrameSV.value % 4;
        const sway = (yOffsetSV.value < -4) ? 20 : (frame === 0 || frame === 1 ? -8 : 8);
        return { transform: [{ rotate: `${sway * 1.4}deg` }] };
    });
    const tail4 = useAnimatedStyle(() => {
        const frame = runFrameSV.value % 4;
        const sway = (yOffsetSV.value < -4) ? 20 : (frame === 0 || frame === 1 ? -8 : 8);
        return { transform: [{ rotate: `${sway * 1.8}deg` }] };
    });

    const headTilt = useAnimatedStyle(() => {
        const frame = runFrameSV.value % 4;
        const tilt = (yOffsetSV.value < -4) ? -5 : (frame === 1 || frame === 3 ? 3 : 0);
        return { transform: [{ rotate: `${tilt}deg` }] };
    });

    const legLThigh = useAnimatedStyle(() => {
        const frame = runFrameSV.value % 4;
        const thigh = (yOffsetSV.value < -4) ? -14 : (frame === 0 ? 2 : frame === 1 ? -8 : frame === 2 ? 4 : -6);
        return { top: 40 + thigh };
    });
    const legLShin = useAnimatedStyle(() => {
        const airborne = yOffsetSV.value < -4;
        const frame = runFrameSV.value % 4;
        const thigh = airborne ? -14 : (frame === 0 ? 2 : frame === 1 ? -8 : frame === 2 ? 4 : -6);
        const shin = airborne ? 25 : (frame === 0 ? 0 : frame === 1 ? 20 : frame === 2 ? 5 : 18);
        return { top: 55 + thigh - (shin * 0.3), transform: [{ rotate: `${shin * 0.5}deg` }] };
    });
    const legLFoot = useAnimatedStyle(() => {
        const frame = runFrameSV.value % 4;
        const thigh = (yOffsetSV.value < -4) ? -14 : (frame === 0 ? 2 : frame === 1 ? -8 : frame === 2 ? 4 : -6);
        return { top: 58 + thigh };
    });

    const legRThigh = useAnimatedStyle(() => {
        const frame = runFrameSV.value % 4;
        const thigh = (yOffsetSV.value < -4) ? -10 : (frame === 0 ? 4 : frame === 1 ? -6 : frame === 2 ? 0 : -10);
        return { top: 38 + thigh };
    });
    const legRShin = useAnimatedStyle(() => {
        const airborne = yOffsetSV.value < -4;
        const frame = runFrameSV.value % 4;
        const thigh = airborne ? -10 : (frame === 0 ? 4 : frame === 1 ? -6 : frame === 2 ? 0 : -10);
        const shin = airborne ? 20 : (frame === 0 ? 5 : frame === 1 ? 18 : frame === 2 ? 0 : 22);
        return { top: 55 + thigh - (shin * 0.3), transform: [{ rotate: `${shin * 0.5}deg` }] };
    });
    const legRFoot = useAnimatedStyle(() => {
        const frame = runFrameSV.value % 4;
        const thigh = (yOffsetSV.value < -4) ? -10 : (frame === 0 ? 4 : frame === 1 ? -6 : frame === 2 ? 0 : -10);
        return { top: 58 + thigh };
    });

    const dustStyle = useAnimatedStyle(() => {
        const airborne = yOffsetSV.value < -4;
        const frame = runFrameSV.value % 4;
        return { opacity: (!airborne && (frame === 1 || frame === 3) && isDuckingSV.value === 0) ? 1 : 0 };
    });
    
    const puffStyle = useAnimatedStyle(() => {
        const dY = yOffsetSV.value;
        const landing = dY > -6 && dY < -0.5;
        return { opacity: landing ? 1 : 0 };
    });

    const isBlinking = score > 0 && score % 250 < 8;

    return (
        <View style={{ width: 70, height: 64 }}>
            {/* DUCKING DINO */}
            <Animated.View style={duckingStyle}>
                <View style={[styles.pixel, { width: 22, height: 8,  top: 6,  left: -12, backgroundColor: skin,    borderTopLeftRadius: 6 }]} />
                <View style={[styles.pixel, { width: 14, height: 5,  top: 4,  left: -22, backgroundColor: skinMid, borderTopLeftRadius: 4 }]} />
                <View style={[styles.pixel, { width: 8,  height: 3,  top: 2,  left: -28, backgroundColor: skinDark }]} />
                <View style={[styles.pixel, { width: 3, height: 4, top: 2, left: 8,  backgroundColor: spineCol }]} />
                <View style={[styles.pixel, { width: 3, height: 5, top: 1, left: 14, backgroundColor: spineCol }]} />
                <View style={[styles.pixel, { width: 3, height: 4, top: 2, left: 20, backgroundColor: spineCol }]} />
                <View style={[styles.pixel, { width: 42, height: 16, top: 6, left: 6,  backgroundColor: skin, borderTopLeftRadius: 6, borderTopRightRadius: 4 }]} />
                <View style={[styles.pixel, { width: 34, height: 8,  top: 14, left: 10, backgroundColor: belly }]} />
                <View style={[styles.pixel, { width: 22, height: 14, top: 2, left: 44, backgroundColor: skin, borderTopRightRadius: 8, borderBottomRightRadius: 4 }]} />
                <View style={[styles.pixel, { width: 14, height: 8,  top: 16, left: 50, backgroundColor: skin, borderBottomRightRadius: 6 }]} />
                <View style={[styles.pixel, { width: 12, height: 2,  top: 14, left: 50, backgroundColor: skinDark }]} />
                {!isBlinking && <View style={[styles.pixel, { width: 5, height: 5, top: 4, left: 54, backgroundColor: eye, borderRadius: 2 }]} />}
                {!isBlinking && <View style={[styles.pixel, { width: 2, height: 3, top: 5, left: 56, backgroundColor: pupil }]} />}
                <View style={[styles.pixel, { width: 8, height: 3, top: 1, left: 50, backgroundColor: skinDark, transform: [{ rotate: '20deg' }] }]} />
                <View style={[styles.pixel, { width: 8,  height: 10, top: 18, left: 14, backgroundColor: skinMid }]} />
                <View style={[styles.pixel, { width: 10, height: 6,  top: 24, left: 11, backgroundColor: skin }]} />
                <View style={[styles.pixel, { width: 8,  height: 10, top: 18, left: 28, backgroundColor: skin }]} />
                <View style={[styles.pixel, { width: 10, height: 6,  top: 24, left: 25, backgroundColor: belly }]} />
            </Animated.View>

            {/* STANDING DINO */}
            <Animated.View style={standingStyle}>
                <Animated.View style={[styles.pixel, tail1, { width: 20, height: 14, top: 28, left: -10, backgroundColor: skin, borderTopLeftRadius: 8, borderBottomLeftRadius: 4 }]} />
                <Animated.View style={[styles.pixel, tail2, { width: 14, height: 10, top: 22, left: -18, backgroundColor: skinMid, borderTopLeftRadius: 6 }]} />
                <Animated.View style={[styles.pixel, tail3, { width: 10, height: 7, top: 18, left: -26, backgroundColor: skinDark, borderTopLeftRadius: 5 }]} />
                <Animated.View style={[styles.pixel, tail4, { width: 6,  height: 4,  top: 14, left: -32, backgroundColor: skinDark }]} />

                <View style={[styles.pixel, { width: 4, height: 8,  top: 8,  left: 20, backgroundColor: spineCol, borderTopLeftRadius: 3 }]} />
                <View style={[styles.pixel, { width: 4, height: 10, top: 4,  left: 26, backgroundColor: spineCol, borderTopLeftRadius: 3 }]} />
                <View style={[styles.pixel, { width: 4, height: 9,  top: 6,  left: 32, backgroundColor: spineCol, borderTopLeftRadius: 3 }]} />
                <View style={[styles.pixel, { width: 4, height: 7,  top: 9,  left: 38, backgroundColor: spineCol, borderTopLeftRadius: 2 }]} />

                <View style={[styles.pixel, { width: 34, height: 28, top: 16, left: 14, backgroundColor: skin, borderRadius: 6, shadowColor: skinDark, shadowOffset: {width: 0, height: 3}, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 }]} />
                <View style={[styles.pixel, { width: 22, height: 16, top: 26, left: 22, backgroundColor: belly, borderBottomLeftRadius: 6, borderBottomRightRadius: 4 }]} />
                <View style={[styles.pixel, { width: 30, height: 5,  top: 16, left: 16, backgroundColor: skinMid, borderTopLeftRadius: 4, borderTopRightRadius: 4 }]} />

                <View style={[styles.pixel, { width: 18, height: 16, top: 10, left: 30, backgroundColor: skin, borderTopRightRadius: 6 }]} />
                <View style={[styles.pixel, { width: 12, height: 10, top: 10, left: 36, backgroundColor: belly }]} />

                <Animated.View style={[styles.pixel, headTilt, { top: -4, left: 34, width: 26, height: 20 }]}>
                    <View style={[styles.pixel, { width: 26, height: 20, top: 0,  left: 0,  backgroundColor: skin, borderTopRightRadius: 10, borderTopLeftRadius: 6 }]} />
                    <View style={[styles.pixel, { width: 14, height: 4,  top: 0,  left: 4,  backgroundColor: skinDark, borderTopLeftRadius: 2, borderTopRightRadius: 4 }]} />
                    {!isBlinking && (
                        <>
                            <View style={[styles.pixel, { width: 7, height: 7, top: 4, left: 6, backgroundColor: eye, borderRadius: 2 }]} />
                            <View style={[styles.pixel, { width: 3, height: 4, top: 5, left: 8, backgroundColor: pupil }]} />
                            <View style={[styles.pixel, { width: 2, height: 2, top: 4, left: 6, backgroundColor: '#FFFFFF', opacity: 0.9 }]} />
                        </>
                    )}
                    <View style={[styles.pixel, { width: 22, height: 10, top: 18, left: 6,  backgroundColor: skin, borderBottomRightRadius: 6 }]} />
                    <View style={[styles.pixel, { width: 18, height: 3,  top: 17, left: 8,  backgroundColor: skinDark }]} />
                    <View style={[styles.pixel, { width: 3, height: 5, top: 16, left: 10, backgroundColor: '#F5F5F5' }]} />
                    <View style={[styles.pixel, { width: 3, height: 6, top: 15, left: 15, backgroundColor: '#F5F5F5' }]} />
                    <View style={[styles.pixel, { width: 3, height: 5, top: 16, left: 20, backgroundColor: '#F5F5F5' }]} />
                    <View style={[styles.pixel, { width: 2, height: 2, top: 8,  left: 24, backgroundColor: skinDark }]} />
                </Animated.View>

                <View style={[styles.pixel, { width: 10, height: 4,  top: 30, left: 44, backgroundColor: skinMid, borderBottomRightRadius: 2 }]} />
                <View style={[styles.pixel, { width: 6,  height: 4,  top: 33, left: 50, backgroundColor: skin, transform: [{ rotate: '30deg' }] }]} />
                <View style={[styles.pixel, { width: 2, height: 3,   top: 36, left: 52, backgroundColor: claw }]} />
                <View style={[styles.pixel, { width: 2, height: 3,   top: 36, left: 55, backgroundColor: claw }]} />

                {/* BACK LEG */}
                <Animated.View style={[styles.pixel, legLThigh, { width: 12, height: 18, left: 16, backgroundColor: skinMid, borderTopLeftRadius: 4, borderTopRightRadius: 4 }]} />
                <Animated.View style={[styles.pixel, legLShin, { width: 10, height: 16, left: 14, backgroundColor: skinDark }]} />
                <Animated.View style={[styles.pixel, legLFoot, { width: 16, height: 5, left: 10, backgroundColor: skinMid, borderBottomRightRadius: 4 }]}>
                    <View style={[styles.pixel, { width: 2, height: 3, top: 3, left: 2, backgroundColor: claw }]} />
                    <View style={[styles.pixel, { width: 2, height: 3, top: 3, left: 6, backgroundColor: claw }]} />
                </Animated.View>

                {/* FRONT LEG */}
                <Animated.View style={[styles.pixel, legRThigh, { width: 14, height: 20, left: 26, backgroundColor: skin, borderTopLeftRadius: 4, borderTopRightRadius: 4 }]} />
                <Animated.View style={[styles.pixel, legRShin, { width: 12, height: 18, left: 24, backgroundColor: skinMid }]} />
                <Animated.View style={[styles.pixel, legRFoot, { width: 18, height: 6, left: 20, backgroundColor: skin, borderBottomRightRadius: 5 }]}>
                    <View style={[styles.pixel, { width: 2, height: 4, top: 4, left: 2, backgroundColor: claw }]} />
                    <View style={[styles.pixel, { width: 2, height: 4, top: 4, left: 7, backgroundColor: claw }]} />
                    <View style={[styles.pixel, { width: 2, height: 3, top: 3, left: 12, backgroundColor: claw }]} />
                </Animated.View>
            </Animated.View>

            <Animated.View style={[dustStyle, { position: 'absolute', top: 58, left: 10 }]}>
                <View style={[styles.pixel, { width: 5, height: 3, backgroundColor: '#A8A29E', top: 0,  left: -10, opacity: 0.85 }]} />
                <View style={[styles.pixel, { width: 4, height: 2, backgroundColor: '#78716C', top: -4, left: -16, opacity: 0.65 }]} />
                <View style={[styles.pixel, { width: 6, height: 2, backgroundColor: '#A8A29E', top: 3,  left: -20, opacity: 0.5  }]} />
                <View style={[styles.pixel, { width: 3, height: 2, backgroundColor: '#D6D3D1', top: -6, left: -24, opacity: 0.35 }]} />
                <View style={[styles.pixel, { width: 4, height: 2, backgroundColor: '#78716C', top: 5,  left: -6,  opacity: 0.4  }]} />
            </Animated.View>

            <Animated.View style={[puffStyle, { position: 'absolute', top: 62, left: 8 }]}>
                <View style={[styles.pixel, { width: 8, height: 3, backgroundColor: '#A8A29E', top: 0,  left: -12, opacity: 0.6 }]} />
                <View style={[styles.pixel, { width: 10, height: 2, backgroundColor: '#78716C', top: -3, left: 12,  opacity: 0.5 }]} />
                <View style={[styles.pixel, { width: 5,  height: 2, backgroundColor: '#D6D3D1', top: 2,  left: 24,  opacity: 0.35 }]} />
                <View style={[styles.pixel, { width: 6,  height: 3, backgroundColor: '#A8A29E', top: 0,  left: -22, opacity: 0.3 }]} />
            </Animated.View>
        </View>
    );
});

const PremiumObstacle = ({ type, runFrameSV }: { type: number, runFrameSV?: any }) => {
    // 1: Rock, 2: Dead Tree, 3: Cactus, 4: Skull, 5: Broken Fence, 6: Spikes, 7: Low Bird, 8: Volcanic Rock, 9: High Bird
    if (type === 1) {
        return (
            <View style={{ width: 44, height: 34, alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                <View style={[styles.pixel, { width: 36, height: 24, backgroundColor: '#475569', bottom: 0, left: 0 }]} />
                <View style={[styles.pixel, { width: 28, height: 18, backgroundColor: '#64748B', bottom: 6, left: 4 }]} />
                <View style={[styles.pixel, { width: 20, height: 12, backgroundColor: '#94A3B8', bottom: 12, left: 8 }]} />
                <View style={[styles.pixel, { width: 8, height: 4, backgroundColor: '#CBD5E1', bottom: 20, left: 12 }]} />
                <View style={[styles.pixel, { width: 40, height: 3, backgroundColor: '#0F172A', bottom: -2, left: -2, opacity: 0.5 }]} />
            </View>
        );
    }
    
    if (type === 2) {
        return (
            <View style={{ width: 46, height: 58 }}>
                <View style={[styles.pixel, { width: 10, height: 58, backgroundColor: '#3E2723', bottom: 0, left: 18 }]} />
                <View style={[styles.pixel, { width: 6, height: 52, backgroundColor: '#4E342E', bottom: 0, left: 20 }]} />
                <View style={[styles.pixel, { width: 16, height: 6, backgroundColor: '#3E2723', bottom: 32, left: 4 }]} />
                <View style={[styles.pixel, { width: 6, height: 10, backgroundColor: '#3E2723', bottom: 36, left: 4 }]} />
                <View style={[styles.pixel, { width: 14, height: 6, backgroundColor: '#4E342E', bottom: 42, left: 26 }]} />
                <View style={[styles.pixel, { width: 6, height: 8, backgroundColor: '#4E342E', bottom: 46, left: 34 }]} />
                <View style={[styles.pixel, { width: 14, height: 3, backgroundColor: '#1B0000', bottom: -2, left: 16, opacity: 0.4 }]} />
            </View>
        );
    }

    if (type === 4) {
        return (
            <View style={{ width: 40, height: 32 }}>
                <View style={[styles.pixel, { width: 28, height: 22, backgroundColor: '#E2E8F0', bottom: 10, left: 4 }]} />
                <View style={[styles.pixel, { width: 22, height: 16, backgroundColor: '#F1F5F9', bottom: 14, left: 7 }]} />
                <View style={[styles.pixel, { width: 20, height: 8, backgroundColor: '#E2E8F0', bottom: 2, left: 14 }]} />
                <View style={[styles.pixel, { width: 8, height: 8, backgroundColor: '#090410', bottom: 18, left: 10 }]} />
                <View style={[styles.pixel, { width: 4, height: 4, backgroundColor: '#1E293B', bottom: 20, left: 12 }]} />
                <View style={[styles.pixel, { width: 4, height: 4, backgroundColor: '#090410', bottom: 14, left: 26 }]} />
                <View style={[styles.pixel, { width: 2, height: 4, backgroundColor: '#F8FAFC', bottom: 6, left: 18 }]} />
                <View style={[styles.pixel, { width: 2, height: 5, backgroundColor: '#F8FAFC', bottom: 5, left: 22 }]} />
                <View style={[styles.pixel, { width: 2, height: 4, backgroundColor: '#F8FAFC', bottom: 6, left: 26 }]} />
                <View style={[styles.pixel, { width: 2, height: 3, backgroundColor: '#F8FAFC', bottom: 7, left: 30 }]} />
                <View style={[styles.pixel, { width: 30, height: 3, backgroundColor: '#94A3B8', bottom: -2, left: 6, opacity: 0.3 }]} />
            </View>
        );
    }

    if (type === 5) {
        return (
            <View style={{ width: 38, height: 44 }}>
                <View style={[styles.pixel, { width: 6, height: 44, backgroundColor: '#5D4037', bottom: 0, left: 2 }]} />
                <View style={[styles.pixel, { width: 6, height: 30, backgroundColor: '#4E342E', bottom: 0, left: 28 }]} />
                <View style={[styles.pixel, { width: 30, height: 5, backgroundColor: '#795548', bottom: 30, left: 4 }]} />
                <View style={[styles.pixel, { width: 24, height: 5, backgroundColor: '#6D4C41', bottom: 18, left: 4 }]} />
                <View style={[styles.pixel, { width: 14, height: 4, backgroundColor: '#8D6E63', bottom: 14, left: 22, transform: [{ rotate: '25deg' }] }]} />
                <View style={[styles.pixel, { width: 2, height: 2, backgroundColor: '#9E9E9E', bottom: 32, left: 6 }]} />
                <View style={[styles.pixel, { width: 2, height: 2, backgroundColor: '#9E9E9E', bottom: 20, left: 6 }]} />
                <View style={[styles.pixel, { width: 34, height: 3, backgroundColor: '#3E2723', bottom: -2, left: 2, opacity: 0.4 }]} />
            </View>
        );
    }

    if (type === 6) {
        return (
            <View style={{ width: 36, height: 28 }}>
                <View style={[styles.pixel, { width: 36, height: 6, backgroundColor: '#374151', bottom: 0, left: 0 }]} />
                <View style={[styles.pixel, { width: 32, height: 3, backgroundColor: '#4B5563', bottom: 3, left: 2 }]} />
                <View style={[styles.pixel, { width: 4, height: 20, backgroundColor: '#9CA3AF', bottom: 6, left: 4 }]} />
                <View style={[styles.pixel, { width: 2, height: 18, backgroundColor: '#D1D5DB', bottom: 8, left: 5 }]} />
                <View style={[styles.pixel, { width: 4, height: 22, backgroundColor: '#9CA3AF', bottom: 6, left: 12 }]} />
                <View style={[styles.pixel, { width: 2, height: 20, backgroundColor: '#D1D5DB', bottom: 8, left: 13 }]} />
                <View style={[styles.pixel, { width: 4, height: 18, backgroundColor: '#9CA3AF', bottom: 6, left: 20 }]} />
                <View style={[styles.pixel, { width: 2, height: 16, backgroundColor: '#D1D5DB', bottom: 8, left: 21 }]} />
                <View style={[styles.pixel, { width: 4, height: 22, backgroundColor: '#9CA3AF', bottom: 6, left: 28 }]} />
                <View style={[styles.pixel, { width: 2, height: 20, backgroundColor: '#D1D5DB', bottom: 8, left: 29 }]} />
                <View style={[styles.pixel, { width: 3, height: 3, backgroundColor: '#991B1B', bottom: 14, left: 13, opacity: 0.6 }]} />
            </View>
        );
    }
    
    if (type === 7 || type === 9) {
        // Type 7 = Low Bird: flies close to the ground, player must JUMP over it
        // Type 9 = High Bird: flies high, player must DUCK underneath it
        const isHigh = type === 9;
        
        const wingStyle = useAnimatedStyle(() => {
            const frame = runFrameSV ? Math.floor(runFrameSV.value) % 2 : 0;
            return { transform: [{ translateY: frame === 0 ? -6 : 5 }] };
        });

        return (
            // The View's 'bottom' is handled by obsBottom in PooledObstacle position
            // so here we render just the bird art starting from bottom: 0
            <View style={{ width: 56, height: 36 }}>
                {/* Tail feathers */}
                <View style={[styles.pixel, { width: 6, height: 4, backgroundColor: '#475569', bottom: 12, left: 48 }]} />
                <View style={[styles.pixel, { width: 4, height: 6, backgroundColor: '#334155', bottom: 8, left: 52 }]} />

                {/* Body */}
                <View style={[styles.pixel, { width: 28, height: 14, backgroundColor: '#7C3AED', bottom: 10, left: 14 }]} />
                <View style={[styles.pixel, { width: 22, height: 10, backgroundColor: '#8B5CF6', bottom: 12, left: 18 }]} />
                {/* Belly highlight */}
                <View style={[styles.pixel, { width: 16, height: 6, backgroundColor: '#A78BFA', bottom: 10, left: 20 }]} />

                {/* Head */}
                <View style={[styles.pixel, { width: 16, height: 16, backgroundColor: '#7C3AED', bottom: 16, left: 2 }]} />
                <View style={[styles.pixel, { width: 12, height: 12, backgroundColor: '#8B5CF6', bottom: 18, left: 4 }]} />
                {/* Eye */}
                <View style={[styles.pixel, { width: 4, height: 4, backgroundColor: '#FBBF24', bottom: 24, left: 8 }]} />
                <View style={[styles.pixel, { width: 2, height: 2, backgroundColor: '#0F172A', bottom: 25, left: 9 }]} />
                <View style={[styles.pixel, { width: 1, height: 1, backgroundColor: '#FFFFFF', bottom: 27, left: 9 }]} />
                {/* Beak */}
                <View style={[styles.pixel, { width: 10, height: 4, backgroundColor: '#F59E0B', bottom: 18, left: -6 }]} />
                <View style={[styles.pixel, { width: 8, height: 3, backgroundColor: '#D97706', bottom: 15, left: -4 }]} />

                {/* Animated Wing - top wing flaps */}
                <Animated.View style={[wingStyle, { position: 'absolute', left: 14, bottom: 20, width: 32, height: 18 }]}>
                    <View style={[styles.pixel, { width: 32, height: 8, backgroundColor: '#6D28D9', bottom: 10, left: 0 }]} />
                    <View style={[styles.pixel, { width: 28, height: 6, backgroundColor: '#7C3AED', bottom: 6, left: 2 }]} />
                    <View style={[styles.pixel, { width: 24, height: 4, backgroundColor: '#8B5CF6', bottom: 2, left: 4 }]} />
                    <View style={[styles.pixel, { width: 18, height: 3, backgroundColor: '#A78BFA', bottom: 0, left: 6 }]} />
                </Animated.View>
            </View>
        );
    }

    if (type === 8) {
        return (
            <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'flex-end' }}>
                <View style={[styles.pixel, { width: 40, height: 20, backgroundColor: '#374151', bottom: 0 }]} />
                <View style={[styles.pixel, { width: 10, height: 10, backgroundColor: '#EF4444', bottom: 20 }]} /> 
            </View>
        );
    }
    
    // 3: Cactus
    return (
        <View style={{ width: 34, height: 48 }}>
            <View style={[styles.pixel, { width: 12, height: 48, backgroundColor: '#166534', bottom: 0, left: 11 }]} />
            <View style={[styles.pixel, { width: 8, height: 44, backgroundColor: '#22C55E', bottom: 0, left: 13 }]} />
            <View style={[styles.pixel, { width: 10, height: 8, backgroundColor: '#166534', bottom: 24, left: 1 }]} />
            <View style={[styles.pixel, { width: 8, height: 16, backgroundColor: '#166534', bottom: 28, left: 1 }]} />
            <View style={[styles.pixel, { width: 6, height: 12, backgroundColor: '#22C55E', bottom: 30, left: 2 }]} />
            <View style={[styles.pixel, { width: 10, height: 8, backgroundColor: '#166534', bottom: 16, left: 23 }]} />
            <View style={[styles.pixel, { width: 8, height: 14, backgroundColor: '#166534', bottom: 20, left: 24 }]} />
            <View style={[styles.pixel, { width: 6, height: 10, backgroundColor: '#22C55E', bottom: 22, left: 25 }]} />
            <View style={[styles.pixel, { width: 2, height: 2, backgroundColor: '#4ADE80', bottom: 36, left: 16 }]} />
            <View style={[styles.pixel, { width: 2, height: 2, backgroundColor: '#4ADE80', bottom: 20, left: 15 }]} />
        </View>
    );
};

const PooledObstacle = React.memo(({ slot, gameDistance, runFrameSV }: { slot: any, gameDistance: any, runFrameSV: any }) => {
    const style = useAnimatedStyle(() => ({
        opacity: slot.active.value,
        position: 'absolute',
        bottom: ROAD_HEIGHT,
        transform: [{ translateX: slot.active.value === 1 ? slot.absoluteX.value - gameDistance.value : -9999 }]
    }));
    return (
        <Animated.View style={style}>
            <ObstacleLayer type={1} slot={slot} runFrameSV={runFrameSV} />
            <ObstacleLayer type={2} slot={slot} runFrameSV={runFrameSV} />
            <ObstacleLayer type={3} slot={slot} runFrameSV={runFrameSV} />
            <ObstacleLayer type={4} slot={slot} runFrameSV={runFrameSV} />
            <ObstacleLayer type={5} slot={slot} runFrameSV={runFrameSV} />
            <ObstacleLayer type={6} slot={slot} runFrameSV={runFrameSV} />
            <ObstacleLayer type={7} slot={slot} runFrameSV={runFrameSV} />
            <ObstacleLayer type={8} slot={slot} runFrameSV={runFrameSV} />
            <ObstacleLayer type={9} slot={slot} runFrameSV={runFrameSV} />
        </Animated.View>
    );
});

const ObstacleLayer = ({ type, slot, runFrameSV }: { type: number, slot: any, runFrameSV: any }) => {
    const style = useAnimatedStyle(() => {
        const isActive = slot.type.value === type;
        // For bird types, use heightOffset to lift them off the ground
        const bOffset = (type === 7 || type === 9) ? slot.heightOffset.value : 0;
        return {
            opacity: isActive ? 1 : 0,
            position: 'absolute',
            bottom: bOffset,
            left: 0
        };
    });
    return (
        <Animated.View style={style} pointerEvents="none">
            <PremiumObstacle type={type} runFrameSV={runFrameSV} />
        </Animated.View>
    );
};

import { useEngine, DinoEngine } from '../src/engines';

export default function DinoJump() {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const GAME_WIDTH = windowWidth;
  const GAME_HEIGHT = windowHeight;

  const dinoY = useSharedValue(0);
  const velocity = useSharedValue(0);
  const gameDistance = useSharedValue(0);
  const runFrame = useSharedValue(0);
  const isDucking = useSharedValue(0);
  
  const [dinoEngineState, engine] = useEngine(() => new DinoEngine());
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const scoreRef = useRef(0);
  const gameOverRef = useRef(gameOver);
  const gameStartedRef = useRef(gameStarted);
  const isPausedRef = useRef(isPaused);
  const gameLoopRef = useRef<number | null>(null);

  // Obstacle pool — each SharedValue must be a top-level hook call
  const _a0=useSharedValue(0),_x0=useSharedValue(0),_t0=useSharedValue(1),_h0=useSharedValue(0);
  const _a1=useSharedValue(0),_x1=useSharedValue(0),_t1=useSharedValue(1),_h1=useSharedValue(0);
  const _a2=useSharedValue(0),_x2=useSharedValue(0),_t2=useSharedValue(1),_h2=useSharedValue(0);
  const _a3=useSharedValue(0),_x3=useSharedValue(0),_t3=useSharedValue(1),_h3=useSharedValue(0);
  const _a4=useSharedValue(0),_x4=useSharedValue(0),_t4=useSharedValue(1),_h4=useSharedValue(0);
  const _a5=useSharedValue(0),_x5=useSharedValue(0),_t5=useSharedValue(1),_h5=useSharedValue(0);
  const _a6=useSharedValue(0),_x6=useSharedValue(0),_t6=useSharedValue(1),_h6=useSharedValue(0);
  const _a7=useSharedValue(0),_x7=useSharedValue(0),_t7=useSharedValue(1),_h7=useSharedValue(0);
  const _a8=useSharedValue(0),_x8=useSharedValue(0),_t8=useSharedValue(1),_h8=useSharedValue(0);
  const _a9=useSharedValue(0),_x9=useSharedValue(0),_t9=useSharedValue(1),_h9=useSharedValue(0);
  const _a10=useSharedValue(0),_x10=useSharedValue(0),_t10=useSharedValue(1),_h10=useSharedValue(0);
  const _a11=useSharedValue(0),_x11=useSharedValue(0),_t11=useSharedValue(1),_h11=useSharedValue(0);
  const obsPool = useRef([
    {active:_a0,absoluteX:_x0,type:_t0,heightOffset:_h0},
    {active:_a1,absoluteX:_x1,type:_t1,heightOffset:_h1},
    {active:_a2,absoluteX:_x2,type:_t2,heightOffset:_h2},
    {active:_a3,absoluteX:_x3,type:_t3,heightOffset:_h3},
    {active:_a4,absoluteX:_x4,type:_t4,heightOffset:_h4},
    {active:_a5,absoluteX:_x5,type:_t5,heightOffset:_h5},
    {active:_a6,absoluteX:_x6,type:_t6,heightOffset:_h6},
    {active:_a7,absoluteX:_x7,type:_t7,heightOffset:_h7},
    {active:_a8,absoluteX:_x8,type:_t8,heightOffset:_h8},
    {active:_a9,absoluteX:_x9,type:_t9,heightOffset:_h9},
    {active:_a10,absoluteX:_x10,type:_t10,heightOffset:_h10},
    {active:_a11,absoluteX:_x11,type:_t11,heightOffset:_h11},
  ]).current;

  useEffect(() => {
    gameOverRef.current = gameOver;
    gameStartedRef.current = gameStarted;
    isPausedRef.current = isPaused;
  }, [gameOver, gameStarted, isPaused]);

  useEffect(() => {
    AsyncStorage.getItem('dino_hs').then(v => v && setHighScore(parseInt(v)));
  }, []);

  const jump = () => {
    if (gameOverRef.current) return;
    if (isPausedRef.current) { setIsPaused(false); return; }
    if (!gameStartedRef.current) {
        gameStartedRef.current = true;
        setGameStarted(true);
        scoreRef.current = 0;
        setScore(0);
        gameDistance.value = 0;
        obsPool.forEach(obs => obs.active.value = 0);
        tapLight();
    }
    if (dinoY.value === 0) {
        tapLight();
        velocity.value = JUMP_VELOCITY;
    }
  };

  const duck = (isDown: boolean) => {
      if (gameOverRef.current || !gameStartedRef.current) return;
      isDucking.value = isDown ? 1 : 0;
      if (isDown && dinoY.value < 0) {
          velocity.value += 12;
      }
  };

  const gameLoop = () => {
    if (gameOverRef.current || !gameStartedRef.current || isPausedRef.current) {
        if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        return;
    }

    let newY = dinoY.value + velocity.value;
    let newVel = velocity.value + GRAVITY;
    if (newY >= 0) { newY = 0; newVel = 0; }
    dinoY.value = newY;
    velocity.value = newVel;

    const currentSpeed = Math.min(MAX_SPEED, BASE_SPEED + Math.sqrt(scoreRef.current / 80) * SPEED_RAMP);
    gameDistance.value += currentSpeed;
    
    // Smooth frame calculation based on continuous distance division
    const frameSpeedRatio = Math.max(12, 40 - currentSpeed * 2);
    runFrame.value = Math.floor(gameDistance.value / frameSpeedRatio) % 4;

    let maxObsX = 0;
    let hasActive = false;
    let collision = false;
    
    const dY = dinoY.value;
    // Only use ducking hitbox if the dinosaur is visually crouching (i.e., on the ground)
    const ducking = isDucking.value === 1 && Math.abs(dY) < 0.5;
    const dinoHitbox = {
        left: 50 + 6,
        right: 50 + (70 * 0.8) - 10,
        top: dY - (ducking ? 20 : (64 * 0.8)) + 6,
        bottom: dY - 4
    };

    // 1. Check existing obstacles & collisions
    for (let i = 0; i < obsPool.length; i++) {
        const obs = obsPool[i];
        if (obs.active.value === 1) {
            const currentX = obs.absoluteX.value - gameDistance.value;
            
            if (currentX < -150) {
                obs.active.value = 0;
            } else {
                hasActive = true;
                if (obs.absoluteX.value > maxObsX) {
                    maxObsX = obs.absoluteX.value;
                }

                const type = obs.type.value;
                const OBS_DIMS: Record<number, [number, number]> = { 
                    1: [44*0.8, 34*0.8], 
                    2: [46*0.8, 58*0.8], 
                    3: [34*0.8, 48*0.8], 
                    4: [40*0.8, 32*0.8], 
                    5: [38*0.8, 44*0.8], 
                    6: [36*0.8, 28*0.8], 
                    7: [44*0.8, 24*0.8], 
                    8: [40*0.8, 40*0.8],
                    9: [44*0.8, 24*0.8] 
                };
                const [obsWidth, obsHeight] = OBS_DIMS[type] || [30*0.8, 30*0.8];
                // obsBottom = how many pixels above the ground floor the obstacle starts
                // Type 7 (Low Bird): sits just above ground — must JUMP over
                // Type 9 (High Bird): sits 52px above ground — must DUCK under (ducking dino is ~22px tall)
                const obsBottom = type === 9 ? 52 : (type === 7 ? 4 : 0);

                const obsHitbox = {
                    left: currentX + 5,
                    right: currentX + obsWidth - 5,
                    // top and bottom are in the same coord as dinoHitbox:
                    // negative values = above ground. 0 = ground level.
                    top: -(obsHeight + obsBottom) + 5,
                    bottom: -obsBottom + 5
                };

                if (dinoHitbox.right > obsHitbox.left && 
                    dinoHitbox.left < obsHitbox.right && 
                    dinoHitbox.bottom > obsHitbox.top && 
                    dinoHitbox.top < obsHitbox.bottom) {
                    collision = true;
                    break;
                }
            }
        }
    }

    if (collision) {
        handleGameOver();
        return;
    }

    // 2. Deadlock-free Spawning Logic
    const minGap = 250 + (currentSpeed * 12);
    const maxGap = minGap + 150 + (currentSpeed * 5);
    const dynamicGap = minGap + Math.random() * (maxGap - minGap);
    
    // Spawn obstacle safely off-screen to avoid popping/flickering
    const spawnThresholdX = gameDistance.value + windowWidth + 150;

    if (!hasActive || (spawnThresholdX - maxObsX > dynamicGap)) {
        const slot = obsPool.find(s => s.active.value === 0);
        if (slot) {
            slot.active.value = 1;
            slot.absoluteX.value = spawnThresholdX + 20;
            
            const rand = Math.random();
            let type = 1;
            if (rand > 0.95) type = 8;
            else if (rand > 0.88) type = 4;
            else if (rand > 0.80) type = 9; // High Bird (duck)
            else if (rand > 0.70) type = 7; // Low Bird (jump)
            else if (rand > 0.55) type = 5;
            else if (rand > 0.40) type = 6;
            else if (rand > 0.20) type = 3;
            else if (rand > 0.10) type = 2;
            else type = 1;
            
            slot.type.value = type;
            // Set height offset for birds so they render at correct elevation
            slot.heightOffset.value = type === 9 ? 52 : (type === 7 ? 4 : 0);
        }
    }

    scoreRef.current += 1;
    if (scoreRef.current % 5 === 0) setScore(scoreRef.current);
    
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
    dinoY.value = 0;
    velocity.value = 0;
    gameDistance.value = 0;
    runFrame.value = 0;
    isDucking.value = 0;
    obsPool.forEach(obs => obs.active.value = 0);
    
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    gameStartedRef.current = true;
    setGameStarted(true);
    setIsPaused(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      const key = e.key;
      const isGameKey = [' ', 'ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S', 'Enter'].includes(key);
      if (!isGameKey) return;

      e.preventDefault();
      e.stopPropagation();

      if (key === 'Enter') {
        if (gameOverRef.current) {
          restart();
        } else if (!gameStartedRef.current) {
          gameStartedRef.current = true;
          setGameStarted(true);
          setScore(0);
          gameDistance.value = 0;
          tapLight();
        } else {
          setIsPaused(p => !p);
        }
        return;
      }

      if (key === ' ' || key === 'ArrowUp' || key === 'w' || key === 'W') {
        e.preventDefault();
        if (gameOverRef.current) return;
        if (isPausedRef.current) { setIsPaused(false); return; }
        if (!gameStartedRef.current) {
          gameStartedRef.current = true;
          setGameStarted(true);
          setScore(0);
          gameDistance.value = 0;
        }
        if (dinoY.value === 0) {
          tapLight();
          velocity.value = JUMP_VELOCITY;
        }
        return;
      }
      if (key === 'ArrowDown' || key === 's' || key === 'S') {
        e.preventDefault();
        if (gameOverRef.current || !gameStartedRef.current || isPausedRef.current) return;
        duck(true);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        duck(false);
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, []); 

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
          // Allow buttons to be pressed by checking if the tap is high up
          return evt.nativeEvent.pageY > 150;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
          return Math.abs(gestureState.dy) > 5 || Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: (evt, gestureState) => {
         jump();
      },
      onPanResponderMove: (evt, gestureState) => {
         if (gestureState.dy > 20) duck(true);
      },
      onPanResponderRelease: (evt, gestureState) => {
         duck(false);
      }
    })
  ).current;

  const dinoContainerStyle = useAnimatedStyle(() => ({
      position: 'absolute',
      left: 50,
      bottom: ROAD_HEIGHT,
      zIndex: 10,
      width: 70,
      height: 64,   // Fixed height = standing dino. Sprites anchor to bottom: 0 inside.
      transform: [{ translateY: dinoY.value }]
  }));

  return (
    <View style={styles.root}>
        <CyberBackground scrollOffset={useSharedValue(0)} autoScroll />
        
        <View style={[styles.gameArea, { ...StyleSheet.absoluteFillObject }]} {...panResponder.panHandlers}>
            <Animated.View style={dinoContainerStyle}>
                <PremiumRex isDuckingSV={isDucking} runFrameSV={runFrame} yOffsetSV={dinoY} score={score} />
            </Animated.View>

            {obsPool.map((slot, i) => (
                <PooledObstacle key={i} slot={slot} gameDistance={gameDistance} runFrameSV={runFrame} />
            ))}

            <DinoGround gameDistance={gameDistance} windowWidth={GAME_WIDTH} />
        </View>

        <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents="box-none">
            <GameHeader
                title="DINO JUMP"
                score={score}
                highScore={highScore}
                accentColor={ACCENT}
                onBack={() => { setGameOver(true); router.replace('/'); }}
            />

            <View style={styles.controlBar}>
                <TouchableOpacity 
                    style={[styles.controlBtn, (!gameStarted || isPaused) ? { backgroundColor: ACCENT } : styles.glassCard]} 
                    onPress={(!gameStarted || isPaused) ? jump : undefined}
                >
                    <MaterialCommunityIcons name="play" size={20} color={(!gameStarted || isPaused) ? Colors.bg.primary : ACCENT} />
                    <Text style={[styles.controlBtnText, { color: (!gameStarted || isPaused) ? Colors.bg.primary : ACCENT }]}>
                        START
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.controlBtn, styles.glassCard, (!gameStarted || isPaused) && { opacity: 0.5 }]} 
                    onPress={gameStarted && !isPaused ? () => setIsPaused(true) : undefined}
                >
                    <MaterialCommunityIcons name="pause" size={20} color={ACCENT} />
                    <Text style={[styles.controlBtnText, { color: ACCENT }]}>PAUSE</Text>
                </TouchableOpacity>
            </View>

            {/* Overlays */}
            {!gameStarted && !gameOver && (
                <View style={[StyleSheet.absoluteFill, styles.overlayCenter]} pointerEvents="none">
                    <Text style={styles.messageText}>PRESS ENTER TO START</Text>
                </View>
            )}
            
            {isPaused && (
                <View style={[StyleSheet.absoluteFill, styles.overlayCenter]} pointerEvents="none">
                    <Text style={styles.messageText}>PAUSED</Text>
                </View>
            )}

            <GameOverModal
                visible={gameOver}
                title="EXTINCTION"
                score={score}
                highScore={highScore}
                isNewHighScore={score >= highScore && score > 0}
                accentColor={ACCENT}
                onRestart={restart}
                onHome={() => router.replace('/')}
            />
        </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg.primary },
  safe: { flex: 1, zIndex: 20 },
  gameArea: {
      overflow: 'hidden',
      position: 'absolute',
      zIndex: 10,
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
  roadContainer: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: ROAD_HEIGHT,
      backgroundColor: 'transparent',
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
  controlBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing[4],
      paddingBottom: Spacing[3],
      gap: Spacing[3],
      zIndex: 50,
  },
  glassCard: {
      backgroundColor: 'rgba(9, 4, 16, 0.6)',
      borderWidth: 2,
      borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  controlBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing[5],
      paddingVertical: Spacing[2],
      borderRadius: Radius.full,
      gap: Spacing[2],
  },
  controlBtnText: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.xs,
  },
  overlayCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
  },
  messageText: {
      fontFamily: Fonts.heading,
      fontSize: FontSize.lg,
      color: Colors.white,
      textShadowColor: ACCENT,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
  }
});