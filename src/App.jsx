import React, { useState, useEffect, useMemo, useCallback } from "react";

const STORAGE_KEY = "habit-heatmap:completions";
const START_DATE_KEY = "habit-heatmap:start-date";

const DAILY_QUOTES = [
  "Small daily improvements over time lead to stunning results.",
  "You don't have to be extreme, just consistent.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Keep going! Every completed day is a brick in your foundation.",
  "Discipline is choosing between what you want now and what you want most."
];

const MONTH_QUOTES = [
  "Incredible work! You conquered an entire month. Your future self thanks you!",
  "A whole month down! You are officially building a lasting identity of success.",
  "Look at that completion record! Unstoppable momentum is yours."
];

const UNIFORM_BORDER = "#2C5248";
const UNIFORM_HEADER = "#2C5248";

const MONTH_COLORS = {
  "January": { bg: "#a3a8a6", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
  "February": { bg: "#F8F4F6", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
  "March": { bg: "#F4F6F9", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
  "April": { bg: "#F3F7F4", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
  "May": { bg: "#FAF6F0", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
  "June": { bg: "#F9F4F0", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
  "July": { bg: "#F2F6F8", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
  "August": { bg: "#FAF3F3", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
  "September": { bg: "#F7F4F9", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
  "October": { bg: "#FAF5F0", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
  "November": { bg: "#F4F6F4", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
  "December": { bg: "#F2F4F8", border: UNIFORM_BORDER, header: UNIFORM_HEADER },
};

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getTimelineStart(completedSet) {
  const today = startOfDay(new Date());
  let startDate = today;

  try {
    let rawStart = window.localStorage.getItem(START_DATE_KEY);
    if (!rawStart) {
      rawStart = toDateKey(today);
      window.localStorage.setItem(START_DATE_KEY, JSON.stringify(rawStart));
    }
    startDate = new Date(JSON.parse(rawStart) + "T00:00:00");
  } catch {}

  if (completedSet && completedSet.size > 0) {
    const sortedKeys = Array.from(completedSet).sort();
    const earliestKey = sortedKeys[0];
    const earliestDate = new Date(earliestKey + "T00:00:00");
    if (earliestDate < startDate) {
      startDate = earliestDate;
    }
  }

  return startDate;
}

function buildAllDatesThroughYearEnd(completedSet) {
  const today = startOfDay(new Date());
  const currentYear = today.getFullYear();
  const startDate = getTimelineStart(completedSet);
  
  let startMonth = startDate.getFullYear() < currentYear ? 0 : startDate.getMonth();
  
  const start = new Date(currentYear, startMonth, 1);
  const end = new Date(currentYear, 11, 31);

  const monthsMap = {};
  const cursor = new Date(start);

  while (cursor <= end) {
    const rawMonthName = cursor.toLocaleString("en-US", { month: "long" });
    const monthKeyName = `${rawMonthName} ${cursor.getFullYear()}`;
    const dayOfWeek = cursor.toLocaleString("en-US", { weekday: "short" });
    
    if (!monthsMap[monthKeyName]) {
      monthsMap[monthKeyName] = {
        monthOnly: rawMonthName,
        days: []
      };
    }

    const isFuture = cursor > today;

    monthsMap[monthKeyName].days.push({
      date: new Date(cursor),
      key: toDateKey(cursor),
      dayName: dayOfWeek,
      dayNum: cursor.getDate(),
      monthKey: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      isFuture: isFuture,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return monthsMap;
}

function computeStreaks(completedSet) {
  const today = startOfDay(new Date());

  let current = 0;
  const cursor = new Date(today);
  if (!completedSet.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (completedSet.has(toDateKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  let longest = 0;
  if (completedSet.size > 0) {
    const sortedKeys = Array.from(completedSet).sort();
    let run = 0;
    let prev = null;
    for (const key of sortedKeys) {
      if (prev) {
        const prevDate = new Date(prev + "T00:00:00");
        prevDate.setDate(prevDate.getDate() + 1);
        run = toDateKey(prevDate) === key ? run + 1 : 1;
      } else {
        run = 1;
      }
      longest = Math.max(longest, run);
      prev = key;
    }
  }

  return { current, longest: Math.max(longest, current) };
}

export default function App() {
  const todayKey = toDateKey(new Date());

  const [completed, setCompleted] = useState(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [activePopup, setActivePopup] = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(completed))
      );
    } catch {}
  }, [completed]);

  const daysByMonth = useMemo(() => buildAllDatesThroughYearEnd(completed), [completed]);
  
  const { current, longest } = useMemo(
    () => computeStreaks(completed),
    [completed]
  );

  const totalDone = completed.size;

  const checkMonthCompleted = (monthDays, updatedCompletedSet) => {
    const validDays = monthDays.filter(d => !d.isFuture);
    if (validDays.length === 0) return false;
    return validDays.every(d => updatedCompletedSet.has(d.key));
  };

  const handleSelectDay = useCallback((key, isFuture) => {
    if (isFuture) return;
    setSelectedDateKey(key);
  }, []);

  const handleConfirmSelectedDay = useCallback(() => {
    if (!selectedDateKey) return;

    setCompleted((prev) => {
      const next = new Set(prev);
      const isAlreadyDone = next.has(selectedDateKey);

      if (!isAlreadyDone) {
        next.add(selectedDateKey);

        let targetMonthDays = [];
        for (const [mKey, monthObj] of Object.entries(daysByMonth)) {
          if (monthObj.days.some(d => d.key === selectedDateKey)) {
            targetMonthDays = monthObj.days;
            break;
          }
        }

        const isMonthFinished = checkMonthCompleted(targetMonthDays, next);

        if (isMonthFinished) {
          const randomMonthQuote = MONTH_QUOTES[Math.floor(Math.random() * MONTH_QUOTES.length)];
          setActivePopup({ type: "month", text: randomMonthQuote });
        } else {
          const randomDailyQuote = DAILY_QUOTES[Math.floor(Math.random() * DAILY_QUOTES.length)];
          setActivePopup({ type: "daily", text: randomDailyQuote });
        }
      }

      return next;
    });
  }, [selectedDateKey, daysByMonth]);

  return (
    <div style={styles.page}>
      <style>{globalCss}</style>

      {activePopup && (
        <div style={styles.modalOverlay}>
          <div style={{
            ...styles.modalCard,
            borderTop: `6px solid ${activePopup.type === 'month' ? '#4A7C59' : '#33465C'}`
          }}>
            <span style={styles.modalBadge}>
              {activePopup.type === 'month' ? '🌟 Month Completed!' : '✨ Great Job!'}
            </span>
            <p style={styles.modalText}>"{activePopup.text}"</p>
            <button 
              style={styles.modalButton} 
              onClick={() => setActivePopup(null)}
            >
              Keep Going
            </button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.cardRule} />

        <header style={styles.header}>
          <div style={styles.brandRow}>
            <span style={styles.brandTag}>Habit Flow</span>
            <span style={styles.dot}>•</span>
            <span style={styles.eyebrow}>Daily Tracker</span>
          </div>
          <h1 style={styles.title}>Progress over perfection</h1>
          <p style={styles.subtitle}>Build momentum one mindful day at a time. Select a date and mark it complete.</p>
        </header>

        <div style={styles.statsContainerBox}>
          <div style={styles.statsRow}>
            <Stat value={current} label="day streak" emphasize />
            <div style={styles.statDivider} />
            <Stat value={longest} label="best streak" />
            <div style={styles.statDivider} />
            <Stat value={totalDone} label="days logged" />
          </div>
        </div>

        <div style={styles.heatmapSection}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Year Progress</h2>
            <span style={styles.sectionSubtitle}>Selected: {selectedDateKey}</span>
          </div>

          <div style={styles.timelineContainer}>
            {Object.entries(daysByMonth).map(([monthNameFull, monthObj]) => {
              const theme = MONTH_COLORS[monthObj.monthOnly] || { bg: "#FAFAFA", border: line, header: accent };
              return (
                <div 
                  key={monthNameFull} 
                  style={{
                    ...styles.monthGroup,
                    background: theme.bg,
                    borderColor: theme.border,
                  }}
                >
                  <h3 style={{ ...styles.monthHeader, color: theme.header }}>{monthNameFull}</h3>
                  <div style={styles.daysGrid}>
                    {monthObj.days.map((day) => {
                      const done = completed.has(day.key);
                      const isSelected = day.key === selectedDateKey;
                      const isToday = day.key === todayKey;
                      return (
                        <button
                          key={day.key}
                          type="button"
                          disabled={day.isFuture}
                          onClick={() => handleSelectDay(day.key, day.isFuture)}
                          title={`${day.dayName}, ${monthNameFull} ${day.dayNum}${day.isFuture ? " (Future)" : done ? " — Completed" : ""}`}
                          className="heatmap-square"
                          style={{
                            ...styles.square,
                            ...(done ? styles.squareDone : {}),
                            ...(day.isFuture ? styles.squareFuture : {}),
                            ...(isToday ? styles.squareToday : {}),
                            ...(isSelected ? styles.squareSelected : {}),
                          }}
                        >
                          <span style={{
                            ...styles.dayLabelText,
                            color: day.isFuture ? "#777" : done ? "#fff" : isSelected ? "#fff" : "#333"
                          }}>
                            {day.dayNum}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.bottomBar}>
            <div style={styles.legend}>
              <span style={styles.legendText}>Pending</span>
              <span style={{ ...styles.square, ...styles.legendSquare, width: 16, height: 16 }} />
              <span
                style={{
                  ...styles.square,
                  ...styles.legendSquare,
                  ...styles.squareDone,
                  width: 16,
                  height: 16,
                }}
              />
              <span style={styles.legendText}>Completed</span>
            </div>

            <button
              type="button"
              onClick={handleConfirmSelectedDay}
              style={{
                ...styles.todayButton,
                ...(completed.has(selectedDateKey) ? styles.todayButtonDone : {}),
              }}
            >
              {completed.has(selectedDateKey) ? `${selectedDateKey} is Done ✓` : `Mark ${selectedDateKey} Completed`}
            </button>
          </div>
        </div>

        <footer style={styles.footerNote}>
          Stay consistent. Your future self will thank you.
        </footer>
      </div>
    </div>
  );
}

function Stat({ value, label, emphasize }) {
  return (
    <div style={styles.stat}>
      <span
        style={{
          ...styles.statValue,
          ...(emphasize ? styles.statValueEmphasis : {}),
        }}
      >
        {value}
      </span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

const ink = "#2C3531";
const paper = "#F9F8F6";
const cardBg = "#FFFFFF";
const line = "#E5E3DC";
const accent = "#4A7C59";
const accentSoft = "#E8F0EC";
const muted = "#7C837D";

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; }
  .heatmap-square:not(:disabled):hover {
    transform: scale(1.15);
    border-color: ${accent};
  }
  .heatmap-square:focus-visible {
    outline: 2px solid ${accent};
    outline-offset: 2px;
  }
`;

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: paper,
    backgroundImage: `radial-gradient(${line} 1px, transparent 1px)`,
    backgroundSize: "20px 20px",
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    color: ink,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 20px",
    position: "relative",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(44, 53, 49, 0.4)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: 20,
  },
  modalCard: {
    background: cardBg,
    padding: "32px 28px",
    borderRadius: 16,
    maxWidth: 400,
    width: "100%",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 16,
  },
  modalBadge: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    background: accentSoft,
    color: accent,
    padding: "4px 10px",
    borderRadius: 20,
  },
  modalText: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.5,
    color: ink,
    fontWeight: 500,
  },
  modalButton: {
    marginTop: 8,
    background: accent,
    color: "#fff",
    border: "none",
    padding: "10px 24px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    background: cardBg,
    border: `1px solid ${line}`,
    borderRadius: 16,
    padding: "0 40px 36px",
    position: "relative",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)",
  },
  cardRule: {
    height: 6,
    background: accent,
    margin: "0 -40px 32px",
    borderRadius: "16px 16px 0 0",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: 6,
    marginBottom: 24,
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  brandTag: {
    fontSize: 12,
    fontWeight: 700,
    color: accent,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  dot: {
    color: muted,
    fontSize: 10,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 500,
    color: muted,
  },
  title: {
    margin: 0,
    fontWeight: 700,
    fontSize: 26,
    color: ink,
    marginBottom: 10,
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: muted,
    lineHeight: 1.4,
  },
  statsContainerBox: {
    background: "#F7F8F6",
    border: `1px solid ${UNIFORM_BORDER}`,
    borderRadius: 16,
    padding: "18px 24px",
    marginBottom: 24,
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
  },
  statsRow: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
  },
  statDivider: {
    width: 1,
    height: 28,
    background: UNIFORM_BORDER,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
  },
  statValueEmphasis: {
    color: accent,
  },
  statLabel: {
    fontSize: 12,
    color: muted,
    fontWeight: 500,
  },
  heatmapSection: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: ink,
    margin: 0,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: muted,
  },
  timelineContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    maxHeight: "380px",
    overflowY: "auto",
    paddingRight: 6,
  },
  monthGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "14px 18px",
    borderRadius: 12,
    border: `1px solid ${line}`,
    transition: "transform 0.2s ease",
  },
  monthHeader: {
    margin: 0,
    fontSize: 13,
    fontWeight: 700,
  },
  daysGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  square: {
    width: 32,
    height: 32,
    borderRadius: 7,
    border: `1px solid ${line}`,
    background: "#FFFFFF",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.1s ease, background-color 0.1s ease",
  },
  squareDone: {
    background: accent,
    borderColor: accent,
  },
  squareSelected: {
    background: accent,
    borderColor: accent,
    boxShadow: "0 0 0 2px #d1c9c9, 0 0 0 4px #2C5248",
  },
  squareFuture: {
    background: "#F4F5F4",
    border: `1px dashed ${line}`,
    cursor: "default",
    opacity: 0.65,
  },
  squareToday: {
    boxShadow: `0 0 0 2px ${cardBg}, 0 0 0 4px ${accent}`,
  },
  dayLabelText: {
    fontSize: 11,
    fontWeight: 600,
  },
  bottomBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    flexWrap: "wrap",
    gap: 12,
  },
  legend: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  legendText: {
    fontSize: 12,
    color: muted,
  },
  legendSquare: {
    cursor: "default",
  },
  todayButton: {
    border: `1px solid ${accent}`,
    background: accent,
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    padding: "9px 18px",
    borderRadius: 8,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  todayButtonDone: {
    background: accentSoft,
    borderColor: accentSoft,
    color: accent,
  },
  footerNote: {
    marginTop: 24,
    marginBottom: 0,
    fontSize: 12,
    textAlign: "center",
    color: muted,
    fontStyle: "italic",
  },
};