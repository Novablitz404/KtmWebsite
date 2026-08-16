"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import {
    ArrowDown,
    ArrowRight,
    CalendarDays,
    MapPin,
    Menu,
    Trophy,
    X,
} from "lucide-react";
import styles from "./LandingPage.module.css";
import AuthErrorScreen from "./AuthErrorScreen";

interface EventItem {
    id: string;
    name: string;
    type: string;
    date: string;
    venue: string | null;
    imageUrl?: string | null;
}

interface TapEliteLandingPageProps {
    stats?: { athletes: number; clubs: number; events: number };
    upcomingEvents?: EventItem[];
    pastEvents?: EventItem[];
}

const disciplines = [
    {
        number: "01",
        eyebrow: "Courtesy (Ye-Ui)",
        title: "Begin with respect",
        copy: "Honor your instructors, your opponents, and the people who share the floor with you.",
        image: "/tap-elite/landing/poomsae.jpg",
        position: "center",
    },
    {
        number: "02",
        eyebrow: "Integrity (Yom-Chi)",
        title: "Do what is right",
        copy: "Compete honestly, take responsibility, and hold your character to the same standard as your technique.",
        image: "/tap-elite/landing/hero.jpg",
        position: "center",
    },
    {
        number: "03",
        eyebrow: "Perseverance (In-Nae)",
        title: "Keep moving forward",
        copy: "Stay with the work through difficult rounds, slow progress, and every setback along the way.",
        image: "/tap-elite/landing/sparring.jpg",
        position: "center",
    },
    {
        number: "04",
        eyebrow: "Self-control (Guk-Gi)",
        title: "Master the moment",
        copy: "Control emotion, power, and reaction so every movement is deliberate—inside and outside competition.",
        image: "/tap-elite/landing/poomsae.jpg",
        position: "70% center",
    },
    {
        number: "05",
        eyebrow: "Indomitable spirit (Baekjul-Boolgool)",
        title: "Stand when it is hard",
        copy: "Meet fear and adversity with courage, conviction, and a spirit that refuses to be defeated.",
        image: "/tap-elite/landing/hero.jpg",
        position: "65% center",
    },
];

function Counter({ value }: { value: number }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) {
            const timer = window.setTimeout(() => setCount(value), 0);
            return () => window.clearTimeout(timer);
        }

        let frame = 0;
        const start = performance.now();
        const duration = 900;
        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            setCount(Math.round((1 - Math.pow(1 - progress, 4)) * value));
            if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [value]);

    return <>{count.toLocaleString()}</>;
}

function Intro() {
    const [visible, setVisible] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            const timer = window.setTimeout(() => setVisible(false), 0);
            return () => window.clearTimeout(timer);
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const interval = window.setInterval(() => {
            setProgress((current) => Math.min(current + 4, 100));
        }, 28);
        const timer = window.setTimeout(() => setVisible(false), 900);

        return () => {
            window.clearInterval(interval);
            window.clearTimeout(timer);
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        if (!visible) document.body.style.overflow = "";
    }, [visible]);

    if (!visible) return null;

    return (
        <div className={`${styles.intro} ${progress === 100 ? styles.introDone : ""}`} aria-hidden="true">
            <div className={styles.introMark}>TAP ELITE<span>.</span></div>
            <div className={styles.introProgress}>{progress}<span>%</span></div>
        </div>
    );
}

