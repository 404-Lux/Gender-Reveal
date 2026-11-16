'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import {
  Camera,
  CameraRotate,
  DownloadSimple,
  ShareNetwork,
  Sparkle,
  ArrowsClockwise,
  Browser,
  Rows,
  Square,
  Prohibit,
  ArrowUpRight,
} from '@phosphor-icons/react';
import { PALETTE, RevealGender } from '@/lib/tokens';
import { soundManager, triggerHaptic } from '@/lib/sound';
import { TactileButton, RollingNumber } from '@/components/shared/MotionPrimitives';
import { PaperCutStickerSvg } from '@/components/shared/PaperIllustrations';
import {
  CREATOR_BRAND_NAME,
  CREATOR_PORTFOLIO_URL,
  CREATOR_PORTFOLIO_DISPLAY,
} from '@/components/shared/CreatorBrandSignature';

export type BoothMode = 'single' | 'strip4';
export type StickerKind = 'none' | 'crown' | 'bow' | 'stars' | 'seal' | 'balloon';
export type StickerCorner = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

const MAX_PRINTED_NAME_CHARS = 22;

interface FrameDefinition {
  id: string;
  name: string;
  subtitle: string;
  styleVariant: 'arched' | 'stamp' | 'heirloom';
}

const BOY_FRAMES: FrameDefinition[] = [
  {
    id: 'boy-celestial',
    name: 'Celestial Tide',
    subtitle: 'Paper clouds & north stars',
    styleVariant: 'arched',
  },
  {
    id: 'boy-voyager',
    name: 'Voyager Stamp',
    subtitle: 'Scalloped airmail keepsake',
    styleVariant: 'stamp',
  },
  {
    id: 'boy-heirloom',
    name: 'Modern Heirloom',
    subtitle: 'Editorial double hairline',
    styleVariant: 'heirloom',
  },
];

const GIRL_FRAMES: FrameDefinition[] = [
  {
    id: 'girl-botanical',
    name: 'Botanical Ribbon',
    subtitle: 'Paper camellias & silk bow',
    styleVariant: 'arched',
  },
  {
    id: 'girl-rosette',
    name: 'Rosette Stamp',
    subtitle: 'Scalloped philatelic keepsake',
    styleVariant: 'stamp',
  },
  {
    id: 'girl-heirloom',
    name: 'Modern Heirloom',
    subtitle: 'Editorial double hairline',
    styleVariant: 'heirloom',
  },
];

const STICKER_OPTIONS: Array<{
  id: StickerKind;
  label: string;
  subtitle: string;
}> = [
  { id: 'crown', label: 'Heirloom Crown', subtitle: 'Gold leaf & stitched trim' },
  { id: 'bow', label: 'Couture Ribbon', subtitle: 'Layered silk folds & pearl' },
  { id: 'stars', label: 'Celestial Cluster', subtitle: 'Crescent moon & compass' },
  { id: 'seal', label: 'Botanical Seal', subtitle: 'Deckled rosette & sprigs' },
  { id: 'balloon', label: 'Hot-Air Balloon', subtitle: 'Gored paper & wicker basket' },
  { id: 'none', label: 'No Sticker', subtitle: 'Clean minimalist frame' },
];

