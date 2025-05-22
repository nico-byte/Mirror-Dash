/**
 * Improved AudioManager that properly handles level-specific tracks
 * and prevents overlapping music during scene transitions
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
        this.currentTrackKey = null;
        this.musicVolume = 0.5;
        this.sfxVolume = 0.7;
        this.isMuted = false;

        // Track global sound instance to prevent duplicates
        if (!window.globalSoundManager) {
            window.globalSoundManager = {
                activeMusic: null,
                activeTrackKey: null,
            };
        }

        // Define level-specific music mapping
        this.levelMusicMap = {
            level1: "dnb_og",
            level2: "dnb",
            level3: "dnb2",
            level4: "dnb5",
            level5: "dnb7",
            mainMenu: "main_menu",
            lobby: "idk",
            gameOver: "dub2",
        };
    }

    /**
     * Preload audio assets - called during scene preload
     */
    preloadAudio() {
        const scene = this.scene;

        // Determine which tracks to load based on scene
        let tracksToLoad = [];

        // Load all necessary music tracks
        const musicTracks = [
            "dnb_og.wav",
            "dnb.wav",
            "dnb2.wav",
            "dnb5.wav",
            "dnb6.wav",
            "dnb7.wav",
            "dub2.wav",
            "idk.wav",
            "main_menu.wav",
        ];

        // Load all music tracks
        musicTracks.forEach(track => {
            const key = track.replace(".wav", "");
            if (!scene.sound.get(key)) {
                scene.load.audio(key, `../assets/music/${track}`);
            }
        });

        // Load sound effects
        if (!scene.sound.get("win")) {
            scene.load.audio("win", "../assets/music/win.wav");
        }

        if (!scene.sound.get("jumppad")) {
            scene.load.audio("jumppad", "../assets/music/jumppad.wav");
        }

        // Load spike hit sound if needed
        if (!scene.sound.get("spike_hit")) {
            scene.load.audio("spike_hit", "../assets/music/jumppad.wav"); // Reuse jumppad sound
        }
    }

    /**
     * Play music for a specific level
     * @param {string} levelId - The level ID (e.g., 'level1')
     * @param {boolean} forceRestart - Whether to force restart even if already playing
     * @returns {Phaser.Sound.BaseSound} The sound object that was started
     */
    playLevelMusic(levelId, forceRestart = false) {
        // Get the appropriate track key for this level
        const trackKey = this.levelMusicMap[levelId] || "dnb_og";

        console.log(`Playing level music for ${levelId}: ${trackKey}`);

        return this.playMusic(trackKey, true, this.musicVolume, true, forceRestart);
    }

    /**
     * Play background music with proper global tracking
     * @param {string} key - The audio key to play
     * @param {boolean} loop - Whether to loop the audio (default: true)
     * @param {number} volume - Volume level (0-1) (default: musicVolume)
     * @param {boolean} stopCurrent - Whether to stop current music (default: true)
     * @param {boolean} forcePlay - Whether to force playback even if track exists (default: false)
     * @returns {Phaser.Sound.BaseSound} The sound object that was started
     */
    playMusic(key, loop = true, volume = this.musicVolume, stopCurrent = true, forcePlay = false) {
        // IMPORTANT: Check the global sound manager first
        if (window.globalSoundManager.activeMusic && window.globalSoundManager.activeTrackKey === key && !forcePlay) {
            console.log(`Reusing global music track: ${key}`);

            // Store reference to the global track
            this.currentTrack = window.globalSoundManager.activeMusic;
            this.currentTrackKey = key;

            // Ensure proper volume
            if (!this.isMuted) {
                this.currentTrack.setVolume(volume);
            }

            return this.currentTrack;
        }

        // Stop any previous global music to prevent overlap
        if (window.globalSoundManager.activeMusic && stopCurrent) {
            console.log(`Stopping previous global music: ${window.globalSoundManager.activeTrackKey}`);
            window.globalSoundManager.activeMusic.stop();
            window.globalSoundManager.activeMusic = null;
            window.globalSoundManager.activeTrackKey = null;
        }

        // Create a new track
        try {
            if (!this.musicTracks[key]) {
                this.musicTracks[key] = this.scene.sound.add(key, {
                    loop: loop,
                    volume: this.isMuted ? 0 : volume,
                });
            }

            // Update our local tracking
            this.currentTrack = this.musicTracks[key];
            this.currentTrackKey = key;

            // Update the global tracking
            window.globalSoundManager.activeMusic = this.currentTrack;
            window.globalSoundManager.activeTrackKey = key;

            // Start playing if not already
            if (!this.currentTrack.isPlaying || forcePlay) {
                this.currentTrack.play();
            }

            return this.currentTrack;
        } catch (error) {
            console.error(`Failed to play music track ${key}:`, error);
            return null;
        }
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

                    // Also clear global reference if it matches
                    if (window.globalSoundManager.activeMusic === this.currentTrack) {
                        window.globalSoundManager.activeMusic = null;
                        window.globalSoundManager.activeTrackKey = null;
                    }

                    this.currentTrack = null;
                    this.currentTrackKey = null;
                },
            });
        } else {
            this.currentTrack.stop();

            // Also clear global reference if it matches
            if (window.globalSoundManager.activeMusic === this.currentTrack) {
                window.globalSoundManager.activeMusic = null;
                window.globalSoundManager.activeTrackKey = null;
            }

            this.currentTrack = null;
            this.currentTrackKey = null;
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
            volume: volume,
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
     * Clean up all resources
     */
    shutdown() {
        // Don't stop global music on local scene change
        // Just free the local references

        // Clear local music track references
        this.musicTracks = {};
        this.currentTrack = null;
        this.currentTrackKey = null;
    }

    /**
     * Force stop all audio globally
     * Used when truly exiting a game session
     */
    forceStopAllAudio() {
        // Stop all music globally
        if (window.globalSoundManager.activeMusic) {
            window.globalSoundManager.activeMusic.stop();
            window.globalSoundManager.activeMusic = null;
            window.globalSoundManager.activeTrackKey = null;
        }

        // Stop all sounds
        this.scene.sound.stopAll();
    }
}
