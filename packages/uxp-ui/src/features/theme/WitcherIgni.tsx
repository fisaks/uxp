import React, { useEffect, useMemo, useState, useCallback } from "react";
import * as styles from "./WitcherIgni.module.css";

const EMBER_COUNT = 25;
const CYCLE_INTERVAL = 26; // seconds between full cycles

/**
 * Synthesizes: cat eye open rumble → medallion hum → sword draw → Igni fire whoosh.
 */
function playWitcherSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.25, now);
    master.connect(ctx.destination);

    // ── Cat eye: deep ominous rumble ──
    const eyeRumble = ctx.createOscillator();
    eyeRumble.type = "sawtooth";
    eyeRumble.frequency.setValueAtTime(35, now);
    eyeRumble.frequency.linearRampToValueAtTime(50, now + 1.5);
    const eyeGain = ctx.createGain();
    eyeGain.gain.setValueAtTime(0, now);
    eyeGain.gain.linearRampToValueAtTime(0.12, now + 0.5);
    eyeGain.gain.linearRampToValueAtTime(0.15, now + 1.2);
    eyeGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
    eyeRumble.connect(eyeGain).connect(master);
    eyeRumble.start(now);
    eyeRumble.stop(now + 2);

    // ── Medallion: eerie vibrating hum ──
    const medStart = now + 3;
    const med1 = ctx.createOscillator();
    med1.type = "sine";
    med1.frequency.value = 220;
    const med2 = ctx.createOscillator();
    med2.type = "sine";
    med2.frequency.value = 223; // slight detune = beating/vibration

    // Tremolo LFO for the vibrating effect
    const tremolo = ctx.createOscillator();
    tremolo.frequency.value = 8;
    const tremoloGain = ctx.createGain();
    tremoloGain.gain.value = 0.08;
    tremolo.connect(tremoloGain);

    const medGain = ctx.createGain();
    medGain.gain.setValueAtTime(0, medStart);
    medGain.gain.linearRampToValueAtTime(0.1, medStart + 0.3);
    medGain.gain.linearRampToValueAtTime(0.12, medStart + 1);
    medGain.gain.exponentialRampToValueAtTime(0.001, medStart + 2);
    tremoloGain.connect(medGain.gain);

    med1.connect(medGain).connect(master);
    med2.connect(medGain);
    tremolo.start(medStart);
    med1.start(medStart);
    med2.start(medStart);
    tremolo.stop(medStart + 2);
    med1.stop(medStart + 2);
    med2.stop(medStart + 2);

    // ── Sword draw: metallic scrape ──
    const swordStart = now + 6;

    const scrapeBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.7, ctx.sampleRate);
    const scrapeData = scrapeBuffer.getChannelData(0);
    for (let i = 0; i < scrapeData.length; i++) {
        scrapeData[i] = Math.random() * 2 - 1;
    }
    const scrape = ctx.createBufferSource();
    scrape.buffer = scrapeBuffer;

    const scrapeFilter = ctx.createBiquadFilter();
    scrapeFilter.type = "bandpass";
    scrapeFilter.Q.value = 15;
    scrapeFilter.frequency.setValueAtTime(3000, swordStart);
    scrapeFilter.frequency.exponentialRampToValueAtTime(6000, swordStart + 0.2);
    scrapeFilter.frequency.exponentialRampToValueAtTime(2000, swordStart + 0.6);

    const scrapeGain = ctx.createGain();
    scrapeGain.gain.setValueAtTime(0.4, swordStart);
    scrapeGain.gain.linearRampToValueAtTime(0.5, swordStart + 0.15);
    scrapeGain.gain.exponentialRampToValueAtTime(0.001, swordStart + 0.7);

    const ringFilter = ctx.createBiquadFilter();
    ringFilter.type = "bandpass";
    ringFilter.Q.value = 25;
    ringFilter.frequency.setValueAtTime(5500, swordStart);
    ringFilter.frequency.exponentialRampToValueAtTime(4000, swordStart + 0.5);
    const ringGain = ctx.createGain();
    ringGain.gain.setValueAtTime(0.15, swordStart);
    ringGain.gain.exponentialRampToValueAtTime(0.001, swordStart + 0.6);

    scrape.connect(scrapeFilter).connect(scrapeGain).connect(master);
    scrape.connect(ringFilter).connect(ringGain).connect(master);
    scrape.start(swordStart);
    scrape.stop(swordStart + 0.7);

    // Metallic ping
    const ping = ctx.createOscillator();
    ping.type = "sine";
    ping.frequency.setValueAtTime(4200, swordStart + 0.15);
    ping.frequency.exponentialRampToValueAtTime(3800, swordStart + 0.6);
    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0, swordStart);
    pingGain.gain.linearRampToValueAtTime(0.08, swordStart + 0.2);
    pingGain.gain.exponentialRampToValueAtTime(0.001, swordStart + 0.7);
    ping.connect(pingGain).connect(master);
    ping.start(swordStart + 0.15);
    ping.stop(swordStart + 0.7);

    // ── Igni cast: fire whoosh ──
    const igniStart = now + 8.3;

    const whooshBuffer = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const whooshData = whooshBuffer.getChannelData(0);
    for (let i = 0; i < whooshData.length; i++) {
        whooshData[i] = Math.random() * 2 - 1;
    }
    const whoosh = ctx.createBufferSource();
    whoosh.buffer = whooshBuffer;
    const whooshFilter = ctx.createBiquadFilter();
    whooshFilter.type = "bandpass";
    whooshFilter.Q.value = 3;
    whooshFilter.frequency.setValueAtTime(200, igniStart);
    whooshFilter.frequency.exponentialRampToValueAtTime(2000, igniStart + 0.3);
    whooshFilter.frequency.exponentialRampToValueAtTime(600, igniStart + 1.2);
    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0, igniStart);
    whooshGain.gain.linearRampToValueAtTime(0.35, igniStart + 0.15);
    whooshGain.gain.linearRampToValueAtTime(0.25, igniStart + 0.5);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, igniStart + 1.4);
    whoosh.connect(whooshFilter).connect(whooshGain).connect(master);
    whoosh.start(igniStart);
    whoosh.stop(igniStart + 1.5);

    // Fire crackle
    const crackleBuffer = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
    const crackleData = crackleBuffer.getChannelData(0);
    for (let i = 0; i < crackleData.length; i++) {
        crackleData[i] = Math.random() > 0.92 ? (Math.random() * 2 - 1) : crackleData[i - 1] * 0.7 || 0;
    }
    const crackle = ctx.createBufferSource();
    crackle.buffer = crackleBuffer;
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = "highpass";
    crackleFilter.frequency.value = 1000;
    const crackleGain = ctx.createGain();
    crackleGain.gain.setValueAtTime(0, igniStart + 0.2);
    crackleGain.gain.linearRampToValueAtTime(0.2, igniStart + 0.4);
    crackleGain.gain.exponentialRampToValueAtTime(0.001, igniStart + 1.2);
    crackle.connect(crackleFilter).connect(crackleGain).connect(master);
    crackle.start(igniStart + 0.2);
    crackle.stop(igniStart + 1.4);

    // Fire rumble
    const fireRumble = ctx.createOscillator();
    fireRumble.type = "sawtooth";
    fireRumble.frequency.setValueAtTime(60, igniStart);
    fireRumble.frequency.linearRampToValueAtTime(40, igniStart + 1.2);
    const fireGain = ctx.createGain();
    fireGain.gain.setValueAtTime(0, igniStart);
    fireGain.gain.linearRampToValueAtTime(0.15, igniStart + 0.3);
    fireGain.gain.exponentialRampToValueAtTime(0.001, igniStart + 1.2);
    const fireDistortion = ctx.createWaveShaper();
    const fireCurve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        fireCurve[i] = Math.tanh(x * 3);
    }
    fireDistortion.curve = fireCurve;
    fireRumble.connect(fireDistortion).connect(fireGain).connect(master);
    fireRumble.start(igniStart);
    fireRumble.stop(igniStart + 1.3);

    setTimeout(() => ctx.close(), 11000);
}

