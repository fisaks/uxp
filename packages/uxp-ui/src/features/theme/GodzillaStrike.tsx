import React, { useEffect, useMemo, useState } from "react";
import * as styles from "./GodzillaStrike.module.css";

const PARTICLE_COUNT = 15;
const ROAR_DURATION = 2.5; // seconds
const BEAM_DURATION = 12; // seconds — matches CSS beamBreath animation
const PAUSE_DURATION = 10; // seconds of quiet between attacks

/**
 * Synthesizes a Godzilla roar using Web Audio API.
 *
 * The iconic roar (originally made by rubbing a resin glove on contrabass strings)
 * has a distinctive "SKREEEONK" shape: sharp attack → pitch rises → bends down
 * with metallic resonance and dissonant harmonics throughout.
 *
 * Layers:
 *  1. Primary screech  — FM-modulated sawtooth, rises then bends down
 *  2. Metallic resonance — high-Q resonant filter on noise, tracks the screech
 *  3. Dissonant harmonics — detuned oscillators for that "chord of pain" quality
 *  4. Sub rumble — chest-shaking low end that swells in
 *  5. Breathy texture — filtered noise for air/breath
 *  6. Attack transient — short burst for the initial "SKR-" bite
 */
function playGodzillaRoar() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = ROAR_DURATION;

    // ── Master output ──
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0, now);
    master.gain.linearRampToValueAtTime(0.35, now + 0.08); // fast attack
    master.gain.setValueAtTime(0.35, now + 0.5);
    master.gain.linearRampToValueAtTime(0.30, now + dur * 0.7);
    master.gain.exponentialRampToValueAtTime(0.001, now + dur);
    master.connect(ctx.destination);

    // ── Distortion (warm, not buzzy) ──
    const distortion = ctx.createWaveShaper();
    const samples = 512;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        // Soft-clip with asymmetry for organic character
        curve[i] = Math.tanh(x * 2.5) * 0.8 + Math.tanh(x * 8) * 0.2;
    }
    distortion.curve = curve;
    distortion.oversample = "4x";
    distortion.connect(master);

    // ── 1. Primary screech — the "SKREEEONK" pitch contour ──
    // Rises fast to peak, holds briefly, then bends down — the signature shape
    const screech = ctx.createOscillator();
    screech.type = "sawtooth";
    screech.frequency.setValueAtTime(350, now);          // starts mid-range
    screech.frequency.exponentialRampToValueAtTime(950, now + 0.15);  // "SKREE-" rise
    screech.frequency.setValueAtTime(950, now + 0.25);   // hold at peak
    screech.frequency.exponentialRampToValueAtTime(600, now + 0.8);   // "-EONK" bend down
    screech.frequency.exponentialRampToValueAtTime(250, now + dur * 0.7);
    screech.frequency.exponentialRampToValueAtTime(120, now + dur);   // trail off low

    // FM modulation — adds the metallic, scraping quality (like resin on strings)
    const fmMod = ctx.createOscillator();
    fmMod.frequency.setValueAtTime(140, now);
    fmMod.frequency.linearRampToValueAtTime(80, now + dur);
    const fmGain = ctx.createGain();
    fmGain.gain.setValueAtTime(180, now);        // modulation depth in Hz
    fmGain.gain.linearRampToValueAtTime(60, now + dur);
    fmMod.connect(fmGain).connect(screech.frequency);
    fmMod.start(now);
    fmMod.stop(now + dur);

    const screechGain = ctx.createGain();
    screechGain.gain.setValueAtTime(0.35, now);
    screechGain.gain.linearRampToValueAtTime(0.25, now + dur * 0.6);
    screechGain.gain.exponentialRampToValueAtTime(0.01, now + dur);
    screech.connect(screechGain).connect(distortion);
    screech.start(now);
    screech.stop(now + dur);

    // ── 2. Metallic resonance — resonant-filtered noise tracking the screech ──
    const metalBuffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const metalData = metalBuffer.getChannelData(0);
    for (let i = 0; i < metalData.length; i++) {
        metalData[i] = Math.random() * 2 - 1;
    }
    const metalNoise = ctx.createBufferSource();
    metalNoise.buffer = metalBuffer;
    const metalFilter = ctx.createBiquadFilter();
    metalFilter.type = "bandpass";
    metalFilter.Q.value = 12; // very resonant — rings like a metal string
    metalFilter.frequency.setValueAtTime(700, now);
    metalFilter.frequency.exponentialRampToValueAtTime(1900, now + 0.15);
    metalFilter.frequency.exponentialRampToValueAtTime(1200, now + 0.8);
    metalFilter.frequency.exponentialRampToValueAtTime(400, now + dur);
    const metalGain = ctx.createGain();
    metalGain.gain.setValueAtTime(0.2, now);
    metalGain.gain.linearRampToValueAtTime(0.35, now + 0.2);
    metalGain.gain.exponentialRampToValueAtTime(0.01, now + dur);
    metalNoise.connect(metalFilter).connect(metalGain).connect(distortion);
    metalNoise.start(now);
    metalNoise.stop(now + dur);

    // ── 3. Dissonant harmonics — detuned tones for that unsettling "chord" ──
    const dissonantFreqs = [1.47, 2.1, 3.3]; // non-integer ratios = dissonance
    dissonantFreqs.forEach((ratio, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? "sawtooth" : "square";
        osc.frequency.setValueAtTime(350 * ratio, now);
        osc.frequency.exponentialRampToValueAtTime(950 * ratio, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(600 * ratio, now + 0.8);
        osc.frequency.exponentialRampToValueAtTime(120 * ratio, now + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.06 - idx * 0.015, now); // each quieter
        g.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.8);
        osc.connect(g).connect(distortion);
        osc.start(now);
        osc.stop(now + dur);
    });

    // ── 4. Sub rumble — the chest shake ──
    const rumble = ctx.createOscillator();
    rumble.type = "triangle"; // cleaner sub than sawtooth
    rumble.frequency.setValueAtTime(45, now);
    rumble.frequency.linearRampToValueAtTime(30, now + dur);
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(0.45, now + 0.4);
    rumbleGain.gain.setValueAtTime(0.45, now + dur * 0.5);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    rumble.connect(rumbleGain).connect(master); // bypasses distortion
    rumble.start(now);
    rumble.stop(now + dur);

    // ── 5. Breathy noise — filtered air/breath texture ──
    const breathBuffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const breathData = breathBuffer.getChannelData(0);
    for (let i = 0; i < breathData.length; i++) {
        breathData[i] = Math.random() * 2 - 1;
    }
    const breath = ctx.createBufferSource();
    breath.buffer = breathBuffer;
    const breathLP = ctx.createBiquadFilter();
    breathLP.type = "lowpass";
    breathLP.frequency.setValueAtTime(2000, now);
    breathLP.frequency.exponentialRampToValueAtTime(500, now + dur);
    const breathGain = ctx.createGain();
    breathGain.gain.setValueAtTime(0.08, now);
    breathGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    breath.connect(breathLP).connect(breathGain).connect(master);
    breath.start(now);
    breath.stop(now + dur);

    // ── 6. Attack transient — sharp "SKR" bite at the start ──
    const attackBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const attackData = attackBuffer.getChannelData(0);
    for (let i = 0; i < attackData.length; i++) {
        attackData[i] = Math.random() * 2 - 1;
    }
    const attack = ctx.createBufferSource();
    attack.buffer = attackBuffer;
    const attackFilter = ctx.createBiquadFilter();
    attackFilter.type = "highpass";
    attackFilter.frequency.value = 1500;
    attackFilter.Q.value = 5;
    const attackGain = ctx.createGain();
    attackGain.gain.setValueAtTime(0.5, now);
    attackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    attack.connect(attackFilter).connect(attackGain).connect(master);
    attack.start(now);
    attack.stop(now + 0.12);

    setTimeout(() => ctx.close(), (dur + 0.5) * 1000);
}

