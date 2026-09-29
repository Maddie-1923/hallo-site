"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useSettings, type Settings } from "@/lib/settings";
import { loadServices } from "@/lib/settings-actions";
import { readImport, type ImportSummary } from "@/lib/import-read";
import { APPEARANCE_KEY, DEFAULT_THEME, THEMES, THEME_KEY, applyTheme, type Appearance } from "@/lib/theme";
import type { Service } from "@/lib/tmdb";
import { HeadingPill } from "./TitleParts";

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

export function SettingsPage({ username, detected, regions, initialServices }: { username: string; detected: string; regions: { code: string; name: string }[]; initialServices: Service[] }) {
  const [s, set] = useSettings();
  const [about, setAbout] = useState({ location: "", quote: "" });
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [appearance, setAppearance] = useState<Appearance>("system");
  const [services, setServices] = useState(initialServices);
  const [loading, startLoading] = useTransition();
  const [read, setRead] = useState<ImportSummary[]>([]);
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

  const saveAbout = (next: typeof about) => {
    setAbout(next);
    try {
      localStorage.setItem(ABOUT_KEY, JSON.stringify(next));
    } catch {}
  };
  const chooseTheme = (id: string) => {
    try {
      localStorage.setItem(THEME_KEY, id);
    } catch {}
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
          Your choices are kept in this browser for now. When Kodigo accounts open on the web, they&apos;ll follow you to every device.
        </p>

        <Group id="profile" title="Profile">
          <Field label="Display name" hint="Shown on your profile beside your username.">
            <Text value={s.displayName} onChange={(v) => set({ displayName: v })} placeholder="Your name" />
          </Field>
          <Field label="Username" hint="Your profile's address, kodigo.pro/u/…">
            <span className="text-[12.5px] text-ink">@{username}</span>
          </Field>
          <Field label="Location">
            <Text value={about.location} onChange={(v) => saveAbout({ ...about, location: v })} placeholder="Where you are" />
          </Field>
          <Field label="Quote" hint="A line in your own words, on your profile.">
            <Text value={about.quote} onChange={(v) => saveAbout({ ...about, quote: v })} placeholder="Add a quote" />
          </Field>
          <Field label="Photo and banner" hint="Chosen from pictures of what you track.">
            <LinkButton href={`/u/${username}`}>Change on your profile</LinkButton>
          </Field>
        </Group>

        <Group id="account" title="Account">
          <Field label="Email" hint="Where your sign-in code goes.">
            <span className="text-[12.5px] text-dim">Opens with accounts</span>
          </Field>
          <Field label="Subscription">
            <LinkButton href="/pro">Kodigo Pro</LinkButton>
          </Field>
          <Field label="Sign out" hint="On this browser only.">
            <Button off>Sign out</Button>
          </Field>
        </Group>

        <Group id="privacy" title="Privacy">
          <Field label="Public profile" hint="Anyone can see your profile, reviews and lists. Turned off, only people you let follow you can.">
            {toggle("publicProfile")}
          </Field>
          <Field label="Show recent activity" hint="What you watched and reviewed lately, on your profile.">
            {toggle("showActivity")}
          </Field>
          <Field label="Show your Watchlog">{toggle("showWatchlog")}</Field>
          <Field label="Let people follow you">{toggle("allowFollows")}</Field>
          <Field label="Categories" hint="Each category's eye on your profile sets whether others see it.">
            <LinkButton href={`/u/${username}#categories`}>Open categories</LinkButton>
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
          <Field label="Bring your history" hint="From TV Time, Letterboxd, Trakt, Simkl or IMDb, or a Kodigo backup. Kodigo reads the files here in your browser and tells you what's in them.">
            <label className="inline-flex items-center h-8 px-4 rounded-full bg-card border border-hair text-[12.5px] font-semibold text-ink cursor-pointer hover:text-accent transition-colors">
              Choose files
              <input
                type="file"
                multiple
                accept=".json,.csv,.zip"
                className="sr-only"
                onChange={async (e) => {
                  const files = [...(e.target.files ?? [])];
                  e.target.value = "";
                  if (files.length) setRead(await Promise.all(files.map(readImport)));
                }}
              />
            </label>
          </Field>
          {read.length > 0 && (
            <div className="py-[10px] grid gap-2">
              {read.map((r, i) => (
                <div key={`${r.file}${i}`} className="rounded-[10px] bg-card border border-hair p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12.5px] font-semibold text-ink truncate">{r.source}</span>
                    <span className="text-[12.5px] text-dim truncate">{r.file}</span>
                  </div>
                  {r.counts.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
                      {r.counts
                        .filter(([, n]) => n > 0)
                        .map(([label, n]) => (
                          <span key={label} className="text-mid-tone">
                            <b className="font-semibold text-ink tabular-nums">{n.toLocaleString("en")}</b> {(n === 1 ? label.replace(/^(\w+?)(ies|s)\b/, (_, w, end) => (end === "ies" ? `${w}y` : w)) : label).toLowerCase()}
                          </span>
                        ))}
                    </div>
                  )}
                  {r.note && <p className="m-0 mt-1.5 text-[12.5px] text-dim">{r.note}</p>}
                </div>
              ))}
              <p className="m-0 text-[12.5px] leading-[1.6] text-dim">Nothing has been uploaded. Bringing these into your library opens with accounts; until then, the app&apos;s Import does it on your phone.</p>
            </div>
          )}
          <Field label="Download everything" hint="Your whole library as one Kodigo backup file, which any copy of Kodigo can read back.">
            <a href="/api/export" download className="inline-flex items-center h-8 px-4 rounded-full bg-card border border-hair text-[12.5px] font-semibold text-ink no-underline hover:text-accent transition-colors">
              Export
            </a>
          </Field>
        </Group>

        <Group id="delete" title="Delete account" note="Your sign-in, the copy of your library on Kodigo's server and your profile go, straight away. A backup you've saved is yours and stays where you put it.">
          <Field label="Delete your account">
            <Button off danger>
              Delete
            </Button>
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

function Text({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={80}
      className="w-[220px] max-w-full rounded-[10px] bg-card border border-hair px-2.5 py-1.5 text-[12.5px] text-ink placeholder:text-dim focus:outline-none focus:border-accent"
    />
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
