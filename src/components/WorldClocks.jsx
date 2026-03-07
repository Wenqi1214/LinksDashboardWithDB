import { useEffect, useMemo, useState } from "react";

const MAX_CITIES = 20;
const WEATHER_TEXT = {
  0: "Clear",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Heavy showers",
  82: "Violent showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Storm with hail",
  99: "Strong hail storm",
};

const WEATHER_EMOJI = {
  0: "☀️",
  1: "🌤️",
  2: "⛅",
  3: "☁️",
  45: "🌫️",
  48: "🌫️",
  51: "🌦️",
  53: "🌦️",
  55: "🌧️",
  56: "🌨️",
  57: "🌨️",
  61: "🌧️",
  63: "🌧️",
  65: "⛈️",
  66: "🌨️",
  67: "🌨️",
  71: "🌨️",
  73: "❄️",
  75: "❄️",
  77: "🌨️",
  80: "🌦️",
  81: "🌧️",
  82: "⛈️",
  85: "🌨️",
  86: "🌨️",
  95: "⛈️",
  96: "⛈️",
  99: "⛈️",
};

function getTzOffsetMinutes(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const token = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+0";
  const match = token.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 60 + minutes);
}

function formatOffsetLabel(offsetMinutes) {
  if (offsetMinutes === 0) return "Same as your time";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  const signWord = offsetMinutes > 0 ? "ahead" : "behind";
  if (minutes === 0) return `${hours}h ${signWord}`;
  return `${hours}h ${minutes}m ${signWord}`;
}

function countryCodeToFlag(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "";
  return String.fromCodePoint(...[...normalized].map((char) => 127397 + char.charCodeAt(0)));
}

