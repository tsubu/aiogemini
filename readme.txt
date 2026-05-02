=== Picot AIO AI Content Optimizer ===
Contributors: tsubu
Donate link: https://github.com/tsubu/aiogemini
Tags: ai, gemini, seo, content-quality, rewrite
Requires at least: 6.0
Tested up to: 6.9
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

AI-powered content analysis and optimization plugin using Google Gemini API. Provides SEO/AIO advice, one-button rewrite, and AI image generation.

== Description ==

Picot AIO AI Content Optimizer is a powerful WordPress plugin designed to elevate your content quality using the latest Gemini AI technology. It acts as your personal SEO and AIO consultant, providing actionable advice based on Google's Search Quality Rater Guidelines (E-E-A-T).

= Key Features =

* **E-E-A-T & Quality Guidelines Support**: Get precise advice to enhance your content's Experience, Expertise, Authoritativeness, and Trustworthiness.
* **One-Button SEO/AIO Analysis**: Analyze your existing articles and get structured optimization advice instantly.
* **One-Button Rewrite**: Rewrite your articles with custom instructions using Gemini AI.
* **AI Image Generation**: Generate and insert high-quality, relevant images for your posts.
* **Dual Panel UI**: Access the optimizer from the Gutenberg Document panel or the sidebar — always visible.
* **Analysis History**: Review past analyses per post directly in the editor.

== External services ==

This plugin relies on the **Google Generative Language API (Gemini)** provided by Google LLC to provide AI-powered content analysis, text generation, and image generation features.

- **Service Domain**: `https://generativelanguage.googleapis.com`
- **What the service is used for**: Analyzing post content for SEO/AIO advice, rewriting text based on user instructions, and generating relevant images based on article context.
- **What data is sent**: The content of your post (title and body) and your custom AI prompts are sent to Google's API when you manually trigger an analysis, rewrite, or image generation request.
- **When data is sent**: Data is only sent when the user explicitly clicks the "Analyze", "AI Rewrite", or "Generate Image" buttons.
- **Legal Links**:
    - [Google AI Studio Terms of Service](https://ai.google.dev/terms)
    - [Google Privacy Policy](https://policies.google.com/privacy)

== Installation ==

1. Upload the `picot-aio-ai-content-optimizer` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the 'Plugins' menu in WordPress.
3. Go to Settings > Picot AIO AI Content Optimizer and enter your Gemini API Key from Google AI Studio.
4. Select your preferred AI model and optional image generation model.

== Frequently Asked Questions ==

= Where do I get an API Key? =
You can obtain a free Gemini API Key from [Google AI Studio](https://aistudio.google.com/).

= Is it free to use? =
The plugin itself is free. Costs associated with the Gemini API depend on your usage and the plan you choose in Google AI Studio.

= Does it work with the Classic Editor? =
Yes. When the Classic Editor is active, the plugin automatically shows a meta box in the post editor sidebar.

== Screenshots ==

1. The Picot AIO panel in the Gutenberg post editor providing SEO/AIO advice.
2. The plugin sidebar accessible from the Gutenberg toolbar.
3. Settings page where you configure the API Key and Model.

== Changelog ==

= 1.0.0 =
* Initial release.

== Upgrade Notice ==

= 1.0.0 =
Initial version.