function generateEmbers() {
    return [...Array(EMBER_COUNT)].map((_, i) => ({
        left: 30 + Math.random() * 40,
        top: 40 + Math.random() * 30,
        size: 2 + Math.random() * 5,
        duration: 2 + Math.random() * 3,
        delay: Math.random() * 4,
        rise: -(100 + Math.random() * 250) + "px",
        drift: (-60 + Math.random() * 120) + "px",
        variant: i % 3 === 0 ? "red" : "orange",
    }));
}

/* ── SVG Components ── */

/** Witcher cat eye — amber iris with vertical slit pupil */
const CatEyeSvg: React.FC<{ size: number }> = ({ size }) => (
    <svg width={size} height={size * 0.45} viewBox="0 0 300 135" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Eye shape — almond / cat-like */}
        <defs>
            <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffb300" />
                <stop offset="40%" stopColor="#e68a00" />
                <stop offset="70%" stopColor="#bf6000" />
                <stop offset="100%" stopColor="#6b3a00" />
            </radialGradient>
            <radialGradient id="eyeGlow" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="rgba(255,179,0,0.3)" />
                <stop offset="100%" stopColor="transparent" />
            </radialGradient>
        </defs>

        {/* Outer glow */}
        <ellipse cx="150" cy="67" rx="145" ry="65" fill="url(#eyeGlow)" />

        {/* Eye outline — sharp almond shape */}
        <path
            d="M5 67 Q75 5 150 5 Q225 5 295 67 Q225 130 150 130 Q75 130 5 67 Z"
            fill="#1a1008"
            stroke="rgba(212,160,74,0.4)"
            strokeWidth="1.5"
        />

        {/* Iris */}
        <circle cx="150" cy="67" r="45" fill="url(#irisGrad)" />

        {/* Iris detail rings */}
        <circle cx="150" cy="67" r="45" fill="none" stroke="rgba(255,179,0,0.3)" strokeWidth="0.5" />
        <circle cx="150" cy="67" r="35" fill="none" stroke="rgba(191,96,0,0.4)" strokeWidth="0.5" />
        <circle cx="150" cy="67" r="25" fill="none" stroke="rgba(107,58,0,0.3)" strokeWidth="0.5" />

        {/* Iris radial lines — texture */}
        {[...Array(16)].map((_, i) => {
            const angle = (i / 16) * Math.PI * 2;
            const x1 = 150 + Math.cos(angle) * 20;
            const y1 = 67 + Math.sin(angle) * 20;
            const x2 = 150 + Math.cos(angle) * 44;
            const y2 = 67 + Math.sin(angle) * 44;
            return (
                <line
                    key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="rgba(107,58,0,0.25)"
                    strokeWidth="1"
                />
            );
        })}

        {/* Vertical slit pupil — the signature Witcher look */}
        <ellipse cx="150" cy="67" rx="6" ry="38" fill="#0a0600" />
        <ellipse cx="150" cy="67" rx="4" ry="35" fill="#000000" />

        {/* Light reflection */}
        <ellipse cx="138" cy="52" rx="5" ry="7" fill="rgba(255,255,255,0.25)" />
        <ellipse cx="160" cy="78" rx="3" ry="4" fill="rgba(255,255,255,0.1)" />
    </svg>
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const witcherMedallionSrc = require("../../../static/witcher-medallion.png");

