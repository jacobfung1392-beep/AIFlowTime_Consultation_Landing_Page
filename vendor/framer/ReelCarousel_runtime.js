// Runtime-friendly version of Framer's ReelCarousel_1 component.
// - Removes Framer-specific "framer" dependency (addPropertyControls, ControlType)
// - Keeps React + framer-motion so it can run on a static HTML page

import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "https://esm.sh/react@18/jsx-runtime";
import { useState, useEffect, useRef, startTransition } from "https://esm.sh/react@18";
import { motion, AnimatePresence } from "https://esm.sh/framer-motion@11?deps=react@18";

const defaultReels = [
  {
    image: { src: "https://framerusercontent.com/images/GfGkADagM4KEibNcIiRUWlfrR0.jpg", alt: "Gradient 1 - Blue" },
    date: "2024-01-15",
    title: "Mountain Adventure",
    description: "Exploring the breathtaking peaks and valleys during winter season.",
  },
  {
    image: { src: "https://framerusercontent.com/images/aNsAT3jCvt4zglbWCUoFe33Q.jpg", alt: "Gradient 2 - Purple" },
    date: "2024-01-20",
    title: "Ocean Serenity",
    description: "Capturing peaceful moments where the ocean meets the horizon.",
  },
  {
    image: { src: "https://framerusercontent.com/images/BYnxEV1zjYb9bhWh1IwBZ1ZoS60.jpg", alt: "Gradient 3 - Orange" },
    date: "2024-01-25",
    title: "Forest Journey",
    description: "Walking through ancient woodland paths filled with mystery.",
  },
];

const themePresets = {
  dark: { background: "#1a1a1a", text: "#ffffff", date: "#cccccc", overlay: "rgba(0, 0, 0, 0.6)", progress: "#ffffff" },
  light: { background: "#ffffff", text: "#000000", date: "#666666", overlay: "rgba(255, 255, 255, 0.6)", progress: "#000000" },
  brand: { background: "#0066ff", text: "#ffffff", date: "#e6f2ff", overlay: "rgba(0, 102, 255, 0.6)", progress: "#ffffff" },
  minimal: { background: "#f5f5f5", text: "#333333", date: "#888888", overlay: "rgba(245, 245, 245, 0.6)", progress: "#333333" },
  custom: { background: "#ffffff", text: "#000000", date: "#666666", overlay: "rgba(0, 0, 0, 0.4)", progress: "#000000" },
};

const animationPresets = {
  smooth: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] },
  quick: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  elegant: { duration: 1.2, ease: [0.23, 1, 0.32, 1] },
  dynamic: { duration: 0.6, ease: [0.68, -0.55, 0.265, 1.55] },
};