export function TapEliteNavbar({ qs, solid = false, light = false }: { qs: string; solid?: boolean; light?: boolean }) {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const close = () => setOpen(false);
    const sectionHref = (section: string) => solid ? `/${qs}#${section}` : `#${section}`;

    useEffect(() => {
        const updateNavbar = () => setScrolled(window.scrollY > 24);
        updateNavbar();
        window.addEventListener("scroll", updateNavbar, { passive: true });
        return () => window.removeEventListener("scroll", updateNavbar);
    }, []);

    return (
        <header className={`${styles.navbar} ${!light && (solid || scrolled) ? styles.navbarScrolled : ""} ${light ? styles.navbarLight : ""} ${light && scrolled ? styles.navbarLightScrolled : ""}`}>
            <Link href={`/${qs}`} className={styles.brand} aria-label="Tap Elite home">
                <Image
                    src={light ? "/tap-elite/tap_elite_horizontal_light_transparent.png" : "/tap-elite/tap_elite_horizontal_transparent.png"}
                    alt="Tap Elite"
                    width={140}
                    height={56}
                    priority
                />
            </Link>

            <nav className={styles.desktopNav} aria-label="Main navigation">
                <a href={sectionHref("disciplines")}>Tenets</a>
                <a href={sectionHref("events")}>Events</a>
                <a href={sectionHref("method")}>The standard</a>
                <a href={sectionHref("community")}>Community</a>
            </nav>

            <div className={styles.accountActions}>
                <Link href={`/sign-in${qs}`} className={styles.accountSignIn}>Sign in</Link>
                <Link href={`/sign-up${qs}`} className={styles.navCta}>Create Account</Link>
            </div>
            <button
                className={styles.menuButton}
                onClick={() => setOpen((value) => !value)}
                aria-label={open ? "Close navigation" : "Open navigation"}
                aria-expanded={open}
            >
                {open ? <X /> : <Menu />}
            </button>

            {open && (
                <nav className={styles.mobileNav} aria-label="Mobile navigation">
                    <a href={sectionHref("disciplines")} onClick={close}>Tenets</a>
                    <a href={sectionHref("events")} onClick={close}>Events</a>
                    <a href={sectionHref("method")} onClick={close}>The standard</a>
                    <a href={sectionHref("community")} onClick={close}>Community</a>
                    <div className={styles.mobileAccountActions}>
                        <Link href={`/sign-in${qs}`} onClick={close}>Sign in</Link>
                        <Link href={`/sign-up${qs}`} onClick={close}>Create Account <ArrowRight size={16} /></Link>
                    </div>
                </nav>
            )}
        </header>
    );
}

export function TapEliteFooter({ qs, standalone = false }: { qs: string; standalone?: boolean }) {
    const sectionHref = (section: string) => standalone ? `/${qs}#${section}` : `#${section}`;

    return (
        <div className={styles.footerSurface}>
            <footer className={styles.footer}>
                <div className={styles.footerBrand}>
                    <Image src="/tap-elite/tap_elite_horizontal_transparent.png" alt="Tap Elite" width={170} height={68} />
                    <p>Elite Taekwondo Association<br />of the Philippines</p>
                </div>
                <div className={styles.footerLinks}>
                    <div>
                        <p>Explore</p>
                        <a href={sectionHref("disciplines")}>Tenets</a>
                        <a href={sectionHref("events")}>Events</a>
                        <a href={sectionHref("method")}>The standard</a>
                        <a href={sectionHref("board")}>Tap Board</a>
                    </div>
                    <div><p>Account</p><Link href={`/sign-in${qs}`}>Sign in</Link><Link href={`/sign-up${qs}`}>Create account</Link><Link href="/support">Support</Link></div>
                </div>
                <div className={styles.footerBottom}>
                    <span>© 2026 Elite Taekwondo Association of the Philippines</span>
                    <span className={styles.powered}>Powered by <Image src="/ktmnav_white.png" alt="KTM Sports" width={64} height={21} /></span>
                </div>
            </footer>
        </div>
    );
}

