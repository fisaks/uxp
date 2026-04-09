import React, { useEffect, useMemo, useRef, useState } from "react";
import * as styles from "./DarkSideEffect.module.css";

type DarkSideEvent = "saber" | "vader" | "maul" | "lightning" | "tie" | "choke";
const ALL_EVENTS: DarkSideEvent[] = ["saber", "vader", "maul", "lightning", "tie", "choke"];

/* ══════════════════════════════════════════
   SOUNDS
   ══════════════════════════════════════════ */

/** Vader breathing loop — two distinct phases per cycle:
 *  1. Inhale: short, sharp, higher pitched mechanical intake
 *  2. Exhale: longer, lower, resonant release through the mask
 *  Each breath is a scripted noise burst, not a continuous LFO. */
function createBreathingLoop(): { stop: () => void } {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.15;
    master.connect(ctx.destination);

    let stopped = false;
    const CYCLE = 2.8; // seconds per full breath

    function playBreath(startTime: number) {
        if (stopped) return;

        // ── Inhale: 0–0.8s — higher pitch, sharp attack ──
        const inhaleLen = 0.8;
        const inBuf = ctx.createBuffer(1, ctx.sampleRate * inhaleLen, ctx.sampleRate);
        const inData = inBuf.getChannelData(0);
        for (let i = 0; i < inData.length; i++) inData[i] = Math.random() * 2 - 1;

        const inSrc = ctx.createBufferSource();
        inSrc.buffer = inBuf;
        const inBP = ctx.createBiquadFilter();
        inBP.type = "bandpass";
        inBP.frequency.setValueAtTime(350, startTime);
        inBP.frequency.linearRampToValueAtTime(500, startTime + 0.3);
        inBP.frequency.linearRampToValueAtTime(300, startTime + inhaleLen);
        inBP.Q.value = 6;
        const inGain = ctx.createGain();
        inGain.gain.setValueAtTime(0, startTime);
        inGain.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
        inGain.gain.setValueAtTime(0.3, startTime + 0.4);
        inGain.gain.linearRampToValueAtTime(0, startTime + inhaleLen);
        inSrc.connect(inBP).connect(inGain).connect(master);
        inSrc.start(startTime);
        inSrc.stop(startTime + inhaleLen);

        // ── Exhale: 1.0–2.4s — lower pitch, longer, more resonant ──
        const exStart = startTime + 1.0;
        const exhaleLen = 1.4;
        const exBuf = ctx.createBuffer(1, ctx.sampleRate * exhaleLen, ctx.sampleRate);
        const exData = exBuf.getChannelData(0);
        for (let i = 0; i < exData.length; i++) exData[i] = Math.random() * 2 - 1;

        const exSrc = ctx.createBufferSource();
        exSrc.buffer = exBuf;
        const exBP = ctx.createBiquadFilter();
        exBP.type = "bandpass";
        exBP.frequency.setValueAtTime(250, exStart);
        exBP.frequency.linearRampToValueAtTime(180, exStart + exhaleLen);
        exBP.Q.value = 8;
        const exGain = ctx.createGain();
        exGain.gain.setValueAtTime(0, exStart);
        exGain.gain.linearRampToValueAtTime(0.25, exStart + 0.15);
        exGain.gain.setValueAtTime(0.25, exStart + 0.8);
        exGain.gain.linearRampToValueAtTime(0, exStart + exhaleLen);
        exSrc.connect(exBP).connect(exGain).connect(master);
        exSrc.start(exStart);
        exSrc.stop(exStart + exhaleLen);

        // Schedule next breath
        const nextTime = startTime + CYCLE;
        setTimeout(() => playBreath(nextTime), (CYCLE - 0.5) * 1000);
    }

    playBreath(ctx.currentTime + 0.5);

    return {
        stop: () => {
            stopped = true;
            master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
            setTimeout(() => ctx.close(), 1000);
        },
    };
}

