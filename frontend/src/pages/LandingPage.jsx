import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  LayoutDashboard,
  Users,
  FolderKanban,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getPlanPricing } from '../api/plans.api'

import groveLogo from "../assets/Grove_transparent_logo(Green).png";

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
    },
  },
};

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navbarBg, setNavbarBg] = useState(false);
  const [pricing, setPricing] = useState({ free: {}, pro: {} })

  useEffect(() => {
    getPlanPricing().then(res => setPricing(res.data.data)).catch(() => {})
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setNavbarBg(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-[#f4f8f6] text-[#111111] overflow-x-hidden">
      {/* BACKGROUND */}
      <div className="fixed inset-0 -z-20 overflow-hidden">
        <div className="absolute top-[-200px] left-[-150px] w-[500px] h-[500px] rounded-full bg-[#109875]/15 blur-3xl" />

        <div className="absolute bottom-[-250px] right-[-150px] w-[500px] h-[500px] rounded-full bg-[#62d5ba]/20 blur-3xl" />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:80px_80px]" />
      </div>

      {/* NAVBAR */}
      <motion.header
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          navbarBg
            ? "backdrop-blur-2xl bg-white/50 border-b border-white/30"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 h-20 flex items-center justify-between">
          {/* LOGO */}
          <Link
            to="/"
            className="flex items-center"
          >
            <img
              src={groveLogo}
              alt="Groven"
              className="h-8 object-contain"
            />
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-10 text-sm font-medium text-neutral-600">
            <a
              href="#features"
              className="hover:text-[#109875] transition"
            >
              Features
            </a>

            <a
              href="#dashboard"
              className="hover:text-[#109875] transition"
            >
              Dashboard
            </a>

            <Link to="/upgrade" className="hover:text-[#109875] transition">Pricing</Link>
          </nav>

          {/* ACTIONS */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-neutral-600 hover:text-black"
            >
              Login
            </Link>

            <Link
              to="/signup"
              className="bg-[#109875] hover:bg-[#0d8666] transition text-white px-5 py-3 rounded-full text-sm font-semibold shadow-lg shadow-[#109875]/20"
            >
              Get Started
            </Link>
          </div>

          {/* MOBILE */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden"
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="md:hidden px-5 pb-5">
            <div className="bg-white/60 backdrop-blur-2xl border border-white/30 rounded-3xl p-6 shadow-xl">
              <div className="space-y-5">
                <a
                  href="#features"
                  className="block font-medium"
                >
                  Features
                </a>

                <a
                  href="#dashboard"
                  className="block font-medium"
                >
                  Dashboard
                </a>

                <Link to="/upgrade" className="block font-medium" onClick={() => setMenuOpen(false)}>Pricing</Link>

                <Link
                  to="/login"
                  className="block font-medium"
                >
                  Login
                </Link>

                <Link
                  to="/signup"
                  className="block bg-[#109875] text-white rounded-2xl py-3 text-center font-semibold"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </motion.header>

      {/* HERO */}
      <section className="relative pt-36 md:pt-44 pb-24 px-5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="text-center"
          >
            {/* BADGE */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/30 bg-white/50 backdrop-blur-xl shadow-sm text-sm font-medium text-[#109875]">
              <Sparkles size={16} />
              AI Powered Client Management
            </div>

            {/* TITLE */}
            <h1 className="mt-8 text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[0.95] max-w-5xl mx-auto">
              Client Management
              <br />

              <span className="bg-gradient-to-r from-[#109875] to-[#43c5a6] bg-clip-text text-transparent">
                Without The Chaos
              </span>
            </h1>

            {/* SUBTEXT */}
            <p className="mt-7 text-neutral-600 text-lg md:text-xl max-w-2xl mx-auto leading-8">
              Groven helps agencies and service teams
              manage onboarding, requests, approvals
              and clients in one beautiful workspace.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/signup"
                className="bg-[#109875] hover:bg-[#0d8666] transition text-white px-7 py-4 rounded-full font-semibold shadow-xl shadow-[#109875]/20"
              >
                Start Free
              </Link>

              <a
                href="#dashboard"
                className="border border-white/40 bg-white/50 backdrop-blur-xl px-7 py-4 rounded-full font-semibold hover:border-[#109875] hover:text-[#109875] transition"
              >
                Explore Dashboard
              </a>
            </div>

            {/* TRUST */}
            <p className="mt-6 text-sm text-neutral-500">
              Trusted by agencies, freelancers and
              creative teams
            </p>
          </motion.div>

          {/* DASHBOARD */}
          <motion.div
            id="dashboard"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mt-20"
          >
            <div className="relative rounded-[36px] overflow-hidden border border-white/40 bg-white/40 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.08)]">
              {/* TOPBAR */}
              <div className="h-14 border-b border-white/20 bg-white/40 backdrop-blur-xl flex items-center px-5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
              </div>

              <div className="grid lg:grid-cols-[260px_1fr]">
                {/* SIDEBAR */}
                <div className="border-r border-white/20 bg-white/20 backdrop-blur-xl p-6">
                  <div className="flex items-center gap-3 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-[#109875] text-white flex items-center justify-center font-bold">
                      G
                    </div>

                    <div>
                      <h3 className="font-semibold">
                        Groven Workspace
                      </h3>

                      <p className="text-sm text-neutral-500">
                        Team Dashboard
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        icon: LayoutDashboard,
                        title: "Overview",
                        active: true,
                      },
                      {
                        icon: Users,
                        title: "Clients",
                      },
                      {
                        icon: FolderKanban,
                        title: "Requests",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition ${
                          item.active
                            ? "bg-white shadow-sm"
                            : "hover:bg-white/40"
                        }`}
                      >
                        <item.icon size={18} />

                        <span className="font-medium text-sm">
                          {item.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CONTENT */}
                <div className="p-6 lg:p-10">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-8">
                    <div>
                      <h2 className="text-3xl font-bold">
                        Active Requests
                      </h2>

                      <p className="text-neutral-500 mt-2">
                        Track work, clients and approvals
                        visually.
                      </p>
                    </div>

                    <button className="bg-[#109875] hover:bg-[#0d8666] text-white px-5 py-3 rounded-2xl text-sm font-semibold transition">
                      New Request
                    </button>
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        title:
                          "Website Redesign & Branding",
                        client: "Pixel Studio",
                        status: "In Progress",
                      },
                      {
                        title:
                          "Social Media Content Plan",
                        client: "Nova Agency",
                        status: "Review",
                      },
                      {
                        title:
                          "Client Portal Setup",
                        client: "Flow Labs",
                        status: "Completed",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="bg-white/50 backdrop-blur-xl border border-white/30 rounded-3xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:shadow-lg transition"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-[#109875]/10 flex items-center justify-center">
                            <Zap className="text-[#109875]" />
                          </div>

                          <div>
                            <h3 className="font-semibold text-lg">
                              {item.title}
                            </h3>

                            <p className="text-neutral-500 text-sm mt-1">
                              {item.client}
                            </p>
                          </div>
                        </div>

                        <div className="px-4 py-2 rounded-full bg-[#109875]/10 text-[#109875] text-sm font-semibold w-fit">
                          {item.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="py-24 px-5"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <p className="uppercase tracking-[4px] text-[#109875] font-bold text-sm">
              Features
            </p>

            <h2 className="mt-5 text-4xl md:text-5xl font-black tracking-tight">
              Everything your team needs
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {[
              {
                icon: ShieldCheck,
                title: "Secure Workspaces",
                desc:
                  "Dedicated tenant-based workspaces for every client.",
              },
              {
                icon: FolderKanban,
                title: "Request Tracking",
                desc:
                  "Manage requests visually with real-time updates.",
              },
              {
                icon: Users,
                title: "Client Portals",
                desc:
                  "Branded client experience with approvals and uploads.",
              },
              {
                icon: Sparkles,
                title: "AI Automation",
                desc:
                  "Automate repetitive workflows and onboarding tasks.",
              },
            ].map((item) => (
              <motion.div
                whileHover={{ y: -6 }}
                key={item.title}
                className="rounded-[28px] border border-white/30 bg-white/40 backdrop-blur-2xl p-7 shadow-sm"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#109875]/10 flex items-center justify-center mb-6">
                  <item.icon className="text-[#109875]" />
                </div>

                <h3 className="text-xl font-bold">
                  {item.title}
                </h3>

                <p className="mt-4 text-neutral-500 leading-7 text-sm">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        className="py-24 px-5"
      >
        <div className="max-w-5xl mx-auto text-center">
          <p className="uppercase tracking-[4px] text-[#109875] font-bold text-sm">
            Pricing
          </p>

          <h2 className="mt-5 text-4xl md:text-5xl font-black tracking-tight">
            Simple pricing for growing teams
          </h2>

          <div className="grid lg:grid-cols-2 gap-8 mt-16">
            {/* FREE */}
            <div className="rounded-[32px] border border-white/30 bg-white/40 backdrop-blur-2xl p-10 text-left">
              <h3 className="text-3xl font-bold">
                Starter
              </h3>

              <p className="mt-3 text-neutral-500">
                Best for freelancers and small teams.
              </p>

              <div className="mt-8">
                <span className="text-6xl font-black">${Number(pricing.free.price_monthly ?? 0)}</span>

                <span className="text-neutral-500">
                  /month
                </span>
              </div>

              <div className="mt-10 space-y-4">
                {[
                  "3 Clients",
                  "Unlimited Requests",
                  "Real-time Dashboard",
                  "Basic Branding",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3"
                  >
                    <Check className="text-[#109875]" />

                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Link
                to="/signup"
                className="mt-10 inline-flex bg-[#109875] text-white px-6 py-4 rounded-full font-semibold"
              >
                Start Free
              </Link>
            </div>

            {/* PRO */}
            <div className="rounded-[32px] border border-[#109875]/20 bg-[#061a15] text-white p-10 text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#109875]/20 rounded-full blur-3xl" />

              <div className="relative">
                <div className="inline-flex px-4 py-2 rounded-full bg-[#109875]/20 text-[#8ef0d4] text-sm font-semibold">
                  Most Popular
                </div>

                <h3 className="text-3xl font-bold mt-6">
                  Pro
                </h3>

                <p className="mt-3 text-neutral-300">
                  Advanced features for agencies.
                </p>

                <div className="mt-8">
                  <span className="text-6xl font-black">${Number(pricing.pro.price_monthly ?? 0)}</span>

                  <span className="text-neutral-400">
                    /month
                  </span>
                </div>

                <div className="mt-10 space-y-4">
                  {[`${pricing.free.client_limit ?? 3} Clients`, "Unlimited Requests", "Real-time Dashboard", "Basic Branding"].map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3"
                    >
                      <Check className="text-[#43c5a6]" />

                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/signup"
                  className="mt-10 inline-flex bg-white text-[#061a15] px-6 py-4 rounded-full font-semibold"
                >
                  Upgrade Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-24 px-5">
        <div className="max-w-5xl mx-auto rounded-[40px] overflow-hidden border border-white/30 bg-white/40 backdrop-blur-2xl px-8 py-16 md:p-20 text-center relative">
          <div className="absolute top-0 left-0 w-72 h-72 bg-[#109875]/10 blur-3xl rounded-full" />

          <div className="relative">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              Ready to simplify
              <br />
              client management?
            </h2>

            <p className="mt-6 text-neutral-600 text-lg max-w-2xl mx-auto leading-8">
              Streamline onboarding, requests and
              collaboration with Groven.
            </p>

            <Link
              to="/signup"
              className="mt-10 inline-flex items-center gap-2 bg-[#109875] hover:bg-[#0d8666] transition text-white px-8 py-4 rounded-full font-semibold shadow-xl shadow-[#109875]/20"
            >
              Start Free Today
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/20 bg-white/30 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <Link to="/" className="inline-block cursor-pointer outline-none">
              <img
                src={groveLogo}
                alt="Groven"
                className="h-8 object-contain"
              />
            </Link>

            <p className="mt-4 text-neutral-500 text-sm">
              Modern client onboarding and request
              management platform.
            </p>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-neutral-500">
            <a href="#features">Features</a>
            <a href="#dashboard">Dashboard</a>
            <a href="#pricing">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
}