let audioCtx = null;

const getCtx = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
};

export const initAudio = () => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') {
        ctx.resume();
    }
};

const scheduleBeep = (ctx, freq, startTime, duration) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.6, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
};

export const playSound = async (mode) => {
    const ctx = getCtx();

    if (ctx.state === 'suspended') {
        await ctx.resume();
    }

    const now = ctx.currentTime;

    if (mode === 'pomodoro') {
        // Focus bitti: 3 artan nota (Do - Mi - Sol)
        scheduleBeep(ctx, 523.25, now + 0.0, 0.4);   // C5
        scheduleBeep(ctx, 659.25, now + 0.25, 0.4);  // E5
        scheduleBeep(ctx, 783.99, now + 0.5, 0.6);   // G5
    } else {
        // Mola bitti: 2 alçalan nota (Sol - Do)
        scheduleBeep(ctx, 783.99, now + 0.0, 0.4); // G5
        scheduleBeep(ctx, 523.25, now + 0.25, 0.6); // C5
    }
};
