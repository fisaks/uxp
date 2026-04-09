import React, { useEffect, useMemo, useRef, useState } from "react";
import * as styles from "./GodzillaStrike.module.css";

const PARTICLE_COUNT = 15;
const ROAR_DURATION = 2.5; // seconds
const BEAM_DURATION = 12; // seconds — matches CSS beamBreath animation
const ROAR_INTERVAL_MIN = 60; // seconds between roar cycles
const ROAR_INTERVAL_MAX = 90;
const MINI_EVENT_INTERVAL_MIN = 8; // seconds between mini events
const MINI_EVENT_INTERVAL_MAX = 14;

type MiniEvent = "pulse" | "emp" | "stomp" | "smoke" | "rodan" | "tsunami";
const ALL_MINI_EVENTS: MiniEvent[] = ["pulse", "emp", "stomp", "smoke", "rodan", "tsunami"];

/* ══════════════════════════════════════════
   SOUNDS
   ══════════════════════════════════════════ */

/**
 * Synthesizes a Godzilla roar using Web Audio API.
 * (existing roar — unchanged)
 */
function playGodzillaRoar() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = ROAR_DURATION;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0, now);
    master.gain.linearRampToValueAtTime(0.35, now + 0.08);
    master.gain.setValueAtTime(0.35, now + 0.5);
    master.gain.linearRampToValueAtTime(0.30, now + dur * 0.7);
    master.gain.exponentialRampToValueAtTime(0.001, now + dur);
    master.connect(ctx.destination);

    const distortion = ctx.createWaveShaper();
    const samples = 512;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        curve[i] = Math.tanh(x * 2.5) * 0.8 + Math.tanh(x * 8) * 0.2;
    }
    distortion.curve = curve;
    distortion.oversample = "4x";
    distortion.connect(master);

    const screech = ctx.createOscillator();
    screech.type = "sawtooth";
    screech.frequency.setValueAtTime(350, now);
    screech.frequency.exponentialRampToValueAtTime(950, now + 0.15);
    screech.frequency.setValueAtTime(950, now + 0.25);
    screech.frequency.exponentialRampToValueAtTime(600, now + 0.8);
    screech.frequency.exponentialRampToValueAtTime(250, now + dur * 0.7);
    screech.frequency.exponentialRampToValueAtTime(120, now + dur);

    const fmMod = ctx.createOscillator();
    fmMod.frequency.setValueAtTime(140, now);
    fmMod.frequency.linearRampToValueAtTime(80, now + dur);
    const fmGain = ctx.createGain();
    fmGain.gain.setValueAtTime(180, now);
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

    const metalBuffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const metalData = metalBuffer.getChannelData(0);
    for (let i = 0; i < metalData.length; i++) metalData[i] = Math.random() * 2 - 1;
    const metalNoise = ctx.createBufferSource();
    metalNoise.buffer = metalBuffer;
    const metalFilter = ctx.createBiquadFilter();
    metalFilter.type = "bandpass";
    metalFilter.Q.value = 12;
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

    const dissonantFreqs = [1.47, 2.1, 3.3];
    dissonantFreqs.forEach((ratio, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx === 0 ? "sawtooth" : "square";
        osc.frequency.setValueAtTime(350 * ratio, now);
        osc.frequency.exponentialRampToValueAtTime(950 * ratio, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(600 * ratio, now + 0.8);
        osc.frequency.exponentialRampToValueAtTime(120 * ratio, now + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.06 - idx * 0.015, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.8);
        osc.connect(g).connect(distortion);
        osc.start(now);
        osc.stop(now + dur);
    });

    const rumble = ctx.createOscillator();
    rumble.type = "triangle";
    rumble.frequency.setValueAtTime(45, now);
    rumble.frequency.linearRampToValueAtTime(30, now + dur);
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(0.45, now + 0.4);
    rumbleGain.gain.setValueAtTime(0.45, now + dur * 0.5);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    rumble.connect(rumbleGain).connect(master);
    rumble.start(now);
    rumble.stop(now + dur);

    const breathBuffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const breathData = breathBuffer.getChannelData(0);
    for (let i = 0; i < breathData.length; i++) breathData[i] = Math.random() * 2 - 1;
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

    const attackBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    const attackData = attackBuffer.getChannelData(0);
    for (let i = 0; i < attackData.length; i++) attackData[i] = Math.random() * 2 - 1;
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

/** Atomic breath beam sustain — deep plasma drone while beam is active */
function playBeamSustain() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = BEAM_DURATION;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, now);
    master.connect(ctx.destination);

    // Deep electrical drone — two detuned sawtooths through lowpass
    const drone1 = ctx.createOscillator();
    drone1.type = "sawtooth";
    drone1.frequency.value = 70;
    const drone2 = ctx.createOscillator();
    drone2.type = "sawtooth";
    drone2.frequency.value = 73;
    const droneLp = ctx.createBiquadFilter();
    droneLp.type = "lowpass";
    droneLp.frequency.value = 250;
    droneLp.Q.value = 2;
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.linearRampToValueAtTime(0.12, now + 0.5);
    droneGain.gain.setValueAtTime(0.12, now + dur * 0.8);
    droneGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    drone1.connect(droneLp).connect(droneGain).connect(master);
    drone2.connect(droneLp);
    drone1.start(now);
    drone2.start(now);
    drone1.stop(now + dur);
    drone2.stop(now + dur);

    // Crackling energy overlay — rapid noise bursts
    const crackBuf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const cd = crackBuf.getChannelData(0);
    for (let i = 0; i < cd.length; i++) {
        cd[i] = Math.random() > 0.85 ? (Math.random() * 2 - 1) : cd[i - 1] * 0.6 || 0;
    }
    const crack = ctx.createBufferSource();
    crack.buffer = crackBuf;
    const crackHP = ctx.createBiquadFilter();
    crackHP.type = "highpass";
    crackHP.frequency.value = 1500;
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0, now);
    crackGain.gain.linearRampToValueAtTime(0.06, now + 1);
    crackGain.gain.setValueAtTime(0.06, now + dur * 0.8);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    crack.connect(crackHP).connect(crackGain).connect(master);
    crack.start(now);
    crack.stop(now + dur);

    // Rushing air / plasma flow — bandpass noise
    const rushBuf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const rd = rushBuf.getChannelData(0);
    for (let i = 0; i < rd.length; i++) rd[i] = Math.random() * 2 - 1;
    const rush = ctx.createBufferSource();
    rush.buffer = rushBuf;
    const rushBP = ctx.createBiquadFilter();
    rushBP.type = "bandpass";
    rushBP.frequency.value = 400;
    rushBP.Q.value = 1.5;
    const rushGain = ctx.createGain();
    rushGain.gain.setValueAtTime(0, now);
    rushGain.gain.linearRampToValueAtTime(0.08, now + 0.8);
    rushGain.gain.setValueAtTime(0.08, now + dur * 0.8);
    rushGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    rush.connect(rushBP).connect(rushGain).connect(master);
    rush.start(now);
    rush.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Dorsal fin charge-up sound — ascending electrical buzz */
function playFinChargeSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 4;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.1, now);
    master.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(200, now);
    lp.frequency.exponentialRampToValueAtTime(1000, now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.15, now + 1);
    g.gain.setValueAtTime(0.15, now + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(lp).connect(g).connect(master);
    osc.start(now);
    osc.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Nuclear pulse — deep boom + reverb ring */
function playNuclearPulseSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.2, now);
    master.connect(ctx.destination);

    const boom = ctx.createOscillator();
    boom.type = "sine";
    boom.frequency.setValueAtTime(50, now);
    boom.frequency.exponentialRampToValueAtTime(20, now + 1.5);
    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(0.4, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
    boom.connect(boomGain).connect(master);
    boom.start(now);
    boom.stop(now + 2);

    // Ring
    const ring = ctx.createOscillator();
    ring.type = "sine";
    ring.frequency.value = 200;
    const ringGain = ctx.createGain();
    ringGain.gain.setValueAtTime(0.1, now + 0.2);
    ringGain.gain.exponentialRampToValueAtTime(0.001, now + 3);
    ring.connect(ringGain).connect(master);
    ring.start(now + 0.2);
    ring.stop(now + 3);

    setTimeout(() => ctx.close(), 4000);
}

/** Stomp — heavy bass impact */
function playStompSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.25, now);
    master.connect(ctx.destination);

    // Impact
    const impact = ctx.createOscillator();
    impact.type = "sine";
    impact.frequency.setValueAtTime(60, now);
    impact.frequency.exponentialRampToValueAtTime(25, now + 0.5);
    const impactGain = ctx.createGain();
    impactGain.gain.setValueAtTime(0.5, now);
    impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    impact.connect(impactGain).connect(master);
    impact.start(now);
    impact.stop(now + 0.6);

    // Rumble
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 150;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    noise.connect(lp).connect(noiseGain).connect(master);
    noise.start(now);
    noise.stop(now + 1.5);

    setTimeout(() => ctx.close(), 2500);
}

