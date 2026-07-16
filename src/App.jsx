import React, { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { Play, Pause, ArrowRight, Check, Disc3 } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import VinylRecord from './VinylRecord';
import { createScratchEngine } from './lib/scratchEngine';
import OrderForm from './OrderForm';
import TeamDirectory from './TeamDirectory';

// Reusable reveal animation component
const Reveal = ({ children, delay = 0, className = "", style }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, delay, ease: "easeOut" }}
    className={className}
    style={style}
  >
    {children}
  </motion.div>
);

const SONGS = [
  {
    id: 1,
    title: 'Mountain Love',
    artist: 'Royalty Free',
    color1: '#E8B4C8',
    color2: '#8F0F44',
    audioSrc: '/audio/the_mountain-love-481753.mp3',
  },
  {
    id: 2,
    title: 'Soft Glow',
    artist: 'Paulyudin',
    color1: '#f0c9a0',
    color2: '#c2185b',
    audioSrc: '/audio/paulyudin-soft-518715.mp3',
  },
  {
    id: 3,
    title: 'Calm Space',
    artist: 'Clavier Music',
    color1: '#b8d4e8',
    color2: '#3B2634',
    audioSrc: '/audio/clavier-music-calm-space-music-312291.mp3',
  },
];


// ── Music Visualizer Component ─────────────────────────────────────────────
const MusicVisualizer = ({ isLoaded, progress }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const barsRef = useRef([]);
  const NUM_BARS = 100;

  // Initialize bars with envelope shapes and particle states
  useEffect(() => {
    barsRef.current = Array.from({ length: NUM_BARS }, (_, i) => {
      const nx = i / NUM_BARS; // 0 to 1
      // Create a shape envelope: peak around 0.35, secondary bump around 0.7
      let envelope = Math.exp(-Math.pow(nx - 0.35, 2) / 0.03);
      envelope += 0.4 * Math.exp(-Math.pow(nx - 0.65, 2) / 0.05);
      envelope += 0.15 * Math.exp(-Math.pow(nx - 0.85, 2) / 0.02);
      // Taper the extreme edges
      envelope *= Math.sin(nx * Math.PI);

      return {
        envelope: envelope * 0.8 + 0.02, // base amplitude
        phase: Math.random() * Math.PI * 2,
        speed: 1 + Math.random() * 1.5,
        particleY: 0,
        particleLife: Math.random(),
        hasParticle: Math.random() > 0.75
      };
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = (timestamp) => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barW = Math.max(1.5, (W / NUM_BARS) * 0.5);
      const gap = W / NUM_BARS;
      const centerY = H / 2;
      const color = '#dca3d6'; // Pale purple from reference

      const speedMult = isLoaded ? 2.5 : 0.8 + (progress / 100) * 1.2;
      const globalAlphaBase = isLoaded ? 1.0 : 0.4 + (progress / 100) * 0.4;

      // Draw central horizontal line
      ctx.fillStyle = color;
      ctx.globalAlpha = globalAlphaBase * 0.4;
      ctx.fillRect(0, centerY, W, 1);

      ctx.shadowColor = color;
      ctx.shadowBlur = isLoaded ? 10 : 5;
      ctx.fillStyle = color;

      barsRef.current.forEach((bar, i) => {
        // Oscillation for life-like movement
        const oscillation = Math.sin(timestamp * 0.003 * bar.speed * speedMult + bar.phase);
        const amplitude = 0.3 + (oscillation + 1) * 0.35; // [0.3, 1.0]

        let barH = bar.envelope * amplitude * H * 0.8;
        if (barH < 2) barH = 2; // minimum height

        const x = i * gap + (gap - barW) / 2;

        // Draw bar
        ctx.globalAlpha = globalAlphaBase;
        ctx.fillRect(x, centerY - barH / 2, barW, barH);

        // Draw particles
        if (bar.hasParticle) {
          bar.particleLife -= 0.015 * speedMult;
          if (bar.particleLife <= 0) {
            bar.particleLife = 1.0;
            // Spawn particle just below the bar
            bar.particleY = barH / 2 + Math.random() * 5 + 2;
          } else {
            bar.particleY += 0.3 * speedMult; // drift down
          }

          ctx.globalAlpha = bar.particleLife * globalAlphaBase * 0.8;
          ctx.fillRect(x, centerY + bar.particleY, barW, barW);
        }
      });

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1.0;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isLoaded, progress]);

  return (
    <div className="splash-visualizer">
      <canvas ref={canvasRef} width={400} height={120} className="splash-canvas" />
      <p className="splash-loading-text">
        {isLoaded ? 'Ready!' : `Preparing your experience… ${progress}%`}
      </p>
    </div>
  );
};

export default function App() {
  const [playingId, setPlayingId] = useState(null);
  const [activeSong, setActiveSong] = useState(SONGS[0]);
  const [targetSpeed, setTargetSpeed] = useState(0.015);
  const [isVinylPlaying, setIsVinylPlaying] = useState(false);
  const [entered, setEntered] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isVisualizing, setIsVisualizing] = useState(false);
  
  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');

  // Routing state
  const [currentView, setCurrentView] = useState('home');

  // ── Cache-first Audio Preloader (Starbucks-style offline caching) ──────────
  useEffect(() => {
    const CACHE_NAME = 'owna-song-audio-v1';
    const audioFiles = SONGS.map(s => s.audioSrc);
    let completed = 0;

    const cacheAndLoad = async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.all(
          audioFiles.map(async (url) => {
            // If already cached, skip fetching from network
            const cached = await cache.match(url);
            if (!cached) {
              try {
                const res = await fetch(url);
                if (res.ok) await cache.put(url, res);
              } catch (e) {
                console.warn('Failed to cache:', url, e);
              }
            }
            completed++;
            setLoadProgress(Math.round((completed / audioFiles.length) * 100));
          })
        );
      } catch (e) {
        // Cache API not available — fallback gracefully
        console.warn('Cache API unavailable, falling back to direct fetch', e);
        try {
          await fetch(SONGS[0].audioSrc);
        } catch (_) {}
      }
      // Minimum splash duration of 1.5s for the visualizer to play (if they clicked early)
      setTimeout(() => setLoaded(true), 1500);
    };

    cacheAndLoad();
  }, []);

  // When user clicks the play button
  const handleStartExperience = () => {
    setIsVisualizing(true);
  };

  // Auto-enter once loaded AND user has started the visualizer
  useEffect(() => {
    if (loaded && isVisualizing && !entered) {
      // Small delay so user sees the visualizer finish gracefully
      const t = setTimeout(() => handleEnter(), 600);
      return () => clearTimeout(t);
    }
  }, [loaded, isVisualizing, entered]);
  
  // ── Scratch Engine ─────────────────────────────────────────────────────────
  const engineRef            = useRef(null);
  const engineCreationIdRef  = useRef(0);
  const lastDragRateRef      = useRef(1);
  const rateEasingRafRef     = useRef(null);

  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      if (rateEasingRafRef.current) cancelAnimationFrame(rateEasingRafRef.current);
      engineRef.current?.suspend();
    };
  }, []);

  const loadAndPlaySong = (songToLoad) => {
    const id = ++engineCreationIdRef.current;
    if (rateEasingRafRef.current) {
      cancelAnimationFrame(rateEasingRafRef.current);
      rateEasingRafRef.current = null;
    }
    if (engineRef.current) {
      engineRef.current.suspend();
      engineRef.current = null;
    }

    createScratchEngine(songToLoad.audioSrc)
      .then(eng => {
        if (id !== engineCreationIdRef.current) { eng.suspend(); return; }
        engineRef.current = eng;
        eng.setRate(1); // Normal playback
        
        // Apply a smooth 1-second fade-in right as it starts
        eng.setVolume(0, 0);
        eng.resume();
        eng.setVolume(1, 1.0);
        
        lastDragRateRef.current = 1;
      })
      .catch(console.error);
  };

  const handleEnter = () => {
    setEntered(true);
    setIsVinylPlaying(true);
    loadAndPlaySong(activeSong);
  };

  // Called the instant the user touches the disc
  const handleDragStart = useCallback(() => {
    if (rateEasingRafRef.current) {
      cancelAnimationFrame(rateEasingRafRef.current);
      rateEasingRafRef.current = null;
    }
    // Engine is already created by loadAndPlaySong
  }, []);

  // Called every pointermove — drives audio rate directly
  const handleDragRate = useCallback((rate) => {
    lastDragRateRef.current = rate;
    engineRef.current?.setRate(rate);
  }, []);

  // Called on release — ease rate back to 1 (normal playback) over ~650ms
  const handleDragEnd = useCallback(() => {
    const startRate  = lastDragRateRef.current;
    const startTime  = performance.now();
    const DURATION   = 650;

    const ease = (now) => {
      const t       = Math.min((now - startTime) / DURATION, 1);
      // ease-in-out quad
      const eased   = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const current = startRate + (1 - startRate) * eased;
      engineRef.current?.setRate(current);
      if (t < 1) {
        rateEasingRafRef.current = requestAnimationFrame(ease);
      } else {
        rateEasingRafRef.current = null;
        lastDragRateRef.current = 1;
      }
    };
    rateEasingRafRef.current = requestAnimationFrame(ease);
  }, []);

  const handleSongSelect = (song) => {
    if (activeSong.id === song.id) {
      if (isVinylPlaying) {
        engineRef.current?.setVolume(0, 0.2); // quick fade out
        setTimeout(() => {
          if (engineRef.current && !isVinylPlaying) engineRef.current.suspend();
        }, 200);
        setIsVinylPlaying(false);
        setTargetSpeed(0);
      } else {
        engineRef.current?.resume();
        engineRef.current?.setVolume(1, 0.2); // quick fade in
        setIsVinylPlaying(true);
        setTargetSpeed(0.015);
      }
      return;
    }
    
    // Smooth down vinyl speed
    setTargetSpeed(0.002);
    setActiveSong(song);
    
    loadAndPlaySong(song);
    setIsVinylPlaying(true);
    
    // Ramp speed back up after a delay
    setTimeout(() => {
      setTargetSpeed(0.015);
    }, 400);
  };

  // Fade out music on scroll past hero
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.querySelector('.hero');
      if (hero && engineRef.current && isVinylPlaying) {
        const rect = hero.getBoundingClientRect();
        if (rect.bottom < window.innerHeight * 0.4) {
           engineRef.current.setVolume(0, 1.5); // fade out over 1.5s
           setTimeout(() => {
              if (engineRef.current) engineRef.current.suspend();
           }, 1500);
           setIsVinylPlaying(false);
           setTargetSpeed(0);
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isVinylPlaying]);

  // Smooth scroll
  useEffect(() => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }, []);

  // Mobile: reveal WhatsApp button only after scrolling past the hero vinyl
  useEffect(() => {
    const isMobile = () => window.innerWidth <= 768;
    const wa = document.querySelector('.wa-float');
    if (!wa) return;

    const onScroll = () => {
      if (!isMobile()) {
        wa.classList.add('wa-float--visible');
        return;
      }
      // Show after user scrolls ~80% of viewport height (past the vinyl screen)
      const past = window.scrollY > window.innerHeight * 0.8;
      wa.classList.toggle('wa-float--visible', past);
    };

    // On desktop always visible immediately
    if (!isMobile()) wa.classList.add('wa-float--visible');

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);


  const handlePlay = (id) => {
    setPlayingId(playingId === id ? null : id);
  };

  if (currentView === 'team') {
    return <TeamDirectory onBack={() => setCurrentView('home')} />;
  }

  return (
    <>
      <AnimatePresence>
        {!entered && (
          <motion.div 
            className="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          >
            {/* Cinematic background elements just for splash */}
            <div className="splash-glow splash-glow-1"></div>
            <div className="splash-glow splash-glow-2"></div>
            
            <div className="splash-content">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
              >
                <motion.img
                  src="/logo.svg"
                  alt="Own A Song"
                  className="splash-logo"
                  animate={{ scale: [1, 1.05, 1], filter: ['drop-shadow(0px 0px 10px rgba(220,163,214,0.2))', 'drop-shadow(0px 0px 25px rgba(220,163,214,0.6))', 'drop-shadow(0px 0px 10px rgba(220,163,214,0.2))'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
              
              <motion.h1 
                className="splash-title"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
              >
                Own A Song
              </motion.h1>
              
              <motion.p 
                className="splash-subtitle"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 0.7 }}
                transition={{ duration: 1, delay: 0.6 }}
              >
                For the best experience, put on your headphones.
              </motion.p>
              
              <motion.div
                className="splash-action-container"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
              >
                {!isVisualizing ? (
                  <button className="splash-btn-premium" onClick={handleStartExperience}>
                    <div className="splash-btn-icon">
                      <Play size={16} fill="currentColor" />
                    </div>
                    Enter Studio
                  </button>
                ) : (
                  <MusicVisualizer isLoaded={loaded} progress={loadProgress} />
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      
      <header className="nav glass">
        <div className="wrap">
          <a href="#top" className="logo">
            <img src="/logo.svg" alt="Own A Song" style={{ width: 60, height: 60, objectFit: 'contain', filter: 'brightness(0) invert(1) drop-shadow(0 0 10px rgba(255,255,255,0.4))' }} />
            Own A Song
          </a>
          <nav className="nav-links">
            <a href="#team">Our Team</a>
            <a href="#process">How It Works</a>
            <a href="#stories">Stories</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
          </nav>

        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="hero">
          <div className="wrap">
            <motion.div 
              className="hero-visual"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <motion.div 
                className="vinyl-bloom"
                animate={{ 
                  background: `radial-gradient(circle at 50% 50%, ${activeSong.color1}40 0%, transparent 60%)` 
                }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
              />
              <div
                className="canvas-container"
                style={{ touchAction: 'none' }}
              >
                <Canvas
                  camera={{ position: [0, 0, 7], fov: 45 }}
                  dpr={[1, 2]}
                  gl={{ antialias: true, alpha: true }}
                  style={{ touchAction: 'none' }}
                >
                  <ambientLight intensity={0.5} />
                  <spotLight
                    position={[8, 14, 8]}
                    angle={0.28}
                    penumbra={0.9}
                    intensity={3.5}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                  />
                  <pointLight position={[-6, -8, 4]}  intensity={2.0} color="#F7D9E3" />
                  <pointLight position={[8, 2, 5]}   intensity={2.5} color="#D4A373" />
                  <pointLight position={[-4, 4, -3]}  intensity={1.8} color="#C2185B" />
                  <directionalLight position={[0, 10, 2]} intensity={1.2} color="#ddeeff" />

                  <Suspense fallback={null}>
                    <Environment preset="studio" />
                    <VinylRecord
                      activeSong={activeSong}
                      targetSpeed={targetSpeed}
                      onDragStart={handleDragStart}
                      onDragRate={handleDragRate}
                      onDragEnd={handleDragEnd}
                    />
                    <ContactShadows
                      position={[0, -3.5, 0]}
                      opacity={0.55}
                      scale={14}
                      blur={2.5}
                      far={6}
                      color="#3B2634"
                    />
                  </Suspense>
                </Canvas>
              </div>


              {/* Premium Song Carousel */}
              <div className="premium-carousel-wrapper">
                <div className="premium-carousel">
                  {SONGS.map(song => {
                    const isActive = activeSong.id === song.id;
                    return (
                      <motion.div 
                        key={song.id} 
                        className={`premium-chip ${isActive ? 'active' : ''}`}
                        onClick={() => handleSongSelect(song)}
                        whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}
                        whileTap={{ scale: 0.95, y: 0 }}
                        animate={{ scale: isActive ? 1.05 : 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        {isActive && (
                          <motion.div 
                            className="chip-glow-ring" 
                            layoutId="glowRing" 
                            transition={{type: 'spring', stiffness: 200, damping: 25}} 
                          />
                        )}
                        <div className="chip-art" style={{ background: `linear-gradient(135deg, ${song.color1}, ${song.color2})` }}>
                          {isActive && (
                            <div className={`eq-bars ${!isVinylPlaying ? 'paused' : ''}`}>
                              <span className="eq-bar"></span>
                              <span className="eq-bar"></span>
                              <span className="eq-bar"></span>
                            </div>
                          )}
                        </div>
                        <div className="chip-text">
                          <span className="chip-title">{song.title}</span>
                          <span className="chip-artist">{song.artist}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </motion.div>

            <motion.div 
              className="hero-copy"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span className="eyebrow">The Ultimate Premium Gift</span>
              <h1>Your story,<br/>scored like cinema.</h1>
              <p>We forge your memories into an unparalleled musical masterpiece—meticulously crafted, performed, and produced by elite artists. No AI, just pure artistry.</p>
              <div className="hero-cta-row">
                <button onClick={() => setIsFormOpen(true)} className="btn btn-primary">
                  Commission Your Masterpiece <ArrowRight size={18} />
                </button>

              </div>
            </motion.div>
          </div>
        </section>


        {/* TRUST STRIP */}
        <div className="trust-strip">
          <div className="wrap">
            <motion.span initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.1}}><Check size={18} /> Elite Human Artistry</motion.span>
            <motion.span initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.2}}><Check size={18} /> Trusted by 4,000+ Patrons</motion.span>
            <motion.span initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.3}}><Check size={18} /> Studio-Grade Production</motion.span>
            <motion.span initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.4}}><Check size={18} /> Expedited Global Delivery</motion.span>
          </div>
        </div>

        {/* TEAM */}
        <section id="team" className="team-section">
          <div className="wrap">
            <Reveal className="section-head text-center">
              <span className="eyebrow">The Artisans</span>
              <h2>The Masterminds</h2>
              <p>The award-winning vocalists, composers, and producers engineering your legacy.</p>
            </Reveal>

            <div className="team-grid">
              {[
                { name: "ENREDH", role: "Singer, Songwriter, Music Producer", image: "/team/enredh.jpg", ig: "@enredh" },
                { name: "TAEZY", role: "Singer, Songwriter", image: "/team/taezy.jpg", ig: "@its.taezy" },
                { name: "SAYAN", role: "Singer, Songwriter", image: "/team/sayan.jpg", ig: "@sayansebs" },
                { name: "ADARSH", role: "Singer", image: "/team/adarsh.jpg", ig: "@adarsh_vox" }
              ].map((member, i) => (
                <Reveal key={i} delay={i * 0.1} className="team-card glass text-center">
                  <div className="team-image-wrapper">
                    <img src={member.image} alt={member.name} className="team-image" />
                  </div>
                  <h3>{member.name}</h3>
                  <p className="team-role">{member.role}</p>
                  {member.ig && (
                    <a href={`https://instagram.com/${member.ig.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="team-insta" style={{ marginTop: '12px' }}>
                      {member.ig}
                    </a>
                  )}
                </Reveal>
              ))}
            </div>

            <div style={{ marginTop: '48px', textAlign: 'center' }}>
              <Reveal delay={0.4}>
                <button className="btn btn-outline" onClick={() => setCurrentView('team')}>
                  See All 22 Members <ArrowRight size={18} style={{ marginLeft: '8px' }}/>
                </button>
              </Reveal>
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className="process" id="process">
          <div className="wrap">
            <Reveal className="section-head">
              <span className="eyebrow">The Blueprint</span>
              <h2>From Memory to Masterpiece</h2>
              <p>A meticulous journey where every note is tailored to perfection. No compromises.</p>
            </Reveal>

            <div className="tracklist">
              {[
                { num: "01", title: "The Canvas", desc: "Define the occasion—whether it’s a milestone anniversary, a cinematic wedding, or an unforgettable surprise." },
                { num: "02", title: "The Narrative", desc: "Share the inside jokes, the defining moments, and the raw emotions. Every detail fuels our creative engine." },
                { num: "03", title: "The Aesthetic", desc: "Select your genre—from a sweeping orchestral ballad to a high-energy pop anthem—or let our directors guide you." },
                { num: "04", title: "The Reveal", desc: "Experience the awe as your bespoke composition is unveiled, ready to echo through eternity." }
              ].map((step, i) => (
                <Reveal key={i} delay={i * 0.1} className="track-row">
                  <div className="track-num">{step.num}</div>
                  <div>
                    <div className="track-title">{step.title}</div>
                    <div className="track-desc">{step.desc}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="stories">
          <div className="wrap">
            <Reveal className="section-head">
              <span className="eyebrow">The Impact</span>
              <h2>Legacies immortalized through sound</h2>
            </Reveal>

            <div className="testimonials-grid">
              <Reveal className="quote-card now-playing glass">
                <div>
                  <div className="stars">★★★★★</div>
                  <p className="quote">"My dad doesn't cry easily. This song broke that streak."</p>
                </div>
                <div>
                  <div className="quote-meta" style={{marginBottom: "14px"}}>
                    <div className="quote-avatar"></div>
                    <div><div className="quote-name">Ritu S.</div><div className="quote-tag" style={{color: "#F7D9E3"}}>Birthday Song</div></div>
                  </div>
                  <div className="np-player">
                    <button className="np-play" onClick={() => handlePlay(1)} aria-label="Play sample">
                      {playingId === 1 ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <div className={`waveform ${playingId === 1 ? 'playing' : ''}`}>
                      {[10,20,14,24,12,22,16].map((h, i) => (
                        <span key={i} className="bar" style={{ height: h + 'px', animationDelay: (i*0.1) + 's' }}></span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>

              {[
                { quote: "\"She thought it was just dinner, until the song started playing.\"", name: "Arjun M.", tag: "Anniversary Song" },
                { quote: "\"I've replayed it every single day since our wedding.\"", name: "Priya & Kabir", tag: "Wedding Surprise" },
                { quote: "\"They got the inside jokes right. I still don't know how.\"", name: "Neha T.", tag: "Friendship Song" },
                { quote: "\"Our whole team teared up when it played at the farewell.\"", name: "Team Lead", tag: "Corporate Tribute" },
                { quote: "\"Worth every rupee. It didn't feel templated at all — it felt like us.\"", name: "Sameer K.", tag: "Birthday Song" }
              ].map((test, i) => (
                <Reveal key={i} delay={0.1 * (i+1)} className="quote-card glass">
                  <div className="stars">★★★★★</div>
                  <p className="quote">{test.quote}</p>
                  <div className="quote-meta">
                    <div className="quote-avatar"></div>
                    <div><div className="quote-name">{test.name}</div><div className="quote-tag">{test.tag}</div></div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>



        {/* PRICING */}
        <section id="pricing" className="pricing">
          <div className="wrap">
            <Reveal className="section-head text-center">
              <span className="eyebrow">Pricing</span>
              <h2 style={{ textAlign: 'center' }}>Choose Your Production Level</h2>
            </Reveal>

            <div className="pricing-grid">
              {/* Basic Card */}
              <Reveal delay={0.1} className="pricing-card glass">
                <div className="discount-badge">33.33%<br/>Off</div>
                <h3>BASIC</h3>
                <div className="price-row">
                  <span className="current-price">9999/-</span>
                  <span className="original-price">14999</span>
                </div>
                <div className="price-type">(Acoustic)</div>
                
                <div className="features-divider">
                  <span>Features</span>
                </div>
                
                <ul className="features-list">
                  <li><Check size={18} color="#C2185B" /> <span>Customized Lyrics</span></li>
                  <li><Check size={18} color="#C2185B" /> <span>Duration 2-3 Minutes</span></li>
                  <li><Check size={18} color="#C2185B" /> <span>Minimal layers of acoustic instruments (Guitar & Piano)</span></li>
                  <li><Check size={18} color="#C2185B" /> <span>High Quality Studio Mix</span></li>
                  <li><Check size={18} color="#C2185B" /> <span>Free Artwork wall hanging</span></li>
                </ul>

                <button onClick={() => { setSelectedPlan('Basic'); setIsFormOpen(true); }} className="btn btn-select">
                  Select
                </button>
              </Reveal>

              {/* Advanced Card */}
              <Reveal delay={0.2} className="pricing-card glass highlight-card">
                <div className="best-value-ribbon">BEST VALUE</div>
                <div className="discount-badge">33.33%<br/>Off</div>
                <h3>Advanced</h3>
                <div className="price-row">
                  <span className="current-price">14999/-</span>
                  <span className="original-price">22499</span>
                </div>
                <div className="price-type">(Fully Produced)</div>
                
                <div className="features-divider">
                  <span>Features</span>
                </div>
                
                <ul className="features-list">
                  <li><Check size={18} color="#C2185B" /> <span>Customized Lyrics</span></li>
                  <li><Check size={18} color="#C2185B" /> <span>Duration 2-3 Minutes</span></li>
                  <li><Check size={18} color="#C2185B" /> <span>Multi Instruments (Like a complete song)</span></li>
                  <li><Check size={18} color="#C2185B" /> <span>High Quality Studio Mix</span></li>
                  <li><Check size={18} color="#C2185B" /> <span>Free Artwork wall hanging</span></li>
                </ul>

                <button onClick={() => { setSelectedPlan('Advanced'); setIsFormOpen(true); }} className="btn btn-select">
                  Select
                </button>
              </Reveal>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final-cta" id="contact">
          <Reveal className="wrap">
            <h2>Ready to create an unforgettable legacy?</h2>
            <p>Your story. Our symphony.</p>
            <a href="https://wa.me/918374376200" target="_blank" rel="noopener noreferrer" className="btn btn-light">
              Commission Your Track via WhatsApp
            </a>
            <div className="final-phone">or call +91 83743 76200</div>
          </Reveal>
        </section>

      </main>

      <footer>
        <div className="wrap">
          <div className="footer-top">
            <div>
              <div className="footer-logo">
                <img src="/logo.svg" alt="Own A Song" style={{ width: 28, height: 28, objectFit: 'contain', filter: 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.3))' }} />
                Own A Song
              </div>
              <div className="footer-tagline">Your story, scored like cinema — one bespoke masterpiece at a time.</div>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <h4>Explore</h4>
                <ul>
                  <li><a href="#team">Our Team</a></li>
                  <li><a href="#process">How It Works</a></li>
                  <li><a href="#testimonials">Stories</a></li>
                </ul>
              </div>
              <div className="footer-col">
                <h4>Contact</h4>
                <ul>
                  <li><a href="https://wa.me/918374376200">WhatsApp</a></li>
                  <li><a href="tel:+918374376200">+91 83743 76200</a></li>
                  <li><a href="#">@ownasong</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Own A Song. All rights reserved.</span>
            <div className="footer-social">
              <a href="#" aria-label="Instagram"><span style={{fontWeight:'bold'}}>IG</span></a>
              <a href="https://wa.me/918374376200" aria-label="WhatsApp"><span style={{fontWeight:'bold'}}>WA</span></a>
            </div>
          </div>
        </div>
      </footer>

      <a href="https://wa.me/918374376200" target="_blank" rel="noopener noreferrer" className="wa-float" aria-label="Chat with us on WhatsApp">
        <span style={{fontWeight:'bold', fontSize:'24px', color:'#fff'}}>WA</span>
      </a>

      {/* Order Form Modal */}
      <OrderForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        initialPlan={selectedPlan} 
      />
    </>
  );
}
