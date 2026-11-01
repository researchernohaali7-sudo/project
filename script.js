(() => {
  const story = document.querySelector(".story");
  const stage = document.querySelector(".stage");
  const intro = document.querySelector(".scene-copy--intro");
  const scenes = [...document.querySelectorAll(".scene-copy:not(.scene-copy--intro)")];
  const navItems = [...document.querySelectorAll(".scene-nav button")];
  const counter = document.querySelector(".scene-counter__current");
  const beginButton = document.querySelector(".begin-button");
  const replayLink = document.querySelector(".replay-link");
  const replayButtons = [...document.querySelectorAll("[data-replay]")];
  const productSection = document.querySelector(".product-section");
  const productViewButtons = [...document.querySelectorAll("[data-product-view]")];
  const referenceShot = document.querySelector(".reference-shot");
  const referenceFallback = document.querySelector(".reference-fallback");
  const productImage = document.querySelector(".product-visual__image > img");
  const productImageFallback = document.querySelector(".product-visual__fallback");
  const sceneMedia = document.querySelector(".scene-media");
  const scenePoster = document.querySelector(".scene-media__poster");
  const sceneVideo = document.querySelector(".scene-media__video");
  const sceneMediaStatus = document.querySelector(".scene-media__status");
  const mediaConfig = window.HIBISCUS_MEDIA;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let staticStory = false;
  let activeSceneIndex = -1;
  let currentMediaIndex = -1;
  let storyInView = story.getBoundingClientRect().bottom > 0
    && story.getBoundingClientRect().top < window.innerHeight;
  let shouldResumePlayback = false;
  let suspendingVideo = false;

  if (!Array.isArray(mediaConfig?.scenes) || !sceneMedia || !scenePoster || !sceneVideo) {
    console.error("تعذّر تهيئة وسائط المشاهد؛ ستُعرض الصور البديلة المتاحة.");
  }

  if (!story || !stage || !intro || scenes.length !== 6 || navItems.length !== 6) {
    throw new Error("تعذّر تهيئة مشاهد تجربة الكركديه: بنية الصفحة غير مكتملة.");
  }
  document.body.classList.remove("static-story");
  document.body.classList.add("js-active");

  function setMediaStatus(message) {
    sceneMediaStatus.textContent = message;
    sceneMediaStatus.hidden = message.length === 0;
  }

  function releaseSceneVideo() {
    suspendingVideo = true;
    sceneVideo.pause();
    if (sceneVideo.hasAttribute("src")) {
      sceneVideo.removeAttribute("src");
      sceneVideo.load();
    }
    suspendingVideo = false;
    sceneVideo.controls = false;
    sceneVideo.classList.remove("has-frame");
    sceneMedia.classList.remove("has-frame");
    sceneMedia.hidden = true;
    setMediaStatus("");
    currentMediaIndex = -1;
    shouldResumePlayback = false;
  }

  function playSceneVideo(index) {
    const video = sceneVideo;
    const attempt = video.play();
    if (attempt && typeof attempt.then === "function") {
      attempt.then(() => {
        if (currentMediaIndex === index) shouldResumePlayback = true;
      }).catch((error) => {
        if (currentMediaIndex !== index || error.name === "AbortError") return;
        shouldResumePlayback = false;
        if (
          sceneVideo.error
          || sceneVideo.networkState === HTMLMediaElement.NETWORK_NO_SOURCE
          || error.name === "NotSupportedError"
        ) {
          sceneVideo.onerror?.();
          return;
        }
        setMediaStatus("تعذّر التشغيل التلقائي. استخدم عناصر التحكم لتشغيل المقطع.");
      });
    } else {
      shouldResumePlayback = true;
    }
  }

  function updateSceneMedia(index, resume = false) {
    if (currentMediaIndex !== index) {
      if (currentMediaIndex !== -1 || sceneVideo.hasAttribute("src")) {
        releaseSceneVideo();
      } else {
        sceneMedia.hidden = true;
      }
      currentMediaIndex = index;
    }

    if (!storyInView || document.visibilityState === "hidden") return;

    const sceneId = scenes[index].id;
    const configuredScene = mediaConfig?.scenes?.find((item) => item.id === sceneId);
    const videoSrc = typeof configuredScene?.videoSrc === "string"
      ? configuredScene.videoSrc.trim()
      : "";

    if (!videoSrc) {
      sceneMedia.hidden = true;
      return;
    }

    if (sceneVideo.getAttribute("src") === videoSrc) {
      if (resume && shouldResumePlayback && sceneVideo.paused) playSceneVideo(index);
      return;
    }

    const fallbackPoster = mediaConfig?.fallbackPoster || "assets/hibiscus-product-reference.png";
    const posterSrc = typeof configuredScene.posterSrc === "string"
      && configuredScene.posterSrc.trim()
      ? configuredScene.posterSrc.trim()
      : fallbackPoster;

    sceneMedia.hidden = false;
    sceneMedia.classList.remove("has-frame");
    sceneVideo.classList.remove("has-frame");
    sceneVideo.controls = true;
    sceneVideo.defaultMuted = true;
    sceneVideo.muted = true;
    sceneVideo.preload = "none";
    sceneVideo.setAttribute(
      "aria-label",
      `مقطع مشهد ${String(index + 1).padStart(2, "0")}: ${configuredScene.title || "الكركديه"}`,
    );
    setMediaStatus("");

    scenePoster.hidden = false;
    scenePoster.dataset.fallbackAttempted = posterSrc === fallbackPoster ? "true" : "false";
    scenePoster.dataset.flowerAttempted = "false";
    scenePoster.src = posterSrc;
    scenePoster.onerror = () => {
      if (scenePoster.dataset.fallbackAttempted !== "true") {
        scenePoster.dataset.fallbackAttempted = "true";
        scenePoster.src = fallbackPoster;
      } else if (scenePoster.dataset.flowerAttempted !== "true") {
        scenePoster.dataset.flowerAttempted = "true";
        scenePoster.src = "assets/hibiscus.svg";
      } else {
        scenePoster.hidden = true;
      }
    };

    const sceneIndex = index;
    sceneVideo.onerror = () => {
      if (currentMediaIndex !== sceneIndex || sceneVideo.getAttribute("src") !== videoSrc) return;
      sceneVideo.classList.remove("has-frame");
      sceneMedia.classList.remove("has-frame");
      sceneVideo.controls = false;
      setMediaStatus("تعذّر تحميل هذا المقطع؛ تظهر الصورة البديلة بدلًا منه.");
    };
    sceneVideo.onloadeddata = () => {
      if (currentMediaIndex === sceneIndex && sceneVideo.getAttribute("src") === videoSrc) {
        sceneVideo.classList.add("has-frame");
        sceneMedia.classList.add("has-frame");
      }
    };
    sceneVideo.onplaying = () => {
      if (currentMediaIndex !== sceneIndex || sceneVideo.getAttribute("src") !== videoSrc) return;
      sceneVideo.classList.add("has-frame");
      sceneMedia.classList.add("has-frame");
      setMediaStatus("");
      shouldResumePlayback = true;
    };
    sceneVideo.onpause = () => {
      if (
        !suspendingVideo
        && currentMediaIndex === sceneIndex
        && sceneVideo.getAttribute("src") === videoSrc
      ) {
        shouldResumePlayback = false;
      }
    };
    sceneVideo.src = videoSrc;
    sceneVideo.load();

    if (!reducedMotion.matches) playSceneVideo(index);
  }

  function suspendSceneVideo() {
    if (sceneVideo.paused) return;
    const resumeAfterSuspend = shouldResumePlayback;
    suspendingVideo = true;
    sceneVideo.pause();
    suspendingVideo = false;
    shouldResumePlayback = resumeAfterSuspend;
  }

  function setScene(index) {
    if (activeSceneIndex === index) return;
    activeSceneIndex = index;
    navItems.forEach((item, itemIndex) => {
      if (itemIndex === index) {
        item.setAttribute("aria-current", "step");
        item.setAttribute("aria-pressed", "true");
      } else {
        item.removeAttribute("aria-current");
        item.setAttribute("aria-pressed", "false");
      }
    });
    counter.textContent = String(index + 1).padStart(2, "0");
    scenes.forEach((scene, sceneIndex) => {
      const isActive = sceneIndex === index;
      if (!staticStory) scene.setAttribute("aria-hidden", String(!isActive));
      if (!staticStory && (!window.gsap || reducedMotion.matches)) {
        scene.style.opacity = isActive ? "1" : "0";
        scene.style.visibility = isActive ? "visible" : "hidden";
        scene.style.transform = isActive ? "translate3d(0, 0, 0)" : "translate3d(0, 24px, 0)";
      }
    });
    updateSceneMedia(index);
  }

  function showStaticStory() {
    staticStory = true;
    document.body.classList.add("static-story");
    story.style.height = "auto";
    stage.style.position = "relative";
    const behavior = reducedMotion.matches ? "auto" : "smooth";
    scenes.forEach((scene) => scene.removeAttribute("aria-hidden"));
    navItems.forEach((item, index) => {
      item.addEventListener("click", () => {
        setScene(index);
        scenes[index].scrollIntoView({ behavior, block: "center" });
      });
    });
    beginButton.addEventListener("click", (event) => {
      event.preventDefault();
      scenes[0].scrollIntoView({ behavior, block: "start" });
    });
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        if (visibleEntry) setScene(scenes.indexOf(visibleEntry.target));
      }, { threshold: [0.3, 0.5, 0.7] });
      scenes.forEach((scene) => observer.observe(scene));
    }
  }

  productViewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.productView;
      productSection.dataset.view = view;
      productViewButtons.forEach((viewButton) => {
        viewButton.setAttribute("aria-pressed", String(viewButton === button));
      });
    });
  });

  if (referenceShot && referenceFallback) {
    const referenceImage = referenceShot.querySelector("img");
    referenceImage.addEventListener("error", () => {
      referenceShot.classList.add("reference-shot--unavailable");
      referenceFallback.hidden = false;
    }, { once: true });
  }

  if (productImage && productImageFallback) {
    productImage.addEventListener("error", () => {
      productImage.parentElement.classList.add("has-error");
      productImageFallback.hidden = false;
    }, { once: true });
  }

  if (reducedMotion.matches) {
    showStaticStory();
  } else if (!window.gsap || !window.ScrollTrigger) {
    console.error("تعذّر تحميل GSAP وScrollTrigger؛ ستبقى التجربة قابلة للتمرير دون الحركة السينمائية.");
    showStaticStory();
  } else {
    gsap.registerPlugin(ScrollTrigger);
    gsap.set(scenes, { autoAlpha: 0, y: 24 });
    gsap.set(".intro-headline-short", { autoAlpha: 0, scale: 1.18 });
    gsap.set(".floating-petal", { transformOrigin: "50% 50%" });

    const sceneStartTimes = [0.63, 1.48, 2.43, 3.28, 4.18, 5.52];
    const sceneTargetTimes = [1.05, 1.95, 2.95, 3.95, 4.95, 6.15];
    let timeline;
    timeline = gsap.timeline({
      defaults: { ease: "power1.out" },
      onUpdate: () => {
        const time = timeline.time();
        const introHidden = String(time > 0.8);
        const fullHeadlineHidden = String(time > 0.48);
        const shortHeadlineHidden = String(time < 0.48 || time > 0.8);
        const fullHeadline = intro.querySelector(".intro-headline-full");
        const shortHeadline = intro.querySelector(".intro-headline-short");
        if (intro.getAttribute("aria-hidden") !== introHidden) {
          intro.setAttribute("aria-hidden", introHidden);
        }
        if (fullHeadline.getAttribute("aria-hidden") !== fullHeadlineHidden) {
          fullHeadline.setAttribute("aria-hidden", fullHeadlineHidden);
        }
        if (shortHeadline.getAttribute("aria-hidden") !== shortHeadlineHidden) {
          shortHeadline.setAttribute("aria-hidden", shortHeadlineHidden);
        }
        let index = 0;
        for (let sceneIndex = 1; sceneIndex < sceneStartTimes.length; sceneIndex += 1) {
          if (time >= sceneStartTimes[sceneIndex]) index = sceneIndex;
        }
        if (time >= sceneStartTimes[0]) {
          setScene(index);
        } else {
          if (activeSceneIndex !== -1) releaseSceneVideo();
          activeSceneIndex = -1;
          scenes.forEach((scene) => {
            if (scene.getAttribute("aria-hidden") !== "true") {
              scene.setAttribute("aria-hidden", "true");
            }
          });
          if (counter.textContent !== "00") counter.textContent = "00";
          navItems.forEach((item, itemIndex) => {
            if (itemIndex === 0) {
              if (item.getAttribute("aria-current") !== "step") {
                item.setAttribute("aria-current", "step");
              }
              if (item.getAttribute("aria-pressed") !== "true") {
                item.setAttribute("aria-pressed", "true");
              }
            } else {
              item.removeAttribute("aria-current");
              if (item.getAttribute("aria-pressed") !== "false") {
                item.setAttribute("aria-pressed", "false");
              }
            }
          });
        }
        if (timeline.progress() < 0.025 && counter.textContent !== "00") {
          counter.textContent = "00";
        }
      },
      scrollTrigger: {
        trigger: story,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.15,
        pin: stage,
        anticipatePin: 1,
      },
    });

    timeline
      .to(".intro-headline-full", { autoAlpha: 0, y: -13, scale: 0.82, duration: 0.48 }, 0.28)
      .to(".intro-headline-short", { autoAlpha: 1, y: 0, scale: 1, duration: 0.58 }, 0.48)
      .to(".reference-shot img", { scale: 1.08, xPercent: -0.5, rotation: 0.18, filter: "brightness(0.91) saturate(1.04)", duration: 1.5 }, 0.25)
      .to(".floating-petal--one", { x: 88, y: -35, rotation: 155, duration: 1.5 }, 0.25)
      .to(".floating-petal--two", { x: 65, y: 20, rotation: 230, duration: 1.6 }, 0.3)
      .to(".floating-petal--three", { x: -70, y: 42, rotation: 280, duration: 1.7 }, 0.35)
      .to(".floating-petal--four", { x: -92, y: -40, rotation: 330, duration: 1.8 }, 0.3)
      .to(".floating-petal--five", { x: -44, y: 62, rotation: 410, duration: 1.7 }, 0.35)
      .to(".floating-drop--one", { y: -34, x: -17, scale: 0.72, duration: 1.25 }, 0.35)
      .to(".floating-drop--two", { y: -28, x: 28, scale: 1.25, duration: 1.35 }, 0.45)
      .to(".floating-drop--three", { y: 36, x: 16, scale: 0.78, duration: 1.4 }, 0.4)
      .to(".floating-drop--four", { y: -24, x: -20, scale: 1.2, duration: 1.2 }, 0.35)
      .to(".stage", { scale: 0.982, rotationZ: 0.12, filter: "brightness(0.91)", duration: 0.32 }, 0.9)
      .to(".stage", { scale: 1, rotationZ: 0, filter: "brightness(1)", duration: 0.5 }, 1.12)
      .to(".scene-copy--intro", { autoAlpha: 0, y: -16, duration: 0.42 }, 0.8)
      .to(".scene-copy--flower", { autoAlpha: 1, y: 0, duration: 0.58 }, 0.63)
      .to(".scene-copy--flower", { autoAlpha: 0, y: -16, duration: 0.42 }, 1.42)
      .to(".backdrop-glow", { scale: 1.42, x: -34, opacity: 0.86, duration: 1.1 }, 1.12)
      .to(".scene-wash", { autoAlpha: 0.54, duration: 0.48 }, 1.28)
      .to(".scene-wash", { autoAlpha: 0.08, duration: 0.7 }, 1.7)
      .to(".reference-shot img", { scale: 1.16, xPercent: -1, yPercent: -0.6, rotation: 0.35, filter: "brightness(0.86) saturate(1.1)", duration: 1.3 }, 1.26)
      .to(".floating-petal", { x: "+=22", y: "-=18", duration: 1.15, stagger: 0.05 }, 1.28)
      .to(".scene-copy--color", { autoAlpha: 1, y: 0, duration: 0.55 }, 1.48)
      .to(".scene-copy--color", { autoAlpha: 0, y: -15, duration: 0.42 }, 2.32)
      .to(".stage", { scale: 0.979, rotationZ: -0.1, filter: "brightness(0.88)", duration: 0.3 }, 2.22)
      .to(".stage", { scale: 1, rotationZ: 0, filter: "brightness(1)", duration: 0.48 }, 2.42)
      .to(".scene-wash", { autoAlpha: 0.42, duration: 0.4 }, 2.28)
      .to(".scene-wash", { autoAlpha: 0.03, duration: 0.7 }, 2.62)
      .to(".backdrop-glow", { scale: 1.76, x: 26, opacity: 0.98, duration: 1 }, 2.36)
      .to(".reference-shot img", { scale: 1.24, xPercent: -1.8, yPercent: -1.1, rotation: -0.22, filter: "brightness(0.91) saturate(1.12)", duration: 1.25 }, 2.35)
      .to(".scene-copy--arrival", { autoAlpha: 1, y: 0, duration: 0.58 }, 2.43)
      .to(".scene-copy--arrival", { autoAlpha: 0, y: -15, duration: 0.4 }, 3.31)
      .to(".scene-wash", { autoAlpha: 0.48, duration: 0.36 }, 3.2)
      .to(".scene-wash", { autoAlpha: 0, duration: 0.68 }, 3.54)
      .to(".reference-shot img", { scale: 1.43, xPercent: -2.8, yPercent: -1.7, rotation: 0.34, filter: "brightness(0.88) saturate(1.13)", duration: 1.15 }, 3.22)
      .to(".floating-drop", { x: "+=12", y: "-=12", scale: 1.4, duration: 0.78, stagger: 0.06 }, 3.2)
      .to(".scene-copy--detail", { autoAlpha: 1, y: 0, duration: 0.58 }, 3.28)
      .to(".scene-copy--detail", { autoAlpha: 0, y: -15, duration: 0.42 }, 4.25)
      .to(".stage", { scale: 0.98, rotationZ: 0.1, filter: "brightness(0.92)", duration: 0.28 }, 4.13)
      .to(".stage", { scale: 1, rotationZ: 0, filter: "brightness(1)", duration: 0.48 }, 4.32)
      .to(".scene-wash", { autoAlpha: 0.42, duration: 0.4 }, 4.16)
      .to(".scene-wash", { autoAlpha: 0.06, duration: 0.72 }, 4.52)
      .to(".reference-shot img", { scale: 1.13, xPercent: 0, yPercent: 0, rotation: -0.12, filter: "brightness(0.96) saturate(1.06)", duration: 0.95 }, 4.27)
      .to(".scene-copy--hero", { autoAlpha: 1, y: 0, duration: 0.6 }, 4.18)
      .to(".scene-copy--hero", { autoAlpha: 0, y: -13, duration: 0.44 }, 5.2)
      .to(".floating-petal--one", { left: "46%", top: "66%", rotation: 24, scale: 0.88, duration: 1.1 }, 5.02)
      .to(".floating-petal--two", { left: "49%", top: "64%", rotation: 96, scale: 0.82, duration: 1.1 }, 5.02)
      .to(".floating-petal--three", { left: "52%", top: "66%", rotation: 168, scale: 0.88, duration: 1.1 }, 5.02)
      .to(".floating-petal--four", { left: "50%", top: "70%", rotation: 240, scale: 0.82, duration: 1.1 }, 5.02)
      .to(".floating-petal--five", { left: "54%", top: "69%", rotation: 310, scale: 0.78, duration: 1.1 }, 5.02)
      .to(".floating-drop", { autoAlpha: 0.4, scale: 0.8, duration: 0.8 }, 5.12)
      .to(".reference-shot img", { scale: 1.045, rotation: 0, filter: "brightness(0.8) saturate(0.98)", duration: 1.1 }, 5.14)
      .to(".backdrop-glow", { scale: 1.25, x: 0, opacity: 0.66, duration: 0.9 }, 5.14)
      .to(".stage", { scale: 0.965, rotationZ: 0, filter: "brightness(0.94)", duration: 0.82 }, 5.48)
      .to(".scene-copy--end", { autoAlpha: 1, y: 0, duration: 0.68 }, 5.52);

    const goToProgress = (progress) => {
      const trigger = timeline.scrollTrigger;
      if (trigger) {
        const target = trigger.start + (trigger.end - trigger.start) * progress;
        window.scrollTo({ top: target, behavior: reducedMotion.matches ? "auto" : "smooth" });
      }
    };

    navItems.forEach((item, index) => {
      item.addEventListener("click", () => {
        goToProgress(sceneTargetTimes[index] / timeline.duration());
      });
    });
    beginButton.addEventListener("click", (event) => {
      event.preventDefault();
      goToProgress(sceneTargetTimes[0] / timeline.duration());
    });
  }

  function replayStory(event) {
    event.preventDefault();
    window.scrollTo({
      top: story.offsetTop,
      behavior: reducedMotion.matches ? "auto" : "smooth",
    });
  }

  if (replayLink) replayLink.addEventListener("click", replayStory);
  replayButtons.forEach((button) => button.addEventListener("click", replayStory));

  if (staticStory) {
    setScene(0);
  } else {
    scenes.forEach((scene) => scene.setAttribute("aria-hidden", "true"));
  }

  if ("IntersectionObserver" in window) {
    const storyObserver = new IntersectionObserver((entries) => {
      const storyEntry = entries[entries.length - 1];
      storyInView = storyEntry.isIntersecting;
      if (storyInView && activeSceneIndex >= 0) {
        updateSceneMedia(activeSceneIndex, true);
      } else {
        suspendSceneVideo();
      }
    }, { threshold: 0.01 });
    storyObserver.observe(story);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      suspendSceneVideo();
    } else if (activeSceneIndex >= 0) {
      updateSceneMedia(activeSceneIndex, true);
    }
  });
})();
