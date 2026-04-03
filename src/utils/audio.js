// Web Audio API ile ücretsiz, telifsiz ve sorunsuz bildirim sesi üretici
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const initAudio = () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};

export const playSound = (mode) => {
    // Tarayıcı kısıtlamalarını aşmak için audio context uyandırılır
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    let freq1, freq2;
    
    if (mode === 'pomodoro') {
        // Focus bitti - Ara vakti! (Yukarı doğru neşeli melodi: Do -> Mi)
        freq1 = 523.25; // C5
        freq2 = 659.25; // E5
    } else {
        // Ara bitti - Çalışma vakti! (Aşağı doğru uyarıcı melodi: Mi -> Do)
        freq1 = 659.25; // E5
        freq2 = 523.25; // C5
    }
    
    // Yumuşak ve modern bir ses için "sine" (sinüs) dalgası
    osc.type = 'sine';
    
    // 1. ZİL SESİ
    osc.frequency.setValueAtTime(freq1, now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    // 2. ZİL SESİ (Yarım saniye sonra)
    osc.frequency.setValueAtTime(freq2, now + 0.3);
    gainNode.gain.setValueAtTime(0, now + 0.3);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.35);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    
    // Sesi başlat ve 1.5 saniye sonra tamamen yok et
    osc.start(now);
    osc.stop(now + 1.5);
};
