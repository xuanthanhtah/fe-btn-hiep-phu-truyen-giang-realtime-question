import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore, DEFAULT_SETTINGS } from '../../stores/settings.store';

describe('Display Settings Store & Persistence', () => {
  beforeEach(() => {
    // Clear cookies & local storage
    document.cookie = 'hiepphu_display_settings=; max-age=-99999; path=/';
    localStorage.clear();
    useSettingsStore.getState().resetDefaults();
  });

  it('initializes with default font sizes and layout', () => {
    const state = useSettingsStore.getState();
    expect(state.questionFontSize).toBe(DEFAULT_SETTINGS.questionFontSize);
    expect(state.answerFontSize).toBe(DEFAULT_SETTINGS.answerFontSize);
    expect(state.hostQuestionFontSize).toBe(DEFAULT_SETTINGS.hostQuestionFontSize);
    expect(state.hostAnswerFontSize).toBe(DEFAULT_SETTINGS.hostAnswerFontSize);
    expect(state.answerLayout).toBe('grid-2');
  });

  it('updates question and answer font sizes within bounded range', () => {
    useSettingsStore.getState().setQuestionFontSize(48);
    expect(useSettingsStore.getState().questionFontSize).toBe(48);

    useSettingsStore.getState().setAnswerFontSize(32);
    expect(useSettingsStore.getState().answerFontSize).toBe(32);

    // Clamping checks
    useSettingsStore.getState().setQuestionFontSize(100);
    expect(useSettingsStore.getState().questionFontSize).toBe(64); // max 64

    useSettingsStore.getState().setAnswerFontSize(5);
    expect(useSettingsStore.getState().answerFontSize).toBe(14); // min 14
  });

  it('updates answer layout mode', () => {
    useSettingsStore.getState().setAnswerLayout('stack-1');
    expect(useSettingsStore.getState().answerLayout).toBe('stack-1');

    useSettingsStore.getState().setAnswerLayout('grid-4');
    expect(useSettingsStore.getState().answerLayout).toBe('grid-4');
  });

  it('saves settings to cookie and localStorage upon changes', () => {
    useSettingsStore.getState().setQuestionFontSize(42);
    useSettingsStore.getState().setAnswerLayout('stack-1');

    // Cookie check
    expect(document.cookie).toContain('hiepphu_display_settings');
    expect(document.cookie).toContain('42');

    // LocalStorage check
    const rawStorage = localStorage.getItem('hiepphu_display_settings');
    expect(rawStorage).toBeTruthy();
    const parsed = JSON.parse(rawStorage!);
    expect(parsed.questionFontSize).toBe(42);
    expect(parsed.answerLayout).toBe('stack-1');
  });

  it('can reset to default settings', () => {
    useSettingsStore.getState().setQuestionFontSize(54);
    useSettingsStore.getState().setAnswerLayout('grid-4');

    useSettingsStore.getState().resetDefaults();
    expect(useSettingsStore.getState().questionFontSize).toBe(DEFAULT_SETTINGS.questionFontSize);
    expect(useSettingsStore.getState().answerLayout).toBe(DEFAULT_SETTINGS.answerLayout);
  });
});
