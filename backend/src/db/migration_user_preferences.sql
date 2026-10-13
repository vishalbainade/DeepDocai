-- User Preferences table
-- Stores personalized settings per user (theme, default model, notification prefs, etc.)
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    theme VARCHAR(10) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language VARCHAR(20) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    default_model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    notify_email BOOLEAN DEFAULT TRUE,
    notify_push BOOLEAN DEFAULT FALSE,
    notify_digest BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
