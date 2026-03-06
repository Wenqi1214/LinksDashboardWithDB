export const useLocalData =
  typeof window !== "undefined" &&
  (window.location.protocol === "chrome-extension:" ||
    window.location.protocol === "moz-extension:" ||
    localStorage.getItem("linkdash-force-local") === "1");
