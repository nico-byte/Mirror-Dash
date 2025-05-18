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
        
        // Set up periodic audio cleanup
        if (scene.time) {
            this.cleanupEvent = scene.time.addEvent({
                delay: 5000, // Check every 5 seconds
                callback: this.cleanupDuplicateAudio,
                callbackScope: this,
                loop: true
            });
        }
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
        // First, check if this exact track is our current track
        if (this.currentTrack && this.currentTrack.key === key && this.currentTrack.isPlaying) {
            console.log(`Current track ${key} is already playing, returning without restarting`);
            return this.currentTrack;
        }

        // If we get here, check if this track exists in the global sound manager
        const existingTrack = this.scene.sound.get(key);
        if (existingTrack && existingTrack.isPlaying && !forcePlay) {
            // Stop any current track we might have playing that's different from the existing track
            if (this.currentTrack && this.currentTrack !== existingTrack && this.currentTrack.isPlaying) {
                console.log(`Stopping current track ${this.currentTrack.key} to use existing track ${key}`);
                this.stopMusic();
            }
            
            // Track is already playing somewhere, just reference it 
            // without starting it again (to prevent overlap in multiplayer)
            this.currentTrack = existingTrack;
            console.log(`Using existing music track: ${key}`);
            return this.currentTrack;
        }
        
        // Stop current music if requested and it's different from what we want to play
        if (stopCurrent && this.currentTrack && this.currentTrack.isPlaying && this.currentTrack.key !== key) {
            console.log(`Stopping current track ${this.currentTrack.key} before playing ${key}`);
            this.stopMusic();
        }

        // Check if we already have this track in our cache
        if (!this.musicTracks[key]) {
            try {
                // Remove any global instance first to avoid duplication
                const globalInstance = this.scene.sound.get(key);
                if (globalInstance) {
                    console.log(`Removing global instance of ${key} before creating new track`);
                    globalInstance.stop();
                    globalInstance.destroy();
                }
                
                // Create a new track
                this.musicTracks[key] = this.scene.sound.add(key, {
                    loop: loop,
                    volume: this.isMuted ? 0 : volume
                });
            } catch (error) {
                console.error(`Failed to add music track ${key}:`, error);
                return null;
            }
        } else if (this.musicTracks[key].isPlaying && !forcePlay) {
            // If the track exists in our cache and is already playing, just return it
            console.log(`Track ${key} from our cache is already playing`);
            this.currentTrack = this.musicTracks[key];
            return this.currentTrack;
        }

        // Start playing and update current track reference
        this.currentTrack = this.musicTracks[key];
        
        // Only play if it's not already playing or if forcePlay is true
        if (!this.currentTrack.isPlaying || forcePlay) {
            console.log(`Starting playback of track: ${key}`);
            // Make sure it's stopped before playing to avoid layering
            if (this.currentTrack.isPlaying) {
                this.currentTrack.stop();
            }
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
        
        // Safety check: is the track actually playing?
        if (!this.currentTrack.isPlaying) {
            // Track is already stopped, nothing to do
            return;
        }

        // Store a reference to the track we're stopping to avoid issues
        // if currentTrack changes during the fade out process
        const trackToStop = this.currentTrack;

        if (fadeOutDuration > 0) {
            // Mark the track as "fading out" to prevent duplicate stop calls
            trackToStop.isFadingOut = true;
            
            this.scene.tweens.add({
                targets: trackToStop,
                volume: 0,
                duration: fadeOutDuration,
                onComplete: () => {
                    // Only stop if it's still playing (might have been stopped elsewhere)
                    if (trackToStop.isPlaying) {
                        trackToStop.stop();
                    }
                    trackToStop.isFadingOut = false;
                }
            });
        } else {
            trackToStop.stop();
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
        
        // Check if this sound effect is already playing
        const existingSfx = this.scene.sound.get(key);
        if (existingSfx && existingSfx.isPlaying) {
            // Return the existing sound without playing it again
            console.log(`Sound effect ${key} is already playing`);
            return existingSfx;
        }
        
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
        // Stop the cleanup timer if it exists
        if (this.cleanupEvent) {
            this.cleanupEvent.remove();
            this.cleanupEvent = null;
        }
        
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

    /**
     * Cleanup any duplicate audio tracks in the game
     */
    cleanupDuplicateAudio() {
        // Get unique audio keys
        const audioKeys = new Set();
        this.scene.sound.sounds.forEach(sound => {
            if (sound.key) {
                audioKeys.add(sound.key);
            }
        });
        
        // Check each key for duplicates
        audioKeys.forEach(key => {
            this._ensureUniqueAudioTrack(key);
        });
    }

    /**
     * Ensures only one instance of an audio track exists in the game
     * @param {string} key - The audio key to check
     * @returns {boolean} True if any duplicates were removed
     * @private
     */
    _ensureUniqueAudioTrack(key) {
        // Get all sound instances with this key
        const soundInstances = [];
        this.scene.sound.sounds.forEach(sound => {
            if (sound.key === key) {
                soundInstances.push(sound);
            }
        });
        
        // If we have more than one instance, keep only the first one
        if (soundInstances.length > 1) {
            console.warn(`Found ${soundInstances.length} instances of audio ${key}, cleaning up duplicates`);
            
            // Keep the first one (index 0)
            for (let i = 1; i < soundInstances.length; i++) {
                if (soundInstances[i].isPlaying) {
                    soundInstances[i].stop();
                }
                soundInstances[i].destroy();
            }
            return true;
        }
        
        return false;
    }
}
