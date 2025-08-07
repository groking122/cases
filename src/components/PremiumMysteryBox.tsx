import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SYMBOL_CONFIG } from '@/lib/symbols';

// Example reward list (replace with your real config or pass as prop)
const REAL_REWARDS = Object.values(SYMBOL_CONFIG).map(s => ({
  key: s.key,
  name: s.name,
  icon: s.emoji,
  rarity: s.rarity,
  color: s.color,
  multiplier: s.multiplier,
}));

interface Reward {
  key: string;
  name: string;
  icon: string;
  rarity: string;
  color: string;
  multiplier: number;
}

interface PremiumMysteryBoxProps {
  credits: number;
  setCredits: (c: number) => void;
  userId: string | null;
  caseId: string;
  boxPrice?: number;
}

const ITEM_HEIGHT = 100;

export const PremiumMysteryBox: React.FC<PremiumMysteryBoxProps> = ({
  credits,
  setCredits,
  userId,
  caseId,
  boxPrice = 50,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [status, setStatus] = useState('');
  const [revealed, setRevealed] = useState<Reward | null>(null);
  const [winnings, setWinnings] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const rewardScrollRef = useRef<HTMLDivElement>(null);

  // Helper: Find index of reward in the scroll list by key
  const findRewardIndex = (rewardKey: string) => {
    return REAL_REWARDS.findIndex(r => r.key === rewardKey);
  };

  // Handler: Open box
  const handleOpenBox = async () => {
    if (isAnimating || credits < boxPrice || !userId || !caseId) return;
    setIsAnimating(true);
    setStatus('Opening mystery box...');
    setCredits(credits - boxPrice);

    // Call backend API to get the reward
    let reward: Reward | null = null;
    let rewardKey = '';
    let rewardWinnings = 0;
    try {
      const res = await fetch('/api/open-case-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          caseId,
          clientSeed: 'user_seed_' + Date.now()
        }),
      });
      const data = await res.json();
      rewardKey = data.symbol.key;
      reward = REAL_REWARDS.find(r => r.key === rewardKey) || REAL_REWARDS[0];
      rewardWinnings = data.winnings;
    } catch (e) {
      setStatus('Error opening box. Please try again.');
      setIsAnimating(false);
      return;
    }

    // Animate scroll to the reward
    setStatus('Selecting your reward...');
    const rewardIndex = findRewardIndex(rewardKey);
    const scrollCount = REAL_REWARDS.length * 2 + rewardIndex; // spin through twice
    const indicatorOffset = 150; // half the container height (300px)
    const targetPosition = -(scrollCount * ITEM_HEIGHT) + indicatorOffset - ITEM_HEIGHT / 2;
    const scrollEl = rewardScrollRef.current;
    if (scrollEl) {
      scrollEl.style.transition = 'none';
      scrollEl.style.transform = 'translateY(0)';
      void scrollEl.offsetWidth;
      scrollEl.style.transition = 'transform 2.5s cubic-bezier(0.22, 1, 0.36, 1)';
      scrollEl.style.transform = `translateY(${targetPosition}px)`;
    }
    setTimeout(() => {
      setRevealed(reward!);
      setWinnings(rewardWinnings);
      setShowModal(true);
      setStatus('');
      setIsAnimating(false);
      // Reset scroll for next time
      if (scrollEl) {
        setTimeout(() => {
          scrollEl.style.transition = 'none';
          scrollEl.style.transform = 'translateY(0)';
        }, 1000);
      }
    }, 2700);
  };

  // Render reward scroll list (3x for seamless spin)
  const scrollRewards = [...REAL_REWARDS, ...REAL_REWARDS, ...REAL_REWARDS];

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', position: 'relative' }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ color: '#ffd700', fontSize: 32, marginBottom: 8 }}>Premium Mystery Box</h2>
        <div style={{ color: '#fff', opacity: 0.8 }}>Open for a chance at legendary rewards!</div>
        <div style={{ marginTop: 12, fontWeight: 600 }}>
          Your Credits: <span style={{ color: '#ffd700' }}>{credits}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <motion.div
          className="box-container"
          style={{ marginBottom: 24 }}
          initial={{ scale: 1 }}
          animate={{ scale: isAnimating ? 1.05 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.button
            className="open-btn"
            style={{
              background: 'linear-gradient(45deg, #ffd700, #ffaa00)',
              color: '#0f0c29',
              fontWeight: 700,
              fontSize: 20,
              border: 'none',
              borderRadius: 50,
              padding: '16px 40px',
              boxShadow: '0 5px 15px rgba(255,215,0,0.4)',
              cursor: isAnimating || credits < boxPrice ? 'not-allowed' : 'pointer',
              opacity: isAnimating || credits < boxPrice ? 0.6 : 1,
              marginBottom: 12,
            }}
            disabled={isAnimating || credits < boxPrice}
            onClick={handleOpenBox}
          >
            {isAnimating ? 'Opening...' : `Open Box (${boxPrice} credits)`}
          </motion.button>
        </motion.div>
        <div style={{ position: 'relative', width: 320, height: 300, overflow: 'hidden', borderRadius: 15, background: 'rgba(0,0,0,0.3)', border: '1px solid #ffd70033', marginBottom: 16 }}>
          <div className="indicator" style={{ position: 'absolute', top: 150, left: 0, right: 0, height: 3, background: '#ffd700', boxShadow: '0 0 15px #ffd700cc', zIndex: 10 }} />
          <div ref={rewardScrollRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}>
            {scrollRewards.map((reward, idx) => (
              <div key={idx} style={{ height: ITEM_HEIGHT, display: 'flex', alignItems: 'center', padding: 20, borderBottom: '1px solid #fff1', background: 'rgba(30,30,60,0.7)' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: reward.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginRight: 20 }}>{reward.icon}</div>
                <div>
                  <div style={{ fontSize: 20, color: reward.color }}>{reward.name}</div>
                  <div style={{ fontSize: 14, opacity: 0.7 }}>{reward.rarity.charAt(0).toUpperCase() + reward.rarity.slice(1)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ minHeight: 28, color: '#ffd700', fontWeight: 500 }}>{status}</div>
      </div>
      <AnimatePresence>
        {showModal && revealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(0,0,0,0.7)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ background: '#181830', borderRadius: 20, padding: 40, minWidth: 320, textAlign: 'center', border: `3px solid ${revealed.color}` }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>{revealed.icon}</div>
              <div style={{ fontSize: 28, color: revealed.color, fontWeight: 700, marginBottom: 8 }}>{revealed.name}</div>
              <div style={{ fontSize: 18, opacity: 0.8, marginBottom: 16 }}>{revealed.rarity.charAt(0).toUpperCase() + revealed.rarity.slice(1)}</div>
              <div style={{ fontSize: 20, color: '#ffd700', marginBottom: 12 }}>+{winnings} credits</div>
              <div style={{ fontSize: 16, color: '#ffd700', marginBottom: 24 }}>Congratulations! You won this reward.</div>
              <button style={{ padding: '10px 30px', borderRadius: 30, background: revealed.color, color: '#fff', fontWeight: 600, border: 'none', fontSize: 18, cursor: 'pointer' }} onClick={() => { setShowModal(false); setRevealed(null); }}>
                Continue
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PremiumMysteryBox; 