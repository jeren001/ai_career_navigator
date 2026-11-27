ALTER TABLE guest_assessment_ai_usage
  DROP CONSTRAINT guest_assessment_ai_usage_clarification_attempts_check,
  DROP CONSTRAINT guest_assessment_ai_usage_final_attempts_check,
  ADD CHECK (clarification_attempts >= 0),
  ADD CHECK (final_attempts >= 0);
