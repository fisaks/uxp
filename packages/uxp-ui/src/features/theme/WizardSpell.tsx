import React, { useEffect, useMemo, useState, useCallback } from "react";
import * as styles from "./WizardSpell.module.css";

const FIREFLY_COUNT = 12;
const STARS_PER_BURST = 6;
const SPELL_INTERVAL = 8; // seconds between spell bursts

/**
 * Synthesizes a wizard spell casting sound using Web Audio API.
 * Ascending crystalline chime arpeggio with ethereal shimmer.
 */
function playSpellSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.2, now);
    master.connect(ctx.destination);

    // Reverb-like delay for ethereal quality
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.15;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const delayFilter = ctx.createBiquadFilter();
    delayFilter.type = "lowpass";
    delayFilter.frequency.value = 3000;
    delay.connect(delayFilter).connect(feedback).connect(delay);
    delay.connect(master);

    // Ascending chime arpeggio — pentatonic notes
    const notes = [523, 659, 784, 988, 1175, 1318]; // C5 E5 G5 B5 D6 E6
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;

        // Slight detune for shimmer
        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.value = freq * 1.003;

        const noteGain = ctx.createGain();
        const start = now + i * 0.12;
        noteGain.gain.setValueAtTime(0, start);
        noteGain.gain.linearRampToValueAtTime(0.15 - i * 0.015, start + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);

        osc.connect(noteGain);
        osc2.connect(noteGain);
        noteGain.connect(master);
        noteGain.connect(delay);

        osc.start(start);
        osc.stop(start + 0.8);
        osc2.start(start);
        osc2.stop(start + 0.8);
    });

    // Shimmer pad — high breathy texture
    const shimmerBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const shimmerData = shimmerBuffer.getChannelData(0);
    for (let i = 0; i < shimmerData.length; i++) {
        shimmerData[i] = Math.random() * 2 - 1;
    }
    const shimmer = ctx.createBufferSource();
    shimmer.buffer = shimmerBuffer;
    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = "bandpass";
    shimmerFilter.frequency.setValueAtTime(4000, now);
    shimmerFilter.frequency.exponentialRampToValueAtTime(2000, now + 2);
    shimmerFilter.Q.value = 5;
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.setValueAtTime(0, now);
    shimmerGain.gain.linearRampToValueAtTime(0.06, now + 0.3);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
    shimmer.connect(shimmerFilter).connect(shimmerGain).connect(master);
    shimmer.start(now);
    shimmer.stop(now + 2);

    // Deep mystical hum underneath
    const hum = ctx.createOscillator();
    hum.type = "triangle";
    hum.frequency.value = 130; // C3
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0, now);
    humGain.gain.linearRampToValueAtTime(0.08, now + 0.2);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    hum.connect(humGain).connect(master);
    hum.start(now);
    hum.stop(now + 1.8);

    setTimeout(() => ctx.close(), 3000);
}

type ShootingStar = {
    id: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    duration: number;
    rotation: number;
};

function generateFireflies() {
    return [...Array(FIREFLY_COUNT)].map((_, i) => ({
        left: 5 + Math.random() * 90,
        top: 5 + Math.random() * 90,
        size: 4 + Math.random() * 8,
        duration: 6 + Math.random() * 8,
        delay: Math.random() * -6,
        brightness: 0.4 + Math.random() * 0.6,
        fx1: (-30 + Math.random() * 60) + "px",
        fy1: (-30 + Math.random() * 60) + "px",
        fx2: (-30 + Math.random() * 60) + "px",
        fy2: (-30 + Math.random() * 60) + "px",
        fx3: (-30 + Math.random() * 60) + "px",
        fy3: (-30 + Math.random() * 60) + "px",
        variant: i % 3 === 0 ? "gold" : "purple",
    }));
}

function generateStarBurst(): ShootingStar[] {
    // Random origin point for the burst
    const originX = 20 + Math.random() * 60; // % from left
    const originY = 20 + Math.random() * 60; // % from top

    return [...Array(STARS_PER_BURST)].map((_, i) => {
        const angle = (i / STARS_PER_BURST) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
        const distance = 200 + Math.random() * 400;
        return {
            id: Date.now() + i,
            x: originX,
            y: originY,
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance,
            duration: 0.8 + Math.random() * 0.6,
            rotation: angle * (180 / Math.PI),
        };
    });
}

const WizardSpell: React.FC<{ silent?: boolean }> = ({ silent }) => {
    const fireflies = useMemo(generateFireflies, []);
    const [stars, setStars] = useState<ShootingStar[]>([]);
    const [burstOrigin, setBurstOrigin] = useState<{ x: number; y: number } | null>(null);

    const castSpell = useCallback(() => {
        if (!silent) playSpellSound();
        const burst = generateStarBurst();
        setBurstOrigin({ x: burst[0].x, y: burst[0].y });
        // Stars appear slightly after the sound starts
        setTimeout(() => {
            setStars(burst);
        }, 300);
        // Clear stars after they finish
        setTimeout(() => {
            setStars([]);
            setBurstOrigin(null);
        }, 2000);
    }, []);

    useEffect(() => {
        // Initial spell on mount
        castSpell();

        // Recurring spells
        const interval = setInterval(castSpell, SPELL_INTERVAL * 1000);
        return () => clearInterval(interval);
    }, [castSpell]);

    return (
        <>
            {/* Ambient arcane glow */}
            <div className={styles.ambientGlow} />

            {/* Spell burst flash at origin */}
            {burstOrigin && (
                <div
                    key={`burst-${burstOrigin.x}-${burstOrigin.y}`}
                    className={styles.spellBurst}
                    style={{
                        left: `calc(${burstOrigin.x}% - 100px)`,
                        top: `calc(${burstOrigin.y}% - 100px)`,
                    }}
                />
            )}

            {/* Shooting stars radiating from burst point */}
            {stars.map((star) => (
                <div
                    key={star.id}
                    className={styles.star}
                    style={{
                        left: `${star.x}%`,
                        top: `${star.y}%`,
                        ["--dx" as string]: `${star.dx}px`,
                        ["--dy" as string]: `${star.dy}px`,
                        animationDuration: `${star.duration}s`,
                        rotate: `${star.rotation}deg`,
                    }}
                />
            ))}

            {/* Floating fireflies — always present */}
            {fireflies.map((f, i) => (
                <div
                    key={`firefly-${i}`}
                    className={`${styles.firefly} ${f.variant === "gold" ? styles.fireflyGold : styles.fireflyPurple}`}
                    style={{
                        left: `${f.left}%`,
                        top: `${f.top}%`,
                        width: `${f.size}px`,
                        height: `${f.size}px`,
                        animationDuration: `${f.duration}s`,
                        animationDelay: `${f.delay}s`,
                        ["--brightness" as string]: f.brightness,
                        ["--fx1" as string]: f.fx1,
                        ["--fy1" as string]: f.fy1,
                        ["--fx2" as string]: f.fx2,
                        ["--fy2" as string]: f.fy2,
                        ["--fx3" as string]: f.fx3,
                        ["--fy3" as string]: f.fy3,
                    }}
                />
            ))}
        </>
    );
};

export default WizardSpell;
