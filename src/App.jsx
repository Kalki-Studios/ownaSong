import React, { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { Play, Pause, Disc, ArrowRight, Check } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import VinylRecord from './VinylRecord';
import { createScratchEngine } from './lib/scratchEngine';

// Reusable reveal animation component
const Reveal = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, delay, ease: "easeOut" }}
    className={className}
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


export default function App() {
  const [playingId, setPlayingId] = useState(null);
  const [activeSong, setActiveSong] = useState(SONGS[0]);
  const [targetSpeed, setTargetSpeed] = useState(0.015);

  
  // ── Scratch Engine ─────────────────────────────────────────────────────────
  const engineRef            = useRef(null);
  const engineCreationIdRef  = useRef(0);
  const lastDragRateRef      = useRef(1);
  const rateEasingRafRef     = useRef(null);

  // Tear down engine when song changes so the next drag loads the new track
  useEffect(() => {
    engineCreationIdRef.current++;
    if (rateEasingRafRef.current) {
      cancelAnimationFrame(rateEasingRafRef.current);
      rateEasingRafRef.current = null;
    }
    if (engineRef.current) {
      engineRef.current.suspend();
      engineRef.current = null;
    }
  }, [activeSong.id]);

  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      if (rateEasingRafRef.current) cancelAnimationFrame(rateEasingRafRef.current);
      engineRef.current?.suspend();
    };
  }, []);

  // Called the instant the user touches the disc — lazy-init engine
  const handleDragStart = useCallback(() => {
    if (rateEasingRafRef.current) {
      cancelAnimationFrame(rateEasingRafRef.current);
      rateEasingRafRef.current = null;
    }
    if (!engineRef.current) {
      const id = ++engineCreationIdRef.current;
      createScratchEngine(activeSong.audioSrc)
        .then(eng => {
          if (id !== engineCreationIdRef.current) { eng.suspend(); return; }
          engineRef.current = eng;
          eng.setRate(0);   // silent until dragging
          eng.resume();
        })
        .catch(console.error);
    }
  }, [activeSong.audioSrc]);

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
      }
    };
    rateEasingRafRef.current = requestAnimationFrame(ease);
  }, []);


  const handleSongSelect = (song) => {
    if (activeSong.id === song.id) return;
    
    // Smooth down vinyl speed
    setTargetSpeed(0.002);
    setActiveSong(song);
    
    // Ramp speed back up after a delay
    setTimeout(() => {
      setTargetSpeed(0.015);
    }, 400);
  };

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

  return (
    <>
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      
      <header className="nav glass">
        <div className="wrap">
          <a href="#top" className="logo">
            <Disc color="#C2185B" size={32} />
            Own A Song
          </a>
          <nav className="nav-links">
            <a href="#occasions">Occasions</a>
            <a href="#process">How It Works</a>
            <a href="#testimonials">Stories</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="nav-cta">
            <a href="#contact" className="btn btn-primary">Start Your Song</a>
          </div>
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
                            <div className="eq-bars">
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
              <span className="eyebrow">Custom Songs, Composed By Real Musicians</span>
              <h1>Your story,<br/>composed with love.</h1>
              <p>We turn your memories into a one-of-a-kind song — written, performed and produced by real musicians. Not a single note of AI.</p>
              <div className="hero-cta-row">
                <a href="#contact" className="btn btn-primary">
                  Start Your Song <ArrowRight size={18} />
                </a>
                <a href="#testimonials" className="btn btn-outline">
                  <Play size={18} /> Hear a Sample
                </a>
              </div>
            </motion.div>
          </div>
        </section>


        {/* TRUST STRIP */}
        <div className="trust-strip glass">
          <div className="wrap">
            <motion.span initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.1}}><Check size={18} /> 100% Human-Made</motion.span>
            <motion.span initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.2}}><Check size={18} /> 4,000+ Happy Clients</motion.span>
            <motion.span initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.3}}><Check size={18} /> Studio Recorded</motion.span>
            <motion.span initial={{opacity:0, y:10}} whileInView={{opacity:1, y:0}} viewport={{once:true}} transition={{delay:0.4}}><Check size={18} /> Delivered in Days</motion.span>
          </div>
        </div>

        {/* OCCASIONS */}
        <section id="occasions">
          <div className="wrap">
            <Reveal className="section-head">
              <span className="eyebrow">Choose Your Track</span>
              <h2>What's the story you want to tell?</h2>
            </Reveal>
            <div className="occasions-grid">
              {[
                { title: "Birthday Song", desc: "A song built from their favourite memories — the one gift they'll replay every year." },
                { title: "Anniversary Song", desc: "Every inside joke, every \"remember when\" — composed into a track that's only yours." },
                { title: "Wedding Surprise", desc: "A first-dance or reception moment nobody saw coming — and nobody will forget." },
                { title: "Friendship & Family", desc: "For the people who've stuck around — because \"thank you\" sometimes needs a melody." },
                { title: "Corporate Tribute", desc: "Mark a milestone, honour a retirement, or open an event with something no slideshow can." }
              ].map((occ, i) => (
                <Reveal key={i} delay={i * 0.1} className="occasion-card glass">
                  <div className="occasion-disc"></div>
                  <h3>{occ.title}</h3>
                  <p>{occ.desc}</p>
                  <a href="#contact" className="link">Explore <ArrowRight size={16} /></a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* PROCESS */}
        <section className="process" id="process">
          <div className="wrap">
            <Reveal className="section-head">
              <span className="eyebrow">Side A — The Process</span>
              <h2>From your story to their song</h2>
              <p>Six steps, no shortcuts. Every one done by a real person who cares how it turns out.</p>
            </Reveal>

            <div className="tracklist">
              {[
                { time: "Day 1", title: "Share Your Story", desc: "Message us or fill a short form with the memory, feeling or moment you want turned into a song." },
                { time: "Day 1", title: "Consultation Call", desc: "Our team calls to understand the tone, the names, the details worth keeping." },
                { time: "Day 2–3", title: "Lyrics & Melody Draft", desc: "Our songwriters draft custom lyrics and a rough melody, shared with you first." },
                { time: "Day 3–4", title: "Studio Recording", desc: "Professional vocalists and musicians record and produce the final track." },
                { time: "Day 5", title: "Review & Refine", desc: "You get a preview, we polish it based on your feedback." },
                { time: "Day 5–7", title: "Delivered With Love", desc: "Your final song arrives — ready to play, gift, or surprise someone with." }
              ].map((track, i) => (
                <Reveal key={i} delay={i * 0.1} className="track-row">
                  <div className="track-num">0{i+1}</div>
                  <div>
                    <div className="track-title">{track.title}</div>
                    <div className="track-desc">{track.desc}</div>
                  </div>
                  <div className="track-time">{track.time}</div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials">
          <div className="wrap">
            <Reveal className="section-head">
              <span className="eyebrow">Liner Notes</span>
              <h2>What they're playing on repeat</h2>
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

        {/* INSTAGRAM */}
        <section className="instagram" id="instagram">
          <div className="wrap">
            <Reveal className="insta-head">
              <div>
                <span className="eyebrow">Behind the Music</span>
                <h2>Follow the making of every song</h2>
              </div>
              <a href="#" className="btn btn-outline"><span style={{fontWeight:'bold'}}>IG</span> @ownasong</a>
            </Reveal>
            <div className="insta-grid">
              {['Studio Session', 'Her Reaction', 'Lyric Writing', 'Wedding Surprise', 'Meet the Team', 'Vocal Take 3'].map((txt, i) => (
                <Reveal key={i} delay={i * 0.05} className="insta-tile">
                  <div className="insta-play"><Play size={12} fill="#fff" /></div>
                  <span>{txt}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="final-cta" id="contact">
          <Reveal className="wrap">
            <h2>Ready to give a song only you could write?</h2>
            <p>Tell us the story. We'll bring the music.</p>
            <a href="https://wa.me/918374376200" target="_blank" rel="noopener noreferrer" className="btn btn-light">
              Start Your Song on WhatsApp
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
                <Disc color="#FFF9F6" size={28} />
                Own A Song
              </div>
              <div className="footer-tagline">Your story, composed with love — one custom song at a time.</div>
            </div>
            <div className="footer-links">
              <div className="footer-col">
                <h4>Explore</h4>
                <ul>
                  <li><a href="#occasions">Occasions</a></li>
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
    </>
  );
}