/** Red lightsaber ignition + hum */
function playSaberSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.2, now);
    master.connect(ctx.destination);

    // Ignition snap — short burst of noise
    const snapBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
    const snapData = snapBuffer.getChannelData(0);
    for (let i = 0; i < snapData.length; i++) {
        snapData[i] = Math.random() * 2 - 1;
    }
    const snap = ctx.createBufferSource();
    snap.buffer = snapBuffer;
    const snapBP = ctx.createBiquadFilter();
    snapBP.type = "bandpass";
    snapBP.frequency.value = 800;
    snapBP.Q.value = 5;
    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.5, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    snap.connect(snapBP).connect(snapGain).connect(master);
    snap.start(now);
    snap.stop(now + 0.15);

    // Sustained hum — sawtooth through lowpass
    const hum = ctx.createOscillator();
    hum.type = "sawtooth";
    hum.frequency.value = 120;
    const hum2 = ctx.createOscillator();
    hum2.type = "sawtooth";
    hum2.frequency.value = 122; // slight detune for thickness
    const humLP = ctx.createBiquadFilter();
    humLP.type = "lowpass";
    humLP.frequency.value = 400;
    humLP.Q.value = 2;
    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0, now + 0.1);
    humGain.gain.linearRampToValueAtTime(0.12, now + 0.5);
    humGain.gain.setValueAtTime(0.12, now + 4);
    humGain.gain.exponentialRampToValueAtTime(0.001, now + 5.5);
    hum.connect(humLP).connect(humGain).connect(master);
    hum2.connect(humLP);
    hum.start(now + 0.1);
    hum2.start(now + 0.1);
    hum.stop(now + 5.5);
    hum2.stop(now + 5.5);

    // Hum vibrato
    const vib = ctx.createOscillator();
    vib.frequency.value = 30;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 3;
    vib.connect(vibGain).connect(hum.frequency);
    vib.connect(vibGain).connect(hum2.frequency);
    vib.start(now);
    vib.stop(now + 5.5);

    setTimeout(() => ctx.close(), 6500);
}

/** Sith lightning crackle */
function playLightningSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 3;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.2, now);
    master.connect(ctx.destination);

    // Rapid crackle bursts
    for (let i = 0; i < 8; i++) {
        const start = now + i * 0.25 + Math.random() * 0.15;
        const burstLen = 0.05 + Math.random() * 0.08;
        const buf = ctx.createBuffer(1, ctx.sampleRate * burstLen, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let j = 0; j < d.length; j++) {
            d[j] = Math.random() * 2 - 1;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 2000 + Math.random() * 2000;
        hp.Q.value = 3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.3 + Math.random() * 0.3, start);
        g.gain.exponentialRampToValueAtTime(0.001, start + burstLen);
        src.connect(hp).connect(g).connect(master);
        src.start(start);
        src.stop(start + burstLen);
    }

    // Electrical buzz undertone
    const buzz = ctx.createOscillator();
    buzz.type = "sawtooth";
    buzz.frequency.value = 60;
    const buzzDist = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = Math.tanh(x * 5);
    }
    buzzDist.curve = curve;
    const buzzGain = ctx.createGain();
    buzzGain.gain.setValueAtTime(0, now);
    buzzGain.gain.linearRampToValueAtTime(0.08, now + 0.3);
    buzzGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    buzz.connect(buzzDist).connect(buzzGain).connect(master);
    buzz.start(now);
    buzz.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** TIE fighter screech */
function playTieSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 2.5;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.15, now);
    master.connect(ctx.destination);

    // High-pitched screech — two detuned oscillators through distortion
    const osc1 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(800, now);
    osc1.frequency.exponentialRampToValueAtTime(600, now + 1);
    osc1.frequency.exponentialRampToValueAtTime(900, now + 2);
    osc1.frequency.exponentialRampToValueAtTime(500, now + dur);

    const osc2 = ctx.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.setValueAtTime(810, now);
    osc2.frequency.exponentialRampToValueAtTime(590, now + 1);
    osc2.frequency.exponentialRampToValueAtTime(920, now + 2);
    osc2.frequency.exponentialRampToValueAtTime(490, now + dur);

    const dist = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = Math.tanh(x * 3);
    }
    dist.curve = curve;

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2000;

    const gain = ctx.createGain();
    // Doppler: quiet → loud → quiet
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 1);
    gain.gain.setValueAtTime(0.2, now + 1.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc1.connect(dist).connect(lp).connect(gain).connect(master);
    osc2.connect(dist);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur);
    osc2.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Deep bass hit for Vader appearance */
function playVaderPresence() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.2, now);
    master.connect(ctx.destination);

    const bass = ctx.createOscillator();
    bass.type = "sine";
    bass.frequency.value = 40;
    const bassGain = ctx.createGain();
    bassGain.gain.setValueAtTime(0, now);
    bassGain.gain.linearRampToValueAtTime(0.3, now + 0.5);
    bassGain.gain.setValueAtTime(0.3, now + 2);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 4);
    bass.connect(bassGain).connect(master);
    bass.start(now);
    bass.stop(now + 4);

    setTimeout(() => ctx.close(), 5000);
}

