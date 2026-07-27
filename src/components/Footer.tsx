import React from 'react';
import { Heart, Mail, ExternalLink, Activity, Code } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      marginTop: '4rem',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(15, 15, 25, 0.75)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      padding: '3rem 1.5rem 2rem 1.5rem',
      color: 'var(--text-secondary)'
    }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2.5rem',
          marginBottom: '2.5rem'
        }}>
          {/* Column 1: Brand & Purpose */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Activity style={{ color: 'var(--accent-primary)' }} size={22} />
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }} className="text-gradient">
                ChuniTrrracker
              </span>
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Advanced statistics tracking, Possession plate progress, and Overpower (OP) analytics for the rhythm game CHUNITHM.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)' }}>
              CHUNITHM LUMINOUS PLUS Overpower calculations.
            </div>
          </div>

          {/* Column 2: Resources & Links */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Code size={16} /> Links & Support
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <li>
                <a
                  href="https://github.com/Lolergags/ChuniTrrracker"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                    <path d="M9 18c-4.51 2-5-2-7-2"></path>
                  </svg> Source Code (GitHub) <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="https://buymeacoffee.com/lolergags"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ffdd00'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <Heart size={16} style={{ color: '#ffdd00' }} /> Support Project (Buy Me a Coffee) <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="mailto:lolergags@proton.me"
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <Mail size={16} /> Contact Developer (lolergags@proton.me)
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Data Sources & Credits */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Data Sources & Credits
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <li>
                Scores provided by{' '}
                <a
                  href="https://kamai.tachi.ac/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
                >
                  Kamaitachi <ExternalLink size={10} />
                </a>
              </li>
              <li>
                Song metadata sourced from{' '}
                <a
                  href="https://chunithm.beerpsi.cc/songs"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
                >
                  beerpsi's song list <ExternalLink size={10} />
                </a>
              </li>
              <li>
                Offline tracklist from{' '}
                <a
                  href="https://github.com/Lolergags/Paradise_Lost_Offline_Songlist"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}
                >
                  Paradise Lost Offline <ExternalLink size={10} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.8rem',
          color: 'rgba(255, 255, 255, 0.4)'
        }}>
          <div>
            © {new Date().getFullYear()} ChuniTrrracker. Built with React & TypeScript.
          </div>
          <div>
            CHUNITHM is a registered trademark of SEGA. This site is fan-made and not affiliated with SEGA.
          </div>
        </div>
      </div>
    </footer>
  );
};
