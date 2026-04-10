import React, { useEffect, useMemo, useRef, useState } from "react";
import * as styles from "./SunsetEffect.module.css";

type SunsetEvent = "sun" | "palms" | "waves" | "seagulls";
const ALL_EVENTS: SunsetEvent[] = ["sun", "palms", "waves", "seagulls"];

/* ══════════════════════════════════════════
   SOUNDS
   ══════════════════════════════════════════ */

/** Warm ambient pad — gentle sustained chord */
function playSunsetPad() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 12;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.08, now);
    master.connect(ctx.destination);

    [262, 330, 392, 494].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.value = freq * 1.002;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 500;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now + i * 0.8);
        g.gain.linearRampToValueAtTime(0.04 - i * 0.005, now + i * 0.8 + 1.5);
        g.gain.setValueAtTime(0.04 - i * 0.005, now + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(lp).connect(g).connect(master);
        osc2.connect(lp);
        osc.start(now + i * 0.8);
        osc2.start(now + i * 0.8);
        osc.stop(now + dur);
        osc2.stop(now + dur);
    });

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Ocean waves — gentle lapping sounds */
function playWaveSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 7;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.1, now);
    master.connect(ctx.destination);

    // Gentle wave wash — filtered noise with slow envelope
    for (let w = 0; w < 3; w++) {
        const start = now + w * 2.2;
        const waveBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const wd = waveBuf.getChannelData(0);
        for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
        const wave = ctx.createBufferSource();
        wave.buffer = waveBuf;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(300, start);
        lp.frequency.linearRampToValueAtTime(600, start + 0.5);
        lp.frequency.linearRampToValueAtTime(200, start + 1.8);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.08, start + 0.4);
        g.gain.linearRampToValueAtTime(0.06, start + 1);
        g.gain.exponentialRampToValueAtTime(0.001, start + 1.8);
        wave.connect(lp).connect(g).connect(master);
        wave.start(start);
        wave.stop(start + 2);
    }

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Seagull calls — high pitched cries */
function playSeagullCalls() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.08, now);
    master.connect(ctx.destination);

    const calls = [
        { start: 0, freq1: 2000, freq2: 2800, freq3: 1800, dur: 0.3 },
        { start: 0.5, freq1: 2200, freq2: 3000, freq3: 2000, dur: 0.25 },
        { start: 1.2, freq1: 1800, freq2: 2600, freq3: 1600, dur: 0.35 },
        { start: 2.0, freq1: 2100, freq2: 2900, freq3: 1900, dur: 0.2 },
    ];

    calls.forEach(({ start, freq1, freq2, freq3, dur }) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        const t = now + start;
        osc.frequency.setValueAtTime(freq1, t);
        osc.frequency.linearRampToValueAtTime(freq2, t + dur * 0.4);
        osc.frequency.linearRampToValueAtTime(freq3, t + dur);
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 3500;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.03);
        g.gain.setValueAtTime(0.06, t + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(lp).connect(g).connect(master);
        osc.start(t);
        osc.stop(t + dur);
    });

    setTimeout(() => ctx.close(), 4000);
}

/* ══════════════════════════════════════════
   SVGs
   ══════════════════════════════════════════ */

/** Palm tree silhouette */
const PalmTreeSvg: React.FC<{ height: number }> = ({ height }) => (
    <svg width={height * 0.5} height={height} viewBox="0 0 60 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Trunk — slightly curved */}
        <path d="M30 120 Q28 80 32 50 Q34 35 30 25" stroke="rgba(30,20,10,0.8)" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* Fronds */}
        <path d="M30 25 Q10 15 2 25" stroke="rgba(25,20,10,0.7)" strokeWidth="2" fill="none" />
        <path d="M30 25 Q15 10 5 15" stroke="rgba(25,20,10,0.7)" strokeWidth="2" fill="none" />
        <path d="M30 25 Q25 5 15 5" stroke="rgba(25,20,10,0.7)" strokeWidth="2" fill="none" />
        <path d="M30 25 Q35 5 45 5" stroke="rgba(25,20,10,0.7)" strokeWidth="2" fill="none" />
        <path d="M30 25 Q45 10 55 15" stroke="rgba(25,20,10,0.7)" strokeWidth="2" fill="none" />
        <path d="M30 25 Q50 15 58 25" stroke="rgba(25,20,10,0.7)" strokeWidth="2" fill="none" />
        {/* Coconuts */}
        <circle cx="28" cy="28" r="2.5" fill="rgba(30,20,10,0.6)" />
        <circle cx="33" cy="27" r="2.5" fill="rgba(30,20,10,0.6)" />
    </svg>
);

