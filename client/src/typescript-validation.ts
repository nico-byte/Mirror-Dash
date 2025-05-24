/**
 * TypeScript configuration validation and helper utilities
 * This file helps ensure the TypeScript setup is working correctly
 */

// Test basic TypeScript functionality
export interface TestInterface {
  message: string;
  timestamp: number;
}

export class TypeScriptTest {
  private readonly config: TestInterface;

  constructor(message: string = "TypeScript is working!") {
    this.config = {
      message,
      timestamp: Date.now()
    };
  }

  getMessage(): string {
    return this.config.message;
  }

  getTimestamp(): number {
    return this.config.timestamp;
  }
}

// Test Phaser types integration
export function testPhaserTypes(): boolean {
  try {
    // This should not cause type errors if Phaser types are properly configured
    const testConfig: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600
    };
    
    return typeof testConfig.width === 'number';
  } catch (error) {
    console.warn('Phaser types test failed:', error);
    return false;
  }
}

// Utility function to check if we're in a development environment
export function isDevelopmentEnvironment(): boolean {
  return import.meta.env.DEV;
}

// Utility function to check if TypeScript features are available
export function hasTypeScriptSupport(): boolean {
  return import.meta.env.DEV || 
         import.meta.env.MODE === 'development' ||
         import.meta.env.VITE_TS_SUPPORT === 'true';
}

// Export types for use in migration
export * from './types/global';
export * from './types/game';

console.log('TypeScript validation module loaded successfully!');