"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@contexts/authContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../styles.module.css';

function Dashboard() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    
    useEffect(() => {
        // Only redirect if we're not loading and there's no user
        if (!loading && !user) {
            console.log('No authenticated user found, redirecting to login');
            router.push('/login');
        }
    }, [user, loading, router]);

    // Define poker guide resources
    const pokerGuides = [
        {
            title: 'Poker Hand Rankings',
            description: 'Learn about the different poker hands and their rankings from Royal Flush to High Card.',
            link: '/guides/hand-rankings',
            icon: '🃏'
        },
        {
            title: 'Basic Strategy',
            description: 'Master the fundamentals of poker strategy including position, pot odds, and hand selection.',
            link: '/guides/basic-strategy',
            icon: '🧠'
        },
        {
            title: 'Betting Patterns',
            description: 'Understand different betting patterns and what they reveal about your opponents.',
            link: '/guides/betting-patterns',
            icon: '💰'
        },
        {
            title: 'Tournament Play',
            description: 'Learn the differences between cash games and tournaments, and how to adjust your strategy.',
            link: '/guides/tournament-strategy',
            icon: '🏆'
        }
    ];

    // Show loading if profile is loading
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4caf50] border-t-transparent mb-4"></div>
                <p>Loading your profile...</p>
            </div>
        );
    }

    // If not loading and still no profile, we'll be redirected, but show a message
    if (!user) {
        return <div className={styles.loadingContainer}>Redirecting to login...</div>;
    }

    return (
        <div className={`${styles.dashboardWrapper} w-full m-0 p-0`}>
            <div className={styles.dashboardContainer}>
                <header className={styles.dashboardHeader}>
                    <h1>Welcome, {user.username}!</h1>
                    <p>Current Balance: {user.balance}</p>
                </header>

                {/* Enhanced poker guides section */}
                <section className={styles.dashboardSection}>
                    <h2>Learn to Play Poker</h2>
                    <p className={styles.sectionIntro}>
                        New to poker or looking to improve your skills? Check out these helpful resources.
                    </p>
                    <div className={styles.guideCards}>
                        {pokerGuides.map((guide, index) => (
                            <div className={styles.guideCard} key={index}>
                                <div className={styles.guideIcon}>{guide.icon}</div>
                                <h3>{guide.title}</h3>
                                <p>{guide.description}</p>
                                <Link href={guide.link} className={styles.guideLink}>
                                    Read More →
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Recent games section */}
                <section className={styles.dashboardSection}>
                    <h2>Your Recent Games</h2>
                    <div className={styles.recentGames}>
                        <p>No recent games found. Ready to play?</p>
                        <Link href="/poker/join" className={styles.primaryButton}>
                            Find a Game
                        </Link>
                    </div>
                </section>

                {/* Video tutorials section - New addition */}
                <section className={styles.dashboardSection}>
                    <h2>Video Tutorials</h2>
                    <div className={styles.videoTutorials}>
                        <div className={styles.videoCard}>
                            <div className={styles.videoThumbnail}>
                                <div className={styles.playIcon}>▶</div>
                            </div>
                            <h3>How to Play Texas Hold'em</h3>
                            <p>A complete walkthrough of Texas Hold'em rules and gameplay.</p>
                            <Link href="/tutorials/texas-holdem" className={styles.videoLink}>
                                Watch Tutorial
                            </Link>
                        </div>
                        <div className={styles.videoCard}>
                            <div className={styles.videoThumbnail}>
                                <div className={styles.playIcon}>▶</div>
                            </div>
                            <h3>Reading Your Opponents</h3>
                            <p>Learn to spot tells and read betting patterns to gain an edge.</p>
                            <Link href="/tutorials/reading-opponents" className={styles.videoLink}>
                                Watch Tutorial
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Tips and tricks section */}
                <section className={styles.dashboardSection}>
                    <h2>Poker Tip of the Day</h2>
                    <div className={styles.tipCard}>
                        <p>
                            <strong>Position Matters:</strong> One of the most important concepts in poker is 
                            position. Playing in later positions gives you more information about what other 
                            players are doing, allowing for better decision making.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Dashboard;