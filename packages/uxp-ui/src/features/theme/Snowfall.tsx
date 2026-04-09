import React, { useEffect, useMemo, useState, useRef } from "react";
import * as styles from "./Snowfall.module.css";

const SNOWFLAKE_COUNT = 50;

type WinterEvent = "frost" | "eyes" | "aurora" | "mist" | "howl" | "gust" | "ice_crack";
const ALL_EVENTS: WinterEvent[] = ["frost", "eyes", "aurora", "mist", "howl", "gust", "ice_crack"];

/* ══════════════════════════════════════════
   SOUND GENERATORS
   ══════════════════════════════════════════ */

/** Constant howling wind — base layer */
function createWindLoop(): { stop: () => void } {
    const ctx = new AudioContext();
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    // Bandpass for wind character
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 400;
    bp.Q.value = 1.5;

    // Slow LFO to modulate the filter — wind gusts
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 200;
    lfo.connect(lfoGain).connect(bp.frequency);
    lfo.start();

    const gain = ctx.createGain();
    gain.gain.value = 0.06;

    source.connect(bp).connect(gain).connect(ctx.destination);
    source.start();

    return {
        stop: () => {
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
            setTimeout(() => { source.stop(); ctx.close(); }, 1500);
        },
    };
}

/** Wolf howl — triangle wave (warm, not ghostly) + breath noise for texture */
function playWolfHowl() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 4;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.18, now);
    master.connect(ctx.destination);

    // Distance reverb
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.3;
    const fb = ctx.createGain();
    fb.gain.value = 0.2;
    const delayLP = ctx.createBiquadFilter();
    delayLP.type = "lowpass";
    delayLP.frequency.value = 600;
    delay.connect(delayLP).connect(fb).connect(delay);
    delay.connect(master);

    // Main howl — triangle is warmer than sine, less harsh than sawtooth
    const howl = ctx.createOscillator();
    howl.type = "triangle";
    howl.frequency.setValueAtTime(180, now);
    howl.frequency.exponentialRampToValueAtTime(380, now + 1.2);
    howl.frequency.setValueAtTime(380, now + 2);
    howl.frequency.exponentialRampToValueAtTime(300, now + 3);
    howl.frequency.exponentialRampToValueAtTime(150, now + dur);

    // Lowpass to keep it muffled / distant
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(500, now);
    lp.frequency.exponentialRampToValueAtTime(900, now + 1.2);
    lp.frequency.exponentialRampToValueAtTime(400, now + dur);
    lp.Q.value = 1.5;

    const howlGain = ctx.createGain();
    howlGain.gain.setValueAtTime(0, now);
    howlGain.gain.linearRampToValueAtTime(0.3, now + 0.7);
    howlGain.gain.setValueAtTime(0.3, now + 2);
    howlGain.gain.linearRampToValueAtTime(0.2, now + 3);
    howlGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    // Vibrato — slow, kicks in after onset
    const vib = ctx.createOscillator();
    vib.frequency.value = 4.5;
    const vibGain = ctx.createGain();
    vibGain.gain.setValueAtTime(0, now);
    vibGain.gain.linearRampToValueAtTime(10, now + 1.2);
    vibGain.gain.linearRampToValueAtTime(6, now + dur);
    vib.connect(vibGain).connect(howl.frequency);
    vib.start(now);
    vib.stop(now + dur);

    howl.connect(lp).connect(howlGain).connect(master);
    howl.connect(lp).connect(howlGain).connect(delay);
    howl.start(now);
    howl.stop(now + dur);

    // Breath noise — adds organic air texture
    const breathBuffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const breathData = breathBuffer.getChannelData(0);
    for (let i = 0; i < breathData.length; i++) {
        breathData[i] = Math.random() * 2 - 1;
    }
    const breath = ctx.createBufferSource();
    breath.buffer = breathBuffer;
    const breathBP = ctx.createBiquadFilter();
    breathBP.type = "bandpass";
    breathBP.frequency.setValueAtTime(250, now);
    breathBP.frequency.exponentialRampToValueAtTime(500, now + 1.2);
    breathBP.frequency.exponentialRampToValueAtTime(200, now + dur);
    breathBP.Q.value = 2;
    const breathGain = ctx.createGain();
    breathGain.gain.setValueAtTime(0, now);
    breathGain.gain.linearRampToValueAtTime(0.1, now + 0.5);
    breathGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    breath.connect(breathBP).connect(breathGain).connect(master);
    breath.start(now);
    breath.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Ice crack — sharp snap with long echo across frozen landscape */