/** Wolf School medallion — real image with glow */
const WolfMedallionImg: React.FC<{ size: number }> = ({ size }) => (
    <img
        src={witcherMedallionSrc}
        alt="Wolf School Medallion"
        width={size}
        height={size}
        style={{ objectFit: "contain" }}
    />
);
/** Silver Witcher sword */
const SwordSvg: React.FC<{ length: number }> = ({ length }) => (
    <svg width={length} height={40} viewBox="0 0 500 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="rgba(200,200,210,0.1)" />
                <stop offset="20%" stopColor="rgba(220,220,230,0.7)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.95)" />
                <stop offset="80%" stopColor="rgba(220,220,230,0.7)" />
                <stop offset="100%" stopColor="rgba(240,240,245,0.9)" />
            </linearGradient>
            <linearGradient id="bladeEdge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="50%" stopColor="rgba(200,200,210,0.6)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.8)" />
            </linearGradient>
        </defs>

        {/* Blade — long tapered */}
        <polygon
            points="70,17 495,19 500,20 495,21 70,23"
            fill="url(#bladeGrad)"
            stroke="url(#bladeEdge)"
            strokeWidth="0.5"
        />
        {/* Fuller (groove in blade) */}
        <line x1="85" y1="20" x2="450" y2="20" stroke="rgba(160,160,170,0.4)" strokeWidth="1" />

        {/* Crossguard */}
        <rect x="58" y="8" width="16" height="24" rx="2" fill="rgba(140,130,100,0.9)" stroke="rgba(100,90,70,0.6)" strokeWidth="1" />
        {/* Crossguard ornament */}
        <circle cx="66" cy="14" r="2" fill="rgba(212,160,74,0.7)" />
        <circle cx="66" cy="26" r="2" fill="rgba(212,160,74,0.7)" />

        {/* Grip — leather wrapped */}
        <rect x="20" y="15" width="40" height="10" rx="3" fill="rgba(80,60,40,0.9)" />
        {/* Leather wrap lines */}
        <line x1="28" y1="15" x2="25" y2="25" stroke="rgba(60,45,30,0.6)" strokeWidth="1.5" />
        <line x1="35" y1="15" x2="32" y2="25" stroke="rgba(60,45,30,0.6)" strokeWidth="1.5" />
        <line x1="42" y1="15" x2="39" y2="25" stroke="rgba(60,45,30,0.6)" strokeWidth="1.5" />
        <line x1="49" y1="15" x2="46" y2="25" stroke="rgba(60,45,30,0.6)" strokeWidth="1.5" />

        {/* Pommel — wolf head small */}
        <circle cx="12" cy="20" r="10" fill="rgba(160,150,130,0.9)" stroke="rgba(120,110,90,0.6)" strokeWidth="1" />
        <circle cx="12" cy="20" r="6" fill="rgba(212,160,74,0.3)" />
        <circle cx="12" cy="20" r="2" fill="rgba(212,160,74,0.6)" />
    </svg>
);