/** Low menacing growl for Maul */
function playMaulGrowl() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 3;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.15, now);
    master.connect(ctx.destination);

    const growl = ctx.createOscillator();
    growl.type = "sawtooth";
    growl.frequency.setValueAtTime(70, now);
    growl.frequency.linearRampToValueAtTime(55, now + dur);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 250;
    lp.Q.value = 3;

    const dist = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = Math.tanh(x * 4);
    }
    dist.curve = curve;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.5);
    gain.gain.setValueAtTime(0.2, now + 2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    growl.connect(dist).connect(lp).connect(gain).connect(master);
    growl.start(now);
    growl.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Choking tension — rising tense tone */
function playChokeSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 5;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, now);
    master.connect(ctx.destination);

    const tone = ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.setValueAtTime(100, now);
    tone.frequency.exponentialRampToValueAtTime(200, now + 2.5);
    tone.frequency.exponentialRampToValueAtTime(100, now + dur);

    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(0, now);
    toneGain.gain.linearRampToValueAtTime(0.15, now + 1.5);
    toneGain.gain.setValueAtTime(0.15, now + 2.5);
    toneGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    tone.connect(toneGain).connect(master);
    tone.start(now);
    tone.stop(now + dur);

    // Gasping noise
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseBP = ctx.createBiquadFilter();
    noiseBP.type = "bandpass";
    noiseBP.frequency.value = 500;
    noiseBP.Q.value = 8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.06, now + 1);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    noise.connect(noiseBP).connect(noiseGain).connect(master);
    noise.start(now);
    noise.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/* ══════════════════════════════════════════
   SVGs
   ══════════════════════════════════════════ */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const vaderHelmetSrc = require("../../../static/darth-vader.png");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const maulFaceSrc = require("../../../static/darth-maul.png");

/** Darth Vader helmet — real image */
const VaderHelmetImg: React.FC<{ size: number }> = ({ size }) => (
    <img src={vaderHelmetSrc} alt="Darth Vader" width={size} height={size} style={{ objectFit: "contain" }} />
);

/** Darth Maul face — real image */
const MaulFaceImg: React.FC<{ size: number }> = ({ size }) => (
    <img src={maulFaceSrc} alt="Darth Maul" width={size} height={size} style={{ objectFit: "contain" }} />
);

/** TIE fighter — hexagonal wings + ball cockpit */
const TieFighterSvg: React.FC<{ size: number }> = ({ size }) => (
    <svg width={size} height={size * 0.6} viewBox="0 0 160 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left wing — hexagonal panel */}
        <polygon points="10,8 30,2 40,8 40,88 30,94 10,88" fill="#1a1a1a" stroke="rgba(100,100,100,0.6)" strokeWidth="1" />
        <line x1="15" y1="15" x2="15" y2="81" stroke="rgba(60,60,60,0.5)" strokeWidth="0.5" />
        <line x1="25" y1="6" x2="25" y2="90" stroke="rgba(60,60,60,0.5)" strokeWidth="0.5" />
        <line x1="35" y1="10" x2="35" y2="86" stroke="rgba(60,60,60,0.5)" strokeWidth="0.5" />
        {/* Right wing */}
        <polygon points="150,8 130,2 120,8 120,88 130,94 150,88" fill="#1a1a1a" stroke="rgba(100,100,100,0.6)" strokeWidth="1" />
        <line x1="145" y1="15" x2="145" y2="81" stroke="rgba(60,60,60,0.5)" strokeWidth="0.5" />
        <line x1="135" y1="6" x2="135" y2="90" stroke="rgba(60,60,60,0.5)" strokeWidth="0.5" />
        <line x1="125" y1="10" x2="125" y2="86" stroke="rgba(60,60,60,0.5)" strokeWidth="0.5" />
        {/* Struts */}
        <rect x="40" y="44" width="40" height="8" fill="#222" stroke="rgba(80,80,80,0.5)" strokeWidth="0.5" />
        <rect x="80" y="44" width="40" height="8" fill="#222" stroke="rgba(80,80,80,0.5)" strokeWidth="0.5" />
        {/* Ball cockpit */}
        <circle cx="80" cy="48" r="20" fill="#1a1a1a" stroke="rgba(100,100,100,0.6)" strokeWidth="1" />
        <circle cx="80" cy="48" r="8" fill="#0d0d0d" stroke="rgba(80,80,80,0.4)" strokeWidth="0.5" />
        {/* Cockpit window */}
        <circle cx="80" cy="48" r="5" fill="rgba(100,200,255,0.15)" />
    </svg>
);

/** Sith lightning bolt SVG */
const LightningSvg: React.FC<{ width: number; height: number }> = ({ width, height }) => (
    <svg width={width} height={height} viewBox="0 0 80 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M40 0 L30 80 L50 90 L25 180 L48 190 L20 300 L55 310 L15 400"
            stroke="rgba(150,100,255,0.9)"
            strokeWidth="3"
            fill="none"
        />
        <path
            d="M40 0 L30 80 L50 90 L25 180 L48 190 L20 300 L55 310 L15 400"
            stroke="rgba(200,170,255,0.5)"
            strokeWidth="6"
            fill="none"
        />
    </svg>
);