/** EMP pulse — electrical zap + static crackle + power-down whine */
function playEmpSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.18, now);
    master.connect(ctx.destination);

    // Initial zap
    const zapBuf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const zd = zapBuf.getChannelData(0);
    for (let i = 0; i < zd.length; i++) zd[i] = Math.random() * 2 - 1;
    const zap = ctx.createBufferSource();
    zap.buffer = zapBuf;
    const zapHP = ctx.createBiquadFilter();
    zapHP.type = "highpass";
    zapHP.frequency.value = 3000;
    const zapGain = ctx.createGain();
    zapGain.gain.setValueAtTime(0.5, now);
    zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    zap.connect(zapHP).connect(zapGain).connect(master);
    zap.start(now);
    zap.stop(now + 0.1);

    // Power-down whine — descending tone
    const whine = ctx.createOscillator();
    whine.type = "sine";
    whine.frequency.setValueAtTime(800, now + 0.1);
    whine.frequency.exponentialRampToValueAtTime(30, now + 2.5);
    const whineGain = ctx.createGain();
    whineGain.gain.setValueAtTime(0.12, now + 0.1);
    whineGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    whine.connect(whineGain).connect(master);
    whine.start(now + 0.1);
    whine.stop(now + 2.5);

    setTimeout(() => ctx.close(), 3500);
}

/** Tsunami — deep surging water roar */
function playTsunamiSound() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 5;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.15, now);
    master.connect(ctx.destination);

    // Deep water surge — lowpass noise building up
    const waveBuf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const wd = waveBuf.getChannelData(0);
    for (let i = 0; i < wd.length; i++) wd[i] = Math.random() * 2 - 1;
    const wave = ctx.createBufferSource();
    wave.buffer = waveBuf;
    const waveLP = ctx.createBiquadFilter();
    waveLP.type = "lowpass";
    waveLP.frequency.setValueAtTime(100, now);
    waveLP.frequency.exponentialRampToValueAtTime(600, now + 2);
    waveLP.frequency.exponentialRampToValueAtTime(200, now + dur);
    waveLP.Q.value = 1.5;
    const waveGain = ctx.createGain();
    waveGain.gain.setValueAtTime(0, now);
    waveGain.gain.linearRampToValueAtTime(0.25, now + 1.5);
    waveGain.gain.setValueAtTime(0.25, now + 3);
    waveGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    wave.connect(waveLP).connect(waveGain).connect(master);
    wave.start(now);
    wave.stop(now + dur);

    // Sub rumble underneath
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(30, now);
    sub.frequency.linearRampToValueAtTime(50, now + 2);
    sub.frequency.linearRampToValueAtTime(25, now + dur);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.2, now + 1);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);
    sub.connect(subGain).connect(master);
    sub.start(now);
    sub.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/** Rodan screech — high pitched pteranodon cry */
