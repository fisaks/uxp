import React, { useEffect, useMemo, useRef, useState } from "react";
import * as styles from "./RebelAllianceEffect.module.css";

type RebelEvent = "xwing" | "falcon" | "logo" | "hyperspace" | "saber" | "force" | "r2d2";
const ALL_EVENTS: RebelEvent[] = ["xwing", "falcon", "logo", "hyperspace", "saber", "force", "r2d2"];

/* ══════════════════════════════════════════
   SOUNDS
   ══════════════════════════════════════════ */

/** X-Wing engine flyby */
function playXWingSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 3;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.15, now);
    master.connect(ctx.destination);

    // Engine whine — high sawtooth with Doppler sweep
    const engine = ctx.createOscillator();
    engine.type = "sawtooth";
    engine.frequency.setValueAtTime(400, now);
    engine.frequency.exponentialRampToValueAtTime(600, now + 1.2);
    engine.frequency.exponentialRampToValueAtTime(350, now + dur);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1500;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.8);
    gain.gain.setValueAtTime(0.15, now + 1.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    engine.connect(lp).connect(gain).connect(master);
    engine.start(now);
    engine.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Millennium Falcon — deep engine rumble */
function playFalconSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 4;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.18, now);
    master.connect(ctx.destination);

    // Deep rumble
    const rumble = ctx.createOscillator();
    rumble.type = "sawtooth";
    rumble.frequency.setValueAtTime(80, now);
    rumble.frequency.linearRampToValueAtTime(100, now + 1.5);
    rumble.frequency.linearRampToValueAtTime(70, now + dur);

    const dist = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = Math.tanh(x * 2);
    }
    dist.curve = curve;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 300;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.5);
    gain.gain.setValueAtTime(0.2, now + 2.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    rumble.connect(dist).connect(lp).connect(gain).connect(master);
    rumble.start(now);
    rumble.stop(now + dur);

    // Higher whine overlay
    const whine = ctx.createOscillator();
    whine.type = "sawtooth";
    whine.frequency.setValueAtTime(250, now);
    whine.frequency.linearRampToValueAtTime(300, now + 2);
    whine.frequency.linearRampToValueAtTime(220, now + dur);
    const whineLp = ctx.createBiquadFilter();
    whineLp.type = "lowpass";
    whineLp.frequency.value = 600;
    const whineGain = ctx.createGain();
    whineGain.gain.setValueAtTime(0, now);
    whineGain.gain.linearRampToValueAtTime(0.06, now + 0.8);
    whineGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    whine.connect(whineLp).connect(whineGain).connect(master);
    whine.start(now);
    whine.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Triumphant horn for rebel logo */
function playTriumphantHorn() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 3;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, now);
    master.connect(ctx.destination);

    // Brass-like — two detuned square waves through lowpass
    const notes = [262, 330, 392]; // C E G — major chord
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.value = freq;
        const osc2 = ctx.createOscillator();
        osc2.type = "square";
        osc2.frequency.value = freq * 1.003;

        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 800;

        const g = ctx.createGain();
        const start = now + i * 0.15;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.08 - i * 0.015, start + 0.2);
        g.gain.setValueAtTime(0.08 - i * 0.015, start + 1.5);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);

        osc.connect(lp).connect(g).connect(master);
        osc2.connect(lp);
        osc.start(start);
        osc2.start(start);
        osc.stop(start + dur);
        osc2.stop(start + dur);
    });

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Hyperspace whoosh + boom */
function playHyperspaceSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.2, now);
    master.connect(ctx.destination);

    // Rising whoosh
    const whooshBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const wd = whooshBuf.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    const whoosh = ctx.createBufferSource();
    whoosh.buffer = whooshBuf;
    const whooshBP = ctx.createBiquadFilter();
    whooshBP.type = "bandpass";
    whooshBP.frequency.setValueAtTime(200, now);
    whooshBP.frequency.exponentialRampToValueAtTime(3000, now + 1.2);
    whooshBP.Q.value = 2;
    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0, now);
    whooshGain.gain.linearRampToValueAtTime(0.3, now + 0.8);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
    whoosh.connect(whooshBP).connect(whooshGain).connect(master);
    whoosh.start(now);
    whoosh.stop(now + 2);

    // Bass boom at jump
    const boom = ctx.createOscillator();
    boom.type = "sine";
    boom.frequency.setValueAtTime(60, now + 1.2);
    boom.frequency.exponentialRampToValueAtTime(30, now + 2);
    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(0, now + 1.2);
    boomGain.gain.linearRampToValueAtTime(0.35, now + 1.3);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
    boom.connect(boomGain).connect(master);
    boom.start(now + 1.2);
    boom.stop(now + 2.2);

    setTimeout(() => ctx.close(), 3500);
}

