import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

const GENRES = ['Pop', 'Rap', 'Tollywood / Bollywood', 'Other'];
const MOODS = ['Love / Romantic', 'Happy', 'Sad', 'Inspirational', 'Other'];
const PRICING_OPTIONS = ['Basic', 'Premium', 'Advanced', 'Mini'];

export default function OrderForm({ isOpen, onClose, initialPlan }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    genre: '',
    mood: '',
    dedicatingFrom: '',
    dedicatingTo: '',
    relation: '',
    occasion: '',
    story: '',
    pricing: initialPlan || '',
    deliveryDate: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Update initialPlan when it changes (i.e. user clicks a different plan)
  React.useEffect(() => {
    if (initialPlan) {
      setFormData(prev => ({ ...prev, pricing: initialPlan }));
    }
    if (isOpen) {
      setStep(1);
      setIsSubmitted(false);
    }
  }, [initialPlan, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate submission
    setIsSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className="form-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="form-container glass"
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <button className="form-close" onClick={onClose}><X size={24} /></button>
          
          <div className="form-content">
            {!isSubmitted ? (
              <>
                <div className="form-header">
                  <h2>Order Your Song</h2>
                  <div className="form-progress">
                    <div className="progress-bar">
                      <motion.div 
                        className="progress-fill" 
                        initial={false}
                        animate={{ width: `${(step / 3) * 100}%` }}
                      />
                    </div>
                    <span className="step-text">Step {step} of 3</span>
                  </div>
                </div>

                <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); nextStep(); }}>
                  
                  {/* STEP 1: Contact */}
                  {step === 1 && (
                    <motion.div className="form-step" initial={{x: 20, opacity: 0}} animate={{x: 0, opacity: 1}}>
                      <div className="form-group">
                        <label>What's your name? *</label>
                        <input type="text" name="name" required placeholder="Your name" value={formData.name} onChange={handleChange} />
                      </div>
                      <div className="form-group">
                        <label>What's your email? *</label>
                        <input type="email" name="email" required placeholder="xxx@gmail.com" value={formData.email} onChange={handleChange} />
                      </div>
                      <div className="form-group">
                        <label>What's your phone number? *</label>
                        <input type="tel" name="phone" required placeholder="Ex.: 9995559995" value={formData.phone} onChange={handleChange} />
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: Song Details */}
                  {step === 2 && (
                    <motion.div className="form-step" initial={{x: 20, opacity: 0}} animate={{x: 0, opacity: 1}}>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Who's dedicating the song? *</label>
                          <input type="text" name="dedicatingFrom" required placeholder="Person Name" value={formData.dedicatingFrom} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                          <label>Song dedicating to? *</label>
                          <input type="text" name="dedicatingTo" required placeholder="Person Name" value={formData.dedicatingTo} onChange={handleChange} />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Your relation with them? *</label>
                          <input type="text" name="relation" required placeholder="Ex: Brother / lover / Son" value={formData.relation} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                          <label>Song occasion? *</label>
                          <input type="text" name="occasion" required placeholder="Ex: Anniversary / Birthday" value={formData.occasion} onChange={handleChange} />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Please choose genre (just choose one) *</label>
                        <div className="radio-grid">
                          {GENRES.map(g => (
                            <label key={g} className={`radio-card ${formData.genre === g ? 'active' : ''}`}>
                              <input type="radio" name="genre" value={g} checked={formData.genre === g} onChange={handleChange} required />
                              {g}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Please choose mood (just choose one) *</label>
                        <div className="radio-grid">
                          {MOODS.map(m => (
                            <label key={m} className={`radio-card ${formData.mood === m ? 'active' : ''}`}>
                              <input type="radio" name="mood" value={m} checked={formData.mood === m} onChange={handleChange} required />
                              {m}
                            </label>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: Story & Delivery */}
                  {step === 3 && (
                    <motion.div className="form-step" initial={{x: 20, opacity: 0}} animate={{x: 0, opacity: 1}}>
                      <div className="form-group">
                        <label>What's your story? *</label>
                        <textarea name="story" required placeholder="Tell us the details..." value={formData.story} onChange={handleChange} rows={5} />
                      </div>

                      <div className="form-group">
                        <label>Choose the pricing *</label>
                        <div className="radio-grid">
                          {PRICING_OPTIONS.map(p => (
                            <label key={p} className={`radio-card ${formData.pricing === p ? 'active' : ''}`}>
                              <input type="radio" name="pricing" value={p} checked={formData.pricing === p} onChange={handleChange} required />
                              {p}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Expecting delivery date? *</label>
                        <input type="date" name="deliveryDate" required value={formData.deliveryDate} onChange={handleChange} />
                      </div>
                    </motion.div>
                  )}

                  <div className="form-actions">
                    {step > 1 && (
                      <button type="button" className="btn-form-secondary" onClick={prevStep}>
                        <ArrowLeft size={18} /> Back
                      </button>
                    )}
                    {step < 3 ? (
                      <button type="submit" className="btn-form-primary" style={{ marginLeft: 'auto' }}>
                        Continue <ArrowRight size={18} />
                      </button>
                    ) : (
                      <button type="submit" className="btn-form-primary" style={{ marginLeft: 'auto' }}>
                        Submit Order <CheckCircle2 size={18} />
                      </button>
                    )}
                  </div>
                </form>
              </>
            ) : (
              <motion.div className="form-success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <CheckCircle2 size={64} color="var(--rose)" />
                <h2>Order Received!</h2>
                <p>We'll be in touch shortly to start crafting your unique song.</p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