/** Pre-generate stable random values so particles don't re-randomize on render */
function generateParticles() {
    return [...Array(PARTICLE_COUNT)].map(() => ({
        left: 35 + Math.random() * 30, // clustered around center near the beam
        duration: 4 + Math.random() * 5,
        delay: Math.random() * -8,
        size: 3 + Math.random() * 8,
        drift: -30 + Math.random() * 60,
        glow: Math.random() > 0.5,
    }));
}

const GodzillaStrike: React.FC = () => {
    const [cycle, setCycle] = useState(0);
    const [phase, setPhase] = useState<"glow" | "breath" | "ending" | "idle">("idle");
    const particles = useMemo(generateParticles, []);

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        const DELAY = 1.5; // seconds before the roar starts
        const offset = DELAY * 1000;

        timers.push(setTimeout(() => {
            setPhase("glow");
            playGodzillaRoar();
        }, offset));

        timers.push(setTimeout(() => {
            setPhase("breath");
        }, offset + ROAR_DURATION * 1000));

        timers.push(setTimeout(() => {
            setPhase("ending");
        }, offset + ROAR_DURATION * 1000 + BEAM_DURATION * 0.8 * 1000));

        timers.push(setTimeout(() => {
            setPhase("idle");
        }, offset + ROAR_DURATION * 1000 + BEAM_DURATION * 1000 + 500));

        // After a pause, restart the whole cycle
        timers.push(setTimeout(() => {
            setPhase("glow");
            setCycle(c => c + 1);
        }, offset + ROAR_DURATION * 1000 + BEAM_DURATION * 1000 + PAUSE_DURATION * 1000));

        return () => timers.forEach(clearTimeout);
    }, [cycle]);

    const showBeam = phase === "breath" || phase === "ending";
    const showParticles = phase === "breath";

    const flashClass = [
        styles.flash,
        phase === "glow" ? styles.flashCharging : "",
        phase === "ending" || phase === "idle" ? styles.flashEnding : "",
    ].filter(Boolean).join(" ");

    return (
        <>
            {/* Ambient glow */}
            {phase !== "idle" && <div className={flashClass} />}

            {/* Single atomic breath beam — key on cycle to reset CSS animation */}
            {showBeam && <div key={`beam-${cycle}`} className={styles.beam} />}

            {/* Energy particles */}
            {showParticles &&
                particles.map((p, i) => (
                    <div
                        key={`particle-${cycle}-${i}`}
                        className={`${styles.particle} ${p.glow ? styles.particleGlow : ""}`}
                        style={{
                            left: `${p.left}%`,
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            animationDuration: `${p.duration}s`,
                            animationDelay: `${p.delay}s`,
                            ["--drift" as string]: `${p.drift}px`,
                        }}
                    />
                ))}
        </>
    );
};

export default GodzillaStrike;
