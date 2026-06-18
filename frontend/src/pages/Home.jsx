import React from "react";
import { BookOpen, Plus, ArrowRight } from "lucide-react";

export const Home = ({ stats, setView, setBookModal }) => {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span>✦</span>
            <span>A reading community</span>
          </div>

          <h1 className="hero-title">
            Borrow a book. <span>Pass it on.</span>
          </h1>

          <p className="hero-description">
            Book Nook is a shared shelf for our team. List a book you'd
            lend, borrow one you've been meaning to read, and swap stories
            along the way.
          </p>

          <div className="hero-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => setView("catalog")}
            >
              Browse the shelf
              <BookOpen size={18} />
            </button>

            <button 
              className="btn btn-outline"
              onClick={() => setBookModal({ 
                title: "", 
                author: "", 
                genreId: "", 
                condition: "good", 
                defaultLoanDays: 14, 
                description: "", 
                coverUrl: "" 
              })}
            >
              Lend a book
              <Plus size={18} />
            </button>
          </div>

          <div className="home-stats">
            <div className="home-stat-card">
              <label>Books on the shelf</label>
              <strong>{stats?.totalBooks || 0}</strong>
            </div>
            <div className="home-stat-card">
              <label>Available to borrow</label>
              <strong>{stats?.availableBooks || 0}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2 className="section-title">How it works</h2>
        
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">01</div>
            <h3 className="step-title">List a book</h3>
            <p className="step-description">
              Add a book you own and are happy to lend. Takes 30 seconds.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">02</div>
            <h3 className="step-title">Request to borrow</h3>
            <p className="step-description">
              Find a title you love and send a quick request to the owner.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">03</div>
            <h3 className="step-title">Read & return</h3>
            <p className="step-description">
              Enjoy the read, then return it so the next reader can dive in.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
