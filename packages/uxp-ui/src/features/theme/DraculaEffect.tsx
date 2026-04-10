import React, { useEffect, useMemo, useRef, useState } from "react";
import * as styles from "./DraculaEffect.module.css";

type DraculaEvent = "bats" | "blood" | "midnight";
const ALL_EVENTS: DraculaEvent[] = ["bats", "blood", "midnight"];

/* ══════════════════════════════════════════
   SOUNDS
   ══════════════════════════════════════════ */


/** Midnight clock — ticking that accelerates, then 3 deep bell tolls */
function playMidnightClock() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.15, now);
    master.connect(ctx.destination);

    // Steady ticks — 1 second apart, tick-tock alternating
    const tickCount = 6;
    let tickTime = now + 0.5;
    for (let i = 0; i < tickCount; i++) {
        const freq = i % 2 === 0 ? 800 : 600;
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.15, tickTime);
        g.gain.exponentialRampToValueAtTime(0.001, tickTime + 0.04);
        osc.connect(g).connect(master);
        osc.start(tickTime);
        osc.stop(tickTime + 0.04);
        tickTime += 1;
    }

    // 4 bell tolls
    const bellStart = tickTime + 0.5;
    for (let i = 0; i < 4; i++) {
        const t = bellStart + i * 1.5;

        const bell = ctx.createOscillator();
        bell.type = "sine";
        bell.frequency.value = 180;
        const bell2 = ctx.createOscillator();
        bell2.type = "sine";
        bell2.frequency.value = 360;
        const bell3 = ctx.createOscillator();
        bell3.type = "sine";
        bell3.frequency.value = 540;

        const bellGain = ctx.createGain();
        bellGain.gain.setValueAtTime(0.3, t);
        bellGain.gain.exponentialRampToValueAtTime(0.1, t + 0.3);
        bellGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

        const overtoneGain = ctx.createGain();
        overtoneGain.gain.setValueAtTime(0.1, t);
        overtoneGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

        bell.connect(bellGain).connect(master);
        bell2.connect(overtoneGain).connect(master);
        bell3.connect(overtoneGain);

        bell.start(t);
        bell2.start(t);
        bell3.start(t);
        bell.stop(t + 1.8);
        bell2.stop(t + 1.2);
        bell3.stop(t + 1.2);

        // Strike impact
        const impBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const id = impBuf.getChannelData(0);
        for (let j = 0; j < id.length; j++) id[j] = Math.random() * 2 - 1;
        const imp = ctx.createBufferSource();
        imp.buffer = impBuf;
        const impLP = ctx.createBiquadFilter();
        impLP.type = "lowpass";
        impLP.frequency.value = 500;
        const impGain = ctx.createGain();
        impGain.gain.setValueAtTime(0.2, t);
        impGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        imp.connect(impLP).connect(impGain).connect(master);
        imp.start(t);
        imp.stop(t + 0.05);
    }

    setTimeout(() => ctx.close(), 15000);
}

/** Coffin creak — creaky lid opening, louder and longer */
function playCoffinCreak() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 3;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.25, now);
    master.connect(ctx.destination);

    // Creak — slow rising resonant noise, two sweeps for that drawn-out wooden creak
    const creakBuf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const cd = creakBuf.getChannelData(0);
    for (let i = 0; i < cd.length; i++) cd[i] = Math.random() * 2 - 1;
    const creak = ctx.createBufferSource();
    creak.buffer = creakBuf;
    const creakBP = ctx.createBiquadFilter();
    creakBP.type = "bandpass";
    creakBP.frequency.setValueAtTime(200, now);
    creakBP.frequency.exponentialRampToValueAtTime(600, now + 0.6);
    creakBP.frequency.exponentialRampToValueAtTime(300, now + 1.2);
    creakBP.frequency.exponentialRampToValueAtTime(700, now + 1.8);
    creakBP.frequency.exponentialRampToValueAtTime(250, now + dur);
    creakBP.Q.value = 20;
    const creakGain = ctx.createGain();
    creakGain.gain.setValueAtTime(0, now);
    creakGain.gain.linearRampToValueAtTime(0.3, now + 0.2);
    creakGain.gain.setValueAtTime(0.3, now + 0.6);
    creakGain.gain.linearRampToValueAtTime(0.15, now + 1.2);
    creakGain.gain.linearRampToValueAtTime(0.25, now + 1.8);
    creakGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    creak.connect(creakBP).connect(creakGain).connect(master);
    creak.start(now);
    creak.stop(now + dur);

    // Low groan undertone
    const groan = ctx.createOscillator();
    groan.type = "triangle";
    groan.frequency.setValueAtTime(50, now);
    groan.frequency.linearRampToValueAtTime(70, now + 1);
    groan.frequency.linearRampToValueAtTime(40, now + dur);
    const groanGain = ctx.createGain();
    groanGain.gain.setValueAtTime(0, now);
    groanGain.gain.linearRampToValueAtTime(0.1, now + 0.3);
    groanGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    groan.connect(groanGain).connect(master);
    groan.start(now);
    groan.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}


/* ══════════════════════════════════════════
   SVGs
   ══════════════════════════════════════════ */