const CORNER_OPTIONS: Array<{ id: StickerCorner; label: string }> = [
  { id: 'top-right', label: 'Top Right' },
  { id: 'top-left', label: 'Top Left' },
  { id: 'bottom-right', label: 'Bottom Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
];

/**
 * Draws an HTMLImageElement onto a 2D canvas using `object-fit: cover` math
 * so photos are NEVER stretched or squished regardless of target slot aspect ratio.
 */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;

  const imgRatio = iw / ih;
  const destRatio = dw / dh;

  let sx = 0;
  let sy = 0;
  let sw = iw;
  let sh = ih;

  if (imgRatio > destRatio) {
    // Image is wider than slot -> crop left & right evenly
    sw = ih * destRatio;
    sx = (iw - sw) / 2;
  } else {
    // Image is taller than slot -> crop top & bottom evenly
    sh = iw / destRatio;
    sy = (ih - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Generates high-resolution standalone SVG markup matching PaperCutStickerSvg
 * so the canvas export renders the exact multi-layered artisanal paper-cut sticker.
 */
function buildArtisanalStickerSvgMarkup(
  kind: Exclude<StickerKind, 'none'>,
  gender: RevealGender
): string {
  const isBoy = gender === 'boy';
  const primary = isBoy ? PALETTE.boy.tide : PALETTE.girl.peony;
  const dark = isBoy ? PALETTE.boy.deepTide : PALETTE.girl.mulberry;
  const soft = isBoy ? PALETTE.boy.mist : PALETTE.girl.petal;
  const gold = PALETTE.neutral.butter;
  const paper = '#FBF8F2';
  const sand = PALETTE.boy.sand;

  let inner = '';
  if (kind === 'crown') {
    inner = `
      <path d="M16 74 L10 34 L34 46 L50 16 L66 46 L90 34 L84 74 C84 79 79 83 74 83 L26 83 C21 83 16 79 16 74 Z" fill="${paper}" stroke="${sand}" stroke-width="2" />
      <path d="M22 70 L18 40 L37 51 L50 24 L63 51 L82 40 L78 70 Z" fill="${gold}" stroke="${dark}" stroke-width="1.4" stroke-linejoin="round" />
      <path d="M50 24 L40 70 L60 70 Z" fill="${primary}" opacity="0.32" />
      <path d="M22 65 Q50 59 78 65 L77 72 Q50 66 23 72 Z" fill="${primary}" />
      <path d="M25 46 L36 55 M49 30 L50 60 M75 46 L64 55" stroke="${paper}" stroke-width="1.3" stroke-dasharray="2.5 2.5" stroke-linecap="round" />
      <circle cx="18" cy="38" r="3.8" fill="${primary}" stroke="${paper}" stroke-width="1.4" />
      <circle cx="50" cy="21" r="4.8" fill="${primary}" stroke="${paper}" stroke-width="1.5" />
      <circle cx="82" cy="38" r="3.8" fill="${primary}" stroke="${paper}" stroke-width="1.4" />
      <path d="M50 42 L53 47 L50 52 L47 47 Z" fill="${paper}" />
      <circle cx="34" cy="68.5" r="1.8" fill="${paper}" />
      <circle cx="50" cy="67.5" r="2.2" fill="${paper}" />
      <circle cx="66" cy="68.5" r="1.8" fill="${paper}" />
    `;
  } else if (kind === 'bow') {
    inner = `
      <path d="M12 42 C10 24 30 20 50 38 C70 20 90 24 88 42 C87 56 72 60 66 56 L78 82 L61 77 L54 88 L50 64 L46 88 L39 77 L22 82 L34 56 C28 60 13 56 12 42 Z" fill="${paper}" stroke="${sand}" stroke-width="2" stroke-linejoin="round" />
      <path d="M46 50 L27 79 L38 74 L43 83 L49 54 Z" fill="${dark}" opacity="0.9" />
      <path d="M54 50 L73 79 L62 74 L57 83 L51 54 Z" fill="${primary}" />
      <path d="M48 44 C32 25 15 28 17 43 C19 56 36 56 48 47 Z" fill="${primary}" stroke="${dark}" stroke-width="1.2" />
      <path d="M45 44 C33 32 22 34 23 43 C24 50 35 50 45 46 Z" fill="${soft}" opacity="0.65" />
      <path d="M52 44 C68 25 85 28 83 43 C81 56 64 56 52 47 Z" fill="${primary}" stroke="${dark}" stroke-width="1.2" />
      <path d="M55 44 C67 32 78 34 77 43 C76 50 65 50 55 46 Z" fill="${soft}" opacity="0.65" />
      <path d="M24 42 Q34 38 43 44 M76 42 Q66 38 57 44" stroke="${paper}" stroke-width="1.4" stroke-linecap="round" fill="none" />
      <rect x="42" y="37" width="16" height="16" rx="5" fill="${gold}" stroke="${dark}" stroke-width="1.3" />
      <circle cx="50" cy="45" r="3.5" fill="${paper}" />
    `;
  } else if (kind === 'stars') {
    inner = `
      <circle cx="50" cy="50" r="38" fill="${paper}" stroke="${sand}" stroke-width="2" />
      <circle cx="50" cy="50" r="33" fill="${soft}" opacity="0.55" stroke="${primary}" stroke-width="1" stroke-dasharray="3 3" />
      <path d="M46 22 C31 24 22 39 26 55 C30 70 46 77 61 71 C47 71 37 60 36 46 C35 33 41 25 46 22 Z" fill="${gold}" stroke="${dark}" stroke-width="1.2" />
      <path d="M58 26 L61.5 37.5 L73 41 L61.5 44.5 L58 56 L54.5 44.5 L43 41 L54.5 37.5 Z" fill="${primary}" stroke="${paper}" stroke-width="1.2" />
      <circle cx="58" cy="41" r="2.6" fill="${gold}" />
      <path d="M35 58 L37 64 L43 66 L37 68 L35 74 L33 68 L27 66 L33 64 Z" fill="${dark}" />
      <path d="M70 56 L71.5 60.5 L76 62 L71.5 63.5 L70 68 L68.5 63.5 L64 62 L68.5 60.5 Z" fill="${gold}" stroke="${dark}" stroke-width="0.9" />
      <circle cx="48" cy="27" r="1.8" fill="${primary}" />
      <circle cx="71" cy="30" r="1.5" fill="${dark}" />
      <circle cx="51" cy="70" r="1.8" fill="${primary}" />
    `;
  } else if (kind === 'seal') {
    inner = `
      <path d="M50 12 C56 12 60 16 66 15 C72 14 77 19 80 25 C83 31 88 35 88 42 C88 49 85 54 86 60 C87 66 82 73 76 76 C70 79 67 85 60 86 C53 87 49 84 42 86 C35 88 29 84 25 78 C21 72 15 69 14 62 C13 55 16 49 14 42 C12 35 16 28 22 24 C28 20 31 14 38 14 C44 14 46 12 50 12 Z" fill="${paper}" stroke="${sand}" stroke-width="2" />
      <path d="M50 17 C55 17 59 20 64 19 C69 18 73 22 76 27 C79 32 83 36 83 42 C83 48 80 52 81 58 C82 64 77 69 72 72 C67 75 64 80 58 81 C52 82 48 79 42 81 C36 83 31 79 28 74 C25 69 20 66 19 60 C18 54 21 48 19 42 C17 36 21 30 26 27 C31 24 34 19 40 19 C45 19 47 17 50 17 Z" fill="${primary}" stroke="${dark}" stroke-width="1.3" />
      <circle cx="50" cy="50" r="24" fill="none" stroke="${gold}" stroke-width="1.4" stroke-dasharray="3 2.5" />
      <circle cx="50" cy="50" r="20" fill="${dark}" opacity="0.22" />
      <path d="M38 58 C34 50 36 40 44 35 M36 51 L32 47 M37 44 L42 42 M62 58 C66 50 64 40 56 35 M64 51 L68 47 M63 44 L58 42" stroke="${paper}" stroke-width="1.5" stroke-linecap="round" fill="none" />
      <path d="M50 39 C47 35 41 36 41 41 C41 46 50 51 50 54 C50 51 59 46 59 41 C59 36 53 35 50 39 Z" fill="${gold}" />
      <text x="50" y="65" text-anchor="middle" fill="${paper}" font-size="8.5" font-family="Georgia, serif" font-weight="700" letter-spacing="1.5">${
        isBoy ? 'BOY' : 'GIRL'
      }</text>
    `;
  } else {
    inner = `
      <path d="M50 10 C70 10 82 25 82 43 C82 59 68 69 62 75 L64 87 C64 90 61 92 58 92 L42 92 C39 92 36 90 36 87 L38 75 C32 69 18 59 18 43 C18 25 30 10 50 10 Z" fill="${paper}" stroke="${sand}" stroke-width="2" />
      <path d="M50 15 C67 15 77 27 77 43 C77 56 64 65 56 71 L44 71 C36 65 23 56 23 43 C23 27 33 15 50 15 Z" fill="${primary}" stroke="${dark}" stroke-width="1.2" />
      <path d="M50 15 C60 15 66 27 66 43 C66 56 58 65 53 71 L47 71 C42 65 34 56 34 43 C34 27 40 15 50 15 Z" fill="${soft}" opacity="0.85" />
      <path d="M50 15 C54 15 57 27 57 43 C57 56 53 65 51 71 L49 71 C47 65 43 56 43 43 C43 27 46 15 50 15 Z" fill="${gold}" opacity="0.9" />
      <path d="M24 39 L31 45 L38 39 L45 45 L50 40 L55 45 L62 39 L69 45 L76 39" fill="none" stroke="${paper}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      <line x1="45" y1="71" x2="46" y2="78" stroke="${dark}" stroke-width="1.3" />
      <line x1="55" y1="71" x2="54" y2="78" stroke="${dark}" stroke-width="1.3" />
      <rect x="42" y="78" width="16" height="11" rx="2.5" fill="${gold}" stroke="${dark}" stroke-width="1.3" />
      <path d="M42 82 L58 82 M46 78 L46 89 M54 78 L54 89" stroke="${dark}" stroke-width="0.9" opacity="0.65" />
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
    <defs>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#26302B" flood-opacity="0.22" />
      </filter>
    </defs>
    <g filter="url(#s)">${inner}</g>
  </svg>`;
}

export interface PhotoboothStageProps {
  gender: RevealGender;
  guestName: string;
  babySurname?: string;
  isMockMode?: boolean;
  onChangePreviewGender?: (g: RevealGender) => void;
}

/**
 * Detects Messenger, Facebook, Viber, or Instagram in-app WebViews
 */
function detectInAppBrowser(): string | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  if (/FBAN|FBAV|Messenger/i.test(ua)) return 'Messenger / Facebook';
  if (/Viber/i.test(ua)) return 'Viber';
  if (/Instagram/i.test(ua)) return 'Instagram';
  return null;
}

export function PhotoboothStage({
  gender,
  guestName,
  babySurname = 'Basio',
  isMockMode = false,
  onChangePreviewGender,
}: PhotoboothStageProps) {
  const activeFrames = gender === 'boy' ? BOY_FRAMES : GIRL_FRAMES;

  const [selectedFrameId, setSelectedFrameId] = useState<string>(activeFrames[0].id);
  const [boothMode, setBoothMode] = useState<BoothMode>('single');
  const [selectedSticker, setSelectedSticker] = useState<StickerKind>('crown');
  const [stickerCorner, setStickerCorner] = useState<StickerCorner>('top-right');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [inAppBrowserName, setInAppBrowserName] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [capturedRawShots, setCapturedRawShots] = useState<string[]>([]);
  const [composedDataUrl, setComposedDataUrl] = useState<string | null>(null);
  const [customCaption, setCustomCaption] = useState<string>(
    (guestName || 'Guest').slice(0, MAX_PRINTED_NAME_CHARS)
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const frames = gender === 'boy' ? BOY_FRAMES : GIRL_FRAMES;
    if (!frames.some((f) => f.id === selectedFrameId)) {
      setSelectedFrameId(frames[0].id);
    }
  }, [gender, selectedFrameId]);

  useEffect(() => {
    if (guestName && customCaption === 'Guest') {
      setCustomCaption(guestName.slice(0, MAX_PRINTED_NAME_CHARS));
    }
  }, [guestName, customCaption]);

  useEffect(() => {
    setInAppBrowserName(detectInAppBrowser());
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start camera via getUserMedia without forcing a distorted aspect ratio on mobile sensors
  const startCamera = useCallback(
    async (targetFacing: 'user' | 'environment' = facingMode) => {
      setCameraError(null);
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          'Camera access is restricted in this browser. Please open this page in Chrome or Safari to use the live camera.'
        );
        return;
      }

      try {
        stopCamera();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacing,
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);
      } catch {
        setCameraError(
          'Could not open the camera (permission denied or blocked by an in-app browser). Please allow camera access or open in Chrome/Safari.'
        );
        setCameraActive(false);
      }
    },
    [facingMode, stopCamera]
  );

  const handleFlipCamera = () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    if (cameraActive) {
      startCamera(next);
    }
  };

  // Create an illustrated paper-cut portrait snapshot if camera isn't active yet
  const createIllustratedSampleShot = useCallback(
    (shotIndex: number = 0): string => {
      const c = document.createElement('canvas');
      c.width = 720;
      c.height = 900;
      const ctx = c.getContext('2d');
      if (!ctx) return '';

      const isBoy = gender === 'boy';
      const grad = ctx.createLinearGradient(0, 0, 0, c.height);
      grad.addColorStop(0, isBoy ? '#DFECF2' : '#F7E3E1');
      grad.addColorStop(1, '#F4EEE3');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, c.width, c.height);

      ctx.fillStyle = '#FBF8F2';
      ctx.beginPath();
      ctx.arc(200 + shotIndex * 35, 250, 75, 0, Math.PI * 2);
      ctx.arc(270 + shotIndex * 35, 240, 90, 0, Math.PI * 2);
      ctx.arc(340 + shotIndex * 35, 255, 70, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isBoy ? PALETTE.boy.tide : PALETTE.girl.peony;
      ctx.beginPath();
      ctx.ellipse(360, 440 - shotIndex * 12, 95, 118, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isBoy ? PALETTE.boy.deepTide : PALETTE.girl.mulberry;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(360, 558 - shotIndex * 12);
      ctx.quadraticCurveTo(340, 640, 365, 710);
      ctx.stroke();

      ctx.fillStyle = isBoy ? PALETTE.boy.deepTide : PALETTE.girl.mulberry;
      ctx.font = '600 28px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Celebrating Baby ${babySurname}`, 360, 780);

      return c.toDataURL('image/png');
    },
    [gender, babySurname]
  );

  // Grab a single frame from <video> at its EXACT native camera aspect ratio so zero stretching occurs
  const grabVideoFrame = useCallback(
    (shotIndex: number): string => {
      if (videoRef.current && cameraActive && videoRef.current.readyState >= 2) {
        const v = videoRef.current;
        const vw = v.videoWidth || 720;
        const vh = v.videoHeight || 960;

        const c = document.createElement('canvas');
        c.width = vw;
        c.height = vh;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.save();
          if (facingMode === 'user') {
            ctx.translate(c.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(v, 0, 0, vw, vh);
          ctx.restore();
          return c.toDataURL('image/png');
        }
      }
      return createIllustratedSampleShot(shotIndex);
    },
    [cameraActive, facingMode, createIllustratedSampleShot]
  );

  // Trigger 3-2-1 shutter sequence (single shot or 4-shot strip)
  const handleStartCapture = async () => {
    const totalShots = boothMode === 'single' ? 1 : 4;
    const shots: string[] = [];

    for (let s = 0; s < totalShots; s++) {
      for (let c = 3; c >= 1; c--) {
        setCountdown(c);
        soundManager.play('tick', 1 + (3 - c) * 0.08);
        triggerHaptic(18);
        await new Promise((r) => setTimeout(r, 750));
      }
      setCountdown(null);
      setFlashActive(true);
      soundManager.play('shutter');
      triggerHaptic([35, 30]);
      shots.push(grabVideoFrame(s));
      setTimeout(() => setFlashActive(false), 220);

      if (s < totalShots - 1) {
        await new Promise((r) => setTimeout(r, 550));
      }
    }

    setCapturedRawShots(shots);
  };

  // Compose final high-resolution keepsake PNG onto canvas using `drawImageCover` so photos never stretch
  useEffect(() => {
    const shots =
      capturedRawShots.length > 0
        ? capturedRawShots
        : [
            createIllustratedSampleShot(0),
            createIllustratedSampleShot(1),
            createIllustratedSampleShot(2),
            createIllustratedSampleShot(3),
          ];

    const activeFrame =
      activeFrames.find((f) => f.id === selectedFrameId) || activeFrames[0];

    const isBoy = gender === 'boy';
    const primary = isBoy ? PALETTE.boy.tide : PALETTE.girl.peony;
    const dark = isBoy ? PALETTE.boy.deepTide : PALETTE.girl.mulberry;
    const softBg = isBoy ? PALETTE.boy.mist : PALETTE.girl.petal;
    const sand = PALETTE.boy.sand;

    const canvas = document.createElement('canvas');
    if (boothMode === 'single') {
      canvas.width = 900;
      canvas.height = 1280;
    } else {
      canvas.width = 760;
      canvas.height = 2000;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let cancelled = false;

    const loadImg = (src: string): Promise<HTMLImageElement | null> =>
      new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      });

    const stickerDataUrl =
      selectedSticker !== 'none'
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
            buildArtisanalStickerSvgMarkup(selectedSticker, gender)
          )}`
        : null;

    const qrPromise = QRCode.toDataURL(CREATOR_PORTFOLIO_URL, {
      width: 160,
      margin: 1,
      color: {
        dark,
        light: '#FBF8F2',
      },
    })
      .then((qrUrl) => loadImg(qrUrl))
      .catch(() => null);

    Promise.all([
      Promise.all(
        (boothMode === 'single' ? [shots[0]] : shots.slice(0, 4)).map(loadImg)
      ),
      stickerDataUrl ? loadImg(stickerDataUrl) : Promise.resolve(null),
      qrPromise,
    ]).then(([loadedImages, stickerImg, brandQrImg]) => {
      if (cancelled) return;

      // 1. Paper Background Fill
      ctx.fillStyle = '#FBF8F2';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Inner tinted mat
      ctx.fillStyle = softBg;
      ctx.fillRect(28, 28, canvas.width - 56, canvas.height - 56);

      // 2. Frame-specific border geometry
      if (activeFrame.styleVariant === 'stamp') {
        ctx.fillStyle = '#FBF8F2';
        const step = 36;
        for (let x = 28; x <= canvas.width - 28; x += step) {
          ctx.beginPath();
          ctx.arc(x, 28, 10, 0, Math.PI * 2);
          ctx.arc(x, canvas.height - 28, 10, 0, Math.PI * 2);
          ctx.fill();
        }
        for (let y = 28; y <= canvas.height - 28; y += step) {
          ctx.beginPath();
          ctx.arc(28, y, 10, 0, Math.PI * 2);
          ctx.arc(canvas.width - 28, y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Double editorial hairline border
      ctx.strokeStyle = primary;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(42, 42, canvas.width - 84, canvas.height - 84);
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1;
      ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

      const computeStickerCoords = (
        boxX: number,
        boxY: number,
        boxW: number,
        boxH: number,
        stickerSize: number
      ) => {
        const half = stickerSize / 2;
        const pad = 26;
        if (stickerCorner === 'top-left') {
          return { x: boxX + pad - half * 0.25, y: boxY + pad - half * 0.25, rot: -0.08 };
        }
        if (stickerCorner === 'bottom-right') {
          return {
            x: boxX + boxW - stickerSize - pad + half * 0.25,
            y: boxY + boxH - stickerSize - pad + half * 0.25,
            rot: 0.06,
          };
        }
        if (stickerCorner === 'bottom-left') {
          return {
            x: boxX + pad - half * 0.25,
            y: boxY + boxH - stickerSize - pad + half * 0.25,
            rot: -0.06,
          };
        }
        return {
          x: boxX + boxW - stickerSize - pad + half * 0.25,
          y: boxY + pad - half * 0.25,
          rot: 0.08,
        };
      };

      // 3. Draw Photo(s) using `drawImageCover` so photos are NEVER stretched
      if (boothMode === 'single') {
        const img = loadedImages[0];
        const px = 82;
        const py = 128;
        const pw = canvas.width - 164;
        const ph = 810;

        ctx.save();
        ctx.beginPath();
        if (activeFrame.styleVariant === 'arched') {
          ctx.moveTo(px, py + ph);
          ctx.lineTo(px, py + 160);
          ctx.quadraticCurveTo(px, py, px + pw / 2, py);
          ctx.quadraticCurveTo(px + pw, py, px + pw, py + 160);
          ctx.lineTo(px + pw, py + ph);
          ctx.closePath();
        } else {
          ctx.roundRect(px, py, pw, ph, 16);
        }
        ctx.clip();

        if (img && img.width > 0) {
          drawImageCover(ctx, img, px, py, pw, ph);
        }
        ctx.restore();

        ctx.strokeStyle = primary;
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, pw, ph);

        if (stickerImg) {
          const sSize = 152;
          const pos = computeStickerCoords(px, py, pw, ph, sSize);
          ctx.save();
          ctx.translate(pos.x + sSize / 2, pos.y + sSize / 2);
          ctx.rotate(pos.rot);
          ctx.drawImage(stickerImg, -sSize / 2, -sSize / 2, sSize, sSize);
          ctx.restore();
        }
      } else {
        // 4-Shot Vertical Photo Strip (Balanced 4:3 photobooth slots with object-fit: cover)
        const px = 86;
        const pw = canvas.width - 172;
        const ph = 355;
        const gap = 22;
        const startY = 125;

        loadedImages.forEach((img, idx) => {
          const py = startY + idx * (ph + gap);
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(px, py, pw, ph, 12);
          ctx.clip();
          if (img && img.width > 0) {
            drawImageCover(ctx, img, px, py, pw, ph);
          }
          ctx.restore();

          ctx.strokeStyle = primary;
          ctx.lineWidth = 2;
          ctx.strokeRect(px, py, pw, ph);
        });

        if (stickerImg) {
          const totalH = 4 * ph + 3 * gap;
          const sSize = 128;
          const pos = computeStickerCoords(px, startY, pw, totalH, sSize);
          ctx.save();
          ctx.translate(pos.x + sSize / 2, pos.y + sSize / 2);
          ctx.rotate(pos.rot);
          ctx.drawImage(stickerImg, -sSize / 2, -sSize / 2, sSize, sSize);
          ctx.restore();
        }
      }

      // 4. Top Editorial Header (Removed "Philippine Standard Time")
      ctx.fillStyle = dark;
      ctx.font = '600 17px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `CELEBRATING BABY ${babySurname.toUpperCase()} · JAZZMINE & RUHMSHYNNE`,
        canvas.width / 2,
        92,
        canvas.width - 140
      );

      // 5. Theme-Specific Paper-Cut Corner Ornaments
      const footerY = boothMode === 'single' ? 1025 : 1735;

      if (isBoy) {
        ctx.fillStyle = '#FBF8F2';
        ctx.beginPath();
        ctx.arc(140, footerY - 30, 34, 0, Math.PI * 2);
        ctx.arc(178, footerY - 36, 42, 0, Math.PI * 2);
        ctx.arc(216, footerY - 28, 30, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(canvas.width - 140, footerY - 30, 34, 0, Math.PI * 2);
        ctx.arc(canvas.width - 178, footerY - 36, 42, 0, Math.PI * 2);
        ctx.arc(canvas.width - 216, footerY - 28, 30, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.arc(155, footerY - 34, 24, 0, Math.PI * 2);
        ctx.arc(canvas.width - 155, footerY - 34, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = sand;
        ctx.beginPath();
        ctx.arc(155, footerY - 34, 9, 0, Math.PI * 2);
        ctx.arc(canvas.width - 155, footerY - 34, 9, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Main Footer Typography ("It's a Boy" / "It's a Girl" + Bounded Guest Name)
      ctx.fillStyle = dark;
      ctx.font = '700 58px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        isBoy ? "It's a Boy" : "It's a Girl",
        canvas.width / 2,
        footerY
      );

      const safeCaption = (customCaption || 'Family & Friends')
        .trim()
        .slice(0, MAX_PRINTED_NAME_CHARS);

      ctx.fillStyle = primary;
      ctx.font = 'italic 29px Georgia, serif';
      ctx.fillText(
        `Captured with love by ${safeCaption}`,
        canvas.width / 2,
        footerY + 48,
        canvas.width - 150
      );

      // 7. Embedded Creator Name ("Harra Ramos"), Small QR Code & Link Inside the Keepsake Frame
      // (Baked directly into the PNG so it remains on the frame when downloaded or shared)
      const stampW = 400;
      const stampH = 80;
      const stampX = (canvas.width - stampW) / 2;
      const stampY = footerY + 80;

      ctx.save();
      ctx.fillStyle = 'rgba(251, 248, 242, 0.88)';
      ctx.strokeStyle = primary;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(stampX, stampY, stampW, stampH, 14);
      ctx.fill();
      ctx.stroke();

      // Left Text: "Harra Ramos" & Portfolio Link (No Logo)
      const textStartX = stampX + 22;
      ctx.textAlign = 'left';
      ctx.fillStyle = dark;
      ctx.font = '600 11px sans-serif';
      ctx.fillText('DESIGNED & BUILT BY', textStartX, stampY + 25);

      ctx.fillStyle = dark;
      ctx.font = '700 18px Georgia, serif';
      ctx.fillText(CREATOR_BRAND_NAME, textStartX, stampY + 47);

      ctx.fillStyle = primary;
      ctx.font = '500 13px sans-serif';
      ctx.fillText(CREATOR_PORTFOLIO_DISPLAY, textStartX, stampY + 65);

      // Right: Small Fitted QR Code (60x60)
      const qrSize = 60;
      const qrX = stampX + stampW - qrSize - 14;
      const qrY = stampY + (stampH - qrSize) / 2;
      ctx.save();
      ctx.fillStyle = '#FBF8F2';
      ctx.strokeStyle = primary;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(qrX, qrY, qrSize, qrSize, 8);
      ctx.fill();
      ctx.stroke();
      if (brandQrImg && brandQrImg.width > 0) {
        ctx.drawImage(brandQrImg, qrX + 3, qrY + 3, qrSize - 6, qrSize - 6);
      }
      ctx.restore();
      ctx.restore();

      setComposedDataUrl(canvas.toDataURL('image/png'));
    });

    return () => {
      cancelled = true;
    };
  }, [
    capturedRawShots,
    selectedFrameId,
    boothMode,
    selectedSticker,
    stickerCorner,
    customCaption,
    gender,
    babySurname,
    activeFrames,
    createIllustratedSampleShot,
  ]);

  const hasCapturedPhotos =
    capturedRawShots.length >= (boothMode === 'single' ? 1 : 4) &&
    countdown === null;

  const handleDownloadPng = () => {
    if (!composedDataUrl || !hasCapturedPhotos) return;
    triggerHaptic(20);
    const link = document.createElement('a');
    link.href = composedDataUrl;
    link.download = `baby-${babySurname.toLowerCase()}-${gender}-photobooth.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWebShare = async () => {
    if (!composedDataUrl || !hasCapturedPhotos) return;
    triggerHaptic(20);
    try {
      const res = await fetch(composedDataUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `baby-${babySurname.toLowerCase()}-reveal.png`,
        { type: 'image/png' }
      );
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Baby ${babySurname} Gender Reveal`,
          text: `Celebrating Baby ${babySurname} — ${
            gender === 'boy' ? "It's a Boy!" : "It's a Girl!"
          }`,
          files: [file],
        });
        return;
      }
    } catch {
      // Fallback to download
    }
    handleDownloadPng();
  };

  return (
    <section
      aria-label="Themed Keepsake Photobooth"
      className="mx-auto w-full max-w-5xl space-y-8 py-4"
    >
      {/* Editorial Section Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent-primary)]">
            Keepsake Photobooth · {gender === 'boy' ? 'Coastal Tide Collection' : 'Peony Botanical Collection'}
          </p>
          <h2 className="font-display-editorial text-3xl sm:text-5xl text-[var(--text-primary)]">
            Step into the paper frame
          </h2>
          <p className="max-w-xl text-sm text-[var(--text-secondary)]">
            Snap a portrait or a 4-shot photo strip to celebrate Baby {babySurname}.
            Everything stays privately on your phone — nothing is uploaded to a server.
          </p>
        </div>

        {/* Dev-only Frame Set Theme Switcher */}
        {isMockMode && onChangePreviewGender && (
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs">
            <span className="font-medium text-[var(--text-secondary)]">Dev Frame Set:</span>
            <button
              type="button"
              onClick={() => onChangePreviewGender('boy')}
              className={`rounded-full px-3 py-1 font-medium transition ${
                gender === 'boy'
                  ? 'bg-[#4F7FA3] text-white'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              Boy Frames (3)
            </button>
            <button
              type="button"
              onClick={() => onChangePreviewGender('girl')}
              className={`rounded-full px-3 py-1 font-medium transition ${
                gender === 'girl'
                  ? 'bg-[#D4808F] text-white'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              Girl Frames (3)
            </button>
          </div>
        )}
      </div>

      {/* In-App Browser Camera Guard (Messenger / Viber / Facebook) */}
      {inAppBrowserName && (
        <div className="paper-card-surface rounded-2xl border-l-4 border-l-[var(--accent-primary)] p-4">
          <div className="flex items-start gap-3">
            <Browser size={22} weight="light" className="mt-0.5 text-[var(--accent-primary)] shrink-0" />
            <div className="space-y-1 text-xs sm:text-sm">
              <p className="font-medium text-[var(--text-primary)]">
                Opened inside {inAppBrowserName}
              </p>
              <p className="text-[var(--text-secondary)]">
                Chat apps sometimes block live camera access. Tap the menu in the top corner and choose{' '}
                <strong className="text-[var(--text-primary)]">Open in Chrome / Safari</strong> to use the live camera.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Live Camera & Controls */}
        <div className="space-y-6 lg:col-span-6">
          {/* Mode Switcher: Single Shot vs 4-Shot Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-1">
              <button
                type="button"
                onClick={() => setBoothMode('single')}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  boothMode === 'single'
                    ? 'bg-[var(--accent-primary)] text-[var(--linen)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Square size={15} weight="light" />
                <span>Single Portrait</span>
              </button>
              <button
                type="button"
                onClick={() => setBoothMode('strip4')}
                className={`inline-flex min-h-[40px] items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  boothMode === 'strip4'
                    ? 'bg-[var(--accent-primary)] text-[var(--linen)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Rows size={15} weight="light" />
                <span>4-Shot Strip</span>
              </button>
            </div>

            {cameraActive && (
              <button
                type="button"
                onClick={handleFlipCamera}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]"
              >
                <CameraRotate size={16} weight="light" />
                <span>Flip Camera</span>
              </button>
            )}
          </div>

          {/* Camera Viewport */}
          <div className="paper-card-surface relative aspect-[4/5] w-full overflow-hidden rounded-3xl flex flex-col items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${
                facingMode === 'user' ? '-scale-x-100' : ''
              } ${cameraActive ? 'block' : 'hidden'}`}
            />

            {!cameraActive && (
              <div className="mx-auto max-w-sm space-y-4 p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)] text-[var(--accent-primary)]">
                  <Camera size={28} weight="light" />
                </div>
                <h3 className="font-display-editorial text-2xl text-[var(--text-primary)]">
                  Ready for your close-up?
                </h3>
                <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                  {cameraError ||
                    'Turn on your camera to snap a portrait or a 4-shot strip inside our custom paper frame.'}
                </p>
                <div className="flex items-center justify-center pt-2">
                  <TactileButton variant="primary" onClick={() => startCamera()}>
                    <Camera size={16} weight="light" />
                    <span>Enable Camera</span>
                  </TactileButton>
                </div>
              </div>
            )}

            {/* 3-2-1 Countdown Overlay */}
            <AnimatePresence>
              {countdown !== null && (
                <motion.div
                  key="booth-countdown"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/25 backdrop-blur-[2px]"
                >
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--linen)] text-[var(--ink)] shadow-xl">
                    <RollingNumber
                      value={countdown}
                      pad={1}
                      className="font-display-editorial text-6xl"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Camera Flash Animation */}
            <AnimatePresence>
              {flashActive && (
                <motion.div
                  key="booth-flash"
                  initial={{ opacity: 0.95 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.24 }}
                  className="pointer-events-none absolute inset-0 z-30 bg-[#FBF8F2]"
                />
              )}
            </AnimatePresence>
          </div>

          {/* Shutter Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TactileButton
              variant="primary"
              onClick={handleStartCapture}
              className="flex-1"
            >
              <Sparkle size={17} weight="light" />
              <span>
                {boothMode === 'single'
                  ? 'Snap Portrait (3 · 2 · 1)'
                  : 'Start 4-Shot Strip Sequence'}
              </span>
            </TactileButton>

            {capturedRawShots.length > 0 && (
              <TactileButton
                variant="secondary"
                onClick={() => setCapturedRawShots([])}
              >
                <ArrowsClockwise size={16} weight="light" />
                <span>Retake</span>
              </TactileButton>
            )}
          </div>

          {/* Customization Studio Card */}
          <div className="paper-card-surface space-y-6 rounded-3xl p-5 sm:p-6">
            {/* Step 1: Frame Selector */}
            <div className="space-y-3">
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                1. Choose Paper Frame ({gender === 'boy' ? 'Boy Edition' : 'Girl Edition'})
              </span>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {activeFrames.map((frame) => {
                  const active = frame.id === selectedFrameId;
                  return (
                    <button
                      key={frame.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(12);
                        setSelectedFrameId(frame.id);
                      }}
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? 'border-[var(--accent-primary)] bg-[var(--bg-primary)] shadow-sm'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--accent-primary)]/50'
                      }`}
                    >
                      <p className="font-display-editorial text-base text-[var(--text-primary)]">
                        {frame.name}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {frame.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Artisanal Paper-Cut Sticker Gallery (SVG) */}
            <div className="space-y-3 border-t border-[var(--border-hairline)] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  2. Artisanal Paper-Cut Sticker (SVG)
                </span>
                {selectedSticker !== 'none' && (
                  <div className="flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)]/70 p-0.5 text-[10px]">
                    {CORNER_OPTIONS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic(8);
                          setStickerCorner(c.id);
                        }}
                        className={`rounded-full px-2.5 py-1 font-medium transition ${
                          stickerCorner === c.id
                            ? 'bg-[var(--accent-primary)] text-[var(--linen)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {STICKER_OPTIONS.map((stk) => {
                  const isSelected = selectedSticker === stk.id;
                  return (
                    <button
                      key={stk.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(12);
                        setSelectedSticker(stk.id);
                      }}
                      className={`group flex flex-col items-center rounded-2xl border p-3 text-center transition ${
                        isSelected
                          ? 'border-[var(--accent-primary)] bg-[var(--bg-primary)] shadow-sm ring-1 ring-[var(--accent-primary)]'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-surface)]/80 hover:border-[var(--accent-primary)]/50'
                      }`}
                    >
                      <div className="mb-1.5 flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--bg-primary)]/70 p-1 transition-transform group-hover:scale-105">
                        {stk.id === 'none' ? (
                          <Prohibit
                            size={26}
                            weight="light"
                            className="text-[var(--text-secondary)]"
                          />
                        ) : (
                          <PaperCutStickerSvg
                            sticker={stk.id}
                            primaryColor={
                              gender === 'boy'
                                ? PALETTE.boy.tide
                                : PALETTE.girl.peony
                            }
                            darkColor={
                              gender === 'boy'
                                ? PALETTE.boy.deepTide
                                : PALETTE.girl.mulberry
                            }
                            sandColor={PALETTE.boy.sand}
                            size={50}
                          />
                        )}
                      </div>
                      <span className="font-display-editorial text-sm font-medium text-[var(--text-primary)]">
                        {stk.label}
                      </span>
                      <span className="text-[10px] leading-tight text-[var(--text-secondary)]">
                        {stk.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Guest Name Signature Input (Strictly Limited to 22 Characters) */}
            <div className="border-t border-[var(--border-hairline)] pt-5">
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="photobooth-guest-name"
                  className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                >
                  3. Printed Name on Frame
                </label>
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                  {customCaption.length}/{MAX_PRINTED_NAME_CHARS}
                </span>
              </div>
              <input
                id="photobooth-guest-name"
                type="text"
                maxLength={MAX_PRINTED_NAME_CHARS}
                value={customCaption}
                onChange={(e) =>
                  setCustomCaption(
                    e.target.value.slice(0, MAX_PRINTED_NAME_CHARS)
                  )
                }
                placeholder="Your name (max 22 chars)"
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-primary)]/40 px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Rendered Keepsake Canvas Preview & Download/Share */}
        <div className="flex flex-col items-center justify-between space-y-5 lg:col-span-6">
          <div className="paper-card-surface flex w-full flex-col items-center justify-center rounded-3xl p-5 sm:p-8">
            <span className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              Live Framed Keepsake Preview
            </span>

            {composedDataUrl ? (
              <img
                src={composedDataUrl}
                alt={`Baby ${babySurname} framed keepsake`}
                className={`rounded-xl shadow-md transition-all ${
                  boothMode === 'single'
                    ? 'max-h-[540px] w-auto'
                    : 'max-h-[620px] w-auto'
                }`}
              />
            ) : (
              <div className="flex h-96 w-full items-center justify-center text-sm text-[var(--text-secondary)]">
                Rendering paper frame...
              </div>
            )}

            {/* Direct Clickable Link Below the Framed Keepsake */}
            <a
              href={CREATOR_PORTFOLIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-primary)]/60 px-3.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
            >
              <span>
                Designed &amp; Built by{' '}
                <strong className="text-[var(--text-primary)]">
                  {CREATOR_BRAND_NAME}
                </strong>
              </span>
              <ArrowUpRight size={12} weight="light" className="text-[var(--accent-primary)]" />
            </a>

            {!hasCapturedPhotos && (
              <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">
                Take a photo first to unlock Download &amp; Share.
              </p>
            )}

            <div className="mt-3 flex w-full flex-wrap items-center justify-center gap-3">
              <TactileButton
                variant="primary"
                disabled={!hasCapturedPhotos}
                onClick={handleDownloadPng}
              >
                <DownloadSimple size={17} weight="light" />
                <span>Download Keepsake PNG</span>
              </TactileButton>

              <TactileButton
                variant="secondary"
                disabled={!hasCapturedPhotos}
                onClick={handleWebShare}
              >
                <ShareNetwork size={17} weight="light" />
                <span>Share to Family Chat</span>
              </TactileButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
