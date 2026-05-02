# Picot AIO AI Content Optimizer

AI-powered content analysis and optimization plugin for WordPress using Google Gemini API. It acts as your personal SEO and AIO consultant, providing actionable advice based on Google's Search Quality Rater Guidelines (E-E-A-T).

## Features

- **E-E-A-T & Quality Guidelines Support**: Get precise advice to enhance your content's Experience, Expertise, Authoritativeness, and Trustworthiness.
- **One-Button SEO/AIO Analysis**: Analyze your existing articles and get structured optimization advice instantly.
- **One-Button Rewrite**: Rewrite your articles with custom instructions using Gemini AI.
- **AI Image Generation**: Generate and insert high-quality, relevant images for your posts.
- **Dual Panel UI**: Access the optimizer from the Gutenberg Document panel or the sidebar.
- **Analysis History**: Review past analyses per post directly in the editor.

## Supported Models

- **Text Analysis/Rewrite**: Gemini 1.5 Flash (Recommended), Gemini 1.5 Pro, Gemini 2.0 Flash Exp, Gemini 2.0 Flash Thinking Exp.
- **Image Generation**: Imagen 3.0 (Generate/Fast), Gemini 2.0 Flash (Built-in multimodal).

## Requirements

- WordPress 6.0 or higher
- PHP 7.4 or higher
- Google Gemini API key

## Installation

1. Copy the `picot-aio-ai-content-optimizer` folder to `/wp-content/plugins/`
2. Activate the plugin in WordPress admin
3. Go to Settings > Picot AIO 設定
4. Enter your Google Gemini API key
5. Configure your preferred settings

## Getting a Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Paste it in the plugin settings

## External Services Disclosure

This plugin relies on the **Google Generative Language API (Gemini)** provided by Google LLC.
- **Service Domain**: `https://generativelanguage.googleapis.com`
- **Data Sent**: Post content and custom prompts are sent to Google when you manually trigger an analysis, rewrite, or image generation.
- **Legal Links**: [Terms of Service](https://ai.google.dev/terms) | [Privacy Policy](https://policies.google.com/privacy)

## License

GPL v2 or later
