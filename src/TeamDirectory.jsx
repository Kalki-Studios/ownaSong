import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
// Full 22 real members from the user's provided images
const TEAM_MEMBERS = [
  { id: 1, name: "ENREDH", role: "Singer, Songwriter, Music Producer", instagram: "@enredh", image: "/team/enredh.jpg" },
  { id: 2, name: "TAEZY", role: "Singer, Songwriter", instagram: "@its.taezy", image: "/team/taezy.jpg" },
  { id: 3, name: "SAYAN", role: "Singer, Songwriter", instagram: "@sayansebs", image: "/team/sayan.jpg" },
  { id: 4, name: "ADARSH", role: "Singer", instagram: "@adarsh_vox", image: "/team/adarsh.jpg" },
  { id: 5, name: "VIJAY", role: "Pianist, Music Producer", instagram: "@kadavijayanand", image: "/team/vijay.jpg" },
  { id: 6, name: "SATWIK", role: "Pianist, Music Producer", instagram: "@satwikmelchisedek", image: "/team/satwik.jpg" },
  { id: 7, name: "UDAY", role: "Pianist, Music Producer", instagram: "@r_star_uday", image: "/team/uday.jpg" },
  { id: 8, name: "SANJU", role: "Singer, Songwriter", instagram: "@sanju_song_s", image: "/team/sanju.jpg" },
  { id: 9, name: "HARSHA", role: "Guitarist", instagram: "@druncenmonkey", image: "/team/harsha.jpg" },
  { id: 10, name: "SHRUTHI", role: "Singer", instagram: "@prin.cessishu_", image: "/team/shruthi.jpg" },
  { id: 11, name: "JAYARAJ", role: "Singer", instagram: "@thestarnani", image: "/team/jayaraj.jpg" },
  { id: 12, name: "CHARAN", role: "Singer", instagram: "@charansinger", image: "/team/charan.jpg" },
  { id: 13, name: "MANJU SRI", role: "Singer", instagram: "@manjusri.mutyam", image: "/team/manjusri.jpg" },
  { id: 14, name: "SREEHARI", role: "Mixing & Mastering Engineer", instagram: "@sree__sreehari", image: "/team/sreehari.jpg" },
  { id: 15, name: "AVINASH", role: "Music Producer, Composer & Mixing Engineer", instagram: "@avinash_raja111", image: "/team/avinash.jpg" },
  { id: 16, name: "MURALI", role: "Singer, Songwriter", instagram: "@muralli.official", image: "/team/murali.jpg" },
  { id: 17, name: "AAKARSH", role: "Singer", instagram: "@aakarsh_pithani", image: "/team/aakarsh.jpg" },
  { id: 18, name: "HARI PRIYA", role: "Singer", instagram: "@haripriya_regilla", image: "/team/haripriya.jpg" },
  { id: 19, name: "RAJA", role: "Singer", instagram: "@itz_vijay_350_", image: "/team/raja.jpg" },
  { id: 20, name: "SUNDAR SINGH", role: "Singer, Songwriter & Composer", instagram: "@singhzzzzyyy", image: "/team/sundarsingh.jpg" },
  { id: 21, name: "PRADEEP", role: "Lyricist", instagram: "@pradeepmanyam", image: "/team/pradeep.jpg" },
  { id: 22, name: "NAGESH", role: "Lyricist", instagram: "@nagesh_sivasri", image: "/team/nagesh.jpg" }
];

export default function TeamDirectory({ onBack }) {
  // Scroll to top when view is mounted
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <motion.div 
      className="team-directory-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <div className="team-directory-header">
        <div className="wrap">
          <button className="btn-back" onClick={onBack}>
            <ArrowLeft size={20} /> Back to Home
          </button>
          
          <div className="directory-title text-center">
            <span className="eyebrow">The Heart of Own A Song</span>
            <h1>Meet The Full Team</h1>
            <p>Our 22 brilliant artists, producers, and writers who bring your stories to life.</p>
          </div>
        </div>
      </div>

      <div className="wrap">
        <div className="team-grid directory-grid">
          {TEAM_MEMBERS.map((member, i) => (
            <motion.div 
              key={member.id} 
              className="team-card glass text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 4) * 0.1 }}
            >
              <div className="team-image-wrapper">
                <img src={member.image} alt={member.name} className="team-image" />
              </div>
              <h3>{member.name}</h3>
              <p className="team-role">{member.role}</p>
              <a href={`https://instagram.com/${member.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="team-insta">
                {member.instagram}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
