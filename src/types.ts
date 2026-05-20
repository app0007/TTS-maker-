export interface ScriptMetadata {
  title: string;
  description: string;
  tags: string[];
}

export type VoiceEngine = 'gemini' | 'elevenlabs';

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  description: string;
}

export interface YouTubeUploadConfig {
  privacyStatus: 'private' | 'unlisted' | 'public';
  title: string;
  description: string;
  tags: string[];
}

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  customUrl?: string;
  thumbnail?: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  channel?: YouTubeChannelInfo;
}
