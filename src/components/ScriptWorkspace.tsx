import React, { useState } from 'react';
import { Sparkles, FileText, Globe, MessageSquareCode, CheckCircle, RefreshCw } from 'lucide-react';
import { ScriptMetadata } from '../types';

interface ScriptWorkspaceProps {
  scriptText: string;
  setScriptText: (text: string) => void;
  metadata: ScriptMetadata;
  setMetadata: (metadata: ScriptMetadata) => void;
  niche: string;
  setNiche: (niche: string) => void;
  tone: string;
  setTone: (tone: string) => void;
}

export default function ScriptWorkspace({
  scriptText,
  setScriptText,
  metadata,
  setMetadata,
  niche,
  setNiche,
  tone,
  setTone
}: ScriptWorkspaceProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const wordCount = scriptText.trim() ? scriptText.trim().split(/\s+/).length : 0;
  const charCount = scriptText.length;
  const readingDuration = Math.ceil(wordCount / 2.5); // Average speaking rate: 150 words per minute ~ 2.5 words per sec

  const handleGenerateMetadata = async () => {
    if (!scriptText.trim()) {
      setError('Please input a script text first before optimizing.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/metadata/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scriptText,
          tone,
          channelNiche: niche
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate metadata');
      }

      const data: ScriptMetadata = await res.json();
      setMetadata(data);
      setSuccessMsg('SEO Metadata generated successfully!');
    } catch (err: any) {
      setError(err.message || 'An error occurred during AI optimization.');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadExampleScript = () => {
    setScriptText(
      `Welcome back! Today we are looking at real-time video compilation inside the browser sandbox. By leveraging standard dynamic Canvas renderings paired alongside AudioContext streams, we are able to record pristine, high-fidelity video tracks directly inside our client frames. Let's write some high-speed JS nodes and sync this up immediately. Stay wired!`
    );
    setNiche('Software Engineering & AI DevLogs');
    setTone('Futuristic, energetic and direct');
    setSuccessMsg('Example dev script loaded successfully!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="script-workspace">
      {/* Script Text Panel */}
      <div className="lg:col-span-7 bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col justify-between" id="script-input-panel">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-accent" />
              <h2 className="font-display text-lg text-white font-medium">Text Script Pad</h2>
            </div>
            <button
              onClick={loadExampleScript}
              className="text-xs text-gray-400 hover:text-white transition flex items-center gap-1.5 border border-brand-border bg-brand-bg px-2.5 py-1 rounded cursor-pointer"
            >
              Load Example Script
            </button>
          </div>

          <textarea
            value={scriptText}
            onChange={(e) => setScriptText(e.target.value)}
            className="w-full min-h-[320px] bg-brand-bg font-serif italic text-base border border-brand-border rounded-lg p-5 text-gray-250 placeholder-gray-650 focus:outline-none focus:ring-1 focus:ring-brand-accent/60 leading-relaxed resize-y scrollbar-thin shadow-inner shadow-black/40 text-gray-250 opacity-90"
            placeholder="Type or paste your video voice script here (e.g. Nixus scripting logs)..."
            id="script-editor"
          />
        </div>

        {/* Counts & Status */}
        <div className="grid grid-cols-3 gap-3 mt-4 border-t border-brand-border/80 pt-4" id="script-counters">
          <div className="bg-brand-bg border border-brand-border p-2.5 rounded-lg text-center">
            <div className="text-xs text-gray-500">Words</div>
            <div className="text-sm font-mono font-medium text-white mt-1">{wordCount}</div>
          </div>
          <div className="bg-brand-bg border border-brand-border p-2.5 rounded-lg text-center">
            <div className="text-xs text-gray-500">Characters</div>
            <div className="text-sm font-mono font-medium text-white mt-1">{charCount}</div>
          </div>
          <div className="bg-brand-bg border border-brand-border p-2.5 rounded-lg text-center">
            <div className="text-xs text-gray-500">Duration</div>
            <div className="text-sm font-mono font-medium text-brand-accent mt-1">~{readingDuration}s</div>
          </div>
        </div>
      </div>

      {/* Control & Optimization Panel */}
      <div className="lg:col-span-5 flex flex-col gap-6" id="script-control-panel">
        <div className="bg-brand-card border border-brand-border rounded-xl p-5" id="tuning-parameters">
          <h2 className="font-display text-base text-white font-medium mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-brand-accent" />
            Strategic Tuning
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5">Channel Niche / Target Audience</label>
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. Software Dev, AI Tips, Tech Tutorials"
                className="w-full bg-[#1A1B20] text-white border border-brand-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-500 mb-1.5">Voice / Conversational Tone</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="e.g. Enthusiastic coding tutorial, calm documentation review"
                className="w-full bg-[#1A1B20] text-white border border-brand-border rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent/50"
              />
            </div>

            <button
              onClick={handleGenerateMetadata}
              disabled={isGenerating || !scriptText.trim()}
              className="w-full bg-brand-accent hover:bg-amber-600 active:scale-[0.98] disabled:bg-[#1A1B20] disabled:text-gray-600 disabled:hover:bg-[#1A1B20] font-bold text-brand-bg py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer mt-2"
              id="optimize-seo-btn"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating SEO Metadata...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Optimize Metadata with Gemini
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-3 bg-red-950/40 border border-red-900/55 text-red-400 p-3 rounded-lg text-xs" id="metadata-err">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mt-3 bg-emerald-950/40 border border-emerald-900/55 text-emerald-400 p-3 rounded-lg text-xs flex items-center gap-1.5" id="metadata-success">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}
        </div>

        {/* SEO Outputs display */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5 flex-1 flex flex-col justify-between" id="seo-displays-panel">
          <div>
            <h2 className="font-display text-base text-white font-medium mb-4 flex items-center gap-2">
              <MessageSquareCode className="w-5 h-5 text-brand-accent" />
              SEO Title / Description Output
            </h2>

            <div className="space-y-4 text-xs font-sans" id="seo-results-box">
              <div>
                <span className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Suggested YouTube Title</span>
                <div className="bg-brand-bg text-white p-2.5 rounded border border-brand-border mt-1 select-all font-sans font-medium text-xs leading-relaxed">
                  {metadata.title || 'Untitled - Generating Required'}
                </div>
              </div>

              <div>
                <span className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Description block</span>
                <div className="bg-brand-bg text-[#D1D1D1] p-2.5 rounded border border-brand-border mt-1 h-28 overflow-y-auto whitespace-pre-wrap select-all select-text font-sans scrollbar-thin text-xs leading-relaxed">
                  {metadata.description || 'Provide text above and generate to prepare description summary...'}
                </div>
              </div>

              <div>
                <span className="text-gray-500 uppercase text-[10px] tracking-widest font-bold">Tags</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5" id="seo-tags-display">
                  {metadata.tags && metadata.tags.length > 0 ? (
                    metadata.tags.map((tag, idx) => (
                      <span key={idx} className="bg-brand-bg text-brand-accent text-[10px] font-mono border border-brand-border px-2 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 font-mono">No tags generated yet.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