function playIceCrack() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.25, now);
    master.connect(ctx.destination);

    // Echo delay chain — bounces across the ice
    const echo1 = ctx.createDelay();
    echo1.delayTime.value = 0.4;
    const echo1Gain = ctx.createGain();
    echo1Gain.gain.value = 0.5;
    const echo1LP = ctx.createBiquadFilter();
    echo1LP.type = "lowpass";
    echo1LP.frequency.value = 3000;

    const echo2 = ctx.createDelay();
    echo2.delayTime.value = 0.7;
    const echo2Gain = ctx.createGain();
    echo2Gain.gain.value = 0.3;
    const echo2LP = ctx.createBiquadFilter();
    echo2LP.type = "lowpass";
    echo2LP.frequency.value = 2000;

    const echo3 = ctx.createDelay();
    echo3.delayTime.value = 1.2;
    const echo3Gain = ctx.createGain();
    echo3Gain.gain.value = 0.15;
    const echo3LP = ctx.createBiquadFilter();
    echo3LP.type = "lowpass";
    echo3LP.frequency.value = 1200;

    // Wire echoes — each progressively darker
    const dryBus = ctx.createGain();
    dryBus.gain.value = 1;
    dryBus.connect(master);
    dryBus.connect(echo1).connect(echo1LP).connect(echo1Gain).connect(master);
    dryBus.connect(echo2).connect(echo2LP).connect(echo2Gain).connect(master);
    dryBus.connect(echo3).connect(echo3LP).connect(echo3Gain).connect(master);

    // Sharp initial crack — short noise burst
    const crackBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const crackData = crackBuffer.getChannelData(0);
    for (let i = 0; i < crackData.length; i++) {
        crackData[i] = Math.random() * 2 - 1;
    }
    const crack = ctx.createBufferSource();
    crack.buffer = crackBuffer;
    const crackFilter = ctx.createBiquadFilter();
    crackFilter.type = "highpass";
    crackFilter.frequency.value = 2000;
    crackFilter.Q.value = 8;
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.6, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    crack.connect(crackFilter).connect(crackGain).connect(dryBus);
    crack.start(now);
    crack.stop(now + 0.1);

    // Resonant ring-out — ice reverberating
    const ring = ctx.createOscillator();
    ring.type = "sine";
    ring.frequency.setValueAtTime(3200, now);
    ring.frequency.exponentialRampToValueAtTime(1800, now + 0.6);
    const ringGain = ctx.createGain();
    ringGain.gain.setValueAtTime(0.1, now);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    ring.connect(ringGain).connect(dryBus);
    ring.start(now);
    ring.stop(now + 0.8);

    // Deep stress creak
    const creak = ctx.createOscillator();
    creak.type = "sawtooth";
    creak.frequency.setValueAtTime(80, now + 0.05);
    creak.frequency.exponentialRampToValueAtTime(40, now + 1);
    const creakGain = ctx.createGain();
    creakGain.gain.setValueAtTime(0, now);
    creakGain.gain.linearRampToValueAtTime(0.12, now + 0.1);
    creakGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    const creakDist = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = Math.tanh(x * 4);
    }
    creakDist.curve = curve;
    creak.connect(creakDist).connect(creakGain).connect(dryBus);
    creak.start(now + 0.05);
    creak.stop(now + 1.2);

    // Second smaller crack after a pause — the ice settling
    const crack2Buffer = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
    const crack2Data = crack2Buffer.getChannelData(0);
    for (let i = 0; i < crack2Data.length; i++) {
        crack2Data[i] = Math.random() * 2 - 1;
    }
    const crack2 = ctx.createBufferSource();
    crack2.buffer = crack2Buffer;
    const crack2Filter = ctx.createBiquadFilter();
    crack2Filter.type = "highpass";
    crack2Filter.frequency.value = 2500;
    crack2Filter.Q.value = 6;
    const crack2Gain = ctx.createGain();
    crack2Gain.gain.setValueAtTime(0.3, now + 1.8);
    crack2Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.86);
    crack2.connect(crack2Filter).connect(crack2Gain).connect(dryBus);
    crack2.start(now + 1.8);
    crack2.stop(now + 1.86);

    setTimeout(() => ctx.close(), 4000);
}