/** Jedi lightsaber — higher pitch than Dark Side */
function playJediSaberSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.18, now);
    master.connect(ctx.destination);

    // Ignition
    const snapBuf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const sd = snapBuf.getChannelData(0);
    for (let i = 0; i < sd.length; i++) sd[i] = Math.random() * 2 - 1;
    const snap = ctx.createBufferSource();
    snap.buffer = snapBuf;
    const snapBP = ctx.createBiquadFilter();
    snapBP.type = "bandpass";
    snapBP.frequency.value = 1200;
    snapBP.Q.value = 4;
    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.4, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    snap.connect(snapBP).connect(snapGain).connect(master);
    snap.start(now);
    snap.stop(now + 0.12);

    // Hum — higher than sith
    const hum = ctx.createOscillator();
    hum.type = "sawtooth";
    hum.frequency.value = 160;
    const hum2 = ctx.createOscillator();
    hum2.type = "sawtooth";
    hum2.frequency.value = 163;
    const humLP = ctx.createBiquadFilter();
    humLP.type = "lowpass";
    humLP.frequency.value = 500;
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0, now + 0.1);
    humGain.gain.linearRampToValueAtTime(0.1, now + 0.4);
    humGain.gain.setValueAtTime(0.1, now + 3.5);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 4.5);
    hum.connect(humLP).connect(humGain).connect(master);
    hum2.connect(humLP);
    hum.start(now + 0.1);
    hum2.start(now + 0.1);
    hum.stop(now + 4.5);
    hum2.stop(now + 4.5);

    setTimeout(() => ctx.close(), 5500);
}

/** The Force — ethereal chime + low hum */
function playForceSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, now);
    master.connect(ctx.destination);

    // Ethereal chime
    [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const g = ctx.createGain();
        const t = now + i * 0.3;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2);
        osc.connect(g).connect(master);
        osc.start(t);
        osc.stop(t + 2);
    });

    // Low hum
    const hum = ctx.createOscillator();
    hum.type = "triangle";
    hum.frequency.value = 80;
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0, now);
    humGain.gain.linearRampToValueAtTime(0.06, now + 0.5);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 4);
    hum.connect(humGain).connect(master);
    hum.start(now);
    hum.stop(now + 4);

    setTimeout(() => ctx.close(), 5000);
}

/** R2-D2 beep sequence */
function playR2D2Beeps() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, now);
    master.connect(ctx.destination);

    // Series of quick beeps at varying pitches
    const beeps = [
        { freq: 1800, start: 0, dur: 0.08 },
        { freq: 2200, start: 0.12, dur: 0.06 },
        { freq: 1600, start: 0.22, dur: 0.1 },
        { freq: 2400, start: 0.38, dur: 0.05 },
        { freq: 1400, start: 0.48, dur: 0.15 },
        { freq: 2000, start: 0.7, dur: 0.08 },
        { freq: 2600, start: 0.82, dur: 0.06 },
        { freq: 1800, start: 0.95, dur: 0.12 },
        { freq: 2200, start: 1.15, dur: 0.05 },
        { freq: 1500, start: 1.25, dur: 0.2 },
    ];

    beeps.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + start);
        // Quick pitch slide within each beep
        osc.frequency.linearRampToValueAtTime(freq * (0.9 + Math.random() * 0.2), now + start + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now + start);
        g.gain.linearRampToValueAtTime(0.15, now + start + 0.01);
        g.gain.setValueAtTime(0.15, now + start + dur * 0.7);
        g.gain.linearRampToValueAtTime(0, now + start + dur);
        osc.connect(g).connect(master);
        osc.start(now + start);
        osc.stop(now + start + dur);
    });

    setTimeout(() => ctx.close(), 3000);
}

