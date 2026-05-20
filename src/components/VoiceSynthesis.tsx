import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Music, Settings, RefreshCw, AlertTriangle, Key, ListMusic, Check } from 'lucide-react';
import { VoiceEngine, VoiceOption } from '../types';

interface VoiceSynthesisProps {
  scriptText: string;
  voiceEngine: VoiceEngine;
  setVoiceEngine: (engine: VoiceEngine) => void;
  voiceName: string;
  setVoiceName: (voice: string) => void;
  audioBlobUrl: string | null;
  setAudioBlobUrl: (url: string | null) => void;
}

const GEMINI_VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Kore (Default)', gender: 'neutral', description: 'Grounded, warm, balanced speaker.' },
  { id: 'Zephyr', name: 'Zephyr (Creative)', gender: 'male', description: 'Energetic, engaging storytelling style.' },
  { id: 'Puck', name: 'Puck (Cheerful)', gender: 'female', description: 'Bright, cheerful, vibrant sound.' },
  { id: 'Charon', name: 'Charon (Deep)', gender: 'male', description: 'Deep, resonant, low-pitch voice.' },
  { id: 'Fenrir', name: 'Fenrir (Serious)', gender: 'neutral', description: 'Steady, serious, technical presentation.' }
];

const ELEVENLABS_VOICES: VoiceOption[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Vocalist)', gender: 'female', description: 'Clear, narrative-focused professional voice.' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Conversational)', gender: 'female', description: 'Conversational, speedy, direct speaker.' },
  { id: 'EXAVITQu4vr4xnSDOCMa', name: 'Bella (Commercial)', gender: 'female', description: 'Confident, sharp promotional presenter.' },
  { id: 'ErXwobaYiN019vkySvjV', name: 'Antoni (Educational)', gender: 'male', description: 'Deep, slow educational tutoring.' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie (Dynamic)', gender: 'male', description: 'Casual, fast, youthful dialogue.' }
];

