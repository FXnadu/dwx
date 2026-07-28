/**
 * DeepWhiteX 交互脚本 (GSAP)
 * - 主题切换
 * - 入场动画
 * - 滚动显现
 * - 鼠标视差
 */

(function () {
  "use strict";

  const THEME_KEY = "dwx-theme";

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      // 忽略隐私模式下的存储异常
    }
  }

  // 直接切换主题
  function toggleTheme() {
    const next = getCurrentTheme() === "dark" ? "light" : "dark";
    setTheme(next);
  }

  function initThemeToggle() {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.addEventListener("click", toggleTheme);
  }

  // ── 入场动画 ──
  function initEntrance() {
    const hero = document.querySelector(".hero-content");
    if (!hero) return;
    if (prefersReducedMotion()) return;

    const words = document.querySelectorAll(".title-word");
    const subtitle = document.querySelector(".hero-subtitle");
    const actions = document.querySelector(".hero-actions");

    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    tl.from(hero, { opacity: 0, duration: 0.4 });

    if (words.length) {
      tl.from(words, {
        opacity: 0,
        y: 40,
        rotateX: 15,
        stagger: 0.12,
        duration: 0.9,
      }, "-=0.5");
    }

    if (subtitle) {
      tl.from(subtitle, { opacity: 0, y: 24, duration: 0.8 }, "-=0.4");
    }

    if (actions) {
      tl.from(actions, { opacity: 0, y: 20, duration: 0.7 }, "-=0.3");
    }
  }

  // ── 滚动显现 (ScrollTrigger) ──
  function initScrollReveal() {
    const selectors = [".section-head", ".timeline-item"];
    const elements = document.querySelectorAll(selectors.join(","));
    if (!elements.length) return;

    if (prefersReducedMotion()) {
      elements.forEach((el) => el.style.opacity = "1");
      return;
    }

    elements.forEach((el, index) => {
      gsap.fromTo(el,
        { opacity: 0, y: 36 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power2.out",
          delay: index * 0.06,
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none none",
          },
        }
      );
    });
  }

  // ── 轨道呼吸动画 (GSAP) ──
  function initOrbitAnimation() {
    const orbit = document.querySelector(".hero-orbit");
    if (!orbit) return;
    if (prefersReducedMotion()) return;

    gsap.to(orbit, {
      scale: 1.03,
      rotation: 2,
      duration: 16,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }

  // ── 全屏导航菜单 (GSAP) ──
  function initMenu() {
    const menuToggle = document.getElementById("menuToggle");
    const nav = document.getElementById("nav");
    const navBg = document.querySelector(".nav-bg");
    if (!menuToggle || !nav) return;

    let isOpen = false;
    let tl;
    let enterEndTime = 0;
    const reducedMotion = prefersReducedMotion();

    function er(val) {
      return true; // 始终启用 easeReverse，响应更跟手
    }

    function updateState(open) {
      isOpen = open;
      menuToggle.setAttribute("aria-expanded", isOpen);
      menuToggle.setAttribute("aria-label", isOpen ? "关闭菜单" : "打开菜单");
      document.body.style.overflow = isOpen ? "hidden" : "";
    }

    function buildTimeline() {
      tl && tl.revert();

      gsap.set(nav, { visibility: "hidden" });
      gsap.set(navBg, { opacity: 0 });

      tl = gsap
        .timeline({ paused: true })

        .set(nav, { visibility: "visible", pointerEvents: "auto" })

        // ── 入场 ──
        .to(navBg, {
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          easeReverse: er("power4.out"),
        }, 0)

        .fromTo(".nav-panel",
          { x: "110%", y: 0, rotation: 0 },
          {
            x: "0%", y: 0,
            duration: 0.6,
            ease: "back.out",
            easeReverse: er("power3.in"),
            stagger: 0.1,
          },
          0
        )

        .fromTo(".nav-item",
          { opacity: 0, x: -20 },
          {
            opacity: 1, x: 0,
            duration: 1.2,
            ease: "expo.out",
            easeReverse: er("power3.in"),
            stagger: 0.03,
          },
          0.1
        )

        // ── 暂停 ──
        .addPause();

      enterEndTime = tl.duration();

      // ── 出场 ──
      tl
        .to(".nav-panel", {
          y: "110vh",
          rotation: "random(-25, 25)",
          duration: 1,
          ease: "power3.in",
          stagger: { from: "end", each: 0.02 },
        })

        .to(navBg, {
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
        }, "<0.1")

        .set(nav, { visibility: "hidden", pointerEvents: "none" });
    }

    function toggleAnimated() {
      updateState(!isOpen);

      if (isOpen) {
        if (tl.time() >= enterEndTime) {
          tl.timeScale(1).restart();
        } else {
          tl.timeScale(1).play();
        }
      } else {
        if (tl.time() < enterEndTime) {
          tl.timeScale(1.5).reverse();
        } else {
          tl.timeScale(1).play();
        }
      }
    }

    function toggleInstant() {
      updateState(!isOpen);
      nav.style.visibility = isOpen ? "visible" : "hidden";
      nav.style.pointerEvents = isOpen ? "auto" : "none";
      if (navBg) navBg.style.opacity = isOpen ? "1" : "0";
    }

    const toggle = reducedMotion ? toggleInstant : toggleAnimated;

    if (!reducedMotion) {
      buildTimeline();
    } else {
      nav.style.visibility = "hidden";
      nav.style.pointerEvents = "none";
    }

    menuToggle.addEventListener("click", toggle);
    if (navBg) {
      navBg.addEventListener("click", () => {
        if (isOpen) toggle();
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) {
        toggle();
        menuToggle.focus();
      }
    });

    // 点击菜单内锚点链接后自动关闭菜单
    nav.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        if (isOpen) toggle();
      });
    });
  }

  // ── Header/Footer 滚动显现 ──
  // 首屏隐藏 header 和 footer，滑过 hero 区域后才显示
  function initHeaderFooterReveal() {
    const hero = document.querySelector(".hero");
    const header = document.querySelector(".site-header");
    const footer = document.querySelector(".site-footer");
    if (!hero) return;

    const reducedMotion = prefersReducedMotion();
    const dur = reducedMotion ? 0 : 0.45;

    // ── Header 从上方滑入 ──
    if (header) {
      gsap.set(header, { y: "-100%" });

      // 如果页面加载时已滑过 hero（如刷新时），直接设为可见
      if (hero.getBoundingClientRect().bottom <= 0) {
        gsap.set(header, { y: "0%" });
      }

      ScrollTrigger.create({
        trigger: hero,
        start: "bottom top",
        onEnter: () => {
          gsap.to(header, {
            y: "0%",
            duration: dur,
            ease: "power2.out",
            overwrite: "auto",
          });
        },
        onLeaveBack: () => {
          gsap.to(header, {
            y: "-100%",
            duration: dur * 0.8,
            ease: "power2.in",
            overwrite: "auto",
          });
        },
      });
    }

    // ── Footer 淡入 ──
    if (footer) {
      gsap.set(footer, { opacity: 0, visibility: "hidden" });

      if (hero.getBoundingClientRect().bottom <= 0) {
        gsap.set(footer, { opacity: 1, visibility: "visible" });
      }

      ScrollTrigger.create({
        trigger: hero,
        start: "bottom top",
        onEnter: () => {
          gsap.to(footer, {
            opacity: 1,
            visibility: "visible",
            duration: dur * 1.1,
            ease: "power2.out",
            overwrite: "auto",
          });
        },
        onLeaveBack: () => {
          gsap.to(footer, {
            opacity: 0,
            visibility: "hidden",
            duration: dur * 0.7,
            ease: "power2.in",
            overwrite: "auto",
          });
        },
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();

    // GSAP 动画
    initEntrance();
    initScrollReveal();
    initOrbitAnimation();
    initHeaderFooterReveal();

    initMenu(); // 全屏导航菜单
  });
})();
