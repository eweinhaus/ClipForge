/**
 * Unit tests for timeline utilities
 * Tests snap-to-grid, time/pixel conversion, and trim validation
 */

import { timeToPx, pxToTime, snap, validateTrimRange, formatTimecode, isPlayheadWithinClip } from '../timelineUtils';

describe('Timeline Utils', () => {
  describe('timeToPx', () => {
    test('converts time to pixels correctly at 1x zoom', () => {
      expect(timeToPx(1, 1)).toBe(50);
      expect(timeToPx(2, 1)).toBe(100);
      expect(timeToPx(0.5, 1)).toBe(25);
    });

    test('converts time to pixels correctly at different zoom levels', () => {
      expect(timeToPx(1, 0.5)).toBe(25);
      expect(timeToPx(1, 2)).toBe(100);
      expect(timeToPx(1, 4)).toBe(200);
      expect(timeToPx(1, 0.25)).toBe(12.5);
    });

    test('handles edge cases', () => {
      expect(timeToPx(0, 1)).toBe(0);
      expect(timeToPx(-1, 1)).toBe(-50);
    });

    test('rounds to 2 decimal places', () => {
      expect(timeToPx(1.333, 1)).toBe(66.65);
    });
  });

  describe('pxToTime', () => {
    test('converts pixels to time correctly at 1x zoom', () => {
      expect(pxToTime(50, 1)).toBe(1);
      expect(pxToTime(100, 1)).toBe(2);
      expect(pxToTime(25, 1)).toBe(0.5);
    });

    test('converts pixels to time correctly at different zoom levels', () => {
      expect(pxToTime(25, 0.5)).toBe(1);
      expect(pxToTime(100, 2)).toBe(1);
      expect(pxToTime(200, 4)).toBe(1);
      expect(pxToTime(12.5, 0.25)).toBe(1);
    });

    test('handles edge cases', () => {
      expect(pxToTime(0, 1)).toBe(0);
      expect(pxToTime(-50, 1)).toBe(-1);
    });

    test('rounds to 2 decimal places', () => {
      expect(pxToTime(66.65, 1)).toBe(1.33);
    });
  });

  describe('snap', () => {
    test('snaps to nearest second when snapToGrid is true', () => {
      expect(snap(1.2, true)).toBe(1);
      expect(snap(1.7, true)).toBe(2);
      expect(snap(1.5, true)).toBe(2);
      expect(snap(0.4, true)).toBe(0);
    });

    test('does not snap when snapToGrid is false', () => {
      expect(snap(1.2, false)).toBe(1.2);
      expect(snap(1.7, false)).toBe(1.7);
      expect(snap(1.5, false)).toBe(1.5);
    });

    test('handles negative values', () => {
      expect(snap(-0.3, true)).toBe(0);
      expect(snap(-1.7, true)).toBe(-2);
    });

    test('handles zero', () => {
      expect(snap(0, true)).toBe(0);
      expect(snap(0, false)).toBe(0);
    });
  });

  describe('validateTrimRange', () => {
    test('validates correct trim ranges', () => {
      const result = validateTrimRange(1, 5, 10);
      expect(result.isValid).toBe(true);
      expect(result.message).toBe('Valid trim range');
    });

    test('rejects negative trim start', () => {
      const result = validateTrimRange(-1, 5, 10);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Trim start cannot be negative');
    });

    test('rejects trim end exceeding duration', () => {
      const result = validateTrimRange(1, 15, 10);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Trim end cannot exceed clip duration');
    });

    test('rejects trim start >= trim end', () => {
      const result = validateTrimRange(5, 5, 10);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Trim start must be less than trim end');
    });

    test('rejects duration below minimum', () => {
      const result = validateTrimRange(1, 1.2, 10);
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Minimum duration is 0.25s');
    });

    test('accepts custom minimum duration', () => {
      const result = validateTrimRange(1, 1.1, 10, 0.1);
      expect(result.isValid).toBe(true);
    });
  });

  describe('formatTimecode', () => {
    test('formats timecode correctly', () => {
      expect(formatTimecode(0)).toBe('00:00:00.00');
      expect(formatTimecode(1)).toBe('00:00:01.00');
      expect(formatTimecode(61)).toBe('00:01:01.00');
      expect(formatTimecode(3661)).toBe('01:01:01.00');
    });

    test('handles fractional seconds', () => {
      expect(formatTimecode(1.25)).toBe('00:00:01.25');
      expect(formatTimecode(1.99)).toBe('00:00:01.99');
    });

    test('handles negative values', () => {
      expect(formatTimecode(-1)).toBe('00:00:00.00');
    });

    test('handles large values', () => {
      expect(formatTimecode(3661.5)).toBe('01:01:01.50');
    });
  });

  describe('isPlayheadWithinClip', () => {
    const clips = [
      {
        id: 'clip1',
        duration: 10,
        trimStart: 0,
        trimEnd: 10,
        order: 0
      },
      {
        id: 'clip2',
        duration: 8,
        trimStart: 2,
        trimEnd: 6,
        order: 1
      },
      {
        id: 'clip3',
        duration: 5,
        trimStart: 0,
        trimEnd: 5,
        order: 2
      }
    ];

    test('returns true when playhead is within first clip', () => {
      expect(isPlayheadWithinClip(5, clips[0], clips)).toBe(true);
      expect(isPlayheadWithinClip(1, clips[0], clips)).toBe(true);
      expect(isPlayheadWithinClip(9, clips[0], clips)).toBe(true);
    });

    test('returns false when playhead is at exact start of clip', () => {
      expect(isPlayheadWithinClip(0, clips[0], clips)).toBe(false);
    });

    test('returns false when playhead is at exact end of clip', () => {
      expect(isPlayheadWithinClip(10, clips[0], clips)).toBe(false);
    });

    test('returns true when playhead is within trimmed second clip', () => {
      // Clip2 starts at position 10 (after clip1)
      // Clip2 has trimStart=2, trimEnd=6, so effective duration is 4
      // Timeline position: 10 to 14
      expect(isPlayheadWithinClip(11, clips[1], clips)).toBe(true);
      expect(isPlayheadWithinClip(13, clips[1], clips)).toBe(true);
    });

    test('returns false when playhead is before second clip', () => {
      expect(isPlayheadWithinClip(5, clips[1], clips)).toBe(false);
    });

    test('returns false when playhead is after second clip', () => {
      expect(isPlayheadWithinClip(15, clips[1], clips)).toBe(false);
    });

    test('returns true when playhead is within third clip', () => {
      // Clip3 starts at position 14 (after clip1=10 and clip2=4)
      // Timeline position: 14 to 19
      expect(isPlayheadWithinClip(15, clips[2], clips)).toBe(true);
      expect(isPlayheadWithinClip(18, clips[2], clips)).toBe(true);
    });

    test('returns false for null clip', () => {
      expect(isPlayheadWithinClip(5, null, clips)).toBe(false);
    });

    test('returns false for undefined clip', () => {
      expect(isPlayheadWithinClip(5, undefined, clips)).toBe(false);
    });

    test('handles edge cases with tolerance', () => {
      // Test that positions very close to edges (within tolerance) return false
      expect(isPlayheadWithinClip(0.005, clips[0], clips)).toBe(false);
      expect(isPlayheadWithinClip(9.995, clips[0], clips)).toBe(false);
    });

    test('handles single clip', () => {
      const singleClip = [clips[0]];
      expect(isPlayheadWithinClip(5, singleClip[0], singleClip)).toBe(true);
      expect(isPlayheadWithinClip(0, singleClip[0], singleClip)).toBe(false);
      expect(isPlayheadWithinClip(10, singleClip[0], singleClip)).toBe(false);
    });

    test('handles clips with no trim (full duration)', () => {
      const fullClips = [
        {
          id: 'full1',
          duration: 10,
          trimStart: 0,
          trimEnd: 10,
          order: 0
        }
      ];
      expect(isPlayheadWithinClip(5, fullClips[0], fullClips)).toBe(true);
    });
  });
});
