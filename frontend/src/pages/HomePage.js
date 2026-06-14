import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import ServiceCard from "../components/ServiceCard";
import { FiSearch, FiShield, FiClock, FiZap, FiStar, FiCheck } from "react-icons/fi";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [placeholder, setPlaceholder] = useState("What service do you need?");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [trustedCount, setTrustedCount] = useState(0);
  const [rippleStyle, setRippleStyle] = useState({});
  const heroImgRef = useRef(null);
  const searchRef = useRef(null);
  const reduceMotion = useReducedMotion();

  // Rotating placeholder phrases
  const placeholderPhrases = useRef([
    "Need a plumber?",
    "Home cleaning today?",
    "Fix leaky faucet",
    "Book an electrician",
    "Garden care",
    "Beauty & wellness",
  ]);

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      if (isFocused || searchValue) return;
      idx = (idx + 1) % placeholderPhrases.current.length;
      setPlaceholder(placeholderPhrases.current[idx]);
    }, 2500);
    return () => clearInterval(interval);
  }, [isFocused, searchValue]);

  // Trusted customer count animation
  useEffect(() => {
    const target = 1000;
    const duration = 1600;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      setTrustedCount(Math.floor(progress * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setTrustedCount(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Static popular services with real provider images
  const popularServices = [
    {
      _id: 'electronics-repair',
      name: 'Electronics Repair',
      category: '💻 Technology',
      price: 90,
      image: '/images/electronics-repair.jpg',
      description: 'Laptop, Mobile & Device Repair'
    },
    {
      _id: 'house-cleaning',
      name: 'House Cleaning',
      category: '🏠 Home Services',
      price: 80,
      image: '/images/house-cleaning.jpg',
      description: 'Professional Home Cleaning'
    },
    {
      _id: 'ac-repair',
      name: 'AC Repair & Service',
      category: '💻 Technology',
      price: 300,
      image: '/images/ac-repair.jpg',
      description: 'AC Installation & Maintenance'
    },
    {
      _id: 'cctv-installation',
      name: 'CCTV Installation',
      category: '💻 Technology',
      price: 260,
      image: '/images/cctv-installation.jpg',
      description: 'Security Camera Setup'
    },
    {
      _id: 'carpentry',
      name: 'Carpentry',
      category: '🏠 Home Services',
      price: 130,
      image: '/images/carpentry.jpg',
      description: 'Furniture & Woodwork'
    },
    {
      _id: 'electrical',
      name: 'Electrical Services',
      category: '🏠 Home Services',
      price: 110,
      image: '/images/electrical.jpg',
      description: 'Wiring & Electrical Repairs'
    }
  ];

  // Set static services and mark as loaded
  useEffect(() => {
    setServices(popularServices);
    setLoading(false);
  }, []);

  // Parallax hero image
  useEffect(() => {
    if (reduceMotion) return;
    const handleScroll = () => {
      if (!heroImgRef.current) return;
      const y = window.scrollY;
      const translate = Math.min(40, y * 0.15);
      heroImgRef.current.style.transform = `translateY(${translate}px)`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [reduceMotion]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const listener = (e) => {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, []);

  const suggestions = [
    "House Cleaning",
    "Electrical Repair",
    "Plumbing",
    "Gardening",
    "Painting",
    "Appliance Install",
  ];

  const onCTAButtonClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRippleStyle({ ["--x"]: `${x}px`, ["--y"]: `${y}px` });
  }, []);

  const featureVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: { delay: reduceMotion ? 0 : 0.15 * i, duration: 0.55, ease: [0.22, 1.02, 0.36, 1] },
    }),
  };

  const heroParent = {
    hidden: {},
    visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.12 } },
  };

  const heroChild = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1.02, 0.36, 1] } },
  };

  // Redirect authenticated users
  if (user?.role === "customer") return <Navigate to="/customer" replace />;
  if (user?.role === "provider") return <Navigate to="/provider" replace />;
  if (user?.role === "admin") return <Navigate to="/admin" replace />;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f172a] transition-colors duration-300">
      <section className="relative bg-gradient-to-br from-brand-light via-white to-blue-50 dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a] overflow-hidden transition-all duration-300">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.35),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-32">
          <motion.div className="grid lg:grid-cols-2 gap-12 items-center" variants={heroParent} initial="hidden" animate="visible">
            <div>
              <motion.div variants={heroChild} className="inline-flex items-center px-4 py-2 bg-brand-primary/10 dark:bg-blue-500/20 text-brand-primary dark:text-blue-400 rounded-full text-sm font-medium mb-6 border border-blue-200 dark:border-blue-500/30 animate-badge-float">
                <FiStar className="w-4 h-4 mr-2 animate-twinkle" />
                Trusted by {trustedCount}+ customers
              </motion.div>

              <motion.h1 variants={heroChild} className="text-5xl lg:text-6xl font-bold leading-tight text-brand-gray-900 dark:text-white mb-6">
                Book trusted
                <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-blue-500 to-brand-secondary dark:from-blue-400 dark:via-blue-500 dark:to-blue-600 animate-gradient-shift animate-breath">
                  {" "}local services
                </span>
                <br />
                near you
              </motion.h1>

              <motion.p variants={heroChild} className="text-xl text-brand-gray-600 dark:text-gray-400 mb-8 leading-relaxed max-w-xl">
                From home repairs to personal care – connect with verified local professionals instantly. Safe, reliable, and hassle-free.
              </motion.p>

              {/* Search Bar */}
              <motion.div variants={heroChild} className="mb-8" ref={searchRef}>
                <div
                  className={`group relative flex items-center bg-white dark:bg-gray-800 rounded-2xl shadow-card dark:shadow-dark-card border border-brand-gray-200 dark:border-gray-700 overflow-hidden max-w-md transition-all duration-500 ${
                    isFocused ? "ring-2 ring-brand-primary/60 dark:ring-blue-500/60 scale-[1.02]" : ""
                  }`}
                >
                  <div className="px-4 text-brand-gray-400 dark:text-gray-500">
                    <FiSearch className="w-5 h-5" />
                  </div>
                  <input
                    className="flex-1 py-4 px-2 outline-none text-brand-gray-700 dark:text-white placeholder-brand-gray-400 dark:placeholder-gray-500 bg-transparent"
                    placeholder={placeholder}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onFocus={() => {
                      navigate("/login");
                    }}
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onCTAButtonClick(e);
                      navigate("/login");
                    }}
                    style={rippleStyle}
                    className="animate-ripple relative z-10 px-6 py-4 bg-brand-primary dark:bg-blue-500 text-white font-medium hover:bg-blue-600 dark:hover:bg-blue-600/90 transition-colors"
                  >
                    Search
                  </button>
                  <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-brand-gray-200 to-transparent dark:via-gray-700 pointer-events-none" />
                </div>
                {showSuggestions && (
                  <motion.ul
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2 w-full max-w-md bg-white dark:bg-gray-800 border border-brand-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden divide-y divide-brand-gray-100 dark:divide-gray-700"
                  >
                    {suggestions
                      .filter((s) => (searchValue ? s.toLowerCase().includes(searchValue.toLowerCase()) : true))
                      .slice(0, 5)
                      .map((s) => (
                        <li
                          key={s}
                          className="px-4 py-3 text-sm cursor-pointer hover:bg-brand-gray-50 dark:hover:bg-gray-700 text-brand-gray-700 dark:text-gray-200"
                          onMouseDown={() => {
                            setSearchValue(s);
                            setShowSuggestions(false);
                            setIsFocused(false);
                            navigate("/login");
                          }}
                        >
                          {s}
                        </li>
                      ))}
                    {!searchValue && (
                      <li className="px-4 py-3 text-xs text-brand-gray-500 dark:text-gray-400 select-none">
                        (Demo suggestions – search feature coming soon)
                      </li>
                    )}
                  </motion.ul>
                )}
              </motion.div>

              {/* Feature cards */}
              <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }}>
                {[
                  {
                    icon: <FiShield className="w-5 h-5 text-brand-primary dark:text-blue-400" />,
                    title: "Verified Providers",
                    subtitle: "Background checked",
                    wrapper: "bg-brand-primary/10 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/30",
                  },
                  {
                    icon: <FiClock className="w-5 h-5 text-brand-accent dark:text-green-400" />,
                    title: "Quick Booking",
                    subtitle: "Same day service",
                    wrapper: "bg-brand-accent/10 dark:bg-green-500/20 border-green-200 dark:border-green-500/30",
                  },
                  {
                    icon: <FiZap className="w-5 h-5 text-brand-secondary dark:text-purple-400" />,
                    title: "24/7 Support",
                    subtitle: "Always here to help",
                    wrapper: "bg-brand-secondary/10 dark:bg-purple-500/20 border-purple-200 dark:border-purple-500/30",
                  },
                ].map((f, i) => (
                  <motion.div
                    key={f.title}
                    custom={i}
                    variants={featureVariants}
                    className="flex items-center gap-3 p-2 rounded-xl bg-white/50 dark:bg-gray-800/40 backdrop-blur-sm border border-brand-gray-100 dark:border-gray-700 hover:shadow-cardHover dark:hover:shadow-dark-glow transition-all group"
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${f.wrapper} relative overflow-hidden animate-glow-pulse`}>
                      {f.icon}
                    </div>
                    <div>
                      <p className="font-medium text-brand-gray-900 dark:text-white">{f.title}</p>
                      <p className="text-sm text-brand-gray-500 dark:text-gray-400">{f.subtitle}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTAs */}
              <motion.div variants={heroChild} className="flex flex-col sm:flex-row gap-4">
                {!user && (
                  <>
                    <Link
                      to="/register"
                      onClick={onCTAButtonClick}
                      style={rippleStyle}
                      className="animate-shimmer animate-ripple relative px-8 py-4 bg-gradient-to-r from-brand-primary to-blue-600 dark:from-blue-500 dark:to-blue-600 text-white font-semibold rounded-xl shadow-card dark:shadow-glow-blue hover:shadow-lg dark:hover:shadow-blue-500/50 transition-all duration-300 overflow-hidden"
                    >
                      <span className="relative z-10">Get Started</span>
                      <FiZap className="ml-2 w-4 h-4 inline relative z-10" />
                    </Link>
                    <Link
                      to="/login"
                      onClick={onCTAButtonClick}
                      style={rippleStyle}
                      className="animate-ripple px-8 py-4 border border-brand-gray-300 dark:border-gray-600 text-brand-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-brand-gray-50 dark:hover:bg-gray-800 transition-all duration-300 relative overflow-hidden"
                    >
                      <span className="relative z-10">Sign In</span>
                    </Link>
                  </>
                )}
              </motion.div>
            </div>

            {/* Hero image */}
            <motion.div ref={heroImgRef} variants={heroChild} className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-brand-gray-200/60 dark:border-gray-700/60">
                <img
                  src="/images/hero-localhands.png"
                  alt="LocalHands professional service team - cleaning, plumbing, and electrical services"
                  className={`w-full h-[500px] object-cover ${reduceMotion ? "" : "animate-kenburns animate-blur-in"}`}
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 via-transparent to-brand-secondary/10 dark:from-blue-500/15 dark:via-transparent dark:to-purple-500/15 pointer-events-none" />
              </div>
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.6 } }}
                className="absolute top-6 left-6 bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-lg dark:shadow-dark-card border border-gray-200 dark:border-gray-700 backdrop-blur-md animate-slide-down"
              >
                <div className="flex items-center gap-2">
                  <FiCheck className="w-5 h-5 text-success dark:text-green-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Service Completed</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Home cleaning by Sarah M.</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Popular Services */}
      <section className="py-20 bg-white dark:bg-[#0f172a] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Popular {" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary dark:from-blue-400 dark:to-blue-600">Services</span>
          </h2>
          {loading && <p className="text-center text-gray-600 dark:text-gray-400">Loading...</p>}
          {error && <p className="text-center text-red-500 dark:text-red-400 font-medium">{error}</p>}
          {!loading && !error && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((s) => (
                <ServiceCard
                  key={s._id}
                  service={{
                    ...s,
                    duration: 'service',
                    image: s.image || `https://images.unsplash.com/photo-1558618047-3c8c76e34c92?w=400&h=240&fit=crop`,
                  }}
                  showBookButton={false}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white dark:from-[#1e293b] dark:to-[#0f172a] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <h2 className="text-4xl font-bold text-center mb-4 text-gray-900 dark:text-white">
              How It{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary dark:from-blue-400 dark:to-blue-600">Works</span>
            </h2>
            <p className="text-center text-lg text-gray-600 dark:text-gray-400 mb-16 max-w-2xl mx-auto">
              Get professional help at your doorstep in just three simple steps
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-10 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-brand-primary via-blue-400 to-brand-secondary dark:from-blue-500 dark:via-blue-400 dark:to-blue-600 opacity-30" />
            {[
              {
                step: "01",
                title: "Choose a Service",
                desc: "Browse our wide range of verified local services – from plumbing and cleaning to beauty and tech repairs.",
                icon: "🔍",
                gradient: "from-blue-500 to-blue-600",
              },
              {
                step: "02",
                title: "Book Instantly",
                desc: "Select your preferred date, time, and provider. Get instant confirmation with transparent pricing.",
                icon: "📅",
                gradient: "from-purple-500 to-purple-600",
              },
              {
                step: "03",
                title: "Sit Back & Relax",
                desc: "Your verified professional arrives on time. Track progress in real-time and pay securely after completion.",
                icon: "✅",
                gradient: "from-green-500 to-green-600",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative text-center group"
              >
                <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                  {item.icon}
                </div>
                <span className="inline-block text-xs font-bold text-brand-primary dark:text-blue-400 bg-brand-primary/10 dark:bg-blue-500/20 px-3 py-1 rounded-full mb-3">
                  STEP {item.step}
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-[#020617] text-gray-300">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm font-bold">LH</span>
                </div>
                <span className="text-lg font-bold text-white">LocalHands</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                LocalHands connects you with verified local service professionals for home repairs, maintenance, and personal care. All providers are background-verified and rated by real customers.
              </p>
            </div>

            {/* Terms & Conditions */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Terms &amp; Conditions</h4>
              <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                <p>By using LocalHands, you agree to our terms of service. All bookings are subject to provider availability and confirmation.</p>
                <p>Service charges displayed are estimates. Final billing is based on the actual scope of work completed and agreed upon between the customer and the provider.</p>
                <p>Cancellations made within 1 hour of the scheduled service may be subject to a cancellation fee. Refunds are processed within 5–7 business days.</p>
                <p>LocalHands is not liable for any damages arising from services rendered by independent providers listed on the platform.</p>
              </div>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Support</h4>
              <div className="text-gray-400 text-sm leading-relaxed space-y-3">
                <p>Need help with a booking, payment, or provider issue? Our support team is here to assist you.</p>
                <p>For any queries, complaints, or feedback, reach out to us at:</p>
                <a
                  href="mailto:godspeeed786@gmail.com"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  godspeeed786@gmail.com
                </a>
                <p>We typically respond within 24 hours. For urgent issues related to ongoing services, please mention your booking ID in the subject line.</p>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-gray-500 text-xs">© {new Date().getFullYear()} LocalHands. All rights reserved.</p>
            <p className="text-gray-600 text-xs">
              Built for connecting communities with trusted local professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