function playRodanScreech() {
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const dur = 2;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.12, now);
    master.connect(ctx.destination);

    const screech = ctx.createOscillator();
    screech.type = "sawtooth";
    screech.frequency.setValueAtTime(600, now);
    screech.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
    screech.frequency.exponentialRampToValueAtTime(800, now + 1);
    screech.frequency.exponentialRampToValueAtTime(400, now + dur);

    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2000;

    const dist = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = Math.tanh(x * 3);
    }
    dist.curve = curve;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.2, now + 0.15);
    g.gain.setValueAtTime(0.2, now + 0.8);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    screech.connect(dist).connect(lp).connect(g).connect(master);
    screech.start(now);
    screech.stop(now + dur);

    setTimeout(() => ctx.close(), (dur + 1) * 1000);
}

/* ══════════════════════════════════════════
   SVGs
   ══════════════════════════════════════════ */


/** Dorsal fin spine SVG */
const DorsalFinSvg: React.FC<{ height: number }> = ({ height }) => (
    <svg width={30} height={height} viewBox="0 0 30 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0 L5 70 Q15 80 25 70 Z"
            fill="rgba(50, 140, 255, 0.6)"
            stroke="rgba(80, 180, 255, 0.8)"
            strokeWidth="1"
        />
        <path d="M15 5 L10 60 Q15 65 20 60 Z" fill="rgba(150, 220, 255, 0.4)" />
    </svg>
);

/** Rodan silhouette — pteranodon-like shadow */
const RodanSvg: React.FC<{ size: number }> = ({ size }) => (
    <svg width={size} height={size * 0.4} viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M100 35 L5 10 Q15 25 40 30 L80 35 M100 35 L195 10 Q185 25 160 30 L120 35 M100 35 L95 50 Q100 60 105 50 Z"
            fill="rgba(30,30,30,0.8)"
            stroke="rgba(60,60,60,0.4)"
            strokeWidth="0.5"
        />
        <circle cx="95" cy="33" r="2" fill="rgba(255,100,0,0.6)" />
        <circle cx="105" cy="33" r="2" fill="rgba(255,100,0,0.6)" />
    </svg>
);

/* ══════════════════════════════════════════
   DATA GENERATORS
   ══════════════════════════════════════════ */

function generateParticles() {
    return [...Array(PARTICLE_COUNT)].map(() => ({
        left: 35 + Math.random() * 30,
        duration: 4 + Math.random() * 5,
        delay: Math.random() * -8,
        size: 3 + Math.random() * 8,
        drift: -30 + Math.random() * 60,
        glow: Math.random() > 0.5,
    }));
}

function generateDorsalFins() {
    return [...Array(7)].map((_, i) => ({
        left: 25 + i * 8,
        height: 40 + Math.random() * 40,
        delay: i * 0.15,
    }));
}


function generateRodanFlock() {
    const count = 2 + Math.floor(Math.random() * 3);
    return [...Array(count)].map((_, i) => ({
        delay: i * 0.5,
        duration: 2.5 + Math.random() * 1.5,
        top: 5 + i * 15 + Math.random() * 10,
        scale: 0.5 + Math.random() * 0.6,
    }));
}


const BASE_MINI_DURATIONS: Record<MiniEvent, number> = {
    pulse: 3000,
    emp: 3000,
    stomp: 2000,
    smoke: 6000,
    rodan: 3000,
    tsunami: 6000,
};

/* ══════════════════════════════════════════
   COMPONENT — Two-tier system:
   1. Roar + beam cycle every 60-90s (the big event)
   2. Mini-events every 8-14s (frequent, smaller)
   ══════════════════════════════════════════ */

