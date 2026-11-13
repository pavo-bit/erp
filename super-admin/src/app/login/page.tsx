"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import gsap from "gsap";
import "./creative-login.css";

export default function LoginPage() {
  const router = useRouter();
  const { login, verify2FA } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState("");
  const [otp, setOtp] = useState("");

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const submitBtnRef = useRef<HTMLInputElement>(null);
  const gearsContainerRef = useRef<SVGGElement>(null);

  // Animation Timelines & State Ref
  const machineStateRef = useRef({
    handClosed: false,
    submitBtnOnPlace: false,
    submitBtnTextOpacity: 0,
    pullProgress: 0,
    sprayRepeatCounter: 0,
    emailValid: false,
    passwordEntered: false,
  });

  const emailTlRef = useRef<gsap.core.Timeline | null>(null);
  const gearsTlsRef = useRef<gsap.core.Timeline[]>([]);
  const pullingTlRef = useRef<gsap.core.Timeline | null>(null);

  // Update Archimedean Spiral Path
  const updateSpiralPath = useCallback(
    (
      centerX: number,
      centerY: number,
      radius: number,
      coils: number,
      points: number,
      offset: number,
      spiralPath: SVGPathElement | null,
      weightBig: SVGGElement | null
    ) => {
      if (!spiralPath || !weightBig) return;
      let path = "";
      let thetaMax = coils * 2 * Math.PI;
      const awayStep = radius / thetaMax;
      const chord = (2 * Math.PI) / points;
      thetaMax -= offset * points * chord;

      for (let theta = 0; theta <= thetaMax; theta += chord) {
        const away = awayStep * theta;
        const x = centerX + Math.cos(theta) * away;
        const y = centerY + Math.sin(theta) * away;

        if (theta === 0) {
          path += `M${x},${y}`;
        } else {
          const prevAway = awayStep * (theta - chord);
          const arcRadius = (away + prevAway) / 2;
          path += ` A${arcRadius},${arcRadius} 0 0,1 ${x},${y}`;
        }
      }

      const outerAngle = thetaMax + 0.5 * Math.PI;
      const outerLength = 50 + 25 * offset;
      const endPoint = [
        Math.cos(outerAngle) * outerLength,
        Math.sin(outerAngle) * outerLength,
      ];
      path += " l" + endPoint[0] + "," + endPoint[1];

      gsap.set(spiralPath, { attr: { d: path } });
      gsap.set(weightBig, { x: -47 + 3 * offset, y: 12 + outerLength });
    },
    []
  );

  // Initialize and run mechanical pulling timeline
  const executePullingTimeline = useCallback(
    (isFixed: boolean, btnPulled: boolean) => {
      if (!svgRef.current || !submitBtnRef.current) return;
      const svg = svgRef.current;
      const submitBtn = submitBtnRef.current;
      const checkboxPullLine = svg.querySelector<SVGLineElement>(".checkbox-pull-line");
      const checkboxPullCircle = svg.querySelector<SVGGElement>(".checkbox-pull-circle");
      const btnPullLine = svg.querySelector<SVGPathElement>(".submit-btn-connector");
      const btnHandlerCircle = svg.querySelector<SVGCircleElement>(".submit-btn-circle");

      if (pullingTlRef.current) {
        pullingTlRef.current.kill();
      }

      const animatePullingLine = () => {
        if (!btnHandlerCircle || !btnPullLine || !submitBtn) return;
        const buttonOriginPoint = [260, -76];
        const btnWidth = 270;
        const currentRotation = gsap.getProperty(submitBtn, "rotation") as number;
        const deg = (currentRotation - 4) * (Math.PI / 180);

        const btnEnd = [
          buttonOriginPoint[0] - (btnWidth - 20) * Math.cos(deg),
          buttonOriginPoint[1] - (btnWidth - 20) * Math.sin(deg),
        ];

        gsap.set(btnHandlerCircle, {
          attr: { cx: btnEnd[0], cy: btnEnd[1] },
        });

        const handle = 7;
        const r = 10;
        const progress = machineStateRef.current.pullProgress;
        const fixed = isFixed;

        let btnPullLinePath =
          "M" +
          (-r - handle) +
          "," +
          (250 - (fixed ? 0 : progress * 300));
        btnPullLinePath += "h" + 2 * handle;
        btnPullLinePath += "h" + -handle;
        btnPullLinePath += " V" + (44 - progress * 130);
        const slideAngle =
          0.3 * Math.PI * (1 - (fixed ? 1 : 0.5) * progress);
        const dx = r * Math.cos(slideAngle);
        const dy = -r * Math.sin(slideAngle);
        btnPullLinePath += "a" + r + ", " + r + " 0 0 1 " + (r + dx) + " " + dy;
        btnPullLinePath += " L" + btnEnd[0] + "," + btnEnd[1];

        gsap.set(btnPullLine, {
          attr: { d: btnPullLinePath },
          strokeWidth: 3,
        });
      };

      const tl = gsap.timeline({
        defaults: { ease: "power1.inOut", duration: 1 },
        onUpdate: animatePullingLine,
      });

      if (isFixed && btnPulled) {
        tl.to(machineStateRef.current, { pullProgress: 1 }, 0)
          .to(submitBtn, { rotation: 0 }, 0)
          .to(
            machineStateRef.current,
            {
              duration: 0.1,
              submitBtnOnPlace: true,
            },
            0.9
          )
          .to(checkboxPullLine, { attr: { y2: 44 - 130 } }, 0)
          .to(checkboxPullCircle, { y: 44 - 130 }, 0);
      } else if (!isFixed && btnPulled) {
        tl.to(machineStateRef.current, { pullProgress: 1 }, 0)
          .to(checkboxPullLine, { attr: { y2: 44 - 130 } }, 0)
          .to(checkboxPullCircle, { y: 44 - 130 }, 0);
      } else if (isFixed && !btnPulled) {
        tl.to(machineStateRef.current, { pullProgress: 0 }, 0)
          .to(submitBtn, { rotation: -90 }, 0)
          .to(
            machineStateRef.current,
            {
              duration: 0.1,
              submitBtnOnPlace: false,
            },
            0
          )
          .to(checkboxPullLine, { attr: { y2: 44 } }, 0)
          .to(checkboxPullCircle, { y: 44 }, 0);
      } else {
        tl.to(machineStateRef.current, { pullProgress: 0 }, 0)
          .to(checkboxPullLine, { attr: { y2: 44 } }, 0)
          .to(checkboxPullCircle, { y: 44 }, 0);
      }

      pullingTlRef.current = tl;
    },
    []
  );

  // Setup GSAP animations on mount
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !submitBtnRef.current) return;

    const svg = svgRef.current;
    const container = containerRef.current;
    const submitBtn = submitBtnRef.current;

    const pullSystemContainer = svg.querySelector<SVGGElement>(".pull-system");
    const sprayHandContainer = svg.querySelector<SVGGElement>(".spray-hand-container");
    const sprayer = svg.querySelector<SVGGElement>(".sprayer");
    const carContainer = svg.querySelector<SVGGElement>(".car-container");
    const scalesContainer = svg.querySelector<SVGGElement>(".scales-container");
    const grabbingHands = svg.querySelectorAll<SVGGElement>(".grabbing-hand");
    const grabbingHandOpenFingers = Array.from(
      svg.querySelectorAll<SVGPathElement>(".grabbing-hand-finger-open")
    );
    const grabbingHandClosedFingers = Array.from(
      svg.querySelectorAll<SVGElement>(".grabbing-hand-finger-closed")
    );
    const spiralContainer = svg.querySelector<SVGGElement>(".spiral-container");
    const weightBigContainer = svg.querySelector<SVGGElement>(".weight-big-container");
    const sprayLines = Array.from(svg.querySelectorAll<SVGLineElement>(".spray-line"));
    const sprayBubbles = Array.from(svg.querySelectorAll<SVGCircleElement>(".spray-bubble"));
    const timingChains = Array.from(svg.querySelectorAll<SVGRectElement>(".timing-chain"));
    const checkboxPullLine = svg.querySelector<SVGLineElement>(".checkbox-pull-line");
    const checkboxPullCircle = svg.querySelector<SVGGElement>(".checkbox-pull-circle");
    const scalesLine = svg.querySelector<SVGLineElement>(".scales-moving-line");
    const reelsConnector = svg.querySelector<SVGGElement>(".reels-connector");
    const carWeightConnector = svg.querySelector<SVGGElement>(".car-weight-connector");
    const carInclineWrapper = svg.querySelector<SVGGElement>(".car-container g");
    const car = svg.querySelector<SVGGElement>(".car");
    const spiralPath = svg.querySelector<SVGPathElement>(".spiral-path");
    const weightBig = svg.querySelector<SVGGElement>(".weight-big");
    const pushingHand = svg.querySelector<SVGGElement>(".pushing-hand");
    const sprayerHead = svg.querySelector<SVGGElement>(".sprayer-head");
    const gearConnector = svg.querySelector<SVGLineElement>(".gear-connector");
    const gearsContainer = gearsContainerRef.current;

    // Responsive scaling
    const scaleToFit = () => {
      const targetH = 820;
      const targetW = 1000;
      const scaleY = window.innerHeight / targetH;
      const scaleX = window.innerWidth / targetW;
      const scale = Math.min(1, scaleX, scaleY);
      gsap.set(container, {
        scale: Math.max(0.45, scale),
        transformOrigin: "50% 45%",
      });
    };

    scaleToFit();
    window.addEventListener("resize", scaleToFit);

    // Initial Layout Preparation
    gsap.set(pullSystemContainer, { x: 375, y: 646 });
    gsap.set(sprayHandContainer, { x: 700, y: 621 });
    gsap.set(sprayer, { x: -59.5, y: 53 });
    gsap.set(carContainer, { x: 190, y: 802 });
    gsap.set(scalesContainer, { x: 170, y: 710 });
    gsap.set(grabbingHands, { x: 297, y: 830 });
    gsap.set(grabbingHandClosedFingers, { opacity: 0 });
    gsap.set(spiralContainer, { x: 305, y: 435, svgOrigin: "14 14", scaleX: -1 });
    gsap.set(weightBigContainer, { x: 305, y: 435 });
    gsap.set(submitBtn, {
      color: "rgba(0, 0, 0, 0)",
      transformOrigin: "100% 0%",
      rotation: -90,
    });
    gsap.set([...sprayLines, ...sprayBubbles], { opacity: 0 });
    if (timingChains[0]) {
      gsap.set(timingChains[0], {
        attr: { "stroke-width": "5", "stroke-dasharray": "0 12" },
      });
    }
    if (timingChains[1]) {
      gsap.set(timingChains[1], {
        attr: { "stroke-width": "5", "stroke-dasharray": "0 12" },
      });
    }
    gsap.set(checkboxPullLine, { attr: { y1: -105, y2: 44 } });
    gsap.set(checkboxPullCircle, { y: 44 });

    // Build Gears Timelines
    const gearsTls: gsap.core.Timeline[] = [];
    if (gearsContainer) {
      gearsContainer.innerHTML = "";
      const params = {
        baseSize: 15,
        pitch: 11,
        teethCurve: 0.6,
        startPos: { x: 634, y: 389 },
        speed: 0.2,
      };
      const data = [
        { angle: 0, teethNumber: 10, hasHole: true },
        { angle: -0.5, teethNumber: 32, hasHole: true },
        { angle: 1.65, teethNumber: 12, hasHole: false },
      ];
      const handleRadius = 14;
      const gears: any[] = [];

      data.forEach((d, dIdx) => {
        const radius = (d.teethNumber * params.baseSize) / (2 * Math.PI);
        let x: number, y: number, startAngle: number;

        if (dIdx === 0) {
          startAngle = 0;
          x = params.startPos.x;
          y = params.startPos.y;
        } else {
          const parent = gears[dIdx - 1];
          const size = parent.teethNumber / d.teethNumber;
          x = parent.center.x + Math.cos(d.angle) * (parent.radius + radius);
          y = parent.center.y + Math.sin(d.angle) * (parent.radius + radius);
          startAngle = (1 + size) * d.angle - size * parent.angle;
        }

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        gearsContainer.appendChild(group);
        group.appendChild(path);

        const gear = {
          idx: dIdx,
          center: { x, y },
          radius,
          angle: startAngle,
          teethNumber: d.teethNumber,
          hasHole: d.hasHole,
          toothAngle: (2 * Math.PI) / d.teethNumber,
          toothCurveAngle: params.teethCurve / d.teethNumber,
          group,
        };

        const rOut = gear.radius + 0.25 * params.pitch;
        const rIn = rOut - 0.75 * params.pitch;
        let pathD =
          "M" +
          (gear.center.x +
            Math.cos(gear.angle - gear.toothAngle + gear.toothCurveAngle) * rOut) +
          ", " +
          (gear.center.y +
            Math.sin(gear.angle - gear.toothAngle + gear.toothCurveAngle) * rOut) +
          " ";
        for (
          let a = gear.angle;
          a < gear.angle + 2 * Math.PI - 0.5 * gear.toothAngle;
          a += gear.toothAngle
        ) {
          const pa = a - 0.5 * gear.toothAngle;
          pathD +=
            "L" +
            (gear.center.x + Math.cos(pa - gear.toothCurveAngle) * rOut) +
            ", " +
            (gear.center.y + Math.sin(pa - gear.toothCurveAngle) * rOut) +
            " ";
          pathD +=
            "L" +
            (gear.center.x + Math.cos(pa) * rIn) +
            ", " +
            (gear.center.y + Math.sin(pa) * rIn) +
            " ";
          pathD +=
            "L" +
            (gear.center.x + Math.cos(a) * rIn) +
            ", " +
            (gear.center.y + Math.sin(a) * rIn) +
            " ";
          pathD +=
            "L" +
            (gear.center.x + Math.cos(a + gear.toothCurveAngle) * rOut) +
            ", " +
            (gear.center.y + Math.sin(a + gear.toothCurveAngle) * rOut) +
            " ";
        }

        if (gear.hasHole) {
          const holeRadius = 0.5 * rIn;
          pathD +=
            "M" + (gear.center.x - holeRadius) + ", " + gear.center.y + " ";
          pathD += `A ${holeRadius} ${holeRadius} 1 1 0 ${gear.center.x + holeRadius} ${gear.center.y}`;
          pathD += `A ${holeRadius} ${holeRadius} 1 1 0 ${gear.center.x - holeRadius} ${gear.center.y}`;
        }

        if (dIdx === 0) {
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          gsap.set(circle, {
            attr: { cx: gear.center.x, cy: gear.center.y, r: 5, fill: "#000000" },
          });
          gearsContainer.appendChild(circle);
          gsap.set(path, { attr: { fill: "#000000", "fill-opacity": 0.25 } });
        } else if (dIdx === data.length - 1) {
          gsap.set(path, { attr: { fill: "#000000", "fill-opacity": 0.25 } });
          const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          gsap.set(circle, {
            attr: {
              cx: gear.center.x + handleRadius,
              cy: gear.center.y,
              r: 5,
              fill: "#000000",
            },
          });
          gear.group.appendChild(circle);
        }

        path.setAttribute("d", pathD);

        const tl = gsap
          .timeline({ repeat: -1, paused: true })
          .to(group, {
            duration: params.speed * gear.teethNumber,
            rotation: 360 * (gear.idx % 2 ? -1 : 1),
            svgOrigin: gear.center.x + " " + gear.center.y,
            ease: "none",
          });

        if (dIdx === data.length - 1) {
          tl.eventCallback("onUpdate", () => {
            const angle = tl.progress() * 2 * Math.PI;
            const deltaY = Math.sin(angle) * handleRadius;
            gsap.set(pushingHand, { y: deltaY });
            if (deltaY > 8) {
              const d = Math.max(0, deltaY - 8);
              gsap.set(sprayerHead, { y: d });

              let sprayProgress = Math.max(0, tl.progress() - 0.1);
              sprayProgress *= 1 / 0.2;
              let bubblesOpacity = sprayProgress > 1 ? 0 : sprayProgress;
              bubblesOpacity *= 1 - Math.pow(bubblesOpacity, 8);

              const textProgress = Math.pow(sprayProgress / 1.5, 6);
              if (!machineStateRef.current.submitBtnOnPlace) {
                machineStateRef.current.submitBtnTextOpacity =
                  (machineStateRef.current.sprayRepeatCounter - 1) * 0.3 +
                  0.3 * textProgress;
                machineStateRef.current.submitBtnTextOpacity = Math.pow(
                  machineStateRef.current.submitBtnTextOpacity,
                  2
                );
              }

              gsap.set(submitBtn, {
                color:
                  "rgba(0, 0, 0, " +
                  Math.min(1, Math.max(0.1, machineStateRef.current.submitBtnTextOpacity)) +
                  ")",
              });
              gsap.set(sprayLines, {
                attr: { "stroke-dashoffset": 70 * sprayProgress },
                opacity: Math.pow(bubblesOpacity, 2),
              });
              sprayBubbles.forEach((b, bIdx) => {
                gsap.set(b, {
                  x: 25 * (1 - sprayProgress) * (1 + 0.1 * bIdx),
                  scale: 0.5 + 1.4 * Math.pow(sprayProgress, 2),
                  transformOrigin: "center center",
                  opacity: bubblesOpacity,
                });
              });
            }

            gsap.set(gearConnector, {
              attr: {
                x1: gear.center.x + handleRadius * Math.cos(angle),
                y1: gear.center.y + handleRadius * Math.sin(angle),
                x2: 700 + 18,
                y2: 646 - 100 + deltaY,
              },
            });
          });

          tl.eventCallback("onRepeat", () => {
            if (!machineStateRef.current.submitBtnOnPlace) {
              machineStateRef.current.sprayRepeatCounter++;
            }
          });
        }

        tl.progress(0.6);
        gearsTls.push(tl);
        gears.push(gear);
      });
    }
    gearsTlsRef.current = gearsTls;

    // Build Email Timeline (Spiral weight -> Scale -> Car -> Hand Clamping)
    const spiralTurnsNumber = 8;
    const spiralProgress = { v: 0 };
    const hammerTimeStart = 1.85;
    const fingersDelay = 0.5;
    const fingersTimeDelta = 0.03;

    const emailTl = gsap
      .timeline({
        paused: true,
        defaults: { ease: "none", duration: 2 },
        onUpdate: () => {
          updateSpiralPath(
            14,
            14,
            45,
            17,
            200,
            spiralTurnsNumber * spiralProgress.v,
            spiralPath,
            weightBig
          );
        },
      })
      .to(spiralProgress, { v: 1 }, 0)
      .to(spiralContainer, { rotation: -spiralTurnsNumber * 360 }, 0)
      .fromTo(
        scalesLine,
        { rotation: -20, svgOrigin: "92 20" },
        { duration: 0.15, rotation: -1, svgOrigin: "92 20" },
        hammerTimeStart
      )
      .fromTo(
        timingChains[0],
        { attr: { "stroke-dashoffset": 2 } },
        { duration: 0.15, attr: { "stroke-dashoffset": 20 } },
        hammerTimeStart
      )
      .fromTo(
        timingChains[1],
        { attr: { "stroke-dashoffset": 24 } },
        { duration: 0.15, attr: { "stroke-dashoffset": 6 } },
        hammerTimeStart
      )
      .to(reelsConnector, { duration: 0.15, y: 18 }, hammerTimeStart)
      .to(carWeightConnector, { duration: 0.15, y: -18 }, hammerTimeStart)
      .to(
        carInclineWrapper,
        { duration: 0.15, rotation: 6, svgOrigin: "120 93" },
        hammerTimeStart
      )
      .fromTo(
        car,
        { x: -50 },
        { duration: 0.6, x: 95, ease: "power2.in" },
        hammerTimeStart
      );

    for (let i = 0; i < 5; i++) {
      emailTl
        .set(
          grabbingHandOpenFingers[i],
          { opacity: 0 },
          hammerTimeStart + fingersDelay + fingersTimeDelta * (i + 1)
        )
        .set(
          grabbingHandClosedFingers[i],
          { opacity: 1 },
          hammerTimeStart + fingersDelay + fingersTimeDelta * (i + 1)
        );
    }

    emailTl
      .fromTo(
        machineStateRef.current,
        { handClosed: false },
        { duration: 0.01, handClosed: true },
        ">"
      )
      .to(
        grabbingHands,
        { duration: fingersTimeDelta * 5, x: "+=20" },
        hammerTimeStart + fingersDelay
      );

    emailTl.progress(0.001);
    emailTlRef.current = emailTl;

    // Initial pulling line path setup
    executePullingTimeline(false, false);

    return () => {
      window.removeEventListener("resize", scaleToFit);
      gearsTls.forEach((tl) => tl.kill());
      emailTl.kill();
      if (pullingTlRef.current) pullingTlRef.current.kill();
    };
  }, [updateSpiralPath, executePullingTimeline]);

  // Handle Email Input Typing -> Gears & Email Machine
  const handleEmailInput = (val: string) => {
    setEmail(val);
    setError("");

    // Trigger Gears & Sprayer
    const isTyping = val.length > 3;
    if (isTyping) {
      emailInputRef.current?.classList.add("valid");
      gearsTlsRef.current.forEach((tl) => {
        if (tl.paused()) {
          tl.play();
          gsap.fromTo(tl, { timeScale: 0 }, { timeScale: 1 });
        }
      });
    } else {
      emailInputRef.current?.classList.remove("valid");
      gearsTlsRef.current.forEach((tl) => {
        if (!tl.paused()) {
          gsap.to(tl, {
            timeScale: 0,
            onComplete: () => {
              tl.pause();
            },
          });
        }
      });
      machineStateRef.current.sprayRepeatCounter = 0;
      if (submitBtnRef.current && !machineStateRef.current.submitBtnOnPlace) {
        gsap.to(submitBtnRef.current, {
          duration: 0.3,
          color: "rgba(0, 0, 0, 0)",
        });
      }
    }

    // Email Validity -> Dropping Weight, Scale, Car, Hand Clamping
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const isValid = emailRegex.test(val);
    machineStateRef.current.emailValid = isValid;

    if (isValid && emailTlRef.current) {
      emailTlRef.current.play();
      emailInputRef.current?.classList.add("valid");

      // Once hand clamps, check if password was ALREADY entered
      setTimeout(() => {
        if (
          machineStateRef.current.passwordEntered &&
          machineStateRef.current.handClosed
        ) {
          executePullingTimeline(true, true);
        }
      }, 2600);
    } else if (!isValid && emailTlRef.current) {
      emailTlRef.current.reverse();
      emailInputRef.current?.classList.remove("valid");
      machineStateRef.current.handClosed = false;
      if (machineStateRef.current.submitBtnOnPlace) {
        executePullingTimeline(false, false);
      }
    }
  };

  // Handle Password Input Typing -> Lifting Up Submit Button Via String!
  const handlePasswordInput = (val: string) => {
    setPassword(val);
    setError("");

    const isEntered = val.trim().length >= 4;
    machineStateRef.current.passwordEntered = isEntered;

    if (isEntered) {
      passwordInputRef.current?.classList.add("valid");
      // "after i put my email and pass the string must lift up the submit button"
      // If email is valid, hand is clamped -> string pulls and rotates submit button into horizontal position!
      const isFixed = machineStateRef.current.handClosed || machineStateRef.current.emailValid;
      executePullingTimeline(isFixed, true);
    } else {
      passwordInputRef.current?.classList.remove("valid");
      const isFixed = machineStateRef.current.handClosed;
      executePullingTimeline(isFixed, false);
    }
  };

  // Handle Checkbox Toggle
  const handleCheckboxChange = (checked: boolean) => {
    setRemember(checked);
    const isFixed = machineStateRef.current.handClosed;
    executePullingTimeline(isFixed, checked || machineStateRef.current.passwordEntered);
  };

  // Demo auto-fill helper
  const handleQuickFill = () => {
    handleEmailInput("superadmin@ssvm-erp.com");
    setTimeout(() => {
      handlePasswordInput("superadmin123");
    }, 1800);
  };

  // Login Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (requires2FA) {
      const res = await verify2FA(tempToken, otp);
      if (!res.success) {
        setError(res.error || "Invalid 2FA OTP code");
        setLoading(false);
      }
      return;
    }

    const res = await login(email, password);
    if (res.requires2FA) {
      setRequires2FA(true);
      setTempToken(res.tempToken || "");
      setLoading(false);
      return;
    }

    if (!res.success) {
      setError(res.error || "Invalid superadmin credentials");
      setLoading(false);
      // Shake animation on error
      if (submitBtnRef.current) {
        gsap.fromTo(
          submitBtnRef.current,
          { x: -8 },
          { x: 8, duration: 0.08, repeat: 5, yoyo: true, ease: "power1.inOut" }
        );
      }
      return;
    }

    // Success Exit Animation: Machine & Form Disintegrate into Dashboard!
    gsap.to("svg.machine-svg > *", {
      duration: 0.1,
      opacity: 0,
      stagger: { each: 0.03, from: "random", ease: "none" },
    });
    gsap.to(".form-container .form-row, .brand-header", {
      delay: 0.25,
      duration: 0.12,
      opacity: 0,
      stagger: 0.08,
      onComplete: () => {
        router.push("/dashboard");
      },
    });
  };

  return (
    <div className="creative-login-page">
      <div className="machine-container" ref={containerRef}>
        {/* Form Container */}
        <form className="form-container" onSubmit={handleSubmit}>
          <div className="brand-header">
            <div className="brand-title">
              <span>⚡</span> SSVM SUPER ADMIN
            </div>
            <div className="brand-subtitle">Platform Control Center</div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {!requires2FA ? (
            <>
              {/* Email Row */}
              <label className="form-row">
                <input
                  ref={emailInputRef}
                  autoComplete="username"
                  type="email"
                  id="email"
                  name="email"
                  placeholder="super admin email"
                  value={email}
                  onChange={(e) => handleEmailInput(e.target.value)}
                  required
                />
              </label>

              {/* Password Row */}
              <label className="form-row">
                <input
                  ref={passwordInputRef}
                  autoComplete="current-password"
                  type="password"
                  id="password"
                  name="password"
                  placeholder="password"
                  value={password}
                  onChange={(e) => handlePasswordInput(e.target.value)}
                  required
                />
              </label>

              {/* Remember Row */}
              <div className="form-row">
                <label className="checkbox-label">
                  <input
                    ref={checkboxRef}
                    type="checkbox"
                    id="remember"
                    name="remember"
                    checked={remember}
                    onChange={(e) => handleCheckboxChange(e.target.checked)}
                  />
                  <span>remember superadmin session</span>
                </label>
              </div>

              {/* Submit Button Row (Lifts up via string!) */}
              <div className="form-row">
                <input
                  ref={submitBtnRef}
                  type="submit"
                  value={loading ? "AUTHENTICATING..." : "ACCESS CONTROL PANEL"}
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <div className="py-2">
              <div className="text-[12px] font-bold text-center mb-2">
                Two-Factor Authentication
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
                className="w-full text-center text-[22px] tracking-[0.4em] font-bold py-2 border-2 border-black rounded"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-2 bg-black text-white font-bold text-[13px] rounded uppercase"
              >
                {loading ? "VERIFYING..." : "CONFIRM OTP"}
              </button>
            </div>
          )}
        </form>

        {/* The Rube Goldberg Mechanical Machine SVG */}
        <svg
          ref={svgRef}
          className="machine-svg"
          viewBox="0 0 1000 1000"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Decorative frame notch */}
          <rect x="710" y="527" width="16" height="47" rx="10" ry="10" />

          {/* Robotic Grabbing Hand (Open & Palm) */}
          <g className="grabbing-hand">
            <path d="M48.89,54.39c-3.51.76-15.72,3-22.83-.68a14,14,0,0,0-6.41-1.52h0A3.79,3.79,0,0,1,17,51.09a3.7,3.7,0,0,1-1.1-2.64V27.75A3.75,3.75,0,0,1,19.63,24H24.1" />
            <path
              className="grabbing-hand-finger-open"
              d="M57.05,29.76l24.82,0a4.07,4.07,0,0,0,4.11-4h0a4.07,4.07,0,0,0-4-4.11L48.69,21.3"
            />
            <path
              className="grabbing-hand-finger-open"
              d="M59.34,37.74l28.81.61a4.06,4.06,0,0,0,4.14-4h0a4.06,4.06,0,0,0-4-4.15L57,29.64"
            />
            <path
              className="grabbing-hand-finger-open"
              d="M57.13,45.9l26.94.78a4.07,4.07,0,0,0,4.15-4h0a4.07,4.07,0,0,0-4-4.14l-24.84-.8"
            />
            <path
              className="grabbing-hand-finger-open"
              d="M48.89,54.39l27.82.36a4.06,4.06,0,0,0,4.2-3.93h0A4.06,4.06,0,0,0,77,46.62l-19.88-.78"
            />
            <path
              className="grabbing-hand-finger-open"
              d="M40.78,28c5.75-5.85,12.66-22,10.5-25.88-2.25-4.09-6,.1-14.73,8.66C30.84,16.36,30.91,17.1,24.32,24"
            />
          </g>

          {/* String & Pulley Lifting System */}
          <g className="pull-system">
            <line className="checkbox-pull-line" x1="0" y1="0" x2="0" y2="0" />
            <g className="checkbox-pull-circle">
              <circle cx="0" cy="0" r="10" />
              <circle cx="0" cy="0" r="4" fill="#000000" />
            </g>
            <circle
              className="submit-btn-circle"
              cx="0"
              cy="0"
              r="3"
              stroke="none"
              fill="#000"
            />
            <path className="submit-btn-connector" d="" />
          </g>

          {/* Spray Hand & Aerosol Inking System */}
          <g className="spray-hand-container">
            <g className="pushing-hand">
              <circle cx="18" cy="0" r="5" fill="#000000" />
              <circle cx="18" cy="-70" r="5" fill="#000000" />
              <path d="M18,-70 v70" strokeWidth="4" />
              <g>
                <path d="M25.3,32.9V60.2a4.2,4.2,0,0,0,4.2,4.2h0a4.2,4.2,0,0,0,4.2-4.2V26.7" />
                <rect
                  x="3.9"
                  y="18.4"
                  width="8.4"
                  height="21.47"
                  rx="3.7"
                  transform="translate(10.2 -1) rotate(19.4)"
                />
                <path d="M20.9,24a3.4,3.4,0,0,0-1.7-1.1h0a4.2,4.2,0,0,0-5.4,2.5L9.1,38.8a4.3,4.3,0,0,0,2.6,5.4h0a4.3,4.3,0,0,0,5.4-2.6l1.8-5.1" />
                <path d="M18.4,37.9,17.3,43a4.2,4.2,0,0,0,3.4,4.9h0a4.3,4.3,0,0,0,4.5-2.3" />
                <path
                  fill="white"
                  d="M29,16.8c-6.4,5-15,13.2-12.8,17.8s6,.7,15.8-6.7c6.4-4.8,7.4-12.6.5-19.2V4.2A3.8,3.8,0,0,0,28.7.5H8A3.5,3.5,0,0,0,5.4,1.6,3.7,3.7,0,0,0,4.3,4.2V8.7"
                />
                <path d="M4.3,8.7c-5.8,6.4-3.6,20-2.2,24.8" />
              </g>
            </g>
            <g className="sprayer">
              <g className="sprayer-head">
                <defs>
                  <radialGradient
                    id="grad1"
                    cx="50%"
                    cy="50%"
                    r="50%"
                    fx="100%"
                    fy="50%"
                  >
                    <stop offset="0%" stopColor="#777777" stopOpacity="0" />
                    <stop offset="100%" stopColor="#777777" stopOpacity="1" />
                  </radialGradient>
                </defs>
                <rect x="82.39" y="19.85" width="13.06" height="16.79" rx="1.46" />
                <rect x="74.55" y="22.56" width="7.84" height="6.1" rx="1.13" />

                <line
                  className="spray-line"
                  stroke="#777777"
                  strokeDasharray="8 5"
                  x1="22.4"
                  y1="14.76"
                  x2="74.27"
                  y2="25.2"
                />
                <line
                  className="spray-line"
                  stroke="#777777"
                  strokeDasharray="8 5"
                  x1="21.51"
                  y1="21.12"
                  x2="74.27"
                  y2="25.2"
                />
                <line
                  className="spray-line"
                  stroke="#777777"
                  strokeDasharray="8 5"
                  x1="21.44"
                  y1="28.26"
                  x2="74.27"
                  y2="25.2"
                />
                <line
                  className="spray-line"
                  stroke="#777777"
                  strokeDasharray="8 5"
                  x1="22.37"
                  y1="35.54"
                  x2="74.27"
                  y2="25.2"
                />
                <line
                  className="spray-line"
                  stroke="#777777"
                  strokeDasharray="8 5"
                  x1="24.21"
                  y1="42.36"
                  x2="74.27"
                  y2="25.2"
                />
                <line
                  className="spray-line"
                  stroke="#777777"
                  strokeDasharray="8 5"
                  x1="24.31"
                  y1="7.78"
                  x2="74.27"
                  y2="25.2"
                />

                <circle
                  fill="url(#grad1)"
                  stroke="none"
                  className="spray-bubble"
                  cx="25.43"
                  cy="12.97"
                  r="12.47"
                />
                <circle
                  fill="url(#grad1)"
                  stroke="none"
                  className="spray-bubble"
                  cx="15.6"
                  cy="25.43"
                  r="15.1"
                />
                <circle
                  fill="url(#grad1)"
                  stroke="none"
                  className="spray-bubble"
                  cx="33.24"
                  cy="37.13"
                  r="9.21"
                />
                <circle
                  fill="url(#grad1)"
                  stroke="none"
                  className="spray-bubble"
                  cx="35.92"
                  cy="19.5"
                  r="11.89"
                />
                <circle
                  fill="url(#grad1)"
                  stroke="none"
                  className="spray-bubble"
                  cx="18.82"
                  cy="34.45"
                  r="11.89"
                />
              </g>
              <path
                d="M89,42h0a21.3,21.3,0,0,1,21.3,21.3v56.48a5.06,5.06,0,0,1-5.06,5.06H72.6a5.06,5.06,0,0,1-5.06-5.06V63.4A21.45,21.45,0,0,1,89,42Z"
                fill="#fff"
              />
              <rect x="78.3" y="36.64" width="21.24" height="6.15" rx="1.93" fill="#fff" />
              <rect x="76.33" y="71.46" width="33.96" height="23.23" fill="#cccccc" />
            </g>
          </g>

          {/* Intermeshing Gears Container */}
          <g>
            <line className="gear-connector" x1="0" x2="0" y1="0" y2="0" />
            <g className="gears" ref={gearsContainerRef}></g>
          </g>

          {/* Robotic Grabbing Hand (Closed Fingers Overlay) */}
          <g className="grabbing-hand">
            <g fill="#ffffff">
              <rect
                className="grabbing-hand-finger-closed"
                x="44.79"
                y="13.38"
                width="8.42"
                height="22.15"
                rx="3.67"
                transform="translate(20.57 71.26) rotate(-85.25)"
              />
              <rect
                className="grabbing-hand-finger-closed"
                x="44.08"
                y="39.17"
                width="8.42"
                height="21.47"
                rx="3.67"
                transform="translate(-5.44 93.9) rotate(-85.25)"
              />
              <rect
                className="grabbing-hand-finger-closed"
                x="45.68"
                y="30.71"
                width="8.42"
                height="22.57"
                rx="3.67"
                transform="matrix(0.08, -1, 1, 0.08, 3.91, 88.24)"
              />
              <rect
                className="grabbing-hand-finger-closed"
                x="44.98"
                y="22.21"
                width="8.42"
                height="22.57"
                rx="3.67"
                transform="matrix(0.08, -1, 1, 0.08, 11.74, 79.74)"
              />
              <path
                className="grabbing-hand-finger-closed"
                d="M32.18,27.42c5,6.46,13.22,15.06,17.76,12.81,4.18-2.07.69-6-6.66-15.74C38.46,18.1,30.69,17.1,24.1,24"
              />
            </g>
          </g>

          {/* Spiral Path */}
          <g className="spiral-container">
            <path strokeWidth="0.8" className="spiral-path" d="" />
          </g>

          {/* Heavy Weight */}
          <g className="weight-big-container">
            <line x1="14" x2="60" y1="14" y2="14"></line>
            <line x1="14" x2="60" y1="14" y2="55"></line>
            <circle cx="14" cy="14" r="5" fill="#000000" stroke="none" />
            <g className="weight-big" stroke="none">
              <path
                d="M25.5,16.7c.2-.6.5-1.3.7-2C31.1,3.1,23.2,0,14.3,0S-1.6,4.2,2.4,14.7a22.5,22.5,0,0,1,.8,2.4A14.4,14.4,0,0,0,0,26.2c0,8,6.5,11.6,14.5,11.6S29,34.2,29,26.2A14.6,14.6,0,0,0,25.5,16.7ZM14.4,5c5.6,0,9.3,1.9,7.1,8.5a13.5,13.5,0,0,0-7-1.8,14.6,14.6,0,0,0-7.2,1.9C5.5,7.5,8.8,5,14.4,5Z"
                fill="#231f20"
              />
              <path
                d="M15.1,15.6l-1.8-.2a9.2,9.2,0,0,0-9.1,9.2,6.2,6.2,0,0,0,.2,1.9A13.3,13.3,0,0,1,15.1,15.6Z"
                fill="#fff"
              />
            </g>
          </g>

          {/* Balance Scales & Timing Chains */}
          <g className="scales-container">
            <defs>
              <marker
                id="ball"
                viewBox="0 0 10 10"
                refX="5"
                refY="5"
                markerUnits="strokeWidth"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
              >
                <circle cx="5" cy="5" r="3" fill="#000" />
              </marker>
            </defs>

            <rect
              x="10"
              y="-19"
              width="30"
              height="90"
              rx="15"
              ry="15"
              strokeWidth="10"
              stroke="#ccc"
            />
            <rect
              className="timing-chain"
              x="10"
              y="-19"
              width="30"
              height="90"
              rx="15"
              ry="15"
              stroke="#fff"
            />

            <rect
              x="-31"
              y="-19"
              width="30"
              height="144"
              rx="15"
              ry="15"
              strokeWidth="10"
              stroke="#ccc"
            />
            <rect
              className="timing-chain"
              x="-31"
              y="-19"
              width="30"
              height="144"
              rx="15"
              ry="15"
              stroke="#fff"
            />

            <g className="reels-connector">
              <rect x="-8" y="3.2" width="25" height="10" rx="5" ry="5" />
              <circle cx="-1" cy="8.5" r="3" fill="#000" stroke="none" />
              <circle cx="9.9" cy="8.5" r="3" fill="#000" stroke="none" />
            </g>

            <g className="car-weight-connector">
              <rect x="-36" y="97" width="10" height="95" rx="5" ry="5" />
              <circle cx="-31" cy="103" r="3" fill="#000" stroke="none" />
              <circle cx="-31" cy="186" r="3" fill="#000" stroke="none" />
            </g>

            <line
              className="scales-moving-line"
              x1="147.6"
              y1="30.52"
              x2="40"
              y2="12"
              strokeWidth="2"
              markerStart="url(#ball)"
              markerEnd="url(#ball)"
            />
            <path
              fill="#000000"
              d="M102.45,30.68,92,20.26c-9.89,9.9-9.89,10.47-9.89,10.47Z"
            />
          </g>

          {/* Toy Car on Incline Track */}
          <g className="car-container">
            <g>
              <g className="car">
                <circle cx="17" cy="88" r="5" />
                <circle cx="17" cy="88" r="2" fill="#000" />
                <circle cx="32" cy="88" r="5" />
                <circle cx="32" cy="88" r="2" fill="#000" />
                <path d="M10,65 h30 l-5,15 h-20 l-5,-15 " fill="#000" />
              </g>
              <line x1="-51" y1="95" x2="145" y2="95" />
            </g>
          </g>
        </svg>
      </div>

      {/* Floating Demo Quick-Fill Pill */}
      <button
        type="button"
        onClick={handleQuickFill}
        className="quick-demo-pill"
        title="Fill credentials and watch the Rube Goldberg machine execute"
      >
        <span>⚡</span>
        <span>
          <strong>Quick Auto-Fill:</strong> superadmin@ssvm-erp.com / superadmin123
        </span>
        <span className="text-[10px] text-gray-500 underline ml-1">
          (Watch Machine)
        </span>
      </button>
    </div>
  );
}
