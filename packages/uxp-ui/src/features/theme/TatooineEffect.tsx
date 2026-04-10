import React, { useEffect, useMemo, useRef, useState } from "react";
import * as styles from "./TatooineEffect.module.css";

type TatooineEvent = "suns" | "sandstorm" | "sarlacc" | "vaporators" | "jawas" | "meteors";
const ALL_EVENTS: TatooineEvent[] = ["suns", "sandstorm", "sarlacc", "vaporators", "jawas", "meteors"];

/* ══════════════════════════════════════════
   SOUNDS
   ══════════════════════════════════════════ */

/** Binary sunset — warm ambient tone (inspired by the iconic melody feel) */
function playSunsetTone() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 8;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.1, now);
    master.connect(ctx.destination);

    // Warm sustained chord — simple major intervals
    [262, 330, 392, 523].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.value = freq * 1.002;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 600;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now + i * 0.5);
        g.gain.linearRampToValueAtTime(0.06 - i * 0.01, now + i * 0.5 + 1);
        g.gain.setValueAtTime(0.06 - i * 0.01, now + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(lp).connect(g).connect(master);
        osc2.connect(lp);
        osc.start(now + i * 0.5);
        osc2.start(now + i * 0.5);
        osc.stop(now + dur);
        osc2.stop(now + dur);
    });

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Sandstorm — wind howl */
function playSandstormSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 10;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, now);
    master.connect(ctx.destination);

    // Wind
    const windBuf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const wd = windBuf.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    const wind = ctx.createBufferSource();
    wind.buffer = windBuf;
    const windBP = ctx.createBiquadFilter();
    windBP.type = "bandpass";
    windBP.frequency.setValueAtTime(300, now);
    windBP.frequency.exponentialRampToValueAtTime(600, now + 2);
    windBP.frequency.exponentialRampToValueAtTime(250, now + dur);
    windBP.Q.value = 2;
    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, now);
    windGain.gain.linearRampToValueAtTime(0.15, now + 1.5);
    windGain.gain.setValueAtTime(0.15, now + dur * 0.6);
    windGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    wind.connect(windBP).connect(windGain).connect(master);
    wind.start(now);
    wind.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Sarlacc — deep rumble + alien growl */
function playSarlaccSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 5;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.15, now);
    master.connect(ctx.destination);

    // Deep rumble
    const rumble = ctx.createOscillator();
    rumble.type = "sawtooth";
    rumble.frequency.setValueAtTime(40, now);
    rumble.frequency.linearRampToValueAtTime(30, now + dur);
    const dist = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = Math.tanh(x * 3);
    }
    dist.curve = curve;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 150;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(0.2, now + 1);
    rumbleGain.gain.setValueAtTime(0.2, now + 3);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    rumble.connect(dist).connect(lp).connect(rumbleGain).connect(master);
    rumble.start(now);
    rumble.stop(now + dur);

    // Alien growl — resonant noise
    const growlBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const gd = growlBuf.getChannelData(0);
    for (let i = 0; i < gd.length; i++) gd[i] = Math.random() * 2 - 1;
    const growl = ctx.createBufferSource();
    growl.buffer = growlBuf;
    const growlBP = ctx.createBiquadFilter();
    growlBP.type = "bandpass";
    growlBP.frequency.setValueAtTime(150, now + 1);
    growlBP.frequency.exponentialRampToValueAtTime(80, now + 4);
    growlBP.Q.value = 8;
    const growlGain = ctx.createGain();
    growlGain.gain.setValueAtTime(0, now + 1);
    growlGain.gain.linearRampToValueAtTime(0.1, now + 1.5);
    growlGain.gain.exponentialRampToValueAtTime(0.001, now + 4);
    growl.connect(growlBP).connect(growlGain).connect(master);
    growl.start(now + 1);
    growl.stop(now + 4);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Moisture vaporator — gentle mechanical hum */
function playVaporatorSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 6;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.08, now);
    master.connect(ctx.destination);

    // Low mechanical hum
    const hum = ctx.createOscillator();
    hum.type = "triangle";
    hum.frequency.value = 90;
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0, now);
    humGain.gain.linearRampToValueAtTime(0.06, now + 1);
    humGain.gain.setValueAtTime(0.06, now + dur * 0.7);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    hum.connect(humGain).connect(master);
    hum.start(now);
    hum.stop(now + dur);

    // Faint dripping / condensation sound — sparse clicks
    for (let i = 0; i < 5; i++) {
        const t = now + 1 + Math.random() * (dur - 2);
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 2000 + Math.random() * 1000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.connect(g).connect(master);
        osc.start(t);
        osc.stop(t + 0.04);
    }

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Jawa "Utini!" — quick high-pitched chirps */
function playJawaChirps() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, now);
    master.connect(ctx.destination);

    // Series of quick chirps at high pitch
    const chirps = [
        { freq: 800, slide: 1200, start: 0, dur: 0.12 },
        { freq: 1000, slide: 1400, start: 0.15, dur: 0.1 },
        { freq: 600, slide: 900, start: 0.35, dur: 0.15 },
        { freq: 1100, slide: 1500, start: 0.55, dur: 0.08 },
        { freq: 700, slide: 1100, start: 0.7, dur: 0.2 },
    ];

    chirps.forEach(({ freq, slide, start, dur }) => {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now + start);
        osc.frequency.linearRampToValueAtTime(slide, now + start + dur * 0.5);
        osc.frequency.linearRampToValueAtTime(freq * 0.8, now + start + dur);
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 2000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now + start);
        g.gain.linearRampToValueAtTime(0.1, now + start + 0.02);
        g.gain.setValueAtTime(0.1, now + start + dur * 0.6);
        g.gain.linearRampToValueAtTime(0, now + start + dur);
        osc.connect(lp).connect(g).connect(master);
        osc.start(now + start);
        osc.stop(now + start + dur);
    });

    setTimeout(() => ctx.close(), 2000);
}

/* ══════════════════════════════════════════
   SVGs
   ══════════════════════════════════════════ */

/** Moisture vaporator — tall farm equipment silhouette */
const VaporatorSvg: React.FC<{ height: number }> = ({ height }) => (
    <svg width={30} height={height} viewBox="0 0 30 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Main column */}
        <rect x="12" y="20" width="6" height="100" fill="rgba(140,120,90,0.7)" stroke="rgba(120,100,70,0.4)" strokeWidth="0.5" />
        {/* Top collector dish */}
        <ellipse cx="15" cy="20" rx="12" ry="4" fill="rgba(150,130,100,0.6)" stroke="rgba(120,100,70,0.4)" strokeWidth="0.5" />
        {/* Top spike */}
        <line x1="15" y1="16" x2="15" y2="5" stroke="rgba(140,120,90,0.6)" strokeWidth="2" />
        <circle cx="15" cy="4" r="2" fill="rgba(160,140,110,0.5)" />
        {/* Side vanes */}
        <rect x="4" y="40" width="8" height="3" rx="1" fill="rgba(130,110,80,0.5)" />
        <rect x="18" y="40" width="8" height="3" rx="1" fill="rgba(130,110,80,0.5)" />
        <rect x="4" y="55" width="8" height="3" rx="1" fill="rgba(130,110,80,0.5)" />
        <rect x="18" y="55" width="8" height="3" rx="1" fill="rgba(130,110,80,0.5)" />
        <rect x="4" y="70" width="8" height="3" rx="1" fill="rgba(130,110,80,0.5)" />
        <rect x="18" y="70" width="8" height="3" rx="1" fill="rgba(130,110,80,0.5)" />
        {/* Base */}
        <rect x="8" y="115" width="14" height="5" rx="1" fill="rgba(120,100,70,0.6)" />
    </svg>
);

/* ══════════════════════════════════════════
   DATA GENERATORS
   ══════════════════════════════════════════ */

const BASE_DURATIONS: Record<TatooineEvent, number> = {
    suns: 15000,
    sandstorm: 16000,
    sarlacc: 7000,
    vaporators: 8000,
    jawas: 5000,
    meteors: 6000,
};

function generateSandParticles() {
    return [...Array(30)].map(() => ({
        left: Math.random() * 100,
        size: 1 + Math.random() * 3,
        duration: 8 + Math.random() * 12,
        delay: Math.random() * -10,
        wind: (20 + Math.random() * 60) + "px",
        opacity: 0.2 + Math.random() * 0.4,
    }));
}

