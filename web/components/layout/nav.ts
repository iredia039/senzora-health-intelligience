import { Lightbulb, HeartPulse, History, LayoutDashboard, MapPin, MessageCircle, Settings, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", title: "Overview", description: "Your latest readings and what they mean.", icon: LayoutDashboard },
  { href: "/vitals", label: "Vitals", title: "Vitals", description: "Record and manage heart rate and blood pressure.", icon: HeartPulse },
  { href: "/insights", label: "Health Insights", title: "Health Insights", description: "Plain-language analysis of your saved readings.", icon: Lightbulb },
  { href: "/chat", label: "AI Assistant", title: "AI Assistant", description: "Ask questions about your readings and medicines.", icon: MessageCircle },
  { href: "/history", label: "Health History", title: "Health History", description: "Browse, filter, and export every reading.", icon: History },
  { href: "/find-care", label: "Find Care", title: "Find Care", description: "Find pharmacies, clinics, hospitals, and labs.", icon: MapPin },
  { href: "/settings", label: "Settings", title: "Settings", description: "Profile, preferences, privacy, and your data.", icon: Settings },
];