export default function VoiceSynthesis({
  scriptText,
  voiceEngine,
  setVoiceEngine,
  voiceName,
  setVoiceName,
  audioBlobUrl,
  setAudioBlobUrl
}: VoiceSynthesisProps) {
  const [elevenLabsApiKey, setElevenLabsApiKey] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Audio state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load ElevenLabs API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('GHOSTWRITER_EL_API_KEY') || '';
    setElevenLabsApiKey(savedKey);
  }, []);

  // Set default voice when engine switches
  useEffect(() => {
    if (voiceEngine === 'gemini') {
      const exists = GEMINI_VOICES.some(v => v.id === voiceName);
      if (!exists) setVoiceName('Kore');
    } else {
      const exists = ELEVENLABS_VOICES.some(v => v.id === voiceName);
      if (!exists) setVoiceName('21m00Tcm4TlvDq8ikWAM');
    }
  }, [voiceEngine]);

  const handleSaveApiKey = () => {
    localStorage.setItem('GHOSTWRITER_EL_API_KEY', elevenLabsApiKey);
    setError(null);
  };

  const handleGenerateVoice = async () => {
    if (!scriptText.trim()) {
      setError('Your script is empty. Please enter script text in the Script Pad first.');
      return;
    }

    setIsSynthesizing(true);
    setError(null);

    try {
      let endpoint = '/api/voice/gemini-tts';
      let bodyData: any = { text: scriptText, voiceName };

      if (voiceEngine === 'elevenlabs') {
        endpoint = '/api/voice/elevenlabs';
        bodyData = {
          text: scriptText,
          voiceId: voiceName,
          apiKey: elevenLabsApiKey
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Speech synthesis failed.');
      }

      const data = await res.json();
      if (!data.base64Audio) {
        throw new Error('Received invalid audio data response format.');
      }

      // Convert Base64 response to Blob URL
      const byteCharacters = atob(data.base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(audioBlob);

      setAudioBlobUrl(blobUrl);
      setIsPlaying(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error occurred during voice synthesis.');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Playback failed:', err);
      });
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const selectedVoices = voiceEngine === 'gemini' ? GEMINI_VOICES : ELEVENLABS_VOICES;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="voice-synthesis-section">
      {/* Settings Panel */}
      <div className="lg:col-span-4 bg-brand-card border border-brand-border rounded-xl p-5" id="engine-selector-panel">
        <h2 className="font-display text-base text-white font-medium mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-accent" />
          Voice Core Engine
        </h2>

        {/* Engine switcher taps */}
        <div className="flex bg-brand-bg p-1 border border-brand-border rounded-lg gap-1 mb-4" id="engine-tabs">
          <button
            onClick={() => setVoiceEngine('gemini')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded transition-all cursor-pointer ${
              voiceEngine === 'gemini'
                ? 'bg-[#1A1B20] text-brand-accent border border-brand-border'
                : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            Gemini TTS (Free)
          </button>
          <button
            onClick={() => setVoiceEngine('elevenlabs')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded transition-all cursor-pointer ${
              voiceEngine === 'elevenlabs'
                ? 'bg-[#1A1B20] text-brand-accent border border-brand-border'
                : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            ElevenLabs (Pro)
          </button>
        </div>

        {/* ElevenLabs Secret configurations */}
        {voiceEngine === 'elevenlabs' && (
          <div className="bg-brand-bg p-3 rounded-lg border border-brand-border space-y-3 mb-5" id="elevenlabs-auth">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <Key className="w-3.5 h-3.5 text-brand-accent" />
              <span>Configure ElevenLabs API Secret</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={elevenLabsApiKey}
                onChange={(e) => setElevenLabsApiKey(e.target.value)}
                placeholder="xi-api-key"
                className="w-full bg-brand-bg border border-brand-border-light rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-accent font-mono"
              />
              <button
                onClick={handleSaveApiKey}
                className="text-xs bg-[#1A1B20] border border-brand-border hover:bg-brand-border hover:text-white text-[#D1D1D1] px-3 py-1 rounded transition cursor-pointer"
              >
                Save
              </button>
            </div>
            <div className="text-[10px] text-gray-500 leading-normal font-sans">
              Keys are stored securely in your browser's LocalStorage and never synchronized.
            </div>
          </div>
        )}

        {/* Voice Selection Options */}
        <div className="space-y-3" id="voice-scroll-panel">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Speaker Presets</span>
            <span>{selectedVoices.length} available</span>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
            {selectedVoices.map((voice) => {
              const isSelected = voiceName === voice.id;
              return (
                <button
                  key={voice.id}
                  onClick={() => setVoiceName(voice.id)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-brand-accent/10 border-brand-accent/30 text-white shadow-md'
                      : 'bg-brand-bg border-brand-border hover:border-brand-border-light text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="space-y-0.5 max-w-[85%]">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold ${isSelected ? 'text-brand-accent' : 'text-gray-300'}`}>
                        {voice.name}
                      </span>
                      <span className="text-[9px] uppercase font-mono px-1 py-0.2 bg-brand-bg border border-brand-border text-gray-500 rounded">
                        {voice.gender}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 truncate leading-normal">
                      {voice.description}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-brand-accent" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleGenerateVoice}
            disabled={isSynthesizing || !scriptText.trim() || (voiceEngine === 'elevenlabs' && !elevenLabsApiKey)}
            className="w-full bg-brand-accent hover:bg-amber-600 active:scale-[0.98] disabled:bg-[#1A1B20] disabled:text-gray-600 disabled:hover:bg-[#1A1B20] text-brand-bg py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider mt-4 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            {isSynthesizing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Synthesizing Script...
              </>
            ) : (
              <>
                <Music className="w-3.5 h-3.5" />
                Generate Audio
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-950/40 border border-red-900/55 p-3 rounded-lg text-xs text-red-400 flex gap-2 items-start" id="voice-err">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Playback soundboard display */}
      <div className="lg:col-span-8 bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col justify-between" id="voice-playback-soundboard">
        <div>
          <h2 className="font-display text-base text-white font-medium mb-4 flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-brand-accent" />
            Voice Soundboard Analyzer
          </h2>

          {audioBlobUrl ? (
            <div className="bg-[#0e0f14] p-6 rounded-lg border border-brand-border flex flex-col items-center justify-center space-y-6 min-h-[220px]" id="soundboard-active-ui">
              <div className="bg-brand-bg h-16 w-16 rounded-full border border-brand-border flex items-center justify-center text-brand-accent shadow-inner">
                <Music className={`w-8 h-8 ${isPlaying ? 'animate-bounce' : ''}`} />
              </div>

              <div className="text-center space-y-1">
                <div className="text-xs text-gray-300 font-medium">Generated Audio Track</div>
                <div className="text-[10px] uppercase font-mono text-brand-accent bg-brand-bg/40 border border-brand-border px-2.5 py-0.5 rounded-full inline-block">
                  Voice: {voiceName} ({voiceEngine === 'gemini' ? 'Gemini TTS' : 'ElevenLabs'})
                </div>
              </div>

              {/* Progress Slider Bar */}
              <div className="w-full flex items-center gap-3">
                <span className="text-[10px] font-mono text-gray-505 text-gray-500 w-8 text-right">
                  {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}
                </span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeekChange}
                  className="flex-1 accent-brand-accent cursor-pointer h-1 bg-brand-bg rounded-lg appearance-none"
                />
                <span className="text-[10px] font-mono text-gray-505 text-gray-500 w-8">
                  {Math.floor(duration / 60)}:{(duration % 60).toFixed(0).padStart(2, '0')}
                </span>
              </div>

              {/* Sub Playback Key */}
              <button
                onClick={togglePlayback}
                className="bg-brand-accent hover:bg-amber-600 active:scale-95 text-brand-bg p-3 rounded-full transition duration-150 cursor-pointer w-12 h-12 flex items-center justify-center shadow-lg hover:shadow-brand-accent/10"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-brand-bg text-brand-bg" /> : <Play className="w-5 h-5 fill-brand-bg text-brand-bg ml-0.5" />}
              </button>

              <audio
                ref={audioRef}
                src={audioBlobUrl}
                onTimeUpdate={handleAudioTimeUpdate}
                onLoadedMetadata={handleAudioLoadedMetadata}
                onEnded={handleAudioEnded}
                className="hidden"
                id="html5-audio-synthesizer"
              />
            </div>
          ) : (
            <div className="border border-dashed border-brand-border-light bg-[#0e0f14]/20 flex flex-col items-center justify-center p-8 rounded-lg min-h-[220px] text-center" id="soundboard-inactive-ui">
              <Music className="w-10 h-10 text-gray-700 mb-2" />
              <div className="text-xs text-gray-500 max-w-sm mt-1 leading-normal font-sans">
                Audio timeline is currently unpopulated. Select your favorite voice core engine and tap "Generate Audio" to create the vocal script sound file.
              </div>
            </div>
          )}
        </div>

        {/* Informational Section */}
        <div className="mt-4 border-t border-brand-border pt-4" id="audio-tuning-info">
          <div className="flex gap-2.5 bg-brand-bg/50 border border-brand-border p-3.5 rounded-lg text-xs leading-relaxed text-gray-500 font-sans">
            <Settings className="w-4 h-4 shrink-0 text-brand-accent mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-gray-300 text-xs">Aesthetic Sound Processing</div>
              <div>
                When compiling, the audio is routed through our React Client's <strong>Web Audio Frequency Analyser Node</strong>. The physical vocal spectrum data is then drawn onto the video canvas live in real-time, matching beautiful audio oscillations to visual lines!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