export default function WorldClocks() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState(() => {
    try {
      const raw = localStorage.getItem("linkdash-world-cities");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  });
  const [weatherMap, setWeatherMap] = useState({});
  const [tick, setTick] = useState(() => Date.now());
  const [dragCityId, setDragCityId] = useState(null);
  const [cardWidths, setCardWidths] = useState(() => {
    try {
      const raw = localStorage.getItem("linkdash-city-card-widths");
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_e) {
      return {};
    }
  });
  const [resizeState, setResizeState] = useState(null);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("linkdash-world-cities", JSON.stringify(cities));
    } catch (_e) {
      // Ignore storage failures silently.
    }
  }, [cities]);

  useEffect(() => {
    try {
      localStorage.setItem("linkdash-city-card-widths", JSON.stringify(cardWidths));
    } catch (_e) {
      // Ignore storage failures silently.
    }
  }, [cardWidths]);

  useEffect(() => {
    if (!resizeState) return;
    function onMove(e) {
      const delta = e.clientX - resizeState.startX;
      const next = Math.min(360, Math.max(180, resizeState.startWidth + delta));
      setCardWidths((prev) => ({ ...prev, [resizeState.cityId]: next }));
    }
    function onUp() {
      setResizeState(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizeState]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=8&language=en&format=json`;
        const response = await fetch(url, { signal: controller.signal });
        const data = await response.json();
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (_e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    let disposed = false;
    const next = {};

    async function loadWeather() {
      await Promise.all(
        cities.map(async (city) => {
          try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,weather_code,relative_humidity_2m&daily=sunrise,sunset&timezone=auto`;
            const response = await fetch(url);
            const data = await response.json();
            const current = data.current || {};
            const daily = data.daily || {};
            next[city.id] = {
              temp: current.temperature_2m,
              code: current.weather_code,
              humidity: current.relative_humidity_2m,
              sunrise: Array.isArray(daily.sunrise) ? daily.sunrise[0] : null,
              sunset: Array.isArray(daily.sunset) ? daily.sunset[0] : null,
            };
          } catch (_e) {
            next[city.id] = { temp: null, code: null, humidity: null, sunrise: null, sunset: null };
          }
        })
      );
      if (!disposed) setWeatherMap(next);
    }

    if (cities.length) loadWeather();
    else setWeatherMap({});

    return () => {
      disposed = true;
    };
  }, [cities, tick]);

  const localOffset = useMemo(() => -new Date().getTimezoneOffset(), [tick]);

  function addCity(result) {
    const city = {
      id: `${result.id || result.name}-${result.latitude}-${result.longitude}-${result.timezone}`,
      name: result.name,
      country: result.country || result.country_code || "",
      countryCode: String(result.country_code || "").toUpperCase(),
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
    };
    setCities((prev) => {
      const exists = prev.some((item) => item.id === city.id);
      if (exists) return prev;
      return [...prev, city].slice(-MAX_CITIES);
    });
    setQuery("");
    setResults([]);
    setPickerOpen(false);
  }

  function removeCity(id) {
    setCities((prev) => prev.filter((item) => item.id !== id));
  }

  function reorderCities(targetId) {
    if (!dragCityId || dragCityId === targetId) return;
    setCities((prev) => {
      const from = prev.findIndex((c) => c.id === dragCityId);
      const to = prev.findIndex((c) => c.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <div className="worldClocks">
      <div className="worldClockRow">
        {cities.map((city) => {
          const now = new Date();
          const cityHour = Number(
            new Intl.DateTimeFormat("en-US", {
              timeZone: city.timezone,
              hour: "2-digit",
              hour12: false,
            }).format(now)
          );
          const cityTime = new Intl.DateTimeFormat("en-US", {
            timeZone: city.timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }).format(now);
          const cityOffset = getTzOffsetMinutes(city.timezone, now);
          const delta = cityOffset - localOffset;
          const weather = weatherMap[city.id];
          const weatherText = weather?.code == null ? "Weather unavailable" : WEATHER_TEXT[weather.code] || "Weather";
          const weatherEmoji = weather?.code == null ? "🌡️" : WEATHER_EMOJI[weather.code] || "🌤️";
          const cTemp = weather?.temp == null ? null : Math.round(weather.temp);
          const fTemp = cTemp == null ? null : Math.round((cTemp * 9) / 5 + 32);
          const tempText = cTemp == null ? "--" : `${cTemp}°C / ${fTemp}°F`;
          const humidityText =
            weather?.humidity == null ? "Humidity --" : `Humidity ${Math.round(weather.humidity)}%`;
          const sunriseText = weather?.sunrise
            ? new Intl.DateTimeFormat("en-US", {
                timeZone: city.timezone,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(new Date(weather.sunrise))
            : "--:--";
          const sunsetText = weather?.sunset
            ? new Intl.DateTimeFormat("en-US", {
                timeZone: city.timezone,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(new Date(weather.sunset))
            : "--:--";
          const dayState = cityHour >= 6 && cityHour < 18 ? "day" : "night";
          const detailsUrl = `https://www.timeanddate.com/weather/?query=${encodeURIComponent(
            `${city.name} ${city.country}`.trim()
          )}`;
          const flag = countryCodeToFlag(city.countryCode || city.country);
          const width = Number(cardWidths[city.id]) || 220;

          return (
            <article
              key={city.id}
              className={`worldClockItem ${dayState}`}
              style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
              draggable
              onDragStart={() => setDragCityId(city.id)}
              onDragEnd={() => setDragCityId(null)}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                reorderCities(city.id);
              }}
            >
              <button
                className="iconBtn"
                title="Remove city"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeCity(city.id);
                }}
              >
                ×
              </button>
              <p>
                <a
                  className="cityLink"
                  href={detailsUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open weather details"
                  draggable={false}
                  onClick={(e) => e.stopPropagation()}
                >
                  <strong>{city.name}</strong> {city.country ? `(${city.country})` : ""} {flag}
                </a>
              </p>
              <p>
                {cityTime} · {weatherEmoji} {weatherText} · {tempText}
              </p>
              <p>{humidityText}</p>
              <p className="sunLine">
                <span>Sunrise {sunriseText}</span>
                <span>Sunset {sunsetText}</span>
              </p>
              <p>{formatOffsetLabel(delta)}</p>
              <span
                className="cityResizeHandle"
                title="Resize card"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setResizeState({ cityId: city.id, startX: e.clientX, startWidth: width });
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              />
            </article>
          );
        })}

        {(cities.length < MAX_CITIES || pickerOpen) && (
          <div
            className={`cityAddSlot ${pickerOpen ? "open" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (!dragCityId) return;
              setCities((prev) => {
                const from = prev.findIndex((c) => c.id === dragCityId);
                if (from < 0) return prev;
                const next = [...prev];
                const [moved] = next.splice(from, 1);
                next.push(moved);
                return next;
              });
              setDragCityId(null);
            }}
          >
            {!pickerOpen ? (
              <button
                className="addCityBtn"
                title="Add city to view local time, weather, and offset"
                onClick={() => setPickerOpen(true)}
              >
                +
              </button>
            ) : (
              <div className="worldClockPicker card">
                <div className="worldClockPickerTop">
                  <input
                    placeholder="Type a city name..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                  <button className="iconBtn" title="Close city search" onClick={() => setPickerOpen(false)}>
                    ×
                  </button>
                </div>
                <div className="worldClockResultsList">
                  {loading && <p className="muted">Searching...</p>}
                  {!loading && query.trim() && results.length === 0 && <p className="muted">No city found.</p>}
                  {!loading &&
                    results.map((result) => (
                      <button
                        key={`${result.id || result.name}-${result.latitude}-${result.longitude}`}
                        className="worldClockResultItem"
                        onClick={() => addCity(result)}
                      >
                        {result.name}, {result.country || result.country_code} ({result.timezone})
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