function EventCard({ event, qs, index }: { event: EventItem; qs: string; index: number }) {
    const isTournament = event.type === "Tournament";
    const href = isTournament ? `/tournament/${event.id}${qs}` : `/seminars/${event.id}${qs}`;
    const fallback = index % 2 === 0 ? "/tap-elite/landing/sparring.jpg" : "/tap-elite/landing/poomsae.jpg";
    const date = new Date(event.date).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    return (
        <Link href={href} className={styles.eventCard} data-reveal>
            <div className={styles.eventImage}>
                {/* Event banners are user-provided remote URLs, so a native image retains graceful fallback behavior. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={event.imageUrl || fallback}
                    alt=""
                    onError={(e) => { e.currentTarget.src = fallback; }}
                />
                <span>{event.type}</span>
            </div>
            <div className={styles.eventBody}>
                <p className={styles.eventIndex}>0{index + 1}</p>
                <h3>{event.name}</h3>
                <div className={styles.eventMeta}>
                    <span><CalendarDays size={15} />{date}</span>
                    {event.venue && <span><MapPin size={15} />{event.venue}</span>}
                </div>
                <strong>View event <ArrowRight size={16} /></strong>
            </div>
        </Link>
    );
}

export default function TapEliteLandingPage({ stats, upcomingEvents = [], pastEvents = [] }: TapEliteLandingPageProps) {
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get("tenant");
    const qs = tenantParam ? `?tenant=${tenantParam}` : "";
    const featuredEvents = useMemo(() => upcomingEvents.slice(0, 3), [upcomingEvents]);
    const tenetsRef = useRef<HTMLDivElement>(null);

    const [authError, setAuthError] = useState<{ code: string | null; description: string } | null>(null);

    useEffect(() => {
        // Supabase redirects expired/invalid auth links (e.g. password reset) here
        // with the error encoded in the URL hash rather than a query param.
        const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
        const hashParams = new URLSearchParams(hash);
        const error = hashParams.get("error");
        if (error) {
            const description = hashParams.get("error_description")?.replace(/\+/g, " ") || "This link is invalid or has expired.";
            setAuthError({ code: hashParams.get("error_code"), description });
        }
    }, []);

    useEffect(() => {
        const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add(styles.revealed);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -50px" });
        nodes.forEach((node) => observer.observe(node));
        return () => observer.disconnect();
    }, [featuredEvents.length, pastEvents.length]);

    useEffect(() => {
        const stack = tenetsRef.current;
        if (!stack) return;

        const cards = Array.from(stack.querySelectorAll<HTMLElement>("[data-tenet-card]"));
        const mobile = window.matchMedia("(max-width: 900px)");
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
        let frame = 0;

        const updateCards = () => {
            if (mobile.matches || reduceMotion.matches) {
                cards.forEach((card) => {
                    card.style.setProperty("--stack-scale", "1");
                    card.style.setProperty("--stack-brightness", "1");
                    card.style.setProperty("--stack-opacity", "1");
                });
                return;
            }

            cards.forEach((card, index) => {
                const nextCard = cards[index + 1];
                if (!nextCard) {
                    card.style.setProperty("--stack-scale", "1");
                    card.style.setProperty("--stack-brightness", "1");
                    card.style.setProperty("--stack-opacity", "1");
                    return;
                }

                const nextTop = nextCard.getBoundingClientRect().top;
                const animationStart = window.innerHeight * 0.9;
                const animationEnd = 150 + index * 18;
                const progress = Math.max(0, Math.min(1, (animationStart - nextTop) / (animationStart - animationEnd)));
                card.style.setProperty("--stack-scale", String(1 - progress * 0.055));
                card.style.setProperty("--stack-brightness", String(1 - progress * 0.42));
                card.style.setProperty("--stack-opacity", String(1 - progress * 0.12));
            });
        };

        const scheduleUpdate = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(updateCards);
        };

        scheduleUpdate();
        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);
        mobile.addEventListener("change", scheduleUpdate);
        reduceMotion.addEventListener("change", scheduleUpdate);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", scheduleUpdate);
            window.removeEventListener("resize", scheduleUpdate);
            mobile.removeEventListener("change", scheduleUpdate);
            reduceMotion.removeEventListener("change", scheduleUpdate);
        };
    }, []);

    if (authError) {
        return <AuthErrorScreen errorCode={authError.code} description={authError.description} qs={qs} />;
    }

    return (
        <main className={styles.page}>
            <Intro />
            <TapEliteNavbar qs={qs} />

            <section className={styles.hero}>
                <Image
                    src="/tap-elite/landing/hero.jpg"
                    alt="Tap Elite Taekwondo athletes ready to train"
                    fill
                    priority
                    sizes="100vw"
                    className={styles.heroImage}
                />
                <div className={styles.heroShade} />
                <div className={styles.heroContent}>
                    <p className={styles.kicker}>Elite Taekwondo Association of the Philippines</p>
                    <h1>TRAIN LIKE<br /><span>IT MATTERS</span></h1>
                    <p className={styles.heroCopy}>One national organization for athletes, coaches, clubs, and organizers committed to raising the standard.</p>
                    <div className={styles.heroActions}>
                        <Link href={`/sign-up${qs}`} className={styles.primaryButton}>Join Tap Elite <ArrowRight /></Link>
                        <a href="#events" className={styles.secondaryButton}>Explore events</a>
                    </div>
                </div>
                <a href="#ethos" className={styles.scrollCue} aria-label="Scroll to learn more"><ArrowDown /></a>
            </section>

            <div className={styles.marquee} aria-hidden="true">
                <div>
                    {Array.from({ length: 8 }).map((_, index) => (
                        <span key={index}>DISCIPLINE <b>·</b> RESPECT <b>·</b> EXCELLENCE <b>·</b> TAP ELITE <b>·</b> </span>
                    ))}
                </div>
            </div>

            <section id="ethos" className={`${styles.section} ${styles.ethos}`}>
                <div className={styles.sectionLabel} data-reveal>Our ethos</div>
                <h2 className={styles.statement} data-reveal>We don&apos;t chase shortcuts. We build athletes who stay composed, compete with honor, and keep raising the standard.</h2>
                <div className={styles.ethosGrid}>
                    {[
                        ["01", "Athlete first", "Every decision starts with safer development, fair competition, and a clear path forward."],
                        ["02", "Standards matter", "Reliable events, transparent rankings, and accountable clubs give performance meaning."],
                        ["03", "Stronger together", "The sport grows when athletes, coaches, clubs, and organizers move as one community."],
                    ].map(([number, title, copy]) => (
                        <article key={number} data-reveal>
                            <span>{number}</span>
                            <h3>{title}</h3>
                            <p>{copy}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section id="disciplines" className={`${styles.section} ${styles.disciplines}`}>
                <div className={styles.sectionLabel} data-reveal>The tenets</div>
                <h2 className={styles.displayTitle} data-reveal>FIVE PRINCIPLES<br />TO LIVE BY</h2>
                <div className={styles.disciplineStack} ref={tenetsRef}>
                    {disciplines.map((item, index) => (
                        <article
                            className={styles.disciplineCard}
                            key={item.number}
                            data-tenet-card
                            style={{
                                "--stack-top": `${92 + index * 18}px`,
                                "--stack-z": index + 1,
                            } as CSSProperties}
                        >
                            <Image src={item.image} alt="" fill sizes="(max-width: 900px) 100vw, 1080px" style={{ objectPosition: item.position }} />
                            <div className={styles.cardShade} />
                            <span className={styles.cardNumber}>{item.number}</span>
                            <div className={styles.cardCopy}>
                                <p>{item.eyebrow}</p>
                                <h3>{item.title}</h3>
                                <span>{item.copy}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section id="events" className={`${styles.section} ${styles.events}`}>
                <div className={styles.sectionHeading} data-reveal>
                    <div>
                        <div className={styles.sectionLabel}>Featured</div>
                        <h2 className={`${styles.displayTitle} ${styles.featuredTitle}`}>THE NEXT CHALLENGE</h2>
                    </div>
                    <Link href={`/events${qs}`}>View all events <ArrowRight size={18} /></Link>
                </div>

                {featuredEvents.length > 0 ? (
                    <div className={styles.eventGrid}>
                        {featuredEvents.map((event, index) => <EventCard event={event} qs={qs} index={index} key={event.id} />)}
                    </div>
                ) : (
                    <div className={styles.emptyEvents} data-reveal>
                        <Trophy />
                        <div>
                            <h3>The next event is being prepared.</h3>
                            <p>Join the circuit to be ready when registration opens.</p>
                        </div>
                        <Link href={`/sign-up${qs}`}>Create an account <ArrowRight size={17} /></Link>
                    </div>
                )}
            </section>

            <section className={styles.arena}>
                <Image src="/tap-elite/landing/poomsae.jpg" alt="Tap Elite athletes practicing poomsae" fill sizes="100vw" />
                <div className={styles.arenaShade} />
                <div className={styles.arenaCopy} data-reveal>
                    <p className={styles.sectionLabel}>The circuit</p>
                    <h2>ONE PLATFORM.<br />ONE STANDARD.<br /><span>ONE COMMUNITY.</span></h2>
                    <p>Registration, event discovery, rankings, and club connections—built to keep Philippine Taekwondo moving.</p>
                </div>
            </section>

            <section className={styles.creed}>
                <p data-reveal>The Tap Elite creed</p>
                <h2 data-reveal>DISCIPLINE<br /><span>CREATES CHAMPIONS</span></h2>
            </section>

            <section id="method" className={`${styles.section} ${styles.method}`}>
                <div className={styles.sectionLabel} data-reveal>The standard</div>
                <h2 className={styles.displayTitle} data-reveal>HOW WE<br />MOVE THE SPORT</h2>
                <div className={styles.methodList}>
                    {[
                        ["01", "Connect", "Bring athletes, clubs, coaches, and organizers into one trusted network."],
                        ["02", "Compete", "Make tournament and seminar discovery simpler from registration to event day."],
                        ["03", "Measure", "Give rankings and performance a clearer, more consistent national context."],
                        ["04", "Progress", "Turn every event, result, and connection into momentum for the next generation."],
                    ].map(([number, title, copy]) => (
                        <article key={number} data-reveal>
                            <span>{number}</span>
                            <h3>{title}</h3>
                            <p>{copy}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className={styles.board} id="board">
                <div className={styles.boardHeading} data-reveal>
                    <div>
                        <div className={styles.sectionLabel}>The Tap Board</div>
                        <h2 className={styles.displayTitle}>LEADING THE<br />STANDARD</h2>
                    </div>
                    <p>Stewarding the sport through accountable leadership, technical excellence, and athlete-first decisions.</p>
                </div>
                <div className={styles.boardRail}>
                    {[
                        { name: "Master Jun", image: "/tap-elite/jun_liwag.png", position: "center 28%" },
                        { name: "Master Stephen", image: "/tap-elite/stephen_cantos.png", position: "center 28%" },
                        { name: "Master Tata" },
                        { name: "Master Mawel" },
                    ].map(({ name, image, position }) => (
                        <article className={styles.boardCard} key={name} data-reveal>
                            {image ? (
                                <Image src={image} alt={name} fill sizes="(max-width: 900px) 72vw, 430px" style={{ objectPosition: position }} />
                            ) : (
                                <div className={styles.boardPlaceholder} aria-hidden="true">
                                    <svg viewBox="0 0 120 120" role="presentation">
                                        <circle cx="60" cy="39" r="22" />
                                        <path d="M18 108c2-29 17-45 42-45s40 16 42 45" />
                                    </svg>
                                </div>
                            )}
                            <div className={styles.boardShade} />
                            <div className={styles.boardInfo}><p>Tap Board Member</p><h3>{name}</h3></div>
                        </article>
                    ))}
                </div>
            </section>

            <section id="community" className={styles.results}>
                <Image src="/tap-elite/landing/hero.jpg" alt="" fill sizes="100vw" />
                <div className={styles.resultsShade} />
                <div className={styles.resultsInner}>
                    <div className={styles.sectionLabel} data-reveal>The network</div>
                    <h2 className={styles.displayTitle} data-reveal>NUMBERS THAT<br />MOVE WITH US</h2>
                    <div className={styles.statsGrid}>
                        <article data-reveal><strong><Counter value={stats?.athletes ?? 0} /><b>+</b></strong><span>Athletes</span></article>
                        <article data-reveal><strong><Counter value={stats?.clubs ?? 0} /><b>+</b></strong><span>Clubs</span></article>
                        <article data-reveal><strong><Counter value={stats?.events ?? 0} /><b>+</b></strong><span>Events</span></article>
                    </div>
                </div>
            </section>

            {pastEvents.length > 0 && (
                <section id="all-events" className={`${styles.section} ${styles.events} ${styles.pastEvents}`}>
                    <div className={styles.sectionHeading} data-reveal>
                        <div>
                            <div className={styles.sectionLabel}>Archive</div>
                            <h2 className={styles.displayTitle}>WORK ALREADY<br />ON THE RECORD</h2>
                        </div>
                    </div>
                    <div className={styles.eventGrid}>
                        {pastEvents.slice(0, 3).map((event, index) => <EventCard event={event} qs={qs} index={index} key={event.id} />)}
                    </div>
                </section>
            )}

            <section className={styles.finalCta}>
                <Image src="/tap-elite/landing/sparring.jpg" alt="Two Tap Elite athletes sparring" fill sizes="100vw" />
                <div className={styles.finalShade} />
                <div data-reveal>
                    <p>Your next match starts here</p>
                    <h2>JOIN<br /><span>TAP ELITE</span></h2>
                    <p>Build your profile. Find the next event. Step onto the floor ready.</p>
                    <Link href={`/sign-up${qs}`} className={styles.primaryButton}>Enter the circuit <ArrowRight /></Link>
                </div>
            </section>

            <TapEliteFooter qs={qs} />
        </main>
    );
}
