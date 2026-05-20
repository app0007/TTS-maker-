import React, { useState } from 'react';
import { FileText, Music, Layers, Youtube, ShieldCheck, Cpu } from 'lucide-react';
import { ScriptMetadata, VoiceEngine } from './types';
import ScriptWorkspace from './components/ScriptWorkspace';
import VoiceSynthesis from './components/VoiceSynthesis';
import VisualComposer from './components/VisualComposer';
import PublishingHub from './components/PublishingHub';

type Steps = 'script' | 'voice' | 'compose' | 'publish';

export default function App() {
  const [activeStep, setActiveStep] = useState<Steps>('script');

  // Multi-step Shared States
  const [scriptText, setScriptText] = useState(
    `Welcome back! Today we are looking at real-time video compilation inside the browser sandbox. By leveraging standard dynamic Canvas renderings paired alongside AudioContext streams, we are able to record pristine, high-fidelity video tracks directly inside our client frames. Let's write some high-speed JS nodes and sync this up immediately. Stay wired!`
  );

  const [metadata, setMetadata] = useState<ScriptMetadata>({
    title: 'Chrome DevLogs: High-Performance Browser Video Generation Node',
    description: 'A deep-dive review on capturing accelerated html5 canvas streams paired with programmatic speech synthesis to build standalone auto-publishing assets.',
    tags: ['softwareengineering', 'automation', 'javascript', 'html5canvas', 'productivity']
  });

  const [niche, setNiche] = useState('Software Engineering & AI DevLogs');
  const [tone, setTone] = useState('Futuristic, energetic and direct');

  // Audio Synthesis States
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngine>('gemini');
  const [voiceName, setVoiceName] = useState('Kore');
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);

  // Video Composer States
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [brandText, setBrandText] = useState('THE SYNC');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');

  const stepsDetails = [
    { id: 'script', name: '1. Text Workspace', desc: 'Draft & Enhance SEO', icon: FileText, done: !!scriptText.trim() },
    { id: 'voice', name: '2. Speech Synth', desc: 'Audio Soundboard', icon: Music, done: !!audioBlobUrl },
    { id: 'compose', name: '3. Video Render', desc: 'Canvas Compiler', icon: Layers, done: !!videoBlob },
    { id: 'publish', name: '4. Publish Hub', desc: 'YouTube API Upload', icon: Youtube, done: false }
  ] as const;

  return (
    <div className="min-h-screen bg-brand-bg text-[#D1D1D1] flex flex-col font-sans selection:bg-brand-accent/20 selection:text-white" id="ghostwriter-app-root">
      {/* Upper Navigation Rail */}
      <header className="border-b border-brand-border bg-brand-header sticky top-0 z-50 backdrop-blur" id="app-header-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-accent rounded flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-brand-bg"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base tracking-tight text-white uppercase">
                  GHOSTWRITER <span className="text-brand-accent font-light">YT</span>
                </span>
                <span className="text-[9px] uppercase font-mono bg-brand-accent/10 border border-brand-accent/20 text-brand-accent px-1.5 py-0.2 rounded font-semibold tracking-wider">
                  Live Mode
                </span>
              </div>
              <p className="text-[9px] text-gray-500 font-sans tracking-wide">
                Automated Post Pipeline • The Sync Studio
              </p>
            </div>
          </div>

          {/* Quick status indicators */}
          <div className="flex items-center gap-4 text-xs font-mono" id="engine-status-indicators">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${audioBlobUrl ? 'bg-brand-accent glowing-primary' : 'bg-brand-border-light'}`} />
              <span className="text-[9px] text-gray-500 uppercase tracking-wide">Voice Synthed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${videoBlob ? 'bg-brand-accent glowing-primary' : 'bg-brand-border-light'}`} />
              <span className="text-[9px] text-gray-500 uppercase tracking-wide">Video Compiled</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8" id="workspace-viewport">
        
        {/* Step Navigation Wizard */}
        <nav className="bg-brand-card border border-brand-border p-2 rounded-xl flex flex-wrap lg:flex-nowrap gap-2 justify-between" id="steps-progress-wizard">
          {stepsDetails.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex-1 text-left p-3 rounded-lg transition-all border duration-200 cursor-pointer flex items-center gap-3.5 group ${
                  isActive
                    ? 'bg-[#1A1B20] border-brand-accent/40 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-brand-card/60 hover:border-brand-border-light/40'
                }`}
                id={`step-tab-${step.id}`}
              >
                <div className={`p-2 rounded-lg border transition ${
                  isActive
                    ? 'bg-brand-accent/10 border-brand-accent/30 text-brand-accent'
                    : 'bg-brand-bg border-brand-border text-gray-505 text-gray-500 group-hover:text-gray-300'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'} truncate`}>
                    {step.name}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate mt-0.5 font-sans leading-none">{step.desc}</div>
                </div>

                {step.done && (
                  <div className="h-5 w-5 bg-brand-accent/10 border border-brand-accent/30 rounded-full flex items-center justify-center text-brand-accent" title="Step Complete">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Dynamic Display Frames */}
        <div className="flex-1" id="active-wizard-body">
          {activeStep === 'script' && (
            <ScriptWorkspace
              scriptText={scriptText}
              setScriptText={setScriptText}
              metadata={metadata}
              setMetadata={setMetadata}
              niche={niche}
              setNiche={setNiche}
              tone={tone}
              setTone={setTone}
            />
          )}

          {activeStep === 'voice' && (
            <VoiceSynthesis
              scriptText={scriptText}
              voiceEngine={voiceEngine}
              setVoiceEngine={setVoiceEngine}
              voiceName={voiceName}
              setVoiceName={setVoiceName}
              audioBlobUrl={audioBlobUrl}
              setAudioBlobUrl={setAudioBlobUrl}
            />
          )}

          {activeStep === 'compose' && (
            <VisualComposer
              scriptText={scriptText}
              audioBlobUrl={audioBlobUrl}
              videoBlob={videoBlob}
              setVideoBlob={setVideoBlob}
              brandText={brandText}
              setBrandText={setBrandText}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
            />
          )}

          {activeStep === 'publish' && (
            <PublishingHub
              videoBlob={videoBlob}
              metadata={metadata}
            />
          )}
        </div>
      </main>

      {/* Footer Design matching aesthetic dark bar */}
      <footer className="h-16 bg-brand-footer border-t border-brand-border px-8 flex items-center justify-between text-xs" id="app-footer">
        <div className="flex gap-6 text-gray-500 font-mono text-[10px]">
          <span>DESTINATION: @TheSync_Official</span>
          <span>•</span>
          <span>ESTIMATED AUTOMATION RENDER: ~45s</span>
        </div>
        <div className="text-gray-500 font-mono text-[9px] uppercase tracking-widest hidden sm:block">
          GhostWriter Automatic Media Synthesis Node v3.0
        </div>
      </footer>
    </div>
  );
}