/** Seagull silhouette — simple V shape */
const SeagullSvg: React.FC<{ size: number }> = ({ size }) => (
    <svg width={size} height={size * 0.4} viewBox="0 0 40 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 10 Q8 2 15 6 Q17 7 20 8 Q23 7 25 6 Q32 2 40 10"
            stroke="rgba(30,20,10,0.7)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
);

/* ══════════════════════════════════════════
   DATA GENERATORS
   ══════════════════════════════════════════ */

const BASE_DURATIONS: Record<SunsetEvent, number> = {
    sun: 14000,
    palms: 10000,
    waves: 8000,
    seagulls: 5000,
};

function generatePalmTrees() {
    return [...Array(3 + Math.floor(Math.random() * 2))].map((_, i) => ({
        left: 5 + Math.random() * 85,
        height: 120 + Math.random() * 60,
        baseAngle: -5 + Math.random() * 10,
        flip: Math.random() > 0.5 ? -1 : 1,
        delay: i * 0.3,
    }));
}

function generateSeagulls() {
    return [...Array(3 + Math.floor(Math.random() * 4))].map((_, i) => ({
        top: 10 + i * 8 + Math.random() * 10,
        size: 25 + Math.random() * 20,
        duration: 3 + Math.random() * 2,
        delay: i * 0.6 + Math.random() * 0.3,
        flapSpeed: 0.4 + Math.random() * 0.4,
    }));
}


/* ══════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════ */

const SunsetEffect: React.FC<{ silent?: boolean }> = ({ silent }) => {
    const [activeEvent, setActiveEvent] = useState<{ type: SunsetEvent; key: number } | null>(null);
    const [palms, setPalms] = useState(generatePalmTrees);
    const [seagulls, setSeagulls] = useState(generateSeagulls);
    const eventCounter = useRef(0);

    useEffect(() => {
        const queue: SunsetEvent[] = [];
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
            if (event === "palms") setPalms(generatePalmTrees());
            if (event === "seagulls") setSeagulls(generateSeagulls());

            if (!silent) {
                if (event === "sun") playSunsetPad();
                if (event === "waves") playWaveSound();
                if (event === "seagulls") playSeagullCalls();
            }

            setTimeout(() => setActiveEvent(null), duration);
            timer = setTimeout(scheduleNext, duration + 2000);
        }

        timer = setTimeout(scheduleNext, 3000);
        return () => clearTimeout(timer);
    }, [silent]);

    return (
        <>
            {/* Warm ambient glow — always present */}
            <div className={styles.warmAmbient} />

            {/* Sun setting */}
            {activeEvent?.type === "sun" && (
                <>
                    <div key={`sky-${activeEvent.key}`} className={styles.skyGlow} />
                    <div
                        key={`sun-${activeEvent.key}`}
                        className={styles.settingSun}
                        style={{
                            width: "130px",
                            height: "130px",
                            background: "radial-gradient(circle, rgba(255,220,100,0.95) 0%, rgba(255,160,50,0.7) 40%, rgba(255,100,30,0.3) 70%, transparent 100%)",
                        }}
                    />
                </>
            )}

            {/* Palm trees */}
            {activeEvent?.type === "palms" && palms.map((p, i) => (
                <div
                    key={`palm-${activeEvent.key}-${i}`}
                    className={styles.palmTree}
                    style={{
                        left: `${p.left}%`,
                        animationDelay: `${p.delay}s, 0s`,
                        ["--palm-base" as string]: `${p.baseAngle}deg`,
                        ["--palm-flip" as string]: p.flip,
                    }}
                >
                    <PalmTreeSvg height={p.height} />
                </div>
            ))}

            {/* Ocean waves */}
            {activeEvent?.type === "waves" && [0, 1, 2].map((i) => (
                <div
                    key={`wave-${activeEvent.key}-${i}`}
                    className={styles.wave}
                    style={{
                        height: `${8 + i * 4}vh`,
                        bottom: `${i * 2}vh`,
                        background: `rgba(50, 100, 150, ${0.12 - i * 0.03})`,
                        animationDelay: `0s, ${i * 1.2}s`,
                        animationDuration: `8s, ${3 + i * 0.5}s`,
                    }}
                />
            ))}

            {/* Seagulls */}
            {activeEvent?.type === "seagulls" && seagulls.map((s, i) => (
                <div
                    key={`gull-${activeEvent.key}-${i}`}
                    className={styles.seagull}
                    style={{
                        top: `${s.top}%`,
                        animationDuration: `${s.duration}s`,
                        animationDelay: `${s.delay}s`,
                    }}
                >
                    <div className={styles.seagullInner} style={{ animationDuration: `${s.flapSpeed}s` }}>
                        <SeagullSvg size={s.size} />
                    </div>
                </div>
            ))}

        </>
    );
};

export default SunsetEffect;
