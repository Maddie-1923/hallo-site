"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useAccountExtras, useSettings, type Settings } from "@/lib/settings";
import { loadServices } from "@/lib/settings-actions";
import { APPEARANCE_KEY, DEFAULT_THEME, THEMES, THEME_KEY, applyTheme, type Appearance } from "@/lib/theme";
import type { Service } from "@/lib/tmdb";
import { HeadingPill } from "./TitleParts";
import { DeleteAccount } from "./DeleteAccount";
import { ImportPanel } from "./ImportPanel";
import { ManageSubscription } from "./ProCheckout";
import { saveAbout as saveAboutToAccount, saveAccountTheme } from "@/lib/account-settings";
import { formatDate } from "@/lib/dates";
import type { Subscription } from "@/lib/entitlement";
import { checkName, checkText } from "@/lib/word-filter";
import { BlockedPeople } from "./BlockedPeople";

// Settings, after the app's Settings screen and the plan's list: who you are,
// your account, who sees what, what you're told about, where you watch, how
// the site looks, spoilers, bringing your history in and out, and closing
// the account. On a wide screen the sections are listed down the left and
// the page scrolls through them on the right; on a phone they stack. Until
// accounts open, choices are kept in this browser (and theme and day/night
// take effect at once, as the bar's own controls do).
const SECTIONS = [
  ["profile", "Profile"],
  ["account", "Account"],
  ["privacy", "Privacy"],
  ["notifications", "Notifications"],
  ["watch", "Where you watch"],
  ["appearance", "Appearance"],
  ["spoilers", "Spoilers"],
  ["data", "Import & export"],
  ["delete", "Delete account"],
] as const;

const SHELL = "rounded-shell bg-card p-2 border-[0.5px] border-t-[color:var(--lit-edge)] border-x-piece border-b-well shadow-[0_4px_9px_rgba(0,0,0,.35)]";
const ABOUT_KEY = "kodigo.profile-about.preview";