function generateStormParticles() {
    return [...Array(80)].map(() => ({
        top: Math.random() * 100,
        size: 3 + Math.random() * 7,
        duration: 1.5 + Math.random() * 2.5,
        delay: Math.random() * 5,
        drop: (20 + Math.random() * 80) + "px",
    }));
}

function generateJawaPairs() {
    const count = 3 + Math.floor(Math.random() * 4);
    return [...Array(count)].map(() => ({
        left: 10 + Math.random() * 80,
        top: 50 + Math.random() * 35,
        scale: 0.6 + Math.random() * 0.6,
        delay: Math.random() * 1.5,
    }));
}

function generateMeteors() {
    return [...Array(6 + Math.floor(Math.random() * 5))].map(() => ({
        startX: Math.random() * 80,
        startY: Math.random() * 40,
        length: 150 + Math.random() * 250,
        angle: 20 + Math.random() * 35,
        duration: 0.5 + Math.random() * 0.7,
        delay: Math.random() * 4,
        width: 2 + Math.random() * 3,
        brightness: 0.7 + Math.random() * 0.3,
    }));
}

function generateTentacles() {
    return [...Array(8)].map((_, i) => ({
        // Spread evenly around center (50%), within the pit width
        offsetPx: -50 + i * 14 + Math.random() * 5,
        angle: -40 + i * 11 + Math.random() * 5,
        height: 90 + Math.random() * 80,
        delay: Math.random() * 0.5,
    }));
}

/* ══════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════ */

