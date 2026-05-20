import React, { useState, useEffect } from 'react';
import { Youtube, Link2, ShieldAlert, Sparkles, CheckCircle, RefreshCw, LogOut, HelpCircle, ArrowUpRight } from 'lucide-react';
import { ScriptMetadata, YouTubeChannelInfo } from '../types';

interface PublishingHubProps {
  videoBlob: Blob | null;
  metadata: ScriptMetadata;
}

export default function PublishingHub({ videoBlob, metadata }: PublishingHubProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [channelInfo, setChannelInfo] = useState<YouTubeChannelInfo | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Upload state parameters
  const [privacyStatus, setPrivacyStatus] = useState<'private' | 'unlisted' | 'public'>('unlisted');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);

  // Load and check auth status on mount
  useEffect(() => {
    fetchAuthStatus();
  }, []);

  // Update overrides when metadata changes
  useEffect(() => {
    if (metadata) {
      setCustomTitle(metadata.title || '');
      setCustomDescription(metadata.description || '');
      setCustomTags(metadata.tags || []);
    }
  }, [metadata]);

  const fetchAuthStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const res = await fetch('/api/youtube/status');
      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(data.authenticated);
        if (data.channel) {
          setChannelInfo(data.channel);
        } else {
          setChannelInfo(null);
        }
      }
    } catch (err) {
      console.error('Error loading Youtube auth status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Popup oauth hook
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Direct origin validation
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        console.log('Received OAuth Success event postMessage. Fetching records...');
        fetchAuthStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectYoutube = async () => {
    setUploadError(null);
    try {
      const res = await fetch('/api/auth/url');
      if (!res.ok) {
        const errText = await res.json();
        throw new Error(errText.error || 'Failed to generate OAuth URL. Check your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET variables in settings.');
      }
      const data = await res.json();

      // Open OAuth vendor popup directly
      const authWindow = window.open(
        data.url,
        'youtube_oauth_popup',
        'width=600,height=700,status=no,toolbar=no,menubar=no'
      );

      if (!authWindow) {
        alert('Popup blocked. Please authorize popups for this page to proceed with authenticating YouTube accounts.');
      }
    } catch (err: any) {
      console.error('Connection trigger failed:', err);
      setUploadError(err.message || 'Error executing Google authentication connector.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/youtube/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setChannelInfo(null);
      setUploadSuccess(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = tagInput.trim().toLowerCase().replace(/#/g, '');
    if (cleanTag && !customTags.includes(cleanTag)) {
      setCustomTags([...customTags, cleanTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter(t => t !== tagToRemove));
  };

  const handlePublishVideo = async () => {
    if (!videoBlob) {
      setUploadError('Please record and compile your visual video file in Step 3 first before uploading.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Convert compiled Video Blob into standard Base64 representation to POST
      const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      console.log('Encoding video blob to base64...');
      const videoBase64 = await blobToBase64(videoBlob);

      console.log('Posting base64 video segment to server publishing pipeline...');
      const res = await fetch('/api/youtube/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoBase64,
          privacyStatus,
          title: customTitle,
          description: customDescription,
          tags: customTags
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Publishing upload failed.');
      }

      const uploadData = await res.json();
      setUploadSuccess(uploadData);
    } catch (err: any) {
      console.error('Publishing error:', err);
      setUploadError(err.message || 'An error occurred uploading the track.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="publishing-hub-section">
      {/* Account Connector Card */}
      <div className="lg:col-span-5 flex flex-col gap-6" id="hub-left-cards">
        <div className="bg-brand-card border border-brand-border rounded-xl p-5" id="youtube-connection-card">
          <h2 className="font-display text-base text-white font-medium mb-4 flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500 animate-pulse" />
            YouTube Link Center
          </h2>

          {isLoadingStatus ? (
            <div className="flex items-center justify-center py-8 text-xs text-gray-400 gap-1.5" id="conn-loading">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-accent" />
              Checking auth status...
            </div>
          ) : isAuthenticated ? (
            <div className="space-y-4" id="conn-active">
              <div className="bg-[#0e0f14] p-4 border border-brand-border rounded-lg flex items-center gap-3">
                {channelInfo?.thumbnail ? (
                  <img src={channelInfo.thumbnail} referrerPolicy="no-referrer" alt="Avatar" className="w-10 h-10 rounded-full border border-brand-border" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-bg border border-brand-border flex items-center justify-center text-red-500 font-semibold font-display">
                    YT
                  </div>
                )}
                <div className="flex-1 space-y-0.5">
                  <div className="text-xs font-semibold text-white truncate">{channelInfo?.title || 'Connected Channel'}</div>
                  {channelInfo?.customUrl && (
                    <div className="text-[10px] font-mono text-gray-500">{channelInfo.customUrl}</div>
                  )}
                  <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                     Ready to Publish
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  title="Disconnect Channel"
                  className="text-gray-500 hover:text-red-400 p-2 hover:bg-brand-bg/40 rounded transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              <div className="text-[10px] text-gray-500 leading-normal">
                Linked channel credentials are kept cached inside local ephemeral Express threads during active browsing sessions.
              </div>
            </div>
          ) : (
            <div className="space-y-4" id="conn-inactive">
              <div className="border border-dashed border-brand-border-light bg-[#0e0f14]/30 p-5 rounded-lg text-center font-sans space-y-3">
                <Youtube className="w-10 h-10 text-gray-700 mx-auto" />
                <div className="text-xs text-gray-400 max-w-xs mx-auto leading-normal">
                  Connect YouTube platform accounts securely to publish your generated coding logs and video voice streams instantly.
                </div>
                
                <button
                  onClick={handleConnectYoutube}
                  className="mx-auto flex items-center gap-1.5 bg-red-650 hover:bg-red-500 hover:shadow-red-600/10 hover:shadow-lg text-white font-medium text-xs py-2 px-4 rounded-lg cursor-pointer transition duration-150"
                  id="link-youtube-btn"
                >
                  <Link2 className="w-4 h-4" />
                  Link YouTube Channel
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="mt-4 bg-red-950/40 border border-red-900/55 p-3 rounded-lg text-xs text-red-400 flex items-start gap-2" id="upload-err">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-red-300">Publishing / Setup Error</div>
                <p className="text-[11px] leading-relaxed">{uploadError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Client Setup Guide */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-5" id="oauth-client-setup-help">
          <h2 className="font-display text-xs text-gray-400 font-semibold mb-3 flex items-center gap-1.5 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-brand-accent" />
            OAuth Setup Instructions
          </h2>

          <div className="space-y-3.5 text-xs text-gray-400 leading-relaxed font-sans" id="oauth-manual-card">
            <div>
              <div className="font-bold text-gray-300 mb-1">1. Configure Google Credentials</div>
              YouTube uploads require a Google Cloud Console Client credentials configured:
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="text-brand-accent hover:underline flex items-center gap-1 select-text mt-1 text-[11px] font-mono font-semibold"
              >
                console.cloud.google.com <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>

            <div>
              <div className="font-bold text-gray-300 mb-1">2. Add Callback Redirect URL</div>
              Copy this callback path to your Authorized Redirect URIs in Google Console:
              <div className="bg-brand-bg border border-brand-border p-2 rounded mt-1 text-[10px] font-mono text-gray-300 select-all overflow-x-auto whitespace-nowrap scrollbar-thin">
                {typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback` : '<App_URL>/api/auth/callback'}
              </div>
            </div>

            <div className="bg-brand-bg p-2.5 rounded border border-brand-border text-[10px] space-y-1 text-gray-500 leading-normal">
              <div>⚙️ <strong>Required Secrets Env Key Names</strong>:</div>
              <div>• <code>GOOGLE_CLIENT_ID</code></div>
              <div>• <code>GOOGLE_CLIENT_SECRET</code></div>
              <div className="mt-1 text-gray-500">Enter these variables inside your <strong>Secrets panel</strong>.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Metadata review */}
      <div className="lg:col-span-7 bg-brand-card border border-brand-border rounded-xl p-5 flex flex-col justify-between" id="publishing-editor-panel">
        <div className="space-y-4">
          <h2 className="font-display text-lg text-white font-medium flex items-center gap-2">
            <Youtube className="w-5 h-5 text-brand-accent" />
            Meta Refiner & Post Dashboard
          </h2>

          <div className="space-y-3" id="meta-refining-form">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 block mb-1">Video Title</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Finalize video title"
                className="w-full bg-[#1A1B20] border border-brand-border text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-accent/50 font-sans"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 block mb-1">Description summary</label>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                placeholder="Finalize description log details"
                className="w-full bg-[#1A1B20] border border-brand-border text-white text-xs rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-brand-accent/50 font-sans h-28 leading-relaxed resize-y scrollbar-thin"
              />
            </div>

            {/* Tags addition */}
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-500 block mb-1">Keyword Hash tags</label>
              <form onSubmit={handleAddTag} className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Type tag and press enter"
                  className="flex-1 bg-[#1A1B20] border border-brand-border text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-accent/50 font-sans"
                />
              </form>
              <div className="flex flex-wrap gap-1.5 mt-2" id="refine-tags-cloud">
                {customTags.map((tag, idx) => (
                  <span
                    key={idx}
                    onClick={() => handleRemoveTag(tag)}
                    className="bg-brand-bg hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/40 text-brand-accent text-[10px] font-mono border border-brand-border px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition select-none"
                  >
                    #{tag} <span className="text-[9px] text-gray-500 font-sans">×</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Privacy selection options */}
            <div className="space-y-1 pt-1.5">
              <label className="text-xs uppercase tracking-wider text-gray-500 block">YouTube Post Privacy Visibility Status</label>
              <div className="grid grid-cols-3 gap-2" id="privacy-settings">
                {(['private', 'unlisted', 'public'] as const).map((privacy) => (
                  <button
                    key={privacy}
                    onClick={() => setPrivacyStatus(privacy)}
                    className={`py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer capitalize ${
                      privacyStatus === privacy
                        ? 'bg-[#1A1B20] text-brand-accent border-brand-accent/40 shadow-sm'
                        : 'bg-brand-bg text-gray-400 border-brand-border hover:border-brand-border-light'
                    }`}
                  >
                    {privacy}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Upload Button container */}
        <div className="mt-6 space-y-3" id="upload-hub-footer">
          <button
            onClick={handlePublishVideo}
            disabled={isUploading || !isAuthenticated || !videoBlob}
            className="w-full bg-brand-accent hover:bg-amber-600 disabled:bg-[#1A1B20] disabled:text-gray-600 disabled:hover:bg-[#1A1B20] text-brand-bg py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition-all duration-250 flex items-center justify-center gap-2"
            id="publish-youtube-btn"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Publishing to YouTube API...
              </>
            ) : (
              <>
                <Youtube className="w-4 h-4" />
                Publish Video on YouTube
              </>
            )}
          </button>

          {/* Success card output */}
          {uploadSuccess && (
            <div className="bg-emerald-950/30 border border-emerald-900/50 p-4 rounded-xl space-y-2 text-xs text-slate-300" id="upload-success-board">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                Successfully Uploaded & Posted Video!
              </div>
              <p className="text-[11px] text-gray-400">Your visual log audio file has successfully reached your connected YouTube channel Creator Studio.</p>
              
              <div className="bg-brand-bg border border-brand-border p-2.5 rounded font-mono text-[10px] text-brand-accent space-y-1">
                <div>• <strong>Video ID</strong>: {uploadSuccess.videoId}</div>
                <div>• <strong>Status Link</strong>: 
                  <a
                    href={uploadSuccess.videoUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="ml-1 text-[#f59e0b] hover:underline inline-flex items-center gap-0.5"
                  >
                     Review Video Watchpage <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