export function SettingsPage({ username, detected, regions, initialServices, signedIn = false, subscription = null, email }: { /** Null: signed in without one yet. */ username: string | null; detected: string; regions: { code: string; name: string }[]; initialServices: Service[]; signedIn?: boolean; subscription?: Subscription | null; email?: string }) {
  const [s, set] = useSettings();
  const [about, setAbout] = useState({ location: "", quote: "" });
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [appearance, setAppearance] = useState<Appearance>("system");
  const [services, setServices] = useState(initialServices);
  const [loading, startLoading] = useTransition();
  const region = s.region ?? detected;

  useEffect(() => {
    try {
      const a = localStorage.getItem(ABOUT_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (a) setAbout(JSON.parse(a));
      const ap = localStorage.getItem(APPEARANCE_KEY);
      if (ap === "light" || ap === "dark") setAppearance(ap);
    } catch {}
    const t = document.documentElement.dataset.theme;
    if (t && THEMES.some((x) => x.id === t)) setTheme(t);
  }, []);

  // Signed in, location and quote are the account's: shown once they
  // arrive, and saved to the profile as they're typed (after the word
  // filter, which the boxes also run).
  const extras = useAccountExtras();
  const [aboutFromAccount, setAboutFromAccount] = useState(false);
  useEffect(() => {
    if (!extras || aboutFromAccount) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbout(extras.about);
    setAboutFromAccount(true);
  }, [extras, aboutFromAccount]);
  const aboutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveAbout = (next: typeof about) => {
    setAbout(next);
    try {
      localStorage.setItem(ABOUT_KEY, JSON.stringify(next));
    } catch {}
    if (!signedIn) return;
    if (aboutTimer.current) clearTimeout(aboutTimer.current);
    aboutTimer.current = setTimeout(() => void saveAboutToAccount(next).catch(() => {}), 600);
  };
  const chooseTheme = (id: string) => {
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {}
    if (signedIn) void saveAccountTheme(id).catch(() => {});
    applyTheme(id, appearance);
    setTheme(id);
  };
  const chooseAppearance = (a: Appearance) => {
    try {
      if (a === "system") localStorage.removeItem(APPEARANCE_KEY);
      else localStorage.setItem(APPEARANCE_KEY, a);
    } catch {}
    applyTheme(theme, a);
    setAppearance(a);
  };
  const chooseRegion = (code: string) => {
    set({ region: code, services: [] });
    startLoading(async () => setServices(await loadServices(code)));
  };
  const toggle = (key: keyof Settings) => <Toggle on={!!s[key]} onChange={(v) => set({ [key]: v } as Partial<Settings>)} />;
  // Public profile, like every setting, saves to the account when signed in
  // (lib/settings.ts); the page shows the account's answer once it arrives.
  const publicToggle = toggle("publicProfile");

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] items-start">
      {/* The sections, down the left on a wide screen. */}
      <nav aria-label="Settings sections" className={`${SHELL} lg:sticky lg:top-24 max-lg:hidden`}>
        <ul className="m-0 p-0 list-none grid gap-1">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className={`block rounded-[10px] px-3 py-2 text-[12.5px] no-underline hover:bg-piece transition-colors ${id === "delete" ? "text-dim hover:text-ink" : "text-ink"}`}>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 max-w-[720px]">
        <p className="m-0 rounded-shell bg-card p-3 text-[12.5px] leading-[1.6] text-mid-tone">
          {signedIn
            ? "Your choices are saved to your account and follow you to every device where you're signed in. Day or night stays with each device."
            : "Your choices are kept in this browser. Sign in and they're saved to your account, on every device."}
        </p>

        <Group id="profile" title="Profile">
          <Field label="Display name" hint="Shown on your profile beside your username.">
            <Text value={s.displayName} onChange={(v) => set({ displayName: v })} check={checkName} placeholder="Your name" />
          </Field>
          <Field label="Username" hint="Your profile's address, kodigo.pro/u/…">
            {signedIn ? (
              <span className="flex items-center gap-2">
                {username && <span className="text-[12.5px] text-ink">@{username}</span>}
                <LinkButton href="/profile/setup">{username ? "Change" : "Choose one"}</LinkButton>
              </span>
            ) : (
              <span className="text-[12.5px] text-ink">@{username}</span>
            )}
          </Field>
          <Field label="Location">
            <Text value={about.location} onChange={(v) => saveAbout({ ...about, location: v })} check={checkText} placeholder="Where you are" />
          </Field>
          <Field label="Quote" hint="A line in your own words, on your profile.">
            <Text value={about.quote} onChange={(v) => saveAbout({ ...about, quote: v })} check={checkText} placeholder="Add a quote" />
          </Field>
          <Field label="Photo and banner" hint="Chosen from pictures of what you track.">
            <LinkButton href={username ? `/u/${username}` : "/profile/setup"}>Change on your profile</LinkButton>
          </Field>
        </Group>

        <Group id="account" title="Account">
          <Field label="Email" hint="Where your sign-in link goes.">
            <span className="text-[12.5px] text-dim truncate">{signedIn && email ? email : "Opens with accounts"}</span>
          </Field>
          <Field label="Subscription" hint={subscriptionHint(subscription, s.dateFormat)}>
            {subscription?.pro && subscription.source === "stripe" ? <ManageSubscription /> : subscription?.pro ? null : <LinkButton href="/pro">Kodigo Pro</LinkButton>}
          </Field>
          <Field label="Sign out" hint="On this browser only.">
            {signedIn ? (
              <form action="/auth/signout" method="post">
                <button type="submit" className="h-8 px-4 rounded-full text-[12.5px] font-semibold cursor-pointer bg-card text-ink border border-hair hover:text-accent">
                  Sign out
                </button>
              </form>
            ) : (
              <Button off>Sign out</Button>
            )}
          </Field>
        </Group>

        <Group id="privacy" title="Privacy">
          <Field label="Public profile" hint="Anyone can see your profile, reviews and lists. Turned off, only people you let follow you can.">
            {publicToggle}
          </Field>
          <Field label="Show recent activity" hint="What you watched and reviewed lately, on your profile.">
            {toggle("showActivity")}
          </Field>
          <Field label="Show your Watchlog">{toggle("showWatchlog")}</Field>
          <Field label="Show your watchlist" hint="What you mean to watch, as a tab on your profile.">{toggle("showWatchlist")}</Field>
          <Field label="Show what you're watching" hint="The series you're partway through, and how far.">{toggle("showWatching")}</Field>
          <Field label="Let people follow you">{toggle("allowFollows")}</Field>
          <Field label="Blocked people" hint="They can't see your profile or anything you post, and you don't see theirs.">
            <BlockedPeople />
          </Field>
          <Field label="Categories" hint="Each category's eye on your profile sets whether others see it.">
            <LinkButton href={username ? `/u/${username}#categories` : "/profile/setup"}>Open categories</LinkButton>
          </Field>
        </Group>

        <Group id="notifications" title="Notifications" note="By email. Episode and release reminders are in the app.">
          <Field label="Someone follows you">{toggle("notifyFollows")}</Field>
          <Field label="Likes on your reviews and lists">{toggle("notifyLikes")}</Field>
          <Field label="Replies and comments">{toggle("notifyComments")}</Field>
          <Field label="Weekly digest" hint="What's new from your shows and the people you follow, once a week.">
            {toggle("weeklyDigest")}
          </Field>
        </Group>

        <Group id="watch" title="Where you watch">
          <Field label="Country" hint="For where to watch, release dates and ratings.">
            <select
              value={region}
              onChange={(e) => chooseRegion(e.target.value)}
              className="max-w-[220px] rounded-[10px] bg-card border border-hair px-2.5 py-1.5 text-[12.5px] text-ink cursor-pointer focus:outline-none focus:border-accent"
            >
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="py-[10px]">
            <div className="text-[12.5px] text-ink">Your services</div>
            <div className="mt-0.5 text-[12.5px] text-dim">The ones you pay for. {loading ? "Loading…" : `${s.services.length} chosen.`}</div>
            <div className="mt-2.5 grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2">
              {services.map((sv) => {
                const on = s.services.includes(sv.id);
                return (
                  <button
                    key={sv.id}
                    type="button"
                    title={sv.name}
                    aria-label={sv.name}
                    aria-pressed={on}
                    onClick={() => set({ services: on ? s.services.filter((x) => x !== sv.id) : [...s.services, sv.id] })}
                    className={`relative aspect-square rounded-[10px] overflow-hidden border cursor-pointer transition-[opacity,box-shadow] ${on ? "border-transparent ring-2 ring-accent-fill" : "border-hair opacity-45 hover:opacity-80"}`}
                  >
                    {sv.logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={sv.logo} alt="" className="w-full h-full object-cover" />
                    )}
                    {on && (
                      <span className="absolute right-0.5 bottom-0.5 w-4 h-4 rounded-full bg-accent-fill text-on-accent flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Only what's on my services" hint="Where to watch and browsing show your services first, and only them.">
            {toggle("onlyMyServices")}
          </Field>
        </Group>

        <Group id="appearance" title="Appearance">
          <Field label="Theme">
            <div className="flex flex-wrap justify-end gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.name}
                  aria-label={t.name}
                  aria-pressed={t.id === theme}
                  onClick={() => chooseTheme(t.id)}
                  className={`tone w-7 h-7 rounded-full border border-hair cursor-pointer ${t.id === theme ? "ring-2 ring-offset-2 ring-offset-[color:var(--piece)] ring-ink" : ""}`}
                  style={{ ["--tone-day" as string]: t.day, ["--tone-night" as string]: t.night }}
                />
              ))}
            </div>
          </Field>
          <Field label="Day or night">
            <Segments value={appearance} onChange={chooseAppearance} options={[["system", "Auto"], ["light", "Day"], ["dark", "Night"]]} />
          </Field>
          <Field label="Dates">
            <Segments value={s.dateFormat} onChange={(v) => set({ dateFormat: v })} options={[["day-month", "29 Sep"], ["month-day", "Sep 29"], ["numeric", "29/09"]]} />
          </Field>
        </Group>

        <Group id="spoilers" title="Spoilers" note="Hidden until you've watched the episode.">
          <Field label="Episode names">{toggle("hideTitles")}</Field>
          <Field label="Episode descriptions">{toggle("hideDescriptions")}</Field>
          <Field label="Episode pictures">{toggle("hideImages")}</Field>
        </Group>

        <Group id="data" title="Import & export">
          <ImportPanel />
          <Field label="Download everything" hint="Your whole library as one Kodigo backup file, which any copy of Kodigo can read back.">
            <a href="/api/export" download className="inline-flex items-center h-8 px-4 rounded-full bg-card border border-hair text-[12.5px] font-semibold text-ink no-underline hover:text-accent transition-colors">
              Export
            </a>
          </Field>
        </Group>

        <Group id="delete" title="Delete account" note="Your sign-in, the copy of your library on Kodigo's server and your profile go, straight away. A backup you've saved is yours and stays where you put it.">
          <Field label="Delete your account" hint="In the app: Settings, Backup & Sync, Kodigo sync.">
            <DeleteAccount signedIn={signedIn} />
          </Field>
        </Group>
      </div>
    </div>
  );
}

/** A section: its heading pill over a shell holding one panel of rows. */
function Group({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 grid grid-cols-[minmax(0,1fr)] gap-2">
      <div>
        <HeadingPill small>{title}</HeadingPill>
      </div>
      <div className={SHELL}>
        <div className="rounded-shell bg-piece px-3 py-[2px]">
          {note && <p className="m-0 py-[10px] border-b border-hair text-[12.5px] leading-[1.6] text-dim">{note}</p>}
          <div className="divide-y divide-hair">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** A row: what it is (and a line on what it does) on the left, the control
    on the right. */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-[10px] min-w-0">
      <div className="min-w-0">
        <div className="text-[12.5px] text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[12.5px] leading-[1.5] text-dim">{hint}</div>}
      </div>
      <div className="shrink-0 flex justify-end">{children}</div>
    </div>
  );
}