/* ══════════════════════════════════════════
   SVGs
   ══════════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const xwingSrc = require("../../../static/x-wing.png");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const falconSrc = require("../../../static/falcon.png");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const r2d2Src = require("../../../static/r2-d2.png");

const XWingImg: React.FC<{ size: number }> = ({ size }) => (
    <img src={xwingSrc} alt="X-Wing" width={size} height={size} style={{ objectFit: "contain" }} />
);

const FalconImg: React.FC<{ size: number }> = ({ size }) => (
    <img src={falconSrc} alt="Millennium Falcon" width={size} height={size} style={{ objectFit: "contain" }} />
);

/** Rebel Alliance Starbird logo */
const RebelLogoSvg: React.FC<{ size: number }> = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer circle */}
        <circle cx="100" cy="100" r="90" stroke="rgba(245, 124, 0, 0.6)" strokeWidth="2" fill="none" />
        {/* Starbird — stylized phoenix */}
        <path
            d="M100 25 L95 60 L70 45 L88 75 L55 70 L85 90 L50 105 L85 105 L65 130 L90 115 L85 155 L100 125 L115 155 L110 115 L135 130 L115 105 L150 105 L115 90 L145 70 L112 75 L130 45 L105 60 Z"
            fill="rgba(245, 124, 0, 0.8)"
            stroke="rgba(255, 160, 50, 0.5)"
            strokeWidth="1"
            strokeLinejoin="round"
        />
        {/* Center circle */}
        <circle cx="100" cy="95" r="8" fill="rgba(245, 124, 0, 0.4)" />
    </svg>
);

const R2D2Img: React.FC<{ size: number }> = ({ size }) => (
    <img src={r2d2Src} alt="R2-D2" width={size} height={size} style={{ objectFit: "contain" }} />
);

/* ══════════════════════════════════════════
   DATA
   ══════════════════════════════════════════ */

const BASE_DURATIONS: Record<RebelEvent, number> = {
    xwing: 4000,
    falcon: 5000,
    logo: 7000,
    hyperspace: 3000,
    saber: 5000,
    force: 6000,
    r2d2: 5000,
};

function generateXWingSquadron() {
    const count = 3 + Math.floor(Math.random() * 3);
    return [...Array(count)].map((_, i) => ({
        top: 20 + i * 15 + Math.random() * 8,
        duration: 2.5 + Math.random() * 1,
        delay: i * 0.3,
        scale: 0.6 + Math.random() * 0.5,
    }));
}

function generateStars() {
    return [...Array(40)].map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2,
        driftDuration: 20 + Math.random() * 30,
        twinkleDuration: 2 + Math.random() * 4,
        delay: Math.random() * -20,
        brightness: 0.3 + Math.random() * 0.7,
    }));
}

function generateHyperLines() {
    return [...Array(30)].map(() => ({
        left: 20 + Math.random() * 60,
        top: 10 + Math.random() * 80,
        delay: Math.random() * 0.8,
    }));
}

function generateForceParticles() {
    return [...Array(15)].map(() => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 150;
        return {
            fx: Math.cos(angle) * dist + "px",
            fy: Math.sin(angle) * dist + "px",
            size: 3 + Math.random() * 6,
            delay: Math.random() * 1.5,
        };
    });
}

/* ══════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════ */