const GodzillaStrike: React.FC<{ silent?: boolean }> = ({ silent }) => {
    // Roar cycle state
    const [roarCycle, setRoarCycle] = useState(0);
    const [roarPhase, setRoarPhase] = useState<"glow" | "breath" | "ending" | "idle">("idle");
    const [showFins, setShowFins] = useState(false);

    // Mini-event state
    const [miniEvent, setMiniEvent] = useState<{ type: MiniEvent; key: number } | null>(null);
    const [rodanFlock, setRodanFlock] = useState(generateRodanFlock);
    const miniCounter = useRef(0);
    /** True while roar cycle is active — mini-events skip and reschedule */
    const roarActiveRef = useRef(false);

    const particles = useMemo(generateParticles, []);
    const dorsalFins = useMemo(generateDorsalFins, []);

    // ── Single scheduler: mini-events with roar cycle taking a slot ──
    // After a randomized number of mini-events (4-8), the roar cycle plays.
    // Current mini-event always finishes before roar starts.
    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        const miniQueue: MiniEvent[] = [];
        let miniEventsSinceRoar = 0;
        let roarThreshold = 4 + Math.floor(Math.random() * 5);
        const FIN_DURATION = 4000;
        const ROAR_OFFSET = 500;

        function schedule(fn: () => void, delay: number) {
            const t = setTimeout(fn, delay);
            timers.push(t);
            return t;
        }

        function fireRoarCycle() {
            roarActiveRef.current = true;
            miniEventsSinceRoar = 0;
            roarThreshold = 4 + Math.floor(Math.random() * 5);

            // 1. Dorsal fins glow
            setShowFins(true);
            if (!silent) playFinChargeSound();

            // 2. Charge glow + roar overlaps tail end of charge
            const roarStart = FIN_DURATION - ROAR_OFFSET;
            schedule(() => setShowFins(false), FIN_DURATION);
            schedule(() => {
                setRoarPhase("glow");
                if (!silent) playGodzillaRoar();
            }, roarStart);

            // 3. Beam phases
            schedule(() => {
                setRoarPhase("breath");
                if (!silent) playBeamSustain();
            }, roarStart + ROAR_DURATION * 1000);
            schedule(() => setRoarPhase("ending"), roarStart + ROAR_DURATION * 1000 + BEAM_DURATION * 0.8 * 1000);
            schedule(() => {
                setRoarPhase("idle");
                setRoarCycle(c => c + 1);
                roarActiveRef.current = false;
                // Resume mini-events after roar
                schedule(scheduleNextSlot, 2000);
            }, roarStart + ROAR_DURATION * 1000 + BEAM_DURATION * 1000 + 500);
        }

        function fireMiniEvent() {
            if (miniQueue.length === 0) {
                miniQueue.push(...ALL_MINI_EVENTS);
                for (let i = miniQueue.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [miniQueue[i], miniQueue[j]] = [miniQueue[j], miniQueue[i]];
                }
            }
            const event = miniQueue.pop()!;
            const key = ++miniCounter.current;
            const duration = Math.round(BASE_MINI_DURATIONS[event] * (1 + Math.random()));

            setMiniEvent({ type: event, key });
            miniEventsSinceRoar++;

            if (event === "rodan") setRodanFlock(generateRodanFlock());

            if (!silent) {
                if (event === "pulse") playNuclearPulseSound();
                if (event === "emp") playEmpSound();
                if (event === "stomp") playStompSound();
                if (event === "tsunami") playTsunamiSound();
                if (event === "rodan") playRodanScreech();
            }

            // After mini-event finishes, decide: roar or another mini
            schedule(() => {
                setMiniEvent(null);
                if (miniEventsSinceRoar >= roarThreshold) {
                    schedule(fireRoarCycle, 2000);
                } else {
                    scheduleNextSlot();
                }
            }, duration);
        }

        function scheduleNextSlot() {
            const delay = (MINI_EVENT_INTERVAL_MIN + Math.random() * (MINI_EVENT_INTERVAL_MAX - MINI_EVENT_INTERVAL_MIN)) * 1000;
            schedule(fireMiniEvent, delay);
        }

        // Start with the main event
        schedule(fireRoarCycle, 3000);

        return () => timers.forEach(clearTimeout);
    }, [silent]);

    // ── Roar render ──
    const showBeam = roarPhase === "breath" || roarPhase === "ending";
    const showParticles = roarPhase === "breath";

    const flashClass = [
        styles.flash,
        roarPhase === "glow" ? styles.flashCharging : "",
        roarPhase === "ending" || roarPhase === "idle" ? styles.flashEnding : "",
    ].filter(Boolean).join(" ");

    return (
        <>
            {/* ── Roar cycle visuals ── */}
            {roarPhase !== "idle" && <div className={flashClass} />}
            {showBeam && <div key={`beam-${roarCycle}`} className={styles.beam} />}
            {showParticles &&
                particles.map((p, i) => (
                    <div
                        key={`particle-${roarCycle}-${i}`}
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

            {/* ── Mini-events ── */}


            {/* Dorsal fins charging — lead-in to roar cycle */}
            {showFins && dorsalFins.map((fin, i) => (
                <div
                    key={`fin-${roarCycle}-${i}`}
                    className={styles.dorsalFin}
                    style={{
                        left: `${fin.left}%`,
                        animationDelay: `${fin.delay}s`,
                    }}
                >
                    <DorsalFinSvg height={fin.height} />
                </div>
            ))}

            {/* Nuclear pulse shockwave */}
            {miniEvent?.type === "pulse" && (
                <>
                    <div key={`pulse1-${miniEvent.key}`} className={styles.nuclearPulse} />
                    <div key={`pulse2-${miniEvent.key}`} className={styles.nuclearPulse} style={{ animationDelay: "0.3s" }} />
                    <div key={`pulse3-${miniEvent.key}`} className={styles.nuclearPulse} style={{ animationDelay: "0.6s" }} />
                </>
            )}

            {/* EMP pulse — screen flicker/distortion */}
            {miniEvent?.type === "emp" && (
                <div key={`emp-${miniEvent.key}`} className={styles.empOverlay} />
            )}

            {/* Stomp + screen shake */}
            {miniEvent?.type === "stomp" && (
                <>
                    <div key={`shake-${miniEvent.key}`} className={styles.stompOverlay} />
                    <div key={`dust-${miniEvent.key}`} className={styles.stompDust} />
                </>
            )}

            {/* Smoke/dust clouds billowing across */}
            {miniEvent?.type === "smoke" && [0, 1, 2, 3].map((i) => (
                <div
                    key={`smoke-${miniEvent.key}-${i}`}
                    className={styles.smokeCloud}
                    style={{
                        bottom: `${i * 12 + Math.random() * 5}%`,
                        animationDelay: `${i * 0.8}s`,
                        animationDuration: `${5 + i * 0.8}s`,
                        height: `${100 + i * 30}px`,
                        opacity: 0.25 - i * 0.04,
                    }}
                />
            ))}

            {/* Rodan flock — 2-4 swooping across at staggered heights */}
            {miniEvent?.type === "rodan" && rodanFlock.map((r, i) => (
                <div
                    key={`rodan-${miniEvent.key}-${i}`}
                    className={styles.rodan}
                    style={{
                        animationDelay: `${r.delay}s`,
                        animationDuration: `${r.duration}s`,
                        top: `${r.top}%`,
                        transform: `scale(${r.scale})`,
                    }}
                >
                    <RodanSvg size={200} />
                </div>
            ))}

            {/* Tsunami wave — dark water wall rising from bottom */}
            {miniEvent?.type === "tsunami" && (
                <div key={`tsunami-${miniEvent.key}`} className={styles.tsunamiWave} />
            )}
        </>
    );
};

export default GodzillaStrike;
