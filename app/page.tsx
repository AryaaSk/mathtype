import Link from "next/link";
import { TemplateGrid } from "./components/Landing/TemplateGrid";
import MathLiveProvider from "./components/MathLiveProvider";
import MathNotebook from "./components/MathNotebook/MathNotebook";
import type { MathLine } from "./components/MathNotebook/types";
import demoTemplate from "../public/templates/pythagorean-theorem.json";

export default async function LandingPage() {
  const demoLines = demoTemplate.lines as MathLine[];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafaf8',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif'
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.015) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        borderBottom: '1px solid #eee'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 600, color: '#7c3aed' }}>∫</span>
            <span style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a' }}>MathType</span>
          </div>
          <Link
            href="/notebook"
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#555',
              textDecoration: 'none',
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
              background: 'white'
            }}
          >
            Open Notebook
          </Link>
        </div>
      </header>

      {/* Hero Section - Side by side */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        padding: '24px 24px 32px',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <div style={{
          display: 'flex',
          gap: 40,
          alignItems: 'flex-start'
        }}>
          {/* Left - Text */}
          <div style={{ width: 360, paddingTop: 24 }}>
            <h1 style={{
              fontSize: 38,
              fontWeight: 600,
              color: '#1a1a1a',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              margin: '0 0 14px',
              fontFamily: 'ui-serif, Georgia, serif'
            }}>
              A notebook for maths that actually helps
            </h1>
            <p style={{
              fontSize: 15,
              color: '#666',
              lineHeight: 1.6,
              margin: '0 0 20px'
            }}>
              Write LaTeX equations, work through problems step-by-step, and get feedback as you go. Stuck? Ask for a hint. Made an error? Catch it before moving on.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Link
                href="/notebook"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'white',
                  background: '#1a1a1a',
                  padding: '10px 18px',
                  borderRadius: 8,
                  textDecoration: 'none'
                }}
              >
                Start writing
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <a
                href="#templates"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#666',
                  textDecoration: 'none',
                  padding: '10px 14px'
                }}
              >
                Browse templates ↓
              </a>
            </div>
          </div>

          {/* Right - Interactive Demo (scaled to 78%) */}
          <div style={{
            width: 360,
            height: 380,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'white',
            borderRadius: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.1)',
            border: '1px solid #ddd'
          }}>
            <div style={{
              width: 462,
              transform: 'scale(0.78)',
              transformOrigin: 'top left'
            }}>
              <MathLiveProvider>
                <MathNotebook initialLines={demoLines} minimal />
              </MathLiveProvider>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid #eee',
        background: '#fafaf8'
      }}>
        <div style={{
          maxWidth: 800,
          margin: '0 auto',
          padding: '40px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 32
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 40,
              height: 40,
              margin: '0 auto 12px',
              borderRadius: 10,
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>?</div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: '0 0 6px' }}>
              Hints when stuck
            </h3>
            <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5 }}>
              Get a gentle nudge in the right direction without spoiling the answer
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 40,
              height: 40,
              margin: '0 auto 12px',
              borderRadius: 10,
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>✓</div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: '0 0 6px' }}>
              Check your work
            </h3>
            <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5 }}>
              Verify each step is correct before moving on to the next one
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 40,
              height: 40,
              margin: '0 auto 12px',
              borderRadius: 10,
              background: '#f3e8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}>∑</div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', margin: '0 0 6px' }}>
              Beautiful LaTeX
            </h3>
            <p style={{ fontSize: 13, color: '#888', margin: 0, lineHeight: 1.5 }}>
              Write equations naturally with instant rendering as you type
            </p>
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section id="templates" style={{
        position: 'relative',
        zIndex: 1,
        background: 'white',
        borderTop: '1px solid #eee'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '40px 24px'
        }}>
          <h2 style={{
            fontSize: 24,
            fontWeight: 600,
            color: '#1a1a1a',
            textAlign: 'center',
            margin: '0 0 6px',
            fontFamily: 'ui-serif, Georgia, serif'
          }}>
            Start with a template
          </h2>
          <p style={{
            fontSize: 15,
            color: '#888',
            textAlign: 'center',
            margin: '0 0 28px'
          }}>
            Practice sheets for different topics and skill levels
          </p>
          <TemplateGrid />
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid #eee',
        padding: '20px 24px',
        textAlign: 'center',
        background: 'white'
      }}>
        <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>
          Built with Next.js and MathLive
        </p>
      </footer>
    </div>
  );
}