const RebelAllianceEffect: React.FC<{ silent?: boolean }> = ({ silent }) => {
    const [activeEvent, setActiveEvent] = useState<{ type: RebelEvent; key: number } | null>(null);
    const [saberColor, setSaberColor] = useState<"blue" | "green">("blue");
    const [squadron, setSquadron] = useState(generateXWingSquadron);
    const stars = useMemo(generateStars, []);
    const hyperLines = useMemo(generateHyperLines, []);
    const forceParticles = useMemo(generateForceParticles, []);
    const eventCounter = useRef(0);

    useEffect(() => {
        const queue: RebelEvent[] = [];
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
            const randomMultiplier = 1 + Math.random();
            const duration = Math.round(BASE_DURATIONS[event] * randomMultiplier);

            setActiveEvent({ type: event, key });
            if (event === "xwing") setSquadron(generateXWingSquadron());
            if (event === "saber") setSaberColor(Math.random() > 0.5 ? "blue" : "green");

            if (!silent) {
                if (event === "xwing") playXWingSound();
                if (event === "falcon") playFalconSound();
                if (event === "logo") playTriumphantHorn();
                if (event === "hyperspace") playHyperspaceSound();
                if (event === "saber") playJediSaberSound();
                if (event === "force") playForceSound();
                if (event === "r2d2") playR2D2Beeps();
            }

            setTimeout(() => setActiveEvent(null), duration);
            timer = setTimeout(scheduleNext, duration + 2000);
        }

        timer = setTimeout(scheduleNext, 2000);
        return () => clearTimeout(timer);
    }, [silent]);

    return (
        <>
            {/* Starfield — always present */}
            {stars.map((s, i) => (
                <div
                    key={`star-${i}`}
                    className={styles.star}
                    style={{
                        left: `${s.left}%`,
                        top: `${s.top}%`,
                        width: `${s.size}px`,
                        height: `${s.size}px`,
                        animationDuration: `${s.driftDuration}s, ${s.twinkleDuration}s`,
                        animationDelay: `${s.delay}s, ${s.delay}s`,
                        ["--star-brightness" as string]: s.brightness,
                    }}
                />
            ))}

            {/* X-Wing squadron — 3-5 staggered */}
            {activeEvent?.type === "xwing" && squadron.map((ship, i) => (
                <div
                    key={`xwing-${activeEvent.key}-${i}`}
                    className={styles.xwing}
                    style={{
                        top: `${ship.top}%`,
                        animationDuration: `${ship.duration}s`,
                        animationDelay: `${ship.delay}s`,
                        ["--ship-scale" as string]: ship.scale,
                    }}
                >
                    <XWingImg size={80} />
                </div>
            ))}

            {/* Millennium Falcon */}
            {activeEvent?.type === "falcon" && (
                <div key={`falcon-${activeEvent.key}`} className={styles.falcon}>
                    <FalconImg size={180} />
                </div>
            )}

            {/* Rebel Alliance logo */}
            {activeEvent?.type === "logo" && (
                <div key={`logo-${activeEvent.key}`} className={styles.rebelLogo}>
                    <RebelLogoSvg size={180} />
                </div>
            )}

            {/* Hyperspace jump */}
            {activeEvent?.type === "hyperspace" && (
                <>
                    {hyperLines.map((line, i) => (
                        <div
                            key={`hyper-${activeEvent.key}-${i}`}
                            className={styles.hyperLine}
                            style={{
                                left: `${line.left}%`,
                                top: `${line.top}%`,
                                animationDelay: `${line.delay}s`,
                            }}
                        />
                    ))}
                    <div key={`flash-${activeEvent.key}`} className={styles.hyperFlash} />
                </>
            )}

            {/* Jedi lightsaber */}
            {activeEvent?.type === "saber" && (
                <>
                    <div
                        key={`saber-${activeEvent.key}`}
                        className={`${styles.jediSaber} ${saberColor === "blue" ? styles.jediSaberBlue : styles.jediSaberGreen}`}
                    />
                    <div className={styles.saberHilt} />
                </>
            )}

            {/* The Force */}
            {activeEvent?.type === "force" && (
                <>
                    <div key={`force-${activeEvent.key}`} className={styles.forceGlow} />
                    {forceParticles.map((p, i) => (
                        <div
                            key={`fp-${activeEvent.key}-${i}`}
                            className={styles.forceParticle}
                            style={{
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                                animationDelay: `${p.delay}s`,
                                ["--fx" as string]: p.fx,
                                ["--fy" as string]: p.fy,
                            }}
                        />
                    ))}
                </>
            )}

            {/* R2-D2 */}
            {activeEvent?.type === "r2d2" && (
                <div key={`r2-${activeEvent.key}`} className={styles.r2d2}>
                    <div className={styles.r2d2Inner}>
                        <R2D2Img size={200} />
                    </div>
                </div>
            )}
        </>
    );
};

export default RebelAllianceEffect;
