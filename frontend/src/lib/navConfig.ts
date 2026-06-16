import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CalendarHeart,
  Eye,
  Heart,
  Images,
  Map,
  MessageCircle,
  Search,
  ShieldBan,
  User,
  UserPen,
  Users,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const discoverNav: NavGroup = {
  id: "discover",
  label: "Discover",
  items: [
    {
      label: "Search",
      href: "/",
      icon: Search,
      description: "Browse and filter profiles",
    },
    {
      label: "Map",
      href: "/map",
      icon: Map,
      description: "See nearby users on the map",
    },
  ],
};

export const socialNav: NavGroup = {
  id: "social",
  label: "Social",
  items: [
    {
      label: "Connections",
      href: "/connections",
      icon: Users,
      description: "Manage your matches",
    },
    {
      label: "Chat",
      href: "/chat",
      icon: MessageCircle,
      description: "Message threads",
    },
    {
      label: "Dates",
      href: "/dates",
      icon: CalendarHeart,
      description: "Upcoming meetups",
    },
  ],
};

export const activityNav: NavGroup = {
  id: "activity",
  label: "Activity",
  items: [
    {
      label: "Notifications",
      href: "/notifications",
      icon: Bell,
      description: "Likes, views, and alerts",
    },
    {
      label: "Likes",
      href: "/profile/me/likes",
      icon: Heart,
      description: "Who liked you",
    },
    {
      label: "Viewers",
      href: "/profile/me/viewers",
      icon: Eye,
      description: "Who viewed your profile",
    },
  ],
};

export const authenticatedNavGroups: NavGroup[] = [
  discoverNav,
  socialNav,
  activityNav,
];

export interface AccountNavItem extends NavItem {
  action?: "theme" | "logout";
}

export function getAccountNavItems(username: string): AccountNavItem[] {
  return [
    {
      label: "My profile",
      href: `/profile/${username}`,
      icon: User,
    },
    {
      label: "Edit profile",
      href: "/profile/edit",
      icon: UserPen,
    },
    {
      label: "Gallery",
      href: "/profile/me/gallery",
      icon: Images,
    },
    {
      label: "Blocked users",
      href: "/profile/me/blocked",
      icon: ShieldBan,
    },
  ];
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/chat") {
    return pathname === "/chat" || pathname.startsWith("/chat/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getActiveNavHref(
  pathname: string,
  groups: NavGroup[],
): string | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (isNavItemActive(pathname, item.href)) {
        return item.href;
      }
    }
  }
  return null;
}