/* ══════════════════════════════════════════
   DATA GENERATORS
   ══════════════════════════════════════════ */

const BASE_DURATIONS: Record<DarkSideEvent, number> = {
    saber: 6000,
    vader: 8000,
    maul: 7000,
    lightning: 4000,
    tie: 3000,
    choke: 5000,
};

function generateLightningBolts() {
    return [...Array(5)].map(() => ({
        left: 10 + Math.random() * 80,
        top: 5 + Math.random() * 30,
        rotation: -20 + Math.random() * 40,
        delay: Math.random() * 0.5,
        width: 40 + Math.random() * 40,
        height: 200 + Math.random() * 200,
    }));
}

/* ══════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════ */

const DarkSideEffect: React.FC<{ silent?: boolean }> = ({ silent }) => {
    const [activeEvent, setActiveEvent] = useState<{ type: DarkSideEvent; key: number } | null>(null);
    const lightningBolts = useMemo(generateLightningBolts, []);
    const breathRef = useRef<{ stop: () => void } | null>(null);
    const eventCounter = useRef(0);

    // Breathing loop
    useEffect(() => {
        if (silent) return;
        breathRef.current = createBreathingLoop();
        return () => { breathRef.current?.stop(); };
    }, [silent]);

    // Shuffled event queue
    useEffect(() => {
        const queue: DarkSideEvent[] = [];
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

            if (!silent) {
                if (event === "saber") playSaberSound();
                if (event === "lightning") playLightningSound();
                if (event === "tie") playTieSound();
                if (event === "vader") playVaderPresence();
                if (event === "maul") playMaulGrowl();
                if (event === "choke") playChokeSound();
            }

            setTimeout(() => setActiveEvent(null), duration);
            timer = setTimeout(scheduleNext, duration + 2000);
        }

        timer = setTimeout(scheduleNext, 3000);
        return () => clearTimeout(timer);
    }, [silent]);

    return (
        <>
            {/* Ambient dark red glow */}
            <div className={styles.darkAmbient} />

            {/* Red lightsaber */}
            {activeEvent?.type === "saber" && (
                <>
                    <div key={`saber-${activeEvent.key}`} className={styles.saber} />
                    <div className={styles.saberHilt} />
                </>
            )}

            {/* Vader helmet — random position */}
            {activeEvent?.type === "vader" && (
                <div
                    key={`vader-${activeEvent.key}`}
                    className={styles.vaderHelmet}
                    style={{
                        left: `${20 + Math.random() * 60}%`,
                        top: `${15 + Math.random() * 50}%`,
                    }}
                >
                    <VaderHelmetImg size={200} />
                </div>
            )}

            {/* Darth Maul face — random position */}
            {activeEvent?.type === "maul" && (
                <div
                    key={`maul-${activeEvent.key}`}
                    className={styles.maulFace}
                    style={{
                        left: `${20 + Math.random() * 60}%`,
                        top: `${15 + Math.random() * 50}%`,
                    }}
                >
                    <MaulFaceImg size={180} />
                </div>
            )}

            {/* Sith lightning */}
            {activeEvent?.type === "lightning" && (
                <>
                    {lightningBolts.map((bolt, i) => (
                        <div
                            key={`bolt-${activeEvent.key}-${i}`}
                            className={styles.sithLightning}
                            style={{
                                left: `${bolt.left}%`,
                                top: `${bolt.top}%`,
                                transform: `rotate(${bolt.rotation}deg)`,
                                animationDelay: `${bolt.delay}s`,
                            }}
                        >
                            <LightningSvg width={bolt.width} height={bolt.height} />
                        </div>
                    ))}
                </>
            )}

            {/* TIE fighter squadron — 2-4 staggered flyby */}
            {activeEvent?.type === "tie" && [...Array(2 + Math.floor(Math.random() * 3))].map((_, i) => (
                <div
                    key={`tie-${activeEvent.key}-${i}`}
                    className={styles.tieFighter}
                    style={{
                        animationDelay: `${i * 0.4}s`,
                        animationDuration: `${2 + Math.random() * 1.5}s`,
                        top: `${15 + i * 18 + Math.random() * 10}%`,
                        transform: `scale(${0.6 + Math.random() * 0.5})`,
                    }}
                >
                    <TieFighterSvg size={120} />
                </div>
            ))}

            {/* Force choke vignette */}
            {activeEvent?.type === "choke" && (
                <div key={`choke-${activeEvent.key}`} className={styles.forceChoke} />
            )}
        </>
    );
};

export default DarkSideEffect;