/** Wind gust — sustained howling wind that matches the visual gust duration */
function playWindGust() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 14; // covers full + calming phase

    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Bandpass sweeps up and down — wind surges
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(250, now);
    bp.frequency.exponentialRampToValueAtTime(700, now + 1.5);
    bp.frequency.setValueAtTime(700, now + 3);
    bp.frequency.exponentialRampToValueAtTime(500, now + 6);
    bp.frequency.exponentialRampToValueAtTime(800, now + 8);
    bp.frequency.exponentialRampToValueAtTime(400, now + 11);
    bp.frequency.exponentialRampToValueAtTime(200, now + dur);
    bp.Q.value = 2;

    // LFO for natural surging
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.3;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 150;
    lfo.connect(lfoGain).connect(bp.frequency);
    lfo.start(now);
    lfo.stop(now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 1);       // build up
    gain.gain.setValueAtTime(0.15, now + 4);                // sustain
    gain.gain.linearRampToValueAtTime(0.12, now + 8);       // slight dip
    gain.gain.linearRampToValueAtTime(0.15, now + 10);      // one last surge
    gain.gain.linearRampToValueAtTime(0.06, now + 12);      // calming starts
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur); // fade to silence

    source.connect(bp).connect(gain).connect(ctx.destination);
    source.start(now);
    source.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/* ══════════════════════════════════════════
   DATA GENERATORS
   ══════════════════════════════════════════ */

function generateSnowflakes() {
    return [...Array(SNOWFLAKE_COUNT)].map(() => {
        // ~70% drift right, ~30% drift left — covers the whole screen
        const driftRight = Math.random() > 0.3;
        const wind = driftRight
            ? (60 + Math.random() * 160)
            : -(40 + Math.random() * 120);
        // Flakes that drift right can start further left, flakes drifting left start further right
        const left = driftRight
            ? -10 + Math.random() * 90
            : 20 + Math.random() * 100;
        return {
            left,
            size: 3 + Math.random() * 6,
            duration: 5 + Math.random() * 7,
            delay: Math.random() * -12,
            wind: wind + "px",
            opacity: 0.5 + Math.random() * 0.5,
        };
    });
}

/* ══════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════ */

function generateGustFlakes() {
    return [...Array(SNOWFLAKE_COUNT)].map(() => ({
        left: Math.random() * 100,
        size: 2 + Math.random() * 5,
        duration: 3 + Math.random() * 4,
        delay: Math.random() * -6,
        wind: (150 + Math.random() * 250) + "px",
        opacity: 0.4 + Math.random() * 0.4,
    }));
}

function generateEyePairs() {
    const count = 3 + Math.floor(Math.random() * 3); // 3-5 pairs
    return [...Array(count)].map(() => ({
        left: 10 + Math.random() * 80,
        top: 15 + Math.random() * 55,
        scale: 0.6 + Math.random() * 0.8,
        delay: Math.random() * 2,
    }));
}