/** The app's switch: a track in the accent when on, the knob across. */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors ${on ? "bg-accent-fill" : "bg-hair"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.35)] transition-[left] duration-200 ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/** A line of text, saved as it's typed; with `check` (the word filter), a
    refused version isn't saved and says why under the box. */
function Text({ value, onChange, placeholder, check }: { value: string; onChange: (v: string) => void; placeholder: string; check?: (v: string) => string | null }) {
  const [draft, setDraft] = useState<string | null>(null);
  const problem = draft != null && check ? check(draft) : null;
  return (
    <div className="grid gap-1 w-[220px] max-w-full">
      <input
        value={draft ?? value}
        onChange={(e) => {
          const v = e.target.value;
          if (check?.(v)) setDraft(v);
          else {
            setDraft(null);
            onChange(v);
          }
        }}
        aria-invalid={!!problem}
        placeholder={placeholder}
        maxLength={80}
        className={`w-full rounded-[10px] bg-card border px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-dim focus:outline-none ${problem ? "border-loved" : "border-hair focus:border-accent"}`}
      />
      {problem && (
        <span role="alert" className="text-[12px] leading-[1.4] text-loved">
          {problem}
        </span>
      )}
    </div>
  );
}

/** A choice of two or three, lettered as the tab bars. */
function Segments<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: [T, string][] }) {
  return (
    <div role="radiogroup" className="inline-flex gap-1 p-1 rounded-full bg-card">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 rounded-full text-[10.5px] leading-none font-bold uppercase tracking-[.12em] cursor-pointer transition-colors ${value === v ? "bg-ink text-page" : "text-dim hover:text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Button({ children, off = false, danger = false }: { children: React.ReactNode; off?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      disabled={off}
      title={off ? "Opens with accounts" : undefined}
      className={`h-8 px-4 rounded-full text-[12.5px] font-semibold cursor-pointer disabled:cursor-default disabled:opacity-45 ${danger ? "bg-loved/20 text-loved" : "bg-card text-ink border border-hair"}`}
    >
      {children}
    </button>
  );
}

function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center h-8 px-4 rounded-full bg-card border border-hair text-[12.5px] font-semibold text-ink no-underline hover:text-accent transition-colors">
      {children}
    </Link>
  );
}

/** What Account → Subscription says under its name: the plan and when it
    renews or ends, or, for the app's stores, where it's managed. */
function subscriptionHint(sub: Subscription | null, format: Settings["dateFormat"]): string | undefined {
  if (!sub?.pro) return undefined;
  const plan = sub.plan === "yearly" ? "Pro, yearly" : sub.plan === "monthly" ? "Pro, monthly" : "Pro";
  if (sub.source !== "stripe") return `${plan}. Managed in your ${sub.source === "google_play" ? "Google Play" : "Apple Account"} subscriptions.`;
  if (!sub.periodEnd) return plan;
  return `${plan} · ${sub.cancelAtEnd ? "ends" : "renews"} ${formatDate(sub.periodEnd.slice(0, 10), format, "long")}`;
}