export default function ReelCarousel(props) {
  const {
    reels = defaultReels,
    autoPlaySpeed = 4000,
    pauseOnHover = true,
    theme = "dark",
    backgroundColor,
    textColor,
    dateColor,
    overlayColor,
    progressColor,
    showDate = true,
    showTitle = true,
    showDescription = true,
    showControls = true,
    titleFont,
    descriptionFont,
    dateFont,
    animationPreset = "smooth",
    borderRadius = 12,
    padding = 24,
    contentAlignment = "bottom",
    elementOrder = "date,title,description",
    contentSpacing = 16,
    elementSpacing = 8,
    showArrows = true,
    arrowType = "chevron",
    arrowPosition = "sides",
    arrowSize = 40,
    arrowColor = "#ffffff",
    arrowOpacity = 0.7,
    progressBarHeight = 4,
    progressBarRadius = 2,
    style,
  } = props;

  const [currentReel, setCurrentReel] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const progressRef = useRef(null);

  const currentTheme =
    theme === "custom"
      ? { background: backgroundColor, text: textColor, date: dateColor, overlay: overlayColor, progress: progressColor }
      : themePresets[theme] || themePresets.dark;

  const animation = animationPresets[animationPreset] || animationPresets.smooth;

  const startProgress = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = window.setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextReel();
          return 0;
        }
        return prev + 100 / (autoPlaySpeed / 16);
      });
    }, 16);
  };

  const stopProgress = () => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  };

  const nextReel = () => {
    startTransition(() => {
      setCurrentReel((prev) => (prev + 1) % reels.length);
      setProgress(0);
    });
  };

  const prevReel = () => {
    startTransition(() => {
      setCurrentReel((prev) => (prev - 1 + reels.length) % reels.length);
      setProgress(0);
    });
  };

  const jumpToReel = (index) => {
    startTransition(() => {
      setCurrentReel(index);
      setProgress(0);
    });
  };

  const togglePlayPause = () => {
    startTransition(() => {
      setIsPlaying(!isPlaying);
      setIsPaused(!isPaused);
    });
  };

  useEffect(() => {
    if (isPlaying && !isPaused) startProgress();
    else stopProgress();
    return () => stopProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, isPaused, autoPlaySpeed, currentReel]);

  const handleMouseEnter = () => {
    if (pauseOnHover) startTransition(() => setIsPaused(true));
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) startTransition(() => setIsPaused(false));
  };

  const getContentAlignmentStyles = () => {
    const alignmentMap = {
      bottom: { justifyContent: "flex-end", alignItems: "flex-start" },
      top: { justifyContent: "flex-start", alignItems: "flex-start" },
      center: { justifyContent: "center", alignItems: "center" },
      bottomLeft: { justifyContent: "flex-end", alignItems: "flex-start" },
      bottomRight: { justifyContent: "flex-end", alignItems: "flex-end" },
      topLeft: { justifyContent: "flex-start", alignItems: "flex-start" },
      topRight: { justifyContent: "flex-start", alignItems: "flex-end" },
    };
    return alignmentMap[contentAlignment] || alignmentMap.bottom;
  };

  const renderArrowIcon = (direction) => {
    const size = arrowSize * 0.6;
    const iconStyle = {
      width: size,
      height: size,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    };

    switch (arrowType) {
      case "chevron":
        return _jsx("svg", { style: iconStyle, viewBox: "0 0 24 24", children: _jsx("polyline", { points: direction === "left" ? "15,18 9,12 15,6" : "9,18 15,12 9,6" }) });
      case "arrow":
        return _jsxs("svg", {
          style: iconStyle,
          viewBox: "0 0 24 24",
          children: [
            _jsx("line", { x1: direction === "left" ? "19" : "5", y1: "12", x2: direction === "left" ? "5" : "19", y2: "12" }),
            _jsx("polyline", { points: direction === "left" ? "12,19 5,12 12,5" : "12,5 19,12 12,19" }),
          ],
        });
      case "triangle":
        return _jsx("svg", { style: iconStyle, viewBox: "0 0 24 24", children: _jsx("polygon", { points: direction === "left" ? "15,18 9,12 15,6" : "9,6 15,12 9,18" }) });
      case "circle":
        return _jsxs("svg", {
          style: iconStyle,
          viewBox: "0 0 24 24",
          children: [
            _jsx("circle", { cx: "12", cy: "12", r: "10" }),
            _jsx("polyline", { points: direction === "left" ? "14,8 10,12 14,16" : "10,8 14,12 10,16" }),
          ],
        });
      default:
        return null;
    }
  };

  const renderContent = () => {
    const currentReelData = reels[currentReel];
    if (!currentReelData) return null;

    const elements = elementOrder
      .split(",")
      .map((element) => {
        const trimmedElement = element.trim();
        switch (trimmedElement) {
          case "date":
            return showDate
              ? _jsx(
                  motion.div,
                  {
                    style: { ...(dateFont || {}), color: currentTheme.date, margin: 0 },
                    initial: { opacity: 0, y: 30 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: -20 },
                    transition: { ...animation, delay: 0.1 },
                    children: new Date(currentReelData.date).toLocaleDateString(),
                  },
                  "date"
                )
              : null;
          case "title":
            return showTitle
              ? _jsx(
                  motion.h2,
                  {
                    style: { ...(titleFont || {}), color: currentTheme.text, margin: 0 },
                    initial: { opacity: 0, y: 30 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: -20 },
                    transition: { ...animation, delay: 0.2 },
                    children: currentReelData.title,
                  },
                  "title"
                )
              : null;
          case "description":
            return showDescription
              ? _jsx(
                  motion.p,
                  {
                    style: { ...(descriptionFont || {}), color: currentTheme.text, opacity: 0.9, margin: 0 },
                    initial: { opacity: 0, y: 30 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: -20 },
                    transition: { ...animation, delay: 0.3 },
                    children: currentReelData.description,
                  },
                  "description"
                )
              : null;
          default:
            return null;
        }
      })
      .filter(Boolean);

    return _jsx("div", {
      style: { display: "flex", flexDirection: "column", gap: contentSpacing },
      children: _jsx("div", { style: { display: "flex", flexDirection: "column", gap: elementSpacing }, children: elements }),
    });
  };

  if (reels.length === 0) {
    return _jsx("div", {
      style: { ...(style || {}), display: "flex", alignItems: "center", justifyContent: "center", borderRadius, backgroundColor: "#f5f5f5", color: "#888888", ...(titleFont || {}) },
      children: "No reels available",
    });
  }

  return _jsxs("div", {
    style: { ...(style || {}), position: "relative", overflow: "hidden", borderRadius, background: currentTheme.background },
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    children: [
      _jsx(AnimatePresence, {
        mode: "wait",
        children: _jsxs(
          motion.div,
          {
            style: { position: "absolute", inset: 0 },
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: animation,
            children: [
              _jsx("img", {
                src: reels[currentReel]?.image?.src || "https://framerusercontent.com/images/GfGkADagM4KEibNcIiRUWlfrR0.jpg",
                alt: reels[currentReel]?.image?.alt || "Reel image",
                style: { width: "100%", height: "100%", objectFit: "cover" },
              }),
              _jsx("div", { style: { position: "absolute", inset: 0, background: `linear-gradient(to top, ${currentTheme.overlay}, transparent)` } }),
            ],
          },
          currentReel
        ),
      }),
      _jsxs("div", {
        style: { position: "absolute", top: 16, left: 16, right: 16, display: "flex", alignItems: "center", gap: 8, zIndex: 20 },
        children: [
          _jsx("div", {
            style: { flex: 1, display: "flex", gap: 4 },
            children: reels.map((_, index) =>
              _jsx(
                "div",
                {
                  style: { flex: 1, height: progressBarHeight, backgroundColor: "rgba(255, 255, 255, 0.3)", borderRadius: progressBarRadius, cursor: "pointer" },
                  onClick: () => jumpToReel(index),
                  children: _jsx("div", {
                    style: {
                      height: "100%",
                      width: index === currentReel ? `${progress}%` : index < currentReel ? "100%" : "0%",
                      backgroundColor: currentTheme.progress,
                      borderRadius: progressBarRadius,
                      transition: index === currentReel ? "none" : "width 0.3s ease",
                    },
                  }),
                },
                index
              )
            ),
          }),
          showControls &&
            _jsx("button", {
              onClick: togglePlayPause,
              style: {
                padding: 8,
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.3)",
                backdropFilter: "blur(4px)",
                border: "none",
                color: arrowColor,
                opacity: arrowOpacity,
                cursor: "pointer",
                transition: "opacity 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              },
              onMouseEnter: (e) => (e.currentTarget.style.opacity = "1"),
              onMouseLeave: (e) => (e.currentTarget.style.opacity = arrowOpacity.toString()),
              children:
                isPlaying && !isPaused
                  ? _jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor", children: [_jsx("rect", { x: "6", y: "4", width: "4", height: "16" }), _jsx("rect", { x: "14", y: "4", width: "4", height: "16" })] })
                  : _jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor", children: _jsx("polygon", { points: "5,3 19,12 5,21" }) }),
            }),
        ],
      }),
      _jsx("div", {
        style: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding, zIndex: 10, ...getContentAlignmentStyles() },
        children: _jsx(AnimatePresence, { mode: "wait", children: _jsx(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: animation, children: renderContent() }, currentReel) }),
      }),
      showControls &&
        _jsx(_Fragment, {
          children:
            showArrows &&
            arrowPosition === "sides" &&
            _jsxs(_Fragment, {
              children: [
                _jsx("button", {
                  onClick: prevReel,
                  style: { position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 20, width: arrowSize, height: arrowSize, borderRadius: "50%", backgroundColor: "rgba(0, 0, 0, 0.3)", backdropFilter: "blur(4px)", border: "none", color: arrowColor, opacity: arrowOpacity, cursor: "pointer", transition: "opacity 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center" },
                  onMouseEnter: (e) => (e.currentTarget.style.opacity = "1"),
                  onMouseLeave: (e) => (e.currentTarget.style.opacity = arrowOpacity.toString()),
                  children: renderArrowIcon("left"),
                }),
                _jsx("button", {
                  onClick: nextReel,
                  style: { position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", zIndex: 20, width: arrowSize, height: arrowSize, borderRadius: "50%", backgroundColor: "rgba(0, 0, 0, 0.3)", backdropFilter: "blur(4px)", border: "none", color: arrowColor, opacity: arrowOpacity, cursor: "pointer", transition: "opacity 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center" },
                  onMouseEnter: (e) => (e.currentTarget.style.opacity = "1"),
                  onMouseLeave: (e) => (e.currentTarget.style.opacity = arrowOpacity.toString()),
                  children: renderArrowIcon("right"),
                }),
              ],
            }),
        }),
    ],
  });
}


