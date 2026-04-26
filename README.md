# AIO Gemini Plugin

AI-powered content summarization plugin for WordPress using Google Gemini AI.

## Features

- **AI Content Summarization**: Generate concise summaries using Google's Gemini AI
- **Block Editor Integration**: Seamless integration with WordPress block editor
- **Automatic Summarization**: Auto-generate summaries when saving posts
- **REST API**: Programmatic access to summarization features
- **Multiple Models**: Support for different Gemini models
- **Security**: Proper authentication and data sanitization

## Requirements

- WordPress 6.0 or higher
- PHP 8.1 or higher
- Google Gemini API key

## Installation

1. Copy the `picot_aio_optimizer` folder to `/wp-content/plugins/`
2. Activate the plugin in WordPress admin
3. Go to Settings > AIO Gemini
4. Enter your Google Gemini API key
5. Configure your preferred settings

## Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Paste it in the plugin settings

## Usage

### In the Block Editor

1. Write your post content
2. Open the "AIO Gemini" sidebar panel
3. Click "Summarize with Gemini"
4. Review and edit the generated summary
5. Use "Copy to Excerpt" to save it to the excerpt field

### Automatic Summarization

Enable auto-summarization in the plugin settings:
- Automatically generates summaries when saving posts
- Only works for published posts and drafts
- Skips posts that already have excerpts

### REST API

Use the REST API for programmatic access:

```bash
POST /wp-json/aio/v1/summarize
Content-Type: application/json

{
  "content": "Your content to summarize",
  "_wpnonce": "your_nonce_here"
}
```

Response:
```json
{
  "success": true,
  "summary": "Generated summary text",
  "content_length": 1234
}
```

## Configuration

### API Settings

- **API Key**: Your Google Gemini API key
- **Model**: Choose between Gemini models:
  - Gemini 3.0 Pro Exp (Newest, Free)
  - Gemini 3.0 Flash Exp (Newest Fast, Free)
  - Gemini 2.0 Flash Exp (Free)
  - Gemini 1.5 Flash (Recommended, Free)
  - Gemini 1.5 Flash-8B (Free)
  - Gemini 1.5 Pro (Free)
  - Gemini Pro (Legacy, Free)

### Auto Features

- **Auto Summarize**: Automatically generate summaries when saving posts
- **Auto Excerpt**: Automatically copy summaries to excerpt field

## File Structure

```
picot_aio_optimizer/
├── picot_aio_optimizer.php         # Main plugin file
├── admin/                 # CSS/JS for admin
│   ├── admin.css
│   └── admin.js
├── includes/              # PHP logic
│   ├── admin-views.php
│   ├── database.php
│   ├── gemini-client.php
│   ├── rest-handlers.php
│   ├── media.php
│   └── ...
├── languages/             # Translation files
└── logs/                  # Analysis logs
```

## API Models

### Gemini 3.0 Pro Exp (Newest)
- Latest experimental high-intelligence model
- Free tier available

### Gemini 3.0 Flash Exp (Newest)
- Latest experimental fast model
- Free tier available

### Gemini 2.0 Flash Exp
- Previous experimental model
- Free tier available

### Gemini 1.5 Flash (Recommended)
- Fast and cost-effective
- Good for most summarization tasks
- 1M token context window
- Free tier available

### Gemini 1.5 Flash-8B
- Extremely fast and efficient
- designed for high-volume tasks
- Free tier available

### Gemini 1.5 Pro
- More powerful for complex tasks
- Higher accuracy
- 1M token context window
- Free tier available

### Gemini Pro
- Original Gemini model
- Good balance of speed and quality
- 32K token context window
- Free tier available

## Security

- All requests are validated with WordPress nonces
- User permissions are checked for all operations
- Content is sanitized before processing
- API keys are stored securely in WordPress options
- Only users with `edit_posts` capability can use the plugin

## Troubleshooting

### Common Issues

1. **"API key not configured"**
   - Make sure you've entered your API key in the settings
   - Verify the API key is correct

2. **"Error generating summary"**
   - Check your internet connection
   - Verify your API key has sufficient quota
   - Try a different Gemini model

3. **"Content too long"**
   - The plugin automatically truncates content over 30,000 characters
   - Consider breaking long content into smaller sections

4. **Sidebar not appearing**
   - Make sure the plugin is activated
   - Check for JavaScript errors in browser console
   - Verify you're in the block editor

### Debug Mode

Enable WordPress debug mode to see detailed error messages:

```php
// In wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

## Development

### Hooks and Filters

The plugin provides several hooks for customization:

```php
// Modify the summary prompt
add_filter('picot_aio_optimizer_summary_prompt', function($prompt, $content) {
    return "Custom prompt: " . $content;
}, 10, 2);

// Modify the generated summary
add_filter('picot_aio_optimizer_summary', function($summary, $content) {
    return "Custom prefix: " . $summary;
}, 10, 2);
```

### Custom API Integration

You can extend the plugin with custom API integrations:

```php
class Custom_Summarizer {
    public function summarize($content) {
        // Your custom summarization logic
        return $summary;
    }
}

add_filter('picot_aio_optimizer_summarizer', function($summarizer) {
    return new Custom_Summarizer();
});
```

## Support

For issues and feature requests:
1. Check the troubleshooting section above
2. Review the plugin settings page
3. Check WordPress debug logs
4. Verify your Gemini API key and quota

## License

GPL v2 or later

## Changelog

### Version 1.0.1
- Rebrand to AIO Gemini
- Added Model selection
- Improved JSON parsing robustness

### Version 1.0.0
- Initial release