/** Igni fire sign */
const IgniSignSvg: React.FC<{ size: number }> = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="90" stroke="rgba(230, 126, 34, 0.8)" strokeWidth="3" fill="none" />
        <circle cx="100" cy="100" r="85" stroke="rgba(192, 57, 43, 0.4)" strokeWidth="1" fill="none" />
        <polygon
            points="100,25 170,155 30,155"
            stroke="rgba(230, 126, 34, 0.9)"
            strokeWidth="3"
            fill="rgba(230, 126, 34, 0.08)"
            strokeLinejoin="round"
        />
        <path d="M100 45 Q90 90 100 110 Q110 90 100 45" stroke="rgba(255, 180, 50, 0.7)" strokeWidth="2" fill="rgba(255, 180, 50, 0.1)" />
        <path d="M80 120 Q85 100 95 105 Q88 115 80 120" stroke="rgba(230, 126, 34, 0.5)" strokeWidth="1.5" fill="none" />
        <path d="M120 120 Q115 100 105 105 Q112 115 120 120" stroke="rgba(230, 126, 34, 0.5)" strokeWidth="1.5" fill="none" />
        <line x1="100" y1="8" x2="100" y2="18" stroke="rgba(212, 160, 74, 0.6)" strokeWidth="2" />
        <line x1="100" y1="182" x2="100" y2="192" stroke="rgba(212, 160, 74, 0.6)" strokeWidth="2" />
        <line x1="8" y1="100" x2="18" y2="100" stroke="rgba(212, 160, 74, 0.6)" strokeWidth="2" />
        <line x1="182" y1="100" x2="192" y2="100" stroke="rgba(212, 160, 74, 0.6)" strokeWidth="2" />
    </svg>
);

