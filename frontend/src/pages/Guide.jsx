import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Particles from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import {
    LogIn,
    LayoutDashboard,
    Search,
    SendHorizontal,
    Hourglass,
    CheckCircle,
    PlusCircle
} from "lucide-react";

export function Guide() {
    const [init, setInit] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setInit(true);
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const particlesInit = async (engine) => {
        await loadSlim(engine);
    };

    const flowSteps = [
        { id: "login", title: "Login", desc: "Access with your community account.", icon: LogIn },
        { id: "dashboard", title: "Dashboard", desc: "View library activity metrics panels.", icon: LayoutDashboard },
        { id: "browse", title: "Go to Browse", desc: "Explore public book collections.", icon: Search },
        { id: "request", title: "Request", desc: "Set borrow duration terms and submit.", icon: SendHorizontal },
        { id: "wait", title: "Wait for Approval", desc: "Lender reviews transaction request.", icon: Hourglass },
        { id: "reading", title: "Currently Reading", desc: "Access granted! Enjoy your read.", icon: CheckCircle }
    ];

    const particlesOptions = {
        fpsLimit: 60,
        particles: {
            color: { value: "#b47b2b" },
            links: { enable: true, color: "#e7e5e4", distance: 120, opacity: 0.15 },
            move: { enable: true, speed: 0.6, direction: "none", outModes: { default: "bounce" } },
            number: { value: 15, density: { enable: true, area: 800 } },
            opacity: { value: 0.15 },
            size: { value: { min: 1, max: 2 } }
        },
        detectRetina: true
    };

    return (
        <div className="guide-flow-canvas">
            {init && (
                <Particles id="guide-tsparticles" className="particles-canvas" particlesInit={particlesInit} options={particlesOptions} />
            )}

            <div className="guide-flow-viewport">
                <div className="guide-flow-inner">
                    <section className="topbar">
                        <div className="page-title">
                            <h2 className="hero-gradient">Application Guide</h2>
                            <p>Learn how to navigate BookNook — from browsing and requesting books to managing your shelf.</p>
                        </div>
                    </section>

                    {/* Core Vertical Timeline Container */}
                    <div className="vertical-timeline-container">
                        <div className="timeline-backbone-line"></div>

                        {flowSteps.map((step, idx) => {
                            const IconComponent = step.icon;
                            const isEven = idx % 2 === 0;

                            return (
                                <div 
                                    key={step.id} 
                                    className={`timeline-journey-row ${isEven ? 'row-left-align' : 'row-right-align'} ${step.id === 'reading' ? 'final-success-node' : ''}`}
                                >
                                    {/* Content Block */}
                                    <div className="journey-text-block">
                                        <span className="node-step-tag">Step {String(idx + 1).padStart(2, '0')}</span>
                                        <h4>{step.title}</h4>
                                        <p>{step.desc}</p>
                                    </div>

                                    {/* Large Floating Circular Anchor */}
                                    <div className="journey-circle-anchor">
                                        <div className="inner-circle-badge">
                                            <IconComponent size={26} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick Actions Footer Box */}
                    <div className="flow-action-faq-row">
                        <div className="faq-action-card">
                            <div className="faq-action-header">
                                {/* <PlusCircle size={16} /> */}
                                <h5>How users can add a book?</h5>
                            </div>
                            <p>They can add a book by clicking the add button, and then entering the details and saving them.</p>
                        </div>
                        <div className="faq-action-card">
                            <div className="faq-action-header">
                                {/* <PlusCircle size={16} /> */}
                                <h5>How they can request a book?</h5>
                            </div>
                            <p>Through browse page, they can click the request button and then fill the details and request the book.</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}