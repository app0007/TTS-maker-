import React, { useState, useRef, useEffect } from 'react';
import { Video, Download, RefreshCw, Layers, ShieldCheck, Sparkles, AlertCircle, Type as TypeIcon } from 'lucide-react';

interface VisualComposerProps {
  scriptText: string;
  audioBlobUrl: string | null;
  videoBlob: Blob | null;
  setVideoBlob: (blob: Blob | null) => void;
  brandText: string;
  setBrandText: (text: string) => void;
  aspectRatio: '16:9' | '9:16';
  setAspectRatio: (aspect: '16:9' | '9:16') => void;
}

const MOCK_CODE_SEGMENTS = [
  "import { nixusNode } from 'nixus';",
  "const pipeline = new AutoPipe('ghostwriter-yt');",
  "pipeline.on('voice_synth', async (ctx) => {",
  "  const audio = await elevenLabs.synthesize(ctx.script);",
  "  return video.overlay(audio, {",
  "    waveform: 'reactive_amber',",
  "    watermark: '@the_sync'",
  "  });",
  "});",
  "await pipeline.deploy({ platform: 'youtube' });"
];

export default function VisualComposer({
  scriptText,
  audioBlobUrl,
  videoBlob,
  setVideoBlob,
  brandText,
  setBrandText,
  aspectRatio,
  setAspectRatio
}: VisualComposerProps) {
  const [backdrop, setBackdrop] = useState<'slate-obsidian' | 'matrix-grid' | 'neon-pulse'>('slate-obsidian');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilingProgress, setCompilingProgress] = useState(0);
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Clean local URLs on unmount
  useEffect(() => {
    return () => {
      if (localVideoUrl) {
        URL.revokeObjectURL(localVideoUrl);
      }
    };
  }, [localVideoUrl]);

  // Handle building preview of active Canvas settings
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set preview dimensions
    const width = aspectRatio === '16:9' ? 640 : 360;
    const height = aspectRatio === '16:9' ? 360 : 640;
    canvas.width = width;
    canvas.height = height;

    let frame = 0;
    const renderPreview = () => {
      frame++;
      drawFrame(ctx, width, height, frame, null, 'PREVIEW: Configure Settings below');
      animationFrameRef.current = requestAnimationFrame(renderPreview);
    };

    renderPreview();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [aspectRatio, backdrop, brandText, scriptText]);

  // Main canvas renderer
  const drawFrame = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    frame: number,
    analyserData: Uint8Array | null,
    statusText?: string
  ) => {
    // 1. Draw Background
    if (backdrop === 'slate-obsidian') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#040508');
      grad.addColorStop(0.5, '#0A0B0E');
      grad.addColorStop(1, '#111216');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Tech Grid
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.035)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = frame % gridSize; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = frame % gridSize; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (backdrop === 'matrix-grid') {
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 0, w, h);

      // Dynamic digital metrics matrix
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.025)';
      ctx.lineWidth = 1.5;
      const spacing = 30;
      for (let x = 0; x < w; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    } else {
      // Neon Pulse
      ctx.fillStyle = '#030008';
      ctx.fillRect(0, 0, w, h);

      const radGrad = ctx.createRadialGradient(w/2, h/2, 10, w/2, h/2, Math.max(w, h)/1.2);
      radGrad.addColorStop(0, 'rgba(245, 158, 11, 0.08)');
      radGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Draw Blurred Floating Code Chunks
    ctx.save();
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    const codeYStart = aspectRatio === '16:9' ? 60 : 120;
    MOCK_CODE_SEGMENTS.forEach((line, idx) => {
      const slowOffset = Math.sin(frame / 60 + idx) * 3;
      ctx.fillText(line, 40 + slowOffset, codeYStart + (idx * 16));
    });
    ctx.restore();

    // 3. Draw Audio Analyzer Waveform (Reactive)
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(245, 158, 11, 1)';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f59e0b';

    if (analyserData) {
      // Direct Web Audio Analyser Waveform
      ctx.beginPath();
      const waveHeight = h * 0.22;
      const waveCenter = h * 0.7;
      const sliceWidth = w / analyserData.length;
      let x = 0;

      for (let i = 0; i < analyserData.length; i++) {
        const v = analyserData[i] / 128.0; // range 0 to 2
        const y = waveCenter + (v - 1.0) * waveHeight;

        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.lineTo(w, h * 0.7);
      ctx.stroke();
    } else {
      // Idle Simulated Sine Wave for preview
      ctx.beginPath();
      const waveCenter = h * 0.7;
      for (let x = 0; x < w; x++) {
        const angle = (x / w) * Math.PI * 4 + (frame * 0.08);
        const y = waveCenter + Math.sin(angle) * 12;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 4. Draw Caption Subtitles overlay (Dynamic based on progress)
    ctx.save();
    // Split text into lines of ~5-7 words
    const words = scriptText.split(/\s+/);
    const lineSize = 6;
    const lines: string[] = [];
    for (let i = 0; i < words.length; i += lineSize) {
      lines.push(words.slice(i, i + lineSize).join(' '));
    }

    if (lines.length > 0) {
      // Find active line
      // If previewing, we loop through lines slowly based on timer
      let activeIdx = 0;
      if (analyserData && recordingAudioRef.current) {
        const audio = recordingAudioRef.current;
        const progressPct = audio.currentTime / (audio.duration || 1);
        activeIdx = Math.floor(progressPct * lines.length);
      } else {
        activeIdx = Math.floor((frame / 90) % lines.length);
      }
      activeIdx = Math.min(activeIdx, lines.length - 1);
      const activeLine = lines[activeIdx];

      if (activeLine) {
        ctx.font = '500 13px "Space Grotesk", sans-serif';
        const textWidth = ctx.measureText(activeLine).width;
        const capWidth = Math.min(textWidth + 30, w - 40);
        const capHeight = 32;
        const capX = (w - capWidth) / 2;
        const capY = h * 0.84;

        // Subtitle card box
        ctx.fillStyle = 'rgba(7, 8, 11, 0.9)';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(capX, capY, capWidth, capHeight, 6);
        ctx.fill();
        ctx.stroke();

        // Subtitle Text
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeLine, w / 2, capY + (capHeight / 2));
      }
    }
    ctx.restore();

    // 5. Render brand metadata overlay corner (Space Grotesk typography)
    ctx.save();
    ctx.font = '600 11px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(brandText ? brandText.toUpperCase() : 'GHOSTWRITER YT', 25, 30);

    // Indicator Dot
    ctx.fillStyle = '#22c55e'; // Green pulse
    ctx.beginPath();
    ctx.arc(16, 26, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Bottom visual status line
    if (statusText) {
      ctx.font = '400 9px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(statusText, 25, h - 20);
    }
    ctx.restore();
  };

  const handleStartCompilation = async () => {
    if (!audioBlobUrl) {
      setError('Please finalize your Speech Synthesis file in Step 2 first before compiling.');
      return;
    }

    setIsCompiling(true);
    setCompilingProgress(0);
    setError(null);

    try {
      // 1. Setup Audio element and route sound to local destination node
      const audio = new Audio(audioBlobUrl);
      recordingAudioRef.current = audio;

      // Initialize Web Audio API
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaElementSource(audio);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      // Create a programmatic audio stream destination to fully record
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      // Connect to hardware speakers so the user can listen along during compiling
      source.connect(audioCtx.destination);

      // Let audio load
      await new Promise((resolve) => {
        audio.addEventListener('canplaythrough', resolve, { once: true });
        audio.load();
      });

      // 2. Setup Recording Canvas and stream capture
      const renderCanvas = document.createElement('canvas');
      const renderWidth = aspectRatio === '16:9' ? 1280 : 720; // Corrected standard compilation resolutions
      const renderHeight = aspectRatio === '16:9' ? 720 : 1280;
      renderCanvas.width = renderWidth;
      renderCanvas.height = renderHeight;
      const renderCtx = renderCanvas.getContext('2d');
      if (!renderCtx) throw new Error('Could not create accelerated rendering context.');

      const canvasStream = renderCanvas.captureStream(30); // Capture at strict 30 FPS

      // Merge the canvas video stream + silent destination audio stream
      const mergedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach(track => mergedStream.addTrack(track));
      dest.stream.getAudioTracks().forEach(track => mergedStream.addTrack(track));

      // 3. Initiate MediaRecorder
      const options = { mimeType: 'video/webm;codecs=vp8,opus' };
      const recorder = new MediaRecorder(mergedStream, options);
      mediaRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const completedBlob = new Blob(chunks, { type: 'video/webm' });
        setVideoBlob(completedBlob);
        const compiledUrl = URL.createObjectURL(completedBlob);
        setLocalVideoUrl(compiledUrl);
        setIsCompiling(false);
      };

      // 4. Run full real-time animation compilation loops
      let frame = 0;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const renderLoop = () => {
        if (!isCompiling && recorder.state === 'inactive') return;
        frame++;

        // Get live active voice wave oscillations
        analyser.getByteTimeDomainData(dataArray);

        // Update progress bar
        const duration = audio.duration || 10;
        const progress = Math.min((audio.currentTime / duration) * 100, 100);
        setCompilingProgress(Math.round(progress));

        // Draw compiled HQ Frame
        drawFrame(
          renderCtx,
          renderWidth,
          renderHeight,
          frame,
          dataArray,
          `COMPILING HD: AUDIO TIME: ${audio.currentTime.toFixed(1)}s / ${duration.toFixed(1)}s`
        );

        if (audio.ended || progress >= 100) {
          // Wrap up compilation
          recorder.stop();
          audioCtx.close();
        } else {
          requestAnimationFrame(renderLoop);
        }
      };

      // Start actual recordings
      recorder.start();
      audio.play();
      requestAnimationFrame(renderLoop);

    } catch (err: any) {
      console.error('Compilation failure:', err);
      setError(err.message || 'Error executing client-side canvas recording pipeline.');
      setIsCompiling(false);
    }
  };

  const loadLocalDownload = () => {
    if (!localVideoUrl) return;
    const a = document.createElement('a');
    a.href = localVideoUrl;
    a.download = `ghostwriter_${aspectRatio === '16:9' ? 'landscape' : 'shorts'}_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="visual-composer-section">
      {/* Controls & Configuration */}
      <div className="lg:col-span-5 bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col justify-between" id="visual-tuning-panel">
        <div className="space-y-5">
          <h2 className="font-display text-base text-white font-medium flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-accent" />
            Visual Style Settings
          </h2>

          {/* Canvas Backdrops Selection */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 block">Select Video Theme</label>
            <div className="grid grid-cols-3 gap-2" id="theme-selectors">
              <button
                onClick={() => setBackdrop('slate-obsidian')}
                className={`py-2 text-xs font-semibold rounded-lg border transition cursor-pointer text-center ${
                  backdrop === 'slate-obsidian'
                    ? 'bg-[#1A1B20] text-brand-accent border-brand-accent/40 shadow-sm'
                    : 'bg-brand-bg text-gray-400 border-brand-border hover:border-brand-border-light'
                }`}
              >
                Slate Obsidian
              </button>
              <button
                onClick={() => setBackdrop('matrix-grid')}
                className={`py-2 text-xs font-semibold rounded-lg border transition cursor-pointer text-center ${
                  backdrop === 'matrix-grid'
                    ? 'bg-[#1A1B20] text-brand-accent border-brand-accent/40 shadow-sm'
                    : 'bg-brand-bg text-gray-400 border-brand-border hover:border-brand-border-light'
                }`}
              >
                Amber Matrix
              </button>
              <button
                onClick={() => setBackdrop('neon-pulse')}
                className={`py-2 text-xs font-semibold rounded-lg border transition cursor-pointer text-center ${
                  backdrop === 'neon-pulse'
                    ? 'bg-[#1A1B20] text-brand-accent border-brand-accent/40 shadow-sm'
                    : 'bg-brand-bg text-gray-400 border-brand-border hover:border-brand-border-light'
                }`}
              >
                Amber Glow
              </button>
            </div>
          </div>

          {/* Aspect Ratios Choices */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 block">Dimensions Layout</label>
            <div className="grid grid-cols-2 gap-2" id="aspect-selectors">
              <button
                onClick={() => setAspectRatio('16:9')}
                className={`py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                  aspectRatio === '16:9'
                    ? 'bg-[#1A1B20] text-brand-accent border-brand-accent/40'
                    : 'bg-brand-bg text-gray-400 border-brand-border hover:border-brand-border-light'
                }`}
              >
                Landscape (16:9)
              </button>
              <button
                onClick={() => setAspectRatio('9:16')}
                className={`py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                  aspectRatio === '9:16'
                    ? 'bg-[#1A1B20] text-brand-accent border-brand-accent/40'
                    : 'bg-brand-bg text-gray-400 border-brand-border hover:border-brand-border-light'
                }`}
              >
                Shorts (9:16)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-gray-500 block flex items-center gap-1.5">
              <TypeIcon className="w-3.5 h-3.5 text-gray-500" />
              Custom Watermark / Overlay Banner
            </label>
            <input
              type="text"
              value={brandText}
              onChange={(e) => setBrandText(e.target.value)}
              placeholder="e.g. THE SYNC, RETRO_DEV"
              className="w-full bg-[#1A1B20] border border-brand-border text-white text-xs rounded-lg px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-brand-accent/50 font-mono"
            />
          </div>
        </div>

        {/* Action Trigger Buttons */}
        <div className="mt-6 space-y-3" id="composer-footer">
          <button
            onClick={handleStartCompilation}
            disabled={isCompiling || !audioBlobUrl}
            className="w-full bg-brand-accent hover:bg-amber-600 disabled:bg-[#1A1B20] disabled:text-gray-600 disabled:hover:bg-[#1A1B20] text-brand-bg py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            {isCompiling ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Compiling Video ({compilingProgress}%)
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5" />
                Compile video
              </>
            )}
          </button>

          {isCompiling && (
            <div className="w-full bg-brand-bg h-1 rounded-full overflow-hidden" id="compile-loading-bar">
              <div className="bg-brand-accent h-full playback-progress" style={{ width: `${compilingProgress}%` }} />
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-900/55 p-3 rounded-lg text-xs text-red-400 flex items-center gap-2" id="composer-err">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {videoBlob && (
            <div className="bg-emerald-950/30 border border-emerald-900/50 p-3 rounded-lg flex items-center justify-between text-xs text-slate-300" id="composer-success-actions">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Compilation Complete!</span>
              </div>
              <button
                onClick={loadLocalDownload}
                className="text-brand-accent hover:text-amber-500 transition flex items-center gap-1 font-semibold cursor-pointer"
              >
                Download Compiled Clip
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Render Output preview Display */}
      <div className="lg:col-span-7 bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col justify-between" id="visual-preview-panel">
        <div>
          <h2 className="font-display text-base text-white font-medium mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-accent animate-pulse" />
            Live Rendering Monitor
          </h2>

          <div className="flex justify-center bg-brand-bg/60 p-4 border border-brand-border rounded-lg" id="screen-canvas-wrapper">
            <canvas
              ref={canvasRef}
              className="max-h-[420px] shadow-2xl rounded-md bg-brand-bg border border-brand-border"
              style={{
                aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16',
                width: aspectRatio === '16:9' ? '100%' : 'auto',
                maxWidth: aspectRatio === '16:9' ? '100%' : '260px',
              }}
              id="compositor-screen"
            />
          </div>
        </div>

        {/* Compiling hint lines */}
        <div className="mt-4 border-t border-brand-border pt-3" id="compiling-hints">
          <p className="text-[10px] text-gray-500 leading-normal font-sans">
            ⚙️ <strong>Renderer Process</strong>: Client-side dynamic canvas layers recording runs programmatically under strict requestFrames. Merges direct audio output track with no external microphone noise overlays. Fast compiling without cloud rendering queues.
          </p>
        </div>
      </div>
    </div>
  );
}