const WitcherIgni: React.FC<{ silent?: boolean }> = ({ silent }) => {
    const [cycle, setCycle] = useState(0);
    const [phase, setPhase] = useState<"eye" | "medallion" | "sword" | "igni" | "idle">("eye");
    const [showSwords, setShowSwords] = useState(false);
    const [showIgni, setShowIgni] = useState(false);
    const embers = useMemo(generateEmbers, []);

    const cast = useCallback(() => {
        setPhase("eye");
        setShowSwords(false);
        setShowIgni(false);
        if (!silent) playWitcherSound();

        // Medallion after eye opens
        setTimeout(() => setPhase("medallion"), 3000);
        // Swords start
        setTimeout(() => { setPhase("sword"); setShowSwords(true); }, 6000);
        // Igni fades in while swords still retreating
        setTimeout(() => { setShowIgni(true); setPhase("igni"); }, 8300);
        // Swords finish their exit animation and disappear
        setTimeout(() => setShowSwords(false), 9500);
        // Idle
        setTimeout(() => { setShowIgni(false); setPhase("idle"); }, 20000);
    }, []);

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        cast();

        const interval = setInterval(() => {
            setCycle(c => c + 1);
            cast();
        }, CYCLE_INTERVAL * 1000);

        return () => {
            clearInterval(interval);
            timers.forEach(clearTimeout);
        };
    }, [cast]);

    return (
        <>
            {/* Ambient fire glow — always present */}
            <div className={styles.fireAmbient} />

            {/* 1. Cat eye — blinks open */}
            {phase === "eye" && (
                <div key={`eye-${cycle}`} className={styles.catEye}>
                    <CatEyeSvg size={280} />
                </div>
            )}

            {/* 2. Wolf medallion — vibrates */}
            {phase === "medallion" && (
                <div key={`medal-${cycle}`} className={styles.medallion}>
                    <div className={styles.medallionVibrate}>
                        <WolfMedallionImg size={140} />
                    </div>
                </div>
            )}

            {/* 3. Sword fight — two blades clash */}
            {showSwords && (
                <>
                    <div key={`swordL-${cycle}`} className={styles.swordLeft}>
                        <SwordSvg length={400} />
                    </div>
                    <div key={`swordR-${cycle}`} className={styles.swordRight}>
                        <SwordSvg length={400} />
                    </div>
                    {/* Sparks on each clash (timed to 27%, 38%, 50% of 3.5s) */}
                    {[0.95, 1.33, 1.75].map((delay, i) => (
                        <div
                            key={`spark-${cycle}-${i}`}
                            className={styles.clashSpark}
                            style={{ animationDelay: `${delay}s` }}
                        />
                    ))}
                </>
            )}

            {/* 4. Igni sign — burns */}
            {showIgni && (
                <>
                    <div key={`igni-${cycle}`} className={styles.igniSign}>
                        <div className={styles.igniSignInner}>
                            <IgniSignSvg size={160} />
                        </div>
                    </div>
                    {embers.map((e, i) => (
                        <div
                            key={`ember-${cycle}-${i}`}
                            className={`${styles.ember} ${e.variant === "red" ? styles.emberRed : styles.emberOrange}`}
                            style={{
                                left: `${e.left}%`,
                                top: `${e.top}%`,
                                width: `${e.size}px`,
                                height: `${e.size}px`,
                                animationDuration: `${e.duration}s, 0.3s`,
                                animationDelay: `${e.delay}s, 0s`,
                                ["--rise" as string]: e.rise,
                                ["--drift" as string]: e.drift,
                            }}
                        />
                    ))}
                </>
            )}
        </>
    );
};

export default WitcherIgni;