const Snowfall: React.FC<{ silent?: boolean }> = ({ silent }) => {
    const snowflakes = useMemo(generateSnowflakes, []);
    const gustFlakes = useMemo(generateGustFlakes, []);
    const [activeEvent, setActiveEvent] = useState<{ type: WinterEvent; key: number } | null>(null);
    const [eyePairs, setEyePairs] = useState<ReturnType<typeof generateEyePairs>>([]);
    const [gustPhase, setGustPhase] = useState<"none" | "full" | "calming">("none");
    const [gustTick, setGustTick] = useState(0);
    const windRef = useRef<{ stop: () => void } | null>(null);
    const eventCounter = useRef(0);

    // Gust oscillation — tick drives the sway back and forth
    useEffect(() => {
        if (gustPhase === "none") { setGustTick(0); return; }
        const interval = setInterval(() => setGustTick(t => t + 1), 400);
        return () => clearInterval(interval);
    }, [gustPhase]);

    // Start/stop ambient wind loop
    useEffect(() => {
        if (silent) return;
        windRef.current = createWindLoop();
        return () => { windRef.current?.stop(); };
    }, [silent]);

    // Shuffled queue — all events play once in random order, then reshuffle
    useEffect(() => {
        const queue: WinterEvent[] = [];
        let timer: ReturnType<typeof setTimeout>;

        const BASE_DURATIONS: Record<WinterEvent, number> = {
            frost: 8000,
            eyes: 6000,
            aurora: 10000,
            mist: 9000,
            howl: 8000,
            gust: 17000,
            ice_crack: 5000,
        };

        const playNext = () => {
            // Shuffle queue when empty — every event plays once before any repeats
            if (queue.length === 0) {
                queue.push(...ALL_EVENTS);
                for (let i = queue.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [queue[i], queue[j]] = [queue[j], queue[i]];
                }
            }
            const event = queue.pop()!;
            const key = ++eventCounter.current;
            // Random duration: 1x to 2x the base
            const randomMultiplier = 1 + Math.random();
            const duration = Math.round(BASE_DURATIONS[event] * randomMultiplier);

            setActiveEvent({ type: event, key });

            if (event === "howl" && !silent) {
                playWolfHowl();
                setTimeout(() => playWolfHowl(), 1800);
                if (duration > 10000) setTimeout(() => playWolfHowl(), 3500);
                if (duration > 13000) setTimeout(() => playWolfHowl(), 6000);
            }
            if (event === "ice_crack" && !silent) {
                playIceCrack();
                if (duration > 7000) setTimeout(() => playIceCrack(), 3500);
            }
            if (event === "eyes") setEyePairs(generateEyePairs());
            if (event === "gust") {
                if (!silent) playWindGust();
                const fullEnd = Math.round(duration * 0.7);
                const calmEnd = Math.round(duration * 0.95);
                setGustPhase("full");
                setTimeout(() => setGustPhase("calming"), fullEnd);
                setTimeout(() => setGustPhase("none"), calmEnd);
            }

            setTimeout(() => setActiveEvent(null), duration);

            // Schedule next event after this one finishes + 2s gap
            timer = setTimeout(playNext, duration + 2000);
        };

        // First event after short delay
        timer = setTimeout(playNext, 3000);

        return () => clearTimeout(timer);
    }, []);

    // Frost corner positions
    const frostCorners = useMemo(() => [
        { left: 0, top: 0, ox: "0%", oy: "0%" },
        { right: 0, top: 0, ox: "100%", oy: "0%" },
        { left: 0, bottom: 0, ox: "0%", oy: "100%" },
        { right: 0, bottom: 0, ox: "100%", oy: "100%" },
    ], []);

    return (
        <>
            {/* Ambient winter glow */}
            <div className={styles.winterAmbient} />

            {/* Blizzard snowflakes — always present.
                Gust is handled by shifting all flakes horizontally via a smooth CSS transition
                on margin-left, layered on top of the base animation. */}
            {snowflakes.map((s, i) => {
                // Wind pushes mostly right, with occasional slight pullback surges
                const surge = Math.sin(gustTick * 0.4 + i * 0.5);
                const gustShift = gustPhase === "full" ? 130 + surge * 40 + Math.sin(i) * 15
                    : gustPhase === "calming" ? 50 + surge * 15 : 0;
                return (
                    <div
                        key={`snow-${i}`}
                        className={styles.snowflake}
                        style={{
                            left: `${s.left}%`,
                            width: `${s.size}px`,
                            height: `${s.size}px`,
                            animationDuration: `${s.duration}s`,
                            animationDelay: `${s.delay}s`,
                            opacity: s.opacity,
                            ["--wind" as string]: s.wind,
                            marginLeft: `${gustShift}px`,
                            transition: "margin-left 1.5s ease-in-out",
                        }}
                    />
                );
            })}

            {/* ── EVENT: Frost creep ── */}
            {activeEvent?.type === "frost" &&
                frostCorners.map((corner, i) => (
                    <div
                        key={`frost-${activeEvent.key}-${i}`}
                        className={styles.frostCorner}
                        style={{
                            ...corner.left !== undefined ? { left: corner.left } : { right: corner.right },
                            ...corner.top !== undefined ? { top: corner.top } : { bottom: corner.bottom },
                            ["--ox" as string]: corner.ox,
                            ["--oy" as string]: corner.oy,
                        }}
                    />
                ))}

            {/* Extra snowflakes during gust — also shown during calming for smooth transition */}
            {gustPhase !== "none" && gustFlakes.map((s, i) => (
                <div
                    key={`gust-${i}`}
                    className={styles.snowflake}
                    style={{
                        left: `${s.left}%`,
                        width: `${s.size}px`,
                        height: `${s.size}px`,
                        animationDuration: `${s.duration}s`,
                        animationDelay: `${s.delay}s`,
                        opacity: s.opacity,
                        ["--wind" as string]: s.wind,
                    }}
                />
            ))}

            {/* ── EVENT: White Walker eyes — multiple pairs ── */}
            {activeEvent?.type === "eyes" && eyePairs.map((pair, i) => (
                <div
                    key={`eyes-${activeEvent.key}-${i}`}
                    className={styles.walkerEyes}
                    style={{
                        left: `${pair.left}%`,
                        top: `${pair.top}%`,
                        transform: `scale(${pair.scale})`,
                        animationDelay: `${pair.delay}s`,
                    }}
                >
                    <div className={styles.walkerEye} />
                    <div className={styles.walkerEye} />
                </div>
            ))}

            {/* ── EVENT: Aurora borealis ── */}
            {activeEvent?.type === "aurora" && (
                <>
                    <div key={`aurora-g-${activeEvent.key}`} className={`${styles.aurora} ${styles.auroraGreen}`} />
                    <div
                        key={`aurora-p-${activeEvent.key}`}
                        className={`${styles.aurora} ${styles.auroraPurple}`}
                        style={{ animationDelay: "1.5s" }}
                    />
                    <div
                        key={`aurora-b-${activeEvent.key}`}
                        className={`${styles.aurora} ${styles.auroraBlue}`}
                        style={{ animationDelay: "3s" }}
                    />
                </>
            )}

            {/* ── EVENT: Breath mist — multiple fog clouds ── */}
            {activeEvent?.type === "mist" && [0, 1, 2, 3, 4].map((i) => (
                <div
                    key={`mist-${activeEvent.key}-${i}`}
                    className={styles.mist}
                    style={{
                        top: `${15 + i * 16}%`,
                        animationDelay: `${i * 1.2}s`,
                        animationDuration: `${7 + i * 1}s`,
                        opacity: 0.3 - i * 0.03,
                        height: `${200 + (i % 2) * 80}px`,
                    }}
                />
            ))}
        </>
    );
};

export default Snowfall;
