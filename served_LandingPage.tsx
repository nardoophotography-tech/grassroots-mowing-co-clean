import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=60ae74d6"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=60ae74d6"; const React = ((m) => m?.__esModule ? m : { ...typeof m === "object" && !Array.isArray(m) || typeof m === "function" ? m : {}, default: m })(__vite__cjsImport1_react);
import { useNavigate, useLocation } from "/node_modules/.vite/deps/react-router-dom.js?v=60ae74d6";
import { motion, AnimatePresence } from "/node_modules/.vite/deps/motion_react.js?v=60ae74d6";
import { useAuth } from "/src/contexts/AuthContext.tsx";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Home,
  Users,
  ShieldCheck,
  UserCircle,
  Leaf,
  Sparkles,
  Trees,
  Phone,
  Mail,
  Droplets,
  Trash2,
  Scissors,
  Zap,
  Wind,
  ClipboardList,
  X,
  Building2,
  Target,
  Truck,
  History
} from "/node_modules/.vite/deps/lucide-react.js?v=60ae74d6";
import { Button } from "/src/components/ui/Button.tsx";
import { Badge } from "/src/components/ui/Badge.tsx";
import { cn } from "/src/lib/utils.ts";
import AppLogo from "/src/components/AppLogo.tsx";
import { GrassRootsGuardian } from "/src/components/GrassRootsGuardian.tsx";
import { PRICING_RULES } from "/src/constants.ts";
import { useSettings, useJobs } from "/src/hooks/useFirebase.ts";
import { useLatestAsset, useAssets } from "/src/hooks/useAssets.ts";
import { toast } from "/node_modules/.vite/deps/react-hot-toast.js?v=60ae74d6";
import { AIBookingAssistant } from "/src/components/AIBookingAssistant.tsx";
import { BrandCharacter } from "/src/components/BrandCharacter.tsx";
export const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, profile } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { jobs } = useJobs();
  const { asset: logoAsset } = useLatestAsset("logo");
  const { asset: heroAsset } = useLatestAsset("hero");
  const { assets: galleryAssets } = useAssets("gallery");
  const handleLogoUpload = async (newUrl) => {
    toast("Manage branding in the Asset Portfolio");
  };
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isClientWelcome = location.pathname === "/welcome";
  const pricing = settings?.pricing || PRICING_RULES;
  const testimonials = settings?.testimonials || [];
  const completedJobsCount = jobs.filter((j) => j.status === "paid" || j.status === "completed").length;
  const [selectedGoldPackage, setSelectedGoldPackage] = React.useState(null);
  const goldPackageInclusions = [
    "Edge Trimming",
    "Path Blowing",
    "Whipper Snipping",
    "Brush Cutting",
    "Weed treatment",
    "Green Waste Removal",
    "Fertiliser Treatment",
    "Pruning",
    "Mulching Service",
    "Clipping Removal",
    "Full Yearly Analysis & Planning"
  ];
  const packages = [
    {
      id: "town_block",
      name: "Town Block (Mow & Go)",
      price: pricing.base["town_block"],
      description: "The maintenance essential. Perfect for units, duplexes, and small town blocks.",
      features: ["Lawn Mowing", "Whipper snipping", "Path & Driveway Blowing", "Clipping Removal"],
      color: "border-ochre/20"
    },
    {
      id: "residential_standard",
      name: "Residential Standard",
      price: pricing.base["residential_standard"],
      description: "Our most popular choice for mid-sized family homes and typical residential lots.",
      features: ["Lawn Mowing", "Whipper snipping", "Path & Driveway Blowing", "Clipping Removal"],
      color: "border-secondary/50",
      featured: true
    },
    {
      id: "premium_estate",
      name: "Premium Estate",
      price: pricing.base["premium_estate"],
      description: "The gold standard for corner blocks and larger residential properties.",
      features: ["Lawn Mowing", "Whipper snipping", "Path & Driveway Blowing", "Clipping Removal"],
      color: "border-ochre"
    },
    {
      id: "acreage",
      name: "Large Lot / Acreage",
      price: pricing.base["acreage"],
      description: "Heavy-duty care for oversized blocks, mini-acreage, and commercial fringes.",
      features: ["Lawn Mowing", "Brush Cutting"],
      color: "border-secondary"
    },
    {
      id: "ultimate",
      name: "Ultimate Property Gold",
      price: pricing.base["ultimate"],
      description: "Our top tier of comprehensive property management. Professional gardening, arborist work, and seasonal care.",
      color: "border-charcoal bg-charcoal text-white",
      isGold: true,
      goldLevels: [
        {
          name: "Town Gold",
          price: 160,
          features: ["GrassRoots Mowing Co. Full Care Protocol"],
          description: "The maintenance essential. Perfect for units, duplexes, and small town blocks."
        },
        {
          name: "Residential Gold",
          price: 240,
          features: ["GrassRoots Mowing Co. Full Care Protocol"],
          description: "Our most popular choice for mid-sized family homes and typical residential lots."
        },
        {
          name: "Premium Gold",
          price: 340,
          features: ["GrassRoots Mowing Co. Full Care Protocol"],
          description: "The gold standard for corner blocks and larger residential properties."
        }
      ]
    }
  ];
  const portals = [
    {
      role: "admin",
      title: "Management Console",
      description: "Access business analytics, staff management, and financial reporting.",
      icon: ShieldCheck,
      color: "bg-secondary"
    },
    {
      role: "staff",
      title: "Staff Portal",
      description: "View your daily schedule, navigate to jobs, and track your work.",
      icon: Users,
      color: "bg-ochre"
    },
    {
      role: "client",
      title: "Client Portal",
      description: "Manage your existing recurring services and view your invoices.",
      icon: UserCircle,
      color: "bg-charcoal"
    }
  ];
  const addonsList = [
    { name: "Edge Trimming", price: pricing.addOns?.["edging"] || 0, icon: Sparkles },
    { name: "Path Blowing", price: pricing.addOns?.["blowing"] || 0, icon: Wind },
    { name: "Whipper Snipping", price: pricing.addOns?.["whipper-snipping"] || 0, icon: Scissors },
    { name: "Brush Cutting", price: pricing.addOns?.["brush-cutting"] || 0, icon: Trees },
    { name: "Garden Weeding/Spraying", price: pricing.addOns?.["weed-spraying"] || 0, icon: Droplets },
    { name: "Hedge Trimming", price: pricing.addOns?.["hedge-trimming"] || 0, icon: Scissors },
    { name: "Green Waste Removal", price: pricing.addOns?.["green-waste-removal"] || 0, icon: Trash2 },
    { name: "Fertiliser Treatment", price: pricing.addOns?.["fertiliser-treatment"] || 0, icon: Zap },
    { name: "Pruning", price: pricing.addOns?.["pruning"] || 0, icon: Scissors },
    { name: "Mulching Service", price: pricing.addOns?.["mulching"] || 0, icon: Leaf },
    { name: "Clipping Removal", price: pricing.addOns?.["clipping-removal"] || 0, icon: Trash2 },
    { name: "Full Yearly Analysis & Planning", price: pricing.addOns?.["yearly-analysis"] || 0, icon: ClipboardList }
  ];
  return /* @__PURE__ */ jsxDEV("div", { className: "min-h-screen bg-[#FDFCFB] selection:bg-primary/20 selection:text-primary", children: [
    /* @__PURE__ */ jsxDEV("nav", { className: "sticky top-0 z-50 border-b border-primary/20 bg-white/95 backdrop-blur-xl shadow-lg shadow-black/5", children: /* @__PURE__ */ jsxDEV("div", { className: "relative overflow-hidden", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 pointer-events-none", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 bg-gradient-to-r from-[#174D33] via-[#7A542F] to-[#174D33] opacity-[0.08]" }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 210,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "absolute -right-10 -top-20 opacity-[0.08] scale-75", children: /* @__PURE__ */ jsxDEV(GrassRootsGuardian, { size: 220 }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 212,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 211,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "absolute left-0 bottom-0 h-1 w-full bg-gradient-to-r from-primary via-ochre to-secondary" }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 214,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 209,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV(
              Button,
              {
                type: "button",
                variant: "ghost",
                onClick: () => {
                  if (window.history.state && window.history.state.idx > 0) {
                    navigate(-1);
                  } else {
                    navigate("/");
                  }
                },
                className: "flex items-center gap-2 px-3 py-2 rounded-full bg-charcoal text-white shadow-md border border-white/10 hover:opacity-95 touch-manipulation",
                title: "Go Back",
                children: [
                  /* @__PURE__ */ jsxDEV(ArrowLeft, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                    lineNumber: 233,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-[13px] font-black uppercase tracking-wider", children: "Back" }, void 0, false, {
                    fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                    lineNumber: 234,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 220,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              Button,
              {
                type: "button",
                variant: "ghost",
                onClick: () => navigate("/"),
                className: "flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-white shadow-md border border-white/10 hover:opacity-95 touch-manipulation",
                title: "Home",
                children: [
                  /* @__PURE__ */ jsxDEV(Home, { className: "h-4 w-4" }, void 0, false, {
                    fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                    lineNumber: 244,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: "text-[13px] font-black uppercase tracking-wider", children: "Home" }, void 0, false, {
                    fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                    lineNumber: 245,
                    columnNumber: 19
                  }, this)
                ]
              },
              void 0,
              true,
              {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 237,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 219,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: "flex items-center gap-3 cursor-pointer group min-w-0",
              onClick: () => navigate("/"),
              children: /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-2xl border border-primary/10 shadow-sm px-3 py-2 flex items-center gap-3", children: [
                /* @__PURE__ */ jsxDEV("img", { src: "/logo-header.webp", alt: "GrassRoots Mowing Co", className: "h-8 sm:h-10 w-auto object-contain" }, void 0, false, {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 254,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("div", { className: "hidden sm:block border-l border-primary/15 pl-3", children: [
                  /* @__PURE__ */ jsxDEV("p", { className: "text-[9px] font-black text-primary uppercase tracking-[0.25em] leading-none", children: "GrassRoots" }, void 0, false, {
                    fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                    lineNumber: 257,
                    columnNumber: 21
                  }, this),
                  /* @__PURE__ */ jsxDEV("p", { className: "text-[8px] font-bold text-clay uppercase tracking-widest leading-none mt-1", children: "Mowing Co" }, void 0, false, {
                    fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                    lineNumber: 260,
                    columnNumber: 21
                  }, this)
                ] }, void 0, true, {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 256,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 253,
                columnNumber: 17
              }, this)
            },
            void 0,
            false,
            {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 249,
              columnNumber: 15
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsxDEV(
              Button,
              {
                onClick: () => navigate("/booking?type=one_off"),
                className: "hidden sm:flex px-4 py-2 rounded-full bg-secondary text-white hover:bg-secondary/90 text-[10px] font-black uppercase tracking-widest italic h-10 shadow-md",
                children: "Quick Book"
              },
              void 0,
              false,
              {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 270,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              Button,
              {
                variant: "ghost",
                onClick: () => navigate("/login"),
                className: "h-10 px-4 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white text-[10px] font-black uppercase tracking-widest shadow-sm",
                children: "Secure Service Hub"
              },
              void 0,
              false,
              {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 277,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 269,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 218,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "sm:hidden mt-3", children: /* @__PURE__ */ jsxDEV(
          Button,
          {
            onClick: () => navigate("/booking?type=one_off"),
            className: "w-full h-11 rounded-2xl bg-secondary text-white hover:bg-secondary/90 text-[10px] font-black uppercase tracking-[0.2em] italic shadow-md",
            children: "Quick Book"
          },
          void 0,
          false,
          {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 288,
            columnNumber: 15
          },
          this
        ) }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 287,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 217,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 208,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 207,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("section", { className: "relative pt-12 pb-12 px-6 overflow-hidden bg-white border-b border-border/40", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 subtle-grid opacity-5 pointer-events-none" }, void 0, false, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 301,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none", children: /* @__PURE__ */ jsxDEV(GrassRootsGuardian, { variant: "spotlight", className: "opacity-10 w-[600px] h-auto" }, void 0, false, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 303,
        columnNumber: 12
      }, this) }, void 0, false, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 302,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto flex flex-col items-center text-center relative z-10", children: /* @__PURE__ */ jsxDEV(
        motion.div,
        {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          className: "w-full max-w-4xl",
          children: [
            /* @__PURE__ */ jsxDEV("h1", { className: "text-5xl lg:text-7xl font-black text-charcoal leading-[0.9] tracking-tighter uppercase italic mb-6", children: [
              "Yard Care ",
              /* @__PURE__ */ jsxDEV("span", { className: "text-primary italic", children: "On Demand." }, void 0, false, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 312,
                columnNumber: 25
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 311,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-clay text-xs lg:text-sm font-bold max-w-xl mx-auto mb-10 leading-relaxed uppercase tracking-[0.15em]", children: [
              "Professional maintenance for ",
              settings?.serviceLocation || "Mount Isa",
              ". ",
              /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 316,
                columnNumber: 88
              }, this),
              "Select your path below for instant processing."
            ] }, void 0, true, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 315,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3 mb-10", children: [
              /* @__PURE__ */ jsxDEV(
                Button,
                {
                  onClick: () => navigate("/booking?type=one_off"),
                  className: "h-20 bg-secondary hover:bg-secondary/90 text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-xl shadow-secondary/10 italic flex flex-col items-center justify-center gap-1 group",
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxDEV(Zap, { size: 16 }, void 0, false, {
                        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                        lineNumber: 326,
                        columnNumber: 20
                      }, this),
                      " ONE-OFF BOOKING"
                    ] }, void 0, true, {
                      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                      lineNumber: 325,
                      columnNumber: 17
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-[8px] opacity-70 tracking-[0.3em] font-medium italic", children: "Instant Quote â¢ 5 Clicks to Success" }, void 0, false, {
                      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                      lineNumber: 328,
                      columnNumber: 17
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 321,
                  columnNumber: 15
                },
                this
              ),
              /* @__PURE__ */ jsxDEV(
                Button,
                {
                  variant: "outline",
                  onClick: () => navigate("/login?intendedRole=returning"),
                  className: "h-20 border-primary/20 text-primary hover:bg-primary/5 font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl italic flex flex-col items-center justify-center gap-1",
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxDEV(Users, { size: 16 }, void 0, false, {
                        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                        lineNumber: 337,
                        columnNumber: 20
                      }, this),
                      " REGULAR CLIENTS"
                    ] }, void 0, true, {
                      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                      lineNumber: 336,
                      columnNumber: 17
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-[8px] opacity-70 tracking-[0.3em] font-medium italic", children: "Manage Plans â¢ Job History" }, void 0, false, {
                      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                      lineNumber: 339,
                      columnNumber: 17
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 331,
                  columnNumber: 15
                },
                this
              ),
              /* @__PURE__ */ jsxDEV(
                Button,
                {
                  variant: "outline",
                  onClick: () => navigate("/login?intendedRole=asset_management"),
                  className: "h-20 border-slate-900/20 text-slate-900 hover:bg-slate-50 font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl italic flex flex-col items-center justify-center gap-1",
                  children: [
                    /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxDEV(Building2, { size: 16 }, void 0, false, {
                        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                        lineNumber: 348,
                        columnNumber: 20
                      }, this),
                      " ASSET MANAGERS"
                    ] }, void 0, true, {
                      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                      lineNumber: 347,
                      columnNumber: 17
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-[8px] opacity-70 tracking-[0.3em] font-medium italic", children: "Agency Portal â¢ Bulk Invoicing" }, void 0, false, {
                      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                      lineNumber: 350,
                      columnNumber: 17
                    }, this)
                  ]
                },
                void 0,
                true,
                {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 342,
                  columnNumber: 15
                },
                this
              )
            ] }, void 0, true, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 320,
              columnNumber: 13
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 306,
          columnNumber: 11
        },
        this
      ) }, void 0, false, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 305,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 300,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("section", { className: "py-24 px-6 bg-white relative overflow-hidden", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "absolute top-0 right-0 w-1/3 h-full subtle-grid opacity-5 pointer-events-none" }, void 0, false, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 359,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "absolute -bottom-20 -left-20 w-96 h-96 opacity-5 pointer-events-none grayscale", children: /* @__PURE__ */ jsxDEV(GrassRootsGuardian, { size: 400 }, void 0, false, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 361,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 360,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "max-w-5xl mx-auto relative z-10 text-center", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center gap-4 mb-12", children: [
          /* @__PURE__ */ jsxDEV(Badge, { className: "bg-primary/10 text-primary border-primary/20 font-black px-6 py-1 text-[10px] uppercase tracking-[0.3em]", children: "Rooted in Country. Built for Community." }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 366,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-4xl md:text-6xl font-black text-charcoal tracking-tighter uppercase italic leading-[0.85]", children: [
            "The Story Behind ",
            /* @__PURE__ */ jsxDEV("br", {}, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 370,
              columnNumber: 32
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-primary italic", children: "Our Artwork." }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 370,
              columnNumber: 38
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 369,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 365,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid lg:grid-cols-2 gap-16 items-start text-left mb-24", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-6", children: [
            /* @__PURE__ */ jsxDEV("p", { className: "text-clay text-sm font-medium leading-relaxed italic", children: "At GrassRoots Mowing Co, our work is more than just mowing and landscaping â it's about connection, respect and giving back to the land that supports us." }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 376,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-charcoal font-black text-sm leading-relaxed uppercase tracking-tight italic border-l-4 border-primary pl-6", children: '"Our visual artwork and logo were created as a modern representation inspired by the artwork of SunRock and the natural landscapes of the country where GrassRoots Mowing Co was founded."' }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 379,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "pt-8 grid grid-cols-2 gap-8", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsxDEV("h4", { className: "text-[10px] font-black text-primary uppercase tracking-widest", children: "Inspired by Country" }, void 0, false, {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 384,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("p", { className: "text-[9px] font-bold text-clay uppercase tracking-tight", children: "Reflecting the natural landscapes where we live and work." }, void 0, false, {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 385,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 383,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsxDEV("h4", { className: "text-[10px] font-black text-primary uppercase tracking-widest", children: "Symbol of Connection" }, void 0, false, {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 388,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV("p", { className: "text-[9px] font-bold text-clay uppercase tracking-tight", children: "Symbolising connection to land, community, and deep roots." }, void 0, false, {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 389,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 387,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 382,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 375,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "bg-slate-50 p-8 rounded-[2rem] border border-border/40 relative", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "absolute top-4 right-4 opacity-10", children: /* @__PURE__ */ jsxDEV(Leaf, { className: "text-primary", size: 40 }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 396,
              columnNumber: 19
            }, this) }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 395,
              columnNumber: 16
            }, this),
            /* @__PURE__ */ jsxDEV("h3", { className: "text-xl font-black text-charcoal uppercase italic mb-6 tracking-tight underline decoration-primary/20 underline-offset-4", children: "The Logo Foundations" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 398,
              columnNumber: 16
            }, this),
            /* @__PURE__ */ jsxDEV("ul", { className: "space-y-4", children: [
              "Strong foundations",
              "Growth & improvement",
              "Care for the land",
              "Community",
              "Reliability & pride in our work"
            ].map((item, idx) => /* @__PURE__ */ jsxDEV("li", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsxDEV(CheckCircle2, { size: 16, className: "text-primary" }, void 0, false, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 408,
                columnNumber: 24
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "text-xs font-black text-clay uppercase tracking-tighter", children: item }, void 0, false, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 409,
                columnNumber: 24
              }, this)
            ] }, idx, true, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 407,
              columnNumber: 21
            }, this)) }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 399,
              columnNumber: 16
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "mt-8 pt-8 border-t border-border/40", children: [
              /* @__PURE__ */ jsxDEV("p", { className: "text-[9px] font-bold text-charcoal uppercase tracking-[0.2em] italic mb-2", children: "Roots of our Foundation" }, void 0, false, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 414,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "text-[8px] text-clay font-medium leading-normal", children: "The central figure and surrounding elements represent GrassRoots Mowing Co's foundations â hard work, care for the land, family, and respect for the Traditional Owners of the country." }, void 0, false, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 415,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 413,
              columnNumber: 16
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 394,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 374,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-12 text-left", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 bg-ochre/10 rounded-2xl flex items-center justify-center text-primary border border-ochre/20", children: /* @__PURE__ */ jsxDEV(Target, { className: "h-6 w-6" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 425,
              columnNumber: 17
            }, this) }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 424,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("h4", { className: "font-black text-charcoal uppercase tracking-tight italic", children: "Precision Focus" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 427,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-clay/80 text-xs font-bold leading-relaxed italic", children: "Our proprietary satellite mapping ensures every square inch of your property is accounted for in our deployment plan." }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 428,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 423,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 bg-ochre/10 rounded-2xl flex items-center justify-center text-primary border border-ochre/20", children: /* @__PURE__ */ jsxDEV(Truck, { className: "h-6 w-6" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 432,
              columnNumber: 17
            }, this) }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 431,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("h4", { className: "font-black text-charcoal uppercase tracking-tight italic", children: "Rapid Deployment" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 434,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-clay/80 text-xs font-bold leading-relaxed italic", children: "Optimized route planning means we spend less time driving and more time perfecting your landscape footprint." }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 435,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 430,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "w-12 h-12 bg-ochre/10 rounded-2xl flex items-center justify-center text-primary border border-ochre/20", children: /* @__PURE__ */ jsxDEV(History, { className: "h-6 w-6" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 439,
              columnNumber: 17
            }, this) }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 438,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("h4", { className: "font-black text-charcoal uppercase tracking-tight italic", children: "Local Heritage" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 441,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-clay/80 text-xs font-bold leading-relaxed italic", children: "We understand the soil, the grass, and the local standards. We're part of the community we serve." }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 442,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 437,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 422,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 364,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 358,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("section", { className: "py-12 bg-charcoal text-white relative overflow-hidden", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 cultural-pattern opacity-10 pointer-events-none grayscale" }, void 0, false, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 450,
        columnNumber: 10
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "max-w-4xl mx-auto px-6 relative z-10 text-center flex flex-col items-center", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "mb-6 p-4 rounded-full border border-white/10 bg-white/5", children: /* @__PURE__ */ jsxDEV("div", { className: "flex items-center justify-center text-primary", children: /* @__PURE__ */ jsxDEV("svg", { width: "40", height: "40", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ jsxDEV("path", { d: "M18 11V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a4 4 0 0 0 8 0v-2" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 454,
            columnNumber: 164
          }, this),
          /* @__PURE__ */ jsxDEV("path", { d: "M12 10V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a4 4 0 0 1-8 0v-2" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 454,
            columnNumber: 233
          }, this),
          /* @__PURE__ */ jsxDEV("path", { d: "M3 13h1m3 0h1M13 13h1m3 0h1" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 454,
            columnNumber: 302
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 454,
          columnNumber: 19
        }, this) }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 453,
          columnNumber: 16
        }, this) }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 452,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("h3", { className: "text-[11px] font-black uppercase tracking-[0.4em] mb-4 text-primary", children: "Acknowledgement of Country" }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 457,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-sm md:text-base font-medium italic opacity-80 leading-relaxed max-w-2xl", children: "GrassRoots Mowing Co acknowledges the Traditional Custodians of the country we live and work on. We pay our respects to Elders past, present, and emerging, and acknowledge their deep and continuing connection to the land, water, and community." }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 458,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "mt-8 text-[9px] font-bold uppercase tracking-widest opacity-40", children: "Respect the land â¢ Respect the people â¢ Respect the future" }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 461,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 451,
        columnNumber: 10
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 449,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("section", { className: "py-24 px-6 bg-slate-50 relative overflow-hidden", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "absolute inset-0 subtle-grid opacity-5 pointer-events-none" }, void 0, false, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 469,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "order-2 lg:order-1 flex justify-center lg:justify-start", children: /* @__PURE__ */ jsxDEV("div", { className: "w-full max-w-md", children: /* @__PURE__ */ jsxDEV(BrandCharacter, {}, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 473,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 472,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 471,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "order-1 lg:order-2 space-y-8", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "space-y-4", children: [
            /* @__PURE__ */ jsxDEV(Badge, { className: "bg-primary/20 text-primary border-none font-black px-4 py-1 text-[10px] uppercase tracking-widest", children: "Our Mascot" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 478,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("h2", { className: "text-4xl lg:text-5xl font-black text-slate-900 leading-tight italic uppercase", children: [
              "The ",
              /* @__PURE__ */ jsxDEV("span", { className: "text-primary italic", children: "Warrior's" }, void 0, false, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 482,
                columnNumber: 21
              }, this),
              " Touch"
            ] }, void 0, true, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 481,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-base text-slate-600 font-medium leading-relaxed max-w-xl", children: "Every job we perform is guided by our custom artworkârepresenting the strength, reliability, and precision of a true field warrior. This isn't just lawn care; it's a commitment to professional excellence." }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 484,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 477,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "grid sm:grid-cols-2 gap-6", children: [
            { title: "Military Precision", desc: "Operations executed with tactical accuracy." },
            { title: "Indestructible Trust", desc: "A brand character built on reliability." },
            { title: "Warrior Ethos", desc: "We never leave a property until it's perfect." },
            { title: "Modern Heritage", desc: "Combining classic values with smart tech." }
          ].map((item, idx) => /* @__PURE__ */ jsxDEV("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxDEV("h4", { className: "font-bold text-slate-900 text-sm uppercase italic tracking-wide", children: item.title }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 497,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "text-xs text-slate-500 font-medium leading-normal", children: item.desc }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 498,
              columnNumber: 19
            }, this)
          ] }, idx, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 496,
            columnNumber: 17
          }, this)) }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 489,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 476,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 470,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 468,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("section", { className: "py-8 bg-[#FDFCFB] cultural-pattern", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto px-6 relative z-10", children: /* @__PURE__ */ jsxDEV("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-8", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "lg:col-span-1", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-1 h-4 bg-secondary rounded-full" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 512,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] italic", children: "Total Care Matrix (Gold)" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 513,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 511,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "bg-white rounded-[24px] border border-border/40 p-4 shadow-sm", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-y-1.5 gap-x-4", children: goldPackageInclusions.map((item) => /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-1.5 text-[8px] font-bold text-clay uppercase tracking-tight truncate", children: [
            /* @__PURE__ */ jsxDEV(CheckCircle2, { size: 10, className: "text-secondary shrink-0" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 519,
              columnNumber: 23
            }, this),
            item
          ] }, item, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 518,
            columnNumber: 21
          }, this)) }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 516,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV(
            Button,
            {
              onClick: () => navigate("/booking?type=ultimate-gold"),
              className: "mt-4 w-full h-8 bg-secondary/5 text-secondary hover:bg-secondary/10 text-[8px] font-black uppercase tracking-widest rounded-lg border border-secondary/10",
              children: "Join Gold Protocol"
            },
            void 0,
            false,
            {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 524,
              columnNumber: 17
            },
            this
          )
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 515,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 510,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "lg:col-span-1", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-1 h-4 bg-primary rounded-full" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 535,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] italic", children: "Operational Extensions" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 536,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 534,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-2 gap-1.5", children: addonsList.slice(0, 8).map((addon) => /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 p-2 rounded-xl bg-white border border-border/20", children: [
          /* @__PURE__ */ jsxDEV(addon.icon, { size: 12, className: "text-clay/40" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 541,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col min-w-0", children: [
            /* @__PURE__ */ jsxDEV("span", { className: "text-[7.5px] font-black text-slate-900 uppercase tracking-tighter truncate leading-none", children: addon.name }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 543,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "text-[8px] font-black text-primary italic mt-0.5", children: [
              "$",
              addon.price
            ] }, void 0, true, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 544,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 542,
            columnNumber: 21
          }, this)
        ] }, addon.name, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 540,
          columnNumber: 19
        }, this)) }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 538,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 533,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "lg:col-span-1", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "flex items-center gap-2 mb-4", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "w-1 h-4 bg-charcoal rounded-full" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 553,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("h2", { className: "text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] italic", children: "Secure Service Hub" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 554,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 552,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 gap-1.5", children: portals.map((portal) => /* @__PURE__ */ jsxDEV(
          "button",
          {
            onClick: () => navigate(`/login?intendedRole=${portal.role}`),
            className: "flex items-center gap-3 p-3 rounded-2xl bg-white border border-border/20 hover:border-primary/30 transition-all text-left",
            children: [
              /* @__PURE__ */ jsxDEV("div", { className: cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", portal.color), children: /* @__PURE__ */ jsxDEV(portal.icon, { size: 14 }, void 0, false, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 564,
                columnNumber: 23
              }, this) }, void 0, false, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 563,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("p", { className: "text-[8px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1", children: portal.title }, void 0, false, {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 567,
                  columnNumber: 24
                }, this),
                /* @__PURE__ */ jsxDEV("p", { className: "text-[7px] text-clay font-bold uppercase tracking-tight truncate max-w-[150px]", children: portal.description }, void 0, false, {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 568,
                  columnNumber: 24
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 566,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ jsxDEV(ArrowRight, { size: 12, className: "ml-auto text-clay/20" }, void 0, false, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 570,
                columnNumber: 21
              }, this)
            ]
          },
          portal.role,
          true,
          {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 558,
            columnNumber: 19
          },
          this
        )) }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 556,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 551,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 509,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 508,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 507,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("footer", { className: "bg-slate-950 text-slate-400 py-12 px-6 border-t border-white/5", children: /* @__PURE__ */ jsxDEV("div", { className: "max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "flex flex-col items-center md:items-start gap-4", children: [
        /* @__PURE__ */ jsxDEV(AppLogo, { className: "h-8 w-auto", textClassName: "text-white" }, void 0, false, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 582,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "text-[8px] font-bold uppercase tracking-[0.3em] opacity-50 italic", children: [
          "Â© ",
          (/* @__PURE__ */ new Date()).getFullYear(),
          " ",
          settings?.businessName?.toUpperCase() || "GRASSROOTS MOWING CO."
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 583,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 581,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "flex gap-12", children: [
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-white font-black uppercase tracking-widest text-[9px] mb-4 italic", children: "HQ Contact" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 588,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-[9px] font-bold uppercase tracking-widest group cursor-pointer", children: [
            /* @__PURE__ */ jsxDEV(Mail, { className: "inline h-3 w-3 mr-2 text-primary" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 590,
              columnNumber: 19
            }, this),
            " ",
            settings?.businessEmail || "ops@grassrootsmowing.co"
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 589,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("p", { className: "text-[9px] font-bold uppercase tracking-widest mt-2 group cursor-pointer", children: [
            /* @__PURE__ */ jsxDEV(Phone, { className: "inline h-3 w-3 mr-2 text-primary" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 593,
              columnNumber: 19
            }, this),
            " ",
            settings?.businessPhone || "0400 000 000"
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 592,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 587,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV("div", { children: [
          /* @__PURE__ */ jsxDEV("p", { className: "text-white font-black uppercase tracking-widest text-[9px] mb-4 italic", children: "Protocol" }, void 0, false, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 597,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "flex gap-4 text-[9px] font-bold uppercase tracking-widest", children: [
            /* @__PURE__ */ jsxDEV("a", { href: "#", className: "hover:text-primary transition-colors", children: "Privacy" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 599,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("a", { href: "#", className: "hover:text-primary transition-colors", children: "Terms" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 600,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
            lineNumber: 598,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 596,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
        lineNumber: 586,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 580,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 579,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(AIBookingAssistant, {}, void 0, false, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 607,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(AnimatePresence, { children: selectedGoldPackage && /* @__PURE__ */ jsxDEV("div", { className: "fixed inset-0 z-[100] flex items-center justify-center p-4", children: [
      /* @__PURE__ */ jsxDEV(
        motion.div,
        {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          onClick: () => setSelectedGoldPackage(null),
          className: "absolute inset-0 bg-charcoal/80 backdrop-blur-md"
        },
        void 0,
        false,
        {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 612,
          columnNumber: 13
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        motion.div,
        {
          initial: { scale: 0.9, opacity: 0, y: 20 },
          animate: { scale: 1, opacity: 1, y: 0 },
          exit: { scale: 0.9, opacity: 0, y: 20 },
          className: "relative w-full max-w-lg bg-background rounded-[40px] shadow-2xl overflow-hidden border border-border",
          children: [
            /* @__PURE__ */ jsxDEV("div", { className: "absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-secondary via-ochre to-secondary" }, void 0, false, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 625,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "p-8 sm:p-12", children: [
              /* @__PURE__ */ jsxDEV("div", { className: "flex justify-between items-start mb-8", children: [
                /* @__PURE__ */ jsxDEV("div", { children: [
                  /* @__PURE__ */ jsxDEV("h4", { className: "text-3xl font-bold text-secondary mb-2", children: selectedGoldPackage }, void 0, false, {
                    fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                    lineNumber: 629,
                    columnNumber: 21
                  }, this),
                  /* @__PURE__ */ jsxDEV("p", { className: "text-[10px] font-black text-clay uppercase tracking-widest leading-tight", children: "GrassRoots Lawn Co. Lawn Full Package Standard Inclusions" }, void 0, false, {
                    fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                    lineNumber: 630,
                    columnNumber: 21
                  }, this)
                ] }, void 0, true, {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 628,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    variant: "ghost",
                    size: "icon",
                    onClick: () => setSelectedGoldPackage(null),
                    className: "h-8 w-8 rounded-full border border-border text-clay hover:bg-ochre/10",
                    children: /* @__PURE__ */ jsxDEV(X, { className: "h-4 w-4" }, void 0, false, {
                      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                      lineNumber: 640,
                      columnNumber: 21
                    }, this)
                  },
                  void 0,
                  false,
                  {
                    fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                    lineNumber: 634,
                    columnNumber: 19
                  },
                  this
                )
              ] }, void 0, true, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 627,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: goldPackageInclusions.map((item, idx) => /* @__PURE__ */ jsxDEV(
                motion.div,
                {
                  initial: { opacity: 0, x: -10 },
                  animate: { opacity: 1, x: 0 },
                  transition: { delay: idx * 0.05 },
                  className: "flex items-center gap-3 p-3 rounded-2xl bg-ochre/5 border border-border",
                  children: [
                    /* @__PURE__ */ jsxDEV(CheckCircle2, { className: "h-4 w-4 text-secondary shrink-0" }, void 0, false, {
                      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                      lineNumber: 653,
                      columnNumber: 23
                    }, this),
                    /* @__PURE__ */ jsxDEV("span", { className: "text-[11px] font-bold text-clay uppercase tracking-tight", children: item }, void 0, false, {
                      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                      lineNumber: 654,
                      columnNumber: 23
                    }, this)
                  ]
                },
                item,
                true,
                {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 646,
                  columnNumber: 21
                },
                this
              )) }, void 0, false, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 644,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ jsxDEV("div", { className: "mt-12", children: [
                /* @__PURE__ */ jsxDEV(
                  Button,
                  {
                    onClick: () => {
                      setSelectedGoldPackage(null);
                      navigate(`/booking?package=ultimate&type=ultimate-gold`);
                    },
                    className: "w-full h-14 bg-secondary hover:bg-secondary/90 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg",
                    children: [
                      "Proceed with ",
                      selectedGoldPackage
                    ]
                  },
                  void 0,
                  true,
                  {
                    fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                    lineNumber: 660,
                    columnNumber: 19
                  },
                  this
                ),
                /* @__PURE__ */ jsxDEV("p", { className: "mt-4 text-center text-[9px] font-bold text-clay/40 uppercase tracking-widest italic", children: "* All items listed above are included as standard in the Gold membership." }, void 0, false, {
                  fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                  lineNumber: 669,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
                lineNumber: 659,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
              lineNumber: 626,
              columnNumber: 15
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
          lineNumber: 619,
          columnNumber: 13
        },
        this
      )
    ] }, void 0, true, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 611,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
      lineNumber: 609,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "C:/Users/nardo/Desktop/mowing/grassroots-mowing-conew/src/pages/LandingPage.tsx",
    lineNumber: 206,
    columnNumber: 5
  }, this);
};

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkxhbmRpbmdQYWdlLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBSZWFjdCBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyB1c2VOYXZpZ2F0ZSwgdXNlTG9jYXRpb24gfSBmcm9tICdyZWFjdC1yb3V0ZXItZG9tJztcbmltcG9ydCB7IG1vdGlvbiwgQW5pbWF0ZVByZXNlbmNlIH0gZnJvbSAnbW90aW9uL3JlYWN0JztcbmltcG9ydCB7IHVzZUF1dGggfSBmcm9tICdAL2NvbnRleHRzL0F1dGhDb250ZXh0JztcbmltcG9ydCB7IFxuICBDaGVja0NpcmNsZTIsIFxuICBBcnJvd1JpZ2h0LCBcbiAgQXJyb3dMZWZ0LFxuICBIb21lLFxuICBVc2VycywgXG4gIFNoaWVsZENoZWNrLCBcbiAgVXNlckNpcmNsZSwgXG4gIExlYWYsIFxuICBTcGFya2xlcywgXG4gIFRyb3BoeSwgXG4gIFRyZWVzLFxuICBNYXBQaW4sXG4gIENsb2NrLFxuICBQaG9uZSxcbiAgTWFpbCxcbiAgSW5zdGFncmFtLFxuICBGYWNlYm9vayxcbiAgRHJvcGxldHMsXG4gIFRyYXNoMixcbiAgU2Npc3NvcnMsXG4gIFphcCxcbiAgV2F2ZXMsXG4gIFdpbmQsXG4gIENsaXBib2FyZExpc3QsXG4gIERvbGxhclNpZ24sXG4gIENhbWVyYSxcbiAgVXNlclBsdXMsXG4gIExheW91dERhc2hib2FyZCxcbiAgUGx1cyxcbiAgQ2FsZW5kYXIsXG4gIFRyZW5kaW5nVXAsXG4gIFgsXG4gIE1lbnUsXG4gIEJ1aWxkaW5nMixcbiAgVGFyZ2V0LFxuICBUcnVjayxcbiAgSGlzdG9yeVxufSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSAnQC9jb21wb25lbnRzL3VpL0J1dHRvbic7XG5pbXBvcnQgeyBCYWRnZSB9IGZyb20gJ0AvY29tcG9uZW50cy91aS9CYWRnZSc7XG5pbXBvcnQgeyBjbiB9IGZyb20gJ0AvbGliL3V0aWxzJztcbmltcG9ydCBBcHBMb2dvIGZyb20gJ0AvY29tcG9uZW50cy9BcHBMb2dvJztcbmltcG9ydCB7IEdyYXNzUm9vdHNMb2dvIH0gZnJvbSAnQC9jb21wb25lbnRzL0dyYXNzUm9vdHNMb2dvJztcbmltcG9ydCB7IEdyYXNzUm9vdHNHdWFyZGlhbiB9IGZyb20gJ0AvY29tcG9uZW50cy9HcmFzc1Jvb3RzR3VhcmRpYW4nO1xuaW1wb3J0IHsgQ2FyZCwgQ2FyZEhlYWRlciwgQ2FyZFRpdGxlLCBDYXJkQ29udGVudCB9IGZyb20gJ0AvY29tcG9uZW50cy91aS9DYXJkJztcbmltcG9ydCB7IFBSSUNJTkdfUlVMRVMsIEFERF9PTl9MQUJFTFMsIENMSUVOVF9UWVBFX0xBQkVMUyB9IGZyb20gJ0AvY29uc3RhbnRzJztcbmltcG9ydCB7IGNhbGN1bGF0ZVNlcnZpY2VQcmljZSB9IGZyb20gJ0Avc2VydmljZXMvcHJpY2luZ0VuZ2luZSc7XG5pbXBvcnQgeyB1c2VTZXR0aW5ncywgdXNlSm9icyB9IGZyb20gJ0AvaG9va3MvdXNlRmlyZWJhc2UnO1xuaW1wb3J0IHsgdXNlTGF0ZXN0QXNzZXQsIHVzZUFzc2V0cyB9IGZyb20gJ0AvaG9va3MvdXNlQXNzZXRzJztcbmltcG9ydCB7IEltYWdlUGxhY2Vob2xkZXIgfSBmcm9tICdAL2NvbXBvbmVudHMvSW1hZ2VQbGFjZWhvbGRlcic7XG5pbXBvcnQgeyBFZGl0YWJsZUltYWdlIH0gZnJvbSAnQC9jb21wb25lbnRzL0VkaXRhYmxlSW1hZ2UnO1xuaW1wb3J0IHsgdG9hc3QgfSBmcm9tICdyZWFjdC1ob3QtdG9hc3QnO1xuXG5pbXBvcnQgeyBTaWRlYmFyIH0gZnJvbSAnQC9jb21wb25lbnRzL05hdmlnYXRpb24nO1xuaW1wb3J0IHsgQUlCb29raW5nQXNzaXN0YW50IH0gZnJvbSAnQC9jb21wb25lbnRzL0FJQm9va2luZ0Fzc2lzdGFudCc7XG5cbmltcG9ydCB7IEJyYW5kQ2hhcmFjdGVyIH0gZnJvbSAnQC9jb21wb25lbnRzL0JyYW5kQ2hhcmFjdGVyJztcblxuZXhwb3J0IGNvbnN0IExhbmRpbmdQYWdlID0gKCkgPT4ge1xuICBjb25zdCBuYXZpZ2F0ZSA9IHVzZU5hdmlnYXRlKCk7XG4gIGNvbnN0IGxvY2F0aW9uID0gdXNlTG9jYXRpb24oKTtcbiAgY29uc3QgeyB1c2VyLCBsb2dvdXQsIHByb2ZpbGUgfSA9IHVzZUF1dGgoKTtcbiAgY29uc3QgeyBzZXR0aW5ncywgdXBkYXRlU2V0dGluZ3MgfSA9IHVzZVNldHRpbmdzKCk7XG4gIGNvbnN0IHsgam9icyB9ID0gdXNlSm9icygpO1xuICBcbiAgY29uc3QgeyBhc3NldDogbG9nb0Fzc2V0IH0gPSB1c2VMYXRlc3RBc3NldCgnbG9nbycpO1xuICBjb25zdCB7IGFzc2V0OiBoZXJvQXNzZXQgfSA9IHVzZUxhdGVzdEFzc2V0KCdoZXJvJyk7XG4gIGNvbnN0IHsgYXNzZXRzOiBnYWxsZXJ5QXNzZXRzIH0gPSB1c2VBc3NldHMoJ2dhbGxlcnknKTtcblxuICBjb25zdCBoYW5kbGVMb2dvVXBsb2FkID0gYXN5bmMgKG5ld1VybDogc3RyaW5nKSA9PiB7XG4gICAgdG9hc3QoXCJNYW5hZ2UgYnJhbmRpbmcgaW4gdGhlIEFzc2V0IFBvcnRmb2xpb1wiKTtcbiAgfTtcblxuICBjb25zdCBbaXNTaWRlYmFyT3Blbiwgc2V0SXNTaWRlYmFyT3Blbl0gPSBSZWFjdC51c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IGlzQ2xpZW50V2VsY29tZSA9IGxvY2F0aW9uLnBhdGhuYW1lID09PSAnL3dlbGNvbWUnO1xuXG4gIGNvbnN0IHByaWNpbmcgPSBzZXR0aW5ncz8ucHJpY2luZyB8fCBQUklDSU5HX1JVTEVTO1xuICBjb25zdCB0ZXN0aW1vbmlhbHMgPSBzZXR0aW5ncz8udGVzdGltb25pYWxzIHx8IFtdO1xuICBjb25zdCBjb21wbGV0ZWRKb2JzQ291bnQgPSBqb2JzLmZpbHRlcihqID0+IGouc3RhdHVzID09PSAncGFpZCcgfHwgai5zdGF0dXMgPT09ICdjb21wbGV0ZWQnKS5sZW5ndGg7XG5cbiAgY29uc3QgW3NlbGVjdGVkR29sZFBhY2thZ2UsIHNldFNlbGVjdGVkR29sZFBhY2thZ2VdID0gUmVhY3QudXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG5cbiAgY29uc3QgZ29sZFBhY2thZ2VJbmNsdXNpb25zID0gW1xuICAgICdFZGdlIFRyaW1taW5nJyxcbiAgICAnUGF0aCBCbG93aW5nJyxcbiAgICAnV2hpcHBlciBTbmlwcGluZycsXG4gICAgJ0JydXNoIEN1dHRpbmcnLFxuICAgICdXZWVkIHRyZWF0bWVudCcsXG4gICAgJ0dyZWVuIFdhc3RlIFJlbW92YWwnLFxuICAgICdGZXJ0aWxpc2VyIFRyZWF0bWVudCcsXG4gICAgJ1BydW5pbmcnLFxuICAgICdNdWxjaGluZyBTZXJ2aWNlJyxcbiAgICAnQ2xpcHBpbmcgUmVtb3ZhbCcsXG4gICAgJ0Z1bGwgWWVhcmx5IEFuYWx5c2lzICYgUGxhbm5pbmcnXG4gIF07XG5cbiAgY29uc3QgcGFja2FnZXMgPSBbXG4gICAge1xuICAgICAgaWQ6ICd0b3duX2Jsb2NrJyxcbiAgICAgIG5hbWU6ICdUb3duIEJsb2NrIChNb3cgJiBHbyknLFxuICAgICAgcHJpY2U6IHByaWNpbmcuYmFzZVsndG93bl9ibG9jayddLFxuICAgICAgZGVzY3JpcHRpb246ICdUaGUgbWFpbnRlbmFuY2UgZXNzZW50aWFsLiBQZXJmZWN0IGZvciB1bml0cywgZHVwbGV4ZXMsIGFuZCBzbWFsbCB0b3duIGJsb2Nrcy4nLFxuICAgICAgZmVhdHVyZXM6IFsnTGF3biBNb3dpbmcnLCAnV2hpcHBlciBzbmlwcGluZycsICdQYXRoICYgRHJpdmV3YXkgQmxvd2luZycsICdDbGlwcGluZyBSZW1vdmFsJ10sXG4gICAgICBjb2xvcjogJ2JvcmRlci1vY2hyZS8yMCdcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiAncmVzaWRlbnRpYWxfc3RhbmRhcmQnLFxuICAgICAgbmFtZTogJ1Jlc2lkZW50aWFsIFN0YW5kYXJkJyxcbiAgICAgIHByaWNlOiBwcmljaW5nLmJhc2VbJ3Jlc2lkZW50aWFsX3N0YW5kYXJkJ10sXG4gICAgICBkZXNjcmlwdGlvbjogJ091ciBtb3N0IHBvcHVsYXIgY2hvaWNlIGZvciBtaWQtc2l6ZWQgZmFtaWx5IGhvbWVzIGFuZCB0eXBpY2FsIHJlc2lkZW50aWFsIGxvdHMuJyxcbiAgICAgIGZlYXR1cmVzOiBbJ0xhd24gTW93aW5nJywgJ1doaXBwZXIgc25pcHBpbmcnLCAnUGF0aCAmIERyaXZld2F5IEJsb3dpbmcnLCAnQ2xpcHBpbmcgUmVtb3ZhbCddLFxuICAgICAgY29sb3I6ICdib3JkZXItc2Vjb25kYXJ5LzUwJyxcbiAgICAgIGZlYXR1cmVkOiB0cnVlXG4gICAgfSxcbiAgICB7XG4gICAgICBpZDogJ3ByZW1pdW1fZXN0YXRlJyxcbiAgICAgIG5hbWU6ICdQcmVtaXVtIEVzdGF0ZScsXG4gICAgICBwcmljZTogcHJpY2luZy5iYXNlWydwcmVtaXVtX2VzdGF0ZSddLFxuICAgICAgZGVzY3JpcHRpb246ICdUaGUgZ29sZCBzdGFuZGFyZCBmb3IgY29ybmVyIGJsb2NrcyBhbmQgbGFyZ2VyIHJlc2lkZW50aWFsIHByb3BlcnRpZXMuJyxcbiAgICAgIGZlYXR1cmVzOiBbJ0xhd24gTW93aW5nJywgJ1doaXBwZXIgc25pcHBpbmcnLCAnUGF0aCAmIERyaXZld2F5IEJsb3dpbmcnLCAnQ2xpcHBpbmcgUmVtb3ZhbCddLFxuICAgICAgY29sb3I6ICdib3JkZXItb2NocmUnXG4gICAgfSxcbiAgICB7XG4gICAgICBpZDogJ2FjcmVhZ2UnLFxuICAgICAgbmFtZTogJ0xhcmdlIExvdCAvIEFjcmVhZ2UnLFxuICAgICAgcHJpY2U6IHByaWNpbmcuYmFzZVsnYWNyZWFnZSddLFxuICAgICAgZGVzY3JpcHRpb246ICdIZWF2eS1kdXR5IGNhcmUgZm9yIG92ZXJzaXplZCBibG9ja3MsIG1pbmktYWNyZWFnZSwgYW5kIGNvbW1lcmNpYWwgZnJpbmdlcy4nLFxuICAgICAgZmVhdHVyZXM6IFsnTGF3biBNb3dpbmcnLCAnQnJ1c2ggQ3V0dGluZyddLFxuICAgICAgY29sb3I6ICdib3JkZXItc2Vjb25kYXJ5J1xuICAgIH0sXG4gICAge1xuICAgICAgaWQ6ICd1bHRpbWF0ZScsXG4gICAgICBuYW1lOiAnVWx0aW1hdGUgUHJvcGVydHkgR29sZCcsXG4gICAgICBwcmljZTogcHJpY2luZy5iYXNlWyd1bHRpbWF0ZSddLFxuICAgICAgZGVzY3JpcHRpb246ICdPdXIgdG9wIHRpZXIgb2YgY29tcHJlaGVuc2l2ZSBwcm9wZXJ0eSBtYW5hZ2VtZW50LiBQcm9mZXNzaW9uYWwgZ2FyZGVuaW5nLCBhcmJvcmlzdCB3b3JrLCBhbmQgc2Vhc29uYWwgY2FyZS4nLFxuICAgICAgY29sb3I6ICdib3JkZXItY2hhcmNvYWwgYmctY2hhcmNvYWwgdGV4dC13aGl0ZScsXG4gICAgICBpc0dvbGQ6IHRydWUsXG4gICAgICBnb2xkTGV2ZWxzOiBbXG4gICAgICAgIHsgXG4gICAgICAgICAgbmFtZTogJ1Rvd24gR29sZCcsIFxuICAgICAgICAgIHByaWNlOiAxNjAsIFxuICAgICAgICAgIGZlYXR1cmVzOiBbJ0dyYXNzUm9vdHMgTW93aW5nIENvLiBGdWxsIENhcmUgUHJvdG9jb2wnXSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBtYWludGVuYW5jZSBlc3NlbnRpYWwuIFBlcmZlY3QgZm9yIHVuaXRzLCBkdXBsZXhlcywgYW5kIHNtYWxsIHRvd24gYmxvY2tzLidcbiAgICAgICAgfSxcbiAgICAgICAgeyBcbiAgICAgICAgICBuYW1lOiAnUmVzaWRlbnRpYWwgR29sZCcsIFxuICAgICAgICAgIHByaWNlOiAyNDAsIFxuICAgICAgICAgIGZlYXR1cmVzOiBbJ0dyYXNzUm9vdHMgTW93aW5nIENvLiBGdWxsIENhcmUgUHJvdG9jb2wnXSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ091ciBtb3N0IHBvcHVsYXIgY2hvaWNlIGZvciBtaWQtc2l6ZWQgZmFtaWx5IGhvbWVzIGFuZCB0eXBpY2FsIHJlc2lkZW50aWFsIGxvdHMuJ1xuICAgICAgICB9LFxuICAgICAgICB7IFxuICAgICAgICAgIG5hbWU6ICdQcmVtaXVtIEdvbGQnLCBcbiAgICAgICAgICBwcmljZTogMzQwLCBcbiAgICAgICAgICBmZWF0dXJlczogWydHcmFzc1Jvb3RzIE1vd2luZyBDby4gRnVsbCBDYXJlIFByb3RvY29sJ10sXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgZ29sZCBzdGFuZGFyZCBmb3IgY29ybmVyIGJsb2NrcyBhbmQgbGFyZ2VyIHJlc2lkZW50aWFsIHByb3BlcnRpZXMuJ1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICBdO1xuXG4gIGNvbnN0IHBvcnRhbHMgPSBbXG4gICAge1xuICAgICAgcm9sZTogJ2FkbWluJyxcbiAgICAgIHRpdGxlOiAnTWFuYWdlbWVudCBDb25zb2xlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQWNjZXNzIGJ1c2luZXNzIGFuYWx5dGljcywgc3RhZmYgbWFuYWdlbWVudCwgYW5kIGZpbmFuY2lhbCByZXBvcnRpbmcuJyxcbiAgICAgIGljb246IFNoaWVsZENoZWNrLFxuICAgICAgY29sb3I6ICdiZy1zZWNvbmRhcnknXG4gICAgfSxcbiAgICB7XG4gICAgICByb2xlOiAnc3RhZmYnLFxuICAgICAgdGl0bGU6ICdTdGFmZiBQb3J0YWwnLFxuICAgICAgZGVzY3JpcHRpb246ICdWaWV3IHlvdXIgZGFpbHkgc2NoZWR1bGUsIG5hdmlnYXRlIHRvIGpvYnMsIGFuZCB0cmFjayB5b3VyIHdvcmsuJyxcbiAgICAgIGljb246IFVzZXJzLFxuICAgICAgY29sb3I6ICdiZy1vY2hyZSdcbiAgICB9LFxuICAgIHtcbiAgICAgIHJvbGU6ICdjbGllbnQnLFxuICAgICAgdGl0bGU6ICdDbGllbnQgUG9ydGFsJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnTWFuYWdlIHlvdXIgZXhpc3RpbmcgcmVjdXJyaW5nIHNlcnZpY2VzIGFuZCB2aWV3IHlvdXIgaW52b2ljZXMuJyxcbiAgICAgIGljb246IFVzZXJDaXJjbGUsXG4gICAgICBjb2xvcjogJ2JnLWNoYXJjb2FsJ1xuICAgIH1cbiAgXTtcblxuICBjb25zdCBhZGRvbnNMaXN0ID0gW1xuICAgIHsgbmFtZTogJ0VkZ2UgVHJpbW1pbmcnLCBwcmljZTogcHJpY2luZy5hZGRPbnM/LlsnZWRnaW5nJ10gfHwgMCwgaWNvbjogU3BhcmtsZXMgfSxcbiAgICB7IG5hbWU6ICdQYXRoIEJsb3dpbmcnLCBwcmljZTogcHJpY2luZy5hZGRPbnM/LlsnYmxvd2luZyddIHx8IDAsIGljb246IFdpbmQgfSxcbiAgICB7IG5hbWU6ICdXaGlwcGVyIFNuaXBwaW5nJywgcHJpY2U6IHByaWNpbmcuYWRkT25zPy5bJ3doaXBwZXItc25pcHBpbmcnXSB8fCAwLCBpY29uOiBTY2lzc29ycyB9LFxuICAgIHsgbmFtZTogJ0JydXNoIEN1dHRpbmcnLCBwcmljZTogcHJpY2luZy5hZGRPbnM/LlsnYnJ1c2gtY3V0dGluZyddIHx8IDAsIGljb246IFRyZWVzIH0sXG4gICAgeyBuYW1lOiAnR2FyZGVuIFdlZWRpbmcvU3ByYXlpbmcnLCBwcmljZTogcHJpY2luZy5hZGRPbnM/Llsnd2VlZC1zcHJheWluZyddIHx8IDAsIGljb246IERyb3BsZXRzIH0sXG4gICAgeyBuYW1lOiAnSGVkZ2UgVHJpbW1pbmcnLCBwcmljZTogcHJpY2luZy5hZGRPbnM/LlsnaGVkZ2UtdHJpbW1pbmcnXSB8fCAwLCBpY29uOiBTY2lzc29ycyB9LFxuICAgIHsgbmFtZTogJ0dyZWVuIFdhc3RlIFJlbW92YWwnLCBwcmljZTogcHJpY2luZy5hZGRPbnM/LlsnZ3JlZW4td2FzdGUtcmVtb3ZhbCddIHx8IDAsIGljb246IFRyYXNoMiB9LFxuICAgIHsgbmFtZTogJ0ZlcnRpbGlzZXIgVHJlYXRtZW50JywgcHJpY2U6IHByaWNpbmcuYWRkT25zPy5bJ2ZlcnRpbGlzZXItdHJlYXRtZW50J10gfHwgMCwgaWNvbjogWmFwIH0sXG4gICAgeyBuYW1lOiAnUHJ1bmluZycsIHByaWNlOiBwcmljaW5nLmFkZE9ucz8uWydwcnVuaW5nJ10gfHwgMCwgaWNvbjogU2Npc3NvcnMgfSxcbiAgICB7IG5hbWU6ICdNdWxjaGluZyBTZXJ2aWNlJywgcHJpY2U6IHByaWNpbmcuYWRkT25zPy5bJ211bGNoaW5nJ10gfHwgMCwgaWNvbjogTGVhZiB9LFxuICAgIHsgbmFtZTogJ0NsaXBwaW5nIFJlbW92YWwnLCBwcmljZTogcHJpY2luZy5hZGRPbnM/LlsnY2xpcHBpbmctcmVtb3ZhbCddIHx8IDAsIGljb246IFRyYXNoMiB9LFxuICAgIHsgbmFtZTogJ0Z1bGwgWWVhcmx5IEFuYWx5c2lzICYgUGxhbm5pbmcnLCBwcmljZTogcHJpY2luZy5hZGRPbnM/LlsneWVhcmx5LWFuYWx5c2lzJ10gfHwgMCwgaWNvbjogQ2xpcGJvYXJkTGlzdCB9LFxuICBdO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJtaW4taC1zY3JlZW4gYmctWyNGREZDRkJdIHNlbGVjdGlvbjpiZy1wcmltYXJ5LzIwIHNlbGVjdGlvbjp0ZXh0LXByaW1hcnlcIj5cbiAgICAgIDxuYXYgY2xhc3NOYW1lPVwic3RpY2t5IHRvcC0wIHotNTAgYm9yZGVyLWIgYm9yZGVyLXByaW1hcnkvMjAgYmctd2hpdGUvOTUgYmFja2Ryb3AtYmx1ci14bCBzaGFkb3ctbGcgc2hhZG93LWJsYWNrLzVcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgcG9pbnRlci1ldmVudHMtbm9uZVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIGJnLWdyYWRpZW50LXRvLXIgZnJvbS1bIzE3NEQzM10gdmlhLVsjN0E1NDJGXSB0by1bIzE3NEQzM10gb3BhY2l0eS1bMC4wOF1cIiAvPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtcmlnaHQtMTAgLXRvcC0yMCBvcGFjaXR5LVswLjA4XSBzY2FsZS03NVwiPlxuICAgICAgICAgICAgICA8R3Jhc3NSb290c0d1YXJkaWFuIHNpemU9ezIyMH0gLz5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSBsZWZ0LTAgYm90dG9tLTAgaC0xIHctZnVsbCBiZy1ncmFkaWVudC10by1yIGZyb20tcHJpbWFyeSB2aWEtb2NocmUgdG8tc2Vjb25kYXJ5XCIgLz5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicmVsYXRpdmUgbWF4LXctN3hsIG14LWF1dG8gcHgtMyBzbTpweC00IGxnOnB4LTYgcHktM1wiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gZ2FwLTNcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICAgIDxCdXR0b25cbiAgICAgICAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgdmFyaWFudD1cImdob3N0XCJcbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdpbmRvdy5oaXN0b3J5LnN0YXRlICYmIHdpbmRvdy5oaXN0b3J5LnN0YXRlLmlkeCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICBuYXZpZ2F0ZSgtMSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgbmF2aWdhdGUoJy8nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHB4LTMgcHktMiByb3VuZGVkLWZ1bGwgYmctY2hhcmNvYWwgdGV4dC13aGl0ZSBzaGFkb3ctbWQgYm9yZGVyIGJvcmRlci13aGl0ZS8xMCBob3ZlcjpvcGFjaXR5LTk1IHRvdWNoLW1hbmlwdWxhdGlvblwiXG4gICAgICAgICAgICAgICAgICB0aXRsZT1cIkdvIEJhY2tcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxBcnJvd0xlZnQgY2xhc3NOYW1lPVwiaC00IHctNFwiIC8+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVsxM3B4XSBmb250LWJsYWNrIHVwcGVyY2FzZSB0cmFja2luZy13aWRlclwiPkJhY2s8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9CdXR0b24+XG5cbiAgICAgICAgICAgICAgICA8QnV0dG9uXG4gICAgICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgIHZhcmlhbnQ9XCJnaG9zdFwiXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnLycpfVxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTIgcHgtMyBweS0yIHJvdW5kZWQtZnVsbCBiZy1wcmltYXJ5IHRleHQtd2hpdGUgc2hhZG93LW1kIGJvcmRlciBib3JkZXItd2hpdGUvMTAgaG92ZXI6b3BhY2l0eS05NSB0b3VjaC1tYW5pcHVsYXRpb25cIlxuICAgICAgICAgICAgICAgICAgdGl0bGU9XCJIb21lXCJcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICA8SG9tZSBjbGFzc05hbWU9XCJoLTQgdy00XCIgLz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzEzcHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVyXCI+SG9tZTwvc3Bhbj5cbiAgICAgICAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zIGN1cnNvci1wb2ludGVyIGdyb3VwIG1pbi13LTBcIlxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvJyl9XG4gICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImJnLXdoaXRlIHJvdW5kZWQtMnhsIGJvcmRlciBib3JkZXItcHJpbWFyeS8xMCBzaGFkb3ctc20gcHgtMyBweS0yIGZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgICA8aW1nIHNyYz1cIi9sb2dvLWhlYWRlci53ZWJwXCIgYWx0PVwiR3Jhc3NSb290cyBNb3dpbmcgQ29cIiBjbGFzc05hbWU9XCJoLTggc206aC0xMCB3LWF1dG8gb2JqZWN0LWNvbnRhaW5cIiAvPlxuXG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImhpZGRlbiBzbTpibG9jayBib3JkZXItbCBib3JkZXItcHJpbWFyeS8xNSBwbC0zXCI+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzlweF0gZm9udC1ibGFjayB0ZXh0LXByaW1hcnkgdXBwZXJjYXNlIHRyYWNraW5nLVswLjI1ZW1dIGxlYWRpbmctbm9uZVwiPlxuICAgICAgICAgICAgICAgICAgICAgIEdyYXNzUm9vdHNcbiAgICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVs4cHhdIGZvbnQtYm9sZCB0ZXh0LWNsYXkgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdCBsZWFkaW5nLW5vbmUgbXQtMVwiPlxuICAgICAgICAgICAgICAgICAgICAgIE1vd2luZyBDb1xuICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgICAgXG5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICAgIDxCdXR0b25cbiAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvYm9va2luZz90eXBlPW9uZV9vZmYnKX1cbiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cImhpZGRlbiBzbTpmbGV4IHB4LTQgcHktMiByb3VuZGVkLWZ1bGwgYmctc2Vjb25kYXJ5IHRleHQtd2hpdGUgaG92ZXI6Ymctc2Vjb25kYXJ5LzkwIHRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdCBpdGFsaWMgaC0xMCBzaGFkb3ctbWRcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIFF1aWNrIEJvb2tcbiAgICAgICAgICAgICAgICA8L0J1dHRvbj5cblxuICAgICAgICAgICAgICAgIDxCdXR0b25cbiAgICAgICAgICAgICAgICAgIHZhcmlhbnQ9XCJnaG9zdFwiXG4gICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnL2xvZ2luJyl9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoLTEwIHB4LTQgcm91bmRlZC1mdWxsIGJnLXByaW1hcnkvMTAgdGV4dC1wcmltYXJ5IGJvcmRlciBib3JkZXItcHJpbWFyeS8yMCBob3ZlcjpiZy1wcmltYXJ5IGhvdmVyOnRleHQtd2hpdGUgdGV4dC1bMTBweF0gZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IHNoYWRvdy1zbVwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgU2VjdXJlIFNlcnZpY2UgSHViXG4gICAgICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic206aGlkZGVuIG10LTNcIj5cbiAgICAgICAgICAgICAgPEJ1dHRvblxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvYm9va2luZz90eXBlPW9uZV9vZmYnKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgaC0xMSByb3VuZGVkLTJ4bCBiZy1zZWNvbmRhcnkgdGV4dC13aGl0ZSBob3ZlcjpiZy1zZWNvbmRhcnkvOTAgdGV4dC1bMTBweF0gZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMmVtXSBpdGFsaWMgc2hhZG93LW1kXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIFF1aWNrIEJvb2tcbiAgICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L25hdj5cblxuICAgICAgey8qIEFjdGlvbi1GaXJzdCBIZXJvICovfVxuICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwicmVsYXRpdmUgcHQtMTIgcGItMTIgcHgtNiBvdmVyZmxvdy1oaWRkZW4gYmctd2hpdGUgYm9yZGVyLWIgYm9yZGVyLWJvcmRlci80MFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgc3VidGxlLWdyaWQgb3BhY2l0eS01IHBvaW50ZXItZXZlbnRzLW5vbmVcIiAvPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0xLzIgbGVmdC0xLzIgLXRyYW5zbGF0ZS14LTEvMiAtdHJhbnNsYXRlLXktMS8yIHBvaW50ZXItZXZlbnRzLW5vbmVcIj5cbiAgICAgICAgICAgPEdyYXNzUm9vdHNHdWFyZGlhbiB2YXJpYW50PVwic3BvdGxpZ2h0XCIgY2xhc3NOYW1lPVwib3BhY2l0eS0xMCB3LVs2MDBweF0gaC1hdXRvXCIgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctN3hsIG14LWF1dG8gZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIgdGV4dC1jZW50ZXIgcmVsYXRpdmUgei0xMFwiPlxuICAgICAgICAgIDxtb3Rpb24uZGl2IFxuICAgICAgICAgICAgaW5pdGlhbD17eyBvcGFjaXR5OiAwLCB5OiAyMCB9fVxuICAgICAgICAgICAgYW5pbWF0ZT17eyBvcGFjaXR5OiAxLCB5OiAwIH19XG4gICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgbWF4LXctNHhsXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8aDEgY2xhc3NOYW1lPVwidGV4dC01eGwgbGc6dGV4dC03eGwgZm9udC1ibGFjayB0ZXh0LWNoYXJjb2FsIGxlYWRpbmctWzAuOV0gdHJhY2tpbmctdGlnaHRlciB1cHBlcmNhc2UgaXRhbGljIG1iLTZcIj5cbiAgICAgICAgICAgICAgWWFyZCBDYXJlIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeSBpdGFsaWNcIj5PbiBEZW1hbmQuPC9zcGFuPlxuICAgICAgICAgICAgPC9oMT5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1jbGF5IHRleHQteHMgbGc6dGV4dC1zbSBmb250LWJvbGQgbWF4LXcteGwgbXgtYXV0byBtYi0xMCBsZWFkaW5nLXJlbGF4ZWQgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE1ZW1dXCI+XG4gICAgICAgICAgICAgIFByb2Zlc3Npb25hbCBtYWludGVuYW5jZSBmb3Ige3NldHRpbmdzPy5zZXJ2aWNlTG9jYXRpb24gfHwgJ01vdW50IElzYSd9LiA8YnIgLz5cbiAgICAgICAgICAgICAgU2VsZWN0IHlvdXIgcGF0aCBiZWxvdyBmb3IgaW5zdGFudCBwcm9jZXNzaW5nLlxuICAgICAgICAgICAgPC9wPlxuXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgbWQ6Z3JpZC1jb2xzLTMgZ2FwLTMgbWItMTBcIj5cbiAgICAgICAgICAgICAgPEJ1dHRvbiBcbiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZSgnL2Jvb2tpbmc/dHlwZT1vbmVfb2ZmJyl9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaC0yMCBiZy1zZWNvbmRhcnkgaG92ZXI6Ymctc2Vjb25kYXJ5LzkwIHRleHQtd2hpdGUgZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMmVtXSB0ZXh0LVsxMXB4XSByb3VuZGVkLTJ4bCBzaGFkb3cteGwgc2hhZG93LXNlY29uZGFyeS8xMCBpdGFsaWMgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTEgZ3JvdXBcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICAgICAgIDxaYXAgc2l6ZT17MTZ9IC8+IE9ORS1PRkYgQk9PS0lOR1xuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzhweF0gb3BhY2l0eS03MCB0cmFja2luZy1bMC4zZW1dIGZvbnQtbWVkaXVtIGl0YWxpY1wiPkluc3RhbnQgUXVvdGUg4oCiIDUgQ2xpY2tzIHRvIFN1Y2Nlc3M8L3NwYW4+XG4gICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgPEJ1dHRvbiBcbiAgICAgICAgICAgICAgICB2YXJpYW50PVwib3V0bGluZVwiXG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9sb2dpbj9pbnRlbmRlZFJvbGU9cmV0dXJuaW5nJyl9XG4gICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiaC0yMCBib3JkZXItcHJpbWFyeS8yMCB0ZXh0LXByaW1hcnkgaG92ZXI6YmctcHJpbWFyeS81IGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRyYWNraW5nLVswLjJlbV0gdGV4dC1bMTFweF0gcm91bmRlZC0yeGwgaXRhbGljIGZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xXCJcbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTJcIj5cbiAgICAgICAgICAgICAgICAgICA8VXNlcnMgc2l6ZT17MTZ9IC8+IFJFR1VMQVIgQ0xJRU5UU1xuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzhweF0gb3BhY2l0eS03MCB0cmFja2luZy1bMC4zZW1dIGZvbnQtbWVkaXVtIGl0YWxpY1wiPk1hbmFnZSBQbGFucyDigKIgSm9iIEhpc3Rvcnk8L3NwYW4+XG4gICAgICAgICAgICAgIDwvQnV0dG9uPlxuXG4gICAgICAgICAgICAgIDxCdXR0b24gXG4gICAgICAgICAgICAgICAgdmFyaWFudD1cIm91dGxpbmVcIlxuICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IG5hdmlnYXRlKCcvbG9naW4/aW50ZW5kZWRSb2xlPWFzc2V0X21hbmFnZW1lbnQnKX1cbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoLTIwIGJvcmRlci1zbGF0ZS05MDAvMjAgdGV4dC1zbGF0ZS05MDAgaG92ZXI6Ymctc2xhdGUtNTAgZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMmVtXSB0ZXh0LVsxMXB4XSByb3VuZGVkLTJ4bCBpdGFsaWMgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgZ2FwLTFcIlxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgICAgICAgICAgIDxCdWlsZGluZzIgc2l6ZT17MTZ9IC8+IEFTU0VUIE1BTkFHRVJTXG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOHB4XSBvcGFjaXR5LTcwIHRyYWNraW5nLVswLjNlbV0gZm9udC1tZWRpdW0gaXRhbGljXCI+QWdlbmN5IFBvcnRhbCDigKIgQnVsayBJbnZvaWNpbmc8L3NwYW4+XG4gICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9tb3Rpb24uZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgey8qIEJyYW5kIE1pc3Npb24gU2VjdGlvbiAtIFRoZSBTdG9yeSBCZWhpbmQgT3VyIEFydHdvcmsgKi99XG4gICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJweS0yNCBweC02IGJnLXdoaXRlIHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIHRvcC0wIHJpZ2h0LTAgdy0xLzMgaC1mdWxsIHN1YnRsZS1ncmlkIG9wYWNpdHktNSBwb2ludGVyLWV2ZW50cy1ub25lXCIgLz5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSAtYm90dG9tLTIwIC1sZWZ0LTIwIHctOTYgaC05NiBvcGFjaXR5LTUgcG9pbnRlci1ldmVudHMtbm9uZSBncmF5c2NhbGVcIj5cbiAgICAgICAgICA8R3Jhc3NSb290c0d1YXJkaWFuIHNpemU9ezQwMH0gLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTV4bCBteC1hdXRvIHJlbGF0aXZlIHotMTAgdGV4dC1jZW50ZXJcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIGdhcC00IG1iLTEyXCI+XG4gICAgICAgICAgICA8QmFkZ2UgY2xhc3NOYW1lPVwiYmctcHJpbWFyeS8xMCB0ZXh0LXByaW1hcnkgYm9yZGVyLXByaW1hcnkvMjAgZm9udC1ibGFjayBweC02IHB5LTEgdGV4dC1bMTBweF0gdXBwZXJjYXNlIHRyYWNraW5nLVswLjNlbV1cIj5cbiAgICAgICAgICAgICAgUm9vdGVkIGluIENvdW50cnkuIEJ1aWx0IGZvciBDb21tdW5pdHkuXG4gICAgICAgICAgICA8L0JhZGdlPlxuICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtNHhsIG1kOnRleHQtNnhsIGZvbnQtYmxhY2sgdGV4dC1jaGFyY29hbCB0cmFja2luZy10aWdodGVyIHVwcGVyY2FzZSBpdGFsaWMgbGVhZGluZy1bMC44NV1cIj5cbiAgICAgICAgICAgICAgVGhlIFN0b3J5IEJlaGluZCA8YnIgLz48c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LXByaW1hcnkgaXRhbGljXCI+T3VyIEFydHdvcmsuPC9zcGFuPlxuICAgICAgICAgICAgPC9oMj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICBcbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgbGc6Z3JpZC1jb2xzLTIgZ2FwLTE2IGl0ZW1zLXN0YXJ0IHRleHQtbGVmdCBtYi0yNFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTZcIj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1jbGF5IHRleHQtc20gZm9udC1tZWRpdW0gbGVhZGluZy1yZWxheGVkIGl0YWxpY1wiPlxuICAgICAgICAgICAgICAgIEF0IEdyYXNzUm9vdHMgTW93aW5nIENvLCBvdXIgd29yayBpcyBtb3JlIHRoYW4ganVzdCBtb3dpbmcgYW5kIGxhbmRzY2FwaW5nIOKAlCBpdCdzIGFib3V0IGNvbm5lY3Rpb24sIHJlc3BlY3QgYW5kIGdpdmluZyBiYWNrIHRvIHRoZSBsYW5kIHRoYXQgc3VwcG9ydHMgdXMuXG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1jaGFyY29hbCBmb250LWJsYWNrIHRleHQtc20gbGVhZGluZy1yZWxheGVkIHVwcGVyY2FzZSB0cmFja2luZy10aWdodCBpdGFsaWMgYm9yZGVyLWwtNCBib3JkZXItcHJpbWFyeSBwbC02XCI+XG4gICAgICAgICAgICAgICAgXCJPdXIgdmlzdWFsIGFydHdvcmsgYW5kIGxvZ28gd2VyZSBjcmVhdGVkIGFzIGEgbW9kZXJuIHJlcHJlc2VudGF0aW9uIGluc3BpcmVkIGJ5IHRoZSBhcnR3b3JrIG9mIFN1blJvY2sgYW5kIHRoZSBuYXR1cmFsIGxhbmRzY2FwZXMgb2YgdGhlIGNvdW50cnkgd2hlcmUgR3Jhc3NSb290cyBNb3dpbmcgQ28gd2FzIGZvdW5kZWQuXCJcbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInB0LTggZ3JpZCBncmlkLWNvbHMtMiBnYXAtOFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS0yXCI+XG4gICAgICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwidGV4dC1bMTBweF0gZm9udC1ibGFjayB0ZXh0LXByaW1hcnkgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdFwiPkluc3BpcmVkIGJ5IENvdW50cnk8L2g0PlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bOXB4XSBmb250LWJvbGQgdGV4dC1jbGF5IHVwcGVyY2FzZSB0cmFja2luZy10aWdodFwiPlJlZmxlY3RpbmcgdGhlIG5hdHVyYWwgbGFuZHNjYXBlcyB3aGVyZSB3ZSBsaXZlIGFuZCB3b3JrLjwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktMlwiPlxuICAgICAgICAgICAgICAgICAgPGg0IGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdGV4dC1wcmltYXJ5IHVwcGVyY2FzZSB0cmFja2luZy13aWRlc3RcIj5TeW1ib2wgb2YgQ29ubmVjdGlvbjwvaDQ+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGZvbnQtYm9sZCB0ZXh0LWNsYXkgdXBwZXJjYXNlIHRyYWNraW5nLXRpZ2h0XCI+U3ltYm9saXNpbmcgY29ubmVjdGlvbiB0byBsYW5kLCBjb21tdW5pdHksIGFuZCBkZWVwIHJvb3RzLjwvcD5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy1zbGF0ZS01MCBwLTggcm91bmRlZC1bMnJlbV0gYm9yZGVyIGJvcmRlci1ib3JkZXIvNDAgcmVsYXRpdmVcIj5cbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgdG9wLTQgcmlnaHQtNCBvcGFjaXR5LTEwXCI+XG4gICAgICAgICAgICAgICAgICA8TGVhZiBjbGFzc05hbWU9XCJ0ZXh0LXByaW1hcnlcIiBzaXplPXs0MH0gLz5cbiAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1ibGFjayB0ZXh0LWNoYXJjb2FsIHVwcGVyY2FzZSBpdGFsaWMgbWItNiB0cmFja2luZy10aWdodCB1bmRlcmxpbmUgZGVjb3JhdGlvbi1wcmltYXJ5LzIwIHVuZGVybGluZS1vZmZzZXQtNFwiPlRoZSBMb2dvIEZvdW5kYXRpb25zPC9oMz5cbiAgICAgICAgICAgICAgIDx1bCBjbGFzc05hbWU9XCJzcGFjZS15LTRcIj5cbiAgICAgICAgICAgICAgICAgIHtbXG4gICAgICAgICAgICAgICAgICAgIFwiU3Ryb25nIGZvdW5kYXRpb25zXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiR3Jvd3RoICYgaW1wcm92ZW1lbnRcIixcbiAgICAgICAgICAgICAgICAgICAgXCJDYXJlIGZvciB0aGUgbGFuZFwiLFxuICAgICAgICAgICAgICAgICAgICBcIkNvbW11bml0eVwiLFxuICAgICAgICAgICAgICAgICAgICBcIlJlbGlhYmlsaXR5ICYgcHJpZGUgaW4gb3VyIHdvcmtcIlxuICAgICAgICAgICAgICAgICAgXS5tYXAoKGl0ZW0sIGlkeCkgPT4gKFxuICAgICAgICAgICAgICAgICAgICA8bGkga2V5PXtpZHh9IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0zXCI+XG4gICAgICAgICAgICAgICAgICAgICAgIDxDaGVja0NpcmNsZTIgc2l6ZT17MTZ9IGNsYXNzTmFtZT1cInRleHQtcHJpbWFyeVwiIC8+XG4gICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQteHMgZm9udC1ibGFjayB0ZXh0LWNsYXkgdXBwZXJjYXNlIHRyYWNraW5nLXRpZ2h0ZXJcIj57aXRlbX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgIDwvdWw+XG4gICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm10LTggcHQtOCBib3JkZXItdCBib3JkZXItYm9yZGVyLzQwXCI+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGZvbnQtYm9sZCB0ZXh0LWNoYXJjb2FsIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yZW1dIGl0YWxpYyBtYi0yXCI+Um9vdHMgb2Ygb3VyIEZvdW5kYXRpb248L3A+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVs4cHhdIHRleHQtY2xheSBmb250LW1lZGl1bSBsZWFkaW5nLW5vcm1hbFwiPlxuICAgICAgICAgICAgICAgICAgICBUaGUgY2VudHJhbCBmaWd1cmUgYW5kIHN1cnJvdW5kaW5nIGVsZW1lbnRzIHJlcHJlc2VudCBHcmFzc1Jvb3RzIE1vd2luZyBDbydzIGZvdW5kYXRpb25zIOKAlCBoYXJkIHdvcmssIGNhcmUgZm9yIHRoZSBsYW5kLCBmYW1pbHksIGFuZCByZXNwZWN0IGZvciB0aGUgVHJhZGl0aW9uYWwgT3duZXJzIG9mIHRoZSBjb3VudHJ5LlxuICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZ3JpZCBncmlkLWNvbHMtMSBtZDpncmlkLWNvbHMtMyBnYXAtMTIgdGV4dC1sZWZ0XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInNwYWNlLXktNFwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMTIgaC0xMiBiZy1vY2hyZS8xMCByb3VuZGVkLTJ4bCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LXByaW1hcnkgYm9yZGVyIGJvcmRlci1vY2hyZS8yMFwiPlxuICAgICAgICAgICAgICAgIDxUYXJnZXQgY2xhc3NOYW1lPVwiaC02IHctNlwiIC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0ZXh0LWNoYXJjb2FsIHVwcGVyY2FzZSB0cmFja2luZy10aWdodCBpdGFsaWNcIj5QcmVjaXNpb24gRm9jdXM8L2g0PlxuICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWNsYXkvODAgdGV4dC14cyBmb250LWJvbGQgbGVhZGluZy1yZWxheGVkIGl0YWxpY1wiPk91ciBwcm9wcmlldGFyeSBzYXRlbGxpdGUgbWFwcGluZyBlbnN1cmVzIGV2ZXJ5IHNxdWFyZSBpbmNoIG9mIHlvdXIgcHJvcGVydHkgaXMgYWNjb3VudGVkIGZvciBpbiBvdXIgZGVwbG95bWVudCBwbGFuLjwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzcGFjZS15LTRcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LTEyIGgtMTIgYmctb2NocmUvMTAgcm91bmRlZC0yeGwgZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgdGV4dC1wcmltYXJ5IGJvcmRlciBib3JkZXItb2NocmUvMjBcIj5cbiAgICAgICAgICAgICAgICA8VHJ1Y2sgY2xhc3NOYW1lPVwiaC02IHctNlwiIC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0ZXh0LWNoYXJjb2FsIHVwcGVyY2FzZSB0cmFja2luZy10aWdodCBpdGFsaWNcIj5SYXBpZCBEZXBsb3ltZW50PC9oND5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1jbGF5LzgwIHRleHQteHMgZm9udC1ib2xkIGxlYWRpbmctcmVsYXhlZCBpdGFsaWNcIj5PcHRpbWl6ZWQgcm91dGUgcGxhbm5pbmcgbWVhbnMgd2Ugc3BlbmQgbGVzcyB0aW1lIGRyaXZpbmcgYW5kIG1vcmUgdGltZSBwZXJmZWN0aW5nIHlvdXIgbGFuZHNjYXBlIGZvb3RwcmludC48L3A+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS00XCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidy0xMiBoLTEyIGJnLW9jaHJlLzEwIHJvdW5kZWQtMnhsIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHRleHQtcHJpbWFyeSBib3JkZXIgYm9yZGVyLW9jaHJlLzIwXCI+XG4gICAgICAgICAgICAgICAgPEhpc3RvcnkgY2xhc3NOYW1lPVwiaC02IHctNlwiIC8+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8aDQgY2xhc3NOYW1lPVwiZm9udC1ibGFjayB0ZXh0LWNoYXJjb2FsIHVwcGVyY2FzZSB0cmFja2luZy10aWdodCBpdGFsaWNcIj5Mb2NhbCBIZXJpdGFnZTwvaDQ+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtY2xheS84MCB0ZXh0LXhzIGZvbnQtYm9sZCBsZWFkaW5nLXJlbGF4ZWQgaXRhbGljXCI+V2UgdW5kZXJzdGFuZCB0aGUgc29pbCwgdGhlIGdyYXNzLCBhbmQgdGhlIGxvY2FsIHN0YW5kYXJkcy4gV2UncmUgcGFydCBvZiB0aGUgY29tbXVuaXR5IHdlIHNlcnZlLjwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgey8qIEN1bHR1cmFsIEFja25vd2xlZGdlbWVudCBTZWN0aW9uICovfVxuICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPVwicHktMTIgYmctY2hhcmNvYWwgdGV4dC13aGl0ZSByZWxhdGl2ZSBvdmVyZmxvdy1oaWRkZW5cIj5cbiAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYWJzb2x1dGUgaW5zZXQtMCBjdWx0dXJhbC1wYXR0ZXJuIG9wYWNpdHktMTAgcG9pbnRlci1ldmVudHMtbm9uZSBncmF5c2NhbGVcIiAvPlxuICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy00eGwgbXgtYXV0byBweC02IHJlbGF0aXZlIHotMTAgdGV4dC1jZW50ZXIgZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXJcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWItNiBwLTQgcm91bmRlZC1mdWxsIGJvcmRlciBib3JkZXItd2hpdGUvMTAgYmctd2hpdGUvNVwiPlxuICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciB0ZXh0LXByaW1hcnlcIj5cbiAgICAgICAgICAgICAgICAgIDxzdmcgd2lkdGg9XCI0MFwiIGhlaWdodD1cIjQwXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIGZpbGw9XCJub25lXCIgc3Ryb2tlPVwiY3VycmVudENvbG9yXCIgc3Ryb2tlV2lkdGg9XCIxLjVcIiBzdHJva2VMaW5lY2FwPVwicm91bmRcIiBzdHJva2VMaW5lam9pbj1cInJvdW5kXCI+PHBhdGggZD1cIk0xOCAxMVY2YTIgMiAwIDAgMC0yLTJINGEyIDIgMCAwIDAtMiAydjdhNCA0IDAgMCAwIDggMHYtMlwiLz48cGF0aCBkPVwiTTEyIDEwVjVhMiAyIDAgMCAxIDItMmg3YTIgMiAwIDAgMSAyIDJ2N2E0IDQgMCAwIDEtOCAwdi0yXCIvPjxwYXRoIGQ9XCJNMyAxM2gxbTMgMGgxTTEzIDEzaDFtMyAwaDFcIi8+PC9zdmc+XG4gICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGgzIGNsYXNzTmFtZT1cInRleHQtWzExcHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRyYWNraW5nLVswLjRlbV0gbWItNCB0ZXh0LXByaW1hcnlcIj5BY2tub3dsZWRnZW1lbnQgb2YgQ291bnRyeTwvaDM+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIG1kOnRleHQtYmFzZSBmb250LW1lZGl1bSBpdGFsaWMgb3BhY2l0eS04MCBsZWFkaW5nLXJlbGF4ZWQgbWF4LXctMnhsXCI+XG4gICAgICAgICAgICAgIEdyYXNzUm9vdHMgTW93aW5nIENvIGFja25vd2xlZGdlcyB0aGUgVHJhZGl0aW9uYWwgQ3VzdG9kaWFucyBvZiB0aGUgY291bnRyeSB3ZSBsaXZlIGFuZCB3b3JrIG9uLiBXZSBwYXkgb3VyIHJlc3BlY3RzIHRvIEVsZGVycyBwYXN0LCBwcmVzZW50LCBhbmQgZW1lcmdpbmcsIGFuZCBhY2tub3dsZWRnZSB0aGVpciBkZWVwIGFuZCBjb250aW51aW5nIGNvbm5lY3Rpb24gdG8gdGhlIGxhbmQsIHdhdGVyLCBhbmQgY29tbXVuaXR5LlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtOCB0ZXh0LVs5cHhdIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IG9wYWNpdHktNDBcIj5cbiAgICAgICAgICAgICAgUmVzcGVjdCB0aGUgbGFuZCDigKIgUmVzcGVjdCB0aGUgcGVvcGxlIOKAoiBSZXNwZWN0IHRoZSBmdXR1cmVcbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgIDwvZGl2PlxuICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICB7LyogQnJhbmQgSWRlbnRpdHkgU2hvd2Nhc2UgKi99XG4gICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJweS0yNCBweC02IGJnLXNsYXRlLTUwIHJlbGF0aXZlIG92ZXJmbG93LWhpZGRlblwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImFic29sdXRlIGluc2V0LTAgc3VidGxlLWdyaWQgb3BhY2l0eS01IHBvaW50ZXItZXZlbnRzLW5vbmVcIiAvPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTd4bCBteC1hdXRvIGdyaWQgbGc6Z3JpZC1jb2xzLTIgZ2FwLTE2IGl0ZW1zLWNlbnRlclwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwib3JkZXItMiBsZzpvcmRlci0xIGZsZXgganVzdGlmeS1jZW50ZXIgbGc6anVzdGlmeS1zdGFydFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ3LWZ1bGwgbWF4LXctbWRcIj5cbiAgICAgICAgICAgICAgPEJyYW5kQ2hhcmFjdGVyIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm9yZGVyLTEgbGc6b3JkZXItMiBzcGFjZS15LThcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3BhY2UteS00XCI+XG4gICAgICAgICAgICAgIDxCYWRnZSBjbGFzc05hbWU9XCJiZy1wcmltYXJ5LzIwIHRleHQtcHJpbWFyeSBib3JkZXItbm9uZSBmb250LWJsYWNrIHB4LTQgcHktMSB0ZXh0LVsxMHB4XSB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0XCI+XG4gICAgICAgICAgICAgICAgT3VyIE1hc2NvdFxuICAgICAgICAgICAgICA8L0JhZGdlPlxuICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC00eGwgbGc6dGV4dC01eGwgZm9udC1ibGFjayB0ZXh0LXNsYXRlLTkwMCBsZWFkaW5nLXRpZ2h0IGl0YWxpYyB1cHBlcmNhc2VcIj5cbiAgICAgICAgICAgICAgICBUaGUgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1wcmltYXJ5IGl0YWxpY1wiPldhcnJpb3Inczwvc3Bhbj4gVG91Y2hcbiAgICAgICAgICAgICAgPC9oMj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1iYXNlIHRleHQtc2xhdGUtNjAwIGZvbnQtbWVkaXVtIGxlYWRpbmctcmVsYXhlZCBtYXgtdy14bFwiPlxuICAgICAgICAgICAgICAgIEV2ZXJ5IGpvYiB3ZSBwZXJmb3JtIGlzIGd1aWRlZCBieSBvdXIgY3VzdG9tIGFydHdvcmvigJRyZXByZXNlbnRpbmcgdGhlIHN0cmVuZ3RoLCByZWxpYWJpbGl0eSwgYW5kIHByZWNpc2lvbiBvZiBhIHRydWUgZmllbGQgd2Fycmlvci4gVGhpcyBpc24ndCBqdXN0IGxhd24gY2FyZTsgaXQncyBhIGNvbW1pdG1lbnQgdG8gcHJvZmVzc2lvbmFsIGV4Y2VsbGVuY2UuXG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgXG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgc206Z3JpZC1jb2xzLTIgZ2FwLTZcIj5cbiAgICAgICAgICAgICAge1tcbiAgICAgICAgICAgICAgICB7IHRpdGxlOiBcIk1pbGl0YXJ5IFByZWNpc2lvblwiLCBkZXNjOiBcIk9wZXJhdGlvbnMgZXhlY3V0ZWQgd2l0aCB0YWN0aWNhbCBhY2N1cmFjeS5cIiB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IFwiSW5kZXN0cnVjdGlibGUgVHJ1c3RcIiwgZGVzYzogXCJBIGJyYW5kIGNoYXJhY3RlciBidWlsdCBvbiByZWxpYWJpbGl0eS5cIiB9LFxuICAgICAgICAgICAgICAgIHsgdGl0bGU6IFwiV2FycmlvciBFdGhvc1wiLCBkZXNjOiBcIldlIG5ldmVyIGxlYXZlIGEgcHJvcGVydHkgdW50aWwgaXQncyBwZXJmZWN0LlwiIH0sXG4gICAgICAgICAgICAgICAgeyB0aXRsZTogXCJNb2Rlcm4gSGVyaXRhZ2VcIiwgZGVzYzogXCJDb21iaW5pbmcgY2xhc3NpYyB2YWx1ZXMgd2l0aCBzbWFydCB0ZWNoLlwiIH1cbiAgICAgICAgICAgICAgXS5tYXAoKGl0ZW0sIGlkeCkgPT4gKFxuICAgICAgICAgICAgICAgIDxkaXYga2V5PXtpZHh9IGNsYXNzTmFtZT1cInNwYWNlLXktMlwiPlxuICAgICAgICAgICAgICAgICAgPGg0IGNsYXNzTmFtZT1cImZvbnQtYm9sZCB0ZXh0LXNsYXRlLTkwMCB0ZXh0LXNtIHVwcGVyY2FzZSBpdGFsaWMgdHJhY2tpbmctd2lkZVwiPntpdGVtLnRpdGxlfTwvaDQ+XG4gICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtc2xhdGUtNTAwIGZvbnQtbWVkaXVtIGxlYWRpbmctbm9ybWFsXCI+e2l0ZW0uZGVzY308L3A+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICB7LyogSGlnaCBEZW5zaXR5IE9wZXJhdGlvbnMgR3JpZCAqL31cbiAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInB5LTggYmctWyNGREZDRkJdIGN1bHR1cmFsLXBhdHRlcm5cIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJtYXgtdy03eGwgbXgtYXV0byBweC02IHJlbGF0aXZlIHotMTBcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgbWQ6Z3JpZC1jb2xzLTIgbGc6Z3JpZC1jb2xzLTMgZ2FwLThcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibGc6Y29sLXNwYW4tMVwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG1iLTRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMSBoLTQgYmctc2Vjb25kYXJ5IHJvdW5kZWQtZnVsbFwiIC8+XG4gICAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQtWzlweF0gZm9udC1ibGFjayB0ZXh0LXNsYXRlLTkwMCB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMmVtXSBpdGFsaWNcIj5Ub3RhbCBDYXJlIE1hdHJpeCAoR29sZCk8L2gyPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJiZy13aGl0ZSByb3VuZGVkLVsyNHB4XSBib3JkZXIgYm9yZGVyLWJvcmRlci80MCBwLTQgc2hhZG93LXNtXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0yIGdhcC15LTEuNSBnYXAteC00XCI+XG4gICAgICAgICAgICAgICAgICB7Z29sZFBhY2thZ2VJbmNsdXNpb25zLm1hcCgoaXRlbSkgPT4gKFxuICAgICAgICAgICAgICAgICAgICA8ZGl2IGtleT17aXRlbX0gY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTEuNSB0ZXh0LVs4cHhdIGZvbnQtYm9sZCB0ZXh0LWNsYXkgdXBwZXJjYXNlIHRyYWNraW5nLXRpZ2h0IHRydW5jYXRlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPENoZWNrQ2lyY2xlMiBzaXplPXsxMH0gY2xhc3NOYW1lPVwidGV4dC1zZWNvbmRhcnkgc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgIHtpdGVtfVxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgIDxCdXR0b24gXG4gICAgICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gbmF2aWdhdGUoJy9ib29raW5nP3R5cGU9dWx0aW1hdGUtZ29sZCcpfVxuICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cIm10LTQgdy1mdWxsIGgtOCBiZy1zZWNvbmRhcnkvNSB0ZXh0LXNlY29uZGFyeSBob3ZlcjpiZy1zZWNvbmRhcnkvMTAgdGV4dC1bOHB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSB0cmFja2luZy13aWRlc3Qgcm91bmRlZC1sZyBib3JkZXIgYm9yZGVyLXNlY29uZGFyeS8xMFwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgSm9pbiBHb2xkIFByb3RvY29sXG4gICAgICAgICAgICAgICAgPC9CdXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibGc6Y29sLXNwYW4tMVwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG1iLTRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMSBoLTQgYmctcHJpbWFyeSByb3VuZGVkLWZ1bGxcIiAvPlxuICAgICAgICAgICAgICAgIDxoMiBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGZvbnQtYmxhY2sgdGV4dC1zbGF0ZS05MDAgdXBwZXJjYXNlIHRyYWNraW5nLVswLjJlbV0gaXRhbGljXCI+T3BlcmF0aW9uYWwgRXh0ZW5zaW9uczwvaDI+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTIgZ2FwLTEuNVwiPlxuICAgICAgICAgICAgICAgIHthZGRvbnNMaXN0LnNsaWNlKDAsIDgpLm1hcCgoYWRkb24pID0+IChcbiAgICAgICAgICAgICAgICAgIDxkaXYga2V5PXthZGRvbi5uYW1lfSBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMiBwLTIgcm91bmRlZC14bCBiZy13aGl0ZSBib3JkZXIgYm9yZGVyLWJvcmRlci8yMFwiPlxuICAgICAgICAgICAgICAgICAgICA8YWRkb24uaWNvbiBzaXplPXsxMn0gY2xhc3NOYW1lPVwidGV4dC1jbGF5LzQwXCIgLz5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmbGV4IGZsZXgtY29sIG1pbi13LTBcIj5cbiAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJ0ZXh0LVs3LjVweF0gZm9udC1ibGFjayB0ZXh0LXNsYXRlLTkwMCB1cHBlcmNhc2UgdHJhY2tpbmctdGlnaHRlciB0cnVuY2F0ZSBsZWFkaW5nLW5vbmVcIj57YWRkb24ubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1bOHB4XSBmb250LWJsYWNrIHRleHQtcHJpbWFyeSBpdGFsaWMgbXQtMC41XCI+JHthZGRvbi5wcmljZX08L3NwYW4+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibGc6Y29sLXNwYW4tMVwiPlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIG1iLTRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInctMSBoLTQgYmctY2hhcmNvYWwgcm91bmRlZC1mdWxsXCIgLz5cbiAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPVwidGV4dC1bOXB4XSBmb250LWJsYWNrIHRleHQtc2xhdGUtOTAwIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yZW1dIGl0YWxpY1wiPlNlY3VyZSBTZXJ2aWNlIEh1YjwvaDI+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImdyaWQgZ3JpZC1jb2xzLTEgZ2FwLTEuNVwiPlxuICAgICAgICAgICAgICAgIHtwb3J0YWxzLm1hcCgocG9ydGFsKSA9PiAoXG4gICAgICAgICAgICAgICAgICA8YnV0dG9uIFxuICAgICAgICAgICAgICAgICAgICBrZXk9e3BvcnRhbC5yb2xlfVxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBuYXZpZ2F0ZShgL2xvZ2luP2ludGVuZGVkUm9sZT0ke3BvcnRhbC5yb2xlfWApfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBwLTMgcm91bmRlZC0yeGwgYmctd2hpdGUgYm9yZGVyIGJvcmRlci1ib3JkZXIvMjAgaG92ZXI6Ym9yZGVyLXByaW1hcnkvMzAgdHJhbnNpdGlvbi1hbGwgdGV4dC1sZWZ0XCJcbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9e2NuKFwidy04IGgtOCByb3VuZGVkLWxnIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHRleHQtd2hpdGVcIiwgcG9ydGFsLmNvbG9yKX0+XG4gICAgICAgICAgICAgICAgICAgICAgPHBvcnRhbC5pY29uIHNpemU9ezE0fSAvPlxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bOHB4XSBmb250LWJsYWNrIHRleHQtc2xhdGUtOTAwIHVwcGVyY2FzZSB0cmFja2luZy13aWRlc3QgbGVhZGluZy1ub25lIG1iLTFcIj57cG9ydGFsLnRpdGxlfTwvcD5cbiAgICAgICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1bN3B4XSB0ZXh0LWNsYXkgZm9udC1ib2xkIHVwcGVyY2FzZSB0cmFja2luZy10aWdodCB0cnVuY2F0ZSBtYXgtdy1bMTUwcHhdXCI+e3BvcnRhbC5kZXNjcmlwdGlvbn08L3A+XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8QXJyb3dSaWdodCBzaXplPXsxMn0gY2xhc3NOYW1lPVwibWwtYXV0byB0ZXh0LWNsYXkvMjBcIiAvPlxuICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9zZWN0aW9uPlxuXG4gICAgICA8Zm9vdGVyIGNsYXNzTmFtZT1cImJnLXNsYXRlLTk1MCB0ZXh0LXNsYXRlLTQwMCBweS0xMiBweC02IGJvcmRlci10IGJvcmRlci13aGl0ZS81XCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctN3hsIG14LWF1dG8gZmxleCBmbGV4LWNvbCBtZDpmbGV4LXJvdyBqdXN0aWZ5LWJldHdlZW4gaXRlbXMtY2VudGVyIGdhcC04XCI+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaXRlbXMtY2VudGVyIG1kOml0ZW1zLXN0YXJ0IGdhcC00XCI+XG4gICAgICAgICAgICAgIDxBcHBMb2dvIGNsYXNzTmFtZT1cImgtOCB3LWF1dG9cIiB0ZXh0Q2xhc3NOYW1lPVwidGV4dC13aGl0ZVwiIC8+XG4gICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzhweF0gZm9udC1ib2xkIHVwcGVyY2FzZSB0cmFja2luZy1bMC4zZW1dIG9wYWNpdHktNTAgaXRhbGljXCI+wqkge25ldyBEYXRlKCkuZ2V0RnVsbFllYXIoKX0ge3NldHRpbmdzPy5idXNpbmVzc05hbWU/LnRvVXBwZXJDYXNlKCkgfHwgJ0dSQVNTUk9PVFMgTU9XSU5HIENPLid9PC9wPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBnYXAtMTJcIj5cbiAgICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXdoaXRlIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdCB0ZXh0LVs5cHhdIG1iLTQgaXRhbGljXCI+SFEgQ29udGFjdDwvcD5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IGdyb3VwIGN1cnNvci1wb2ludGVyXCI+XG4gICAgICAgICAgICAgICAgICA8TWFpbCBjbGFzc05hbWU9XCJpbmxpbmUgaC0zIHctMyBtci0yIHRleHQtcHJpbWFyeVwiIC8+IHtzZXR0aW5ncz8uYnVzaW5lc3NFbWFpbCB8fCAnb3BzQGdyYXNzcm9vdHNtb3dpbmcuY28nfVxuICAgICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LVs5cHhdIGZvbnQtYm9sZCB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IG10LTIgZ3JvdXAgY3Vyc29yLXBvaW50ZXJcIj5cbiAgICAgICAgICAgICAgICAgIDxQaG9uZSBjbGFzc05hbWU9XCJpbmxpbmUgaC0zIHctMyBtci0yIHRleHQtcHJpbWFyeVwiIC8+IHtzZXR0aW5ncz8uYnVzaW5lc3NQaG9uZSB8fCAnMDQwMCAwMDAgMDAwJ31cbiAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtd2hpdGUgZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IHRleHQtWzlweF0gbWItNCBpdGFsaWNcIj5Qcm90b2NvbDwvcD5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZ2FwLTQgdGV4dC1bOXB4XSBmb250LWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdFwiPlxuICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJob3Zlcjp0ZXh0LXByaW1hcnkgdHJhbnNpdGlvbi1jb2xvcnNcIj5Qcml2YWN5PC9hPlxuICAgICAgICAgICAgICAgICAgPGEgaHJlZj1cIiNcIiBjbGFzc05hbWU9XCJob3Zlcjp0ZXh0LXByaW1hcnkgdHJhbnNpdGlvbi1jb2xvcnNcIj5UZXJtczwvYT5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Zvb3Rlcj5cblxuICAgICAgPEFJQm9va2luZ0Fzc2lzdGFudCAvPlxuXG4gICAgICA8QW5pbWF0ZVByZXNlbmNlPlxuICAgICAgICB7c2VsZWN0ZWRHb2xkUGFja2FnZSAmJiAoXG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJmaXhlZCBpbnNldC0wIHotWzEwMF0gZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgcC00XCI+XG4gICAgICAgICAgICA8bW90aW9uLmRpdlxuICAgICAgICAgICAgICBpbml0aWFsPXt7IG9wYWNpdHk6IDAgfX1cbiAgICAgICAgICAgICAgYW5pbWF0ZT17eyBvcGFjaXR5OiAxIH19XG4gICAgICAgICAgICAgIGV4aXQ9e3sgb3BhY2l0eTogMCB9fVxuICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRTZWxlY3RlZEdvbGRQYWNrYWdlKG51bGwpfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJhYnNvbHV0ZSBpbnNldC0wIGJnLWNoYXJjb2FsLzgwIGJhY2tkcm9wLWJsdXItbWRcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxtb3Rpb24uZGl2XG4gICAgICAgICAgICAgIGluaXRpYWw9e3sgc2NhbGU6IDAuOSwgb3BhY2l0eTogMCwgeTogMjAgfX1cbiAgICAgICAgICAgICAgYW5pbWF0ZT17eyBzY2FsZTogMSwgb3BhY2l0eTogMSwgeTogMCB9fVxuICAgICAgICAgICAgICBleGl0PXt7IHNjYWxlOiAwLjksIG9wYWNpdHk6IDAsIHk6IDIwIH19XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cInJlbGF0aXZlIHctZnVsbCBtYXgtdy1sZyBiZy1iYWNrZ3JvdW5kIHJvdW5kZWQtWzQwcHhdIHNoYWRvdy0yeGwgb3ZlcmZsb3ctaGlkZGVuIGJvcmRlciBib3JkZXItYm9yZGVyXCJcbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJhYnNvbHV0ZSB0b3AtMCBpbnNldC14LTAgaC0yIGJnLWdyYWRpZW50LXRvLXIgZnJvbS1zZWNvbmRhcnkgdmlhLW9jaHJlIHRvLXNlY29uZGFyeVwiIC8+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicC04IHNtOnAtMTJcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXgganVzdGlmeS1iZXR3ZWVuIGl0ZW1zLXN0YXJ0IG1iLThcIj5cbiAgICAgICAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgICAgICAgIDxoNCBjbGFzc05hbWU9XCJ0ZXh0LTN4bCBmb250LWJvbGQgdGV4dC1zZWNvbmRhcnkgbWItMlwiPntzZWxlY3RlZEdvbGRQYWNrYWdlfTwvaDQ+XG4gICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdGV4dC1jbGF5IHVwcGVyY2FzZSB0cmFja2luZy13aWRlc3QgbGVhZGluZy10aWdodFwiPlxuICAgICAgICAgICAgICAgICAgICAgIEdyYXNzUm9vdHMgTGF3biBDby4gTGF3biBGdWxsIFBhY2thZ2UgU3RhbmRhcmQgSW5jbHVzaW9uc1xuICAgICAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICAgIDxCdXR0b24gXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhbnQ9XCJnaG9zdFwiIFxuICAgICAgICAgICAgICAgICAgICBzaXplPVwiaWNvblwiIFxuICAgICAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRTZWxlY3RlZEdvbGRQYWNrYWdlKG51bGwpfVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoLTggdy04IHJvdW5kZWQtZnVsbCBib3JkZXIgYm9yZGVyLWJvcmRlciB0ZXh0LWNsYXkgaG92ZXI6Ymctb2NocmUvMTBcIlxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICA8WCBjbGFzc05hbWU9XCJoLTQgdy00XCIgLz5cbiAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJncmlkIGdyaWQtY29scy0xIHNtOmdyaWQtY29scy0yIGdhcC00XCI+XG4gICAgICAgICAgICAgICAgICB7Z29sZFBhY2thZ2VJbmNsdXNpb25zLm1hcCgoaXRlbSwgaWR4KSA9PiAoXG4gICAgICAgICAgICAgICAgICAgIDxtb3Rpb24uZGl2IFxuICAgICAgICAgICAgICAgICAgICAgIGtleT17aXRlbX1cbiAgICAgICAgICAgICAgICAgICAgICBpbml0aWFsPXt7IG9wYWNpdHk6IDAsIHg6IC0xMCB9fVxuICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGU9e3sgb3BhY2l0eTogMSwgeDogMCB9fVxuICAgICAgICAgICAgICAgICAgICAgIHRyYW5zaXRpb249e3sgZGVsYXk6IGlkeCAqIDAuMDUgfX1cbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBwLTMgcm91bmRlZC0yeGwgYmctb2NocmUvNSBib3JkZXIgYm9yZGVyLWJvcmRlclwiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICA8Q2hlY2tDaXJjbGUyIGNsYXNzTmFtZT1cImgtNCB3LTQgdGV4dC1zZWNvbmRhcnkgc2hyaW5rLTBcIiAvPlxuICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInRleHQtWzExcHhdIGZvbnQtYm9sZCB0ZXh0LWNsYXkgdXBwZXJjYXNlIHRyYWNraW5nLXRpZ2h0XCI+e2l0ZW19PC9zcGFuPlxuICAgICAgICAgICAgICAgICAgICA8L21vdGlvbi5kaXY+XG4gICAgICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibXQtMTJcIj5cbiAgICAgICAgICAgICAgICAgIDxCdXR0b24gXG4gICAgICAgICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICBzZXRTZWxlY3RlZEdvbGRQYWNrYWdlKG51bGwpO1xuICAgICAgICAgICAgICAgICAgICAgIG5hdmlnYXRlKGAvYm9va2luZz9wYWNrYWdlPXVsdGltYXRlJnR5cGU9dWx0aW1hdGUtZ29sZGApO1xuICAgICAgICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJ3LWZ1bGwgaC0xNCBiZy1zZWNvbmRhcnkgaG92ZXI6Ymctc2Vjb25kYXJ5LzkwIHRleHQtd2hpdGUgcm91bmRlZC0yeGwgZm9udC1ibGFjayB1cHBlcmNhc2UgdHJhY2tpbmctd2lkZXN0IHNoYWRvdy1sZ1wiXG4gICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgIFByb2NlZWQgd2l0aCB7c2VsZWN0ZWRHb2xkUGFja2FnZX1cbiAgICAgICAgICAgICAgICAgIDwvQnV0dG9uPlxuICAgICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtNCB0ZXh0LWNlbnRlciB0ZXh0LVs5cHhdIGZvbnQtYm9sZCB0ZXh0LWNsYXkvNDAgdXBwZXJjYXNlIHRyYWNraW5nLXdpZGVzdCBpdGFsaWNcIj5cbiAgICAgICAgICAgICAgICAgICAgKiBBbGwgaXRlbXMgbGlzdGVkIGFib3ZlIGFyZSBpbmNsdWRlZCBhcyBzdGFuZGFyZCBpbiB0aGUgR29sZCBtZW1iZXJzaGlwLlxuICAgICAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvbW90aW9uLmRpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKX1cbiAgICAgIDwvQW5pbWF0ZVByZXNlbmNlPlxuICAgIDwvZGl2PlxuICApO1xufTsiXSwibWFwcGluZ3MiOiJBQWlOWTtBQWpOWixZQUFZLFdBQVc7QUFDdkIsU0FBUyxhQUFhLG1CQUFtQjtBQUN6QyxTQUFTLFFBQVEsdUJBQXVCO0FBQ3hDLFNBQVMsZUFBZTtBQUN4QjtBQUFBLEVBQ0U7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBRUE7QUFBQSxFQUdBO0FBQUEsRUFDQTtBQUFBLEVBR0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUVBO0FBQUEsRUFDQTtBQUFBLEVBUUE7QUFBQSxFQUVBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsT0FDSztBQUNQLFNBQVMsY0FBYztBQUN2QixTQUFTLGFBQWE7QUFDdEIsU0FBUyxVQUFVO0FBQ25CLE9BQU8sYUFBYTtBQUVwQixTQUFTLDBCQUEwQjtBQUVuQyxTQUFTLHFCQUF3RDtBQUVqRSxTQUFTLGFBQWEsZUFBZTtBQUNyQyxTQUFTLGdCQUFnQixpQkFBaUI7QUFHMUMsU0FBUyxhQUFhO0FBR3RCLFNBQVMsMEJBQTBCO0FBRW5DLFNBQVMsc0JBQXNCO0FBRXhCLGFBQU0sY0FBYyxNQUFNO0FBQy9CLFFBQU0sV0FBVyxZQUFZO0FBQzdCLFFBQU0sV0FBVyxZQUFZO0FBQzdCLFFBQU0sRUFBRSxNQUFNLFFBQVEsUUFBUSxJQUFJLFFBQVE7QUFDMUMsUUFBTSxFQUFFLFVBQVUsZUFB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
