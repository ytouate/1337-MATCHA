"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationBell } from "@/components/common/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { useSignout } from "@/hooks/auth/useSignout";
import { useAuthStore } from "@/store/auth";
import {
  authenticatedNavGroups,
  getAccountNavItems,
  isNavItemActive,
  type NavGroup,
} from "@/lib/navConfig";
import { cn } from "@/lib/utils";

function NavGroupMenu({ group }: { group: NavGroup }) {
  const pathname = usePathname();

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger>{group.label}</NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid w-[280px] gap-1 p-2">
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(pathname, item.href);
            return (
              <li key={item.href}>
                <NavigationMenuLink asChild active={active}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-start gap-3 rounded-md p-3 hover:bg-accent",
                      active && "bg-accent",
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </Link>
                </NavigationMenuLink>
              </li>
            );
          })}
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  );
}

function MobileNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const accountItems = user ? getAccountNavItems(user.username) : [];

  return (
    <div className="space-y-6">
      {authenticatedNavGroups.map((group) => (
        <div key={group.id}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                    active
                      ? "bg-accent font-medium"
                      : "hover:bg-accent/60",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {accountItems.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Account
          </p>
          <div className="space-y-1">
            {accountItems.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                    active
                      ? "bg-accent font-medium"
                      : "hover:bg-accent/60",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppNavbar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();
  const { mutate: signout } = useSignout();
  const { setTheme, theme } = useTheme();
  const { openSignin } = useAuthModal();
  const [mobileOpen, setMobileOpen] = useState(false);

  const accountItems = user ? getAccountNavItems(user.username) : [];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1550px] items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          {isAuthenticated && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11 lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <MobileNav onNavigate={() => setMobileOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          )}

          <Button className="font-bold" variant="link" asChild>
            <Link href="/">MATCHA</Link>
          </Button>
        </div>

        {isAuthenticated && user && (
          <NavigationMenu className="hidden flex-1 justify-center lg:flex">
            <NavigationMenuList>
              {authenticatedNavGroups.map((group) => (
                <NavGroupMenu key={group.id} group={group} />
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        )}

        <div className="flex items-center gap-2">
          {isAuthenticated && user && (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-11 min-w-11 rounded-full"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.profile_picture ?? undefined}
                        alt={user.username}
                      />
                      <AvatarFallback>
                        {user.first_name?.[0]}
                        {user.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    {user.first_name} {user.last_name}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {accountItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            isNavItemActive(pathname, item.href) &&
                              "bg-accent",
                          )}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  >
                    {theme === "dark" ? (
                      <Sun className="mr-2 h-4 w-4" />
                    ) : (
                      <Moon className="mr-2 h-4 w-4" />
                    )}
                    Toggle theme
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signout()}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {!isAuthenticated && (
            <>
              <Button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11"
                aria-label="Toggle theme"
              >
                {theme === "light" ? <Moon /> : <Sun />}
              </Button>
              <Button onClick={openSignin} className="rounded-full">
                Login
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
