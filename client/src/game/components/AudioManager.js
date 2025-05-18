/**
 * AudioManager handles all game audio playback, including background music and sound effects
 */
export class AudioManager {
    /**
     * Create a new AudioManager instance
     * @param {Phaser.Scene} scene - The scene this audio manager belongs to
     */
    constructor(scene) {
        this.scene = scene;
        this.musicTracks = {};
        this.currentTrack = null;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.isMuted = false;
    }

    /**
     * Preload audio assets
     */
    preloadAudio() {
        const scene = this.scene;

        // Load music tracks if not already loaded
        if (!scene.sound.get('levelMusic')) {
            scene.load.audio('levelMusic', '../assets/music/dnb_og.wav');
        }
        
        // Load level music tracks
        const musicTracks = [
            'dnb_og.wav', 'dnb.wav', 'dnb2.wav', 'dnb5.wav', 
            'dnb6.wav', 'dnb7.wav', 'dub2.wav', 'idk.wav', 'main_menu.wav'
        ];
        
        musicTracks.forEach(track => {
            const key = track.replace('.wav', '');
            if (!scene.sound.get(key)) {
                scene.load.audio(key, `../assets/music/${track}`);
            }
        });
        
        // Load sound effects
        if (!scene.sound.get('win')) {
            scene.load.audio('win', '../assets/music/win.wav');
        }
        
        if (!scene.sound.get('jumppad')) {
            scene.load.audio('jumppad', '../assets/music/jumppad.wav');
        }
    }

    /**
     * Play background music
     * @param {string} key - The audio key to play
     * @param {boolean} loop - Whether to loop the audio (default: true)
     * @param {number} volume - Volume level (0-1) (default: musicVolume)
     * @param {boolean} stopCurrent - Whether to stop current music (default: true)
     * @param {boolean} forcePlay - Whether to force playback even if track exists (default: false)
     * @returns {Phaser.Sound.BaseSound} The sound object that was started
     */
    playMusic(key, loop = true, volume = this.musicVolume, stopCurrent = true, forcePlay = false) {
        // Check if this track is already playing in the global sound manager
        const existingTrack = this.scene.sound.get(key);
        if (existingTrack && existingTrack.isPlaying && !forcePlay) {
            // Track is already playing somewhere, just reference it 
            // without starting it again (to prevent overlap in multiplayer)
            this.currentTrack = existingTrack;
            console.log(`Using existing music track: ${key}`);
            return this.currentTrack;
        }
        
        // Stop current music if requested
        if (stopCurrent && this.currentTrack && this.currentTrack.isPlaying) {
            this.stopMusic();
        }

        // Create a new track if it doesn't exist in our cache
        if (!this.musicTracks[key]) {
            try {
                this.musicTracks[key] = this.scene.sound.add(key, {
                    loop: loop,
                    volume: this.isMuted ? 0 : volume
                });
            } catch (error) {
                console.error(`Failed to add music track ${key}:`, error);
                return null;
            }
        }

        // Start playing and update current track reference
        this.currentTrack = this.musicTracks[key];
        
        if (!this.currentTrack.isPlaying || forcePlay) {
            this.currentTrack.play();
        }
        
        return this.currentTrack;
    }

    /**
     * Stop currently playing music with optional fade out
     * @param {number} fadeOutDuration - Fade out duration in ms (0 for immediate stop)
     */
    stopMusic(fadeOutDuration = 0) {
        if (!this.currentTrack) return;

        if (fadeOutDuration > 0) {
            this.scene.tweens.add({
                targets: this.currentTrack,
                volume: 0,
                duration: fadeOutDuration,
                onComplete: () => {
                    this.currentTrack.stop();
                }
            });
        } else {
            this.currentTrack.stop();
        }
    }

    /**
     * Play a sound effect once
     * @param {string} key - The sound effect key to play
     * @param {number} volume - Volume level (0-1) (default: sfxVolume)
     * @returns {Phaser.Sound.BaseSound} The sound object that was played
     */
    playSfx(key, volume = this.sfxVolume) {
        if (this.isMuted) return null;
        
        return this.scene.sound.play(key, {
            volume: volume
        });
    }

    /**
     * Set the music volume
     * @param {number} volume - New volume level (0-1)
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        
        if (this.currentTrack && !this.isMuted) {
            this.currentTrack.setVolume(this.musicVolume);
        }
    }

    /**
     * Set the sound effects volume
     * @param {number} volume - New volume level (0-1)
     */
    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Toggle mute for all audio
     * @returns {boolean} New mute state
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.currentTrack) {
            this.currentTrack.setVolume(this.isMuted ? 0 : this.musicVolume);
        }
        
        return this.isMuted;
    }

    /**
     * Pause all audio
     */
    pauseAll() {
        this.scene.sound.pauseAll();
    }

    /**
     * Resume all audio
     */
    resumeAll() {
        this.scene.sound.resumeAll();
    }

    /**
     * Clean up all resources
     */
    shutdown() {
        // Stop and destroy all music tracks
        Object.values(this.musicTracks).forEach(track => {
            if (track) {
                track.stop();
                track.destroy();
            }
        });
        
        this.musicTracks = {};
        this.currentTrack = null;
    }
}
