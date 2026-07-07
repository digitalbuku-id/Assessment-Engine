/**
 * Assessment Registry
 *
 * Maps assessment_id → { pack, version }.
 * Single source of truth for which pack serves which assessment.
 *
 * Format: "<assessment_id>": { pack: "<pack_id>", version: "<semver>" }
 */
module.exports = {
  'assessment-leadership-v2': {
    pack: 'leadership',
    version: '1.0.0',
  },
};
