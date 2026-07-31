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

    const words = document.querySelectorAll(".title-word");
    const subtitle = document.querySelector(".hero-subtitle");
    const actions = document.querySelector(".hero-actions");

    if (!prefersReducedMotion()) {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      tl.from(hero, { opacity: 0, duration: 0.4 });

      if (words.length) {
        tl.from(words, {
          opacity: 0,
          x: -60,
          rotateY: 12,
          stagger: 0.12,
          duration: 0.9,
          // 动画结束后清除行内 transform，避免锁死 .title-white 的
          // translate(-50%, -50%) 百分比居中，导致窗口拉伸后不跟随
          clearProps: "transform,opacity",
        }, "-=0.5");
      }

      if (subtitle) {
        tl.from(subtitle, { opacity: 0, y: 24, duration: 0.8, clearProps: "all" }, "-=0.4");
      }

      if (actions) {
        tl.from(actions, { opacity: 0, y: 20, duration: 0.7, clearProps: "all" }, "-=0.3");
      }

      // 入场动画结束后，再初始化滚动聚合，避免 transform 冲突
      tl.eventCallback("onComplete", initHeroTitleScroll);
    } else {
      // 无动画偏好时直接初始化滚动聚合
      initHeroTitleScroll();
    }
  }

  // ── 滚动显现 (ScrollTrigger) ──
  function initScrollReveal() {
    const selectors = [".section-head", ".site-list-item"];
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

  // ── Hero 标题滚动聚合 ──
  // 滚动时 White 保持不动，Deep 与 X 向 White 移动并在同一水平线对齐，
  // 随后整屏固定一段距离，最后随 hero 一起滚走，露出下方内容。
  function initHeroTitleScroll() {
    const hero = document.querySelector(".hero");
    const words = document.querySelectorAll(".title-word");
    if (!hero || words.length !== 3) return;
    if (prefersReducedMotion()) return;

    const deep = words[0];
    const white = words[1];
    const x = words[2];

    let tl = null;
    let resizeTimer = null;

    function resetWords() {
      words.forEach((word) => {
        word.removeAttribute("style");
      });
    }

    function build() {
      // 清理旧时间线与 ScrollTrigger
      if (tl) {
        if (tl.scrollTrigger) tl.scrollTrigger.kill();
        tl.kill();
        tl = null;
      }

      // 重置为 CSS 默认布局，让百分比/视口单位随新窗口尺寸重新生效
      resetWords();
      void hero.offsetHeight; // 强制重排

      // 把当前视觉位置冻结成像素 left/top，并清除 CSS transform/margin，
      // 这样后续只用 transform (x/y) 做偏移动画，避免逐帧重排。
      words.forEach((word) => {
        const rect = word.getBoundingClientRect();
        gsap.set(word, {
          position: "absolute",
          top: rect.top,
          left: rect.left,
          right: "auto",
          bottom: "auto",
          margin: 0,
          transform: "none",
        });
      });

      const deepRect = deep.getBoundingClientRect();
      const whiteRect = white.getBoundingClientRect();
      const xRect = x.getBoundingClientRect();

      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const gap = parseFloat(getComputedStyle(deep).fontSize) * 0.25;

      // 用 canvas 测量每个词的基线（ascent），以 White 的基线作为基准对齐
      function getAscent(text, el) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const style = getComputedStyle(el);
        ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const metrics = ctx.measureText(text);
        return metrics.actualBoundingBoxAscent || metrics.fontBoundingBoxAscent || 0;
      }

      const whiteAscent = getAscent(white.textContent.trim(), white);
      const targetBaseline = whiteRect.top + whiteAscent;

      // 组合整体居中：以 White 为中心，Deep/X 保持垂直方向上的原始 x 位置，只对齐到同一水平线。
      const targets = {
        deep: {
          top: targetBaseline - getAscent(deep.textContent.trim(), deep),
          left: deepRect.left,
        },
        white: {
          top: targetBaseline - whiteAscent,
          left: centerX - whiteRect.width / 2,
        },
        x: {
          top: targetBaseline - getAscent(x.textContent.trim(), x),
          left: xRect.left,
        },
      };

      const deltas = {
        deep: { x: targets.deep.left - deepRect.left, y: targets.deep.top - deepRect.top },
        white: { x: 0, y: 0 },
        x: { x: targets.x.left - xRect.left, y: targets.x.top - xRect.top },
      };

      tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "+=100%",
          pin: true,
          scrub: 0.5,
          anticipatePin: 1,
        },
      });

      // 只垂直对齐：Deep 与 X 移动到 White 所在水平线，保持水平方向原位。
      tl.to(deep, { y: deltas.deep.y, duration: 0.3, ease: "none" }, 0);
      tl.to(x, { y: deltas.x.y, duration: 0.3, ease: "none" }, 0);

      // 对齐完成瞬间 White 直接变成黑底白字
      tl.to(white, {
        backgroundColor: "#000000",
        color: "#ffffff",
        duration: 0.001,
        ease: "none",
      }, 0.3);
    }

    build();

    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
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
