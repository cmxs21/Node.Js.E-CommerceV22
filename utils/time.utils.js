export const rangesOverlap = (ranges) => {
  // Convierte "HH:mm" a minutos
  const toMinutes = (h) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm;
  };

  const sorted = ranges
    .map((r) => ({
      start: toMinutes(r.start),
      end: toMinutes(r.end),
    }))
    .sort((a, b) => a.start - b.start);

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].end > sorted[i + 1].start) {
      return true; // Hay empalme
    }
  }

  return false;
};

// utils/time.utils.js

export const isBusinessOpen = (business) => {
  const now = new Date();
  const currentDay = now.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const fromMinutes = (m) => {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const today = business.openingHours.find((h) => h.day === currentDay);

  // -------- 1) VERIFY IF OPEN NOW --------
  if (today && today.ranges.length > 0) {
    for (const range of today.ranges) {
      const start = toMinutes(range.start);
      const end = toMinutes(range.end);

      // Regular range (ej. 09:00 → 18:00)
      if (start < end && currentMinutes >= start && currentMinutes <= end) {
        return {
          isOpen: true,
          nextOpening: null,
        };
      }

      // Range cross midnight (ej. 18:00 → 03:00)
      if (start > end) {
        if (currentMinutes >= start || currentMinutes <= end) {
          return {
            isOpen: true,
            nextOpening: null,
          };
        }
      }
    }
  }

  // -------- 2) CALCULATE NEXT OPENING FOR TODAY --------

  // 2.1 Search next today opening
  if (today && today.ranges.length > 0) {
    const upcomingToday = today.ranges
      .map((r) => ({ start: toMinutes(r.start), raw: r }))
      .filter((r) => r.start > currentMinutes) // Not open yet
      .sort((a, b) => a.start - b.start); // Order by time

    if (upcomingToday.length > 0) {
      const next = upcomingToday[0].raw.start;
      return {
        isOpen: false,
        nextOpening: {
          day: currentDay,
          time: next,
        },
      };
    }
  }

  // 2.2 Search next day opening
  for (let i = 1; i <= 7; i++) {
    const nextIndex = (daysOfWeek.indexOf(currentDay) + i) % 7;
    const nextDayName = daysOfWeek[nextIndex];

    const nextDayData = business.openingHours.find((h) => h.day === nextDayName);

    if (nextDayData && nextDayData.ranges.length > 0) {
      // Takes first range of next day
      const nextTime = nextDayData.ranges[0].start;
      return {
        isOpen: false,
        nextOpening: {
          day: nextDayName,
          time: nextTime,
        },
      };
    }
  }

  // Always closed
  return {
    isOpen: false,
    nextOpening: null,
  };
};
