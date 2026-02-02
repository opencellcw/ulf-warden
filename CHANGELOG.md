# Changelog

All notable changes to Ulfberht-Warden will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-02

### Added
- **Self-Improvement System** - Automatic learning from conversations with human approval
- **Cost Auditor** - Multi-platform cost monitoring (Anthropic, GCP, ElevenLabs, Replicate, OpenAI)
- **Comprehensive Security Suite**:
  - Anti-Social Engineering detection (8+ attack patterns)
  - Self-Defense system against kill attempts and resource exhaustion
  - Security Auditor running every 30 minutes
  - Secure Key Manager with zero-persistence architecture
- **Multimodal Capabilities**:
  - Image generation (Replicate, OpenAI DALL-E)
  - Video generation and animation
  - Text-to-speech (ElevenLabs)
  - Audio transcription (Whisper)
  - Image analysis (GPT-4 Vision)
- **Task Automation** - Cron-based scheduling system
- **Approval System** - Discord buttons for self-improvement approvals
- **GKE Deployment** - Kubernetes with Helm charts

### Changed
- Restructured repository to follow OpenClaw patterns
- Updated README with comprehensive documentation
- Improved workspace CAPABILITIES.md with multimodal tools

### Fixed
- Image generation tools now properly documented and accessible
- Media generation working correctly with updated CAPABILITIES

## [1.0.0] - 2026-01-29

### Added
- Initial release
- Multi-platform support (Slack, Discord, Telegram)
- Claude Sonnet 4.5 integration
- Session management per user
- Workspace-based personality system
- Docker and Render.com deployment support

---

[2.0.0]: https://github.com/lucaspressi/opencellcw/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/lucaspressi/opencellcw/releases/tag/v1.0.0