const TatooineEffect: React.FC<{ silent?: boolean }> = ({ silent }) => {
    const [activeEvent, setActiveEvent] = useState<{ type: TatooineEvent; key: number } | null>(null);
    const [jawaPairs, setJawaPairs] = useState(generateJawaPairs);
    const [meteors, setMeteors] = useState(generateMeteors);
    const sandParticles = useMemo(generateSandParticles, []);
    const stormParticles = useMemo(generateStormParticles, []);
    const tentacles = useMemo(generateTentacles, []);
    const eventCounter = useRef(0);

    useEffect(() => {
        const queue: TatooineEvent[] = [];
        let timer: ReturnType<typeof setTimeout>;

        function scheduleNext() {
            if (queue.length === 0) {
                queue.push(...ALL_EVENTS);
                for (let i = queue.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [queue[i], queue[j]] = [queue[j], queue[i]];
                }
            }
            const event = queue.pop()!;
            const key = ++eventCounter.current;
            const duration = Math.round(BASE_DURATIONS[event] * (1 + Math.random()));

            setActiveEvent({ type: event, key });
            if (event === "jawas") setJawaPairs(generateJawaPairs());
            if (event === "meteors") setMeteors(generateMeteors());

            if (!silent) {
                if (event === "suns") playSunsetTone();
                if (event === "sandstorm") playSandstormSound();
                if (event === "sarlacc") playSarlaccSound();
                if (event === "vaporators") playVaporatorSound();
                if (event === "jawas") playJawaChirps();
            }

            setTimeout(() => setActiveEvent(null), duration);
            timer = setTimeout(scheduleNext, duration + 2000);
        }

        timer = setTimeout(scheduleNext, 3000);
        return () => clearTimeout(timer);
    }, [silent]);

    return (
        <>
            {/* Always-on: heat shimmer */}
            <div className={styles.heatShimmer} />

            {/* Always-on: floating sand particles */}
            {sandParticles.map((s, i) => (
                <div
                    key={`sand-${i}`}
                    className={styles.sandParticle}
                    style={{
                        left: `${s.left}%`,
                        width: `${s.size}px`,
                        height: `${s.size}px`,
                        animationDuration: `${s.duration}s`,
                        animationDelay: `${s.delay}s`,
                        ["--sand-wind" as string]: s.wind,
                        ["--sand-opacity" as string]: s.opacity,
                    }}
                />
            ))}

            {/* Twin suns */}
            {activeEvent?.type === "suns" && (
                <>
                    <div className={styles.horizonGlow} key={`glow-${activeEvent.key}`} />
                    <div
                        key={`sun1-${activeEvent.key}`}
                        className={styles.twinSun}
                        style={{
                            left: "35%",
                            width: "80px",
                            height: "80px",
                            background: "radial-gradient(circle, rgba(255,220,100,0.9) 0%, rgba(255,180,50,0.6) 50%, transparent 100%)",
                            ["--sun-color" as string]: "rgba(255, 180, 50, 0.5)",
                        }}
                    />
                    <div
                        key={`sun2-${activeEvent.key}`}
                        className={styles.twinSun}
                        style={{
                            left: "55%",
                            width: "55px",
                            height: "55px",
                            animationDelay: "0.5s",
                            background: "radial-gradient(circle, rgba(255,200,150,0.9) 0%, rgba(255,150,80,0.6) 50%, transparent 100%)",
                            ["--sun-color" as string]: "rgba(255, 150, 80, 0.5)",
                        }}
                    />
                </>
            )}

            {/* Sandstorm */}
            {activeEvent?.type === "sandstorm" && (
                <>
                    <div key={`storm-${activeEvent.key}`} className={styles.stormOverlay} />
                    {stormParticles.map((p, i) => (
                        <div
                            key={`sp-${activeEvent.key}-${i}`}
                            className={styles.stormParticle}
                            style={{
                                top: `${p.top}%`,
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                                animationDuration: `${p.duration}s`,
                                animationDelay: `${p.delay}s`,
                                ["--storm-drop" as string]: p.drop,
                            }}
                        />
                    ))}
                </>
            )}

            {/* Sarlacc pit */}
            {activeEvent?.type === "sarlacc" && (
                <>
                    <div key={`sarlacc-${activeEvent.key}`} className={styles.sarlaccPit} />
                    {tentacles.map((t, i) => (
                        <div
                            key={`tent-${activeEvent.key}-${i}`}
                            className={styles.tentacle}
                            style={{
                                left: `calc(50% + ${t.offsetPx}px)`,
                                animationDelay: `${t.delay}s, ${t.delay}s`,
                                ["--tent-angle" as string]: `${t.angle}deg`,
                                ["--tent-height" as string]: `${t.height}px`,
                            }}
                        />
                    ))}
                </>
            )}

            {/* Moisture vaporators — silhouettes at random positions across screen */}
            {activeEvent?.type === "vaporators" && [0, 1, 2, 3, 4].map((i) => {
                const scale = 0.5 + Math.random() * 0.7;
                return (
                    <div
                        key={`vap-${activeEvent.key}-${i}`}
                        className={styles.vaporator}
                        style={{
                            left: `${5 + Math.random() * 85}%`,
                            top: `${10 + Math.random() * 70}%`,
                            animationDelay: `${i * 0.5}s`,
                            ["--vap-scale" as string]: scale,
                            transform: `scale(${scale})`,
                        }}
                    >
                        <VaporatorSvg height={100 + Math.floor(Math.random() * 50)} />
                    </div>
                );
            })}

            {/* Jawa eyes */}
            {activeEvent?.type === "jawas" && jawaPairs.map((j, i) => (
                <div
                    key={`jawa-${activeEvent.key}-${i}`}
                    className={styles.jawaEyes}
                    style={{
                        left: `${j.left}%`,
                        top: `${j.top}%`,
                        transform: `scale(${j.scale})`,
                        animationDelay: `${j.delay}s`,
                    }}
                >
                    <div className={styles.jawaEye} />
                    <div className={styles.jawaEye} />
                </div>
            ))}

            {/* Shooting stars / meteorites */}
            {activeEvent?.type === "meteors" && meteors.map((m, i) => (
                <div
                    key={`meteor-${activeEvent.key}-${i}`}
                    className={styles.meteor}
                    style={{
                        left: `${m.startX}%`,
                        top: `${m.startY}%`,
                        width: `${m.length}px`,
                        height: `${m.width}px`,
                        animationDuration: `${m.duration}s`,
                        animationDelay: `${m.delay}s`,
                        transform: `rotate(${m.angle}deg)`,
                        opacity: m.brightness,
                    }}
                />
            ))}
        </>
    );
};

export default TatooineEffect;