/** Clock face with animated hands */
const ClockFaceSvg: React.FC<{ size: number }> = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Face */}
        <circle cx="100" cy="100" r="90" fill="rgba(20, 15, 30, 0.9)" stroke="rgba(140, 100, 180, 0.6)" strokeWidth="3" />
        <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(100, 70, 150, 0.3)" strokeWidth="1" />

        {/* Roman numerals */}
        {[
            { n: "XII", x: 100, y: 28 },
            { n: "III", x: 174, y: 105 },
            { n: "VI", x: 100, y: 182 },
            { n: "IX", x: 26, y: 105 },
        ].map(({ n, x, y }) => (
            <text key={n} x={x} y={y} textAnchor="middle" fill="rgba(180, 150, 220, 0.8)" fontSize="14" fontFamily="serif">{n}</text>
        ))}

        {/* Hour marks */}
        {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const x1 = 100 + Math.cos(angle) * 75;
            const y1 = 100 + Math.sin(angle) * 75;
            const x2 = 100 + Math.cos(angle) * 82;
            const y2 = 100 + Math.sin(angle) * 82;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(140, 100, 180, 0.5)" strokeWidth="2" />;
        })}

        {/* Center dot */}
        <circle cx="100" cy="100" r="4" fill="rgba(180, 150, 220, 0.8)" />

        {/* Both hands at 12 — midnight */}
        <rect x="97" y="45" width="6" height="55" rx="3" fill="rgba(180, 150, 220, 0.8)" />
        <rect x="98" y="25" width="4" height="75" rx="2" fill="rgba(200, 170, 240, 0.9)" />
    </svg>
);

/** Bat silhouette */
const BatSvg: React.FC<{ size: number }> = ({ size }) => (
    <svg width={size} height={size * 0.5} viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Wings */}
        <path d="M20 12 Q12 4 5 8 Q2 2 0 4 Q4 10 8 9 Q12 14 16 12 Z" fill="rgba(20,15,30,0.8)" />
        <path d="M20 12 Q28 4 35 8 Q38 2 40 4 Q36 10 32 9 Q28 14 24 12 Z" fill="rgba(20,15,30,0.8)" />
        {/* Body */}
        <ellipse cx="20" cy="13" rx="4" ry="5" fill="rgba(20,15,30,0.9)" />
        {/* Ears */}
        <path d="M17 9 L16 5 L19 8" fill="rgba(20,15,30,0.8)" />
        <path d="M23 9 L24 5 L21 8" fill="rgba(20,15,30,0.8)" />
    </svg>
);

/* ══════════════════════════════════════════
   DATA GENERATORS
   ══════════════════════════════════════════ */

const BASE_DURATIONS: Record<DraculaEvent, number> = {
    bats: 4000,
    blood: 5000,
    midnight: 14000,
};

function generateBats() {
    return [...Array(8 + Math.floor(Math.random() * 6))].map((_, i) => ({
        top: 10 + Math.random() * 50,
        size: 35 + Math.random() * 30,
        duration: 2 + Math.random() * 1.5,
        delay: i * 0.3 + Math.random() * 0.3,
        flapSpeed: 0.2 + Math.random() * 0.2,
        dir: Math.random() > 0.5 ? 1 : -1,
    }));
}

function generateDrips() {
    return [...Array(10 + Math.floor(Math.random() * 8))].map(() => ({
        left: 5 + Math.random() * 90,
        length: 50 + Math.random() * 100,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 2,
    }));
}

/* ══════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════ */

const DraculaEffect: React.FC<{ silent?: boolean }> = ({ silent }) => {
    const [activeEvent, setActiveEvent] = useState<{ type: DraculaEvent; key: number } | null>(null);
    const [bats, setBats] = useState(generateBats);
    const [drips, setDrips] = useState(generateDrips);
    const [showClock, setShowClock] = useState(false);
    const eventCounter = useRef(0);

    useEffect(() => {
        const queue: DraculaEvent[] = [];
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
            if (event === "bats") setBats(generateBats());
            if (event === "blood") setDrips(generateDrips());
            if (event === "midnight") {
                setShowClock(false);
                // Show clock face when bells start (~7s after ticks begin)
                setTimeout(() => setShowClock(true), 6500);
            }

            if (!silent) {
                if (event === "blood") playCoffinCreak();
                if (event === "midnight") playMidnightClock();
            }

            setTimeout(() => setActiveEvent(null), duration);
            timer = setTimeout(scheduleNext, duration + 2000);
        }

        timer = setTimeout(scheduleNext, 3000);
        return () => clearTimeout(timer);
    }, [silent]);

    return (
        <>
            {/* Bats */}
            {activeEvent?.type === "bats" && bats.map((b, i) => (
                <div
                    key={`bat-${activeEvent.key}-${i}`}
                    className={styles.bat}
                    style={{
                        top: `${b.top}%`,
                        animationDuration: `${b.duration}s`,
                        animationDelay: `${b.delay}s`,
                    }}
                >
                    <div
                        className={styles.batInner}
                        style={{
                            animationDuration: `${b.flapSpeed}s`,
                            ["--bat-dir" as string]: b.dir,
                        }}
                    >
                        <BatSvg size={b.size} />
                    </div>
                </div>
            ))}

            {/* Blood drips */}
            {activeEvent?.type === "blood" && drips.map((d, i) => (
                <div
                    key={`drip-${activeEvent.key}-${i}`}
                    className={styles.bloodDrip}
                    style={{
                        left: `${d.left}%`,
                        animationDuration: `${d.duration}s`,
                        animationDelay: `${d.delay}s`,
                        ["--drip-length" as string]: `${d.length}px`,
                    }}
                />
            ))}

            {/* Midnight clock — appears at random position when bells start */}
            {activeEvent?.type === "midnight" && showClock && (
                <div
                    key={`clock-${activeEvent.key}`}
                    className={styles.clockFace}
                    style={{
                        left: `${20 + Math.random() * 60}%`,
                        top: `${15 + Math.random() * 55}%`,
                    }}
                >
                    <ClockFaceSvg size={180} />
                </div>
            )}
        </>
    );
};

export default DraculaEffect;
